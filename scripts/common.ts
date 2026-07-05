import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { ISO_NUMERIC_TO_A3 } from "../src/lib/isoNumericToA3";
import type { ThemeMeta } from "../src/types";

export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const DATA_DIR = resolve(ROOT, "public/data");

// world-atlas に存在する国だけを対象にする（集計地域などを除外）
export const VALID_ISO3: string[] = Array.from(new Set(Object.values(ISO_NUMERIC_TO_A3)));
export const VALID_SET = new Set(VALID_ISO3);

export function writeJSON(file: string, obj: unknown): void {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, JSON.stringify(obj));
}

export function writeManifest(themes: ThemeMeta[], source: string, generatedAt: string): void {
  writeJSON(resolve(DATA_DIR, "manifest.json"), { generatedAt, source, themes });
}

// 並列実行プール
export async function pool<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const ret: R[] = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      ret[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return ret;
}
