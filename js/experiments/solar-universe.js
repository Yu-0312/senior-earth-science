/* 模組十一 · 太陽系與恆星 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 月相的成因與週期 */
  PL.register("moon-phases", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const day = dayS.get(); // 朔望月 0–29.5 天
          const phase = (day / 29.5) % 1;
          // 幾何圖:地球中心、月球繞行、太陽在右
          const cx = W * 0.30, cy = H * 0.50;
          const orbR = H * 0.30;
          D.ring(ctx, cx, cy, orbR, "rgba(140,170,200,0.35)", 1.4, [4, 5]);
          CK.globe(ctx, cx, cy, H * 0.075, { seed: 6 });
          D.text(ctx, "地球", cx, cy + H * 0.075 + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
          CK.sunIcon(ctx, W * 0.90, cy, 20, { time: t });
          D.line(ctx, W * 0.90 - 26, cy, W * 0.62, cy, "rgba(255,202,40,0.25)", 1.6, [5, 6]);
          D.text(ctx, "陽光", W * 0.90, cy - 30, { color: "#ffca28", size: 10.5, align: "center" });
          // 月球位置(朔在右,逆時針)
          const a = -phase * TAU;
          const mx = cx + Math.cos(a) * orbR, my = cy + Math.sin(a) * orbR;
          // 從地球看月球的亮面比例
          CK.moonPhase(ctx, mx, my, 15, phase, {});
          D.text(ctx, "農曆 " + Math.round(day + 1), mx, my + 30, { color: PL.col("text"), size: 10, align: "center" });
          // 名稱
          const names = [[0, "朔(新月)"], [0.25, "上弦"], [0.5, "滿(望)"], [0.75, "下弦"]];
          let label = "峨眉月/凸月";
          for (const [p, n] of names) if (Math.abs(phase - p) < 0.04) label = n;
          // 放大視野:當晚看到的月相
          const vx = W * 0.66, vy = H * 0.34;
          D.disc(ctx, vx, vy, H * 0.15, { fill: "rgba(10,16,26,0.9)", stroke: PL.col("border"), width: 2 });
          CK.moonPhase(ctx, vx, vy, H * 0.115, phase, {});
          D.text(ctx, label, vx, vy + H * 0.15 + 20, { color: PL.col("accent"), size: 12.5, align: "center", weight: "700" });
          CK.panel(ctx, W * 0.62, H * 0.58, W * 0.32, H * 0.34, "兩個月週期");
          const rows = [
            ["朔望月(月相)", "29.5 天"],
            ["恆星月(繞地一圈)", "27.3 天"],
            ["差值原因", "地球同時在繞太陽"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.65, H * (0.66 + i * 0.11), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * (0.66 + i * 0.11), { color: i === 0 ? PL.col("accent") : PL.col("text"), size: 11.5, align: "right", weight: i === 0 ? "700" : "" });
          });
          rDay.set(day, 1); rPhase.set(label); rVis.set(Math.round(Math.abs(Math.sin(phase * TAU)) * 100), 0);
        }
      });
      const dayS = PL.ui.slider(ui.L.controls, { label: "朔望月日數", min: 0, max: 29.5, step: 0.5, value: 7, unit: "天", digits: 1 });
      PL.ui.note(ui.L.controls, "月相是「太陽照亮半球」與「我們看到半球」的交集:朔時月球在日地之間(暗面朝我們),望時在地球外側(亮面朝我們)。");
      PL.ui.procedure(ui.L.controls, {
        title: "走完一個月",
        steps: [
          "第 0 天(朔):月球在日地之間,整夜看不見。",
          "第 7.4 天(上弦):黃昏見於南方,亮面朝西。",
          "第 14.8 天(望):日月相對,整夜可見。",
          "29.5 天回到朔——農曆一個月就是這麼來的。"
        ],
        rule: "亮面永遠朝向太陽:上弦亮在西(右)、下弦亮在東(左),這是判斷月亮出沒時刻的捷徑。"
      });
      PL.ui.presets(ui.L.controls, { label: "月相", options: [
        { label: "朔(初一)", apply: () => dayS.set(0) },
        { label: "上弦(初七)", apply: () => dayS.set(7.4) },
        { label: "滿月(十五)", apply: () => dayS.set(14.8) }
      ] });
      const rDay = PL.ui.readout(ui.L.readouts, { label: "月齡", unit: "天" });
      const rPhase = PL.ui.readout(ui.L.readouts, { label: "月相名稱" });
      const rVis = PL.ui.readout(ui.L.readouts, { label: "可見亮面", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 類地與類木行星 */
  PL.register("planets", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const pick = pickSel.get();
          CK.scene(ui.cv, { kind: "sky", night: true, horizon: 0.99 });
          /*
           * 八大行星都要在：選單寫「全部八顆」、「類地(內側四顆)」，以前卻只畫了六顆（少了金星與天王星）。
           * tone 是 RGB 陣列：PL.apparatus.planet() 用陣列解構取色，傳 "#rrggbb" 字串會變成 NaN，
           * addColorStop 直接丟例外，整個畫面停在空白的夜空（2026-11 前這個實驗一打開就是空的）。
           */
          const PLANETS = [
            { name: "水星", kind: "rock", r: 12, tone: [184, 169, 154], density: 5.4 },
            { name: "金星", kind: "rock", r: 14, tone: [226, 196, 140], density: 5.2 },
            { name: "地球", kind: "earth", r: 14, tone: [93, 168, 221], density: 5.5 },
            { name: "火星", kind: "rock", r: 11, tone: [217, 123, 82], density: 3.9 },
            { name: "木星", kind: "gas", r: 30, tone: [217, 160, 106], density: 1.3 },
            { name: "土星", kind: "gas", r: 26, tone: [232, 214, 160], density: 0.7 },
            { name: "天王星", kind: "ice", r: 20, tone: [134, 206, 214], density: 1.3 },
            { name: "海王星", kind: "ice", r: 20, tone: [90, 127, 217], density: 1.6 }
          ];
          // 排一排(大小誇大;窄畫布等比縮小,土星環不撞木星)
          const n = PLANETS.length, gap = 0.86 / (n - 1), k = Math.min(1, W / 760);
          const px = i => W * (0.07 + i * gap);
          const narrow = W < 600;   // 手機寬：八顆的密度標籤會互相重疊，單位改寫在下方分組標籤
          PLANETS.forEach((p, i) => {
            const x = px(i), r = p.r * k;
            const y = H * (pick === "all" ? 0.30 : 0.34);
            const active = pick === "all" || (pick === "terrestrial" && p.kind !== "gas" && p.kind !== "ice") || (pick === "gas" && (p.kind === "gas" || p.kind === "ice"));
            ctx.save();
            ctx.globalAlpha = active ? 1 : 0.22;
            if (PL.apparatus.planet) PL.apparatus.planet(ctx, x, y, r, p.tone, p.kind === "earth" ? "earth" : p.kind === "rock" ? "rock" : "gas");
            else D.disc(ctx, x, y, r, { fill: "rgb(" + p.tone.join(",") + ")" });
            if (p.name === "土星") D.ring(ctx, x, y, r + 8 * k, "rgba(230,220,180,0.85)", 3);
            ctx.restore();
            // 背景永遠是夜空：標籤用固定的亮色（主題色在淺色主題是深字，疊在夜空上幾乎看不見）
            const lr = p.name === "土星" ? r + 8 * k + 3 : r;   // 土星環外再放字，不壓到環
            D.text(ctx, p.name, x, y + lr + 18, { color: active ? "#eef3fb" : "rgba(238,243,251,0.42)", size: 11, align: "center", weight: "700" });
            D.text(ctx, p.density + (narrow ? "" : " g/cm³"), x, y + lr + 32, { color: active ? "rgba(214,224,240,0.85)" : "rgba(214,224,240,0.4)", size: 9, align: "center" });
          });
          // 分界線:小行星帶
          const bx = (px(3) + px(4)) / 2;   // 火星與木星之間
          D.line(ctx, bx, H * 0.16, bx, H * 0.52, "rgba(255,138,101,0.5)", 1.6, [4, 5]);
          D.text(ctx, "小行星帶", bx, H * 0.14, { color: "#ffab91", size: 10, align: "center" });
          D.text(ctx, "← 類地(岩石金屬)", bx - 12, H * 0.58, { color: "rgba(214,224,240,0.85)", size: 10.5, align: "right" });
          D.text(ctx, "類木(氣冰)→", bx + 12, H * 0.58, { color: "rgba(214,224,240,0.85)", size: 10.5, align: "left" });
          if (narrow) D.text(ctx, "密度單位:g/cm³", W * 0.03, H * 0.08, { color: "rgba(214,224,240,0.75)", size: 9.5, align: "left" });
          // 資料卡
          const isInner = p => p.kind === "rock" || p.kind === "earth";
          const group = pick === "all" ? null : PLANETS.filter(p => pick === "terrestrial" ? isInner(p) : !isInner(p));
          // 代表密度取該組平均,而不是剛好排第一顆的那顆
          const meanRho = group ? group.reduce((a, p) => a + p.density, 0) / group.length : null;
          // 卡片寬度要放得下最長的一句（約 19 個字 × 10px）；手機寬改成橫跨整個畫布
          const cw = narrow ? W * 0.9 : Math.max(W * 0.32, 230), cx0 = narrow ? W * 0.05 : W * 0.94 - cw;
          CK.panel(ctx, cx0, H * 0.66, cw, H * 0.28, "成因一句話");
          D.text(ctx, "雪線以內太熱:冰與氣無法凝結,", cx0 + cw / 2, H * 0.76, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "只能靠岩石金屬吸積成小而密的類地行星;", cx0 + cw / 2, H * 0.82, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "雪線外先長出冰核,再吸大量氫氦成巨行星。", cx0 + cw / 2, H * 0.88, { color: PL.col("text-dim"), size: 10, align: "center" });
          rPick.set(pick === "all" ? "八大行星(對比)" : pick === "terrestrial" ? "類地行星:小、密、岩石" : "類木行星:大、輕、氣冰");
          rRho.set(meanRho != null ? meanRho : 5.5, 1);
        }
      });
      const pickSel = PL.ui.select(ui.L.controls, { label: "分組", value: "all", options: [
        { value: "all", label: "全部八顆" }, { value: "terrestrial", label: "類地(內側四顆)" }, { value: "gas", label: "類木(外側四顆)" }
      ] });
      PL.ui.note(ui.L.controls, "類地與類木的分界是小行星帶(雪線遺跡):內側高溫只留岩石,外側低溫能累積冰與氣——一條溫度線決定了太陽系的布局。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀行星的密度",
        steps: [
          "類地:水星 5.4、金星 5.2、地球 5.5、火星 3.9 g/cm³——岩石金屬的密度。",
          "類木:木星 1.3、土星 0.7、天王星 1.3、海王星 1.6 g/cm³——土星比水還輕!",
          "分界就在小行星帶:那裡是「沒長成行星」的原始材料。"
        ],
        rule: "類木沒有「表面」:木星的大紅斑底下沒有陸地,只有越深越密的氫氦。"
      });
      const rPick = PL.ui.readout(ui.L.readouts, { label: "顯示" });
      const rRho = PL.ui.readout(ui.L.readouts, { label: "代表密度", unit: "g/cm³" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 克卜勒行星運動定律 */
  PL.register("kepler-laws", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ecc = eccS.get();
          const aAU = aS.get();
          // 第一律:橢圓軌道
          const box = { x: W * 0.06, y: H * 0.10, w: W * 0.50, h: H * 0.62 };
          D.rect(ctx, box.x, box.y, box.w, box.h, { fill: PL.theme.isLight() ? "rgba(64,88,120,0.30)" : "rgba(20,28,40,0.5)", stroke: PL.col("border"), r: 8 });
          const orb = CK.orbitEllipse(ctx, { x: box.x + box.w * 0.14, y: box.y + box.h * 0.12, w: box.w * 0.72, h: box.h * 0.76 }, { ecc, showAxes: true });
          // 第二律:行星沿軌道跑,近日快遠日慢(角動量守恆)
          const T = Math.pow(aAU, 1.5);   // 第三律 T²=a³
          const theta = ((t * 0.35 / T) % 1) * TAU * 3;
          const rr = orb.a * (1 - ecc * ecc) / (1 + ecc * Math.cos(theta));
          const px = orb.fx + rr * Math.cos(theta) * 1.0;
          const py = orb.cy + rr * Math.sin(theta);
          const pos = orb.planetPos(theta, 7);
          // 掃過面積扇形
          ctx.save();
          ctx.fillStyle = "rgba(102,187,106,0.18)";
          ctx.beginPath();
          ctx.moveTo(orb.fx, orb.cy);
          for (let th = theta - 0.5; th <= theta; th += 0.05) {
            const r2 = orb.a * (1 - ecc * ecc) / (1 + ecc * Math.cos(th));
            ctx.lineTo(orb.fx + r2 * Math.cos(th), orb.cy + r2 * Math.sin(th));
          }
          ctx.closePath(); ctx.fill();
          ctx.restore();
          D.text(ctx, "等時間掃過等面積(綠色扇形)", orb.fx + orb.a * 0.4, orb.cy + orb.b + 16, { color: "#a5d6a7", size: 10, align: "center" });
          // 第三律對照表
          CK.panel(ctx, W * 0.60, H * 0.10, W * 0.34, H * 0.56, "第三律:T² = a³");
          const ROWS = [["水星", 0.39], ["金星", 0.72], ["地球", 1.0], ["火星", 1.52], ["木星", 5.2]];
          ROWS.forEach(([name, a], i) => {
            const Tp = Math.pow(a, 1.5);
            const y = H * (0.20 + i * 0.09);
            D.text(ctx, name, W * 0.63, y, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, a.toFixed(2) + " AU", W * 0.80, y, { color: PL.col("text"), size: 10.5, align: "right" });
            D.text(ctx, Tp.toFixed(2) + " 年", W * 0.92, y, { color: Math.abs(aAU - a) < 0.3 ? PL.col("accent") : PL.col("text-faint"), size: 10.5, align: "right", weight: Math.abs(aAU - a) < 0.3 ? "700" : "" });
          });
          D.text(ctx, "a = " + aAU.toFixed(1) + " AU → T = " + Math.pow(aAU, 1.5).toFixed(1) + " 年", W * 0.77, H * 0.74, { color: PL.col("accent-2"), size: 12, align: "center", weight: "700" });
          rEcc.set(ecc, 2); rT.set(T, 2); rSpeed.set(1 + ecc * 2.4, 2);
        }
      });
      const eccS = PL.ui.slider(ui.L.controls, { label: "軌道偏心率", min: 0, max: 0.8, step: 0.05, value: 0.3, digits: 2 });
      const aS = PL.ui.slider(ui.L.controls, { label: "半長軸", min: 0.4, max: 5.2, step: 0.1, value: 1.0, unit: "AU", digits: 1 });
      PL.ui.note(ui.L.controls, "三條律一句話:軌道是橢圓(太陽在焦點)、近日快遠日慢(角動量守恆)、T² = a³(週期由大小決定)。牛頓的萬有引力把三條全部推出來。");
      PL.ui.procedure(ui.L.controls, {
        title: "逐一驗證三定律",
        steps: [
          "拉偏心率:太陽離開圓心,跑到焦點(第一律)。",
          "看行星通過近日點時的扇形:又窄又長但同面積(第二律)。",
          "改半長軸 4 AU:週期變 8 年——T² = 4³(第三律)。"
        ],
        rule: "第二律就是角動量守恆的幾何版;第三律讓人類第一次能用「時間」量出「距離」。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "圓軌道(地球型)", apply: () => { eccS.set(0); aS.set(1); } },
        { label: "彗星型軌道", apply: () => { eccS.set(0.7); aS.set(5.2); } }
      ] });
      const rEcc = PL.ui.readout(ui.L.readouts, { label: "偏心率" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "公轉週期", unit: "年" });
      const rSpeed = PL.ui.readout(ui.L.readouts, { label: "近日/遠日速比" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 小行星、彗星與太陽系邊界 */
  PL.register("asteroids-comets", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const obj = objSel.get();
          const sunX = W * 0.20, sunY = H * 0.46;
          CK.sunIcon(ctx, sunX, sunY, 18, { time: t });
          if (obj === "belt") {
            // 小行星帶
            const bx = W * 0.52, by = H * 0.46, bw = W * 0.34, bh = H * 0.44;
            D.ring(ctx, bx, by, bw * 0.5, "rgba(150,160,170,0.2)", 24);
            for (let i = 0; i < 40; i++) {
              const a = (i * 2.39996 + t * 0.02) % TAU;
              const rr = bw * 0.5 * (0.8 + ((i * 37) % 10) / 25);
              D.disc(ctx, bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.75, 1.4 + (i % 3), { fill: "#9aa4ad" });
            }
            D.text(ctx, "小行星帶(火星與木星之間)", bx, by - bh * 0.5 - 14, { color: PL.col("text-dim"), size: 10.5, align: "center" });
            D.text(ctx, "木星的重力攪動,讓這裡的材料永遠湊不成行星", bx, by + bh * 0.5 + 16, { color: PL.col("text-faint"), size: 10, align: "center" });
          } else {
            // 彗星:橢圓軌道 + 彗尾背向太陽
            const orbit = CK.orbitEllipse(ctx, { x: W * 0.16, y: H * 0.10, w: W * 0.74, h: H * 0.72 }, { ecc: 0.75, color: "rgba(140,190,230,0.5)" });
            const th = ((t * 0.1) % 1) * TAU;
            const [cx2, cy2] = orbit.planetPos(th, 6);
            // 離日距離決定彗尾
            const dist = Math.hypot(cx2 - sunX, cy2 - sunY);
            const near = clamp(1 - (dist - 60) / 260, 0.15, 1);
            const away = Math.atan2(cy2 - sunY, cx2 - sunX);
            // 離子尾(直)與塵尾(彎)
            D.arrow(ctx, cx2, cy2, cx2 + Math.cos(away) * 60 * near, cy2 + Math.sin(away) * 60 * near, { color: "rgba(120,190,255,0.85)", width: 3 });
            D.arrow(ctx, cx2, cy2, cx2 + Math.cos(away + 0.35) * 44 * near, cy2 + Math.sin(away + 0.35) * 44 * near, { color: "rgba(255,224,178,0.7)", width: 2.4, dash: [4, 4] });
            D.disc(ctx, cx2, cy2, 6, { fill: "#dff3ff", glow: "#81d4fa", glowSize: 10 });
            D.text(ctx, near > 0.55 ? "近日:冰昇華,雙尾開展" : "遠日:冰凍結,只剩髒雪球", cx2, cy2 + 26, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.text(ctx, "離子尾(背向太陽)", cx2 + Math.cos(away) * 66 * near, cy2 + Math.sin(away) * 66 * near + 4, { color: "#81d4fa", size: 9 });
            D.text(ctx, "塵尾(沿軌道)", cx2 + Math.cos(away + 0.35) * 50 * near, cy2 + Math.sin(away + 0.35) * 50 * near + 4, { color: "#ffe082", size: 9 });
          }
          CK.panel(ctx, W * 0.62, H * 0.72, W * 0.32, H * 0.22, "三兄弟的差別");
          const rows = [
            ["小行星", "岩石金屬,帶內繞行"],
            ["彗星", "冰+塵,長橢圓軌道"],
            ["隕石", "落到地面的碎片樣本"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.65, H * (0.78 + i * 0.07), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * (0.78 + i * 0.07), { color: PL.col("text"), size: 10, align: "right" });
          });
          rObj.set(obj === "belt" ? "小行星帶" : "長週期彗星");
          rAge.set("45.6 億年");
        }
      });
      const objSel = PL.ui.select(ui.L.controls, { label: "天體", value: "belt", options: [
        { value: "belt", label: "小行星帶" }, { value: "comet", label: "彗星軌道" }
      ] });
      PL.ui.note(ui.L.controls, "小行星是「沒長成行星」的原始材料;彗星帶著太陽系邊緣的冰,靠近太陽才甦醒。隕石是免費送貨上門的 45.6 億年前樣本。");
      PL.ui.procedure(ui.L.controls, {
        title: "看彗尾的方向",
        steps: [
          "看彗星繞行:永遠有兩條尾——離子尾直指背陽方向。",
          "近日時尾最長:冰昇華最猛。",
          "遠日時:收縮成一顆髒雪球。",
          "切到小行星帶:同一片太陽系的兩種命運。"
        ],
        rule: "彗尾不是「飛出來的軌跡」,是被太陽風與光壓吹出來的——所以再快也永遠背向太陽。"
      });
      const rObj = PL.ui.readout(ui.L.readouts, { label: "天體" });
      const rAge = PL.ui.readout(ui.L.readouts, { label: "樣本年齡" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 恆星的生命週期 */
  PL.register("star-lifecycle", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const M = massS.get(); // 太陽質量倍數 0.3–20
          const STAGES = [
            { name: "分子雲塌縮", desc: "重力把氣體塵埃拉聚,核心升溫", ms: 0 },
            { name: "主序星", desc: "氫融合點燃,穩定燃燒", ms: 1 },
            { name: M > 8 ? "紅超巨星" : "紅巨星", desc: "核心氫耗盡,外層膨脹變紅", ms: 2 },
            { name: M > 8 ? "超新星爆炸" : "行星狀星雲", desc: M > 8 ? "核心鐵化,一次炸開" : "外層飄散,露出核心", ms: 3 },
            { name: M > 8 ? (M > 20 ? "黑洞" : "中子星") : "白矮星", desc: M > 8 ? "殘骸極端緻密" : "餘燼緩慢冷卻", ms: 4 }
          ];
          const stage = stageS.get();
          const st = STAGES[stage];
          // 畫當前階段的恆星
          const cx = W * 0.30, cy = H * 0.48;
          // 質量驅動主序星的大小與溫度色(越大越熱越藍)
          const sizeR = [16, 14 + M * 1.8, 34 + M * 2.4, stage === 3 && M > 8 ? 70 : 34, 10 + M][stage];
          const color = stage === 0 ? "#8a7a9c" : stage === 1 ? (M > 8 ? "#bfe0ff" : M > 2 ? "#fff8e1" : "#ffd54f") : stage === 2 ? "#ff8a65" : stage === 3 ? "#fff3e0" : "#cfd8dc";
          if (stage === 0) {
            for (let i = 0; i < 26; i++) {
              const a = i * 2.4, rr = 40 * Math.sqrt((i + 0.5) / 26);
              D.disc(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 2.5, { fill: "rgba(180,160,200,0.85)" });
            }
            D.arrow(ctx, cx + 50, cy - 30, cx + 8, cy - 6, { color: PL.col("accent"), width: 2 });
            D.text(ctx, "重力收縮中", cx + 64, cy - 34, { color: PL.col("text-faint"), size: 10 });
          } else if (stage === 3 && M > 8) {
            for (let i = 0; i < 16; i++) {
              const a = i / 16 * TAU + t * 0.5;
              const rr = 60 * (0.6 + (i % 4) * 0.18);
              D.disc(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 3, { fill: "rgba(255,180,120,0.9)", glow: "#ff7043", glowSize: 6 });
            }
            D.disc(ctx, cx, cy, 9, { fill: "#fff", glow: "#fff", glowSize: 16 });
          } else {
            D.disc(ctx, cx, cy, sizeR, { fill: color, glow: color, glowSize: 18 });
            if (stage === 2) D.text(ctx, M > 8 ? "紅超巨星" : "紅巨星", cx, cy + sizeR + 20, { color: color, size: 11, align: "center" });
          }
          // 生命線
          const lx = W * 0.56, ly = H * 0.80, lw = W * 0.38;
          D.line(ctx, lx, ly, lx + lw, ly, PL.col("border"), 3);
          STAGES.forEach((s, i) => {
            const x = lx + lw * i / 4;
            D.disc(ctx, x, ly, i === stage ? 8 : 4.5, { fill: i <= stage ? PL.col("accent") : PL.theme.shade(0.6) });
            if (i === stage) {
              D.line(ctx, x, ly - 8, x, ly - 26, PL.col("accent"), 1.4);
              D.text(ctx, s.name, x, ly - 32, { color: PL.col("accent"), size: 10.5, align: "center", weight: "700" });
            }
          });
          const life = Math.pow(M, -2.5) * 10; // 主序期(Gyr)
          CK.panel(ctx, W * 0.58, H * 0.12, W * 0.36, H * 0.56, "質量決定命運");
          const rows = [
            ["質量", M.toFixed(1) + " M☉"],
            ["主序期", life >= 1 ? life.toFixed(0) + " 十億年" : (life * 1000).toFixed(0) + " 百萬年"],
            ["結局", M > 20 ? "黑洞" : M > 8 ? "中子星" : "白矮星"],
            ["溫度", M > 8 ? "藍白高溫" : "黃/紅"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.61, H * (0.22 + i * 0.13), { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.92, H * (0.22 + i * 0.13), { color: i === 1 || i === 2 ? PL.col("accent") : PL.col("text"), size: 11.5, align: "right", weight: i === 2 ? "700" : "" });
          });
          D.text(ctx, "太陽(1 M☉)的主序期約 100 億年", W * 0.76, H * 0.76, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rMass.set(M, 1); rLife.set(life, 2); rStage.set(st.name); rEnd.set(M > 20 ? "黑洞" : M > 8 ? "中子星" : "白矮星");
        }
      });
      const massS = PL.ui.slider(ui.L.controls, { label: "恆星質量", min: 0.3, max: 20, step: 0.1, value: 1, unit: "M☉", digits: 1 });
      const stageS = PL.ui.slider(ui.L.controls, { label: "演化階段", min: 0, max: 4, step: 1, value: 1, digits: 0 });
      PL.ui.note(ui.L.controls, "恆星的一生是一場重力與核融合的拔河:質量越大燒越猛、死越快。太陽能燒 100 億年,20 倍質量的巨星只活幾百萬年。");
      PL.ui.procedure(ui.L.controls, {
        title: "跑兩種人生",
        steps: [
          "質量 1 M☉:雲→主序 100 億年→紅巨星→星雲→白矮星。",
          "質量 15 M☉:同樣五階,但結局變成超新星與中子星。",
          "對照主序期讀數:質量 ×15,壽命剩 1/800。"
        ],
        rule: "重元素(碳、氧、鐵)都來自恆星內部與超新星——「我們是星星的灰燼」是字面意義。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "太陽的一生", apply: () => massS.set(1) },
        { label: "巨星的一生", apply: () => massS.set(15) },
        { label: "紅矮星", apply: () => massS.set(0.3) }
      ] });
      const rMass = PL.ui.readout(ui.L.readouts, { label: "質量", unit: "M☉" });
      const rLife = PL.ui.readout(ui.L.readouts, { label: "主序期", unit: "Gyr" });
      const rStage = PL.ui.readout(ui.L.readouts, { label: "階段" });
      const rEnd = PL.ui.readout(ui.L.readouts, { label: "最終結局" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 赫羅圖 */
  PL.register("hr-diagram", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mode = modeSel.get();
          // 赫羅圖底板
          const hr = CK.hrDiagram(ctx, { x: W * 0.05, y: H * 0.08, w: W * 0.56, h: H * 0.80 }, {});
          // 標記選中的恆星
          const STARS = {
            sun: { T: 5800, L: 0.6, name: "太陽", note: "G 型主序星,黃矮星" },
            betelgeuse: { T: 3600, L: 4.2, name: "參宿四", note: "紅超巨星,即將爆炸" },
            sirius: { T: 9900, L: 1.4, name: "天狼星", note: "A 型主序星,全天最亮" },
            siriusB: { T: 25000, L: -3.4, name: "天狼伴星", note: "白矮星:小而熱而暗" },
            betelgeuse2: null
          };
          const key = starSel.get();
          const st = STARS[key];
          if (st) {
            const x = hr.X(st.T), y = hr.Y(st.L);
            D.disc(ctx, x, y, 7, { fill: "#ff7043", glow: "#ff5722", glowSize: 10 });
            D.ring(ctx, x, y, 12, "#ffab91", 1.6);
            D.line(ctx, x + 12, y, x + 26, y - 14, "rgba(255,171,145,0.8)", 1.2);
            D.text(ctx, st.name, x + 28, y - 14, { color: PL.col("text"), size: 10.5 });
          }
          // 主序帶上的樣本星
          if (mode !== "stars") {
            [[30000, 4.5], [15000, 3.2], [9000, 1.8], [7000, 0.8], [5800, 0.5], [4500, -0.6], [3200, -2.2]].forEach(([T, L]) => {
              D.disc(ctx, hr.X(T), hr.Y(L), 2.4, { fill: "rgba(255,255,255,0.85)" });
            });
          }
          CK.panel(ctx, W * 0.66, H * 0.12, W * 0.28, H * 0.68, "怎麼讀這張圖");
          const rows = [
            ["橫軸", "溫度(左熱右冷)"],
            ["縱軸", "光度(下暗上亮)"],
            ["主序帶", "90% 恆星的一生日常"],
            ["右上", "巨大明亮的紅巨星"],
            ["左下", "小而熱的白矮星"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.69, H * (0.20 + i * 0.13), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * (0.20 + i * 0.13), { color: i === 2 ? PL.col("accent") : PL.col("text"), size: 10.5, align: "right" });
          });
          D.text(ctx, st ? st.name + ":" + st.note : "選一顆星定位它的演化階段", W * 0.80, H * 0.86, { color: PL.col("accent-2"), size: 10.5, align: "center", weight: "700" });
          rStar.set(st ? st.name : "—");
          rT.set(st ? st.T : 0, 0); rL.set(st ? Math.pow(10, st.L) : 1, 2);
        }
      });
      const modeSel = PL.ui.select(ui.L.controls, { label: "顯示", value: "stars", options: [
        { value: "stars", label: "只看選定星" }, { value: "samples", label: "加主序樣本" }
      ] });
      const starSel = PL.ui.select(ui.L.controls, { label: "恆星", value: "sun", options: [
        { value: "sun", label: "太陽" }, { value: "sirius", label: "天狼星" },
        { value: "betelgeuse", label: "參宿四(紅超巨星)" }, { value: "siriusB", label: "天狼伴星(白矮星)" }
      ] });
      PL.ui.note(ui.L.controls, "赫羅圖是恆星的身分證:一顆星的溫度與光度一標上去,它在「哪個人生階段」就現形——主序、巨星或白矮星各占一區。");
      PL.ui.procedure(ui.L.controls, {
        title: "四顆星四種命運",
        steps: [
          "太陽:主序帶中段,平凡而穩定。",
          "天狼星:主序帶左上——比太陽熱、亮、重。",
          "參宿四:跳到右上=膨脹成紅超巨星,瀕臨爆炸。",
          "天狼伴星:沉到左下=燒完的白矮星,小而熱而暗。"
        ],
        rule: "巨星不是「年輕的大恆星」,是「燒完氫正在膨脹」的中老年星——右上角是臨終病房,不是嬰兒房。"
      });
      const rStar = PL.ui.readout(ui.L.readouts, { label: "恆星" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "表面溫度", unit: "K" });
      const rL = PL.ui.readout(ui.L.readouts, { label: "光度", unit: "L☉" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 視差與恆星距離 */
  PL.register("parallax", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const d = dS.get();      // 恆星距離(秒差距 pc)
          const p = 1 / d;         // 視差角(角秒)
          // 幾何:太陽-地球軌道-恆星
          const sunX = W * 0.50, sunY = H * 0.78;
          const orbR = W * 0.16;
          // 恆星
          const stX = sunX + W * 0.30 / d * 2.4 + W * 0.13;
          const stY = H * 0.30;
          // 地球兩個位置(一月/七月)
          D.disc(ctx, sunX, sunY, 12, { fill: "#ffca28", glow: "#ff9800", glowSize: 12 });
          D.text(ctx, "太陽", sunX, sunY + 24, { color: PL.col("text-dim"), size: 10, align: "center" });
          [1, -1].forEach(side => {
            const ex = sunX + side * orbR;
            D.disc(ctx, ex, sunY, 6, { fill: "#5da8dd" });
            D.text(ctx, side > 0 ? "7 月" : "1 月", ex, sunY + 20, { color: PL.col("text-dim"), size: 9.5, align: "center" });
            // 視線
            D.line(ctx, ex, sunY, stX, stY, side > 0 ? "rgba(102,187,106,0.6)" : "rgba(239,136,41,0.6)", 1.6);
          });
          // 背景天球
          D.rect(ctx, W * 0.72, H * 0.14, W * 0.10, H * 0.62, { fill: PL.theme.isLight() ? "rgba(70,95,125,0.35)" : "rgba(20,30,50,0.6)", stroke: PL.col("border"), r: 4 });
          for (let i = 0; i < 8; i++) D.disc(ctx, W * 0.735 + (i % 2) * W * 0.045, H * (0.18 + i * 0.075), 1.6, { fill: "rgba(255,255,255,0.6)" });
          // 恆星視位移
          const shiftPx = clamp(140 / d, 6, 90);
          D.disc(ctx, stX, stY, 6, { fill: "#fff8c4", glow: "#ffe082", glowSize: 10 });
          [1, -1].forEach(s => D.disc(ctx, stX + s * shiftPx, stY, 3.4, { stroke: s > 0 ? "rgba(102,187,106,0.9)" : "rgba(239,136,41,0.9)", width: 1.8 }));
          D.text(ctx, "視位移 " + p.toFixed(2) + "″", stX, stY - 18, { color: PL.col("text"), size: 10.5, align: "center" });
          D.line(ctx, sunX, sunY, stX, stY, "rgba(255,255,255,0.25)", 1.4, [4, 5]);
          D.text(ctx, "d(pc) = 1 / p(角秒)", W * 0.50, H * 0.94, { color: PL.col("accent"), size: 13, align: "center", weight: "700" });
          CK.panel(ctx, W * 0.06, H * 0.10, W * 0.30, H * 0.42, "距離階梯的第一階");
          const rows = [
            ["視差角 p", p.toFixed(3) + "″"],
            ["距離", d.toFixed(1) + " pc"],
            ["換算光年", (d * 3.26).toFixed(1) + " ly"],
            ["適用範圍", d <= 50 ? "可靠(地面)" : "需太空望遠鏡"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.09, H * (0.20 + i * 0.11), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.34, H * (0.20 + i * 0.11), { color: i === 1 ? PL.col("accent") : PL.col("text"), size: 11, align: "right", weight: i === 1 ? "700" : "" });
          });
          rD.set(d, 1); rP.set(p, 3); rLy.set(d * 3.26, 1);
        }
      });
      const dS = PL.ui.slider(ui.L.controls, { label: "恆星距離", min: 1, max: 200, step: 1, value: 10, unit: "pc", digits: 0 });
      PL.ui.note(ui.L.controls, "地球繞日半年,近距恆星會相對遠景偏移一個小角:距離 1 pc 的星偏移 1 角秒。這把「三角測量」搬到天上,是量出宇宙的第一把尺。");
      PL.ui.procedure(ui.L.controls, {
        title: "拉遠看尺變鈍",
        steps: [
          "距離 10 pc:視差 0.1″,綠橙兩條視線分得開。",
          "拉到 100 pc:視差只剩 0.01″——視線幾乎重疊。",
          "地面望遠鏡極限約 0.01″:所以只能量到 ~100 pc。",
          "更遠的天體,要靠造父變星與超新星接力。"
        ],
        rule: "視差與距離成反比:量得到的角越小,尺就越長——依巴谷與蓋亞衛星把這把尺拉到數千光年。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "近鄰(1 pc)", apply: () => dS.set(1) },
        { label: "本地泡(100 pc)", apply: () => dS.set(100) }
      ] });
      const rD = PL.ui.readout(ui.L.readouts, { label: "距離", unit: "pc" });
      const rP = PL.ui.readout(ui.L.readouts, { label: "視差角", unit: "″" });
      const rLy = PL.ui.readout(ui.L.readouts, { label: "光年", unit: "ly" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 恆星光譜與都卜勒位移 */
  PL.register("stellar-spectra", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const rv = rvS.get();    // 視向速度 km/s(正=遠離)
          // 靜止與位移後的吸收線
          const lines = [
            { nm: 434.0, label: "Hγ" }, { nm: 486.1, label: "Hβ" }, { nm: 656.3, label: "Hα" }
          ];
          const shift = rv / 3e5;
          const box = { x: W * 0.06, y: H * 0.14, w: W * 0.86, h: H * 0.26 };
          // 光譜彩虹底
          D.rect(ctx, box.x, box.y, box.w, box.h, { fill: "#141d3a", stroke: PL.col("border"), r: 4 });
          const wlToX = wl => box.x + box.w * clamp((wl - 380) / (700 - 380), 0, 1);
          // 連續譜
          for (let wl = 380; wl <= 700; wl += 2) {
            const x = wlToX(wl);
            const c = wl < 440 ? [130, 80, 220] : wl < 490 ? [60, 90, 230] : wl < 510 ? [40, 190, 220] : wl < 580 ? [60, 200, 90] : wl < 620 ? [230, 210, 60] : wl < 670 ? [240, 130, 40] : [220, 60, 60];
            ctx.fillStyle = "rgb(" + c.join(",") + ")";
            ctx.fillRect(x, box.y + 4, 2, box.h - 8);
          }
          // 吸收線:靜止(白)與位移(依速度紅/藍移)
          lines.forEach(l => {
            D.line(ctx, wlToX(l.nm), box.y + 4, wlToX(l.nm), box.y + box.h - 4, "rgba(0,0,0,0.55)", 3);
            const moved = l.nm * (1 + shift);
            const c = rv > 0 ? "#ef8829" : "#81d4fa";
            D.line(ctx, wlToX(moved), box.y + 4, wlToX(moved), box.y + box.h - 4, c, 3);
            D.text(ctx, l.label, wlToX(moved), box.y - 6, { color: c, size: 9.5, align: "center" });
          });
          D.text(ctx, "黑=靜止參考　" + (rv > 0 ? "橙=紅移(遠離)" : rv < 0 ? "藍=藍移(接近)" : "=靜止"), box.x + box.w / 2, box.y + box.h + 16,
            { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 都卜勒公式與讀數
          CK.panel(ctx, W * 0.10, H * 0.56, W * 0.80, H * 0.30, "都卜勒效應");
          D.text(ctx, "Δλ / λ = v / c", W * 0.5, H * 0.68, { color: PL.col("accent"), size: 15, align: "center", weight: "700" });
          const dl = 656.3 * rv / 3e5;
          D.text(ctx, "Hα 656.3 nm → " + (656.3 + dl).toFixed(2) + " nm(" + (rv > 0 ? "紅移 +" : "藍移 ") + dl.toFixed(2) + " nm)", W * 0.5, H * 0.76, { color: PL.col("text"), size: 12, align: "center" });
          D.text(ctx, rv > 5 ? "星系光譜普遍紅移=宇宙在膨脹" : rv < -5 ? "少數近距星系藍移(本群束縛)" : "靜止參考:室內燈光都如此", W * 0.5, H * 0.83, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          rV.set(rv, 0); rShift.set(dl, 2); rDir.set(rv > 5 ? "遠離" : rv < -5 ? "接近" : "靜止");
        }
      });
      const rvS = PL.ui.slider(ui.L.controls, { label: "視向速度", min: -1000, max: 1000, step: 50, value: 300, unit: "km/s", digits: 0 });
      PL.ui.note(ui.L.controls, "恆星/星系的光譜吸收線是「指紋」:整組線往紅端滑=遠離,往藍端滑=接近。位移量除以波長就是速度——哈伯就是這樣發現宇宙膨脹。");
      PL.ui.procedure(ui.L.controls, {
        title: "量一個天體的速度",
        steps: [
          "記下三條氫線的「靜止位置」(黑線)。",
          "拉動速度:整組線一起滑動,方向告訴你接近或遠離。",
          "用 Δλ/λ = v/c 驗算 Hα 的位移量。",
          "把速度拉到數百 km/s:這就是星系的日常。"
        ],
        rule: "紅移不是「天體變紅」,而是所有譜線「整組平移」——組形不變,只有位置滑動。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "近距星系(300)", apply: () => rvS.set(300) },
        { label: "遠方星系(1000)", apply: () => rvS.set(1000) },
        { label: "仙女座(接近)", apply: () => rvS.set(-300) }
      ] });
      const rV = PL.ui.readout(ui.L.readouts, { label: "視向速度", unit: "km/s" });
      const rShift = PL.ui.readout(ui.L.readouts, { label: "Hα 位移", unit: "nm" });
      const rDir = PL.ui.readout(ui.L.readouts, { label: "方向" });
      return { stop() { ui.stop(); } };
    }
  });
})();
