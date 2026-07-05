// =====================================================================
// テーマ定義（単一の真実の源）
//   - このファイルだけを編集すればテーマを増減できる。
//   - 定量テーマは [指標コード, 表示名, グループ, 単位, スケール, 整形, 配色, 反転?]
//     のタプルで簡潔に管理し、下部で Theme オブジェクトへ展開する。
//   - fetch-data.ts / make-sample-data.ts もこの THEMES を参照して動く。
//   - 配色は d3-scale-chromatic の interpolator 名（"Viridis" → interpolateViridis）。
//   - データが揃わない指標は fetch 時に自動的に除外される（manifest 参照）。
// =====================================================================
import type { Theme, ScaleType, FormatKind, CategoryDef } from "./types";

type QTuple = [
  string, // indicator
  string, // label
  string, // group
  string, // unit
  ScaleType,
  FormatKind,
  string, // color scheme
  boolean?, // invert
];

const QUANT: QTuple[] = [
  // ---- 人口・人口動態 ----
  ["SP.POP.TOTL", "総人口", "人口・人口動態", "人", "log", "people", "Viridis"],
  ["SP.POP.GROW", "人口増加率", "人口・人口動態", "%/年", "linear", "percent", "RdYlGn"],
  ["EN.POP.DNST", "人口密度", "人口・人口動態", "人/km²", "log", "density", "YlOrRd"],
  ["SP.URB.TOTL.IN.ZS", "都市人口率", "人口・人口動態", "%", "linear", "percent", "PuBu"],
  ["SP.RUR.TOTL.ZS", "農村人口率", "人口・人口動態", "%", "linear", "percent", "YlGn"],
  ["SP.POP.0014.TO.ZS", "年少人口率 (0-14歳)", "人口・人口動態", "%", "linear", "percent", "GnBu"],
  ["SP.POP.65UP.TO.ZS", "高齢人口率 (65歳+)", "人口・人口動態", "%", "linear", "percent", "Purples"],
  ["SP.POP.DPND", "従属人口指数", "人口・人口動態", "", "linear", "index", "Oranges"],
  ["SP.DYN.TFRT.IN", "合計特殊出生率", "人口・人口動態", "", "linear", "ratio", "YlOrBr"],
  ["SP.DYN.CBRT.IN", "粗出生率", "人口・人口動態", "/1000人", "linear", "ratio", "BuGn"],
  ["SP.DYN.CDRT.IN", "粗死亡率", "人口・人口動態", "/1000人", "linear", "ratio", "PuRd"],
  ["SM.POP.NETM", "純移民数", "人口・人口動態", "人", "linear", "count", "RdBu"],
  ["SP.DYN.LE00.IN", "平均寿命", "人口・人口動態", "歳", "linear", "years", "YlGnBu"],
  ["SP.DYN.LE00.FE.IN", "平均寿命 (女性)", "人口・人口動態", "歳", "linear", "years", "GnBu"],
  ["SP.DYN.LE00.MA.IN", "平均寿命 (男性)", "人口・人口動態", "歳", "linear", "years", "BuGn"],
  ["SP.POP.TOTL.FE.ZS", "女性人口率", "人口・人口動態", "%", "linear", "percent", "RdPu"],

  // ---- 経済・成長 ----
  ["NY.GDP.MKTP.CD", "GDP (名目)", "経済・成長", "ドル", "log", "usd", "Greens"],
  ["NY.GDP.MKTP.KD.ZG", "GDP成長率", "経済・成長", "%", "linear", "percent", "RdYlGn"],
  ["NY.GDP.PCAP.CD", "一人当たりGDP", "経済・成長", "ドル", "log", "usdPerCapita", "Viridis"],
  ["NY.GDP.PCAP.PP.CD", "一人当たりGDP (PPP)", "経済・成長", "ドル", "log", "usdPerCapita", "Cividis"],
  ["NY.GNP.PCAP.CD", "一人当たりGNI", "経済・成長", "ドル", "log", "usdPerCapita", "YlGnBu"],
  ["NV.AGR.TOTL.ZS", "農業の割合 (対GDP)", "経済・成長", "%", "linear", "percent", "YlGn"],
  ["NV.IND.TOTL.ZS", "工業の割合 (対GDP)", "経済・成長", "%", "linear", "percent", "Oranges"],
  ["NV.SRV.TOTL.ZS", "サービス業の割合 (対GDP)", "経済・成長", "%", "linear", "percent", "Blues"],
  ["NE.GDI.TOTL.ZS", "総固定資本形成 (対GDP)", "経済・成長", "%", "linear", "percent", "BuPu"],
  ["NE.CON.PRVT.ZS", "民間最終消費 (対GDP)", "経済・成長", "%", "linear", "percent", "PuRd"],
  ["FP.CPI.TOTL.ZG", "インフレ率 (消費者物価)", "経済・成長", "%", "linear", "percent", "OrRd"],
  ["NY.GNS.ICTR.ZS", "総貯蓄率 (対GDP)", "経済・成長", "%", "linear", "percent", "GnBu"],
  ["NY.GDP.DEFL.KD.ZG", "インフレ率 (GDPデフレータ)", "経済・成長", "%", "linear", "percent", "Reds"],

  // ---- 所得・貧困・格差 ----
  ["SI.POV.GINI", "ジニ係数", "所得・貧困・格差", "", "linear", "index", "Spectral", true],
  ["SI.POV.DDAY", "極度貧困率 ($2.15/日)", "所得・貧困・格差", "%", "linear", "percent", "Reds"],
  ["SI.POV.LMIC", "貧困率 ($3.65/日)", "所得・貧困・格差", "%", "linear", "percent", "OrRd"],
  ["SI.POV.UMIC", "貧困率 ($6.85/日)", "所得・貧困・格差", "%", "linear", "percent", "YlOrRd"],
  ["SI.DST.10TH.10", "上位10%の所得シェア", "所得・貧困・格差", "%", "linear", "percent", "Purples"],
  ["SI.DST.FRST.20", "下位20%の所得シェア", "所得・貧困・格差", "%", "linear", "percent", "Greens"],

  // ---- 労働・雇用 ----
  ["SL.UEM.TOTL.ZS", "失業率", "労働・雇用", "%", "linear", "percent", "OrRd"],
  ["SL.UEM.1524.ZS", "若年失業率 (15-24歳)", "労働・雇用", "%", "linear", "percent", "Reds"],
  ["SL.TLF.CACT.ZS", "労働参加率", "労働・雇用", "%", "linear", "percent", "Blues"],
  ["SL.TLF.CACT.FE.ZS", "労働参加率 (女性)", "労働・雇用", "%", "linear", "percent", "RdPu"],
  ["SL.EMP.VULN.ZS", "脆弱な雇用の割合", "労働・雇用", "%", "linear", "percent", "YlOrBr"],
  ["SL.AGR.EMPL.ZS", "農業就業者率", "労働・雇用", "%", "linear", "percent", "YlGn"],
  ["SL.IND.EMPL.ZS", "工業就業者率", "労働・雇用", "%", "linear", "percent", "Oranges"],
  ["SL.SRV.EMPL.ZS", "サービス業就業者率", "労働・雇用", "%", "linear", "percent", "Blues"],

  // ---- 健康・保健 ----
  ["SP.DYN.IMRT.IN", "乳児死亡率", "健康・保健", "/1000人", "linear", "ratio", "Reds"],
  ["SH.DYN.MORT", "5歳未満児死亡率", "健康・保健", "/1000人", "linear", "ratio", "OrRd"],
  ["SH.STA.MMRT", "妊産婦死亡率", "健康・保健", "/10万人", "linear", "count", "YlOrRd"],
  ["SH.XPD.CHEX.GD.ZS", "保健支出 (対GDP)", "健康・保健", "%", "linear", "percent", "Greens"],
  ["SH.XPD.CHEX.PC.CD", "一人当たり保健支出", "健康・保健", "ドル", "log", "usdPerCapita", "YlGnBu"],
  ["SH.MED.BEDS.ZS", "病床数", "健康・保健", "/1000人", "linear", "ratio", "Blues"],
  ["SH.MED.PHYS.ZS", "医師数", "健康・保健", "/1000人", "linear", "ratio", "PuBu"],
  ["SH.H2O.BASW.ZS", "基本的飲料水アクセス率", "健康・保健", "%", "linear", "percent", "GnBu"],
  ["SH.STA.BASS.ZS", "基本的衛生設備アクセス率", "健康・保健", "%", "linear", "percent", "BuGn"],
  ["SN.ITK.DEFC.ZS", "栄養不足人口率", "健康・保健", "%", "linear", "percent", "OrRd"],
  ["SP.DYN.CONU.ZS", "避妊普及率", "健康・保健", "%", "linear", "percent", "Purples"],
  ["SH.STA.SUIC.P5", "自殺率", "健康・保健", "/10万人", "linear", "ratio", "Greys"],
  ["SH.PRV.SMOK", "喫煙率 (成人)", "健康・保健", "%", "linear", "percent", "Oranges"],
  ["SH.ALC.PCAP.LI", "一人当たりアルコール消費", "健康・保健", "L", "linear", "ratio", "PuRd"],
  ["SH.IMM.MEAS", "はしか予防接種率", "健康・保健", "%", "linear", "percent", "GnBu"],

  // ---- 教育 ----
  ["SE.XPD.TOTL.GD.ZS", "教育支出 (対GDP)", "教育", "%", "linear", "percent", "Greens"],
  ["SE.ADT.LITR.ZS", "識字率 (成人)", "教育", "%", "linear", "percent", "YlGnBu"],
  ["SE.PRM.ENRR", "初等教育就学率 (総)", "教育", "%", "linear", "percent", "GnBu"],
  ["SE.SEC.ENRR", "中等教育就学率 (総)", "教育", "%", "linear", "percent", "BuGn"],
  ["SE.TER.ENRR", "高等教育就学率 (総)", "教育", "%", "linear", "percent", "PuBu"],
  ["SE.PRM.CMPT.ZS", "初等教育修了率", "教育", "%", "linear", "percent", "Blues"],
  ["SE.COM.DURS", "義務教育年数", "教育", "年", "linear", "yearsInt", "Oranges"],
  ["SE.ADT.1524.LT.ZS", "若年識字率 (15-24歳)", "教育", "%", "linear", "percent", "YlGn"],

  // ---- 環境・気候 ----
  ["EN.GHG.CO2.PC.CE.AR5", "一人当たりCO₂排出量", "環境・気候", "t", "linear", "tonnes", "OrRd"],
  ["EN.ATM.CO2E.PC", "一人当たりCO₂排出量 (旧系列)", "環境・気候", "t", "linear", "tonnes", "Reds"],
  ["AG.LND.FRST.ZS", "森林面積率", "環境・気候", "%", "linear", "percent", "Greens"],
  ["EG.ELC.RNEW.ZS", "再生可能エネルギー発電率", "環境・気候", "%", "linear", "percent", "YlGn"],
  ["EG.FEC.RNEW.ZS", "再エネ最終消費率", "環境・気候", "%", "linear", "percent", "BuGn"],
  ["ER.H2O.FWTL.ZS", "淡水採取率", "環境・気候", "%", "linear", "percent", "Blues"],
  ["AG.LND.AGRI.ZS", "農地面積率", "環境・気候", "%", "linear", "percent", "YlOrBr"],
  ["AG.LND.ARBL.ZS", "耕作地面積率", "環境・気候", "%", "linear", "percent", "YlGn"],
  ["EN.ATM.PM25.MC.M3", "PM2.5大気汚染 (暴露)", "環境・気候", "µg/m³", "linear", "index", "Greys"],

  // ---- エネルギー ----
  ["EG.USE.ELEC.KH.PC", "一人当たり電力消費", "エネルギー", "kWh", "log", "kwh", "YlOrRd"],
  ["EG.ELC.ACCS.ZS", "電力アクセス率", "エネルギー", "%", "linear", "percent", "YlOrBr"],
  ["EG.ELC.FOSL.ZS", "化石燃料発電率", "エネルギー", "%", "linear", "percent", "Greys"],
  ["EG.ELC.NUCL.ZS", "原子力発電率", "エネルギー", "%", "linear", "percent", "Purples"],
  ["EG.ELC.HYRO.ZS", "水力発電率", "エネルギー", "%", "linear", "percent", "Blues"],
  ["EG.USE.PCAP.KG.OE", "一人当たりエネルギー使用", "エネルギー", "kgoe", "log", "count", "Oranges"],
  ["EG.IMP.CONS.ZS", "エネルギー純輸入率", "エネルギー", "%", "linear", "percent", "PuOr"],

  // ---- インフラ・技術 ----
  ["IT.NET.USER.ZS", "インターネット利用率", "インフラ・技術", "%", "linear", "percent", "PuBu"],
  ["IT.CEL.SETS.P2", "携帯電話契約数", "インフラ・技術", "/100人", "linear", "ratio", "BuPu"],
  ["IT.NET.BBND.P2", "固定ブロードバンド契約数", "インフラ・技術", "/100人", "linear", "ratio", "GnBu"],
  ["GB.XPD.RSDV.GD.ZS", "研究開発費 (対GDP)", "インフラ・技術", "%", "linear", "percent", "Viridis"],
  ["TX.VAL.TECH.MF.ZS", "ハイテク輸出率 (対製造品)", "インフラ・技術", "%", "linear", "percent", "Cividis"],
  ["SP.POP.SCIE.RD.P6", "研究者数", "インフラ・技術", "/100万人", "linear", "count", "Blues"],

  // ---- 貿易・金融 ----
  ["NE.TRD.GNFS.ZS", "貿易額 (対GDP)", "貿易・金融", "%", "linear", "percent", "BuGn"],
  ["NE.EXP.GNFS.ZS", "輸出額 (対GDP)", "貿易・金融", "%", "linear", "percent", "Greens"],
  ["BX.KLT.DINV.WD.GD.ZS", "対内直接投資 (対GDP)", "貿易・金融", "%", "linear", "percent", "PuBuGn"],
  ["BX.TRF.PWKR.DT.GD.ZS", "個人送金受取 (対GDP)", "貿易・金融", "%", "linear", "percent", "YlGn"],
  ["GC.DOD.TOTL.GD.ZS", "政府債務 (対GDP)", "貿易・金融", "%", "linear", "percent", "OrRd"],
  ["NY.GDP.TOTL.RT.ZS", "天然資源レント (対GDP)", "貿易・金融", "%", "linear", "percent", "YlOrBr"],
  ["CM.MKT.LCAP.GD.ZS", "株式時価総額 (対GDP)", "貿易・金融", "%", "linear", "percent", "BuPu"],

  // ---- 政府・社会 ----
  ["MS.MIL.XPND.GD.ZS", "軍事費 (対GDP)", "政府・社会", "%", "linear", "percent", "Reds"],
  ["GC.TAX.TOTL.GD.ZS", "税収 (対GDP)", "政府・社会", "%", "linear", "percent", "Greens"],
  ["SG.GEN.PARL.ZS", "女性国会議員比率", "政府・社会", "%", "linear", "percent", "RdPu"],
  ["VC.IHR.PSRC.P5", "殺人発生率", "政府・社会", "/10万人", "linear", "ratio", "Reds"],
];

