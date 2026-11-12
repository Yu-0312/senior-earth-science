/* 模組五 · 地質時間與地史 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 年 → 易讀單位；fmtMa 為百萬年(Ma)版,給地質年代表用 */
  function fmtAge(y) {
    if (y >= 1e8) return PL.fmt(y / 1e8, 2) + " 億年";
    if (y >= 1e4) return PL.fmt(y / 1e4, 1) + " 萬年";
    return PL.fmt(y, 0) + " 年";
  }
  const fmtMa = ma => ma >= 1000 ? PL.fmt(ma / 1000, 2) + " 億年"
    : ma >= 1 ? PL.fmt(ma, ma >= 10 ? 0 : 1) + " 百萬年" : PL.fmt(ma * 1000, 0) + " 萬年";
  /* 右側資料卡:面板標題 + 逐行重點(rows = [小標, 內容, 是否強調]) */
  function infoRows(ctx, x, y, w, h, title, rows) {
    CK.panel(ctx, x, y, w, h, title);
    rows.forEach(([k, v, hot], i) => {
      D.text(ctx, k, x + 12, y + 46 + i * 34, { color: PL.col("text-dim"), size: 10.5 });
      D.text(ctx, v, x + 12, y + 46 + i * 34 + 14, { color: hot ? PL.col("accent") : PL.col("text-faint"), size: 10 });
    });
  }
  /* 控制區教學組合：note + procedure + presets 一次掛好(presets = [標籤, apply],套用後自動重繪);RD 一次建讀數 */
  function teach(ui, o) {
    if (o.note) PL.ui.note(ui.L.controls, o.note);
    if (o.proc) PL.ui.procedure(ui.L.controls, o.proc);
    if (o.presets) PL.ui.presets(ui.L.controls, { label: "情境", options: o.presets.map(p => ({ label: p[0], apply: () => { p[1](); ui.redraw(); } })) });
  }
  const RD = (ui, defs) => defs.map(d => PL.ui.readout(ui.L.readouts, d));

  /* 相對定年與疊積法則:雙塊斷層 + 岩脈,交叉切割律排事件順序 */
  PL.register("relative-dating", {
    build(root) {
      const LITH = [
        { name: "sandstone", tag: "A·砂岩" }, { name: "shale", tag: "B·頁岩" }, { name: "limestone", tag: "C·石灰岩" },
        { name: "sandstone", tag: "D·砂岩" }, { name: "conglomerate", tag: "E·礫岩" }, { name: "shale", tag: "F·頁岩" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.60,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ev = evSel.get(), tilt = tiltS.get(), n = clamp(Math.round(nS.get()), 3, 6);
          const hasFault = ev === "fault" || ev === "dike-fault" || ev === "fault-dike";
          const hasDike = ev !== "strata" && ev !== "fault";
          const box = { x: W * 0.05, y: H * 0.16, w: W * 0.55, h: H * 0.60 };
          const layers = LITH.slice(0, n).map(l => ({ name: l.name, label: l.tag, h: 1, color: CK.rockColor(l.name) }));
          const dx = box.x + box.w * 0.30, slope = 0.34 + tilt * 0.006, drop = 18;
          const dike = (yTop, yBot) => {  // 略斜的岩脈：x 隨 y 線性偏移,被斷層錯開才看得出來
            const xt = dx + (yTop - (box.y - 6)) * slope, lean = (yBot - yTop) * slope;
            ctx.save(); ctx.fillStyle = "#6b4f3f"; ctx.beginPath();
            ctx.moveTo(xt - 6, yTop); ctx.lineTo(xt + 6, yTop);
            ctx.lineTo(xt + lean + 4, yBot); ctx.lineTo(xt + lean - 4, yBot);
            ctx.closePath(); ctx.fill();
            ctx.strokeStyle = "rgba(40,25,18,0.85)"; ctx.lineWidth = 1.2; ctx.stroke(); ctx.restore();
          };
          if (!hasFault) {
            CK.rockLayers(ctx, box, layers, { tilt });
            if (hasDike) dike(box.y - 6, box.y + box.h + 2);
          } else {
            const fx = box.x + box.w * 0.58;
            const lBox = { x: box.x, y: box.y, w: fx - box.x - 6, h: box.h }, rBox = { x: fx + 6, y: box.y + drop, w: box.x + box.w - fx - 6, h: box.h };
            CK.rockLayers(ctx, lBox, layers, { tilt });
            if (ev === "dike-fault") dike(box.y - 6, box.y + box.h + 2);       // 岩脈在先:左段
            CK.rockLayers(ctx, rBox, layers, { tilt });
            if (ev === "dike-fault") dike(box.y + drop, box.y + box.h + drop); // 右段隨斷層下移
            D.line(ctx, fx - 3, box.y - 8, fx + 9, box.y + box.h + drop + 6, "rgba(229,90,60,0.95)", 2.4, [7, 4]);
            D.text(ctx, "斷層", fx + 14, box.y + box.h * 0.55, { color: "#ef8829", size: 11, weight: "700" });
          }
          if (hasDike) {
            D.text(ctx, "岩脈", dx + 16, box.y + 10, { color: "#b0876a", size: 11, weight: "700" });
            if (ev === "dike-fault" && hasFault) {
              CK.arrow(ctx, dx + 4, box.y + box.h * 0.42, dx + 26, box.y + box.h * 0.42, "#ef8829", "錯開");
              CK.badge(ctx, W * 0.33, box.y - 20, "岩脈被錯開 ⇒ 斷層較年輕", "#ef8829");
            } else if (ev === "fault-dike") CK.badge(ctx, W * 0.33, box.y - 20, "岩脈貫穿未錯開 ⇒ 岩脈較年輕", "#66bb6a");
          }
          const EVTXT = { dike: " → 岩脈", "dike-fault": " → 岩脈（先）→ 斷層（後）", "fault-dike": " → 斷層（先）→ 岩脈（後）" };
          const order = "沉積 " + LITH.slice(0, n).map(l => l.tag[0]).reverse().join("→") + "（下老上新）" +
            (hasFault ? " → 斷層" : "") + (EVTXT[ev] || "");
          infoRows(ctx, W * 0.64, H * 0.16, W * 0.31, H * 0.60, "判讀筆記", [
            ["疊積法", "下老上新，先沉積的在下面"],
            ["交叉切割+烘烤", "被切開的較老；圍岩被岩脈烤過 ⇒ 圍岩較老"],
            ["本次事件序", order, true]
          ]);
          rOrder.set(order); rOld.set(LITH[n - 1].tag + "（畫面內最老）");
          rRel.set(ev === "dike-fault" ? "斷層較年輕" : ev === "fault-dike" ? "岩脈較年輕"
            : hasFault ? "斷層比所有地層年輕" : hasDike ? "岩脈比所有地層年輕" : "尚無侵入事件");
          rTilt.set(tilt, 0);
        }
      });
      const evSel = PL.ui.select(ui.L.controls, { label: "事件序列", value: "strata", options: [
        { value: "strata", label: "只有沉積地層" }, { value: "dike", label: "＋岩脈侵入" }, { value: "fault", label: "＋斷層錯動" },
        { value: "dike-fault", label: "先侵後斷：岩脈錯開" }, { value: "fault-dike", label: "先斷後侵：岩脈完整" }] });
      const nS = PL.ui.slider(ui.L.controls, { label: "沉積地層數", min: 3, max: 6, step: 1, value: 5, unit: "層", digits: 0 });
      const tiltS = PL.ui.slider(ui.L.controls, { label: "岩層傾角", min: 0, max: 18, step: 1, value: 0, unit: "°", digits: 0 });
      teach(ui, {
        note: "相對定年只回答「誰先誰後」，不給年齡數字；把疊積、交叉切割、烘烤三條律疊起來，就能排出完整的事件序。",
        proc: { title: "像偵探一樣排順序",
          steps: ["只看地層：用疊積法排出沉積順序（下老上新）；選「＋岩脈」：被切到的層都比它老。",
                  "選「先侵後斷」：岩脈被斷層錯開 ⇒ 侵入在先、斷層在後。",
                  "選「先斷後侵」：岩脈直線貫穿沒錯開 ⇒ 斷層在先。"],
          rule: "交叉切割律：斷層若切過岩脈，斷層較年輕；岩脈若未被錯動，表示它比斷層晚。先後關係看的就是有沒有被切開。" },
        presets: [["加岩脈", () => evSel.set("dike")], ["先侵後斷", () => evSel.set("dike-fault")], ["先斷後侵", () => evSel.set("fault-dike")]]
      });
      const [rOrder, rOld, rRel, rTilt] = RD(ui, [
        { label: "事件順序" }, { label: "最老單元" }, { label: "岩脈 vs 斷層" }, { label: "岩層傾角", unit: "°" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });

  /* 不整合與地層缺失:侵蝕面切開上下兩組地層 */
  PL.register("unconformity", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ty = tySel.get(), ero = eroS.get(), re = reS.get();
          const x0 = W * 0.06, bw = W * 0.55, baseY = H * 0.87;
          const lowerH = H * (ty === "non" ? 0.32 : 0.38) * (1 - 0.40 * ero);
          const upperH = H * (0.09 + 0.15 * re);
          const surfY = baseY - lowerH;
          const lowLayers = ty === "non"
            ? [{ name: "granite", label: "花崗岩基盤", h: 1, color: CK.rockColor("granite") }]
            : [
                { name: "sandstone", label: "砂岩", h: 1, color: CK.rockColor("sandstone") },
                { name: "shale", label: "頁岩", h: 1.1, color: CK.rockColor("shale") },
                { name: "limestone", label: "石灰岩", h: 0.9, color: CK.rockColor("limestone") }
              ];
          CK.rockLayers(ctx, { x: x0, y: surfY, w: bw, h: lowerH }, lowLayers, { tilt: ty === "angular" ? 16 : 0 });
          const upLayers = [
            { name: "conglomerate", label: "底部礫岩", h: 0.8, color: CK.rockColor("conglomerate") }, { name: "sandstone", label: "砂岩", h: 1.2, color: CK.rockColor("sandstone") }];
          CK.rockLayers(ctx, { x: x0, y: surfY - upperH, w: bw, h: upperH }, upLayers, { tilt: 0 });
          ctx.save(); ctx.strokeStyle = "#3d2f22"; ctx.lineWidth = 2.6; ctx.beginPath();  // 侵蝕面
          for (let x = x0 - 6; x <= x0 + bw + 6; x += 5) {
            const yy = surfY + Math.sin(x * 0.09) * 3.2;
            x === x0 - 6 ? ctx.moveTo(x, yy) : ctx.lineTo(x, yy);
          }
          ctx.stroke(); ctx.restore();
          CK.badge(ctx, x0 + bw * 0.5, surfY - upperH - 16, "侵蝕面（不整合面）", "#ef8829");
          infoRows(ctx, W * 0.65, H * 0.16, W * 0.30, H * 0.62, "地史四幕", [
            ["① 沉積下組", "砂岩→頁岩→石灰岩（海進層序）"],
            ["② 抬升", ty === "angular" ? "傾斜 16°，層面不再水平" : ty === "non" ? "岩基抬升露出地表" : "只抬升、未傾斜"],
            ["③ 侵蝕", "削去約 " + Math.round(ero * 400) + " m，表面崎嶇", true],
            ["④ 再沉積", "上組約 " + Math.round(120 + re * 260) + " m，底部常有礫岩"]
          ]);
          D.text(ctx, ty === "non" ? "缺失：岩基冷卻後長時間暴露" : "缺失：約 " + PL.fmt(1500 + ero * 4500, 0) + " 萬年紀錄",
            W * 0.80, H * 0.72, { color: "#ef8829", size: 11, align: "center", weight: "700" });
          rType.set(ty === "angular" ? "下組傾斜、上組水平：角度不整合" : ty === "non" ? "沉積岩覆在火成基盤上：非整合" : "上下層面平行但有侵蝕面：假整合");
          rGap.set(ty === "non" ? "基盤暴露期（無紀錄）" : "≥ " + PL.fmt(1500 + ero * 4500, 0) + " 萬年");
          rEro.set(Math.round(ero * 400), 0); rRe.set(Math.round(120 + re * 260), 0);
        }
      });
      const tySel = PL.ui.select(ui.L.controls, { label: "不整合類型", value: "angular", options: [
        { value: "angular", label: "角度不整合" }, { value: "dis", label: "假整合" }, { value: "non", label: "非整合" }
      ] });
      const eroS = PL.ui.slider(ui.L.controls, { label: "侵蝕深度", min: 0, max: 1, step: 0.05, value: 0.4, digits: 2 });
      const reS = PL.ui.slider(ui.L.controls, { label: "再沉積厚度", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      teach(ui, {
        note: "看到侵蝕面就要注意：這段地史不見了。地層缺失不是當時什麼都沒發生，是發生了但沒留下紀錄。",
        proc: { title: "讀出缺失的時間",
          steps: ["角度不整合：下組先被傾斜，再被侵蝕削平，上組水平蓋上。",
                  "把侵蝕深度拉大：被蝕去的地層越多，缺失的時間越長。",
                  "切到假整合：上下平行，只看一個剖面幾乎認不出來，要做區域對比；切到非整合：上組直接覆在花崗岩基盤上。"],
          rule: "不整合面 = 時間的缺失頁：侵蝕掉的時間與沒沉積的時間，在地層紀錄裡都不存在，需靠區域對比與定年補足。" },
        presets: [["角度不整合", () => tySel.set("angular")], ["假整合", () => tySel.set("dis")], ["深侵蝕", () => eroS.set(1)]]
      });
      const [rType, rGap, rEro, rRe] = RD(ui, [
        { label: "類型判讀" }, { label: "缺失時間" }, { label: "蝕去厚度", unit: "m" }, { label: "上組厚度", unit: "m" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });

  /* 放射性定年與半衰期：64 顆原子示範母→子 */
  PL.register("half-life", {
    build(root) {
      const METHODS = [
        { key: "c14", name: "碳-14", half: 5730, mat: "生物遺骸：木炭、貝殼、骨骼", lim: "約 5 萬年內" },
        { key: "kar", name: "鉀-氬", half: 1.25e9, mat: "火成岩的含鉀礦物", lim: "10 萬～數十億年" },
        { key: "upb", name: "鈾-鉛", half: 4.47e9, mat: "鋯石（封閉性極佳）", lim: "100 萬～45 億年" },
        { key: "rbsr", name: "銣-鍶", half: 4.88e10, mat: "雲母、長石", lim: "古老變質岩" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const n = nS.get();
          const m = METHODS.find(x => x.key === mSel.get());
          const frac = Math.pow(0.5, n), parent = Math.round(64 * frac);
          const bx = W * 0.05, by = H * 0.17, bw = W * 0.36, bh = H * 0.58;
          D.rect(ctx, bx, by, bw, bh, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), r: 10 });
          D.text(ctx, m.name + " 樣本：64 顆原子", bx + bw / 2, by + 22, { color: PL.col("text-dim"), size: 11.5, align: "center", weight: "700" });
          const cell = Math.min(bw, bh - 50) / 8.6;
          const gx = bx + (bw - cell * 8) / 2, gy = by + 36 + (bh - 46 - cell * 8) / 2;
          for (let i = 0; i < 64; i++) {  // 綠=母、灰=子;交界處閃爍=正在衰變
            const px = gx + (i % 8) * cell + cell / 2, py = gy + Math.floor(i / 8) * cell + cell / 2;
            const decay = i >= parent && i < parent + 3 && Math.sin(t * 5 + i * 2.1) > 0.2;
            D.disc(ctx, px, py, cell * 0.31, { fill: i < parent ? "#8bc34a" : "#7b8794", glow: decay ? "#ffb300" : null, glowSize: 8 });
          }
          D.text(ctx, "綠=母元素  灰=子元素  閃爍=正在衰變", bx + bw / 2, by + bh - 12, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          infoRows(ctx, W * 0.45, H * 0.17, W * 0.25, H * 0.58, "定年方法：" + m.name, [
            ["半衰期", fmtAge(m.half), true],
            ["適用材料", m.mat],
            ["適用範圍", m.lim],
            ["算式", "N = N₀ × (1/2)ⁿ"]
          ]);
          CK.meter(ctx, W * 0.465, H * 0.62, W * 0.22, 10, frac, { color: "#8bc34a", label: "母 " + PL.fmt(frac * 100, 1) + "%" });
          CK.meter(ctx, W * 0.465, H * 0.70, W * 0.22, 10, 1 - frac, { color: "#7b8794", label: "子 " + PL.fmt((1 - frac) * 100, 1) + "%" });
          infoRows(ctx, W * 0.72, H * 0.17, W * 0.23, H * 0.58, "推算結果", [
            ["年齡", fmtAge(n * m.half), true],
            ["經過半衰期數", PL.fmt(n, 2) + " 個"],
            ["前提", "封閉系統；半衰期不受溫壓與化學環境影響"]
          ]);
          rP.set(frac * 100, 1); rD.set((1 - frac) * 100, 1);
          rAge.set(fmtAge(n * m.half)); rHalf.set(fmtAge(m.half));
        }
      });
      const nS = PL.ui.slider(ui.L.controls, { label: "經過半衰期數", min: 0, max: 5, step: 0.05, value: 1, unit: "個", digits: 2 });
      const mSel = PL.ui.select(ui.L.controls, { label: "定年方法", value: "c14", options: METHODS.map(x => ({ value: x.key, label: x.name })) });
      teach(ui, {
        note: "半衰期不受溫度、壓力、化學環境影響，所以拿來定年很可靠。每過一個半衰期，母元素就剩一半。",
        proc: { title: "讀懂地質時鐘",
          steps: ["碳-14:n = 1 時母剩 50%，推算年齡 5,730 年；母+子恆為 100%;n = 3 只剩 12.5%。",
                  "切到鈾-鉛：同樣的 n，年齡跳到數十億年，要選對同位素才量得到想要的年代。",
                  "注意：恐龍化石約 6,600 萬年，遠超碳-14 極限，不能拿碳-14 定恐龍。"],
          rule: "碳-14 定生物遺骸、只到約 5 萬年；鋯石鈾-鉛可定到 45 億年。方法要配對正確的樣本與年代範圍。" },
        presets: [["剩 50%", () => nS.set(1)], ["剩 12.5%", () => nS.set(3)],
                  ["白堊紀末地層（鉀-氬）", () => { mSel.set("kar"); nS.set(0.05); }]]
      });
      const ch = ui.chart("母元素剩餘曲線", "每過一個半衰期剩一半：3 個半衰期後只剩 12.5%，曲線永不觸零");
      const drawChart = () => CK.plot(ch, {
        x0: 0, x1: 5, y0: 0, y1: 100, xlabel: "經過半衰期數", ylabel: "母元素 %",
        series: [{ fn: x => 100 * Math.pow(0.5, x), color: "#8bc34a", width: 2.4 }],
        marks: [{ vline: nS.get(), color: PL.col("accent-2") }, { hline: 50, dash: [4, 4] },
                { hline: 12.5, dash: [4, 4] }, { dot: [nS.get(), 100 * Math.pow(0.5, nS.get())], color: "#8bc34a", r: 5 }]
      });
      ch.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      const [rP, rD, rAge, rHalf] = RD(ui, [
        { label: "母元素剩餘", unit: "%" }, { label: "子元素累積", unit: "%" }, { label: "推算年齡" }, { label: "半衰期" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });

  /* 衰變曲線的判讀:線性圖 + 半對數直線化 + 初始子元素校正 */
  PL.register("decay-curve", {
    build(root) {
      const yT = Object.assign([0, 25, 50, 75, 100], { digits: 0 });
      const yL = Object.assign([0, -1, -2, -3, -4, -5], { digits: 0 });
      const ui = CK.scaffold(root, {
        aspect: 0.56,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const n = nS.get(), d0 = d0S.get();
          const f = Math.pow(0.5, n), dev = Math.log2(1 + d0), nApp = n + dev;
          const g = PL.graph(ui.cv, { x: W * 0.07, y: H * 0.13, w: W * 0.54, h: H * 0.62 }, { x0: 0, x1: 5, y0: 0, y1: 100 });
          g.frame({ xlabel: "經過半衰期數", ylabel: "殘存量 %", yticks: yT });
          g.grid(5, 4);
          g.fn(x => 100 * Math.pow(0.5, x), { color: "#8bc34a", width: 2.4 });        // 母:指數下降
          g.fn(x => 100 * (1 - Math.pow(0.5, x)), { color: "#ef8829", width: 2.2 });  // 子:等量上升
          g.vline(n, { color: PL.col("accent-2"), dash: [5, 4] });
          g.dot(n, 100 * f, { color: "#8bc34a", r: 5, glow: "#8bc34a" }); g.dot(n, 100 * (1 - f), { color: "#ef8829", r: 4 });
          CK.legend(ctx, W * 0.36, H * 0.20, [{ color: "#8bc34a", label: "母元素" }, { color: "#ef8829", label: "子元素" }], 17);
          D.text(ctx, "母 " + PL.fmt(f * 100, 1) + "% + 子 " + PL.fmt((1 - f) * 100, 1) + "% = 100%（封閉系統守恆）",
            W * 0.34, H * 0.84, { color: PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          D.text(ctx, "曲線永不觸零：3 個半衰期剩 12.5%,6 個剩 1.6%", W * 0.34, H * 0.90, { color: PL.col("text-faint"), size: 10, align: "center" });
          rP.set(f * 100, 1); rApp.set(nApp, 2); rDev.set(dev, 2);
          rNote.set(d0 < 0.005 ? "封閉系統：表觀 = 真實" : "需校正初始子元素 " + PL.fmt(d0 * 100, 0) + "%");
        }
      });
      const nS = PL.ui.slider(ui.L.controls, { label: "經過半衰期數", min: 0, max: 5, step: 0.05, value: 2, unit: "個", digits: 2 });
      const d0S = PL.ui.slider(ui.L.controls, { label: "初始子元素比", min: 0, max: 0.3, step: 0.01, value: 0, digits: 2 });
      teach(ui, {
        note: "定年的假設是「結晶當下子元素為零」。若樣本混入了初始子元素，每個年齡都會系統性偏老同一個量。",
        proc: { title: "兩種圖、一個陷阱",
          steps: ["線性圖：母曲線指數下降、子曲線上升，兩線在母=子=50% 處相交；半對數圖上衰變化為斜率 -1 的直線。",
                  "把「初始子元素比」拉到 0.2：虛線整條平移，表觀年齡一律偏老 0.26 個半衰期；偏差與樣本新舊無關。"],
          rule: "初始子元素不改變曲線形狀，只會整條平移，只看一個樣本看不出來，必須用同礦物族系校正或選封閉性好的鋯石。" },
        presets: [["理想封閉系統", () => d0S.set(0)], ["混入子元素 20%", () => d0S.set(0.2)], ["三個半衰期", () => nS.set(3)]]
      });
      const ch = ui.chart("半對數判讀", "半對數圖上衰變化為直線；有初始子元素時整條平移（虛線）");
      const drawChart = () => {
        const d0 = d0S.get(), n = nS.get(), dev = Math.log2(1 + d0);
        CK.plot(ch, {
          x0: 0, x1: 5, y0: -5, y1: 0, xlabel: "半衰期數（真實）", ylabel: "log₂(母分率)", yticks: yL,
          series: [{ fn: x => -x, color: "#8bc34a", width: 2.4 },
                   { fn: x => -(x + dev), color: "#ef8829", width: 2, dash: [6, 4] }],
          marks: [{ dot: [n, -n], color: "#8bc34a", r: 5 }]
        });
        ch.setCap(d0 < 0.005 ? "封閉系統：實線虛線重合，表觀年齡 = 真實年齡"
          : "初始子元素 " + PL.fmt(d0 * 100, 0) + "%：虛線平移 log₂(1+d₀)≈" + PL.fmt(dev, 2) + " 個半衰期");
      };
      ch.onResize(drawChart); drawChart();
      root.addEventListener("input", drawChart); root.addEventListener("change", drawChart);
      const [rP, rApp, rDev, rNote] = RD(ui, [
        { label: "母元素剩餘", unit: "%" }, { label: "表觀年齡（半衰期）" }, { label: "年齡偏差（半衰期）" }, { label: "判讀" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });

  /* 化石的形成條件:掩埋速率 × 環境含氧 × 時間 → 保存率 */
  PL.register("fossil-formation", {
    build(root) {
      const ENVS = [
        { key: "land", name: "陸地暴露（氧化）", o2: 1.0, rate: 0.03 },
        { key: "shallow", name: "淺海：緩慢掩埋", o2: 0.5, rate: 1.0 },
        { key: "deep", name: "深海：快速掩埋（缺氧）", o2: 0.12, rate: 2.6 }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const env = ENVS.find(x => x.key === eSel.get());
          const rate = rateS.get(), time = tS.get();
          const depth = clamp(rate * env.rate * time, 0, 240);       // 掩埋深度 cm
          const prot = clamp(depth / 120, 0, 1);                     // 埋越深越隔氧
          const eff = env.o2 * (1 - 0.9 * prot) * 0.55;              // 有效氧化強度
          const soft = 100 * Math.exp(-eff * time * 0.10);
          const hard = 100 * Math.exp(-eff * time * 0.02);
          const x0 = W * 0.05, bw = W * 0.56, topY = H * 0.24, botY = H * 0.86;
          const water = env.key !== "land";
          ctx.fillStyle = water ? (env.key === "deep" ? "rgba(20,60,100,0.5)" : "rgba(90,170,220,0.45)") : "rgba(255,240,200,0.28)";
          ctx.fillRect(0, H * 0.10, W, topY - H * 0.10);
          D.line(ctx, 0, topY, W, topY, water ? "rgba(255,255,255,0.5)" : "#8fae6f", 2);
          D.text(ctx, env.name, W * 0.30, H * 0.15, { color: water ? "#bfe0f5" : "#8a6f52", size: 12, align: "center", weight: "700" });
          const dpx = depth / 240 * (botY - topY - 40);              // 生物所在深度(像素)
          const cy = topY + 26 + dpx, cx = x0 + bw * 0.5;
          D.rect(ctx, x0, topY, bw, botY - topY, { fill: "rgba(140,120,90,0.30)" });
          for (let i = 0; i < 4; i++) {  // 逐漸堆疊的沉積層
            const yy = topY + 20 + i * (botY - topY - 26) / 4;
            if (yy < cy) D.rect(ctx, x0, yy, bw, (botY - topY - 26) / 4 - 2, { fill: "rgba(110,92,66," + (0.22 + i * 0.09) + ")" });
          }
          if (soft > 4) {
            ctx.save(); ctx.globalAlpha = clamp(soft / 100, 0.08, 1);
            D.disc(ctx, cx, cy + 3, 13, { fill: "#c97b4a" }); ctx.restore();
          } else {
            D.ring(ctx, cx, cy + 3, 12, "rgba(160,130,100,0.6)", 1.2, [3, 3]);  // 軟體分解後只留印模
            D.text(ctx, "印模", cx + 30, cy + 3, { color: PL.col("text-faint"), size: 9 });
          }
          ctx.save(); ctx.globalAlpha = clamp(hard / 100, 0.1, 1);   // 硬殼:半圓弧
          ctx.strokeStyle = "#d8cfc0"; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.arc(cx, cy + 5, 16, Math.PI, 0); ctx.stroke();
          D.line(ctx, cx - 16, cy + 5, cx + 16, cy + 5, "#d8cfc0", 2);
          ctx.restore();
          if (eff > 0.25 && depth < 40) CK.arrow(ctx, cx + 46, topY + 8, cx + 46, topY + 8 + eff * 46, "#e57373", "O₂");
          D.text(ctx, "掩埋 " + Math.round(depth) + " cm", cx, cy + 30, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          infoRows(ctx, W * 0.65, H * 0.16, W * 0.30, H * 0.62, "保存記錄：" + env.name, [
            ["軟組織殘存", PL.fmt(soft, 0) + "%", true],
            ["硬殼骨骼殘存", PL.fmt(hard, 0) + "%", true],
            ["判讀", hard < 30 ? "暴露氧化：分解殆盡" : hard >= 60 && soft >= 15 ? "特異保存：連軟體都有機會" : "典型化石：硬殼留下、軟體分解"]
          ]);
          rDepth.set(Math.round(depth), 0); rSoft.set(soft, 0); rHard.set(hard, 0);
        }
      });
      const eSel = PL.ui.select(ui.L.controls, { label: "沉積環境", value: "shallow", options: ENVS.map(x => ({ value: x.key, label: x.name })) });
      const rateS = PL.ui.slider(ui.L.controls, { label: "掩埋速率", min: 0, max: 10, step: 0.5, value: 5, unit: "cm/千年", digits: 1 });
      const tS = PL.ui.slider(ui.L.controls, { label: "經過時間", min: 0, max: 100, step: 2, value: 40, unit: "千年", digits: 0 });
      teach(ui, {
        note: "化石不是「死掉就會變」：多數屍體被氧化分解。硬殼骨骼最易保存，軟軀體需要琥珀、凍土或缺氧頁岩這種特殊條件。",
        proc: { title: "調出一顆化石",
          steps: ["陸地暴露：掩埋慢、氧氣足，軟體部分幾乎留不下來，硬殼也剩不到三成。",
                  "深海快速掩埋：幾十年內就被蓋住，O₂ 進不來，連軟組織都可能留下印痕。",
                  "把時間拉長觀察：只要暴露在氧化環境，再硬的殼也會被時間吃掉。"],
          rule: "化石三要件：快速掩埋、隔絕氧氣、硬體構造；缺一項，保存機率就斷崖式下降。" },
        presets: [["深海快速掩埋", () => { eSel.set("deep"); rateS.set(8); tS.set(30); }],
                  ["陸地暴露", () => { eSel.set("land"); tS.set(100); }],
                  ["淺海緩慢掩埋", () => { eSel.set("shallow"); rateS.set(5); tS.set(60); }]]
      });
      const [rDepth, rSoft, rHard] = RD(ui, [
        { label: "掩埋深度", unit: "cm" }, { label: "軟組織殘存", unit: "%" }, { label: "硬殼殘存", unit: "%" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });

  /* 指準化石與地層對比:兩地剖面用化石帶相連 */
  PL.register("index-fossils", {
    build(root) {
      const NAMES = ["頁岩", "砂岩", "石灰岩", "砂岩", "礫岩"];
      const KEYN = { 頁岩: "shale", 砂岩: "sandstone", 石灰岩: "limestone", 礫岩: "conglomerate" };
      const RELH = [1, 1.15, 0.95, 1.25, 1];  // 各層相對厚度
      const FOSSILS = [
        { key: "trilo", name: "三葉蟲", span: "5.4–2.5 億年前（古生代）", good: true, bands: [3, 4] },
        { key: "ammon", name: "菊石", span: "2.4–0.66 億年前（中生代）", good: true, bands: [2] },
        { key: "nummu", name: "貨幣蟲", span: "6,600–2,300 萬年前（新生代）", good: true, bands: [1] },
        { key: "snail", name: "蝸牛（腹足類）", span: "約 4 億年前～現生", good: false, bands: [0, 1, 2, 3, 4] }
      ];
      const glyph = (g2, kind, x, y, s) => {  // 化石小符號:三葉蟲/菊石/貨幣蟲/蝸牛
        g2.save(); g2.strokeStyle = "#37474f"; g2.fillStyle = "#37474f"; g2.lineWidth = 1.3;
        if (kind === "trilo") {
          g2.beginPath(); g2.ellipse(x, y, s, s * 0.6, 0, 0, TAU); g2.stroke();
          D.line(g2, x - s * 0.6, y, x + s * 0.6, y, "#37474f", 1);
          for (let i = 1; i <= 3; i++) D.line(g2, x - s * 0.5 + i * s * 0.3, y - s * 0.42, x - s * 0.5 + i * s * 0.3, y + s * 0.42, "#37474f", 0.8);
        } else if (kind === "ammon") {
          g2.beginPath();
          for (let a = 0; a < TAU * 2.1; a += 0.22) { const r = s * 0.15 * a; a === 0 ? g2.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g2.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
          g2.stroke();
        } else if (kind === "nummu") {
          D.disc(g2, x, y, s * 0.55, { fill: "rgba(220,214,190,0.9)", stroke: "#37474f", width: 1.2 }); D.ring(g2, x, y, s * 0.26, "#37474f", 0.9);
        } else {
          D.disc(g2, x, y, s * 0.55, { stroke: "#37474f", width: 1.5 }); D.ring(g2, x, y, s * 0.26, "#37474f", 1);
          D.line(g2, x + s * 0.4, y - s * 0.4, x + s * 0.7, y - s * 0.8, "#37474f", 1.1); D.line(g2, x + s * 0.6, y - s * 0.2, x + s * 1.0, y - s * 0.5, "#37474f", 1.1);
        }
        g2.restore();
      };
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const f = FOSSILS.find(x => x.key === fSel.get());
          const dist = distS.get();
          const sB = lerp(1, 0.55, dist / 1000);                     // 距離越遠,乙地沉積越薄
          const mkLayers = s => NAMES.map((nm, i) => ({ name: KEYN[nm], h: RELH[i] * s, color: CK.rockColor(KEYN[nm]) }));
          const geo = (box, s) => {  // 各層中心 y(與 rockLayers 的堆疊計算一致)
            const sc = (box.h - 8) / RELH.reduce((a, b) => a + b, 0);
            let y = box.y + box.h; const rows = [];
            RELH.forEach(h => { rows.push(y - h * s * sc / 2); y -= h * s * sc; });
            return rows;
          };
          const aBox = { x: W * 0.06, y: H * 0.24, w: W * 0.20, h: H * 0.58 }, bBox = { x: W * 0.42, y: H * 0.24, w: W * 0.20, h: H * 0.58 };
          CK.rockLayers(ctx, aBox, mkLayers(1), {});
          CK.rockLayers(ctx, bBox, mkLayers(sB), {});
          D.text(ctx, "甲地", aBox.x + aBox.w / 2, aBox.y - 10, { color: PL.col("text-dim"), size: 11.5, align: "center", weight: "700" });
          D.text(ctx, "乙地(" + dist + " km 外)", bBox.x + bBox.w / 2, bBox.y - 10, { color: PL.col("text-dim"), size: 11.5, align: "center", weight: "700" });
          const ra = geo(aBox, 1), rb = geo(bBox, sB);
          f.bands.forEach(b => {  // 化石帶著色 + 化石符號 + 對比虛線
            D.rect(ctx, aBox.x, ra[b] - 14, aBox.w, 28, { fill: "rgba(77,182,172,0.28)" });
            D.rect(ctx, bBox.x, rb[b] - 14, bBox.w, 28, { fill: "rgba(77,182,172,0.28)" });
            glyph(ctx, f.key, aBox.x + aBox.w / 2, ra[b], 7);
            glyph(ctx, f.key, bBox.x + bBox.w / 2, rb[b], 7);
            if (f.good) D.line(ctx, aBox.x + aBox.w, ra[b], bBox.x, rb[b], "rgba(77,182,172,0.95)", 2, [6, 4]);
          });
          if (!f.good) D.text(ctx, "兩地全剖面都出現 ⇒ 無法鎖定層位", W * 0.34, H * 0.16, { color: "#e57373", size: 11, align: "center", weight: "700" });
          infoRows(ctx, W * 0.66, H * 0.16, W * 0.29, H * 0.62, "化石資料卡：" + f.name, [
            ["生存年代", f.span, true],
            ["指準條件", "分布廣 ✓  世代短 " + (f.good ? "✓" : "✗") + "  易辨認 ✓"],
            ["對比能力", f.good ? "同一化石帶 = 同一時期" : "生存期太長：不能當時間標記"]
          ]);
          rSpan.set(f.span);
          rMatch.set(f.good ? "甲第" + (f.bands[0] + 1) + "層 ⇔ 乙第" + (f.bands[0] + 1) + "層（化石帶）" : "全剖面皆有：無法對比");
          rCrit.set(f.good ? "符合指準三條件" : "世代太長 ✗");
          rDist.set(dist, 0);
        }
      });
      const fSel = PL.ui.select(ui.L.controls, { label: "檢視化石", value: "trilo", options: FOSSILS.map(x => ({ value: x.key, label: x.name })) });
      const distS = PL.ui.slider(ui.L.controls, { label: "兩地距離", min: 0, max: 1000, step: 50, value: 400, unit: "km", digits: 0 });
      teach(ui, {
        note: "指準化石 = 分布廣 + 世代短 + 易辨認。三葉蟲鎖古生代、菊石鎖中生代；到處都活的物種反而沒用。",
        proc: { title: "跨區對比",
          steps: ["選三葉蟲：甲乙兩地都有化石帶，虛線把同時代的地層連起來。",
                  "拉大兩地距離：乙地剖面變薄了，但化石帶照樣對得上。",
                  "切到蝸牛（反例）：全剖面都有，虛線消失，它不能用來定年代。"],
          rule: "化石序列不可逆更替：不同時代的化石組合不會重複出現，這是地層對比與相對定年的骨幹。" },
        presets: [["三葉蟲", () => fSel.set("trilo")], ["菊石", () => fSel.set("ammon")], ["蝸牛（反例）", () => fSel.set("snail")]]
      });
      const [rSpan, rMatch, rCrit, rDist] = RD(ui, [
        { label: "生存年代" }, { label: "對比結果" }, { label: "指準條件" }, { label: "兩地距離", unit: "km" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });

  /* 地質年代表:線性全史 → 放大顯生元 → 新生代 */
  PL.register("geologic-time-scale", {
    build(root) {
      const EONS = [
        { name: "冥古元", a: 4600, b: 4000, color: "#8d6e63" }, { name: "太古元", a: 4000, b: 2500, color: "#a1887f" },
        { name: "原生元", a: 2500, b: 541, color: "#6f9fc8" }, { name: "顯生元", a: 541, b: 0, color: "#4db6ac" }
      ];
      const ERAS = [
        { name: "古生代", a: 541, b: 252, color: "#81c784" }, { name: "中生代", a: 252, b: 66, color: "#a1887f" },
        { name: "新生代", a: 66, b: 0, color: "#ffb74d" }
      ];
      const PERIODS = [
        { name: "寒武紀", a: 541, b: 485, c: "#ef8829" }, { name: "奧陶紀", a: 485, b: 444, c: "#c9a227" },
        { name: "志留紀", a: 444, b: 419, c: "#b78d5e" }, { name: "泥盆紀", a: 419, b: 359, c: "#cb8c5a" },
        { name: "石炭紀", a: 359, b: 299, c: "#6b8f71" }, { name: "二疊紀", a: 299, b: 252, c: "#d16a5a" },
        { name: "三疊紀", a: 252, b: 201, c: "#b06ac9" }, { name: "侏羅紀", a: 201, b: 145, c: "#5b8def" },
        { name: "白堊紀", a: 145, b: 66, c: "#4aa36b" }, { name: "古近紀", a: 66, b: 23, c: "#f2a25c" },
        { name: "新近紀", a: 23, b: 2.6, c: "#f2c94c" }, { name: "第四紀", a: 2.6, b: 0, c: "#e57373" }
      ];
      const EVENTS = [
        { name: "地球誕生", ma: 4600, note: "星雲塌縮、吸積成形" }, { name: "大氧化事件", ma: 2400, note: "藍綠菌產氧，大氣開始含氧" },
        { name: "寒武紀大爆發", ma: 541, note: "硬殼動物各門類快速出現" }, { name: "二疊紀末大滅絕", ma: 252, note: "約 96% 海洋物種消失" },
        { name: "白堊紀末大滅絕", ma: 66, note: "小行星撞擊，非鳥恐龍滅絕" }, { name: "智人出現", ma: 0.3, note: "地史最後 0.007% 的主角" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.56,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const zoom = zoomS.get();
          const leftAge = lerp(4600, 66, zoom);   // 視窗最左端的年代(百萬年)
          const x0 = W * 0.06, w0 = W * 0.60;
          const X = ma => x0 + (1 - clamp(ma, 0, leftAge) / leftAge) * w0;
          const seg = (a, b, color, y, h, label, minW) => {  // 畫一個地質時間區段
            const xa = X(Math.min(a, leftAge)), xb = X(Math.max(b, 0));
            if (xb - xa < 0.6) return;
            D.rect(ctx, xa, y, xb - xa, h, { fill: color, stroke: "rgba(0,0,0,0.25)", width: 1 });
            if (label && xb - xa > (minW || 30)) D.text(ctx, label, (xa + xb) / 2, y + h / 2 + 4, { color: "rgba(20,25,30,0.9)", size: 11, align: "center", weight: "700" });
          };
          EONS.forEach(e => seg(e.a, e.b, e.color, H * 0.24, H * 0.11, e.name));
          ERAS.forEach(e => seg(e.a, e.b, e.color, H * 0.42, H * 0.11, e.name));
          PERIODS.forEach(p => seg(p.a, p.b, p.c, H * 0.60, H * 0.11, p.name, 34));
          EVENTS.forEach((e, i) => {  // 大事記:上下交錯的標籤
            if (e.ma > leftAge) return;
            const x = X(e.ma), up = i % 2 === 0;
            D.line(ctx, x, up ? H * 0.13 : H * 0.24, x, up ? H * 0.24 : H * 0.19, PL.col("text-faint"), 1);
            D.disc(ctx, x, up ? H * 0.13 : H * 0.24, 3.5, { fill: PL.col("accent") });
            if (x > x0 + 26 && x < x0 + w0 - 26) D.text(ctx, e.name, x, up ? H * 0.10 : H * 0.235, { color: PL.col("text-faint"), size: 9, align: "center" });
          });
          const fEv = EVENTS[clamp(Math.round(focusS.get()), 0, EVENTS.length - 1)];
          if (fEv.ma <= leftAge) {
            D.line(ctx, X(fEv.ma), H * 0.20, X(fEv.ma), H * 0.74, PL.col("accent-2"), 2);
            D.ring(ctx, X(fEv.ma), fEv.ma > 541 ? H * 0.295 : H * 0.475, 8, PL.col("accent-2"), 2);
          }
          D.arrow(ctx, x0 + w0 + 18, H * 0.475, x0 + w0 + 2, H * 0.475, PL.col("text-dim"), "現在");
          CK.meter(ctx, W * 0.715, H * 0.66, W * 0.22, 9, Math.min(1, 0.3 / leftAge), { color: "#e57373", label: "智人在畫面中的占比（紅）" });
          infoRows(ctx, W * 0.70, H * 0.16, W * 0.25, H * 0.62, "聚焦：" + fEv.name, [
            ["距今", fmtMa(fEv.ma), true],
            ["事件", fEv.note],
            ["顯生元", "占畫面 " + PL.fmt(Math.min(100, 541 / leftAge * 100), 1) + "%（全史 11.8%）"],
            ["智人 30 萬年", "占畫面 " + PL.fmt(Math.min(100, 0.3 / leftAge * 100), leftAge < 40 ? 1 : 3) + "%"]
          ]);
          rWin.set("0 – " + PL.fmt(leftAge, 0) + " 百萬年");
          rPhan.set(Math.min(100, 541 / leftAge * 100), 1);
          rFocus.set(fEv.name + "·距今 " + fmtMa(fEv.ma));
          rHuman.set(0.3 / leftAge * 100, leftAge < 40 ? 1 : 3);
        }
      });
      const zoomS = PL.ui.slider(ui.L.controls, { label: "時間放大（看晚年）", min: 0, max: 1, step: 0.02, value: 0, digits: 2 });
      const focusS = PL.ui.slider(ui.L.controls, { label: "聚焦事件", min: 0, max: 5, step: 1, value: 2, digits: 0 });
      teach(ui, {
        note: "元⊃代⊃紀⊃世。把 46 億年壓成一天：恐龍在晚上 10:45 滅絕，智人在最後約 6 秒才登場。",
        proc: { title: "放大才看得見的歷史",
          steps: ["全史線性軸：顯生元（有硬殼化石之後）只占最右 12%；拉動「時間放大」，代與紀才逐一展開。",
                  "聚焦白堊紀末大滅絕：代與代的界線常與大滅絕重合；放大到新生代，智人 30 萬年仍是一細線。"],
          rule: "地質年代表的刻度不是等長的，是「事件」定的：界線多半是大滅絕或大演化，再靠化石與放射性定年校準。" },
        presets: [["全地史", () => zoomS.set(0)], ["只看顯生元", () => zoomS.set(0.88)], ["放大新生代", () => zoomS.set(1)]]
      });
      const [rWin, rPhan, rFocus, rHuman] = RD(ui, [
        { label: "視窗範圍（距今）" }, { label: "顯生元占比", unit: "%" }, { label: "聚焦事件" }, { label: "智人史占比", unit: "%" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });

  /* 大滅絕與 K–Pg 撞擊事件:撞擊冬季的塵埃、陽光與溫度 */
  PL.register("mass-extinction", {
    build(root) {
      const EXT = [
        { key: "o", name: "奧陶紀末", ma: 4.44, loss: 85, cause: "大冰期與海平面驟降" },
        { key: "d", name: "泥盆紀晚期", ma: 3.72, loss: 75, cause: "海洋廣泛缺氧" },
        { key: "p", name: "二疊紀末", ma: 2.52, loss: 96, cause: "西伯利亞大火成岩省" },
        { key: "t", name: "三疊紀末", ma: 2.01, loss: 80, cause: "大西洋張裂的火山活動" },
        { key: "k", name: "白堊紀末(K–Pg)", ma: 0.66, loss: 76, cause: "小行星撞擊希克蘇魯伯" }
      ];
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const ev = EXT.find(x => x.key === eSel.get());
          const yr = yrS.get(), amt = dustS.get();
          const dust = amt * Math.exp(-yr / 2.2);        // 平流層塵埃量(指數沉降)
          const sun = Math.max(5, 100 - 92 * dust / 0.8);
          const horizon = H * 0.60;
          const sky = ctx.createLinearGradient(0, 0, 0, horizon);
          sky.addColorStop(0, CK.mix("#7cb7e8", "#1c2028", clamp(dust * 1.3, 0, 1)));
          sky.addColorStop(1, CK.mix("#bfe0f5", "#3a3428", clamp(dust * 1.3, 0, 1)));
          ctx.fillStyle = sky; ctx.fillRect(0, 0, W, horizon);
          ctx.save(); ctx.globalAlpha = clamp(sun / 100, 0.12, 1);
          CK.sunIcon(ctx, W * 0.14, H * 0.15, 13, { glow: 22, time: t }); ctx.restore();
          if (dust > 0.015) {  // 塵埃幕與漂浮塵粒
            ctx.save(); ctx.globalAlpha = clamp(dust * 0.85, 0, 0.8);
            ctx.fillStyle = "#6b5d4a"; ctx.fillRect(0, horizon * 0.30, W, horizon * 0.70);
            ctx.restore();
            for (let i = 0; i < 12; i++) {
              const f = ((t * 0.08 + i / 12) % 1);
              D.disc(ctx, (i * 97 % W + f * W * 0.2) % W, horizon * (0.35 + (i % 4) * 0.14) + Math.sin(t + i) * 3, 1.8, { fill: "rgba(120,105,80," + clamp(dust, 0, 0.9) + ")" });
            }
          }
          if (yr < 0.25) D.disc(ctx, W * 0.68, horizon * 0.52, 16 + (0.25 - yr) * 110, { fill: "rgba(255,214,140," + clamp(1 - yr * 4, 0, 1) + ")", glow: "#ff8a50", glowSize: 34 });
          CK.rockLayers(ctx, { x: 0, y: horizon, w: W, h: H - horizon - 24 }, [
            { name: "sandstone", label: "新生代底部", h: 0.9, color: CK.rockColor("sandstone") },
            { name: "iridium", label: "銥異常層", h: 0.28, color: "#c9a227" },
            { name: "shale", label: "白堊紀頂部", h: 1.4, color: CK.rockColor("shale") }
          ], {});
          infoRows(ctx, W * 0.62, H * 0.10, W * 0.33, H * 0.44, "對照：" + ev.name, [
            ["距今", PL.fmt(ev.ma, 2) + " 億年", true],
            ["主因", ev.cause],
            ["滅絕物種", "約 " + ev.loss + "%（K–Pg：銥 ×背景 100 倍、180 km 撞擊坑）"]
          ]);
          rSun.set(sun, 0); rTemp.set(-14 * dust, 1);
          rLoss.set(ev.loss, 0); rDust.set(dust * 100, 0);
        }
      });
      const eSel = PL.ui.select(ui.L.controls, { label: "對照事件", value: "k", options: EXT.map(x => ({ value: x.key, label: x.name })) });
      const yrS = PL.ui.slider(ui.L.controls, { label: "撞擊後時間", min: 0, max: 10, step: 0.1, value: 0.5, unit: "年", digits: 1 });
      const dustS = PL.ui.slider(ui.L.controls, { label: "塵埃注入量", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      teach(ui, {
        note: "銥在地球表面極稀有、在小行星中常見：全球同時的薄銥層 + 希克蘇魯伯坑，讓「天外撞擊」從假說變定論。",
        proc: { title: "重演撞擊冬季",
          steps: ["t = 0：撞擊閃光，塵埃注入平流層；半年到 2 年，陽光掉到一成以下、氣溫降約 10 °C，光合作用停下來。",
                  "拉到 10 年：塵埃沉降，天色恢復，但食物鏈已崩潰重組。",
                  "切換對照事件：二疊紀末 96% 比 K–Pg 的 76% 更慘烈，主因卻是火山與缺氧。"],
          rule: "滅絕率高低不能反推機制：K–Pg 有銥異常層與撞擊坑兩項「兇器證據」，其他四次大滅絕的主因多指向火山活動與海洋缺氧。" },
        presets: [["撞擊瞬間", () => { yrS.set(0); dustS.set(0.6); }], ["黑暗冬季（1 年後）", () => yrS.set(1)],
                  ["10 年後（沉降）", () => yrS.set(10)]]
      });
      const [rSun, rTemp, rLoss, rDust] = RD(ui, [
        { label: "陽光到達率", unit: "%" }, { label: "氣溫距平", unit: "°C" },
        { label: "該事件滅絕率", unit: "%" }, { label: "塵埃遮蔽", unit: "%" }
      ]);
      return { stop() { ui.stop(); } };
    }
  });
})();
