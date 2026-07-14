# Architecture

## Boundaries

`packages/engine` owns deterministic market state transitions. It accepts plain data and returns a new immutable state. It has no React, browser, Supabase, or network dependency.

`packages/market-data` owns fictional asset definitions, regime exposures, macro sensitivities, and event templates.

`packages/shared` owns the versioned state schema and transport-safe TypeScript types.

`apps/web` owns presentation, interaction, local persistence, and save-file import/export. Zustand is an adapter around the pure engine rather than the source of market truth.

## Data flow

1. UI creates validated order intent.
2. Zustand calls `simulateTurn(currentState, orders, seed)`.
3. The engine derives a tick-specific RNG from `seed:tick`.
4. The engine updates regime, event chain, macro state, prices, quotes, on-chain metrics, rival NAVs, orders, benchmark, and audit log.
5. The returned state is persisted under schema version 1.

## Supabase-ready path

A future persistence service can store serialized `GameState`, run metadata, leaderboards, and signed audit hashes. The engine remains unchanged. No Supabase client belongs in `packages/engine`.

## Deployment

The monorepo uses npm workspaces. Vercel should build from the repository root while serving `apps/web`.
