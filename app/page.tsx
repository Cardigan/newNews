'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArticleCard } from './components/ArticleCard';
import { ChannelToggles } from './components/ChannelToggles';
import { ReaderPane } from './components/ReaderPane';
import { PixelLogo } from './components/PixelLogo';
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

const STORAGE_KEY = 'newnews:prefs:v3';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const ALL_SOURCES: SourceId[] = ['bbc', 'nyt', 'guardian', 'hn', 'reddit'];

interface Prefs {
  roles: Role[];
  channels: ProductChannel[];
  sources: SourceId[];
  showDebug: boolean;
}

const DEFAULT_PREFS: Prefs = {
  roles: [...ROLES],
  channels: [...ALL_PRODUCTS],
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

  useEffect(() => {
    setPrefs(loadPrefs());
    setSoundOn(loadSoundPref());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) savePrefs(prefs);
  }, [prefs, hydrated]);

  useEffect(() => {
    fetch(`${BASE}/data/feed.json`, { cache: 'no-store' })
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return (await r.json()) as FeedFile;
      })
      .then(setFeed)
      .catch((e) => setError((e as Error).message));
  }, []);

  const channelSet = useMemo(() => new Set(prefs.channels), [prefs.channels]);
  const roleSet = useMemo(() => new Set(prefs.roles), [prefs.roles]);
  const sourceSet = useMemo(() => new Set(prefs.sources), [prefs.sources]);

  const MIN_RESULTS = 10;

  // Primary pass: respects all three filters (sources + roles + channels).
  const primary = useMemo(() => {
    if (!feed) return [];
    return feed.articles.filter((a) => {
      if (!sourceSet.has(a.source)) return false;
      if (a.roles.length === 0 && a.products.length === 0) return true;
      const matchesRole = a.roles.some((r) => roleSet.has(r));
      const matchesProduct = a.products.some((p) => channelSet.has(p));
      return matchesRole || matchesProduct;
    });
  }, [feed, roleSet, channelSet, sourceSet]);

  // If the primary list is too thin, broaden by relaxing the source toggle:
  // pull additional items from *any* source as long as they match the
  // selected roles/channels. This is the "get more content based on the new
  // filters" fallback. Items already in `primary` are skipped.
  const filtered = useMemo(() => {
    if (!feed || primary.length >= MIN_RESULTS) return primary;
    const seen = new Set(primary.map((a) => a.id));
    const extras: ScoredArticle[] = [];
    for (const a of feed.articles) {
      if (seen.has(a.id)) continue;
      // Skip purely untagged general news in the broaden pass — we already
      // matched those above where the source filter let them through.
      if (a.roles.length === 0 && a.products.length === 0) continue;
      const matchesRole = a.roles.some((r) => roleSet.has(r));
      const matchesProduct = a.products.some((p) => channelSet.has(p));
      if (matchesRole || matchesProduct) extras.push(a);
    }
    return [...primary, ...extras];
  }, [feed, primary, roleSet, channelSet]);

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
                    {ALL_SOURCES.map((s) => {
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
