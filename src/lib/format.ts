import type { FormatKind } from "../types";

// 日本語の万進法で略記（兆/億/万）。unit は末尾に付与。
function jp(v: number, unit = ""): string {
  const s = v < 0 ? "-" : "";
  const a = Math.abs(v);
  const tiers: [number, string][] = [
    [1e12, "兆"],
    [1e8, "億"],
    [1e4, "万"],
  ];
  for (const [d, k] of tiers) {
    if (a >= d) {
      const m = a / d;
      const ms = m >= 100 ? Math.round(m).toLocaleString("en-US") : trimDec(m);
      return s + ms + k + unit;
    }
  }
  return s + Math.round(a).toLocaleString("en-US") + unit;
}

function trimDec(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}
function comma(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

// 値 → 表示文字列（ツールチップ・凡例で使用）
export function formatValue(v: number | null | undefined, fmt: FormatKind, unit = ""): string {
  if (v === null || v === undefined || Number.isNaN(v)) return "—";
  switch (fmt) {
    case "people":
      return jp(v, "人");
    case "usd":
      return jp(v, "ドル");
    case "count":
      return jp(v, unit);
    case "usdPerCapita":
      return comma(v) + "ドル";
    case "percent":
      return trimDec(v) + "%";
    case "years":
      return v.toFixed(1) + (unit || "歳");
    case "yearsInt":
      return Math.round(v) + (unit || "年");
    case "ratio":
      return trimDec(v) + unit;
    case "perThousand":
      return trimDec(v) + unit;
    case "density":
      return comma(v) + "人/km²";
    case "index":
      return trimDec(v) + unit;
    case "tonnes":
      return v.toFixed(1) + "t";
    case "kwh":
      return jp(v, "kWh");
    default:
      return trimDec(v) + unit;
  }
}

// 凡例の目盛用（短め）。基本は formatValue と同じだが、極端に長い場合の保険。
export function formatTick(v: number, fmt: FormatKind, unit = ""): string {
  return formatValue(v, fmt, unit);
}

export const NO_DATA_COLOR = "#dcdfe4";
export const BORDER_COLOR = "#9aa4b0";
