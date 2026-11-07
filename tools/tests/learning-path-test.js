/*
 * learning-path-test.js — 銜接學習路徑的資料完整性
 *
 * 首頁「銜接學習路徑」與每個實驗頁的「前一步／目前／下一步」都讀 curriculum.js 的 learningPaths。
 * 資料沒寫時，首頁整段會被藏起來，章節編號直接從 § 02 跳到 § 04（這一支測試出現之前就是如此）。
 *
 * 檢查：
 *   1. 至少五條路徑，每條三段：國中打底 → 高中建模 → 選修延伸
 *   2. 每個 id 都是課程裡真的有互動模擬的實驗
 *   3. 同一個實驗不出現在兩個位置（實驗頁只會顯示第一個找到的路徑，重複會讓前後步跳錯）
 *   4. 學段合理：國中段不放 advanced 實驗、選修段不放 junior 實驗
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const C = window.PhysicsLabCurriculum;
const R = reporter();

const levelOf = {};
(C.modules || []).forEach(m => (m.experiments || []).forEach(e => { levelOf[e.id] = e.level || ""; }));
const paths = Array.isArray(C.learningPaths) ? C.learningPaths : [];

R.section("路徑結構");
R.ok(paths.length >= 5, "至少五條銜接路徑", "目前 " + paths.length + " 條");
const pathIds = new Set();
const KINDS = ["junior", "senior", "elective"];
paths.forEach(p => {
  R.ok(p.id && !pathIds.has(p.id), "路徑 id 唯一：" + p.id);
  pathIds.add(p.id);
  R.ok(!!(p.title && p.description), p.id + " 有標題與說明");
  const kinds = (p.stages || []).map(s => s.kind);
  R.ok(kinds.join() === KINDS.join(), p.id + " 三段依序為國中打底／高中建模／選修延伸", kinds.join());
  (p.stages || []).forEach(s => {
    R.ok(!!(s.level && s.note && s.note.length >= 12), p.id + "／" + s.level + " 有說明文字");
    R.ok(Array.isArray(s.ids) && s.ids.length >= 1 && s.ids.length <= 6, p.id + "／" + s.level + " 有 1–6 個實驗", (s.ids || []).length + " 個");
  });
});

R.section("實驗 id");
const seen = {};
let missing = [], dup = [], wrongLevel = [];
paths.forEach(p => (p.stages || []).forEach(s => (s.ids || []).forEach(id => {
  if (!(id in levelOf) || !PL.has(id)) missing.push(p.id + ":" + id);
  if (seen[id]) dup.push(id + "（" + seen[id] + "、" + p.id + "）");
  seen[id] = p.id;
  if (s.kind === "junior" && levelOf[id] === "advanced") wrongLevel.push(id + " 是 advanced 卻放在國中段");
  if (s.kind === "elective" && levelOf[id] === "junior") wrongLevel.push(id + " 是 junior 卻放在選修段");
})));
R.ok(!missing.length, "每個 id 都有互動模擬", missing.join("、"));
R.ok(!dup.length, "同一個實驗只出現在一條路徑的一個位置", dup.join("、"));
R.ok(!wrongLevel.length, "學段與課程資料的 level 一致", wrongLevel.join("；"));
R.ok(Object.keys(seen).length >= 50, "路徑涵蓋至少 50 個實驗", Object.keys(seen).length + " 個");

R.section("首頁章節編號");
const html = require("fs").readFileSync(require("path").join(process.cwd(), "index.html"), "utf8");
const secs = [...html.matchAll(/data-sec="(\d+)"/g)].map(m => +m[1]);
R.ok(secs.length >= 4 && secs.every((n, i) => n === i + 1), "首頁章節 § 01 起連續編號", secs.join("、"));
R.ok(/id="learning-ladder"/.test(html), "首頁有銜接學習路徑區塊");

R.done();
