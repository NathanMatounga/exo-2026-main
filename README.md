# Exercise

A tiny version of the Capfi platform: ingest CSV → queue → consolidate → search.

## Stack

- **Backend** (`backend/`): Node + Hono + MongoDB. TypeScript, run via `tsx`.
- **Frontend** (`frontend/`): Vue 3 + Vite. Single search page.
- **Database**: local MongoDB (`mongodb://localhost:27017`, db `capfi-exercise`).

## Pipeline

```
Entreprises1.csv ──► [ingest-source1] ──► db.source1
                                          │
                                          ▼
                                    db.queuedCommands
                                          │
                                          ▼
                                  [process-queue]
                                          │
                                          ▼
                                     db.companies
                                          │
                                          ▼
                              POST /api/search   POST /api/list
```

Each ingest script writes to its own source collection and pushes one
`company-refresh` command per affected id. The processor drains the queue and
rebuilds the matching `companies` document by merging all source collections.

## Setup

```sh
# 1. start MongoDB locally on port 27017

# 2. backend
cd backend
pnpm install
pnpm ingest:source1            # loads ../data/Entreprises1.csv into db.source1
pnpm process-queue             # drains queue, populates db.companies
pnpm dev                       # http://localhost:3001

# 3. frontend (in another terminal)
cd frontend
pnpm install
pnpm dev                       # http://localhost:5173
```

The Vite dev server proxies `/api/*` to the backend.

## API

Two endpoints, mirroring the real platform's split:

- `POST /api/search` — takes filter criteria, returns `{ ids, total }`.
- `POST /api/list` — takes `{ ids }`, returns `{ companies }` with full docs.

Run the project, open the search page, and try things to see what's
currently supported.

## The exercise

A second data source, `data/Entreprises2.csv`, needs to flow through the
same pipeline so the search UI can:

- filter companies on **whether they have a website or not**,
- filter companies on **number of employees**,
- and naturally show the new fields on the result rows.

The `Tranche effectifs` column in that CSV is noise — leave it out.

How you split the work between ingestion, consolidation, the API, and the
frontend is up to you.

Take the time and care as if this was a real project in production, with a more data expected than 200 companies.
