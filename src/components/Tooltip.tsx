export interface TooltipInfo {
  name: string;
  iso3: string | null;
  valueText: string;
  sub?: string;
  swatch: string;
}

export function Tooltip({ info, x, y }: { info: TooltipInfo | null; x: number; y: number }) {
  if (!info) return null;
  const pad = 14;
  const left = x + 180 > window.innerWidth ? x - 180 : x + pad;
  const top = y + 90 > window.innerHeight ? y - 90 : y + pad;
  return (
    <div className="tooltip" style={{ left, top }}>
      <div className="tt-name">
        <span className="tt-swatch" style={{ background: info.swatch }} />
        {info.name}
      </div>
      <div className="tt-val">
        {info.valueText}
        {info.sub ? <span className="tt-sub"> · {info.sub}</span> : null}
      </div>
    </div>
  );
}
