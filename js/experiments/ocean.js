/* 模組八 · 海洋 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 海水鹽度與組成 */
  PL.register("seawater-composition", {
    build(root) {
      const IONS = [
        { n: "Cl⁻", p: 55.0, c: "#7fd4ff" },
        { n: "Na⁺", p: 30.6, c: "#ffd54f" },
        { n: "SO₄²⁻", p: 7.7, c: "#a5d6a7" },
        { n: "Mg²⁺", p: 3.7, c: "#ce93d8" },
        { n: "Ca²⁺", p: 1.2, c: "#ffab91" },
        { n: "K⁺", p: 1.1, c: "#90caf9" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const evap = evapS.get(), river = riverS.get();
          const S = 35 * 350 / (350 + (river - evap) * 12);            // 鹽度收支模型
          // 左:一槽海水,鹽粒數量隨鹽度增減
          const bx = W * 0.04, by = H * 0.22, bw = W * 0.40, bh = H * 0.56;
          D.rect(ctx, bx, by, bw, bh, { fill: PL.theme.isLight() ? "rgba(74,163,216,0.30)" : "rgba(27,77,112,0.45)", stroke: PL.col("border"), width: 1.5, r: 10 });
          for (let i = 0; i < Math.round(S * 1.5); i++) { const a = i * 2.39996, rr = Math.sqrt((i + 0.5) / 75) * bw * 0.46; D.disc(ctx, bx + bw / 2 + Math.cos(a) * rr, by + bh * 0.55 + Math.sin(a) * rr * 0.66, 3, { fill: "#ffe082" }); }
          CK.meter(ctx, bx + 4, by + bh + 14, bw - 8, 10, S / 50, { color: "#4fc3f7", label: "鹽度比例(大洋平均 35‰ = 0.7)" });
          if (evap > 0.2) for (let i = 0; i < 3; i++) D.arrow(ctx, bx + bw * (0.22 + i * 0.24), by - 12, bx + bw * (0.22 + i * 0.24), by - 26 - evap * 3.2, { color: "#ef8829", width: 2.2, label: i === 1 ? "蒸發" : "" });
          if (river > 0.2) D.arrow(ctx, bx - 34, by + 20, bx + 14 + river * 3.4, by + 20, { color: "#a5d6a7", width: 2.2 + river * 0.35, label: "河水注入" });
          // 右:主要離子組成(恆定比)
          CK.panel(ctx, W * 0.52, H * 0.12, W * 0.44, H * 0.68, "主要離子組成(全球海洋近乎恆定)");
          IONS.forEach((ion, i) => {
            const y = H * 0.24 + i * H * 0.092;
            D.text(ctx, ion.n, W * 0.545, y, { color: PL.col("text-dim"), size: 10.5 });
            CK.meter(ctx, W * 0.615, y - 5, W * 0.22, 9, ion.p / 55, { color: ion.c });
            D.text(ctx, ion.p.toFixed(1) + "%", W * 0.945, y, { color: PL.col("text"), size: 10.5, align: "right" });
          });
          D.text(ctx, "Cl⁻ : Na⁺ ≈ 1.8 : 1——不論紅海還是河口,主要離子比例都一樣(恆定比)", W * 0.74, H * 0.76, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rS.set(S, 1); rTf.set(-0.054 * S, 2); rD.set(1 + 0.00078 * S, 4); rBal.set(river - evap, 1);
          vDrink.set(S >= 25 ? "鹽度 " + PL.fmt(S, 1) + "‰,遠超人體能負荷的濃度——不可飲用" : "淡鹽水(河口型):仍不宜直接飲用", S >= 25 ? "bad" : "warn");
        }
      });
      const evapS = PL.ui.slider(ui.L.controls, { label: "蒸發量", min: 0, max: 8, step: 0.2, value: 2.4, unit: "mm/天", digits: 1 });
      const riverS = PL.ui.slider(ui.L.controls, { label: "河水注入", min: 0, max: 8, step: 0.2, value: 2.4, unit: "mm/天", digits: 1 });
      PL.ui.note(ui.L.controls, "鹽度是海水中溶解鹽類的千分比。蒸發帶走純水、河水稀釋鹽分:收支相抵時維持約 35‰。各海域鹽度有差,但主要離子之間的比例幾乎不變。");
      PL.ui.procedure(ui.L.controls, {
        title: "模擬紅海與河口",
        steps: [
          "蒸發與河水都設 2.4:收支平衡,鹽度停在 35‰。",
          "蒸發拉滿、河水歸零:鹽度衝上 45‰——紅海這種副熱帶強蒸發、少注入的海域就是高鹽。",
          "反過來把河水拉滿:鹽度跌破 30‰,河口是明顯的淡鹽水環境。"
        ],
        rule: "鹽度變化只改變鹽的「總量」;離子間的比例(恆定比)不跟著變——所以測出一種離子,就能按比例推算全部。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "大洋平均", apply: () => { evapS.set(2.4); riverS.set(2.4); ui.redraw(); drawChart(); } },
        { label: "紅海(強蒸發)", apply: () => { evapS.set(8); riverS.set(0.2); ui.redraw(); drawChart(); } },
        { label: "河口(多河水)", apply: () => { evapS.set(1); riverS.set(8); ui.redraw(); drawChart(); } }
      ] });
      const rS = PL.ui.readout(ui.L.readouts, { label: "鹽度", unit: "‰" }), rTf = PL.ui.readout(ui.L.readouts, { label: "冰點", unit: "°C" });
      const rD = PL.ui.readout(ui.L.readouts, { label: "密度", unit: "g/cm³" }), rBal = PL.ui.readout(ui.L.readouts, { label: "淨水量收支", unit: "mm/天" });
      const vDrink = PL.ui.verdict(ui.L.readouts, { label: "可否飲用" });
      const chart = ui.chart("冰點隨鹽度下降", "鹽度越高冰點越低:35‰ 的海水約 −1.9 °C 才結冰;結成的海冰幾乎不含鹽——鹽被排到下方的滷水裡,剩下的反而更鹹、更重。");
      function drawChart() {
        if (chart.W < 60) return;
        const S = 35 * 350 / (350 + (riverS.get() - evapS.get()) * 12);
        CK.plot(chart, {
          x0: 0, x1: 50, y0: -3.2, y1: 0.4, xlabel: "鹽度 (‰)", ylabel: "冰點 (°C)",
          series: [{ fn: x => -0.054 * x, color: PL.col("accent") }],
          marks: [{ vline: 35, color: "#4fc3f7", dash: [5, 4], label: "大洋平均" }, { dot: [S, -0.054 * S], color: PL.col("accent-2") }]
        });
      }
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 海洋分層與溫躍層 */
  PL.register("ocean-layers", {
    build(root) {
      const ZONES = [
        { key: "tropic", name: "熱帶海域", mix: 60, td: 4 },
        { key: "subtrop", name: "副熱帶海域", mix: 120, td: 3 },
        { key: "polar", name: "極區海域", mix: 30, td: 0.5 }
      ];
      const tempAt = (z, ts, zn) => zn.td + (ts - zn.td) * (z < zn.mix ? 1 : Math.exp(-(z - zn.mix) / 320));
      const densAt = temp => 1028 - 0.25 * temp;                     // 教學簡化(kg/m³)
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ts = surfS.get();
          const zn = ZONES.find(z => z.key === zoneSel.get()) || ZONES[1];
          const bx = W * 0.06, by = H * 0.18, bw = W * 0.38, bh = H * 0.64, yOf = z => by + z / 4000 * bh;
          for (let i = 0; i < 26; i++) D.rect(ctx, bx, yOf(i / 26 * 4000), bw, bh / 26 + 0.6, { fill: CK.tempColor(tempAt(i / 26 * 4000 + 75, ts, zn) / 32) });
          D.line(ctx, bx, by, bx + bw, by, "rgba(255,255,255,0.7)", 1.6);
          // 溫躍層標帶
          const t0 = yOf(zn.mix), t1 = yOf(zn.mix + 900);
          D.rect(ctx, bx, t0, bw, t1 - t0, { fill: "rgba(239,136,41,0.15)" });
          [t0, t1].forEach(y => D.line(ctx, bx, y, bx + bw, y, "#ef8829", 1.6, [6, 4]));
          D.text(ctx, "溫躍層(密度關卡)", bx + 8, (t0 + t1) / 2 + 4, { color: "#ef8829", size: 11, weight: "700" });
          if (lightChk.get()) { D.line(ctx, bx, yOf(200), bx + bw, yOf(200), "#66bb6a", 1.4, [4, 5]); D.text(ctx, "光合作用帶下限 200 m", bx + 8, yOf(200) + 12, { color: "#66bb6a", size: 9.5 }); }
          for (let i = 0; i < 3; i++) D.arrow(ctx, bx + bw * (0.2 + i * 0.28), by - 14, bx + bw * (0.2 + i * 0.28), by - 2, { color: "#ffe082", width: 2.4 });
          D.text(ctx, zn.name + "・表層 " + PL.fmt(ts, 1) + " °C", bx + 8, by - 20, { color: PL.col("text-dim"), size: 11, weight: "700" });
          // 溫度尺:游標跟著表層水溫
          const gx = bx + bw + 16, gy = by + 6, gh = bh - 12;
          for (let k = 0; k <= 30; k += 6) { const y = gy + gh * (1 - k / 30); D.line(ctx, gx, y, gx + 6, y, PL.col("border"), 1); D.text(ctx, k + "°", gx + 9, y + 3, { color: PL.col("text-faint"), size: 8.5 }); }
          D.arrow(ctx, gx + 34, gy + gh * (1 - ts / 30), gx + 8, gy + gh * (1 - ts / 30), { color: PL.col("accent-2"), width: 2 });
          // 右側對照卡
          CK.panel(ctx, W * 0.60, H * 0.14, W * 0.36, H * 0.56, "各層溫度與密度");
          const rows = [["表層 0 m", tempAt(0, ts, zn)], ["溫躍層底 " + (zn.mix + 900) + " m", tempAt(zn.mix + 900, ts, zn)], ["深層 4000 m", zn.td]];
          rows.forEach((rw, i) => {
            const y = H * 0.26 + i * 46;
            D.text(ctx, rw[0], W * 0.63, y, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, PL.fmt(rw[1], 1) + " °C / " + PL.fmt(densAt(rw[1]), 1) + " kg/m³", W * 0.93, y + 15, { color: PL.col("text"), size: 10.5, align: "right" });
          });
          D.text(ctx, "表層暖而輕、深層冷而重:垂直交換幾乎停擺", W * 0.78, H * 0.63, { color: PL.col("text-faint"), size: 10, align: "center" });
          rTs.set(ts, 1); rTd.set(zn.td, 1); rGap.set(ts - zn.td, 1); rDr.set(0.25 * (ts - zn.td), 1);
          vSt.set(ts - zn.td > 12 ? "分層很穩定:深層水像被封在保溫瓶裡" : "分層較弱:垂直混合相對容易", ts - zn.td > 12 ? "ok" : "info");
        }
      });
      const surfS = PL.ui.slider(ui.L.controls, { label: "表層水溫", min: 0, max: 30, step: 0.5, value: 26, unit: "°C", digits: 1 });
      const zoneSel = PL.ui.select(ui.L.controls, { label: "海域型態", value: "subtrop", options: ZONES.map(z => ({ value: z.key, label: z.name })) });
      const lightChk = PL.ui.checkbox(ui.L.controls, { label: "顯示光合作用帶(200 m)", checked: true });
      PL.ui.note(ui.L.controls, "海水依密度分層:陽光只加熱表層,數百公尺內溫度驟降(溫躍層),深層接近 0–4 °C。上輕下重的結構穩定,深層水一旦形成,要繞全球一圈才會再上來。");
      PL.ui.procedure(ui.L.controls, {
        title: "找到溫躍層",
        steps: [
          "從副熱帶開始:表層 26 °C,往下在數百公尺內掉到個位數——那條橙色帶就是溫躍層。",
          "把表層水溫拉高、再拉低:溫躍層的「溫差」跟著變,但位置由海域型態決定。",
          "切到極區:表層已經很冷,溫躍層幾乎消失——這正是深水可以形成的條件。"
        ],
        rule: "冷不一定重:海水密度同時受溫度與鹽度控制;高緯表層「冷加上結冰排鹽變鹹」才是深水下沉的關鍵。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "熱帶", apply: () => { surfS.set(29); zoneSel.set("tropic"); ui.redraw(); drawChart(); } },
        { label: "副熱帶", apply: () => { surfS.set(24); zoneSel.set("subtrop"); ui.redraw(); drawChart(); } },
        { label: "極區", apply: () => { surfS.set(4); zoneSel.set("polar"); ui.redraw(); drawChart(); } }
      ] });
      const rTs = PL.ui.readout(ui.L.readouts, { label: "表層水溫", unit: "°C" }), rTd = PL.ui.readout(ui.L.readouts, { label: "深層水溫", unit: "°C" });
      const rGap = PL.ui.readout(ui.L.readouts, { label: "溫躍層溫差", unit: "°C" }), rDr = PL.ui.readout(ui.L.readouts, { label: "表深密度差", unit: "kg/m³" });
      const vSt = PL.ui.verdict(ui.L.readouts, { label: "分層穩定度" });
      const chart = ui.chart("溫度–深度剖面", "縱軸是深度(向下增加):曲線在溫躍層轉陡,像一道關卡把暖表層與冷深層隔開;混合層內溫度幾乎不變。");
      function drawChart() {
        if (chart.W < 60) return;
        const ts = surfS.get(), zn = ZONES.find(z => z.key === zoneSel.get()) || ZONES[1];
        const pts = [];
        for (let z = 0; z <= 4000; z += 100) pts.push([tempAt(z, ts, zn), z]);
        CK.plot(chart, {
          x0: 0, x1: 32, y0: 4000, y1: 0, xlabel: "溫度 (°C)", ylabel: "深度 (m)",
          series: [{ pts, color: PL.col("accent"), width: 2.4 }],
          marks: [{ hline: zn.mix, color: "#ef8829", dash: [5, 4] }, { dot: [tempAt(zn.mix, ts, zn), zn.mix], color: PL.col("accent-2") }]
        });
      }
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 表層洋流與環流 */
  PL.register("surface-currents", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const trade = tradeS.get(), cw = hemiSel.get() === "north";
          const cx = W * 0.33, cy = H * 0.48, R = Math.min(W * 0.25, H * 0.29);
          D.rect(ctx, W * 0.03, H * 0.14, W * 0.60, H * 0.70, { fill: PL.theme.isLight() ? "rgba(74,163,216,0.30)" : "rgba(27,77,112,0.45)", stroke: PL.col("border"), width: 1.5, r: 12 });
          // 副熱帶環流:西側強而窄、東側緩而寬
          const k = 0.55 + trade * 0.085;
          const segs = [
            { a: 2.45, sw: 1.5, w: (2.4 + trade * 0.36), c: "#ff9e80", n: cw ? "黑潮・灣流(暖)" : "東澳流・巴西流(暖)" },
            { a: -2.35, sw: 1.3, w: 2.3 * k, c: "#b3e5fc", n: "西風漂流" },
            { a: -0.55, sw: 1.3, w: 1.6 * k, c: "#81d4fa", n: cw ? "加利福尼亞流(冷)" : "祕魯流・本格拉流(冷)" },
            { a: 0.95, sw: 1.4, w: 2.1 * k, c: "#b3e5fc", n: cw ? "北赤道洋流(信風驅動)" : "南赤道洋流(信風驅動)" }
          ];
          segs.forEach(s => {
            CK.currentArrow(ctx, cx, cy, R, s.a, cw ? s.sw : -s.sw, { color: s.c, width: s.w });
            const mid = s.a + (cw ? s.sw : -s.sw) / 2;
            D.text(ctx, s.n, cx + Math.cos(mid) * R * 1.24, cy + Math.sin(mid) * R * 1.24 + 3, { color: PL.col("text-dim"), size: 10, align: "center" });
          });
          // 流動光點
          for (let i = 0; i < 7; i++) {
            const th = (cw ? 1 : -1) * (t * (0.25 + trade * 0.1) + i / 7) * TAU;
            D.disc(ctx, cx + Math.cos(th) * R, cy + Math.sin(th) * R, 3.2, { fill: "#fff9c4", glow: "#ffd54f", glowSize: 6 });
          }
          if (cw) {
            D.disc(ctx, cx - R * 0.88, cy - R * 0.52, 6, { fill: "#8fae6f", stroke: "#3c4a30", width: 1.2 });
            D.text(ctx, "台灣", cx - R * 0.88, cy - R * 0.52 - 12, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.arrow(ctx, cx - R * 0.74, cy - R * 0.34, cx - R * 0.74, cy + R * 0.28, { color: "#81d4fa", width: 1.8, dash: [6, 5], label: "中國沿岸流(冬・冷)" });
          }
          CK.legend(ctx, W * 0.05, H * 0.86, [{ color: "#ff9e80", label: "暖流(西側強化)" }, { color: "#81d4fa", label: "冷流(東側緩流)" }], 16);
          CK.panel(ctx, W * 0.67, H * 0.14, W * 0.30, H * 0.56, "西向強化");
          D.text(ctx, "信風＋西風推水,科氏力把水堆向環流西側,流被擠窄加速:", W * 0.82, H * 0.27, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "西側 2–3 節、窄而強;東側約 0.5 節、寬而緩。", W * 0.82, H * 0.37, { color: PL.col("accent"), size: 11, align: "center", weight: "700" });
          rKu.set(1.2 + trade * 0.22, 1); rDir.set(cw ? "順時針(北半球)" : "逆時針(南半球)"); rWe.set((2.4 + trade * 0.36) / (1.6 * k), 1);
          vTk.set(trade < 2.5 ? "信風太弱:環流減速,熱量與鹽的輸送都下降" : "黑潮把赤道熱量送上來:台灣東岸冬季仍有 20 °C 以上", trade < 2.5 ? "warn" : "info");
        }
      });
      const tradeS = PL.ui.slider(ui.L.controls, { label: "信風強度", min: 0, max: 10, step: 0.5, value: 6, digits: 1 });
      const hemiSel = PL.ui.select(ui.L.controls, { label: "示範環流", value: "north", options: [
        { value: "north", label: "北太平洋(順時針)" }, { value: "south", label: "南太平洋(逆時針)" }] });
      PL.ui.note(ui.L.controls, "信風把表層水往西推、西風往東推,科氏力讓水偏轉堆進環流中心——北半球形成順時針副熱帶環流,西側被擠成強而窄的黑潮與灣流。");
      PL.ui.procedure(ui.L.controls, {
        title: "看出西向強化",
        steps: [
          "拉高信風強度:四段邊界流都加速,西側橙色箭頭明顯最粗。",
          "切到南半球:環流反向,西側強流換成東澳流與巴西流。",
          "看台灣旁的虛線:冬季中國沿岸流把冷水帶下來,與黑潮形成強烈對比。"
        ],
        rule: "「西側強、東側弱」不是畫圖習慣,是科氏力隨緯度變化的必然結果;考題問黑潮流向,答案是「沿台灣東岸向北」。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "北太平洋", apply: () => { hemiSel.set("north"); tradeS.set(6); ui.redraw(); } },
        { label: "南太平洋", apply: () => { hemiSel.set("south"); tradeS.set(6); ui.redraw(); } },
        { label: "信風減弱", apply: () => { tradeS.set(1.5); ui.redraw(); } }
      ] });
      const rKu = PL.ui.readout(ui.L.readouts, { label: "西側強流流速", unit: "節" }), rDir = PL.ui.readout(ui.L.readouts, { label: "環流方向" });
      const rWe = PL.ui.readout(ui.L.readouts, { label: "西東流速比", unit: "倍" });
      const vTk = PL.ui.verdict(ui.L.readouts, { label: "氣候效應" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 溫鹽環流:深海輸送帶 */
  PL.register("thermohaline", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cool = coolS.get(), fresh = freshS.get();
          const sink = clamp((cool * 1.3 - fresh * 1.2) / 10, 0, 1);    // 下沉指數
          // 簡化世界帶:左=大西洋、中=南極繞極、右=太平洋印度洋
          D.rect(ctx, W * 0.03, H * 0.20, W * 0.60, H * 0.60, { fill: PL.theme.isLight() ? "rgba(74,163,216,0.22)" : "rgba(27,77,112,0.4)", stroke: PL.col("border"), width: 1.5, r: 12 });
          D.rect(ctx, W * 0.10, H * 0.20, W * 0.16, H * 0.07, { fill: "#8fae6f" });
          D.text(ctx, "北大西洋", W * 0.18, H * 0.205, { color: "#eaf4fb", size: 10, align: "center", weight: "700" });
          D.text(ctx, "南極繞極深水", W * 0.33, H * 0.76, { color: PL.col("text-faint"), size: 10, align: "center" });
          // 下沉區:箭頭長度與下沉強度成正比
          for (let i = 0; i < 3; i++) D.arrow(ctx, W * (0.145 + i * 0.03), H * 0.29, W * (0.145 + i * 0.03), H * 0.29 + 10 + sink * 26, { color: "#5c91dc", width: 2 + sink * 1.6, label: i === 1 ? "高鹽冷水下沉" : "" });
          // 路徑:表面北上→下沉→深水南下→繞極→湧升→表面回流
          const pts = [[W * 0.30, H * 0.33], [W * 0.56, H * 0.40], [W * 0.58, H * 0.66], [W * 0.33, H * 0.70],
            [W * 0.13, H * 0.60], [W * 0.13, H * 0.36], [W * 0.30, H * 0.33]];
          ctx.save(); ctx.strokeStyle = "rgba(92,145,220,0.5)"; ctx.lineWidth = 6; ctx.beginPath();
          pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore();
          const segs = pts.map((p, i) => [p, pts[Math.min(i + 1, pts.length - 1)]]);
          const cum = [0]; segs.forEach((s, i) => cum.push(cum[i] + Math.hypot(s[1][0] - s[0][0], s[1][1] - s[0][1])));
          const tot = cum[cum.length - 1] || 1, spd = 10 + sink * 55;
          for (let k = 0; k < 9; k++) {
            const d = ((t * spd + k * tot / 9) % tot);
            let j = 0; while (j < cum.length - 2 && cum[j + 1] < d) j++;
            const f = (d - cum[j]) / Math.max(1, cum[j + 1] - cum[j]);
            D.disc(ctx, lerp(segs[j][0][0], segs[j][1][0], f), lerp(segs[j][0][1], segs[j][1][1], f), 3, { fill: "#7fd4ff", glow: "#4fc3f7", glowSize: 5 });
          }
          D.arrow(ctx, W * 0.56, H * 0.42, W * 0.56, H * 0.34, { color: "#ffb74d", width: 2.2, label: "太平洋緩慢湧升" });
          D.text(ctx, "深水形成區只剩兩處:北大西洋與南極", W * 0.33, H * 0.16, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          CK.panel(ctx, W * 0.67, H * 0.14, W * 0.30, H * 0.58, "輸送帶量級");
          const rows = [["一圈時間", "約 1,000 年"], ["深水形成區", "北大西洋＋南極"], ["年輕水特徵", "含氧量高"], ["動力來源", "密度差(非風)"]];
          rows.forEach((rw, i) => {
            D.text(ctx, rw[0], W * 0.70, H * 0.25 + i * 40, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, rw[1], W * 0.94, H * 0.25 + i * 40, { color: PL.col("text"), size: 10.5, align: "right" });
          });
          rStr.set(sink * 100, 0); rCyc.set(sink > 0.08 ? Math.round(1000 / sink) : 99999, 0); rEu.set(-(1 - sink) * 8, 1);
          vAm.set(sink >= 0.7 ? "輸送帶全速運轉:熱與碳被送進深層" : sink >= 0.35 ? "明顯減弱:西北歐冬季將變冷數度" : "近乎關閉:區域氣候大幅改變", sink >= 0.7 ? "ok" : sink >= 0.35 ? "warn" : "bad");
        }
      });
      const coolS = PL.ui.slider(ui.L.controls, { label: "高緯表層冷卻", min: 0, max: 10, step: 0.5, value: 7, digits: 1 });
      const freshS = PL.ui.slider(ui.L.controls, { label: "融冰淡水注入", min: 0, max: 10, step: 0.5, value: 1, digits: 1 });
      PL.ui.note(ui.L.controls, "北大西洋表層水被冷卻、又因結冰排鹽而變鹹,變重下沉——這顆「深海馬達」推動溫鹽環流,千年繞地球一圈,把熱量與碳送進深層。");
      PL.ui.procedure(ui.L.controls, {
        title: "把輸送帶弄停",
        steps: [
          "預設情境:冷卻 7、淡水 1,下沉強勁,藍色深水沿路徑繞行。",
          "保持冷卻、把淡水拉到 6:表層被稀釋變輕,下沉箭頭縮短甚至消失。",
          "讀西北歐氣溫變化:輸送帶減弱的代價是區域降溫 5–8 °C。"
        ],
        rule: "溫鹽環流的動力是「密度差」而不是風:溫度降、鹽度升都讓海水變重下沉;融冰淡水稀釋鹽度,是它最怕的干擾。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "正常運轉", apply: () => { coolS.set(7); freshS.set(1); ui.redraw(); drawChart(); } },
        { label: "融冰增強", apply: () => { coolS.set(5); freshS.set(6); ui.redraw(); drawChart(); } },
        { label: "冰期急凍", apply: () => { coolS.set(9); freshS.set(0); ui.redraw(); drawChart(); } }
      ] });
      const rStr = PL.ui.readout(ui.L.readouts, { label: "環流強度", unit: "%" }), rCyc = PL.ui.readout(ui.L.readouts, { label: "一圈時間", unit: "年" });
      const rEu = PL.ui.readout(ui.L.readouts, { label: "西北歐冬季變化", unit: "°C" });
      const vAm = PL.ui.verdict(ui.L.readouts, { label: "輸送帶狀態" });
      const chart = ui.chart("淡水注入 vs 環流強度", "橫軸是融冰淡水量:過了臨界點,表層太輕、深水停止形成,強度斷崖式掉到 0——氣候系統的「翻轉點」就長這樣。");
      function drawChart() {
        if (chart.W < 60) return;
        const cool = coolS.get(), fresh = freshS.get();
        const pts = [];
        for (let f = 0; f <= 10; f += 0.25) pts.push([f, clamp((cool * 1.3 - f * 1.2) / 10, 0, 1) * 100]);
        CK.plot(chart, {
          x0: 0, x1: 10, y0: 0, y1: 110, xlabel: "融冰淡水注入", ylabel: "環流強度 (%)",
          series: [{ pts, color: PL.col("accent"), width: 2.4 }],
          marks: [{ dot: [fresh, clamp((cool * 1.3 - fresh * 1.2) / 10, 0, 1) * 100], color: PL.col("accent-2") }]
        });
      }
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 湧升流與漁場 */
  PL.register("upwelling", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const wind = windS.get(), off = dirSel.get() === "off";
          const up = off ? wind * 0.6 : -wind * 0.3;                   // 湧升速率(m/天)
          const nut = clamp(2 + Math.max(0, up) * 3.2, 2, 22);
          const fish = clamp(up * 14, 3, 110);
          // 海岸與海底
          const surf = H * 0.26;
          D.rect(ctx, 0, 0, W * 0.12, surf, { fill: "#8fae6f" });
          D.line(ctx, W * 0.12, surf, W, surf, "rgba(255,255,255,0.7)", 1.8);
          D.text(ctx, "陸地", W * 0.06, surf * 0.55, { color: "#fff", size: 10, align: "center" });
          ctx.save(); ctx.fillStyle = PL.theme.isLight() ? "#8a6f52" : "#54483a"; ctx.beginPath();
          ctx.moveTo(W * 0.12, H * 0.52); ctx.lineTo(W, H * 0.80); ctx.lineTo(W, H); ctx.lineTo(W * 0.12, H); ctx.closePath(); ctx.fill(); ctx.restore();
          D.text(ctx, "深層冷水・營養鹽庫", W * 0.62, H * 0.88, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          // 風
          if (off) D.arrow(ctx, W * 0.16 + 34 + wind * 9, H * 0.12, W * 0.16 + 34, H * 0.12, { color: "#ef8829", width: 2.6, label: "沿岸風(向赤道)" });
          else D.arrow(ctx, W * 0.34, H * 0.09, W * 0.15, H * 0.19, { color: "#ef8829", width: 2.6, label: "向岸風" });
          // 表層漂移
          for (let i = 0; i < 3; i++) {
            const x0 = W * (0.20 + i * 0.14);
            if (off) D.arrow(ctx, x0, surf + 16, x0 + 16 + wind * 5, surf + 16, { color: "#b3e5fc", width: 2 });
            else D.arrow(ctx, x0 + 30, surf + 16, x0 - 10, surf + 16, { color: "#b3e5fc", width: 2 });
          }
          // 湧升(或下沉)
          if (off) for (let i = 0; i < 2; i++) D.arrow(ctx, W * (0.165 + i * 0.07), H * 0.70, W * (0.165 + i * 0.07), H * 0.70 - (14 + wind * 4.2) - i * 6, { color: "#5c91dc", width: 2.4 + wind * 0.2, label: i === 0 ? "湧升流" : "" });
          else D.arrow(ctx, W * 0.18, surf + 6, W * 0.18, surf + 40 + wind * 3, { color: "#5c91dc", width: 2.4, label: "下沉流" });
          // 營養鹽粒上湧
          if (off && up > 0.4) for (let i = 0; i < 9; i++) { const f = ((t * (0.05 + wind * 0.012) + i * 0.11) % 1); D.disc(ctx, W * (0.15 + (i % 3) * 0.05) + Math.sin(t * 2 + i) * 3, H * 0.72 - f * H * 0.42, 2.6, { fill: "rgba(165,214,167,0.9)" }); }
          // 浮游植物與魚群
          const nPh = Math.round(nut / 2.5);
          for (let i = 0; i < nPh; i++) D.disc(ctx, W * (0.16 + (i * 0.062) % 0.72), surf + 8 + (i % 3) * 7, 2.4, { fill: "#66bb6a", glow: "#66bb6a", glowSize: 4 });
          for (let i = 0; i < Math.round(fish / 12); i++) D.text(ctx, "▶", W * (0.22 + (i * 0.09) % 0.6), surf + 34 + (i % 2) * 10, { color: "#ffb74d", size: 11 });
          CK.legend(ctx, W * 0.05, H * 0.955, [{ color: "#a5d6a7", label: "營養鹽" }, { color: "#66bb6a", label: "浮游植物" }, { color: "#ffb74d", label: "魚群" }], 0);
          rUp.set(up, 1); rNut.set(nut, 1); rFish.set(Math.round(fish), 0);
          vUp.set(!off ? "向岸風造成下沉流:表層堆聚、生產力低" : up < 1.2 ? "風停了——聖嬰年正是如此,漁獲銳減" : "湧升流全開:世界級漁場的條件", !off ? "info" : up < 1.2 ? "bad" : "ok");
        }
      });
      const windS = PL.ui.slider(ui.L.controls, { label: "風速", min: 0, max: 10, step: 0.5, value: 7, digits: 1 });
      const dirSel = PL.ui.select(ui.L.controls, { label: "風向型態", value: "off", options: [
        { value: "off", label: "沿岸風→表層離岸(祕魯、西北非)" }, { value: "on", label: "向岸風→下沉流" }] });
      PL.ui.note(ui.L.controls, "風把表層水吹離海岸,深層水湧升補位,順手把沉在底部的營養鹽整箱搬上光照層——浮游植物開餐,整條食物鏈跟着爆量。湧升流區占洋面不到 1%,漁獲卻占大宗。");
      PL.ui.procedure(ui.L.controls, {
        title: "接起生產力的鏈條",
        steps: [
          "風速 7:藍色湧升箭頭把營養鹽粒送上表層,綠色浮游植物與魚群跟著增加。",
          "把風速拉到 1:鏈條逐格熄滅——這就是聖嬰年祕魯漁荒的機制。",
          "切到向岸風:水往岸邊堆、往下沉,營養鹽留在了黑暗的深層。"
        ],
        rule: "湧升流區的水溫比周圍低 3–5 °C:「冷水 = 漁場」不矛盾——冷的不是重點,冷背後的營養鹽補給才是。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "祕魯正常", apply: () => { dirSel.set("off"); windS.set(7); ui.redraw(); } },
        { label: "聖嬰年", apply: () => { dirSel.set("off"); windS.set(1); ui.redraw(); } },
        { label: "向岸風", apply: () => { dirSel.set("on"); windS.set(5); ui.redraw(); } }
      ] });
      const rUp = PL.ui.readout(ui.L.readouts, { label: "湧升速率", unit: "m/天" }), rNut = PL.ui.readout(ui.L.readouts, { label: "表層營養鹽", unit: "μM" });
      const rFish = PL.ui.readout(ui.L.readouts, { label: "相對漁獲", unit: "%" });
      const vUp = PL.ui.verdict(ui.L.readouts, { label: "漁場狀態" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 潮汐與月球引力 */
  PL.register("tides", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const day = dayS.get();
          const phi = day / 29.53 * TAU;                               // 月相角(0=朔)
          const f = (1 + Math.cos(2 * phi)) / 2;                       // 大潮因子
          const cx = W * 0.36, cy = H * 0.50, r = H * 0.20, Ro = H * 0.36;
          // 月球軌道與月球
          D.ring(ctx, cx, cy, Ro, "rgba(140,160,180,0.35)", 1, [4, 6]);
          const mx = cx + Math.cos(phi) * Ro, my = cy - Math.sin(phi) * Ro;
          CK.moonPhase(ctx, mx, my, 12, day / 29.53, { label: "月球" });
          // 太陽(潮汐力較弱的一方)
          CK.sunIcon(ctx, W * 0.94, cy, 13, {});
          D.text(ctx, "太陽", W * 0.94, cy + 30, { color: PL.col("text-faint"), size: 10, align: "center" });
          // 太陽潮(較小的凸起)
          if (sunChk.get()) {
            ctx.save(); ctx.strokeStyle = "rgba(255,183,77,0.8)"; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
            ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.10, r * 0.94, 0, 0, TAU); ctx.stroke(); ctx.restore();
            D.text(ctx, "太陽潮(約月球的 1/2.2)", cx, cy - r * 0.94 - 12, { color: "#ffb74d", size: 9.5, align: "center" });
          }
          // 月潮凸起:朝月與背月同時鼓起
          const rx = r * (1.12 + 0.16 * f), ry = r * (0.95 - 0.12 * f);
          ctx.save(); ctx.fillStyle = "rgba(79,195,247,0.5)";
          ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, -phi, 0, TAU); ctx.fill(); ctx.restore();
          D.disc(ctx, cx, cy, r * 0.86, { fill: "#2e6da8" });
          ctx.save(); ctx.fillStyle = "rgba(110,160,90,0.9)";
          for (let i = 0; i < 4; i++) { const a = i * 1.7 + 0.6, rr = r * 0.55; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, r * 0.2, r * 0.13, a, 0, TAU); ctx.fill(); }
          ctx.restore();
          const th = -phi;
          for (const s of [1, -1]) { const tx = cx + Math.cos(th) * rx * s, ty = cy + Math.sin(th) * rx * s; D.arrow(ctx, tx, ty, tx + Math.cos(th) * 16 * s, ty + Math.sin(th) * 16 * s, { color: "#4fc3f7", width: 2.4, label: s > 0 ? "朝月漲潮" : "背月漲潮" }); }
          CK.badge(ctx, W * 0.36, H * 0.10, f > 0.72 ? "大潮(朔・望)" : f < 0.28 ? "小潮(上下弦)" : "尋常潮", f > 0.72 ? "#ef5350" : f < 0.28 ? "#5c91dc" : "#66bb6a");
          CK.meter(ctx, W * 0.20, H * 0.88, W * 0.32, 10, (1.2 + 2.9 * f) / 4.5, { color: "#4fc3f7", label: "西岸淺灘潮差放大效應" });
          rPhase.set(["朔・新月", "上弦", "望・滿月", "下弦"][Math.round(day / 7.38) % 4]);
          rRange.set(1.2 + 2.9 * f, 1); rType.set(f > 0.72 ? "大潮" : f < 0.28 ? "小潮" : "尋常潮");
          rInt.set("12 小時 25 分(一日兩次潮)");
          vTide.set(f > 0.72 ? "日月同向疊加:兩側同時漲到最高" : f < 0.28 ? "日月互相垂直:引力部分抵消" : "過渡期:潮差漸變中", f > 0.72 ? "info" : "ok");
        }
      });
      const dayS = PL.ui.slider(ui.L.controls, { label: "月相日", min: 0, max: 29.5, step: 0.1, value: 0, unit: "日", digits: 1 });
      const sunChk = PL.ui.checkbox(ui.L.controls, { label: "顯示太陽潮汐力", checked: true });
      PL.ui.note(ui.L.controls, "潮汐不是「月球把水吸起來」這麼簡單:朝月與背月兩側同時漲潮,地球自轉把兩個凸部送過每個海岸,一天兩次潮。朔望時日月同向成大潮,上下弦互相垂直成小潮。");
      PL.ui.procedure(ui.L.controls, {
        title: "半個月的潮汐節奏",
        steps: [
          "從朔(0 日)開始:月球與太陽同側,兩個凸起最鼓——大潮。",
          "拉到 7.4 日(上弦):日月互相垂直,潮差縮到最小——小潮。",
          "再拉到 14.8 日(望):又回大潮;整個週期約 14.8 天,一個月兩輪。"
        ],
        rule: "月球質量雖小,但潮汐力與 M/r³ 成正比:距離近三級壓過質量,月球潮汐力約是太陽的 2.2 倍——「太陽比較大」不等於「太陽潮比較強」。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "朔(大潮)", apply: () => { dayS.set(0); ui.redraw(); drawChart(); } },
        { label: "上弦(小潮)", apply: () => { dayS.set(7.4); ui.redraw(); drawChart(); } },
        { label: "望(大潮)", apply: () => { dayS.set(14.8); ui.redraw(); drawChart(); } }
      ] });
      const rPhase = PL.ui.readout(ui.L.readouts, { label: "月相" }), rRange = PL.ui.readout(ui.L.readouts, { label: "潮差(西岸淺灘)", unit: "m" });
      const rType = PL.ui.readout(ui.L.readouts, { label: "潮汐類型" }), rInt = PL.ui.readout(ui.L.readouts, { label: "相鄰滿潮間隔" });
      const vTide = PL.ui.verdict(ui.L.readouts, { label: "判定" });
      const chart = ui.chart("潮差隨月相變化", "曲線以半個月為週期起伏:朔與望兩座波峰是大潮,上弦與下弦的波谷是小潮——台灣西岸淺灘把這個潮差再放大到數公尺。");
      function drawChart() {
        if (chart.W < 60) return;
        const day = dayS.get();
        CK.plot(chart, {
          x0: 0, x1: 29.5, y0: 0, y1: 4.6, xlabel: "月相日", ylabel: "潮差 (m)",
          series: [{ fn: d => 1.2 + 2.9 * (1 + Math.cos(TAU * d / 14.76)) / 2, color: PL.col("accent") }],
          marks: [
            { vline: 0, color: "#ef5350", dash: [5, 4], label: "朔" }, { vline: 14.76, color: "#ef5350", dash: [5, 4], label: "望" },
            { vline: 7.38, color: "#5c91dc", dash: [3, 5], label: "上弦" }, { vline: 22.14, color: "#5c91dc", dash: [3, 5], label: "下弦" },
            { dot: [day, 1.2 + 2.9 * (1 + Math.cos(TAU * day / 14.76)) / 2], color: PL.col("accent-2") }
          ]
        });
      }
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 海底地形與中洋脊 */
  PL.register("seafloor-topography", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const exag = exagS.get(), rate = rateS.get();
          const box = { x: W * 0.03, y: H * 0.20, w: W * 0.56, h: H * 0.62 };
          const shownKm = 110 / exag;
          const depthFrac = km => clamp(km / shownKm, 0, 1.05);
          D.rect(ctx, box.x, box.y, box.w, box.h, { fill: PL.theme.isLight() ? "rgba(74,163,216,0.80)" : "rgba(27,77,112,0.85)" });
          const feats = [
            ["大陸棚", 10, 0.15], ["大陸坡", 8, 3.0], ["大陸隆堆", 8, 4.5], ["深海平原", 20, 5.2], ["中洋脊", 16, 2.4],
            ["深海平原", 18, 5.5], ["海溝", 7, 10.9], ["島弧", 8, 1.5]
          ].map(fd => ({ label: fd[0], w: fd[1], depth: depthFrac(fd[2]) }));
          const prof = CK.seaProfile(ctx, box, feats, {});
          // 深度尺
          [0, 2, 4, 6, 8, 10].forEach(km => {
            const y = prof.surf + km / shownKm * prof.depthMax;
            if (y > box.y + box.h) return;
            D.line(ctx, box.x, y, box.x - 8, y, PL.col("border"), 1);
            D.text(ctx, "−" + km + " km", box.x - 10, y + 3, { color: PL.col("text-faint"), size: 8.5, align: "right" });
          });
          D.text(ctx, "垂直誇大 " + PL.fmt(exag, 0) + " ×", box.x + box.w * 0.5, box.y - 8, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          // 中洋脊:對稱擴張箭頭 + 熱液噴口
          const ridge = prof.nodes[4], L = 14 + rate * 6;
          D.rect(ctx, ridge[0] - 7, ridge[1] - 2, 14, 5, { fill: "#ef8829" });
          D.arrow(ctx, ridge[0] - 10, ridge[1] + 14, ridge[0] - 10 - L, ridge[1] + 14, { color: "#66bb6a", width: 2.2 });
          D.arrow(ctx, ridge[0] + 10, ridge[1] + 14, ridge[0] + 10 + L, ridge[1] + 14, { color: "#66bb6a", width: 2.2 });
          D.text(ctx, "海底擴張(半速率 " + PL.fmt(rate, 0) + " cm/年)", ridge[0], ridge[1] + 30, { color: "#66bb6a", size: 9.5, align: "center" });
          if (ventChk.get()) {
            D.rect(ctx, ridge[0] - 3, ridge[1] - 14, 6, 12, { fill: "#54483a" });
            for (let i = 0; i < 4; i++) {
              const f2 = ((t * 0.35 + i * 0.27) % 1);
              D.disc(ctx, ridge[0] + Math.sin(t * 3 + i * 2) * 4, ridge[1] - 16 - f2 * 26, 2.2 - f2, { fill: "rgba(205,210,220," + (0.9 - f2 * 0.7).toFixed(2) + ")" });
            }
            for (let i = 0; i < 3; i++) D.disc(ctx, ridge[0] - 12 + i * 8, ridge[1] + 1, 2.4, { fill: "#e57373", stroke: "#fff", width: 0.8 });
            D.text(ctx, "熱液噴口・管蟲(不靠光合作用)", ridge[0] + 86, ridge[1] - 26, { color: PL.col("text-dim"), size: 9.5 });
          }
          CK.panel(ctx, W * 0.63, H * 0.14, W * 0.34, H * 0.56, "地形對照");
          const rows = [["中洋脊總長", "約 6 萬 km(全球最長)"], ["脊頂有", "裂谷＋熱液噴口"], ["深海平原沉積速率", "1–10 mm/千年"], ["海溝最深", "逾 10 km(馬里亞納)"]];
          rows.forEach((rw, i) => {
            D.text(ctx, rw[0], W * 0.66, H * 0.25 + i * 38, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, rw[1], W * 0.94, H * 0.25 + i * 38, { color: PL.col("text"), size: 10.5, align: "right" });
          });
          // 4000 km = 4×10⁸ cm，÷ 半速率(cm/年) → 年；以前寫成 200，算出來的年齡少一半
          rRate.set(rate, 0); rAge.set(Math.round(400 / rate), 0); rEx.set(exag, 0);
          vSym.set("脊兩側的地形、年齡、磁條帶都對稱——這是海底擴張最直接的證據", "info");
        }
      });
      const exagS = PL.ui.slider(ui.L.controls, { label: "垂直誇大倍數", min: 5, max: 40, step: 1, value: 15, unit: "×", digits: 0 });
      const rateS = PL.ui.slider(ui.L.controls, { label: "擴張半速率", min: 1, max: 10, step: 0.5, value: 5, unit: "cm/年", digits: 1 });
      const ventChk = PL.ui.checkbox(ui.L.controls, { label: "顯示熱液噴口與生態", checked: true });
      PL.ui.note(ui.L.controls, "中洋脊沿全球海底延伸約 6 萬公里,脊頂是新海底出生的地方;往兩側地形對稱下降,直到海溝被隱沒回收——整張剖面就是板塊新生與消亡的紀錄。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀出擴張的證據",
        steps: [
          "誇大 5×:剖面近於平線——真實比例下 11 km 的起伏看不見,先承認畫面是誇大的。",
          "拉到 30×:洋脊、海溝的形態浮出;注意脊兩側的深度幾乎鏡像對稱。",
          "把半速率從 1 拉到 10:對稱箭頭變長,離脊 4000 km 的海底年齡變年輕。"
        ],
        rule: "深海平原的沉積物「脊上最薄、越遠越厚」,年齡與磁條帶也對稱分布——三組獨立證據都指向同一個結論:海底在中洋脊生成、向兩側擴張。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "慢速擴張", apply: () => { rateS.set(2); exagS.set(20); ui.redraw(); drawChart(); } },
        { label: "快速擴張", apply: () => { rateS.set(9); exagS.set(12); ui.redraw(); drawChart(); } },
        { label: "看熱液生態", apply: () => { exagS.set(30); rateS.set(5); ventChk.set(true); ui.redraw(); drawChart(); } }
      ] });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "擴張半速率", unit: "cm/年" }), rAge = PL.ui.readout(ui.L.readouts, { label: "離脊 4000 km 地殼年齡", unit: "百萬年" });
      const rEx = PL.ui.readout(ui.L.readouts, { label: "垂直誇大", unit: "×" });
      const vSym = PL.ui.verdict(ui.L.readouts, { label: "對稱性判讀" });
      const chart = ui.chart("水深 vs 海底年齡", "離洋脊越遠,海底越老、也越深(約 2.5 + 0.35·√t km):地形本身就是海底年齡紀錄,擴張越快、同距離越年輕。");
      function drawChart() {
        if (chart.W < 60) return;
        const rate = rateS.get();
        CK.plot(chart, {
          x0: 0, x1: 160, y0: 0, y1: 8, xlabel: "海底年齡 (百萬年)", ylabel: "水深 (km)",
          series: [{ fn: a => 2.5 + 0.35 * Math.sqrt(a), color: PL.col("accent") }],
          marks: [{ dot: [Math.min(160, 400 / rate), 2.5 + 0.35 * Math.sqrt(Math.min(160, 400 / rate))], color: PL.col("accent-2") }, { hline: 2.5, color: "#ef8829", dash: [5, 4] }]
        });
      }
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 聖嬰與南方振盪 */
  PL.register("enso", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const trade = tradeS.get();
          const anom = clamp((5 - trade) * 0.85, -2.5, 4);             // 東太平洋海溫距平
          const bx = W * 0.04, by = H * 0.20, bw = W * 0.58, bh = H * 0.60, surf = by + 4;
          D.rect(ctx, bx, by, bw, bh, { fill: PL.theme.isLight() ? "rgba(74,163,216,0.75)" : "rgba(27,77,112,0.85)" });
          D.rect(ctx, bx, by, W * 0.05, H * 0.26, { fill: "#8fae6f" });
          D.text(ctx, "亞澳", bx + W * 0.025, by + H * 0.13, { color: "#fff", size: 9.5, align: "center" });
          D.rect(ctx, bx + bw - W * 0.04, by, W * 0.04, H * 0.26, { fill: "#8fae6f" });
          D.text(ctx, "南美", bx + bw - W * 0.02, by + H * 0.13, { color: "#fff", size: 9.5, align: "center" });
          // 海面溫度色帶:西暖東冷,聖嬰時暖水東移
          const Te = 23 + anom, Tw = 29.5 - Math.max(0, anom) * 0.35;
          for (let i = 0; i < 14; i++) { const xf = i / 13, T = Te + (Tw - Te) * Math.pow(1 - xf, 1.2); D.rect(ctx, bx + xf * bw, surf, bw / 13 + 0.8, 16, { fill: CK.tempColor((T - 16) / 15) }); }
          // 暖水堆:位置隨信風強度滑動
          const px = bx + bw * (0.12 + Math.max(0, 5 - trade) * 0.017);
          ctx.save(); ctx.fillStyle = "rgba(255,171,64,0.5)";
          ctx.beginPath(); ctx.ellipse(px, surf + 14, bw * 0.15, 11, 0, 0, TAU); ctx.fill(); ctx.restore();
          D.text(ctx, "暖水堆", px, surf + 38, { color: "#ffb74d", size: 9.5, align: "center" });
          // 溫躍層:西深東淺;聖嬰時傾斜反轉
          const dW = 140 + trade * 8, dE = 60 + (10 - trade) * 15;
          const yD = m => surf + 24 + m / 260 * (bh - 40);
          const pts = [];
          for (let i = 0; i <= 12; i++) pts.push([bx + i / 12 * bw, yD(lerp(dW, dE, Math.pow(i / 12, 0.8)))]);
          ctx.save(); ctx.fillStyle = "rgba(10,30,55,0.45)"; ctx.beginPath();
          pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]));
          ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx, by + bh); ctx.closePath(); ctx.fill(); ctx.restore();
          ctx.save(); ctx.strokeStyle = "#7fd4ff"; ctx.lineWidth = 2.4; ctx.beginPath();
          pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); ctx.restore();
          D.text(ctx, "溫躍層", bx + bw * 0.44, yD(lerp(dW, dE, 0.42)) - 8, { color: "#7fd4ff", size: 10.5, weight: "700" });
          // 信風與湧升流
          const wl = 26 + trade * 5.5;
          if (trade >= 1.5) D.arrow(ctx, bx + bw * 0.70, by - 14, bx + bw * 0.70 - wl, by - 14, { color: "#ef8829", width: 2.4, label: "信風" });
          else D.arrow(ctx, bx + bw * 0.40, by - 14, bx + bw * 0.40 + 34, by - 14, { color: "#ef8829", width: 2.4, label: "西風爆發" });
          if (trade > 1) for (let i = 0; i < 2; i++) D.arrow(ctx, bx + bw - W * (0.075 + i * 0.045), yD(200), bx + bw - W * (0.075 + i * 0.045), yD(200) - (12 + trade * 4), { color: "#5c91dc", width: 2 + trade * 0.2, label: i === 0 ? "湧升流" : "" });
          // 沃克環流:對流區隨信風強弱搬位置
          if (walkerChk.get()) {
            const wx = trade >= 3.5 ? bx + bw * 0.16 : bx + bw * 0.86;
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(wx + (i - 1) * 16, by - 24 - (i % 2) * 6, 15, 7, 0, 0, TAU); ctx.fill(); }
            D.arrow(ctx, wx, by - 8, wx, by - 2, { color: "#eceff1", width: 2 });
            D.text(ctx, trade >= 3.5 ? "對流旺盛(西)→ 秘魯晴朗乾旱" : "對流東移(中東太平洋)→ 秘魯暴雨", bx + bw * 0.5, by - 40, { color: PL.col("text-dim"), size: 10, align: "center" });
          }
          rAn.set(anom, 1); rSoi.set(-anom / 1.5, 1); rFish.set(Math.round(clamp(100 - Math.max(0, anom) * 18 + Math.max(0, -anom) * 7, 6, 112)), 0);
          rTw.set(anom >= 1.5 ? "冬季偏暖,隔年春雨偏多" : anom <= -1.5 ? "冬季偏冷,東北季風偏強" : "接近常年");
          vEn.set(anom > 2 ? "聖嬰年:暖水東移、湧升中斷,秘魯漁荒" : anom < -2 ? "反聖嬰:信風增強,湧升流更旺" : "中性:暖水堆西、信風正常", anom > 2 ? "bad" : anom < -2 ? "warn" : "ok");
        }
      });
      const tradeS = PL.ui.slider(ui.L.controls, { label: "信風強度(5 = 常年)", min: 0, max: 10, step: 0.5, value: 5, digits: 1 });
      const walkerChk = PL.ui.checkbox(ui.L.controls, { label: "顯示沃克環流", checked: true });
      PL.ui.note(ui.L.controls, "正常時信風把暖水堆往西推,秘魯外海靠湧升流餵養漁場;聖嬰年信風減弱,暖水東移、溫躍層東端下沈、湧升流斷糧——海洋與大氣的振盪是一體兩面。");
      PL.ui.procedure(ui.L.controls, {
        title: "翻轉太平洋",
        steps: [
          "信風 5(中性):溫躍層西深東淺,湧升流把冷水與營養鹽送上秘魯外海。",
          "把信風拉到 1:暖水堆滑向中太平洋,東端溫躍層下沈、湧升箭頭縮短——聖嬰成形。",
          "再拉到 9:一切都是加強版——反聖嬰。注意 SOI 讀數與海溫距平正好反相。"
        ],
        rule: "SOI(達爾文與大溪地的氣壓差)與東太平洋海溫距平反相:大氣「看見」的就是海洋做的——所以叫聖嬰「與」南方振盪。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "中性", apply: () => { tradeS.set(5); ui.redraw(); } },
        { label: "聖嬰年", apply: () => { tradeS.set(1); ui.redraw(); } },
        { label: "反聖嬰", apply: () => { tradeS.set(9); ui.redraw(); } }
      ] });
      const rAn = PL.ui.readout(ui.L.readouts, { label: "東太平洋海溫距平", unit: "°C" }), rSoi = PL.ui.readout(ui.L.readouts, { label: "SOI 指標" });
      const rFish = PL.ui.readout(ui.L.readouts, { label: "秘魯相對漁獲", unit: "%" });
      const rTw = PL.ui.readout(ui.L.readouts, { label: "台灣冬季傾向" });
      const vEn = PL.ui.verdict(ui.L.readouts, { label: "ENSO 相位" });
      return { stop() { ui.stop(); } };
    }
  });
})();
