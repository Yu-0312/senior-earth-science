/*
 * earth-kit.js — 地球科學實驗室共用繪圖與場景工具
 *
 * 與化學版的 chem-kit.js 同一個介面：scaffold、bench、panel、badge、plot、
 * meter、counter、particleBox……全部同名同參數，因此實驗台的版面、控制項、
 * 讀數與圖表的行為和化學版完全一致。差別只在場景層：
 * 地球剖面、板塊邊界、岩層、火山、地震波、天氣站模型、洋域剖面與天球。
 *
 * 這個檔案只放「畫得出來」與「版面接得起來」的共用零件，
 * 每個實驗自己的地科模型仍寫在 js/experiments/*.js，不藏在這裡。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab;
  if (!PL) return;
  const D = PL.draw, TAU = PL.TAU;
  const clamp = PL.clamp, lerp = PL.lerp;

  /* ------------------------------ 色彩 ------------------------------ */
  const ELEMENT_COLORS = {
    Fe: "#c97b4a", Ni: "#a9b6c4", Si: "#c9a06a", O: "#e25555", Mg: "#7fbf6a",
    Ca: "#ffb36b", Na: "#b07cf0", K: "#c471ed", Al: "#a8b6c6", C: "#3b4654",
    S: "#f2c94c", U: "#8bc34a", Pb: "#7b8794", H: "#e8eef7", He: "#d1d9e6"
  };
  function elementColor(el) { return ELEMENT_COLORS[el] || "#9aa8b8"; }
  // 岩層配色（由新到舊的沉積岩常見色階）
  const ROCK_COLORS = {
    sandstone: "#d9b36c", shale: "#8b95a3", limestone: "#cfd4d8",
    conglomerate: "#b78d5e", basalt: "#4e5c74", granite: "#c9a9a0",
    slate: "#5d6672", schist: "#7a8a96", marble: "#e3e7ea", gneiss: "#a89a8c"
  };
  function rockColor(name) { return ROCK_COLORS[name] || "#9aa8b8"; }
  // 溫度色階（氣溫、海溫共用）：藍 → 青綠 → 黃 → 紅
  function tempColor(frac) {
    const stops = ["#1e5fa8", "#2e9bb5", "#66bb6a", "#e8d44d", "#ef8829", "#c0392b"];
    return stops[clamp(Math.round(clamp(frac, 0, 1) * (stops.length - 1)), 0, stops.length - 1)];
  }
  function phColor(ph) {
    const stops = [
      [0, "#d32f2f"], [2, "#f4511e"], [4, "#fb8c00"], [6, "#fdd835"],
      [7, "#66bb6a"], [8, "#26a69a"], [10, "#1e88e5"], [12, "#5e35b1"], [14, "#311b92"]
    ];
    const v = clamp(ph, 0, 14);
    for (let i = 0; i < stops.length - 1; i++) {
      const a = stops[i], b = stops[i + 1];
      if (v <= b[0]) {
        const f = (v - a[0]) / (b[0] - a[0] || 1);
        const ca = hex(a[1]), cb = hex(b[1]);
        return "rgb(" + ca.map((c, k) => Math.round(lerp(c, cb[k], f))).join(",") + ")";
      }
    }
    return stops[stops.length - 1][1];
  }
  function hex(h) {
    const s = String(h).replace("#", "");
    return [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16));
  }
  function mix(a, b, f) {
    const ca = hex(a), cb = hex(b);
    return "rgb(" + ca.map((c, i) => Math.round(lerp(c, cb[i], f))).join(",") + ")";
  }
  function tintAlpha(c, a) {
    const rgb = hex(c);
    return "rgba(" + rgb.join(",") + "," + a + ")";
  }

  /* ------------------------------ 骨架 ------------------------------ */
  function scaffold(root, o) {
    o = o || {};
    if (root.dataset) root.dataset.labScaffold = "1";
    const L = PL.ui.layout(root, {
      chrome: o.chrome || "quiet",
      brief: o.brief,
      procedure: o.procedure,
      instrument: o.instrument
    });
    const cv = PL.canvas.create(L.canvasWrap, o.aspect || 0.64);
    const state = { t: 0, running: false, ready: false };
    const paint = (dt, t) => {
      if (!state.ready) return;
      state.running = true;
      o.draw(dt || 0, t == null ? state.t : t);
      state.running = false;
    };
    let anim = null;
    if (o.animate) {
      anim = PL.loop((dt, t) => { state.t = t; paint(dt, t); }, { ambient: o.ambient !== false, fps: o.fps });
      anim.start();
    }
    const redraw = () => { if (!anim || !anim.running) paint(0, state.t); };
    root.addEventListener("input", redraw);
    root.addEventListener("change", redraw);
    const rerender = () => { state.ready = true; paint(0, state.t); };
    const bc = PL._hooks && typeof PL._hooks.current === "function" ? PL._hooks.current() : null;
    if (bc) bc.rerender = rerender;
    cv.onResize(() => paint(0, state.t));
    const firstPaint = () => { state.ready = true; paint(0, state.t); };
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(firstPaint);
    else if (typeof queueMicrotask === "function") queueMicrotask(firstPaint);
    else Promise.resolve().then(firstPaint);
    return {
      L, cv, anim, state, redraw,
      charts: PL.ui.charts(root),
      chart(title, cap, aspect) {
        const c = PL.ui.chart(PL.ui.charts(root), { title, cap, aspect: aspect || 0.52 });
        return c;
      },
      rerender,
      stop() { if (anim) anim.stop(); cv.destroy(); }
    };
  }

  /* ------------------------------ 場景 ------------------------------ */
  function bench(cv) {
    const ctx = cv.ctx, W = cv.H ? cv.W : 0, H = cv.H;
    D.bg(cv);
    PL.apparatus.benchTop ? PL.apparatus.benchTop(ctx, cv.W, H, H - 26) : null;
    return { ctx, W: cv.W, H, floor: H - 26 };
  }

  /*
   * 地科場景：由 o.kind 決定背景 — "sky"（天空＋地平線）|"underground"（地下剖面）
   * |"ocean"（海洋剖面）。回傳地平線／地表的 y 座標。
   */
  function scene(cv, o) {
    o = o || {};
    const ctx = cv.ctx, W = cv.W, H = cv.H;
    D.bg(cv);
    const kind = o.kind || "sky";
    if (kind === "sky") {
      const horizon = H * (o.horizon == null ? 0.72 : o.horizon);
      const g = ctx.createLinearGradient(0, 0, 0, horizon);
      const day = o.night ? ["#0d1b3a", "#24345e"] : ["#7cb7e8", "#bfe0f5"];
      g.addColorStop(0, PL.theme.isLight() ? day[0] : "#16233f");
      g.addColorStop(1, PL.theme.isLight() ? day[1] : "#1d2c4a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, horizon);
      /*
       * 天空是用漸層直接 fillRect 畫的，墨色層不知道這塊是暗的：
       * 淺色主題的夜空（深藍）上，文字仍被當成「淺底」而選深色墨，幾乎看不見。
       * 把上下兩半各自的底色登記進墨色層，疊在天空上的標註才會自動選對墨色。
       */
      if (PL.theme && PL.theme.note) {
        PL.theme.note(ctx, PL.theme.isLight() ? day[0] : "#16233f", 0, 0, W, horizon / 2);
        PL.theme.note(ctx, PL.theme.isLight() ? day[1] : "#1d2c4a", 0, horizon / 2, W, horizon / 2);
      }
      // 地表
      D.rect(ctx, 0, horizon, W, H - horizon, { fill: o.ground || (PL.theme.isLight() ? "#8fae6f" : "#3d4a35") });
      if (o.night && PL.apparatus.starfield) PL.apparatus.starfield(ctx, W, horizon, o.seed || 4);
      return { horizon };
    }
    if (kind === "underground") {
      const surface = H * (o.horizon == null ? 0.16 : o.horizon);
      const g = ctx.createLinearGradient(0, surface, 0, H);
      g.addColorStop(0, PL.theme.isLight() ? "#a5906f" : "#4a4234");
      g.addColorStop(1, PL.theme.isLight() ? "#6f5d43" : "#332c22");
      ctx.fillStyle = g;
      ctx.fillRect(0, surface, W, H - surface);
      // 地表線與小草
      D.line(ctx, 0, surface, W, surface, PL.theme.isLight() ? "#6b7a4f" : "#7a8a5f", 3);
      D.rect(ctx, 0, surface - 6, W, 6, { fill: o.skyTint || (PL.theme.isLight() ? "#bfe0f5" : "#1d2c4a") });
      return { surface };
    }
    // ocean
    const surface = H * (o.horizon == null ? 0.14 : o.horizon);
    const g = ctx.createLinearGradient(0, surface, 0, H);
    g.addColorStop(0, PL.theme.isLight() ? "#4aa3d8" : "#1b4d70");
    g.addColorStop(1, PL.theme.isLight() ? "#173a5e" : "#0c2238");
    ctx.fillStyle = g;
    ctx.fillRect(0, surface, W, H - surface);
    D.rect(ctx, 0, 0, W, surface, { fill: PL.theme.isLight() ? "#bfe0f5" : "#1d2c4a" });
    D.line(ctx, 0, surface, W, surface, "rgba(255,255,255,0.5)", 1.5);
    return { surface };
  }

  /* ------------------------------ 地球與剖面 ------------------------------ */
  /*
   * 地球（球面投影）：經緯線、簡化大陸、自轉。
   * o.spin（0–1）轉動大陸；o.tilt 地軸傾角（度）；o.showAxis 畫地軸。
   */
  function globe(ctx, cx, cy, R, o) {
    o = o || {};
    const spin = (o.spin || 0) * TAU;
    const tilt = (o.tilt || 0) * Math.PI / 180;
    // 海洋底
    const g = ctx.createRadialGradient(cx - R * 0.3, cy - R * 0.3, R * 0.2, cx, cy, R);
    g.addColorStop(0, PL.theme.isLight() ? "#5da8dd" : "#3a7fb8");
    g.addColorStop(1, PL.theme.isLight() ? "#2e6da8" : "#1d4f7e");
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    // 大陸（簡化塊狀，用極座標帶狀分布）
    const rnd = rng(o.seed || 6);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
    for (let i = 0; i < 7; i++) {
      const lon = rnd() * TAU + spin, lat = (rnd() - 0.5) * 2.2;
      const size = R * (0.25 + rnd() * 0.3);
      const x = cx + Math.cos(lon) * R * Math.cos(lat / 2.2);
      const y = cy + Math.sin(lat / 2.2) * R * 0.92;
      ctx.fillStyle = PL.theme.isLight() ? "rgba(110,160,90,0.95)" : "rgba(95,140,80,0.95)";
      ctx.beginPath();
      ctx.ellipse(x, y, size * 0.7, size * 0.4, lon * 0.3, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // 經緯線
    ctx.save();
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 0.8;
    for (let i = 1; i < 6; i++) {
      const y = cy - R + R * 2 * i / 6;
      const half = Math.sqrt(Math.max(0, R * R - (y - cy) * (y - cy)));
      ctx.beginPath(); ctx.ellipse(cx, y, half, half * 0.16, 0, 0, TAU); ctx.stroke();
    }
    for (let i = 1; i < 6; i++) {
      const lon = i / 6 * Math.PI;
      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.abs(Math.sin(lon)) * R, R, 0, 0, TAU);
      ctx.stroke();
    }
    ctx.restore();
    // 球緣與地軸
    D.ring(ctx, cx, cy, R, "rgba(255,255,255,0.55)", 1.6);
    if (o.showAxis) {
      const ax = Math.sin(tilt) * R * 1.22, ay = -Math.cos(tilt) * R * 1.22;
      D.line(ctx, cx - ax, cy + ay, cx + ax, cy - ay, "rgba(255,255,255,0.75)", 2, [6, 4]);
      D.text(ctx, "N", cx - ax, cy + ay - 6, { color: PL.col("text-dim"), size: 11, align: "center" });
      D.text(ctx, "S", cx + ax, cy - ay + 14, { color: PL.col("text-dim"), size: 11, align: "center" });
    }
    if (o.label) D.text(ctx, o.label, cx, cy + R + 18, { color: PL.col("text-dim"), size: 11, align: "center" });
    return { R, cx, cy };
  }

  /*
   * 地球內部剖面：layers 由外到內 = [{name, thick, color, wavy}]，
   * 以半圓或矩形呈現。mode = "half"（半圓剖面）|"full"（全圓）|"bar"（橫條）。
   */
  function earthCut(ctx, box, layers, o) {
    o = o || {};
    const mode = o.mode || "half";
    const cx = box.x + box.w / 2;
    const cy = mode === "bar" ? box.y + box.h / 2 : box.y + box.h;
    const R = Math.min(box.w / 2, box.h);
    const total = layers.reduce((s, l) => s + l.thick, 0);
    let r0 = mode === "bar" ? box.h / 2 : R;
    const out = [];
    layers.forEach((l, i) => {
      const r1 = r0 - (mode === "bar" ? l.thick / total * box.w : l.thick / total * R);
      ctx.save();
      if (mode === "bar") {
        const x0 = box.x + (1 - r0 * 2 / box.h) * 0;
        D.rect(ctx, box.x + (total - layers.slice(0, i).reduce((s, q) => s + q.thick, 0)) / total * box.w - 0,
          box.y, l.thick / total * box.w, box.h, { fill: l.color, stroke: "rgba(0,0,0,0.25)", width: 1 });
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, r0, Math.PI, 0, false);
        ctx.arc(cx, cy, Math.max(0, r1), 0, Math.PI, true);
        ctx.closePath();
        ctx.fillStyle = l.color; ctx.fill();
        ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.2; ctx.stroke();
      }
      ctx.restore();
      if (l.label && mode !== "bar") {
        const midR = (r0 + r1) / 2;
        D.text(ctx, l.label, cx + midR * 0.72, cy - midR * 0.72, { color: "#fff", size: 11, align: "left", weight: "700" });
      } else if (l.label) {
        D.text(ctx, l.label, box.x + (total - layers.slice(0, i).reduce((s, q) => s + q.thick, 0) + l.thick / 2) / total * box.w, cy + 4, { color: "#fff", size: 10, align: "center", weight: "700" });
      }
      out.push({ r0, r1 });
      r0 = r1;
    });
    return { cx, cy, out };
  }

  /*
   * 板塊邊界示意。
   * type: "divergent"（張裂）|"convergent-ocean"（海溝隱沒）|
   *       "convergent-cont"（陸陸碰撞）|"transform"（錯動）。
   * o.magma 顯示岩漿上升；o.offset 錯動錯位量。
   */
  function plateBoundary(ctx, box, type, o) {
    o = o || {};
    const midY = box.y + box.h * 0.52;
    const water = type !== "convergent-cont";
    if (water) {
      D.rect(ctx, box.x, box.y, box.w, midY - box.y, { fill: PL.theme.isLight() ? "rgba(90,170,220,0.35)" : "rgba(40,90,130,0.4)" });
      D.text(ctx, "海水", box.x + 10, box.y + 16, { color: PL.col("text-dim"), size: 10 });
    }
    const crust = PL.theme.isLight() ? "#8a6f52" : "#5d4c39";
    const mantle = PL.theme.isLight() ? "#c98a5a" : "#7a5232";
    D.rect(ctx, box.x, midY, box.w, box.y + box.h - midY, { fill: mantle });
    if (type === "divergent") {
      // 中洋脊：兩側板塊分開，中央岩漿上升
      const cx = box.x + box.w / 2;
      ctx.save();
      ctx.fillStyle = crust;
      ctx.beginPath();
      ctx.moveTo(box.x, midY); ctx.lineTo(cx - 8, midY - 14); ctx.lineTo(cx, midY + 6);
      ctx.lineTo(cx + 8, midY - 14); ctx.lineTo(box.x + box.w, midY); ctx.lineTo(box.x + box.w, midY + 26);
      ctx.lineTo(box.x, midY + 26); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 岩漿柱
      const t = o.time || 0;
      for (let i = 0; i < 5; i++) {
        const yy = midY + 60 - ((t * 30 + i * 24) % 60);
        D.disc(ctx, cx + Math.sin(t * 3 + i) * 5, yy, 4, { fill: "#ff7043", glow: "#ff5722", glowSize: 8 });
      }
      D.line(ctx, cx, midY + 30, cx, box.y + box.h - 6, "#ff7043", 6);
      D.arrow(ctx, cx - 30, midY + 18, box.x + box.w * 0.12, midY + 18, { color: PL.col("accent"), width: 2.6 });
      D.arrow(ctx, cx + 30, midY + 18, box.x + box.w * 0.88, midY + 18, { color: PL.col("accent"), width: 2.6 });
      D.text(ctx, "中洋脊：新海洋地殼在此生成", cx, box.y + 16, { color: PL.col("text-dim"), size: 11, align: "center" });
    } else if (type === "convergent-ocean" || type === "convergent-cont") {
      // 隱沒帶：右側板塊下插
      const subX = box.x + box.w * 0.62;
      ctx.save();
      ctx.fillStyle = crust;
      ctx.beginPath();
      ctx.moveTo(box.x, midY + 20); ctx.lineTo(subX, midY);
      ctx.lineTo(subX + 30, midY + 40); ctx.lineTo(subX + 16, midY + 52); ctx.lineTo(subX - 4, midY + 30);
      ctx.lineTo(box.x, midY + 46); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 上部板塊
      ctx.save();
      ctx.fillStyle = type === "convergent-cont" ? "#9c8a6a" : crust;
      ctx.beginPath();
      ctx.moveTo(subX - 10, midY - 6);
      ctx.lineTo(box.x + box.w, midY - 10 + (type === "convergent-cont" ? -26 : 0));
      ctx.lineTo(box.x + box.w, midY + 26);
      ctx.lineTo(subX, midY + 30); ctx.closePath(); ctx.fill();
      ctx.restore();
      // 火山
      if (type === "convergent-ocean") {
        const vx = subX + box.w * 0.22;
        ctx.save(); ctx.fillStyle = "#6b5d4f";
        ctx.beginPath();
        ctx.moveTo(vx - 34, midY - 8); ctx.lineTo(vx - 6, midY - 52); ctx.lineTo(vx + 6, midY - 52); ctx.lineTo(vx + 34, midY - 8);
        ctx.closePath(); ctx.fill(); ctx.restore();
        if (o.erupting) {
          for (let i = 0; i < 6; i++) {
            const yy = midY - 54 - ((o.time || 0) * 26 + i * 18) % 50;
            D.disc(ctx, vx + Math.sin(i * 2 + (o.time || 0)) * 8, yy, 4.5, { fill: "rgba(160,160,170,0.8)" });
          }
        }
        D.text(ctx, "火山弧", vx, midY - 60, { color: PL.col("text-dim"), size: 10, align: "center" });
      } else {
        // 造山：隆起
        ctx.save(); ctx.fillStyle = "#9c8a6a";
        ctx.beginPath();
        ctx.moveTo(box.x + box.w * 0.72, midY - 12);
        ctx.lineTo(box.x + box.w * 0.82, midY - 56); ctx.lineTo(box.x + box.w * 0.88, midY - 30);
        ctx.lineTo(box.x + box.w * 0.94, midY - 60); ctx.lineTo(box.x + box.w, midY - 26);
        ctx.lineTo(box.x + box.w, midY - 10); ctx.closePath(); ctx.fill(); ctx.restore();
        D.text(ctx, "山脈", box.x + box.w * 0.86, midY - 64, { color: PL.col("text-dim"), size: 10, align: "center" });
      }
      D.text(ctx, "海溝", subX, midY + 42, { color: PL.col("text-dim"), size: 10, align: "center" });
      D.arrow(ctx, box.x + box.w * 0.90, midY - 24, box.x + box.w * 0.70, midY - 24, { color: PL.col("accent"), width: 2.6 });
      D.arrow(ctx, box.x + box.w * 0.08, midY + 34, box.x + box.w * 0.30, midY + 34, { color: PL.col("accent"), width: 2.6 });
    } else {
      // transform
      const off = o.offset || 0;
      D.rect(ctx, box.x, midY, box.w, 24, { fill: crust });
      D.rect(ctx, box.x, midY + 24, box.w, 24, { fill: crust });
      D.line(ctx, box.x + box.w * 0.38, midY, box.x + box.w * 0.62, midY + 24, "rgba(220,80,60,0.95)", 2.4);
      D.arrow(ctx, box.x + box.w * 0.16, midY + 12 - off, box.x + box.w * 0.34, midY + 12 - off, { color: PL.col("accent"), width: 2.6, label: "A 板塊" });
      D.arrow(ctx, box.x + box.w * 0.84, midY + 12 + off, box.x + box.w * 0.66, midY + 12 + off, { color: PL.col("accent"), width: 2.6, label: "B 板塊" });
      D.text(ctx, "轉形斷層：平行錯動、地震頻繁", box.x + box.w / 2, box.y + 16, { color: PL.col("text-dim"), size: 11, align: "center" });
    }
  }

  /*
   * 岩層柱：layers = [{name, h, color, wavy}]（由下到上）。
   * o.tilt 整體傾角（度）；o.fault {x, drop} 正/逆斷層錯移；
   * o.dike {x} 岩脈切入；o.unconformity {index} 不整合面（波浪線）。
   * 回傳每層頂部的 y 座標（未傾斜前）。
   */
  function rockLayers(ctx, box, layers, o) {
    o = o || {};
    const totalH = layers.reduce((s, l) => s + l.h, 0);
    const scale = (box.h - 8) / totalH;
    const tilt = (o.tilt || 0) * Math.PI / 180;
    const tops = [];
    let y = box.y + box.h;
    const drawLayer = (l, yTop, yBot, xoff) => {
      ctx.save();
      ctx.fillStyle = l.color || rockColor(l.name);
      ctx.beginPath();
      ctx.moveTo(box.x - 10 + Math.tan(tilt) * (box.y + box.h - yTop), yTop);
      ctx.lineTo(box.x + box.w + 10 + Math.tan(tilt) * (box.y + box.h - yTop), yTop);
      ctx.lineTo(box.x + box.w + 10 + Math.tan(tilt) * (box.y + box.h - yBot), yBot);
      ctx.lineTo(box.x - 10 + Math.tan(tilt) * (box.y + box.h - yBot), yBot);
      ctx.closePath();
      ctx.fill();
      if (l.wavy) {
        ctx.save(); ctx.clip();
        ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = box.x - 10; x <= box.x + box.w + 10; x += 6) {
          const yy = yTop + Math.sin(x * 0.12) * 3;
          x === box.x - 10 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
        }
        ctx.stroke(); ctx.restore();
      }
      ctx.restore();
      if (l.label) D.text(ctx, l.label, box.x + box.w * 0.5, (yTop + yBot) / 2 + 4, { color: l.textColor || "rgba(20,25,30,0.85)", size: 11, align: "center", weight: "700" });
    };
    // 由上層畫到下層（上層先畫，被下層覆蓋邊緣）
    for (let i = layers.length - 1; i >= 0; i--) {
      const layer = layers[i];
      const hPix = layer.h * scale;
      const yTop = y - hPix;
      const faultDrop = o.fault && o.fault.drop ? (i < (o.fault.aboveIndex == null ? layers.length : o.fault.aboveIndex) ? o.fault.drop : 0) : 0;
      drawLayer(layer, yTop - faultDrop, y - faultDrop, 0);
      tops.push({ y: yTop, layer });
      y = yTop;
    }
    // 岩脈
    if (o.dike) {
      const dx = box.x + box.w * o.dike.x;
      ctx.save();
      ctx.fillStyle = "#6b4f3f";
      ctx.beginPath();
      ctx.moveTo(dx - 7, box.y - 6); ctx.lineTo(dx + 7, box.y - 6);
      ctx.lineTo(dx + 4, box.y + box.h); ctx.lineTo(dx - 4, box.y + box.h);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "rgba(40,25,18,0.8)"; ctx.lineWidth = 1.2; ctx.stroke();
      ctx.restore();
      if (o.dike.label) D.text(ctx, o.dike.label, dx + 12, box.y + 14, { color: PL.col("text-dim"), size: 10 });
    }
    // 斷層線
    if (o.fault) {
      const fx = box.x + box.w * o.fault.x;
      D.line(ctx, fx, box.y - 6, fx + (o.fault.slant || 8), box.y + box.h, "rgba(220,80,60,0.95)", 2.4);
    }
    return { tops };
  }

  /* ------------------------------ 地震與火山 ------------------------------ */
  /*
   * 地震波前：P 波（快、細環）與 S 波（慢、粗環）。
   * tP/tS 是以「距離」為單位的半徑。
   */
  function waveFronts(ctx, cx, cy, rP, rS, o) {
    o = o || {};
    for (let r = rS; r > 0; r -= o.gapS || 18) {
      if (r < 4) break;
      D.ring(ctx, cx, cy, r, o.colorS || "rgba(239,83,80,0.5)", 2.4);
    }
    for (let r = rP; r > 0; r -= o.gapP || 26) {
      if (r < 4) break;
      D.ring(ctx, cx, cy, r, o.colorP || "rgba(92,145,220,0.55)", 1.6);
    }
    D.disc(ctx, cx, cy, 5, { fill: "#ff8a65", glow: "#ff5722", glowSize: 10 });
  }

  /*
   * 地震儀波形：回傳可直接畫的點列。
   * o.tP、o.tS、o.tSurf（秒）；o.amp 峰值；o.noise 背景雜訊。
   * 先小雜訊、P 到後中幅高頻、S 到後大幅低頻、表面波最大。
   */
  function seismoPts(box, o) {
    o = o || {};
    const tP = o.tP == null ? 0.3 : o.tP, tS = o.tS == null ? 0.55 : o.tS;
    const tSurf = o.tSurf == null ? 0.75 : o.tSurf;
    const amp = o.amp || 1, noise = o.noise == null ? 0.03 : o.noise;
    const rnd = rng(o.seed || 11);
    const pts = [];
    for (let i = 0; i <= 400; i++) {
      const t = i / 400;
      let a = noise * (rnd() - 0.5);
      if (t >= tP) a += 0.18 * amp * Math.sin(t * 260) * Math.exp(-(t - tP) * 7);
      if (t >= tS) a += 0.55 * amp * Math.sin(t * 150 + 1) * Math.exp(-(t - tS) * 4);
      if (t >= tSurf) a += 0.9 * amp * Math.sin(t * 60) * Math.exp(-(t - tSurf) * 2.2);
      pts.push([box.x + box.w * t, box.y + box.h / 2 - a * box.h * 0.42]);
    }
    return pts;
  }

  /*
   * 火山外形：type = "shield"|"strato"|"cinder"。
   * o.erupting 爆發中（灰柱＋熔岩流）；o.lavaFlow（0–1）熔岩流長度。
   */
  function volcanoShape(ctx, cx, baseY, w, h, type, o) {
    o = o || {};
    const slope = type === "shield" ? 0.22 : type === "strato" ? 0.85 : 1.4;
    const halfW = h / slope / 2;
    const craterW = type === "shield" ? w * 0.24 : w * 0.10;
    ctx.save();
    ctx.fillStyle = type === "cinder" ? "#5d5045" : "#6b5d4f";
    ctx.beginPath();
    ctx.moveTo(cx - Math.min(halfW, w / 2), baseY);
    ctx.lineTo(cx - craterW / 2, baseY - h);
    ctx.lineTo(cx + craterW / 2, baseY - h);
    ctx.lineTo(cx + Math.min(halfW, w / 2), baseY);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(30,22,16,0.7)"; ctx.lineWidth = 1.4; ctx.stroke();
    // 層層堆積紋（複式火山）
    if (type === "strato") {
      ctx.strokeStyle = "rgba(30,22,16,0.35)"; ctx.lineWidth = 1;
      for (let i = 1; i < 5; i++) {
        const yy = baseY - h * i / 5;
        const half = (h - h * i / 5) / slope / 2;
        ctx.beginPath(); ctx.moveTo(cx - half * 0.9, yy); ctx.lineTo(cx + half * 0.9, yy); ctx.stroke();
      }
    }
    ctx.restore();
    // 熔岩流
    if (o.lavaFlow) {
      const len = clamp(o.lavaFlow, 0, 1) * h / slope * 0.9;
      ctx.save();
      ctx.strokeStyle = "#ff5722"; ctx.lineWidth = 5; ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(cx + craterW / 2 * 0.5, baseY - h + 4);
      ctx.quadraticCurveTo(cx + len * 0.4, baseY - h * 0.45, cx + len, baseY - 3);
      ctx.stroke(); ctx.restore();
    }
    // 爆發灰柱
    if (o.erupting) {
      const t = o.time || 0;
      for (let i = 0; i < 10; i++) {
        const f = ((t * 0.5 + i / 10) % 1);
        const yy = baseY - h - f * h * 0.9;
        const spread = 8 + f * 26;
        D.disc(ctx, cx + Math.sin(i * 2.7 + t) * spread * 0.6, yy, 6 + f * 10, { fill: "rgba(130,130,140," + (0.75 - f * 0.5) + ")" });
      }
      D.disc(ctx, cx, baseY - h - 6, 8, { fill: "#ff8a50", glow: "#ff5722", glowSize: 14 });
    }
    if (o.label) D.text(ctx, o.label, cx, baseY + 16, { color: PL.col("text-dim"), size: 11, align: "center" });
    return { craterY: baseY - h, halfW };
  }

  /* ------------------------------ 氣象 ------------------------------ */
  /*
   * 天氣站模型：溫度、露點、氣壓、風向風速、雲量。
   * o = {temp, dew, pressure, windDir(角度，0=東), windSpeed, cover(0–1)}
   */
  function stationModel(ctx, cx, cy, o) {
    o = o || {};
    const cover = clamp(o.cover == null ? 0.3 : o.cover, 0, 1);
    D.disc(ctx, cx, cy, 9, { fill: cover > 0.9 ? "rgba(90,100,115,0.9)" : cover > 0.3 ? "rgba(90,100,115,0.35)" : PL.theme.shade(0.5), stroke: PL.col("text-dim"), width: 1.4 });
    if (o.temp != null) D.text(ctx, Math.round(o.temp) + "°", cx - 15, cy - 12, { color: PL.col("text"), size: 12, align: "right", weight: "700" });
    if (o.dew != null) D.text(ctx, Math.round(o.dew), cx - 15, cy + 4, { color: PL.col("text-dim"), size: 10, align: "right" });
    if (o.pressure != null) D.text(ctx, String(Math.round(o.pressure)).padStart(3, "0"), cx + 15, cy - 12, { color: PL.col("text"), size: 11, align: "left", weight: "700" });
    // 風桿：從圓心往風吹去的方向
    if (o.windSpeed) {
      const ang = (o.windDir || 0) * Math.PI / 180;
      const len = 16 + clamp(o.windSpeed, 0, 60) * 0.35;
      const ex = cx + Math.cos(ang) * len, ey = cy - Math.sin(ang) * len;
      D.line(ctx, cx, cy, ex, ey, PL.col("text"), 1.8);
      const flags = Math.floor(o.windSpeed / 10) % 5;
      for (let f = 1; f <= flags; f++) {
        const fx = lerp(cx, ex, 0.55 + f * 0.12), fy = lerp(cy, ey, 0.55 + f * 0.12);
        D.line(ctx, fx, fy, fx + 6, fy - 4, PL.col("text"), 1.6);
      }
    }
  }

  /*
   * 雲：type = "cumulus"|"stratus"|"cirrus"|"cumulonimbus"|"fog"。
   */
  function cloudShape(ctx, cx, cy, w, h, type, o) {
    o = o || {};
    const a = o.alpha == null ? 0.85 : o.alpha;
    ctx.save();
    ctx.fillStyle = o.color || "rgba(235,240,246," + a + ")";
    ctx.strokeStyle = "rgba(120,140,160,0.5)"; ctx.lineWidth = 1;
    if (type === "cirrus") {
      ctx.strokeStyle = o.color || "rgba(235,240,246," + a + ")";
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        const yy = cy - h * 0.3 + i * h * 0.22;
        ctx.moveTo(cx - w / 2, yy);
        for (let x = cx - w / 2; x <= cx + w / 2; x += 8) {
          ctx.lineTo(x, yy + Math.sin(x * 0.09 + i) * h * 0.08);
        }
        ctx.stroke();
      }
    } else if (type === "stratus" || type === "fog") {
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy + (i - 1) * h * 0.22, w * (0.5 - i * 0.06), h * 0.16, 0, 0, TAU);
        ctx.fill();
      }
    } else {
      const nBlobs = type === "cumulonimbus" ? 7 : 5;
      for (let i = 0; i < nBlobs; i++) {
        const f = i / (nBlobs - 1) - 0.5;
        const bh = type === "cumulonimbus" ? h * (i === nBlobs - 1 ? 1.4 : 0.6 + Math.sin(i) * 0.2) : h * 0.6;
        ctx.beginPath();
        ctx.arc(cx + f * w * 0.72, cy - bh * 0.25, Math.max(w, h) * 0.16 + (type === "cumulonimbus" && i === nBlobs - 1 ? h * 0.2 : 0), 0, TAU);
        ctx.fill();
      }
      ctx.fillRect(cx - w * 0.34, cy - h * 0.1, w * 0.68, h * 0.34);
      if (type === "cumulonimbus") ctx.fillRect(cx - w * 0.26, cy - h * 0.5, w * 0.52, h * 0.9);
    }
    ctx.restore();
  }

  /*
   * 鋒面符號：沿線段畫三角（冷鋒）或半圓（暖鋒）。
   * type = "cold"|"warm"|"stationary"|"occluded"。
   */
  function frontSymbol(ctx, x1, y1, x2, y2, type) {
    D.line(ctx, x1, y1, x2, y2, type === "cold" ? "#2e6da8" : type === "warm" ? "#c0392b" : PL.col("accent-2"), 3);
    const len = Math.hypot(x2 - x1, y2 - y1);
    const n = Math.max(3, Math.floor(len / 34));
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      const px = lerp(x1, x2, f), py = lerp(y1, y2, f);
      const ang = Math.atan2(y2 - y1, x2 - x1);
      if (type === "cold" || type === "occluded") {
        ctx.save();
        ctx.fillStyle = "#2e6da8";
        ctx.translate(px, py); ctx.rotate(ang);
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-8, -9); ctx.lineTo(0, -2); ctx.closePath(); ctx.fill();
        ctx.restore();
      }
      if (type === "warm" || type === "stationary" || type === "occluded") {
        ctx.save();
        ctx.fillStyle = "#c0392b";
        ctx.beginPath(); ctx.arc(px, py, 6, Math.PI, TAU); ctx.fill();
        ctx.restore();
      }
    }
  }

  /*
   * 颱風螺旋雨帶：o.spin（0–1）旋轉；o.eye 眼半徑。
   */
  function typhoonSpiral(ctx, cx, cy, R, o) {
    o = o || {};
    const spin = (o.spin || 0) * TAU;
    ctx.save();
    for (let arm = 0; arm < 3; arm++) {
      ctx.fillStyle = "rgba(220,230,240," + (o.alpha == null ? 0.75 : o.alpha) + ")";
      for (let f = 0.18; f < 1; f += 0.045) {
        const a = spin + arm * TAU / 3 - f * 2.6;
        const rr = R * f;
        const s = R * 0.10 * (1 - f * 0.4);
        ctx.beginPath();
        ctx.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, s, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
    if (o.eye) D.disc(ctx, cx, cy, o.eye, { fill: PL.col("sim-bg-1", "#0a0f16"), stroke: "rgba(200,220,240,0.5)", width: 1.5 });
  }

  /*
   * 大氣分層底板：回傳 yOf(km)（0–100 km 線性壓縮）。
   * 各層以淡色帶區分並標名。
   */
  function atmosphereBands(ctx, box, o) {
    o = o || {};
    const yOf = km => box.y + box.h * (1 - clamp(km, 0, 100) / 100);
    const bands = [
      { name: "對流層", km: [0, 12], color: "rgba(102,187,106,0.18)" },
      { name: "平流層", km: [12, 50], color: "rgba(92,145,220,0.14)" },
      { name: "中間層", km: [50, 85], color: "rgba(149,117,205,0.14)" },
      { name: "增溫層", km: [85, 100], color: "rgba(239,83,80,0.12)" }
    ];
    bands.forEach(b => {
      const y1 = yOf(b.km[1]), y2 = yOf(b.km[0]);
      D.rect(ctx, box.x, y1, box.w, y2 - y1, { fill: b.color });
      D.line(ctx, box.x, y1, box.x + box.w, y1, "rgba(140,160,180,0.4)", 1, [4, 4]);
      D.text(ctx, b.name, box.x + box.w - 6, (y1 + y2) / 2 + 4, { color: PL.col("text-faint"), size: 11, align: "right" });
    });
    return { yOf };
  }

  /* ------------------------------ 海洋 ------------------------------ */
  /*
   * 海底地形剖面：features = [{type:"shelf"|"slope"|"rise"|"plain"|"ridge"|"trench", w}]。
   * 回傳每段的深度函式 yOf(xFrac)。
   */
  function seaProfile(ctx, box, features, o) {
    o = o || {};
    const total = features.reduce((s, f) => s + f.w, 0);
    const depthMax = box.h - 26;
    const surf = box.y + 10;
    let x = box.x;
    const pts = [[box.x, surf]];
    const nodes = [];
    features.forEach((f, i) => {
      const w = f.w / total * box.w;
      x += w;
      let depth = f.depth == null ? 0.5 : f.depth;
      nodes.push([x, surf + depth * depthMax, f]);
    });
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(box.x, surf);
    nodes.forEach(n => ctx.lineTo(n[0], n[1]));
    ctx.lineTo(box.x + box.w, surf + depthMax);
    ctx.lineTo(box.x, surf + depthMax);
    ctx.closePath();
    ctx.fillStyle = o.rock || (PL.theme.isLight() ? "#8a6f52" : "#54483a");
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.6; ctx.stroke();
    ctx.restore();
    nodes.forEach(n => {
      if (n[2].label) D.text(ctx, n[2].label, n[0], Math.max(surf + 14, n[1] - 8), { color: PL.col("text-dim"), size: 10, align: "center" });
    });
    return { nodes, surf, depthMax };
  }

  // 洋流箭頭（沿圓弧的彎箭頭）：angle 起始角、sweep 掃過弧度
  function currentArrow(ctx, cx, cy, r, angle, sweep, o) {
    o = o || {};
    const steps = 14;
    let px, py;
    for (let i = 0; i <= steps; i++) {
      const a = angle + sweep * i / steps;
      const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
      if (i === 0) { px = x; py = y; continue; }
      D.line(ctx, px, py, x, y, o.color || "#4fc3f7", o.width || 3);
      px = x; py = y;
    }
    const aEnd = angle + sweep;
    const hx = cx + Math.cos(aEnd) * r, hy = cy + Math.sin(aEnd) * r;
    const a = aEnd + Math.PI / 2 * Math.sign(sweep);
    ctx.save();
    ctx.fillStyle = o.color || "#4fc3f7";
    ctx.beginPath();
    ctx.moveTo(hx + Math.cos(a) * 7, hy + Math.sin(a) * 7);
    ctx.lineTo(hx + Math.cos(a + 2.6) * 7, hy + Math.sin(a + 2.6) * 7);
    ctx.lineTo(hx + Math.cos(a - 2.6) * 7, hy + Math.sin(a - 2.6) * 7);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }

  /* ------------------------------ 天文 ------------------------------ */
  /*
   * 天空穹頂：地平線橢圓＋天球弧線。回傳方位角／高度角 → 畫布座標的映射。
   * az 0–360（0=北，90=東），alt 0–90。
   */
  function skyDome(ctx, box, o) {
    o = o || {};
    const cx = box.x + box.w / 2;
    const horizonY = box.y + box.h * 0.82;
    const R = Math.min(box.w * 0.44, box.h * 0.72);
    // 地平面
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(cx, horizonY, R, R * 0.24, 0, 0, TAU);
    ctx.fillStyle = PL.theme.isLight() ? "rgba(140,175,120,0.4)" : "rgba(80,100,70,0.4)";
    ctx.fill();
    ctx.strokeStyle = PL.col("border"); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
    // 天頂弧
    for (const alt of [30, 60]) {
      const r = R * (1 - alt / 90);
      D.ring(ctx, cx, horizonY - R * 0, r, "rgba(140,160,180,0.35)", 1, [3, 4]);
    }
    D.text(ctx, "N", cx, horizonY + R * 0.24 + 14, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "S", cx, horizonY - R - 8, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "E", cx + R + 10, horizonY, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
    D.text(ctx, "W", cx - R - 10, horizonY, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
    const project = (az, alt) => {
      const r = R * (1 - clamp(alt, 0, 90) / 90);
      const a = (az - 90) * Math.PI / 180;
      // 橢圓壓扁（俯視投影）：南北向壓縮
      const x = cx + Math.cos(a) * r;
      const y = horizonY - Math.sin(a) * r * (o.squash == null ? 0.9 : o.squash) - Math.sin(clamp(alt, 0, 90) * Math.PI / 180) * R * 0.0;
      return [x, y];
    };
    return { cx, horizonY, R, project };
  }

  /*
   * 恆星軌跡（周日運動）：以天極為圓心的同心弧。
   * o.arcs = [{r, from, to}]（from/to 為角度）；o.pole 星等點。
   */
  function starTrail(ctx, cx, cy, arcs, o) {
    o = o || {};
    arcs.forEach(a => {
      ctx.save();
      ctx.strokeStyle = a.color || "rgba(255,236,160,0.85)";
      ctx.lineWidth = a.width || 2;
      if (a.dash) ctx.setLineDash(a.dash);
      ctx.beginPath();
      ctx.arc(cx, cy, a.r, a.from == null ? 0 : a.from, a.to == null ? TAU : a.to);
      ctx.stroke();
      ctx.restore();
    });
    if (o.pole) {
      D.disc(ctx, cx, cy, 3, { fill: "#fff8c4", glow: "#ffe082", glowSize: 8 });
      if (o.poleLabel) D.text(ctx, o.poleLabel, cx + 8, cy - 8, { color: PL.col("text-dim"), size: 10 });
    }
  }

  /*
   * 月相：phase 0=朔、0.25=上弦、0.5=滿月、0.75=下弦。
   */
  function moonPhase(ctx, cx, cy, r, phase, o) {
    o = o || {};
    phase = ((phase % 1) + 1) % 1;
    // 月面
    D.disc(ctx, cx, cy, r, { fill: "#e8e4d8", stroke: "rgba(140,140,150,0.7)", width: 1 });
    // 月海斑
    const rnd = rng(8);
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.fillStyle = "rgba(150,150,160,0.5)";
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(cx + (rnd() - 0.5) * r, cy + (rnd() - 0.5) * r, r * (0.15 + rnd() * 0.2), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
    // 陰影：以兩段圓弧構成明暗界線
    const lit = phase < 0.5; // 0→0.5 由右側漸亮（北半球視角）
    ctx.save();
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    ctx.fillStyle = "rgba(20,26,36,0.88)";
    ctx.beginPath();
    const k = Math.cos(phase * TAU); // -1..1
    ctx.arc(cx, cy, r, 0, TAU);
    ctx.fill();
    // 亮區：半圓 + 橢圓邊界
    ctx.fillStyle = "#e8e4d8";
    ctx.beginPath();
    if (lit) {
      // 右半亮
      ctx.arc(cx, cy, r, -Math.PI / 2, Math.PI / 2, false);
      ctx.ellipse(cx, cy, Math.abs(k) * r, r, 0, Math.PI / 2, -Math.PI / 2, k > 0);
    } else {
      // 左半亮
      ctx.arc(cx, cy, r, Math.PI / 2, Math.PI * 1.5, false);
      ctx.ellipse(cx, cy, Math.abs(k) * r, r, 0, -Math.PI / 2, Math.PI / 2, k > 0);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    if (o.label) D.text(ctx, o.label, cx, cy + r + 16, { color: PL.col("text-dim"), size: 11, align: "center" });
  }

  /*
   * 克卜勒橢圓軌道：焦點在太陽。回傳 planetPos(trueAnomaly 0–TAU)。
   * o.ecc 偏心率（0–0.8）。
   */
  function orbitEllipse(ctx, box, o) {
    o = o || {};
    const ecc = clamp(o.ecc == null ? 0.3 : o.ecc, 0, 0.85);
    const a = Math.min(box.w, box.h) / 2 * 0.86;
    const b = a * Math.sqrt(1 - ecc * ecc);
    const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
    const fx = cx - a * ecc;
    // 太陽在焦點
    const sun = PL.apparatus.planet ? null : null;
    D.disc(ctx, fx, cy, 9, { fill: "#ffca28", glow: "#ff9800", glowSize: 14 });
    ctx.save();
    ctx.strokeStyle = o.color || "rgba(140,170,200,0.85)";
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.ellipse(cx, cy, a, b, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
    // 半長軸
    if (o.showAxes) {
      D.line(ctx, fx, cy, fx + 2 * a, cy, "rgba(140,170,200,0.4)", 1, [4, 4]);
      D.text(ctx, "a", fx + a, cy - 8, { color: PL.col("text-faint"), size: 10, align: "center" });
    }
    const planetPos = (theta, rPlanet) => {
      const r = a * (1 - ecc * ecc) / (1 + ecc * Math.cos(theta));
      const x = fx + r * Math.cos(theta), y = cy + r * Math.sin(theta);
      if (rPlanet) D.disc(ctx, x, y, rPlanet, { fill: o.planetColor || "#64b5f6" });
      return [x, y];
    };
    return { fx, cx, cy, a, b, planetPos };
  }

  /*
   * 赫羅圖底板：回傳 X(溫度 K) 與 Y(相對光度 log) 的映射。
   * 主序帶、巨星分支與白矮星區以淡色標出。
   */
  function hrDiagram(ctx, box, o) {
    o = o || {};
    const x0 = 30000, x1 = 3000; // 溫度反轉（左熱右冷）
    const y0 = -4, y1 = 5; // log 光度
    const padL = 44, padB = 30;
    const px = box.x + padL, py = box.y + 8;
    const pw = box.w - padL - 12, ph = box.h - padB - 8;
    const X = T => px + (Math.log10(x0) - Math.log10(clamp(T, x1, x0))) / (Math.log10(x0) - Math.log10(x1)) * pw;
    const Y = L => py + (y1 - clamp(L, y0, y1)) / (y1 - y0) * ph;
    D.rect(ctx, px, py, pw, ph, { fill: "rgba(22,31,69,0.85)", stroke: PL.col("border"), r: 4 });
    // 區域
    ctx.save();
    ctx.beginPath(); ctx.rect(px, py, pw, ph); ctx.clip();
    // 主序帶
    ctx.fillStyle = "rgba(255,255,255,0.10)";
    ctx.beginPath();
    ctx.moveTo(X(30000), Y(4.8));
    ctx.bezierCurveTo(X(10000), Y(3.4), X(6000), Y(0.6), X(3000), Y(-2.6));
    ctx.lineTo(X(3000), Y(-3.6)); ctx.lineTo(X(8000), Y(0.2));
    ctx.lineTo(X(30000), Y(3.8));
    ctx.closePath(); ctx.fill();
    // 巨星分支
    ctx.fillStyle = "rgba(255,167,38,0.14)";
    ctx.beginPath();
    ctx.moveTo(X(8000), Y(1.4));
    ctx.lineTo(X(4000), Y(3.2)); ctx.lineTo(X(3000), Y(3.4));
    ctx.lineTo(X(4500), Y(1.0)); ctx.closePath(); ctx.fill();
    // 白矮星
    ctx.fillStyle = "rgba(140,200,255,0.18)";
    ctx.beginPath();
    ctx.ellipse(X(12000), Y(-3), pw * 0.09, ph * 0.07, 0, 0, TAU);
    ctx.fill();
    ctx.restore();
    // 軸
    [30000, 10000, 6000, 3000].forEach(T => {
      D.text(ctx, T >= 10000 ? (T / 1000) + "k" : String(T), X(T), py + ph + 14, { color: PL.col("text-faint"), size: 9, align: "center" });
    });
    D.text(ctx, "表面溫度 (K)", px + pw / 2, py + ph + 26, { color: PL.col("text-faint"), size: 10, align: "center" });
    [-4, -2, 0, 2, 4].forEach(L => {
      D.text(ctx, "10" + supDigits(String(L)), px - 6, Y(L) + 3, { color: PL.col("text-faint"), size: 9, align: "right" });
    });
    D.text(ctx, "光度", px - 30, py + 10, { color: PL.col("text-faint"), size: 10 });
    D.text(ctx, "主序帶", X(10000), Y(2.6) + 14, { color: "rgba(255,255,255,0.75)", size: 10, align: "center" });
    D.text(ctx, "巨星", X(4200), Y(3.1) - 6, { color: "rgba(255,200,120,0.9)", size: 10, align: "center" });
    D.text(ctx, "白矮星", X(12000), Y(-1.9), { color: "rgba(160,210,255,0.9)", size: 10, align: "center" });
    return { X, Y, px, py, pw, ph };
  }
  function supDigits(s) {
    const sup = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    return String(s).split("").map(c => sup[c] || c).join("");
  }

  // 星系外觀：type = "spiral"|"elliptical"|"irregular"
  function galaxyShape(ctx, cx, cy, r, type, o) {
    o = o || {};
    const t = o.time || 0;
    ctx.save();
    if (type === "spiral") {
      for (let arm = 0; arm < 2; arm++) {
        ctx.fillStyle = "rgba(235,240,250,0.85)";
        for (let f = 0.08; f < 1; f += 0.03) {
          const a = (o.spin || 0) + arm * Math.PI - f * 3.2;
          const rr = r * f;
          D.disc(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr * 0.55, r * 0.05 * (1 - f * 0.5), { fill: f < 0.3 ? "rgba(255,224,178,0.9)" : "rgba(220,230,245,0.7)" });
        }
      }
      D.disc(ctx, cx, cy, r * 0.12, { fill: "rgba(255,240,200,0.95)", glow: "#ffe082", glowSize: 12 });
    } else if (type === "elliptical") {
      const g = ctx.createRadialGradient(cx, cy, r * 0.05, cx, cy, r);
      g.addColorStop(0, "rgba(255,240,210,0.95)");
      g.addColorStop(1, "rgba(200,195,185,0.05)");
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(cx, cy, r, r * (o.flat || 0.7), o.angle || 0, 0, TAU); ctx.fill();
    } else {
      const rnd = rng(o.seed || 3);
      for (let i = 0; i < 26; i++) {
        D.disc(ctx, cx + (rnd() - 0.5) * r * 1.4, cy + (rnd() - 0.5) * r, r * (0.04 + rnd() * 0.08), { fill: "rgba(200,220,250,0.7)" });
      }
    }
    ctx.restore();
  }

  /*
   * 樹輪剖面：widths = [0–1 相對寬度...]，由內到外。
   * 標示 o.mark 幾年的環。
   */
  function treeRings(ctx, cx, cy, r, widths, o) {
    o = o || {};
    ctx.save();
    ctx.fillStyle = "rgba(170,120,70,0.35)";
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = "rgba(90,55,30,0.9)"; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    const total = widths.reduce((s, w) => s + w, 0) || 1;
    let rr = 0;
    widths.forEach((w, i) => {
      const dr = w / total * r;
      rr += dr;
      ctx.save();
      ctx.strokeStyle = "rgba(105,65,35,0.8)";
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rr, rr * 0.97, 0.05, 0, TAU);
      ctx.stroke();
      ctx.restore();
      if (o.mark === i) {
        D.ring(ctx, cx, cy, rr, PL.col("accent"), 2);
      }
    });
    ctx.restore();
    if (o.label) D.text(ctx, o.label, cx, cy + r + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
  }

  // 小太陽
  function sunIcon(ctx, cx, cy, r, o) {
    o = o || {};
    D.disc(ctx, cx, cy, r, { fill: "#ffca28", glow: "#ff9800", glowSize: o.glow == null ? 16 : o.glow });
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU + (o.time || 0) * 0.3;
      D.line(ctx, cx + Math.cos(a) * r * 1.25, cy + Math.sin(a) * r * 1.25,
        cx + Math.cos(a) * r * 1.55, cy + Math.sin(a) * r * 1.55, "#ffb300", 2.4);
    }
  }

  // 指北針
  function compassRose(ctx, cx, cy, r) {
    D.disc(ctx, cx, cy, r, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), width: 1.4 });
    D.arrow(ctx, cx, cy + r * 0.6, cx, cy - r * 0.6, { color: "#e57373", width: 2.4 });
    D.text(ctx, "N", cx, cy - r - 5, { color: PL.col("text-dim"), size: 10, align: "center", weight: "700" });
  }

  /*
   * 台灣簡圖（真實比例簡化）：o.markers = [{x, y, label, color}]（0–1 經緯概略）。
   * 回傳 lonLat → 畫布座標映射。
   */
  function taiwanMap(ctx, box, o) {
    o = o || {};
    // 台灣本島簡化輪廓（經緯 120–122, 21.9–25.3）
    const proj = (lon, lat) => {
      const x = box.x + (lon - 119.9) / 2.5 * box.w;
      const y = box.y + (25.4 - lat) / 3.7 * box.h;
      return [x, y];
    };
    const outline = [
      [121.0, 25.30], [121.55, 25.30], [121.95, 25.05], [121.65, 24.6],
      [121.9, 24.2], [121.6, 23.3], [121.4, 22.8], [121.0, 22.0], [120.7, 21.95],
      [120.35, 22.55], [120.25, 23.1], [120.05, 23.6], [120.1, 24.4], [120.9, 25.05]
    ];
    ctx.save();
    ctx.beginPath();
    outline.forEach((p, i) => { const q = proj(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); });
    ctx.closePath();
    ctx.fillStyle = o.fill || (PL.theme.isLight() ? "rgba(140,175,120,0.9)" : "rgba(95,130,85,0.9)");
    ctx.fill();
    ctx.strokeStyle = PL.col("border"); ctx.lineWidth = 1.4; ctx.stroke();
    ctx.restore();
    // 中央山脈脊線
    ctx.save();
    ctx.strokeStyle = "rgba(90,60,40,0.7)"; ctx.lineWidth = 3; ctx.lineCap = "round";
    ctx.beginPath();
    [[121.0, 25.1], [121.2, 24.4], [121.0, 23.6], [120.85, 23.0], [120.85, 22.6]].forEach((p, i) => {
      const q = proj(p[0], p[1]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
    });
    ctx.stroke();
    ctx.restore();
    (o.markers || []).forEach(m => {
      const q = proj(m.lon, m.lat);
      D.disc(ctx, q[0], q[1], 4.5, { fill: m.color || PL.col("accent-2"), stroke: "#fff", width: 1.2 });
      if (m.label) D.text(ctx, m.label, q[0] + 8, q[1] + 4, { color: PL.col("text"), size: 10 });
    });
    return proj;
  }

  /* ------------------------------ 粒子／共用小工具 ------------------------------ */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function particleBox(ctx, box, o) {
    o = o || {};
    const state = o.state || "gas", tempN = clamp(o.temp == null ? 0.5 : o.temp, 0, 1);
    const n = o.count || 42, rnd = rng(o.seed || 7);
    const cols = Math.ceil(Math.sqrt(n * box.w / box.h)), rows = Math.ceil(n / cols);
    const cellW = box.w / cols, cellH = box.h / rows;
    const color = o.color || "#7fc8ff";
    const t = o.time || 0;
    D.rect(ctx, box.x, box.y, box.w, box.h, { stroke: PL.col("border"), width: 1.4, r: 8, fill: o.bg || "rgba(120,180,220,0.05)" });
    for (let i = 0; i < n; i++) {
      const baseX = box.x + cellW * ((i % cols) + 0.5), baseY = box.y + cellH * (Math.floor(i / cols) + 0.5);
      const jx = (rnd() - 0.5) * cellW * 0.55, jy = (rnd() - 0.5) * cellH * 0.55;
      let x = baseX + jx, y = baseY + jy, r = o.radius || 5;
      if (state === "solid") {
        x += Math.sin(t * 6 + i) * 0.7 * (0.4 + tempN);
        y += Math.cos(t * 7 + i * 1.7) * 0.7 * (0.4 + tempN);
      } else if (state === "liquid") {
        x += Math.sin(t * (1.1 + tempN) + i * 1.3) * cellW * 0.22;
        y += Math.cos(t * (1.4 + tempN) + i * 0.9) * cellH * 0.22;
      } else {
        const sp = 0.5 + tempN * 1.6;
        x += Math.sin(t * sp + i * 2.1) * cellW * 0.42;
        y += Math.cos(t * sp * 1.23 + i * 1.7) * cellH * 0.42;
      }
      if (x < box.x + r) x = box.x + r; if (x > box.x + box.w - r) x = box.x + box.w - r;
      if (y < box.y + r) y = box.y + r; if (y > box.y + box.h - r) y = box.y + box.h - r;
      D.disc(ctx, x, y, r, { fill: color, glow: o.glow || null, glowSize: 6 });
      D.disc(ctx, x - r * 0.3, y - r * 0.3, r * 0.32, { fill: "rgba(255,255,255,0.55)" });
    }
    D.text(ctx, o.label || "", box.x + 6, box.y + 14, { color: PL.col("text-dim"), size: 10 });
  }
  function molecule(ctx, cx, cy, atoms, bonds, scale, angle) {
    const ca = Math.cos(angle || 0), sa = Math.sin(angle || 0);
    const P = atoms.map(a => ({
      x: cx + (a.x * ca - a.y * sa) * scale,
      y: cy + (a.x * sa + a.y * ca) * scale,
      r: (a.r || 0.34) * scale,
      el: a.el, label: a.label
    }));
    (bonds || []).forEach(b => {
      const A = P[b[0]], B = P[b[1]], order = b[2] || 1;
      const dx = B.x - A.x, dy = B.y - A.y, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      for (let k = 0; k < order; k++) {
        const off = (k - (order - 1) / 2) * 4.4;
        D.line(ctx, A.x + nx * off, A.y + ny * off, B.x + nx * off, B.y + ny * off, PL.col("text-dim"), order === 1 ? 3.4 : 2.2);
      }
    });
    P.forEach(p => {
      D.disc(ctx, p.x, p.y, p.r, { fill: p.color || elementColor(p.el), stroke: "rgba(0,0,0,0.25)", width: 1 });
      D.text(ctx, p.label || p.el, p.x, p.y + p.r * 0.34, {
        color: p.el === "C" ? "#fff" : "#18202b",
        size: Math.max(9, Math.round(p.r * 0.9)), align: "center", weight: "700"
      });
    });
    return P;
  }
  const MOLECULES = {
    H2O: { atoms: [{ el: "O", x: 0, y: 0, r: 0.42 }, { el: "H", x: -0.58, y: 0.42, r: 0.26 }, { el: "H", x: 0.58, y: 0.42, r: 0.26 }], bonds: [[0, 1], [0, 2]] },
    CO2: { atoms: [{ el: "C", x: 0, y: 0, r: 0.38 }, { el: "O", x: -0.78, y: 0, r: 0.4 }, { el: "O", x: 0.78, y: 0, r: 0.4 }], bonds: [[0, 1, 2], [0, 2, 2]] },
    CH4: { atoms: [{ el: "C", x: 0, y: 0, r: 0.4 }, { el: "H", x: -0.55, y: -0.55, r: 0.24 }, { el: "H", x: 0.55, y: -0.55, r: 0.24 }, { el: "H", x: -0.55, y: 0.55, r: 0.24 }, { el: "H", x: 0.55, y: 0.55, r: 0.24 }], bonds: [[0, 1], [0, 2], [0, 3], [0, 4]] }
  };
  function moleculeByName(ctx, cx, cy, name, scale, angle) {
    const m = MOLECULES[name];
    if (!m) return null;
    return molecule(ctx, cx, cy, m.atoms, m.bonds, scale, angle);
  }

  function plot(cv, o) {
    cv.clear();
    const ctx = cv.ctx, W = cv.W, H = cv.H;
    const box = o.box || { x: 52, y: 18, w: W - 68, h: H - 48 };
    const g = PL.graph(cv, box, { x0: o.x0, x1: o.x1, y0: o.y0, y1: o.y1 });
    g.frame({ xlabel: o.xlabel, ylabel: o.ylabel, title: o.title, xticks: o.xticks, yticks: o.yticks });
    g.grid(o.xticks || 4, o.yticks || 4);
    (o.series || []).forEach(s => {
      if (typeof s.fn === "function") g.fn(s.fn, { color: s.color, width: s.width || 2.2, dash: s.dash });
      else if (s.pts) g.curve(s.pts, { color: s.color, width: s.width || 2.2, dash: s.dash });
    });
    (o.marks || []).forEach(m => {
      if (m.vline != null) g.vline(m.vline, { color: m.color, label: m.label, dash: m.dash });
      if (m.hline != null) g.hline(m.hline, { color: m.color, dash: m.dash });
      if (m.dot) g.dot(m.dot[0], m.dot[1], { color: m.color, r: m.r, label: m.label });
    });
    return g;
  }
  function badge(ctx, x, y, text, color) {
    const w = Math.max(44, String(text).length * 12 + 14);
    D.rect(ctx, x - w / 2, y - 11, w, 22, { fill: color || PL.col("accent"), r: 11 });
    D.text(ctx, text, x, y + 4, { color: "#fff", size: 11, align: "center", weight: "700" });
  }
  function panel(ctx, x, y, w, h, title) {
    D.rect(ctx, x, y, w, h, { fill: PL.theme.shade(0.55), stroke: PL.col("border"), r: 8 });
    if (title) D.text(ctx, title, x + 10, y + 17, { color: PL.col("text-dim"), size: 11, weight: "700" });
  }
  function arrow(ctx, x1, y1, x2, y2, color, label) {
    D.arrow(ctx, x1, y1, x2, y2, { color: color || PL.col("accent"), width: 2.2, label });
  }
  function legend(ctx, x, y, items, gap) {
    let cy = y;
    (items || []).forEach(it => {
      D.disc(ctx, x + 5, cy - 4, 4, { fill: it.color });
      D.text(ctx, it.label, x + 15, cy, { color: PL.col("text-dim"), size: 10 });
      cy += gap || 18;
    });
  }
  function meter(ctx, x, y, w, h, frac, o) {
    o = o || {};
    const f = clamp(frac == null ? 0 : frac, 0, 1);
    D.rect(ctx, x, y, w, h, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), r: h / 2 });
    if (f > 0) D.rect(ctx, x + 1, y + 1, Math.max(2, (w - 2) * f), h - 2, { fill: o.color || PL.col("accent"), r: (h - 2) / 2 });
    if (o.label) D.text(ctx, o.label, x, y - 7, { color: PL.col("text-faint"), size: 9 });
    return f;
  }
  function counter(ctx, x, y, w, count, o) {
    o = o || {};
    const r = o.r || 4, gap = r * 3;
    const perRow = Math.max(1, Math.floor(w / gap));
    for (let i = 0; i < Math.max(0, count); i++) {
      const px = x + (i % perRow) * gap, py = y + Math.floor(i / perRow) * gap;
      D.disc(ctx, px, py, r, { fill: o.color || PL.col("accent"), stroke: o.stroke });
    }
  }

  /* ------------------------------ 教學鷹架保險 ------------------------------ */
  function hasTeachingScaffold(root) {
    return [".sim-verdict", ".sim-causality", ".sim-procedure-card", ".sim-derived",
            ".sim-presets", ".sim-relations", ".sim-challenge", ".sim-poe"]
      .some(sel => root.querySelectorAll(sel).length > 0);
  }
  PL._hooks.onBuilt(context => {
    const root = context.root;
    if (!root || !root.dataset || root.dataset.labScaffold !== "1") return;
    if (hasTeachingScaffold(root)) return;
    const host = root.querySelector(".sim-control-deck .sim-controls") || root.querySelector(".sim-controls");
    const readouts = context.readouts || [];
    if (!host || !readouts.length) return;
    const sliders = context.sliders || [];
    const first = readouts[0], second = readouts[1];
    const s1 = sliders[0], s2 = sliders[1];
    const steps = [];
    if (s1) {
      steps.push("先只動「" + s1.label + "」這一個滑桿，其他控制項保持不變。");
      steps.push("盯住讀數「" + first.label + "」，把「" + s1.label + "」從最小拉到最大，記下兩端的值。");
    } else {
      steps.push("切換上方的選項，觀察畫面與讀數哪裡跟著變。");
      steps.push("盯住讀數「" + first.label + "」，把每個選項都看過一次並記錄。");
    }
    if (s2) {
      steps.push("再單獨動「" + s2.label + "」，比較它和「" + s1.label + "」哪一個影響比較大。");
    } else if (second) {
      steps.push("再看讀數「" + second.label + "」，確認它和「" + first.label + "」是不是同步變化。");
    }
    steps.push("用一句話寫下量到的關係：「＿＿變大時，「" + first.label + "」＿＿」。");
    PL.ui.procedure(host, {
      title: "怎麼做這個實驗",
      steps,
      rule: "一次只改一個變因；同時動兩個控制項，就分不出是哪一個造成讀數改變。"
    });
  });

  window.EarthLab = {
    ELEMENT_COLORS, MOLECULES, ROCK_COLORS,
    elementColor, rockColor, tempColor, phColor, mix, tintAlpha,
    scaffold, bench, scene,
    globe, earthCut, plateBoundary, rockLayers, taiwanMap,
    waveFronts, seismoPts, volcanoShape,
    stationModel, cloudShape, frontSymbol, typhoonSpiral, atmosphereBands,
    seaProfile, currentArrow,
    skyDome, starTrail, moonPhase, orbitEllipse, hrDiagram, galaxyShape, treeRings,
    sunIcon, compassRose,
    particleBox, molecule, moleculeByName,
    plot, badge, panel, arrow, legend, meter, counter,
    clamp, lerp, fmt: PL.fmt
  };
})();
