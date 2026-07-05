import { useEffect, useState } from "react";
import type { Theme, Manifest, ValueRecord, CategoryRecord, CatalogEntry } from "../types";
import { ISO_NUMERIC_TO_A3 } from "./isoNumericToA3";

export function dataUrl(file: string): string {
  return import.meta.env.BASE_URL + file;
}

async function loadJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return (await r.json()) as T;
}

// catalog.json（全指標カタログ）を読み込む。無ければ null（厳選テーマのみで動作）。
export function useCatalog() {
  const [catalog, setCatalog] = useState<CatalogEntry[] | null>(null);
  useEffect(() => {
    let alive = true;
    loadJSON<CatalogEntry[]>(dataUrl("data/catalog.json"))
      .then((c) => alive && setCatalog(c))
      .catch(() => {}); // カタログ無しは正常系（オフラインサンプル等）
    return () => {
      alive = false;
    };
  }, []);
  return catalog;
}

// ---- カタログテーマ用: World Bank API から直接最新値を取得 ----
const WB_API = "https://api.worldbank.org/v2";
const VALID_ISO3 = new Set(Object.values(ISO_NUMERIC_TO_A3));

interface WBLiveEntry {
  countryiso3code: string;
  date: string;
  value: number | null;
}

// mrnev=1: 国ごとに「最新の非null値」を1件だけ返してくれる
async function fetchLive(indicator: string): Promise<ValueRecord> {
  const url = `${WB_API}/country/all/indicator/${encodeURIComponent(indicator)}?format=json&mrnev=1&per_page=1000`;
  const json = await loadJSON<[unknown, WBLiveEntry[] | null]>(url);
  const rows = Array.isArray(json) ? json[1] : null;
  const out: ValueRecord = {};
  for (const r of rows ?? []) {
    const iso3 = r.countryiso3code;
    if (!iso3 || !VALID_ISO3.has(iso3)) continue; // 集計地域などを除外
    if (r.value === null || r.value === undefined) continue;
    const year = Number(r.date);
    const prev = out[iso3];
    if (!prev || year > prev.year) out[iso3] = { value: r.value, year };
  }
  return out;
}

// manifest.json を読み込み、利用可能なテーマ集合を返す
export function useManifest() {
  const [manifest, setManifest] = useState<Manifest | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    loadJSON<Manifest>(dataUrl("data/manifest.json"))
      .then((m) => alive && setManifest(m))
      .catch((e) => alive && setError(String(e)));
    return () => {
      alive = false;
    };
  }, []);
  return { manifest, error };
}

const cache = new Map<string, ValueRecord | CategoryRecord>();

export interface ThemeDataState {
  loading: boolean;
  error: string | null;
  records: ValueRecord | CategoryRecord | null;
  min: number;
  max: number;
}

// 選択テーマのデータを読み込む（キャッシュ付き）。定量は min/max も返す。
export function useThemeData(theme: Theme | null, manifest: Manifest | null): ThemeDataState {
  const [state, setState] = useState<ThemeDataState>({
    loading: false,
    error: null,
    records: null,
    min: 0,
    max: 1,
  });

  useEffect(() => {
    if (!theme) return;
    let alive = true;
    const meta = manifest?.themes.find((t) => t.id === theme.id);

    const finish = (records: ValueRecord | CategoryRecord) => {
      if (!alive) return;
      let min = meta?.min ?? 0;
      let max = meta?.max ?? 1;
      if (theme.type === "quantitative" && (meta == null)) {
        const vals = Object.values(records as ValueRecord).map((d) => d.value);
        min = vals.length ? Math.min(...vals) : 0;
        max = vals.length ? Math.max(...vals) : 1;
      }
      setState({ loading: false, error: null, records, min, max });
    };

    const cached = cache.get(theme.id);
    if (cached) {
      finish(cached);
      return () => {
        alive = false;
      };
    }

    setState((s) => ({ ...s, loading: true, error: null }));
    const load: Promise<ValueRecord | CategoryRecord> =
      theme.source === "worldbank-live"
        ? fetchLive(theme.indicator!)
        : loadJSON<ValueRecord | CategoryRecord>(dataUrl(theme.dataFile!));
    load
      .then((records) => {
        cache.set(theme.id, records);
        finish(records);
      })
      .catch((e) => alive && setState({ loading: false, error: String(e), records: null, min: 0, max: 1 }));

    return () => {
      alive = false;
    };
  }, [theme, manifest]);

  return state;
}
