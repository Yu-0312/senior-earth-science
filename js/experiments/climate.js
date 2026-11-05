/* 模組九 · 氣候與氣候變遷 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 溫室效應與輻射平衡 */
  PL.register("greenhouse-effect", {
    build(root) {
      // 教學單層大氣模型:T_s = 255 K / (1 − ε/2)^(1/4);ε=0 時 −18 °C、ε≈0.78 時約 15 °C
      const Ts = e => 255 / Math.pow(1 - e / 2, 0.25) - 273.15;
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const e = ghgS.get(), T = Ts(e);
          CK.scene(ui.cv, { kind: "sky", horizon: H * 0.78 });
          // 太陽與入射短波(黃)、反射(灰虛線)
          CK.sunIcon(ctx, W * 0.08, H * 0.11, 12, { time: t });
          for (let i = 0; i < 3; i++)
            CK.arrow(ctx, W * (0.15 + i * 0.06), H * 0.19, W * (0.23 + i * 0.06), H * 0.76, "#f6c344", i === 1 ? "短波輻射" : "");
          for (let i = 0; i < 2; i++)
            D.arrow(ctx, W * (0.32 + i * 0.05), H * 0.70, W * (0.39 + i * 0.05), H * 0.24, { color: "#9db3c8", width: 1.6, dash: [4, 4], label: i ? "反射" : "" });
          // 溫室氣體層:吸收率越高色帶越濃
          const bandY = H * 0.46;
          D.rect(ctx, 0, bandY, W, H * 0.11, { fill: "rgba(255,138,101," + (0.10 + e * 0.55).toFixed(3) + ")" });
          D.text(ctx, "溫室氣體層 ε=" + e.toFixed(2), W * 0.28, bandY + 17, { color: "#fff", size: 11, align: "center", weight: "700" });
          // 地表長波:逸出太空 + 被吸收後向下再輻射(箭頭數量與粗細隨 ε 變)
          const nOut = Math.round((1 - e) * 4) + 1, nBack = Math.round(e * 4) + 1;
          for (let i = 0; i < nOut; i++)
            D.arrow(ctx, W * (0.40 + i * 0.045), H * 0.42, W * (0.47 + i * 0.045), H * 0.09, { color: "#e25555", width: 2.2, label: i === 0 ? "逸出 " + Math.round((1 - e / 2) * 100) + "%" : "" });
          for (let i = 0; i < nBack; i++)
            D.arrow(ctx, W * (0.62 + i * 0.045), H * 0.44, W * (0.69 + i * 0.045), H * 0.76, { color: "#ff7b5c", width: 2 + e * 2.4, label: i === 0 ? "向下再輻射" : "" });
          CK.badge(ctx, W * 0.28, H * 0.88, "地表均溫 " + T.toFixed(1) + " °C", CK.tempColor((T + 20) / 48));
          // 右側收支卡
          CK.panel(ctx, W * 0.66, H * 0.12, W * 0.30, H * 0.58, "輻射收支(全球平均)");
          [["入射太陽短波", "340 W/m²"], ["反射回太空", "約 30%"],
           ["有效溫度(無大氣)", "−18 °C"], ["地表均溫(有溫室)", T.toFixed(1) + " °C"],
           ["溫室增溫", "+" + (T + 18).toFixed(1) + " °C"]].forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.685, H * 0.22 + i * 30, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.945, H * 0.22 + i * 30, { color: i >= 3 ? PL.col("accent") : PL.col("text"), size: 11.5, align: "right", weight: i >= 3 ? "700" : "" });
          });
          D.text(ctx, "平衡:入射短波 = 反射 + 逸出長波", W * 0.81, H * 0.64, { color: PL.col("text-faint"), size: 10, align: "center" });
          rT.set(T, 1); rW.set(T + 18, 1); rAbs.set(e * 100, 0); rEsc.set(Math.round((1 - e / 2) * 100), 0);
          vG.set(T < 0 ? "冰封地球:液態水難以存在" : T > 24 ? "過熱:冰蓋崩解、海面大升" : T > 20 ? "偏熱:逼近危險門檻" : "宜居範圍:液態水與生命活躍",
            T < 0 || T > 24 ? "bad" : T > 20 ? "warn" : "ok");
        }
      });
      const ghgS = PL.ui.slider(ui.L.controls, { label: "溫室氣體吸收率", min: 0, max: 0.92, step: 0.02, value: 0.78, digits: 2 });
      PL.ui.note(ui.L.controls, "溫室效應本身是恩賜:把吸收率歸零,地表均溫掉到 −18 °C、海洋結凍。CO₂ 等溫室氣體吸收地表長波、再向下輻射,等於給地表蓋了層被子——過量才是危機。");
      PL.ui.procedure(ui.L.controls, {
        title: "拆解輻射平衡",
        steps: [
          "把吸收率拉到 0:紅色長波全部逸出,地表 −18 °C。",
          "拉回 0.78(約今日):向下再輻射箭頭變粗變多,均溫回到 15 °C 附近。",
          "對照右卡:溫室增溫 = 地表均溫 − 有效溫度 −18 °C。"
        ],
        rule: "溫室氣體「選擇性」吸收長波、幾乎不擋短波——短波進得來、長波出不去,才是機制的重點,不是籠統的「像玻璃罩住熱」。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "無溫室效應", apply: () => { ghgS.set(0); ui.redraw(); } },
        { label: "工業革命前", apply: () => { ghgS.set(0.76); ui.redraw(); } },
        { label: "現今", apply: () => { ghgS.set(0.80); ui.redraw(); } },
        { label: "過量排放", apply: () => { ghgS.set(0.90); ui.redraw(); } }] });
      const rT = PL.ui.readout(ui.L.readouts, { label: "地表均溫", unit: "°C" }), rW = PL.ui.readout(ui.L.readouts, { label: "溫室增溫", unit: "°C" });
      const rAbs = PL.ui.readout(ui.L.readouts, { label: "長波被吸收", unit: "%" }), rEsc = PL.ui.readout(ui.L.readouts, { label: "長波逸出太空", unit: "%" });
      const vG = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("地表均溫 vs 吸收率", "藍點=目前設定;藍虛線=今日觀測值約 15 °C。吸收率越高均溫越高,而「從 0 加一點」升溫最快。");
      const drawChart = () => {
        const e = ghgS.get();
        CK.plot(chart, {
          x0: 0, x1: 0.92, y0: -22, y1: 34, xlabel: "溫室氣體吸收率", ylabel: "地表均溫 (°C)",
          series: [{ fn: x => Ts(x), color: PL.col("accent") }],
          marks: [{ hline: 15, color: "#2e9bb5", dash: [5, 4] }, { dot: [e, Ts(e)], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 碳循環與大氣 CO₂ */
  PL.register("carbon-cycle-climate", {
    build(root) {
      const GTC_PPM = 2.13;                     // 教學換算:1 ppm ≈ 2.13 GtC
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const E = emisS.get(), yr = Math.round(yearS.get());
          const ppm = 280 + E * 0.45 / GTC_PPM * yr, rate = E * 0.45 / GTC_PPM;
          // 四個碳庫
          const lib = (x, y, w, h, name, fill, val) => {
            D.rect(ctx, x, y, w, h, { fill, stroke: PL.col("border"), r: 8 });
            D.text(ctx, name, x + 10, y + 18, { color: PL.col("text"), size: 11.5, weight: "700" });
            if (val) D.text(ctx, val, x + 10, y + 36, { color: PL.col("text-dim"), size: 10 });
          };
          lib(W * 0.26, H * 0.08, W * 0.30, H * 0.20, "大氣 CO₂",
            "rgba(192,57,43," + (0.10 + clamp((ppm - 280) / 400, 0, 0.45)).toFixed(3) + ")", ppm.toFixed(0) + " ppm(經過 " + yr + " 年)");
          lib(W * 0.06, H * 0.64, W * 0.24, H * 0.22, "陸地生物圈", "rgba(102,187,106,0.20)", "光合 = 呼吸(自然平衡)");
          lib(W * 0.05, H * 0.34, W * 0.17, H * 0.18, "岩石圈", "rgba(141,110,99,0.28)", "火山 ≈ 風化");
          lib(W * 0.64, H * 0.64, W * 0.28, H * 0.22, "海洋", "rgba(30,95,168,0.24)", "已吸收約 1/4 排放");
          // 人為排放(紅,粗細隨排放量)
          if (E > 0.05)
            D.arrow(ctx, W * 0.90, H * 0.46, W * 0.565, H * 0.22, { color: "#d84a3a", width: 2 + E * 0.55, label: "化石燃料 " + E.toFixed(1) + " GtC/年" });
          D.arrow(ctx, W * 0.50, H * 0.28, W * 0.74, H * 0.62, { color: "#2e6da8", width: 1.5 + E * 0.16, label: "海洋吸收 " + (E * 0.25).toFixed(1) });
          D.arrow(ctx, W * 0.30, H * 0.28, W * 0.18, H * 0.62, { color: "#4a9a55", width: 1.5 + E * 0.14, label: "陸地吸收 " + (E * 0.30).toFixed(1) });
          CK.arrow(ctx, W * 0.20, H * 0.38, W * 0.28, H * 0.20, "#8d6e63", "火山");
          CK.arrow(ctx, W * 0.28, H * 0.22, W * 0.20, H * 0.36, "#6b8f6b", "風化");
          if (rate > 1.2) CK.badge(ctx, W * 0.44, H * 0.50, "每年淨增 " + rate.toFixed(2) + " ppm", "#c0392b");
          // 右側去向卡
          CK.panel(ctx, W * 0.64, H * 0.08, W * 0.32, H * 0.34, "碳的去向(人為排放)");
          [["大氣保留", "45%"], ["海洋吸收", "25%"], ["陸地吸收", "30%"], ["年增幅", "+" + rate.toFixed(2) + " ppm/年"]].forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.66, H * 0.16 + i * 26, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.94, H * 0.16 + i * 26, { color: i === 3 ? PL.col("accent") : PL.col("text"), size: 11, align: "right" });
          });
          D.text(ctx, "自然通量本來平衡;人類把天平壓向大氣", W * 0.80, H * 0.36, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 排放流動光點
          const f = (t * 0.4) % 1;
          if (E > 0.05) D.disc(ctx, lerp(W * 0.90, W * 0.565, f), lerp(H * 0.46, H * 0.22, f), 3.2, { fill: "#ff8a65", glow: "#ff5722", glowSize: 7 });
          rP.set(ppm, 0); rRate.set(rate, 2); rSea.set(E * 0.25, 1); rAir.set(45, 0);
          vC.set(ppm < 300 ? "接近工業前(280 ppm)" : ppm < 420 ? "已明顯高於工業前" : "超過 420 ppm:超出 80 萬年自然範圍",
            ppm < 300 ? "info" : ppm < 420 ? "warn" : "bad");
        }
      });
      const emisS = PL.ui.slider(ui.L.controls, { label: "人為碳排放", min: 0, max: 15, step: 0.5, value: 11, unit: "GtC/年", digits: 1 });
      const yearS = PL.ui.slider(ui.L.controls, { label: "模擬經過", min: 0, max: 80, step: 1, value: 60, unit: "年", digits: 0 });
      PL.ui.note(ui.L.controls, "自然碳循環是平衡的:火山釋放 ≈ 風化與沉積吸碳,光合與呼吸互相抵消。人類一年注入上百億噸碳,把天平壓向大氣——濃度才會從 280 ppm 升到 420 ppm 以上。");
      PL.ui.procedure(ui.L.controls, {
        title: "追碳的去向",
        steps: [
          "排放歸零:紅色箭頭消失,濃度停在 280 ppm 不再上升。",
          "排放 11 GtC/年、模擬 60 年:濃度爬到約 420 ppm,正是現今實測。",
          "看紅色徽章的年增幅約 2.3 ppm/年,與基林曲線一致。"
        ],
        rule: "碳不會消失,只是換庫:海洋吸收約 1/4,代價是海水變酸;岩石風化吸碳要十萬年尺度——化石碳燒掉後,人類時間尺度內收不回來。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "工業前(無排放)", apply: () => { emisS.set(0); yearS.set(0); ui.redraw(); } },
        { label: "現今", apply: () => { emisS.set(11); yearS.set(60); ui.redraw(); } },
        { label: "照常排放 80 年", apply: () => { emisS.set(11); yearS.set(80); ui.redraw(); } }] });
      const rP = PL.ui.readout(ui.L.readouts, { label: "大氣 CO₂", unit: "ppm" }), rRate = PL.ui.readout(ui.L.readouts, { label: "年增幅", unit: "ppm/年" });
      const rSea = PL.ui.readout(ui.L.readouts, { label: "海洋吸收", unit: "GtC/年" }), rAir = PL.ui.readout(ui.L.readouts, { label: "大氣保留", unit: "%" });
      const vC = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("基林曲線(模擬)", "小鋸齒=季節振盪(北半球夏季植物吸碳);綠虛線=工業前 280、紅虛線=2020s 實測 420 ppm。");
      const drawChart = () => {
        const E = emisS.get(), yr = Math.round(yearS.get());
        CK.plot(chart, {
          x0: 0, x1: 80, y0: 270, y1: 480, xlabel: "模擬年數", ylabel: "CO₂ (ppm)",
          series: [{ pts: Array.from({ length: 161 }, (_, i) => { const y = i / 2; return [y, 280 + E * 0.45 / GTC_PPM * y + 0.6 * Math.sin(y * TAU)]; }), color: PL.col("accent") }],
          marks: [{ hline: 280, color: "#4a9a55", dash: [4, 4] }, { hline: 420, color: "#c0392b", dash: [4, 4] },
                  { dot: [yr, 280 + E * 0.45 / GTC_PPM * yr], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 米蘭柯維奇循環 */
  PL.register("milankovitch", {
    build(root) {
      const SEASONS = ["冬至", "春分", "夏至", "秋分"];
      // 65°N 夏季日照異常(教學指標):傾角項 + 離心率×歲差項
      const dqAt = (e, tilt, prec) => 18 * (tilt - 23.44) / 1.2 + 15 * (e / 0.058) * Math.cos((prec - 0.5) * TAU);
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const e = eccS.get(), tilt = tiltS.get(), prec = precS.get();
          const dq = dqAt(e, tilt, prec);
          ctx.save(); ctx.fillStyle = "#0b1020"; ctx.fillRect(0, 0, W, H); ctx.restore();
          if (PL.apparatus.starfield) PL.apparatus.starfield(ctx, W, H, 6);
          // 軌道:偏心率放大 8 倍才看得出橢圓;太陽在焦點,近日點在左頂點
          const orb = CK.orbitEllipse(ctx, { x: W * 0.04, y: H * 0.18, w: W * 0.46, h: H * 0.56 },
            { ecc: Math.min(0.85, e * 8), showAxes: true });
          const ang = t * 0.3 + prec * TAU;
          D.disc(ctx, orb.cx + orb.a * Math.cos(ang), orb.cy + orb.b * Math.sin(ang), 6, { fill: "#64b5f6", stroke: "#fff", width: 1 });
          D.ring(ctx, orb.cx - orb.a, orb.cy, 10, "#ffca28", 1.6, [3, 2]);
          D.text(ctx, "近日點", orb.cx - orb.a, orb.cy + 20, { color: "#ffca28", size: 9.5, align: "center" });
          D.text(ctx, "偏心率放大 8×", W * 0.26, H * 0.80, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          CK.badge(ctx, W * 0.26, H * 0.10, "近日點出現在:" + SEASONS[Math.round(prec * 4) % 4], "#b98a2c");
          // 傾角小地球
          CK.globe(ctx, W * 0.82, H * 0.28, H * 0.10, { tilt, showAxis: true, spin: t * 0.02 });
          D.text(ctx, "轉軸傾角 " + tilt.toFixed(1) + "°", W * 0.82, H * 0.42, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 65°N 夏季日照異常量尺
          CK.meter(ctx, W * 0.62, H * 0.50, W * 0.32, 12, (dq + 35) / 70,
            { color: dq > 0 ? "#ef8829" : "#2e9bb5", label: "65°N 夏季日照異常 " + (dq >= 0 ? "+" : "") + dq.toFixed(1) + " W/m²" });
          // 三種週期卡
          CK.panel(ctx, W * 0.62, H * 0.58, W * 0.34, H * 0.34, "三種軌道週期(疊加)");
          [["離心率", "約 10 萬年", "0 ↔ 0.058"], ["轉軸傾角", "約 4.1 萬年", "22.1° ↔ 24.5°"], ["歲差", "約 2.6 萬年", "近日點季節輪替"]].forEach(([k, v, s], i) => {
            D.text(ctx, k + " " + v, W * 0.64, H * 0.66 + i * 26, { color: PL.col("text"), size: 10.5 });
            D.text(ctx, s, W * 0.94, H * 0.66 + i * 26, { color: PL.col("text-faint"), size: 10, align: "right" });
          });
          rQ.set(dq, 1); rTilt.set(tilt, 1); rEcc.set(e, 3); rSeason.set(SEASONS[Math.round(prec * 4) % 4]);
          vM.set(dq > 8 ? "偏暖:利於冰蓋退縮(間冰期條件)" : dq < -8 ? "偏冷:夏季雪融不完,利於冰蓋擴張(冰期條件)" : "過渡:緩慢漂向下一個冰期或間冰期",
            dq > 8 ? "ok" : dq < -8 ? "info" : "warn");
        }
      });
      const eccS = PL.ui.slider(ui.L.controls, { label: "軌道離心率", min: 0, max: 0.058, step: 0.002, value: 0.017, digits: 3 });
      const tiltS = PL.ui.slider(ui.L.controls, { label: "轉軸傾角", min: 22.1, max: 24.5, step: 0.1, value: 23.44, unit: "°", digits: 1 });
      const precS = PL.ui.slider(ui.L.controls, { label: "歲差相位", min: 0, max: 1, step: 0.05, value: 0, digits: 2 });
      PL.ui.note(ui.L.controls, "三個軌道週期疊加,改變「65°N 夏季日照」:夏天不夠熱、冬雪融不完,冰蓋就逐年擴張成冰期——高緯夏季日照是冰期旋回的開關。");
      PL.ui.procedure(ui.L.controls, {
        title: "找冰期的開關",
        steps: [
          "把傾角拉到 22.1°、歲差 0(冬至近日點):日照異常深負,判定為冰期條件。",
          "把傾角拉到 24.5°、歲差 0.5(夏至近日點):異常轉正,利於冰蓋退縮。",
          "看圖表:只動歲差,曲線就上下擺盪——三個週期疊加才決定長期趨勢。"
        ],
        rule: "軌道因子改變的是「日照分布」,不是太陽總輸出;它能解釋冰期旋回的節奏,解釋不了近百年的人為快速暖化。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "今日軌道", apply: () => { eccS.set(0.017); tiltS.set(23.44); precS.set(0); ui.redraw(); } },
        { label: "偏暖(間冰期)", apply: () => { eccS.set(0.03); tiltS.set(24.5); precS.set(0.5); ui.redraw(); } },
        { label: "偏冷(冰期)", apply: () => { eccS.set(0.058); tiltS.set(22.1); precS.set(0); ui.redraw(); } }] });
      const rQ = PL.ui.readout(ui.L.readouts, { label: "65°N 夏季日照異常", unit: "W/m²" }), rTilt = PL.ui.readout(ui.L.readouts, { label: "轉軸傾角", unit: "°" });
      const rEcc = PL.ui.readout(ui.L.readouts, { label: "離心率(真實)" }), rSeason = PL.ui.readout(ui.L.readouts, { label: "近日點季節" });
      const vM = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("65°N 夏季日照 vs 歲差相位", "只轉歲差,日照異常就上下擺盪;傾角與離心率再決定擺盪的中心與幅度。0=冬至近日點、0.5=夏至近日點。");
      const drawChart = () => {
        const e = eccS.get(), tilt = tiltS.get(), prec = precS.get();
        CK.plot(chart, {
          x0: 0, x1: 1, y0: -42, y1: 42, xlabel: "歲差相位", ylabel: "日照異常 (W/m²)",
          series: [{ fn: p => dqAt(e, tilt, p), color: PL.col("accent") }],
          marks: [{ hline: 0, color: PL.col("text-faint"), dash: [4, 4] }, { dot: [prec, dqAt(e, tilt, prec)], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 冰期與冰芯紀錄 */
  PL.register("ice-ages", {
    build(root) {
      const MAXA = 800;                     // 千年
      // 合成 80 萬年冰期旋回(教學用):冰期約 180、間冰期約 280 ppm
      const co2At = k => clamp(232 + 48 * Math.sin((k / 100 + 0.25) * TAU) + 12 * Math.sin(k / 41 * TAU + 1.2) + 6 * Math.sin(k / 240 * TAU), 176, 292);
      const dTAt = k => (co2At(k) - 280) * 0.08;          // 相對現今的溫度異常 °C
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const depth = depthS.get(), k = depth / 4;       // 1 m ≈ 250 年
          const c = co2At(k), dT = dTAt(k), d18 = -52 + dT * 1.5;
          // 冰芯剖面:顏色=當年氣溫,白點=封存氣泡(CO₂ 越多越密)
          const x0 = W * 0.08, w0 = W * 0.15, y0 = H * 0.10, h0 = H * 0.78, NB = 40;
          for (let i = 0; i < NB; i++) {
            const km = (i + 0.5) / NB * MAXA, y1 = y0 + i / NB * h0, bh = h0 / NB;
            D.rect(ctx, x0, y1, w0, bh + 0.6, { fill: CK.tempColor((dTAt(km) + 8) / 10) });
            const nb = Math.round(2 + (co2At(km) - 176) / 116 * 4);
            for (let b = 0; b < nb; b++)
              D.disc(ctx, x0 + 7 + (b * 16 + i * 9) % (w0 - 12), y1 + 3 + (b * 11 + i * 6) % Math.max(3, bh - 5), 2, { fill: "rgba(255,255,255,0.85)" });
          }
          for (let d = 0; d <= 3200; d += 800) D.text(ctx, d + " m", x0 + w0 + 6, y0 + d / 3200 * h0 + 4, { color: PL.col("text-faint"), size: 9 });
          const sy = y0 + depth / 3200 * h0;
          D.line(ctx, x0 - 12, sy, x0 + w0 + 34, sy, PL.col("accent-2"), 2, [5, 3]);
          CK.badge(ctx, x0 + w0 + 96, sy, "取樣 " + Math.round(depth) + " m", PL.col("accent-2"));
          if (depth < 60) CK.badge(ctx, W * 0.36, y0 - 2, "冰芯頂:現今 420 ppm 超出自然範圍", "#c0392b");
          // 讀數卡
          CK.panel(ctx, W * 0.42, H * 0.10, W * 0.26, H * 0.60, "冰芯讀數(取樣層)");
          [["層位年齡", k.toFixed(1) + " 千年"], ["封存 CO₂", c.toFixed(0) + " ppm"],
           ["溫度異常(相對現今)", (dT >= 0 ? "+" : "") + dT.toFixed(1) + " °C"], ["δ¹⁸O", d18.toFixed(1) + " ‰"]].forEach(([kk, v], i) => {
            D.text(ctx, kk, W * 0.435, H * 0.22 + i * 30, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.66, H * 0.22 + i * 30, { color: PL.col("text"), size: 11.5, align: "right", weight: "700" });
          });
          const glacial = c < 210, inter = c > 260;
          D.text(ctx, glacial ? "冰期層位:CO₂ 低、全球比現今低 4–8 °C" : inter ? "間冰期層位:CO₂ 約 280 ppm、氣候溫暖" : "過渡層位:CO₂ 與溫度同步升降",
            W * 0.55, H * 0.56, { color: glacial ? "#7fc4e8" : inter ? "#e8c34d" : PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "同相位:CO₂ 與溫度一起變", W * 0.55, H * 0.63, { color: PL.col("text-faint"), size: 10, align: "center" });
          // 怎麼讀冰芯
          CK.panel(ctx, W * 0.70, H * 0.10, W * 0.26, H * 0.34, "怎麼讀冰芯");
          ["氣泡=當年大氣的標本", "水分子 δ¹⁸O=當年氣溫", "越深越老:1 m ≈ 250 年"].forEach((s, i) =>
            D.text(ctx, "· " + s, W * 0.72, H * 0.19 + i * 26, { color: PL.col("text"), size: 10.5 }));
          rAge.set(k, 1); rCO2.set(c, 0); rT.set(dT, 1); rD18.set(d18, 1);
          vI.set(depth < 60 ? "現今 420 ppm:已超出 80 萬年自然範圍(176–292)" : glacial ? "冰期層位" : inter ? "間冰期層位" : "過渡期層位",
            depth < 60 ? "bad" : glacial ? "info" : inter ? "ok" : "warn");
        }
      });
      const depthS = PL.ui.slider(ui.L.controls, { label: "取樣深度", min: 0, max: 3200, step: 10, value: 200, unit: "m", digits: 0 });
      PL.ui.note(ui.L.controls, "冰芯是古氣候的膠囊:氣泡封存當年大氣、水分子同位素記錄當年氣溫。往深處讀,80 萬年的冰期—間冰期旋回一目了然——而表層的 420 ppm 遠遠跳出這個範圍。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀一管冰",
        steps: [
          "把取樣深度拉到 200 m:CO₂ 約 180 ppm,是冰期層位。",
          "拉到 1600 m:CO₂ 回到 280 ppm 附近,是間冰期層位。",
          "對照圖表:紅虛線(現今 420)遠高於 80 萬年來任何自然值。"
        ],
        rule: "CO₂ 與溫度在冰芯裡同相位升降;但「同相位」不等於誰推誰,而現今 420 ppm 的上升「速率」更是遠超任何自然循環。"
      });
      PL.ui.presets(ui.L.controls, { label: "跳到", options: [
        { label: "冰期層位", apply: () => { depthS.set(200); ui.redraw(); } },
        { label: "上個間冰期", apply: () => { depthS.set(1600); ui.redraw(); } },
        { label: "表層(現今)", apply: () => { depthS.set(0); ui.redraw(); } }] });
      const rAge = PL.ui.readout(ui.L.readouts, { label: "層位年齡", unit: "千年" }), rCO2 = PL.ui.readout(ui.L.readouts, { label: "封存 CO₂", unit: "ppm" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "溫度異常", unit: "°C" }), rD18 = PL.ui.readout(ui.L.readouts, { label: "δ¹⁸O", unit: "‰" });
      const vI = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("80 萬年 CO₂ 紀錄", "綠虛線=間冰期 280、藍虛線=冰期 180 ppm;紅虛線=現今 420——遠高於自然變化範圍,且上升速率前所未見。");
      const drawChart = () => {
        const k = depthS.get() / 4;
        CK.plot(chart, {
          x0: 0, x1: 800, y0: 150, y1: 460, xlabel: "年齡 (千年)", ylabel: "CO₂ (ppm)",
          series: [{ fn: x => co2At(x), color: PL.col("accent") }],
          marks: [{ hline: 280, color: "#4a9a55", dash: [4, 4] }, { hline: 180, color: "#2e9bb5", dash: [4, 4] },
                  { hline: 420, color: "#c0392b", dash: [4, 4] }, { vline: k, color: PL.col("accent-2"), label: "取樣" },
                  { dot: [k, co2At(k)], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 古氣候代用資料 */
  PL.register("proxy-data", {
    build(root) {
      const N = 26, NAME = { tree: "樹輪", stal: "石筍", sed: "沉積物岩芯" };
      const HIST = [0.4, 0.6, 0.2, -0.3, -0.8, -0.5, 0.1, 0.5, 0.9, 0.3, -0.2, -0.6, -0.1, 0.4, 0.8, 0.5, 0.0, -0.4, -0.7, -0.2];
      const INFO = {
        tree: ["解析度 1 年", "可回溯約數千年", "交叉定年排除個體差異"],
        stal: ["解析度數年", "可回溯約數十萬年", "層理記錄降水與氣溫"],
        sed: ["解析度約百年", "可回溯數千萬年", "深海岩芯記錄冰期旋回"]
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mode = proxSel.get(), dT = tS.get(), dP = pS.get();
          const ts = [], ws = [];
          for (let i = 0; i < N; i++) {
            const use = i >= N - 6;
            ts.push(use ? dT : HIST[i]);
            ws.push(clamp(0.5 + 0.12 * ts[i] + 0.006 * (use ? dP : HIST[i] * 40), 0.10, 1));
          }
          if (mode === "tree") {
            CK.treeRings(ctx, W * 0.26, H * 0.44, H * 0.29, ws, { mark: N - 1, label: "樹輪:內老外新,每圈 = 1 年" });
            CK.badge(ctx, W * 0.26, H * 0.80, "最外圈寬度指數 " + ws[N - 1].toFixed(2), PL.col("accent"));
            D.text(ctx, "暖濕 → 圈寬;冷乾 → 圈窄", W * 0.26, H * 0.87, { color: PL.col("text-faint"), size: 10, align: "center" });
          } else if (mode === "stal") {
            // 石筍:由下往上沉積,雨多長得快、層厚
            let y1 = H * 0.84;
            for (let i = 0; i < 14; i++) {
              const use = i >= 8, h = HIST[(i * 20 / 14) | 0];
              const pp = use ? dP : h * 40, tt = use ? dT : h;
              const bh = clamp(0.30 + 0.010 * pp + 0.02 * tt, 0.06, 1) * H * 0.050;
              const wd = W * 0.15 * (0.55 + 0.45 * (1 - i / 14));
              y1 -= bh;
              D.rect(ctx, W * 0.19 + (W * 0.15 - wd) / 2, y1, wd, bh + 0.5,
                { fill: "rgba(214,199,166," + (0.45 + 0.5 * clamp(0.5 + 0.012 * pp, 0, 1)).toFixed(3) + ")", stroke: "rgba(90,70,40,0.4)", width: 1 });
            }
            D.text(ctx, "石筍:層厚 = 成長速率(雨多則快)", W * 0.265, H * 0.90, { color: PL.col("text-faint"), size: 10, align: "center" });
          } else {
            // 沉積物岩芯:色階 = 表水溫,層厚 = 生物生產力
            let y1 = H * 0.84;
            for (let i = 0; i < 12; i++) {
              const use = i >= 6, tt = use ? dT : HIST[(i * 20 / 12) | 0];
              const bh = clamp(0.5 + 0.10 * tt, 0.2, 1) * H * 0.048;
              y1 -= bh;
              D.rect(ctx, W * 0.19, y1, W * 0.15, bh + 0.5, { fill: CK.tempColor((tt + 8) / 10) });
            }
            D.text(ctx, "沉積物:殼體同位素 → 水溫(色階冷→暖)", W * 0.265, H * 0.90, { color: PL.col("text-faint"), size: 10, align: "center" });
          }
          // 右側檔案卡
          CK.panel(ctx, W * 0.50, H * 0.14, W * 0.42, H * 0.44, "代用資料檔案:" + NAME[mode]);
          INFO[mode].forEach((s, i) => D.text(ctx, "· " + s, W * 0.53, H * 0.25 + i * 32, { color: PL.col("text"), size: 11 }));
          D.text(ctx, "儀器紀錄只有百餘年;更久的氣候全靠代用資料,", W * 0.71, H * 0.48, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "且必須多源交叉驗證才可靠。", W * 0.71, H * 0.53, { color: PL.col("text-faint"), size: 10, align: "center" });
          rT.set(dT, 1); rP.set(dP, 0); rRes.set(INFO[mode][0]); rSpan.set(INFO[mode][1]);
          vX.set(mode === "tree" ? "年輪解析度最高(1 年),近兩千年重建的主力" : mode === "stal" ? "石筍記錄降水變化,適合季風區古氣候" : "沉積物解析度粗但時間深,冰期旋回靠它",
            mode === "tree" ? "ok" : "info");
        }
      });
      const proxSel = PL.ui.select(ui.L.controls, { label: "代用資料", value: "tree", options: [
        { value: "tree", label: "樹輪" }, { value: "stal", label: "石筍" }, { value: "sed", label: "沉積物岩芯" }] });
      const tS = PL.ui.slider(ui.L.controls, { label: "近年溫度異常", min: -3, max: 3, step: 0.1, value: 0.5, unit: "°C", digits: 1 });
      const pS = PL.ui.slider(ui.L.controls, { label: "近年降水變化", min: -50, max: 50, step: 5, value: 0, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "最近 6 圈(層)由你的情境控制:動滑桿,紀錄立刻跟著變——反過來讀,就是由紀錄反推古氣候;每種代用資料的解析度與可回溯時間不同。");
      PL.ui.procedure(ui.L.controls, {
        title: "由紀錄反推氣候",
        steps: [
          "選樹輪,把溫度異常拉到 +3:最外 6 圈明顯變寬——「圈寬=生長季好」。",
          "切到石筍、沉積物:同一個氣候情境,三種紀錄長得不一樣。",
          "看圖表:解析度越粗(沉積物),快速起伏被抹平——所以要多源交叉驗證。"
        ],
        rule: "每種代用資料都有解析度極限:樹輪看年、石筍看數年、沉積物看百年;宣稱「某一年」如何如何的,只能來自樹輪或冰芯等年級紀錄。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "暖濕年", apply: () => { tS.set(1.5); pS.set(30); ui.redraw(); } },
        { label: "冷乾年", apply: () => { tS.set(-1.5); pS.set(-30); ui.redraw(); } },
        { label: "回到平均", apply: () => { tS.set(0); pS.set(0); ui.redraw(); } }] });
      const rT = PL.ui.readout(ui.L.readouts, { label: "推估溫度異常", unit: "°C" }), rP = PL.ui.readout(ui.L.readouts, { label: "推估降水變化", unit: "%" });
      const rRes = PL.ui.readout(ui.L.readouts, { label: "解析度" }), rSpan = PL.ui.readout(ui.L.readouts, { label: "可回溯" });
      const vX = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("重建 vs 實際", "粗色線=代用重建、灰虛線=「實際」氣候:樹輪追得最緊;沉積物(每 4 年一筆)把快速起伏抹平——解析度決定看得到什麼。");
      const drawChart = () => {
        const mode = proxSel.get(), dT = tS.get(), dP = pS.get();
        const ts = [], proxy = [];
        let hold = 0;
        for (let i = 0; i < N; i++) {
          const use = i >= N - 6;
          ts.push([i, use ? dT : HIST[i]]);
          if (mode === "tree") proxy.push([i, ts[i][1] + ((i * 37) % 11 - 5) * 0.02]);
          else if (mode === "stal") {
            const a = i > 0 ? ts[i - 1][1] : ts[i][1], b = i < N - 1 ? ts[i + 1][1] : ts[i][1];
            proxy.push([i, (a + ts[i][1] + b) / 3 + ((i * 23) % 9 - 4) * 0.015]);
          } else {
            if (i % 4 === 0) hold = ts[i][1] + ((i * 41) % 13 - 6) * 0.035;
            proxy.push([i, hold]);
          }
        }
        CK.plot(chart, {
          x0: 0, x1: N - 1, y0: -2.5, y1: 2.5, xlabel: "年(由舊到新)", ylabel: "溫度異常 (°C)",
          series: [{ pts: ts, color: PL.col("text-faint"), dash: [4, 3], width: 1.6 }, { pts: proxy, color: PL.col("accent"), width: 2.4 }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 全球暖化的觀測證據 */
  PL.register("global-warming", {
    build(root) {
      const Y0 = 1880, Y1 = 2025;
      const ss = (x, a, b) => { const f = clamp((x - a) / (b - a), 0, 1); return f * f * (3 - 2 * f); };
      const pk = (y, c, w, a) => a * Math.exp(-((y - c) * (y - c)) / (2 * w * w));
      // 合成全球均溫序列(教學用):量級與相對起伏對齊實測
      const anom = y => -0.25 + 0.35 * ss(y, 1910, 1945) - 0.12 * ss(y, 1945, 1975)
        + 1.42 * Math.pow(ss(y, 1975, 2025), 1.15)
        + 0.05 * Math.sin(y / 3.9) + pk(y, 1944, 2, 0.10) + pk(y, 1998, 1.6, 0.18) + pk(y, 2016, 1.6, 0.14) + pk(y, 2024, 1.4, 0.12);
      const REG = [{ key: "globe", name: "全球", f: 1 }, { key: "land", name: "陸地", f: 1.5 }, { key: "sea", name: "海洋", f: 0.75 }, { key: "arctic", name: "北極", f: 2.8 }];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const yr = Math.round(yS.get()), reg = REG.find(r => r.key === regSel.get());
          const a = anom(yr) * reg.f;
          // 暖化條紋:一年一格,紅=更暖、藍=更冷
          const sx = W * 0.05, sw = W * 0.46, cw = sw / (Y1 - Y0 + 1);
          for (let y = Y0; y <= Y1; y++)
            D.rect(ctx, sx + (y - Y0) * cw, H * 0.14, cw + 0.5, H * 0.42, { fill: CK.tempColor((anom(y) * reg.f + 0.6) / 2.6) });
          [1880, 1920, 1960, 2000].forEach(y => D.text(ctx, String(y), sx + (y - Y0) * cw, H * 0.60, { color: PL.col("text-faint"), size: 9, align: "center" }));
          D.text(ctx, "2025", sx + sw, H * 0.60, { color: PL.col("text-faint"), size: 9, align: "right" });
          D.line(ctx, sx + (yr - Y0) * cw + cw / 2, H * 0.12, sx + (yr - Y0) * cw + cw / 2, H * 0.58, PL.col("text"), 1.6, [3, 2]);
          CK.badge(ctx, sx + (yr - Y0) * cw, H * 0.08, yr + " 年:" + (a >= 0 ? "+" : "") + a.toFixed(2) + " °C", CK.tempColor((a + 0.6) / 2.6));
          // 9 月北極海冰示意
          const ice = clamp(1 - 0.45 * clamp((anom(yr) + 0.3) / 1.5, 0, 1.4), 0.5, 1);
          const ix = W * 0.74, iy = H * 0.26, ir = H * 0.13;
          D.disc(ctx, ix, iy, ir, { fill: "#2e6da8" });
          D.disc(ctx, ix, iy, ir * ice, { fill: "#eaf5fb" });
          D.disc(ctx, ix - ir * ice * 0.45, iy + ir * ice * 0.25, ir * ice * 0.5, { fill: "#eaf5fb" });
          D.text(ctx, "9 月北極海冰(示意)", ix, iy + ir + 14, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.meter(ctx, ix - W * 0.11, iy + ir + 24, W * 0.22, 10, ice, { color: "#7fc4e8", label: "海冰殘存 " + Math.round(ice * 100) + "%" });
          // 獨立證據清單
          CK.panel(ctx, W * 0.58, H * 0.48, W * 0.38, H * 0.40, "多項獨立證據指向同一結論");
          ["陸地暖化快於海洋(約 1.5 倍)", "北極放大效應(約 2.8 倍)", "夜間最低溫上升更快", "海面已上升約 20 cm(1900 起)"].forEach((s, i) =>
            D.text(ctx, "✓ " + s, W * 0.60, H * 0.56 + i * 26, { color: PL.col("text"), size: 10.5 }));
          let s5 = 0; for (let y = yr - 2; y <= yr + 2; y++) s5 += anom(y) * reg.f;
          rY.set(a, 2); r5.set(s5 / 5, 2); rPre.set(anom(yr) + 0.25, 2); rIce.set(Math.round(ice * 100), 0);
          vW.set(anom(yr) + 0.25 > 1.5 ? "已超過 1.5 °C 門檻(相對工業前)" : anom(yr) + 0.25 > 1.0 ? "逼近 1.5 °C 門檻" : "門檻內,但趨勢持續上升",
            anom(yr) + 0.25 > 1.5 ? "bad" : anom(yr) + 0.25 > 1.0 ? "warn" : "ok");
        }
      });
      const yS = PL.ui.slider(ui.L.controls, { label: "年份", min: Y0, max: Y1, step: 1, value: 2025, digits: 0 });
      const regSel = PL.ui.select(ui.L.controls, { label: "區域", value: "globe", options: REG.map(r => ({ value: r.key, label: r.name })) });
      PL.ui.note(ui.L.controls, "每一格是一年的全球均溫異常:1945–1975 的平台(氣溶膠冷卻)之後,1975 年起陡升——近十年是有紀錄以來最暖。切換區域看放大效應:陸地快於海洋,北極最快。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀趨勢,不要讀單年",
        steps: [
          "把年份拉回 1900:條紋偏藍,當年比基準冷。",
          "逐年掃到 2025:藍→紅的轉變集中在最後 50 年。",
          "切換「北極」:同一年的異常被放大約 2.8 倍,海冰跟著縮。"
        ],
        rule: "某一年偏冷不代表暖化停止——看 5 年均與趨勢線;1998、2016 的聖嬰高峰只是年際起伏,改變不了長期方向。"
      });
      PL.ui.presets(ui.L.controls, { label: "跳到", options: [
        { label: "1900 年代初", apply: () => { yS.set(1905); ui.redraw(); } },
        { label: "1998 聖嬰年", apply: () => { yS.set(1998); ui.redraw(); } },
        { label: "2024(最暖)", apply: () => { yS.set(2024); ui.redraw(); } }] });
      const rY = PL.ui.readout(ui.L.readouts, { label: "年異常(所選區域)", unit: "°C" }), r5 = PL.ui.readout(ui.L.readouts, { label: "五年均異常", unit: "°C" });
      const rPre = PL.ui.readout(ui.L.readouts, { label: "相對工業前(全球)", unit: "°C" }), rIce = PL.ui.readout(ui.L.readouts, { label: "海冰殘存", unit: "%" });
      const vW = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("全球均溫異常(相對工業前)", "黑虛線=1.5 °C 門檻。注意 1945–1975 的平台與 1975 後的陡升——趨勢轉折比年際起伏更該看;切換區域會整條縮放。");
      const drawChart = () => {
        const f = (REG.find(r => r.key === regSel.get()) || REG[0]).f, yr = Math.round(yS.get());
        const pts = [], run = [];
        for (let y = Y0; y <= Y1; y++) {
          pts.push([y, anom(y) * f + 0.25]);
          let s = 0; for (let q = y - 2; q <= y + 2; q++) s += anom(q);
          run.push([y, s / 5 * f + 0.25]);
        }
        const y1 = Math.max(2.6, run[run.length - 1][1] + 0.5);
        CK.plot(chart, {
          x0: Y0, x1: Y1, y0: -0.6, y1, xlabel: "年", ylabel: "相對工業前 (°C)",
          series: [{ pts, color: PL.col("text-faint"), width: 1.4 }, { pts: run, color: PL.col("accent"), width: 2.4 }],
          marks: [{ hline: 1.5, color: "#c0392b", dash: [4, 4] }, { dot: [yr, anom(yr) * f + 0.25], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 海水面上升的兩大來源 */
  PL.register("sea-level-rise", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const dT = dTS.get(), gt = iceS.get();
          const rT = 1.3 * dT, rI = gt / 360, rAll = rT + rI;           // mm/年
          // 海盆
          const bx = W * 0.05, bw = W * 0.46, by = H * 0.16, bh = H * 0.70;
          D.rect(ctx, bx, by, bw, bh, { fill: "rgba(30,95,168,0.14)", stroke: PL.col("border"), r: 6 });
          const base = by + bh * 0.32;                                   // 1993 基準面
          const lift = clamp(rAll / 9, 0, 1) * H * 0.10;
          const surf = base - lift;
          D.rect(ctx, bx, surf, bw, by + bh - surf, { fill: "rgba(30,95,168,0.42)" });
          D.line(ctx, bx, base, bx + bw, base, "#e8d44d", 1.6, [5, 4]);
          D.text(ctx, "1993 基準面", bx + bw - 6, base + 14, { color: PL.col("text-dim"), size: 10, align: "right" });
          D.arrow(ctx, bx + bw * 0.88, base, bx + bw * 0.88, surf, { color: PL.col("accent-2"), width: 2, label: "+" + rAll.toFixed(1) + " mm/年" });
          // 熱膨脹層:受熱增厚
          D.rect(ctx, bx, surf, bw, H * 0.05 + dT * H * 0.012, { fill: "rgba(239,136,41," + (0.10 + dT * 0.09).toFixed(3) + ")" });
          D.text(ctx, "熱膨脹層(受熱變「胖」)", bx + 8, surf + 14, { color: "#fff", size: 9.5 });
          // 陸冰:冰河隨損耗縮小,融水入海
          const gl = 1 - clamp(gt / 1600, 0, 0.85), gh = (0.4 + gl * 0.6) * H * 0.10;
          ctx.save();
          ctx.fillStyle = "#c8e4f6";
          ctx.beginPath();
          ctx.moveTo(bx + bw * 0.10, surf); ctx.lineTo(bx + bw * 0.10 + bw * 0.20 * gl, surf);
          ctx.lineTo(bx + bw * 0.10 + bw * 0.16 * gl, surf - gh); ctx.lineTo(bx + bw * 0.12, surf - gh * 0.85);
          ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(90,130,160,0.8)"; ctx.lineWidth = 1.2; ctx.stroke();
          ctx.restore();
          D.text(ctx, "冰川/冰蓋", bx + bw * 0.10, surf - gh - 6, { color: PL.col("text-dim"), size: 10 });
          CK.arrow(ctx, bx + bw * 0.32, surf - H * 0.035, bx + bw * 0.42, surf + H * 0.008, "#7fc4e8", "融水 +" + rI.toFixed(2));
          // 右側卡:兩大來源
          CK.panel(ctx, W * 0.56, H * 0.16, W * 0.40, H * 0.64, "兩大來源(目前設定)");
          [["熱膨脹", rT.toFixed(2) + " mm/年", rT / rAll, "#ef8829"], ["陸冰融化", rI.toFixed(2) + " mm/年", rI / rAll, "#7fc4e8"]].forEach(([k, v, f, cc], i) => {
            const y = H * 0.27 + i * 64;
            D.text(ctx, k, W * 0.58, y, { color: PL.col("text"), size: 11, weight: "700" });
            D.text(ctx, v, W * 0.94, y, { color: PL.col("accent"), size: 11.5, align: "right" });
            CK.meter(ctx, W * 0.58, y + 12, W * 0.34, 10, f, { color: cc, label: "占比 " + Math.round(f * 100) + "%" });
          });
          [["總速率", rAll.toFixed(2) + " mm/年"], ["1993–2025 累計", (rAll * 2.86).toFixed(1) + " cm"], ["維持到 2100 累計", (rAll * 7.7).toFixed(0) + " cm"]].forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.58, H * 0.52 + i * 28, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.94, H * 0.52 + i * 28, { color: i === 2 ? PL.col("accent") : PL.col("text"), size: 11, align: "right" });
          });
          rTot.set(rAll, 2); rTh.set(rT, 2); rMelt.set(rI, 2); r2100.set(rAll * 7.7, 0);
          vS.set(rAll < 3 ? "1990s 速率:約 3 mm/年" : rAll < 6 ? "速率加快:低窪島嶼與三角洲首當其衝" : "快速上升:百年內可能逾半公尺",
            rAll < 3 ? "info" : rAll < 6 ? "warn" : "bad");
        }
      });
      const dTS = PL.ui.slider(ui.L.controls, { label: "全球升溫", min: 0.5, max: 4, step: 0.1, value: 1.2, unit: "°C", digits: 1 });
      const iceS = PL.ui.slider(ui.L.controls, { label: "陸冰損耗", min: 200, max: 1600, step: 50, value: 1050, unit: "Gt/年", digits: 0 });
      PL.ui.note(ui.L.controls, "海水受熱體積變大(熱膨脹)、陸地冰融化直接加水,兩者各占約一半。衛星測高顯示 1993 年起每年約 3 mm,近年已接近 4.5 mm——速率還在加快。");
      PL.ui.procedure(ui.L.controls, {
        title: "分離兩個來源",
        steps: [
          "只拉「全球升溫」:熱膨脹層增厚、占比條右移——看不見但量很大。",
          "只拉「陸冰損耗」:冰河縮小、融水箭頭變粗,水面直接抬升。",
          "讀累計:維持現今速率到 2100,約再上升 30–35 cm。"
        ],
        rule: "熱膨脹「只升不降」:即使碳排放今天停住,海洋已吸收的熱仍會讓海面持續上升數百年;融冰則可能跨過不可逆的臨界點。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "1993 年觀測", apply: () => { dTS.set(0.6); iceS.set(650); ui.redraw(); } },
        { label: "現今衛星測高", apply: () => { dTS.set(1.2); iceS.set(1050); ui.redraw(); } },
        { label: "2100 高排放", apply: () => { dTS.set(3.5); iceS.set(1450); ui.redraw(); } }] });
      const rTot = PL.ui.readout(ui.L.readouts, { label: "總上升速率", unit: "mm/年" }), rTh = PL.ui.readout(ui.L.readouts, { label: "熱膨脹貢獻", unit: "mm/年" });
      const rMelt = PL.ui.readout(ui.L.readouts, { label: "融冰貢獻", unit: "mm/年" }), r2100 = PL.ui.readout(ui.L.readouts, { label: "至 2100 累計", unit: "cm" });
      const vS = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("海面高度路徑(相對 1993)", "藍點=2025 年位置。直線只代表「維持目前速率」;實際上速率仍在增加,路徑只會更陡。");
      const drawChart = () => {
        const rAll = 1.3 * dTS.get() + iceS.get() / 360;
        CK.plot(chart, {
          x0: 1993, x1: 2100, y0: -2, y1: rAll * 7.7 * 1.2, xlabel: "年", ylabel: "相對 1993 (cm)",
          series: [{ fn: y => { const tt = y - 1993; return rAll * tt * (0.85 + 0.15 * tt / 107) / 10; }, color: PL.col("accent") }],
          marks: [{ hline: 0, color: PL.col("text-faint"), dash: [4, 4] }, { dot: [2025, rAll * 32 * 0.895 / 10], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 減緩與調適策略 */
  PL.register("climate-adaptation", {
    build(root) {
      const dTof = m => 1.5 + 2.8 * Math.pow(1 - m, 0.8);   // 減緩力道 m(0–1)→ 2100 升溫
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const m = mitS.get() / 100, ad = adS.get() / 100;
          const dT = dTof(m), sl = 28 + 10 * dT;             // 2100:升溫、海面上升 cm
          const risk = dT / 4.3 * (1 - ad) * 100;             // 風險 = 危害×暴露×脆弱度
          D.line(ctx, W * 0.52, H * 0.06, W * 0.52, H * 0.92, PL.col("border"), 1.4);
          // 左:減緩——從源頭降排放
          D.text(ctx, "減緩:從源頭降排放", W * 0.26, H * 0.08, { color: PL.col("accent"), size: 12, align: "center", weight: "700" });
          const nSmoke = Math.round((1 - m) * 6) + 1;
          D.rect(ctx, W * 0.30, H * 0.70, W * 0.14, H * 0.14, { fill: PL.theme.isLight() ? "#8d97a6" : "#5d6672", r: 3 });
          D.rect(ctx, W * 0.39, H * 0.54, W * 0.03, H * 0.16, { fill: PL.theme.isLight() ? "#8d97a6" : "#5d6672", r: 2 });
          for (let i = 0; i < nSmoke; i++)
            D.disc(ctx, W * 0.405 + Math.sin(i * 1.7) * W * (0.008 + i * 0.006), H * 0.52 - i * H * 0.052, 4 + i * 1.5 + (1 - m) * 4, { fill: "rgba(130,130,140,0.7)" });
          D.text(ctx, "排放削減 " + Math.round(m * 100) + "%", W * 0.37, H * 0.88, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          const thX = W * 0.12, thY = H * 0.16, thH = H * 0.34, fT = dT / 4.3;
          D.rect(ctx, thX, thY, W * 0.028, thH, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), r: W * 0.014 });
          D.rect(ctx, thX + 2, thY + thH * (1 - fT), W * 0.028 - 4, thH * fT, { fill: CK.tempColor(fT), r: (W * 0.028 - 4) / 2 });
          D.disc(ctx, thX + W * 0.014, thY + thH, W * 0.024, { fill: CK.tempColor(fT) });
          D.text(ctx, "2100 升溫 " + dT.toFixed(1) + " °C", thX + W * 0.05, thY + 4, { color: PL.col("text"), size: 10.5 });
          // 風險公式卡
          CK.panel(ctx, W * 0.05, H * 0.56, W * 0.30, H * 0.30, "風險 = 危害 × 暴露 × 脆弱度");
          [["危害(升溫比例)", (dT / 4.3).toFixed(2)], ["脆弱度(1−調適)", (1 - ad).toFixed(2)], ["剩餘風險", risk.toFixed(0) + "%"]].forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.065, H * 0.64 + i * 28, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.33, H * 0.64 + i * 28, { color: i === 2 ? (risk > 50 ? "#e57373" : risk > 20 ? "#e8c34d" : "#8bc48a") : PL.col("text"), size: 11.5, align: "right" });
          });
          // 右:調適——海堤守住海岸城市
          D.text(ctx, "調適:把傷害降到最小", W * 0.76, H * 0.08, { color: PL.col("accent-2"), size: 12, align: "center", weight: "700" });
          const gy = H * 0.78, wl = clamp((sl - 20) / 60, 0, 1), waterTop = gy - wl * H * 0.22;
          D.rect(ctx, W * 0.56, waterTop, W * 0.40, gy - waterTop, { fill: "rgba(30,95,168,0.45)" });
          D.text(ctx, "海面 +" + sl.toFixed(0) + " cm", W * 0.94, waterTop + 14, { color: "#fff", size: 10, align: "right" });
          const wallH = ad * H * 0.20;
          D.rect(ctx, W * 0.60, waterTop - wallH, W * 0.045, wallH + 4, { fill: PL.theme.isLight() ? "#5d6672" : "#414a55", r: 2 });
          D.text(ctx, "海堤 " + Math.round(ad * 100) + "%", W * 0.622, waterTop - wallH - 8, { color: PL.col("text-dim"), size: 10, align: "center" });
          [W * 0.70, W * 0.80, W * 0.88].forEach(hx => {
            D.rect(ctx, hx, gy - H * 0.14, W * 0.06, H * 0.14, { fill: "#c9a06a", r: 2 });
            ctx.save(); ctx.fillStyle = "#8a5a3a";
            ctx.beginPath(); ctx.moveTo(hx - W * 0.006, gy - H * 0.14); ctx.lineTo(hx + W * 0.03, gy - H * 0.19); ctx.lineTo(hx + W * 0.066, gy - H * 0.14);
            ctx.closePath(); ctx.fill(); ctx.restore();
          });
          if (waterTop < gy - H * 0.055 && wallH < gy - waterTop - H * 0.055) CK.badge(ctx, W * 0.76, H * 0.56, "低窪區淹水!", "#c0392b");
          rT.set(dT, 1); rSL.set(sl, 0); rR.set(risk, 0); rE.set(m * 100, 0);
          vA.set(risk < 20 ? "風險可控:減緩止住根、調適守住底" : risk < 50 ? "仍有明顯風險:調適要跟上暖化腳步" : "高風險:減緩不足,調適也補不回來",
            risk < 20 ? "ok" : risk < 50 ? "warn" : "bad");
        }
      });
      const mitS = PL.ui.slider(ui.L.controls, { label: "減緩力道", min: 0, max: 100, step: 5, value: 40, unit: "%", digits: 0 });
      const adS = PL.ui.slider(ui.L.controls, { label: "調適力道", min: 0, max: 100, step: 5, value: 40, unit: "%", digits: 0 });
      PL.ui.note(ui.L.controls, "減緩與調適不可互換:減緩在全球(每噸減排效果一樣),調適在在地(海堤只護本地)。只做調適,危害照樣增大;只做減緩,已鎖定的暖化仍會發生。");
      PL.ui.procedure(ui.L.controls, {
        title: "配一組政策",
        steps: [
          "兩個滑桿都歸零(無作為):升溫 4.3 °C、風險 100%。",
          "只拉滿調適:風險降一半,但升溫不變——傷害變小、根源沒解。",
          "拉高減緩再補調適:剩餘風險才能壓到 20% 以下。"
        ],
        rule: "減緩有幾十年的氣候延遲,調適立即見效——「越早減緩、越省調適」。風險公式裡,暴露與脆弱度是人為可控的兩個因子。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "無作為", apply: () => { mitS.set(0); adS.set(0); ui.redraw(); } },
        { label: "只減緩", apply: () => { mitS.set(80); adS.set(20); ui.redraw(); } },
        { label: "只調適", apply: () => { mitS.set(20); adS.set(80); ui.redraw(); } },
        { label: "雙管齊下", apply: () => { mitS.set(70); adS.set(70); ui.redraw(); } }] });
      const rT = PL.ui.readout(ui.L.readouts, { label: "2100 升溫", unit: "°C" }), rSL = PL.ui.readout(ui.L.readouts, { label: "海面上升", unit: "cm" });
      const rR = PL.ui.readout(ui.L.readouts, { label: "剩餘風險", unit: "%" }), rE = PL.ui.readout(ui.L.readouts, { label: "排放削減", unit: "%" });
      const vA = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("2100 升溫路徑", "依目前減緩力道外推的升溫路徑;黃虛線=巴黎協定 1.5 °C、紅虛線=2.0 °C——減緩拉得越高,路徑終點越低。");
      const drawChart = () => {
        const dT = dTof(mitS.get() / 100);
        CK.plot(chart, {
          x0: 2020, x1: 2100, y0: 0.8, y1: 4.8, xlabel: "年", ylabel: "相對工業前 (°C)",
          series: [{ fn: y => 1.2 + (dT - 1.2) * (y - 2020) / 80, color: PL.col("accent") }],
          marks: [{ hline: 1.5, color: "#b98a2c", dash: [4, 4] }, { hline: 2.0, color: "#c0392b", dash: [4, 4] },
                  { dot: [2100, dT], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });
})();
