# Architecture

## Overview

```
React SPA (Vite)  --HTTP/JSON-->  Express API  -->  pure domain modules
                                      |                dedupe / signals / scoring / csv / robots
                                      +--> crawler --> company websites (robots.txt honored)
```

| Layer | Technology |
|---|---|
| Client | React 18, TypeScript, Vite 5, plain CSS |
| Server | Node.js 22, Express 4, TypeScript 5 |
| Testing | Node built-in test runner via tsx |
| CI | GitHub Actions (typecheck + tests) |

## Data model (current: in memory)

- `Lead { id, companyName, website?, phone?, city?, state?, country?, industry?, employeeCount?, revenueEstimate? }`
- `Signals { foundedYear?, yearsInBusiness?, familyOwned, founderLed, ownerName?, email?, successorMention, hiring }`
- `ScoredLead = Lead + { score, priority, reasons[], breakdown, signals? }`

## Request flow

1. `POST /api/leads/sample` or `/api/leads/import` parses, **dedupes**, stores.
2. `POST /api/enrich` crawls up to 100 sites with concurrency 5 and stores `Signals` per lead.
3. `POST /api/score` scores all leads against the buy box in the request body and returns ranked leads with a summary.
4. `GET /api/export.csv` and `POST /api/outreach` use the last scored result.

## Performance and caching

- Crawl results are cached per domain for 24 hours (in-process `Map`).
- Per-host politeness delay (500 ms) and 6 s request timeout; responses capped at 500 KB.
- Bounded concurrency (`mapLimit`) so one slow site doesn't stall the batch.
- Dedupe is O(n^2) with union-find merging, fine up to a few thousand rows. Beyond that, block on domain/phone first.

## Hosting (target)

- **Client:** static build on Vercel. Set `VITE_API_URL` to the API origin.
- **Server:** container built from `server/Dockerfile`, deployed to Google Cloud Run (serverless, scales to zero). Set `CLIENT_ORIGIN` for CORS.
- **Deploy:** `gcloud run deploy buybox-api --source server --region <region> --allow-unauthenticated`

## Production upgrade path

Cloud Run instances are stateless and can scale out, so the in-memory store must move to a database before real use:

- **PostgreSQL** (Supabase or Cloud SQL) with Prisma: tables `leads`, `signals`, `crawl_cache(domain, fetched_at, payload)`.
- **Background jobs** for enrichment (Cloud Tasks or BullMQ + Redis) with a `GET /api/jobs/:id` progress endpoint.
- **Auth** (per-user workspaces) and per-user rate limits.
