// アプリ全体で使う型定義

export type ThemeType = "quantitative" | "categorical";
export type ScaleType = "linear" | "log";

// 値の整形種別（format.ts で解決）
export type FormatKind =
  | "people" // 人口: 億/万人
  | "usd" // 金額(大): 兆/億ドル
  | "usdPerCapita" // 一人当たり金額: カンマ + ドル
  | "percent" // 百分率: %
  | "years" // 年数(小数): 歳/年
  | "yearsInt" // 年数(整数): 年
  | "ratio" // 比率(小数, 単位そのまま)
  | "density" // 人口密度: 人/km²
  | "index" // 指数(小数, 単位なし/指定)
  | "count" // 件数(大): 億/万 + 単位
  | "perThousand" // 千対比など: そのまま + 単位
  | "tonnes" // トン
  | "kwh"; // キロワット時

export interface CategoryDef {
  value: string | number | boolean;
  label: string;
  color: string;
}

export interface Theme {
  id: string; // 一意ID（定量=WB指標コード、カテゴリ=cat_xxx）
  label: string; // 日本語表示名
  group: string; // カテゴリ（UIタブ分類）
  type: ThemeType;
  source: "worldbank" | "static";
  indicator?: string; // WB指標コード（source=worldbank）
  dataFile: string; // public/data からの相対パス
  unit?: string; // 単位表示（凡例・ツールチップ）
  scale?: ScaleType; // 定量のみ
  scheme: string; // d3-scale-chromatic の interpolator 名（"Viridis" など）
  fmt: FormatKind; // 値フォーマット種別
  invert?: boolean; // 色方向の反転（小さい値を濃色に）
  categories?: CategoryDef[]; // カテゴリ型の離散定義
  description?: string;
}

// public/data/manifest.json の型（fetch-data.ts が生成）
export interface ThemeMeta {
  id: string;
  coverage: number; // 値が存在する国数
  min: number;
  max: number;
  latestYear: number | null;
}
export interface Manifest {
  generatedAt: string;
  source: string;
  themes: ThemeMeta[];
}

// 各データファイルの中身: { ISO3: { value, year } }（定量）
export type ValueRecord = Record<string, { value: number; year: number }>;
// カテゴリ型データ: { ISO3: value }
export type CategoryRecord = Record<string, string | number | boolean>;
