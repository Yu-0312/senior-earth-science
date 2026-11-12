/*
 * model-test.js — 科目模型數值檢查
 *
 * 抽查實驗的內建模型是否符合已知結論（數值與方向）。
 * 用 open() 抓建置脈絡，以滑桿寫值、以讀數取值。
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });

function open(id) {
  if (!PL.has(id)) return null;
  LAST = null;
  const root = document.createElement("div");
  root.dataset = { simId: id };
  const api = PL.get(id).build(root);
  window.flushFrames(2);
  const ctx = LAST;
  if (!ctx) throw new Error("沒有取得建置脈絡：" + id);
  const set = (label, v) => {
    const s = (ctx.sliders || []).find(x => x.label === label);
    if (!s) throw new Error(id + " 找不到滑桿：" + label);
    s.write(v);
    if (api.rerender) api.rerender();
  };
  const get = label => {
    const r = (ctx.readouts || []).find(x => x.label === label);
    return r ? r.number : null;
  };
  const text = label => {
    const r = (ctx.readouts || []).find(x => x.label === label);
    return r ? r.value : null;
  };
  return { ctx, api, set, get, text, stop: () => api && api.stop && api.stop() };
}
const close = (a, b, tol) => a != null && b != null && Math.abs(a - b) <= Math.abs(b) * (tol || 0.02) + 1e-9;

R.section("地球形狀：半徑為常數，半徑差 21 km");
{
  const s = open("earth-shape");
  R.ok(!!s, "earth-shape 已提供");
  if (s) {
    s.set("扁率誇大倍數", 1);
    const a1 = s.get("赤道半徑"), d1 = s.get("半徑差");
    s.set("扁率誇大倍數", 100);
    R.ok(close(a1, 6378, 0.001), "赤道半徑 6378 km", "得到 " + a1);
    R.ok(close(s.get("半徑差"), d1, 0.001) && close(d1, 21, 0.001), "半徑差恆為 21 km（誇大只改畫面）",
      "1×: " + d1 + "、100×: " + s.get("半徑差"));
    s.stop();
  }
}

R.section("地史時間軸：聚焦事件對應正確年代");
{
  const s = open("earth-history-timeline");
  R.ok(!!s, "earth-history-timeline 已提供");
  if (s) {
    s.set("聚焦事件", 0);
    const oldest = s.get("距今");
    s.set("聚焦事件", 7);
    const human = s.get("距今");
    R.ok(close(oldest, 46, 0.01), "地球誕生 ≈ 46 億年前（4600 百萬）", "得到 " + oldest);
    R.ok(close(human, 3, 0.01), "智人 ≈ 3 百萬年前（讀數尺度）", "得到 " + human);
    s.stop();
  }
}

/* ---------------------------------------------------------------------------
   2026-11 補強：逐一對照課本公式。下面每一段都曾經算錯過（括號內是當時的錯誤），
   所以寫成測試，防止以後改模型時又悄悄回去。
   --------------------------------------------------------------------------- */
function check(id, fn) {
  const s = open(id);
  R.ok(!!s, id + " 已提供");
  if (!s) return;
  try { fn(s); } finally { s.stop(); }
}

R.section("月相：被照亮的比例 = (1 − cos 相位角)/2（以前用 |sin|，滿月變 0%）");
check("moon-phases", s => {
  s.set("朔望月日數", 0); const n = s.get("可見亮面");
  s.set("朔望月日數", 7.5); const q = s.get("可見亮面");
  s.set("朔望月日數", 14.75); const f = s.get("可見亮面");
  R.ok(n <= 1 && Math.abs(q - 50) <= 3 && f >= 99, "朔 0%、上弦約 50%、望 100%", "朔 " + n + "、上弦 " + q + "、望 " + f);
});

R.section("克卜勒：近日／遠日速率比 = (1+e)/(1−e)、T² = a³（以前用 1 + 2.4e）");
check("kepler-laws", s => {
  s.set("軌道偏心率", 0.3); s.set("半長軸", 4);
  R.ok(close(s.get("近日/遠日速比"), 1.3 / 0.7, 0.01), "e = 0.3 → 1.86", "得到 " + s.get("近日/遠日速比"));
  R.ok(close(s.get("公轉週期"), 8, 0.01), "a = 4 AU → T = 8 年", "得到 " + s.get("公轉週期"));
});

R.section("赫羅圖：太陽的光度是 1 L☉（以前畫在 10^0.6 ≈ 4 L☉）");
check("hr-diagram", s => {
  R.ok(close(s.get("光度"), 1, 0.01) && close(s.get("表面溫度"), 5800, 0.01), "太陽 5800 K、1 L☉", "得到 " + s.get("光度") + " L☉");
});

