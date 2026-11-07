/* 模組二 · 地球內部與板塊構造 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;
  const RAD = Math.PI / 180;
  // 羅盤角(0=北,順時針)→ 螢幕向量
  const dirV = a => [Math.sin(a * RAD), -Math.cos(a * RAD)];

  /* 地震波與地球內部探測:S 波陰影帶照出液態外核 */
  PL.register("seismic-waves-layers", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ph = phSel.get(), tt = timeS.get(), fan = fanChk.get();
          const cx = W * 0.30, cy = H * 0.54, R = H * 0.40, rC = R * 0.545, rI = R * 0.192;
          const kmPx = 6371 / R, E = [cx - R, cy];
          // 全圓剖面(自畫環帶,半徑比例取真實地球:外核 0.545R、內核 0.192R)
          D.disc(ctx, cx, cy, R, { fill: "#c98a5a" });
          ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R * 0.99, 0, TAU); ctx.arc(cx, cy, rC, 0, TAU, true);
          ctx.closePath(); ctx.fillStyle = "#e8a13c"; ctx.fill();
          ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
          D.disc(ctx, cx, cy, rI, { fill: "#f2d16b" });
          D.ring(ctx, cx, cy, R, "#8fae6f", 3.5);
          D.text(ctx, "地殼", cx - R * 0.42, cy - R * 0.95, { color: "#eaf2df", size: 10 });
          D.text(ctx, "地函(固態)", cx - R * 0.55, cy - R * 0.72, { color: "#fff", size: 10.5, weight: "700" });
          D.text(ctx, "外核(液態)", cx + R * 0.18, cy + R * 0.30, { color: "#fff", size: 10.5, weight: "700" });
          D.text(ctx, "內核(固態)", cx + rI * 0.2, cy - rI * 0.25, { color: "#5c4a1e", size: 9.5, weight: "700" });
          // 直達波射線(弦):Δ≤103° 都留在地函內
          const A = dg => [cx - R * Math.cos(dg * RAD), cy - R * Math.sin(dg * RAD)];
          if (fan) [25, 50, 75, 100].forEach(dg => {
            const a = A(dg);
            D.line(ctx, E[0], E[1], a[0], a[1], "rgba(92,145,220,0.8)", 1.7); D.line(ctx, E[0], E[1], a[0], a[1], "rgba(239,83,80,0.75)", 1.7, [6, 4]);
          });
          // 穿核 P 波(示意):經核函界線折射、變慢,從 143° 以外冒出
          if (fan) [146, 158, 170].forEach(dg => {
            const a = A(dg);
            ctx.save(); ctx.strokeStyle = "rgba(92,145,220,0.9)"; ctx.lineWidth = 1.7; ctx.beginPath();
            ctx.moveTo(E[0], E[1]); ctx.quadraticCurveTo(cx, cy - R * 0.02, a[0], a[1]); ctx.stroke(); ctx.restore();
          });
          // 陰影帶 103°–143°:P、S 直達波都到不了
          ctx.save(); ctx.strokeStyle = "#ffb300"; ctx.lineWidth = 6; ctx.beginPath();
          ctx.arc(cx, cy, R + 3, (180 + 103) * RAD, (180 + 143) * RAD); ctx.stroke(); ctx.restore();
          D.text(ctx, "陰影帶 103°–143°", cx + R * 0.60, cy - R * 1.10, { color: "#ffb300", size: 11, weight: "700" });
          D.text(ctx, "直達 P 最遠 103°", A(103)[0] - 4, A(103)[1] + 16, { color: PL.col("text-dim"), size: 9.5, align: "right" });
          D.text(ctx, "143° 外只剩穿核 P", A(143)[0] + 6, A(143)[1] + 18, { color: PL.col("text-dim"), size: 9.5 });
          D.disc(ctx, E[0], E[1], 5, { fill: "#ff8a65", glow: "#ff5722", glowSize: 10 });
          D.text(ctx, "震央", E[0] - 6, E[1] - 10, { color: PL.col("text-dim"), size: 10, align: "right" });
          // 跟蹤波相:亮點沿路徑走,速度 = 該層波速
          let dot = null, dist = 0, arrive = "行進中", vTxt;
          if (ph === "pkp") {
            const a = A(170), Lkm = Math.hypot(a[0] - E[0], a[1] - E[1]) * kmPx;
            dist = Math.min(9.6 * tt, Lkm); // 核內平均 9.6 km/s
            const f = clamp(dist / Lkm, 0, 1), g0 = 1 - f;
            dot = [g0 * g0 * E[0] + 2 * g0 * f * cx + f * f * a[0], g0 * g0 * E[1] + 2 * g0 * f * (cy - R * 0.02) + f * f * a[1]];
            vTxt = "平均 ≈ 9.6 km/s(核內變慢折射)";
            if (f >= 1) arrive = "已到達 170°(陰影帶外)";
          } else {
            const a = A(100), Lkm = Math.hypot(a[0] - E[0], a[1] - E[1]) * kmPx, v = ph === "p" ? 10.5 : 6.2;
            dist = Math.min(v * tt, Lkm);
            const f = clamp(dist / Lkm, 0, 1);
            dot = [E[0] + (a[0] - E[0]) * f, E[1] + (a[1] - E[1]) * f];
            vTxt = ph === "p" ? "地函中 ≈ 10.5 km/s" : "地函中 ≈ 6.2 km/s";
            if (f >= 1) arrive = ph === "s" ? "已到達;S 波若對準外核:在此被擋" : "已到達 100° 測站";
          }
          D.disc(ctx, dot[0], dot[1], 5, { fill: ph === "s" ? "#ef5350" : "#5c91dc", glow: "#ffd54f", glowSize: 9 });
          CK.panel(ctx, W * 0.64, H * 0.12, W * 0.33, H * 0.52, "地震波分層探測");
          const rows = [["地殼 0–35 km", "固態"], ["地函 35–2,890 km", "固態(可緩慢流動)"], ["外核 2,890–5,150 km", "液態!S 波進不去"], ["內核 5,150–6,371 km", "固態(高壓)"]];
          rows.forEach((rw, i) => {
            D.text(ctx, rw[0], W * 0.66, H * 0.22 + i * 26, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, rw[1], W * 0.95, H * 0.22 + i * 26, { color: i === 2 ? "#ef5350" : PL.col("text"), size: 10.5, align: "right", weight: i === 2 ? "700" : "400" });
          });
          CK.legend(ctx, W * 0.66, H * 0.55, [{ color: "#5c91dc", label: "P 波(固液皆可穿)" }, { color: "#ef5350", label: "S 波(只走固體)" }, { color: "#ffb300", label: "陰影帶:兩種直達波都缺" }], 17);
          D.text(ctx, "vP ≈ 1.7 × vS", W * 0.80, H * 0.56, { color: PL.col("text-faint"), size: 11, align: "center", weight: "700" });
          rPhase.set(PH[ph]); rDist.set(dist, 0); rArr.set(arrive); rSpd.set(vTxt);
          vPh.set(ph === "s" ? "S 波進不了液態外核 → 遠側留下陰影帶" : ph === "pkp" ? "P 波穿核變慢折射,從 143° 以外冒出" : "P 波直達:最遠到 103°,再遠要穿核", ph === "s" ? "bad" : "info");
        }
      });
      const PH = { p: "直達 P 波", s: "直達 S 波", pkp: "穿核 P 波(PKP)" };
      const phSel = PL.ui.select(ui.L.controls, { label: "跟蹤波相", value: "s", options: [
        { value: "p", label: "直達 P 波" }, { value: "s", label: "直達 S 波" }, { value: "pkp", label: "穿核 P 波(PKP)" }] });
      const timeS = PL.ui.slider(ui.L.controls, { label: "地震經過時間", min: 0, max: 1800, step: 20, value: 480, unit: "s", digits: 0 });
      const fanChk = PL.ui.checkbox(ui.L.controls, { label: "顯示射線束", checked: true });
      const velCv = ui.chart("波速怎麼隨深度變化", "S 波在外核歸零(液態擋下);P 波在核函界線驟降、進內核又回升——每個轉折都是一個不連續面。");
      function drawChart() {
        if (velCv.W < 60) return;
        const DEP = [0, 35, 400, 2891, 2891, 5150, 5150, 6371];
        const g = PL.graph(velCv, { x: 46, y: 14, w: velCv.W - 60, h: velCv.H - 44 }, { x0: 0, x1: 6371, y0: 0, y1: 14 });
        g.frame({ xlabel: "深度 (km)", ylabel: "波速 (km/s)" }); g.grid(4, 4);
        g.curve(DEP.map((d, i) => [d, [6.5, 8.2, 10.8, 13.6, 8.1, 10.4, 11.2, 11.3][i]]), { color: "#5c91dc", width: 2.2 });
        g.curve(DEP.map((d, i) => [d, [3.7, 4.6, 5.8, 7.3, 0, 0, 3.5, 3.6][i]]), { color: "#ef5350", width: 2.2 });
        g.vline(2891, { color: "#ffb300", dash: [5, 4], label: "核函界線" });
      }
      velCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "地震波是唯一能「照進」地球內部的手電筒:波速突變的深度就是不連續面;S 波在哪一層消失,那一層就是液態。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀出液態外核",
        steps: ["拉「地震經過時間」,跟蹤直達 S 波:紅點一路順暢到 100°。", "把射線束打開:對準外核的 S 波全部止步於核函界線。",
          "改跟蹤穿核 P 波:它在液核變慢、折射,從 143° 以外重新冒出。", "對照下圖:S 波速度在外核歸零——這就是「液態」的觀測證據。"],
        rule: "「外核液態」不是假設,是 S 波陰影帶的直接推論;但別把「地函可流動」也當成液態——地函是固體,S 波照樣通過。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "S 波受阻", apply: () => { phSel.set("s"); timeS.set(900); fanChk.set(true); ui.redraw(); drawChart(); } },
        { label: "P 波穿核", apply: () => { phSel.set("pkp"); timeS.set(1100); fanChk.set(true); ui.redraw(); drawChart(); } },
        { label: "剛發震", apply: () => { timeS.set(60); ui.redraw(); drawChart(); } }
      ] });
      const rPhase = PL.ui.readout(ui.L.readouts, { label: "跟蹤波相" }), rDist = PL.ui.readout(ui.L.readouts, { label: "已行距離", unit: "km" });
      const rArr = PL.ui.readout(ui.L.readouts, { label: "狀態" }), rSpd = PL.ui.readout(ui.L.readouts, { label: "目前波速" });
      const vPh = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 莫氏不連續面與地殼:山有多高、根有多深 */
  PL.register("moho-crust", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const hM = mtnS.get(), dW = seaS.get(), ruler = ruleChk.get();
          const y0 = H * 0.16, hPix = H * 0.74, pxKm = hPix / 120, ySurf = y0;
          const mKm = 35 + 4.5 * hM, mohY = ySurf + mKm * pxKm;
          ctx.save(); ctx.fillStyle = PL.theme.isLight() ? "#bfe0f5" : "#1d2c4a";
          ctx.fillRect(0, 0, W, ySurf); ctx.restore();
          D.rect(ctx, 0, ySurf, W, H - ySurf, { fill: "#c98a5a" });           // 地函基底
          // 大陸柱:山 + 花崗岩質地殼 + 山根
          const cL = W * 0.07, cR = W * 0.44;
          D.rect(ctx, cL, ySurf, cR - cL, mKm * pxKm, { fill: "#c9a9a0" });
          ctx.save(); ctx.fillStyle = "#c9a9a0"; ctx.strokeStyle = "rgba(60,40,20,0.6)"; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(cL + (cR - cL) * 0.18, ySurf); ctx.lineTo((cL + cR) / 2, ySurf - hM * pxKm);
          ctx.lineTo(cL + (cR - cL) * 0.82, ySurf); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
          D.text(ctx, "大陸地殼(花崗岩質 2.7)", (cL + cR) / 2, ySurf + mKm * pxKm * 0.5, { color: "#5d4037", size: 10.5, align: "center", weight: "700" });
          // 海洋柱:海水 + 玄武岩質薄殼
          const oL = W * 0.56, oR = W * 0.93, sfY = ySurf + dW * pxKm;
          D.rect(ctx, oL, ySurf, oR - oL, dW * pxKm, { fill: "rgba(74,144,217,0.85)" });
          D.rect(ctx, oL, sfY, oR - oL, 7 * pxKm, { fill: "#4e5c74" });
          D.text(ctx, "海水 " + PL.fmt(dW, 1) + " km", (oL + oR) / 2, ySurf + dW * pxKm * 0.55, { color: "#fff", size: 10, align: "center" });
          D.text(ctx, "海洋地殼(玄武岩質 3.0)", (oL + oR) / 2, sfY + 3.5 * pxKm, { color: "#e8eef7", size: 9.5, align: "center" });
          // 莫氏不連續面(兩柱各自深度)
          D.line(ctx, cL, mohY, cR, mohY, "rgba(255,255,255,0.9)", 2, [7, 5]);
          D.line(ctx, oL, sfY + 7 * pxKm, oR, sfY + 7 * pxKm, "rgba(255,255,255,0.9)", 2, [7, 5]);
          if (ruler) {
            D.text(ctx, "莫氏面:" + PL.fmt(mKm, 0) + " km(P 波 6.2→8.1 跳升)", cR + 6, mohY + 4, { color: "#fff", size: 10.5, weight: "700" });
            D.text(ctx, "莫氏面:海床下 7 km", oR + 6, sfY + 7 * pxKm + 4, { color: "#fff", size: 10 });
          }
          // 均衡補償箭頭:載荷下壓、兩翼回彈
          D.arrow(ctx, (cL + cR) / 2, ySurf - hM * pxKm * 0.55, (cL + cR) / 2, mohY - 4, { color: "#e57373", width: 2, label: "山重下壓" });
          D.arrow(ctx, cL - 14, mohY - 30 * pxKm, cL - 14, mohY - 4, { color: "#5c91dc", width: 1.8 });
          D.arrow(ctx, cR + 14, mohY - 30 * pxKm, cR + 14, mohY - 4, { color: "#5c91dc", width: 1.8, label: "回彈" });
          // 深度軸
          [0, 30, 60, 90, 120].forEach(km => {
            const y = ySurf + km * pxKm;
            D.line(ctx, W * 0.015, y, W * 0.045, y, PL.col("border"), 1);
            D.text(ctx, km + " km", W * 0.045, y - 3, { color: PL.col("text-faint"), size: 9 });
          });
          D.text(ctx, "垂直比例相同(120 km 視窗):陸殼與海殼厚度差 5 倍以上", W * 0.30, H * 0.965, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rCrust.set(mKm, 0); rRoot.set(4.5 * hM, 1); rSea.set(dW, 1); rType.set(hM > 4 ? "造山帶:厚根山脈" : hM > 1.5 ? "一般大陸" : "近似平原");
        }
      });
      const mtnS = PL.ui.slider(ui.L.controls, { label: "山地高度", min: 0, max: 6, step: 0.5, value: 3, unit: "km", digits: 1 });
      const seaS = PL.ui.slider(ui.L.controls, { label: "海水深度", min: 0, max: 6, step: 0.5, value: 4, unit: "km", digits: 1 });
      const ruleChk = PL.ui.checkbox(ui.L.controls, { label: "標註莫氏面深度", checked: true });
      const velCv = ui.chart("莫氏面 = P 波速度跳升處", "地殼內約 6.2 km/s、進入地函跳到 8.1 km/s:莫霍洛維奇就是抓到這個突變,畫出地殼底界。");
      function drawChart() {
        if (velCv.W < 60) return;
        const mKm = 35 + 4.5 * mtnS.get();
        const g = PL.graph(velCv, { x: 46, y: 14, w: velCv.W - 60, h: velCv.H - 44 }, { x0: 0, x1: 120, y0: 0, y1: 10 });
        g.frame({ xlabel: "深度 (km)", ylabel: "P 波速 (km/s)" }); g.grid(4, 4);
        g.curve([[0, 6.2], [mKm, 6.2], [mKm, 8.1], [120, 8.9]], { color: "#5c91dc", width: 2.4 });
        g.vline(mKm, { color: "#ffb300", dash: [5, 4], label: "莫氏面" });
      }
      velCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "莫氏面在全世界的深度不一樣:大陸 30–70 km、海洋只有 5–10 km——地殼厚薄與密度差,正是板塊浮沉的基礎。");
      PL.ui.procedure(ui.L.controls, {
        title: "看懂地殼均衡",
        steps: ["把「山地高度」歸零:莫氏面回到約 35 km 的標準深度。", "拉高到 6 km:山根同步下探,地殼總厚逼近 60 km。",
          "讀山根深度:大約是山高的 4.5 倍——這就是 Airy 均衡。", "對照右柱:海洋地殼又薄又重(3.0),所以海底低於陸地。"],
        rule: "「山有多高、根有多深」:冰期冰蓋熔掉後,斯堪地那維亞至今仍在回彈——地殼像浮在地函上的木筏,載重變了吃水就跟著變。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "喜馬拉雅", apply: () => { mtnS.set(6); seaS.set(0); ui.redraw(); drawChart(); } },
        { label: "中央山脈", apply: () => { mtnS.set(3.5); seaS.set(1); ui.redraw(); drawChart(); } },
        { label: "深海平原", apply: () => { mtnS.set(0); seaS.set(5.5); ui.redraw(); drawChart(); } }
      ] });
      const rCrust = PL.ui.readout(ui.L.readouts, { label: "陸殼總厚", unit: "km" }), rRoot = PL.ui.readout(ui.L.readouts, { label: "山根深度", unit: "km" });
      const rSea = PL.ui.readout(ui.L.readouts, { label: "海水深度", unit: "km" }), rType = PL.ui.readout(ui.L.readouts, { label: "地殼類型" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 地函對流與板塊驅動:固體也能流動 */
  PL.register("mantle-convection", {
    build(root) {
      const LAYERS = [
        { name: "地殼", thick: 0.02, color: "#8fae6f" }, { name: "地函", thick: 0.5, color: "#c98a5a" },
        { name: "外核", thick: 0.28, color: "#e8a13c" }, { name: "內核", thick: 0.2, color: "#f2d16b" }];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const st = convS.get(), visc = visS.get(), ar = arrChk.get();
          const box = { x: W * 0.04, y: H * 0.30, w: W * 0.52, h: H * 0.66 };
          const cut = CK.earthCut(ctx, box, LAYERS, { mode: "half" });
          const cx = cut.cx, cy = cut.cy, R = Math.min(box.w / 2, box.h);
          const rate = clamp(2 + 9 * st / visc, 0.5, 12);
          // 對流胞畫在地函環帶內(clip 進環帶);有效推力 = 熱差 ÷ 黏度
          const eff = st / visc, m0 = cut.out[1].r0, m1 = cut.out[1].r1, cH = R * (0.17 + 0.07 * eff);
          ctx.save();
          ctx.beginPath(); ctx.arc(cx, cy, m0, Math.PI, 0); ctx.arc(cx, cy, m1, 0, Math.PI, true); ctx.closePath(); ctx.clip();
          [[cx - R * 0.42, -1], [cx + R * 0.42, 1]].forEach(([ccx, dir], k) => {
            const cy0 = cy - R * 0.72, rx = R * 0.30;
            ctx.save(); ctx.strokeStyle = k ? "rgba(92,145,220,0.5)" : "rgba(255,112,67,0.55)"; ctx.lineWidth = 1.6;
            ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.ellipse(ccx, cy0, rx, cH, 0, 0, TAU); ctx.stroke(); ctx.restore();
            for (let i = 0; i < 7; i++) {
              const th = dir * t * (0.25 + 0.55 * eff) + i * TAU / 7 + (k ? Math.PI : 0);
              const x = ccx + Math.cos(th) * rx, y = cy0 + Math.sin(th) * cH;
              const rising = dir * Math.cos(th) < 0; // 垂直速度往上 = 熱流
              D.disc(ctx, x, y, 3.4, { fill: rising ? "#ff7043" : "#5c91dc", glow: rising ? "#ff5722" : null, glowSize: 6 });
            }
          });
          // 洋脊下的上升熱柱
          const pl = ctx.createRadialGradient(cx, cy - R * 0.94, 1, cx, cy - R * 0.94, R * (0.05 + 0.11 * eff));
          pl.addColorStop(0, "rgba(255,112,67," + (0.35 + 0.4 * st) + ")"); pl.addColorStop(1, "rgba(255,112,67,0)");
          ctx.fillStyle = pl; ctx.fillRect(cx - R * 0.2, cy - R * 1.05, R * 0.4, R * 0.4);
          ctx.restore();
          // 板塊騎在對流上被帶動
          D.rect(ctx, cx - R * 0.95, cy - R - 7, R * 1.9, 7, { fill: "#8a6f52" });
          D.disc(ctx, cx - R * 0.95 + ((t * rate * 2.4) % (R * 1.9)), cy - R - 3.5, 4, { fill: "#ffe082", glow: "#ffb300", glowSize: 6 });
          D.text(ctx, "中洋脊(張裂)", cx, cy - R - 16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "海溝(隱沒下沈)", cx + R * 0.82, cy - R - 16, { color: PL.col("text-dim"), size: 10.5 });
          if (ar) D.arrow(ctx, cx - R * 0.25, cy - R - 26, cx + R * 0.55, cy - R - 26, { color: PL.col("accent"), width: 2.6, label: "板塊 " + PL.fmt(rate, 1) + " cm/年" });
          D.text(ctx, "軟流圈:固態,但可緩慢流動", cx - R * 0.86, cy - R * 0.30, { color: "#fff", size: 9.5 });
          CK.panel(ctx, W * 0.60, H * 0.12, W * 0.36, H * 0.56, "誰在推板塊?");
          [["板拉:隱沒板片自身重量(主力)", "#ef5350"], ["脊推:洋脊高起的坡差", "#ffb300"], ["底拖:對流黏拽板塊底部", "#5c91dc"]].forEach((rw, i) => {
            D.disc(ctx, W * 0.625, H * 0.22 + i * 30 - 4, 4, { fill: rw[1] });
            D.text(ctx, rw[0], W * 0.645, H * 0.22 + i * 30, { color: PL.col("text-dim"), size: 10.5 });
          });
          D.text(ctx, "實測(GNSS):太平洋 ≈ 7–10、大西洋 ≈ 2、", W * 0.78, H * 0.52, { color: PL.col("text-faint"), size: 10 });
          D.text(ctx, "歐亞板塊內部 < 1 cm/年", W * 0.78, H * 0.57, { color: PL.col("text-faint"), size: 10 });
          rRate.set(rate, 1); rCycle.set(clamp(3.2 * visc / Math.max(0.15, st), 1, 10), 1); rAst.set("固態·S 波可通過"); rDrv.set("隱沒拉力 > 脊推");
        }
      });
      const convS = PL.ui.slider(ui.L.controls, { label: "對流強度(熱差)", min: 0.1, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const visS = PL.ui.slider(ui.L.controls, { label: "軟流圈黏度", min: 0.5, max: 3, step: 0.1, value: 1, unit: "×10²¹ Pa·s", digits: 1 });
      const arrChk = PL.ui.checkbox(ui.L.controls, { label: "顯示板塊移動箭頭", checked: true });
      PL.ui.note(ui.L.controls, "地函幾乎全是固態(S 波通過就是證據),但在千萬年尺度下像極黏的瀝青會流動:熱的上升、冷的下沉,板塊就騎在這條輸送帶上。");
      PL.ui.procedure(ui.L.controls, {
        title: "對流與板塊怎麼合作",
        steps: ["拉高「對流強度」:對流胞變大、光點加速,板塊速率讀數跟著上升。", "調高「黏度」:同樣熱差,流動變慢——速率 = 推力 ÷ 阻力。",
          "看洋脊與海溝:上升處張裂生成新殼,下沉處把舊殼拖回地函。", "對照右表:實測板塊速率都在每年數公分,和模型量級一致。"],
        rule: "板塊不是被「地函滾水」推著走的浮船:隱沒板片的下拉力才是主力,對流與板塊運動互為因果,不是單向誰推誰。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "活躍對流", apply: () => { convS.set(1); visS.set(0.5); ui.redraw(); } },
        { label: "今日地球", apply: () => { convS.set(0.6); visS.set(1); ui.redraw(); } },
        { label: "內部冷卻後", apply: () => { convS.set(0.15); visS.set(3); ui.redraw(); } }
      ] });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "板塊移動速率", unit: "cm/年" }), rCycle = PL.ui.readout(ui.L.readouts, { label: "對流一輪約", unit: "億年" });
      const rAst = PL.ui.readout(ui.L.readouts, { label: "軟流圈物態" }), rDrv = PL.ui.readout(ui.L.readouts, { label: "主要驅動" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 三種板塊邊界:張裂、聚合、錯動 */
  PL.register("plate-boundaries", {
    build(root) {
      const INFO = {
        divergent: { land: "中洋脊、裂谷", volc: "玄武岩質,寧靜噴發", quake: "淺源(0–35 km)", ex: "冰島、東非裂谷" },
        "convergent-ocean": { land: "海溝、火山島弧", volc: "安山岩質,猛烈噴發", quake: "淺中深都有(至 700 km)", ex: "馬里亞納、智利" },
        "convergent-cont": { land: "高大山脈、高原", volc: "少(地殼太厚岩漿難上升)", quake: "淺中源、分布廣", ex: "喜馬拉雅、阿爾卑斯" },
        transform: { land: "斷層谷、錯位的河川", volc: "幾乎沒有", quake: "淺源但常很強", ex: "聖安德烈斯斷層" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const type = typeSel.get(), rate = rateS.get(), tmr = timeS.get(), ex = exChk.get();
          const bx = { x: W * 0.03, y: H * 0.14, w: W * 0.60, h: H * 0.66 };
          CK.plateBoundary(ctx, bx, type, { time: t, erupting: rate > 7, offset: 0 });
          if (ex) CK.badge(ctx, bx.x + bx.w * 0.5, bx.y + bx.h * 0.97, INFO[type].ex, PL.col("accent"));
          // 累積位移尺:1 cm/年 = 10 km/百萬年
          const dist = rate * 10 * tmr, rx = W * 0.05, rw = W * 0.56, ry = H * 0.90;
          D.rect(ctx, rx, ry, rw, 18, { fill: PL.theme.shade(0.45), stroke: PL.col("border"), r: 9 });
          D.rect(ctx, rx + 2, ry + 2, Math.max(5, clamp(dist / 1000, 0, 1) * (rw - 4)), 14, { fill: "#66bb6a", r: 7 });
          D.text(ctx, "地質時間 " + PL.fmt(tmr, 1) + " 百萬年 → 累積位移 " + PL.fmt(dist, 0) + " km" + (dist > 999 ? "(滿尺)" : ""),
            rx + rw + 10, ry + 13, { color: PL.col("text-dim"), size: 10.5 });
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.31, H * 0.52, "這種邊界會出現什麼");
          const inf = INFO[type];
          [["代表地形", inf.land], ["火山活動", inf.volc], ["地震深度", inf.quake], ["實例", inf.ex]].forEach((rw, i) => {
            D.text(ctx, rw[0], W * 0.68, H * 0.22 + i * 34, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, rw[1], W * 0.68, H * 0.22 + i * 34 + 14, { color: PL.col("text"), size: 11, weight: "700" });
          });
          rType.set(type === "divergent" ? "張裂邊界(⊕←→)" : type === "transform" ? "錯動邊界(↑↓)" : type === "convergent-ocean" ? "聚合邊界·海溝隱沒(→←)" : "聚合邊界·陸陸碰撞(→←)");
          rLand.set(inf.land); rQ.set(inf.quake); rD.set(dist, 0);
        }
      });
      const typeSel = PL.ui.select(ui.L.controls, { label: "邊界類型", value: "convergent-ocean", options: [
        { value: "divergent", label: "張裂(中洋脊)" }, { value: "convergent-ocean", label: "聚合·海溝隱沒" },
        { value: "convergent-cont", label: "聚合·陸陸碰撞" }, { value: "transform", label: "錯動(轉形斷層)" }] });
      const rateS = PL.ui.slider(ui.L.controls, { label: "板塊相對速率", min: 1, max: 12, step: 0.5, value: 8, unit: "cm/年", digits: 1 });
      const timeS = PL.ui.slider(ui.L.controls, { label: "地質時間", min: 0, max: 10, step: 0.5, value: 5, unit: "百萬年", digits: 1 });
      const exChk = PL.ui.checkbox(ui.L.controls, { label: "顯示實例地名", checked: true });
      const depCv = ui.chart("震源深度分布:判斷邊界的線索", "深源地震(>300 km)只在隱沒帶出現:張裂與錯動邊界的地殼脆,地震全是淺源。");
      function drawChart() {
        if (depCv.W < 60) return;
        const type = typeSel.get();
        const g = PL.graph(depCv, { x: 46, y: 14, w: depCv.W - 60, h: depCv.H - 44 }, { x0: 0, x1: 1, y0: 700, y1: 0 });
        g.frame({ yticks: [0, 100, 300, 500, 700], ylabel: "震源深度 (km)" }); g.grid(3, 4);
        [["張裂", 0.04, 0.29, 35], ["聚合(隱沒)", 0.38, 0.63, 700], ["錯動", 0.72, 0.97, 35]].forEach(([nm, x0, x1, dmax]) => {
          const cur = (type === "divergent" && nm === "張裂") || (type === "transform" && nm === "錯動") ||
            (nm === "聚合(隱沒)" && type.indexOf("convergent") === 0);
          D.rect(depCv.ctx, g.X(x0), g.Y(dmax), g.X(x1) - g.X(x0), g.Y(0) - g.Y(dmax),
            { fill: cur ? "rgba(239,83,80,0.4)" : "rgba(92,145,220,0.22)", stroke: cur ? "#ef5350" : PL.col("border"), width: cur ? 2 : 1 });
          D.text(depCv.ctx, nm, (g.X(x0) + g.X(x1)) / 2, g.Y(0) - 6, { color: cur ? "#ef5350" : PL.col("text-dim"), size: 10.5, align: "center", weight: "700" });
          if (nm === "聚合(隱沒)") for (let i = 0; i < 9; i++)
            D.disc(depCv.ctx, g.X(x0 + 0.08 + (i * 37 % 47) / 100), g.Y(50 + (i * 137) % 620), 2.4, { fill: "#ef5350" });
        });
      }
      depCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "張裂生成新海洋地殼、聚合把舊地殼消滅回地函、錯動不生不滅只滑移——全球板塊表面積守恆,靠這三種邊界分配。");
      PL.ui.procedure(ui.L.controls, {
        title: "一張圖判邊界",
        steps: ["切四種邊界:看箭頭方向與地殼剖面有什麼不同。", "拉速率與地質時間:8 cm/年跑 1,000 萬年 = 800 km 的位移。",
          "切到聚合·隱沒,速率拉過 7:火山開始猛烈噴發。", "對照下圖:為什麼深源地震只出現在隱沒帶?冷板片下插到 700 km 還是脆的。"],
        rule: "錯動邊界地震淺而強、幾乎沒有火山;別把「地震多」直接等同「有火山」——兩者由不同的機制決定。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "東非裂谷", apply: () => { typeSel.set("divergent"); rateS.set(0.6 * 10); timeS.set(5); ui.redraw(); drawChart(); } },
        { label: "安地斯", apply: () => { typeSel.set("convergent-ocean"); rateS.set(8); timeS.set(10); ui.redraw(); drawChart(); } },
        { label: "喜馬拉雅", apply: () => { typeSel.set("convergent-cont"); rateS.set(5); timeS.set(10); ui.redraw(); drawChart(); } },
        { label: "聖安德烈斯", apply: () => { typeSel.set("transform"); rateS.set(5); timeS.set(10); ui.redraw(); drawChart(); } }
      ] });
      const rType = PL.ui.readout(ui.L.readouts, { label: "邊界類型" }), rLand = PL.ui.readout(ui.L.readouts, { label: "代表地形" });
      const rQ = PL.ui.readout(ui.L.readouts, { label: "地震深度" }), rD = PL.ui.readout(ui.L.readouts, { label: "累積位移", unit: "km" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 海底地形與大陸邊緣:從海灘到海溝 */
  PL.register("continental-margin", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const exag = exagS.get(), sed = sedS.get(), act = actSel.get() === "active";
          const shownKm = 110 / exag;                      // 誇大越大,可視深度窗越小
          const box = { x: W * 0.03, y: H * 0.16, w: W * 0.60, h: H * 0.70 };
          const depthFrac = km => clamp(km / shownKm, 0, 1.04);
          const feats = (act ? [
            ["大陸棚", 12, 0.2], ["大陸坡", 12, 3.2], ["海溝", 7, 11], ["深海平原", 36, 5.5], ["中洋脊", 22, 2.5], ["深海平原", 11, 5.5]
          ] : [
            ["大陸棚", 14, 0.2], ["大陸坡", 10, 3.4], ["大陸隆堆", 13, 4.5], ["深海平原", 30, 5], ["中洋脊", 22, 2.5], ["深海平原", 11, 5]
          ]).map(f => ({ label: f[0], w: f[1], depth: depthFrac(f[2]) }));
          D.rect(ctx, box.x, box.y, box.w, box.h, { fill: PL.theme.isLight() ? "rgba(74,144,217,0.85)" : "rgba(27,77,112,0.9)" });
          D.text(ctx, "海水", box.x + 8, box.y + 14, { color: "rgba(255,255,255,0.8)", size: 10 });
          const prof = CK.seaProfile(ctx, box, feats, {});
          // 沉積物披覆:邊緣厚、往洋脊變薄
          const pxKm = prof.depthMax / shownKm, ridgeI = 4;
          [[0, ridgeI, sed], [ridgeI, prof.nodes.length - 1, sed * 0.2]].forEach(([i0, i1, th]) => {
            if (th <= 0.01 || i1 <= i0) return;
            ctx.save(); ctx.strokeStyle = "rgba(214,182,128,0.6)"; ctx.lineWidth = Math.max(2, th * pxKm); ctx.lineCap = "butt";
            ctx.beginPath(); for (let i = i0; i <= i1; i++) { const n = prof.nodes[i]; i === i0 ? ctx.moveTo(n[0], n[1]) : ctx.lineTo(n[0], n[1]); }
            ctx.stroke(); ctx.restore();
          });
          // 深度尺(隨誇大改變)
          [0, 2, 4, 6, 8, 10].forEach(km => {
            const y = prof.surf + km * pxKm; if (y > box.y + box.h) return;
            D.line(ctx, box.x + box.w, y, box.x + box.w + 8, y, PL.col("border"), 1);
            D.text(ctx, "−" + km + " km", box.x + box.w + 11, y + 3, { color: PL.col("text-faint"), size: 9 });
          });
          D.text(ctx, "垂直誇大 " + PL.fmt(exag, 0) + " ×(水平 1:1500 萬)", box.x + box.w * 0.5, box.y - 10, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          if (sed > 0.05) D.text(ctx, "土黃色=沉積物:邊緣 " + PL.fmt(sed, 1) + " km 厚,往洋脊變薄變年輕", box.x + box.w * 0.5, box.y + box.h + 16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.67, H * 0.14, W * 0.30, H * 0.60, "水深對照表");
          [["大陸棚", "< 200 m"], ["大陸坡", "200–3,000 m"], ["大陸隆堆", "3,000–4,500 m"], ["深海平原", "4,000–6,000 m"],
           ["中洋脊(最長山脈 6 萬 km)", "峰頂 ≈ −2,500 m"], ["馬里亞納海溝", "−11,034 m"]].forEach((rw, i) => {
            D.text(ctx, rw[0], W * 0.69, H * 0.23 + i * 32, { color: PL.col("text-dim"), size: 10 });
            D.text(ctx, rw[1], W * 0.95, H * 0.23 + i * 32, { color: i === 5 ? "#ef5350" : PL.col("text"), size: 10.5, align: "right", weight: i === 5 ? "700" : "400" });
          });
          rShelf.set(0.2, 1); rDeep.set(act ? 11 : 6, 1); rRidge.set(2.5, 1); rSed.set(sed, 1);
          vMarg.set(act ? "活動邊緣:有海溝與隱沒,地震帶" : "被動邊緣:無板塊界線,沉積物厚", act ? "warn" : "info");
        }
      });
      const exagS = PL.ui.slider(ui.L.controls, { label: "垂直誇大倍數", min: 5, max: 50, step: 1, value: 12, unit: "×", digits: 0 });
      const sedS = PL.ui.slider(ui.L.controls, { label: "沉積物最厚", min: 0, max: 3, step: 0.1, value: 1.5, unit: "km", digits: 1 });
      const actSel = PL.ui.select(ui.L.controls, { label: "邊緣類型", value: "passive", options: [
        { value: "passive", label: "被動邊緣(大西洋型)" }, { value: "active", label: "活動邊緣(太平洋型)" }] });
      const hypCv = ui.chart("海陸高程統計(等高面積曲線)", "兩個高原:陸地集中在 0 m 上下(占 29%)、深海盆在 −4~−6 km;海平面正好停在兩高原之間的陡坡。");
      function drawChart() {
        if (hypCv.W < 60) return;
        const g = PL.graph(hypCv, { x: 46, y: 14, w: hypCv.W - 60, h: hypCv.H - 44 }, { x0: -11, x1: 8, y0: 0, y1: 100 });
        g.frame({ xlabel: "高程 (km)", ylabel: "累積面積 (%)" }); g.grid(4, 4);
        g.curve([[8, 0], [2, 5], [0.5, 20], [0, 29], [-0.5, 40], [-2, 55], [-4, 78], [-6, 99], [-11, 100]], { color: "#5c91dc", width: 2.4 });
        g.vline(0, { color: "#66bb6a", dash: [5, 4], label: "海平面" });
        g.dot(0, 29, { color: "#66bb6a", label: "陸 29%" });
      }
      hypCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "海底不是一個平盤:棚、坡、隆堆、平原、洋脊、海溝各有深度與年齡的規律——這些地形就是板塊生成與隱沒的紀錄。");
      PL.ui.procedure(ui.L.controls, {
        title: "為什麼地圖上的海看起來很平",
        steps: ["誇大 5×:剖面幾乎是平線——真實比例下 11 km 的起伏根本看不見。", "拉到 40×:大陸棚、洋脊的細節浮出來,海溝卻切出畫面下緣。",
          "切到活動邊緣:海溝出現,深度直逼 11 km。", "拉沉積物滑桿:靠陸側厚、近洋脊薄——離脊越遠地殼越老、沉積越久。"],
        rule: "大陸棚水深小於 200 m、寬可達上百公里;別把「海岸線」當成「大陸邊緣的盡頭」——真正的邊界在大陸坡腳。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "大西洋型", apply: () => { actSel.set("passive"); exagS.set(12); ui.redraw(); drawChart(); } },
        { label: "太平洋型", apply: () => { actSel.set("active"); exagS.set(12); ui.redraw(); drawChart(); } },
        { label: "看洋脊細節", apply: () => { actSel.set("passive"); exagS.set(40); sedS.set(0.5); ui.redraw(); drawChart(); } }
      ] });
      const rShelf = PL.ui.readout(ui.L.readouts, { label: "大陸棚水深", unit: "km" }), rDeep = PL.ui.readout(ui.L.readouts, { label: "剖面最深", unit: "km" });
      const rRidge = PL.ui.readout(ui.L.readouts, { label: "洋脊峰水深", unit: "km" }), rSed = PL.ui.readout(ui.L.readouts, { label: "沉積物最厚", unit: "km" });
      const vMarg = PL.ui.verdict(ui.L.readouts, { label: "邊緣性質" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 古地磁與海底擴張:對稱的磁條帶 */
  PL.register("paleomagnetism", {
    build(root) {
      const BANDS = [[0, 0.78, 1], [0.78, 1.03, 0], [1.03, 1.88, 1], [1.88, 2.14, 0], [2.14, 3.11, 1], [3.11, 3.33, 0], [3.33, 4.10, 1], [4.10, 4.30, 0], [4.30, 5, 1]];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const v = vS.get(), tick = tickChk.get(), tAge = ageS.get();
          const box = { x: W * 0.03, y: H * 0.22, w: W * 0.62, h: H * 0.52 };
          const u = box.w * 0.48 / (5 * v * 10);           // 每側最遠 5 Ma 的寬度
          const rx = box.x + box.w * 0.5;
          D.rect(ctx, box.x, box.y, box.w, box.h, { fill: "rgba(70,110,160,0.35)", stroke: PL.col("border"), r: 8 });
          BANDS.forEach(b => {
            const x1 = b[1] * v * 10 * u, x0 = b[0] * v * 10 * u;
            D.rect(ctx, rx + x0, box.y, x1 - x0, box.h, { fill: b[2] ? "#3f5568" : "#b0bec5" });
            D.rect(ctx, rx - x1, box.y, x1 - x0, box.h, { fill: b[2] ? "#3f5568" : "#b0bec5" });
          });
          if (tick) BANDS.forEach(b => {
            const x = b[1] * v * 10 * u;
            D.line(ctx, rx + x, box.y, rx + x, box.y + box.h, "rgba(255,255,255,0.3)", 1, [4, 4]);
            D.line(ctx, rx - x, box.y, rx - x, box.y + box.h, "rgba(255,255,255,0.3)", 1, [4, 4]);
            D.text(ctx, PL.fmt(b[1], 2) + " Ma", rx + x, box.y + box.h + 14, { color: PL.col("text-faint"), size: 9, align: "center" });
          });
          // 聚焦條帶:同一地質年代,兩側對稱出現
          const band = BANDS.find(b => tAge >= b[0] && tAge < b[1]) || BANDS[0];
          const d0 = band[0] * v * 10 * u, d1 = band[1] * v * 10 * u, bw = Math.max(2, d1 - d0);
          [rx + d0, rx - d1].forEach(x => {
            ctx.save(); ctx.fillStyle = "rgba(255,235,59,0.28)";
            ctx.fillRect(x, box.y, bw, box.h); ctx.restore();
          });
          const mid = (band[0] + band[1]) / 2 * v * 10 * u;
          D.disc(ctx, rx + mid, box.y + box.h * 0.3, 4, { fill: "#ffd54f", glow: "#ffb300", glowSize: 8 });
          D.disc(ctx, rx - mid, box.y + box.h * 0.3, 4, { fill: "#ffd54f", glow: "#ffb300", glowSize: 8 });
          // 洋脊:新地殼誕生處 + 擴張方向
          ctx.save(); ctx.fillStyle = "#ff7043";
          for (let y = box.y + 4; y < box.y + box.h - 4; y += 10) {
            ctx.beginPath(); ctx.moveTo(rx - 5, y + 5); ctx.lineTo(rx, y - 2); ctx.lineTo(rx + 5, y + 5); ctx.closePath(); ctx.fill();
          }
          ctx.restore();
          D.text(ctx, "中洋脊:新地殼在此冷卻、定格當時磁場", rx, box.y - 10, { color: "#ff7043", size: 11, align: "center", weight: "700" });
          D.arrow(ctx, rx - 12, box.y + box.h * 0.72, rx - 60, box.y + box.h * 0.72, { color: PL.col("accent"), width: 2.4 });
          D.arrow(ctx, rx + 12, box.y + box.h * 0.72, rx + 60, box.y + box.h * 0.72, { color: PL.col("accent"), width: 2.4, label: "擴張方向" });
          // 輸送帶光點:以擴張速率被帶開
          for (let i = 0; i < 6; i++) {
            const d = ((t * v * 10 + i * (5 * v * 10) / 6) % (5 * v * 10)) * u;
            D.disc(ctx, rx + d, box.y + box.h * 0.55, 2.6, { fill: "#ffcc80" });
            D.disc(ctx, rx - d, box.y + box.h * 0.55, 2.6, { fill: "#ffcc80" });
          }
          CK.legend(ctx, W * 0.68, H * 0.20, [
            { color: "#3f5568", label: "正磁極條帶(同現在)" }, { color: "#b0bec5", label: "反磁極條帶(磁北反轉)" },
            { color: "rgba(255,235,59,0.9)", label: "聚焦:兩側同齡、鏡像對稱" }], 19);
          D.text(ctx, "條帶對稱於洋脊 = 海底正被等速帶開", W * 0.83, H * 0.40, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          D.text(ctx, "最老海底只約 2 億年;大陸岩石可達 40 億年", W * 0.83, H * 0.47, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          rHalf.set(v * 10, 0); rAge100.set(100 / (v * 10), 2); rSym.set("兩側鏡像對稱"); rOld.set("≈ 2 億年");
          rFoc.set("聚焦條帶 " + PL.fmt(band[0], 2) + "–" + PL.fmt(band[1], 2) + " Ma,距脊 " + PL.fmt(mid / u, 0) + " km");
        }
      });
      const vS = PL.ui.slider(ui.L.controls, { label: "擴張速率(每側)", min: 1, max: 10, step: 0.5, value: 3, unit: "cm/年", digits: 1 });
      const ageS = PL.ui.slider(ui.L.controls, { label: "聚焦條帶年代", min: 0, max: 4.9, step: 0.02, value: 1.4, unit: "Ma", digits: 2 });
      const tickChk = PL.ui.checkbox(ui.L.controls, { label: "顯示地磁反轉時間軸", checked: true });
      const ageCv = ui.chart("地殼年齡 vs 距洋脊距離", "直線斜率 = 擴張速率:同樣 100 km,大西洋(2 cm/年)要走 500 萬年、東太平洋(10 cm/年)只要 100 萬年。");
      function drawChart() {
        if (ageCv.W < 60) return;
        const v = vS.get();
        const g = PL.graph(ageCv, { x: 46, y: 14, w: ageCv.W - 60, h: ageCv.H - 44 }, { x0: 0, x1: 100, y0: 0, y1: 5 });
        g.frame({ xlabel: "距洋脊 (km)", ylabel: "地殼年齡 (Ma)" }); g.grid(4, 4);
        g.fn(d => d / 10, { color: "#5c91dc", width: 2 }); g.fn(d => d / 100, { color: "#66bb6a", width: 2 });
        g.dot(100, 100 / (v * 10), { color: "#ffb300", label: "現速率" });
      }
      ageCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "熔岩冷卻時,磁性礦物像小磁針一樣定格當時的地磁方向;地磁不定期反轉,於是洋脊兩側留下一圈圈對稱的磁條帶——海底擴張的錄音帶。");
      PL.ui.procedure(ui.L.controls, {
        title: "用量尺驗證擴張",
        steps: ["拉「聚焦條帶年代」:黃色亮帶永遠同時出現在脊的兩側。", "把速率調到 10:所有條帶變寬——同樣年代擠出更長的距離。",
          "讀「距脊 100 km 的年齡」:速率越快,同距離越年輕。", "對照下圖兩條直線:斜率就是擴張快慢。"],
        rule: "v = 條帶距離 ÷ 反轉年齡;對稱性是海底擴張的指紋,不是畫圖時「畫漂亮」的巧合。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "大西洋(慢)", apply: () => { vS.set(2); ui.redraw(); drawChart(); } },
        { label: "東太平洋(快)", apply: () => { vS.set(9); ui.redraw(); drawChart(); } },
        { label: "布容反轉(0.78 Ma)", apply: () => { ageS.set(0.76); ui.redraw(); drawChart(); } }
      ] });
      const rHalf = PL.ui.readout(ui.L.readouts, { label: "條帶半寬(1 Ma)", unit: "km" }), rAge100 = PL.ui.readout(ui.L.readouts, { label: "距脊 100 km 年齡", unit: "Ma" });
      const rSym = PL.ui.readout(ui.L.readouts, { label: "對稱性" }), rOld = PL.ui.readout(ui.L.readouts, { label: "最老海底" }), rFoc = PL.ui.readout(ui.L.readouts, { label: "聚焦條帶" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 熱點與島鏈:板塊內部的測速器 */
  PL.register("hotspot", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const rate = rateS.get(), dirDeg = dirS.get(), span = spanS.get(), bend = bendChk.get();
          const hx = W * 0.62, hy = H * 0.46;
          const stepKm = rate * 10 * 2;                       // 每 2 Ma 一步
          const totalKm = span * rate * 10;
          const pxKm = Math.min(W * 0.52, H * 0.62) / Math.max(totalKm, 600);
          D.rect(ctx, 0, H * 0.10, W, H * 0.82, { fill: PL.theme.isLight() ? "rgba(74,144,217,0.5)" : "rgba(27,77,112,0.75)" });
          D.text(ctx, "海洋板塊(往 " + Math.round(dirDeg) + "° 移動)", W * 0.06, H * 0.15, { color: "rgba(255,255,255,0.85)", size: 10.5 });
          // 島鏈:由熱點往回走,年齡沿鏈遞增
          let px = hx, py = hy, isles = [];
          for (let age = 2; age <= span; age += 2) {
            const dv = (bend && age >= 40) ? [0, -1] : dirV(dirDeg);
            px += dv[0] * stepKm * pxKm; py += dv[1] * stepKm * pxKm;
            isles.push({ x: px, y: py, age });
          }
          isles.forEach(isl => {
            const r = clamp(10 - isl.age * 0.12, 2.5, 10);
            const col = isl.age < 10 ? "#7cb342" : isl.age < 30 ? "#a8b86f" : "#c0a16b";
            D.disc(ctx, isl.x, isl.y, r, { fill: col, stroke: "rgba(40,60,30,0.7)", width: 1 });
            if (isl.age % 10 === 0) D.text(ctx, isl.age + " Ma", isl.x, isl.y - r - 5, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          });
          // 現生火山(熱點正上方)
          D.disc(ctx, hx, hy, 11, { fill: "#7cb342", stroke: "rgba(40,60,30,0.7)", width: 1.4 });
          D.disc(ctx, hx, hy, 5, { fill: "#ff7043", glow: "#ff5722", glowSize: 12 + 4 * Math.sin(t * 5) });
          ctx.save(); ctx.strokeStyle = "rgba(255,112,67,0.5)"; ctx.setLineDash([4, 4]);
          [1.9, 2.6].forEach(k => D.ring(ctx, hx, hy, 11 * k, "rgba(255,112,67,0.45)", 1.4, [4, 4])); ctx.restore();
          D.text(ctx, "熱點(固定於深地函)", hx + 16, hy + 18, { color: "#ff7043", size: 10.5, weight: "700" });
          const dv = dirV(dirDeg);
          D.arrow(ctx, hx + dv[0] * 26, hy + dv[1] * 26, hx + dv[0] * (26 + rate * 7), hy + dv[1] * (26 + rate * 7),
            { color: PL.col("accent"), width: 2.6, label: "板塊 " + PL.fmt(rate, 0) + " cm/年" });
          if (bend && span >= 42) {
            const b40 = isles.find(x => x.age === 40);
            if (b40) CK.badge(ctx, b40.x + 8, b40.y - 20, "≈40 Ma 轉折:板塊轉向", "#ffb300");
          }
          CK.compassRose(ctx, W * 0.94, H * 0.17, 20);
          CK.panel(ctx, W * 0.03, H * 0.60, W * 0.30, H * 0.32, "怎麼量板塊速率");
          D.text(ctx, "v = 島距 ÷ 年齡差", W * 0.18, H * 0.69, { color: PL.col("accent"), size: 12, align: "center", weight: "700" });
          D.text(ctx, "夏威夷:相鄰兩島約 200 km、", W * 0.18, H * 0.76, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "年齡差約 2 Ma → ≈ 10 cm/年", W * 0.18, H * 0.81, { color: PL.col("text-faint"), size: 10, align: "center" });
          rSp2.set(stepKm, 0); rOld.set(span, 0); rLen.set(totalKm, 0); rHot.set(bend && span >= 42 ? "鏈有轉折:板塊曾轉向" : "熱點相對固定");
        }
      });
      const rateS = PL.ui.slider(ui.L.controls, { label: "板塊速率", min: 2, max: 15, step: 0.5, value: 10, unit: "cm/年", digits: 1 });
      const dirS = PL.ui.slider(ui.L.controls, { label: "板塊移動方向", min: 240, max: 330, step: 5, value: 285, unit: "°(羅盤角)", digits: 0 });
      const spanS = PL.ui.slider(ui.L.controls, { label: "島鏈總時間", min: 4, max: 60, step: 2, value: 40, unit: "Ma", digits: 0 });
      const bendChk = PL.ui.checkbox(ui.L.controls, { label: "顯示天皇海嶺轉折(>40 Ma 向北)", checked: false });
      const ageCv = ui.chart("島齡 vs 距熱點距離", "過原點的直線:斜率 = 速率 × 10(km/百萬年);只要量兩個島,就能解出板塊的速度向量。");
      function drawChart() {
        if (ageCv.W < 60) return;
        const rate = rateS.get(), span = spanS.get();
        const g = PL.graph(ageCv, { x: 46, y: 14, w: ageCv.W - 60, h: ageCv.H - 44 }, { x0: 0, x1: 60, y0: 0, y1: Math.max(600, span * rate * 10) });
        g.frame({ xlabel: "島齡 (Ma)", ylabel: "距熱點 (km)" }); g.grid(4, 4);
        g.fn(a => a * rate * 10, { color: "#5c91dc", width: 2.4 });
        g.dot(span, span * rate * 10, { color: "#ffb300", label: "最老島" });
      }
      ageCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "熱點是板塊內部的固定噴口:板塊像輸送帶把火山一個個帶走,新島在熱點上誕生——島鏈年齡沿鏈遞增,方向就是板塊運動方向。");
      PL.ui.procedure(ui.L.controls, {
        title: "用島鏈解出速度向量",
        steps: ["拉「島鏈總時間」:島變多、鏈變長,老島在鏈的末端。", "拉「板塊速率」:島距變寬,右圖斜率變陡。",
          "拉「移動方向」:整條鏈跟著轉——鏈的方向與運動方向平行、相反於運動前方。", "勾轉折:40 Ma 前板塊向北,島鏈折出天皇海嶺的 L 形。"],
        rule: "島被帶走的方向 = 板塊運動方向;熱點不受邊界限制,所以島鏈可以橫切海底地形與磁條帶——別把方向畫反。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "夏威夷鏈", apply: () => { rateS.set(10); dirS.set(285); spanS.set(40); bendChk.set(false); ui.redraw(); drawChart(); } },
        { label: "夏威夷-天皇", apply: () => { rateS.set(10); dirS.set(285); spanS.set(60); bendChk.set(true); ui.redraw(); drawChart(); } },
        { label: "慢速熱點鏈", apply: () => { rateS.set(3); dirS.set(285); spanS.set(40); bendChk.set(false); ui.redraw(); drawChart(); } }
      ] });
      const rSp2 = PL.ui.readout(ui.L.readouts, { label: "相鄰島距(2 Ma)", unit: "km" }), rOld = PL.ui.readout(ui.L.readouts, { label: "最老島齡", unit: "Ma" });
      const rLen = PL.ui.readout(ui.L.readouts, { label: "鏈總長", unit: "km" }), rHot = PL.ui.readout(ui.L.readouts, { label: "熱點狀態" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 台灣的板塊構造:呂宋島弧撞上大陸邊緣 */
  PL.register("taiwan-tectonics", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const rate = rateS.get(), tmr = tmS.get(), arc = arcChk.get();
          const mw = Math.min(W * 0.40, H * 0.80 / 1.625), box = { x: W * 0.05, y: H * 0.09, w: mw, h: mw * 1.625 };
          const pxKmX = box.w / 252, pxKmY = box.h / 410;   // 經 1°≈101 km、緯 1°≈111 km
          const proj = CK.taiwanMap(ctx, box, { markers: [
            { lon: 121.55, lat: 25.05, label: "台北", color: "#5c91dc" },
            { lon: 120.98, lat: 23.75, label: "中央山脈", color: "#8d6e63" }] });
          // 花東縱谷:兩板塊縫合線
          const v1 = proj(121.02, 24.15), v2 = proj(121.18, 23.15);
          D.line(ctx, v1[0], v1[1], v2[0], v2[1], "#c0392b", 3.5);
          D.text(ctx, "花東縱谷(縫合線)", v2[0] + 10, v2[1] + 12, { color: "#c0392b", size: 10, weight: "700" });
          // 過去位置:板塊聚合把台灣往西北推
          if (tmr > 0.04) {
            const dist = rate * 10 * tmr, gx = dist * pxKmX * 0.72, gy = dist * pxKmY * 0.72;
            ctx.save(); ctx.translate(gx, gy);
            CK.taiwanMap(ctx, box, { fill: "rgba(150,170,140,0.28)" });
            ctx.restore();
            D.text(ctx, tmr + " 百萬年前的位置", box.x + box.w * 0.62 + gx, box.y + box.h * 0.92 + gy, { color: PL.col("text-faint"), size: 9.5, align: "center" });
            D.arrow(ctx, box.x + box.w * 0.62 + gx, box.y + box.h * 0.92 + gy - 24, box.x + box.w * 0.62, box.y + box.h * 0.92 - 24,
              { color: PL.col("accent"), width: 1.6, dash: [4, 3] });
          }
          // 菲律賓海板塊:西北向 ~8 cm/年
          const p0 = proj(122.32, 22.05), L = 24 + rate * 3.4;
          D.arrow(ctx, p0[0], p0[1], p0[0] - L * 0.71, p0[1] - L * 0.71, { color: "#e57373", width: 3, label: "菲律賓海板塊" });
          CK.badge(ctx, p0[0] + 4, p0[1] + 16, PL.fmt(rate, 0) + " cm/年 NW", "#e57373");
          const e0 = proj(120.28, 24.75);
          D.arrow(ctx, e0[0], e0[1], e0[0] + 22 * 0.71, e0[1] + 22 * 0.71, { color: "#5c91dc", width: 2, label: "歐亞板塊" });
          if (arc) {
            [[121.62, 21.95], [121.95, 21.75], [122.2, 21.55]].forEach(p => {
              const q = proj(p[0], p[1]);
              D.disc(ctx, q[0], q[1], 3.5, { fill: "#66bb6a", stroke: "#fff", width: 1 });
            });
            D.text(ctx, "呂宋島弧(火山弧)", proj(122.2, 21.55)[0] - 6, proj(122.2, 21.55)[1] + 14, { color: "#66bb6a", size: 9.5, align: "right" });
          }
          CK.panel(ctx, W * 0.52, H * 0.10, W * 0.44, H * 0.46, "台灣造山快照");
          [["板塊組合", "歐亞 + 菲律賓海"], ["縫合線", "花東縱谷(不是一般斷層谷)"], ["聚合速率", PL.fmt(rate, 0) + " cm/年,西北向"],
           ["每年縮短", PL.fmt(rate * 10, 0) + " km/百萬年"], ["中央山脈抬升", "≈ 5–10 mm/年(仍在長高)"]].forEach((rw, i) => {
            D.text(ctx, rw[0], W * 0.545, H * 0.19 + i * 34, { color: PL.col("text-faint"), size: 10.5 });
            D.text(ctx, rw[1], W * 0.545, H * 0.19 + i * 34 + 14, { color: PL.col("text"), size: 11, weight: "700" });
          });
          D.text(ctx, "地震密集於東部(板塊界線)與西南(活動斷層)", W * 0.74, H * 0.53, { color: PL.col("text-faint"), size: 10, align: "center" });
          rRate.set(rate, 1); rShort.set(rate * 10, 0); rAcc.set(rate * 10 * tmr, 0);
          rUpl.set(tmr > 0 ? "已累積 " + PL.fmt(tmr, 1) + " Ma 造山" : "造山進行中");
          vTw.set(rate >= 10 ? "高聚合速率:地震能量累積快" : "持續聚合:台灣每年仍在長高", rate >= 10 ? "warn" : "ok");
        }
      });
      const rateS = PL.ui.slider(ui.L.controls, { label: "聚合速率", min: 4, max: 12, step: 0.5, value: 8, unit: "cm/年", digits: 1 });
      const tmS = PL.ui.slider(ui.L.controls, { label: "回溯地質時間", min: 0, max: 5, step: 0.1, value: 1, unit: "百萬年", digits: 1 });
      const arcChk = PL.ui.checkbox(ui.L.controls, { label: "顯示呂宋島弧", checked: true });
      const accCv = ui.chart("聚合量怎麼隨時間累積", "每年 8 公分 = 每百萬年 80 公里;台灣約 600 萬年的聚合造山,縮短量數百公里——一部分變高山、一部分隱沒消化。");
      function drawChart() {
        if (accCv.W < 60) return;
        const rate = rateS.get(), tmr = tmS.get();
        const g = PL.graph(accCv, { x: 46, y: 14, w: accCv.W - 60, h: accCv.H - 44 }, { x0: 0, x1: 5, y0: 0, y1: 600 });
        g.frame({ xlabel: "時間 (百萬年)", ylabel: "累積縮短 (km)" }); g.grid(5, 4);
        [4, 8, 12].forEach((r, i) => g.fn(x => r * 10 * x, { color: i === 1 ? "#e57373" : PL.col("text-faint"), width: i === 1 ? 2.4 : 1.4, dash: i === 1 ? null : [5, 4] }));
        g.dot(tmr, rate * 10 * tmr, { color: "#ffb300", label: "目前設定" });
      }
      accCv.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.note(ui.L.controls, "台灣站在兩個板塊的撞擊點上:呂宋島弧隨菲律賓海板塊以每年約 8 公分向西北撞進大陸邊緣,沉積層被擠壓成中央山脈——造山現在進行式。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀出台灣的地質位址",
        steps: ["看紅色箭頭:菲律賓海板塊往西北推,速率讀數 8 cm/年。", "拉「回溯地質時間」:半透明老位置在東南方,台灣整體被推向西北。",
          "拉高聚合速率:每百萬年縮短量與累積曲線斜率同步變大。", "找到紅線(花東縱谷):它以東屬菲律賓海板塊、以西屬歐亞板塊。"],
        rule: "花東縱谷是兩板塊的縫合線,不是普通河谷;台灣的地震因此集中在東部縱谷一帶與西南活動斷層區——位址決定災害分布。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "現在", apply: () => { rateS.set(8); tmS.set(0); ui.redraw(); drawChart(); } },
        { label: "回溯 5 Ma", apply: () => { rateS.set(8); tmS.set(5); ui.redraw(); drawChart(); } },
        { label: "快速聚合", apply: () => { rateS.set(12); tmS.set(3); ui.redraw(); drawChart(); } }
      ] });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "聚合速率", unit: "cm/年" }), rShort = PL.ui.readout(ui.L.readouts, { label: "每百萬年縮短", unit: "km" });
      const rAcc = PL.ui.readout(ui.L.readouts, { label: "累積縮短", unit: "km" }), rUpl = PL.ui.readout(ui.L.readouts, { label: "造山狀態" });
      const vTw = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      return { stop() { ui.stop(); } };
    }
  });
})();
