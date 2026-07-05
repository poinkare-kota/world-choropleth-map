import { useEffect, useState } from "react";
import type { Theme, Manifest, ValueRecord, CategoryRecord } from "../types";

export function dataUrl(file: string): string {
  return import.meta.env.BASE_URL + file;
}

async function loadJSON<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} -> ${r.status}`);
  return (await r.json()) as T;
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
    loadJSON<ValueRecord | CategoryRecord>(dataUrl(theme.dataFile))
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
