// =====================================================================
// 特集・ニッチ統計のデータ生成（ビルド時実行）。
//   実行: npm run fetch:special   （インターネット接続が必要）
//   1) HSコード級の貿易統計: UN Comtrade の公開プレビューAPI（キー不要・
//      500行上限）から「対世界・年次・最新年」の輸出入額を取得。
//      テーマ定義は themes.ts の SPECIAL_TRADE（サル 010611 など）。
//   2) 半導体製造工場の数: 英語版Wikipedia
//      "List of semiconductor fabrication plants" の表を国別に集計。
//      閉鎖済み・建設中などの行は除外（概数）。
//   生成物: public/data/special/*.json ＋ 既存 manifest.json へのメタ追記。
//   失敗したテーマは manifest に載らず、サイトには表示されない（安全側）。
// =====================================================================
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { SPECIAL_TRADE, FAB_THEME_ID } from "../src/themes";
import type { Manifest, ThemeMeta, ValueRecord } from "../src/types";
import { DATA_DIR, VALID_SET, writeJSON } from "./common";

const MIN_COVERAGE = 5; // ニッチ統計は収録国が少なくても採用する
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

// ---- 1) UN Comtrade（公開プレビューAPI・キー不要） ----
interface ComtradeRow {
  reporterISO?: string;
  refYear?: number;
  primaryValue?: number;
}

async function fetchComtrade(hs: string, flow: "X" | "M", year: number): Promise<ComtradeRow[]> {
  const url =
    `https://comtradeapi.un.org/public/v1/preview/C/A/HS` +
    `?period=${year}&cmdCode=${hs}&flowCode=${flow}&partnerCode=0`;
  const res = await fetch(url, { headers: { accept: "application/json" } });
  if (!res.ok) throw new Error(`Comtrade HTTP ${res.status}`);
  const json = (await res.json()) as { data?: ComtradeRow[] };
  return json.data ?? [];
}

async function buildTradeTheme(id: string, hs: string, flow: "X" | "M"): Promise<ValueRecord> {
  const out: ValueRecord = {};
  // 新しい年から順に埋める（既にある国は上書きしない＝最新年を優先）
  for (const year of [2024, 2023, 2022]) {
    try {
      const rows = await fetchComtrade(hs, flow, year);
      for (const r of rows) {
        const iso3 = r.reporterISO ?? "";
        if (!VALID_SET.has(iso3)) continue;
        if (r.primaryValue == null || !(r.primaryValue > 0)) continue;
        if (!out[iso3]) out[iso3] = { value: r.primaryValue, year: r.refYear ?? year };
      }
      console.log(`  ${id}: year=${year} rows=${rows.length} cum=${Object.keys(out).length}`);
    } catch (e) {
      console.warn(`  ${id}: year=${year} failed: ${(e as Error).message}`);
    }
    await sleep(1200); // 公開APIなのでリクエスト間隔を空ける
  }
  return out;
}

// ---- 2) 半導体ファブ数（Wikipedia の一覧を国別集計） ----
// 行テキスト中の国名を照合するための別名表（複合語を先に置くこと）
const FAB_COUNTRY_ALIASES: [string, string][] = [
  ["United States", "USA"], ["South Korea", "KOR"], ["North Korea", "PRK"],
  ["United Kingdom", "GBR"], ["Hong Kong", "HKG"], ["New Zealand", "NZL"],
  ["Saudi Arabia", "SAU"], ["United Arab Emirates", "ARE"], ["South Africa", "ZAF"],
  ["Czech Republic", "CZE"], ["Czechia", "CZE"], ["Costa Rica", "CRI"],
  ["Taiwan", "TWN"], ["Japan", "JPN"], ["China", "CHN"], ["Germany", "DEU"],
  ["France", "FRA"], ["Italy", "ITA"], ["Ireland", "IRL"], ["Netherlands", "NLD"],
  ["Belgium", "BEL"], ["Austria", "AUT"], ["Switzerland", "CHE"], ["Sweden", "SWE"],
  ["Finland", "FIN"], ["Norway", "NOR"], ["Denmark", "DNK"], ["Russia", "RUS"],
  ["Israel", "ISR"], ["Singapore", "SGP"], ["Malaysia", "MYS"], ["Thailand", "THA"],
  ["Philippines", "PHL"], ["Vietnam", "VNM"], ["India", "IND"], ["Australia", "AUS"],
  ["Canada", "CAN"], ["Mexico", "MEX"], ["Brazil", "BRA"], ["Poland", "POL"],
  ["Spain", "ESP"], ["Portugal", "PRT"], ["Greece", "GRC"], ["Hungary", "HUN"],
  ["Romania", "ROU"], ["Bulgaria", "BGR"], ["Belarus", "BLR"], ["Ukraine", "UKR"],
  ["Turkey", "TUR"], ["Argentina", "ARG"], ["Chile", "CHL"], ["Colombia", "COL"],
  ["Egypt", "EGY"], ["Iran", "IRN"], ["Pakistan", "PAK"], ["Indonesia", "IDN"],
  ["Slovakia", "SVK"], ["Slovenia", "SVN"], ["Croatia", "HRV"], ["Serbia", "SRB"],
  ["Lithuania", "LTU"], ["Latvia", "LVA"], ["Estonia", "EST"], ["Kazakhstan", "KAZ"],
];
const FAB_SKIP_ROW = /closed|defunct|demolished|under construction|announced|planned|cancelled|converted|shut down/i;
const FAB_SKIP_SECTION = /closed|former|defunct|under construction|announced|planned|proposed|future/i;

