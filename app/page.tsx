'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArticleCard } from './components/ArticleCard';
import { ChannelToggles } from './components/ChannelToggles';
import { ReaderPane } from './components/ReaderPane';
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

  useEffect(() => {
    setPrefs(loadPrefs());
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

  const filtered = useMemo(() => {
    if (!feed) return [];
    return feed.articles.filter((a) => {
      if (!sourceSet.has(a.source)) return false;
      // Untagged general news always passes. Tagged items must match at
      // least one selected role OR product channel.
      if (a.roles.length === 0 && a.products.length === 0) return true;
      const matchesRole = a.roles.some((r) => roleSet.has(r));
      const matchesProduct = a.products.some((p) => channelSet.has(p));
      return matchesRole || matchesProduct;
    });
  }, [feed, roleSet, channelSet, sourceSet]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) counts[a.source] = (counts[a.source] ?? 0) + 1;
    return counts;
  }, [filtered]);

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
            <div className="flex items-baseline justify-between gap-2">
              <h1 className="text-2xl font-bold tracking-tight">
                newNews{' '}
                <span className="text-sm font-normal text-neutral-500">
                  curated team feed
                </span>
              </h1>
              {feed ? (
                <span className="text-xs text-neutral-500">
                  {filtered.length}/{feed.count} · updated{' '}
                  {new Date(feed.generatedAt).toLocaleString()}
                </span>
              ) : null}
            </div>

            {!selected ? (
              <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
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
                  <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
                    Sources
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {ALL_SOURCES.map((s) => {
                      const active = sourceSet.has(s);
                      return (
                        <button
                          key={s}
                          onClick={() =>
                            setPrefs((p) => ({
                              ...p,
                              sources: p.sources.includes(s)
                                ? p.sources.filter((x) => x !== s)
                                : [...p.sources, s],
                            }))
                          }
                          className={[
                            'rounded-md border px-2 py-1 text-xs transition',
                            active
                              ? 'border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-200'
                              : 'border-neutral-300 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800',
                          ].join(' ')}
                        >
                          {SOURCE_LABELS[s]}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <label className="flex cursor-pointer items-center gap-2 text-xs text-neutral-600 dark:text-neutral-400">
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
              <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
                Failed to load feed: {error}. The feed may not have been
                generated yet — run <code>npm run fetch-feed</code> locally or
                wait for the next GitHub Actions run.
              </div>
            ) : !feed ? (
              <div className="text-sm text-neutral-500">Loading feed…</div>
            ) : filtered.length === 0 ? (
              <div className="rounded border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
                No articles match your current filters. Try selecting more
                channels, a different role, or enabling more sources.
              </div>
            ) : (
              <>
                {!selected ? (
                  <div className="mb-3 text-xs text-neutral-500">
                    {ALL_SOURCES.filter((s) => sourceCounts[s]).map((s) => (
                      <span key={s} className="mr-3">
                        {SOURCE_LABELS[s]}: {sourceCounts[s]}
                      </span>
                    ))}
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
            <ReaderPane article={selected} onClose={() => setSelected(null)} />
          </section>
        ) : null}

        {/* Mobile: full-screen overlay reader */}
        {selected ? (
          <div className="fixed inset-0 z-50 bg-white p-2 lg:hidden dark:bg-neutral-950">
            <ReaderPane article={selected} onClose={() => setSelected(null)} />
          </div>
        ) : null}
      </main>

      {!selected ? (
        <footer className="mx-auto mt-10 max-w-4xl px-4 pb-6 text-center text-xs text-neutral-400">
          Sources: BBC · Guardian · Hacker News · Reddit. Public news only — no
          Microsoft-confidential content.
        </footer>
      ) : null}
    </div>
  );
}
