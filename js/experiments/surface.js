/* 模組六 · 風化侵蝕與地表地形 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 風化作用:物理與化學 */
  PL.register("weathering", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cyc = cycS.get(), chem = chemS.get(), yr = yrS.get();
          const E = cyc * yr / 10;                        // 累積有效凍融循環
          const n = clamp(1 + Math.floor(E / 16), 1, 8);  // 崩解成 n×n 塊
          const d = 80 / Math.pow(2, E / 30);             // 平均粒徑(cm)
          const gap = Math.min(1 + E * 0.012, 12);
          const soil = Math.min(chem * yr * 0.05, 120);   // 土壤厚度(cm)
          const { horizon } = CK.scene(ui.cv, { kind: "sky", horizon: 0.66 });
          // 大岩塊:凍融把它裂成 n×n 塊,化學風化染上鏽色
          const s = H * 0.30, bx = W * 0.24, by = horizon - s - 6;
          const rock = CK.mix("#8b8f96", "#b05a2a", chem * 0.55);
          for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
            const cw = s / n - (n > 1 ? gap : 0);
            D.rect(ctx, bx + i * (s / n), by + j * (s / n), cw, cw,
              { fill: rock, stroke: "rgba(35,38,44,0.55)", width: 1.2 });
          }
          if (n > 1 && cyc > 0) {
            // 裂隙裡的水:凍融的炸藥
            const fx = bx + s * 0.5, fy = by + s * ((t * 0.35) % 1);
            D.disc(ctx, fx, by + s * 0.25, 2.2, { fill: "rgba(110,170,230,0.85)" });
            D.disc(ctx, fx, fy, 2.2, { fill: "rgba(110,170,230,0.85)" });
            D.text(ctx, "裂隙水凍脹 → 撐裂岩塊", bx + s / 2, by - 12, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          }
          if (soil > 0.5) {
            const sh = Math.min(4 + soil * 0.35, H * 0.14);
            D.rect(ctx, W * 0.05, horizon + 2, W * 0.56, sh, { fill: "#6b4f33", r: 2 });
            D.text(ctx, "風化土壤 " + Math.round(soil) + " cm", W * 0.30, horizon + sh / 2 + 8, { color: "#e8dcc8", size: 10.5, align: "center", weight: "700" });
          }
          D.text(ctx, chem > 0.15 ? "氧化・水解進行中(鏽色 = 新礦物)" : "化學風化幾乎停滯(乾)",
            W * 0.30, H * 0.10, { color: chem > 0.15 ? "#c97a4a" : PL.col("text-faint"), size: 11, align: "center", weight: "700" });
          // 資料卡:兩種風化的對照
          CK.panel(ctx, W * 0.62, H * 0.14, W * 0.34, H * 0.58, "物理 vs 化學");
          [["物理風化", "崩解成塊,成分不變", "#7fa8d9", "凍融・根劈・熱脹冷縮"],
           ["化學風化", "礦物分解,產生新礦物", "#c97a4a", "氧化・水解・碳酸溶解"],
           ["互相加速", "裂隙多 → 表面積大 → 化學更快", PL.col("accent"), "土壤 = 兩者接力的最終產物"]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.655, H * 0.23 + i * 52, { color: r[2], size: 11.5, weight: "700" });
            D.text(ctx, r[1], W * 0.655, H * 0.23 + i * 52 + 16, { color: PL.col("text-dim"), size: 10 });
            D.text(ctx, r[3], W * 0.655, H * 0.23 + i * 52 + 30, { color: PL.col("text-faint"), size: 9.5 });
          });
          D.text(ctx, "CaCO₃ + CO₂ + H₂O → Ca²⁺ + 2HCO₃⁻", W * 0.79, H * 0.66, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rD.set(d, d >= 1 ? 1 : 2); rN.set(n * n, 0); rSoil.set(soil, 0);
          rStage.set(d > 40 ? "新鮮岩塊" : d > 5 ? "物理崩解中" : soil > 8 ? "化學接手 → 成土" : "碎屑堆積");
        }
      });
      const cycS = PL.ui.slider(ui.L.controls, { label: "年凍融循環數", min: 0, max: 120, step: 5, value: 60, unit: "次/年", digits: 0 });
      const chemS = PL.ui.slider(ui.L.controls, { label: "化學風化強度(濕熱度)", min: 0, max: 1, step: 0.05, value: 0.4, digits: 2 });
      const yrS = PL.ui.slider(ui.L.controls, { label: "風化時間", min: 0, max: 1000, step: 20, value: 300, unit: "年", digits: 0 });
      PL.ui.note(ui.L.controls, "物理風化把石頭裂成小塊、化學風化把礦物分解成新礦物:裂隙讓水與空氣鑽進岩體,兩者接力才能把岩石變成土壤。");
      PL.ui.procedure(ui.L.controls, {
        title: "看見兩種風化",
        steps: ["只拉「年凍融循環數」:岩塊裂成更多小塊、粒徑下降,但顏色幾乎不變——成分沒變。",
          "只拉「化學風化強度」:岩塊出現鏽色、土壤變厚——成分改變了。",
          "兩個都拉高:小塊的化學風化遠快於整塊岩石——這就是互相加速。"],
        rule: "裂隙是風化的入侵口:物理崩解翻出新表面,化學作用才進得去;石灰岩幾乎只被化學溶蝕,因為方解石直接溶於弱酸。"
      });
      const chart = ui.chart("凍融循環 → 岩塊粒徑", "循環越密集、粒徑崩得越快(指數下降):同樣 300 年,高頻凍融的岩塊比低頻小數十倍。紅點是目前狀態。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 1000, y0: 0, y1: 85, xlabel: "風化時間(年)", ylabel: "平均粒徑(cm)",
          series: [
            { fn: y => 80 / Math.pow(2, 25 * y / 30), color: "rgba(140,160,180,0.45)", width: 1.4 },
            { fn: y => 80 / Math.pow(2, 60 * y / 30), color: "rgba(140,160,180,0.45)", width: 1.4 },
            { fn: y => 80 / Math.pow(2, cycS.get() * y / 30), color: PL.col("accent"), width: 2.2 }],
          marks: [{ dot: [yrS.get(), 80 / Math.pow(2, cycS.get() * yrS.get() / 30)], color: PL.col("warn"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "乾燥沙漠", apply: () => { cycS.set(20); chemS.set(0.05); yrS.set(600); ui.redraw(); drawChart(); } },
        { label: "濕冷高山", apply: () => { cycS.set(110); chemS.set(0.3); yrS.set(400); ui.redraw(); drawChart(); } },
        { label: "濕熱氣候", apply: () => { cycS.set(40); chemS.set(0.95); yrS.set(900); ui.redraw(); drawChart(); } }] });
      const rD = PL.ui.readout(ui.L.readouts, { label: "平均粒徑", unit: "cm" });
      const rN = PL.ui.readout(ui.L.readouts, { label: "崩解塊數" });
      const rSoil = PL.ui.readout(ui.L.readouts, { label: "土壤厚度", unit: "cm" });
      const rStage = PL.ui.readout(ui.L.readouts, { label: "風化階段" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 侵蝕、搬運與沉積 */
  PL.register("erosion-deposition", {
    build(root) {
      const thr = d => Math.sqrt(d * 4000);   // 臨界流速(cm/s):v ∝ √d
      const dMax = v => v * v / 4000;         // 可搬最大粒徑(mm)
      const CLS = [
        { name: "礫", rep: 16, color: "#7d6f5f" },
        { name: "砂", rep: 0.5, color: "#d9b36c" },
        { name: "泥", rep: 0.02, color: "#9aa4ad" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const v = vS.get(), force = forceSel.get();
          const dm = force === "ice" ? 500 : dMax(v) * (force === "wind" ? 0.01 : 1);
          const { horizon } = CK.scene(ui.cv, { kind: "sky", horizon: 0.34 });
          // 河道縱剖面:能量由左(上游)向右(下游)遞減
          const bx = W * 0.05, bw = W * 0.60, wy = horizon + 22, bed = wy + 26;
          D.rect(ctx, bx, wy, W * 0.88, bed - wy, { fill: "rgba(74,144,216,0.65)", r: 3 });
          D.line(ctx, bx, bed, bx + W * 0.88, bed, "#8a7358", 3);
          D.text(ctx, force === "wind" ? "風速 " + v + " cm/s" : "流速 " + v + " cm/s(左 → 右減速)", bx + 4, wy - 8, { color: PL.col("text-dim"), size: 10.5 });
          // 各粒徑級的沉積位置:x = 1 − √(v臨界/v₀)
          let deposited = 0;
          CLS.forEach((c, i) => {
            const xSet = force === "ice" ? 0.5 : clamp(1 - Math.sqrt(thr(c.rep) / Math.max(v, 1)), 0, 1.05);
            const mx = bx + bw * clamp(xSet, 0.02, 0.98);
            if (force === "ice") {
              // 冰磧:三種顆粒混成一堆,不分選
              const rnd = [0, 1, 2, 3, 4, 5, 6, 7];
              rnd.forEach(k => D.disc(ctx, mx + (k - 3.5) * 8, bed - 3 - (k % 3) * 4, 4.5 - (k % 2) * 1.5, { fill: CLS[k % 3].color }));
              D.text(ctx, "冰磧:大小混雜、無分選", mx, bed + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
            } else if (xSet >= 1.02) {
              // 還搬得動:畫漂移中的顆粒
              for (let k = 0; k < 4; k++) {
                const f = ((t * 0.09 * (0.4 + v / 200) + k * 0.25 + i * 0.13) % 1);
                D.disc(ctx, bx + bw * (0.05 + f * 0.9), wy + 8 + (k % 2) * 12, 3.4 - i * 0.7, { fill: c.color });
              }
              D.text(ctx, c.name + " 挾帶中", bx + bw - 40, wy + 18 + i * 13, { color: c.color, size: 9.5, align: "right" });
            } else {
              deposited++;
              ctx.save(); ctx.fillStyle = c.color;
              ctx.beginPath(); ctx.ellipse(mx, bed + 2, 30 - i * 6, 9 - i * 2, 0, Math.PI, TAU); ctx.fill(); ctx.restore();
              D.text(ctx, c.name + "沉積", mx, bed + 20 + i * 12, { color: PL.col("text-dim"), size: 9.5, align: "center" });
            }
          });
          if (force !== "ice") D.text(ctx, deposited === 3 ? "沉積由粗到細 → 分選良好" : "能量還夠:較細的顆粒繼續往下游走",
            bx + bw / 2, bed + 52, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          // 營力資料卡
          const tip = { river: "河流:流速決定一切,v ×2 可搬粒徑 ×4", wind: "風:只搬得動砂與塵,磨蝕力弱", ice: "冰河:大小通吃、毫無分選" }[force];
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.30, H * 0.46, "營力對照");
          [["可搬最大粒徑", dm >= 100 ? "全部(大小通吃)" : PL.fmt(dm, dm >= 1 ? 1 : 3) + " mm"],
           ["搬運方式", force === "ice" ? "冰河推運" : force === "wind" ? "躍移+懸浮" : v < 12 ? "推移(滾動)" : v < 45 ? "跳躍" : "懸浮"],
           ["沉積行為", force === "ice" ? "無分選冰磧" : deposited === 3 ? "由粗到細依序沉積" : "繼續搬運"],
           ["營力特性", tip]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.685, H * 0.23 + i * 44, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, r[1], W * 0.685, H * 0.23 + i * 44 + 15, { color: i === 0 ? PL.col("accent") : PL.col("text"), size: 10.5, weight: i === 0 ? "700" : "400" });
          });
          rDm.set(force === "ice" ? "全部" : PL.fmt(dm, dm >= 1 ? 1 : 3));
          rMode.set(force === "ice" ? "冰河推運" : force === "wind" ? "躍移+懸浮" : v < 12 ? "推移" : v < 45 ? "跳躍" : "懸浮");
          rSort.set(force === "ice" ? "無分選" : deposited === 3 ? "分選良好" : "搬運中");
        }
      });
      const vS = PL.ui.slider(ui.L.controls, { label: "流速 / 風速", min: 5, max: 300, step: 5, value: 120, unit: "cm/s", digits: 0 });
      const forceSel = PL.ui.select(ui.L.controls, { label: "搬運營力", value: "river", options: [
        { value: "river", label: "河流" }, { value: "wind", label: "風" }, { value: "ice", label: "冰河" }] });
      PL.ui.note(ui.L.controls, "營力的能量決定它能搬動的顆粒:流速一減,粗的先落、細的後落,沉積物就出現「由粗到細」的分選;冰河例外——大小通吃、混雜堆積。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀出分選",
        steps: ["把流速拉到 250:連礫石都被挾帶(紅點在曲線右上方)。",
          "慢慢降速:礫最先落下的、砂其次、泥最後——畫面上的沉積堆由粗到細排開。",
          "切成「冰河」:同樣的顆粒全擠在同一堆裡——冰磧沒有分選。"],
        rule: "v 變 2 倍、能搬的粒徑變 4 倍(v ∝ √d 的倒關係):所以洪水能把巨礫滾下山,退水時同一個地點先收礫、再收砂。"
      });
      const chart = ui.chart("臨界流速 vs 粒徑(河流)", "粒徑越大、搬動它需要的流速越高(√d 曲線):紅點是目前流速對應的可搬上限,落在哪一區就搬得動哪一級。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0.05, x1: 80, y0: 0, y1: 520, xlabel: "顆粒直徑(mm)", ylabel: "臨界流速(cm/s)",
          series: [{ fn: d => Math.sqrt(d * 4000), color: PL.col("accent") }],
          marks: [
            { vline: 2, color: PL.col("text-faint"), label: "礫/砂分界", dash: [4, 4] },
            { dot: [clamp(dMax(vS.get()), 0.1, 78), vS.get()], color: PL.col("warn"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "颱風洪水", apply: () => { vS.set(280); forceSel.set("river"); ui.redraw(); drawChart(); } },
        { label: "平水期", apply: () => { vS.set(90); forceSel.set("river"); ui.redraw(); drawChart(); } },
        { label: "冰河前端", apply: () => { vS.set(30); forceSel.set("ice"); ui.redraw(); drawChart(); } }] });
      const rDm = PL.ui.readout(ui.L.readouts, { label: "可搬最大粒徑" });
      const rMode = PL.ui.readout(ui.L.readouts, { label: "搬運方式" });
      const rSort = PL.ui.readout(ui.L.readouts, { label: "沉積行為" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 河流地形:上游到下游 */
  PL.register("river-valley", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const pos = posS.get(), base = baseS.get();
          const seg = pos < 33 ? 0 : pos < 70 ? 1 : 2;
          const { surface } = CK.scene(ui.cv, { kind: "underground", horizon: 0.16 });
          const sg = surface + (H - surface) * 0.30;              // 原地面(谷緣)
          const depth = lerp(0.52, 0.13, pos / 100) * (H - surface);
          const halfW = lerp(0.10, 0.34, pos / 100) * W;
          const vx = W * 0.38, ry = sg + depth;
          // 兩岸山體與谷
          ctx.save(); ctx.fillStyle = PL.theme.isLight() ? "#8fae6f" : "#3d4a35";
          ctx.beginPath();
          ctx.moveTo(0, sg); ctx.lineTo(vx - halfW, sg);
          if (pos < 50) { ctx.lineTo(vx, ry); ctx.lineTo(vx + halfW, sg); }
          else { ctx.quadraticCurveTo(vx - halfW * 0.35, ry - depth * 0.25, vx, ry); ctx.quadraticCurveTo(vx + halfW * 0.35, ry - depth * 0.25, vx + halfW, sg); }
          ctx.lineTo(W, sg); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.restore();
          // 谷壁線
          ctx.save(); ctx.strokeStyle = "rgba(70,55,40,0.65)"; ctx.lineWidth = 1.5;
          if (pos < 50) { ctx.beginPath(); ctx.moveTo(vx - halfW, sg); ctx.lineTo(vx, ry); ctx.moveTo(vx + halfW, sg); ctx.lineTo(vx, ry); ctx.stroke(); }
          ctx.restore();
          // 河階:基準面下降 → 回春下切,舊河床留在兩側
          if (base <= -25) {
            [0.32, 0.58].forEach(f => {
              const ty = ry - depth * f * 0.55;
              D.line(ctx, vx - halfW * (1 - f * 0.55), ty, vx - halfW * 0.12, ty, "rgba(160,128,92,0.9)", 3.5);
              D.line(ctx, vx + halfW * (1 - f * 0.55), ty, vx + halfW * 0.12, ty, "rgba(160,128,92,0.9)", 3.5);
            });
            D.text(ctx, "河階(回春下切的足跡)", vx - halfW * 0.8, ry - depth * 0.34, { color: "#c9a06a", size: 10, weight: "700" });
          }
          // 河水與河床
          const fill = base > 25 ? (base / 60) * depth * 0.5 : 0;
          if (fill > 2) D.rect(ctx, vx - halfW * 0.36, ry - fill, halfW * 0.72, fill, { fill: "#b78d5e" });
          D.rect(ctx, vx - halfW * 0.36, ry, halfW * 0.72, 7, { fill: "rgba(74,144,216,0.85)" });
          D.text(ctx, "河床 " + PL.fmt(lerp(4.2, 0.08, pos / 100), 2) + " % 坡", vx + halfW * 0.4, ry + 16, { color: PL.col("text-faint"), size: 9.5 });
          // 河床礫石緩移(下游堆積更多)
          for (let i = 0; i < 5; i++) {
            const f = ((t * 0.06 + i * 0.2) % 1);
            D.disc(ctx, vx - halfW * 0.3 + f * halfW * 0.6, ry + 3.5, 2.6, { fill: "rgba(235,225,205,0.7)" });
          }
          D.text(ctx, "基準面 = 海平面" + (base > 25 ? "(上升 → 堆積/溺谷)" : base <= -25 ? "(下降 → 回春下切)" : "(穩定)"),
            W * 0.40, H * 0.92, { color: base > 25 ? "#7fa8d9" : base <= -25 ? "#e57373" : PL.col("text-faint"), size: 11, align: "center", weight: "700" });
          // 河段資料卡
          const act = ["下切侵蝕 → V 型谷、瀑布", "側蝕 + 搬運 → 谷寬流緩", "堆積 → 沖積平原、三角洲"][seg];
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.30, H * 0.50, "河段特徵");
          [["河段", ["上游", "中游", "下游"][seg]], ["谷型", ["V 型谷", "寬谷(開展)", "沖積平原"][seg]],
           ["主導作用", act], ["坡度", PL.fmt(lerp(4.2, 0.08, pos / 100), 2) + " %"]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.685, H * 0.23 + i * 48, { color: PL.col("text-faint"), size: 10 });
            D.text(ctx, r[1], W * 0.685, H * 0.23 + i * 48 + 16, { color: i === 2 ? PL.col("accent") : PL.col("text"), size: 10.5, weight: i === 2 ? "700" : "400" });
          });
          rSeg.set(["上游", "中游", "下游"][seg]); rVal.set(["V 型谷", "寬谷", "沖積平原"][seg]);
          rAct.set(act); rBase.set(base > 25 ? "上升:堆積・溺谷" : base <= -25 ? "下降:回春・河階" : "穩定:準平衡剖面");
        }
      });
      const posS = PL.ui.slider(ui.L.controls, { label: "觀察位置(0 上游 → 100 出海口)", min: 0, max: 100, step: 1, value: 18, unit: "%", digits: 0 });
      const baseS = PL.ui.slider(ui.L.controls, { label: "侵蝕基準面升降", min: -60, max: 60, step: 5, value: 0, unit: "m", digits: 0 });
      PL.ui.note(ui.L.controls, "同一條河,上游在切、下游在堆:坡陡能量大就下切成 V 型谷,入海能量歸零就堆出平原與三角洲——基準面一動,整條河重新調整。");
      PL.ui.procedure(ui.L.controls, {
        title: "沿河走一趟",
        steps: ["把觀察位置從 0 拉到 100:谷型由深窄 V 型 → 開展寬谷 → 堆積平原,坡度讀數一路下降。",
          "把基準面拉到 −60 m:河川回春下切,兩側留下階梯狀的舊河床(河階)。",
          "把基準面拉到 +60 m:河床淤高、能量歸零——河口會變成堆積與溺谷的世界。"],
        rule: "侵蝕基準面(海平面)決定河能下切多深:「峽谷深不深」問的不是水量,而是基準面與地盤抬升的賽跑。"
      });
      const chart = ui.chart("河川縱剖面(凹形)", "縱剖面是上陡下緩的凹曲線:x 軸 0 為源頭、100 為出海口;上游坡陡故侵蝕,下游趨緩轉為搬運與堆積。紅點是目前觀察位置。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 100, y0: 0, y1: 3400, xlabel: "距河口(% → 0 為出海口右端)", ylabel: "河床高(m)",
          series: [{ fn: x => 3200 * Math.pow(1 - x / 100, 1.6), color: PL.col("accent") }],
          marks: [
            { hline: 0, color: "#4a90d9", label: "基準面(海平面)" },
            { dot: [posS.get(), 3200 * Math.pow(1 - posS.get() / 100, 1.6)], color: PL.col("warn"), label: "觀察點" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "上游峽谷", apply: () => { posS.set(8); baseS.set(0); ui.redraw(); drawChart(); } },
        { label: "回春河階", apply: () => { posS.set(30); baseS.set(-55); ui.redraw(); drawChart(); } },
        { label: "基準面上升", apply: () => { posS.set(85); baseS.set(55); ui.redraw(); drawChart(); } }] });
      const rSeg = PL.ui.readout(ui.L.readouts, { label: "河段" });
      const rVal = PL.ui.readout(ui.L.readouts, { label: "谷型" });
      const rAct = PL.ui.readout(ui.L.readouts, { label: "主導作用" });
      const rBase = PL.ui.readout(ui.L.readouts, { label: "基準面狀態" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 曲流與牛軛湖 */
  PL.register("meander", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const bend = bendS.get(), flood = floodS.get(), yr = yrS.get();
          const cut = bend > 0.72 && flood > 0.55;
          const amp = H * 0.15 * bend, hw = 6 + flood * 5;
          const x0 = W * 0.07, x1 = W * 0.93, cy = H * 0.45, waves = 2.6;
          const cl = x => cy + amp * Math.sin((x - x0) / (x1 - x0) * waves * TAU);
          // 氾濫平原
          D.rect(ctx, W * 0.03, H * 0.15, W * 0.94, H * 0.72, { fill: PL.theme.shade(0.72), stroke: PL.col("border"), r: 8 });
          if (flood > 0.55) D.rect(ctx, W * 0.03, H * 0.15, W * 0.94, H * 0.72, { fill: "rgba(74,144,217,0.13)", r: 8 });
          // 彎頂(凹岸/凸岸成對出現)
          const apex = [];
          for (let k = 0; k < 5; k++) { const ph = Math.PI / 2 + k * Math.PI; if (ph < waves * TAU - 0.7) apex.push(ph); }
          apex.forEach((ph, i) => {
            const f = ph / (waves * TAU), ax = x0 + (x1 - x0) * f, ay = cl(ax);
            const out = Math.sin(ph) > 0 ? 1 : -1;              // 凹岸在外側
            // 凸岸堆積:沙洲弧(畫在河道之下)
            ctx.save(); ctx.fillStyle = "rgba(217,179,108,0.95)";
            ctx.beginPath(); ctx.ellipse(ax, ay - out * hw * 0.72, hw * 1.25, hw * 0.95, 0, 0, TAU); ctx.fill(); ctx.restore();
            if (i === 0) D.text(ctx, "凸岸堆積(點狀沙洲)", ax - 8, ay - out * hw * 2.1, { color: "#a98a52", size: 10, align: "right" });
            // 凹岸侵蝕:後退的刻線
            D.line(ctx, ax - hw * 1.5, ay + out * (hw + 3), ax + hw * 1.5, ay + out * (hw + 3), "rgba(229,83,80,0.9)", 2.2, [6, 4]);
            if (i === 1) D.text(ctx, "凹岸侵蝕(刻蝕岸)", ax + 8, ay + out * (hw + 14), { color: "#e57373", size: 10 });
          });
          // 河道
          const band = width => { ctx.save(); ctx.strokeStyle = "#3f7fbf"; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); for (let x = x0; x <= x1; x += 4) { const y = cl(x); x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); } ctx.stroke(); ctx.restore(); };
          band(hw * 2);
          // 流向光點
          for (let k = 0; k < 4; k++) {
            const f = ((t * 0.08 + k * 0.25) % 1);
            D.disc(ctx, x0 + (x1 - x0) * f, cl(x0 + (x1 - x0) * f), 2.6, { fill: "rgba(235,245,255,0.85)" });
          }
          D.arrow(ctx, x0 - 14, cy, x0 + 2, cy, { color: PL.col("accent"), width: 2 });
          // 截彎取直 → 牛軛湖
          if (cut) {
            const ph = apex[2] != null ? apex[2] : Math.PI * 2.5;
            const f = ph / (waves * TAU), ax = x0 + (x1 - x0) * f, ay = cl(ax);
            const c1 = [x0 + (x1 - x0) * (f - 0.10), cl(x0 + (x1 - x0) * (f - 0.10))];
            const c2 = [x0 + (x1 - x0) * (f + 0.10), cl(x0 + (x1 - x0) * (f + 0.10))];
            ctx.save(); ctx.strokeStyle = "#3f7fbf"; ctx.lineWidth = hw * 1.7; ctx.lineCap = "round";
            ctx.beginPath(); ctx.moveTo(c1[0], c1[1]); ctx.lineTo(c2[0], c2[1]); ctx.stroke(); ctx.restore();
            ctx.save(); ctx.fillStyle = "rgba(74,144,217,0.5)"; ctx.strokeStyle = "#3f7fbf"; ctx.lineWidth = 1.4;
            ctx.beginPath(); ctx.ellipse(ax, ay, hw * 1.75, hw * 1.15, 0, 0, TAU); ctx.fill(); ctx.stroke(); ctx.restore();
            D.text(ctx, "牛軛湖(舊河道)", ax, ay + hw * 2.6, { color: "#7fa8d9", size: 10.5, align: "center", weight: "700" });
          }
          CK.badge(ctx, W * 0.72, H * 0.20, cut ? "大洪水漫過彎頸:截彎取直!" : flood > 0.55 ? "洪水氾濫中" : "平水期",
            cut ? "#e57373" : flood > 0.55 ? "#7fa8d9" : PL.col("accent"));
          rBend.set(bend, 2); rBelt.set(Math.round(bend * 1200), 0);
          rEro.set(bend * flood * 3.0, 2);
          rState.set(cut ? "已截彎 → 牛軛湖" : bend > 0.6 ? "彎道加劇中" : "緩彎成長中");
          vZen.set(cut ? "舊河道被沉積物封口成牛軛湖——它見證了河曾經走過的路" : bend > 0.72 ? "彎度已達門檻,只差一場洪水就截彎" : "凹岸侵蝕 + 凸岸堆積,彎道越滾越彎", cut ? "info" : bend > 0.72 ? "warn" : "ok");
        }
      });
      const bendS = PL.ui.slider(ui.L.controls, { label: "彎度指數", min: 0.1, max: 0.95, step: 0.05, value: 0.4, digits: 2 });
      const floodS = PL.ui.slider(ui.L.controls, { label: "洪水量", min: 0, max: 1, step: 0.05, value: 0.4, digits: 2 });
      const yrS = PL.ui.slider(ui.L.controls, { label: "演育時間", min: 0, max: 500, step: 10, value: 120, unit: "年", digits: 0 });
      PL.ui.note(ui.L.controls, "河道一彎,外側快而蝕、內側慢而積,彎就越滾越彎;洪水漫過彎頸直接抄直路,舊彎被泥沙封口——那就是牛軛湖的由來。");
      PL.ui.procedure(ui.L.controls, {
        title: "催生一個牛軛湖",
        steps: ["彎度拉到 0.8:紅色刻線(凹岸)與沙色弧(凸岸)成對出現,彎道加劇。",
          "洪水量再拉過 0.55:洪水漫過彎頸,藍色直道把彎截掉。",
          "讀畫面:被拋棄的舊彎道變成一彎靜水——牛軛湖,幾十年後會被填滿成沼澤地。"],
        rule: "牛軛湖不是「湖自己長出來」,而是被截彎拋棄的舊河道;曲流帶越寬代表曾經的流量越大,兩件事要用讀數分開看。"
      });
      const chart = ui.chart("彎度演育 vs 時間", "彎度隨時間上升(侵蝕+堆積持續作用),超過 0.72 的門檻後一場洪水就會截彎;洪水越大、爬升越快。紅點是目前時間的彎度。");
      const drawChart = () => {
        const rate = y => Math.min(0.95, 0.10 + 0.0035 * (0.4 + floodS.get()) * y);
        CK.plot(chart, {
          x0: 0, x1: 500, y0: 0, y1: 1.0, xlabel: "演育時間(年)", ylabel: "彎度指數",
          series: [
            { fn: y => Math.min(0.95, 0.10 + 0.0035 * 0.7 * y), color: "rgba(140,160,180,0.45)", width: 1.4 },
            { fn: rate, color: PL.col("accent") }],
          marks: [
            { hline: 0.72, color: PL.col("warn"), label: "截彎取直門檻", dash: [5, 4] },
            { dot: [yrS.get(), rate(yrS.get())], color: PL.col("warn"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "平原緩彎", apply: () => { bendS.set(0.3); floodS.set(0.3); yrS.set(80); ui.redraw(); drawChart(); } },
        { label: "彎道加劇", apply: () => { bendS.set(0.7); floodS.set(0.5); yrS.set(260); ui.redraw(); drawChart(); } },
        { label: "大洪水截彎", apply: () => { bendS.set(0.85); floodS.set(0.9); yrS.set(420); ui.redraw(); drawChart(); } }] });
      const rBend = PL.ui.readout(ui.L.readouts, { label: "彎度指數" });
      const rBelt = PL.ui.readout(ui.L.readouts, { label: "曲流帶寬", unit: "m" });
      const rEro = PL.ui.readout(ui.L.readouts, { label: "凹岸侵蝕率", unit: "m/年" });
      const rState = PL.ui.readout(ui.L.readouts, { label: "河道狀態" });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "演育判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 海岸地形:侵蝕與堆積 */
  PL.register("coastline", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const wave = waveS.get(), cur = curS.get(), yr = yrS.get();
          const plat = yr * 1.5 * wave / (1 + yr * 1.5 * wave / 50);   // 海蝕平台寬(m),飽和曲線
          const rate = 1.5 * wave / (1 + plat / 50);                   // 目前退縮速率(m/年)
          const { horizon } = CK.scene(ui.cv, { kind: "sky", horizon: 0.50 });
          const seaX = W * 0.46, cliffX = W * 0.34 - plat * 0.8;
          // 海
          D.rect(ctx, seaX, horizon, W - seaX, H - horizon, { fill: "rgba(64,140,200,0.72)" });
          // 陸地:海蝕崖段(上) + 灣岸段(下)
          ctx.save(); ctx.fillStyle = PL.theme.isLight() ? "#8fae6f" : "#3d4a35";
          ctx.beginPath();
          ctx.moveTo(0, horizon); ctx.lineTo(cliffX, horizon); ctx.lineTo(cliffX, H * 0.52);
          ctx.quadraticCurveTo(cliffX - W * 0.10, H * 0.66, cliffX + W * 0.05, H);
          ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.restore();
          // 海蝕崖與海蝕平台
          D.line(ctx, cliffX, horizon + 2, cliffX, H * 0.52, "rgba(80,60,45,0.9)", 3);
          if (wave > 0.35) D.rect(ctx, cliffX - 3, H * 0.50, 8, 9, { fill: "rgba(40,32,26,0.85)" });
          const pw = Math.max(4, plat * 0.8);
          D.rect(ctx, cliffX, horizon + 5, Math.max(6, seaX + W * 0.06 - cliffX), 5, { fill: "rgba(158,152,138,0.9)", r: 2 });
          D.text(ctx, "海蝕崖(持續後退)", cliffX, horizon - 10, { color: PL.col("text-dim"), size: 10.5 });
          D.text(ctx, "海蝕平台 " + Math.round(plat) + " m", cliffX + pw + 14, horizon + 22, { color: "#cfc9b8", size: 10 });
          // 波浪(能量越高越密)
          for (let i = 0; i < 3; i++) {
            const xx = seaX - 30 + ((i * W * 0.15 + t * 26) % (W * 0.40));
            ctx.save(); ctx.globalAlpha = 0.25 + wave * 0.5;
            ctx.strokeStyle = "#eaf4ff"; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.arc(xx, H * 0.40, 15, Math.PI * 0.85, Math.PI * 1.85); ctx.stroke(); ctx.restore();
          }
          // 沙灘(灣岸)+ 沙嘴 + 離岸沙洲與潟湖
          ctx.save(); ctx.strokeStyle = "#d9c08a"; ctx.lineWidth = 9; ctx.lineCap = "round";
          ctx.beginPath(); ctx.moveTo(cliffX, H * 0.52);
          ctx.quadraticCurveTo(cliffX - W * 0.10, H * 0.66, cliffX + W * 0.05, H); ctx.stroke(); ctx.restore();
          D.text(ctx, "沙灘", cliffX - W * 0.06, H * 0.72, { color: "#8a6f42", size: 10 });
          const len2 = clamp(cur * yr * 0.5, 0, W * 0.22);
          if (len2 > 10) {
            D.rect(ctx, cliffX + W * 0.05, horizon + 9, len2, 6, { fill: "#d9c08a", r: 3 });
            D.text(ctx, "沙嘴", cliffX + W * 0.05 + len2 + 6, horizon + 14, { color: "#e8dcc0", size: 10 });
          }
          const len1 = clamp(cur * yr * 0.8, 0, W * 0.28);
          if (len1 > 14) {
            D.rect(ctx, seaX + 14, H * 0.60, len1, 7, { fill: "#d9c08a", r: 3 });
            D.text(ctx, "離岸沙洲", seaX + 14 + len1 / 2, H * 0.60 - 6, { color: "#e8dcc0", size: 10, align: "center" });
            if (len1 > 40) D.text(ctx, "潟湖(被沙洲封住的海灣)", seaX + 12, H * 0.60 + 18, { color: "#a8d4f0", size: 10 });
          }
          CK.badge(ctx, W * 0.68, H * 0.14, wave > 0.6 ? "侵蝕型海岸" : cur > 0.5 && wave < 0.5 ? "堆積型海岸" : "過渡型海岸",
            wave > 0.6 ? "#e57373" : cur > 0.5 && wave < 0.5 ? "#66bb6a" : PL.col("accent"));
          rRate.set(rate, 2); rPlat.set(plat, 0); rSpit.set(len2 > 10 ? Math.round(len2 * 2) : 0, 0);
          rType.set(wave > 0.6 ? "侵蝕型(海蝕崖・平台)" : cur > 0.5 && wave < 0.5 ? "堆積型(沙灘・沙洲)" : "過渡型");
          vZen.set(wave > 0.6 ? "波能強:海崖退縮 " + PL.fmt(rate, 2) + " m/年,平台越寬侵蝕越慢" : cur > 0.5 ? "沿岸流強:沙嘴延伸、潟湖發育——海岸在長大" : "能量中等:侵蝕與堆積並存", wave > 0.6 ? "warn" : "ok");
        }
      });
      const waveS = PL.ui.slider(ui.L.controls, { label: "波浪能量", min: 0.05, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const curS = PL.ui.slider(ui.L.controls, { label: "沿岸流強度", min: 0, max: 1, step: 0.05, value: 0.4, digits: 2 });
      const yrS = PL.ui.slider(ui.L.controls, { label: "作用時間", min: 0, max: 200, step: 10, value: 80, unit: "年", digits: 0 });
      PL.ui.note(ui.L.controls, "同一片海,迎浪的岬角被切成海蝕崖與平台,波影較弱的灣內堆出沙灘與沙嘴:岩性與波能決定海岸長什麼樣,沿岸流決定沙往哪裡去。");
      PL.ui.procedure(ui.L.controls, {
        title: "對照兩種海岸",
        steps: ["波浪能量拉到 0.9:海蝕崖後退、海蝕平台變寬——注意退縮速率讀數反而變慢。",
          "沿岸流拉高、波能降低:沙嘴與離岸沙洲開始生長,沙洲後面出現潟湖。",
          "對照台灣:北海岸大屯山下是侵蝕型,西濱是堆積型——就是這兩支滑桿的差別。"],
        rule: "海蝕平台是海岸線不斷後退留下的足跡;平台變寬會先磨掉波能,所以「退縮越來越慢」是負回饋,不是侵蝕停止。"
      });
      const chart = ui.chart("海崖退縮速率 vs 平台寬度", "平台越寬、抵達崖腳的波能越少:退縮速率沿曲線下滑——海岸自己會「剎車」。紅點是目前狀態。");
      const drawChart = () => {
        const platNow = yrS.get() * 1.5 * waveS.get() / (1 + yrS.get() * 1.5 * waveS.get() / 50);
        CK.plot(chart, {
          x0: 0, x1: 100, y0: 0, y1: 1.8, xlabel: "海蝕平台寬(m)", ylabel: "退縮速率(m/年)",
          series: [{ fn: p => 1.5 * waveS.get() / (1 + p / 50), color: PL.col("accent") }],
          marks: [{ dot: [platNow, 1.5 * waveS.get() / (1 + platNow / 50)], color: PL.col("warn"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "北台灣強浪", apply: () => { waveS.set(0.95); curS.set(0.25); yrS.set(140); ui.redraw(); drawChart(); } },
        { label: "西濱堆積", apply: () => { waveS.set(0.25); curS.set(0.85); yrS.set(160); ui.redraw(); drawChart(); } },
        { label: "颱風湧浪", apply: () => { waveS.set(1); curS.set(0.5); yrS.set(30); ui.redraw(); drawChart(); } }] });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "海崖退縮速率", unit: "m/年" });
      const rPlat = PL.ui.readout(ui.L.readouts, { label: "海蝕平台寬", unit: "m" });
      const rSpit = PL.ui.readout(ui.L.readouts, { label: "沙嘴長度", unit: "m" });
      const rType = PL.ui.readout(ui.L.readouts, { label: "海岸型態" });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "海岸判讀" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 石灰岩溶蝕地形 */
  PL.register("karst", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const co2 = co2S.get(), yr = yrS.get(), drip = dripS.get();
          const diss = 0.02 + co2 * 0.08;                       // 溶蝕速率(mm/年)
          const caveH = Math.min((0.02 + co2 * 0.08) * yr * 3, 25);   // 洞穴高度(m)
          const rateW = 6 + drip * 8;                           // 鐘乳石生長(cm/萬年)
          const stal = Math.min(rateW * yr, caveH * 100 * 0.95);
          const column = caveH > 0.5 && stal * 2 >= caveH * 100;
          const { surface } = CK.scene(ui.cv, { kind: "underground", horizon: 0.16 });
          // 石灰岩體
          D.rect(ctx, W * 0.03, surface, W * 0.60, H - surface - 4, { fill: "#c9bd96", stroke: "rgba(90,80,60,0.5)", r: 4 });
          D.text(ctx, "石灰岩", W * 0.08, surface + 16, { color: "rgba(70,60,40,0.8)", size: 11, weight: "700" });
          // 節理:溶蝕的入口,越溶越寬
          const jw = 1 + Math.min(diss * yr * 0.12, 5);
          [0.30, 0.42, 0.54].forEach(f => D.line(ctx, W * f, surface + 6, W * f + (f - 0.42) * 14, H - 12, "rgba(90,78,58,0.85)", jw, [7, 5]));
          D.text(ctx, "節理(雨水+CO₂ 沿之溶蝕)", W * 0.30, H - 8, { color: PL.col("text-faint"), size: 9.5 });
          // 溶蝕洞穴
          const cx = W * 0.36, cy2 = surface + (H - surface) * 0.60;
          const rx = clamp(caveH * 4, 2, W * 0.15), ry = clamp(caveH * 5, 2, (H - surface) * 0.28);
          ctx.save(); ctx.fillStyle = "rgba(32,27,22,0.94)";
          ctx.beginPath(); ctx.ellipse(cx, cy2, rx, ry, 0, 0, TAU); ctx.fill(); ctx.restore();
          if (caveH > 0.8) D.text(ctx, "溶蝕洞穴 " + PL.fmt(caveH, 1) + " m", cx, cy2 + ry + 14, { color: PL.col("text-dim"), size: 10, align: "center" });
          // 鐘乳石(向下)與石筍(向上)
          const pxPerCm = ry * 2 / Math.max(caveH * 100, 1);
          const slen = clamp(stal * pxPerCm, 0, ry * 1.9);
          [-rx * 0.45, 0, rx * 0.45].forEach((dx, i) => {
            ctx.save(); ctx.fillStyle = "#e8e2d0";
            ctx.beginPath();
            ctx.moveTo(cx + dx - 3.5, cy2 - ry); ctx.lineTo(cx + dx + 3.5, cy2 - ry); ctx.lineTo(cx + dx, cy2 - ry + slen); ctx.closePath();
            ctx.moveTo(cx + dx - 4.5, cy2 + ry); ctx.lineTo(cx + dx + 4.5, cy2 + ry); ctx.lineTo(cx + dx, cy2 + ry - slen * 0.92); ctx.closePath();
            ctx.fill(); ctx.restore();
            if (i === 1 && caveH > 0.8 && slen > 6) {
              D.text(ctx, "鐘乳石↓ 石筍↑", cx, cy2 - ry - 12, { color: "#e8e2d0", size: 9.5, align: "center" });
            }
          });
          if (column) {
            D.rect(ctx, cx - 3, cy2 - ry, 6, ry * 2, { fill: "#e8e2d0" });
            CK.badge(ctx, cx, cy2, "石柱:上下相接!", "#c9a227");
          }
          // 洞內滴水
          if (drip > 0.1 && caveH > 0.8) {
            for (let i = 0; i < 3; i++) {
              const fy = cy2 - ry + ((t * 55 + i * 45) % (ry * 2));
              D.disc(ctx, cx + (i - 1) * rx * 0.45, Math.min(fy, cy2 + ry), 1.8, { fill: "rgba(140,190,240,0.8)" });
            }
          }
          // 地表石林(溶蝕強時)
          if (co2 > 0.5) [0.14, 0.24, 0.50].forEach(f => {
            ctx.save(); ctx.fillStyle = "#b3a87f";
            ctx.beginPath(); ctx.moveTo(W * f - 6, surface); ctx.lineTo(W * f + 6, surface); ctx.lineTo(W * f, surface - 9); ctx.closePath(); ctx.fill(); ctx.restore();
          });
          // 資料卡:溶蝕 vs 沉澱
          CK.panel(ctx, W * 0.65, H * 0.14, W * 0.32, H * 0.56, "溶蝕造洞 vs 沉澱填洞");
          [["溶蝕", "CaCO₃ 被帶走 → 洞變大", "#7fa8d9"], ["沉澱", "CO₂ 脫氣 → CaCO₃ 滴出堆積", "#c9a227"],
           ["方向", "洞往深長;鐘乳石往洞內長", PL.col("accent")], ["速率", "溶蝕 mm/年;堆積 cm/百年", PL.col("text-dim")]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.675, H * 0.23 + i * 52, { color: r[2], size: 11, weight: "700" });
            D.text(ctx, r[1], W * 0.675, H * 0.23 + i * 52 + 16, { color: PL.col("text-dim"), size: 9.8 });
          });
          D.text(ctx, "Ca²⁺ + 2HCO₃⁻ → CaCO₃↓ + CO₂ + H₂O", W * 0.81, H * 0.64, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rDiss.set(diss, 3); rCave.set(caveH, 1); rStal.set(stal, 0);
          rState.set(column ? "鐘乳石+石筍相接成石柱" : stal > 5 ? "沉澱堆積中" : "溶蝕擴大洞穴");
        }
      });
      const co2S = PL.ui.slider(ui.L.controls, { label: "雨水中 CO₂(溶蝕力)", min: 0.05, max: 1, step: 0.05, value: 0.5, digits: 2 });
      const yrS = PL.ui.slider(ui.L.controls, { label: "溶蝕時間", min: 0, max: 100, step: 5, value: 40, unit: "萬年", digits: 0 });
      const dripS = PL.ui.slider(ui.L.controls, { label: "洞頂滴水速率", min: 0, max: 1, step: 0.05, value: 0.35, digits: 2 });
      PL.ui.note(ui.L.controls, "雨水溶入 CO₂ 變弱酸,沿節理把石灰岩一點點帶走,地下才長得出洞;洞頂滴下的水失壓脫氣,反而把 CaCO₃ 放回來——造洞與填洞方向相反。");
      PL.ui.procedure(ui.L.controls, {
        title: "看洞怎麼長",
        steps: ["拉高 CO₂:節理變寬、洞穴半徑變大——溶蝕速率讀數同步上升。",
          "拉高滴水速率:鐘乳石與石筍開始上下生長(讀數 cm)。",
          "時間與滴水都拉滿:兩者相接變成石柱——洞開始被自己的沉澱物填回來。"],
        rule: "溶蝕(向下造洞)與沉澱(洞內堆積)是同一條化學的兩個方向:CaCO₃ 溶進去是造洞、CaCO₃ 滴出來是堆積;鐘乳石百年只長數公分。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "濕熱多雨", apply: () => { co2S.set(0.95); dripS.set(0.85); yrS.set(80); ui.redraw(); } },
        { label: "乾燥少雨", apply: () => { co2S.set(0.1); dripS.set(0.15); yrS.set(100); ui.redraw(); } },
        { label: "墾丁石灰岩", apply: () => { co2S.set(0.6); dripS.set(0.55); yrS.set(60); ui.redraw(); } }] });
      const rDiss = PL.ui.readout(ui.L.readouts, { label: "溶蝕速率", unit: "mm/年" });
      const rCave = PL.ui.readout(ui.L.readouts, { label: "洞穴高度", unit: "m" });
      const rStal = PL.ui.readout(ui.L.readouts, { label: "鐘乳石長度", unit: "cm" });
      const rState = PL.ui.readout(ui.L.readouts, { label: "洞穴狀態" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 山崩與土石流 */
  PL.register("mass-wasting", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const th = thS.get(), rain = rainS.get(), veg = vegS.get();
          const sat = clamp(rain / 600, 0, 1);
          const FS = (1 + veg * 0.35 - sat * 0.55) * Math.tan(34 * Math.PI / 180) / Math.tan(th * Math.PI / 180);
          const slide = FS < 1;
          const { horizon } = CK.scene(ui.cv, { kind: "sky", horizon: 0.88 });
          const rise = clamp(W * 0.60 * Math.tan(th * Math.PI / 180), H * 0.16, H * 0.66);
          const ax = W * 0.06, ay = horizon - rise, tx = ax + W * 0.62, ty = horizon;
          // 山體
          ctx.save(); ctx.fillStyle = "#6b5d4f";
          ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(ax, ay); ctx.lineTo(tx, ty); ctx.lineTo(W, ty); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill(); ctx.restore();
          // 土層與植被
          ctx.save(); ctx.strokeStyle = "#7a6248"; ctx.lineWidth = 11;
          ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(tx, ty); ctx.stroke(); ctx.restore();
          ctx.save(); ctx.strokeStyle = "rgba(74,144,216," + (0.15 + sat * 0.55) + ")"; ctx.lineWidth = 5;
          ctx.beginPath(); ctx.moveTo(ax + 6, ay + 9); ctx.lineTo(tx - 6, ty + 9); ctx.stroke(); ctx.restore();
          for (let i = 0; i < Math.round(veg * 16); i++) {
            const f = 0.08 + (i * 0.058) % 0.86;
            D.disc(ctx, ax + f * (tx - ax), ay + f * rise + 4, 3, { fill: "#4e8a3f" });
          }
          // 雨滴
          const drops = Math.round(rain / 600 * 16);
          for (let i = 0; i < drops; i++) {
            const dx = ax + ((i * 53) % (tx - ax)), dy = ((t * 170 + i * 41) % (H * 0.55));
            D.line(ctx, dx, H * 0.06 + dy, dx, H * 0.06 + dy + 6, "rgba(130,185,245,0.7)", 1.4);
          }
          // 滑動塊體
          const f0 = 0.42, L = Math.hypot(tx - ax, rise);
          const off = slide ? Math.min((1 - FS) * 140, 0.18 * L) : 0;
          const ang = Math.atan2(rise, tx - ax);
          const mfx = ax + f0 * (tx - ax) + off, mfy = ay + rise * (f0 + off / (tx - ax));
          ctx.save(); ctx.translate(mfx, mfy); ctx.rotate(ang);
          D.rect(ctx, -24, -10, 48, 22, { fill: "#8a6a4a", stroke: "rgba(40,28,18,0.8)", width: 1.5 });
          if (slide) { D.line(ctx, -24, -10, -34, -16, "rgba(30,22,16,0.9)", 2); D.line(ctx, -24, 12, -36, 18, "rgba(30,22,16,0.9)", 2); }
          ctx.restore();
          // 土石流(滑到坡腳)
          if (slide) {
            ctx.save(); ctx.fillStyle = "rgba(140,105,72,0.92)";
            ctx.beginPath();
            ctx.moveTo(tx - 30, ty + 2); ctx.quadraticCurveTo(tx + W * 0.10, ty - 8, tx + W * 0.20, ty + 12);
            ctx.lineTo(tx + W * 0.16, ty + 16); ctx.lineTo(tx - 20, ty + 14); ctx.closePath(); ctx.fill(); ctx.restore();
            for (let i = 0; i < 6; i++) D.disc(ctx, tx + 14 + i * 9, ty + 6 + (i % 3) * 4, 3.2, { fill: "#5d5045" });
            D.text(ctx, "土石流(陡坡+鬆散土石+大量水)", tx + W * 0.10, ty + 30, { color: "#c98a5a", size: 10.5, align: "center", weight: "700" });
          }
          CK.badge(ctx, W * 0.24, H * 0.10, slide ? "剪應力 > 抗剪:滑動!" : FS < 1.25 ? "接近臨界" : "坡地穩定",
            slide ? "#e57373" : FS < 1.25 ? "#e8b13c" : "#66bb6a");
          rFS.set(FS, 2); rSat.set(sat * 100, 0);
          rState.set(slide ? "滑動中" : FS < 1.25 ? "臨界(接近極限平衡)" : "穩定");
          rCause.set(sat > 0.6 ? "降雨入滲(孔隙水壓↑)" : th > 40 ? "坡度過陡" : veg < 0.3 ? "植被不足" : "目前無明顯誘因");
          vZen.set(slide ? "FS = " + PL.fmt(FS, 2) + " < 1:坡地物質開始下移——先排水、再固坡" : "FS = " + PL.fmt(FS, 2) + (FS < 1.25 ? ":一場豪雨就可能翻過 1.0" : ":抗剪仍有餘裕"), slide ? "bad" : FS < 1.25 ? "warn" : "ok");
        }
      });
      const thS = PL.ui.slider(ui.L.controls, { label: "坡度", min: 15, max: 60, step: 1, value: 30, unit: "°", digits: 0 });
      const rainS = PL.ui.slider(ui.L.controls, { label: "累積降雨", min: 0, max: 600, step: 20, value: 200, unit: "mm/日", digits: 0 });
      const vegS = PL.ui.slider(ui.L.controls, { label: "植被覆蓋", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      PL.ui.note(ui.L.controls, "坡地安不安全,是「剪應力 vs 抗剪強度」的拔河:雨灌進土裡,孔隙水壓把抗剪頂掉,FS 掉破 1.0 就是山崩;水再加碎石就是土石流。");
      PL.ui.procedure(ui.L.controls, {
        title: "把坡推過極限",
        steps: ["固定雨量 200,把坡度從 15° 拉到 45°:FS 一路下滑,曲線上紅點跨過 1.0 線。",
          "坡度固定 35°,雨量拉到 550:藍色水位帶升到地表,FS 破 1——豪雨是最常見的誘因。",
          "把植被從 0 拉回 0.95:根系固土,FS 抬升——同樣的雨就滑不動了。"],
        rule: "土石流三要素:陡坡+鬆散土石+大量水,缺一不可;台灣的災例幾乎都是颱風豪雨踩線——治理先做排水與護坡,不是等崩了再清。"
      });
      const chart = ui.chart("安全係數 FS vs 坡度", "坡度越陡 FS 越低;雨量越大(水位越高)整條曲線越往下壓。跨過 FS = 1 的橫線就是滑動。紅點是目前狀態。");
      const drawChart = () => {
        const fsAt = (a, s) => (1 + vegS.get() * 0.35 - s * 0.55) * Math.tan(34 * Math.PI / 180) / Math.tan(a * Math.PI / 180);
        CK.plot(chart, {
          x0: 15, x1: 60, y0: 0, y1: 2.6, xlabel: "坡度(°)", ylabel: "安全係數 FS",
          series: [
            { fn: a => fsAt(a, 0), color: "rgba(140,160,180,0.45)", width: 1.4 },
            { fn: a => fsAt(a, 0.5), color: "rgba(140,160,180,0.45)", width: 1.4 },
            { fn: a => fsAt(a, clamp(rainS.get() / 600, 0, 1)), color: PL.col("accent") }],
          marks: [
            { hline: 1, color: "#e57373", label: "滑動門檻 FS=1", dash: [5, 4] },
            { dot: [thS.get(), fsAt(thS.get(), clamp(rainS.get() / 600, 0, 1))], color: PL.col("warn"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "颱風豪雨", apply: () => { thS.set(42); rainS.set(560); vegS.set(0.3); ui.redraw(); drawChart(); } },
        { label: "乾燥穩定", apply: () => { thS.set(30); rainS.set(40); vegS.set(0.7); ui.redraw(); drawChart(); } },
        { label: "濫墾裸坡", apply: () => { thS.set(38); rainS.set(320); vegS.set(0); ui.redraw(); drawChart(); } }] });
      const rFS = PL.ui.readout(ui.L.readouts, { label: "安全係數 FS" });
      const rSat = PL.ui.readout(ui.L.readouts, { label: "土壤水飽和度", unit: "%" });
      const rState = PL.ui.readout(ui.L.readouts, { label: "坡地狀態" });
      const rCause = PL.ui.readout(ui.L.readouts, { label: "主要誘因" });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "極限平衡判定" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 台灣的地形特色 */
  PL.register("taiwan-landforms", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const up = upS.get(), er = erS.get(), riv = rivChk.get();
          const net = up - er;
          const hMax = 800 + 3800 * up / (up + er);          // 抬升–侵蝕平衡山高(m)
          // 台灣地形圖
          const mw = Math.min(W * 0.28, H * 0.74 / 1.625), box = { x: W * 0.04, y: H * 0.10, w: mw, h: mw * 1.625 };
          const proj = CK.taiwanMap(ctx, box, { markers: [
            { lon: 120.96, lat: 23.47, label: "玉山 3952 m", color: "#e57373" },
            { lon: 120.25, lat: 23.60, label: "嘉南平原", color: "#66bb6a" },
            { lon: 121.55, lat: 25.03, label: "台北盆地", color: "#5c91dc" }] });
          // 短急河川:中央山脈脊線流向兩側
          if (riv) {
            [[121.0, 24.4, 120.3, 24.3], [121.05, 23.6, 120.3, 23.75], [121.0, 23.0, 120.35, 23.1],
             [121.1, 24.7, 121.75, 24.7], [121.05, 22.8, 121.7, 22.7]].forEach(r => {
              const a = proj(r[0], r[1]), b = proj(r[2], r[3]);
              CK.arrow(ctx, a[0], a[1], b[0], b[1], "rgba(74,144,216,0.8)");
            });
            D.text(ctx, "河川短急(最長僅 186 km)", box.x + box.w * 0.5, box.y + box.h + 14, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          }
          // 東西剖面:東陡西緩
          const sx0 = W * 0.40, sx1 = W * 0.95, sy = H * 0.68, hpx = hMax / 4200 * (H * 0.46);
          const xPk = sx0 + (sx1 - sx0) * 0.62;
          ctx.save(); ctx.fillStyle = "rgba(64,140,200,0.5)"; ctx.fillRect(sx0, sy, sx1 - sx0, H * 0.16); ctx.restore();
          ctx.save(); ctx.fillStyle = PL.theme.isLight() ? "#7d9a62" : "#4a5a3e";
          ctx.beginPath(); ctx.moveTo(sx0, sy);
          for (let x = sx0; x <= xPk; x += 4) ctx.lineTo(x, sy - hpx * Math.pow((x - sx0) / (xPk - sx0), 1.9));
          for (let x = xPk; x <= sx1; x += 4) ctx.lineTo(x, sy - hpx * Math.pow(1 - (x - xPk) / (sx1 - xPk), 0.45));
          ctx.lineTo(sx1, sy); ctx.closePath(); ctx.fill(); ctx.restore();
          D.text(ctx, "西部平原(緩)", sx0 + (sx1 - sx0) * 0.22, sy + 14, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "中央山脈", xPk, sy - hpx - 10, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          D.text(ctx, "東部斷崖(陡)", sx0 + (sx1 - sx0) * 0.85, sy + 14, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.line(ctx, sx0, sy - 3952 / 4200 * (H * 0.46), sx1, sy - 3952 / 4200 * (H * 0.46), "rgba(229,83,80,0.55)", 1.2, [5, 4]);
          D.text(ctx, "玉山 3952 m", sx1 - 4, sy - 3952 / 4200 * (H * 0.46) - 6, { color: "#e57373", size: 9.5, align: "right" });
          // 抬升與侵蝕箭頭
          for (let i = 0; i < Math.round(up / 2.5); i++) D.arrow(ctx, xPk - 20 + i * 20, sy + 18, xPk - 20 + i * 20, sy + 18 - 8 - up * 2.2, { color: "#e57373", width: 2 });
          D.text(ctx, "抬升 " + PL.fmt(up, 1) + " mm/年", xPk + 26, sy + 30, { color: "#e57373", size: 10 });
          for (let i = 0; i < Math.round(er / 2.5); i++) {
            const f = ((t * 0.12 + i * 0.3) % 1);
            D.disc(ctx, sx0 + (sx1 - sx0) * (0.3 + i * 0.14), sy - hpx * 0.5 + f * hpx * 0.4, 2.4, { fill: "rgba(127,168,217,0.9)" });
          }
          D.text(ctx, "侵蝕搬運 " + PL.fmt(er, 1) + " mm/年", sx0 + (sx1 - sx0) * 0.28, sy - hpx * 0.72, { color: "#7fa8d9", size: 10 });
          // 資料卡
          CK.panel(ctx, W * 0.42, H * 0.05, W * 0.54, H * 0.16, "造山 vs 侵蝕");
          [["淨變化", (net >= 0 ? "+" : "−") + PL.fmt(Math.abs(net), 1) + " mm/年"],
           ["平衡山高", Math.round(hMax) + " m(玉山實際 3952 m)"],
           ["狀態", net > 0.5 ? "抬升贏 → 山脈仍在長高" : net < -0.5 ? "侵蝕贏 → 高度被削低" : "動態平衡 → 山高維持"]].forEach((r, i) => {
            D.text(ctx, r[0], W * 0.45, H * 0.105 + i * 16, { color: PL.col("text-faint"), size: 9.5 });
            D.text(ctx, r[1], W * 0.94, H * 0.105 + i * 16, { color: i === 2 ? PL.col("accent") : PL.col("text"), size: 10, align: "right", weight: i === 2 ? "700" : "400" });
          });
          rH.set(hMax, 0); rNet.set((net >= 0 ? "+" : "−") + PL.fmt(Math.abs(net), 1));
          rEro.set(er, 1); rState.set(net > 0.5 ? "持續長高" : net < -0.5 ? "侵蝕削低" : "動態平衡");
          vZen.set(net > 0.5 ? "板塊擠壓 > 侵蝕:台灣是全世界侵蝕最強、山卻還在長高的少數例子" : net < -0.5 ? "造山減弱:侵蝕把高原一寸寸削低" : "抬升 ≈ 侵蝕:山高停在平衡點——這就是台灣地形年輕又多變的原因", net > 0.5 ? "ok" : net < -0.5 ? "warn" : "info");
        }
      });
      const upS = PL.ui.slider(ui.L.controls, { label: "板塊抬升速率", min: 0.5, max: 10, step: 0.5, value: 5, unit: "mm/年", digits: 1 });
      const erS = PL.ui.slider(ui.L.controls, { label: "侵蝕速率", min: 0.5, max: 10, step: 0.5, value: 4, unit: "mm/年", digits: 1 });
      const rivChk = PL.ui.checkbox(ui.L.controls, { label: "顯示短急河川", checked: true });
      PL.ui.note(ui.L.controls, "台灣的地形是造山與侵蝕的賽跑:板塊以約 5 mm/年把地殼頂起,侵蝕又以相近速率削它——山高停在兩者的平衡點上,河川短急、平原狹小都是擠壓的後果。");
      PL.ui.procedure(ui.L.controls, {
        title: "解出山的高度",
        steps: ["抬升 8、侵蝕 2:淨變化 +6,平衡山高逼近玉山——快速造山期。",
          "兩支都拉到 5:淨變化趨零,山高凍結在平衡值——山不是靜止,而是動態平衡。",
          "抬升 1、侵蝕 6:造山熄火,剖面被削低——數百萬年後台灣會變矮。"],
        rule: "山的高度由「抬升 − 侵蝕」決定,不是抬升越高就越高:台灣侵蝕速率全球前列,卻仍能長出東亞最高峰,正因為抬升贏得更多。"
      });
      const chart = ui.chart("平衡山高 vs 抬升速率", "抬升越快、山越高,但報酬遞減(分母是抬升+侵蝕):紅色虛線是玉山 3952 m——今日台灣就在這條曲線的高位段。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0.5, x1: 10, y0: 0, y1: 4600, xlabel: "抬升速率(mm/年)", ylabel: "平衡山高(m)",
          series: [
            { fn: u => 800 + 3800 * u / (u + 6), color: "rgba(140,160,180,0.45)", width: 1.4 },
            { fn: u => 800 + 3800 * u / (u + erS.get()), color: PL.col("accent") }],
          marks: [
            { hline: 3952, color: "#e57373", label: "玉山 3952 m", dash: [5, 4] },
            { dot: [upS.get(), 800 + 3800 * upS.get() / (upS.get() + erS.get())], color: PL.col("warn"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "快速造山", apply: () => { upS.set(8); erS.set(2); ui.redraw(); drawChart(); } },
        { label: "今日台灣", apply: () => { upS.set(5); erS.set(4); ui.redraw(); drawChart(); } },
        { label: "侵蝕削平", apply: () => { upS.set(1); erS.set(6); ui.redraw(); drawChart(); } }] });
      const rH = PL.ui.readout(ui.L.readouts, { label: "平衡山高", unit: "m" });
      const rNet = PL.ui.readout(ui.L.readouts, { label: "淨變化", unit: "mm/年" });
      const rEro = PL.ui.readout(ui.L.readouts, { label: "侵蝕速率", unit: "mm/年" });
      const rState = PL.ui.readout(ui.L.readouts, { label: "地形狀態" });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "造山平衡判定" });
      return { stop() { ui.stop(); } };
    }
  });
})();
