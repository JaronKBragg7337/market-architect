# Market Architect

A deterministic, educational portfolio-strategy game for interpreting market regimes, macroeconomic transmission, risk, execution quality, and cross-asset allocation.

> **Educational simulation only. Market Architect is not investment advice and does not connect to real brokerage accounts, wallets, tokens, payment rails, or live market feeds.**

## Current vertical slice

- Mobile-first Next.js dashboard with net worth, cash, P&L, risk score, drawdown, concentration, benchmark return, and alpha.
- Twenty fictional assets across stocks, sector ETFs, sovereign and corporate bonds, commodities, crypto-like assets, a stablecoin analogue, and a tokenized Treasury analogue.
- Market, limit, stop-loss, and take-profit orders with fractional quantities, validation, bid/ask spread, fees, slippage, and liquidity limits.
- Seeded deterministic simulation with six market regimes, event chains, first-order effects, delayed second-order effects, rival funds, and complete per-asset audit records.
- Deterministic mock research desk with bull case, bear case, confidence, evidence, and invalidation conditions.
- Simulated on-chain panel for reserve, network, stablecoin, and tokenized-yield assets.
- Academy and Career framing, plus versioned local save/load.

## Setup

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Verification

```bash
npm run verify
```

This runs ESLint, TypeScript project references, Vitest, and the production Next.js build.

## Architecture

```text
apps/web                Next.js App Router UI, Zustand store, shadcn-style components
packages/engine         Pure deterministic simulation and portfolio calculations
packages/shared         Versioned domain types and game-state schema
packages/market-data    Fictional assets, regimes, event templates, macro defaults
docs                    Architecture, design, engine, build log, next steps
tests                   Engine unit and deterministic replay tests
```

The core entry point is:

```ts
simulateTurn(gameState, playerOrders, seed)
```

React components do not contain market-pricing logic.

## Screenshot placeholders

- `docs/screenshots/dashboard-desktop.png` — dashboard overview
- `docs/screenshots/order-ticket-mobile.png` — mobile order workflow
- `docs/screenshots/research-desk.png` — research and audit view

These paths are reserved for captured images after the first hosted deployment.

## Vercel deployment

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `apps/web`.
3. Keep the detected Next.js framework preset.
4. Set **Install Command** to `cd ../.. && npm install`.
5. Set **Build Command** to `cd ../.. && npm run build`.
6. Deploy. No environment variables are required for v1.

Supabase integration is intentionally deferred. The domain schema and persistence boundary are isolated so local storage can later be replaced or synchronized without moving market logic into the UI.
