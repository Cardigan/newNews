// Encodes filter prefs + custom feeds in the URL so a user can share
// their entire config as a link. We write straight to history with
// replaceState (no Next router involvement) so this works under
// `next export` / static GH Pages without Suspense gymnastics.
//
// Format (all params optional, all omitted when at default):
//   r=dev,sre,pm,mgr               selected roles
//   c=ai,fabric,ufo                selected product channels
//   s=bbc,nyt,hn                   selected sources (omitted when all on)
//   cf=<base64url(JSON)>           array of custom feeds: [{u, n}]
//
// Compact keys (`u`, `n`) keep the base64 short for shareable links.

import {
  ALL_PRODUCTS,
  ROLES,
  type ProductChannel,
  type Role,
  type SourceId,
} from '@/lib/curation/types';
import type { CustomFeed } from '@/lib/custom-feeds';
import { makeFeedId } from '@/lib/custom-feeds';

export interface UrlState {
  roles?: Role[];
  channels?: ProductChannel[];
  sources?: SourceId[];
  feeds?: CustomFeed[];
}

const VALID_ROLES = new Set<string>(ROLES);
const VALID_CHANNELS = new Set<string>(ALL_PRODUCTS);
const VALID_SOURCES = new Set<SourceId>([
  'bbc',
  'nyt',
  'guardian',
  'hn',
  'reddit',
  'custom',
]);

function b64UrlEncode(s: string): string {
  // btoa handles only Latin-1; safe here because we JSON-stringify ASCII
  // (URLs + ASCII-ish names). For safety, escape non-ASCII to %xx first.
  const safe = unescape(encodeURIComponent(s));
  return btoa(safe).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64UrlDecode(s: string): string {
  const padded =
    s.replace(/-/g, '+').replace(/_/g, '/') +
    '==='.slice(0, (4 - (s.length % 4)) % 4);
  return decodeURIComponent(escape(atob(padded)));
}

export function readUrlState(): UrlState {
  if (typeof window === 'undefined') return {};
  const sp = new URLSearchParams(window.location.search);
  const out: UrlState = {};
  if (sp.has('r')) {
    out.roles = sp
      .get('r')!
      .split(',')
      .filter((x) => VALID_ROLES.has(x)) as Role[];
  }
  if (sp.has('c')) {
    out.channels = sp
      .get('c')!
      .split(',')
      .filter((x) => VALID_CHANNELS.has(x)) as ProductChannel[];
  }
  if (sp.has('s')) {
    out.sources = sp
      .get('s')!
      .split(',')
      .filter((x): x is SourceId => VALID_SOURCES.has(x as SourceId));
  }
  if (sp.has('cf')) {
    try {
      const json = b64UrlDecode(sp.get('cf')!);
      const parsed = JSON.parse(json) as unknown;
      if (Array.isArray(parsed)) {
        out.feeds = parsed
          .filter(
            (f): f is { u: string; n?: string } =>
              typeof f === 'object' &&
              f !== null &&
              typeof (f as { u: unknown }).u === 'string',
          )
          .map((f) => ({
            id: makeFeedId(),
            url: f.u,
            name: typeof f.n === 'string' && f.n.length > 0 ? f.n : hostOf(f.u),
          }));
      }
    } catch {
      // ignore malformed cf= param
    }
  }
  return out;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Custom feed';
  }
}

export interface WriteArgs {
  roles: Role[];
  channels: ProductChannel[];
  sources: SourceId[];
  defaultSources: SourceId[];
  feeds: CustomFeed[];
}

export function writeUrlState(args: WriteArgs): void {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams();
  if (args.roles.length > 0) sp.set('r', args.roles.join(','));
  if (args.channels.length > 0) sp.set('c', args.channels.join(','));
  // Only encode sources when they differ from the default (all on), to
  // keep clean URLs in the common case.
  const sortedSources = [...args.sources].sort();
  const sortedDefault = [...args.defaultSources].sort();
  if (
    sortedSources.length !== sortedDefault.length ||
    sortedSources.some((s, i) => s !== sortedDefault[i])
  ) {
    sp.set('s', args.sources.join(','));
  }
  if (args.feeds.length > 0) {
    const payload = args.feeds.map((f) => ({ u: f.url, n: f.name }));
    sp.set('cf', b64UrlEncode(JSON.stringify(payload)));
  }
  const qs = sp.toString();
  const url =
    window.location.pathname + (qs ? `?${qs}` : '') + window.location.hash;
  window.history.replaceState(null, '', url);
}

export function clearUrlState(): void {
  if (typeof window === 'undefined') return;
  window.history.replaceState(
    null,
    '',
    window.location.pathname + window.location.hash,
  );
}
