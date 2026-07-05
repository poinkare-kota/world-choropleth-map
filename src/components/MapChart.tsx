import { useEffect, useMemo, useRef } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { select } from "d3-selection";
import { zoom, zoomIdentity, type ZoomBehavior } from "d3-zoom";
import { ISO_NUMERIC_TO_A3 } from "../lib/isoNumericToA3";
import { BORDER_COLOR } from "../lib/format";
import type { TooltipInfo } from "./Tooltip";

export interface GeoFeature {
  type: string;
  id?: string | number;
  properties?: { name?: string } | null;
  geometry: unknown;
}

interface Props {
  features: GeoFeature[];
  colorOf: (iso3: string | null) => string;
  describe: (iso3: string | null, name: string) => TooltipInfo;
  onHover: (info: TooltipInfo | null, x: number, y: number) => void;
}

const W = 980;
const H = 500;

export function iso3Of(id: string | number | undefined): string | null {
  if (id === undefined) return null;
  return ISO_NUMERIC_TO_A3[String(id).padStart(3, "0")] ?? null;
}

export function MapChart({ features, colorOf, describe, onHover }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const path = useMemo(() => {
    const proj = geoNaturalEarth1().fitSize([W, H], {
      type: "FeatureCollection",
      features: features as unknown[],
    } as never);
    return geoPath(proj);
  }, [features]);

  useEffect(() => {
    if (!svgRef.current || !gRef.current) return;
    const svg = select(svgRef.current);
    const g = select(gRef.current);
    const zb = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([
        [0, 0],
        [W, H],
      ])
      .extent([
        [0, 0],
        [W, H],
      ])
      .on("zoom", (e) => g.attr("transform", e.transform.toString()));
    zoomRef.current = zb;
    svg.call(zb);
    return () => {
      svg.on(".zoom", null);
    };
  }, []);

  const zoomBy = (k: number) => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).call(zoomRef.current.scaleBy, k);
    }
  };
  const resetZoom = () => {
    if (svgRef.current && zoomRef.current) {
      select(svgRef.current).call(zoomRef.current.transform, zoomIdentity);
    }
  };

  return (
    <div className="map-wrap">
      <svg
        ref={svgRef}
        className="map-svg"
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="世界地図"
      >
        <rect
          className="ocean"
          x={0}
          y={0}
          width={W}
          height={H}
          onMouseMove={() => onHover(null, 0, 0)}
        />
        <g ref={gRef}>
          {features.map((f) => {
            const iso3 = iso3Of(f.id);
            const name = f.properties?.name ?? iso3 ?? "—";
            const d = path(f as never) ?? "";
            return (
              <path
                key={String(f.id)}
                d={d}
                fill={colorOf(iso3)}
                stroke={BORDER_COLOR}
                strokeWidth={0.3}
                className="country"
                onMouseMove={(e) => onHover(describe(iso3, name), e.clientX, e.clientY)}
                onMouseLeave={() => onHover(null, 0, 0)}
                onTouchStart={(e) => {
                  const t = e.touches[0];
                  if (t) onHover(describe(iso3, name), t.clientX, t.clientY);
                }}
              />
            );
          })}
        </g>
      </svg>

      <div className="zoom-controls">
        <button aria-label="拡大" onClick={() => zoomBy(1.5)}>
          ＋
        </button>
        <button aria-label="縮小" onClick={() => zoomBy(1 / 1.5)}>
          －
        </button>
        <button aria-label="リセット" onClick={resetZoom}>
          ⟲
        </button>
      </div>
    </div>
  );
}
