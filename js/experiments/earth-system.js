/* 模組十二 · 選修:宇宙學與地球系統 */
(function () {
  "use strict";
  const PL = window.PhysicsLab, CK = window.EarthLab, D = PL.draw;
  const { clamp, lerp, TAU } = PL;

  /* 大霹靂與宇宙膨脹 */
  PL.register("big-bang", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const age = ageS.get();        // 宇宙年齡 1–138 億年(對數示意)
          const f = clamp(age / 138, 0.02, 1);
          ctx.save();
          ctx.fillStyle = "#0a0e1a";
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
          if (PL.apparatus.starfield) PL.apparatus.starfield(ctx, W, H, 3);
          // 我們的星系(參考點)與三個遠方星系
          const cx = W * 0.40, cy = H * 0.48;
          CK.galaxyShape(ctx, cx, cy, 22, "spiral", { spin: t * 0.05 });
          D.text(ctx, "銀河系(觀察者)", cx, cy + 34, { color: PL.col("text-dim"), size: 10, align: "center" });
          const FAR = [
            { d: 0.24, ang: -0.6, name: "星系 A" },
            { d: 0.46, ang: 0.5, name: "星系 B" },
            { d: 0.72, ang: 2.4, name: "星系 C" }
          ];
          FAR.forEach((G, i) => {
            const dist = G.d * (0.35 + f * 0.65) * W;   // 膨脹:越老越遠
            const x = cx + Math.cos(G.ang) * dist, y = cy + Math.sin(G.ang) * dist * 0.75;
            const type = i === 2 ? "elliptical" : "spiral";
            CK.galaxyShape(ctx, x, y, 14 + i * 3, type, { spin: -t * 0.03, seed: i + 2 });
            // 退行速度箭頭(離我們而去)
            D.arrow(ctx, x, y, x + Math.cos(G.ang) * 16, y + Math.sin(G.ang) * 16, { color: "#ef8829", width: 2 });
            const v = Math.round(70 * dist / (W * 0.5));  // 哈伯定律 v = H0·d
            D.text(ctx, G.name + " · d≈" + (dist / (W * 0.5) * 500).toFixed(0) + " Mpc · v≈" + v + " km/s",
              x, y + 28, { color: PL.col("text-dim"), size: 9.5, align: "center" });
          });
          CK.panel(ctx, W * 0.62, H * 0.10, W * 0.32, H * 0.34, "哈伯定律");
          D.text(ctx, "v = H₀ × d", W * 0.78, H * 0.22, { color: PL.col("accent"), size: 15, align: "center", weight: "700" });
          D.text(ctx, "H₀ ≈ 70 km/s/Mpc", W * 0.78, H * 0.30, { color: PL.col("text-dim"), size: 11.5, align: "center" });
          D.text(ctx, "距離越遠、退行越快", W * 0.78, H * 0.38, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          rAge.set(age, 0); rScale.set((f * 100), 0);
          rNote.set(f < 0.1 ? "宇宙極早期:物質剛形成" : f < 0.5 ? "星系正在形成" : "加速膨脹的現今宇宙");
        }
      });
      const ageS = PL.ui.slider(ui.L.controls, { label: "宇宙年齡", min: 1, max: 138, step: 1, value: 138, unit: "億年", digits: 0 });
      PL.ui.note(ui.L.controls, "膨脹的是「空間本身」:每個星系都看到別人遠離自己,沒有中心。哈伯定律 v = H₀d 把紅移換成距離與速度。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀懂宇宙膨脹",
        steps: [
          "年齡拉到 138 億年:三個星系各有一個退行速度。",
          "比對:距離越遠的星系,箭頭(速度)越長——線性關係。",
          "回推年齡到 1 億年:所有星系擠回同一處。",
          "反問:膨脹有中心嗎?——沒有,每點都是「中心」。"
        ],
        rule: "星系不是在空間中飛散,是空間本身在拉伸;紅移是波長被拉長,不是星系跑得快。"
      });
      PL.ui.presets(ui.L.controls, { label: "時代", options: [
        { label: "現今(138 億年)", apply: () => ageS.set(138) },
        { label: "星系形成期", apply: () => ageS.set(30) },
        { label: "極早期", apply: () => ageS.set(1) }
      ] });
      const rAge = PL.ui.readout(ui.L.readouts, { label: "宇宙年齡", unit: "億年" });
      const rScale = PL.ui.readout(ui.L.readouts, { label: "空間尺度", unit: "%" });
      const rNote = PL.ui.readout(ui.L.readouts, { label: "時代" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 宇宙微波背景輻射 */
  PL.register("cosmic-background", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const zoom = zoomS.get();
          // 全天空 CMB 圓盤:溫度漣漪
          const cx = W * 0.34, cy = H * 0.50, R = H * 0.36;
          const grad = ctx.createRadialGradient(cx, cy, R * 0.2, cx, cy, R);
          grad.addColorStop(0, "#3d2a6e");
          grad.addColorStop(1, "#171041");
          D.disc(ctx, cx, cy, R, { fill: grad, stroke: PL.col("border"), width: 2 });
          const rnd = CK === window.EarthLab ? null : null;
          // 溫度斑塊:紅=略暖(2.727K)、藍=略冷(2.723K),差異只有十萬分之一
          const seedR = 17;
          let s2 = 17;
          const rand = () => { s2 = (Math.imul(s2, 1664525) + 1013904223) >>> 0; return s2 / 4294967296; };
          for (let i = 0; i < 60; i++) {
            const a = rand() * TAU, rr = Math.sqrt(rand()) * R * 0.95;
            const size = R * (0.05 + rand() * 0.09) * (0.7 + zoom * 0.6);
            const warm = rand() > 0.5;
            ctx.save();
            ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.clip();
            ctx.globalAlpha = zoom;
            D.disc(ctx, cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, size,
              { fill: warm ? "rgba(239,110,90,0.35)" : "rgba(90,130,235,0.35)" });
            ctx.restore();
          }
          D.text(ctx, "2.725 K", cx, cy + 4, { color: "#fff", size: 15, align: "center", weight: "700" });
          D.text(ctx, "全天微波圖(橢圓投影示意)", cx, cy + R + 18, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.panel(ctx, W * 0.62, H * 0.10, W * 0.32, H * 0.72, "時間軸");
          const rows = [
            ["0 秒", "大霹靂"],
            ["38 萬年", "原子形成,光獲自由"],
            ["那批光", "紅移成微波(CMB)"],
            ["13.8 億年", "第一批星系"],
            ["138 億年", "現在:我們在讀它"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.65, H * (0.20 + i * 0.13), { color: i === 1 ? PL.col("accent") : PL.col("text-faint"), size: 11, weight: i === 1 ? "700" : "" });
            D.text(ctx, v, W * 0.92, H * (0.20 + i * 0.13), { color: PL.col("text"), size: 10.5, align: "right" });
          });
          D.text(ctx, "斑塊=十萬分之一的溫度差", W * 0.78, H * 0.76, { color: PL.col("accent-2"), size: 10.5, align: "center", weight: "700" });
          rZoom.set(zoom, 2); rT.set(2.725, 3);
        }
      });
      const zoomS = PL.ui.slider(ui.L.controls, { label: "漣漪對比增強", min: 0.15, max: 1, step: 0.05, value: 0.45, digits: 2 });
      PL.ui.note(ui.L.controls, "大霹靂後 38 萬年,宇宙冷到讓電子與質子結合成原子,光從此自由飛行——那批光紅移至今就是 2.725 K 的微波背景。斑塊是早期物質分布的「種子」。");
      PL.ui.procedure(ui.L.controls, {
        title: "讀宇宙嬰兒照",
        steps: [
          "記住均勻度:肉眼幾乎完美均勻(2.725 K)。",
          "拉高對比:紅藍斑塊浮現——差異只有 1/100,000。",
          "這些斑塊在重力作用下長成今天的星系與星系團。"
        ],
        rule: "CMB 的「完美均勻 + 微小漣漪」是熱霹靂模型最強的證據:漣漪太小長不出星系、太大則宇宙早就撕裂。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "肉眼視角", apply: () => zoomS.set(0.15) },
        { label: "普朗克衛星視角", apply: () => zoomS.set(0.85) }
      ] });
      const rZoom = PL.ui.readout(ui.L.readouts, { label: "對比增強", unit: "×" });
      const rT = PL.ui.readout(ui.L.readouts, { label: "背景溫度", unit: "K" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 星系的分類與銀河系 */
  PL.register("galaxies", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const pick = pickSel.get();
          ctx.save();
          ctx.fillStyle = "#0a0e1a";
          ctx.fillRect(0, 0, W, H);
          ctx.restore();
          if (PL.apparatus.starfield) PL.apparatus.starfield(ctx, W, H, 5);
          const show = {
            spiral: [0, 1, 2],
            elliptical: [3, 4],
            irregular: [5],
            all: [0, 1, 2, 3, 4, 5]
          }[pick];
          const GAL = [
            { x: 0.22, y: 0.30, type: "spiral", label: "螺旋(像銀河系)" },
            { x: 0.52, y: 0.22, type: "spiral", label: "棒旋(有棒狀核心)" },
            { x: 0.80, y: 0.34, type: "spiral", label: "螺旋(側視)" },
            { x: 0.30, y: 0.68, type: "elliptical", label: "橢圓(老年星團)" },
            { x: 0.62, y: 0.72, type: "elliptical", label: "巨大橢圓(星系團中心)" },
            { x: 0.84, y: 0.68, type: "irregular", label: "不規則(大、小麥哲倫)" }
          ];
          GAL.forEach((G, i) => {
            const active = show.includes(i);
            ctx.save();
            ctx.globalAlpha = active ? 1 : 0.18;
            CK.galaxyShape(ctx, W * G.x, H * G.y, G.type === "elliptical" ? 34 : 30, G.type, { spin: t * 0.03 + i, seed: i * 3, flat: 0.55 });
            ctx.restore();
            D.text(ctx, G.label, W * G.x, H * G.y + 50, { color: active ? PL.col("text") : PL.col("text-faint"), size: 9.5, align: "center" });
          });
          // 太陽位置標示
          CK.panel(ctx, W * 0.04, H * 0.04, W * 0.26, H * 0.24, "銀河系速記");
          D.text(ctx, "棒旋星系 · 直徑約 10 萬光年", W * 0.17, H * 0.16, { color: PL.col("text-dim"), size: 10, align: "center" });
          D.text(ctx, "太陽在獵戶臂,距銀心 2.6 萬光年", W * 0.17, H * 0.23, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          rType.set({ spiral: "螺旋星系:氣體多、造星活躍", elliptical: "橢圓星系:老星多、氣體枯竭", irregular: "不規則星系:常是交互作用的結果", all: "哈伯音叉:三大類" }[pick]);
        }
      });
      const pickSel = PL.ui.select(ui.L.controls, { label: "分類", value: "all", options: [
        { value: "all", label: "全部(哈伯序列)" }, { value: "spiral", label: "螺旋" },
        { value: "elliptical", label: "橢圓" }, { value: "irregular", label: "不規則" }
      ] });
      PL.ui.note(ui.L.controls, "哈伯把星系分為螺旋、橢圓與不規則:螺旋仍有大量氣體造星,橢圓是「老年」的紅星集合,不規則常來自星系互撞的殘骸。");
      PL.ui.procedure(ui.L.controls, {
        title: "辨認星系類型",
        steps: [
          "看輪廓:有旋臂=螺旋;平滑橢圓=橢圓;散亂=不規則。",
          "看顏色:藍(造星)多為螺旋/不規則;偏紅黃多為橢圓。",
          "對照本銀河系:棒旋,太陽在偏外圍的獵戶臂。"
        ],
        rule: "橢圓星系不是「轉得快的螺旋」,而是氣體已耗盡、只剩老年恆星的另一個演化方向。"
      });
      const rType = PL.ui.readout(ui.L.readouts, { label: "類型特徵" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 衛星遙測與電磁波譜 */
  PL.register("remote-sensing", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const band = bandSel.get();
          const water = waterS.get();
          // 地表方格(農田+水體+城市)
          const bx = W * 0.06, by = H * 0.12, bw = W * 0.52, bh = H * 0.76;
          D.rect(ctx, bx, by, bw, bh, { fill: PL.theme.isLight() ? "#4e6b40" : "#2e4a2e", stroke: PL.col("border"), r: 6 });
          // 農田格
          for (let r = 0; r < 4; r++) {
            for (let c = 0; c < 3; c++) {
              const health = clamp(0.9 - r * 0.22 - (c === 1 ? 0.1 : 0), 0.15, 1);
              const veg = clamp(health - water * 0.55, 0.05, 1);
              D.rect(ctx, bx + 8 + c * (bw - 16) / 3, by + 8 + r * (bh - 30) / 4, (bw - 16) / 3 - 6, (bh - 30) / 4 - 6,
                { fill: CK.mix("#8a6f42", "#4caf50", veg) });
            }
          }
          // 河流
          ctx.save();
          ctx.strokeStyle = "#4a90d9"; ctx.lineWidth = clamp(10 - water * 6, 3, 10); ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(bx + 10, by + bh - 18);
          ctx.quadraticCurveTo(bx + bw * 0.4, by + bh * 0.62, bx + bw - 10, by + bh * 0.55);
          ctx.stroke();
          ctx.restore();
          D.rect(ctx, bx + bw - 52, by + 12, 44, 30, { fill: "#9aa4ad", stroke: "rgba(255,255,255,0.25)", r: 3 });
          D.text(ctx, "城市", bx + bw - 30, by + 32, { color: "#fff", size: 9, align: "center" });
          // 衛星
          const sx = bx + bw + 24, sy = by + 24;
          D.rect(ctx, sx, sy, 40, 16, { fill: "#c8d2dc", r: 3 });
          D.rect(ctx, sx - 16, sy - 2, 14, 20, { fill: "#4a6fa5", r: 2 });
          D.rect(ctx, sx + 42, sy - 2, 14, 20, { fill: "#4a6fa5", r: 2 });
          D.line(ctx, sx + 20, sy + 16, sx + 20, by + bh * 0.4, "rgba(120,220,255,0.5)", 1.6, [4, 4]);
          D.text(ctx, "衛星掃描", sx + 20, sy - 8, { color: PL.col("text-dim"), size: 10, align: "center" });
          if (water > 0.45) CK.badge(ctx, bx + bw * 0.5, by + bh * 0.16, water > 0.75 ? "重旱:植被枯黃" : "缺水:植被轉黃", water > 0.75 ? "#c0392b" : "#ef8829");
          // 波段解讀卡
          CK.panel(ctx, W * 0.66, H * 0.14, W * 0.28, H * 0.58, "波段 → 看什麼");
          const info = {
            vis: { name: "可見光", see: "人眼所見:雲、沙、植被的顏色", use: "地物辨識、海岸線" },
            nir: { name: "近紅外線", see: "健康植被強反射(葉肉結構)", use: "作物長勢、森林監測" },
            ir: { name: "熱紅外線", see: "地表溫度分布", use: "城市熱島、海溫" },
            mw: { name: "微波(雷達)", see: "穿雲、日夜皆可,對粗糙度敏感", use: "降雨、海面高度、地層形變" }
          }[band];
          D.text(ctx, info.name, W * 0.80, H * 0.24, { color: PL.col("accent"), size: 13.5, align: "center", weight: "700" });
          D.text(ctx, info.see, W * 0.80, H * 0.34, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          D.text(ctx, "應用:" + info.use, W * 0.80, H * 0.44, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          // NDVI 量表
          const ndvi = clamp(0.8 - water * 0.35, 0, 0.9);
          if (band === "nir") {
            CK.meter(ctx, W * 0.68, H * 0.54, W * 0.24, 10, ndvi / 0.9, { color: "#66bb6a", label: "NDVI 植生指數 " + ndvi.toFixed(2) });
            D.text(ctx, "(NIR−紅)/(NIR+紅)", W * 0.80, H * 0.62, { color: PL.col("text-faint"), size: 9.5, align: "center" });
          }
          rBand.set(info.name); rNdvi.set(ndvi, 2);
        }
      });
      const bandSel = PL.ui.select(ui.L.controls, { label: "波段", value: "vis", options: [
        { value: "vis", label: "可見光" }, { value: "nir", label: "近紅外線" },
        { value: "ir", label: "熱紅外線" }, { value: "mw", label: "微波(雷達)" }
      ] });
      const waterS = PL.ui.slider(ui.L.controls, { label: "植被缺水程度", min: 0, max: 1, step: 0.05, value: 0.2, digits: 2 });
      PL.ui.note(ui.L.controls, "同一片土地,不同波段看到不同故事:可見光看顏色、近紅外看植被活力、熱紅外看溫度、微波穿雲測形變。遙測是「選對波段」的科學。");
      PL.ui.procedure(ui.L.controls, {
        title: "當一次遙測分析師",
        steps: [
          "先看可見光:哪塊田比較黃?",
          "切到近紅外:健康植被強反射,缺水田立刻現形(NDVI 下降)。",
          "切到熱紅外:想像城市正午比郊區熱 5 °C。",
          "微波能穿雲:颱風天唯一的觀測手段。"
        ],
        rule: "NDVI > 0.6 代表茂密植被、< 0.2 幾乎裸土——衛星把「土地健康」變成一個可比較的數字。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "健康農田", apply: () => waterS.set(0.05) },
        { label: "乾旱監測", apply: () => { bandSel.set("nir"); waterS.set(0.8); } }
      ] });
      const rBand = PL.ui.readout(ui.L.readouts, { label: "波段" });
      const rNdvi = PL.ui.readout(ui.L.readouts, { label: "NDVI" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 氣象衛星與數值預報 */
  PL.register("weather-satellite", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const typhoon = tyS.get();
          const hours = hS.get();
          CK.scene(ui.cv, { kind: "sky", horizon: 0.02 });
          // 地圖底(西北太平洋)
          const mapBox = { x: W * 0.06, y: H * 0.08, w: W * 0.56, h: H * 0.78 };
          D.rect(ctx, mapBox.x, mapBox.y, mapBox.w, mapBox.h, { fill: "rgba(40,95,135,0.5)", stroke: PL.col("border"), r: 8 });
          // 台灣與海岸線示意
          const proj = CK.taiwanMap(ctx, { x: mapBox.x + mapBox.w * 0.52, y: mapBox.y + mapBox.h * 0.52, w: mapBox.w * 0.34, h: mapBox.h * 0.40 }, {});
          // 颱風:位置隨時間西移
          const tyX = mapBox.x + mapBox.w * (0.72 - clamp(hours / 72, 0, 1) * 0.42);
          const tyY = mapBox.y + mapBox.h * (0.22 + clamp(hours / 72, 0, 1) * 0.24);
          CK.typhoonSpiral(ctx, tyX, tyY, 34 + typhoon * 14, { spin: t * 0.25, eye: 4 + (1 - typhoon) * 4, alpha: 0.6 + typhoon * 0.35 });
          D.text(ctx, "颱風中心 " + (985 - Math.round(typhoon * 70)) + " hPa", tyX, tyY - 44, { color: "#fff", size: 10, align: "center" });
          // 觀測資料點(填入模式)
          for (let i = 0; i < 12; i++) {
            const a = i * 2.4, rr = 18 + (i % 3) * 12;
            D.disc(ctx, tyX + Math.cos(a) * rr * 1.4, tyY + Math.sin(a) * rr, 2, { fill: "rgba(255,255,255,0.7)" });
          }
          D.text(ctx, "浮標/探空/衛星觀測 → 數值模式", mapBox.x + 8, mapBox.y + mapBox.h - 10, { color: PL.col("text-faint"), size: 9.5 });
          // 預報卡
          CK.panel(ctx, W * 0.66, H * 0.10, W * 0.28, H * 0.74, "預報品質隨時間衰減");
          const err = 30 + hours * 3.2;
          CK.meter(ctx, W * 0.69, H * 0.24, W * 0.22, 10, clamp(err / 260, 0, 1), { color: err > 150 ? "#e57373" : err > 80 ? "#ffb74d" : "#66bb6a", label: "路徑誤差約 " + Math.round(err) + " km" });
          const rows = [
            ["未來 6h", "非常可靠"],
            ["未來 24h", "可靠"],
            ["未來 48h", "可用,注意修正"],
            ["未來 72h", "僅供趨勢參考"]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.69, H * (0.36 + i * 0.11), { color: PL.col("text-dim"), size: 10.5 });
            D.text(ctx, v, W * 0.92, H * (0.36 + i * 0.11), { color: i < 2 ? "#66bb6a" : i === 2 ? "#ffb74d" : PL.col("text-faint"), size: 10.5, align: "right" });
          });
          D.text(ctx, "同步衛星盯雲系 · 繞極衛星餵剖面資料", W * 0.80, H * 0.80, { color: PL.col("text-faint"), size: 9, align: "center" });
          rHours.set(hours, 0); rErr.set(Math.round(err), 0); rCat.set(typhoon > 0.66 ? "強烈" : typhoon > 0.33 ? "中度" : "輕度");
        }
      });
      const tyS = PL.ui.slider(ui.L.controls, { label: "颱風強度", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const hS = PL.ui.slider(ui.L.controls, { label: "預報時效", min: 6, max: 72, step: 6, value: 24, unit: "h", digits: 0 });
      PL.ui.note(ui.L.controls, "數值預報把觀測塞進流體力學方程往外推:越遠誤差越大。二十年來颱風路徑誤差從 200 km 縮到 100 km 內——靠的是更密的觀測與更強的算力。");
      PL.ui.procedure(ui.L.controls, {
        title: "看懂一張颱風預報",
        steps: [
          "看中心氣壓:越低越強(強烈颱風 < 920 hPa)。",
          "拉時效:誤差圈越大,路徑越不確定。",
          "記住口訣:時效越長越要看「趨勢」而非「路徑點」。"
        ],
        rule: "預報的是機率不是劇本:72 小時後的中心預報點,只是誤差圓的圓心。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "臨近(6h)", apply: () => hS.set(6) },
        { label: "三天前(72h)", apply: () => hS.set(72) }
      ] });
      const rHours = PL.ui.readout(ui.L.readouts, { label: "預報時效", unit: "h" });
      const rErr = PL.ui.readout(ui.L.readouts, { label: "路徑誤差", unit: "km" });
      const rCat = PL.ui.readout(ui.L.readouts, { label: "強度分級" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 天然災害與風險評估 */
  PL.register("natural-hazards", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58,
        draw() {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const H_ = hazS.get();      // 危害強度 0–1
          const E = expS.get();       // 暴露 0–1
          const V = vulS.get();       // 脆弱度 0–1
          const R = H_ * E * V;
          // 風險三因子卡片
          CK.panel(ctx, W * 0.04, H * 0.10, W * 0.56, H * 0.62, "風險 = 危害 × 暴露 × 脆弱度");
          const trip = [
            ["危害(H)", H_, "#ef8829", "地震/颱風/豪雨的強度與頻率"],
            ["暴露(E)", E, "#42a5f5", "有多少人與財產在災害區內"],
            ["脆弱度(V)", V, "#ab47bc", "建物耐震、預警、應變能力"]
          ];
          trip.forEach(([lab, f, c, note], i) => {
            const y = H * (0.24 + i * 0.24);
            D.text(ctx, lab, W * 0.07, y, { color: PL.col("text-dim"), size: 11.5, weight: "700" });
            CK.meter(ctx, W * 0.07, y + 8, W * 0.48, 12, f, { color: c });
            D.text(ctx, Math.round(f * 100) + "%", W * 0.57, y, { color: PL.col("text"), size: 11.5, align: "right" });
            D.text(ctx, note, W * 0.07, y + 30, { color: PL.col("text-faint"), size: 9.5 });
          });
          // 風險儀表
          const gx = W * 0.76, gy = H * 0.36;
          D.disc(ctx, gx, gy, H * 0.17, { fill: PL.theme.shade(0.5), stroke: PL.col("border"), width: 2 });
          const level = R < 0.12 ? ["低", "#66bb6a"] : R < 0.3 ? ["中", "#ffb74d"] : R < 0.55 ? ["高", "#ef8829"] : ["極高", "#e57373"];
          D.text(ctx, "總風險", gx, gy - H * 0.08, { color: PL.col("text-faint"), size: 10.5, align: "center" });
          D.text(ctx, level[0], gx, gy + 6, { color: level[1], size: 24, align: "center", weight: "700" });
          D.text(ctx, (R * 100).toFixed(0) + " / 100", gx, gy + 24, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          CK.meter(ctx, gx - H * 0.13, gy + H * 0.20, H * 0.26, 9, R, { color: level[1] });
          // 降低風險的兩條路
          CK.panel(ctx, W * 0.04, H * 0.76, W * 0.90, H * 0.18, "風險怎麼降");
          D.text(ctx, "減緩危害(難):碳減排、治山防洪　|　降低暴露(可):國土規劃、避開潛勢區　|　降低脆弱(最有效):耐震建築、預警撤離、防災演練",
            W * 0.49, H * 0.88, { color: PL.col("text-dim"), size: 10.5, align: "center" });
          rH.set(Math.round(H_ * 100), 0); rE.set(Math.round(E * 100), 0); rV.set(Math.round(V * 100), 0);
          rR.set((R * 100).toFixed(0), 0); rLv.set(level[0]);
        }
      });
      const hazS = PL.ui.slider(ui.L.controls, { label: "危害強度", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const expS = PL.ui.slider(ui.L.controls, { label: "暴露程度", min: 0, max: 1, step: 0.05, value: 0.6, digits: 2 });
      const vulS = PL.ui.slider(ui.L.controls, { label: "脆弱度", min: 0, max: 1, step: 0.05, value: 0.5, digits: 2 });
      PL.ui.note(ui.L.controls, "同一場地震,發在無人荒野是「事件」、發在都會是「災害」。三個因子是相乘的:把任何一項降到接近零,總風險就跟著崩落。");
      PL.ui.procedure(ui.L.controls, {
        title: "做一次減災決策",
        steps: [
          "危害往往無法控制(斷層就在那裡)——拉不拉都一樣。",
          "降低暴露:把城鎮遷出潛勢區,風險立刻下降。",
          "降低脆弱:耐震補強、預警系統,是最便宜的高效益投資。",
          "任一因子歸零,總風險歸零——這就是「相乘」的意義。"
        ],
        rule: "防災的目標不是「預知天災」,而是讓 H×E×V 三個數字同時變小——尤其是 V。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "無預警+高暴露", apply: () => { hazS.set(0.9); expS.set(0.9); vulS.set(0.8); } },
        { label: "有整備的社區", apply: () => { hazS.set(0.8); expS.set(0.5); vulS.set(0.2); } }
      ] });
      const rH = PL.ui.readout(ui.L.readouts, { label: "危害", unit: "%" });
      const rE = PL.ui.readout(ui.L.readouts, { label: "暴露", unit: "%" });
      const rV = PL.ui.readout(ui.L.readouts, { label: "脆弱度", unit: "%" });
      const rR = PL.ui.readout(ui.L.readouts, { label: "總風險" });
      const rLv = PL.ui.readout(ui.L.readouts, { label: "風險等級" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 水資源與地下水 */
  PL.register("water-resources", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const pump = pumpS.get();     // 抽水量 0–1
          const year = yrS.get();       // 經過年數 0–30
          const surface = H * 0.16;
          const base = H * 0.92;
          // 地層
          CK.rockLayers(ctx, { x: W * 0.06, y: surface + 8, w: W * 0.56, h: base - surface - 26 },
            [{ name: "表土", h: 1.2, color: "#8a7a5a" }, { name: "不透水層(黏土)", h: 0.8, color: "#5d6672" },
             { name: "含水層(砂礫)", h: 2.0, color: "#c2b280" }, { name: "基盤岩", h: 1.4, color: "#7a8a96" }],
            { tilt: 0 });
          // 地下水位線:超抽使水位下降
          const drop = pump * year * 0.9;           // 公尺(示意)
          const waterTop = surface + 8 + 26 + clamp(drop, 0, 90);
          const wtY = lerp(surface + 8 + 30, base - 60, clamp((waterTop - surface - 8) / (base - surface - 34), 0, 1));
          D.rect(ctx, W * 0.06, wtY, W * 0.56, base - 18 - wtY, { fill: "rgba(70,140,190,0.35)" });
          D.line(ctx, W * 0.06, wtY, W * 0.62, wtY, "rgba(120,200,240,0.95)", 2.4);
          D.text(ctx, "地下水位", W * 0.64, wtY + 4, { color: "#7fd8f7", size: 10.5 });
          // 水井與抽水
          const wellX = W * 0.36;
          D.rect(ctx, wellX - 5, surface + 2, 10, base - 28 - surface, { fill: PL.theme.isLight() ? "rgba(150,175,195,0.35)" : "rgba(200,214,226,0.28)", stroke: "rgba(90,110,130,0.9)", width: 1.4 });
          if (pump > 0.05) {
            for (let i = 0; i < 3; i++) {
              const f = ((t * 0.3 * pump + i / 3) % 1);
              D.disc(ctx, wellX + 8 + f * 14, surface + 10 + f * 8, 2.4, { fill: "rgba(140,210,250," + (0.9 - f * 0.6) + ")" });
            }
          }
          // 地層下陷標尺
          const sub = pump * year * 0.03;
          if (sub > 0.05) {
            D.rect(ctx, W * 0.24, base - 18, W * 0.22, 8, { fill: "#e57373" });
            D.text(ctx, "地層下陷 " + sub.toFixed(1) + " m(不可逆)", W * 0.35, base - 24, { color: "#ef9a9a", size: 10, align: "center", weight: "700" });
          }
          CK.panel(ctx, W * 0.66, H * 0.12, W * 0.28, H * 0.66, "收支判斷");
          const recharge = 1;
          const net = recharge - pump;
          const rows = [
            ["補注量", "1.0(基準)"],
            ["抽用量", pump.toFixed(2)],
            ["收支", net >= 0 ? "平衡/盈餘" : "超抽 " + Math.abs(net).toFixed(2)]
          ];
          rows.forEach(([k, v], i) => {
            D.text(ctx, k, W * 0.69, H * (0.24 + i * 0.12), { color: PL.col("text-dim"), size: 11 });
            D.text(ctx, v, W * 0.92, H * (0.24 + i * 0.12), { color: i === 2 ? (net >= 0 ? "#66bb6a" : "#e57373") : PL.col("text"), size: 11.5, align: "right", weight: i === 2 ? "700" : "" });
          });
          D.text(ctx, net < 0 ? "超抽 → 水位年年下降、海水入侵" : "抽取低於補注:可持續使用", W * 0.80, H * 0.64, { color: net < 0 ? "#ef9a9a" : "#a5d6a7", size: 10, align: "center" });
          D.text(ctx, "屏東沿海的下陷,就是 1970–90 年超抽養殖用水的代價", W * 0.80, H * 0.72, { color: PL.col("text-faint"), size: 9, align: "center" });
          rPump.set(Math.round(pump * 100), 0); rDrop.set(drop, 1); rSub.set(sub, 1);
        }
      });
      const pumpS = PL.ui.slider(ui.L.controls, { label: "抽用強度", min: 0, max: 1.6, step: 0.05, value: 0.6, digits: 2 });
      const yrS = PL.ui.slider(ui.L.controls, { label: "持續年數", min: 0, max: 30, step: 1, value: 10, unit: "年", digits: 0 });
      PL.ui.note(ui.L.controls, "地下水像「存款」:補注是利息,超抽是動本金。水位年年下降、地層壓實下陷——存款一旦花掉,補回來的速度以「世紀」計。");
      PL.ui.procedure(ui.L.controls, {
        title: "重演沿海地層下陷",
        steps: [
          "抽用 0.6、觀察 10 年:水位微降,尚可承受。",
          "拉高到 1.2(超抽):水位快速下降、出現下陷。",
          "再拉年數:下陷不可逆——壓實的地層裝不回水。",
          "對照右側收支:問題永遠出在「抽 > 補」。"
        ],
        rule: "地層下陷與海水入侵都是不可逆的:地下水管理拼的是「抽用量 ≤ 補注量」這條線。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "永續使用", apply: () => { pumpS.set(0.6); yrS.set(10); } },
        { label: "嚴重超抽", apply: () => { pumpS.set(1.3); yrS.set(25); } }
      ] });
      const rPump = PL.ui.readout(ui.L.readouts, { label: "抽用強度", unit: "%" });
      const rDrop = PL.ui.readout(ui.L.readouts, { label: "水位下降", unit: "m" });
      const rSub = PL.ui.readout(ui.L.readouts, { label: "地層下陷", unit: "m" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 地球系統的跨圈層耦合 */
  PL.register("earth-system-science", {
    build(root) {
      const ui = CK.scaffold(root, {
        aspect: 0.58, animate: true,
        draw(dt, t) {
          const { ctx, W, H } = ui.cv; CK.bench(ui.cv);
          const volc = volcS.get();      // 火山強度(擾動源)
          // 四圈層泡泡
          const SPH = [
            { id: "rock", name: "岩石圈", x: 0.24, y: 0.26, color: "#8a6f52" },
            { id: "atmo", name: "大氣圈", x: 0.60, y: 0.20, color: "#5c8ac9" },
            { id: "hydro", name: "水圈", x: 0.28, y: 0.66, color: "#3f9ad8" },
            { id: "bio", name: "生物圈", x: 0.64, y: 0.68, color: "#66bb6a" }
          ];
          SPH.forEach(s => {
            D.disc(ctx, W * s.x, H * s.y, H * 0.115, { fill: s.color, stroke: "rgba(255,255,255,0.25)", width: 1.6 });
            D.text(ctx, s.name, W * s.x, H * s.y + 4, { color: "#fff", size: 12, align: "center", weight: "700" });
          });
          // 擾動:火山(岩石圈→大氣)
          if (volc > 0.05) {
            D.disc(ctx, W * 0.24, H * 0.26 - H * 0.115 - 6, 6, { fill: "#ff7043", glow: "#ff5722", glowSize: 12 });
            // 氣溶膠進平流層 → 反照率↑ → 降溫
            arrowPulse(ctx, W * 0.24 + 60, H * 0.26 - 20, W * 0.60 - 40, H * 0.20 - 30, "#ffab91", volc, t);
            D.text(ctx, "① 噴發:氣溶膠入平流層", W * 0.42, H * 0.145, { color: "#ffab91", size: 9.5, align: "center" });
          }
          // 大氣→水圈:降溫
          const cool = volc;
          arrowPulse(ctx, W * 0.60 + 30, H * 0.20 + 40, W * 0.28 + 50, H * 0.66 - 50, "#81d4fa", cool, t);
          D.text(ctx, "② 反照率↑ → 全球降溫", W * 0.44, H * 0.42, { color: "#81d4fa", size: 9.5, align: "center" });
          // 水圈→生物圈:光合減弱
          arrowPulse(ctx, W * 0.28 + 55, H * 0.66, W * 0.64 - 55, H * 0.68, "#c5e1a5", cool, t);
          D.text(ctx, "③ 陽光變暗 → 光合下降 → 糧食減產", W * 0.46, H * 0.755, { color: "#c5e1a5", size: 9.5, align: "center" });
          // 負回饋:風化吸碳緩慢修復
          const heal = clamp(1 - volc * 0.4, 0.2, 1);
          CK.meter(ctx, W * 0.60, H * 0.80, W * 0.30, 10, heal, { color: "#66bb6a", label: "風化吸碳(負回饋,緩慢修復)" });
          // 全球溫度讀數
          const dT = -volc * 1.4;
          CK.panel(ctx, W * 0.04, H * 0.78, W * 0.50, H * 0.16, "系統回應");
          D.text(ctx, "全球均溫變化 " + (dT >= 0 ? "+" : "") + dT.toFixed(1) + " °C(皮納土波 1991:−0.5 °C 兩年)", W * 0.29, H * 0.88, { color: dT < -0.8 ? "#81d4fa" : PL.col("text-dim"), size: 11, align: "center", weight: "700" });
          rVolc.set(volc, 2); rDT.set(dT, 1); rMode.set(volc > 0.6 ? "強擾動:降溫達 1 °C 量級" : volc > 0.2 ? "可測得的降溫" : "平衡態");
        }
      });
      const volcS = PL.ui.slider(ui.L.controls, { label: "火山擾動強度", min: 0, max: 1, step: 0.05, value: 0.3, digits: 2 });
      PL.ui.note(ui.L.controls, "一場火山把「岩石圈」的物質送進「大氣圈」,經反照率降溫影響「水圈與生物圈」;風化吸碳再花數萬年把系統拉回——正負回饋接力,就是地球系統。");
      PL.ui.procedure(ui.L.controls, {
        title: "追一條跨圈層鏈",
        steps: [
          "拉高擾動:岩漿與氣溶膠進入平流層(①)。",
          "反照率上升 → 全球降溫(②)。",
          "光照與熱減少 → 光合與農產下滑(③)。",
          "看右下儀表:風化吸碳是「慢性藥」,以萬年尺度修復。"
        ],
        rule: "正回饋放大擾動(冰雪反照率)、負回饋穩定系統(風化吸碳);預測地球未來,等於預測回饋的和。"
      });
      PL.ui.presets(ui.L.controls, { label: "情境", options: [
        { label: "平靜地球", apply: () => volcS.set(0.05) },
        { label: "皮納土波級", apply: () => volcS.set(0.5) },
        { label: "超級火山", apply: () => volcS.set(0.95) }
      ] });
      const rVolc = PL.ui.readout(ui.L.readouts, { label: "擾動強度" });
      const rDT = PL.ui.readout(ui.L.readouts, { label: "溫度回應", unit: "°C" });
      const rMode = PL.ui.readout(ui.L.readouts, { label: "系統狀態" });
      return { stop() { ui.stop(); } };
    }
  });

  /* 沿直線脈動箭頭(檔內共用) */
  function arrowPulse(ctx, x1, y1, x2, y2, color, strength, t) {
    const ang = Math.atan2(y2 - y1, x2 - x1);
    D.line(ctx, x1, y1, x2, y2, "rgba(140,170,200,0.30)", 1.8, [5, 4]);
    if (strength < 0.05) return;
    for (let i = 0; i < 3; i++) {
      const f = ((t * 0.22 * strength + i / 3) % 1);
      D.disc(ctx, lerp(x1, x2, f), lerp(y1, y2, f), 3.6, { fill: color, glow: color, glowSize: 6 });
    }
    D.arrow(ctx, x2 - Math.cos(ang) * 6, y2 - Math.sin(ang) * 6, x2, y2, { color, width: 2.4 });
  }
})();
