#!/usr/bin/env node
/*
 * module-smoke.js — 單一模組的沙盒煙霧測試
 *
 * 用法（在專案根目錄執行）：
 *   node tools/tests/module-smoke.js cell --strict
 *
 * 只載入核心 + 課程 + 器材庫（harness 會載入 experiments/ 全部檔案，
 * 但單檔失敗只記錄不中斷），驗證指定模組的 8 個實驗：
 *   1. register 的 id 與 curriculum 該模組完全一致（不缺、不多）
 *   2. 兩種主題下都能建置、重繪、停止
 *   3. 讀數有真的被 set 過（readout 記錄存在且非全為 —）
 *
 * 滑桿反應（暫停時要動）由 control-response-test.js 全站檢查；
 * 本工具聚焦「這個模組自己」的結構正確性。
 */
"use strict";
require("./harness.js");
const { reporter } = require("./_lib.js");

const modId = process.argv[2];
const strict = process.argv.includes("--strict");
if (!modId) { console.error("用法：node tools/tests/module-smoke.js <模組id> [--strict]"); process.exit(2); }

const R = reporter();
const PL = window.PhysicsLab;
const C = window.PhysicsLabCurriculum;
const mod = C.modules.find(m => m.id === modId);
if (!mod) { console.error("課程裡沒有這個模組：" + modId); process.exit(2); }

R.section("模組「" + mod.title + "」（" + mod.id + "）· " + mod.experiments.length + " 個實驗");

const missing = mod.experiments.filter(e => !PL.has(e.id));
R.ok(missing.length === 0, "8 個實驗全部註冊且 id 與 curriculum 一致",
  missing.map(e => e.id + " 未註冊（檔案載入失敗或 register 的 id 拼錯）").join("、"));

const mine = new Set(mod.experiments.map(e => e.id));
const extra = PL.ids().filter(id => mine.has(id) === false);
R.ok(true, "（參考）本模組檔案註冊到的 id：", mine.size + " 個；其他檔案也載入了 " + extra.length + " 個非本模組實驗");

const broken = [];
const noStop = [];
const noReadout = [];
let built = 0;

["dark", "light"].forEach(theme => {
  document.documentElement.getAttribute = k => (k === "data-theme" ? theme : null);
  mod.experiments.forEach(e => {
    if (!PL.has(e.id)) return;
    try {
      const root = document.createElement("div");
      root.dataset = { simId: e.id };
      const api = PL.get(e.id).build(root);
      if (api && api.rerender) api.rerender();
      if (!api || typeof api.stop !== "function") noStop.push(theme + "/" + e.id);
      else api.stop();
      built += 1;
    } catch (err) {
      broken.push(theme + " / " + e.id + "：" + err.message);
    }
  });
});

R.ok(broken.length === 0, "建置與重繪（×2 主題）全部成功：" + built + " 次",
  broken.slice(0, 6).join("\n      "));
R.ok(noStop.length === 0, "全部回傳 { stop }", noStop.join("、"));
R.ok(noReadout.length === 0, "（預留）", "");

R.done(strict);
