import { ASSETS, EVENT_LIBRARY, INITIAL_MACRO } from "@market-architect/market-data";
import type { AssetDefinition, GameMode, GameState, MarketAssetState, MarketEvent, MarketRegimeId, PlayerOrder, PortfolioMetrics, PriceComponent, ResearchView, RivalFund, Transaction, TurnAuditRecord } from "@market-architect/shared";
import { createRng } from "./rng";
export * from "./rng";
export type * from "@market-architect/shared";

const round=(n:number,d=2)=>Number(n.toFixed(d));
const clamp=(n:number,min:number,max:number)=>Math.max(min,Math.min(max,n));
const assetBySymbol=new Map(ASSETS.map(a=>[a.symbol,a]));
const regimeSequence: MarketRegimeId[]=["ai-boom","sticky-inflation","rate-cut-rally","credit-stress","supply-shock","crypto-risk-on"];

function initialOnChain(symbol:string) {
  if(symbol==="BTCX") return {tvl:18.2,activeUsers:1_120_000,fees:14.6,stakingRatio:0,exchangeFlows:-120,unlockPct30d:0};
  if(symbol==="ETHX") return {tvl:64.5,activeUsers:840_000,fees:28.2,stakingRatio:28.4,exchangeFlows:-48,unlockPct30d:.7};
  if(symbol==="USDQ") return {tvl:36.8,activeUsers:2_400_000,fees:3.2,stakingRatio:0,exchangeFlows:82,unlockPct30d:0};
  if(symbol==="TBTK") return {tvl:4.7,activeUsers:74_000,fees:.9,stakingRatio:61,exchangeFlows:-12,unlockPct30d:.2};
  return undefined;
}

export function createInitialState(seed="architect-001",mode:GameMode="academy"):GameState {
  const assets:Record<string,MarketAssetState>={};
  for(const a of ASSETS){
    const spread=a.initialPrice*a.spreadBps/10_000;
    assets[a.symbol]={symbol:a.symbol,price:a.initialPrice,previousClose:a.initialPrice,bid:round(a.initialPrice-spread/2,4),ask:round(a.initialPrice+spread/2,4),volume:a.liquidity/Math.max(a.initialPrice,1),history:[a.initialPrice],onChain:initialOnChain(a.symbol)};
  }
  return {
    schemaVersion:1,runId:`run-${seed}`,seed,tick:0,dayOfWeek:1,mode,regime:"ai-boom",cash:100_000,startingCash:100_000,assets,positions:{},openOrders:[],transactions:[],auditLog:[],news:[],pendingSecondOrder:[],
    rivals:[
      {id:"momentum",name:"Vector Momentum",style:"momentum",nav:100, dailyReturn:0, history:[100],topExposure:"TECH",risk:68},
      {id:"macro",name:"Atlas Macro",style:"macro",nav:100,dailyReturn:0,history:[100],topExposure:"GOVT",risk:46},
      {id:"crypto",name:"Satoshi Ridge",style:"crypto",nav:100,dailyReturn:0,history:[100],topExposure:"BTCX",risk:84}
    ],
    benchmarkHistory:[100],netWorthHistory:[100_000],macro:{...INITIAL_MACRO},academyLessonsCompleted:[]
  };
}

export function portfolioValue(state:GameState):number {
  return round(state.cash+Object.values(state.positions).reduce((sum,p)=>sum+(state.assets[p.symbol]?.price??0)*p.quantity,0),2);
}

function calculateSlippageBps(def:AssetDefinition,quantity:number,price:number):number {
  const notional=Math.abs(quantity*price);
  const participation=notional/def.liquidity;
  return clamp(def.spreadBps*.35 + participation*22_000, def.spreadBps*.25, 180);
}

