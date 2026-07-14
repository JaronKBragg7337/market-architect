export type AssetClass = "stock" | "etf" | "bond" | "commodity" | "crypto" | "stablecoin" | "tokenized-treasury";
export type OrderType = "market" | "limit" | "stop-loss" | "take-profit";
export type OrderSide = "buy" | "sell";
export type GameMode = "academy" | "career";
export type MarketRegimeId = "ai-boom" | "sticky-inflation" | "rate-cut-rally" | "credit-stress" | "supply-shock" | "crypto-risk-on";

export interface AssetDefinition {
  symbol: string;
  name: string;
  assetClass: AssetClass;
  sector: string;
  description: string;
  initialPrice: number;
  volatility: number;
  baseDrift: number;
  liquidity: number;
  spreadBps: number;
  fractional: boolean;
  benchmarkWeight: number;
  exposures: Partial<Record<MarketRegimeId, number>>;
  macroSensitivity: { growth: number; inflation: number; rates: number; credit: number; energy: number; crypto: number };
}

export interface MarketAssetState {
  symbol: string;
  price: number;
  previousClose: number;
  bid: number;
  ask: number;
  volume: number;
  history: number[];
  onChain?: OnChainMetrics;
}

export interface OnChainMetrics {
  tvl: number;
  activeUsers: number;
  fees: number;
  stakingRatio: number;
  exchangeFlows: number;
  unlockPct30d: number;
}

export interface Position { symbol: string; quantity: number; averageCost: number; realizedPnl: number; }

export interface PlayerOrder {
  id: string;
  symbol: string;
  side: OrderSide;
  type: OrderType;
  quantity: number;
  limitPrice?: number;
  triggerPrice?: number;
  createdTick: number;
}

export interface Transaction {
  id: string;
  tick: number;
  symbol: string;
  side: OrderSide;
  quantity: number;
  referencePrice: number;
  executionPrice: number;
  notional: number;
  fee: number;
  slippageBps: number;
  orderType: OrderType;
  status: "filled" | "rejected";
  reason?: string;
}

export interface PriceComponent { label: string; contribution: number; explanation: string; }
export interface AssetAuditRecord {
  symbol: string;
  previousPrice: number;
  newPrice: number;
  returnPct: number;
  components: PriceComponent[];
  eventIds: string[];
}
export interface TurnAuditRecord {
  tick: number;
  seed: string;
  regime: MarketRegimeId;
  macroBefore: MacroState;
  macroAfter: MacroState;
  assetRecords: AssetAuditRecord[];
  orderResults: Transaction[];
  eventIds: string[];
  generatedAt: string;
}

export interface MacroState { growth: number; inflation: number; policyRate: number; creditSpread: number; energyPressure: number; cryptoLiquidity: number; }
export interface MarketEvent {
  id: string;
  headline: string;
  summary: string;
  severity: number;
  direct: Partial<Record<string, number>>;
  sectorEffects: Partial<Record<string, number>>;
  macroEffects: Partial<MacroState>;
  secondOrder: { delay: number; headline: string; sectorEffects: Partial<Record<string, number>> }[];
  createdTick: number;
}

export interface RivalFund {
  id: string;
  name: string;
  style: "momentum" | "macro" | "crypto";
  nav: number;
  dailyReturn: number;
  history: number[];
  topExposure: string;
  risk: number;
}

export interface ResearchView {
  symbol: string;
  bullCase: string;
  bearCase: string;
  confidence: number;
  evidence: string[];
  invalidation: string[];
}

export interface GameState {
  schemaVersion: 1;
  runId: string;
  seed: string;
  tick: number;
  dayOfWeek: number;
  mode: GameMode;
  regime: MarketRegimeId;
  cash: number;
  startingCash: number;
  assets: Record<string, MarketAssetState>;
  positions: Record<string, Position>;
  openOrders: PlayerOrder[];
  transactions: Transaction[];
  auditLog: TurnAuditRecord[];
  news: MarketEvent[];
  pendingSecondOrder: { dueTick: number; parentEventId: string; headline: string; sectorEffects: Partial<Record<string, number>> }[];
  rivals: RivalFund[];
  benchmarkHistory: number[];
  netWorthHistory: number[];
  macro: MacroState;
  academyLessonsCompleted: string[];
}

export interface PortfolioMetrics {
  netWorth: number;
  totalReturn: number;
  dayPnl: number;
  weekPnl: number;
  volatility: number;
  maxDrawdown: number;
  concentration: number;
  riskScore: number;
  benchmarkReturn: number;
  alpha: number;
  allocation: { label: string; value: number; pct: number }[];
}
