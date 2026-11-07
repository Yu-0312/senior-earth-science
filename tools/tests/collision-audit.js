/*
 * collision-audit.js — 版面碰撞稽核(開發輔助,不進 run-all)
 *
 * 用 ctx 替身記錄每個實驗的繪圖呼叫:
 *   · CK.panel 註冊面板矩形
 *   · D.text 記錄文字範圍(measureText 寬度)
 * 旗標三類:
 *   1. 文字超出畫布邊界(左右出界、y 超過畫布高)
 *   2. 文字畫在某面板之後,中心落在面板外(溢出資料卡)
 *   3. 兩段文字框互相重疊 > 55%(擠壓)
 * 用法:node tools/tests/collision-audit.js [可選:模組id 過濾]
 */
require("./harness.js");
const PL = window.PhysicsLab;
const C = window.PhysicsLabCurriculum;

const panels = [];   // {x,y,w,h}
const texts = [];    // {x,y,w,h,str}
let recording = false;

function wrapKit(K, name) {
  if (!K) return;
  const origPanel = K.panel;
  K.panel = function (ctx, x, y, w, h, title) {
    if (recording) panels.push({ x, y, w, h });
    return origPanel.call(this, ctx, x, y, w, h, title);
  };
}
wrapKit(window.BioLab, "BioLab");
wrapKit(window.EarthLab, "EarthLab");

const origText = PL.draw.text;
PL.draw.text = function (ctx, str, x, y, o) {
  o = o || {};
  if (recording) {
    const size = o.size || 13;
    const w = String(str == null ? "" : str).length * size * 0.62;
    const align = o.align || "left";
    const x0 = align === "center" ? x - w / 2 : align === "right" ? x - w : x;
    texts.push({ str: String(str), x0, y0: y - size, x1: x0 + w, y1: y + size * 0.35, x, y, align });
  }
  return origText.apply(this, arguments);
};

function overlaps(a, b) {
  const ix = Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0));
  const iy = Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));
  const inter = ix * iy;
  const amin = Math.min((a.x1 - a.x0) * (a.y1 - a.y0), (b.x1 - b.x0) * (b.y1 - b.y0));
  return amin > 0 && inter / amin > 0.55;
}

const ids = [];
const modFilter = process.argv[2];
C.modules.forEach(m => m.experiments.forEach(e => { if (!modFilter || m.id === modFilter) ids.push([m.id, e.id]); }));

let flagCount = 0;
ids.forEach(([modId, id]) => {
  if (!PL.has(id)) return;
  panels.length = 0; texts.length = 0;
  let cv = null;
  try {
    const root = document.createElement("div");
    root.dataset = { simId: id };
    const api = PL.get(id).build(root);
    cv = root.querySelector("canvas") || { width: 1104, height: 640 };
    if (api.rerender) api.rerender();
    if (api.stop) api.stop();
  } catch (e) { console.log("  ✗ " + id + " 建置失敗:" + e.message); flagCount++; return; }
  const W = cv.width, H = cv.height;
  const flags = [];
  // 1) 出界
  texts.forEach(t => {
    if (t.x0 < -2 || t.x1 > W + 2) flags.push("出界↔「" + t.str.slice(0, 14) + "」");
    else if (t.y1 > H + 2) flags.push("出界↕「" + t.str.slice(0, 14) + "」");
  });
  // 2) 文字溢出面板(文字中心在面板外,但明顯屬於該面板的縱向範圍)
  texts.forEach(t => {
    const cxm = (t.x0 + t.x1) / 2, cym = (t.y0 + t.y1) / 2;
    panels.forEach(p => {
      const inY = cym > p.y && cym < p.y + p.h;
      const nearX = t.x0 < p.x + p.w + 30 && t.x1 > p.x - 30;
      if (inY && nearX && (t.x1 > p.x + p.w + 6 || t.x0 < p.x - 6)) {
        // 只報「中心不在面板內但橫跨面板邊」的長文字
        if (cxm < p.x || cxm > p.x + p.w) flags.push("溢出面板「" + t.str.slice(0, 14) + "」");
      }
    });
  });
  // 3) 文字互相擠壓
  for (let i = 0; i < texts.length && flags.length < 4; i++) {
    for (let j = i + 1; j < texts.length && flags.length < 4; j++) {
      if (overlaps(texts[i], texts[j])) flags.push("擠壓「" + texts[i].str.slice(0, 10) + "」×「" + texts[j].str.slice(0, 10) + "」");
    }
  }
  if (flags.length) {
    flagCount++;
    console.log("  ✗ " + id + "  " + [...new Set(flags)].slice(0, 3).join(" / "));
  }
});
console.log(flagCount === 0 ? "全部乾淨 ✓" : "共 " + flagCount + " 個實驗有版面旗標");
