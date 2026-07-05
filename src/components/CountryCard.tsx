// 国カード: 地図上の国をタップ/クリックすると開く詳細パネル。
//   - 選択中テーマのその国の値と世界順位（値の大きい順）
//   - 上位/下位5か国のミニランキング
//   - 人口（SP.POP.TOTL の静的JSONを遅延取得）
//   - 日本語版Wikipediaの概要（REST API・CORS対応）と外部リンク
import { useEffect, useMemo, useState } from "react";
import type { Theme, ValueRecord } from "../types";
import { COUNTRY_INFO, countryName } from "../lib/countryInfo";
import { formatValue } from "../lib/format";
import { dataUrl } from "../lib/useThemeData";

export interface SelectedCountry {
  iso3: string;
  name: string; // 地図データの英語名（日本語名が無い場合のフォールバック）
}

interface Props {
  country: SelectedCountry;
  theme: Theme | null;
  records: ValueRecord | null; // 選択中テーマのデータ（定量のみ利用）
  onClose: () => void;
  onSelectCountry: (iso3: string, name: string) => void;
}

interface WikiSummary {
  extract: string;
  thumbnail?: { source: string };
  pageUrl: string;
}

// ---- モジュールレベルのキャッシュ（再オープン時の再取得を防ぐ） ----
const wikiCache = new Map<string, WikiSummary | null>();
let popCache: ValueRecord | null = null;
let popPromise: Promise<ValueRecord> | null = null;

async function fetchWiki(title: string): Promise<WikiSummary | null> {
  const url = `https://ja.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const j = (await r.json()) as {
      extract?: string;
      thumbnail?: { source: string };
      content_urls?: { desktop?: { page?: string } };
    };
    if (!j.extract) return null;
    return {
      extract: j.extract,
      thumbnail: j.thumbnail,
      pageUrl: j.content_urls?.desktop?.page ?? `https://ja.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    };
  } catch {
    return null;
  }
}

function fetchPopulation(): Promise<ValueRecord> {
  if (popCache) return Promise.resolve(popCache);
  if (!popPromise) {
    popPromise = fetch(dataUrl("data/SP.POP.TOTL.json"))
      .then((r) => (r.ok ? (r.json() as Promise<ValueRecord>) : {}))
      .then((j) => (popCache = j as ValueRecord))
      .catch(() => (popCache = {}));
  }
  return popPromise;
}

export function CountryCard({ country, theme, records, onClose, onSelectCountry }: Props) {
  const { iso3, name } = country;
  const info = COUNTRY_INFO[iso3];
  const jaName = countryName(iso3, name);
  const wpTitle = info?.wp ?? info?.ja ?? name;

  // Escキーで閉じる
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Wikipedia 概要
  const [wiki, setWiki] = useState<WikiSummary | null | undefined>(undefined); // undefined=読込中
  useEffect(() => {
    let alive = true;
    if (wikiCache.has(wpTitle)) {
      setWiki(wikiCache.get(wpTitle));
      return;
    }
    setWiki(undefined);
    fetchWiki(wpTitle).then((w) => {
      wikiCache.set(wpTitle, w);
      if (alive) setWiki(w);
    });
    return () => {
      alive = false;
    };
  }, [wpTitle]);

  // 人口
  const [pop, setPop] = useState<{ value: number; year: number } | null>(null);
  useEffect(() => {
    let alive = true;
    fetchPopulation().then((p) => alive && setPop(p[iso3] ?? null));
    return () => {
      alive = false;
    };
  }, [iso3]);

  // 選択テーマの値・順位・上位/下位（定量テーマのみ）
  const stats = useMemo(() => {
    if (!theme || theme.type !== "quantitative" || !records) return null;
    const entries = Object.entries(records) as [string, { value: number; year: number }][];
    if (!entries.length) return null;
    const sorted = [...entries].sort((a, b) => b[1].value - a[1].value); // 値の大きい順
    const rank = sorted.findIndex(([k]) => k === iso3);
    return {
      rec: records[iso3] ?? null,
      rank: rank >= 0 ? rank + 1 : null,
      total: sorted.length,
      top: sorted.slice(0, 5),
      bottom: sorted.slice(-5), // 値の大きい順のまま（順位は total-4 … total）
    };
  }, [theme, records, iso3]);

  const rankRow = (k: string, v: { value: number; year: number }, rank: number) => (
    <button
      key={k}
      className={"cc-rank-row" + (k === iso3 ? " me" : "")}
      onClick={() => onSelectCountry(k, k)}
      title={k}
    >
      <span className="cc-rank-no">{rank}位</span>
      <span className="cc-rank-name">{countryName(k, k)}</span>
      <span className="cc-rank-val">{theme ? formatValue(v.value, theme.fmt, theme.unit) : ""}</span>
    </button>
  );

  return (
    <aside className="country-card" role="dialog" aria-label={`${jaName}の詳細`}>
      <div className="cc-head">
        {info && (
          <img
            className="cc-flag"
            src={`https://flagcdn.com/w80/${info.iso2}.png`}
            srcSet={`https://flagcdn.com/w160/${info.iso2}.png 2x`}
            alt=""
            onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
          />
        )}
        <div className="cc-title">
          <h2>{jaName}</h2>
          <span className="cc-sub">
            {name !== jaName ? `${name} · ` : ""}
            {iso3}
            {pop ? ` · 人口 ${formatValue(pop.value, "people")}（${pop.year}年）` : ""}
          </span>
        </div>
        <button className="cc-close" aria-label="閉じる" onClick={onClose}>
          ×
        </button>
      </div>

      {theme && theme.type === "quantitative" && (
        <section className="cc-section">
          <h3>{theme.label}</h3>
          {stats?.rec ? (
            <p className="cc-value">
              <strong>{formatValue(stats.rec.value, theme.fmt, theme.unit)}</strong>
              <span className="cc-year">（{stats.rec.year}年）</span>
              {stats.rank && (
                <span className="cc-rank-badge">
                  値の大きい順で {stats.rank}位 / {stats.total}か国
                </span>
              )}
            </p>
          ) : (
            <p className="cc-value muted">この国のデータはありません</p>
          )}

          {stats && (
            <div className="cc-ranks">
              <div>
                <h4>上位5か国</h4>
                {stats.top.map(([k, v], i) => rankRow(k, v, i + 1))}
              </div>
              <div>
                <h4>下位5か国</h4>
                {stats.bottom.map(([k, v], i) => rankRow(k, v, stats.total - stats.bottom.length + i + 1))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="cc-section">
        <h3>この国について</h3>
        {wiki === undefined && <p className="muted">Wikipedia の概要を取得中…</p>}
        {wiki === null && <p className="muted">Wikipedia の概要を取得できませんでした。</p>}
        {wiki && (
          <div className="cc-wiki">
            {wiki.thumbnail && <img className="cc-thumb" src={wiki.thumbnail.source} alt="" loading="lazy" />}
            <p>{wiki.extract}</p>
          </div>
        )}
        <div className="cc-links">
          <a
            href={wiki?.pageUrl ?? `https://ja.wikipedia.org/wiki/${encodeURIComponent(wpTitle)}`}
            target="_blank"
            rel="noreferrer"
          >
            Wikipedia で読む ↗
          </a>
          <a href={`https://data.worldbank.org/country/${iso3}`} target="_blank" rel="noreferrer">
            World Bank の国データ ↗
          </a>
        </div>
        <p className="cc-credit">概要・画像: Wikipedia（CC BY-SA） / 国旗: flagcdn.com</p>
      </section>
    </aside>
  );
}
