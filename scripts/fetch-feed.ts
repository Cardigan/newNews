import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fetchAll } from '../lib/curation/sources';
import { scoreArticle } from '../lib/curation/score';
import type {
  FeedFile,
  RawArticle,
  ScoredArticle,
  SourceId,
} from '../lib/curation/types';

const OUT_PATH = resolve(process.cwd(), 'public/data/feed.json');

// Minimum score threshold so the feed isn't drowned in unrelated headlines.
const MIN_SCORE = 3;

// Per-source caps so one chatty source (Reddit) doesn't crowd out the others.
// The final feed is the union of these caps, sorted by score.
const PER_SOURCE_CAP: Record<SourceId, number> = {
  bbc: 50,
  nyt: 50,
  guardian: 50,
  hn: 50,
  reddit: 80,
};

function dedupe(items: RawArticle[]): RawArticle[] {
  const seen = new Map<string, RawArticle>();
  for (const a of items) {
    const key = a.url.replace(/[#?].*$/, '').toLowerCase();
    const prev = seen.get(key);
    if (!prev) {
      seen.set(key, a);
      continue;
    }
    // Keep the one with higher engagement, else first.
    if ((a.engagement ?? 0) > (prev.engagement ?? 0)) seen.set(key, a);
  }
  return Array.from(seen.values());
}

function applyPerSourceCaps(items: ScoredArticle[]): ScoredArticle[] {
  const bySource = new Map<SourceId, ScoredArticle[]>();
  for (const a of items) {
    const arr = bySource.get(a.source) ?? [];
    arr.push(a);
    bySource.set(a.source, arr);
  }
  const out: ScoredArticle[] = [];
  for (const [src, arr] of bySource) {
    arr.sort((a, b) => b.score - a.score);
    const cap = PER_SOURCE_CAP[src] ?? 40;
    out.push(...arr.slice(0, cap));
  }
  return out.sort((a, b) => b.score - a.score);
}

async function main() {
  console.log('[fetch-feed] starting');
  const raw = await fetchAll();
  console.log(`[fetch-feed] raw items: ${raw.length}`);

  const deduped = dedupe(raw);
  console.log(`[fetch-feed] after dedupe: ${deduped.length}`);

  const scored = deduped
    .map((a) => scoreArticle(a))
    .filter((a) => a.score >= MIN_SCORE);

  const final = applyPerSourceCaps(scored);

  // Log per-source counts so it's obvious if one source is starving.
  const counts: Record<string, number> = {};
  for (const a of final) counts[a.source] = (counts[a.source] ?? 0) + 1;
  console.log('[fetch-feed] per-source kept:', counts);

  const feed: FeedFile = {
    generatedAt: new Date().toISOString(),
    count: final.length,
    articles: final,
  };

  // Skip write if content (excluding generatedAt) hasn't changed.
  const newBody = JSON.stringify({ count: feed.count, articles: feed.articles });
  const newHash = createHash('sha256').update(newBody).digest('hex');

  if (existsSync(OUT_PATH)) {
    try {
      const prev = JSON.parse(readFileSync(OUT_PATH, 'utf-8')) as FeedFile;
      const prevBody = JSON.stringify({
        count: prev.count,
        articles: prev.articles,
      });
      const prevHash = createHash('sha256').update(prevBody).digest('hex');
      if (prevHash === newHash) {
        console.log('[fetch-feed] no content changes; skipping write');
        return;
      }
    } catch {
      // fall through to write
    }
  }

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, JSON.stringify(feed, null, 2));
  console.log(`[fetch-feed] wrote ${final.length} articles to ${OUT_PATH}`);
}

main().catch((err) => {
  console.error('[fetch-feed] FATAL', err);
  process.exit(1);
});
