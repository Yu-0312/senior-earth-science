/* 模組七 · 大氣與天氣 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 場景底色是 ctx 漸層直接畫的，登記亮度後疊上去的文字才會選對墨色 */
  const noteBg = (ctx, x, y, w, h, cl, cd) =>
    PL.theme.note(ctx, PL.theme.isLight() ? cl : cd, x, y, w, h);

  /* 飽和水汽壓 e_s(T)（hPa）：Magnus 經驗式，0–40 °C 教學用 */
  const esat = T => 6.11 * Math.pow(10, 7.5 * T / (237.3 + T));

  /* 大氣分層與溫度結構 */
  PL.register("atmosphere-layers", {
    build(root) {
      const LAYERS = [
        { name: "對流層", km: [0, 12], trend: "遞減約 6.5 °C/km", feat: "雲雨雷雪都在這層；集中約 80% 大氣質量", tag: "天氣的舞台", c: "#66bb6a" },
        { name: "平流層", km: [12, 50], trend: "隨高度遞增", feat: "臭氧層在 20–30 km，吸收紫外線保護地表", tag: "臭氧層在此", c: "#5c91dc" },
        { name: "中間層", km: [50, 85], trend: "再遞減", feat: "全大氣最冷（約 −90 °C），流星多在此燒盡", tag: "流星燒盡", c: "#9575cd" },
        { name: "增溫層", km: [85, 100], trend: "急遽上升", feat: "空氣吸收太陽輻射，100 km 以上持續飆升", tag: "極光與衛星", c: "#ef5350" }
      ];
      const tempAt = h => h < 12 ? 15 - 6.5 * h : h < 50 ? -63 + (h - 12) * 1.66
        : h < 85 ? -(h - 50) * 2.8 : -98 + (h - 85) * 3.2;
      const layerIdx = h => h < 12 ? 0 : h < 50 ? 1 : h < 85 ? 2 : 3;
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const hC = altS.get(), showCurve = curveChk.get(), showFeat = featChk.get();
          const box = { x: W * 0.05, y: H * 0.08, w: W * 0.57, h: H * 0.84 };
          const { yOf } = CK.atmosphereBands(ctx, box);
          const X = T => box.x + 16 + (T + 100) / 150 * (box.w - 44);
          if (showCurve) {
            ctx.save();
            ctx.strokeStyle = "#ff9e57"; ctx.lineWidth = 2.6; ctx.beginPath();
            for (let h = 0; h <= 100; h += 1) {
              const px = X(tempAt(h)), py = yOf(h);
              if (h === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.stroke(); ctx.restore();
            D.text(ctx, "溫度（°C）→", X(40), yOf(0) + 16, { color: "#ff9e57", size: 10, align: "right" });
          }
          D.line(ctx, box.x, yOf(0), box.x + box.w, yOf(0), PL.col("text-dim"), 2);
          if (showFeat) LAYERS.forEach((l, i) =>
            CK.badge(ctx, box.x + box.w * 0.26, yOf((l.km[0] + l.km[1]) / 2), l.tag, l.c));
          const cy = yOf(hC), li = layerIdx(hC), T = tempAt(hC);
          D.line(ctx, box.x, cy, box.x + box.w, cy, PL.col("accent-2"), 1.6, [6, 4]);
          D.disc(ctx, X(T), cy, 5.5, { fill: PL.col("accent-2"), stroke: "#fff", width: 1.4, glow: PL.col("accent-2"), glowSize: 8 });
          D.text(ctx, "高度 " + hC.toFixed(1) + " km", box.x + 8, cy - 8, { color: PL.col("accent-2"), size: 10.5, weight: "700" });
          CK.panel(ctx, W * 0.65, H * 0.10, W * 0.31, H * 0.72, "四層比一比（依溫度趨勢分層）");
          LAYERS.forEach((l, i) => {
            const y = H * 0.20 + i * 62, hot = i === li;
            D.text(ctx, l.name + "（" + l.km[0] + "–" + l.km[1] + " km）", W * 0.665, y, { color: hot ? PL.col("accent") : PL.col("text"), size: 11.5, weight: "700" });
            D.text(ctx, "溫度：" + l.trend, W * 0.665, y + 17, { color: hot ? PL.col("accent") : PL.col("text-dim"), size: 10.5 });
            D.text(ctx, l.feat, W * 0.665, y + 33, { color: PL.col("text-faint"), size: 10 });
          });
          D.text(ctx, "分層依據是「溫度隨高度怎麼變」，不是成分。", W * 0.805, H * 0.87, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rLayer.set(LAYERS[li].name); rTemp.set(T, 1);
          rPress.set(1013 * Math.exp(-hC / 8), 0); rFrac.set(Math.exp(-hC / 8) * 100, 1);
        }
      });
      const altS = PL.ui.slider(ui.L.controls, { label: "觀測高度", min: 0, max: 100, step: 0.5, value: 8, unit: "km", digits: 1 });
      const curveChk = PL.ui.checkbox(ui.L.controls, { label: "顯示溫度曲線", checked: true });
      const featChk = PL.ui.checkbox(ui.L.controls, { label: "標示各層特色", checked: true });
      PL.ui.note(ui.L.controls, "溫度曲線先降、再升、再降、再升，每個轉折就是一條層界：對流層頂、平流層頂、中間層頂。天氣只發生在最底下那層。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀出分層的依據",
        steps: [
          "把觀測高度從 0 拉到 100 km：盯著溫度曲線的升降。",
          "0–12 km 遞減（對流層）；12–50 km 因臭氧吸紫外線而遞增。",
          "對照氣壓讀數：高度越高氣壓越低，與溫度趨勢無關。"
        ],
        rule: "「愈高愈冷」只適用在對流層和中間層，平流層反而愈高愈熱。分層看的是溫度變化方向的轉折，不是冷或熱。"
      });
      PL.ui.presets(ui.L.controls, { label: "跳到", options: [
        { label: "對流層頂", apply: () => { altS.set(11); ui.redraw(); } },
        { label: "臭氧層", apply: () => { altS.set(25); ui.redraw(); } },
        { label: "流星", apply: () => { altS.set(80); ui.redraw(); } }] });
      const rLayer = PL.ui.readout(ui.L.readouts, { label: "所在分層" }), rTemp = PL.ui.readout(ui.L.readouts, { label: "氣溫", unit: "°C" });
      const rPress = PL.ui.readout(ui.L.readouts, { label: "氣壓", unit: "hPa" }), rFrac = PL.ui.readout(ui.L.readouts, { label: "占海平面", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 氣壓與高度 */
  PL.register("pressure-altitude", {
    build(root) {
      const BASES = [
        { key: "std", name: "標準大氣 1013 hPa", p0: 1013 }, { key: "high", name: "高壓晴天 1030 hPa", p0: 1030 },
        { key: "low", name: "低壓雨天 995 hPa", p0: 995 }];
      const pressAt = (h, p0) => p0 * Math.exp(-h / 8);
      const ui = CK.scaffold(root, {
        aspect: 0.56,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const h = altS.get(), base = BASES.find(b => b.key === baseSel.get());
          const p0 = base.p0, P = pressAt(h, p0);
          const colX = W * 0.10, colW = W * 0.16, gY = H * 0.86, tY = H * 0.08;
          const Y = hh => gY - hh / 12 * (gY - tY);
          for (let i = 0; i < 48; i++) {          // 空氣柱：越低越密（被上面空氣壓密）
            const f = pressAt(12 * (i + 0.5) / 48, p0) / p0;
            D.rect(ctx, colX, Y(12 * (i + 1) / 48), colW, (gY - tY) / 48 + 0.5, { fill: "rgba(91,141,220," + (0.06 + f * 0.40).toFixed(3) + ")" });
          }
          for (let hh = 0; hh <= 12; hh += 2) {
            D.line(ctx, colX + colW, Y(hh), colX + colW + 8, Y(hh), PL.col("text-faint"), 1);
            D.text(ctx, hh + " km", colX + colW + 12, Y(hh) + 3.5, { color: PL.col("text-faint"), size: 9.5 });
          }
          [5.5, 11].forEach((hh, i) => {
            D.line(ctx, colX, Y(hh), colX + colW, Y(hh), "#ffcc66", 1.4, [5, 4]);
            CK.badge(ctx, colX + colW + 62, Y(hh), "剩 " + (i ? "25%" : "50%"), "#b98a2c");
          });
          // 地面與玉山
          D.rect(ctx, 0, gY, W, H - gY, { fill: PL.theme.isLight() ? "#8fae6f" : "#3d4a35" });
          noteBg(ctx, 0, gY, W, H - gY, "#8fae6f", "#3d4a35");
          ctx.save();
          ctx.fillStyle = PL.theme.isLight() ? "#6f8a52" : "#55663f";
          ctx.beginPath();
          ctx.moveTo(W * 0.52, gY); ctx.lineTo(W * 0.615, Y(3.95)); ctx.lineTo(W * 0.71, gY);
          ctx.closePath(); ctx.fill(); ctx.restore();
          noteBg(ctx, W * 0.52, Y(3.95), W * 0.19, gY - Y(3.95), "#6f8a52", "#55663f");
          D.text(ctx, "玉山 3,952 m", W * 0.615, Y(3.95) - 8, { color: PL.col("text-dim"), size: 10, align: "center" });
          const bx = colX + colW / 2, by = Y(h);    // 熱氣球氣壓計
          D.disc(ctx, bx, by - 10, 11, { fill: "#e57373", stroke: "#fff", width: 1 });
          D.line(ctx, bx, by + 1, bx, by + 8, PL.col("text-dim"), 1.2);
          D.rect(ctx, bx - 3.5, by + 8, 7, 6, { fill: "#a1665a", r: 1.5 });
          CK.badge(ctx, bx, h > 9.5 ? by + 34 : by - 30, "P = " + P.toFixed(0) + " hPa", PL.col("accent"));
          CK.panel(ctx, W * 0.745, H * 0.10, W * 0.235, H * 0.70, base.name);
          [["海平面氣壓 P₀", p0 + " hPa"], ["目前氣壓", P.toFixed(0) + " hPa"],
           ["剩餘比例", (P / p0 * 100).toFixed(1) + " %"], ["折半次數", (h / 5.5).toFixed(1) + " 次"],
           ["水的沸點約", (100 - 3.5 * h).toFixed(0) + " °C"]].forEach(([k, v2], i) => {
            D.text(ctx, k, W * 0.762, H * 0.22 + i * 40, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v2, W * 0.963, H * 0.22 + i * 40 + 15, { color: i === 1 ? PL.col("accent") : PL.col("text"), size: 12, align: "right", weight: i === 1 ? "700" : "" });
          });
          D.text(ctx, "高山煮飯煮不熟：氣壓低、沸點低。", W * 0.8625, H * 0.75, { color: PL.col("text-faint"), size: 10, align: "center" });
          rP.set(P, 0); rFrac.set(P / p0 * 100, 1); rBoil.set(100 - 3.5 * h, 1); rAlt.set(h, 1);
        }
      });
      const altS = PL.ui.slider(ui.L.controls, { label: "高度", min: 0, max: 12, step: 0.1, value: 3, unit: "km", digits: 1 });
      const baseSel = PL.ui.select(ui.L.controls, { label: "海平面氣壓（天氣影響）", value: "std", options: BASES.map(b => ({ value: b.key, label: b.name })) });
      PL.ui.note(ui.L.controls, "氣壓＝頭上整根空氣柱的重量。爬得越高、頭上剩的空氣越少，氣壓便指數式下降；天氣系統只讓它小幅上下。");
      PL.ui.procedure(ui.L.controls, {
        title: "驗證半數規則",
        steps: [
          "把高度拉到 5.5 km：氣壓剩海平面的一半。",
          "再拉到 11 km：剩四分之一，每 5.5 km 減半一次。",
          "切換海平面氣壓：天氣只讓曲線上下平移一點，形狀不變。"
        ],
        rule: "氣壓隨高度是「指數」遞減，不是線性：5.5 km 剩一半、11 km 剩一半的一半（25%），永遠壓不到 0。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "海平面", apply: () => { altS.set(0); ui.redraw(); } },
        { label: "玉山頂", apply: () => { altS.set(3.95); ui.redraw(); } },
        { label: "客機巡航", apply: () => { altS.set(11); ui.redraw(); } }] });
      const rP = PL.ui.readout(ui.L.readouts, { label: "氣壓", unit: "hPa" }), rFrac = PL.ui.readout(ui.L.readouts, { label: "相對海平面", unit: "%" });
      const rBoil = PL.ui.readout(ui.L.readouts, { label: "沸點約", unit: "°C" }), rAlt = PL.ui.readout(ui.L.readouts, { label: "高度", unit: "km" });
      const chart = ui.chart("氣壓–高度曲線", "指數遞減：每升高 5.5 km 約剩一半，曲線一直下降，但不會降到 0。");
      const drawChart = () => {
        const p0 = (BASES.find(b => b.key === baseSel.get()) || BASES[0]).p0, h = altS.get();
        CK.plot(chart, {
          x0: 0, x1: 16, y0: 0, y1: 1050, xlabel: "高度 (km)", ylabel: "氣壓 (hPa)",
          series: [{ fn: x => pressAt(x, p0), color: PL.col("accent") }],
          marks: [{ vline: 5.5, color: "#ffcc66", dash: [4, 4] }, { vline: 11, color: "#ffcc66", dash: [4, 4] },
                  { dot: [h, pressAt(h, p0)], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 濕度、露點與飽和 */
  PL.register("humidity-dewpoint", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const T = tS.get(), Td = Math.min(dS.get(), T), dT = coolS.get();
          const Tn = T - dT;                        // 夜間降溫後的氣溫
          const e = esat(Td), esN = esat(Tn);
          const RH = Math.min(100, e / esN * 100);
          const near = Td - Tn < 2.5, sat = Tn <= Td + 0.05;
          CK.scene(ui.cv, { kind: "sky", horizon: H * 0.78 });
          noteBg(ctx, 0, 0, W, H * 0.78, "#a5cdea", "#1c2b49");
          noteBg(ctx, 0, H * 0.78, W, H * 0.22, "#8fae6f", "#3d4a35");
          const nVapor = Math.round(4 + esat(Td) / 3.2);
          for (let i = 0; i < nVapor; i++) {        // 空氣中的水汽：量由露點決定
            const a = i * 2.39996, rr = H * 0.44 * Math.sqrt((i + 0.5) / nVapor);
            D.disc(ctx, W * 0.60 + Math.cos(a) * rr * 1.25, H * 0.38 + Math.sin(a) * rr * 0.60, 2.2, { fill: "rgba(90,160,215,0.9)" });
          }
          D.text(ctx, "空氣中的水汽（多少看露點）", W * 0.60, H * 0.09, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 一杯冰飲：杯壁跟著降到 Tn
          const cx = W * 0.19, cy = H * 0.52, cw = W * 0.13, ch = H * 0.30;
          D.rect(ctx, cx - cw / 2, cy - ch / 2, cw, ch, { fill: "rgba(206,230,248,0.92)", stroke: "#8fa8b8", width: 2, r: 7 });
          D.rect(ctx, cx - cw / 2 + 4, cy - ch / 2 + 6, cw - 8, ch * 0.5, { fill: "#7fd4e8", r: 4 });
          D.text(ctx, "降溫到 " + Tn.toFixed(1) + " °C", cx, cy + ch / 2 + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
          if (sat) {
            const nDrop = Math.round(clamp((Td - Tn) * 2 + 4, 4, 26));
            for (let i = 0; i < nDrop; i++) {
              const fx = cx - cw / 2 + 3 + (i * 7.3) % (cw - 8);
              const fy = cy - ch / 2 + 12 + (i * 13.7) % (ch - 20);
              D.disc(ctx, fx, fy, 2.4, { fill: "#4fa8d8" });
            }
            D.text(ctx, "結露了", cx, cy - ch / 2 - 10, { color: "#2e6da8", size: 11.5, align: "center", weight: "700" });
          } else if (near) {
            D.text(ctx, "快到露點……", cx, cy - ch / 2 - 10, { color: "#b98a2c", size: 11, align: "center", weight: "700" });
          }
          CK.meter(ctx, W * 0.40, H * 0.88, W * 0.38, 12, RH / 100,
            { color: RH > 95 ? "#2e6da8" : RH > 60 ? "#4aa3d8" : "#c8b26a", label: "相對濕度 " + RH.toFixed(0) + "%" });
          rT.set(Tn, 1); rRH.set(RH, 0); rE.set(e, 2); rEs.set(esN, 2);
          vSat.set(sat ? "已達露點：多餘水汽凝結成露" : near ? "接近露點：再降一點就飽和" : "未飽和：還裝得下更多水汽",
            sat ? "ok" : near ? "warn" : "info");
        }
      });
      const tS = PL.ui.slider(ui.L.controls, { label: "氣溫", min: 0, max: 40, step: 0.5, value: 30, unit: "°C", digits: 1 });
      const dS = PL.ui.slider(ui.L.controls, { label: "露點", min: 0, max: 40, step: 0.5, value: 24, unit: "°C", digits: 1 });
      const coolS = PL.ui.slider(ui.L.controls, { label: "夜間降溫幅度", min: 0, max: 15, step: 0.5, value: 0, unit: "°C", digits: 1 });
      PL.ui.note(ui.L.controls, "露點只看空氣裡有多少水汽：把氣溫降到露點，濕度 100%，多出來的水汽只能凝結，清晨的露珠、冰杯外面的水都是這樣來的。");
      PL.ui.procedure(ui.L.controls, {
        title: "把空氣降到露點",
        steps: [
          "固定氣溫與露點，拉「夜間降溫幅度」：相對濕度一路往上爬。",
          "降到露點那一刻：濕度 100%，杯壁冒出水珠。",
          "拉高露點（水汽更多）：露點和氣溫的差變小，感覺就會很悶。"
        ],
        rule: "潮濕看「氣溫−露點」的差：差 2 °C 悶濕、差 15 °C 乾燥。相對濕度會隨溫度變，露點不會。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "悶熱夏日", apply: () => { tS.set(33); dS.set(28); coolS.set(0); ui.redraw(); } },
        { label: "清晨結露", apply: () => { tS.set(26); dS.set(23); coolS.set(4); ui.redraw(); } },
        { label: "乾冷空氣", apply: () => { tS.set(14); dS.set(2); coolS.set(0); ui.redraw(); } }] });
      const rT = PL.ui.readout(ui.L.readouts, { label: "降溫後氣溫", unit: "°C" }), rRH = PL.ui.readout(ui.L.readouts, { label: "相對濕度", unit: "%" });
      const rE = PL.ui.readout(ui.L.readouts, { label: "實際水汽壓", unit: "hPa" }), rEs = PL.ui.readout(ui.L.readouts, { label: "飽和水汽壓", unit: "hPa" });
      const vSat = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("飽和水汽壓曲線", "藍色水平虛線＝空氣裡實際的水汽量；往左降溫，撞到飽和曲線那一刻的溫度就是露點。");
      const drawChart = () => {
        const T = tS.get(), Td = Math.min(dS.get(), T), Tn = T - coolS.get(), e = esat(Td);
        CK.plot(chart, {
          x0: 0, x1: 40, y0: 0, y1: 75, xlabel: "溫度 (°C)", ylabel: "水汽壓 (hPa)",
          series: [{ fn: x => esat(x), color: "#2e6da8" }],
          marks: [{ hline: e, color: "#4aa3d8", dash: [5, 4] },
                  { dot: [Td, e], color: "#4aa3d8" },
                  { dot: [Tn, Math.min(75, esat(Tn))], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 絕熱冷卻與雲的形成 */
  PL.register("cloud-formation", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const T0 = tS.get(), Td0 = Math.min(dS.get(), T0), z = zS.get();
          const lcl = 0.125 * (T0 - Td0);            // 舉升凝結高度（km，約 125 m/°C）
          const tp = z <= lcl ? T0 - 10 * z : T0 - 10 * lcl - 6 * (z - lcl);
          CK.scene(ui.cv, { kind: "sky", horizon: H * 0.90 });
          noteBg(ctx, 0, 0, W, H * 0.90, "#a5cdea", "#1c2b49");
          noteBg(ctx, 0, H * 0.90, W, H * 0.10, "#8fae6f", "#3d4a35");
          const gY = H * 0.90, scale = H * 0.74 / 6;
          const Y = kk => gY - kk * scale;
          ctx.save();                                 // 山坡（地形舉升）
          const mgrad = ctx.createLinearGradient(0, Y(6), 0, gY);
          if (PL.theme.isLight()) { mgrad.addColorStop(0, "#8fae6f"); mgrad.addColorStop(0.55, "#6d8a54"); mgrad.addColorStop(1, "#55693f"); }
          else { mgrad.addColorStop(0, "#54654a"); mgrad.addColorStop(0.55, "#46543c"); mgrad.addColorStop(1, "#333f2c"); }
          ctx.fillStyle = mgrad;
          ctx.beginPath();
          ctx.moveTo(0, gY); ctx.lineTo(W * 0.34, Y(6)); ctx.lineTo(W * 0.62, gY);
          ctx.closePath(); ctx.fill();
          // 雪線:峰頂淺色帶
          ctx.fillStyle = PL.theme.isLight() ? "rgba(245,248,252,0.85)" : "rgba(210,225,240,0.5)";
          ctx.beginPath();
          ctx.moveTo(W * 0.305, Y(5.55)); ctx.lineTo(W * 0.34, Y(6)); ctx.lineTo(W * 0.375, Y(5.55));
          ctx.lineTo(W * 0.355, Y(5.72)); ctx.lineTo(W * 0.33, Y(5.58)); ctx.closePath();
          ctx.fill();
          ctx.restore();
          noteBg(ctx, 0, Y(6), W * 0.62, gY - Y(6), "#7d9660", "#46543c");
          D.text(ctx, "地形舉升", W * 0.15, Y(3.1), { color: "#eef6e6", size: 11, align: "center", weight: "700" });
          if (lcl <= 6) {
            D.line(ctx, W * 0.03, Y(lcl), W * 0.95, Y(lcl), "#eef6e6", 1.4, [7, 5]);
            D.text(ctx, "雲底 LCL ≈ " + Math.round(lcl * 1000) + " m", W * 0.94, Y(lcl) - 7, { color: PL.col("text"), size: 10.5, align: "right" });
          }
          const px = W * 0.34 * z / 6 + 8, py = Y(z);
          D.disc(ctx, px, py, 8, { fill: "#ffd54f", stroke: "#b98a2c", width: 1.5 });
          D.text(ctx, "氣塊 " + tp.toFixed(1) + " °C", px + 12, py - 8, { color: PL.col("text"), size: 10.5 });
          if (z > lcl) {                              // 過了雲底才長雲
            const thick = z - lcl;
            CK.cloudShape(ctx, px + 8, py - 18, 44 + thick * 24, 20 + thick * 8, thick > 3.5 ? "cumulonimbus" : "cumulus", {});
          }
          if (T0 - Td0 > 14) CK.badge(ctx, W * 0.72, Y(4.3), "乾燥：背風下沉增溫 → 焚風", "#c1663b");
          CK.panel(ctx, W * 0.66, H * 0.12, W * 0.30, H * 0.50, "把空氣舉上去的三隻手");
          [["地形舉升", "氣流撞山，被迫沿坡上爬（本圖）"],
           ["鋒面舉升", "暖空氣沿鋒面斜坡整層滑上"],
           ["對流舉升", "地面曬熱，浮力自己衝"]].forEach((r2, i) => {
            D.text(ctx, r2[0], W * 0.68, H * 0.25 + i * 44, { color: PL.col("accent"), size: 11.5, weight: "700" });
            D.text(ctx, r2[1], W * 0.68, H * 0.25 + i * 44 + 17, { color: PL.col("text-dim"), size: 10.5 });
          });
          rT.set(tp, 1); rLcl.set(Math.round(lcl * 1000), 0);
          rState.set(z > lcl ? "成雲：雲底以上再升 " + (z - lcl).toFixed(1) + " km" : "未成雲：還差 " + (lcl - z).toFixed(2) + " km");
          rRate.set(z > lcl ? "濕絕熱 ≈ 6 °C/km" : "乾絕熱 ≈ 10 °C/km");
          vCloud.set(z > lcl ? "凝結放出潛熱，雲越長越高" : "尚未飽和：乾空氣每公里降 10 °C", z > lcl ? "ok" : "info");
        }
      });
      const tS = PL.ui.slider(ui.L.controls, { label: "地表氣溫", min: 12, max: 34, step: 0.5, value: 30, unit: "°C", digits: 1 });
      const dS = PL.ui.slider(ui.L.controls, { label: "地表露點", min: 2, max: 30, step: 0.5, value: 22, unit: "°C", digits: 1 });
      const zS = PL.ui.slider(ui.L.controls, { label: "抬升高度", min: 0, max: 6, step: 0.1, value: 1.5, unit: "km", digits: 1 });
      PL.ui.note(ui.L.controls, "上升 → 氣壓變低 → 膨脹 → 降溫（絕熱冷卻）。降到露點就凝結成雲；潛熱放熱讓冷卻變慢，雲才能一直長高。");
      PL.ui.procedure(ui.L.controls, {
        title: "看潛熱接手",
        steps: [
          "拉「抬升高度」慢慢爬：先走陡的乾絕熱 10 °C/km。",
          "越過雲底虛線：雲出現，曲線轉彎改走 6 °C/km。",
          "把露點拉高：雲底變低，潮濕天氣的雲又低又厚。"
        ],
        rule: "乾、濕絕熱的差別就是潛熱：每凝結 1 g 水汽放出約 2,260 J，雷雨和颱風的能量都是從這裡來的。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "午後雷雨", apply: () => { tS.set(32); dS.set(26); zS.set(5.5); ui.redraw(); } },
        { label: "乾燥焚風", apply: () => { tS.set(33); dS.set(12); zS.set(4); ui.redraw(); } },
        { label: "潮濕低雲", apply: () => { tS.set(20); dS.set(19); zS.set(1.2); ui.redraw(); } }] });
      const rT = PL.ui.readout(ui.L.readouts, { label: "氣塊溫度", unit: "°C" }), rLcl = PL.ui.readout(ui.L.readouts, { label: "雲底高度", unit: "m" });
      const rState = PL.ui.readout(ui.L.readouts, { label: "雲況" }), rRate = PL.ui.readout(ui.L.readouts, { label: "降溫率" });
      const vCloud = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("氣塊溫度 vs 環境", "黃線（氣塊）過雲底前斜率 10、之後轉 6；灰虛線是環境遞減率 6.5。斜率轉彎，就表示潛熱開始釋放了。");
      const drawChart = () => {
        const T0 = tS.get(), Td0 = Math.min(dS.get(), T0), z = zS.get();
        const lcl = 0.125 * (T0 - Td0);
        const parcel = kk => kk <= lcl ? T0 - 10 * kk : T0 - 10 * lcl - 6 * (kk - lcl);
        CK.plot(chart, {
          x0: 0, x1: 6, y0: -30, y1: 36, xlabel: "高度 (km)", ylabel: "溫度 (°C)",
          series: [{ fn: kk => T0 - 6.5 * kk, color: PL.col("text-faint"), dash: [5, 4] },
                   { fn: parcel, color: "#e8a13c", width: 2.6 }],
          marks: [{ hline: T0 - 10 * lcl, color: "#4aa3d8", dash: [4, 4] },
                  { dot: [z, parcel(z)], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 雲的種類與天氣線索 */
  PL.register("cloud-types", {
    build(root) {
      const CLOUDS = [
        { key: "cirrus", name: "卷雲", band: "高雲族", alt: "7–12 km", comp: "冰晶", type: "cirrus", h: 9.5, w: 150, hh: 26, sign: "白色纖維狀；增厚變卷層雲＝鋒面快要到了" },
        { key: "cirrostratus", name: "卷層雲", band: "高雲族", alt: "6–12 km", comp: "冰晶", type: "cirrus", h: 8, w: 230, hh: 14, sign: "薄幕蓋天、日月出現光暈，表示鋒面 12–24 小時內會到" },
        { key: "altocumulus", name: "高積雲", band: "中雲族", alt: "2–6 km", comp: "水滴", type: "cumulus", h: 4, w: 110, hh: 30, sign: "成群棉球排排站；傍晚還在增厚，隔天可能變天" },
        { key: "altostratus", name: "高層雲", band: "中雲族", alt: "2–6 km", comp: "水滴＋冰晶", type: "stratus", h: 3.5, w: 240, hh: 26, sign: "灰藍幕簾滿天、太陽像隔著毛玻璃，快下雨了" },
        { key: "stratus", name: "層雲", band: "低雲族", alt: "0–2 km", comp: "水滴", type: "stratus", h: 1.1, w: 260, hh: 20, sign: "灰白均勻一片，頂多毛毛雨；貼地就是霧" },
        { key: "cumulus", name: "積雲", band: "低雲族", alt: "雲底約 0.5–2 km", comp: "水滴", type: "cumulus", h: 1.6, w: 100, hh: 52, sign: "平底大棉花；中午一直長厚長高就要警戒對流" },
        { key: "cumulonimbus", name: "積雨雲", band: "低雲族（垂直發展）", alt: "雲底約 1 km、雲頂可達 12 km", comp: "下層水滴、上層冰晶", type: "cumulonimbus", h: 4.8, w: 130, hh: 190, sign: "高聳的鐵砧狀：雷陣雨、瞬間大雨、冰雹、閃電" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const c = CLOUDS.find(x => x.key === cloudSel.get());
          const cover = coverS.get(), bands = bandChk.get();
          CK.scene(ui.cv, { kind: "sky", horizon: H * 0.88 });
          noteBg(ctx, 0, 0, W, H * 0.88, "#a5cdea", "#1c2b49");
          noteBg(ctx, 0, H * 0.88, W, H * 0.12, "#8fae6f", "#3d4a35");
          const gY = H * 0.88, top = H * 0.12;
          const Y = km => gY - clamp(km, 0, 12) / 12 * (gY - top);
          CK.sunIcon(ctx, W * 0.09, H * 0.15, 14, {});
          if (bands) {
            [[2, "2 km：低／中雲分界"], [6, "6 km：中／高雲分界"]].forEach(([km, s]) => {
              D.line(ctx, W * 0.04, Y(km), W * 0.96, Y(km), "rgba(255,255,255,0.55)", 1.2, [6, 5]);
              D.text(ctx, s, W * 0.05, Y(km) - 6, { color: PL.col("text"), size: 9.5 });
            });
            D.text(ctx, "高雲族", W * 0.955, Y(10) + 4, { color: PL.col("text"), size: 10, align: "right", weight: "700" });
            D.text(ctx, "中雲族", W * 0.955, Y(4) + 4, { color: PL.col("text"), size: 10, align: "right", weight: "700" });
            D.text(ctx, "低雲族", W * 0.955, Y(1) + 4, { color: PL.col("text"), size: 10, align: "right", weight: "700" });
          }
          for (let i = 0; i < cover; i++) {          // 雲量：同款雲鋪滿天
            const fx = W * (0.16 + 0.7 * ((i * 0.37) % 1));
            CK.cloudShape(ctx, fx, Y(c.h) + (i % 3 - 1) * 13, c.w * 0.52, c.hh * 0.5, c.type, { alpha: 0.55 });
          }
          const cyy = c.type === "cumulonimbus" ? Y(4.8) : Y(c.h);
          CK.cloudShape(ctx, W * 0.55, cyy, c.w, c.hh, c.type, {});
          if (c.key === "cumulonimbus") {
            D.rect(ctx, W * 0.55 - 96, cyy - c.hh * 0.42, 192, 13, { fill: "rgba(235,240,246,0.85)", r: 6 });
            for (let i = 0; i < 13; i++)
              D.line(ctx, W * 0.47 + i * 11, Y(2.1), W * 0.455 + i * 11, Y(0.6), "rgba(80,130,190,0.85)", 1.6);
          }
          D.text(ctx, c.name, W * 0.55, cyy - c.hh * 0.62 - 8, { color: PL.col("text"), size: 12.5, align: "center", weight: "700" });
          CK.panel(ctx, W * 0.66, H * 0.13, W * 0.30, H * 0.55, "看雲讀天氣");
          D.text(ctx, c.name + "（" + c.band + "）", W * 0.81, H * 0.25, { color: PL.col("accent"), size: 12, align: "center", weight: "700" });
          D.text(ctx, "高度：" + c.alt, W * 0.81, H * 0.34, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "組成：" + c.comp, W * 0.81, H * 0.42, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, c.sign, W * 0.81, H * 0.55, { color: PL.col("text"), size: 10.5, align: "center" });
          rBand.set(c.band); rAlt.set(c.alt); rComp.set(c.comp); rSign.set(c.sign); rCover.set(cover, 0);
        }
      });
      const cloudSel = PL.ui.select(ui.L.controls, { label: "雲種", value: "cumulus", options: CLOUDS.map(c => ({ value: c.key, label: c.name })) });
      const coverS = PL.ui.slider(ui.L.controls, { label: "雲量", min: 0, max: 10, step: 1, value: 3, unit: "成", digits: 0 });
      const bandChk = PL.ui.checkbox(ui.L.controls, { label: "顯示雲族高度分界", checked: true });
      PL.ui.note(ui.L.controls, "十雲屬先按高度分高、中、低三族，再按形態分卷、層、積。認得這七種，天氣預報的雲圖就看懂一大半。");
      PL.ui.procedure(ui.L.controls, {
        title: "雲是天空的預告片",
        steps: [
          "切到卷層雲：看見光暈＝鋒面在路上，帶傘出門。",
          "切到積雨雲：雲底在低層、雲頂直上對流層頂。",
          "拉高雲量：雲多白天不熱、夜裡不冷，日溫差變小。"
        ],
        rule: "積雨雲不能只按雲底高度歸成低雲：它垂直發展、跨過三族，看雲要連厚度一起看。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "鋒面前兆", apply: () => { cloudSel.set("cirrostratus"); ui.redraw(); } },
        { label: "雷陣雨", apply: () => { cloudSel.set("cumulonimbus"); coverS.set(7); ui.redraw(); } },
        { label: "好天氣", apply: () => { cloudSel.set("cumulus"); coverS.set(3); ui.redraw(); } }] });
      const rBand = PL.ui.readout(ui.L.readouts, { label: "雲族" }), rAlt = PL.ui.readout(ui.L.readouts, { label: "高度" });
      const rComp = PL.ui.readout(ui.L.readouts, { label: "組成" }), rSign = PL.ui.readout(ui.L.readouts, { label: "天氣線索" });
      const rCover = PL.ui.readout(ui.L.readouts, { label: "雲量", unit: "成" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 風的形成與科氏力 */
  PL.register("wind-coriolis", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const lat = latS.get(), pgf = gS.get(), surf = envSel.get() === "surface";
          const sLat = Math.sin(lat * Math.PI / 180);
          const f = 1.46 * sLat;                     // 科氏參數（×10⁻⁴ s⁻¹）
          const defl = 90 * clamp(sLat / 0.5, 0, 1) * (surf ? 0.42 : 1);  // 右偏角
          const v = (4 + 26 * pgf) * (surf ? 0.62 : 1);
          const gap = lerp(92, 30, pgf);
          for (let x = W * 0.06; x <= W * 0.60; x += gap)
            D.line(ctx, x, H * 0.10, x, H * 0.82, "rgba(120,150,190,0.55)", 1.4, [8, 6]);
          D.disc(ctx, W * 0.07, H * 0.46, 13, { fill: "#5b8def" });
          D.text(ctx, "H", W * 0.07, H * 0.46 + 4.5, { color: "#fff", size: 12, align: "center", weight: "700" });
          D.disc(ctx, W * 0.585, H * 0.46, 13, { fill: "#e57373" });
          D.text(ctx, "L", W * 0.585, H * 0.46 + 4.5, { color: "#fff", size: 12, align: "center", weight: "700" });
          D.text(ctx, "等壓線：越密＝氣壓梯度越大", W * 0.32, H * 0.90, { color: PL.col("text-faint"), size: 10, align: "center" });
          // 風向量與三力平衡（向量三角形恰好閉合）
          const ox = W * 0.30, oy = H * 0.42, d = defl * Math.PI / 180;
          const ux = Math.cos(d), uy = Math.sin(d);
          const Lv = 24 + v * 4.6, Lp = 60, C = Lp * Math.sin(d), F = Lp * Math.cos(d);
          CK.arrow(ctx, ox, oy, ox + Lp, oy, "#5b8def", "氣壓梯度力");
          CK.arrow(ctx, ox, oy, ox - Math.sin(d) * C, oy + Math.cos(d) * C, "#e57373", "科氏力");
          if (surf) CK.arrow(ctx, ox, oy, ox - ux * F, oy - uy * F, PL.col("text-faint"), "摩擦力");
          CK.arrow(ctx, ox, oy, ox + ux * Lv, oy + uy * Lv, PL.col("accent-2"), "風");
          for (let i = 0; i < 5; i++) {              // 順風漂移的空氣微粒
            const f2 = ((t * 0.25 + i / 5) % 1);
            D.disc(ctx, ox + ux * (Lv * 0.4 + f2 * Lv * 1.3), oy + uy * (Lv * 0.4 + f2 * Lv * 1.3), 3, { fill: "rgba(255,213,79,0.9)" });
          }
          CK.badge(ctx, W * 0.32, H * 0.15, lat < 2 ? "赤道：科氏力≈0，直穿等壓線"
            : surf ? "近地面：斜穿等壓線 " + (90 - defl).toFixed(0) + "°" : "高空：沿等壓線吹", PL.col("accent"));
          rF.set(f, 2); rDef.set(90 - defl, 0); rV.set(v, 1);
          rEnv.set(surf ? "近地面（有摩擦）" : "高空（無摩擦）");
        }
      });
      const latS = PL.ui.slider(ui.L.controls, { label: "緯度", min: 0, max: 90, step: 0.5, value: 45, unit: "°", digits: 1 });
      const gS = PL.ui.slider(ui.L.controls, { label: "氣壓梯度（等壓線密度）", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const envSel = PL.ui.select(ui.L.controls, { label: "高度環境", value: "aloft", options: [
        { value: "aloft", label: "高空（無摩擦）" }, { value: "surface", label: "近地面（有摩擦）" }] });
      PL.ui.note(ui.L.controls, "氣壓梯度力把空氣從高壓推向低壓，科氏力讓北半球的運動一路往右偏，偏到和梯度力抵銷為止，所以風會斜穿或平行等壓線。");
      PL.ui.procedure(ui.L.controls, {
        title: "三力拉鋸出風向",
        steps: [
          "緯度設 0：科氏力消失，風直直穿過等壓線從 H 到 L。",
          "拉到 45°、90°：風被越推越右，高空最後沿等壓線吹。",
          "切到近地面：多了一個反向的摩擦力，風又斜回等壓線 30–45°。"
        ],
        rule: "科氏力不是真的力，是地球自轉的慣性效應；它不改風速、只改方向，而且緯度越高越強。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "赤道", apply: () => { latS.set(0); ui.redraw(); } },
        { label: "台灣上空", apply: () => { latS.set(23.5); ui.redraw(); } },
        { label: "冬季地面風", apply: () => { latS.set(40); envSel.set("surface"); ui.redraw(); } }] });
      const rF = PL.ui.readout(ui.L.readouts, { label: "科氏參數 f", unit: "×10⁻⁴ s⁻¹" }), rDef = PL.ui.readout(ui.L.readouts, { label: "風與等壓線夾角", unit: "°" });
      const rV = PL.ui.readout(ui.L.readouts, { label: "風速", unit: "m/s" }), rEnv = PL.ui.readout(ui.L.readouts, { label: "環境" });
      const chart = ui.chart("科氏參數隨緯度", "f = 2Ω sin φ：赤道為 0、極地最大，所以颱風不會在赤道上生成。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 90, y0: 0, y1: 1.6, xlabel: "緯度 (°)", ylabel: "f (×10⁻⁴ s⁻¹)",
          series: [{ fn: x => 1.46 * Math.sin(x * Math.PI / 180), color: PL.col("accent") }],
          marks: [{ dot: [latS.get(), 1.46 * Math.sin(latS.get() * Math.PI / 180)], color: PL.col("accent-2") }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 鋒面與天氣系統 */
  PL.register("fronts-weather", {
    build(root) {
      const FRONTS = {
        cold: { name: "冷鋒", type: "cold", off: -0.085, x0: 0.16, x1: 0.84, tB: 28, tA: 18, wB: 225, wA: 0, grad: "坡度陡",
          rain: "短時強降雨、雷雨", shift: "過境轉偏北風", curve: [[0, 28], [0.30, 28], [0.45, 20], [0.55, 18], [1, 19]] },
        warm: { name: "暖鋒", type: "warm", off: 0.22, x0: 0.84, x1: 0.16, tB: 18, tA: 24, wB: 135, wA: 180, grad: "坡度緩",
          rain: "連綿層狀降雨", shift: "過境轉偏南風", curve: [[0, 18], [0.35, 18], [0.70, 22], [1, 24]] },
        stat: { name: "滯留鋒", type: "stationary", off: -0.03, x0: 0.40, x1: 0.60, tB: 25, tA: 23, wB: 200, wA: 160, grad: "近乎垂直、來回擺盪",
          rain: "雨帶滯留、連日陰雨", shift: "風向飄移不定", curve: [[0, 24], [0.3, 25], [0.5, 24], [0.7, 25], [1, 24]] }
      };
      const interp = (pts, x) => {
        for (let i = 1; i < pts.length; i++) if (x <= pts[i][0]) return lerp(pts[i - 1][1], pts[i][1], (x - pts[i - 1][0]) / (pts[i][0] - pts[i - 1][0]));
        return pts[pts.length - 1][1];
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = fSel.get(), f = FRONTS[key], prog = progS.get(), showSt = stChk.get();
          CK.scene(ui.cv, { kind: "sky", horizon: H * 0.86 });
          noteBg(ctx, 0, 0, W, H * 0.86, "#a5cdea", "#1c2b49");
          noteBg(ctx, 0, H * 0.86, W, H * 0.14, "#8fae6f", "#3d4a35");
          const gY = H * 0.86, top = H * 0.12, fx = W * lerp(f.x0, f.x1, prog), off = f.off * W;
          const rain = (xa, xb, k) => { const n = Math.max(3, Math.round((xb - xa) / 14));
            for (let i = 0; i < n; i++) { const x = xa + (i + 0.5) * (xb - xa) / n;
              D.line(ctx, x, gY - 86 * k, x - 5, gY - 24 * k, "rgba(70,120,185,0.85)", 1.5); } };
          // 左冷右暖的氣團底色
          [[W * 0.02, fx + off, "rgba(91,141,220,0.22)"], [fx + off, W * 0.98, "rgba(224,110,80,0.18)"]].forEach(([x0, x1, fill]) => {
            ctx.save(); ctx.fillStyle = fill; ctx.beginPath();
            ctx.moveTo(x0, top); ctx.lineTo(x1, top); ctx.lineTo(fx, gY); ctx.lineTo(x0, gY);
            ctx.closePath(); ctx.fill(); ctx.restore();
          });
          CK.frontSymbol(ctx, fx + off, top, fx, gY, f.type);
          D.text(ctx, f.name + "（" + f.grad + "）", fx + off / 2, top - 8, { color: PL.col("text"), size: 11.5, align: "center", weight: "700" });
          if (f.type === "cold") {
            CK.cloudShape(ctx, fx - 28, top + 48, 90, 62, "cumulonimbus", {});
            CK.cloudShape(ctx, fx - 80, top + 62, 60, 36, "cumulonimbus", { alpha: 0.7 }); rain(fx - 62, fx + 14, 1);
          } else if (f.type === "warm") {
            CK.cloudShape(ctx, fx + off + 26, top + 28, 130, 12, "cirrus", { alpha: 0.75 });
            CK.cloudShape(ctx, fx + off * 0.55, top + 72, 190, 26, "stratus", { alpha: 0.8 });
            CK.cloudShape(ctx, fx + 12, gY - 64, 200, 30, "stratus", {}); rain(fx - 44, fx + 88, 0.6);
          } else {
            CK.cloudShape(ctx, fx + 6, top + 62, 170, 42, "stratus", {});
            CK.cloudShape(ctx, fx - 92, top + 48, 90, 40, "cumulus", { alpha: 0.8 }); rain(fx - 70, fx + 72, 0.8);
          }
          if (showSt) [W * 0.30, W * 0.68].forEach(sx => {   // 測站：鋒面過了沒？
            const passed = key === "warm" ? fx < sx : fx > sx - 10, t = passed ? f.tA : f.tB;
            CK.stationModel(ctx, sx, gY - 24, { temp: t, dew: t - (key === "stat" ? 1 : 5), pressure: 1006,
              windDir: passed ? f.wA : f.wB, windSpeed: 15, cover: 0.9 });
          });
          D.text(ctx, "台灣冬春季的鋒面常與東北季風共構，北部陰雨綿綿。", W * 0.82, H * 0.70, { color: PL.col("text-faint"), size: 10, align: "center" });
          rName.set(f.name); rGrad.set(f.grad); rRain.set(f.rain);
          rT.set(f.tB + " → " + f.tA + " °C"); rW.set(f.shift);
          vF.set(key === "stat" ? "滯留鋒：雨帶停著不走，梅雨就是這樣" : key === "cold" ? "冷鋒：來得快、去得快、雨得急" : "暖鋒：慢慢推、雨先到、過境回暖", key === "stat" ? "warn" : "info");
        }
      });
      const fSel = PL.ui.select(ui.L.controls, { label: "鋒面類型", value: "cold", options: [
        { value: "cold", label: "冷鋒" }, { value: "warm", label: "暖鋒" }, { value: "stat", label: "滯留鋒" }] });
      const progS = PL.ui.slider(ui.L.controls, { label: "鋒面推進", min: 0, max: 1, step: 0.05, value: 0.35, digits: 2 });
      const stChk = PL.ui.checkbox(ui.L.controls, { label: "顯示地面測站", checked: true });
      PL.ui.note(ui.L.controls, "鋒面是冷、暖氣團的交界：冷鋒像推土機（陡、雨急、過境降溫），暖鋒像爬坡（緩、雨綿、過境回暖），滯留鋒則原地拉鋸下雨。");
      PL.ui.procedure(ui.L.controls, {
        title: "追一道鋒面過境",
        steps: [
          "選冷鋒、拉推進：雨帶掃過測站，溫度與風向瞬間改變。",
          "選暖鋒：先看到高雲、再層雲連綿，測站溫度緩慢上升。",
          "選滯留鋒：鋒面卡住，雨帶跟著來回擺動，這就是梅雨。"
        ],
        rule: "冷鋒過境「雨後」才轉晴降溫，暖鋒則是雨先下、暖後到。看降水和溫度變化的先後順序，就能分辨鋒面種類。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "冬季冷鋒", apply: () => { fSel.set("cold"); progS.set(0.5); ui.redraw(); } },
        { label: "梅雨滯留鋒", apply: () => { fSel.set("stat"); progS.set(0.5); ui.redraw(); } },
        { label: "暖鋒接近", apply: () => { fSel.set("warm"); progS.set(0.3); ui.redraw(); } }] });
      const rName = PL.ui.readout(ui.L.readouts, { label: "鋒面" }), rGrad = PL.ui.readout(ui.L.readouts, { label: "坡度" });
      const rRain = PL.ui.readout(ui.L.readouts, { label: "降水特性" }), rT = PL.ui.readout(ui.L.readouts, { label: "過境溫度" });
      const rW = PL.ui.readout(ui.L.readouts, { label: "風向變化" });
      const vF = PL.ui.verdict(ui.L.controls, { label: "—" });
      const chart = ui.chart("測站氣溫隨過境時間", "冷鋒一下子降溫、暖鋒慢慢升溫、滯留鋒溫度持平但雨下不停，這是鋒面過境在天氣紀錄上的樣子。");
      const drawChart = () => {
        const f = FRONTS[fSel.get()], prog = progS.get();
        CK.plot(chart, {
          x0: 0, x1: 1, y0: 12, y1: 32, xlabel: "過境時間 →", ylabel: "氣溫 (°C)",
          series: [{ pts: f.curve, color: PL.col("accent"), width: 2.4 }],
          marks: [{ vline: prog, color: PL.col("accent-2"), dash: [4, 4] }, { dot: [prog, interp(f.curve, prog)], color: PL.col("accent-2") }] });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      return { stop() { ui.stop(); } };
    }
  });

  /* 颱風的結構與路徑 */
  PL.register("typhoon", {
    build(root) {
      const grade = v => v >= 51 ? "強烈颱風" : v >= 32.7 ? "中度颱風" : "輕度颱風";
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const v = vS.get(), sst = sstS.get(), land = landChk.get();
          const ok = sst >= 26.5 && !land;
          const P = Math.round(1010 - 0.026 * v * v);
          const g = ctx.createLinearGradient(0, 0, 0, H);
          g.addColorStop(0, PL.theme.isLight() ? "#2f86bd" : "#14486e");
          g.addColorStop(1, PL.theme.isLight() ? "#1d5e93" : "#0c2f4c");
          ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
          noteBg(ctx, 0, 0, W, H, "#2a7cb4", "#134567");
          if (land) {                                 // 台灣簡圖
            ctx.save();
            ctx.fillStyle = PL.theme.isLight() ? "#8fae6f" : "#5d7a4a";
            ctx.beginPath();
            ctx.moveTo(W * 0.72, H * 0.14); ctx.lineTo(W * 0.82, H * 0.28); ctx.lineTo(W * 0.78, H * 0.55);
            ctx.lineTo(W * 0.68, H * 0.74); ctx.lineTo(W * 0.62, H * 0.52); ctx.lineTo(W * 0.655, H * 0.28);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(60,40,20,0.6)"; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
            noteBg(ctx, W * 0.62, H * 0.14, W * 0.20, H * 0.60, "#8fae6f", "#5d7a4a");
            D.text(ctx, "台灣", W * 0.725, H * 0.46, { color: "#fff", size: 11.5, align: "center", weight: "700" });
          }
          const cx = W * 0.36, cy = H * 0.48, R = H * 0.36;
          const eye = lerp(30, 11, (v - 17) / 43) * (H / 420);
          CK.typhoonSpiral(ctx, cx, cy, R, { spin: -t * (0.16 + v / 300), eye, alpha: ok ? 0.8 : 0.35 });
          for (let i = 0; i < 3; i++)                 // 逆時針環流箭頭
            CK.currentArrow(ctx, cx, cy, R * (0.42 + i * 0.24), i * 2.1 - t * 0.25, -1.1, { color: "rgba(255,255,255,0.75)", width: 2 });
          D.text(ctx, "北半球：逆時針旋轉", cx, cy + R + 20, { color: "#eaf4ff", size: 10.5, align: "center" });
          if (!ok) CK.badge(ctx, cx, cy - R - 16, land ? "登陸：摩擦＋水汽中斷，減弱中" : "海溫不足 26.5 °C，減弱中", "#c0392b");
          CK.panel(ctx, W * 0.64, H * 0.09, W * 0.335, H * 0.76, "垂直剖面：眼、眼牆、雨帶");
          const bx = W * 0.665, bw = W * 0.28, bmid = H * 0.42;
          D.line(ctx, bx, bmid + 62, bx + bw, bmid + 62, "rgba(130,190,230,0.65)", 2);
          D.text(ctx, "海面", bx + bw, bmid + 76, { color: PL.col("text-faint"), size: 9.5, align: "right" });
          CK.cloudShape(ctx, bx + bw * 0.17, bmid - 8, bw * 0.36, H * 0.42, "cumulonimbus", {});
          CK.cloudShape(ctx, bx + bw * 0.83, bmid - 8, bw * 0.36, H * 0.42, "cumulonimbus", {});
          D.arrow(ctx, bx + bw * 0.5, bmid - 8, bx + bw * 0.5, bmid + 50, { color: "#9fd0f0", width: 2, label: "眼：下沉無風" });
          D.arrow(ctx, bx + bw * 0.15, bmid + 44, bx + bw * 0.15, bmid - 46, { color: "#ffd54f", width: 2.2, label: "眼牆上升最強" });
          D.arrow(ctx, bx + bw * 0.85, bmid + 44, bx + bw * 0.85, bmid - 46, { color: "#ffd54f", width: 2.2 });
          D.text(ctx, "外圍螺旋雨帶：風雨漸進", bx + bw * 0.5, bmid + 96, { color: PL.col("text-dim"), size: 10, align: "center" });
          rV.set(v, 0); rP.set(P, 0); rG.set(grade(v)); rSst.set(sst, 1);
          vCond.set(ok ? "條件適合：海溫 ≥ 26.5 °C、風切小" : "環境不適合：強度減弱", ok ? "ok" : "bad");
        }
      });
      const vS = PL.ui.slider(ui.L.controls, { label: "近中心最大風速", min: 17, max: 60, step: 1, value: 45, unit: "m/s", digits: 0 });
      const sstS = PL.ui.slider(ui.L.controls, { label: "海溫", min: 24, max: 31, step: 0.5, value: 29, unit: "°C", digits: 1 });
      const landChk = PL.ui.checkbox(ui.L.controls, { label: "登陸台灣", checked: false });
      PL.ui.note(ui.L.controls, "颱風是暖心低壓：眼區下沉無風、眼牆風雨最強、外圍雨帶漸進。生成要海溫 26 °C 以上、風切小、緯度大於 5°（要有科氏力）。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀颱風的結構",
        steps: [
          "拉強度滑桿：越強、眼越小越清晰，中心氣壓越低。",
          "把海溫拉到 26.5 °C 以下：螺旋雲系散掉，暖心低壓沒有能量來源了。",
          "勾「登陸台灣」：地形摩擦加上水汽中斷，強度一路減弱。"
        ],
        rule: "颱風的能量來自暖海水蒸發的潛熱，不是冷空氣；所以它登陸或走到冷水上一定減弱，不會「被山擋爆」。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "輕度颱風", apply: () => { vS.set(25); sstS.set(28); landChk.set(false); ui.redraw(); } },
        { label: "強烈颱風", apply: () => { vS.set(56); sstS.set(30); landChk.set(false); ui.redraw(); } },
        { label: "登陸減弱", apply: () => { vS.set(42); sstS.set(29); landChk.set(true); ui.redraw(); } }] });
      const rV = PL.ui.readout(ui.L.readouts, { label: "近中心風速", unit: "m/s" }), rP = PL.ui.readout(ui.L.readouts, { label: "中心氣壓", unit: "hPa" });
      const rG = PL.ui.readout(ui.L.readouts, { label: "強度分級" }), rSst = PL.ui.readout(ui.L.readouts, { label: "海溫", unit: "°C" });
      const vCond = PL.ui.verdict(ui.L.controls, { label: "—" });
      return { stop() { ui.stop(); } };
    }
  });
})();
