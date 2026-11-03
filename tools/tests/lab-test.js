/*
 * lab-test.js — 自由實驗室的結構檢查
 *
 * 本站的自由實驗台是獨立頁面（lab.html + js/lab/lab.js），使用自己的
 * Canvas 與互動邏輯，不透過 sim-core 的假 DOM 測試環境。
 * 這裡驗證兩件一定會壞的事：
 *   1. lab.js 語法正確（new Function 解析）
 *   2. lab.js 以 $("#id") 引用的每個元素，都真的存在於 lab.html
 * 互動邏輯與畫面由瀏覽器人工驗收補上。
 */
"use strict";
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");

let pass = 0, fail = 0;
const ok = (c, n, d) => { c ? pass++ : fail++; console.log((c ? "  ✓ " : "  ✗ ") + n + (d ? "  " + d : "")); };

const html = fs.readFileSync(path.join(ROOT, "lab.html"), "utf8");
const js = fs.readFileSync(path.join(ROOT, "js/lab/lab.js"), "utf8");

ok(html.includes("lab-canvas") && html.includes("js/lab/lab.js"), "lab.html 掛載 canvas 與 lab.js");

try { new Function(js); ok(true, "lab.js 語法正確"); }
catch (e) { ok(false, "lab.js 語法錯誤", e.message); }

const ids = new Set();
const re = /[$#]\(\s*["']#([a-z-]+)["']\s*\)/g;
let m;
while ((m = re.exec(js))) ids.add(m[1]);
const missing = [...ids].filter(id => !html.includes('id="' + id + '"'));
ok(missing.length === 0, "JS 引用的 " + ids.size + " 個 DOM id 都存在於 lab.html",
  missing.length ? "缺：" + missing.join("、") : "");

/* 品牌與殘留檢查 */
ok(!/化學|ChemLab|chem-kit/.test(js), "lab.js 沒有化學殘留");

console.log("通過 " + pass + " 項，失敗 " + fail + " 項");
process.exit(fail ? 1 : 0);