async function buildFabTheme(): Promise<ValueRecord> {
  const url = "https://en.wikipedia.org/api/rest_v1/page/html/List_of_semiconductor_fabrication_plants";
  const res = await fetch(url, { headers: { accept: "text/html" } });
  if (!res.ok) throw new Error(`Wikipedia HTTP ${res.status}`);
  const html = await res.text();

  const counts: Record<string, number> = {};
  const year = new Date().getUTCFullYear();
  // セクション単位で処理し、閉鎖・計画中などのセクションは丸ごと除外
  const sections = html.split(/<section/i);
  for (const sec of sections) {
    const hMatch = sec.match(/<h[23][^>]*>(.*?)<\/h[23]>/i);
    const heading = hMatch ? hMatch[1].replace(/<[^>]+>/g, "") : "";
    if (FAB_SKIP_SECTION.test(heading)) {
      console.log(`  fabs: skip section "${heading}"`);
      continue;
    }
    const rows = sec.split(/<tr[\s>]/i).slice(1);
    for (const row of rows) {
      const text = row.replace(/<[^>]+>/g, " ");
      if (/<th[\s>]/i.test(row)) continue; // ヘッダ行
      if (FAB_SKIP_ROW.test(text)) continue;
      for (const [alias, iso3] of FAB_COUNTRY_ALIASES) {
        if (text.includes(alias)) {
          counts[iso3] = (counts[iso3] ?? 0) + 1;
          break; // 1行につき1国（先勝ち: 複合語を先に照合済み）
        }
      }
    }
  }
  const out: ValueRecord = {};
  for (const [iso3, n] of Object.entries(counts)) out[iso3] = { value: n, year };
  console.log(
    "  fabs by country:",
    Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, n]) => `${k}=${n}`)
      .join(" "),
  );
  return out;
}

// ---- manifest への追記（同IDは置き換え） ----
function appendManifest(newMetas: ThemeMeta[]): void {
  const path = resolve(DATA_DIR, "manifest.json");
  let manifest: Manifest = { generatedAt: new Date().toISOString(), source: "", themes: [] };
  if (existsSync(path)) manifest = JSON.parse(readFileSync(path, "utf8")) as Manifest;
  const ids = new Set(newMetas.map((m) => m.id));
  manifest.themes = [...manifest.themes.filter((m) => !ids.has(m.id)), ...newMetas];
  writeJSON(path, manifest);
}

async function main() {
  const metas: ThemeMeta[] = [];

  console.log(`Fetching ${SPECIAL_TRADE.length} HS-level trade themes from UN Comtrade …`);
  for (const spec of SPECIAL_TRADE) {
    const records = await buildTradeTheme(spec.id, spec.hs, spec.flow);
    const meta = metaOf(spec.id, records);
    if (meta.coverage < MIN_COVERAGE) {
      console.warn(`  – skip ${spec.id} (${spec.label}) coverage=${meta.coverage}`);
      continue;
    }
    writeJSON(resolve(DATA_DIR, `special/${spec.id}.json`), records);
    metas.push(meta);
  }

  console.log("Counting semiconductor fabs from Wikipedia …");
  try {
    const records = await buildFabTheme();
    const meta = metaOf(FAB_THEME_ID, records);
    if (meta.coverage >= MIN_COVERAGE) {
      writeJSON(resolve(DATA_DIR, `special/${FAB_THEME_ID}.json`), records);
      metas.push(meta);
    } else {
      console.warn(`  – skip ${FAB_THEME_ID} coverage=${meta.coverage}`);
    }
  } catch (e) {
    console.warn(`  – fabs failed: ${(e as Error).message}`);
  }

  appendManifest(metas);
  console.log(`Done. ${metas.length} special themes appended to manifest.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
