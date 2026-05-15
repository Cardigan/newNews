'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArticleCard } from './components/ArticleCard';
import { ChannelToggles } from './components/ChannelToggles';
import { RolePicker } from './components/RolePicker';
import {
  ALL_PRODUCTS,
  SOURCE_LABELS,
  type FeedFile,
  type ProductChannel,
  type Role,
  type SourceId,
} from '@/lib/curation/types';

const STORAGE_KEY = 'newnews:prefs:v2';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

const ALL_SOURCES: SourceId[] = ['bbc', 'guardian', 'hn', 'reddit'];

interface Prefs {
  role: Role | null;
  channels: ProductChannel[];
  sources: SourceId[];
  showDebug: boolean;
}

const DEFAULT_PREFS: Prefs = {
  role: null,
  channels: ALL_PRODUCTS,
  sources: ALL_SOURCES,
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
  const sourceSet = useMemo(() => new Set(prefs.sources), [prefs.sources]);

  const filtered = useMemo(() => {
    if (!feed) return [];
    return feed.articles.filter((a) => {
      if (!sourceSet.has(a.source)) return false;
      // Channel filter: items with product tags must overlap with selected
      // channels. Items without product tags are general news and always pass.
      const channelOk =
        a.products.length === 0 ||
        a.products.some((p) => channelSet.has(p));

      // Role filter: if a role is selected, items with role tags must include
      // it. Items without any role tag are kept (general/cross-cutting news).
      const roleOk =
        !prefs.role || a.roles.length === 0 || a.roles.includes(prefs.role);

      return channelOk && roleOk;
    });
  }, [feed, prefs.role, channelSet, sourceSet]);

  const sourceCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const a of filtered) counts[a.source] = (counts[a.source] ?? 0) + 1;
    return counts;
  }, [filtered]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            newNews <span className="text-sm font-normal text-neutral-500">curated team feed</span>
          </h1>
          {feed ? (
            <span className="text-xs text-neutral-500">
              {filtered.length}/{feed.count} · updated{' '}
              {new Date(feed.generatedAt).toLocaleString()}
            </span>
          ) : null}
        </div>

        <div className="space-y-3 rounded-lg border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <div className="mb-2 text-xs uppercase tracking-wide text-neutral-500">
              Your role
            </div>
            <RolePicker
              value={prefs.role}
              onChange={(role) => setPrefs((p) => ({ ...p, role }))}
            />
          </div>

          <ChannelToggles
            selected={channelSet}
            onToggle={(c) =>
              setPrefs((p) => ({
                ...p,
                channels: p.channels.includes(c)
                  ? p.channels.filter((x) => x !== c)
                  : [...p.channels, c],
              }))
            }
            onAll={() => setPrefs((p) => ({ ...p, channels: ALL_PRODUCTS }))}
            onNone={() => setPrefs((p) => ({ ...p, channels: [] }))}
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
      </header>

      {error ? (
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          Failed to load feed: {error}. The feed may not have been generated yet —
          run <code>npm run fetch-feed</code> locally or wait for the next
          GitHub Actions run.
        </div>
      ) : !feed ? (
        <div className="text-sm text-neutral-500">Loading feed…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded border border-neutral-200 bg-white p-6 text-center text-sm text-neutral-500 dark:border-neutral-800 dark:bg-neutral-900">
          No articles match your current filters. Try selecting more channels,
          a different role, or enabling more sources.
        </div>
      ) : (
        <>
          <div className="mb-3 text-xs text-neutral-500">
            {ALL_SOURCES.filter((s) => sourceCounts[s]).map((s) => (
              <span key={s} className="mr-3">
                {SOURCE_LABELS[s]}: {sourceCounts[s]}
              </span>
            ))}
          </div>
          <div className="space-y-3">
            {filtered.map((a) => (
              <ArticleCard key={a.id} article={a} showDebug={prefs.showDebug} />
            ))}
          </div>
        </>
      )}

      <footer className="mt-10 text-center text-xs text-neutral-400">
        Sources: BBC · Guardian · Hacker News · Reddit. Public news only — no
        Microsoft-confidential content.
      </footer>
    </main>
  );
}
