// =====================================================================
// オフライン用の合成サンプルデータ生成（ネット接続不要）。
//   実行: npm run fetch:sample
//   - World Bank API に接続できない環境でのローカル開発・表示確認用。
//   - 指標コードごとに決定的な擬似乱数で「それらしい」値を生成する。
//   - 本番データではないため、値そのものに意味はない（描画確認用）。
// =====================================================================
import { resolve } from "node:path";
import { THEMES, MEMBERS } from "../src/themes";
import type { Theme, ThemeMeta, ValueRecord } from "../src/types";
import { DATA_DIR, VALID_ISO3, VALID_SET, writeJSON, writeManifest, pool } from "./common";

// 文字列 → 0..1 の決定的擬似乱数
function hash01(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// テーマの性質に応じた値域で合成値を作る
function sampleValue(theme: Theme, iso3: string): number {
  const r = hash01(iso3 + "|" + theme.id);
  const r2 = hash01(theme.id + "#" + iso3);
  if (theme.scale === "log") {
    // 対数レンジ
    const ranges: Record<string, [number, number]> = {
      people: [1e5, 1.4e9],
      usd: [5e8, 2e13],
      usdPerCapita: [500, 120000],
      density: [2, 8000],
      kwh: [80, 25000],
      count: [50, 15000],
    };
    const [lo, hi] = ranges[theme.fmt] ?? [1, 1e6];
    return Math.exp(Math.log(lo) + (Math.log(hi) - Math.log(lo)) * r);
  }
  switch (theme.fmt) {
    case "percent":
      return Math.round(r * 1000) / 10; // 0–100
    case "years":
      return 52 + r * 33; // 52–85
    case "yearsInt":
      return Math.round(6 + r * 8); // 6–14
    case "ratio":
      return Math.round(r * 150) / 10; // 0–15
    case "perThousand":
      return Math.round(r * 400) / 10;
    case "index":
      return Math.round((20 + r * 45) * 10) / 10; // 20–65
    case "tonnes":
      return Math.round(r * 250) / 10; // 0–25
    case "count":
      return Math.round((r - 0.5) * 2e6); // ±100万（純移民など）
    default:
      return Math.round(r * 100 * (0.5 + r2));
  }
}

async function main() {
  const quant = THEMES.filter((t) => t.type === "quantitative") as Theme[];
  const metas: ThemeMeta[] = [];

  await pool(quant, 16, async (theme) => {
    const records: ValueRecord = {};
    for (const iso3 of VALID_ISO3) {
      // 一部の国を欠損にしてグレー表示を確認できるように
      if (hash01("miss|" + theme.id + iso3) < 0.08) continue;
      records[iso3] = {
        value: sampleValue(theme, iso3),
        year: 2019 + Math.floor(hash01("y" + theme.id + iso3) * 5),
      };
    }
    writeJSON(resolve(DATA_DIR, `${theme.indicator}.json`), records);
    const vals = Object.values(records).map((d) => d.value);
    const years = Object.values(records).map((d) => d.year);
    metas.push({
      id: theme.id,
      coverage: vals.length,
      min: Math.min(...vals),
      max: Math.max(...vals),
      latestYear: Math.max(...years),
    });
  });

  for (const [id, members] of Object.entries(MEMBERS)) {
    const rec: Record<string, boolean> = {};
    for (const iso3 of members) if (VALID_SET.has(iso3)) rec[iso3] = true;
    writeJSON(resolve(DATA_DIR, `${id}.json`), rec);
    metas.push({ id, coverage: Object.keys(rec).length, min: 0, max: 1, latestYear: null });
  }

  writeManifest(metas, "SAMPLE (synthetic, offline)", new Date().toISOString());
  console.log(`Sample data written: ${quant.length} quantitative + ${Object.keys(MEMBERS).length} categorical.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
