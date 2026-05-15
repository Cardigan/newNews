// Domains we know send X-Frame-Options: DENY/SAMEORIGIN or a frame-ancestors
// CSP that prevents embedding. For these we skip the reader pane entirely
// and just pop a new tab — saves the user from staring at a sad-face icon.
//
// Reddit isn't technically frame-blocked, but it's blocked by most Microsoft
// corp networks and the user explicitly called it out, so we treat it the
// same way.
const BLOCKED_FRAME_DOMAINS = [
  'bbc.co.uk',
  'bbc.com',
  'nytimes.com',
  'theguardian.com',
  'github.com',
  'githubusercontent.com',
  'news.ycombinator.com',
  'reddit.com',
  'old.reddit.com',
  'twitter.com',
  'x.com',
  'facebook.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
];

export function isFrameBlocked(url: string): boolean {
  try {
    const h = new URL(url).hostname.toLowerCase();
    return BLOCKED_FRAME_DOMAINS.some(
      (d) => h === d || h.endsWith('.' + d),
    );
  } catch {
    return false;
  }
}
