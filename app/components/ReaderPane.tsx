'use client';

import { useEffect, useRef, useState } from 'react';
import { SOURCE_LABELS, type ScoredArticle } from '@/lib/curation/types';
import { playClose } from '@/lib/sounds';

const SOURCE_CLASSES: Record<string, string> = {
  bbc: 'bg-bbc text-white',
  nyt: 'bg-shadow text-white',
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
  const [hintHidden, setHintHidden] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setHintHidden(window.localStorage.getItem(HINT_DISMISS_KEY) === '1');
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        playClose();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleClose = () => {
    playClose();
    onClose();
  };

  const dismissHint = () => {
    setHintHidden(true);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(HINT_DISMISS_KEY, '1');
    }
  };

  return (
    <aside className="nes-card flex h-full flex-col overflow-hidden">
      <header className="flex items-start gap-2 border-b-2 border-ink bg-cream p-2">
        <span
          className={`nes-chip shrink-0 ${
            SOURCE_CLASSES[article.source] ?? 'bg-shadow text-white'
          }`}
        >
          {SOURCE_LABELS[article.source]}
          {article.subSource ? ` · ${article.subSource}` : ''}
        </span>
        <h2
          className="min-w-0 flex-1 truncate font-retro text-lg text-ink"
          title={article.title}
        >
          {article.title}
        </h2>
        <a
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="nes-btn nes-btn--primary shrink-0"
          title="Open in new tab"
        >
          ↗
        </a>
        <button
          onClick={handleClose}
          aria-label="Close reader"
          className="nes-btn nes-btn--danger shrink-0"
        >
          ✕
        </button>
      </header>

      {!hintHidden ? (
        <div className="border-b-2 border-ink bg-coin px-4 py-3 font-retro text-base leading-relaxed text-ink">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <span className="font-pixel text-[10px] uppercase">⚠ Heads up.</span>{' '}
              Seeing a sad-face &ldquo;refused to connect&rdquo;? You&rsquo;re not
              crazy. Most newsrooms (BBC, NYT, Guardian, GitHub, etc.) refuse
              to be embedded in an iframe — and corporate networks often block
              Reddit outright. This page can&rsquo;t tell the difference; it
              just gets a blank frame. Known offenders now open in a new tab
              automatically; for the rest,{' '}
              <a
                href={article.url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-pixel text-[10px] uppercase underline decoration-2"
              >
                Open in a new tab ↗
              </a>{' '}
              works every time.
            </div>
            <button
              onClick={dismissHint}
              aria-label="Dismiss"
              className="nes-btn shrink-0"
              title="Don't show this again"
            >
              ✕
            </button>
          </div>
        </div>
      ) : null}

      <div className="relative flex-1 bg-cream">
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