function validateOrder(state:GameState,order:PlayerOrder):string|undefined {
  const def=assetBySymbol.get(order.symbol), market=state.assets[order.symbol];
  if(!def||!market) return "Unknown asset";
  if(!Number.isFinite(order.quantity)||order.quantity<=0) return "Quantity must be positive";
  if(!def.fractional && !Number.isInteger(order.quantity)) return "This asset requires whole units";
  if(order.type==="limit" && (!order.limitPrice||order.limitPrice<=0)) return "Limit price is required";
  if((order.type==="stop-loss"||order.type==="take-profit") && (!order.triggerPrice||order.triggerPrice<=0)) return "Trigger price is required";
  if((order.type==="stop-loss"||order.type==="take-profit") && order.side!=="sell") return "Protective orders must be sell orders";
  if(order.side==="sell" && (state.positions[order.symbol]?.quantity??0)<order.quantity) return "Insufficient position";
  return undefined;
}

function shouldExecute(order:PlayerOrder,market:MarketAssetState):boolean {
  if(order.type==="market") return true;
  if(order.type==="limit") return order.side==="buy" ? market.ask<=Number(order.limitPrice) : market.bid>=Number(order.limitPrice);
  if(order.type==="stop-loss") return market.bid<=Number(order.triggerPrice);
  return market.bid>=Number(order.triggerPrice);
}

function executeOrder(state:GameState,order:PlayerOrder):{state:GameState;tx:Transaction;keepOpen:boolean} {
  const invalid=validateOrder(state,order), def=assetBySymbol.get(order.symbol), market=state.assets[order.symbol];
  const rejected=(reason:string):Transaction=>({id:`tx-${state.tick}-${order.id}`,tick:state.tick,symbol:order.symbol,side:order.side,quantity:order.quantity,referencePrice:market?.price??0,executionPrice:0,notional:0,fee:0,slippageBps:0,orderType:order.type,status:"rejected",reason});
  if(invalid||!def||!market) return {state,tx:rejected(invalid??"Unknown asset"),keepOpen:false};
  if(!shouldExecute(order,market)) return {state,tx:rejected("Order remains open because its condition was not met"),keepOpen:true};
  const maxQty=(def.liquidity*.08)/market.price;
  if(order.quantity>maxQty) return {state,tx:rejected(`Liquidity limit exceeded; maximum ${round(maxQty,4)} units this tick`),keepOpen:false};
  const slippageBps=calculateSlippageBps(def,order.quantity,market.price);
  const quote=order.side==="buy"?market.ask:market.bid;
  const executionPrice=quote*(1+(order.side==="buy"?1:-1)*slippageBps/10_000);
  const notional=executionPrice*order.quantity;
  const fee=Math.max(.25,notional*.00045);
  if(order.side==="buy" && state.cash<notional+fee) return {state,tx:rejected("Insufficient cash including spread, slippage, and fees"),keepOpen:false};
  const positions={...state.positions};
  const current=positions[order.symbol]??{symbol:order.symbol,quantity:0,averageCost:0,realizedPnl:0};
  let cash=state.cash;
  if(order.side==="buy"){
    const newQty=current.quantity+order.quantity;
    positions[order.symbol]={...current,quantity:newQty,averageCost:((current.averageCost*current.quantity)+(executionPrice*order.quantity))/newQty};
    cash-=notional+fee;
  }else{
    const realized=(executionPrice-current.averageCost)*order.quantity-fee;
    const remaining=round(current.quantity-order.quantity,8);
    if(remaining<=1e-8) delete positions[order.symbol]; else positions[order.symbol]={...current,quantity:remaining,realizedPnl:current.realizedPnl+realized};
    cash+=notional-fee;
  }
  const tx:Transaction={id:`tx-${state.tick}-${order.id}`,tick:state.tick,symbol:order.symbol,side:order.side,quantity:round(order.quantity,8),referencePrice:market.price,executionPrice:round(executionPrice,6),notional:round(notional,2),fee:round(fee,2),slippageBps:round(slippageBps,2),orderType:order.type,status:"filled"};
  return {state:{...state,cash:round(cash,2),positions},tx,keepOpen:false};
}

