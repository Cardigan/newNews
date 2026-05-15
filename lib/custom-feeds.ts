// Client-side custom RSS/Atom feeds. Stored in localStorage on the user's
// device — there is no server. Because the site is static (GitHub Pages),
// fetches happen straight from the browser, which means CORS applies.
// Most newsroom feeds don't send Access-Control-Allow-Origin, so we route
// through a public CORS proxy (api.allorigins.win) as a fallback. The
// proxy is best-effort; if a feed still fails we surface the error to
// the user instead of failing silently.

import type { ScoredArticle, SourceId } from '@/lib/curation/types';

export interface CustomFeed {
  id: string;
  url: string;
  name: string;
}

const STORAGE_KEY = 'newnews:customFeeds:v1';
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

export function loadCustomFeeds(): CustomFeed[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (f): f is CustomFeed =>
        typeof f === 'object' &&
        f !== null &&
        typeof (f as CustomFeed).id === 'string' &&
        typeof (f as CustomFeed).url === 'string' &&
        typeof (f as CustomFeed).name === 'string',
    );
  } catch {
    return [];
  }
}

export function saveCustomFeeds(feeds: CustomFeed[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(feeds));
}

export function makeFeedId(): string {
  return `cf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function hashId(...parts: string[]): string {
  let h = 0;
  for (const p of parts) {
    for (let i = 0; i < p.length; i++) {
      h = (h * 31 + p.charCodeAt(i)) | 0;
    }
  }
  return `cf-${(h >>> 0).toString(36)}`;
}

function textOf(el: Element | null): string {
  if (!el) return '';
  return (el.textContent ?? '').trim();
}

function pickLink(item: Element): string {
  // RSS: <link>https://…</link>
  const rssLink = textOf(item.querySelector('link'));
  if (rssLink && /^https?:\/\//i.test(rssLink)) return rssLink;
  // Atom: <link href="https://…" rel="alternate" />
  const links = Array.from(item.querySelectorAll('link'));
  const alt = links.find((l) => (l.getAttribute('rel') ?? 'alternate') === 'alternate');
  const href = alt?.getAttribute('href') ?? links[0]?.getAttribute('href') ?? '';
  return href;
}

function pickDate(item: Element): string {
  const candidates = [
    'pubDate',
    'published',
    'updated',
    'dc\\:date',
    'date',
  ];
  for (const tag of candidates) {
    const el = item.querySelector(tag);
    if (el && el.textContent) {
      const d = new Date(el.textContent);
      if (!Number.isNaN(d.getTime())) return d.toISOString();
    }
  }
  return new Date().toISOString();
}

function emptyArticle(
  feed: CustomFeed,
  raw: { title: string; url: string; summary: string; publishedAt: string },
): ScoredArticle {
  return {
    id: hashId(feed.id, raw.url || raw.title),
    source: 'custom' satisfies SourceId,
    subSource: feed.name,
    title: raw.title,
    url: raw.url,
    summary: raw.summary.slice(0, 400),
    publishedAt: raw.publishedAt,
    score: 0,
    roles: [],
    products: [],
    scoreBreakdown: {
      role: 0,
      product: 0,
      source: 0,
      recency: 0,
      engagement: 0,
      noise: 0,
    },
  };
}

export function parseFeedXml(
  xml: string,
  feed: CustomFeed,
): ScoredArticle[] {
  const doc = new DOMParser().parseFromString(xml, 'text/xml');
  if (doc.querySelector('parsererror')) {
    throw new Error('not valid XML');
  }
  // RSS 2.0: <item>; Atom: <entry>
  const items = Array.from(doc.querySelectorAll('item, entry'));
  const out: ScoredArticle[] = [];
  for (const it of items) {
    const title = textOf(it.querySelector('title'));
    const url = pickLink(it);
    if (!title || !url) continue;
    const summary =
      textOf(it.querySelector('description')) ||
      textOf(it.querySelector('summary')) ||
      textOf(it.querySelector('content'));
    out.push(
      emptyArticle(feed, {
        title,
        url,
        summary,
        publishedAt: pickDate(it),
      }),
    );
  }
  return out;
}

export async function fetchCustomFeed(
  feed: CustomFeed,
): Promise<ScoredArticle[]> {
  const proxied = `${CORS_PROXY}${encodeURIComponent(feed.url)}`;
  const res = await fetch(proxied, { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const xml = await res.text();
  return parseFeedXml(xml, feed);
}
