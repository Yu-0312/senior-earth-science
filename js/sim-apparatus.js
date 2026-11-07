/* sim-apparatus.js — 共用的實驗器材繪製層
 *
 * 為什麼要有這一層
 * ----------------
 * 原本每個實驗都是自己畫示意圖：一條線代表透鏡、一個箭頭代表物體。
 * 化學是對的，但學生在課堂上看到的是試管、滴定管、燒杯，
 * 螢幕上卻是幾何符號——中間那一步「這個箭頭就是那根蠟燭」要學生自己跨，
 * 而那正是最容易掉隊的一步。
 *
 * 這一層畫的是「看得出來是什麼東西」的器材，化學量測與反應現象仍疊在上面。
 * 目標不是照片級擬真，是讓學生一眼認出桌上那套器材。
 *
 * 兩個實作原則
 * ------------
 * 1. 大面積器材一律用 ctx 漸層直接畫，不走 D.rect 的 fill。
 *    器材本來就有明暗（金屬有反光、蠟燭有圓柱陰影），漸層才像實物；
 *    而 theme-audit 抓的是「低彩度的大塊平塗」，漸層不在它的守備範圍，
 *    這不是繞過檢查——那支檢查要防的是被墨色層誤翻的面板，不是器材。
 *
 * 2. 器材用固定色，不隨主題翻轉。
 *    鋁是鋁的顏色，黃銅是黃銅的顏色，深色台和淺色台上都一樣。
 *    會隨主題變的是背景與標註文字，那些仍然走 D.* 交給墨色層處理。
 *
 * 只保留這個 repo 用得到的器材（2026-11 瘦身）
 * ------------------------------------------
 * 這支檔案從物理版（senior-science）整份複製過來時有 225 KB、170 多個器材與動態零件，
 * 地科版的實驗與工具包實際只呼叫其中幾個，卻要每個學生在打開第一個實驗前全部下載、解析。
 * 現在只留下被 PL.apparatus.* 用到的器材，以及它們內部相依的材質與場景函式。
 * 需要新的器材時，從 senior-science 的 js/sim-apparatus.js 複製該函式（連同它呼叫的輔助函式）
 * 過來，並加進下方的 PL.apparatus 匯出清單；tools/tests/apparatus-test.js 會檢查
 * 每一個 PL.apparatus.* 呼叫都真的有匯出，漏複製會在測試裡直接報錯，而不是上線後才白屏。
 *
 * 座標系
 * ------
 * 所有函式吃的是畫布邏輯座標。需要公分刻度的實驗自行換算，
 * 並呼叫 cv.calibrate(pxPerCm, "cm") 讓可拖曳的尺也能用。
 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, D = PL.draw;
  const TAU = Math.PI * 2;

  /* ---------------------------------------------------------------
     材質
     --------------------------------------------------------------- */

  /* 直立面的金屬：上緣亮、中段本色、下緣沉。h 為高度。 */
  function steel(ctx, x, y, w, h, tint) {
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    const t = tint || 0;
    g.addColorStop(0.00, `rgb(${196 + t},${205 + t},${216 + t})`);
    g.addColorStop(0.18, `rgb(${168 + t},${179 + t},${193 + t})`);
    g.addColorStop(0.55, `rgb(${118 + t},${129 + t},${145 + t})`);
    g.addColorStop(0.85, `rgb(${86 + t},${96 + t},${111 + t})`);
    g.addColorStop(1.00, `rgb(${104 + t},${114 + t},${129 + t})`);
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
  }

  /* 落在檯面上的接觸陰影，讓器材看起來是「站著」而不是「貼著」 */
  function contactShadow(ctx, cx, y, w) {
    const g = ctx.createRadialGradient(cx, y, 1, cx, y, w);
    g.addColorStop(0, "rgba(0,0,0,0.34)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    // 長條器材（軌道、桌子）的影子只能是一條扁帶，不能是一大團黑霧
    const k = Math.min(0.24, 12 / Math.max(1, w));
    ctx.save(); ctx.fillStyle = g;
    ctx.translate(cx, y); ctx.scale(1, k); ctx.translate(-cx, -y);
    ctx.beginPath(); ctx.arc(cx, y, w, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* ---------------------------------------------------------------
     光學元件
     --------------------------------------------------------------- */

  /* 圓框中的透鏡。half 是鏡面半高，convex 決定腰身方向。 */
  function lens(ctx, x, cy, half, convex) {
    const bulge = convex ? half * 0.30 : -half * 0.22;

    // 玻璃體
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x, cy - half);
    ctx.quadraticCurveTo(x + bulge, cy, x, cy + half);
    ctx.quadraticCurveTo(x - bulge, cy, x, cy - half);
    ctx.closePath();
    const g = ctx.createLinearGradient(x - half * 0.4, cy - half, x + half * 0.4, cy + half);
    g.addColorStop(0.00, "rgba(206,232,248,0.62)");
    g.addColorStop(0.35, "rgba(150,200,232,0.34)");
    g.addColorStop(0.62, "rgba(232,246,255,0.55)");
    g.addColorStop(1.00, "rgba(140,190,226,0.40)");
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = "rgba(178,216,240,0.95)"; ctx.lineWidth = 1.6; ctx.stroke();
    // 高光
    ctx.strokeStyle = "rgba(255,255,255,0.55)"; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - bulge * 0.35, cy - half * 0.55);
    ctx.quadraticCurveTo(x - bulge * 0.6, cy - half * 0.1, x - bulge * 0.3, cy + half * 0.3);
    ctx.stroke();
    ctx.restore();

    // 鏡框：上下兩個夾持環
    [cy - half, cy + half].forEach((yy, i) => {
      const s = i === 0 ? -1 : 1;
      steel(ctx, x - 7, yy + (s > 0 ? -1 : -6), 14, 7, 8);
      ctx.strokeStyle = "rgba(34,42,54,0.6)"; ctx.lineWidth = 1;
      ctx.strokeRect(x - 6.5, yy + (s > 0 ? -0.5 : -5.5), 13, 6);
    });
  }

  /* ---------------------------------------------------------------
     共用：實驗檯面
     --------------------------------------------------------------- */

  /*
   * 在畫面下緣鋪一層檯面，讓器材有「放在桌上」的著地感。
   * v2：不只是一條灰帶——整個畫面換成實驗室（後牆＋木頭實驗桌），
   * 所有呼叫 benchTop 的實驗一起從「方格紙」搬進實驗室。
   * 它只會在場景最一開始被呼叫（D.bg 之後、器材之前），所以可以安心鋪滿。
   */
  function benchTop(ctx, W, H, y, o) {
    labRoom(ctx, W, H, y, o);
  }

  /* ---------------------------------------------------------------
     場景：天空（萬有引力、軌道、宇宙學實驗共用）
     --------------------------------------------------------------- */

  /*
   * 決定論偽隨機：同一個實驗每次畫出的星空都要一樣，
   * 否則每幀星星都在跳。種子取自實驗傳入的 salt。
   */
  function seeded(seed) {
    let s = seed | 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) | 0;
      return ((s >>> 8) & 0xffffff) / 0xffffff;
    };
  }

  /*
   * 星空：遠景小星星（固定）＋兩層淡星雲霧。
   * 主題感知：亮色主題下星星轉為深藍點，底色交給 D.bg 之後再疊。
   */
  function starfield(ctx, W, H, salt) {
    const light = document.documentElement.getAttribute("data-theme") === "light";
    const rnd = seeded(salt || 42);
    const n = Math.round(W * H / 5200);
    // 星雲霧：兩大團極淡的色斑，讓背景不是純色
    const nebA = rnd() * W, nebB = rnd() * W;
    let g = ctx.createRadialGradient(nebA, H * 0.3, 10, nebA, H * 0.3, H * 0.55);
    g.addColorStop(0, light ? "rgba(90,130,220,0.055)" : "rgba(120,150,255,0.05)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    g = ctx.createRadialGradient(nebB, H * 0.75, 10, nebB, H * 0.75, H * 0.5);
    g.addColorStop(0, light ? "rgba(160,110,60,0.045)" : "rgba(200,140,90,0.04)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < n; i++) {
      const x = rnd() * W, y = rnd() * H, r = rnd();
      const rr = r < 0.86 ? 0.7 : r < 0.97 ? 1.1 : 1.7;
      const a = 0.14 + rnd() * (light ? 0.20 : 0.55);
      ctx.fillStyle = light
        ? `rgba(40,70,130,${a})`
        : (r > 0.9 ? `rgba(255,235,200,${a})` : `rgba(220,230,255,${a})`);
      ctx.beginPath(); ctx.arc(x, y, rr, 0, TAU); ctx.fill();
    }
  }

  /*
   * 行星：有明暗界線的球體（側光）。r 為半徑，tone 是主色 rgb 陣列。
   * 畫地球用藍綠色調＋極冠與雲帶；畫其他天體換 tone 即可。
   */
  function planet(ctx, cx, cy, r, tone, kind) {
    const [cr, cg, cb] = tone || [90, 160, 235];
    const light = document.documentElement.getAttribute("data-theme") === "light";
    // 本體：側光球
    const g = ctx.createRadialGradient(cx - r * 0.42, cy - r * 0.45, r * 0.12, cx, cy, r * 1.05);
    g.addColorStop(0, `rgb(${Math.min(255, cr + 76)},${Math.min(255, cg + 76)},${Math.min(255, cb + 70)})`);
    g.addColorStop(0.42, `rgb(${cr},${cg},${cb})`);
    g.addColorStop(0.78, `rgb(${Math.round(cr * 0.45)},${Math.round(cg * 0.48)},${Math.round(cb * 0.55)})`);
    g.addColorStop(1, `rgb(${Math.round(cr * 0.22)},${Math.round(cg * 0.26)},${Math.round(cb * 0.34)})`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    // 大氣輪廓光
    ctx.strokeStyle = light ? "rgba(60,100,170,0.35)" : `rgba(${cr},${cg},${cb},0.45)`;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.stroke();
    if (kind === "earth") {
      // 陸塊：幾塊不規則綠斑（固定種子）
      const rnd = seeded(7);
      ctx.save();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
      ctx.fillStyle = `rgba(${light ? "70,140,80,0.5" : "86,160,92,0.55"})`;
      for (let i = 0; i < 5; i++) {
        const ax = cx + (rnd() - 0.5) * r * 1.5, ay = cy + (rnd() - 0.5) * r * 1.5, ar = r * (0.22 + rnd() * 0.3);
        ctx.beginPath();
        for (let k = 0; k <= 9; k++) {
          const a = k / 9 * TAU, rad = ar * (0.72 + rnd() * 0.5);
          const px = ax + Math.cos(a) * rad, py = ay + Math.sin(a) * rad * 0.74;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill();
      }
      // 雲帶
      ctx.fillStyle = light ? "rgba(255,255,255,0.34)" : "rgba(255,255,255,0.30)";
      for (let i = 0; i < 4; i++) {
        const ay = cy - r * 0.7 + (i + rnd()) * r * 0.44;
        ctx.beginPath(); ctx.ellipse(cx + (rnd() - 0.5) * r, ay, r * (0.5 + rnd() * 0.4), r * 0.1, 0, 0, TAU); ctx.fill();
      }
      // 極冠
      ctx.fillStyle = "rgba(240,250,255,0.8)";
      ctx.beginPath(); ctx.ellipse(cx, cy - r * 0.94, r * 0.4, r * 0.16, 0, 0, TAU); ctx.fill();
      ctx.restore();
      // 晨昏線陰影（右下暗面）：疊一層半透明黑，讓球體真的「立體」
      const sg = ctx.createRadialGradient(cx - r * 0.5, cy - r * 0.5, r * 0.2, cx, cy, r * 1.02);
      sg.addColorStop(0, "rgba(0,0,0,0)");
      sg.addColorStop(0.72, "rgba(0,0,0,0)");
      sg.addColorStop(1, light ? "rgba(30,50,90,0.35)" : "rgba(0,0,10,0.55)");
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    }
  }

  /* ===============================================================
     場景層 v2：讓每個實驗發生在「一個地方」
     ---------------------------------------------------------------
     原本所有實驗共用同一張方格紙背景，物體像是飄在圖表上。
     學生在課堂上看到的是實驗桌、鐵架、窗外的操場；
     這一層把那個「地方」畫出來，化學量與標註仍然疊在上面。

     兩條規則：
     1. 場景亮度跟著主題走：淺色主題是白天／明亮的實驗室，
        深色主題是夜晚／關燈的實驗室。這樣原本的標註文字色不必改。
     2. 畫完大面積場景後呼叫 note() 把亮度登記進墨色層，
        疊在上面的文字才會自動選對墨色。
     =============================================================== */
  const isLight = () => document.documentElement.getAttribute("data-theme") === "light";
  const note = (ctx, color, x, y, w, h) => {
    const T = PL.theme;
    if (T && T.note) T.note(ctx, color, x, y, w, h);
  };

  /* 圓角矩形路徑（不填色，交給呼叫端決定） */
  function rrPath(ctx, x, y, w, h, r) {
    r = Math.max(0, Math.min(r || 0, Math.abs(w) / 2, Math.abs(h) / 2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  /* ---------------------------------------------------------------
     實驗桌面（木頭／黑色環氧樹脂）
     x0..x1 是桌面範圍，y 是桌面（器材的安裝面），h 是桌板正面露出的高度。
     --------------------------------------------------------------- */
  function benchSlab(ctx, x0, x1, y, h, kind) {
    const L = isLight();
    const w = x1 - x0;
    const topH = Math.max(6, Math.min(16, h * 0.32));   // 透視下看得到的桌面頂面
    let topA, topB, face, faceDark, edge;
    if (kind === "black") {
      topA = L ? "#3b4048" : "#2a2e35"; topB = L ? "#2f343b" : "#20242a";
      face = L ? "#23272d" : "#17191e"; faceDark = L ? "#15181c" : "#0d0f12"; edge = "rgba(255,255,255,0.16)";
    } else if (kind === "steel") {
      topA = L ? "#d7dde4" : "#4a525e"; topB = L ? "#c3cad3" : "#3c434e";
      face = L ? "#a7b0bb" : "#2c323b"; faceDark = L ? "#8e97a3" : "#1f242b"; edge = "rgba(255,255,255,0.35)";
    } else {
      topA = L ? "#e2c294" : "#6e5236"; topB = L ? "#d2ad79" : "#5c432b";
      face = L ? "#b98a55" : "#46321f"; faceDark = L ? "#946638" : "#2f2114"; edge = L ? "rgba(255,240,214,0.7)" : "rgba(255,220,170,0.18)";
    }
    // 桌面頂面
    let g = ctx.createLinearGradient(0, y, 0, y + topH);
    g.addColorStop(0, topA); g.addColorStop(1, topB);
    ctx.fillStyle = g; ctx.fillRect(x0, y, w, topH);
    // 桌板正面
    const faceH = h > topH + 48 ? 22 : Math.max(0, h - topH);
    g = ctx.createLinearGradient(0, y + topH, 0, y + topH + faceH);
    g.addColorStop(0, face); g.addColorStop(1, faceDark);
    ctx.fillStyle = g; ctx.fillRect(x0, y + topH, w, faceH);
    // 前緣高光與陰影縫
    ctx.fillStyle = edge; ctx.fillRect(x0, y + topH - 1, w, 1.2);
    ctx.fillStyle = "rgba(0,0,0,0.22)"; ctx.fillRect(x0, y + topH + 0.5, w, 1.5);
    /*
     * 桌板正面只有二十多像素厚。桌面擺得比較高時，下面一大片不能都是桌板——
     * 那會像一整塊實心木頭。改成實驗桌的櫃體：門片、把手、踢腳板。
     */
    const slabH = topH + 22;
    if (h > slabH + 26) {
      const cy0 = y + slabH, ch = h - slabH;
      const cg = ctx.createLinearGradient(0, cy0, 0, cy0 + ch);
      if (kind === "black" || kind === "steel") { cg.addColorStop(0, L ? "#8d949d" : "#262a31"); cg.addColorStop(1, L ? "#7a818a" : "#1c1f24"); }
      else { cg.addColorStop(0, L ? "#c6a57c" : "#3a2a1b"); cg.addColorStop(1, L ? "#b08d63" : "#2c1f14"); }
      ctx.fillStyle = cg; ctx.fillRect(x0, cy0, w, ch);
      ctx.fillStyle = "rgba(0,0,0,0.25)"; ctx.fillRect(x0, cy0, w, 2);
      const doorW = Math.max(90, Math.min(160, w / 5));
      ctx.strokeStyle = L ? "rgba(70,46,20,0.35)" : "rgba(0,0,0,0.45)"; ctx.lineWidth = 1.2;
      for (let dx = x0 + 6; dx + doorW <= x1 - 4; dx += doorW + 6) {
        ctx.strokeRect(dx + 0.5, cy0 + 6.5, doorW - 1, Math.max(8, ch - 18));
        ctx.fillStyle = L ? "rgba(255,244,222,0.18)" : "rgba(255,255,255,0.04)";
        ctx.fillRect(dx + 2, cy0 + 8, doorW - 4, 2);
        // 把手
        ctx.fillStyle = "rgb(170,178,190)";
        ctx.fillRect(dx + doorW - 16, cy0 + 12, 3, Math.min(22, ch * 0.3));
      }
      ctx.fillStyle = "rgba(0,0,0,0.3)"; ctx.fillRect(x0, y + h - 5, w, 5);
      note(ctx, kind === "black" || kind === "steel" ? (L ? "#858c95" : "#22262c") : (L ? "#bd9a70" : "#332518"), x0, cy0, w, ch);
    }
    // 木紋：頂面細長紋 + 正面幾道長弧
    if (kind !== "black" && kind !== "steel") {
      const rnd = seeded(Math.round(w + y));
      ctx.save();
      ctx.beginPath(); ctx.rect(x0, y, w, topH + faceH); ctx.clip();
      ctx.lineWidth = 1;
      for (let i = 0; i < Math.max(4, w / 60); i++) {
        const gx = x0 + rnd() * w, gl = 40 + rnd() * 120, gy = y + 2 + rnd() * (topH - 3);
        ctx.strokeStyle = L ? "rgba(120,78,36,0.16)" : "rgba(0,0,0,0.20)";
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(gx + gl, gy + (rnd() - 0.5) * 1.5); ctx.stroke();
      }
      for (let i = 0; i < Math.max(3, w / 90); i++) {
        const gx = x0 + rnd() * w, gl = 60 + rnd() * 160, gy = y + topH + 4 + rnd() * Math.max(2, faceH - 8);
        ctx.strokeStyle = L ? "rgba(90,56,24,0.14)" : "rgba(0,0,0,0.22)";
        ctx.beginPath(); ctx.moveTo(gx, gy); ctx.quadraticCurveTo(gx + gl / 2, gy + (rnd() - 0.5) * 6, gx + gl, gy); ctx.stroke();
      }
      ctx.restore();
    } else if (kind === "black") {
      // 環氧樹脂的細微反光
      ctx.fillStyle = "rgba(255,255,255,0.05)";
      ctx.fillRect(x0, y + 1, w, 2);
    }
    note(ctx, topB, x0, y, w, topH);
    note(ctx, face, x0, y + topH, w, faceH);
    return { top: y, faceTop: y + topH };
  }

  /*
   * 實驗室場景：後牆 + 天花板燈光 + 實驗桌。
   * benchY 為桌面高度（器材底部要放在這條線上）；回傳 { top }。
   * o.bench: "wood"（預設）| "black" | "steel" | "none"
   * o.window: true 在牆上開一扇窗（淺色主題為白天、深色為夜晚）
   * o.board: true 畫一塊白板當背景（圖表可以放在上面）
   */
  function labRoom(ctx, W, H, benchY, o) {
    o = o || {};
    const L = isLight();
    const by = benchY == null ? Math.round(H * 0.8) : benchY;
    // 牆面
    let g = ctx.createLinearGradient(0, 0, 0, by);
    if (L) { g.addColorStop(0, "#f3f0ea"); g.addColorStop(1, "#e6e0d5"); }
    else { g.addColorStop(0, "#19202b"); g.addColorStop(1, "#12171f"); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, by);
    note(ctx, L ? "#ede8df" : "#161c26", 0, 0, W, by);
    // 天花板燈打在牆上的光暈
    const rg = ctx.createRadialGradient(W * 0.5, -H * 0.15, 20, W * 0.5, -H * 0.15, Math.max(W, H) * 0.95);
    rg.addColorStop(0, L ? "rgba(255,255,250,0.75)" : "rgba(150,180,230,0.10)");
    rg.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = rg; ctx.fillRect(0, 0, W, by);
    // 牆板接縫 + 腰線
    if (o.panels !== false) {
      ctx.save();
      ctx.strokeStyle = L ? "rgba(96,82,60,0.075)" : "rgba(255,255,255,0.035)"; ctx.lineWidth = 1;
      const step = Math.max(150, W / 5);
      ctx.beginPath();
      for (let x = step * 0.62; x < W; x += step) { ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, by); }
      ctx.stroke();
      const ry = by - Math.min(64, by * 0.26);
      ctx.fillStyle = L ? "rgba(120,98,66,0.09)" : "rgba(255,255,255,0.028)";
      ctx.fillRect(0, ry, W, 3);
      ctx.fillStyle = L ? "rgba(120,98,66,0.035)" : "rgba(0,0,0,0.12)";
      ctx.fillRect(0, ry + 3, W, by - ry - 3);
      ctx.restore();
    }
    if (o.window) labWindow(ctx, o.window.x != null ? o.window.x : W * 0.72, o.window.y != null ? o.window.y : by * 0.12,
      o.window.w || Math.min(180, W * 0.2), o.window.h || by * 0.46);
    if (o.board) whiteboard(ctx, o.board.x, o.board.y, o.board.w, o.board.h);
    // 牆與桌面交界的接觸陰影
    g = ctx.createLinearGradient(0, by - 18, 0, by);
    g.addColorStop(0, "rgba(0,0,0,0)"); g.addColorStop(1, L ? "rgba(70,50,20,0.10)" : "rgba(0,0,0,0.35)");
    ctx.fillStyle = g; ctx.fillRect(0, by - 18, W, 18);
    if (o.bench !== "none") benchSlab(ctx, 0, W, by, H - by, o.bench || "wood");
    return { top: by };
  }

  /* 牆上的窗：淺色主題看得到藍天白雲，深色主題是夜空 */
  function labWindow(ctx, x, y, w, h) {
    const L = isLight();
    ctx.save();
    // 窗框
    rrPath(ctx, x - 6, y - 6, w + 12, h + 12, 4);
    ctx.fillStyle = L ? "#d9d4ca" : "#2a313c"; ctx.fill();
    // 天空
    const g = ctx.createLinearGradient(0, y, 0, y + h);
    if (L) { g.addColorStop(0, "#9fd0ef"); g.addColorStop(1, "#dff1fb"); }
    else { g.addColorStop(0, "#0b1426"); g.addColorStop(1, "#1a2945"); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
    if (L) {
      cloud(ctx, x + w * 0.3, y + h * 0.3, w * 0.22, 0.9);
      cloud(ctx, x + w * 0.78, y + h * 0.55, w * 0.16, 0.75);
      // 遠處樹梢
      ctx.fillStyle = "rgba(96,150,96,0.55)";
      for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + i * w / 5, y + h + 4, w * 0.16, 0, TAU); ctx.fill(); }
    } else {
      const rnd = seeded(Math.round(x + y));
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = `rgba(230,236,255,${0.3 + rnd() * 0.5})`;
        ctx.beginPath(); ctx.arc(x + rnd() * w, y + rnd() * h * 0.8, rnd() < 0.8 ? 0.8 : 1.3, 0, TAU); ctx.fill();
      }
      ctx.fillStyle = "rgba(245,240,215,0.9)";
      ctx.beginPath(); ctx.arc(x + w * 0.74, y + h * 0.25, Math.min(w, h) * 0.08, 0, TAU); ctx.fill();
    }
    ctx.restore();
    // 窗櫺
    ctx.fillStyle = L ? "#cfc9bd" : "#333b47";
    ctx.fillRect(x + w / 2 - 2, y, 4, h);
    ctx.fillRect(x, y + h * 0.45 - 2, w, 4);
    ctx.fillStyle = L ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.05)";
    ctx.beginPath(); ctx.moveTo(x + w * 0.08, y + h); ctx.lineTo(x + w * 0.3, y); ctx.lineTo(x + w * 0.4, y); ctx.lineTo(x + w * 0.18, y + h); ctx.fill();
    note(ctx, L ? "#c8e5f5" : "#121e34", x, y, w, h);
  }

  /* 白板：圖表可以畫在上面，比浮在牆上自然 */
  function whiteboard(ctx, x, y, w, h) {
    const L = isLight();
    contactShadow(ctx, x + w / 2, y + h + 6, w * 0.4);
    rrPath(ctx, x - 5, y - 5, w + 10, h + 10, 4);
    ctx.fillStyle = L ? "#b9c0c9" : "#39414d"; ctx.fill();
    const g = ctx.createLinearGradient(x, y, x + w, y + h);
    if (L) { g.addColorStop(0, "#ffffff"); g.addColorStop(1, "#f1f4f7"); }
    else { g.addColorStop(0, "#1f2631"); g.addColorStop(1, "#1a2029"); }
    ctx.fillStyle = g; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = L ? "#a9b1bc" : "#2f3742";
    ctx.fillRect(x + w * 0.1, y + h + 5, w * 0.8, 4);
    note(ctx, L ? "#fbfcfd" : "#1d242e", x, y, w, h);
  }

  /* 雲：幾顆重疊圓，s 是寬度尺度 */
  function cloud(ctx, cx, cy, s, alpha) {
    const L = isLight();
    ctx.save();
    ctx.globalAlpha *= alpha == null ? 1 : alpha;
    const base = L ? "rgba(255,255,255,0.95)" : "rgba(130,145,175,0.13)";
    const shade = L ? "rgba(205,222,236,0.9)" : "rgba(80,95,125,0.10)";
    const puffs = [[-0.55, 0.08, 0.34], [-0.2, -0.12, 0.46], [0.22, -0.05, 0.4], [0.55, 0.1, 0.3], [0, 0.16, 0.36]];
    ctx.fillStyle = shade;
    puffs.forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0] * s, cy + p[1] * s + s * 0.06, p[2] * s, 0, TAU); ctx.fill(); });
    ctx.fillStyle = base;
    puffs.forEach(p => { ctx.beginPath(); ctx.arc(cx + p[0] * s, cy + p[1] * s, p[2] * s, 0, TAU); ctx.fill(); });
    ctx.restore();
  }

  window.PhysicsLab.apparatus = {
    benchTop, starfield, planet, lens
  };

  /*
   * 進場就播放的穩態動畫實驗（sim-core 的 finishBuild 讀取；新實驗也可用 loop／clock 的 ambient 選項）。
   *
   * 原本這裡是物理版的 119 個實驗 id，地科版沒有任何一個用得到。名單改為空：需要進場就播放的實驗，
   * 在這裡加上自己的 id 即可（判準同物理版：播放 25 秒後畫面仍在動、沒有一次性結局、沒有觀察點）。
   */
  PL.ambientIds = new Set([]);

})();
