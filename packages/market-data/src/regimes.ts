import type { MarketRegimeId, MacroState } from "@market-architect/shared";

export const REGIME_LABELS: Record<MarketRegimeId, string> = {
  "ai-boom":"AI Boom","sticky-inflation":"Sticky Inflation","rate-cut-rally":"Rate-Cut Rally","credit-stress":"Credit Stress","supply-shock":"Geopolitical Supply Shock","crypto-risk-on":"Crypto Risk-On"
};

export const INITIAL_MACRO: MacroState = { growth:.018, inflation:.027, policyRate:.045, creditSpread:.012, energyPressure:0, cryptoLiquidity:.1 };