function applyMacro(state:GameState,rng:ReturnType<typeof createRng>,event?:MarketEvent){
  const m=state.macro;
  const e=event?.macroEffects??{};
  return {
    growth:clamp(m.growth+rng.normal()*.0006+(e.growth??0),-.04,.08),
    inflation:clamp(m.inflation+rng.normal()*.00045+(e.inflation??0),-.01,.12),
    policyRate:clamp(m.policyRate+rng.normal()*.00015+(e.policyRate??0),0,.15),
    creditSpread:clamp(m.creditSpread+rng.normal()*.0003+(e.creditSpread??0),.002,.12),
    energyPressure:clamp(m.energyPressure*.82+rng.normal()*.001+(e.energyPressure??0),-.04,.12),
    cryptoLiquidity:clamp(m.cryptoLiquidity*.9+rng.normal()*.012+(e.cryptoLiquidity??0),-.5,.7)
  };
}

function chooseEvent(state:GameState,rng:ReturnType<typeof createRng>):MarketEvent|undefined {
  if(rng.next()>.62) return undefined;
  const template=rng.pick(EVENT_LIBRARY);
  return {...template,id:`evt-${state.tick+1}-${Math.floor(rng.next()*1e6)}`,createdTick:state.tick+1};
}

function updateRivals(rivals:RivalFund[],state:GameState,assetReturns:Record<string,number>,rng:ReturnType<typeof createRng>):RivalFund[]{
  return rivals.map(f=>{
    let ret=0;
    if(f.style==="momentum") ret=(assetReturns.TECH??0)*.45+(assetReturns.AION??0)*.3+(assetReturns.COPR??0)*.15+rng.normal()*.002;
    if(f.style==="macro") ret=(assetReturns.GOVT??0)*.35+(assetReturns.GOLD??0)*.25+(assetReturns.FINX??0)*.2+(state.regime==="credit-stress"?.004:0)+rng.normal()*.0015;
    if(f.style==="crypto") ret=(assetReturns.BTCX??0)*.5+(assetReturns.ETHX??0)*.4+(assetReturns.TBTK??0)*.1+rng.normal()*.003;
    const nav=f.nav*(1+ret);
    return {...f,nav:round(nav,2),dailyReturn:round(ret*100,2),history:[...f.history,round(nav,2)].slice(-90)};
  });
}

