'use client';

import {
  PRODUCT_LABELS,
  ROLE_LABELS,
  SOURCE_LABELS,
  type ScoredArticle,
} from '@/lib/curation/types';
import { isFrameBlocked } from '@/lib/curation/blocked-frames';
import { playSelect } from '@/lib/sounds';

const SOURCE_CLASSES: Record<string, string> = {
  bbc: 'bg-bbc text-white',
  nyt: 'bg-shadow text-white',
  guardian: 'bg-guardian text-white',
  hn: 'bg-hn text-white',
  reddit: 'bg-reddit text-white',
};

function timeAgo(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export function ArticleCard({
  article,
  showDebug,
  active,
  onSelect,
}: {
  article: ScoredArticle;
  showDebug: boolean;
  active: boolean;
  onSelect: (a: ScoredArticle) => void;
}) {
  // Allow ctrl/cmd/middle-click to fall through to a normal new-tab open.
  // Also fall through (don't preventDefault) for sites we know refuse to
  // be embedded in an iframe — saves the user from a blank reader pane.
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    if (isFrameBlocked(article.url)) return;
    e.preventDefault();
    playSelect();
    onSelect(article);
  };

  return (
    <article
      className={[
        'nes-card p-3 transition-transform',
        active ? 'translate-x-[2px] translate-y-[2px] shadow-nes-sm' : '',
      ].join(' ')}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={`nes-chip ${
            SOURCE_CLASSES[article.source] ?? 'bg-shadow text-white'
          }`}
        >
          {SOURCE_LABELS[article.source]}
          {article.subSource ? ` · ${article.subSource}` : ''}
        </span>
        <span className="font-retro text-base text-ink/70">
          {timeAgo(article.publishedAt)}
        </span>
        {article.engagement ? (
          <span className="font-retro text-base text-ink/70">
            ▲ {article.engagement}
          </span>
        ) : null}
        {showDebug ? (
          <span className="ml-auto nes-tag bg-coin text-ink">
            score {article.score}
          </span>
        ) : null}
      </div>

      <h3 className="font-retro text-xl leading-snug text-ink">
        <a
          href={article.url}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline decoration-mario decoration-2 underline-offset-2"
        >
          {article.title}
        </a>
      </h3>

      {article.summary ? (
        <p className="mt-1 line-clamp-2 font-retro text-base text-ink/75">
          {article.summary}
        </p>
      ) : null}

      {(article.products.length > 0 || article.roles.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {article.products.map((p) => (
            <span key={`p-${p}`} className="nes-tag bg-sky text-white">
              {PRODUCT_LABELS[p]}
            </span>
          ))}
          {article.roles.map((r) => (
            <span key={`r-${r}`} className="nes-tag bg-luigi text-white">
              {ROLE_LABELS[r]}
            </span>
          ))}
        </div>
      )}

      {showDebug ? (
        <pre className="mt-3 overflow-x-auto border-2 border-ink bg-cream p-2 font-mono text-[10px] text-ink">
{JSON.stringify(article.scoreBreakdown, null, 2)}
        </pre>
      ) : null}

      {article.commentsUrl && article.commentsUrl !== article.url ? (
        <div className="mt-2">
          <a
            href={article.commentsUrl}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
              if (isFrameBlocked(article.commentsUrl!)) return;
              e.preventDefault();
              playSelect();
              onSelect({ ...article, url: article.commentsUrl! });
            }}
            target="_blank"
            rel="noopener noreferrer"
            className="font-pixel text-[9px] uppercase text-ink/70 hover:text-mario"
          >
            ▶ discussion
          </a>
        </div>
      ) : null}
    </article>
  );
}

