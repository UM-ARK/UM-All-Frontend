---
name: update-um-data
description: 更新打包於 APP 內的澳門大學校曆、課程目錄（v2 Catalog）、Harbor Emoji Shortcodes 與 App Icon 的維護步驟。
---

# 校園靜態資料與資源維護流程

## 一、更新澳大校曆（`src/static/UMCalendar/UMCalendar.js`）

1. 前往澳大校曆官方頁面下載最新 `.ics` 檔：`https://reg.um.edu.mo/university-almanac/?lang=zh-hant`。
2. 將 `.ics` 轉為事件陣列（可參考 `course-data-parse` 倉庫工具或 ICS 轉 JSON 工具）。
3. 依 `src/static/UMCalendar/UMCalendar.js` 現有格式更新 `export const UMCalendar = [...]`：
   - 鍵名維持小寫駝峰：`startDate`、`endDate`、`summary`、`summary_cn`。
   - 為每筆校曆事件補齊繁體中文 `summary_cn` 翻譯。
4. 同步確認 `src/static/UMCalendar/CalendarConst.js` 中的學年／學期常數是否需要更新。

## 二、更新打包課程目錄（`src/static/UMCourses/`）

先閱讀 `src/static/UMCourses/README.md` 以確認目前 v2 catalog 結構與快取規則：

- 隨 APP 打包的離線後備檔案：
  - `preenrollCatalog.json`（本科 Pre-enrollment v2 catalog）
  - `adddropCatalog.json`（本科 Add/Drop v2 catalog，含完整 Section／Day／Time）
  - `adddropCatalogPG.json`（研究生 Add/Drop v2 catalog）
  - `courseCatalogs.js`（統一匯出上述檔案，勿刪除）
- 更新上述 JSON 後，檢查對應 `academicYear`、`sem` 與 metadata 版本欄位是否遞增，使 `isBundledCatalogNewer()`（`src/utils/checkCoursesKits.js`）能於發版後正確覆寫舊本地快取。
- 執行課程相關單元測試確認資料結構通過驗證（`pnpm exec jest --watchman=false`）。

## 三、更新 Harbor Discourse Emoji 映射

當 Harbor 論壇新增或調整 Discourse Emoji shortcode 時，執行維護腳本重新生成 `src/utils/harbor/harborDiscourseEmojiShortcodes.json`：

```bash
node scripts/updateHarborEmojiShortcodes.js
```

腳本會自動抓取指定 revision 的 Discourse Emoji 定義並做完整性斷言。

## 四、更新 App Icon 與開屏圖（Expo CNG）

本專案使用 Expo CNG，**不要手動編輯 `ios/` 或 `android/` 內的圖示目錄**：

1. 替換 `app.json` 指向的資源檔：
   - 主圖示：`./src/static/img/logo.png`
   - Android Adaptive Icon 前景：`./src/static/img/ic_launcher_foreground.png`（背景色設定於 `app.json` → `expo.android.adaptiveIcon.backgroundColor`）
   - 開屏圖：`./src/static/img/logo_round.png`
2. 重新生成原生工程以套用變更：
   ```bash
   npx expo prebuild --clean
   ```
