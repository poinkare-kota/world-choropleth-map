import { useEffect, useMemo, useState } from "react";
import { feature } from "topojson-client";
import world from "world-atlas/countries-110m.json";
import { THEMES, GROUP_ORDER } from "./themes";
import type { CategoryRecord, ValueRecord } from "./types";
import { useManifest, useThemeData } from "./lib/useThemeData";
import { buildColorScale } from "./lib/scales";
import { formatValue, NO_DATA_COLOR } from "./lib/format";
import { ThemeSelector } from "./components/ThemeSelector";
import { MapChart, type GeoFeature } from "./components/MapChart";
import { Legend } from "./components/Legend";
import { Tooltip, type TooltipInfo } from "./components/Tooltip";

export default function App() {
  const features = useMemo(() => {
    const fc = feature(world as never, (world as never as { objects: { countries: unknown } }).objects.countries as never) as unknown as {
      features: GeoFeature[];
    };
    return fc.features;
  }, []);

  const { manifest, error } = useManifest();

  const availableThemes = useMemo(() => {
    if (!manifest) return [];
    const cov = new Map(manifest.themes.map((t) => [t.id, t.coverage]));
    return THEMES.filter((t) => (cov.get(t.id) ?? 0) > 0);
  }, [manifest]);

  const groups = useMemo(
    () => GROUP_ORDER.filter((g) => availableThemes.some((t) => t.group === g)),
    [availableThemes],
  );

  const [selectedId, setSelectedId] = useState<string>("SP.POP.TOTL");
  useEffect(() => {
    if (availableThemes.length && !availableThemes.some((t) => t.id === selectedId)) {
      setSelectedId(availableThemes[0].id);
    }
  }, [availableThemes, selectedId]);

  const theme = availableThemes.find((t) => t.id === selectedId) ?? availableThemes[0] ?? null;
  const data = useThemeData(theme, manifest);

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
            themes={availableThemes}
            groups={groups}
            selectedId={theme.id}
            onSelect={setSelectedId}
          />

          <main className="stage">
            <MapChart features={features} colorOf={colorOf} describe={describe} onHover={onHover} />
            <Legend theme={theme} min={data.min} max={data.max} colorScale={colorScale} />
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
            <span>テーマ数: {availableThemes.length}</span>
          </footer>
        </>
      )}

      <Tooltip info={hover.info} x={hover.x} y={hover.y} />
    </div>
  );
}
