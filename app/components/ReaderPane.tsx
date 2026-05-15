'use client';

import { useEffect, useRef, useState } from 'react';
import { SOURCE_LABELS, type ScoredArticle } from '@/lib/curation/types';

const SOURCE_CLASSES: Record<string, string> = {
  bbc: 'bg-bbc text-white',
  guardian: 'bg-guardian text-white',
  hn: 'bg-hn text-white',
  reddit: 'bg-reddit text-white',
};

export function ReaderPane({
  article,
  onClose,
}: {
  article: ScoredArticle;
  onClose: () => void;
}) {
  // Many news sites refuse to be iframed (X-Frame-Options / CSP). We can't
  // detect that programmatically from a static page (no headers, no errors
  // fire on blocked frames), so we show a soft "if blank, click here" hint
  // after a couple seconds when load hasn't reported in.
  const [loaded, setLoaded] = useState(false);
  const [showFallbackHint, setShowFallbackHint] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    setLoaded(false);
    setShowFallbackHint(false);
    const t = setTimeout(() => {
      if (!loaded) setShowFallbackHint(true);
    }, 2500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article.url]);

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

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

      <div className="relative flex-1 bg-neutral-50 dark:bg-neutral-950">
        <iframe
          ref={iframeRef}
          key={article.url}
          src={article.url}
          title={article.title}
          onLoad={() => setLoaded(true)}
          className="h-full w-full"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer-when-downgrade"
        />
        {showFallbackHint && !loaded ? (
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
            <div className="pointer-events-auto max-w-md rounded-md border border-amber-300 bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 shadow dark:border-amber-700 dark:bg-amber-950 dark:text-amber-200">
              <div className="mb-1 font-semibold">Frame still blank? You&rsquo;re not crazy.</div>
              <p>
                Some sites (looking at you, BBC, NYT, and basically every
                major newsroom) refuse to be embedded in an iframe — and a few
                others (👋 Reddit) are blocked outright on most corporate
                networks. If you&rsquo;re on the work VPN or behind a proxy,
                that&rsquo;s probably what&rsquo;s happening here, not your
                computer suddenly forgetting how the internet works.
              </p>
              <p className="mt-2">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold underline"
                >
                  Open in a new tab →
                </a>{' '}
                works every time.
              </p>
            </div>
          </div>
        ) : null}
      </div>
    </aside>
  );
}
