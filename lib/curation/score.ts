import {
  NOISE_KEYWORDS,
  PRODUCT_KEYWORDS,
  ROLE_KEYWORDS,
  SOURCE_QUALITY,
} from './keywords';
import type {
  ProductChannel,
  RawArticle,
  Role,
  ScoredArticle,
} from './types';
import { ROLES } from './types';

const ROLE_WEIGHT = 3;
const PRODUCT_WEIGHT = 5;
const NOISE_WEIGHT = 4;

const HOUR_MS = 1000 * 60 * 60;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Count occurrences of any keyword in haystack (word-boundary, case-insensitive).
// Phrases (containing spaces) are matched as substrings with surrounding non-word
// boundaries to be a bit more permissive.
export function countMatches(haystack: string, keywords: string[]): {
  count: number;
  hits: string[];
} {
  if (!haystack) return { count: 0, hits: [] };
  const text = haystack.toLowerCase();
  const hits: string[] = [];
  let count = 0;
  for (const kw of keywords) {
    const k = kw.toLowerCase();
    const pattern = /\s/.test(k)
      ? new RegExp(`(^|[^a-z0-9])${escapeRegex(k)}([^a-z0-9]|$)`, 'g')
      : new RegExp(`\\b${escapeRegex(k)}\\b`, 'g');
    const matches = text.match(pattern);
    if (matches && matches.length > 0) {
      count += matches.length;
      hits.push(kw);
    }
  }
  return { count, hits };
}

export function recencyBonus(publishedAt: string, now = Date.now()): number {
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return 0;
  const ageHours = Math.max(0, (now - t) / HOUR_MS);
  // Decay: full bonus at 0h, ~half at 12h, ~zero by 48h.
  return 6 * Math.exp(-ageHours / 17);
}

export function engagementBonus(engagement?: number): number {
  if (!engagement || engagement <= 0) return 0;
  // log-scaled, capped.
  return Math.min(4, Math.log10(engagement + 1) * 1.5);
}

export function scoreArticle(
  article: RawArticle,
  now = Date.now(),
): ScoredArticle {
  const haystack = `${article.title} ${article.summary ?? ''}`;

  // Role matches
  let roleScore = 0;
  const roles: Role[] = [];
  for (const role of ROLES) {
    const { count } = countMatches(haystack, ROLE_KEYWORDS[role]);
    if (count > 0) {
      roles.push(role);
      roleScore += count * ROLE_WEIGHT;
    }
  }

  // Product matches
  let productScore = 0;
  const products: ProductChannel[] = [];
  for (const product of Object.keys(PRODUCT_KEYWORDS) as ProductChannel[]) {
    const { count } = countMatches(haystack, PRODUCT_KEYWORDS[product]);
    if (count > 0) {
      products.push(product);
      productScore += count * PRODUCT_WEIGHT;
    }
  }

  const sourceScore = SOURCE_QUALITY[article.source] ?? 0;
  const recScore = recencyBonus(article.publishedAt, now);
  const engScore = engagementBonus(article.engagement);
  const { count: noiseHits } = countMatches(haystack, NOISE_KEYWORDS);
  const noiseScore = noiseHits * NOISE_WEIGHT;

  const score =
    roleScore + productScore + sourceScore + recScore + engScore - noiseScore;

  return {
    ...article,
    score: Math.round(score * 100) / 100,
    roles,
    products,
    scoreBreakdown: {
      role: roleScore,
      product: productScore,
      source: sourceScore,
      recency: Math.round(recScore * 100) / 100,
      engagement: Math.round(engScore * 100) / 100,
      noise: noiseScore,
    },
  };
}
