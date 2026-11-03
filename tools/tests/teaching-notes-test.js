/*
 * teaching-notes-test.js — 逐題教學補充（化學版）
 *
 * 這一支要防的不是「有沒有出現」，而是「出現的是不是空話」。
 * 一句「請注意實驗安全」放在每個實驗上都成立，因此也等於什麼都沒說。
 *
 * 化學版有兩種步驟卡：
 *   1. 手寫的：必須提到這個實驗自己的器材、公式或誤差來源
 *   2. 引擎自動產生的：必須引用該實驗真正的滑桿與讀數名稱，
 *      不能只是泛泛的「拉動滑桿觀察變化」
 */
require("./harness.js");
const { reporter, allIds } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

let LAST = null;
PL._hooks.onBuilt(c => { LAST = c; });
function open(id) {
  LAST = null;
  const root = document.createElement("div");
  root.dataset = { simId: id };
  const api = PL.get(id).build(root);
  return { root, ctx: LAST, api };
}
const textOf = (root, cls) => root.querySelectorAll(cls).map(n => n.textContent).join(" ");

R.section("判定徽章：內容要指向這個實驗自己的化學判斷");
[
  ["balancing", /係數|下標/]
].forEach(([id, re]) => {
  if (!PL.has(id)) return;
  const s = open(id);
  const t = textOf(s.root, ".sim-verdict-text");
  R.ok(t.length > 6 && re.test(t), id.padEnd(24) + "判定具體", t.slice(0, 50));
  if (s.api && s.api.stop) s.api.stop();
});

R.section("手寫步驟：提到自己的關鍵器材、公式或誤差來源");
[
  ["density-lab", /排水|V後|氣泡/],
  ["mixtures", /濾紙|冷凝|蒸餾/],
  ["heating-curve", /水平段|熔點|沸點/],
  ["measurement", /量筒|滴定管|天平/],
  ["mole", /6\.02|莫耳|22\.4/],
  ["molar-mass", /括號|結晶水|下標/],
  ["percent-composition", /總和|四捨五入|漏算/],
  ["atomic-models", /α|散射|湯姆森|模型/]
].forEach(([id, re]) => {
  if (!PL.has(id)) return;
  const s = open(id);
  const steps = s.root.querySelectorAll(".sim-step").length;
  const rule = textOf(s.root, ".sim-rule-text");
  const all = textOf(s.root, ".sim-procedure-card");
  R.ok(steps >= 3, id.padEnd(26) + "至少三個步驟", steps + " 步");
  R.ok(rule.length > 20, id.padEnd(26) + "有鐵律警示", rule.slice(0, 40));
  R.ok(re.test(all), id.padEnd(26) + "提到這個實驗的關鍵點");
  if (s.api && s.api.stop) s.api.stop();
});

R.section("自動教學鷹架：必須引用該實驗自己的滑桿與讀數");
[
  "molarity", "titration", "enthalpy", "faraday", "vsepr", "ksp", "rate-law"
].forEach(id => {
  if (!PL.has(id)) return;
  const s = open(id);
  /*
   * 探測引擎量得出關係的實驗，步驟卡會被「先預測＋關係摘要」取代，
   * 具體指引改寫進任務導讀（refineBrief）。三者都算教學鷹架，
   * 但無論是哪一種，都必須點名這個實驗自己的滑桿與讀數。
   */
  const proc = textOf(s.root, ".sim-procedure-card");
  const all = proc || (
    textOf(s.root, ".sim-learning-brief") + " " +
    textOf(s.root, ".sim-predict") + " " +
    textOf(s.root, ".sim-relations")
  );
  const firstRead = (s.ctx.readouts || [])[0];
  const firstSlider = (s.ctx.sliders || [])[0];
  const okRead = !!firstRead && all.indexOf(firstRead.label) >= 0;
  R.ok(okRead, id.padEnd(20) + "鷹架提到讀數「" + (firstRead ? firstRead.label : "—") + "」");
  if (firstSlider) {
    R.ok(all.indexOf(firstSlider.label) >= 0,
      id.padEnd(20) + "鷹架提到滑桿「" + firstSlider.label + "」");
  }
  if (s.api && s.api.stop) s.api.stop();
});

R.section("化學版不應該出現物理版的殘留字樣");
{
  const bad = [];
  allIds(PL).forEach(id => {
    const s = open(id);
    const all = textOf(s.root, ".sim-procedure-card") + " " + textOf(s.root, ".sim-verdict-text");
    if (/力學能|單擺|電阻|透鏡/.test(all)) bad.push(id);
    if (s.api && s.api.stop) s.api.stop();
  });
  R.ok(bad.length === 0, "步驟與判定沒有物理字樣", bad.slice(0, 8).join("、"));
}

R.section("全站沒有缺口");
{
  const ids = allIds(PL);
  const missing = [];
  ids.forEach(id => {
    const s = open(id);
    /*
     * 每個實驗至少要有一種教學鷹架。
     * 探測引擎自動產生的「關係摘要」與「挑戰任務」也算——
     * 只認手寫的五種元件，會把有自動摘要的實驗誤報成沒有鷹架。
     */
    const has = [".sim-verdict", ".sim-causality", ".sim-procedure-card", ".sim-derived",
                 ".sim-presets", ".sim-relations", ".sim-challenge", ".sim-poe"]
      .some(c => s.root.querySelectorAll(c).length > 0);
    if (!has) missing.push(id);
    if (s.api && s.api.stop) s.api.stop();
  });
  R.ok(missing.length === 0, "共 " + ids.length + " 個實驗都有教學鷹架",
    missing.slice(0, 8).join("、"));
}

R.done();
