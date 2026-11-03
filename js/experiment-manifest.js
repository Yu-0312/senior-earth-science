/*
 * experiment-manifest.js — 自動產生，請勿手動編輯
 *
 * 由 tools/build-manifest.js 掃描 js/experiments/ 產生。
 * app.js 依這張表在開啟實驗時才載入對應的檔案，
 * 讓首次載入不必付出 244 個用不到的實驗的成本。
 *
 * 重新產生：node tools/build-manifest.js
 */
window.PhysicsLabExperimentFiles = {
  "atmosphere-layers": "atmosphere.js",
  "pressure-altitude": "atmosphere.js",
  "humidity-dewpoint": "atmosphere.js",
  "cloud-formation": "atmosphere.js",
  "cloud-types": "atmosphere.js",
  "wind-coriolis": "atmosphere.js",
  "fronts-weather": "atmosphere.js",
  "typhoon": "atmosphere.js",
  "earth-shape": "earth-intro.js",
  "earth-layers-intro": "earth-intro.js",
  "earth-spheres": "earth-intro.js",
  "solar-system-scale": "earth-intro.js",
  "earth-origin": "earth-intro.js",
  "earth-history-timeline": "earth-intro.js",
  "density-stratification": "earth-intro.js",
  "plate-evidence": "earth-intro.js",
  "earthquake-waves": "quake-volcano.js",
  "epicenter-locate": "quake-volcano.js",
  "magnitude-intensity": "quake-volcano.js",
  "seismograph": "quake-volcano.js",
  "fault-types": "quake-volcano.js",
  "volcano-types": "quake-volcano.js",
  "eruption-style": "quake-volcano.js",
  "soil-liquefaction": "quake-volcano.js"
};
