'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArticleCard } from './components/ArticleCard';
import { ChannelToggles } from './components/ChannelToggles';
import { ReaderPane } from './components/ReaderPane';
import { PixelLogo } from './components/PixelLogo';
import { CustomFeedManager } from './components/CustomFeedManager';
import {
  ALL_PRODUCTS,
  ROLES,
  SOURCE_LABELS,
  type FeedFile,
  type ProductChannel,
  type Role,
  type ScoredArticle,
  type SourceId,
} from '@/lib/curation/types';
import {
  isSoundEnabled,
  loadSoundPref,
  playClose,
  playTick,
  setSoundEnabled,
} from '@/lib/sounds';
import {
  fetchCustomFeed,
  loadCustomFeeds,
  saveCustomFeeds,
  type CustomFeed,
} from '@/lib/custom-feeds';
import { readUrlState, writeUrlState } from '@/lib/url-state';

const STORAGE_KEY = 'newnews:prefs:v3';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const ALL_SOURCES: SourceId[] = ['bbc', 'nyt', 'guardian', 'hn', 'reddit', 'custom'];

interface Prefs {
  roles: Role[];
  channels: ProductChannel[];
  sources: SourceId[];
  showDebug: boolean;
}

const DEFAULT_PREFS: Prefs = {
  roles: [],
  channels: [],
  sources: [...ALL_SOURCES],
  showDebug: false,
};

function loadPrefs(): Prefs {
  if (typeof window === 'undefined') return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    return { ...DEFAULT_PREFS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(p: Prefs) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(p));
}

