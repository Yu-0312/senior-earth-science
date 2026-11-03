/* 模組一 · 認識地球與太陽系起源 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 地球的形狀與大小 */
  PL.register("earth-shape", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const exag = exagS.get(); // 扁率誇大倍數
          const a = H * 0.32;                       // 赤道半徑
          const b = a * (1 - (1 / 298) * exag);     // 極半徑
          const cx = W * 0.30, cy = H * 0.46;
          // 地球：誇大扁率的橢球
          ctx.save();
          const g = ctx.createRadialGradient(cx - a * 0.3, cy - b * 0.35, a * 0.15, cx, cy, a);
          g.addColorStop(0, "#5da8dd"); g.addColorStop(1, "#2e5f92");
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.ellipse(cx, cy, a, b, 0, 0, TAU); ctx.fill();
          ctx.restore();
          // 赤道與極軸標註
          D.line(ctx, cx - a - 14, cy, cx + a + 14, cy, "rgba(255,255,255,0.7)", 1.4, [5, 4]);
          D.text(ctx, "赤道半徑 a = 6378 km", cx, cy + 24, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.line(ctx, cx, cy - b - 14, cx, cy + b + 14, "rgba(255,255,255,0.7)", 1.4, [5, 4]);
          D.text(ctx, "極半徑 b = 6357 km", cx + a * 0.42, cy - b - 20, { color: PL.col("text-dim"), size: 10.5 });
          // 圓度差異徽章
          CK.badge(ctx, cx, cy - b - 26, "扁率 1/298 × " + exag + " 誇大", PL.col("accent"));
          // 右側數值
          CK.panel(ctx, W * 0.60, H * 0.14, W * 0.34, H * 0.64, "地球的尺寸");
          const diff = 6378 - 6357;
          const rows = [
            ["赤道半徑", "6378 km"],
            ["極半徑", "6357 km"],
            ["半徑差", diff + " km（" + (diff / 6378 * 100).toFixed(2) + "%）"],
            ["最高山珠峰", "8.85 km"],
            ["最深海溝", "11 km"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.63, H * 0.26 + i * 28, { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.90, H * 0.26 + i * 28, { color: i >= 2 ? PL.col("accent") : PL.col("text"), size: 11.5, align: "right" });
          });
          D.text(ctx, "地表最高與最深相對半徑都小於 0.2%——地球比撞球還圓。", W * 0.77, H * 0.70, { color: PL.col("text-dim"), size: 10, align: "center" });
          rA.set(6378, 0); rB.set(6357, 0); rDiff.set(diff, 0); rEx.set(exag, 0);
        }
      });
      const exagS = PL.ui.slider(ui.L.controls, { label: "扁率誇大倍數", min: 1, max: 100, step: 1, value: 1, unit: "×", digits: 0 });
      PL.ui.note(ui.L.controls, "真實扁率只有 1/298，肉眼根本看不出來；把誇大倍數拉高，才看得出「自轉讓赤道凸出」的效果。");
      PL.ui.procedure(ui.L.controls, {
        title: "量化「有多圓」",
        steps: [
          "在 1× 下觀察：地球看起來是完美的圓。",
          "把誇大拉到 50×、100×：赤道才明顯凸出。",
          "比較右側半徑差 21 km——只占地表半徑的 0.33%。"
        ],
        rule: "自轉的離心力讓赤道略凸，但量級極小；任何「地球儀能看出的凹凸」都是誇大，不是真實比例。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "真實比例", apply: () => exagS.set(1) },
        { label: "明顯可見", apply: () => exagS.set(40) },
        { label: "極端誇大", apply: () => exagS.set(100) }
      ] });
      const rA = PL.ui.readout(ui.L.readouts, { label: "赤道半徑", unit: "km" });
      const rB = PL.ui.readout(ui.L.readouts, { label: "極半徑", unit: "km" });
      const rDiff = PL.ui.readout(ui.L.readouts, { label: "半徑差", unit: "km" });
      const rEx = PL.ui.readout(ui.L.readouts, { label: "誇大倍數", unit: "×" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 地球的分層構造 */
  PL.register("earth-layers-intro", {
    build(root) {
      const LAYERS = [
        { key: "crust", name: "地殼", thick: 0.015, color: "#8fae6f", note: "最外層岩石；大陸厚 40–70 km、海洋僅 5–10 km", density: "2.7–3.0 g/cm³" },
        { key: "mantle", name: "地函", thick: 0.45, color: "#c98a5a", note: "體積最大；固態但可緩慢流動，對流驅動板塊", density: "3.3–5.6 g/cm³" },
        { key: "outer", name: "外核", thick: 0.19, color: "#e8a13c", note: "液態鐵鎳；流動產生地球磁場", density: "9.9–12.2 g/cm³" },
        { key: "inner", name: "內核", thick: 0.16, color: "#f2d16b", note: "固態鐵鎳；壓力極高使其保持固體", density: "12.8–13.1 g/cm³" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const cut = cutSel.get();
          const showMag = magChk.get();
          if (cut === "half") {
            // 半圓剖面
            const cx = W * 0.30, cy = H * 0.88, R = H * 0.66;
            let r0 = R;
            LAYERS.forEach(l => {
              const r1 = r0 - l.thick * R;
              ctx.save();
              ctx.beginPath();
              ctx.arc(cx, cy, r0, Math.PI, 0, false);
              ctx.arc(cx, cy, Math.max(0, r1), 0, Math.PI, true);
              ctx.closePath();
              ctx.fillStyle = l.color; ctx.fill();
              ctx.strokeStyle = "rgba(0,0,0,0.3)"; ctx.lineWidth = 1.2; ctx.stroke();
              ctx.restore();
              r0 = r1;
            });
            // 標註
            const put = (f, name, color) => {
              const rr = R * f;
              D.line(ctx, cx + rr * 0.72, cy - rr * 0.72, cx + rr * 0.72 + 20, cy - rr * 0.72 - 12, PL.col("text-faint"), 1);
              D.text(ctx, name, cx + rr * 0.72 + 24, cy - rr * 0.72 - 12, { color, size: 11, weight: "700" });
            };
            put(0.985, "地殼", "#c8d6b8"); put(0.85, "地函", "#d9a06a"); put(0.35, "外核", "#f0b45a"); put(0.1, "內核", "#f7dc85");
            if (showMag) {
              // 地磁示意：偶極場線
              for (let i = -2; i <= 2; i++) {
                ctx.save();
                ctx.strokeStyle = "rgba(120,180,240,0.55)"; ctx.lineWidth = 1.4;
                ctx.beginPath();
                ctx.ellipse(cx, cy, R * (0.55 + Math.abs(i) * 0.28), R * (0.8 + Math.abs(i) * 0.35), 0, Math.PI, TAU);
                ctx.stroke();
                ctx.restore();
              }
              D.text(ctx, "外核流動 → 地磁場", cx, H * 0.10, { color: "#7cb7e8", size: 11, align: "center", weight: "700" });
            }
          } else {
            // 橫條比例
            const x0 = W * 0.08, w0 = W * 0.62, y0 = H * 0.30;
            let acc = 0;
            LAYERS.forEach(l => {
              const segW = l.thick / 0.82 * w0;
              D.rect(ctx, x0 + acc, y0, segW, 56, { fill: l.color, stroke: "rgba(0,0,0,0.25)", width: 1 });
              D.text(ctx, l.name, x0 + acc + segW / 2, y0 + 32, { color: "#20262e", size: 12, align: "center", weight: "700" });
              acc += segW;
            });
            D.text(ctx, "各層厚度以半徑 6371 km 為比例", x0 + w0 / 2, y0 - 14, { color: PL.col("text-faint"), size: 10, align: "center" });
            D.text(ctx, "地殼只占最左邊一小段——把它放大才能看見。", x0 + w0 / 2, y0 + 84, { color: PL.col("text-dim"), size: 11, align: "center" });
          }
          // 資料卡
          const sel = LAYERS.find(l => l.key === layerSel.get());
          CK.panel(ctx, W * 0.62, H * 0.16, W * 0.32, H * 0.62, sel.name);
          D.text(ctx, sel.note, W * 0.78, H * 0.30, { color: PL.col("text-dim"), size: 11, align: "center" });
          D.text(ctx, "密度 " + sel.density, W * 0.78, H * 0.40, { color: PL.col("accent"), size: 12, align: "center", weight: "700" });
          D.text(ctx, "由外向內密度遞增：", W * 0.78, H * 0.52, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          D.text(ctx, "早期熔融地球的重物質下沉", W * 0.78, H * 0.58, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          rLayer.set(sel.name); rDens.set(sel.density); rNote.set(sel.note);
        }
      });
      const cutSel = PL.ui.select(ui.L.controls, { label: "呈現方式", value: "half", options: [
        { value: "half", label: "半圓剖面" }, { value: "bar", label: "厚度比例條" }
      ] });
      const layerSel = PL.ui.select(ui.L.controls, { label: "聚焦分層", value: "mantle", options: LAYERS.map(l => ({ value: l.key, label: l.name })) });
      const magChk = PL.ui.checkbox(ui.L.controls, { label: "顯示地磁場", checked: true });
      PL.ui.note(ui.L.controls, "分層不是畫好玩的：每層的密度與物態（固態／液態）都由地震波探測出來，分層源於早期地球的密度分化。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀懂分層",
        steps: [
          "切到「厚度比例條」：地殼薄得幾乎看不見，地函占最大體積。",
          "切回剖面，逐層點選資料卡：密度怎麼變？",
          "觀察外核：液態鐵鎳的流動產生地磁。"
        ],
        rule: "「液態外核」不是推測出來的形容，而是 S 波進不去的直接觀測結果。"
      });
      const rLayer = PL.ui.readout(ui.L.readouts, { label: "聚焦分層" });
      const rDens = PL.ui.readout(ui.L.readouts, { label: "密度範圍" });
      const rNote = PL.ui.readout(ui.L.readouts, { label: "層性質" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 四大圈層與交互作用 */
  PL.register("earth-spheres", {
    build(root) {
      const SPHERES = [
        { key: "litho", name: "岩石圈", color: "#8a6f52", role: "地殼與上部地函；板塊的剛性外殼", give: "火山釋放氣體、風化提供養分" },
        { key: "hydro", name: "水圈", color: "#4a90d9", role: "海洋、冰、河湖與地下水", give: "降水侵蝕地表、蒸發補充大氣水汽" },
        { key: "atmo", name: "大氣圈", color: "#9575cd", role: "氮氧為主的氣體層；天氣的舞台", give: "降雨與風化搬運、CO₂ 供光合作用" },
        { key: "bio", name: "生物圈", color: "#66bb6a", role: "所有生命及其棲地", give: "光合作用改變大氣、生物風化岩石" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.60, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const flow = flowS.get(); // 流動強度
          const cx = W * 0.36, cy = H * 0.50, R = H * 0.30;
          // 地球
          CK.globe(ctx, cx, cy, R, { spin: t * 0.02, seed: 6 });
          // 圈層泡泡
          const pos = {
            litho: [cx - R * 1.25, cy + R * 0.9],
            hydro: [cx - R * 1.35, cy - R * 0.6],
            atmo: [cx + R * 1.35, cy - R * 0.55],
            bio: [cx + R * 1.3, cy + R * 0.9]
          };
          SPHERES.forEach(s => {
            const [x, y] = pos[s.key];
            D.disc(ctx, x, y, 34, { fill: s.color.replace(")", ",0.75)").replace("#", "#"), stroke: s.color, width: 2 });
            // 簡化：直接色塊
            ctx.save();
            ctx.globalAlpha = 0.9;
            D.disc(ctx, x, y, 34, { fill: s.color });
            ctx.restore();
            D.text(ctx, s.name, x, y + 4, { color: "#fff", size: 11.5, align: "center", weight: "700" });
            D.text(ctx, s.role, x, y + 50, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          });
          // 交互箭頭
          const pairs = [["litho", "atmo"], ["atmo", "hydro"], ["hydro", "litho"], ["bio", "atmo"], ["bio", "hydro"]];
          pairs.forEach(([a, b], i) => {
            const [x1, y1] = pos[a], [x2, y2] = pos[b];
            const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
            const off = (i % 2 ? 1 : -1) * 18;
            const ctrl = [mx, my + off];
            const t2 = ((t * 0.15 + i * 0.2) % 1);
            // 曲線
            ctx.save();
            ctx.strokeStyle = "rgba(140,170,200,0.6)"; ctx.lineWidth = 1.6;
            ctx.beginPath(); ctx.moveTo(x1, y1);
            ctx.quadraticCurveTo(ctrl[0], ctrl[1], x2, y2);
            ctx.stroke(); ctx.restore();
            // 流動光點
            if (flow > 0.05) {
              for (let k = 0; k < Math.round(flow * 3); k++) {
                const f = ((t2 + k * 0.33) % 1);
                const qx = (1 - f) * (1 - f) * x1 + 2 * (1 - f) * f * ctrl[0] + f * f * x2;
                const qy = (1 - f) * (1 - f) * y1 + 2 * (1 - f) * f * ctrl[1] + f * f * y2;
                D.disc(ctx, qx, qy, 2.6, { fill: "#ffe082", glow: "#ffb300", glowSize: 6 });
              }
            }
          });
          rPair.set("水循環貫穿四圈，碳是最活躍的跨圈層元素");
          rCount.set(4, 0);
        }
      });
      const flowS = PL.ui.slider(ui.L.controls, { label: "物質交換強度", min: 0, max: 1, step: 0.05, value: 0.7, digits: 2 });
      PL.ui.note(ui.L.controls, "圈層不是四個獨立的箱子：黃色光點是跨圈層的物質流（水、碳、養分）。交換停止，地球就會變成死星球。");
      PL.ui.procedure(ui.L.controls, {
        title: "追一顆水分子",
        steps: [
          "從水圈（海洋）蒸發 → 進入大氣圈。",
          "凝結成雨落下 → 降回岩石圈地表。",
          "地表逕流攜帶礦物養分 → 餵養生物圈。",
          "生物再以蒸散把水送回大氣——循環閉合。"
        ],
        rule: "考題常問「某事件影響哪些圈層」：火山（岩石圈→大氣）、颱風（大氣→水圈）、森林大火（生物圈→大氣）。"
      });
      const rPair = PL.ui.readout(ui.L.readouts, { label: "交換重點" });
      const rCount = PL.ui.readout(ui.L.readouts, { label: "圈層數" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 太陽系的比例尺 */
  PL.register("solar-system-scale", {
    build(root) {
      const PLANETS = [
        { name: "水星", au: 0.39, size: 0.38, color: "#b8a99a" },
        { name: "金星", au: 0.72, size: 0.95, color: "#e8c07a" },
        { name: "地球", au: 1.0, size: 1.0, color: "#5da8dd" },
        { name: "火星", au: 1.52, size: 0.53, color: "#d97b52" },
        { name: "木星", au: 5.2, size: 11.2, color: "#d9a06a" },
        { name: "土星", au: 9.5, size: 9.4, color: "#e8d6a0" },
        { name: "天王星", au: 19.2, size: 4.0, color: "#8fd0d9" },
        { name: "海王星", au: 30.1, size: 3.9, color: "#5a7fd9" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.56,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const mode = modeSel.get();
          const scale = scaleS.get();
          // 太陽
          const sx = W * 0.06, sy = H * 0.52;
          CK.sunIcon(ctx, sx, sy, 16, {});
          // 行星軌道列
          const xmax = mode === "linear" ? 31 : Math.log10(31);
          const X = au => sx + 30 + (mode === "linear" ? au / xmax : Math.log10(au + 0.2) / xmax) * (W * 0.88 - scale * 0.1);
          PLANETS.forEach(p => {
            const x = X(p.au);
            const r = Math.max(2.5, Math.min(16, p.size * (2 + scale)));
            D.line(ctx, x, sy - 44, x, sy + 44, "rgba(140,160,180,0.25)", 1);
            D.disc(ctx, x, sy, r, { fill: p.color });
            if (p.size > 5) D.ring(ctx, x, sy, r + 3, "rgba(230,220,180,0.7)", 1.4);
            D.text(ctx, p.name, x, sy + 58, { color: PL.col("text-dim"), size: 10, align: "center" });
            D.text(ctx, p.au + " AU", x, sy - 50, { color: PL.col("text-faint"), size: 9, align: "center" });
          });
          const earthX = X(1.0), nepX = X(30.1);
          D.text(ctx, mode === "linear" ? "線性距離：內行星擠在一起，外行星遙遠" : "對數距離：每個行星都看得到，但間隔感失真",
            W / 2, H * 0.12, { color: PL.col("text-dim"), size: 11.5, align: "center", weight: "700" });
          D.text(ctx, "光從太陽到地球 8 分 19 秒；到海王星 4 小時 10 分", W / 2, H * 0.90, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          rMode.set(mode === "linear" ? "線性" : "對數");
          rLight.set(499, 0);
          rGap.set((nepX - earthX).toFixed(0), 0);
        }
      });
      const modeSel = PL.ui.select(ui.L.controls, { label: "距離尺度", value: "linear", options: [
        { value: "linear", label: "線性（真實比例）" }, { value: "log", label: "對數（壓縮）" }
      ] });
      const scaleS = PL.ui.slider(ui.L.controls, { label: "行星大小誇大", min: 0, max: 10, step: 0.5, value: 3, digits: 1 });
      PL.ui.note(ui.L.controls, "行星大小與距離無法同時按比例畫在一張圖上：按距離縮尺時行星小於一個像素，按大小縮尺時圖又裝不下海王星。");
      PL.ui.procedure(ui.L.controls, {
        title: "感受太陽系的空",
        steps: [
          "線性模式下看內行星：四顆擠在太陽旁邊。",
          "切換對數模式：間隔感消失，但每顆都看得見。",
          "讀底部光行時間：太陽系真的很空、很遠。"
        ],
        rule: "1 AU = 1.5 億公里。圖上任何「行星撞在一起」的畫面都是誇大，真實太空幾乎全是空無。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "真實線性", apply: () => { modeSel.set("linear"); scaleS.set(1); } },
        { label: "教學示意", apply: () => { modeSel.set("log"); scaleS.set(4); } }
      ] });
      const rMode = PL.ui.readout(ui.L.readouts, { label: "距離尺度" });
      const rLight = PL.ui.readout(ui.L.readouts, { label: "日地光行時間", unit: "秒" });
      const rGap = PL.ui.readout(ui.L.readouts, { label: "地–海王星圖距", unit: "px" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 太陽系與地球的誕生 */
  PL.register("earth-origin", {
    build(root) {
      const STAGES = [
        { key: "nebula", name: "星雲塌縮", desc: "氣體塵埃雲受重力收縮，旋轉加快、壓扁成盤", temp: "10–100 K" },
        { key: "protosun", name: "原太陽點燃", desc: "中心氫開始核融合，行星盤仍以塵埃為主", temp: "中心 10⁷ K" },
        { key: "accretion", name: "吸積成原行星", desc: "塵埃相互碰撞黏合，內側岩石金屬、外側加冰", temp: "雪線內 >150 K" },
        { key: "magma", name: "岩漿海與分化", desc: "撞擊與放射性衰變熔融地球，鐵鎳下沉成核", temp: "地表 >1500 °C" },
        { key: "moon", name: "大撞擊與月球", desc: "火星大小的天體撞擊，飛散物質聚合成月球", temp: "矽酸鹽蒸氣" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const idx = Math.round(clamp(stageS.get(), 0, 4));
          const st = STAGES[idx];
          const cx = W * 0.36, cy = H * 0.50;
          ctx.save();
          ctx.fillStyle = "#10131c";
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
          // 背景星星
          if (PL.apparatus.starfield) PL.apparatus.starfield(ctx, W, H, 7);
          if (idx === 0 || idx === 1) {
            // 星雲盤
            const rot = t * (idx === 1 ? 0.5 : 0.2);
            for (let i = 0; i < 60; i++) {
              const a = i * 0.61 + rot, rr = (30 + (i * 37 % 120)) * (H / 420);
              D.disc(ctx, cx + Math.cos(a) * rr * 1.5, cy + Math.sin(a) * rr * 0.5, 1.6 + (i % 3), { fill: "rgba(200,215,240," + (idx === 1 ? 0.5 : 0.8) + ")" });
            }
            if (idx === 1) CK.sunIcon(ctx, cx, cy, 18, { glow: 24 });
          } else if (idx === 2) {
            for (let i = 0; i < 8; i++) {
              const a = i * 0.8 + t * 0.6, rr = (40 + i * 22) * (H / 420);
              const inner = i < 4;
              D.disc(ctx, cx + Math.cos(a) * rr * 1.4, cy + Math.sin(a) * rr * 0.55, 4 + i % 3, { fill: inner ? "#c98a5a" : "#8fd0d9" });
            }
            D.text(ctx, "內側：岩石金屬　外側：冰＋氣", cx, H * 0.86, { color: PL.col("text-dim"), size: 11, align: "center" });
          } else if (idx === 3) {
            // 熔融地球＋重物質下沉
            const r = H * 0.26;
            const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
            g.addColorStop(0, "#ff8a50"); g.addColorStop(1, "#c0392b");
            D.disc(ctx, cx, cy, r, { fill: g });
            for (let i = 0; i < 10; i++) {
              const f = ((t * 0.2 + i / 10) % 1);
              const x = cx + Math.sin(i * 2.4) * r * 0.5 * (1 - f * 0.3);
              const y = cy - r * 0.6 + f * r * 1.2;
              D.disc(ctx, x, y, 4 - f * 1.5, { fill: "#e8a13c", glow: "#ff5722", glowSize: 6 });
            }
            D.text(ctx, "鐵鎳下沉 → 分層結構", cx, cy + r + 22, { color: "#ffb380", size: 11, align: "center" });
          } else {
            // 大撞擊
            const f = (t * 0.35) % 1;
            const ax = cx - H * 0.4 + f * H * 0.34;
            D.disc(ctx, ax, cy - f * H * 0.06, 14, { fill: "#b3541e" });
            CK.globe(ctx, cx + H * 0.14, cy, H * 0.2, { seed: 5 });
            if (f > 0.62) {
              for (let i = 0; i < 14; i++) {
                const a = i / 14 * TAU;
                D.disc(ctx, cx + Math.cos(a) * (18 + f * 60), cy + Math.sin(a) * (14 + f * 46), 2.4, { fill: "rgba(255,170,120," + (1 - f) + ")" });
              }
            }
            D.text(ctx, "飛散物質在軌道上聚合成月球", cx, H * 0.88, { color: PL.col("text-dim"), size: 11, align: "center" });
          }
          // 資料卡
          CK.panel(ctx, W * 0.66, H * 0.16, W * 0.28, H * 0.58, "階段 " + (idx + 1) + "/5");
          D.text(ctx, st.name, W * 0.80, H * 0.28, { color: PL.col("accent"), size: 14, align: "center", weight: "700" });
          D.text(ctx, st.desc, W * 0.80, H * 0.40, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "溫度尺度：" + st.temp, W * 0.80, H * 0.52, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          rStage.set(st.name); rDesc.set(st.desc);
        }
      });
      const stageS = PL.ui.slider(ui.L.controls, { label: "演化階段", min: 0, max: 4, step: 1, value: 0, digits: 0 });
      PL.ui.note(ui.L.controls, "五個階段是一條連續的故事：星雲 → 點燃 → 吸積 → 分化 → 撞出月球。拖動滑桿逐段看。");
      PL.ui.procedure(ui.L.controls, {
        title: "為什麼內側是岩石行星",
        steps: [
          "看階段 3：雪線以內太熱，冰與氣體無法凝結。",
          "所以內側只能由岩石金屬吸積成小而密的行星。",
          "外側能累積大量冰與氣體，長成巨大的類木行星。"
        ],
        rule: "「類地／類木的分界」是溫度的問題，不是隨機分布；雪線以外才能長出冰與氫氦。"
      });
      PL.ui.presets(ui.L.controls, { label: "跳到", options: [
        { label: "吸積", apply: () => stageS.set(2) },
        { label: "分化", apply: () => stageS.set(3) },
        { label: "月球起源", apply: () => stageS.set(4) }
      ] });
      const rStage = PL.ui.readout(ui.L.readouts, { label: "階段" });
      const rDesc = PL.ui.readout(ui.L.readouts, { label: "發生什麼" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 地球 46 億年大事記 */
  PL.register("earth-history-timeline", {
    build(root) {
      const EVENTS = [
        { ga: 4.6, label: "地球誕生", color: "#c0392b" },
        { ga: 4.0, label: "海洋形成", color: "#e8a13c" },
        { ga: 3.8, label: "最早生命痕跡", color: "#66bb6a" },
        { ga: 2.4, label: "大氧化事件", color: "#5b8def" },
        { ga: 0.54, label: "寒武紀大爆發", color: "#9575cd" },
        { ga: 0.25, label: "二疊紀末大滅絕", color: "#8d6e63" },
        { ga: 0.066, label: "恐龍滅絕（K–Pg）", color: "#ef8829" },
        { ga: 0.0003, label: "智人出現", color: "#e57373" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.54,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const compress = compressS.get();
          // 兩種時間軸
          const x0 = W * 0.10, w0 = W * 0.84, y = H * 0.60;
          const X = ga => {
            if (compress < 0.5) return x0 + (1 - ga / 4.6) * w0;                       // 線性
            return x0 + (1 - Math.pow(ga / 4.6, 0.25)) * w0;                            // 壓縮近世
          };
          D.line(ctx, x0, y, x0 + w0, y, PL.col("border"), 3);
          D.text(ctx, "46 億年前", x0, y + 24, { color: PL.col("text-faint"), size: 10, align: "center" });
          D.text(ctx, "現在", x0 + w0, y + 24, { color: PL.col("text-faint"), size: 10, align: "center" });
          EVENTS.forEach(e => {
            const x = X(e.ga);
            D.disc(ctx, x, y, 7, { fill: e.color, stroke: "#fff", width: 1.2 });
            const above = EVENTS.indexOf(e) % 2 === 0;
            D.line(ctx, x, y - (above ? 8 : -8), x, y - (above ? 40 : -40), "rgba(140,160,180,0.5)", 1);
            D.text(ctx, e.label, x, y - (above ? 48 : 58), { color: PL.col("text-dim"), size: 10.5, align: "center" });
            D.text(ctx, (e.ga >= 1 ? e.ga : (e.ga * 1000).toFixed(0) + " 百萬") + (e.ga >= 1 ? " 億年" : " 年"), x, y + (above ? -58 : 44), { color: PL.col("text-faint"), size: 9, align: "center" });
          });
          const hi = EVENTS[Math.round(clamp(highlightS.get(), 0, 7))] || EVENTS[0];
          const hx = X(hi.ga);
          D.ring(ctx, hx, y, 13, hi.color, 2);
          D.text(ctx, compress < 0.5 ? "線性軸：人類歷史擠在最後一個像素裡" : "壓縮軸：把近世拉開才看得到文明史",
            W / 2, H * 0.16, { color: PL.col("text-dim"), size: 11.5, align: "center", weight: "700" });
          D.text(ctx, "聚焦：" + hi.label + "（" + (hi.ga >= 1 ? hi.ga + " 億年前" : Math.round(hi.ga * 10000) / 10 + " 百萬年前") + "）",
            W / 2, H * 0.86, { color: hi.color, size: 12, align: "center", weight: "700" });
          rMode.set(compress < 0.5 ? "線性時間軸" : "壓縮時間軸");
          rFocus.set(hi.label);
          rAge.set(hi.ga >= 1 ? hi.ga * 10 : hi.ga * 10000, 0);
        }
      });
      const compressS = PL.ui.slider(ui.L.controls, { label: "近世壓縮", min: 0, max: 1, step: 0.1, value: 0, digits: 1 });
      const highlightS = PL.ui.slider(ui.L.controls, { label: "聚焦事件", min: 0, max: 7, step: 1, value: 6, digits: 0 });
      PL.ui.note(ui.L.controls, "把 46 億年壓成一天：生命在清晨出現、恐龍在 11 點滅絕、人類在最後幾秒——這就是地質時間的尺度感。");
      PL.ui.procedure(ui.L.controls, {
        title: "兩種看時間的方法",
        steps: [
          "線性軸：公平但殘忍——寒武紀以後全擠在右端 12%。",
          "拉高壓縮：近 5 億年被放大，生物演化的事件才看得清。",
          "聚焦「智人出現」：0.03% 的地球史，卻改變了整個行星表面。"
        ],
        rule: "地質年代表以「代 → 紀 → 世」分層；界線常對應大滅絕或大演化事件。"
      });
      const rMode = PL.ui.readout(ui.L.readouts, { label: "時間軸模式" });
      const rFocus = PL.ui.readout(ui.L.readouts, { label: "聚焦事件" });
      const rAge = PL.ui.readout(ui.L.readouts, { label: "距今", unit: "百萬年" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 密度分層與早期地球 */
  PL.register("density-stratification", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const heat = heatS.get();
          // 岩漿海
          const cx = W * 0.30, cy = H * 0.44, r = H * 0.32;
          const g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, r * 0.2, cx, cy, r);
          g.addColorStop(0, heat > 0.7 ? "#ff8a50" : heat > 0.3 ? "#e8a13c" : "#b3541e");
          g.addColorStop(1, "#8a3a1e");
          D.disc(ctx, cx, cy, r, { fill: g });
          // 依溫度決定分化程度：鐵鎳小球下沉
          const settle = heat; // 0 未分化 → 1 完成
          const rnd = CK === window.EarthLab ? null : null;
          for (let i = 0; i < 14; i++) {
            const a = i * 2.39996;
            const rr0 = r * 0.75 * Math.sqrt((i + 0.5) / 14);
            const depth = rr0 * settle + r * 0.72 * settle;
            const y = cy + (rr0 - depth) * Math.abs(Math.sin(a)) + r * 0.62 * settle;
            D.disc(ctx, cx + Math.cos(a) * rr0 * (1 - settle * 0.6), Math.min(cy + r * 0.78, y), 5 - i % 3, { fill: "#e8d16b", glow: "#ffb300", glowSize: 4 });
          }
          D.text(ctx, "鐵鎳（重）", cx - r * 0.5, cy + r + 20, { color: "#f2d16b", size: 10.5 });
          D.text(ctx, "矽酸鹽（輕）", cx + r * 0.25, cy - r - 12, { color: PL.col("text-dim"), size: 10.5 });
          // 分化完成後的分層
          if (heat > 0.9) {
            D.line(ctx, cx - r, cy + r * 0.45, cx + r, cy + r * 0.45, "rgba(255,255,255,0.55)", 1.6, [4, 4]);
            D.text(ctx, "核函界線", cx + r + 8, cy + r * 0.45, { color: PL.col("text-faint"), size: 9.5 });
          }
          // 右側：密度排序
          CK.panel(ctx, W * 0.60, H * 0.14, W * 0.34, H * 0.66, "密度排序（g/cm³）");
          const mats = [
            { n: "鐵鎳核", d: 12.8, c: "#f2d16b" },
            { n: "地函（矽酸鹽）", d: 4.5, c: "#c98a5a" },
            { n: "地殼（花崗）", d: 2.7, c: "#8fae6f" },
            { n: "海水", d: 1.03, c: "#4a90d9" },
            { n: "大氣", d: 0.0012, c: "#9575cd" }
          ];
          mats.forEach((m, i) => {
            const y = H * 0.28 + i * 34;
            D.text(ctx, m.n, W * 0.63, y, { color: PL.col("text-dim"), size: 11 });
            CK.meter(ctx, W * 0.63, y + 6, W * 0.28, 8, m.d / 13, { color: m.c });
            D.text(ctx, String(m.d), W * 0.92, y, { color: PL.col("text"), size: 10.5, align: "right" });
          });
          D.text(ctx, "早期地球熔融後：重的下、輕的上", W * 0.77, H * 0.74, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rHeat.set(heat, 2); rState.set(heat < 0.3 ? "均勻混合" : heat < 0.9 ? "分化進行中" : "分層完成");
          rProg.set(Math.round(heat * 100), 0);
          rCore.set(heat > 0.9 ? "鐵鎳核形成，產生地磁" : "尚未有明顯地磁");
        }
      });
      const heatS = PL.ui.slider(ui.L.controls, { label: "早期地球溫度", min: 0, max: 1, step: 0.05, value: 0.3, digits: 2 });
      PL.ui.note(ui.L.controls, "溫度夠高，整顆行星熔成「岩漿海」，重物質才能下沉——分層是重力排序的結果，不是一開始就長這樣。");
      PL.ui.procedure(ui.L.controls, {
        title: "重演分化",
        steps: [
          "低溫時：各種物質均勻混在球體裡。",
          "拉高溫度：黃色鐵鎳小球開始向中心下沉。",
          "完成後：由內到外是核、函、殼——今日地球的原型。",
          "注意右側密度排序：與分層完全對應。"
        ],
        rule: "分化的能量來自撞擊與放射性衰變；重物質下沉還會釋放重力能，讓地球更熱——正回饋。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "冷卻前", apply: () => heatS.set(1) },
        { label: "分化中", apply: () => heatS.set(0.55) },
        { label: "今日地球", apply: () => heatS.set(0.95) }
      ] });
      const rHeat = PL.ui.readout(ui.L.readouts, { label: "溫度狀態" });
      const rState = PL.ui.readout(ui.L.readouts, { label: "分化進度" });
      const rCore = PL.ui.readout(ui.L.readouts, { label: "鐵鎳核" });
      const rProg = PL.ui.readout(ui.L.readouts, { label: "分化進度", unit: "%" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 大陸漂移的證據 */
  PL.register("plate-evidence", {
    build(root) {
      const EVIDENCE = [
        { key: "fit", name: "大陸輪廓吻合", desc: "南美東岸與非洲西岸像拼圖一樣嵌合" },
        { key: "fossil", name: "跨洋化石相同", desc: "舌羊齒植物化石同時出現在南美、非洲、印度、澳洲" },
        { key: "strata", name: "地層連續", desc: "兩岸同一時代、同一類型的山脈與岩層可以對接" },
        { key: "ice", name: "古冰川痕跡", desc: "非洲、印度、澳洲的冰川擦痕指向同一古極位置" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ev = evSel.get();
          const gap = gapS.get(); // 大陸分開距離
          const cx = W * 0.38, cy = H * 0.50;
          const dx = gap * W * 0.18;
          // 兩塊大陸（簡化南美與非洲）
          const drawLand = (mx, mirror, color) => {
            ctx.save();
            ctx.translate(mx, cy);
            if (mirror) ctx.scale(-1, 1);
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.moveTo(-90, -70); ctx.lineTo(70, -60); ctx.lineTo(85, -10);
            ctx.lineTo(40, 60); ctx.lineTo(-20, 95); ctx.lineTo(-70, 40);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(60,40,20,0.7)"; ctx.lineWidth = 1.6; ctx.stroke();
            // 化石／冰川記號
            if (ev === "fossil") {
              D.text(ctx, "🜲", 0, -10, { color: "#2e5d2e", size: 26, align: "center" });
              D.text(ctx, "舌羊齒", 0, -44, { color: "#2e5d2e", size: 10.5, align: "center" });
            } else if (ev === "ice") {
              for (let i = 0; i < 3; i++) D.line(ctx, -60 + i * 24, 30, -30 + i * 24, 70, "rgba(120,180,240,0.9)", 2.4);
              D.text(ctx, "冰川擦痕", 0, 84, { color: "#5a8fd0", size: 10.5, align: "center" });
            } else if (ev === "strata") {
              for (let i = 0; i < 3; i++) D.line(ctx, -85, -30 + i * 30, 80, -30 + i * 30, "rgba(90,70,50,0.75)", 2);
              D.text(ctx, "同年代山脈帶", 0, 66, { color: PL.col("text-dim"), size: 10.5, align: "center" });
            }
            ctx.restore();
          };
          const oceanTint = ev === "fit" && gap < 0.15;
          D.rect(ctx, W * 0.04, H * 0.14, W * 0.62, H * 0.72, { fill: "rgba(90,160,215,0.18)", stroke: PL.col("border"), r: 8 });
          drawLand(cx - 20 - dx, false, "#8fae6f");
          drawLand(cx + 20 + dx, true, "#a8b86f");
          if (oceanTint) {
            CK.badge(ctx, cx, cy - 110, "拼合！兩岸輪廓與地質帶對接", "#66bb6a");
          }
          // 大西洋標示
          if (gap > 0.2) D.text(ctx, "大西洋", cx, cy + 6, { color: PL.col("text-faint"), size: 12, align: "center" });
          // 證據卡
          const e = EVIDENCE.find(x => x.key === ev);
          CK.panel(ctx, W * 0.70, H * 0.16, W * 0.24, H * 0.58, "證據");
          D.text(ctx, e.name, W * 0.82, H * 0.28, { color: PL.col("accent"), size: 12.5, align: "center", weight: "700" });
          D.text(ctx, e.desc, W * 0.82, H * 0.40, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, ev === "fit" ? "把分開距離調到 0 看拼合" : "魏格納：這些只能解釋為「曾經相連」",
            W * 0.82, H * 0.56, { color: PL.col("text-faint"), size: 10, align: "center" });
          rEv.set(e.name); rGap.set("分離指數 " + gap.toFixed(2));
          rWhy.set(ev === "fit" ? "幾何證據" : ev === "fossil" ? "生物地理證據" : ev === "strata" ? "地質連續證據" : "古氣候證據");
        }
      });
      const evSel = PL.ui.select(ui.L.controls, { label: "證據類型", value: "fit", options: EVIDENCE.map(e => ({ value: e.key, label: e.name })) });
      const gapS = PL.ui.slider(ui.L.controls, { label: "大陸分離距離", min: 0, max: 1, step: 0.05, value: 0.7, digits: 2 });
      PL.ui.note(ui.L.controls, "魏格納 1912 年提出漂移說時有四類證據，但因為缺動力機制被冷落半世紀——直到 1960 年代海底擴張出現。");
      PL.ui.procedure(ui.L.controls, {
        title: "拼回盤古大陸",
        steps: [
          "選「大陸輪廓吻合」，把分離距離調到 0。",
          "逐一切換化石、地層、冰川證據：拼合處全都對得上。",
          "想想：為什麼單一證據不足，要四類合在一起才有力？"
        ],
        rule: "科學理論的接受度取決於「證據 + 機制」：漂移的證據早就有，缺的是能推動大陸的機制。"
      });
      const rEv = PL.ui.readout(ui.L.readouts, { label: "證據" });
      const rGap = PL.ui.readout(ui.L.readouts, { label: "分離狀態" });
      const rWhy = PL.ui.readout(ui.L.readouts, { label: "證據類別" });
      return { stop() { ui.stop(); } };
    }
  });
})();
