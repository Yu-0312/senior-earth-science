/* 模組十 · 天文觀測與星空 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 天球與星座盤 */
  PL.register("celestial-sphere", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const lat = latS.get();           // 觀測緯度 0–90
          const timeH = timeS.get();        // 恆星時 0–24
          // 俯視圖：外圈地平、內畫天球
          const cx = W * 0.32, cy = H * 0.50, R = H * 0.36;
          D.disc(ctx, cx, cy, R + 16, { fill: PL.theme.shade(0.55), stroke: PL.col("border"), width: 1.6 });
          // 地平圈（外環）與天赤道（傾斜圓）
          D.ring(ctx, cx, cy, R, PL.col("text-dim"), 2);
          D.text(ctx, "地平圈 N", cx, cy - R - 12, { color: PL.col("text-dim"), size: 10.5, align: "center", weight: "700" });
          // 天北極仰角 = 緯度 → 畫在靠近中心的上方
          const poleY = cy - R * (lat / 90) * 0.9 - 8;
          const tilt = (90 - lat) * Math.PI / 180;
          ctx.save();
          ctx.strokeStyle = "rgba(255,213,79,0.85)"; ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, R * 0.86 * Math.abs(Math.cos(tilt)), R * 0.30, 0, 0, TAU);
          ctx.stroke();
          ctx.restore();
          D.text(ctx, "天赤道", cx + R * 0.62, cy + R * 0.22, { color: "rgba(255,213,79,0.95)", size: 10.5 });
          // 天北極與北極星
          D.disc(ctx, cx, poleY, 4.5, { fill: "#fff8c4", glow: "#ffe082", glowSize: 10 });
          D.text(ctx, "北極星", cx + 10, poleY + 4, { color: PL.col("text"), size: 10.5 });
          D.line(ctx, cx, cy, cx, poleY, "rgba(120,180,240,0.5)", 1.4, [4, 4]);
          D.text(ctx, "仰角 = " + Math.round(lat) + "°（= 當地緯度）", cx + 12, (cy + poleY) / 2, { color: "#7cb7e8", size: 10 });
          // 星星繞極旋轉
          const spin = timeH / 24 * TAU;
          for (let i = 0; i < 9; i++) {
            const rr = R * (0.2 + (i % 3) * 0.26);
            const a = spin + i * 0.7;
            const x = cx + Math.cos(a) * rr * 0.9, y = poleY + Math.abs(Math.sin(a)) * rr * 0.42 * (Math.sin(a) > 0 ? 1 : 1);
            const yy = poleY + Math.sin(a) * rr * 0.42;
            D.disc(ctx, x, yy, 2.2, { fill: "rgba(255,240,200," + (Math.sin(a) > -0.2 ? 0.95 : 0.25) + ")" });
          }
          CK.panel(ctx, W * 0.64, H * 0.12, W * 0.30, H * 0.66, "星座盤三件事");
          const rows = [
            ["觀測緯度", Math.round(lat) + "°", "決定天北極高度"],
            ["恆星時", Math.floor(timeH) + " 時", "轉盤要對準的時間"],
            ["可見天區", lat > 60 ? "南天為主" : lat > 25 ? "大部分星空" : "南北兼可", "緯度越高南天越少"]
          ];
          rows.forEach(([k, v, note], i) => {
            D.text(ctx, k, W * 0.67, H * (0.26 + i * 0.14), { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.92, H * (0.26 + i * 0.14), { color: i === 1 ? PL.col("accent") : PL.col("text"), size: 13, align: "right", weight: "700" });
            D.text(ctx, note, W * 0.67, H * (0.26 + i * 0.14) + 16, { color: PL.col("text-faint"), size: 9.5 });
          });
          D.text(ctx, "在台北（25°N）永遠看不到南十字", W * 0.79, H * 0.72, { color: PL.col("warn"), size: 10.5, align: "center" });
          rLat.set(lat, 0); rTime.set(timeH, 0); rAlt.set(lat, 0);
        }
      });
      const latS = PL.ui.slider(ui.L.controls, { label: "觀測緯度", min: 0, max: 90, step: 1, value: 25, unit: "°", digits: 0 });
      const timeS = PL.ui.slider(ui.L.controls, { label: "恆星時", min: 0, max: 24, step: 0.5, value: 21, unit: "h", digits: 1 });
      PL.ui.note(ui.L.controls, "把天球想成一個罩住地球的大球：天北極的高度正好等於你的緯度——在台北看北極星仰角 25°,在北極看它就在頭頂。");
      PL.ui.procedure(ui.L.controls, {
        title: "星座盤的使用",
        steps: [
          "把日期與時間對準轉盤刻度（這裡用恆星時簡化）。",
          "確認天北極高度 = 當地緯度,先找北極星定位。",
          "拉動緯度滑桿:在北極(90°)只看得到北天極附近的天區。",
          "轉動恆星時:星星繞極逆時針轉(俯視北天)。"
        ],
        rule: "北極星的仰角就是緯度——這是野外導航與星座盤定標的共同原理。"
      });
      PL.ui.presets(ui.L.controls, { label: "觀測地", options: [
        { label: "台北 25°N", apply: () => latS.set(25) },
        { label: "北極 90°N", apply: () => latS.set(90) },
        { label: "赤道 0°", apply: () => latS.set(0) }
      ] });
      const rLat = PL.ui.readout(ui.L.readouts, { label: "觀測緯度", unit: "°" });
      const rTime = PL.ui.readout(ui.L.readouts, { label: "恆星時", unit: "h" });
      const rAlt = PL.ui.readout(ui.L.readouts, { label: "北極星仰角", unit: "°" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 周日運動與恆星日 */
  PL.register("diurnal-motion", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const dayT = dayS.get();        // 連續觀測天數 0–10
          const hour = hourS.get();       // 當晚時刻 18–30(=隔日6)
          const lat = 25;
          // 每晚星空提前約 4 分鐘 = 1°/天:整條弧與星位置一起西移
          const nightShift = dayT * Math.PI / 180 * 1.01;
          const cx = W * 0.30, cy = H * 0.54, R = H * 0.34;
          const poleY = cy - R * (lat / 90) - 10;
          // 三顆星的軌跡弧(繞極)
          const stars = [{ r: R * 0.92, name: "繞極星(不落)", hue: "#ffe082" }, { r: R * 0.66, name: "中天星", hue: "#b3e5fc" }, { r: R * 0.40, name: "近極星", hue: "#f8bbd0" }];
          const ang0 = -Math.PI / 2;
          const sweep = (hour - 18) / 12 * Math.PI;
          stars.forEach((st, k) => {
            // 完整軌跡(淡)與已走過的部分(亮):弧的起訖都隨天數西移
            CK.starTrail(ctx, cx, poleY, [{ r: st.r, from: ang0 - nightShift - Math.PI * 0.15, to: ang0 - nightShift + Math.PI * 1.15 }], { color: "rgba(255,236,160,0.18)", width: 1.4 });
            CK.starTrail(ctx, cx, poleY, [{ r: st.r, from: ang0 - nightShift, to: ang0 - nightShift + sweep }], { color: st.hue, width: 2.6 });
            const a2 = ang0 - nightShift + sweep;
            D.disc(ctx, cx + Math.cos(a2) * st.r, poleY + Math.sin(a2) * st.r * 0.92, 4, { fill: st.hue, glow: st.hue, glowSize: 8 });
          });
          D.disc(ctx, cx, poleY, 3.4, { fill: "#fff8c4", glow: "#ffe082", glowSize: 9 });
          D.text(ctx, "天北極(北極星)", cx + 8, poleY - 8, { color: PL.col("text-dim"), size: 10 });
          // 地平線
          D.rect(ctx, 0, cy + R * 0.78, W, H - cy - R * 0.78 + 8, { fill: PL.theme.isLight() ? "rgba(120,150,110,0.5)" : "rgba(60,80,55,0.5)" });
          D.line(ctx, 0, cy + R * 0.78, W, cy + R * 0.78, PL.col("border"), 2);
          CK.panel(ctx, W * 0.62, H * 0.12, W * 0.32, H * 0.62, "兩種「一天」");
          const rows = [
            ["太陽日", "24h 00m", "太陽兩次中天"],
            ["恆星日", "23h 56m", "星星兩次中天"],
            ["每天差", "約 4 分鐘", "星空提前 4 分升起"]
          ];
          rows.forEach(([k, v, note], i) => {
            D.text(ctx, k, W * 0.65, H * (0.26 + i * 0.15), { color: PL.col("text-dim"), size: 11.5 });
            D.text(ctx, v, W * 0.92, H * (0.26 + i * 0.14), { color: i === 1 ? PL.col("accent") : PL.col("text"), size: 13, align: "right", weight: "700" });
            D.text(ctx, note, W * 0.65, H * (0.26 + i * 0.15) + 16, { color: PL.col("text-faint"), size: 9.5 });
          });
          D.text(ctx, dayT + " 天後星空提前 " + (dayT * 4) + " 分鐘", W * 0.78, H * 0.70, { color: PL.col("accent-2"), size: 11, align: "center", weight: "700" });
          D.text(ctx, "一個月累積約 2 小時", W * 0.78, H * 0.78, { color: PL.col("text-faint"), size: 10, align: "center" });
          rHour.set(hour, 1); rShift.set(dayT * 4, 0); rDays.set(dayT, 0);
        }
      });
      const hourS = PL.ui.slider(ui.L.controls, { label: "今晚時刻", min: 18, max: 30, step: 0.25, value: 21, unit: "時", digits: 2 });
      const dayS = PL.ui.slider(ui.L.controls, { label: "連續觀測", min: 0, max: 10, step: 1, value: 3, unit: "天", digits: 0 });
      PL.ui.note(ui.L.controls, "同一顆星每晚提前約 4 分鐘升到同一位置——因為地球繞太陽前進,要多轉一點才對回同一顆星。一個月累積 2 小時,季節星座因此輪替。");
      PL.ui.procedure(ui.L.controls, {
        title: "看見周日運動",
        steps: [
          "推動「今晚時刻」:三顆星沿弧線西移(北極星不動)。",
          "注意繞極星整晚不落,近極星畫小圈。",
          "加「連續觀測」天數:對照右側累積提前量。"
        ],
        rule: "周日運動是地球自轉的鏡像;太陽日(24h)與恆星日(23h56m)的差,就是「繞太陽」要多轉的那一份。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "晚上 9 點", apply: () => hourS.set(21) },
        { label: "凌晨 2 點", apply: () => hourS.set(26) },
        { label: "十晚對照", apply: () => { hourS.set(21); dayS.set(10); } }
      ] });
      const rHour = PL.ui.readout(ui.L.readouts, { label: "當地時刻", unit: "時" });
      const rShift = PL.ui.readout(ui.L.readouts, { label: "星空提前", unit: "分" });
      const rDays = PL.ui.readout(ui.L.readouts, { label: "觀測天數", unit: "天" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 季節與黃赤交角 */
  PL.register("seasons", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const dateM = dateS.get();       // 0–12 月
          // 太陽直射緯度:夏至(6月,+23.5)→冬至(12月,-23.5)
          const decl = -23.5 * Math.cos((dateM / 12) * TAU);
          const cx = W * 0.30, cy = H * 0.48;
          CK.sunIcon(ctx, cx, cy, 22, { time: t });
          // 地球(帶傾斜地軸)放在軌道位置
          const orbA = (dateM / 12) * TAU;
          const ex = cx + Math.cos(orbA) * W * 0.001; // 地球位置由滑桿直接給緯度直射即可,此處聚焦地球特寫
          const gx = W * 0.62, gy = H * 0.48, gR = H * 0.24;
          CK.globe(ctx, gx, gy, gR, { tilt: 23.5, showAxis: true, seed: 6 });
          // 直射點標記
          const decY = gy - Math.sin(decl * Math.PI / 180) * gR;
          const decX = gx + Math.cos(decl * Math.PI / 180) * gR * 0.94;
          D.arrow(ctx, gx - gR * 2.1, decY, gx - gR * 0.98, decY, { color: "#ffca28", width: 3 });
          D.text(ctx, "陽光", gx - gR * 1.75, decY - 10, { color: "#ffca28", size: 10.5, align: "center" });
          D.disc(ctx, decX, decY, 5, { fill: "#ff7043", glow: "#ff5722", glowSize: 9 });
          D.text(ctx, "直射點 " + (decl >= 0 ? "+" : "") + decl.toFixed(1) + "°", decX + 10, decY + 4, { color: PL.col("text"), size: 10.5 });
          // 回歸線
          [23.5, -23.5].forEach(d => {
            const y = gy - Math.sin(d * Math.PI / 180) * gR;
            D.line(ctx, gx - gR * 1.25, y, gx + gR * 1.25, y, "rgba(140,160,180,0.45)", 1.2, [3, 4]);
          });
          D.text(ctx, "北回歸線", gx - gR * 1.22, gy - Math.sin(23.5 * Math.PI / 180) * gR - 6, { color: PL.col("text-faint"), size: 9 });
          D.text(ctx, "南回歸線", gx - gR * 1.22, gy - Math.sin(-23.5 * Math.PI / 180) * gR + 14, { color: PL.col("text-faint"), size: 9 });
          // 右側季節資料
          const season = decl > 15 ? "北半球夏季" : decl > 5 ? "北半球春末" : decl < -15 ? "北半球冬季" : decl < -5 ? "北半球冬末" : "春分/秋分附近";
          CK.panel(ctx, W * 0.06, H * 0.12, W * 0.26, H * 0.70, "季節判讀");
          const rows = [
            ["月份", Math.round(1 + dateM % 12) + " 月"],
            ["直射緯度", (decl >= 0 ? "+" : "") + decl.toFixed(1) + "°"],
            ["季節", season],
            ["台灣正午影長", decl > 10 ? "全年最短" : decl < -10 ? "全年最長" : "中等"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.09, H * (0.28 + i * 0.15), { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.29, H * (0.28 + i * 0.14), { color: i === 2 ? PL.col("accent") : PL.col("text"), size: 12, align: "right", weight: i === 2 ? "700" : "" });
          });
          D.text(ctx, "黃赤交角 23.5° 是季節的根本原因", W * 0.19, H * 0.76, { color: PL.col("warn"), size: 10, align: "center" });
          rDate.set(Math.round(1 + dateM % 12), 0); rDec.set(decl, 1); rSeason.set(season);
        }
      });
      const dateS = PL.ui.slider(ui.L.controls, { label: "日期(月)", min: 0, max: 12, step: 0.25, value: 6, digits: 2 });
      PL.ui.note(ui.L.controls, "地軸傾斜 23.5° 且指向固定:六月陽光直射北回歸線(北半球夏季)、十二月直射南回歸線。季節來自「直射點緯度」,不是日地距離。");
      PL.ui.procedure(ui.L.controls, {
        title: "追直射點一年",
        steps: [
          "六月(夏至):直射 +23.5°,台灣正晝最長、影子最短。",
          "九月(秋分):直射赤道,晝夜等長。",
          "十二月(冬至):直射 −23.5°,正午影子全年最長。",
          "注意:一月地球其實在「近日點」——離太陽近卻是北半球的冬天。"
        ],
        rule: "「離太陽遠=冬天」是最常見的誤解:北半球冬季時地球反而比夏季靠近太陽約 3%。"
      });
      PL.ui.presets(ui.L.controls, { label: "節氣", options: [
        { label: "夏至(6月)", apply: () => dateS.set(6) },
        { label: "春分(3月)", apply: () => dateS.set(3) },
        { label: "冬至(12月)", apply: () => dateS.set(12) }
      ] });
      const rDate = PL.ui.readout(ui.L.readouts, { label: "月份", unit: "月" });
      const rDec = PL.ui.readout(ui.L.readouts, { label: "直射緯度", unit: "°" });
      const rSeason = PL.ui.readout(ui.L.readouts, { label: "季節" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 太陽軌跡與日出日落 */
  PL.register("solar-path", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const season = seasonSel.get(); // summer / equinox / winter
          const hour = hourS.get();        // 5–19
          // 南向天空剖面:地平線 + 三條太陽軌跡
          const horizon = H * 0.74;
          CK.scene(ui.cv, { kind: "sky", horizon: 0.74 });
          const x0 = W * 0.06, x1 = W * 0.62;
          const arcs = {
            summer: { top: H * 0.10, rise: 1.20 },
            equinox: { top: H * 0.30, rise: 1.0 },
            winter: { top: H * 0.48, rise: 0.80 }
          };
          const colors = { summer: "#ffd54f", equinox: "#ffb300", winter: "#ff8a65" };
          ["summer", "equinox", "winter"].forEach(s => {
            const a = arcs[s];
            ctx.save();
            ctx.strokeStyle = colors[s]; ctx.lineWidth = s === season ? 3 : 1.4;
            if (s !== season) ctx.globalAlpha = 0.4;
            ctx.beginPath();
            ctx.moveTo(x0, horizon - 4);
            ctx.quadraticCurveTo((x0 + x1) / 2, a.top, x1, horizon - 4);
            ctx.stroke();
            ctx.restore();
            if (s === season) {
              D.text(ctx, { summer: "夏至軌跡(最高最長)", equinox: "春秋分(正東正西)", winter: "冬至軌跡(最低最短)" }[s], (x0 + x1) / 2, a.top - 10, { color: colors[s], size: 11, align: "center", weight: "700" });
            }
          });
          // 當前太陽位置
          const f = clamp((hour - 5.5) / 13, 0, 1);
          const a = arcs[season];
          const sx = lerp(x0, x1, f), sy = (1 - Math.sin(f * Math.PI)) * (horizon - 4) + Math.sin(f * Math.PI) * a.top;
          if (f > 0.01 && f < 0.99) {
            CK.sunIcon(ctx, sx, sy, 13, { time: t });
            D.line(ctx, sx, sy + 14, sx, horizon, "rgba(255,202,40,0.4)", 1.4, [3, 4]);
            const noonH = { summer: 89 - 25, equinox: 90 - 25, winter: 90 - 25 - 47 }[season];
            const alt = Math.sin(f * Math.PI) * noonH;
            D.text(ctx, "太陽高度 " + Math.max(0, alt).toFixed(0) + "°", sx + 16, sy, { color: PL.col("text"), size: 10.5 });
            // 影子
            const shLen = 26 / Math.max(0.25, Math.tan(alt * Math.PI / 180)) * 2.2;
            D.line(ctx, sx, horizon, sx + clamp(shLen, 4, 120), horizon, "rgba(60,60,60,0.55)", 3);
            D.rect(ctx, sx - 3, horizon - 14, 6, 14, { fill: "#5d4c39" });
          }
          D.text(ctx, "南", (x0 + x1) / 2, horizon + 16, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          D.text(ctx, "東", x0 - 4, horizon + 16, { color: PL.col("text-faint"), size: 10 });
          D.text(ctx, "西", x1 + 4, horizon + 16, { color: PL.col("text-faint"), size: 10 });
          // 日照時數對照
          CK.panel(ctx, W * 0.68, H * 0.12, W * 0.26, H * 0.56, "北緯 25°(台灣)");
          const dayLen = { summer: 13.6, equinox: 12.0, winter: 10.5 }[season];
          const noonAlt = { summer: "88.5°(幾乎頭頂)", equinox: "65°", winter: "41.5°" }[season];
          const riseAz = { summer: "東偏北 23°", equinox: "正東", winter: "東偏南 23°" }[season];
          const rows = [["白晝長度", dayLen.toFixed(1) + " 小時"], ["正午高度", noonAlt], ["日出方位", riseAz]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.71, H * (0.26 + i * 0.16), { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.92, H * (0.26 + i * 0.15), { color: PL.col("text"), size: 11.5, align: "right" });
          });
          D.text(ctx, "太陽能板傾角 = 緯度 ± 15°(冬夏調整)", W * 0.81, H * 0.62, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rSeason.set({ summer: "夏至", equinox: "春秋分", winter: "冬至" }[season]);
          rHour.set(hour, 1); rDay.set(dayLen, 1); rAlt.set(Math.max(0, Math.sin(f * Math.PI) * { summer: 64, equinox: 65, winter: 41.5 }[season]), 0);
        }
      });
      const seasonSel = PL.ui.select(ui.L.controls, { label: "季節", value: "summer", options: [
        { value: "summer", label: "夏至" }, { value: "equinox", label: "春秋分" }, { value: "winter", label: "冬至" }
      ] });
      const hourS = PL.ui.slider(ui.L.controls, { label: "時刻", min: 5, max: 19, step: 0.25, value: 12, unit: "時", digits: 2 });
      PL.ui.note(ui.L.controls, "同一地點、三種季節、三條太陽軌跡:夏至最高最長、冬至最低最短,春秋分正東升起正西落下。影子長短與日照時數都跟著變。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀太陽軌跡",
        steps: [
          "夏至正午:太陽幾乎在頭頂(台灣),影子極短。",
          "冬至正午:高度只剩 41.5°,影子是夏至的兩倍以上。",
          "拖動時刻:看太陽沿軌跡移動與影子的方向變化。",
          "日出方位跟著季節偏北/偏南——只有春秋分是正東。"
        ],
        rule: "建築採光、太陽能板與遮陽設計都依「冬至最低軌跡」與「夏至最高軌跡」兩條線畫界。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "夏至正午", apply: () => { seasonSel.set("summer"); hourS.set(12); } },
        { label: "冬至清晨", apply: () => { seasonSel.set("winter"); hourS.set(7); } },
        { label: "秋分黃昏", apply: () => { seasonSel.set("equinox"); hourS.set(17.5); } }
      ] });
      const rSeason = PL.ui.readout(ui.L.readouts, { label: "季節" });
      const rHour = PL.ui.readout(ui.L.readouts, { label: "時刻", unit: "時" });
      const rDay = PL.ui.readout(ui.L.readouts, { label: "白晝長度", unit: "h" });
      const rAlt = PL.ui.readout(ui.L.readouts, { label: "太陽高度", unit: "°" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 望遠鏡的原理與性能 */
  PL.register("telescope", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const D_cm = diaS.get();     // 口徑 cm
          const mag = magS.get();      // 倍率
          // 折射望遠鏡示意
          const cx = W * 0.28, cy = H * 0.42;
          D.rect(ctx, cx - 130, cy - 14, 260, 28, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), r: 12 });
          // 物鏡與目鏡
          PL.apparatus.lens(ctx, cx - 100, cy, 13, true);
          PL.apparatus.lens(ctx, cx + 92, cy, 7, true);
          D.text(ctx, "物鏡(口徑 " + D_cm + " cm)", cx - 100, cy + 34, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "目鏡", cx + 92, cy + 34, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 光線
          for (let k = -1; k <= 1; k++) {
            D.line(ctx, cx - 170, cy + k * 12, cx - 104, cy + k * 12, "rgba(255,224,130,0.75)", 1.8);
            D.line(ctx, cx - 100, cy + k * 12, cx + 86, cy + k * 5, "rgba(255,224,130,0.45)", 1.4);
          }
          // 集光力與極限星等
          const gain = Math.pow(D_cm / 0.5, 2) * 0.25;      // 相對肉眼 5mm
          const lm = 2.1 + 5 * Math.log10(D_cm / 0.7);       // 極限星等經驗式
          const res = 11.6 / D_cm * 1.22;                    // 星等 1 處的解析角秒(示意)
          // 模擬視野:雙星分辨
          const vx = W * 0.66, vy = H * 0.34, vr = H * 0.24;
          D.disc(ctx, vx, vy, vr, { fill: "#0d1524", stroke: PL.col("border"), width: 2 });
          /*
           * 視野裡的背景星。starfield(ctx, W, H, salt) 畫的是從 (0,0) 起的整塊矩形，
           * 以前把視野左上角當成 W、H 傳進去，星星與星雲霧撒在畫布左上角的望遠鏡上，
           * 視野圓裡反而一顆都沒有。改成裁切在視野圓內、平移到圓的外接方框再畫；
           * 視野本身永遠是暗的，星點用亮色自己畫，不跟淺色主題的「深色星點」走。
           */
          ctx.save();
          ctx.beginPath(); ctx.arc(vx, vy, vr - 1, 0, TAU); ctx.clip();
          let seed = 20261107;
          const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
          const faint = clamp(0.35 + gain / 400, 0.35, 0.95);   // 口徑越大，看得到的暗星越多越亮
          const count = Math.round(18 + clamp(lm - 6, 0, 8) * 9);
          for (let i = 0; i < count; i++) {
            const sx = vx + (rnd() * 2 - 1) * vr, sy = vy + (rnd() * 2 - 1) * vr, sr = rnd() < 0.85 ? 0.8 : 1.3;
            ctx.fillStyle = "rgba(220,230,255," + (faint * (0.35 + rnd() * 0.65)).toFixed(3) + ")";
            ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
          }
          ctx.restore();
          const sep = clamp(46 / mag, 1.5, 40);              // 視間距隨倍率縮小
          const resLimit = clamp(res * 8, 1.5, 40);
          const bright = clamp(gain / 60, 0.25, 1);
          [[-1, "#ffe082"], [1, "#ffd54f"]].forEach(([s, c]) => {
            D.disc(ctx, vx + s * sep / 2, vy - 6, 5 * (0.5 + bright * 0.7), { fill: c, glow: c, glowSize: 8 * bright });
          });
          D.text(ctx, mag + "×", vx, vy + vr * 0.62, { color: "#fff", size: 13, align: "center", weight: "700" });
          D.text(ctx, sep < resLimit ? "已解析雙星" : "倍率不足/口徑不夠:兩星糊在一起", vx, vy + vr + 16,
            { color: sep < resLimit ? "#66bb6a" : PL.col("warn"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.60, H * 0.64, W * 0.34, H * 0.28, "口徑是第一關鍵");
          const rows = [
            ["集光力", "肉眼 ×" + PL.fmt(gain, 1)],
            ["極限星等", PL.fmt(lm, 1) + " 等"],
            ["解析極限", PL.fmt(res, 2) + "″"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.63, H * (0.72 + i * 0.09), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * (0.72 + i * 0.09), { color: PL.col("accent"), size: 11.5, align: "right", weight: "700" });
          });
          rGain.set(gain, 1); rLm.set(lm, 1); rRes.set(res, 2);
        }
      });
      const diaS = PL.ui.slider(ui.L.controls, { label: "口徑", min: 5, max: 30, step: 1, value: 10, unit: "cm", digits: 0 });
      const magS = PL.ui.slider(ui.L.controls, { label: "倍率", min: 10, max: 300, step: 10, value: 60, unit: "×", digits: 0 });
      PL.ui.note(ui.L.controls, "集光力與口徑平方成正比、解析度與口徑成正比;倍率只是把像放大——口徑不夠時放大只會得到更大的糊斑。");
      PL.ui.procedure(ui.L.controls, {
        title: "為什麼口徑優先於倍率",
        steps: [
          "口徑 5 → 20 cm:集光力變 16 倍,極限星等前進 3 等。",
          "倍率 60 → 240:雙星視距變大,但解析極限沒變。",
          "同時拉高口徑與倍率:視野裡真正分開了。"
        ],
        rule: "市售「600 倍望遠鏡」是行銷話術:超過口徑 2D 倍率(如 10 cm → 200×)後影像只會更暗更糊。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "雙筒(5cm/10×)", apply: () => { diaS.set(5); magS.set(10); } },
        { label: "入門鏡(10cm/100×)", apply: () => { diaS.set(10); magS.set(100); } },
        { label: "天文台級(30cm/300×)", apply: () => { diaS.set(30); magS.set(300); } }
      ] });
      const rGain = PL.ui.readout(ui.L.readouts, { label: "集光力", unit: "×肉眼" });
      const rLm = PL.ui.readout(ui.L.readouts, { label: "極限星等", unit: "等" });
      const rRes = PL.ui.readout(ui.L.readouts, { label: "解析極限", unit: "″" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 觀測條件與光害 */
  PL.register("observing-conditions", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const light = lightS.get();   // 0 鄉村暗夜 → 1 市中心
          const moon = moonS.get();     // 0 新月 → 1 滿月
          const horizon = H * 0.72;
          // 夜空:光害讓地平附近泛白
          const g = ctx.createLinearGradient(0, 0, 0, horizon);
          g.addColorStop(0, "#0a1220");
          g.addColorStop(1, mixSky(light));
          ctx.fillStyle = g;
          ctx.fillRect(0, 0, W, horizon);
          if (PL.apparatus.starfield) PL.apparatus.starfield(ctx, W, horizon * (1 - light * 0.35), 9);
          // 光害穹
          if (light > 0.15) {
            const lg = ctx.createRadialGradient(W * 0.5, horizon, 10, W * 0.5, horizon, W * 0.55);
            lg.addColorStop(0, "rgba(255,214,140," + 0.45 * light + ")");
            lg.addColorStop(1, "rgba(255,214,140,0)");
            ctx.fillStyle = lg;
            ctx.fillRect(0, 0, W, horizon);
          }
          // 月亮
          CK.moonPhase(ctx, W * 0.78, H * 0.18, 15, moon * 0.5, {});
          if (moon > 0.6) D.text(ctx, "滿月前後:深空天體全部被蓋掉", W * 0.78, H * 0.30, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 地景
          D.rect(ctx, 0, horizon, W, H - horizon, { fill: PL.theme.isLight() ? "rgba(96,118,86,0.95)" : "#141c18" });
          for (let i = 0; i < 5; i++) {
            const bx = W * (0.08 + i * 0.2), bh = 18 + (i % 3) * 10;
            D.rect(ctx, bx, horizon - bh, 30, bh, { fill: "#0d1310", stroke: "rgba(255,255,255,0.06)" });
            // 窗光
            for (let k = 0; k < Math.round(light * 6); k++) {
              D.rect(ctx, bx + 5 + (k % 3) * 9, horizon - bh + 5 + Math.floor(k / 3) * 8, 4, 4, { fill: "rgba(255,220,150,0.85)" });
            }
          }
          // 極限星等對照
          const lm = 6.5 - light * 3.4 - moon * 0.9;
          const starCount = Math.round(3000 * Math.pow(10, (lm - 6.5) * 0.6));
          CK.panel(ctx, W * 0.62, H * 0.10, W * 0.32, H * 0.56, "肉眼可見星數(全天)");
          const rows = [
            ["環境", light < 0.2 ? "暗夜鄉間" : light < 0.5 ? "郊山" : light < 0.8 ? "市區近郊" : "市中心"],
            ["極限星等", PL.fmt(lm, 1) + " 等"],
            ["可見星數", "約 " + starCount + " 顆"],
            ["銀河", lm > 5.6 ? "清晰可見" : lm > 4.5 ? "隱約可辨" : "完全不可見"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.65, H * (0.22 + i * 0.13), { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.92, H * (0.22 + i * 0.13), { color: i === 1 || i === 3 ? PL.col("accent") : PL.col("text"), size: 12, align: "right", weight: i === 3 ? "700" : "" });
          });
          D.text(ctx, light > 0.5 ? "改善照明(遮光罩+暖色溫)就能還給城市星空" : "絕佳觀測夜:避開月光、遠離城市", W * 0.78, H * 0.60, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rLight.set(light, 2); rLm.set(lm, 1); rCount.set(starCount, 0);
        }
      });
      const lightS = PL.ui.slider(ui.L.controls, { label: "光害程度", min: 0, max: 1, step: 0.05, value: 0.7, digits: 2 });
      const moonS = PL.ui.slider(ui.L.controls, { label: "月相(朔→滿)", min: 0, max: 1, step: 0.05, value: 0, digits: 2 });
      PL.ui.note(ui.L.controls, "同樣的夜空,市中心只能看到約 100 顆星、暗夜有數千顆。光害不是「燈太亮」這麼簡單——是光被空氣散射進視線;月亮則是暫時版的同樣效應。");
      PL.ui.procedure(ui.L.controls, {
        title: "規劃一次觀測",
        steps: [
          "先看月相:深空目標(星雲、星系)要選朔前後。",
          "再選地點:拉低光害,極限星等前進、星數暴增。",
          "兩者都差時:只能看行星與月亮——它們不怕光害。"
        ],
        rule: "星等差 5 等亮度差 100 倍;極限星等從 6.5 掉到 3,等於星空的 99% 直接消失。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "合歡山暗夜", apply: () => { lightS.set(0.05); moonS.set(0.05); } },
        { label: "市區賞月", apply: () => { lightS.set(0.9); moonS.set(1); } },
        { label: "郊山觀星", apply: () => { lightS.set(0.45); moonS.set(0.3); } }
      ] });
      const rLight = PL.ui.readout(ui.L.readouts, { label: "光害指數" });
      const rLm = PL.ui.readout(ui.L.readouts, { label: "極限星等", unit: "等" });
      const rCount = PL.ui.readout(ui.L.readouts, { label: "全天可見星數", unit: "顆" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 日食與月食 */
  PL.register("eclipse", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const kind = kindSel.get(); // solar / lunar
          const prog = progS.get();   // 0–1 食的過程
          CK.scene(ui.cv, { kind: "sky", night: kind === "lunar", horizon: 0.98 });
          if (kind === "solar") {
            // 日月地一線:月球影錐掃過地球
            const sx = W * 0.10, sy = H * 0.30;
            CK.sunIcon(ctx, sx, sy, 26, { glow: 20 });
            const eX = W * 0.86, eY = H * 0.52;
            const mX = lerp(W * 0.42, eX - 40, prog), mY = lerp(sy, eY, 0.42);
            // 本影錐
            const coneLen = W * 0.30;
            ctx.save();
            ctx.fillStyle = "rgba(10,14,24,0.55)";
            ctx.beginPath();
            ctx.moveTo(mX, mY - 14); ctx.lineTo(mX + coneLen, mY - 5); ctx.lineTo(mX + coneLen, mY + 5); ctx.lineTo(mX, mY + 14);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            CK.moonPhase(ctx, mX, mY, 14, 0.5, { label: "月球" });
            CK.globe(ctx, eX, eY, 42, { seed: 6 });
            // 本影帶
            if (prog > 0.15 && prog < 0.85) {
              const bx = eX - 34 + (prog - 0.5) * 60;
              D.ring(ctx, bx, eY, 10, "rgba(255,138,101,0.95)", 2.4);
              D.text(ctx, "本影帶(全食,寬約百餘公里)", bx, eY + 58, { color: "#ffab91", size: 10, align: "center" });
            }
            D.line(ctx, sx + 30, sy, eX, eY, "rgba(255,255,255,0.12)", 1.2, [4, 6]);
            rWhat.set("朔日:月球影子落在地球");
            rNote.set("本影帶僅數十至數百公里寬,全食持續數分鐘");
          } else {
            // 月食:地球影子吞月
            const eX = W * 0.16, eY = H * 0.34;
            CK.globe(ctx, eX, eY, 30, { seed: 6 });
            // 地球影錐(向右)
            ctx.save();
            ctx.fillStyle = "rgba(10,14,24,0.5)";
            ctx.beginPath();
            ctx.moveTo(eX + 28, eY - 26); ctx.lineTo(eX + 190, eY - 44); ctx.lineTo(eX + 190, eY + 44); ctx.lineTo(eX + 28, eY + 26);
            ctx.closePath(); ctx.fill();
            ctx.restore();
            const mx = lerp(W * 0.72, eX + 62, Math.abs(prog - 0.5) * 2);
            const inShadow = mx > eX + 44;
            const moonR = 16;
            if (inShadow && Math.abs(prog - 0.5) < 0.32) {
              // 血月
              D.disc(ctx, mx, eY + 6, moonR, { fill: "#b0503a", glow: "#8d3a26", glowSize: 12 });
              D.text(ctx, "血月:地球大氣折射紅光照亮月面", mx, eY + 40, { color: "#ffab91", size: 10, align: "center" });
            } else {
              CK.moonPhase(ctx, mx, eY + 6, moonR, 0.5, {});
            }
            D.text(ctx, "月球軌道", W * 0.72, H * 0.86, { color: PL.col("text-faint"), size: 10, align: "center" });
            D.line(ctx, W * 0.30, eY + 6, W * 0.94, eY + 6, "rgba(140,170,200,0.25)", 1.4, [4, 6]);
            rWhat.set("望日:月球走進地球影子");
            rNote.set("地影巨大,全食可持續一小時以上,半個地球同時可見");
          }
          CK.panel(ctx, W * 0.62, H * 0.70, W * 0.32, H * 0.24, "為什麼不是每個月都有");
          D.text(ctx, "月球軌道傾斜約 5°,多數時候影子錯開;只有朔/望落在交點附近才成食。", W * 0.78, H * 0.80, { color: PL.col("text-dim"), size: 10, align: "center" });
          rKind.set(kind === "solar" ? "日食(農曆初一)" : "月食(農曆十五)");
          rProg.set(Math.round(prog * 100), 0);
        }
      });
      const kindSel = PL.ui.select(ui.L.controls, { label: "食的種類", value: "solar", options: [
        { value: "solar", label: "日食(朔)" }, { value: "lunar", label: "月食(望)" }
      ] });
      const progS = PL.ui.slider(ui.L.controls, { label: "食的過程", min: 0, max: 1, step: 0.02, value: 0.5, digits: 2 });
      PL.ui.note(ui.L.controls, "日食是月影掃過地球(本影帶窄、全食短);月食是月球鑽進地影(影大、全食久)。兩者分別需要朔與望加上軌道交點的巧合。");
      PL.ui.procedure(ui.L.controls, {
        title: "對比兩種食",
        steps: [
          "日食:拖動過程,看本影帶橫掃地表——只在帶內可見全食。",
          "月食:看月球進入地影變成血月,半個地球一起看。",
          "想想:為什麼日全食比月全食罕見得多?"
        ],
        rule: "觀測日食必須用專用濾鏡;全食階段才可肉眼直視——這是天文觀測唯一的安全鐵律。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "全食中", apply: () => progS.set(0.5) },
        { label: "食甚前", apply: () => progS.set(0.3) },
        { label: "未食", apply: () => progS.set(0.02) }
      ] });
      const rKind = PL.ui.readout(ui.L.readouts, { label: "食象" });
      const rProg = PL.ui.readout(ui.L.readouts, { label: "過程", unit: "%" });
      const rWhat = PL.ui.readout(ui.L.readouts, { label: "幾何條件" });
      const rNote = PL.ui.readout(ui.L.readouts, { label: "特徵" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 歲差 */
  PL.register("precession", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const year = yearS.get(); // -3000 → 15000
          // 地軸在 2.6 萬年裡掃出的圓錐
          const cx = W * 0.30, cy = H * 0.52;
          const coneR = H * 0.26;
          // 掃掠圓
          D.ring(ctx, cx, cy, coneR, "rgba(149,117,205,0.35)", 1.6, [5, 5]);
          // 地球
          CK.globe(ctx, cx, cy, H * 0.15, { tilt: 23.5, showAxis: true, seed: 6 });
          // 軸指向的星(依年代)
          const idx = clamp(Math.round((year + 3000) / 26000 * 8), 0, 8);
          const POLE_STARS = ["天龍座 α(右樞)", "北極星(小熊座 α)", "少衛增八(仙王座 γ)", "織女星(西元 13,700 年)"];
          const a = (year + 3000) / 26000 * TAU;
          const px = cx + Math.cos(a - Math.PI / 2) * coneR;
          const py = cy + Math.sin(a - Math.PI / 2) * coneR;
          // 軸延長線
          D.line(ctx, cx, cy, px, py, "rgba(120,180,240,0.6)", 2, [5, 4]);
          D.disc(ctx, px, py, 4.5, { fill: "#fff8c4", glow: "#ffe082", glowSize: 10 });
          D.text(ctx, POLE_STARS[Math.min(3, Math.floor(idx / 2.2))], px + 10, py, { color: PL.col("text"), size: 10.5 });
          // 資料卡
          CK.panel(ctx, W * 0.62, H * 0.12, W * 0.32, H * 0.62, "歲差小檔案");
          const rows = [
            ["週期", "約 25,772 年"],
            ["成因", "日月對赤道隆起的力矩"],
            ["類比", "陀螺進動"],
            ["影響", "北極星輪替、季節起點後移"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.65, H * (0.24 + i * 0.14), { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.92, H * (0.24 + i * 0.14) - 1, { color: i === 0 ? PL.col("accent") : PL.col("text"), size: 11, align: "right", weight: i === 0 ? "700" : "" });
          });
          D.text(ctx, "西元前 2,800 年的「北極星」是天龍座 α;", W * 0.78, H * 0.66, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          D.text(ctx, "13,700 年後將輪到織女星", W * 0.78, H * 0.70, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rYear.set(year, 0); rStar.set(POLE_STARS[Math.min(3, Math.floor(idx / 2.2))]);
          rTilt.set(23.5, 1);
        }
      });
      const yearS = PL.ui.slider(ui.L.controls, { label: "西元年", min: -3000, max: 15000, step: 100, value: 2000, digits: 0 });
      PL.ui.note(ui.L.controls, "地軸像傾斜的陀螺:自轉軸以約 2.6 萬年畫一圈。「北極星」只是暫時的頭銜——古埃及人用天龍座 α 定北,未來會換織女星。");
      PL.ui.procedure(ui.L.controls, {
        title: "看北極換人",
        steps: [
          "回到西元前 3,000 年:軸指向天龍座 α(金字塔時代)。",
          "拉到 2,000 年:現在的北極星(小熊座 α)。",
          "推到 14,000 年:織女星將成為北極星。",
          "注意傾角 23.5° 不變——變的是指向,不是傾斜量。"
        ],
        rule: "歲差改變「軸指向哪顆星」與「季節起點在軌道上的位置」,但不改變黃赤交角本身。"
      });
      PL.ui.presets(ui.L.controls, { label: "年代", options: [
        { label: "金字塔時代", apply: () => yearS.set(-2800) },
        { label: "現在", apply: () => yearS.set(2000) },
        { label: "織女星時代", apply: () => yearS.set(13700) }
      ] });
      const rYear = PL.ui.readout(ui.L.readouts, { label: "西元年" });
      const rStar = PL.ui.readout(ui.L.readouts, { label: "當時的北極星" });
      const rTilt = PL.ui.readout(ui.L.readouts, { label: "黃赤交角", unit: "°" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 光害漸層色 */
  function mixSky(light) {
    const c1 = [10, 18, 32], c2 = [140, 150, 165];
    const f = clamp(light, 0, 1);
    return "rgb(" + c1.map((c, i) => Math.round(lerp(c, c2[i], f))).join(",") + ")";
  }
})();
