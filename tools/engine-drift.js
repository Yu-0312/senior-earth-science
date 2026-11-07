#!/usr/bin/env node
/*
 * engine-drift.js — 共用引擎的分岔檢查（開發輔助，不進 run-all）
 *
 * 物理、化學、生物、地科四個站是同一套引擎複製出來的：sim-core、app、sim-*、duo、樣式表、
 * Service Worker 與建置工具都一樣，只有學科內容不同。修好的錯誤常常只修在其中一個 repo：
 * 例如章節檢核洗牌、MathJax 延遲載入、器材層瘦身，都要四邊各改一次；忘了改的那邊就一直帶著舊問題。
 *
 * 這支工具把共用檔案和旁邊的 repo 逐行比對，先把「本來就該不同」的部分抹平
 * （學科名稱、工具包名稱、版本號、快取名稱），剩下的差異才是真的分岔。
 *
 * 用法（在專案根目錄）：
 *   node tools/engine-drift.js ../senior-biology ../senior-earth-science
 *   node tools/engine-drift.js ../senior-science --verbose      # 列出每個分岔的行
 */
"use strict";
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
const verbose = args.includes("--verbose");
const others = args.filter(a => !a.startsWith("--"));
if (!others.length) {
  console.log("用法：node tools/engine-drift.js <另一個 repo 的路徑> [...] [--verbose]");
  process.exit(2);
}

const SHARED = [
  "js/sim-core.js", "js/sim-tools.js", "js/sim-insight.js", "js/sim-a11y.js", "js/sim-observe.js",
  "js/app.js", "duo/duo.js", "duo/duo.css", "css/style.css", "sw.js",
  "tools/build-manifest.js", "tools/build-static.js", "tools/verify-static.js", "tools/stage-fit-check.js",
  "tools/tests/_lib.js", "tools/tests/harness.js", "tools/tests/run-all.js"
];

/* 本來就該不同的東西先抹平：學科字、工具包名、版本號、快取名 */
function normalize(text) {
  return text
    .replace(/\?v=[\w.-]+/g, "?v=BUILD")
    .replace(/(BUILD\s*=\s*)"[^"]*"/g, '$1"BUILD"')
    .replace(/\b(chemistry|biology|earth-science|earth|physics|science)-lab\b/g, "SUBJECT-lab")
    .replace(/senior-(chemistry|biology|earth-science|science)/g, "senior-SUBJECT")
    .replace(/\b(Chem|Bio|Earth|Phys)Lab\b/g, "SubjLab")
    .replace(/\b(chem|bio|earth|phys)-kit\b/g, "subj-kit")
    .replace(/化學|生物|地科|地球科學|物理/g, "學科")
    .split("\n").map(l => l.replace(/\s+$/, ""));
}

/* 以最長共同子序列找出兩邊各自多出來的行（檔案最多幾千行，O(n·m) 夠用） */
function diffLines(a, b) {
  const n = a.length, m = b.length;
  if (n * m > 60e6) return { onlyA: [], onlyB: [], tooBig: true };
  const dp = Array.from({ length: n + 1 }, () => new Uint16Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const onlyA = [], onlyB = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) onlyA.push([i + 1, a[i++]]);
    else onlyB.push([j + 1, b[j++]]);
  }
  while (i < n) onlyA.push([i + 1, a[i++]]);
  while (j < m) onlyB.push([j + 1, b[j++]]);
  return { onlyA, onlyB };
}

const here = path.basename(process.cwd());
let total = 0;
others.forEach(other => {
  const name = path.basename(path.resolve(other));
  console.log("\n=== " + here + " ↔ " + name + " ===");
  SHARED.forEach(rel => {
    const pa = rel, pb = path.join(other, rel);
    if (!fs.existsSync(pa) || !fs.existsSync(pb)) { console.log("  －  " + rel.padEnd(28) + "（其中一邊沒有這個檔案）"); return; }
    const d = diffLines(normalize(fs.readFileSync(pa, "utf8")), normalize(fs.readFileSync(pb, "utf8")));
    if (d.tooBig) { console.log("  ?  " + rel.padEnd(28) + "檔案太大，略過"); return; }
    const n = d.onlyA.length + d.onlyB.length;
    total += n;
    console.log((n ? "  ≠  " : "  =  ") + rel.padEnd(28) + (n ? "本邊多 " + d.onlyA.length + " 行、對邊多 " + d.onlyB.length + " 行" : "一致"));
    if (verbose && n) {
      d.onlyA.slice(0, 8).forEach(([ln, t]) => console.log("       < " + String(ln).padStart(5) + "  " + t.trim().slice(0, 110)));
      d.onlyB.slice(0, 8).forEach(([ln, t]) => console.log("       > " + String(ln).padStart(5) + "  " + t.trim().slice(0, 110)));
    }
  });
});
console.log("\n" + (total ? "共 " + total + " 行分岔：學科內容（課程橋接、章節檢核題）屬正常差異，引擎修正請同步到每個 repo。" : "共用引擎完全一致 ✓"));
