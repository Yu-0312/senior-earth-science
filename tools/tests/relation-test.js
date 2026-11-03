/*
 * relation-test.js — 關係圖的中文描述與刻度
 *
 * 化學版沒有沿用物理版的「雙滑桿模板實驗」（沒有 LABS 設定表），
 * 但引擎仍提供 PL.ui.relationChart 給需要畫關係曲線的實驗。
 * 這裡直接對這個 API 做單元測試，守住兩件事：
 *   1. 描述要用實驗自己的變數名稱，而且講對曲線形狀
 *   2. 刻度要是整齊的正數，全為正的量不可以出現負刻度
 */
require("./harness.js");
const { reporter } = require("./_lib.js");
const PL = window.PhysicsLab;
const R = reporter();
document.documentElement.getAttribute = () => "dark";

/* 記錄所有 fillText，從中挑出純數字的刻度標籤 */
function recordingCanvas(W, H) {
  const texts = [];
  const noop = () => {};
  const ctx = new Proxy({
    measureText: t => ({ width: String(t).length * 6 }),
    getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }),
    createLinearGradient: () => ({ addColorStop: noop }),
    getLineDash: () => [],
    fillText: (t, x, y) => texts.push({ t: String(t), x, y })
  }, { get: (t, k) => (k in t ? t[k] : noop), set: () => true });
  return { W, H, ctx, clear() {}, texts };
}

R.section("relationChart 用實驗自己的變數名寫出關係");
const rising = {
  a: ["鹽酸濃度", 0.01, 1, 0.1, "M"],
  b: ["溫度", 20, 80, 25, "°C"],
  av: 0.1, bv: 25,
  calc: (c, t) => c * Math.exp((t - 20) / 30),
  output: "反應速率"
};
const up = PL.ui.relationChart(recordingCanvas(600, 300), rising);
R.ok(typeof up === "string" && up.length > 12 && up.indexOf("!!") < 0, "有產生描述", up);
R.ok(up.indexOf("反應速率") >= 0 && up.indexOf("鹽酸濃度") >= 0, "描述用實驗自己的變數名");
R.ok(up.indexOf("溫度") >= 0, "描述有說明第二根滑桿的作用");

const falling = {
  a: ["稀釋倍數", 1, 100, 10, ""],
  b: ["原濃度", 0.1, 2, 1, "M"],
  av: 10, bv: 1,
  calc: (d, c) => c / d,
  output: "稀釋後濃度"
};
const down = PL.ui.relationChart(recordingCanvas(600, 300), falling);
R.ok(down.indexOf("反而變小") >= 0 && down.indexOf("減少得越來越慢") >= 0 &&
  down.indexOf("增加得") < 0,
  "下降曲線的形狀說明不會寫成「增加得越來越快」", down);

R.section("relationChart 的刻度與圖說");
const positive = {
  a: ["滴定體積", 0, 50, 20, "mL"],
  b: ["待測濃度", 0.01, 0.5, 0.1, "M"],
  av: 20, bv: 0.1,
  calc: (v, c) => c * 10 + v * 0.1,
  output: "導電度指標"
};
const rc = recordingCanvas(998, 340);
PL.ui.relationChart(rc, positive);
const nums = rc.texts.filter(o => /^-?\d+(\.\d+)?$/.test(o.t));
const yTicks = nums.filter(o => o.x < 52).map(o => Number(o.t)).sort((a, b) => a - b);
R.ok(nums.length >= 6 && nums.every(o => Number(o.t) >= 0), "全為正的量不出現負刻度",
  nums.map(o => o.t).join(" "));
const steps = yTicks.slice(1).map((v, i) => +(v - yTicks[i]).toPrecision(6));
const nice = v => {
  const m = v / Math.pow(10, Math.floor(Math.log10(v)));
  return [1, 2, 2.5, 5, 10].some(k => Math.abs(m - k) < 1e-6);
};
R.ok(yTicks.length >= 3 && steps.every(d => d === steps[0]) && nice(steps[0]),
  "縱軸刻度等距且步距整齊（1／2／2.5／5 × 10ⁿ）", yTicks.join(" "));

R.done();