export default function Page() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [hydrated, setHydrated] = useState(false);
  const [feed, setFeed] = useState<FeedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<ScoredArticle | null>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [customFeeds, setCustomFeeds] = useState<CustomFeed[]>([]);
  const [customArticles, setCustomArticles] = useState<ScoredArticle[]>([]);
  const [customErrors, setCustomErrors] = useState<Record<string, string>>({});
  const [customRefreshing, setCustomRefreshing] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'copied'>('idle');

  useEffect(() => {
    const storedPrefs = loadPrefs();
    const storedFeeds = loadCustomFeeds();
    const url = readUrlState();

    // URL wins for filter prefs (intent: shared config).
    const mergedPrefs: Prefs = {
      ...storedPrefs,
      ...(url.roles ? { roles: url.roles } : {}),
      ...(url.channels ? { channels: url.channels } : {}),
      ...(url.sources ? { sources: url.sources } : {}),
    };

    // For custom feeds we merge instead of replace, so visiting a share
    // link doesn't wipe the user's existing feeds. Dedupe by URL.
    let mergedFeeds = storedFeeds;
    if (url.feeds && url.feeds.length > 0) {
      const seen = new Set(storedFeeds.map((f) => f.url));
      const additions = url.feeds.filter((f) => !seen.has(f.url));
      mergedFeeds = [...storedFeeds, ...additions];
      if (additions.length > 0) saveCustomFeeds(mergedFeeds);
    }

    setPrefs(mergedPrefs);
    setCustomFeeds(mergedFeeds);
    setSoundOn(loadSoundPref());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    savePrefs(prefs);
    writeUrlState({
      roles: prefs.roles,
      channels: prefs.channels,
      sources: prefs.sources,
      defaultSources: ALL_SOURCES,
      feeds: customFeeds,
    });
  }, [prefs, customFeeds, hydrated]);

  useEffect(() => {
    fetch(`${BASE}/data/feed.json`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as FeedFile;
      })
      .then(setFeed)
      .catch((e) => setError((e as Error).message));
  }, []);

  // Refetch all custom feeds whenever the list changes (add/remove) or
  // when the user clicks Refresh.
  const refreshCustom = async (list: CustomFeed[]) => {
    if (list.length === 0) {
      setCustomArticles([]);
      setCustomErrors({});
      return;
    }
    setCustomRefreshing(true);
    const results = await Promise.allSettled(
      list.map((f) => fetchCustomFeed(f).then((arts) => ({ f, arts }))),
    );
    const merged: ScoredArticle[] = [];
    const errs: Record<string, string> = {};
    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      if (r.status === 'fulfilled') {
        merged.push(...r.value.arts);
      } else {
        errs[list[i].id] =
          r.reason instanceof Error ? r.reason.message : String(r.reason);
      }
    }
    setCustomArticles(merged);
    setCustomErrors(errs);
    setCustomRefreshing(false);
  };

  useEffect(() => {
    if (!hydrated) return;
    void refreshCustom(customFeeds);
  }, [customFeeds, hydrated]);

  const channelSet = useMemo(() => new Set(prefs.channels), [prefs.channels]);
  const roleSet = useMemo(() => new Set(prefs.roles), [prefs.roles]);
  const sourceSet = useMemo(() => new Set(prefs.sources), [prefs.sources]);

  const MIN_RESULTS = 10;
  const noChannelOrRole = roleSet.size === 0 && channelSet.size === 0;

  // Effective feed = curated server-side feed merged with user's custom feeds
  // (fetched client-side). Custom articles always show as untagged, so the
  // role/channel filter passes them through (since untagged items are kept).
  const allArticles = useMemo<ScoredArticle[]>(() => {
    const base = feed?.articles ?? [];
    if (customArticles.length === 0) return base;
    return [...base, ...customArticles];
  }, [feed, customArticles]);

  // Primary pass: respects all three filters (sources + roles + channels).
  // Special case: when nothing is selected in roles/channels, just show the
  // top story from each enabled source (a quick at-a-glance front page).
  const primary = useMemo(() => {
    if (!feed) return [];
    if (noChannelOrRole) {
      const top = new Map<string, ScoredArticle>();
      for (const a of allArticles) {
        if (!sourceSet.has(a.source)) continue;
        // For custom feeds, "top" means most recent rather than highest score
        // (custom items all have score 0).
        const cur = top.get(a.source);
        if (!cur) {
          top.set(a.source, a);
        } else if (a.source === 'custom') {
          if (a.publishedAt > cur.publishedAt) top.set(a.source, a);
        } else if (a.score > cur.score) {
          top.set(a.source, a);
        }
      }
      return ALL_SOURCES.map((s) => top.get(s)).filter(
        (a): a is ScoredArticle => Boolean(a),
      );
    }
    return allArticles.filter((a) => {
      if (!sourceSet.has(a.source)) return false;
      if (a.roles.length === 0 && a.products.length === 0) return true;
      const matchesRole = a.roles.some((r) => roleSet.has(r));
      const matchesProduct = a.products.some((p) => channelSet.has(p));
      return matchesRole || matchesProduct;
    });
  }, [feed, allArticles, roleSet, channelSet, sourceSet, noChannelOrRole]);

  // If the primary list is too thin, broaden by relaxing the source toggle:
  // pull additional items from *any* source as long as they match the
  // selected roles/channels. This is the "get more content based on the new
  // filters" fallback. Items already in `primary` are skipped.
  // Skipped entirely in the "top story per source" mode.
  const filtered = useMemo(() => {
    if (!feed || noChannelOrRole || primary.length >= MIN_RESULTS) return primary;
    const seen = new Set(primary.map((a) => a.id));
    const extras: ScoredArticle[] = [];
    for (const a of allArticles) {
      if (seen.has(a.id)) continue;
      // Skip purely untagged general news in the broaden pass — we already
      // matched those above where the source filter let them through.
      if (a.roles.length === 0 && a.products.length === 0) continue;
      const matchesRole = a.roles.some((r) => roleSet.has(r));
      const matchesProduct = a.products.some((p) => channelSet.has(p));
      if (matchesRole || matchesProduct) extras.push(a);
    }
    return [...primary, ...extras];
  }, [feed, primary, roleSet, channelSet, noChannelOrRole]);

  const broadened = filtered.length > primary.length;

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) counts[a.source] = (counts[a.source] ?? 0) + 1;
    return counts;
  }, [filtered]);

  const toggleSound = () => {
    const next = !isSoundEnabled();
    setSoundEnabled(next);
    setSoundOn(next);
    if (next) playTick();
  };

  const handleClose = () => {
    playClose();
    setSelected(null);
  };

  const handleShare = async () => {
    if (typeof window === 'undefined') return;
    playTick();
    try {
      await navigator.clipboard.writeText(window.location.href);
      setShareStatus('copied');
      setTimeout(() => setShareStatus('idle'), 1800);
    } catch {
      // Clipboard API can fail (insecure context, focus, etc.) — fall back
      // to a prompt so the user can copy manually.
      window.prompt('Copy this link to share your view:', window.location.href);
    }
  };

  return (
    <div className={selected ? 'flex h-screen flex-col' : ''}>
      <main
        className={
          selected
            ? 'mx-auto grid w-full max-w-[1800px] flex-1 gap-4 overflow-hidden px-2 py-2 sm:px-4 sm:py-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2.1fr)]'
            : 'mx-auto max-w-4xl px-4 py-6'
        }
      >
        <section className={selected ? 'flex min-h-0 flex-col overflow-hidden' : ''}>
          <header className={selected ? 'mb-3 space-y-3' : 'mb-6 space-y-4'}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <PixelLogo size={selected ? 56 : 88} />
                <div>
                  <h1 className={`pixel-h1 text-mario ${selected ? 'pixel-h1--sm' : ''}`}>
                    new<span className="text-sky">News</span>
                  </h1>
                  <span className="font-retro text-base text-ink/60">
                    curated team feed
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {feed ? (
                  <span className="hidden font-retro text-base text-ink/60 sm:inline">
                    {filtered.length}/{feed.count} · {' '}
                    {new Date(feed.generatedAt).toLocaleString()}
                  </span>
                ) : null}
                <button
                  onClick={handleShare}
                  className="nes-btn"
                  title="Copy a shareable link to your current filters + custom feeds"
                  aria-label="Copy shareable link"
                >
                  {shareStatus === 'copied' ? '✓ Copied' : '🔗 Share'}
                </button>
                <button
                  onClick={toggleSound}
                  className="nes-btn"
                  title={soundOn ? 'Mute sounds' : 'Enable 8-bit sounds'}
                  aria-label={soundOn ? 'Mute sounds' : 'Enable sounds'}
                >
                  {soundOn ? '♪ ON' : '♪ OFF'}
                </button>
              </div>
            </div>

            {!selected ? (
              <div className="nes-card space-y-3 p-4">
                <ChannelToggles
                  selectedRoles={roleSet}
                  selectedChannels={channelSet}
                  onToggleRole={(r) =>
                    setPrefs((p) => ({
                      ...p,
                      roles: p.roles.includes(r)
                        ? p.roles.filter((x) => x !== r)
                        : [...p.roles, r],
                    }))
                  }
                  onToggleChannel={(c) =>
                    setPrefs((p) => ({
                      ...p,
                      channels: p.channels.includes(c)
                        ? p.channels.filter((x) => x !== c)
                        : [...p.channels, c],
                    }))
                  }
                  onAll={() =>
                    setPrefs((p) => ({
                      ...p,
                      roles: [...ROLES],
                      channels: [...ALL_PRODUCTS],
                    }))
                  }
                  onNone={() =>
                    setPrefs((p) => ({ ...p, roles: [], channels: [] }))
                  }
                />

                <div>
                  <div className="pixel-label mb-2 text-ink/70">Sources</div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SOURCES.filter(
                      (s) => s !== 'custom' || customFeeds.length > 0,
                    ).map((s) => {
                      const active = sourceSet.has(s);
                      return (
                        <button
                          key={s}
                          onClick={() => {
                            playTick();
                            setPrefs((p) => ({
                              ...p,
                              sources: p.sources.includes(s)
                                ? p.sources.filter((x) => x !== s)
                                : [...p.sources, s],
                            }));
                          }}
                          data-pressed={active}
                          className={`nes-btn ${active ? 'nes-btn--warn' : ''}`}
                        >
                          {SOURCE_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <CustomFeedManager
                  feeds={customFeeds}
                  onChange={(next) => {
                    setCustomFeeds(next);
                    // Auto-enable the custom source toggle when the user adds
                    // their first feed, otherwise the new articles would be
                    // hidden behind a turned-off filter.
                    if (next.length > 0) {
                      setPrefs((p) =>
                        p.sources.includes('custom')
                          ? p
                          : { ...p, sources: [...p.sources, 'custom'] },
                      );
                    }
                  }}
                  onRefresh={() => void refreshCustom(customFeeds)}
                  refreshing={customRefreshing}
                  errors={customErrors}
                />

                <label className="flex cursor-pointer items-center gap-2 font-retro text-base text-ink/70">
                  <input
                    type="checkbox"
                    checked={prefs.showDebug}
                    onChange={(e) =>
                      setPrefs((p) => ({ ...p, showDebug: e.target.checked }))
                    }
                  />
                  show scoring debug
                </label>
              </div>
            ) : null}
          </header>

          <div
            className={
              selected ? 'min-h-0 flex-1 overflow-y-auto pr-1' : undefined
            }
          >
            {error ? (
              <div className="nes-card border-mario bg-mario/10 p-4 font-retro text-base text-ink">
                <span className="font-pixel text-[10px] uppercase text-mario">✗ Error.</span>{' '}
                Failed to load feed: {error}. The feed may not have been
                generated yet — run <code className="font-pixel text-[10px]">npm run fetch-feed</code> locally
                or wait for the next GitHub Actions run.
              </div>
            ) : !feed ? (
              <div className="flex items-center gap-3 font-retro text-base text-ink/70">
                <span className="pixel-spinner" />
                Loading feed…
              </div>
            ) : filtered.length === 0 ? (
              <div className="nes-card p-6 text-center font-retro text-base text-ink/70">
                No articles match your current filters. Try selecting more
                channels, a different role, or enabling more sources.
              </div>
            ) : (
              <>
                {!selected ? (
                  <div className="mb-3 flex flex-wrap items-center gap-3 font-retro text-base text-ink/60">
                    {ALL_SOURCES.filter((s) => sourceCounts[s]).map((s) => (
                      <span key={s}>
                        {SOURCE_LABELS[s]}: {sourceCounts[s]}
                      </span>
                    ))}
                    {broadened ? (
                      <span className="ml-auto rounded-none border-2 border-ink bg-coin px-2 py-0.5 font-pixel text-[9px] uppercase text-ink">
                        + broadened (ignoring source toggles)
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="space-y-3">
                  {filtered.map((a) => (
                    <ArticleCard
                      key={a.id}
                      article={a}
                      showDebug={prefs.showDebug}
                      active={selected?.id === a.id}
                      onSelect={setSelected}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {selected ? (
          <section className="hidden min-h-0 lg:block">
            <ReaderPane article={selected} onClose={handleClose} />
          </section>
        ) : null}

        {selected ? (
          <div className="fixed inset-0 z-50 bg-cream p-2 lg:hidden">
            <ReaderPane article={selected} onClose={handleClose} />
          </div>
        ) : null}
      </main>

      {!selected ? (
        <footer className="mx-auto mt-10 max-w-4xl px-4 pb-6 text-center font-retro text-base text-ink/50">
          ★ Sources: BBC · NYT · Guardian · Hacker News · Reddit ★
          <div className="mt-1 font-pixel text-[8px] uppercase tracking-wider">
            Public news only — no Microsoft-confidential content
          </div>
        </footer>
      ) : null}
    </div>
  );
}
