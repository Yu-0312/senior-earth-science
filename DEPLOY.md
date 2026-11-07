# 部署

本專案已上線 GitHub Pages，網址 <https://yu-0312.github.io/senior-earth-science/>。網站是純靜態檔案，任何靜態主機也能直接服務；本專案不使用 Vercel。

## 目前狀態

- GitHub repo：`Yu-0312/senior-earth-science`（public）
- Pages 來源：`main` 分支根目錄（Deploy from a branch），推到 `main` 即自動重建
- `js/site-config.js` 的 `siteUrl` 為 `https://yu-0312.github.io/senior-earth-science/`，與實際網址一致
- `tools/build-static.js` 產生的 canonical、sitemap 與 robots 都使用這個網址

## 換到其他主機時

### 選項 A：繼續用 GitHub Pages

1. Repo → Settings → Pages
2. Source 選 **Deploy from a branch**，分支 `main`、目錄 `/ (root)`
3. 確認 `js/site-config.js` 的 `siteUrl` 與實際網址一致，重新執行 `node tools/build-static.js`

### 選項 B：任何靜態主機

把 repo 根目錄直接上傳即可。建置指令：

```bash
node tools/build-manifest.js
node tools/build-static.js
node tools/verify-static.js
```

## 網址與 canonical

`tools/build-static.js` 的 `resolveSiteUrl()` 依序採用：

1. `SITE_URL` 環境變數
2. `js/site-config.js` 的 `siteUrl`

換網域時兩者擇一更新，並重新建置靜態頁；首頁、lab.html、licensing.html 的 canonical／og:url／og:image 是手寫的，也要一起改。

## 快取與版本號

`js/`、`css/` 的引用都帶 `?v=<build>`。**改了 `js/` 或 `css/` 就要更新版本號**，版本號同時寫在 `js/site-config.js` 與 `sw.js`，`build-consistency` 測試會擋住兩邊不一致的情況。
