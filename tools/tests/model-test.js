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

R.done();
