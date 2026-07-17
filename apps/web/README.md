# ShareStack — Web frontend

React + TypeScript + Vite + Recharts. Visual direction: **B · Control Desk**
(dark operator console; tokens in `BUILD_CONTEXT/02 §11`).

The backend API does not exist yet, so the app builds against the frozen golden
JSON (`BUILD_CONTEXT/golden/*`), copied into `src/data/` — this IS the API
response contract (`BACKEND_HANDOFF §5`). When the FastAPI lands, only
`src/lib/api.ts` changes (swap imports for `fetch`). The UI never computes domain
math; it formats values the golden already produced (`src/lib/format.ts`).

## Run

    cd apps/web
    npm install
    npm run dev        # http://localhost:5173  -> redirects to Scenario A run

    npm run build      # tsc + vite build
    npm run typecheck

## Routes (01 §3)

- `/runs/:runId`         Decision workspace (Review is the hero state)
- `/runs/:runId/compare` Compare response policies
- `/runs/:runId/audit`   Append-only audit record
- `/`                    bootstraps to a Scenario A run

## In scope (MVP)

Scenario **A** (hero, READY_FOR_REVIEW) and **E** (abstention). Run ids encode the
scenario letter, e.g. `run_scn-a_7f3d02`.
