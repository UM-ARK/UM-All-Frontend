# 文件說明
- UMCourses/offerCourses (PreEnroll課表)
- UMCourses/coursePlan (Add Drop課表，課表時間的去重版)
- UMCourses/coursePlanTime 課表時間(完全版)


# 流程設計
## 2025-12-17前
以隨APP打包的JSON作為課表版本基礎，開發者上傳新JSON到Github Master分支。
更新流程：
1. 用戶手動在選課頁(唯一入口)點擊更新，並檢查課表日期版本是否距離當前太遠，用戶需自行對比官方Excel文件與APP的是否過期。（問題：很多人根本不理解這個流程，也不會手動查看和點擊更新）
2. 如點擊更新，APP通過檢查Github RAW File的`offerCourse`和`coursePlan`文件中的`updateTime`判斷版本是否過期，如過期則將返回的JSON覆蓋入緩存。
3. APP比較緩存、原打包APP、返回的新JSON的`updateTime`判斷最新數據，從而替換。

## 2025-12-18後
隨APP打包的JSON作為版本基礎，開發者上傳新JSON到Cloudflare Workers，新增`version`、`pre`、`adddrop`、`timetable` API，對應最新版本、三個JSON文件。
1. 用戶每次打開APP首次進入選課頁、課表模擬頁都請求`version`API，判斷本地版本是否落後於雲端。如相同或更新，則保持本地緩存。
2. 如落後，按落後的項目更新對應的預選課和Add Drop課表數據，刷新本地緩存和頁面state。



