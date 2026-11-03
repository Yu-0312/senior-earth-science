/*
 * chem-smoke.js — 化學實驗建置煙霧測試
 *
 * 逐一把 chemistry 課程裡的實驗建置起來，確認：
 *   1. 課程登記的每個 id 都有對應的實驗檔
 *   2. build() 不拋錯，微任務（第一格繪製）也不拋錯
 *   3. 實驗註冊的 stop() 可以安全呼叫
 *
 * 用法：node tools/tests/chem-smoke.js
 */
"use strict";
const { window, document } = require("./harness");
const PL = window.PhysicsLab;

const C = window.PhysicsLabCurriculum;
if (!C) {
  console.error("找不到課程資料 window.PhysicsLabCurriculum");
  process.exit(1);
}

const experiments = [];
(C.modules || []).forEach(m => (m.experiments || []).forEach(e => experiments.push({ module: m, exp: e })));

let failed = 0, built = 0, current = "";
const errors = [];

process.on("uncaughtException", e => {
  failed++;
  errors.push((current || "未知實驗") + "：繪製失敗 → " + e.message);
});

async function main() {
  for (const { exp } of experiments) {
    current = exp.id;
    const def = PL.get(exp.id);
    if (!def) {
      failed++;
      errors.push(exp.id + "：課程有登記，但沒有任何實驗檔註冊");
      continue;
    }
    const root = document.createElement("div");
    root.dataset = { simId: exp.id };
    document.body.appendChild(root);
    let api = null;
    try {
      api = def.build(root);
      built++;
    } catch (e) {
      failed++;
      errors.push(exp.id + "：build 失敗 → " + e.message);
      continue;
    }
    // 讓 scaffold 的微任務跑完（第一格繪製）
    await new Promise(r => setTimeout(r, 0));
    try { window.flushFrames(1); } catch (e) {
      failed++;
      errors.push(exp.id + "：flushFrames 失敗 → " + e.message);
    }
    if (api && typeof api.stop === "function") {
      try { api.stop(); } catch (e) {
        failed++;
        errors.push(exp.id + "：stop 失敗 → " + e.message);
      }
    }
  }
  current = "";
  console.log("課程實驗 " + experiments.length + " 個，成功建置 " + built + " 個，失敗 " + failed + " 個");
  errors.forEach(e => console.error("  ✗ " + e));
  process.exit(failed ? 1 : 0);
}

main();
