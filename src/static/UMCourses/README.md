# 文件說明
- `preenrollCatalog.json`：隨 APP 打包的 Pre-enrollment v2 catalog
- `adddropCatalog.json`：隨 APP 打包的 Add Drop v2 catalog，保留完整 Section／Day／Time
- `courseCatalogs.js`：統一匯出兩份 bundled catalog
- `legacyCourseVersion.json`：舊版 metadata 備份；新流程不讀取


# 流程設計
1. 冷啟動優先讀取 v2 cache；cache 不存在或不合法時使用上述 bundled catalogs。
2. 每六小時向 `/v2/catalog/preenroll` 與 `/v2/catalog/adddrop` 發 conditional request。
3. 伺服器返回 304 時保留現有 cache；返回合法 catalog 時先寫 catalog，最後寫 metadata／ETag。
4. v2 暫時不可用時，adapter 集中 fallback：Pre-enrollment 使用舊 `/adddrop`，Add Drop 使用舊 `/timetable`。
5. 課程級 Add Drop 清單由完整 `adddropCatalog.Courses` 按 `Course Code` 衍生，不再打包去重版 JSON。


