'use client';

import { useEffect, useRef, useState } from 'react';
import { SOURCE_LABELS, type ScoredArticle } from '@/lib/curation/types';

const SOURCE_CLASSES: Record<string, string> = {
  bbc: 'bg-bbc text-white',
  nyt: 'bg-black text-white',
  guardian: 'bg-guardian text-white',
  hn: 'bg-hn text-white',
  reddit: 'bg-reddit text-white',
};

const HINT_DISMISS_KEY = 'newnews:hideFrameHint';

export function ReaderPane({
  article,
  onClose,
}: {
  article: ScoredArticle;
  onClose: () => void;
}) {
  // Browsers don't expose X-Frame-Options / CSP / "refused to connect"
  // failures to JS, AND iframe.onload often fires for the browser's own
  // error page — so we can't reliably detect a blocked frame. Instead we
  // *always* show a small explanatory banner above the iframe, and let
  // the user dismiss it persistently if they don't need it.
  const [hintHidden, setHintHidden] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHintHidden(window.localStorage.getItem(HINT_DISMISS_KEY) === '1');
    }
  }, []);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const dismissHint = () => {
    setHintHidden(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HINT_DISMISS_KEY, '1');
    }
  };

  return (
    <aside className="flex h-full flex-col overflow-hidden rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-800 dark:bg-neutral-900">
      <header className="flex items-start gap-2 border-b border-neutral-200 p-3 dark:border-neutral-800">
        <span
          className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold ${
            SOURCE_CLASSES[article.source] ?? 'bg-neutral-700 text-white'
          }`}
        >
          {SOURCE_LABELS[article.source]}
          {article.subSource ? ` · ${article.subSource}` : ''}
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold" title={article.title}>
          {article.title}
        </h2>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
          title="Open in new tab"
        >
          ↗
        </a>
        <button
          onClick={onClose}
          aria-label="Close reader"
          className="shrink-0 rounded border border-neutral-300 px-2 py-0.5 text-xs text-neutral-700 hover:bg-neutral-100 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
        >
          ✕
        </button>
      </header>

      {!hintHidden ? (
        <div className="border-b border-amber-300 bg-amber-50 px-4 py-3 text-base leading-relaxed text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <span className="font-semibold">Seeing a sad-face &ldquo;refused to connect&rdquo;? You&rsquo;re not crazy.</span>{' '}
              Most newsrooms (BBC, NYT, Guardian, GitHub, etc.) refuse to be
              embedded in an iframe — and corporate networks often block Reddit
              outright. This page can&rsquo;t tell the difference; it just gets
              a blank frame.{' '}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline"
              >
                Open in a new tab ↗
              </a>{' '}
              works every time.
            </div>
            <button
              onClick={dismissHint}
              aria-label="Dismiss"
              className="shrink-0 rounded px-1 text-amber-900/70 hover:bg-amber-100 dark:text-amber-200/70 dark:hover:bg-amber-900"
              title="Don't show this again"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative flex-1 bg-neutral-50 dark:bg-neutral-950">
        <iframe
          ref={iframeRef}
          key={article.url}
          src={article.url}
          title={article.title}
          className="h-full w-full"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </aside>
  );
}
