import { useMemo } from "react";
import type { Theme } from "../types";
import type { ColorScale } from "../lib/scales";
import { legendTicks } from "../lib/scales";
import { formatTick, NO_DATA_COLOR } from "../lib/format";

interface Props {
  theme: Theme;
  min: number;
  max: number;
  colorScale: ColorScale | null;
}

export function Legend({ theme, min, max, colorScale }: Props) {
  if (theme.type === "categorical") {
    return (
      <div className="legend">
        <div className="legend-title">{theme.label}</div>
        <div className="legend-cats">
          {theme.categories?.map((c) => (
            <div className="legend-cat" key={String(c.value)}>
              <span className="legend-swatch" style={{ background: c.color }} />
              {c.label}
            </div>
          ))}
          <div className="legend-cat">
            <span className="legend-swatch" style={{ background: NO_DATA_COLOR }} />
            データなし
          </div>
        </div>
      </div>
    );
  }

  return <ContinuousLegend theme={theme} min={min} max={max} colorScale={colorScale} />;
}

function ContinuousLegend({ theme, min, max, colorScale }: Props) {
  const { gradient, ticks, posOf } = useMemo(() => {
    const domain = colorScale ? colorScale.domain() : [min, max];
    const lo = domain[0];
    const hi = domain[domain.length - 1];
    const isLog = theme.scale === "log";
    const lnLo = Math.log(lo);
    const lnHi = Math.log(hi);

    const valueAt = (t: number) => (isLog ? Math.exp(lnLo + (lnHi - lnLo) * t) : lo + (hi - lo) * t);
    const posOf = (v: number) => {
      if (isLog) return (Math.log(v) - lnLo) / (lnHi - lnLo);
      return (v - lo) / (hi - lo);
    };

    const N = 24;
    const stops: string[] = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N;
      const color = colorScale ? colorScale(valueAt(t)) : "#ccc";
      stops.push(`${color} ${(t * 100).toFixed(1)}%`);
    }
    const gradient = `linear-gradient(90deg, ${stops.join(", ")})`;
    const ticks = legendTicks(theme, min, max).filter((v) => v >= lo && v <= hi);
    return { gradient, ticks, posOf };
  }, [theme, min, max, colorScale]);

  return (
    <div className="legend">
      <div className="legend-title">
        {theme.label}
        {theme.unit ? <span className="legend-unit">（{theme.unit}）</span> : null}
        {theme.scale === "log" ? <span className="legend-note"> ・対数</span> : null}
      </div>
      <div className="legend-bar" style={{ background: gradient }} />
      <div className="legend-ticks">
        {ticks.map((v, i) => (
          <span
            key={i}
            className="legend-tick"
            style={{ left: `${Math.min(100, Math.max(0, posOf(v) * 100))}%` }}
          >
            {formatTick(v, theme.fmt, "")}
          </span>
        ))}
      </div>
      <div className="legend-nodata">
        <span className="legend-swatch" style={{ background: NO_DATA_COLOR }} />
        データなし
      </div>
    </div>
  );
}
