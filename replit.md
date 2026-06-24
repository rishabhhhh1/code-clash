# CodeClash

A real-time competitive coding battle platform — think Codeforces meets Chess.com matchmaking meets PUBG battle royale. Players create or join rooms, battle on Codeforces problems, and climb the global leaderboard.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 8080)
- `pnpm --filter @workspace/codeclash run dev` — run the frontend (Vite)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string
- Optional env: `JWT_SECRET` — defaults to `"codeclash-secret-change-in-prod"`

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite, TailwindCSS, React Query, React Router
- API: Express 5, Socket.IO (planned)
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)
- Judge: Codeforces API (problems fetched + verdict polling)

## Where things live

- `lib/api-spec/openapi.yaml` — source of truth for all API contracts
- `lib/db/src/schema/` — Drizzle ORM schema (users, problems, rooms, battles, social, achievements)
- `artifacts/api-server/src/routes/` — Express route handlers (one file per domain)
- `artifacts/api-server/src/routes/users.ts` — exports `authMiddleware` and `verifyToken`
- `artifacts/codeclash/src/` — React frontend (pages, components, hooks)

## Architecture decisions

- Codeforces is the judge: CodeClash never runs code itself — it submits to CF and polls for verdicts
- Problems are pre-seeded via `POST /api/problems/fetch-cf` which pulls 2000 problems from the CF API
- JWT auth via localStorage (access token only); upgrade to httpOnly refresh tokens before production
- Battle types: `1v1`, `team`, `royale` — all share the same battles table with different room configs
- authMiddleware is defined in `routes/users.ts` and imported by all protected routes

## Product

- **Lobby** — live stats (online players, active battles, waiting rooms), live feed of recent battles
- **Rooms** — create/join/spectate rooms with configurable formats (1v1, Team, Battle Royale)
- **Battles** — real-time coding battles judged by Codeforces; submit, track verdicts, see opponent progress
- **Leaderboard** — global and friends-filtered rankings by rating, wins, WR
- **Profile** — personal stats, match history, rating graph
- **Friends** — add/accept/remove friends, see their battle activity
- **Achievements** — unlock badges (First Blood, Speed Demon, Undefeated, etc.)

## Gotchas

- `POST /api/problems/fetch-cf` must be called once to seed problems before battles can start (already done)
- The CF API has rate limits — the fetch endpoint processes 2000 problems on first call
- Socket.IO is planned but not yet wired; current real-time feel is via React Query polling
- `JWT_SECRET` env var fallback is intentionally weak — set a real secret before deploying

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