// ---- カテゴリ型テーマ（有無で塗り分け・静的JSONで管理） ----
const MEMBERSHIP: CategoryDef[] = [
  { value: true, label: "加盟", color: "#2166ac" },
  { value: false, label: "非加盟", color: "#e8ebef" },
];

const CATEGORICAL: Theme[] = [
  {
    id: "cat_g20",
    label: "G20 加盟国",
    group: "国際的枠組み",
    type: "categorical",
    source: "static",
    dataFile: "data/cat_g20.json",
    scheme: "",
    fmt: "index",
    categories: MEMBERSHIP,
    description: "主要20カ国・地域（G20）の加盟国。EU・AUは国ではないため対象外。",
  },
  {
    id: "cat_oecd",
    label: "OECD 加盟国",
    group: "国際的枠組み",
    type: "categorical",
    source: "static",
    dataFile: "data/cat_oecd.json",
    scheme: "",
    fmt: "index",
    categories: MEMBERSHIP,
    description: "経済協力開発機構（OECD）の加盟国。",
  },
];

export const THEMES: Theme[] = [
  ...QUANT.map(
    ([indicator, label, group, unit, scale, fmt, scheme, invert]): Theme => ({
      id: indicator,
      label,
      group,
      type: "quantitative",
      source: "worldbank",
      indicator,
      dataFile: `data/${indicator}.json`,
      unit,
      scale,
      scheme,
      fmt,
      invert: invert ?? false,
    }),
  ),
  ...CATEGORICAL,
];

