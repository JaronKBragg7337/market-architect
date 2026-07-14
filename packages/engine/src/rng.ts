export interface SeededRng { next(): number; normal(): number; pick<T>(items: readonly T[]): T; }
function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i=0;i<input.length;i++) { h ^= input.charCodeAt(i); h = Math.imul(h,16777619); }
  return h >>> 0;
}
export function createRng(seed: string): SeededRng {
  let state = hashSeed(seed) || 0x9e3779b9;
  const next = () => {
    state += 0x6D2B79F5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    normal() { const u=Math.max(next(),1e-9), v=Math.max(next(),1e-9); return Math.sqrt(-2*Math.log(u))*Math.cos(2*Math.PI*v); },
    pick<T>(items: readonly T[]) { const value=items[Math.floor(next()*items.length)]; if (value===undefined) throw new Error("Cannot pick from empty array"); return value; }
  };
}