R.section("太陽軌跡：北緯 25° 夏至正午太陽高度 88.5°（以前畫面寫 64°）");
check("solar-path", s => {
  s.set("時刻", 12);
  R.ok(close(s.get("太陽高度"), 88.5, 0.01), "夏至正午 ≈ 88.5°", "得到 " + s.get("太陽高度"));
});

R.section("望遠鏡：集光力 = (D / 7 mm)²、極限星等 = 6 + 5 log(D / 7 mm)");
check("telescope", s => {
  s.set("口徑", 10);
  const g10 = s.get("集光力"), m10 = s.get("極限星等");
  s.set("口徑", 20);
  R.ok(close(g10, Math.pow(100 / 7, 2), 0.01), "10 cm → 約 204 倍肉眼", "得到 " + g10);
  R.ok(close(m10, 6 + 5 * Math.log10(100 / 7), 0.01), "10 cm → 約 11.8 等（肉眼本身就是 6 等）", "得到 " + m10);
  R.ok(close(s.get("集光力") / g10, 4, 0.01), "口徑加倍 → 集光力 4 倍", "得到 " + (s.get("集光力") / g10).toFixed(2));
});

R.section("季節：滑桿 6 是六月夏至（以前顯示成 7 月）");
check("seasons", s => {
  s.set("日期（月）", 6); const m6 = s.get("月份"), d6 = s.get("直射緯度");
  s.set("日期（月）", 12); const m12 = s.get("月份"), d12 = s.get("直射緯度");
  R.ok(m6 === 6 && close(d6, 23.5, 0.01), "6 → 6 月、直射 +23.5°", "得到 " + m6 + " 月、" + d6);
  R.ok(m12 === 12 && close(d12, -23.5, 0.01), "12 → 12 月、直射 −23.5°", "得到 " + m12 + " 月、" + d12);
});

R.section("海底擴張：年齡 = 距離 ÷ 半速率（以前少算一半）");
check("seafloor-topography", s => {
  s.set("擴張半速率", 5);
  R.ok(close(s.get("離脊 4000 km 地殼年齡"), 80, 0.01), "4000 km ÷ 5 cm/年 = 8000 萬年", "得到 " + s.get("離脊 4000 km 地殼年齡"));
});

R.section("風化：物理風化只碎到砂礫（以前算出 10⁻¹⁷ cm，比原子還小）");
check("weathering", s => {
  s.set("年凍融循環數", 120); s.set("風化時間", 1000);
  const d = s.get("平均粒徑");
  R.ok(d != null && d >= 0.2 - 1e-9, "最細 0.2 cm", "得到 " + d);
});

R.section("全球暖化：相對工業前的量級（以前 2016 年就算出 1.70 °C）");
check("global-warming", s => {
  s.set("年份", 2024); const y24 = s.get("相對工業前（全球）");
  s.set("年份", 2016); const y16 = s.get("相對工業前（全球）");
  s.set("年份", 1880); const y1880 = s.get("相對工業前（全球）");
  R.ok(y24 >= 1.4 && y24 <= 1.65, "2024 ≈ 1.5 °C（WMO：約 1.55 °C）", "得到 " + y24);
  R.ok(y16 >= 1.15 && y16 <= 1.4, "2016 ≈ 1.3 °C", "得到 " + y16);
  R.ok(Math.abs(y1880) <= 0.15, "1880 ≈ 0 °C", "得到 " + y1880);
});

R.section("其他課本數值");
check("parallax", s => {
  s.set("恆星距離", 10);
  R.ok(close(s.get("視差角"), 0.1, 0.01) && close(s.get("光年"), 32.6, 0.01), "10 pc → 0.1″、32.6 光年", s.get("視差角") + "″、" + s.get("光年"));
});
check("seismograph", s => {
  s.set("S–P 時差", 6);
  R.ok(close(s.get("換算震距"), 48, 0.02), "S–P 6 s → 約 48 km", "得到 " + s.get("換算震距"));
});
check("atmosphere-layers", s => {
  s.set("觀測高度", 8);
  R.ok(close(s.get("氣溫"), 15 - 6.5 * 8, 0.02), "對流層 8 km：15 − 6.5×8 = −37 °C", "得到 " + s.get("氣溫"));
});
check("cloud-formation", s => {
  s.set("地表氣溫", 30); s.set("地表露點", 22);
  R.ok(close(s.get("雲底高度"), 1000, 0.02), "雲底 ≈ 125 ×（T − Td）= 1000 m", "得到 " + s.get("雲底高度"));
});
check("seawater-composition", s => {
  R.ok(close(s.get("鹽度"), 35, 0.01) && close(s.get("冰點"), -1.9, 0.03), "鹽度 35‰ → 冰點約 −1.9 °C", s.get("鹽度") + "‰、" + s.get("冰點") + " °C");
});

R.done();
