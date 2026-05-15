import Parser from 'rss-parser';
import type { RawArticle, SourceId } from './types';const UA =
  'newNews-poc/0.1 (+https://github.com/Cardigan/newNews) team-curated-feed';

const rss = new Parser({
  headers: { 'User-Agent': UA },
  timeout: 15000,
});

function hashId(...parts: string[]): string {
  // simple stable hash, no crypto dep needed
  const s = parts.join('|');
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return (await res.json()) as T;
}

// ---------- BBC ----------
const BBC_FEEDS = [
  { name: 'tech', url: 'https://feeds.bbci.co.uk/news/technology/rss.xml' },
  { name: 'world', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { name: 'business', url: 'https://feeds.bbci.co.uk/news/business/rss.xml' },
];

async function fetchBbc(): Promise<RawArticle[]> {
  const results: RawArticle[] = [];
  for (const feed of BBC_FEEDS) {
    try {
      const parsed = await rss.parseURL(feed.url);
      for (const item of parsed.items) {
        if (!item.link || !item.title) continue;
        results.push({
          id: hashId('bbc', item.link),
          source: 'bbc',
          subSource: feed.name,
          title: item.title,
          url: item.link,
          summary: item.contentSnippet ?? item.content ?? '',
          publishedAt: item.isoDate ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(`[bbc:${feed.name}] failed:`, (err as Error).message);
    }
  }
  return results;
}

// ---------- NYT ----------
const NYT_FEEDS = [
  { name: 'tech', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml' },
  { name: 'business', url: 'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml' },
  { name: 'home', url: 'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml' },
];

async function fetchNyt(): Promise<RawArticle[]> {
  const results: RawArticle[] = [];
  for (const feed of NYT_FEEDS) {
    try {
      const parsed = await rss.parseURL(feed.url);
      for (const item of parsed.items) {
        if (!item.link || !item.title) continue;
        results.push({
          id: hashId('nyt', item.link),
          source: 'nyt',
          subSource: feed.name,
          title: item.title,
          url: item.link,
          summary: item.contentSnippet ?? item.content ?? '',
          publishedAt: item.isoDate ?? new Date().toISOString(),
        });
      }
    } catch (err) {
      console.warn(`[nyt:${feed.name}] failed:`, (err as Error).message);
    }
  }
  return results;
}

// ---------- Guardian ----------
interface GuardianResponse {
  response: {
    results: Array<{
      id: string;
      webTitle: string;
      webUrl: string;
      webPublicationDate: string;
      fields?: { trailText?: string };
    }>;
  };
}

async function fetchGuardian(): Promise<RawArticle[]> {
  const key = process.env.GUARDIAN_API_KEY;
  if (key) {
    try {
      const url = new URL('https://content.guardianapis.com/search');
      url.searchParams.set('api-key', key);
      url.searchParams.set('show-fields', 'trailText');
      url.searchParams.set('order-by', 'newest');
      url.searchParams.set('page-size', '50');
      url.searchParams.set(
        'q',
        'azure OR microsoft OR cloud OR data OR ai OR kubernetes OR snowflake OR databricks',
      );
      const data = await fetchJson<GuardianResponse>(url.toString());
      return data.response.results.map((r) => ({
        id: hashId('guardian', r.id),
        source: 'guardian',
        title: r.webTitle,
        url: r.webUrl,
        summary: r.fields?.trailText ?? '',
        publishedAt: r.webPublicationDate,
      }));
    } catch (err) {
      console.warn('[guardian:api] failed, falling back to RSS:', (err as Error).message);
    }
  }
  // RSS fallback (Guardian Tech section)
  try {
    const parsed = await rss.parseURL(
      'https://www.theguardian.com/uk/technology/rss',
    );
    return parsed.items
      .filter((i) => i.link && i.title)
      .map((i) => ({
        id: hashId('guardian', i.link!),
        source: 'guardian' as SourceId,
        title: i.title!,
        url: i.link!,
        summary: i.contentSnippet ?? '',
        publishedAt: i.isoDate ?? new Date().toISOString(),
      }));
  } catch (err) {
    console.warn('[guardian:rss] failed:', (err as Error).message);
    return [];
  }
}

// ---------- Hacker News ----------
interface HnItem {
  id: number;
  title?: string;
  url?: string;
  text?: string;
  score?: number;
  time?: number;
  descendants?: number;
}

async function fetchHn(limit = 75): Promise<RawArticle[]> {
  try {
    const ids = await fetchJson<number[]>(
      'https://hacker-news.firebaseio.com/v0/topstories.json',
    );
    const top = ids.slice(0, limit);
    const items = await Promise.all(
      top.map((id) =>
        fetchJson<HnItem>(
          `https://hacker-news.firebaseio.com/v0/item/${id}.json`,
        ).catch(() => null),
      ),
    );
    return items
      .filter((i): i is HnItem => !!i && !!i.title)
      .map((i) => ({
        id: hashId('hn', String(i.id)),
        source: 'hn' as SourceId,
        title: i.title!,
        url: i.url ?? `https://news.ycombinator.com/item?id=${i.id}`,
        summary: i.text ?? '',
        publishedAt: new Date((i.time ?? Date.now() / 1000) * 1000).toISOString(),
        engagement: i.score,
        commentsUrl: `https://news.ycombinator.com/item?id=${i.id}`,
      }));
  } catch (err) {
    console.warn('[hn] failed:', (err as Error).message);
    return [];
  }
}

// ---------- Reddit ----------
const SUBREDDITS = [
  // core team-relevant
  'azure',
  'AzureGovernment',
  'dataengineering',
  'MicrosoftFabric',
  'PowerBI',
  'databricks',
  'snowflake',
  'apachespark',
  // SRE / dev
  'sre',
  'devops',
  'kubernetes',
  'sysadmin',
  'programming',
  // AI
  'MachineLearning',
  'artificial',
  'LocalLLaMA',
  'OpenAI',
  // fun, job-adjacent
  'ProgrammingHumor',
  'talesfromtechsupport',
  // UFO / conspiracy — filtered to news-only at scoring time
  'UFOs',
  'UFOB',
  'aliens',
  'HighStrangeness',
  'conspiracy',
];

// Subreddits where we only want LINK posts (external article URLs).
// Used to keep the UFO/conspiracy channel news-only and drop discussion
// threads / self-posts.
export const NEWS_ONLY_SUBREDDITS = new Set(
  ['ufos', 'ufob', 'aliens', 'highstrangeness', 'conspiracy'].map((s) =>
    s.toLowerCase(),
  ),
);

// Reddit RSS embeds two anchors in each item's description:
//   <a href="ARTICLE_URL">[link]</a>  <a href="COMMENTS_URL">[comments]</a>
// When [link] differs from [comments], the post is a link to an external
// article — that's exactly the "current news article" signal we want.
function extractExternalUrlFromContent(
  content: string | undefined,
  commentsUrl: string,
): string | null {
  if (!content) return null;
  const m = content.match(/href="([^"]+)"[^>]*>\s*\[link\]/i);
  if (!m) return null;
  const link = m[1];
  if (!link || link === commentsUrl) return null;
  if (link.includes('reddit.com')) return null;
  return link;
}

async function fetchReddit(): Promise<RawArticle[]> {
  const results: RawArticle[] = [];
  await Promise.all(
    SUBREDDITS.map(async (sub) => {
      const url = `https://www.reddit.com/r/${sub}/.rss`;
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent': UA,
            Accept: 'application/rss+xml,application/xml,text/xml,*/*',
          },
        });
        if (!res.ok) throw new Error(`status ${res.status}`);
        const xml = await res.text();
        const parsed = await rss.parseString(xml);
        for (const item of parsed.items) {
          if (!item.link || !item.title) continue;
          const commentsUrl = item.link;
          const externalUrl = extractExternalUrlFromContent(
            item.content,
            commentsUrl,
          );
          // Some subs (UFO/conspiracy) we only want as news, not as
          // self-post discussions. Skip if the post has no external link.
          if (NEWS_ONLY_SUBREDDITS.has(sub.toLowerCase()) && !externalUrl) {
            continue;
          }
          // Prefer the external article URL when present so dedupe across
          // sources works (a BBC story shared in r/azure collapses with
          // the same BBC RSS item).
          const canonical = externalUrl ?? commentsUrl;
          results.push({
            id: hashId('reddit', canonical),
            source: 'reddit',
            subSource: sub,
            title: item.title,
            url: canonical,
            summary: (item.contentSnippet ?? '').slice(0, 400),
            publishedAt: item.isoDate ?? new Date().toISOString(),
            commentsUrl,
          });
        }
      } catch (err) {
        console.warn(`[reddit:${sub}] failed:`, (err as Error).message);
      }
    }),
  );
  return results;
}

// ---------- Orchestration ----------
export async function fetchAll(): Promise<RawArticle[]> {
  const [bbc, nyt, guardian, hn, reddit] = await Promise.all([
    fetchBbc(),
    fetchNyt(),
    fetchGuardian(),
    fetchHn(),
    fetchReddit(),
  ]);
  console.log(
    `[fetch] bbc=${bbc.length} nyt=${nyt.length} guardian=${guardian.length} hn=${hn.length} reddit=${reddit.length}`,
  );
  return [...bbc, ...nyt, ...guardian, ...hn, ...reddit];
}
