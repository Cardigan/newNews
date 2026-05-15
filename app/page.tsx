'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArticleCard } from './components/ArticleCard';
import { ChannelToggles } from './components/ChannelToggles';
import { RolePicker } from './components/RolePicker';
import {
  ALL_PRODUCTS,
  type FeedFile,
  type ProductChannel,
  type Role,
} from '@/lib/curation/types';

const STORAGE_KEY = 'newnews:prefs:v1';
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

interface Prefs {
  role: Role | null;
  channels: ProductChannel[];
  showDebug: boolean;
}

const DEFAULT_PREFS: Prefs = {
  role: null,
  channels: ALL_PRODUCTS,
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

  const filtered = useMemo(() => {
    if (!feed) return [];
    return feed.articles.filter((a) => {
      // Role filter: if a role is selected, prefer items tagged with that role,
      // but always allow strongly product-matched items through.
      const roleOk =
        !prefs.role || a.roles.includes(prefs.role) || a.products.length > 0;
      // Channel filter: at least one of the article's products must be selected,
      // OR the article has no product tags but matches the role.
      const channelOk =
        a.products.length === 0
          ? roleOk && !!prefs.role && a.roles.includes(prefs.role)
          : a.products.some((p) => channelSet.has(p));
      return roleOk && channelOk;
    });
  }, [feed, prefs.role, channelSet]);

  return (
    <main className="mx-auto max-w-4xl px-4 py-6">
      <header className="mb-6 space-y-4">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-bold tracking-tight">
            newNews <span className="text-sm font-normal text-neutral-500">curated team feed</span>
          </h1>
          {feed ? (
            <span className="text-xs text-neutral-500">
              updated {new Date(feed.generatedAt).toLocaleString()}
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
          No articles match your current filters. Try selecting more channels or
          a different role.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => (
            <ArticleCard key={a.id} article={a} showDebug={prefs.showDebug} />
          ))}
        </div>
      )}

      <footer className="mt-10 text-center text-xs text-neutral-400">
        Sources: BBC · Guardian · Hacker News · Reddit. Public news only — no
        Microsoft-confidential content.
      </footer>
    </main>
  );
}
