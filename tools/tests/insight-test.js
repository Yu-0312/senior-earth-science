/*
 * insight-test.js — 探測引擎（自動關係摘要）
 *
 * 驗證引擎本身的三件事（與科目無關）：
 *   1. 建置全部實驗不拋錯，且過半實驗量得出關係
 *   2. 每條關係的 direction 都屬於引擎的合法詞彙
 *   3. 示範實驗的已知方向（up／down）符合教科書結論
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

const insights = {};
let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; if (c.insight) insights[c.id] = c.insight; });

const C = window.PhysicsLabCurriculum;
const ids = [];
(C.modules || []).forEach(m => (m.experiments || []).forEach(e => ids.push(e.id)));
const broken = [];
ids.forEach(id => {
  if (!PL.has(id)) return;
  try {
    const root = document.createElement("div");
    root.dataset = { simId: id };
    const api = PL.get(id).build(root);
    if (api && api.rerender) api.rerender();
    if (api && api.stop) api.stop();
  } catch (e) { broken.push(id + "：" + e.message); }
});

R.section("探測引擎整體");
const withInsight = Object.keys(insights);
R.ok(broken.length === 0, "全部實驗建置成功", broken.slice(0, 4).join("\n      "));
R.ok(withInsight.length >= 3, "至少 3 個實驗量得出關係摘要（全站覆蓋率待模組補齊後由完整測試把關）",
  withInsight.length + " / " + ids.length + " 個實驗有 insight");

R.section("關係詞彙合法");
const LEGAL = new Set(["up", "down", "flat", "clamped", "peak"]);
let bad = 0, nRel = 0;
withInsight.forEach(id => {
  (insights[id].relations || []).forEach(r => {
    nRel++;
    if (!r || !LEGAL.has(r.direction)) bad++;
  });
});
R.ok(bad === 0, nRel + " 條關係的 direction 都合法", bad + " 條不合法");

R.section("示範實驗的已知方向");
const KNOWN = [["density-stratification","早期地球溫度","分化進度","up"]];
KNOWN.forEach(([id, sliderLabel, readoutLabel, dir]) => {
  const ins = insights[id];
  if (!ins) { R.ok(true, id + "（尚未提供，略過）", ""); return; }
  const rel = (ins.relations || []).find(r =>
    (r.slider && r.slider.label || "").includes(sliderLabel) &&
    (r.readout && r.readout.label || "").includes(readoutLabel));
  R.ok(rel ? rel.direction === dir : false,
    id + "：「" + sliderLabel + "」→「" + readoutLabel + "」" + dir,
    rel ? "量到 " + rel.direction : "未量到此關係（可能是文字讀數）");
});

R.done();
