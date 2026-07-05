// =====================================================================
// World Bank API v2 から全テーマの最新値を取得し public/data/*.json を生成。
//   実行: npm run fetch   （インターネット接続が必要）
//   - 各指標は mrv=5（直近5年）を取得し、国ごとに最新の非null値を採用。
//   - 実際のデータ年も保存し、ツールチップに表示する。
//   - 収録国が少なすぎる指標は manifest から除外（＝サイトに出さない）。
//   - カテゴリ型（G20/OECD）は themes.ts の MEMBERS から静的生成。
// =====================================================================
import { resolve } from "node:path";
import { THEMES, MEMBERS } from "../src/themes";
import type { Theme, ThemeMeta, ValueRecord } from "../src/types";
import { DATA_DIR, VALID_SET, writeJSON, writeManifest, pool } from "./common";

const API = "https://api.worldbank.org/v2";
const MIN_COVERAGE = 15; // これ未満の国数の指標は非採用

interface WBEntry {
  countryiso3code: string;
  date: string;
  value: number | null;
}

async function fetchIndicator(code: string): Promise<ValueRecord> {
  const url = `${API}/country/all/indicator/${code}?format=json&per_page=20000&mrv=5`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = (await res.json()) as [unknown, WBEntry[] | null];
  const rows = Array.isArray(json) ? json[1] : null;
  if (!rows) return {};
  const out: ValueRecord = {};
  for (const r of rows) {
    const iso3 = r.countryiso3code;
    if (!iso3 || !VALID_SET.has(iso3)) continue;
    if (r.value === null || r.value === undefined) continue;
    const year = Number(r.date);
    const prev = out[iso3];
    if (!prev || year > prev.year) out[iso3] = { value: r.value, year };
  }
  return out;
}

function metaOf(id: string, records: ValueRecord): ThemeMeta {
  const vals = Object.values(records).map((d) => d.value);
  const years = Object.values(records).map((d) => d.year);
  return {
    id,
    coverage: vals.length,
    min: vals.length ? Math.min(...vals) : 0,
    max: vals.length ? Math.max(...vals) : 1,
    latestYear: years.length ? Math.max(...years) : null,
  };
}

async function main() {
  const quant = THEMES.filter(
    (t) => t.type === "quantitative" && t.source === "worldbank",
  ) as Theme[];
  console.log(`Fetching ${quant.length} indicators from World Bank …`);

  const metas: ThemeMeta[] = [];

  const results = await pool(quant, 6, async (theme) => {
    try {
      const records = await fetchIndicator(theme.indicator!);
      return { theme, records, ok: true as const };
    } catch (e) {
      console.warn(`  ✗ ${theme.indicator} ${theme.label}: ${(e as Error).message}`);
      return { theme, records: {} as ValueRecord, ok: false as const };
    }
  });

  let kept = 0;
  for (const { theme, records } of results) {
    const meta = metaOf(theme.id, records);
    if (meta.coverage < MIN_COVERAGE) {
      console.warn(`  – skip ${theme.indicator} (${theme.label}) coverage=${meta.coverage}`);
      continue;
    }
    writeJSON(resolve(DATA_DIR, `${theme.indicator}.json`), records);
    metas.push(meta);
    kept++;
  }

  // カテゴリ型（静的）
  for (const [id, members] of Object.entries(MEMBERS)) {
    const rec: Record<string, boolean> = {};
    for (const iso3 of members) if (VALID_SET.has(iso3)) rec[iso3] = true;
    writeJSON(resolve(DATA_DIR, `${id}.json`), rec);
    metas.push({ id, coverage: Object.keys(rec).length, min: 0, max: 1, latestYear: null });
  }

  writeManifest(metas, "World Bank Open Data (api.worldbank.org)", new Date().toISOString());
  console.log(`Done. ${kept} quantitative + ${Object.keys(MEMBERS).length} categorical themes written to public/data.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
