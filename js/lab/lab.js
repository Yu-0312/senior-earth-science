/*
 * lab.js — 板塊運動沙盒
 *
 * 這不是「拖板塊」的力學沙盒，而是地科課真正會做的一件事：
 * 選一種板塊邊界、設定相對速率，讓時間以百萬年為單位推進，
 * 看位移怎麼累積、地形怎麼長出來、地震與火山跟著出現在哪裡。
 *
 * 模型刻意保持可解釋：
 *   · 位移 = 速率 × 時間（cm/年 × 百萬年 → km）
 *   · 張裂：洋脊隆起、新生玄武岩、地震淺（<70 km）
 *   · 聚合（海陸）：海溝下沉、隱沒帶地震深可達 300 km、火山弧為安山岩質
 *   · 聚合（陸陸）：地殼增厚造山、高聳山脈、淺到中源地震
 *   · 錯動：水平位移、幾乎只有淺源強震、沒有火山
 * 目的不是取代數值模擬，而是讓學生看見「邊界類型 → 地質現象」的因果對應。
 */
(function () {
  "use strict";

  const $ = sel => document.querySelector(sel);
  const BUILD = (window.PhysicsLabSite && window.PhysicsLabSite.build) || "";
  const SAVE_KEY = "earth-lab-v1";

  /* ------------------------------ 邊界與情境 ------------------------------ */
  const BOUNDARIES = {
    divergent: { name: "張裂邊界", short: "張裂", water: true,
      landform: "中洋脊、裂谷", quake: "淺源（<70 km）、規模較小", volcano: "寧靜噴發、玄武岩", rock: "玄武岩、輝長岩" },
    subduction: { name: "聚合邊界（海洋–大陸）", short: "海陸聚合", water: true,
      landform: "海溝、火山弧", quake: "深可達 300 km、規模大", volcano: "爆發性、安山岩質", rock: "安山岩、花崗閃長岩" },
    collision: { name: "聚合邊界（陸陸碰撞）", short: "陸陸聚合", water: false,
      landform: "高大山脈（地殼增厚）", quake: "淺到中源、規模很大", volcano: "幾乎沒有火山", rock: "變質岩（片岩、片麻岩）" },
    transform: { name: "錯動邊界（轉形斷層）", short: "錯動", water: true,
      landform: "斷層谷、地形被切錯", quake: "極淺、常常很強", volcano: "沒有火山", rock: "既有岩石被破碎、無新生地殼" }
  };

  const SCENARIOS = {
    midatlantic: { name: "中大西洋洋脊", boundary: "divergent", rate: 2.5, note: "每年約 2–3 cm 的慢速張裂，大西洋正在變寬。" },
    eastafrica: { name: "東非裂谷", boundary: "divergent", rate: 0.6, note: "大陸內部的張裂，未來可能裂出新海洋。" },
    andes: { name: "安地斯山（ Nazca 板塊隱沒）", boundary: "subduction", rate: 7.8, note: "快速隱沒造就火山弧與深源地震。" },
    japan: { name: "日本海溝", boundary: "subduction", rate: 8.5, note: "2011 年規模 9.0 地震就發生在這條隱沒帶。" },
    himalaya: { name: "喜馬拉雅（印歐碰撞）", boundary: "collision", rate: 5.0, note: "大陸相撞、地殼增厚，聖母峰還在長高。" },
    sanandreas: { name: "聖安地列斯斷層", boundary: "transform", rate: 5.0, note: "太平洋與北美板塊互相滑過，大地震週期性來臨。" },
    taiwan: { name: "台灣（呂宋島弧撞上大陸）", boundary: "subduction", rate: 8.0, note: "菲律賓海板塊每年約 8 cm 向西北推，造出中央山脈。" },
    hawaii: { name: "夏威夷熱點（板塊內部）", boundary: "divergent", rate: 7.0, note: "嚴格說不是邊界：固定熱點供應岩漿，板塊移動排出島鏈。" }
  };

  /* ------------------------------ 狀態 ------------------------------ */
  const state = { boundary: "divergent", rate: 5.0, time: 300, showAge: false, t: 0 };
  const undoStack = [];
  function pushUndo() {
    undoStack.push(JSON.stringify(state));
    if (undoStack.length > 60) undoStack.pop();
  }
  function popUndo() {
    const s = undoStack.pop();
    if (!s) return false;
    Object.assign(state, JSON.parse(s));
    return true;
  }

  /* 位移（km）＝ 速率 cm/年 × 時間 百萬年 ÷ 10 */
  function shiftKm() { return state.rate * state.time / 10; }
  /* 地震深度上限（km）*/
  function quakeDepth() {
    if (state.boundary === "divergent") return 40;
    if (state.boundary === "subduction") return Math.min(300, 70 + state.time * 0.23);
    if (state.boundary === "collision") return 90;
    return 25;
  }
  /* 地形高度（相對值 −1..1）*/
  function terrain() {
    const t = Math.min(1, shiftKm() / 300);
    if (state.boundary === "divergent") return -0.15 - t * 0.1;          // 洋脊微隆、兩側下沉
    if (state.boundary === "subduction") return 0.25 + t * 0.55;        // 火山弧
    if (state.boundary === "collision") return 0.4 + t * 0.6;           // 最高山
    return 0.05;                                                        // 錯動幾乎不改變地形
  }

  /* ------------------------------ 畫布 ------------------------------ */
  const cv = $("#lab-canvas");
  const ctx = cv.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  function isLight() { return document.documentElement.getAttribute("data-theme") === "light"; }
  function col(name) {
    const light = isLight();
    const map = {
      text: light ? "#1c2530" : "#e6edf3", dim: light ? "#5a6a7a" : "#9fb0c0",
      faint: light ? "#8494a4" : "#62707f", border: light ? "#c9d5e2" : "#26303d",
      accent: light ? "#0f766e" : "#5eead4",
      sky: light ? "#bfe0f5" : "#1d2c4a", sea: light ? "#4aa3d8" : "#173a5e",
      crust: light ? "#8a6f52" : "#5d4c39", mantle: light ? "#c98a5a" : "#7a5232",
      magma: "#ff7043"
    };
    return map[name] || "#888";
  }
  function resize() {
    const r = cv.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    W = r.width; H = r.height;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }
  function rect(x, y, w, h, fill, stroke, r) {
    ctx.beginPath();
    if (r) { ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : ctx.rect(x, y, w, h); }
    else ctx.rect(x, y, w, h);
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1.4; ctx.stroke(); }
  }
  function text(str, x, y, o) {
    o = o || {};
    ctx.fillStyle = o.color || col("dim");
    ctx.font = (o.weight || "") + " " + (o.size || 12) + "px system-ui,'PingFang TC','Microsoft JhengHei',sans-serif";
    ctx.textAlign = o.align || "left";
    ctx.fillText(str, x, y);
  }
  function disc(x, y, r, fill, glow) {
    ctx.save();
    if (glow) { ctx.shadowColor = glow; ctx.shadowBlur = 10; }
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
  }
  function arrow(x1, y1, x2, y2, color, w) {
    ctx.save();
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = w || 2.6;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 9 * Math.cos(a - 0.42), y2 - 9 * Math.sin(a - 0.42));
    ctx.lineTo(x2 - 9 * Math.cos(a + 0.42), y2 - 9 * Math.sin(a + 0.42));
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const b = BOUNDARIES[state.boundary];
    const surfaceY = H * 0.42;
    // 天空／海水
    rect(0, 0, W, surfaceY, b.water ? col("sea") : col("sky"));
    rect(0, surfaceY, W, H - surfaceY, col("mantle"));
    // 地殼（依邊界類型畫剖面）
    const cx = W / 2;
    const t = Math.min(1, shiftKm() / 300);
    ctx.fillStyle = col("crust");
    if (state.boundary === "divergent") {
      // 中洋脊：中央隆起
      ctx.beginPath();
      ctx.moveTo(0, surfaceY + 22);
      ctx.quadraticCurveTo(cx - 60, surfaceY + 26, cx - 10, surfaceY - 4 - t * 6);
      ctx.lineTo(cx + 10, surfaceY - 4 - t * 6);
      ctx.quadraticCurveTo(cx + 60, surfaceY + 26, W, surfaceY + 22);
      ctx.lineTo(W, surfaceY + 46); ctx.lineTo(0, surfaceY + 46);
      ctx.closePath(); ctx.fill();
      // 岩漿柱
      rect(cx - 6, surfaceY + 10, 12, H - surfaceY - 10, col("magma"));
      for (let i = 0; i < 5; i++) {
        const f = ((state.t * 0.5 + i / 5) % 1);
        disc(cx + Math.sin(state.t * 2 + i) * 6, surfaceY + 40 - f * 34, 4 - f * 2, col("magma"), col("magma"));
      }
      arrow(cx - 46, surfaceY + 66, cx - 150 - t * 40, surfaceY + 66, col("accent"));
      arrow(cx + 46, surfaceY + 66, cx + 150 + t * 40, surfaceY + 66, col("accent"));
      text("新生海洋地殼（年齡 0）", cx, surfaceY + 92, { align: "center", size: 11, color: col("accent") });
      if (state.showAge) {
        [0.18, 0.32, 0.46].forEach((f, i) => {
          const yy = surfaceY + 34 + i * 5;
          text("約 " + Math.round(state.time * f) + " 萬年", W * (0.5 - f * 0.42), yy, { align: "center", size: 9.5, color: "rgba(255,255,255,0.75)" });
          text("約 " + Math.round(state.time * f) + " 萬年", W * (0.5 + f * 0.42), yy, { align: "center", size: 9.5, color: "rgba(255,255,255,0.75)" });
        });
      }
    } else if (state.boundary === "subduction") {
      // 左：大陸地殼＋火山弧；右：海洋地殼下插
      ctx.beginPath();
      ctx.moveTo(0, surfaceY + 26);
      ctx.lineTo(W * 0.62, surfaceY + 18);
      ctx.lineTo(W * 0.66, surfaceY + 40);
      ctx.lineTo(W * 0.63, surfaceY + 150);
      ctx.lineTo(0, surfaceY + 150);
      ctx.closePath(); ctx.fill();
      ctx.beginPath();
      ctx.moveTo(W * 0.63, surfaceY + 34);
      ctx.lineTo(W, surfaceY + 26);
      ctx.lineTo(W, surfaceY + 52);
      ctx.lineTo(W * 0.66, surfaceY + 60);
      ctx.lineTo(W * 0.63, surfaceY + 150);
      ctx.closePath();
      ctx.fillStyle = col("crust");
      ctx.globalAlpha = 0.8; ctx.fill(); ctx.globalAlpha = 1;
      // 海溝
      rect(W * 0.62, surfaceY - 2, W * 0.045, 20, "rgba(10,25,40,0.55)");
      text("海溝", W * 0.642, surfaceY - 8, { align: "center", size: 10.5 });
      // 火山弧
      const vh = 26 + t * 26;
      ctx.fillStyle = "#6b5d4f";
      ctx.beginPath();
      ctx.moveTo(W * 0.36 - 30, surfaceY + 24);
      ctx.lineTo(W * 0.36 - 8, surfaceY + 24 - vh);
      ctx.lineTo(W * 0.36 + 8, surfaceY + 24 - vh);
      ctx.lineTo(W * 0.36 + 30, surfaceY + 24);
      ctx.closePath(); ctx.fill();
      if (t > 0.25) {
        for (let i = 0; i < 6; i++) {
          const f = ((state.t * 0.4 + i / 6) % 1);
          disc(W * 0.36 + Math.sin(i * 2 + state.t) * 8 * f, surfaceY + 20 - vh - f * 46, 5 + f * 5, "rgba(150,150,160," + (0.7 - f * 0.4) + ")");
        }
        text("火山弧（安山岩質）", W * 0.36, surfaceY + 34 - vh - 54, { align: "center", size: 10.5 });
      }
      // 隱沒帶地震點
      for (let i = 0; i < 6; i++) {
        const f = i / 5;
        const qx = W * 0.66 + f * W * 0.18;
        const qy = surfaceY + 46 + f * Math.min(120, quakeDepth() / 300 * 130);
        disc(qx, qy, 2.6 + (i % 2), "#ff8a65", "#ff5722");
      }
      text("隱沒帶地震（最深約 " + Math.round(quakeDepth()) + " km）", W * 0.72, surfaceY + 168, { align: "center", size: 10.5 });
      arrow(W * 0.86, surfaceY + 12, W * 0.70, surfaceY + 12, col("accent"));
      text("板塊移動", W * 0.88, surfaceY - 6, { size: 10 });
    } else if (state.boundary === "collision") {
      // 陸陸碰撞：山脈隨時間長高
      const mh = (26 + t * 64);
      ctx.beginPath();
      ctx.moveTo(0, surfaceY + 28);
      ctx.lineTo(W * 0.34, surfaceY + 20);
      ctx.lineTo(W * 0.46, surfaceY + 20 - mh * 0.55);
      ctx.lineTo(W * 0.54, surfaceY + 20 - mh);
      ctx.lineTo(W * 0.62, surfaceY + 20 - mh * 0.5);
      ctx.lineTo(W * 0.74, surfaceY + 22);
      ctx.lineTo(W, surfaceY + 26);
      ctx.lineTo(W, surfaceY + 60); ctx.lineTo(0, surfaceY + 60);
      ctx.closePath(); ctx.fill();
      text("山脈（地殼增厚，約 " + (1.5 + t * 5).toFixed(1) + " km 高）", W * 0.54, surfaceY + 20 - mh - 10, { align: "center", size: 11 });
      arrow(W * 0.12, surfaceY + 40, W * 0.34, surfaceY + 40, col("accent"));
      arrow(W * 0.90, surfaceY + 40, W * 0.72, surfaceY + 40, col("accent"));
      for (let i = 0; i < 5; i++) disc(W * 0.45 + i * 14, surfaceY + 30 + (i % 2) * 8, 2.6, "#ff8a65", "#ff5722");
      text("淺到中源地震", W * 0.52, surfaceY + 72, { align: "center", size: 10.5 });
    } else {
      // transform：水平錯動
      const off = Math.min(26, t * 26);
      ctx.fillStyle = col("crust");
      ctx.fillRect(0, surfaceY + 12, W, 26);
      ctx.save();
      ctx.beginPath(); ctx.rect(0, surfaceY + 12, W, 26); ctx.clip();
      ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.5;
      for (let i = 1; i < 8; i++) {
        const gx = W * i / 8;
        ctx.beginPath();
        ctx.moveTo(gx + (gx > cx ? off : -off) * 0.6, surfaceY + 12);
        ctx.lineTo(gx + (gx > cx ? off : -off), surfaceY + 38);
        ctx.stroke();
      }
      ctx.restore();
      ctx.strokeStyle = "rgba(220,80,60,0.95)"; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx - 60, surfaceY + 25); ctx.lineTo(cx + 60, surfaceY + 25);
      ctx.stroke();
      arrow(cx - 100, surfaceY + 25, cx - 60, surfaceY + 25, col("accent"));
      arrow(cx + 100, surfaceY + 25, cx + 60, surfaceY + 25, col("accent"));
      text("水平錯動 " + shiftKm().toFixed(0) + " km（累積）", cx, surfaceY - 10, { align: "center", size: 11 });
      for (let i = 0; i < 4; i++) disc(cx - 40 + i * 26, surfaceY + 25, 3, "#ff5252", "#ff1744");
      text("淺源強震（無火山）", cx, surfaceY + 66, { align: "center", size: 10.5 });
    }
    // 底部資訊
    text(b.name + "　速率 " + state.rate.toFixed(1) + " cm/年　時間 " + state.time + " 萬年　累積位移 " + shiftKm().toFixed(0) + " km",
      W * 0.5, H - 16, { align: "center", size: 12.5, weight: "700", color: col("text") });
  }

  function loop() {
    state.t += 1 / 60;
    draw();
    requestAnimationFrame(loop);
  }

  /* ------------------------------ 介面 ------------------------------ */
  const tabs = $("#lab-tabs"), tiles = $("#lab-tiles");
  const inspector = $("#lab-inspector");
  const statusEl = $("#lab-status"), toastEl = $("#lab-toast");
  let toastTimer = null;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { toastEl.hidden = true; }, 2800);
  }
  function status(msg) { statusEl.textContent = msg; }

  const CATS = [
    { id: "boundary", label: "邊界" },
    { id: "scene", label: "情境" },
    { id: "action", label: "操作" }
  ];
  let activeCat = "boundary";
  function buildTabs() {
    tabs.innerHTML = "";
    CATS.forEach(c => {
      const b = document.createElement("button");
      b.className = "lab-tab" + (c.id === activeCat ? " is-active" : "");
      b.type = "button"; b.textContent = c.label;
      b.setAttribute("role", "tab");
      b.addEventListener("click", () => { activeCat = c.id; buildTabs(); buildTiles(); });
      tabs.appendChild(b);
    });
  }
  function buildTiles() {
    tiles.innerHTML = "";
    if (activeCat === "boundary") {
      Object.keys(BOUNDARIES).forEach(id => {
        const b = BOUNDARIES[id];
        const btn = document.createElement("button");
        btn.className = "lab-tile" + (state.boundary === id ? " is-active" : "");
        btn.type = "button";
        btn.innerHTML = "<b>" + b.name + "</b><span>" + b.landform + "</span>";
        btn.addEventListener("click", () => {
          pushUndo();
          state.boundary = id;
          status("已切換到" + b.name + "。剖面與地質現象即時更新。");
          toast("地形：" + b.landform + "｜地震：" + b.quake);
          refresh();
        });
        tiles.appendChild(btn);
      });
    } else if (activeCat === "scene") {
      Object.keys(SCENARIOS).forEach(id => {
        const s = SCENARIOS[id];
        const btn = document.createElement("button");
        btn.className = "lab-tile"; btn.type = "button";
        btn.innerHTML = "<b>" + s.name + "</b><span>" + BOUNDARIES[s.boundary].short + " · " + s.rate + " cm/年</span>";
        btn.title = s.note;
        btn.addEventListener("click", () => {
          pushUndo();
          state.boundary = s.boundary; state.rate = s.rate;
          status("已載入情境：" + s.name + "。");
          toast(s.note);
          refresh();
        });
        tiles.appendChild(btn);
      });
    } else {
      const actions = [
        { label: state.showAge ? "隱藏地殼年齡" : "顯示地殼年齡", hint: "張裂邊界專用", on: () => {
            pushUndo(); state.showAge = !state.showAge; refresh();
          } },
        { label: "全部重來", hint: "回到預設（張裂 · 300 萬年）", on: () => {
            pushUndo();
            state.boundary = "divergent"; state.rate = 5; state.time = 300; state.showAge = false;
            status("已重設。");
            refresh();
          } }
      ];
      actions.forEach(a => {
        const b = document.createElement("button");
        b.className = "lab-tile"; b.type = "button";
        b.innerHTML = "<b>" + a.label + "</b><span>" + a.hint + "</span>";
        b.addEventListener("click", a.on);
        tiles.appendChild(b);
      });
    }
  }

  /* 滑桿區（速率與時間） */
  function buildInspector() {
    inspector.innerHTML = "";
    const mk = (label, min, max, step, value, unit, onInput) => {
      const wrap = document.createElement("div");
      wrap.className = "lab-field";
      const head = document.createElement("div");
      head.className = "lab-field-head";
      const lab = document.createElement("span"); lab.textContent = label;
      const val = document.createElement("b"); val.textContent = value + (unit ? " " + unit : "");
      head.appendChild(lab); head.appendChild(val);
      const input = document.createElement("input");
      input.type = "range"; input.min = min; input.max = max; input.step = step; input.value = value;
      input.addEventListener("input", () => {
        const v = Number(input.value);
        val.textContent = v + (unit ? " " + unit : "");
        onInput(v);
        chips();
      });
      wrap.appendChild(head); wrap.appendChild(input);
      inspector.appendChild(wrap);
    };
    mk("板塊相對速率", 0.5, 12, 0.5, state.rate, "cm/年", v => { state.rate = v; });
    mk("模擬時間", 0, 1000, 10, state.time, "萬年", v => { state.time = v; });
    // 地質現象卡
    const b = BOUNDARIES[state.boundary];
    const card = document.createElement("div");
    card.className = "lab-insp";
    card.innerHTML = "<h2>" + b.name + "的地質現象</h2>" +
      "<span>地形：" + b.landform + "</span>" +
      "<span>地震：" + b.quake + "</span>" +
      "<span>火山：" + b.volcano + "</span>" +
      "<span>代表性岩石：" + b.rock + "</span>";
    inspector.appendChild(card);
  }

  /* 讀數晶片 */
  const chipB = $("#lab-boundary"), chipShift = $("#lab-shift"), chipQuake = $("#lab-quake");
  function chips() {
    chipB.textContent = "邊界 " + (BOUNDARIES[state.boundary] || {}).short;
    chipShift.textContent = "位移 " + shiftKm().toFixed(0) + " km";
    chipQuake.textContent = state.boundary === "subduction" ? "深源地震" : state.boundary === "collision" ? "淺中源強震" : state.boundary === "transform" ? "淺源強震" : "淺源小震";
  }

  function refresh() {
    buildTiles();
    buildInspector();
    chips();
    save();
    draw();
  }

  /* 持久化 */
  function save() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { /* 忽略 */ }
  }
  function load() {
    try {
      const o = JSON.parse(localStorage.getItem(SAVE_KEY) || "null");
      if (o && typeof o === "object") {
        if (BOUNDARIES[o.boundary]) state.boundary = o.boundary;
        state.rate = Number(o.rate) || 5; state.time = Number(o.time) || 300;
        state.showAge = !!o.showAge;
      }
    } catch (e) { /* 忽略 */ }
  }

  /* 檔案選單 */
  const fileBtn = $("#lab-file-btn"), filePop = $("#lab-file");
  if (fileBtn && filePop) {
    filePop.querySelectorAll("[data-act]").forEach(b => {
      b.addEventListener("click", () => {
        filePop.hidden = true;
        if (b.dataset.act === "clear") {
          pushUndo();
          state.boundary = "divergent"; state.rate = 5; state.time = 300; state.showAge = false;
          status("已重設。");
          refresh();
        }
      });
    });
    fileBtn.addEventListener("click", () => {
      filePop.hidden = !filePop.hidden;
      fileBtn.setAttribute("aria-expanded", String(!filePop.hidden));
    });
    document.addEventListener("click", e => {
      if (!filePop.hidden && !filePop.contains(e.target) && e.target !== fileBtn) filePop.hidden = true;
    });
  }
  const examplesBtn = $("#lab-examples-btn"), examplesPop = $("#lab-examples");
  if (examplesBtn && examplesPop) {
    examplesBtn.addEventListener("click", () => {
      // 範例直接用情境分頁：點開後跳到「情境」
      activeCat = "scene"; buildTabs(); buildTiles();
      examplesPop.hidden = true;
      toast("請在「情境」分頁挑一個真實案例。");
    });
  }

  $("#lab-undo").addEventListener("click", () => { if (popUndo()) { status("已復原。"); refresh(); } });
  $("#lab-redo").addEventListener("click", () => { toast("這個版本先支援復原。"); });

  $("#lab-theme").addEventListener("click", () => {
    const cur = document.documentElement.getAttribute("data-theme");
    const next = cur === "light" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", next);
    try { localStorage.setItem("pl-theme", JSON.stringify(next)); } catch (e) {}
    draw();
  });

  load();
  buildTabs();
  buildTiles();
  buildInspector();
  chips();
  refresh();
  resize();
  window.addEventListener("resize", resize);
  requestAnimationFrame(loop);
})();
