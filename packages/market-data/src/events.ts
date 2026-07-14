import type { MarketEvent } from "@market-architect/shared";
import { EVENTS_1 } from "./events-1";
import { EVENTS_2 } from "./events-2";

export const EVENT_LIBRARY: Omit<MarketEvent,"id"|"createdTick">[] = [...EVENTS_1, ...EVENTS_2];
