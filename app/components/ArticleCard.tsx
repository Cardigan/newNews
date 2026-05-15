'use client';

import {
  PRODUCT_LABELS,
  ROLE_LABELS,
  SOURCE_LABELS,
  type ScoredArticle,
} from '@/lib/curation/types';

const SOURCE_CLASSES: Record<string, string> = {
  bbc: 'bg-bbc text-white',
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
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return;
    e.preventDefault();
    onSelect(article);
  };

  return (
    <article
      className={[
        'rounded-lg border bg-white p-4 shadow-sm transition hover:shadow-md dark:bg-neutral-900',
        active
          ? 'border-blue-500 ring-2 ring-blue-200 dark:ring-blue-900'
          : 'border-neutral-200 dark:border-neutral-800',
      ].join(' ')}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
        <span
          className={`rounded px-1.5 py-0.5 font-semibold ${
            SOURCE_CLASSES[article.source] ?? 'bg-neutral-700 text-white'
          }`}
        >
          {SOURCE_LABELS[article.source]}
          {article.subSource ? ` · ${article.subSource}` : ''}
        </span>
        <span className="text-neutral-500">{timeAgo(article.publishedAt)}</span>
        {article.engagement ? (
          <span className="text-neutral-500">▲ {article.engagement}</span>
        ) : null}
        {showDebug ? (
          <span className="ml-auto rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
            score {article.score}
          </span>
        ) : null}
      </div>

      <h3 className="text-base font-semibold leading-snug">
        <a
          href={article.url}
          onClick={handleClick}
          target="_blank"
          rel="noopener noreferrer"
          className="hover:underline"
        >
          {article.title}
        </a>
      </h3>

      {article.summary ? (
        <p className="mt-1 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-400">
          {article.summary}
        </p>
      ) : null}

      {(article.products.length > 0 || article.roles.length > 0) && (
        <div className="mt-3 flex flex-wrap gap-1">
          {article.products.map((p) => (
            <span
              key={`p-${p}`}
              className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[11px] text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200"
            >
              {PRODUCT_LABELS[p]}
            </span>
          ))}
          {article.roles.map((r) => (
            <span
              key={`r-${r}`}
              className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
            >
              {ROLE_LABELS[r]}
            </span>
          ))}
        </div>
      )}

      {showDebug ? (
        <pre className="mt-3 overflow-x-auto rounded bg-neutral-50 p-2 font-mono text-[10px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
{JSON.stringify(article.scoreBreakdown, null, 2)}
        </pre>
      ) : null}

      {article.commentsUrl && article.commentsUrl !== article.url ? (
        <div className="mt-2 text-xs">
          <a
            href={article.commentsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-neutral-500 hover:underline"
          >
            discussion →
          </a>
        </div>
      ) : null}
    </article>
  );
}
