"use client";
import { create } from "zustand";
import { persist,createJSONStorage } from "zustand/middleware";
import { createInitialState,simulateTurn,type GameMode,type GameState,type PlayerOrder } from "@market-architect/engine";
interface GameStore {game:GameState;selectedSymbol:string;setSelectedSymbol:(s:string)=>void;advance:(orders?:PlayerOrder[])=>void;newRun:(seed:string,mode:GameMode)=>void;load:(game:GameState)=>void;}
export const useGameStore=create<GameStore>()(persist((set,get)=>({
  game:createInitialState("architect-001","academy"),selectedSymbol:"AION",setSelectedSymbol:(selectedSymbol)=>set({selectedSymbol}),
  advance:(orders=[])=>set({game:simulateTurn(get().game,orders,get().game.seed)}),
  newRun:(seed,mode)=>set({game:createInitialState(seed||"architect-001",mode)}),load:(game)=>set({game})
}),{name:"market-architect-save-v1",version:1,storage:createJSONStorage(()=>localStorage),partialize:s=>({game:s.game,selectedSymbol:s.selectedSymbol})}));
