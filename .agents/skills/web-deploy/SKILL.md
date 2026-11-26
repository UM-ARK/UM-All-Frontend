---
name: web-deploy
description: 建置、本地驗證與部署 ARK ALL Web 版（react-native-web 純靜態單頁）至 umall.one/webAPP/ 的完整流程與檢查清單。
---

# Web 版建置與部署流程

Web 版由 `react-native-web` 打包為純靜態單頁應用（入口 `App.web.js`、路由 `src/Nav.web.js`），部署於 `https://umall.one/webAPP/`，與 `/api/` 同源以避免瀏覽器 CORS。

## 一、三處子路徑必須保持一致

修改部署路徑或檢查路由異常時，先核對這三處：

| 位置 | 設定 | 作用 |
| --- | --- | --- |
| `app.json` → `expo.experiments.baseUrl` | `"/webAPP"` | 靜態資源與 bundle 前綴 |
| `src/Nav.web.js` → `WEB_BASE_PATH` | `'webAPP'` | React Navigation 路徑前綴，避免刷新落入官網 Next.js 路由 |
| 伺服器 nginx `/etc/nginx/sites-available/umall.one.conf` | `location /webAPP/` → `alias /data/umall/webAPP/` | 靜態檔服務與 SPA fallback |

> `umall.one/app/*` 為官網（Next.js）分享落地頁專用，Web 版不可佔用該前綴。

## 二、本地調試

```bash
npx expo start --web
```

- Web 端在 `src/utils/pathMap.js` 中 `API_HOST` 為空字串；本地開發由 `metro.config.js` 代理將 `/api/*` 轉發至 `umall.one`。

## 三、匯出靜態產物與同步上線

匯出至 `dist/`（每次會清空重建，已列於 `.gitignore`）：

```bash
npx expo export --platform web
```

- 本地驗證產物**不要**直接用 Live Server 開啟 `dist/index.html`（絕對路徑 `/webAPP/...` 會對不上而白屏）；如需本地檢查可用 `npx serve dist` 並注意子路徑，或直接同步驗證。

同步到伺服器 `ARK_ALL_Server_OVH`（`~/.ssh/config` 別名，`ubuntu` 使用者）：

```bash
rsync -avz --delete dist/ ARK_ALL_Server_OVH:/data/umall/webAPP/
```

一條指令完成匯出加同步（執行部署前務必先與使用者確認）：

```bash
npx expo export --platform web && rsync -avz --delete dist/ ARK_ALL_Server_OVH:/data/umall/webAPP/
```

- `--delete` 會清理舊 hash 檔案；nginx 無需重啟，落地即生效。

## 四、上線驗證指令

```bash
for u in /webAPP /webAPP/ /webAPP/course/CISC1001 /webAPP/favicon.ico; do
    curl -s -o /dev/null -w "$u %{http_code} cache=%header{cache-control}\n" "https://umall.one$u"
done
```

預期行為：
- `/webAPP` → `301` 跳轉 `/webAPP/`
- `/webAPP/` 與 SPA 路由 → `200`，`index.html` 為 `no-cache`
- `/webAPP/_expo/*` → `public, max-age=31536000, immutable`

## 五、已知限制

- Cloudflare 會於 `index.html` 注入 `/cdn-cgi/` 腳本並壓縮 bundle，屬正常現象。
- 課程輔助資料來源 `umeh.top` 無回傳 CORS 標頭，Web 端直連會被瀏覽器攔截。
- `src/Nav.web.js` 的 `WEB_LINKING` 僅宣告頂層與特定深鏈接，未宣告的深層嵌套頁刷新會回到預設 Tab。
