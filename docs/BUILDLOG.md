# Build Log

## 2026-07-14 — Initial vertical slice

### Decisions
- Chose an npm-workspace monorepo matching the requested repository structure.
- Used Next.js App Router, TypeScript, Tailwind CSS, shadcn-style local UI components, Zustand, and Recharts.
- Kept all pricing, order, metrics, event, rival, and replay logic in `packages/engine`.
- Used fictional assets and simulated data only.
- Implemented deterministic timestamps in audit records so full-state replay equality can be tested.

### Engine work
- Added seeded RNG.
- Added twenty assets and six regimes.
- Added macro state, event templates, delayed second-order effects, and causal price decomposition.
- Added market, limit, stop-loss, and take-profit execution.
- Added spread, fees, slippage, liquidity caps, validation, fractional quantities, holdings, average cost, realized P&L, and open-order persistence.
- Added rival funds, benchmark, portfolio metrics, on-chain metrics, and research views.

### UI work
- Built responsive dashboard, chart, asset table, order ticket, news feed, rival funds, allocation, transactions, research desk, audit view, on-chain panel, and mode setup.
- Added local Zustand persistence and versioned JSON save import/export.
- Added educational disclaimer in the application and README.

### Verification record
- Dependency installation: passed (`npm install`, 443 packages).
- Lint: passed (`npm run lint`, zero warnings).
- Type-check: passed (`npm run type-check`).
- Unit tests: passed (`npm run test`, 6/6 tests).
- Production build: passed (`npm run build`, Next.js 16.2.10 static route generated).
- Runtime smoke test: passed (`next start` returned HTTP 200 for `/`).

### Publication
- Published to the public `JaronKBragg7337/market-architect` repository.
- Used GitHub's native Git object API after the execution container's direct network push route was unavailable.
- No unrelated repository was modified.
