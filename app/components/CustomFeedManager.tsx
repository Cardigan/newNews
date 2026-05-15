'use client';

import { useState } from 'react';
import {
  loadCustomFeeds,
  makeFeedId,
  saveCustomFeeds,
  type CustomFeed,
} from '@/lib/custom-feeds';
import { playOpen, playSelect, playTick } from '@/lib/sounds';

export function CustomFeedManager({
  feeds,
  onChange,
  onRefresh,
  refreshing,
  errors,
}: {
  feeds: CustomFeed[];
  onChange: (next: CustomFeed[]) => void;
  onRefresh: () => void;
  refreshing: boolean;
  errors: Record<string, string>;
}) {
  const [url, setUrl] = useState('');
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    let normalized: string;
    try {
      const parsed = new URL(trimmedUrl);
      if (!/^https?:$/.test(parsed.protocol)) {
        throw new Error('Only http/https URLs are supported.');
      }
      normalized = parsed.toString();
    } catch (err) {
      setFormError(
        err instanceof Error ? err.message : 'That doesn\u2019t look like a URL.',
      );
      return;
    }
    if (feeds.some((f) => f.url === normalized)) {
      setFormError('You\u2019ve already added that feed.');
      return;
    }
    const trimmedName = name.trim() || guessNameFromUrl(normalized);
    const next: CustomFeed[] = [
      ...feeds,
      { id: makeFeedId(), url: normalized, name: trimmedName },
    ];
    saveCustomFeeds(next);
    onChange(next);
    setUrl('');
    setName('');
    setFormError(null);
    playOpen();
  };

  const remove = (id: string) => {
    const next = feeds.filter((f) => f.id !== id);
    saveCustomFeeds(next);
    onChange(next);
    playSelect();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="pixel-label text-ink/70">Custom Feeds</span>
        {feeds.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              playTick();
              onRefresh();
            }}
            disabled={refreshing}
            className="nes-btn"
          >
            {refreshing ? 'Refreshing\u2026' : 'Refresh'}
          </button>
        ) : null}
      </div>

      <form
        onSubmit={submit}
        className="grid grid-cols-1 gap-1.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,140px)_auto]"
      >
        <input
          type="url"
          inputMode="url"
          placeholder="https://example.com/feed.xml"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="border-2 border-ink bg-cream px-2 py-1 font-retro text-base text-ink focus:outline-none focus:ring-2 focus:ring-sky"
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border-2 border-ink bg-cream px-2 py-1 font-retro text-base text-ink focus:outline-none focus:ring-2 focus:ring-sky"
        />
        <button type="submit" className="nes-btn nes-btn--primary">
          + Add
        </button>
      </form>

      {formError ? (
        <p className="font-retro text-base text-mario">{formError}</p>
      ) : null}

      {feeds.length > 0 ? (
        <ul className="space-y-1">
          {feeds.map((f) => {
            const err = errors[f.id];
            return (
              <li
                key={f.id}
                className="flex items-center justify-between gap-2 border-2 border-ink/30 bg-cream/60 px-2 py-1"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-retro text-base text-ink">
                    {f.name}
                  </div>
                  <div className="truncate font-retro text-sm text-ink/60">
                    {f.url}
                  </div>
                  {err ? (
                    <div className="font-retro text-sm text-mario">
                      Couldn’t fetch: {err}
                    </div>
                  ) : null}
                </div>
                <button
                  type="button"
                  onClick={() => remove(f.id)}
                  className="font-pixel text-[10px] uppercase text-mario hover:underline"
                  aria-label={`Remove ${f.name}`}
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="font-retro text-base text-ink/60">
          Paste any RSS or Atom feed URL. Feeds are saved on this device only
          and fetched through a public CORS proxy
          (<a
            href="https://allorigins.win/"
            target="_blank"
            rel="noreferrer"
            className="underline"
          >
            allorigins.win
          </a>) since most newsroom feeds don’t allow direct browser
          fetches.
        </p>
      )}
    </div>
  );
}

function guessNameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return 'Custom feed';
  }
}

// Re-exported so callers don't need a separate import path for the loader.
export { loadCustomFeeds };
