# BuyBox Scorer

**Rank acquisition targets against your own criteria and see exactly why each one scored the way it did.**

Built as a response to Caprae Capital's AI-readiness challenge, which asks for an improvement to the SaaSquatch lead generation tool. Stack: **React + TypeScript** (client), **Node.js + Express + TypeScript** (server).

## The problem

SaaSquatch's users are entrepreneurs buying small businesses. Reviewing the product, four gaps stand out:

1. **Scores are a black box.** A searcher can't see why a company ranked high, or tune the ranking to their own thesis.
2. **Credits get spent before ranking.** One credit unlocks a full profile, so enriching poor fits wastes money.
3. **Succession isn't a first-class signal.** For a business buyer, an aging, founder-led company with no visible successor is the best kind of lead.
4. **Raw lists contain duplicates** from multiple sources.

## What it does

| Step | Feature |
|---|---|
| Import | Upload a CSV (flexible column names) or load fictional sample data |
| Dedupe | Merges duplicates by website domain, phone, or fuzzy company name, keeping the richest record |
| Check websites (optional) | Reads each company's public home, about and contact pages to extract founding year, founder name, family-owned language, successor mentions, contact email, and hiring signals |
| Rank | Scores 0-100 against a **buy box** (industry, size, revenue, location, years in business, succession, data completeness) with adjustable weights |
| Explain | Every lead gets plain-English reasons, e.g. "Founded 1989, founder Raymond Hartman named on site, no successor mentioned" |
| Prioritize | Tags each lead **Enrich first / Maybe / Skip** and shows how much of the list you can skip enriching |
| Export | CSV export (with spreadsheet-formula injection protection) and a drafted outreach email per lead |

## Run it

Requires Node 20+.

```bash
npm install
npm run dev          # API on :3001, client on :5173
```

Open http://localhost:5173, click **Load sample data**, then **Check company websites**, then **Rank leads**.
You can also upload `data/sample-leads.csv` to try the CSV path.

```bash
npm test             # unit tests (Node's built-in test runner)
npm run typecheck
```

## Design decisions

- **Rules over a model for scoring.** A weighted rule engine is deterministic, free, fast, and explainable. A buyer can trust and adjust it. Missing data counts as a mild penalty (0.4), not a disqualifier.
- **Succession heuristic.** Likelihood rises for founder-led and family-owned firms, and for businesses 25+ years old. It drops sharply if the site mentions a second generation or a successor. This is a heuristic, not a prediction, and the UI shows the evidence.
- **Ethical crawling.** The crawler identifies itself with a clear User-Agent, honors `robots.txt` (longest-match rule, `Allow` over `Disallow` on ties), waits between requests to the same host, uses timeouts, only reads three public pages, and caches by domain for 24 hours so no site is hit twice. It never touches personal social profiles.
- **Fictional sample data.** All sample companies use the reserved `.example` TLD and are served from an offline demo "web", so the demo makes no network requests and uses no real business data.
- **Pure core, thin API.** All logic lives in `server/src/lib` as pure functions with injected dependencies (the page fetcher), so everything is unit-tested without a network.

## What's tested

22 tests cover: name normalization, fuzzy dedupe (including same name in different states), phone matching, signal extraction, robots.txt rules, scoring and weights, succession logic, CSV parsing and export safety, crawler caching and robots handling, and the concurrency limiter.

## Limitations and next steps

Honest scope notes for a 5-hour build:

- Data is held **in memory** (one user, resets on restart). The planned upgrade is PostgreSQL via Prisma with a `leads` table and a `crawl_cache` table (see `docs/ARCHITECTURE.md`).
- Website checks run synchronously for up to 100 leads. At scale this should become a background job queue with progress polling.
- Signal extraction is regex-based and English-only; an LLM pass could improve recall.
- No auth or multi-tenant support.
- Revenue and employee counts come from the imported file; they are not estimated.

## Deploying

See `docs/ARCHITECTURE.md`. Short version: client on Vercel (static build, set `VITE_API_URL`), server as a container on Google Cloud Run using `server/Dockerfile` (set `CLIENT_ORIGIN`).
