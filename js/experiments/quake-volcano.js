/* 模組三 · 地震與火山 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  // 點到線段距離(S 波射線是否被液體袋擋住)
  function segDist(x1, y1, x2, y2, px, py) {
    const dx = x2 - x1, dy = y2 - y1, L2 = dx * dx + dy * dy || 1;
    const f = clamp(((px - x1) * dx + (py - y1) * dy) / L2, 0, 1);
    return Math.hypot(px - (x1 + dx * f), py - (y1 + dy * f));
  }

  /* 地震波:P 波、S 波與表面波 */
  PL.register("earthquake-waves", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const surf = CK.scene(ui.cv, { kind: "underground", horizon: 0.18 }).surface;
          const tt = timeS.get(), dep = depS.get(), liq = liqChk.get(), vP = 6.5, vS = 3.7;
          const pxKm = Math.min(W * 0.8 / 42, (H - surf - 18) / 26), ex = W * 0.16, sx = W * 0.86, ey = surf + dep * pxKm;
          CK.waveFronts(ctx, ex, ey, vP * tt * pxKm, vS * tt * pxKm, { gapP: 34, gapS: 24 }); // P 細藍環快、S 粗紅環慢
          // 岩漿庫(液體):畫在波前之上,S 波被擋、P 波照穿
          const lx = W * 0.52, ly = surf + (H - surf) * 0.45, lr = H * 0.115;
          if (liq) {
            const g = ctx.createRadialGradient(lx - lr * 0.3, ly - lr * 0.3, lr * 0.2, lx, ly, lr);
            g.addColorStop(0, "rgba(255,145,90,0.92)"); g.addColorStop(1, "rgba(196,66,38,0.88)");
            D.disc(ctx, lx, ly, lr, { fill: g });
            D.text(ctx, "岩漿庫（液體）", lx, ly + 4, { color: "#fff", size: 10.5, align: "center", weight: "700" });
          }
          // 表面波:沿地表行進、振幅最大
          const sw = vS * tt * pxKm - (sx - ex);
          if (sw > 0) {
            const a = clamp(sw / 130, 0, 1) * 8;
            ctx.save(); ctx.strokeStyle = "#ffb300"; ctx.lineWidth = 2.2; ctx.beginPath();
            for (let x = ex; x <= sx; x += 4) {
              const y = surf - Math.sin((x - ex) * 0.09 + t * 6) * a * Math.sin((x - ex) / (sx - ex) * Math.PI);
              x === ex ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke(); ctx.restore();
            D.text(ctx, "表面波：最晚到、搖最兇", (ex + sx) / 2, surf - 14, { color: "#ffb300", size: 10, align: "center" });
          }
          ctx.save(); ctx.fillStyle = "#e8eef7"; // 測站三角
          ctx.beginPath(); ctx.moveTo(sx, surf - 13); ctx.lineTo(sx - 7, surf); ctx.lineTo(sx + 7, surf); ctx.closePath(); ctx.fill(); ctx.restore();
          D.text(ctx, "測站", sx, surf + 13, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "震源 深度 " + dep + " km", ex - 8, ey + 4, { color: PL.col("text-dim"), size: 10, align: "right" });
          // 質點運動小圖:縱波 vs 橫波
          const mini = (mx, title, mode) => {
            D.rect(ctx, mx, 8, W * 0.17, 46, { fill: PL.theme.shade(0.35), stroke: PL.col("border"), r: 6 });
            D.text(ctx, title, mx + W * 0.085, 20, { color: PL.col("text-dim"), size: 9.5, align: "center" });
            for (let i = 0; i < 5; i++)
              D.disc(ctx, mx + 14 + i * W * 0.033 + (mode === "P" ? Math.sin(t * 7 + i * 1.7) * 4 : 0), 36 + (mode === "P" ? 0 : Math.sin(t * 5 + i * 1.3) * 7),
                3.2, { fill: mode === "P" ? "#5c91dc" : "#ef5350" });
          };
          mini(W * 0.56, "P 縱波：疏密前進", "P"); mini(W * 0.76, "S 橫波：上下搖晃", "S");
          CK.panel(ctx, W * 0.64, H * 0.26, W * 0.32, H * 0.40, "地殼中波速（約）");
          CK.legend(ctx, W * 0.67, H * 0.34, [
            { color: "#5c91dc", label: "P 波 ≈ 6.5 km/s(最先到)" }, { color: "#ef5350", label: "S 波 ≈ 3.7 km/s(次之)" },
            { color: "#ffb300", label: "表面波 < 3.5 km/s(最晚)" }], 20);
          D.text(ctx, "vP ≈ 1.7 × vS；波速差就是定位的鑰匙", W * 0.80, H * 0.60, { color: PL.col("text-faint"), size: 10, align: "center" });
          const dSrc = Math.hypot((sx - ex) / pxKm, dep), tP = dSrc / vP, tS = dSrc / vS;
          const blocked = liq && segDist(ex, ey, sx, surf, lx, ly) < lr * 0.92;
          if (blocked) CK.badge(ctx, sx - 6, surf - 26, "S 波被液體阻擋！", "#c0392b");
          rPw.set(vP * tt, 1); rSw.set(vS * tt, 1);
          rTP.set(tt >= tP ? "已到達" : PL.fmt(tP, 1) + " s 後"); rTS.set(blocked ? "被岩漿庫阻擋" : (tt >= tS ? "已到達" : PL.fmt(tS, 1) + " s 後"));
        }
      });
      const timeS = PL.ui.slider(ui.L.controls, { label: "地震經過時間", min: 0, max: 14, step: 0.2, value: 3, unit: "s", digits: 1 });
      const depS = PL.ui.slider(ui.L.controls, { label: "震源深度", min: 8, max: 26, step: 1, value: 14, unit: "km", digits: 0 });
      const liqChk = PL.ui.checkbox(ui.L.controls, { label: "射線上有岩漿庫（液體）", checked: false });
      const waveCv = ui.chart("波前半徑怎麼長出來", "P 波每秒多跑 2.8 km：時間越久，藍紅兩圈距離拉得越開。");
      function drawChart() {
        if (waveCv.W < 60) return;
        const g = PL.graph(waveCv, { x: 44, y: 14, w: waveCv.W - 58, h: waveCv.H - 44 }, { x0: 0, x1: 14, y0: 0, y1: 95 });
        g.frame({ xlabel: "經過時間 (s)", ylabel: "半徑 (km)" }); g.grid(7, 4);
        g.fn(x => 6.5 * x, { color: "#5c91dc", width: 2.2 }); g.fn(x => 3.7 * x, { color: "#ef5350", width: 2.2 });
        g.dot(timeS.get(), 6.5 * timeS.get(), { color: "#5c91dc" }); g.dot(timeS.get(), 3.7 * timeS.get(), { color: "#ef5350" });
      }
      waveCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      PL.ui.note(ui.L.controls, "P 波以擠壓的方式前進，最快、最先到；S 波左右搖晃，比較慢；表面波沿地表跑，振幅最大、破壞最強。三種波的速度差，就是用來定位震央的依據。");
      PL.ui.procedure(ui.L.controls, {
        title: "看懂三種波",
        steps: ["拉「地震經過時間」：藍環(P)永遠跑在紅環(S)前面。", "把經過時間拉到 10 s 以上：黃色表面波掃過測站。",
          "勾選岩漿庫：射線穿過液體時,S 波消失、P 波照傳。", "改變震源深度：到達時間讀數跟著變。"],
        rule: "S 波無法通過液體，外核是液態就是這樣推出來的。順序不要背反：P 先到、S 後到，表面波最後到、也最強。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "淺層強震", apply: () => { timeS.set(6); depS.set(8); liqChk.set(false); ui.redraw(); drawChart(); } },
        { label: "深層地震", apply: () => { timeS.set(9); depS.set(26); liqChk.set(false); ui.redraw(); drawChart(); } },
        { label: "射線過岩漿庫", apply: () => { timeS.set(5); depS.set(20); liqChk.set(true); ui.redraw(); drawChart(); } }
      ] });
      const rPw = PL.ui.readout(ui.L.readouts, { label: "P 波波前半徑", unit: "km" });
      const rSw = PL.ui.readout(ui.L.readouts, { label: "S 波波前半徑", unit: "km" });
      const rTP = PL.ui.readout(ui.L.readouts, { label: "P 波到達測站" });
      const rTS = PL.ui.readout(ui.L.readouts, { label: "S 波到達測站" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 震央定位:S–P 時差法 */
  PL.register("epicenter-locate", {
    build(root) {
      const ST = [{ name: "台中", lon: 120.68, lat: 24.15, color: "#5c91dc" }, { name: "花蓮", lon: 121.60, lat: 23.98, color: "#ef5350" }, { name: "高雄", lon: 120.31, lat: 22.62, color: "#66bb6a" }];
      const SCEN = [{ key: "921", name: "921 集集", lon: 120.83, lat: 23.86 }, { key: "chiayi", name: "嘉義陸上", lon: 120.55, lat: 23.52 }, { key: "tainan", name: "台南近海", lon: 120.22, lat: 23.05 }];
      // 統一度量:1° 緯度 111 km、1° 經度 101 km(緯 24° 附近),與地圖縮尺一致
      const kmXY = p => [p.lon * 101, p.lat * 111], kmDist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mw = Math.min(W * 0.42, H * 0.78 / 1.625), box = { x: W * 0.06, y: H * 0.12, w: mw, h: mw * 1.625 };
          const pxKm = box.h / 411, dts = [d1S.get(), d2S.get(), d3S.get()];
          const proj = CK.taiwanMap(ctx, box, { markers: ST.map(s => ({ lon: s.lon, lat: s.lat, label: s.name, color: s.color })) });
          const sp = ST.map(s => proj(s.lon, s.lat));
          ctx.save();
          ctx.beginPath(); ctx.rect(box.x - 14, box.y - 14, box.w + 28, box.h + 28); ctx.clip();
          ST.forEach((s, i) => {   // 距離圈:d ≈ 8 × Δt
            const r = dts[i] * 8 * pxKm;
            ctx.beginPath(); ctx.arc(sp[i][0], sp[i][1], r, 0, TAU);
            ctx.strokeStyle = s.color; ctx.lineWidth = 2; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]);
            D.text(ctx, s.name + " " + Math.round(dts[i] * 8) + " km", sp[i][0], sp[i][1] - r - 5, { color: s.color, size: 9.5, align: "center" });
          });
          ctx.restore();
          // 網格搜尋最佳交會點(殘差 = 三圈距離差總和)
          let best = [box.x + box.w / 2, box.y + box.h / 2], bd = 1e9;
          for (let gy = 0; gy <= 46; gy++) for (let gx = 0; gx <= 46; gx++) {
            const px = box.x + box.w * gx / 46, py = box.y + box.h * gy / 46;
            let res = 0;
            ST.forEach((s, i) => { res += Math.abs(Math.hypot(px - sp[i][0], py - sp[i][1]) / pxKm - dts[i] * 8); });
            if (res < bd) { bd = res; best = [px, py]; }
          }
          const ok = bd < 10;
          D.ring(ctx, best[0], best[1], 9, ok ? "#ff8a65" : PL.col("text-faint"), 2.4);
          if (ok) CK.badge(ctx, best[0], best[1] - 20, "震央鎖定！", "#ff8a65");
          else D.text(ctx, "候選點(誤差 " + Math.round(bd) + " km)", best[0], best[1] - 18, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.panel(ctx, W * 0.52, H * 0.14, W * 0.42, H * 0.60, "定位四步驟");
          ["1. 讀出各站的 S–P 時差 Δt", "2. 換成距離:d ≈ 8 × Δt (km)", "3. 以測站為圓心畫距離圈", "4. 三圈交會的唯一點 = 震央"].forEach((s, i) =>
            D.text(ctx, s, W * 0.55, H * 0.22 + i * 26, { color: PL.col("text-dim"), size: 11 }));
          D.text(ctx, "單站一圈、兩站兩解，三站才唯一。", W * 0.73, H * 0.55, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "地震預警：測站先收到 P 波的幾秒，就是搶來的避難時間。", W * 0.73, H * 0.63, { color: PL.col("accent"), size: 10, align: "center" });
          rD1.set(dts[0] * 8, 0); rD2.set(dts[1] * 8, 0); rD3.set(dts[2] * 8, 0);
          rErr.set(Math.round(bd), 0);
          vd.set(ok ? "三圈交會：震央鎖定" : bd < 25 ? "接近交會，再微調時差" : "三圈無共點：時差讀取有誤", ok ? "ok" : bd < 25 ? "warn" : "bad");
        }
      });
      const d1S = PL.ui.slider(ui.L.controls, { label: "台中 S–P 時差", min: 0.5, max: 20, step: 0.1, value: 8, unit: "s", digits: 1 });
      const d2S = PL.ui.slider(ui.L.controls, { label: "花蓮 S–P 時差", min: 0.5, max: 20, step: 0.1, value: 8, unit: "s", digits: 1 });
      const d3S = PL.ui.slider(ui.L.controls, { label: "高雄 S–P 時差", min: 0.5, max: 20, step: 0.1, value: 8, unit: "s", digits: 1 });
      const applyScen = key => {
        const ek = kmXY(SCEN.find(s => s.key === key));
        [d1S, d2S, d3S].forEach((s, i) => s.set(Math.round(kmDist(ek, kmXY(ST[i])) / 8 * 10) / 10));
        ui.redraw();
      };
      const scenSel = PL.ui.select(ui.L.controls, { label: "地震情境", value: "921", options: SCEN.map(s => ({ value: s.key, label: s.name })), onChange: applyScen });
      PL.ui.note(ui.L.controls, "S 波與 P 波到達的時間差與距離成正比:d ≈ 8Δt。單站只能畫一圈，三圈交會才鎖定震央；地震預警也是靠快速讀 P 波搶時間。");
      PL.ui.procedure(ui.L.controls, {
        title: "當一回定位員",
        steps: ["選一個地震情境：三站時差自動填入正確值，三圈交會於一點。", "把「台中 S–P 時差」加 2 秒：距離圈變大，交會點跑掉。",
          "把時差全改成 3 秒亂猜：三圈完全無法共點。", "結論：時差讀得越準，震央鎖得越緊。"],
        rule: "兩站兩圈會交在兩個點、仍然有兩解；考題常問「為什麼至少要三個測站」：第三個圈可以排除其中一個解。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "自動對時（正確）", apply: () => applyScen(scenSel.get()) },
        { label: "台中多讀 2 秒", apply: () => { d1S.set(Math.round((d1S.get() + 2) * 10) / 10); ui.redraw(); } },
        { label: "全部亂猜 3 秒", apply: () => { d1S.set(3); d2S.set(3); d3S.set(3); ui.redraw(); } }
      ] });
      const rD1 = PL.ui.readout(ui.L.readouts, { label: "台中震距", unit: "km" });
      const rD2 = PL.ui.readout(ui.L.readouts, { label: "花蓮震距", unit: "km" });
      const rD3 = PL.ui.readout(ui.L.readouts, { label: "高雄震距", unit: "km" }); const rErr = PL.ui.readout(ui.L.readouts, { label: "交會誤差", unit: "km" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "—" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 地震規模與震度 */
  PL.register("magnitude-intensity", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const M = mS.get(), dist = dS.get(), soft = siteSel.get() === "soft";
          const ic = clamp(1.15 * M + 2.0 - 3.0 * Math.log10(dist) + (soft ? 0.7 : 0), 0, 7.99);
          const iLab = k => { const f = Math.floor(k); return f >= 7 ? "7 級" : f < 5 ? f + " 級" : (k - f >= 0.5 ? f + " 強" : f + " 弱"); };
          // 震度分區:由內到外畫 5/4/3/2 級邊界
          const ex = W * 0.14, cy = H * 0.52, pxKm = W * 0.68 / 300, adj = soft ? 0.7 : 0;
          [2, 3, 4, 5].forEach(k => {
            const r = Math.pow(10, (1.15 * M + 2.0 + adj - k) / 3) * pxKm;
            if (r < 6 || r > W * 0.78) return;
            D.ring(ctx, ex, cy, r, CK.tempColor(1 - k / 7), 2, [6, 5]);
            D.text(ctx, k + " 級界線", ex + r * 0.72, cy - r * 0.72, { color: PL.col("text-faint"), size: 9.5 });
          });
          D.disc(ctx, ex, cy, 7, { fill: "#ff5722", glow: "#ff5722", glowSize: 12 });
          D.text(ctx, "震央(規模 " + M.toFixed(1) + ",全台只有一個值)", ex, cy + 24, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          const stx = ex + dist * pxKm;
          D.disc(ctx, stx, cy, 6, { fill: "#5c91dc", stroke: "#fff", width: 1.2 });
          D.text(ctx, "你的測站", stx, cy - 16, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.badge(ctx, stx, cy + 22, "震度 " + iLab(ic), CK.tempColor(ic / 7));
          if (soft) D.text(ctx, "軟弱沖積層：震度放大（場址效應）", stx, cy + 40, { color: PL.col("warn"), size: 9.5, align: "center" });
          CK.panel(ctx, W * 0.62, H * 0.14, W * 0.32, H * 0.52, "規模 → 釋放能量（對數尺度）");
          [["M4(基準)", "1×"], ["M5", "32×"], ["M6", "約 1000×"], ["M7", "約 3.2 萬×"], ["M8", "約 105 萬×"]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.65, H * 0.22 + i * 26, { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, r[1], W * 0.91, H * 0.22 + i * 26, { color: i ? PL.col("accent") : PL.col("text"), size: 11.5, align: "right" });
          });
          D.text(ctx, "規模差 1，能量差 32 倍，不是 2 倍。", W * 0.78, H * 0.62, { color: PL.col("text-faint"), size: 10, align: "center" });
          rI.set("震度 " + iLab(ic)); rE.set(Math.pow(32, M - 4), 0); rR4.set(Math.round(Math.pow(10, (1.15 * M + 2.0 + adj - 4) / 3)), 0);
          vd.set(ic >= 6 ? "劇烈搖晃：注意落物與建築損壞" : ic >= 4 ? "明顯搖晃：多數人驚醒恐慌" : "輕微：多數人無感或微搖", ic >= 6 ? "bad" : ic >= 4 ? "warn" : "ok");
        }
      });
      const mS = PL.ui.slider(ui.L.controls, { label: "地震規模 M", min: 4, max: 8, step: 0.1, value: 6.2, digits: 1 });
      const dS = PL.ui.slider(ui.L.controls, { label: "測站震央距離", min: 10, max: 300, step: 5, value: 60, unit: "km", digits: 0 });
      const siteSel = PL.ui.select(ui.L.controls, { label: "測站地盤", value: "rock", options: [{ value: "rock", label: "堅硬岩盤" }, { value: "soft", label: "軟弱沖積層" }] });
      const magCv = ui.chart("震度怎麼隨距離衰減", "同一個地震：曲線只有一條，但每個距離讀到的震度都不同。");
      function drawChart() {
        if (magCv.W < 60) return;
        const M = mS.get(), soft = siteSel.get() === "soft", dist = dS.get();
        const icAt = d => clamp(1.15 * M + 2.0 - 3.0 * Math.log10(d) + (soft ? 0.7 : 0), 0, 7.99);
        const g = PL.graph(magCv, { x: 44, y: 14, w: magCv.W - 58, h: magCv.H - 44 }, { x0: 10, x1: 300, y0: 0, y1: 8 });
        g.frame({ xlabel: "震央距離 (km)", ylabel: "震度（連續）" }); g.grid(5, 4);
        g.fn(icAt, { color: PL.col("accent"), width: 2.4 });
        g.dot(dist, icAt(dist), { color: PL.col("accent-2") });
      }
      magCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "規模衡量地震釋放的能量總量，一次地震只有一個值，且是對數尺度；震度描述各地搖晃程度，隨距離與地質而變；台灣震度分 10 級（5、6 各分弱強）。");
      PL.ui.procedure(ui.L.controls, {
        title: "規模 vs 震度",
        steps: ["固定規模，把距離從 10 km 拉到 300 km：震度讀數一路下降。", "規模從 6.0 加到 7.0：能量讀數變 32 倍，震度只升 1 級左右。",
          "切到軟弱沖積層：同一距離震度被放大，這就是場址效應。"],
        rule: "常見的錯誤說法：「規模 5 的地震在我家是 3 級」。規模屬於震源，震度屬於地點，兩者不能混用。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "921 集集(M7.3)", apply: () => { mS.set(7.3); dS.set(30); siteSel.set("soft"); ui.redraw(); drawChart(); } },
        { label: "小淺震(M4.8)", apply: () => { mS.set(4.8); dS.set(25); siteSel.set("rock"); ui.redraw(); drawChart(); } },
        { label: "深而遠(M6.8)", apply: () => { mS.set(6.8); dS.set(220); siteSel.set("rock"); ui.redraw(); drawChart(); } }
      ] });
      const rI = PL.ui.readout(ui.L.readouts, { label: "測站震度" });
      const rE = PL.ui.readout(ui.L.readouts, { label: "能量（相對 M4）", unit: "×" }); const rR4 = PL.ui.readout(ui.L.readouts, { label: "震度 4 級半徑", unit: "km" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "—" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 地震儀與波形判讀 */
  PL.register("seismograph", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const dtp = dtpS.get(), amp = ampS.get(), f = siteSel.get() === "soft" ? 2.6 : 1;
          // 地面 + 儀器座 + 慣性擺錘
          const gy = H * 0.60, jig = Math.sin(t * 9) * 1.6 * amp * f;
          D.rect(ctx, W * 0.05, gy + jig * 0.4, W * 0.42, 8, { fill: PL.col("border") });
          D.text(ctx, "地面（正在振動）", W * 0.26, gy + 22, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          const fx = W * 0.12, fw = W * 0.24, fh = H * 0.30;
          D.rect(ctx, fx, gy - 14 - fh, fw, fh, { fill: PL.theme.shade(0.45), stroke: PL.col("border"), r: 6 });
          const px = fx + fw / 2, py = gy - 20 - fh + 16;
          const th = Math.sin(t * 7.3) * 0.22 * amp * f + Math.sin(t * 13.7) * 0.05;
          const bx = px + Math.sin(th) * fh * 0.62, by = py + Math.cos(th) * fh * 0.62;
          D.line(ctx, px, py, bx, by, PL.col("accent"), 2.2);
          D.disc(ctx, px, py, 4, { fill: PL.col("text-dim") });
          D.disc(ctx, bx, by, 8, { fill: "#ff8a65", glow: "#ff5722", glowSize: 8 });
          D.text(ctx, "擺錘（慣性，幾乎不動）", fx + fw / 2, gy - 6 - fh, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          // 記錄滾筒:紙捲動、筆針貼著
          const dx = W * 0.40, dy = gy - 60;
          ctx.save();
          ctx.translate(dx, dy); ctx.rotate(0.06);
          D.rect(ctx, -14, -34, 28, 68, { fill: "#efe8d8", stroke: PL.col("border"), r: 4 });
          ctx.strokeStyle = "rgba(90,80,60,0.5)"; ctx.lineWidth = 1;
          for (let k = 0; k < 7; k++) {
            const yy = -30 + ((k * 10 + t * 24) % 64);
            ctx.beginPath(); ctx.moveTo(-11, yy); ctx.lineTo(11, yy); ctx.stroke();
          }
          ctx.restore();
          D.line(ctx, bx + 4, by, dx - 16, dy, PL.col("accent-2"), 1.4);
          D.text(ctx, "記錄滾筒", dx, dy + 46, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.panel(ctx, W * 0.54, H * 0.14, W * 0.40, H * 0.52, "波形判讀");
          [["P 波到時", "10.0 s"], ["S 波到時", (10 + dtp).toFixed(1) + " s"], ["S–P 時差 Δt", dtp.toFixed(1) + " s"],
            ["換算震距 d ≈ 8Δt", Math.round(dtp * 8) + " km"], ["相對振幅 A", "約 " + Math.round(amp * f * 23) + " mm"]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.57, H * 0.22 + i * 27, { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, r[1], W * 0.91, H * 0.22 + i * 27, { color: i >= 3 ? PL.col("accent") : PL.col("text"), size: 11.5, align: "right" });
          });
          D.text(ctx, "M = log A + 距離校正項（振幅越大能量越大）", W * 0.74, H * 0.60, { color: PL.col("text-faint"), size: 10, align: "center" });
          rDtp.set(dtp, 1); rDist.set(dtp * 8, 0); rAmp.set(amp * f * 23, 0);
          rSite.set(f > 1 ? "軟弱沖積層：振幅 ×2.6" : "堅硬岩盤：振幅 ×1.0");
        }
      });
      const dtpS = PL.ui.slider(ui.L.controls, { label: "S–P 時差", min: 2, max: 15, step: 0.5, value: 6, unit: "s", digits: 1 });
      const ampS = PL.ui.slider(ui.L.controls, { label: "波形振幅倍率", min: 0.2, max: 1.5, step: 0.05, value: 0.7, unit: "×", digits: 2 });
      const siteSel = PL.ui.select(ui.L.controls, { label: "測站場址", value: "rock", options: [{ value: "rock", label: "堅硬岩盤" }, { value: "soft", label: "軟弱沖積層" }] });
      const waveCv = ui.chart("地震儀記錄", "短桿亂顫是背景雜訊;P 到後中幅高頻、S 到後大幅搖擺、表面波最後收尾。");
      function drawChart() {
        if (waveCv.W < 60) return;
        const dtp = dtpS.get(), f = siteSel.get() === "soft" ? 2.6 : 1, T = 60, tP = 10, tS = tP + dtp;
        const pts = CK.seismoPts({ x: 0, y: 0, w: T, h: 2.7 }, { tP: tP / T, tS: tS / T, tSurf: Math.min(0.95, (tS + 4) / T), amp: ampS.get() * f * 0.8, noise: 0.05, seed: 9 });
        const g = PL.graph(waveCv, { x: 44, y: 14, w: waveCv.W - 58, h: waveCv.H - 44 }, { x0: 0, x1: T, y0: -1.45, y1: 1.45 });
        g.frame({ xlabel: "時間 (s)", ylabel: "地動振幅" }); g.grid(6, 4);
        g.curve(pts, { color: PL.col("accent"), width: 1.6 });
        g.vline(tP, { color: "#5c91dc", dash: [5, 4] }); g.vline(tS, { color: "#ef5350", dash: [5, 4] });
        D.text(waveCv.ctx, "P", g.X(tP) - 7, g.box.y + 12, { color: "#5c91dc", size: 11, weight: "700" });
        D.text(waveCv.ctx, "S", g.X(tS) + 7, g.box.y + 12, { color: "#ef5350", size: 11, weight: "700" });
      }
      waveCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "地震儀靠慣性擺錘記錄地面振動：地面動、擺錘因慣性幾乎不動，兩者的相對運動就是波形。波形上可直接讀出 P 到時、S 到時與振幅。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀一張地震圖",
        steps: ["在波形圖找到藍色 P 線與紅色 S 線：中間就是 S–P 時差。", "拉大「S–P 時差」：兩線分開，換算震距變大，測站越遠，時差越大。",
          "拉大振幅倍率並切到軟弱沖積層：波形變胖變高。", "用 d ≈ 8Δt 自己算一次，對照讀數。"],
        rule: "同一地震，離得越遠 S–P 時差越大、振幅越小；「時差大」與「振幅大」不會同時出現。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "近震（時差小）", apply: () => { dtpS.set(2.5); ampS.set(1.2); siteSel.set("rock"); ui.redraw(); drawChart(); } },
        { label: "遠震（時差大）", apply: () => { dtpS.set(12); ampS.set(0.4); siteSel.set("rock"); ui.redraw(); drawChart(); } },
        { label: "軟層放大效應", apply: () => { dtpS.set(5); ampS.set(0.6); siteSel.set("soft"); ui.redraw(); drawChart(); } }
      ] });
      const rDtp = PL.ui.readout(ui.L.readouts, { label: "S–P 時差", unit: "s" });
      const rDist = PL.ui.readout(ui.L.readouts, { label: "換算震距", unit: "km" });
      const rAmp = PL.ui.readout(ui.L.readouts, { label: "相對振幅", unit: "mm" }); const rSite = PL.ui.readout(ui.L.readouts, { label: "場址效應" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 斷層類型與應力 */
  PL.register("fault-types", {
    build(root) {
      const FT = {
        reverse: { name: "逆斷層", stress: "壓力（擠壓）", move: "上盤沿斷層面上衝", tw: "車籠埔斷層（921 集集地震）就是逆斷層" },
        normal: { name: "正斷層", stress: "張力（拉伸）", move: "上盤沿斷層面下滑", tw: "台灣本島少見，常見於張裂邊界與裂谷" },
        strike: { name: "平移斷層", stress: "剪力（平行錯動）", move: "兩側沿斷層走向水平錯動", tw: "花東縱谷帶具左移分量；台灣西南部多逆斷層" } };
      const bands = ["#d9b36c", "#b78d5e", "#8b95a3"];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const type = typeSel.get(), stress = stS.get(), dip = dipS.get(), ft = FT[type];
          const slip = stress / 100 * 24, y0 = H * 0.34, yb = H - 34;
          const strata = (yTop, yBot) => { const bh = (yBot - yTop) / 3;
            bands.forEach((c, i) => D.rect(ctx, 20, yTop + i * bh, W * 0.72, bh, { fill: c })); };
          if (type === "strike") {
            // 平面圖:兩側水平錯動
            const gy = H * 0.30, gb = H * 0.82, fx = W * 0.33, mid = gy + (gb - gy) * 0.5;
            D.rect(ctx, 20, gy, W * 0.60, gb - gy, { fill: "#7d9663" });
            D.line(ctx, fx, gy, fx, gb, "rgba(220,80,60,0.95)", 3);
            D.line(ctx, 26, mid, fx, mid, "#e8e2d2", 7);
            D.line(ctx, fx, mid + slip * 1.8, W * 0.60 - 6, mid + slip * 1.8, "#e8e2d2", 7);
            D.text(ctx, "A 側向北 →", 20 + W * 0.13, gy + 22, { color: PL.col("text"), size: 10.5 });
            D.text(ctx, "← B 側向南", fx + W * 0.17, gb - 18, { color: PL.col("text"), size: 10.5 });
            D.text(ctx, "馬路被錯斷(右側錯開 " + (slip * 0.38).toFixed(1) + " m)", 20 + W * 0.30, mid + 22, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.text(ctx, "斷層線", fx + 8, gy + 16, { color: "#ef8a65", size: 10 });
          } else {
            // 剖面圖:斷層面向右下傾,右塊為上盤
            const fx = W * 0.34, dx = (yb - y0) / Math.tan(dip * Math.PI / 180), len = Math.hypot(dx, yb - y0);
            const ux = dx / len, uy = (yb - y0) / len;
            const off = type === "normal" ? [ux * slip, uy * slip] : [-ux * slip, -uy * slip];
            ctx.save();
            ctx.beginPath(); ctx.moveTo(20, y0); ctx.lineTo(fx, y0); ctx.lineTo(fx + dx, yb); ctx.lineTo(20, yb); ctx.closePath(); ctx.clip();
            strata(y0 - 40, yb + 40); ctx.restore();
            ctx.save();
            ctx.beginPath(); ctx.moveTo(fx, y0); ctx.lineTo(W * 0.62, y0); ctx.lineTo(W * 0.62, yb); ctx.lineTo(fx + dx, yb); ctx.closePath(); ctx.clip();
            ctx.translate(off[0], off[1]); strata(y0 - 60, yb + 60); ctx.restore();
            D.line(ctx, fx, y0, fx + dx, yb, "rgba(200,60,40,0.95)", 3);
            D.line(ctx, 20, y0, fx, y0, "#6b7a4f", 3);
            D.line(ctx, fx + off[0], y0 + off[1], W * 0.62, y0 + off[1], "#6b7a4f", 3);
            D.text(ctx, "上盤", W * 0.52, y0 + 40 + off[1], { color: PL.col("text"), size: 11.5, weight: "700" });
            D.text(ctx, "下盤", W * 0.16, y0 + 40, { color: PL.col("text"), size: 11.5, weight: "700" });
            const nrm = type === "normal";
            D.arrow(ctx, fx + (nrm ? -30 : -90), y0 - 26, fx + (nrm ? -90 : -30), y0 - 26, { color: PL.col("accent"), width: 2.6, label: nrm ? "張力" : "壓力" });
            D.arrow(ctx, fx + (nrm ? 50 : 110), y0 - 26, fx + (nrm ? 110 : 50), y0 - 26, { color: PL.col("accent"), width: 2.6 });
            if (stress >= 96) CK.badge(ctx, W * 0.40, y0 - 56, "地震！彈性回跳錯動", "#c0392b");
          }
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.30, H * 0.58, ft.name);
          [["應力", ft.stress], ["錯動", ft.move]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.69, H * 0.24 + i * 46, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, r[1], W * 0.69, H * 0.24 + 16 + i * 46, { color: PL.col("text"), size: 11 });
          });
          D.text(ctx, "台灣連結", W * 0.69, H * 0.56, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, ft.tw, W * 0.69, H * 0.56 + 16, { color: PL.col("accent"), size: 10.5 });
          rType.set(ft.name); rStr.set(ft.stress); rSlip.set(slip * 0.38, 1);
          rDip.set(type === "strike" ? "近垂直(90°)" : dip + "°");
          vd.set(stress >= 92 ? "應力超過摩擦強度：斷層錯動 = 地震！" : stress >= 55 ? "應力累積中，岩層彈性變形增加" : "穩定：應力尚低", stress >= 92 ? "bad" : stress >= 55 ? "warn" : "info");
        }
      });
      const typeSel = PL.ui.select(ui.L.controls, { label: "斷層類型", value: "reverse", options: [
        { value: "reverse", label: "逆斷層（壓力）" }, { value: "normal", label: "正斷層（張力）" }, { value: "strike", label: "平移斷層（剪力）" }
      ] });
      const stS = PL.ui.slider(ui.L.controls, { label: "應力累積", min: 0, max: 100, step: 2, value: 40, unit: "%", digits: 0 });
      const dipS = PL.ui.slider(ui.L.controls, { label: "斷層面傾角", min: 25, max: 70, step: 1, value: 55, unit: "°", digits: 0 });
      PL.ui.note(ui.L.controls, "正斷層由張力造成、上盤下滑；逆斷層由壓力造成、上盤上衝；平移斷層由剪力造成、兩側水平錯動。斷層突然錯動的那一瞬間，就是地震。");
      PL.ui.procedure(ui.L.controls, {
        title: "應力 → 錯動",
        steps: ["預設是逆斷層：拉「應力累積」，看上盤如何上衝、地層如何錯開。", "切到正斷層：張力箭頭向外，上盤反而下滑。",
          "切到平移斷層：畫面變成平面圖，馬路被水平錯斷。", "傾角滑桿改變斷層面斜度：越緩的上衝時水平位移越大。"],
        rule: "斷層面不是裂開的洞，是兩盤相對滑動的面；上盤永遠指斷層面上方那側，與斷層面傾斜方向有關。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "921 車籠埔", apply: () => { typeSel.set("reverse"); stS.set(100); dipS.set(30); ui.redraw(); } },
        { label: "張裂裂谷", apply: () => { typeSel.set("normal"); stS.set(80); dipS.set(60); ui.redraw(); } },
        { label: "縱谷左移", apply: () => { typeSel.set("strike"); stS.set(70); ui.redraw(); } }
      ] });
      const rType = PL.ui.readout(ui.L.readouts, { label: "斷層類型" });
      const rStr = PL.ui.readout(ui.L.readouts, { label: "應力型態" });
      const rSlip = PL.ui.readout(ui.L.readouts, { label: "錯動量", unit: "m" });
      const rDip = PL.ui.readout(ui.L.readouts, { label: "斷層面傾角" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "—" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 火山類型與岩漿性質 */
  PL.register("volcano-types", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const horizon = CK.scene(ui.cv, { kind: "sky", horizon: 0.74 }).horizon;
          const sio2 = sio2S.get(), gas = gasS.get();
          const type = sio2 < 52 ? "shield" : sio2 < 63 ? "strato" : "cinder";
          const name = type === "shield" ? "盾狀火山" : type === "strato" ? "複式火山" : "渣錐火山";
          const visc = Math.pow(10, (sio2 - 45) / 10);
          const expl = clamp(0.75 * (sio2 - 45) / 30 + 0.5 * gas / 6, 0, 1);
          const erupting = expl > 0.42;
          const lava = clamp(0.85 - 0.75 * (sio2 - 45) / 30, 0.08, 0.85) * (gas > 4 ? 0.65 : 1);
          const h = type === "shield" ? H * 0.26 : type === "strato" ? H * 0.36 : H * 0.17;
          const vy = horizon + 26;
          CK.volcanoShape(ctx, W * 0.30, vy, W * 0.46, h, type, { lavaFlow: lava * 0.6, erupting, time: t, label: name + "(坡度約 " + (type === "shield" ? "5–10°" : type === "strato" ? "25–30°" : "30–35°") + ")" });
          D.text(ctx, "SiO₂ " + sio2 + "%:" + (type === "shield" ? "玄武岩質岩漿，流動性高" : type === "strato" ? "安山岩質岩漿，黏而積層" : "流紋岩質岩漿，極黏易爆"),
            W * 0.30, vy + 40, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.badge(ctx, W * 0.30, vy - h - 26, (erupting ? "噴發中！" : "穩定湧流，") + "猛烈度 " + Math.round(expl * 100) + "%", erupting ? "#c0392b" : "#66bb6a");
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.30, H * 0.56, "岩漿成分對照");
          [["玄武岩質", 45, 52, "#8d6e63"], ["安山岩質", 52, 63, "#a1887f"], ["流紋岩質", 63, 75, "#8d6e63"]].forEach((c, i) => {
            const yy = H * 0.24 + i * 44, inR = sio2 >= c[1] && sio2 < c[2];
            D.text(ctx, c[0] + "(" + c[1] + "–" + c[2] + "%)", W * 0.69, yy, { color: inR ? PL.col("accent") : PL.col("text-dim"), size: 10.5, weight: inR ? "700" : "400" });
            CK.meter(ctx, W * 0.69, yy + 6, W * 0.24, 7, inR ? clamp((sio2 - c[1]) / (c[2] - c[1]), 0.06, 1) : 0, { color: inR ? c[3] : PL.theme.shade(0.5) });
          });
          D.text(ctx, "台灣：大屯火山群（安山岩質複式火山）、", W * 0.81, H * 0.58, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          D.text(ctx, "澎湖群島（玄武岩質），類型由岩漿決定。", W * 0.81, H * 0.58 + 15, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rMagma.set(type === "shield" ? "玄武岩質" : type === "strato" ? "安山岩質" : "流紋岩質");
          rVisc.set(visc, 0); rExpl.set(expl, 2);
          rErupt.set(expl > 0.7 ? "猛烈爆發（普林尼式）" : erupting ? "中等爆發，間歇噴灰柱" : "寧靜溢流，熔岩流緩慢推進");
          vd.set(expl > 0.7 ? "高矽 + 多氣體：猛烈爆發，火山灰柱可達平流層" : erupting ? "中等爆發：氣體累積後間歇噴發" : "寧靜溢流：氣體易逃逸，熔岩流可近距離觀察",
            expl > 0.7 ? "bad" : erupting ? "warn" : "ok");
        }
      });
      const sio2S = PL.ui.slider(ui.L.controls, { label: "岩漿 SiO₂ 含量", min: 45, max: 75, step: 1, value: 50, unit: "%", digits: 0 });
      const gasS = PL.ui.slider(ui.L.controls, { label: "揮發分（氣體）", min: 0.2, max: 6, step: 0.1, value: 1, unit: "%", digits: 1 });
      const volCv = ui.chart("噴發猛烈度由誰決定", "矽越高越黏、氣體越多越擠：兩條淡線是氣體最少／最多的極端。");
      function drawChart() {
        if (volCv.W < 60) return;
        const gas = gasS.get(), ex = s => clamp(0.75 * (s - 45) / 30 + 0.5 * gas / 6, 0, 1);
        const g = PL.graph(volCv, { x: 44, y: 14, w: volCv.W - 58, h: volCv.H - 44 }, { x0: 45, x1: 75, y0: 0, y1: 1 });
        g.frame({ xlabel: "SiO₂ 含量 (%)", ylabel: "爆發指數" }); g.grid(3, 4);
        g.fn(s => clamp(0.75 * (s - 45) / 30 + 0.5 * 0.2 / 6, 0, 1), { color: PL.col("text-faint"), width: 1.4, dash: [5, 4] });
        g.fn(s => clamp(0.75 * (s - 45) / 30 + 0.5, 0, 1), { color: PL.col("text-faint"), width: 1.4, dash: [5, 4] });
        g.fn(ex, { color: PL.col("accent"), width: 2.4 });
        g.vline(52, { color: PL.col("border"), dash: [3, 3] }); g.vline(63, { color: PL.col("border"), dash: [3, 3] });
        g.dot(sio2S.get(), ex(sio2S.get()), { color: PL.col("accent-2") });
      }
      volCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "岩漿的二氧化矽含量決定黏度：低矽玄武岩質流動性高，形成坡緩的盾狀火山與寧靜噴發；高矽黏稠、氣體易累積，形成陡峭複式火山與猛烈噴發。");
      PL.ui.procedure(ui.L.controls, {
        title: "把火山養大",
        steps: ["SiO₂ 維持 50%：熔岩流長長一條，這是盾狀火山的寧靜世界。", "把 SiO₂ 拉到 60%：山變陡、熔岩變短，開始間歇噴灰。",
          "再拉高氣體到 5%：爆發指數衝高，灰柱沖天。", "對照右表：台灣大屯火山群落在哪一區？"],
        rule: "不是火山越大就越猛，渣錐很矮小卻可能很容易爆發。噴發的劇烈程度看 SiO₂（黏度）和揮發分（氣體），跟體積無關。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "夏威夷基勞亞", apply: () => { sio2S.set(50); gasS.set(0.5); ui.redraw(); drawChart(); } },
        { label: "大屯火山群", apply: () => { sio2S.set(58); gasS.set(3); ui.redraw(); drawChart(); } },
        { label: "維蘇威式", apply: () => { sio2S.set(68); gasS.set(5); ui.redraw(); drawChart(); } }
      ] });
      const rMagma = PL.ui.readout(ui.L.readouts, { label: "岩漿類型" });
      const rVisc = PL.ui.readout(ui.L.readouts, { label: "相對黏度", unit: "×" });
      const rExpl = PL.ui.readout(ui.L.readouts, { label: "爆發指數" }); const rErupt = PL.ui.readout(ui.L.readouts, { label: "預期噴發" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "—" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 噴發樣式與災害 */
  PL.register("eruption-style", {
    build(root) {
      const HAZ = {
        hawaiian: { name: "夏威夷式", lava: 0.9, ash: 0.15, pdc: 0.02, lahar: 0.2, main: "熔岩流（流速慢，易避難）" },
        strombolian: { name: "斯特龍博利式", lava: 0.5, ash: 0.45, pdc: 0.15, lahar: 0.4, main: "間歇噴發的火山渣與灰" },
        plinian: { name: "普林尼式", lava: 0.1, ash: 0.95, pdc: 0.9, lahar: 0.7, main: "火山灰柱與碎屑流（熱雲）" } };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const horizon = CK.scene(ui.cv, { kind: "sky", horizon: 0.78 }).horizon;
          const st = styleSel.get(), hz = HAZ[st], v = vS.get();
          const colKm = v * v / 19620, pxKm = H * 0.58 / 30;   // 氣柱高 ≈ v²/2g(教學簡化)
          const cx = W * 0.64, baseY = horizon + 22, vh = H * 0.26, craterY = baseY - vh;
          CK.volcanoShape(ctx, cx, baseY, W * 0.30, vh, "strato", { lavaFlow: st === "hawaiian" ? 0.5 : st === "strombolian" ? 0.2 : 0.06, time: t });
          const colPx = colKm * pxKm, n = Math.max(3, Math.round(colPx / 16));   // 噴發柱
          for (let i = 0; i <= n; i++) {
            const f = i / n, yy = craterY - f * colPx, spread = 9 + f * colPx * 0.16 + Math.sin(t * 3 + i) * 3;
            D.disc(ctx, cx + Math.sin(i * 2.2 + t * 1.5) * spread * 0.35, yy, 8 + f * 13, { fill: "rgba(125,125,138," + (0.8 - f * 0.42) + ")" });
          }
          if (colKm > 12) {
            ctx.save(); ctx.fillStyle = "rgba(125,125,138,0.5)";
            ctx.beginPath(); ctx.ellipse(cx, craterY - colPx, colPx * 0.30, colPx * 0.07 + 6, 0, 0, TAU); ctx.fill(); ctx.restore();
            D.text(ctx, "傘狀雲：進入平流層，灰隨風繞全球", cx, craterY - colPx - 14, { color: PL.col("text-dim"), size: 10, align: "center" });
          }
          if (st === "hawaiian") for (let k = 0; k < 4; k++)
            D.disc(ctx, cx - 10 + k * 7, craterY - ((t * 60 + k * 19) % 46), 3.4, { fill: "#ff8a50", glow: "#ff5722", glowSize: 7 });
          if (st === "plinian" && v > 350) {   // 碎屑流
            ctx.save(); ctx.fillStyle = "rgba(190,80,50,0.55)";
            ctx.beginPath(); ctx.moveTo(cx + 5, craterY + 8); ctx.lineTo(cx + W * 0.20, baseY); ctx.lineTo(cx + W * 0.06, baseY); ctx.closePath(); ctx.fill(); ctx.restore();
            D.text(ctx, "碎屑流（熱雲，時速數百 km）", cx + W * 0.13, baseY + 16, { color: "#e57373", size: 9.5, align: "center" });
          }
          if (st !== "hawaiian") {             // 泥流
            ctx.save(); ctx.fillStyle = "rgba(120,90,60,0.5)";
            ctx.beginPath(); ctx.moveTo(cx - 6, craterY + 10); ctx.lineTo(cx - W * 0.17, baseY); ctx.lineTo(cx - W * 0.05, baseY); ctx.closePath(); ctx.fill(); ctx.restore();
            D.text(ctx, "泥流沿河谷", cx - W * 0.11, baseY + 16, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          }
          D.text(ctx, hz.name + " · 噴發初速 " + v + " m/s", cx, baseY + 34, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "教學簡化：氣柱高 ≈ v²/2g", cx, baseY + 48, { color: PL.col("text-faint"), size: 9, align: "center" });
          CK.panel(ctx, W * 0.05, H * 0.14, W * 0.34, H * 0.54, "災害風險（相對）");
          [["熔岩流", hz.lava], ["火山灰", hz.ash * (0.6 + 0.4 * v / 650)], ["碎屑流", hz.pdc], ["泥流", hz.lahar]].forEach((r, i) => {
            const yy = H * 0.24 + i * 38;
            D.text(ctx, r[0], W * 0.08, yy, { color: PL.col("text-dim"), size: 10.5 });
            CK.meter(ctx, W * 0.08, yy + 6, W * 0.28, 8, clamp(r[1], 0, 1), { color: r[1] > 0.6 ? "#c0392b" : r[1] > 0.3 ? "#e8a13c" : "#66bb6a" });
          });
          rCol.set(colKm, 1);
          rStrat.set(colKm >= 12 ? "是（灰柱進平流層）" : "否");
          rVei.set(colKm < 1 ? 1 : colKm < 5 ? 2 : colKm < 15 ? 4 : colKm < 25 ? 5 : 6, 0); rMain.set(hz.main);
          vd.set(st === "plinian" ? "普林尼式：灰柱達平流層，航空中斷、全球短期降溫" : st === "strombolian" ? "斯特龍博利式：夜間噴火如燈塔，也需警戒" : "夏威夷式：熔岩流緩慢推進，多可預警撤離",
            st === "plinian" ? "bad" : st === "strombolian" ? "warn" : "ok");
        }
      });
      const vS = PL.ui.slider(ui.L.controls, { label: "噴發初速", min: 60, max: 650, step: 10, value: 560, unit: "m/s", digits: 0 });
      const styleSel = PL.ui.select(ui.L.controls, { label: "噴發樣式", value: "plinian", options: [
        { value: "hawaiian", label: "夏威夷式（寧靜）" }, { value: "strombolian", label: "斯特龍博利式" }, { value: "plinian", label: "普林尼式（猛烈）" }
      ], onChange(key) { vS.set(key === "hawaiian" ? 120 : key === "strombolian" ? 260 : 560); ui.redraw(); drawChart(); } });
      const erCv = ui.chart("初速怎麼決定灰柱高度", "高度與初速平方成正比：初速加倍、灰柱四倍高；虛線是平流層底。");
      function drawChart() {
        if (erCv.W < 60) return;
        const g = PL.graph(erCv, { x: 44, y: 14, w: erCv.W - 58, h: erCv.H - 44 }, { x0: 60, x1: 650, y0: 0, y1: 24 });
        g.frame({ xlabel: "噴發初速 (m/s)", ylabel: "灰柱高度 (km)" }); g.grid(5, 4);
        g.fn(x => x * x / 19620, { color: PL.col("accent"), width: 2.4 });
        g.hline(12, { color: PL.col("warn"), dash: [6, 4] });
        D.text(erCv.ctx, "平流層底 ≈ 12 km", g.box.x + 8, g.Y(12) - 5, { color: PL.col("warn"), size: 9.5 });
        g.dot(vS.get(), vS.get() * vS.get() / 19620, { color: PL.col("accent-2") });
      }
      erCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "黏稠岩漿堵塞火山口後壓力累積，爆發時把氣體與碎屑高速噴出：灰柱可達平流層、碎屑流（熱雲）時速數百公里。矽含量和揮發分決定噴發的樣子。");
      PL.ui.procedure(ui.L.controls, {
        title: "比較三種脾氣",
        steps: ["夏威夷式：初速低、灰柱矮，災害表以熔岩流為主。", "切到斯特龍博利式：間歇噴發，灰與渣彈跳上升。",
          "切到普林尼式並拉高初速：灰柱衝過 12 km 平流層底，出現碎屑流。", "對照圖表：初速從 300 加到 600，灰柱高幾倍？"],
        rule: "熔岩流流速慢、較易避難；最致命的是碎屑流和泥流，它們沿著河谷流得又遠又快，很難躲。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "基勞亞（現今）", apply: () => { styleSel.set("hawaiian"); vS.set(120); ui.redraw(); drawChart(); } },
        { label: "維蘇威（西元 79 年）", apply: () => { styleSel.set("plinian"); vS.set(560); ui.redraw(); drawChart(); } },
        { label: "聖海倫斯(1980)", apply: () => { styleSel.set("plinian"); vS.set(480); ui.redraw(); drawChart(); } }
      ] });
      const rCol = PL.ui.readout(ui.L.readouts, { label: "灰柱高度", unit: "km" });
      const rStrat = PL.ui.readout(ui.L.readouts, { label: "達平流層？" });
      const rVei = PL.ui.readout(ui.L.readouts, { label: "估計 VEI" }); const rMain = PL.ui.readout(ui.L.readouts, { label: "主要災害" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "—" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 土壤液化與耐震 */
  PL.register("soil-liquefaction", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const surface = CK.scene(ui.cv, { kind: "underground", horizon: 0.30 }).surface;
          const pga = pgaS.get(), wt = wtS.get(), dr = drS.get();
          const sat = clamp(1.3 - wt / 5, 0.25, 1);
          const csr = 0.62 * (pga / 980) * sat, crr = 0.08 + 0.62 * dr;
          const ru = Math.pow(clamp(csr / crr, 0, 1), 1.5), liq = csr >= crr;
          const settle = ru * (1 - dr) * 42, sinkPx = settle * 0.85;
          // 砂層 + 地下水位
          const sb = { x: W * 0.05, y: surface + 14, w: W * 0.58, h: H * 0.40 };
          CK.particleBox(ctx, sb, { state: ru > 0.75 ? "liquid" : "solid", temp: pga / 800, count: Math.round(20 + dr * 40), seed: 12, color: "#d9b36c", time: t, radius: 4.2 });
          const wy = sb.y + wt / 7 * sb.h;
          D.rect(ctx, sb.x, wy, sb.w, sb.y + sb.h - wy, { fill: "rgba(90,160,215,0.30)" });
          D.line(ctx, sb.x, wy, sb.x + sb.w, wy, "rgba(90,170,230,0.9)", 1.6, [6, 4]);
          D.text(ctx, "地下水位 −" + wt.toFixed(1) + " m", sb.x + sb.w - 6, wy - 5, { color: "#8fc4e8", size: 9.5, align: "right" });
          D.text(ctx, "疏鬆飽和砂層（深 7 m）", sb.x + 6, sb.y + sb.h + 13, { color: PL.col("text-faint"), size: 9.5 });
          if (ru > 0.8) {   // 噴砂孔
            for (let k = 0; k < 5; k++) {
              const xk = sb.x + sb.w * (0.16 + k * 0.15), jet = 8 + ((t * 40 + k * 13) % 16);
              D.line(ctx, xk, surface, xk + Math.sin(t * 5 + k) * 3, surface - jet, "rgba(130,195,235,0.95)", 2.4);
              D.disc(ctx, xk + Math.sin(t * 5 + k) * 3, surface - jet, 2.6, { fill: "#bfe0f5" });
            }
            D.text(ctx, "噴砂孔！", sb.x + sb.w * 0.16, surface - 30, { color: "#8fc4e8", size: 9.5 });
          }
          // 兩棟建築:傳統淺基礎 vs 地盤改良
          const house = (bx, label, scale) => {
            const bw = W * 0.085, fh = H * 0.045, sink = sinkPx * scale, tilt = clamp(settle / 28, 0, 1) * 0.10 * scale;
            if (scale < 0.5) for (let p = -1; p <= 1; p++) D.line(ctx, bx + p * bw * 0.28, surface + sink, bx + p * bw * 0.28, surface + 46, "#8d8474", 3);
            ctx.save();
            ctx.translate(bx, surface + sink); ctx.rotate(tilt);
            for (let f = 0; f < 4; f++)
              D.rect(ctx, -bw / 2, -fh * (f + 1), bw, fh - 2, { fill: f % 2 ? "#cfc4ae" : "#ddd2bc", stroke: "rgba(60,50,35,0.6)", width: 1 });
            ctx.restore();
            D.text(ctx, label, bx, surface + sink + 16, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          };
          house(W * 0.20, "傳統淺基礎", 1); house(W * 0.46, "地盤改良（樁）", 0.15);
          if (liq) {
            D.line(ctx, W * 0.10, surface - 2, W * 0.30, surface - 6, "rgba(40,30,20,0.6)", 1.4);
            D.line(ctx, W * 0.22, surface - 1, W * 0.36, surface + 2, "rgba(40,30,20,0.5)", 1.2);
          }
          CK.panel(ctx, W * 0.68, H * 0.14, W * 0.28, H * 0.50, "液化三條件");
          [["疏鬆砂層", dr < 0.5], ["地下水位淺(<3 m)", wt < 3], ["震動夠強(>150 gal)", pga > 150]].forEach((c, i) =>
            D.text(ctx, (c[1] ? "✓ " : "✗ ") + c[0], W * 0.71, H * 0.23 + i * 30, { color: c[1] ? "#66bb6a" : PL.col("text-faint"), size: 11 }));
          D.text(ctx, "有效應力 σ' = σ − u;u 飆高則承載力歸零", W * 0.82, H * 0.56, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rCsr.set(csr, 2); rCrr.set(crr, 2); rRu.set(ru, 2); rSet.set(settle, 0);
          vd.set(liq ? "液化發生！砂粒懸浮、建物下陷傾斜" : ru > 0.55 ? "臨界：孔隙水壓大幅上升，餘震可能觸發" : "安全：砂層仍具足夠承載力",
            liq ? "bad" : ru > 0.55 ? "warn" : "ok");
        }
      });
      const pgaS = PL.ui.slider(ui.L.controls, { label: "地震強度 PGA", min: 50, max: 800, step: 10, value: 240, unit: "gal", digits: 0 });
      const wtS = PL.ui.slider(ui.L.controls, { label: "地下水位深度", min: 0.5, max: 6, step: 0.1, value: 2, unit: "m", digits: 1 });
      const drS = PL.ui.slider(ui.L.controls, { label: "砂層相對密度", min: 0.2, max: 0.85, step: 0.05, value: 0.35, digits: 2 });
      const liqCv = ui.chart("震求 vs 抗力", "藍線是地震的「需求」(CSR)，虛線是砂層的「抗力」(CRR)：需求越過抗力就液化。");
      function drawChart() {
        if (liqCv.W < 60) return;
        const sat = clamp(1.3 - wtS.get() / 5, 0.25, 1), crr = 0.08 + 0.62 * drS.get(), pga = pgaS.get();
        const g = PL.graph(liqCv, { x: 44, y: 14, w: liqCv.W - 58, h: liqCv.H - 44 }, { x0: 50, x1: 800, y0: 0, y1: 0.7 });
        g.frame({ xlabel: "地震強度 PGA (gal)", ylabel: "比值" }); g.grid(3, 4);
        g.fn(a => 0.62 * (a / 980) * sat, { color: "#5c91dc", width: 2.4 });
        g.hline(crr, { color: "#ef5350", dash: [6, 4] });
        D.text(liqCv.ctx, "CRR = " + crr.toFixed(2), g.box.x + 8, g.Y(crr) - 5, { color: "#ef5350", size: 9.5 });
        g.dot(pga, 0.62 * (pga / 980) * sat, { color: PL.col("accent-2") });
      }
      liqCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart);
      root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "疏鬆飽和的砂質土壤在震動下孔隙水壓急升，砂粒懸浮、失去承載力，建物下陷傾斜。液化好發於河海邊的填土與沖積砂層，可用地質改良與耐震設計減災。");
      PL.ui.procedure(ui.L.controls, {
        title: "找出危險組合",
        steps: ["預設（PGA 240、水位 2 m、密度 0.35）：三條件全亮綠，液化發生。", "把地下水位拉到 5 m：飽和度降,CSR 下降、脫離危險。",
          "把相對密度拉到 0.7:CRR 抬高，即使強震也安全。", "對照兩棟房子：改良樁那棟幾乎不傾斜。"],
        rule: "液化三條件缺一不可：疏砂 + 飽和 + 震動；密實砂層或深地下水位都能讓它不發生，地盤改良就是用這個原理。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "0206 台南（高危）", apply: () => { pgaS.set(260); wtS.set(1.5); drS.set(0.3); ui.redraw(); drawChart(); } },
        { label: "密砂深水位（安全）", apply: () => { pgaS.set(400); wtS.set(5); drS.set(0.75); ui.redraw(); drawChart(); } },
        { label: "強震大考(800 gal)", apply: () => { pgaS.set(800); wtS.set(2); drS.set(0.5); ui.redraw(); drawChart(); } }
      ] });
      const rCsr = PL.ui.readout(ui.L.readouts, { label: "震求比 CSR" });
      const rCrr = PL.ui.readout(ui.L.readouts, { label: "抗液化強度 CRR" });
      const rRu = PL.ui.readout(ui.L.readouts, { label: "孔隙水壓比 ru" }); const rSet = PL.ui.readout(ui.L.readouts, { label: "預估沉陷", unit: "cm" });
      const vd = PL.ui.verdict(ui.L.controls, { label: "—" });
      return { stop() { ui.stop(); } };
    }
  });
})();