// UI のグループ表示順
export const GROUP_ORDER: string[] = [
  "人口・人口動態",
  "経済・成長",
  "所得・貧困・格差",
  "労働・雇用",
  "健康・保健",
  "教育",
  "環境・気候",
  "エネルギー",
  "インフラ・技術",
  "貿易・金融",
  "政府・社会",
  "国際的枠組み",
];

// カテゴリ型テーマのメンバーシップ（データ生成スクリプトが参照）
export const MEMBERS: Record<string, string[]> = {
  cat_g20: [
    "ARG", "AUS", "BRA", "CAN", "CHN", "FRA", "DEU", "IND", "IDN", "ITA",
    "JPN", "KOR", "MEX", "RUS", "SAU", "ZAF", "TUR", "GBR", "USA",
  ],
  cat_oecd: [
    "AUS", "AUT", "BEL", "CAN", "CHL", "COL", "CRI", "CZE", "DNK", "EST",
    "FIN", "FRA", "DEU", "GRC", "HUN", "ISL", "IRL", "ISR", "ITA", "JPN",
    "KOR", "LVA", "LTU", "LUX", "MEX", "NLD", "NZL", "NOR", "POL", "PRT",
    "SVK", "SVN", "ESP", "SWE", "CHE", "TUR", "GBR", "USA",
  ],
};
