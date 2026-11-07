/* 模組四 · 礦物與岩石 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 種子亂數：讓結晶、礫石等紋理每次重繪都長得一樣 */
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* 礦物的物理性質 */
  PL.register("mineral-properties", {
    build(root) {
      const MINERALS = {
        pyrite: { name: "黃鐵礦", surface: "淡銅黃色（似金）", streak: "綠黑色", streakC: "#44514a", luster: "金屬光澤", hard: "6–6.5", sg: 5.0, color: "#d8b34a", crystal: "立方體", acid: "無反應" },
        gold: { name: "自然金", surface: "金黃色", streak: "金黃色", streakC: "#e0b73f", luster: "金屬光澤", hard: "2.5–3", sg: 19.3, color: "#e8c34a", crystal: "不規則粒狀", acid: "無反應" },
        quartz: { name: "石英", surface: "白色／透明", streak: "白色", streakC: "#e8eaec", luster: "玻璃光澤", hard: "7", sg: 2.65, color: "#dfe6ee", crystal: "六角柱狀", acid: "無反應" },
        calcite: { name: "方解石", surface: "無色～白色", streak: "白色", streakC: "#eff1ec", luster: "玻璃～珍珠", hard: "3", sg: 2.71, color: "#e9e9e2", crystal: "菱面體", acid: "劇烈冒泡（含 CaCO₃）" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const key = minSel.get(), m = MINERALS[key], edge = edgeS.get();
          const vol = edge * edge * edge, mass = vol * m.sg;
          const sx = W * 0.20, sy = H * 0.24, s = 12 + edge * 14;
          // 標本（偽 3D 立方體）
          ctx.save();
          ctx.fillStyle = m.color;
          ctx.fillRect(sx, sy, s, s);
          ctx.beginPath();
          ctx.moveTo(sx, sy); ctx.lineTo(sx + s * 0.22, sy - s * 0.3); ctx.lineTo(sx + s * 1.22, sy - s * 0.3); ctx.lineTo(sx + s, sy);
          ctx.closePath(); ctx.fill();
          ctx.fillStyle = "rgba(255,255,255,0.22)"; ctx.fillRect(sx, sy, s, s * 0.28);
          ctx.strokeStyle = "rgba(0,0,0,0.35)"; ctx.lineWidth = 1.2; ctx.strokeRect(sx, sy, s, s);
          ctx.restore();
          D.text(ctx, "樣本 " + edge.toFixed(1) + " cm", sx + s * 0.5, sy + s + 16, { color: PL.col("text-dim"), size: 10, align: "center" });
          const test = testSel.get(); // 三種鑑定場景
          if (test === "streak") {
            D.rect(ctx, W * 0.07, H * 0.54, W * 0.32, H * 0.30, { fill: PL.theme.isLight() ? "#f2f0ea" : "#454b52", stroke: PL.theme.isLight() ? "#c9c4b8" : "#5d646c", r: 6 });
            D.text(ctx, "瓷板條痕測試", W * 0.23, H * 0.60, { color: PL.theme.isLight() ? "#8a8478" : "#a8a294", size: 10, align: "center" });
            for (let i = 0; i < 3; i++) D.rect(ctx, W * 0.10, H * 0.66 + i * 17, W * 0.26, 5, { fill: m.streakC, r: 2.5 });
            D.text(ctx, "條痕色：" + m.streak, W * 0.23, H * 0.90, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
          } else if (test === "luster") {
            D.rect(ctx, W * 0.07, H * 0.54, W * 0.32, H * 0.30, { fill: PL.theme.shade(0.82), stroke: PL.col("border"), r: 6 });
            const gx = W * 0.10 + ((t * 50) % (W * 0.26));
            for (let i = 0; i < 4; i++) D.line(ctx, gx + i * 5, H * 0.58, gx - 16 + i * 5, H * 0.78, "rgba(255,240,200," + (0.8 - i * 0.17) + ")", 2.4);
            D.text(ctx, m.luster, W * 0.23, H * 0.88, { color: PL.col("text"), size: 11, align: "center", weight: "700" });
          } else {
            const bx = W * 0.08, by = H * 0.62;
            D.line(ctx, bx, by, bx + W * 0.28, by, PL.col("border"), 3);
            D.disc(ctx, bx + W * 0.14, by + 6, 5, { fill: PL.col("text-faint") });
            D.text(ctx, "天平：" + (mass >= 100 ? Math.round(mass) : mass.toFixed(1)) + " g", bx + W * 0.04, by - 12, { color: PL.col("text-dim"), size: 10, align: "center" });
            const wx = W * 0.26, wy = H * 0.60, ww = W * 0.10, wh = H * 0.22;
            D.rect(ctx, wx, wy, ww, wh, { stroke: "#7aa8cc", width: 1.6, r: 4, fill: "rgba(120,180,220,0.12)" });
            D.rect(ctx, wx + 2, wy + wh * 0.3, ww - 4, wh * 0.68, { fill: "rgba(90,150,200,0.35)" });
            D.disc(ctx, wx + ww / 2, wy + wh * 0.74, Math.max(7, s * 0.3), { fill: m.color, stroke: "rgba(0,0,0,0.3)", width: 1 });
            D.text(ctx, "排水 " + vol.toFixed(1) + " cm³", wx + ww / 2, wy + wh + 14, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.text(ctx, "比重 = 質量 ÷ 體積", bx + W * 0.14, H * 0.94, { color: PL.col("text-faint"), size: 10, align: "center" });
          }
          // 右側鑑定資料卡
          CK.panel(ctx, W * 0.52, H * 0.12, W * 0.43, H * 0.74, "鑑定資料卡：" + m.name);
          const rows = [["表面色", m.surface], ["條痕色", m.streak + "（比表面色穩定）"], ["光澤", m.luster], ["硬度", m.hard], ["晶形", m.crystal], ["滴稀鹽酸", m.acid]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.55, H * 0.22 + i * 30, { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.92, H * 0.22 + i * 30, { color: i === 1 || i === 5 ? PL.col("accent") : PL.col("text"), size: 11, align: "right" });
          });
          D.disc(ctx, W * 0.90, H * 0.21, 7, { fill: m.color, stroke: PL.col("border"), width: 1 });
          rMass.set(mass, mass >= 100 ? 0 : 1); rVol.set(vol, 1); rSG.set(m.sg, 2); rStreak.set(m.streak);
          const vz = { pyrite: ["似金但條痕綠黑、比重 5.0 → 黃鐵礦（愚人金）", "warn"], gold: ["條痕金黃＋比重 19.3 → 自然金", "ok"], quartz: ["硬度 7、玻璃光澤 → 石英", "info"], calcite: ["硬度 3、遇稀鹽酸冒泡 → 方解石", "info"] }[key];
          vZen.set(vz[0], vz[1]);
        }
      });
      const testSel = PL.ui.select(ui.L.controls, { label: "鑑定測試", value: "streak", options: [
        { value: "streak", label: "條痕測試（瓷板）" }, { value: "luster", label: "光澤觀察" }, { value: "sg", label: "比重（天平＋排水法）" }] });
      const minSel = PL.ui.select(ui.L.controls, { label: "礦物樣本", value: "pyrite", options: Object.keys(MINERALS).map(k => ({ value: k, label: MINERALS[k].name })) });
      const edgeS = PL.ui.slider(ui.L.controls, { label: "樣本邊長", min: 0.5, max: 4, step: 0.1, value: 2, unit: "cm", digits: 1 });
      PL.ui.note(ui.L.controls, "顏色最會騙人：黃鐵礦長得像金，但條痕（粉末顏色）綠黑、比重約 5.0，一測便知。比重不隨樣本大小改變——拉大樣本，質量與體積跟著變，比重讀數不動。");
      PL.ui.procedure(ui.L.controls, {
        title: "鑑定一份「金礦」",
        steps: [
          "先看表面色：淡銅黃，很像金。",
          "在瓷板上劃條痕：<b>綠黑色</b> → 不是金（金的條痕是金黃色）。",
          "用排水法量比重：約 5.0，遠小於金的 19.3。",
          "換「自然金」對照：條痕金黃、比重 19.3，一測便分。"],
        rule: "條痕色比表面色穩定——表面氧化或沾污都騙不過條痕；鑑定靠多項性質綜合判斷，不是單看顏色。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "愚人金陷阱", apply: () => { minSel.set("pyrite"); testSel.set("streak"); } },
        { label: "對照真金", apply: () => { minSel.set("gold"); testSel.set("sg"); } },
        { label: "驗方解石", apply: () => { minSel.set("calcite"); testSel.set("luster"); } }] });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "判定" });
      const rMass = PL.ui.readout(ui.L.readouts, { label: "質量", unit: "g" }), rVol = PL.ui.readout(ui.L.readouts, { label: "體積", unit: "cm³" });
      const rSG = PL.ui.readout(ui.L.readouts, { label: "比重" }), rStreak = PL.ui.readout(ui.L.readouts, { label: "條痕色" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 摩氏硬度與刻痕測試 */
  PL.register("mohs-hardness", {
    build(root) {
      const MOHS = ["滑石", "石膏", "方解石", "螢石", "磷灰石", "正長石", "石英", "黃玉", "剛玉", "金剛石"];
      const TOOLS = [{ name: "指甲", h: 2.5 }, { name: "銅幣", h: 3.5 }, { name: "小刀", h: 5.5 }, { name: "玻璃片", h: 5.5 }, { name: "鋼銼", h: 6.5 }];
      const ui = CK.scaffold(root, {
        aspect: 0.56,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mi = Math.round(clamp(minS.get(), 1, 10)) - 1, mH = mi + 1, mName = MOHS[mi];
          const tool = TOOLS[+toolSel.get()];
          const x0 = W * 0.06, x1 = W * 0.60, ly = H * 0.20;
          const X = h => x0 + (h - 1) / 9 * (x1 - x0);
          D.line(ctx, x0, ly, x1, ly, PL.col("border"), 3);
          for (let h = 1; h <= 10; h++) {
            D.line(ctx, X(h), ly - 5, X(h), ly + 5, PL.col("text-dim"), 1.4);
            D.text(ctx, String(h), X(h), ly - 14, { color: PL.col("text-faint"), size: 9.5, align: "center" });
            D.text(ctx, MOHS[h - 1], X(h), ly + 20, { color: h - 1 === mi ? PL.col("accent") : PL.col("text-dim"), size: 9.5, align: "center", weight: h - 1 === mi ? "700" : "400" });
          }
          [["指甲", 2.5], ["銅幣", 3.5], ["小刀", 5.5]].forEach(([n, h]) => {
            D.disc(ctx, X(h), ly, 3.5, { fill: "#c48b5a" });
            D.text(ctx, n, X(h), ly + 36, { color: PL.col("text-faint"), size: 9, align: "center" });
          });
          D.disc(ctx, X(mH), ly, 8, { fill: "#9aa8b8", stroke: "#fff", width: 1.5, glow: PL.col("accent"), glowSize: 8 });
          const sy = H * 0.56, sx = W * 0.08, sw = W * 0.44; // 刻痕測試場景
          D.rect(ctx, sx, sy, sw, H * 0.24, { fill: PL.theme.isLight() ? "#8f9aa5" : "#565f6a", stroke: "rgba(0,0,0,0.3)", r: 6 });
          D.text(ctx, mName + "（硬度 " + mH + "）的表面", sx + sw / 2, sy - 8, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          const can = tool.h > mH;
          if (can) {
            D.rect(ctx, sx + 14, sy + H * 0.10, sw - 28, 5, { fill: "#f1f3f5", r: 2.5 });
            for (let i = 0; i < 8; i++) D.disc(ctx, sx + 20 + i * (sw - 44) / 8, sy + H * 0.10 - 6, 1.8, { fill: "#e8ecef" });
          }
          const tx = can ? sx + sw - 24 : sx + 26;
          D.rect(ctx, tx - 4, sy - H * 0.12, 8, H * 0.12, { fill: "#c48b5a", r: 3 });
          D.disc(ctx, tx, sy + H * 0.02, 5, { fill: "#7d8894" });
          if (!can) D.text(ctx, "✕ 打滑", tx, sy + H * 0.07, { color: "#d9704f", size: 9.5, align: "center" });
          CK.badge(ctx, sx + sw / 2, H * 0.44, can ? tool.name + "（" + tool.h + "）刻得動 → 留痕" : tool.name + "（" + tool.h + "）較軟 → 刻不動", can ? "#5c9e6f" : "#c0603f");
          // 資料卡
          CK.panel(ctx, W * 0.62, H * 0.12, W * 0.33, H * 0.74, "摩氏硬度怎麼用");
          const rows = [["本質", "相對順序，非等距"], ["法則", "能刻動誰，就比誰硬"], ["指甲", "2.5"], ["銅幣", "3.5"], ["小刀／玻璃", "5.5"], ["石英", "7 → 可刻玻璃"], ["金剛石", "10；與石墨同為碳"]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.65, H * 0.22 + i * 30, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * 0.22 + i * 30, { color: PL.col("text"), size: 10.5, align: "right" });
          });
          rMin.set(mName); rMH.set(mH, 0); rTH.set(tool.h, 1); rRes.set(can ? "刻得動（礦物較軟）" : "刻不動（工具較軟）");
          vZen.set(can ? tool.name + " 可刻動 " + mName + " → " + mName + " 比工具軟" : tool.name + " 刻不動 " + mName + " → 換更硬的工具", can ? "ok" : "bad");
        }
      });
      const minS = PL.ui.slider(ui.L.controls, { label: "受測礦物（摩氏 1–10）", min: 1, max: 10, step: 1, value: 3, digits: 0 });
      const toolSel = PL.ui.select(ui.L.controls, { label: "測試工具", value: "2", options: TOOLS.map((t2, i) => ({ value: String(i), label: t2.name + "（" + t2.h + "）" })) });
      PL.ui.note(ui.L.controls, "摩氏硬度以「能刻動誰」定序：互刻時硬度大者留痕。指甲 2.5、銅幣 3.5、小刀 5.5、玻璃 5.5 是隨手可得的測試工具——石英 7 能刻玻璃，方解石 3 會被小刀刻動。");
      PL.ui.procedure(ui.L.controls, {
        title: "做一次刻痕測試",
        steps: [
          "選礦物「方解石」，用「小刀（5.5）」測：刻得動 → 硬度小於 5.5。",
          "改用「指甲（2.5）」：刻不動 → 硬度大於 2.5。再用「銅幣（3.5）」夾一次，縮到 2.5 < H < 5.5。",
          "滑動滑桿把十種標準礦物排一遍，記住三個錨點：3、5.5、7。"],
        rule: "硬度是相對順序不是等距——摩氏 9 與 10 之間的絕對硬度差，遠大於 1 與 2 之間的差。"
      });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "刻痕判定" });
      const rMin = PL.ui.readout(ui.L.readouts, { label: "受測礦物" }), rMH = PL.ui.readout(ui.L.readouts, { label: "礦物硬度" });
      const rTH = PL.ui.readout(ui.L.readouts, { label: "工具硬度" }), rRes = PL.ui.readout(ui.L.readouts, { label: "測試結果" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 岩石循環 */
  PL.register("rock-cycle", {
    build(root) {
      const NODES = [
        { name: "岩漿", color: "#e0603a" }, { name: "火成岩", color: "#8d6e63" }, { name: "沉積物", color: "#d9b36c" },
        { name: "沉積岩", color: "#b78d5e" }, { name: "變質岩", color: "#7a8a96" }
      ];
      const PROCS = ["冷卻凝固", "風化侵蝕搬運", "沉積→壓密膠結", "高溫高壓變質", "熔融"];
      const ENVS = ["地殼淺部～地表", "地表", "河海盆地", "地下深部", "隱沒帶深部"];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const prog = clamp(progS.get(), 0, 99.9) / 100;
          const mode = pathSel.get();
          const cx = W * 0.32, cy = H * 0.48, R = Math.min(H * 0.28, W * 0.23);
          const P = NODES.map((n, i) => { const a = Math.PI / 2 + i * TAU / 5; return [cx + Math.cos(a) * R, cy + Math.sin(a) * R]; });
          for (let i = 0; i < 5; i++) {
            const [x1, y1] = P[i], [x2, y2] = P[(i + 1) % 5];
            const hi = mode === "all" || (mode === "surface" && (i === 1 || i === 2)) || (mode === "deep" && (i === 3 || i === 4));
            CK.arrow(ctx, x1 + (x2 - x1) * 0.16, y1 + (y2 - y1) * 0.16, x1 + (x2 - x1) * 0.84, y1 + (y2 - y1) * 0.84, hi ? PL.col("accent") : PL.theme.shade(0.4), hi ? PROCS[i] : "");
          }
          NODES.forEach((n, i) => {
            const [x, y] = P[i];
            D.disc(ctx, x, y, 27, { fill: n.color, stroke: "rgba(0,0,0,0.3)", width: 1.4 });
            D.text(ctx, n.name, x, y + 4, { color: "#fff", size: 11.5, align: "center", weight: "700" });
          });
          const seg = Math.floor(prog * 5), f = prog * 5 - seg;
          const [ax, ay] = P[seg], [bx, by] = P[(seg + 1) % 5];
          D.disc(ctx, lerp(ax, bx, 0.16 + f * 0.68), lerp(ay, by, 0.16 + f * 0.68), 7 + Math.sin(t * 5) * 1.5, { fill: "#ffe082", glow: "#ffb300", glowSize: 14 });
          CK.badge(ctx, lerp(ax, bx, 0.5), lerp(ay, by, 0.5) - 32, PROCS[seg], PL.col("accent-2"));
          D.text(ctx, "作用環境：" + ENVS[seg], cx, cy + R + 42, { color: PL.col("text-dim"), size: 11, align: "center" });
          // 右側對照卡
          CK.panel(ctx, W * 0.64, H * 0.12, W * 0.31, H * 0.58, "三大岩類對照");
          const rows = [["火成岩", "冷卻凝固：花崗岩、玄武岩"], ["沉積岩", "壓密膠結：砂岩、頁岩"], ["變質岩", "溫壓重結晶：片岩、大理岩"], ["動力", "板塊運動＋地球內部熱"], ["地表", "以沉積作用為主"]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.67, H * 0.20 + i * 40, { color: PL.col("accent"), size: 10.5, weight: "700" });
            D.text(ctx, v, W * 0.67, H * 0.20 + i * 40 + 16, { color: PL.col("text"), size: 10.5 });
          });
          rState.set(NODES[(seg + 1) % 5].name + "（形成中）"); rProc.set(PROCS[seg]); rEnv.set(ENVS[seg]);
        }
      });
      const progS = PL.ui.slider(ui.L.controls, { label: "循環推進", min: 0, max: 99, step: 1, value: 10, unit: "%", digits: 0 });
      const pathSel = PL.ui.select(ui.L.controls, { label: "路徑焦點", value: "all", options: [
        { value: "all", label: "全循環" }, { value: "surface", label: "表生路徑（風化→沉積）" }, { value: "deep", label: "深部路徑（變質→熔融）" }] });
      PL.ui.note(ui.L.controls, "黃色光點是一顆正在旅行的岩石：跟著它走完「岩漿 → 火成岩 → 沉積物 → 沉積岩 → 變質岩 → 岩漿」。循環的動力是板塊運動與地球內部熱。");
      PL.ui.procedure(ui.L.controls, {
        title: "走一圈循環",
        steps: [
          "從岩漿出發：冷卻凝固 → 火成岩。",
          "切到表生路徑：風化搬運成沉積物，再壓密膠結成沉積岩。",
          "切到深部路徑：深埋變質成變質岩，最後熔融回岩漿。拉動進度滑桿逐段讀作用與環境。"],
        rule: "任何岩石都可以轉成另外兩類，但「變質」與「沉積」都不經過熔融——只有熔融才會回到岩漿重新開始。"
      });
      const rState = PL.ui.readout(ui.L.readouts, { label: "正在變成" }), rProc = PL.ui.readout(ui.L.readouts, { label: "進行中的作用" });
      const rEnv = PL.ui.readout(ui.L.readouts, { label: "所處環境" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 火成岩：冷卻速率與結晶 */
  PL.register("igneous-rocks", {
    build(root) {
      const COMPS = {
        basalt: { name: "玄武岩質", sio: "45–52 %", min: "橄欖石、輝石、斜長石", intr: "輝長岩", extr: "玄武岩", color: "#4a4f57", site: "海洋地殼" },
        andesite: { name: "安山岩質", sio: "52–63 %", min: "角閃石、斜長石", intr: "閃長岩", extr: "安山岩", color: "#7d7a70", site: "島弧（台灣北部火山）" },
        granite: { name: "花崗岩質", sio: "> 66 %", min: "石英、正長石、雲母", intr: "花崗岩", extr: "流紋岩", color: "#c9a9a0", site: "大陸地殼" }
      };
      const sizeAt = v => clamp(12 * Math.pow(10, -0.55 * v), 0.02, 12);
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const v = coolS.get(), rate = Math.pow(10, v - 2);
          const c = COMPS[compSel.get()], porph = porphChk.get();
          const d = sizeAt(v);
          const struct = porph ? "斑狀" : d >= 5 ? "粗粒" : d >= 1 ? "細粒" : d >= 0.1 ? "微晶質" : d >= 0.03 ? "隱晶質" : "玻璃質";
          const intrusive = d >= 1, rock = intrusive ? c.intr : c.extr;
          // 地下剖面：慢冷＝深成岩漿庫，快冷＝噴出火山
          const { surface } = CK.scene(ui.cv, { kind: "underground", horizon: 0.14 });
          if (!intrusive) {
            CK.volcanoShape(ctx, W * 0.28, surface + 2, W * 0.30, H * 0.17, "strato", { lavaFlow: 0.5, erupting: d < 0.05, time: t });
            D.text(ctx, "噴出地表 → 驟冷", W * 0.28, surface - H * 0.26, { color: PL.col("text-dim"), size: 11, align: "center" });
          } else {
            const chY = surface + (H - surface) * (0.62 - 0.18 * (v / 5.5));
            D.disc(ctx, W * 0.28, chY, H * 0.11, { fill: "#a34a20" });
            D.disc(ctx, W * 0.28, chY, H * 0.075, { fill: "rgba(255,120,50," + (0.5 + 0.2 * Math.sin(t * 2)) + ")" });
            D.text(ctx, "深成岩漿庫 → 緩慢冷卻", W * 0.28, chY + H * 0.15, { color: PL.col("text-dim"), size: 11, align: "center" });
          }
          // 晶粒放大窗
          const bx = W * 0.06, by = H * 0.62, bw = W * 0.40, bh = H * 0.28;
          D.rect(ctx, bx, by, bw, bh, { fill: c.color, stroke: "rgba(0,0,0,0.35)", r: 6 });
          if (d < 0.03) {
            for (let i = 0; i < 3; i++) { ctx.save(); ctx.strokeStyle = "rgba(255,255,255,0.35)"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(bx + bw * (0.25 + i * 0.25), by + bh * 0.6, bh * 0.3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.restore(); }
            for (let i = 0; i < 6; i++) D.disc(ctx, bx + bw * (0.12 + (i * 37 % 80) / 100), by + bh * (0.2 + (i * 53 % 60) / 100), 3.5, { fill: "rgba(0,0,0,0.4)" });
          } else {
            const cell = Math.max(clamp(4 + d * 2.2, 5, 30), Math.sqrt(bw * bh / 600)), cols = Math.ceil(bw / cell), rows = Math.ceil(bh / cell);
            for (let i = 0; i < cols * rows; i++) D.disc(ctx, bx + (i % cols) * cell + cell / 2, by + Math.floor(i / cols) * cell + cell / 2, cell * 0.46, { fill: CK.mix(c.color, i % 3 ? "#ffffff" : "#20242a", 0.22) });
            if (!intrusive) for (let i = 0; i < 7; i++) D.disc(ctx, bx + bw * (0.1 + (i * 41 % 80) / 100), by + bh * (0.18 + (i * 29 % 64) / 100), 3, { fill: "rgba(0,0,0,0.4)" });
          }
          if (porph) for (let i = 0; i < 5; i++) D.disc(ctx, bx + bw * (0.14 + (i * 0.19) % 0.76), by + bh * (0.24 + (i * 0.27) % 0.56), 9, { fill: CK.mix(c.color, "#ffffff", 0.5), stroke: "rgba(0,0,0,0.3)", width: 1 });
          D.rect(ctx, bx - 8, by - 22, 252, 20, { fill: PL.theme.isLight() ? "rgba(40,32,24,0.78)" : "rgba(0,0,0,0.45)", r: 4 });
          D.text(ctx, "晶粒放大：" + (d < 0.03 ? "玻璃質（無晶粒）" : "直徑約 " + (d < 0.1 ? d.toFixed(3) : d.toFixed(2)) + " mm" + (porph ? "＋大斑晶" : "")), bx, by - 8, { color: "#f4ead9", size: 10.5 });
          // 成分資料卡
          CK.panel(ctx, W * 0.60, H * 0.16, W * 0.35, H * 0.44, c.name + "岩漿");
          const rows = [["SiO₂ 含量", c.sio], ["主要礦物", c.min], ["深成 →", c.intr], ["噴出 →", c.extr], ["常見位置", c.site]];
          rows.forEach(([k, v2], i) => {
            D.text(ctx, k, W * 0.63, H * 0.25 + i * 32, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v2, W * 0.92, H * 0.25 + i * 32, { color: i === 2 || i === 3 ? PL.col("accent") : PL.col("text"), size: 10.5, align: "right" });
          });
          rRate.set(rate, rate >= 100 ? 0 : rate >= 10 ? 1 : 2); rD.set(d, d < 0.1 ? 3 : 2); rStruct.set(struct); rRock.set(rock + (intrusive ? "（深成）" : "（噴出）"));
          vZen.set(d < 0.03 ? "驟冷 → 玻璃質：" + rock + " 玻璃（黑曜岩一類）" : intrusive ? "深成侵入 → " + rock + "（全晶質、" + struct + "）" : "噴出 → " + rock + "（" + struct + "，常見氣孔）", d < 0.03 ? "warn" : intrusive ? "ok" : "info");
        }
      });
      const coolS = PL.ui.slider(ui.L.controls, { label: "冷卻速率指標（對數，往右越快）", min: 0, max: 5.5, step: 0.1, value: 2, digits: 1 });
      const compSel = PL.ui.select(ui.L.controls, { label: "岩漿成分", value: "granite", options: Object.keys(COMPS).map(k => ({ value: k, label: COMPS[k].name })) });
      const porphChk = PL.ui.checkbox(ui.L.controls, { label: "兩段冷卻（斑狀組織）", checked: false });
      PL.ui.note(ui.L.controls, "冷卻越慢，礦物結晶越大：深成的花崗岩晶粒以 mm～cm 計，噴出的熔岩地表驟冷成隱晶質甚至玻璃。斑狀＝先在地下慢冷長出斑晶、再噴出驟冷成細基質。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀出冷卻史",
        steps: [
          "把速率指標拉到最左：深成岩漿庫，晶粒粗 → 花崗岩。",
          "拉到中間偏右：噴出地表，晶粒變細、出現氣孔；拉到最右：驟冷 → 玻璃質。",
          "勾選「兩段冷卻」：斑晶＋細基質 = 先慢冷、後快冷，不是「中等的冷卻速率」。"],
        rule: "斑狀組織代表兩段冷卻——地下先慢冷長出斑晶，再噴出驟冷成細基質；這是考題最愛考的陷阱。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "深成花崗岩", apply: () => { coolS.set(1); compSel.set("granite"); porphChk.set(false); } },
        { label: "斑狀安山岩", apply: () => { coolS.set(4.2); compSel.set("andesite"); porphChk.set(true); } },
        { label: "驟冷玻璃", apply: () => { coolS.set(5.4); compSel.set("granite"); porphChk.set(false); } }] });
      const chart = ui.chart("冷卻速率 → 晶粒直徑", "往右冷卻越快、晶粒越細：慢冷粗粒（左）→ 熔岩流隱晶質 → 驟冷玻璃質（右）。紅線右側常為噴出環境。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 5.5, y0: 0, y1: 12, xlabel: "冷卻快慢指標（對數）", ylabel: "晶粒直徑 (mm)",
          series: [{ fn: sizeAt, color: PL.col("accent") }],
          marks: [{ dot: [coolS.get(), sizeAt(coolS.get())], color: PL.col("accent-2"), label: "目前" }, { vline: 3.8, color: PL.col("warn"), label: "侵入／噴出分界" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      const vZen = PL.ui.verdict(ui.L.controls, { label: "成因判定" });
      const rRate = PL.ui.readout(ui.L.readouts, { label: "冷卻速率", unit: "°C/小時" }), rD = PL.ui.readout(ui.L.readouts, { label: "晶粒直徑", unit: "mm" });
      const rStruct = PL.ui.readout(ui.L.readouts, { label: "組織" }), rRock = PL.ui.readout(ui.L.readouts, { label: "岩石名" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 沉積岩與沉積環境 */
  PL.register("sedimentary-rocks", {
    build(root) {
      const ENVS = [
        { name: "山麓沖積扇", p0: 0, p1: 15, cap: 60, sort: "差" }, { name: "河流中下游", p0: 15, p1: 40, cap: 8, sort: "中等" },
        { name: "三角洲", p0: 40, p1: 60, cap: 0.5, sort: "中等" }, { name: "淺海陸棚", p0: 60, p1: 85, cap: 0.2, sort: "良好" },
        { name: "深海平原", p0: 85, p1: 101, cap: 0.006, sort: "極佳" }
      ];
      const capAt = p => ENVS.find(e => p >= e.p0 && p < e.p1) || ENVS[4];
      const grainAt = (p, E) => capAt(p).cap * (0.15 + 0.85 * Math.pow(E, 1.5));
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const pos = posS.get(), E = energyS.get(), bio = bioChk.get();
          const env = capAt(pos), d = grainAt(pos, E);
          const rock = bio && env.name === "淺海陸棚" ? "石灰岩" : d >= 2 ? "礫岩" : d >= 0.05 ? "砂岩" : "頁岩";
          // 剖面：山地 → 平原 → 海
          const seaX = W * 0.52, seaY = H * 0.30;
          ctx.save();
          ctx.fillStyle = PL.theme.isLight() ? "#8fae6f" : "#3d4a35";
          ctx.beginPath(); ctx.moveTo(0, seaY); ctx.lineTo(0, H * 0.34); ctx.lineTo(W * 0.14, H * 0.18); ctx.lineTo(W * 0.26, H * 0.38); ctx.lineTo(seaX, H * 0.50); ctx.closePath(); ctx.fill();
          ctx.restore();
          ctx.save();
          ctx.fillStyle = "rgba(74,144,216,0.7)";
          ctx.beginPath(); ctx.moveTo(seaX, seaY); ctx.lineTo(W, seaY); ctx.lineTo(W, H * 0.86); ctx.lineTo(seaX, H * 0.52); ctx.closePath(); ctx.fill();
          ctx.restore();
          D.text(ctx, "海平面", seaX + 6, seaY - 6, { color: PL.col("text-faint"), size: 9 });
          D.text(ctx, "山地", W * 0.12, H * 0.30, { color: PL.theme.isLight() ? "#3f5a33" : "#8fae6f", size: 10.5, weight: "700" });
          // 觀察點與沉積堆
          const ty = p => p < 60 ? lerp(H * 0.36, H * 0.50, p / 60) : lerp(H * 0.52, H * 0.84, (p - 60) / 40);
          const px = W * (0.06 + 0.90 * pos / 100), py = ty(pos);
          const rr = clamp(1.3 * Math.log10(d * 60 + 1) + 1, 1.3, 9), rnd = rng(14);
          for (let i = 0; i < 16; i++) D.disc(ctx, px + (rnd() - 0.5) * 26, py + 6 + rnd() * 12, rr * (0.6 + rnd() * 0.5), { fill: i % 2 ? "#b78d5e" : "#a07a4e" });
          if (rock === "頁岩") for (let i = 0; i < 3; i++) D.line(ctx, px - 13, py + 9 + i * 5, px + 13, py + 9 + i * 5, "rgba(60,66,76,0.7)", 1.2);
          if (bio) for (let i = 0; i < 3; i++) { ctx.save(); ctx.strokeStyle = "#efe8d8"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(px - 8 + i * 9, py + 10, 4, Math.PI, TAU); ctx.stroke(); ctx.restore(); }
          CK.badge(ctx, px, py - 24, env.name + " → " + rock, rock === "石灰岩" ? "#5c9e6f" : PL.col("accent"));
          D.text(ctx, bio ? "生物殼體補給中（淺海會成石灰岩）" : "顆粒直徑 " + (d >= 1 ? d.toFixed(1) : d.toFixed(3)) + " mm", W * 0.30, H * 0.12, { color: PL.col("text-dim"), size: 11, align: "center" });
          const depth = pos < 60 ? 0 : Math.round(4000 * Math.pow((pos - 60) / 40, 1.4));
          rEnv.set(env.name); rD.set(d, d >= 1 ? 1 : 3); rRock.set(rock + "（分選 " + env.sort + "）"); rDepth.set(depth, 0);
          vZen.set(rock === "礫岩" ? "近源高能 → 礫岩：顆粒粗、分選差" : rock === "砂岩" ? "中程搬運 → 砂岩：層理與交錯層發達" : rock === "石灰岩" ? "淺海碳酸鹽 → 石灰岩：生物殼體與 CaCO₃ 沉澱" : "遠源低能 → 頁岩：顆粒極細，化石多產於此", rock === "石灰岩" ? "ok" : "info");
        }
      });
      const posS = PL.ui.slider(ui.L.controls, { label: "觀察位置（0＝山麓，100＝深海）", min: 0, max: 100, step: 1, value: 35, unit: "%", digits: 0 });
      const energyS = PL.ui.slider(ui.L.controls, { label: "搬運能量", min: 0.2, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const bioChk = PL.ui.checkbox(ui.L.controls, { label: "生物殼體補給（碳酸鹽）", checked: false });
      PL.ui.note(ui.L.controls, "碎屑被搬得越遠、能量越低，沉下來的顆粒越細：礫岩近源、砂岩中程、頁岩遠源深海。淺海若有充足生物殼體，堆出來的是石灰岩而非碎屑岩。");
      PL.ui.procedure(ui.L.controls, {
        title: "對照能量與粒徑",
        steps: [
          "能量固定，把觀察位置從山麓拉到深海：粒徑一路變細。",
          "位置固定在 30%，把能量從 0.2 拉到 1：能沉下的顆粒變粗（下圖曲線整條抬高）。",
          "勾選生物殼體，把位置放到淺海陸棚：變成石灰岩。"],
        rule: "「能量高 → 顆粒粗」講的是當時的水動力；看到礫岩代表沉積當下離山地很近，不是河流把礫石搬到深海。"
      });
      const chart = ui.chart("顆粒直徑 vs 搬運距離", "越往海（右）沉下的顆粒越細；能量越高（亮線越上），粗顆粒才能被帶得更遠。紅線是目前觀察位置。");
      const drawChart = () => {
        CK.plot(chart, {
          x0: 0, x1: 100, y0: 0, y1: 20, xlabel: "搬運距離 (%)", ylabel: "顆粒直徑 (mm)",
          series: [
            { fn: p => Math.min(20, grainAt(p, 1)), color: "rgba(150,160,175,0.45)", width: 1.4 },
            { fn: p => Math.min(20, grainAt(p, 0.2)), color: "rgba(150,160,175,0.45)", width: 1.4 },
            { fn: p => Math.min(20, grainAt(p, energyS.get())), color: PL.col("accent"), width: 2.4 }],
          marks: [{ vline: posS.get(), color: PL.col("warn"), label: "目前" }]
        });
      };
      chart.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      const vZen = PL.ui.verdict(ui.L.controls, { label: "沉積環境判讀" });
      const rEnv = PL.ui.readout(ui.L.readouts, { label: "沉積環境" }), rD = PL.ui.readout(ui.L.readouts, { label: "顆粒直徑", unit: "mm" });
      const rRock = PL.ui.readout(ui.L.readouts, { label: "沉積岩名" }), rDepth = PL.ui.readout(ui.L.readouts, { label: "相對水深", unit: "m" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 變質岩與葉理 */
  PL.register("metamorphic-rocks", {
    build(root) {
      const PROTO = {
        shale: { name: "頁岩", color: "#6f7681", products: ["頁岩", "板岩", "片岩", "片麻岩"], grain: "flake" },
        limestone: { name: "石灰岩", color: "#cfd4d8", products: ["石灰岩", "大理岩", "大理岩", "大理岩"], grain: "equant" },
        sandstone: { name: "砂岩", color: "#d9b36c", products: ["砂岩", "石英岩", "石英岩", "石英岩"], grain: "quartz" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const p = PROTO[protoSel.get()], T = tempS.get(), dep = depS.get(), stress = stressChk.get();
          const g = T < 200 ? 0 : T < 350 ? 1 : T < 550 ? 2 : T < 750 ? 3 : 4, melted = g === 4;
          const name = melted ? "（熔融 → 岩漿）" : g === 0 ? p.name : (p.grain === "flake" && !stress ? "角頁岩" : p.products[g]);
          const foli = p.grain === "flake" && stress && !melted && g >= 1, align = clamp((T - 200) / 350, 0, 1);
          // 地下場景＋深度標尺
          const { surface } = CK.scene(ui.cv, { kind: "underground", horizon: 0.12 });
          const bx = W * 0.16, bw = W * 0.32, bh = H * 0.20;
          const by = surface + 16 + (H - surface - bh - 40) * dep / 30;
          for (let k = 0; k <= 3; k++) {
            const yy = surface + 16 + (H - surface - bh - 40) * k * 10 / 30;
            D.line(ctx, W * 0.07, yy, W * 0.11, yy, PL.col("text-faint"), 1);
            D.text(ctx, (k * 10) + " km", W * 0.045, yy + 4, { color: PL.col("text-faint"), size: 9, align: "right" });
          }
          // 岩石箱與礦物顆粒
          D.rect(ctx, bx, by, bw, bh, { fill: melted ? "#b3541e" : p.color, stroke: "rgba(0,0,0,0.4)", r: 5 });
          const rnd = rng(21);
          for (let i = 0; i < 26; i++) {
            const gx = bx + 8 + rnd() * (bw - 16), gy = by + 8 + rnd() * (bh - 16);
            if (p.grain === "flake") {
              const ang = stress ? lerp(Math.PI / 4, Math.PI / 2, align) : rnd() * Math.PI, len = 4 + g * 5;
              D.line(ctx, gx - Math.cos(ang) * len / 2, gy - Math.sin(ang) * len / 2, gx + Math.cos(ang) * len / 2, gy + Math.sin(ang) * len / 2, "rgba(40,48,58,0.75)", 2 + g * 0.5);
            } else D.disc(ctx, gx, gy, 2 + g * 1.4, { fill: CK.mix(p.color, "#ffffff", 0.45), stroke: "rgba(0,0,0,0.2)", width: 0.8 });
          }
          if (melted) D.text(ctx, "熔融 → 岩漿（回到岩石循環起點）", bx + bw / 2, by + bh / 2, { color: "#ffe0c2", size: 11.5, align: "center", weight: "700" });
          // 定向壓力箭頭與葉理
          if (stress && !melted) {
            CK.arrow(ctx, bx - 30, by + bh / 2, bx - 8, by + bh / 2, "#d9704f", "最大壓應力");
            CK.arrow(ctx, bx + bw + 30, by + bh / 2, bx + bw + 8, by + bh / 2, "#d9704f", "");
            if (foli) CK.badge(ctx, bx + bw / 2, by - 16, "葉理 ⊥ 壓應力（直立排列）", "#c0603f");
          }
          if (p.grain !== "flake" && g >= 1 && !melted) CK.badge(ctx, bx + bw / 2, by - 16, "塊狀：大理岩／石英岩不長葉理", PL.col("accent"));
          // 資料卡
          CK.panel(ctx, W * 0.60, H * 0.12, W * 0.35, H * 0.60, "變質作用對照");
          const rows = [["原岩", p.name], ["溫度", T + " °C"], ["深度", dep + " km"], ["靜岩壓力", Math.round(dep * 27) + " MPa"], ["葉理", foli ? "發達（⊥ 壓應力）" : stress ? "弱" : "無（塊狀）"], ["產物", name]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.63, H * 0.20 + i * 34, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * 0.20 + i * 34, { color: i === 5 ? PL.col("accent") : PL.col("text"), size: 10.5, align: "right" });
          });
          rGrade.set(["未變質", "低級", "中級", "高級", "已熔融"][g]); rRock.set(name); rFoli.set(foli ? "垂直最大壓應力" : "無"); rP.set(Math.round(dep * 27), 0);
          vZen.set(melted ? "超過約 800 °C：開始熔融 → 岩漿，離開變質域" : p.grain === "flake" && !stress && g >= 1 ? "接觸變質 → 角頁岩：只有熱、沒有定向壓力，不長葉理" : g >= 3 ? "高級變質：" + name + "，淺色深色礦物分帶明顯" : "升高溫度與深度，觀察礦物重結晶與葉理", melted ? "warn" : "info");
        }
      });
      const protoSel = PL.ui.select(ui.L.controls, { label: "原岩", value: "shale", options: Object.keys(PROTO).map(k => ({ value: k, label: PROTO[k].name })) });
      const tempS = PL.ui.slider(ui.L.controls, { label: "變質溫度", min: 25, max: 900, step: 5, value: 150, unit: "°C", digits: 0 });
      const depS = PL.ui.slider(ui.L.controls, { label: "埋藏深度", min: 0, max: 30, step: 1, value: 12, unit: "km", digits: 0 });
      const stressChk = PL.ui.checkbox(ui.L.controls, { label: "定向壓力（區域變質）", checked: true });
      PL.ui.note(ui.L.controls, "變質是「固態下的重結晶」：溫度讓礦物長大，定向壓力讓片狀礦物垂直最大壓應力排列成葉理。頁岩一路變板岩 → 片岩 → 片麻岩；石灰岩變大理岩、砂岩變石英岩。");
      PL.ui.procedure(ui.L.controls, {
        title: "追蹤一顆頁岩的旅程",
        steps: [
          "260 °C／8 km：板岩；450 °C：片岩（葉理直立、有絲絹光澤）；680 °C：片麻岩（深淺礦物分帶）。",
          "關掉定向壓力再升溫：只有重結晶 → 角頁岩，沒有葉理。",
          "推過 800 °C：熔融成岩漿，循環回到火成岩的起點。"],
        rule: "葉理垂直「最大壓應力」，不是平行；接觸變質只有熱沒有定向壓力，所以大理岩、石英岩、角頁岩都是塊狀。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "板岩", apply: () => { protoSel.set("shale"); tempS.set(260); depS.set(8); stressChk.set(true); ui.redraw(); } },
        { label: "片岩", apply: () => { protoSel.set("shale"); tempS.set(450); depS.set(15); stressChk.set(true); ui.redraw(); } },
        { label: "片麻岩", apply: () => { protoSel.set("shale"); tempS.set(680); depS.set(24); stressChk.set(true); ui.redraw(); } },
        { label: "接觸變質", apply: () => { protoSel.set("shale"); tempS.set(600); depS.set(3); stressChk.set(false); ui.redraw(); } },
        { label: "花蓮大理岩", apply: () => { protoSel.set("limestone"); tempS.set(500); depS.set(18); stressChk.set(true); ui.redraw(); } }] });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "變質判定" });
      const rGrade = PL.ui.readout(ui.L.readouts, { label: "變質度" }), rRock = PL.ui.readout(ui.L.readouts, { label: "產物岩石" });
      const rFoli = PL.ui.readout(ui.L.readouts, { label: "葉理" }), rP = PL.ui.readout(ui.L.readouts, { label: "靜岩壓力", unit: "MPa" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 岩石鑑定流程 */
  PL.register("rock-identification", {
    build(root) {
      const SPECS = [
        { name: "花崗岩", cls: "火成岩", hcl: false, tex: "granite", feats: ["粗粒結晶", "石英＋長石＋雲母", "無層理無葉理"] },
        { name: "安山岩", cls: "火成岩", hcl: false, tex: "andesite", feats: ["斑狀組織", "隱晶質基質", "台灣北部火山常見"] },
        { name: "玄武岩", cls: "火成岩", hcl: false, tex: "basalt", feats: ["色深質細", "常見氣孔", "海洋地殼主體"] },
        { name: "礫岩", cls: "沉積岩", hcl: false, tex: "conglomerate", feats: ["圓滾礫石", "近源堆積", "有層理"] },
        { name: "砂岩", cls: "沉積岩", hcl: false, tex: "sandstone", feats: ["砂粒觸感", "層理／交錯層", "中程搬運"] },
        { name: "頁岩", cls: "沉積岩", hcl: false, tex: "shale", feats: ["薄頁理", "顆粒極細", "遠源深水"] },
        { name: "片岩", cls: "變質岩", hcl: false, tex: "schist", feats: ["葉理發達", "片狀礦物平行排列", "中級變質"] },
        { name: "大理岩", cls: "變質岩", hcl: true, tex: "marble", feats: ["粒狀方解石", "塊狀無葉理", "遇稀鹽酸冒泡"] }
      ];
      const TEXBASE = {
        granite: ["#c9a9a0", ["#d8a898", "#e8e0d0", "#9aa4ae", "#4a5058"], 7], andesite: ["#8a8880", ["#c9c4b4", "#dbd6c8"], 1.8],
        basalt: ["#41464e", ["#2e3238", "#4a5058"], 1.5], conglomerate: ["#a8927a", ["#b78d5e", "#8b95a3", "#cfd4d8", "#d9b36c"], 9],
        sandstone: ["#d9b36c", ["#c9a35a", "#e0c184"], 1.8], shale: ["#6f7681", ["#5d6672"], 0],
        schist: ["#7a8a96", ["#5d6672", "#c0c8d0"], 0], marble: ["#e3e7ea", ["#cfd4d8", "#f4f6f8"], 4]
      };
      function drawTex(ctx, sp, x, y, w, h, scale, seed) {
        const B = TEXBASE[sp.tex], rnd = rng(seed); D.rect(ctx, x, y, w, h, { fill: B[0] });
        ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
        if (sp.tex === "shale") {
          for (let yy = y + 3 * scale; yy < y + h; yy += 5 * scale) D.line(ctx, x, yy, x + w, yy, "rgba(40,46,56,0.5)", 1.2 * scale);
        } else if (sp.tex === "schist") {
          for (let i = 0; i < 26; i++) {
            const gx = x + rnd() * w, gy = y + rnd() * h, L = 8 * scale;
            D.line(ctx, gx - L, gy, gx + L, gy, "rgba(45,55,66,0.6)", 2.2 * scale); if (i % 8 === 0) D.disc(ctx, gx, gy, 3 * scale, { fill: "#a0522d" });
          }
        } else {
          const r = B[2] * scale, n = Math.min(70, Math.ceil(w * h / (r * r * 7)));
          for (let i = 0; i < n; i++) {
            const gx = x + r + rnd() * Math.max(1, w - 2 * r), gy = y + r + rnd() * Math.max(1, h - 2 * r);
            D.disc(ctx, gx, gy, r, { fill: B[1][i % B[1].length] }); if (sp.tex === "basalt" && i % 9 === 0) D.disc(ctx, gx, gy - r * 1.6, r * 0.8, { fill: "rgba(15,18,22,0.55)" });
          }
        }
        ctx.restore();
      }
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const sp = SPECS[+specSel.get()], zoom = zoomS.get(), acid = acidChk.get(); // 手標本
          const sx = W * 0.05, sy = H * 0.14, sw = W * 0.34, sh = H * 0.34;
          drawTex(ctx, sp, sx, sy, sw, sh, 1, 5); D.rect(ctx, sx, sy, sw, sh, { stroke: PL.col("border"), width: 1.6, r: 4 });
          D.text(ctx, "手標本：" + sp.name, sx + sw / 2, sy + sh + 16, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          // 放大鏡
          const lx = W * 0.24, ly = H * 0.76, lr = H * 0.15;
          ctx.save(); ctx.beginPath(); ctx.arc(lx, ly, lr, 0, TAU); ctx.clip();
          drawTex(ctx, sp, lx - lr, ly - lr, lr * 2, lr * 2, zoom, 5); ctx.restore();
          D.ring(ctx, lx, ly, lr, PL.col("border"), 3);
          D.line(ctx, lx + lr * 0.7, ly + lr * 0.7, lx + lr * 1.45, ly + lr * 1.45, "#8a6f52", 4); D.text(ctx, zoom.toFixed(1) + "×", lx, ly + lr + 15, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          // 滴稀鹽酸
          if (acid) {
            const dxx = sx + sw * 0.72, df = (t * 0.9) % 1;
            D.line(ctx, dxx, sy - 28, dxx, sy - 10, PL.col("text-dim"), 2); D.disc(ctx, dxx, sy - 8 + df * 9, 2.5, { fill: "#bfe0f5" });
            if (sp.hcl) for (let i = 0; i < 5; i++) D.disc(ctx, dxx - 9 + i * 4.5, sy + sh - 8 - ((t * 1.1 + i / 5) % 1) * 20, 1.6 + i % 2, { fill: "rgba(255,255,255,0.85)" });
            D.text(ctx, sp.hcl ? "冒泡！" : "無反應", dxx + 10, sy + 14, { color: sp.hcl ? "#5c9e6f" : PL.col("text-faint"), size: 10.5, weight: "700" });
          }
          // 鑑定決策樹
          const qx = W * 0.50, qw = W * 0.45, steps = [
            ["Q1 有層理或化石？", sp.cls === "沉積岩" ? "是 → 沉積岩" : "否 → 往下"],
            ["Q2 有葉理？", sp.cls === "變質岩" ? "是 → 變質岩" : "否 → 往下"],
            ["Q3 看礦物組成與組織", sp.cls === "火成岩" ? "結晶組織 → 火成岩" : "對照成分與組織定名"]];
          steps.forEach(([q, a], i) => {
            const y = H * 0.14 + i * H * 0.20;
            const hit = (sp.cls === "沉積岩" && i === 0) || (sp.cls === "變質岩" && i === 1) || (sp.cls === "火成岩" && i === 2);
            D.rect(ctx, qx, y, qw, H * 0.13, { fill: hit ? "rgba(92,158,111,0.2)" : PL.theme.shade(0.55), stroke: hit ? "#5c9e6f" : PL.col("border"), r: 7 });
            D.text(ctx, q, qx + 12, y + H * 0.05, { color: hit ? "#5c9e6f" : PL.col("text-dim"), size: 11.5, weight: "700" }); D.text(ctx, a, qx + 12, y + H * 0.095, { color: PL.col("text"), size: 10.5 });
            if (i < 2) D.arrow(ctx, qx + qw * 0.3, y + H * 0.13, qx + qw * 0.3, y + H * 0.20, { color: PL.col("text-faint"), width: 1.4, label: "否" });
          });
          rCls.set(sp.cls); rFeat.set(sp.feats.join("、")); rAcid.set(acid ? (sp.hcl ? "劇烈冒泡 → 含方解石" : "無反應（非碳酸鹽）") : "未測"); rName.set(sp.name);
          vZen.set(acid && sp.hcl ? "滴酸冒泡 → 碳酸鹽類：" + sp.name : sp.cls + "：" + sp.name + "（" + sp.feats[0] + "）", acid && sp.hcl ? "ok" : sp.cls === "變質岩" ? "ok" : "info");
        }
      });
      const specSel = PL.ui.select(ui.L.controls, { label: "標本盒", value: "0", options: SPECS.map((s, i) => ({ value: String(i), label: s.name })) });
      const zoomS = PL.ui.slider(ui.L.controls, { label: "放大鏡倍率", min: 1, max: 10, step: 0.5, value: 3, unit: "×", digits: 1 }), acidChk = PL.ui.checkbox(ui.L.controls, { label: "滴稀鹽酸", checked: false });
      PL.ui.note(ui.L.controls, "手標本鑑定的順序：先找層理與化石（沉積）、再找葉理（變質），都不是才看礦物組成與結晶組織（火成）。滴稀鹽酸冒泡 = 含方解石，是大理岩與石灰岩的快篩。");
      PL.ui.procedure(ui.L.controls, {
        title: "照流程鑑定一遍",
        steps: [
          "挑「頁岩」：薄頁理 → Q1 就停：沉積岩。挑「片岩」：無層理但葉理發達 → Q2：變質岩。",
          "挑「花崗岩」：兩者皆無 → Q3 用粗粒結晶定名：火成岩。挑「大理岩」滴稀鹽酸：冒泡 → 變質岩。"],
        rule: "先分三大類再細分：組織（顆粒、層理、葉理）反映成因，礦物組成才是定名的最後一步——順序顛倒常把大理岩誤判成石英岩。"
      });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "鑑定結果" });
      const rCls = PL.ui.readout(ui.L.readouts, { label: "三大類判定" }), rFeat = PL.ui.readout(ui.L.readouts, { label: "觀察特徵" });
      const rAcid = PL.ui.readout(ui.L.readouts, { label: "稀鹽酸反應" }), rName = PL.ui.readout(ui.L.readouts, { label: "定名" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 台灣的岩石分布 */
  PL.register("taiwan-rocks", {
    build(root) {
      const ZONES = {
        west: { name: "西部麓山帶", rocks: "砂岩、頁岩、泥岩、礫岩", role: "歐亞板塊前緣的沉積蓋層", color: "#d9b36c" },
        central: { name: "中央山脈變質帶", rocks: "板岩、片岩、大理岩、片麻岩", role: "造山帶變質核心（大南澳帶）", color: "#7a8a96" },
        valley: { name: "花東縱谷", rocks: "沖積礫石層", role: "歐亞—菲律賓海板塊縫合帶", color: "#8fae6f" }, coast: { name: "海岸山脈", rocks: "安山岩集塊岩、利吉混同層", role: "呂宋島弧（菲律賓海板塊）", color: "#4a4f57" }
      };
      const MARKS = {
        west: { lon: 120.6, lat: 23.8, label: "砂岩頁岩", color: "#d9b36c" }, central: { lon: 121.4, lat: 24.0, label: "大理岩", color: "#5d6672" },
        valley: { lon: 121.2, lat: 23.6, label: "縫合帶", color: "#5c9e6f" }, coast: { lon: 121.4, lat: 23.0, label: "安山岩", color: "#4a4f57" }
      };
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const zk = zoneSel.get(), z = ZONES[zk], lat = latS.get();
          // 台灣簡圖＋剖面線
          const mb = { x: W * 0.04, y: H * 0.08, w: W * 0.24, h: H * 0.38 };
          const proj = CK.taiwanMap(ctx, mb, { markers: [MARKS[zk]] });
          const [lx1, ly1] = proj(120.15, lat), [lx2] = proj(121.95, lat);
          D.line(ctx, lx1, ly1, lx2, ly1, PL.col("accent"), 2, [6, 4]);
          D.text(ctx, "A–A′ " + lat.toFixed(1) + "°N", lx1, ly1 - 8, { color: PL.col("accent"), size: 9.5 });
          // 地質區資料卡
          CK.panel(ctx, W * 0.36, H * 0.06, W * 0.59, H * 0.32, "地質區：" + z.name);
          const rows = [["主要岩石", z.rocks], ["板塊角色", z.role], ["剖面緯度", lat.toFixed(1) + "°N"]];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.39, H * 0.14 + i * 44, { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.39, H * 0.14 + i * 44 + 17, { color: PL.col("text"), size: 11.5 });
          });
          // 東西向剖面 A–A′（垂直誇大示意）
          const x0 = W * 0.36, x1 = W * 0.94, base = H * 0.90, sea = H * 0.52;
          D.line(ctx, x0, sea, x1, sea, PL.theme.isLight() ? "#4a90d9" : "#5da8dd", 1.6);
          const wEnd = x0 + (x1 - x0) * 0.42, cEnd = x0 + (x1 - x0) * 0.66, vEnd = x0 + (x1 - x0) * 0.74, coastEnd = x0 + (x1 - x0) * 0.88;
          // 西部沉積蓋層（rockLayers 陣列第一個是最上層＝最年輕）
          CK.rockLayers(ctx, { x: x0, y: sea, w: wEnd - x0, h: base - sea }, [
            { label: "礫岩", h: 1.0, color: CK.rockColor("conglomerate") }, { label: "砂岩", h: 1.1, color: CK.rockColor("sandstone") },
            { label: "頁岩", h: 0.9, color: CK.rockColor("shale") }, { label: "泥岩", h: 0.8, color: "#7d8592" }], { tilt: 2 });
          D.text(ctx, "西部：沉積蓋層（下老上新）", x0 + (wEnd - x0) / 2, base + 14, { color: zk === "west" ? PL.col("accent") : PL.col("text-faint"), size: 10, align: "center", weight: zk === "west" ? "700" : "400" });
          // 中央變質帶（山形塊體＋大理岩帶）
          ctx.save(); ctx.fillStyle = "#5d6672";
          ctx.beginPath(); ctx.moveTo(wEnd, base); ctx.lineTo(wEnd, H * 0.46); ctx.lineTo((wEnd + cEnd) / 2, H * 0.30); ctx.lineTo(cEnd, H * 0.44); ctx.lineTo(cEnd, base); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = "rgba(30,36,44,0.7)"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.fillStyle = "#e3e7ea";
          ctx.beginPath(); ctx.moveTo(lerp(wEnd, cEnd, 0.55), base); ctx.lineTo(lerp(wEnd, cEnd, 0.62), H * 0.40); ctx.lineTo(lerp(wEnd, cEnd, 0.78), H * 0.44); ctx.lineTo(lerp(wEnd, cEnd, 0.74), base); ctx.closePath(); ctx.fill();
          ctx.restore();
          for (let i = 0; i < 6; i++) D.line(ctx, wEnd + (wEnd - x0) * 0.1 + i * 10, base, wEnd + (wEnd - x0) * 0.02 + i * 10, H * 0.48, "rgba(200,212,224,0.4)", 1.2);
          D.text(ctx, "板岩・片岩", lerp(wEnd, cEnd, 0.16), H * 0.55, { color: "#cdd6de", size: 9.5, align: "center" });
          D.text(ctx, "大理岩（花蓮）", lerp(wEnd, cEnd, 0.67), H * 0.62, { color: "#4a5058", size: 9.5, align: "center", weight: "700" });
          D.text(ctx, "中央山脈：變質帶", (wEnd + cEnd) / 2, base + 14, { color: zk === "central" ? PL.col("accent") : PL.col("text-faint"), size: 10, align: "center", weight: zk === "central" ? "700" : "400" });
          // 縱谷與海岸山脈
          const eastOK = lat >= 22.4 && lat <= 24.6;
          if (eastOK) {
            D.line(ctx, cEnd, base, cEnd + (x1 - x0) * 0.008, H * 0.50, "rgba(220,80,60,0.9)", 2.2, [5, 4]); D.text(ctx, "縫合帶", cEnd + 4, H * 0.50, { color: "#d9704f", size: 9 });
            D.rect(ctx, cEnd, base - 8, vEnd - cEnd, 8, { fill: "#8fae6f" }); ctx.save(); ctx.fillStyle = "#4a4f57";
            ctx.beginPath(); ctx.moveTo(vEnd, base); ctx.lineTo(vEnd, H * 0.50); ctx.lineTo(coastEnd, H * 0.54); ctx.lineTo(coastEnd, base); ctx.closePath(); ctx.fill(); ctx.restore();
            D.text(ctx, "安山岩集塊岩", (vEnd + coastEnd) / 2, H * 0.66, { color: "#cdd6de", size: 9.5, align: "center" });
            D.text(ctx, "縱谷＋海岸山脈：呂宋島弧", (cEnd + coastEnd) / 2, base + 14, { color: zk === "coast" || zk === "valley" ? PL.col("accent") : PL.col("text-faint"), size: 10, align: "center", weight: zk === "coast" || zk === "valley" ? "700" : "400" });
          } else D.text(ctx, "此緯度以東為太平洋", (cEnd + x1) / 2, H * 0.70, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          if (lat >= 24.8) {
            CK.volcanoShape(ctx, x0 + (x1 - x0) * 0.16, sea - 4, W * 0.13, H * 0.10, "strato", {});
            D.text(ctx, "大屯火山群（安山岩）", x0 + (x1 - x0) * 0.16, sea - H * 0.13, { color: "#d9704f", size: 9.5, align: "center", weight: "700" });
          }
          D.text(ctx, "（剖面為示意，垂直誇大）", (x0 + x1) / 2, H * 0.97, { color: PL.col("text-faint"), size: 9, align: "center" });
          const count = 4 + 3 + (eastOK ? 1 : 0) + (lat >= 24.8 ? 1 : 0);
          rZone.set(z.name); rRock.set(z.rocks); rRole.set(z.role); rCount.set(count, 0);
          vZen.set(zk === "west" && lat < 23.2 ? "西南部厚層泥岩：遇水軟弱、易崩——邊坡與橋基注意" : zk === "coast" ? "海岸山脈＝呂宋島弧前緣，約 200–300 萬年前撞上歐亞板塊" : zk === "central" ? "大南澳變質帶：台灣最老岩石所在，大理岩產於花蓮" : "西部沉積蓋層：造山帶前陸的砂岩頁岩互層", zk === "west" && lat < 23.2 ? "warn" : zk === "central" ? "ok" : "info");
        }
      });
      const zoneSel = PL.ui.select(ui.L.controls, { label: "焦點地質區", value: "west", options: Object.keys(ZONES).map(k => ({ value: k, label: ZONES[k].name })) });
      const latS = PL.ui.slider(ui.L.controls, { label: "剖面緯度", min: 22.0, max: 25.2, step: 0.1, value: 23.8, unit: "°N", digits: 1 });
      PL.ui.note(ui.L.controls, "台灣的岩石分布是一部造山史：西部是歐亞板塊的沉積蓋層，中央山脈東翼露出變質核心，東部海岸山脈則是撞進來的呂宋島弧。南北移動剖面線，看岩石如何變化。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀一張地體構造圖",
        steps: [
          "剖面放在 23.8°N：由西向東依序是沉積層 → 變質帶 → 縫合帶 → 島弧。",
          "拉到 25.0°N：西北端冒出大屯火山群，東邊沒有海岸山脈；拉到 22.8°N：海岸山脈南段。",
          "切換焦點地質區，對照資料卡裡的板塊角色。"],
        rule: "岩石分布直接反映板塊構造：看到變質帶就想到碰撞擠壓的深部，看到安山岩就想到隱沒帶的島弧岩漿。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "北部（大屯火山）", apply: () => { zoneSel.set("west"); latS.set(25.0); ui.redraw(); } },
        { label: "花蓮大理岩", apply: () => { zoneSel.set("central"); latS.set(24.0); ui.redraw(); } },
        { label: "南段海岸山脈", apply: () => { zoneSel.set("coast"); latS.set(22.8); ui.redraw(); } }] });
      const vZen = PL.ui.verdict(ui.L.controls, { label: "地體判讀" });
      const rZone = PL.ui.readout(ui.L.readouts, { label: "地質區" }), rRock = PL.ui.readout(ui.L.readouts, { label: "代表岩石" });
      const rRole = PL.ui.readout(ui.L.readouts, { label: "板塊角色" }), rCount = PL.ui.readout(ui.L.readouts, { label: "剖面岩類數" });
      return { stop() { ui.stop(); } };
    }
  });
})();
