# newNews

A curated industry news feed for a ~50-person team at Microsoft working on
Azure / Azure Government data-platform products (Power Query Online,
HDInsight, OneLake, Service Assist, Microsoft Fabric, Data Factory, Dataflows
Gen2, Pipelines, etc.).

This is a **proof of concept**: a static Next.js site hosted on GitHub Pages,
fed by a GitHub Actions cron job that fetches news from BBC, The Guardian,
Hacker News, and Reddit, scores each item against role + product keyword
profiles, and commits a `public/data/feed.json` artifact the client reads.

> **Public news only.** No Microsoft-confidential content. No internal sources.

## Architecture

```
GitHub Action (every 20 min)
  └─ scripts/fetch-feed.ts
       ├─ BBC RSS (tech/world/business)
       ├─ Guardian API (or RSS fallback)
       ├─ Hacker News Firebase API
       └─ Reddit multireddit JSON
  └─ score + tag with role / product keywords
  └─ commit public/data/feed.json (only if changed)
       │
       ▼
Static Next.js export → GitHub Pages
  └─ Role picker (Manager / Dev / SRE / PM)
  └─ Product channel toggles
  └─ Filtered, ranked feed (cached in localStorage)
```

## Local development

```bash
npm install
npm run fetch-feed     # generates public/data/feed.json
npm run dev            # http://localhost:3000
npm test               # unit tests for scoring
npm run build          # static export to ./out
```

## Tuning curation

Keyword maps live in [`lib/curation/keywords.ts`](lib/curation/keywords.ts).
Edit them directly — no code changes required. The scoring formula is in
[`lib/curation/score.ts`](lib/curation/score.ts).

Each card shows tag chips (and an optional debug breakdown) so you can see
*why* an article surfaced and tune accordingly.

## Deployment

1. Push to `main` — `deploy-pages.yml` builds and publishes the site.
2. In repo Settings → Pages, set source to **GitHub Actions**.
3. (Optional) Add a `GUARDIAN_API_KEY` repo secret for richer Guardian data
   (otherwise we fall back to Guardian RSS).
4. The `refresh-feed.yml` workflow runs every 20 minutes and commits an
   updated `feed.json` when content changes.

## Sources & rate limiting

| Source | Endpoint | Auth |
|--------|----------|------|
| BBC | RSS | none |
| Guardian | `content.guardianapis.com/search` | free key (optional) |
| Hacker News | `hacker-news.firebaseio.com/v0` | none |
| Reddit | `reddit.com/r/<multireddit>/top.json` | none |

All fetches happen **server-side in the Action** — clients only read the
prebuilt JSON, so per-user rate limits don't apply.
