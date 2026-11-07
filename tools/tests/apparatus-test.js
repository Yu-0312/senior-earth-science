/*
 * apparatus-test.js — 器材層瘦身之後的安全網
 *
 * sim-apparatus.js 原本整份從物理版複製過來（225 KB、170 多個器材），
 * 這個 repo 只用到其中幾個，所以 2026-11 改成只保留用得到的器材。
 *
 * 瘦身的風險是「漏」：某個實驗只在特定滑桿值才呼叫 PL.apparatus.xxx，
 * render-test 跑預設值時走不到那一行，上線後學生拉到那個值才白屏。
 * 這裡不靠執行路徑，而是直接掃原始碼：任何地方寫了 PL.apparatus.xxx，
 * xxx 就必須真的匯出成函式。新增實驗時用到新器材，忘了從 senior-science 複製，
 * 這支會直接報出缺哪一個。
 */
require("./harness.js");
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { reporter } = require("./_lib.js");
const R = reporter();
const PL = window.PhysicsLab;

/* 把註解拿掉再掃：說明文字裡提到 PL.apparatus.xxx 不算呼叫 */
const stripComments = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

function listFiles(dir, out) {
  if (!fs.existsSync(dir)) return out;
  fs.readdirSync(dir, { withFileTypes: true }).forEach(d => {
    const p = path.join(dir, d.name);
    if (d.isDirectory()) listFiles(p, out);
    else if (/\.(js|html)$/.test(d.name)) out.push(p);
  });
  return out;
}

R.section("每一個 PL.apparatus.* 呼叫都有對應的匯出");
const sources = listFiles("js", []).concat(listFiles("duo", []), ["lab.html", "index.html"].filter(f => fs.existsSync(f)))
  .filter(f => !/sim-apparatus\.js$/.test(f));
const wanted = new Map();
sources.forEach(f => {
  const code = stripComments(fs.readFileSync(f, "utf8"));
  for (const m of code.matchAll(/(?<![-\w])apparatus\.([A-Za-z_$][\w$]*)/g)) {
    if (!wanted.has(m[1])) wanted.set(m[1], new Set());
    wanted.get(m[1]).add(f);
  }
  R.ok(!/apparatus\s*\[/.test(code), path.basename(f) + " 沒有用 apparatus[變數] 動態取器材",
    "動態取用掃不到，瘦身時會被誤刪");
});
R.ok(wanted.size > 0, "找到 " + wanted.size + " 個被呼叫的器材", [...wanted.keys()].join("、"));
wanted.forEach((files, name) => {
  R.ok(PL.apparatus && typeof PL.apparatus[name] === "function",
    "PL.apparatus." + name + " 有匯出", [...files].map(f => path.basename(f)).join("、"));
});

R.section("匯出的器材都真的有人用（不讓死碼再長回來）");
Object.keys(PL.apparatus || {}).forEach(name => {
  R.ok(wanted.has(name), "PL.apparatus." + name + " 有呼叫端");
});

R.section("進場自動播放名單只列本站的實驗");
{
  const ids = new Set();
  (window.PhysicsLabCurriculum.modules || []).forEach(m => (m.experiments || []).forEach(e => ids.add(e.id)));
  const stray = [...(PL.ambientIds || [])].filter(id => !ids.has(id));
  R.ok(stray.length === 0, "PL.ambientIds 沒有本站不存在的 id", stray.slice(0, 8).join("、"));
}

R.section("體積");
{
  const gz = zlib.gzipSync(fs.readFileSync("js/sim-apparatus.js"), { level: 9 }).length;
  R.ok(gz < 16 * 1024, "sim-apparatus.js gzip " + (gz / 1024).toFixed(1) + " KB（上限 16 KB）",
    "瘦身前是 67 KB；要加器材就加，但只加用得到的");
}

R.done();
