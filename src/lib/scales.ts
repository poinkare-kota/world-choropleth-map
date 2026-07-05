import * as chromatic from "d3-scale-chromatic";
import { scaleSequential, scaleSequentialLog } from "d3-scale";
import type { Theme } from "../types";

type Interp = (t: number) => string;

// scheme 名 → d3-scale-chromatic の interpolator
export function interpolatorFor(scheme: string): Interp {
  const key = "interpolate" + scheme;
  const fn = (chromatic as unknown as Record<string, Interp>)[key];
  return fn ?? chromatic.interpolateViridis;
}

export interface ColorScale {
  (v: number): string;
  domain(): number[];
}

// テーマとデータのドメインから連続カラースケールを構築
export function buildColorScale(theme: Theme, min: number, max: number): ColorScale {
  const base = interpolatorFor(theme.scheme);
  const interp: Interp = theme.invert ? (t: number) => base(1 - t) : base;

  if (theme.scale === "log") {
    // 対数スケールは正の下限が必要
    const lo = min > 0 ? min : max > 0 ? max / 1e4 : 1;
    const hi = max > lo ? max : lo * 10;
    return scaleSequentialLog(interp).domain([lo, hi]).clamp(true) as unknown as ColorScale;
  }
  const hi = max > min ? max : min + 1;
  return scaleSequential(interp).domain([min, hi]).clamp(true) as unknown as ColorScale;
}

// 凡例の目盛値を算出（線形は等間隔、対数は 1,2,5×10^n 系）
export function legendTicks(theme: Theme, min: number, max: number, count = 5): number[] {
  if (theme.scale === "log") {
    const lo = min > 0 ? min : max > 0 ? max / 1e4 : 1;
    const hi = max > lo ? max : lo * 10;
    const ticks: number[] = [];
    const loE = Math.floor(Math.log10(lo));
    const hiE = Math.ceil(Math.log10(hi));
    for (let e = loE; e <= hiE; e++) {
      for (const m of [1, 3]) {
        const t = m * Math.pow(10, e);
        if (t >= lo && t <= hi) ticks.push(t);
      }
    }
    if (ticks.length < 2) return [lo, hi];
    return ticks;
  }
  const step = (max - min) / (count - 1);
  return Array.from({ length: count }, (_, i) => min + step * i);
}