export function simulateTurn(gameState:GameState,playerOrders:PlayerOrder[]=[],seed=gameState.seed):GameState {
  const rng=createRng(`${seed}:${gameState.tick+1}`);
  const nextRegime=(gameState.tick>0 && gameState.tick%6===0)?regimeSequence[(regimeSequence.indexOf(gameState.regime)+1)%regimeSequence.length]!:gameState.regime;
  let state:GameState={...gameState,regime:nextRegime,tick:gameState.tick+1,dayOfWeek:(gameState.dayOfWeek%5)+1};
  const event=chooseEvent(state,rng);
  const due=state.pendingSecondOrder.filter(p=>p.dueTick===state.tick);
  const remainingPending=state.pendingSecondOrder.filter(p=>p.dueTick!==state.tick);
  const macroBefore={...state.macro};
  const macroAfter=applyMacro(state,rng,event);
  const assetRecords:TurnAuditRecord["assetRecords"]=[];
  const returns:Record<string,number>={};
  const assets:Record<string,MarketAssetState>={};
  for(const def of ASSETS){
    const old=state.assets[def.symbol]!;
    const comps:PriceComponent[]=[];
    const regime=(def.exposures[nextRegime]??0)*.006;
    const macro=(macroAfter.growth-.018)*def.macroSensitivity.growth*.12 -(macroAfter.inflation-.027)*def.macroSensitivity.inflation*.06 -(macroAfter.policyRate-.045)*def.macroSensitivity.rates*.05 -(macroAfter.creditSpread-.012)*def.macroSensitivity.credit*.11 + macroAfter.energyPressure*def.macroSensitivity.energy*.08 + macroAfter.cryptoLiquidity*def.macroSensitivity.crypto*.012;
    const direct=(event?.direct[def.symbol]??0)+(event?.sectorEffects[def.sector]??0);
    const second=due.reduce((s,p)=>s+(p.sectorEffects[def.sector]??0),0);
    const random=rng.normal()*def.volatility*.45;
    const total=clamp(def.baseDrift+regime+macro+direct+second+random,-.22,.22);
    comps.push({label:"Structural drift",contribution:def.baseDrift,explanation:"Long-run expected return embedded in the fictional asset."});
    comps.push({label:"Market regime",contribution:regime,explanation:`Exposure to the ${nextRegime} regime.`});
    comps.push({label:"Macro transmission",contribution:macro,explanation:"Growth, inflation, rates, credit, energy, and crypto-liquidity sensitivities."});
    if(direct) comps.push({label:"First-order event",contribution:direct,explanation:event?.headline??"Direct event effect"});
    if(second) comps.push({label:"Second-order event",contribution:second,explanation:due.map(d=>d.headline).join("; ")});
    comps.push({label:"Idiosyncratic flow",contribution:random,explanation:"Seeded asset-specific order-flow shock."});
    let price=old.price*(1+total);
    if(def.assetClass==="stablecoin") price=clamp(price,.965,1.035);
    price=Math.max(.01,round(price,def.initialPrice>1000?2:4));
    const spread=price*def.spreadBps/10_000;
    const onChain=old.onChain?{
      tvl:round(Math.max(.1,old.onChain.tvl*(1+total*.55+rng.normal()*.004)),2),
      activeUsers:Math.round(Math.max(100,old.onChain.activeUsers*(1+total*.3+rng.normal()*.006))),
      fees:round(Math.max(0,old.onChain.fees*(1+total*.8+rng.normal()*.02)),2),
      stakingRatio:round(clamp(old.onChain.stakingRatio+rng.normal()*.25,0,95),1),
      exchangeFlows:round(old.onChain.exchangeFlows*.75+rng.normal()*55-total*900,1),
      unlockPct30d:round(clamp(old.onChain.unlockPct30d+rng.normal()*.05,0,12),2)
    }:undefined;
    assets[def.symbol]={...old,previousClose:old.price,price,bid:round(price-spread/2,6),ask:round(price+spread/2,6),volume:round(def.liquidity/price*(.75+rng.next()*.5),0),history:[...old.history,price].slice(-90),onChain};
    returns[def.symbol]=total;
    assetRecords.push({symbol:def.symbol,previousPrice:old.price,newPrice:price,returnPct:round(total*100,4),components:comps,eventIds:[...(event?[event.id]:[]),...due.map(d=>d.parentEventId)]});
  }
  state={...state,assets,macro:macroAfter,pendingSecondOrder:remainingPending};
  const incoming=[...state.openOrders,...playerOrders.map(o=>({...o,createdTick:state.tick}))];
  const orderResults:Transaction[]=[]; const openOrders:PlayerOrder[]=[];
  for(const order of incoming){const result=executeOrder(state,order); state=result.state; orderResults.push(result.tx); if(result.keepOpen) openOrders.push(order);}
  const eventNews=event?[event,...state.news].slice(0,20):state.news;
  const scheduled=event?[...state.pendingSecondOrder,...event.secondOrder.map(s=>({dueTick:state.tick+s.delay,parentEventId:event.id,headline:s.headline,sectorEffects:s.sectorEffects}))]:state.pendingSecondOrder;
  const benchmarkReturn=ASSETS.reduce((sum,a)=>sum+(returns[a.symbol]??0)*a.benchmarkWeight,0)/ASSETS.reduce((s,a)=>s+a.benchmarkWeight,0);
  const benchmark=[...state.benchmarkHistory,round(state.benchmarkHistory.at(-1)!*(1+benchmarkReturn),4)].slice(-90);
  const netWorth=portfolioValue(state);
  const audit:TurnAuditRecord={tick:state.tick,seed:`${seed}:${state.tick}`,regime:nextRegime,macroBefore,macroAfter,assetRecords,orderResults,eventIds:[...(event?[event.id]:[]),...due.map(d=>d.parentEventId)],generatedAt:new Date(Date.UTC(2026,0,1,state.tick)).toISOString()};
  return {...state,openOrders,transactions:[...orderResults.filter(t=>t.status==="filled"),...state.transactions].slice(0,150),auditLog:[audit,...state.auditLog].slice(0,100),news:eventNews,pendingSecondOrder:scheduled,rivals:updateRivals(state.rivals,state,returns,rng),benchmarkHistory:benchmark,netWorthHistory:[...state.netWorthHistory,netWorth].slice(-90)};
}

