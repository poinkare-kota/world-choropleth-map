# 世界テーマ地図 — World Choropleth Map

世界地図上でテーマ（人口・GDP・平均寿命など **10,000種**）をボタンや検索で切り替えると、
各国が指標値に応じて色分け表示されるインタラクティブなコロプレスマップです。
**バックエンド不要の完全静的サイト**（GitHub Pages で公開）。

テーマは2階層です:
- **厳選テーマ（約100種・日本語）**: ビルド時にデータを取得し、単位・配色・スケールを個別に調整済み
- **全指標カタログ（約9,900種・英語）**: World Bank の指標カタログから自動収載。
  選択した瞬間にブラウザが World Bank API から最新値を直接取得して描画（配色・対数/線形は自動判定）

- データ: [World Bank Open Data](https://data.worldbank.org/)（API v2・無料・キー不要）
- 地図: D3.js + topojson（world-atlas `countries-110m`）、Natural Earth 投影、ズーム/パン
- 配色: d3-scale-chromatic（連続カラースケール／対数対応、カテゴリ型は離散配色）

## 🔗 デモ

デプロイ後: `https://<ユーザー名>.github.io/world-choropleth-map/`

## ✨ 特徴

- **合計10,000テーマ**。厳選テーマは12カテゴリに分類、カタログは「全指標カタログ」タブ＋検索（日本語/英語/指標コード）で探せる
- ホバー/タップで **国名・値・データ年** のツールチップ
- **凡例**（連続カラーバー＋日本語略記の目盛／カテゴリ型は離散凡例）、欠損国はグレー
- 数値は日本語で読みやすく略記（例: `1.4億人`、`12.3兆ドル`）
- カテゴリ型（有無で塗り分け）の例として **G20 / OECD 加盟国** を収録
- レスポンシブ対応

## 🛠 技術スタック

Vite + React + TypeScript / D3.js（d3-geo, d3-zoom, d3-scale, d3-scale-chromatic）/ topojson-client / world-atlas

## 🚀 ローカルで動かす

```bash
npm install

# データを用意（どちらか）
npm run fetch          # World Bank から取得（要インターネット接続）
npm run fetch:catalog  # 全指標カタログを取得（要インターネット接続・任意）
npm run fetch:sample   # オフライン用の合成サンプル（描画確認用・値に意味はなし）

npm run dev            # 開発サーバ
```

ビルドと確認:

```bash
npm run build          # 型チェック(tsc) + 本番ビルド(vite) → dist/
npm run preview        # dist をローカル配信
```

> データは `public/data/*.json` に生成されます（`.gitignore` 対象＝コミット不要）。
> 本番では GitHub Actions が毎デプロイ時に `npm run fetch` を実行して最新化します。

## 🎨 テーマを追加する

テーマは **`src/themes.ts` の1ファイルで一元管理** しています。

### 定量テーマ（World Bank 指標）

`QUANT` 配列に1行タプルを足すだけです。

```ts
// [指標コード, 表示名, グループ, 単位, スケール, 整形, 配色, 反転?]
["SP.POP.TOTL", "総人口", "人口・人口動態", "人", "log", "people", "Viridis"],
```

| 項目 | 説明 |
|------|------|
| 指標コード | World Bank の Indicator コード（例: `NY.GDP.MKTP.CD`） |
| スケール | `"linear"` / `"log"` |
| 整形 | `people` `usd` `usdPerCapita` `percent` `years` `ratio` `density` `count` `tonnes` `kwh` `index` など（`src/types.ts` の `FormatKind`） |
| 配色 | d3-scale-chromatic の interpolator 名（`"Viridis"` → `interpolateViridis`） |
| 反転 | `true` で色方向を反転（小さい値を濃色に） |

追加後に `npm run fetch`（または `fetch:sample`）を実行すると、その指標が取得され地図に出ます。
**データが十分に揃わない指標（収録国数が少ない）は自動的に非表示**になります（`manifest.json` 参照）。

### カテゴリ型テーマ（有無で塗り分け）

`src/themes.ts` の `CATEGORICAL` にテーマ定義を、`MEMBERS` に加盟国（ISO3）配列を追加します。
静的データなので API 取得は不要です。

```ts
// CATEGORICAL に追加
{ id: "cat_eu", label: "EU 加盟国", group: "国際的枠組み", type: "categorical",
  source: "static", dataFile: "data/cat_eu.json", scheme: "", fmt: "index",
  categories: MEMBERSHIP }
// MEMBERS に追加
cat_eu: ["FRA", "DEU", "ITA", /* … */]
```

## 🔄 データ更新方法

```bash
npm run fetch   # World Bank から再取得して public/data を更新
```

GitHub Actions のデプロイ時にも自動で実行されるため、`main` に push すれば公開データも最新化されます。
手動で最新化したい場合は Actions の «Deploy to GitHub Pages» を再実行してください。

## ☁️ デプロイ（GitHub Pages）

1. このリポジトリ名に合わせて `vite.config.ts` の `base` を設定（既定 `"/world-choropleth-map/"`）。
2. GitHub の **Settings → Pages → Build and deployment → Source** を **「GitHub Actions」** に設定。
3. `main` に push すると `.github/workflows/deploy.yml` が
   **データ取得 → ビルド → デプロイ** を自動実行します。

## 📁 構成

```
scripts/fetch-data.ts      World Bank から取得して public/data を生成
scripts/make-sample-data.ts オフライン用の合成サンプル生成
src/themes.ts              テーマ定義（単一の真実の源）
src/lib/                   整形・カラースケール・ID対応・データ読込
src/components/            MapChart / ThemeSelector / Legend / Tooltip
```

## ⚠️ データについて

- 出典は World Bank Open Data です。最新年の値を採用し、欠損時は直近5年まで遡及します。
- 国境・呼称は world-atlas（Natural Earth）に準拠しており、政治的立場を示すものではありません。
- `npm run fetch:sample` で生成されるサンプルは合成値であり、実際の統計ではありません。

## ライセンス

コードは MIT。データは World Bank の利用条件に従います。
