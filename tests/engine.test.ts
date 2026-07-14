import {describe,expect,it} from "vitest";
import {calculatePortfolioMetrics,createInitialState,portfolioValue,simulateTurn,type PlayerOrder} from "@market-architect/engine";
const order=(partial:Partial<PlayerOrder>):PlayerOrder=>({id:"o1",symbol:"AION",side:"buy",type:"market",quantity:1,createdTick:0,...partial});

describe("order execution",()=>{
 it("fills a market order with fee and spread",()=>{const state=createInitialState("market");const next=simulateTurn(state,[order({})],"market");const tx=next.transactions[0]!;expect(tx.status).toBe("filled");expect(tx.executionPrice).toBeGreaterThan(next.assets.AION!.bid);expect(tx.fee).toBeGreaterThan(0);expect(next.positions.AION!.quantity).toBe(1);});
 it("keeps an untriggered limit order open",()=>{const state=createInitialState("limit");const next=simulateTurn(state,[order({type:"limit",limitPrice:1})],"limit");expect(next.openOrders).toHaveLength(1);expect(next.positions.AION).toBeUndefined();});
 it("triggers a stop loss on an owned position",()=>{let state=createInitialState("stop");state={...state,cash:90_000,positions:{AION:{symbol:"AION",quantity:10,averageCost:100,realizedPnl:0}},assets:{...state.assets,AION:{...state.assets.AION!,price:80,previousClose:82,bid:79.9,ask:80.1}}};const next=simulateTurn(state,[order({id:"stop1",side:"sell",type:"stop-loss",quantity:10,triggerPrice:100})],"stop");expect(next.transactions.some(t=>t.orderType==="stop-loss"&&t.status==="filled")).toBe(true);expect(next.positions.AION).toBeUndefined();});
 it("applies more slippage to larger market orders",()=>{const small=simulateTurn(createInitialState("slip"),[order({id:"small",quantity:1})],"slip").transactions[0]!;const large=simulateTurn(createInitialState("slip"),[order({id:"large",quantity:100})],"slip").transactions[0]!;expect(large.slippageBps).toBeGreaterThan(small.slippageBps);});
});

describe("portfolio and replay",()=>{
 it("values cash plus marked positions",()=>{let state=createInitialState("value");state={...state,cash:50_000,positions:{AION:{symbol:"AION",quantity:10,averageCost:100,realizedPnl:0}}};expect(portfolioValue(state)).toBe(50_000+state.assets.AION!.price*10);expect(calculatePortfolioMetrics(state).netWorth).toBe(portfolioValue(state));});
 it("replays identically with the same state, orders, and seed",()=>{const state=createInitialState("replay");const orders=[order({id:"det",quantity:2.5})];expect(simulateTurn(state,orders,"replay")).toEqual(simulateTurn(state,orders,"replay"));});
});