export function calculatePortfolioMetrics(state:GameState):PortfolioMetrics {
  const netWorth=portfolioValue(state), history=state.netWorthHistory.length?state.netWorthHistory:[state.startingCash];
  const daily=history.slice(1).map((v,i)=>v/history[i]!-1);
  const mean=daily.reduce((a,b)=>a+b,0)/Math.max(daily.length,1);
  const volatility=Math.sqrt(daily.reduce((s,r)=>s+(r-mean)**2,0)/Math.max(daily.length-1,1))*Math.sqrt(252);
  let peak=history[0]!, maxDd=0; for(const v of history){peak=Math.max(peak,v);maxDd=Math.min(maxDd,v/peak-1);}
  const values=Object.values(state.positions).map(p=>({label:p.symbol,value:p.quantity*state.assets[p.symbol]!.price}));
  const invested=values.reduce((s,v)=>s+v.value,0); const concentration=invested?Math.max(...values.map(v=>v.value/invested),0):0;
  const allocation=[{label:"Cash",value:state.cash},...values].map(v=>({...v,pct:netWorth?v.value/netWorth*100:0})).sort((a,b)=>b.value-a.value);
  const benchmarkReturn=state.benchmarkHistory.at(-1)!/state.benchmarkHistory[0]!-1;
  const totalReturn=netWorth/state.startingCash-1;
  const dayPnl=history.length>1?netWorth-history.at(-2)!:0;
  const weekPnl=history.length>5?netWorth-history.at(-6)!:netWorth-history[0]!;
  const riskScore=clamp(volatility*95+concentration*35+(state.cash/netWorth<.08?12:0),0,100);
  return {netWorth, totalReturn,dayPnl,weekPnl,volatility,maxDrawdown:maxDd,concentration,riskScore,benchmarkReturn,alpha:totalReturn-benchmarkReturn,allocation};
}

export function getResearchView(state:GameState,symbol:string):ResearchView {
  const def=assetBySymbol.get(symbol)??ASSETS[0]!; const market=state.assets[def.symbol]!;
  const regimeScore=def.exposures[state.regime]??0;
  const trend=market.history.length>5?market.price/market.history.at(-6)!-1:0;
  const confidence=clamp(55+Math.abs(regimeScore)*12+Math.abs(trend)*180,45,91);
  return {
    symbol:def.symbol,
    bullCase:`${def.name} benefits if the ${state.regime.replaceAll("-"," ")} regime persists and its ${def.sector.toLowerCase()} exposure converts into earnings or flow momentum.`,
    bearCase:`The thesis weakens if macro sensitivity reverses, liquidity contracts, or the current move proves to be crowded rather than fundamental.`,
    confidence:round(confidence,0),
    evidence:[`${round(trend*100,2)}% five-session price trend`,`${round(regimeScore,2)} modeled regime exposure`,`${round(def.volatility*100,1)}% baseline daily volatility parameter`],
    invalidation:[`Price closes 8% below the current modeled level`,`Regime rotates away from ${state.regime.replaceAll("-"," ")}`,`Credit spread rises above ${round(state.macro.creditSpread*100+1,2)}%`]
  };
}

export function serializeGame(state:GameState):string { return JSON.stringify(state); }
export function deserializeGame(raw:string):GameState { const data=JSON.parse(raw) as GameState; if(data.schemaVersion!==1) throw new Error("Unsupported save schema"); return data; }
export { ASSETS } from "@market-architect/market-data";
