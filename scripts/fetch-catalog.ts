// =====================================================================
// World Bank の全指標カタログを取得し public/data/catalog.json を生成。
//   実行: npm run fetch:catalog   （インターネット接続が必要）
//   - 約16,000指標のうち、厳選テーマと合わせて合計10,000テーマになる分
//     （＋不足防止のバッファ）だけを [コード, 英語名, 単位] のタプルで保存。
//   - WDI（source=2, 現行の主要データベース）の指標を優先して採用する。
//   - 個々の指標データはビルド時には取得せず、アプリが選択時に
//     World Bank API から直接取得する（useThemeData.ts の fetchLive）。
// =====================================================================
import { resolve } from "node:path";
import { THEMES, TARGET_THEME_COUNT } from "../src/themes";
import type { CatalogEntry } from "../src/types";
import { DATA_DIR, writeJSON } from "./common";

const API = "https://api.worldbank.org/v2";
// 厳選テーマの一部が coverage 不足で落ちても合計 10,000 を維持できるようバッファ
const TARGET = TARGET_THEME_COUNT + 200;

interface WBIndicator {
  id: string;
  name: string;
  unit: string;
  source?: { id: string; value: string };
}
interface WBPageMeta {
  page: number;
  pages: number;
  total: number;
}

async function fetchPage(page: number, perPage: number): Promise<[WBPageMeta, WBIndicator[] | null]> {
  const url = `${API}/indicator?format=json&per_page=${perPage}&page=${page}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} (${url})`);
  return (await res.json()) as [WBPageMeta, WBIndicator[] | null];
}

async function main() {
  const perPage = 1000;
  const [meta, first] = await fetchPage(1, perPage);
  console.log(`World Bank indicator catalog: ${meta.total} indicators / ${meta.pages} pages`);

  const all: WBIndicator[] = [...(first ?? [])];
  for (let p = 2; p <= meta.pages; p++) {
    const [, rows] = await fetchPage(p, perPage);
    if (rows) all.push(...rows);
  }
  console.log(`  fetched ${all.length} raw entries`);

  // WDI（source=2）を優先し、その他は元の順序を保つ安定ソート
  const sorted = [...all].sort(
    (a, b) => Number(a.source?.id !== "2") - Number(b.source?.id !== "2"),
  );

  const curated = new Set(THEMES.map((t) => t.id));
  const seen = new Set<string>();
  const entries: CatalogEntry[] = [];
  for (const ind of sorted) {
    if (!ind?.id || !ind.name) continue;
    if (curated.has(ind.id) || seen.has(ind.id)) continue;
    seen.add(ind.id);
    entries.push([ind.id, ind.name.trim(), (ind.unit ?? "").trim()]);
    if (entries.length >= TARGET) break;
  }

  writeJSON(resolve(DATA_DIR, "catalog.json"), entries);
  console.log(`catalog.json written: ${entries.length} entries (target total: ${TARGET_THEME_COUNT} themes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
