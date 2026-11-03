# 地科實驗室

從台灣國中地科到高中 108 課綱的互動地球科學實驗室：12 個學習模組、96 個實驗，全部附即時 Canvas 模擬、實驗流程、即時讀數與圖表，並延伸到選修地科。

姊妹站：[化學實驗室](https://github.com/Yu-0312/senior-chemistry)（同一套實驗台骨架、同一種使用方式）。

## 使用方式

純靜態網站，不需建置：

```bash
python3 -m http.server 8080
# 開啟 http://localhost:8080
```

## 四種使用模式

1. **教師演示版** — 精簡畫面、直接投影。
2. **自學完整版** — 任務導讀、逐步鷹架與題目練習。
3. **關卡挑戰版（duo/）** — 每個實驗一關：預測 → 動手調 → 讀數據 → 解情境題。
4. **自由實驗室（lab.html）** — 板塊沙盒：選邊界、調速率、推時間，地形與地質現象即時演化。

## 開發

```bash
node tools/build-manifest.js   # 重建實驗延遲載入清單
node tools/build-static.js     # 重建靜態說明頁 / sitemap
node tools/tests/run-all.js    # 全套測試（--fast 略過慢的稽核）
```

## 授權

見 LICENSE.md 與 licensing.html：教材與視覺為 CC BY-NC-SA 4.0，程式碼與專案識別保留所有權。
