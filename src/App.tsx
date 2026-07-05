import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { THEMES, GROUP_ORDER, CATALOG_GROUP, TARGET_THEME_COUNT, themeFromCatalog } from "./themes";
import type { CategoryRecord, ValueRecord } from "./types";
import { useCatalog, useManifest, useThemeData } from "./lib/useThemeData";
import { buildColorScale, decideScale } from "./lib/scales";
import { formatValue, NO_DATA_COLOR } from "./lib/format";
import { ThemeSelector } from "./components/ThemeSelector";
import { MapChart, type GeoFeature } from "./components/MapChart";
import { Legend } from "./components/Legend";
import { Tooltip, type TooltipInfo } from "./components/Tooltip";
import { CountryCard, type SelectedCountry } from "./components/CountryCard";

export default function App() {
  const features = useMemo(() => {
    const fc = feature(world as never, (world as never as { objects: { countries: unknown } }).objects.countries as never) as unknown as {
      features: GeoFeature[];
    };
    return fc.features;
  }, []);

  const { manifest, error } = useManifest();
  const catalog = useCatalog();

  const availableThemes = useMemo(() => {
    if (!manifest) return [];
    const cov = new Map(manifest.themes.map((t) => [t.id, t.coverage]));
    return THEMES.filter((t) => (cov.get(t.id) ?? 0) > 0);
  }, [manifest]);

  // 全指標カタログ: 厳選テーマと合わせて合計 TARGET_THEME_COUNT(=10,000) になるよう切り詰める
  const catalogThemes = useMemo(() => {
    if (!catalog || !manifest) return [];
    const curated = new Set(THEMES.map((t) => t.id));
    const room = Math.max(0, TARGET_THEME_COUNT - availableThemes.length);
    return catalog
      .filter((e) => !curated.has(e[0]))
      .slice(0, room)
      .map(themeFromCatalog);
  }, [catalog, manifest, availableThemes]);

  const allThemes = useMemo(
    () => [...availableThemes, ...catalogThemes],
    [availableThemes, catalogThemes],
  );

  const groups = useMemo(
    () =>
      GROUP_ORDER.filter(
        (g) => availableThemes.some((t) => t.group === g) || (g === CATALOG_GROUP && catalogThemes.length > 0),
      ),
    [availableThemes, catalogThemes],
  );

  const [selectedId, setSelectedId] = useState<string>("SP.POP.TOTL");
  useEffect(() => {
    if (allThemes.length && !allThemes.some((t) => t.id === selectedId)) {
      setSelectedId(allThemes[0].id);
    }
  }, [allThemes, selectedId]);

  const baseTheme = allThemes.find((t) => t.id === selectedId) ?? allThemes[0] ?? null;
  const data = useThemeData(baseTheme, manifest);

  // カタログテーマはスケール未定義なので、取得データの分布から自動判定する
  const theme = useMemo(() => {
    if (!baseTheme) return null;
    if (baseTheme.source === "worldbank-live" && baseTheme.scale === undefined) {
      return { ...baseTheme, scale: decideScale(data.min, data.max) };
    }
    return baseTheme;
  }, [baseTheme, data.min, data.max]);

  const colorScale = useMemo(
    () => (theme && theme.type === "quantitative" ? buildColorScale(theme, data.min, data.max) : null),
    [theme, data.min, data.max],
  );

  const colorOf = (iso3: string | null): string => {
    if (!theme || !data.records || !iso3) return NO_DATA_COLOR;
    if (theme.type === "categorical") {
      const member = !!(data.records as CategoryRecord)[iso3];
      const cat = theme.categories?.find((c) => c.value === member);
      return cat ? cat.color : NO_DATA_COLOR;
    }
    const rec = (data.records as ValueRecord)[iso3];
    if (!rec || !colorScale) return NO_DATA_COLOR;
    return colorScale(rec.value);
  };

  const describe = (iso3: string | null, name: string): TooltipInfo => {
    const swatch = colorOf(iso3);
    if (!theme || !data.records || !iso3) return { name, iso3, valueText: "データなし", swatch: NO_DATA_COLOR };
    if (theme.type === "categorical") {
      const member = !!(data.records as CategoryRecord)[iso3];
      const cat = theme.categories?.find((c) => c.value === member);
      return { name, iso3, valueText: cat?.label ?? "—", swatch };
    }
    const rec = (data.records as ValueRecord)[iso3];
    if (!rec) return { name, iso3, valueText: "データなし", swatch: NO_DATA_COLOR };
    return {
      name,
      iso3,
      valueText: formatValue(rec.value, theme.fmt, theme.unit),
      sub: `${rec.year}年`,
      swatch,
    };
  };

  const [hover, setHover] = useState<{ info: TooltipInfo | null; x: number; y: number }>({
    info: null,
    x: 0,
    y: 0,
  });
  const onHover = (info: TooltipInfo | null, x: number, y: number) => setHover({ info, x, y });

  // 国カード（国クリックで開く。テーマを切り替えても開いたまま値が更新される）
  const [selectedCountry, setSelectedCountry] = useState<SelectedCountry | null>(null);
  const onSelectCountry = (iso3: string, name: string) => setSelectedCountry({ iso3, name });

  const meta = manifest?.themes.find((t) => t.id === theme?.id);

  return (
    <div className="app">
      <header className="header">
        <h1>世界テーマ地図</h1>
        <p className="subtitle">
          テーマを選ぶと、各国が指標値に応じて色分けされます（データ: World Bank）
        </p>
      </header>

      {!manifest && !error && <div className="notice">データを読み込み中…</div>}
      {error && (
        <div className="notice error">
          データ (public/data) が見つかりません。ローカルでは <code>npm run fetch</code>（要ネット接続）
          または <code>npm run fetch:sample</code>（オフライン用サンプル）を実行してください。
          <br />
          <span className="mono">{error}</span>
        </div>
      )}

      {theme && manifest && (
        <>
          <ThemeSelector
            themes={allThemes}
            groups={groups}
            selectedId={theme.id}
            onSelect={setSelectedId}
          />

          {data.loading && <div className="notice">「{theme.label}」のデータを取得中…</div>}
          {!data.loading && data.error && theme.source === "worldbank-live" && (
            <div className="notice error">
              World Bank API からのデータ取得に失敗しました。時間をおいて再試行してください。
              <br />
              <span className="mono">{data.error}</span>
            </div>
          )}
          {!data.loading && !data.error && theme.source === "worldbank-live" && data.records &&
            Object.keys(data.records).length === 0 && (
              <div className="notice">この指標には表示可能な国別データがありません。別のテーマをお試しください。</div>
            )}

          <main className="stage">
            <MapChart
              features={features}
              colorOf={colorOf}
              describe={describe}
              onHover={onHover}
              onSelect={onSelectCountry}
            />
            <Legend theme={theme} min={data.min} max={data.max} colorScale={colorScale} />
            {selectedCountry && (
              <CountryCard
                country={selectedCountry}
                theme={theme}
                records={theme?.type === "quantitative" ? (data.records as ValueRecord | null) : null}
                onClose={() => setSelectedCountry(null)}
                onSelectCountry={onSelectCountry}
              />
            )}
          </main>

          <footer className="footer">
            <span>
              出典: <a href="https://data.worldbank.org/" target="_blank" rel="noreferrer">World Bank Open Data</a>
              {theme.type === "categorical" ? "（加盟情報は静的データ）" : ""}
            </span>
            {meta && theme.type === "quantitative" && (
              <span>
                収録国: {meta.coverage}か国 ・ 最新年: {meta.latestYear ?? "—"}
              </span>
            )}
            {!meta && theme.type === "quantitative" && data.records && (
              <span>収録国: {Object.keys(data.records).length}か国</span>
            )}
            <span>
              テーマ数: {allThemes.length.toLocaleString()}
              {catalogThemes.length > 0 && `（厳選 ${availableThemes.length} + カタログ ${catalogThemes.length.toLocaleString()}）`}
            </span>
          </footer>
        </>
      )}

      <Tooltip info={hover.info} x={hover.x} y={hover.y} />
    </div>
  );
}
