# Market Engine

## Determinism

`createRng(seed + tick)` creates a reproducible pseudo-random stream. The game state, submitted orders, and seed fully determine the next state.

## Tick sequence

1. Rotate regime on schedule.
2. Select a seeded event.
3. Apply due second-order event effects.
4. Update macro variables.
5. Calculate each asset return from structural drift, regime exposure, macro transmission, event effects, and seeded idiosyncratic flow.
6. Construct bid and ask quotes.
7. Process open and newly submitted orders.
8. Update rival funds, benchmark, portfolio history, news, and audit records.

## Execution

Market and triggered orders execute against bid or ask. Slippage grows with trade participation relative to fictional liquidity. A per-tick liquidity cap prevents unrealistic fills. Fees are explicit. Rejected trades include a reason.

## Audit contract

Every `TurnAuditRecord` includes:

- exact tick seed
- regime
- macro state before and after
- per-asset prices and return
- component-level explanations and contributions
- event identifiers
- order results

The mocked timestamp is deterministic so replayed states compare exactly.
