# 待辦與設計紀錄（Harbor / Wiki / iOS 26 Tab Bar）

> 本文件記錄產品與導覽設計討論結論，供後續實作對照。

---

## 一、背景問題

### 1.1 UI 衝突

- 升級至 iOS 26 風格後，底部為**浮動／液態玻璃 Tab Bar**。
- Harbor 內嵌 WebView 時另有**底部瀏覽列**（主頁／刷新／前後／分享／瀏覽器／設定），與系統 Tab Bar 形成**雙層底欄**，視覺與操作都擁擠。
- Wiki 位於「資訊」頂部 Tab，工具列曾被關閉，內嵌瀏覽體驗與 Tab 層級也不理想。

### 1.2 產品目標

- **Harbor**：主推新功能，希望用戶直觀感受、進論壇發帖與討論；主頁 Harbor Card 用現有帖子吸引新用戶。
- **Wiki**：與選課頁聯動查課；日常也希望同學能在 Wiki 留下內容。
- 兩者皆為外部站點（Discourse / MediaWiki），尚未深度整合進 APP。

---

## 二、技術現況（對照實作）

- **Harbor**：底部 Tab `Harbor`（`arkHarbor/index.js`），WebView 模式含完整底欄；主頁卡片點擊依偏好導向 `Harbor` Tab 或 `openLink`（`EventPage.js`）。
- **Wiki**：`info/index.js` 頂部 Material Tab 之 `WikiPage`（`arkwiki/index.js`），頂部工具列以 `false &&` 關閉。
- **主頁**：`EventPage.js` 透過 Discourse API（`ARK_HARBOR_LATEST`）取帖，與活動混成瀑布流（`insertToList`）。
- **全螢幕網頁**：`Webviewer` + `IntegratedWebView`（Stack，含 Header 與 iOS 底欄前後頁）。

---

## 三、導覽與實作方向（共識）

### 3.1 混合策略總覽

| 層級 | Harbor | Wiki |
|------|--------|------|
| 曝光層 | 主頁瀑布流混帖；可再加「熱門／正在討論」橫向區 | 選課頁聯動；主頁搜尋可整合 Wiki 條目（長期） |
| 入口層 | Tab 改為**原生 API 列表頁**（中期目標） | **多入口** `Webviewer` Stack，勿長佔頂部 Tab |
| 深度互動 | 詳情／回覆／發帖 → **系統瀏覽器** `openLink`（推薦） | 深度瀏覽 → `Webviewer`（可保留 JS 注入如深色同步） |
| 回流 | 關閉瀏覽器後回到原生列表 | 關閉 Webviewer 回到原頁 |

設計哲學：**APP 是外部站點的「最佳客戶端」**，而非把整站硬塞進 WebView 佔 Tab。

### 3.2 Harbor 產品設計要點

- **內容前置**：維持並可加強主頁混帖；可強化卡片辨識度（社群感、CTA、互動數）。
- **Tab 定位**：由「全站 WebView」改為「原生社群入口頁」概念：
  - 熱門／分類／最新列表以 **Discourse REST API** 渲染；
  - 點進主題再 `openLink`（或 SFSafariViewController）；
  - **FAB「發新帖」** 連到新建主題 URL（與現有「新想法」捷徑呼應）。
- **短期**：可統一以外開瀏覽器為主，移除或弱化 WebView 雙底欄問題。
- **長期**：Webhook 推送 + 深度連結至指定主題。

第一層：主頁內容前置（你已經做了，可以加強）
現有的瀑布流混帖 — 繼續保留，這是最自然的曝光
加強 Harbor 卡片設計 — 現在 Harbor 卡片和活動卡片視覺差異不大，可以讓 Harbor 卡片更有「社群感」：顯示頭像更突出、加上「來聊聊」的 CTA、顯示回覆數讓用戶知道有討論在進行
增加「熱門話題」專區 — 在瀑布流上方或校曆下方加一個橫向滾動的「正在討論」區域，類似 Twitter/X 的 trending，展示 2-3 個熱帖
第二層：Tab 位改為「智慧入口」而非 WebView
Harbor 不再是一個 WebView 頁面，而是一個原生的社群入口頁：

Harbor Tab 點擊後顯示：
┌─────────────────────────┐
│  🔥 熱門討論              │
│  ┌───┐ ┌───┐ ┌───┐      │  ← 橫向滾動熱帖卡片
│  └───┘ └───┘ └───┘      │
│                          │
│  📋 分類瀏覽              │
│  ┌─────────────────┐    │
│  │ 學習交流  💬 23   │    │  ← 各分類 + 最新帖數
│  │ 校園生活  💬 15   │    │
│  │ 二手交易  💬 8    │    │
│  │ 新生專區  💬 31   │    │
│  └─────────────────┘    │
│                          │
│  📝 最新帖子              │
│  ├─ 帖子1 (原生卡片)     │  ← 用 Discourse API 渲染
│  ├─ 帖子2               │     原生列表，非 WebView
│  └─ 帖子3               │
│                          │
│     ＋ 發新帖             │  ← FAB 按鈕
└─────────────────────────┘
核心改變：用 Discourse API 渲染原生列表頁，點進具體帖子時才用 openLink 開系統瀏覽器（或 SFSafariViewController）。

為什麼這樣做：

瀏覽列表時體驗是原生的，快速、流暢、無 Tab Bar 衝突
只有「深度互動」（看帖子詳情、回覆、發帖）才跳到瀏覽器，此時系統瀏覽器的自動填充密碼、Cookie 保持等優勢正好派上用場
Discourse 有完善的 REST API，拉取分類列表、最新/熱門帖子都很方便
用戶回到 APP 後還在原生列表頁，不會「迷路」
第三層：推送 + 深度連結
這是長期方向，短期不用急：

Discourse 支援 Webhook，有新回覆時推送通知到 APP
推送點擊後 → 直接 openLink 到對應帖子


### 3.3 Wiki 產品設計要點

- **工具屬性**：圍繞「查」而非「逛」。
- **選課頁**：課程卡片「Wiki」→ `Webviewer` 帶對應條目 URL，關閉即回選課頁。
- **主頁**：快捷入口 Wiki → `Webviewer` 開首頁；**從資訊頂部 Tab 移除 Wiki**，改為精準入口（避免長路徑全屏 WebView Tab）。
- **搜尋整合**（長期）：主頁搜尋結果並列課程與 Wiki 條目。

Wiki 和 Harbor 不同，它是工具屬性，用戶不會「逛 Wiki」，而是「查 Wiki」。所以設計應該圍繞**「查」**這個動作。

現在的問題
Wiki 藏在資訊 Tab 的第二個頂部 Tab，用戶要：資訊 Tab → 滑到 Wiki Tab → 看到 WebView。路徑太長，而且一旦進去就是全屏 WebView，沒有返回控制。

建議方案：Wiki 作為「隨叫隨到」的工具
1. 選課頁深度聯動（你已有，強化）
選課頁查課時，課程卡片上直接放「Wiki 查看」按鈕。點擊後：

navigate('Webviewer', { url: ARK_WIKI + '/課程名', title: '課程 Wiki' })
用 Stack 全螢幕 Webviewer 打開，Header 有關閉按鈕，底部有前進/後退
看完關閉，回到選課頁，流暢
2. 主頁搜索整合
你主頁已有搜索欄（SearchBar），可以讓搜索結果同時顯示 Wiki 條目：

搜索「CISC1000」→ 顯示：
  📚 課程結果: CISC1000 計算機導論
  📖 Wiki: CISC1000 選課攻略    ← 點擊用 Webviewer 打開
3. 從頂部 Tab 移除，改為多個精準入口
主頁快捷入口保留「Wiki」按鈕 → 點擊用 Webviewer Stack 打開 Wiki 主頁
選課頁課程卡片 → 直接連到對應 Wiki 頁面
資訊頁頂部 Tab 移除 Wiki，空出來的位置可以放更有價值的原生內容
這樣 Wiki 的入口反而更多了（主頁、選課頁、搜索），但每個入口都是精準場景，而不是一個尷尬的全屏 WebView Tab。




### 3.4 實施優先級（建議）

1. **短期（低成本高收益）**  
   - Wiki：改以 `Webviewer` Stack 多入口進入；評估自頂部 Tab 移出。  
   - Harbor：預設／統一 `openLink`，收斂 WebView 雙底欄；釋放或重新定義 Tab 行為。

2. **中期**  
   - Harbor Tab：改為原生 API 驅動列表頁 + FAB 發帖。

3. **長期**  
   - Harbor 推送與深度連結；Wiki 與主頁搜尋聯動。

---

## 四、實作時可對照的檔案

- `src/Tabbar.js` — 底部 Tab 定義  
- `src/pages/TabbarPages/arkHarbor/index.js` — Harbor WebView 與偏好  
- `src/pages/TabbarPages/arkwiki/index.js` — Wiki WebView  
- `src/pages/TabbarPages/info/index.js` — 資訊頂部 Tabs（含 Wiki）  
- `src/pages/TabbarPages/info/home/EventPage.js` — Harbor 卡片與 API  
- `src/pages/TabbarPages/info/home/index.js` — 主頁捷徑（含「新想法」→ 發帖）  
- `src/components/Webviewer.js`、`IntegratedWebView.js` — 全螢幕網頁模式  

---

*最後更新：依 2026-04-05 討論整理。*


總結：設計哲學的轉變
❌ 舊思路：把外部網站「嵌入」APP → 佔 Tab 位 → WebView 體驗差
✅ 新思路：APP 是外部站點的「最佳客戶端」
層級	Harbor	Wiki
曝光層
主頁瀑布流混帖 + 熱門話題區
選課頁聯動 + 搜索整合
入口層
Tab 改為原生列表頁（API 驅動）
多入口 Webviewer Stack
深度互動
openLink 到系統瀏覽器
Webviewer Stack（保留 JS 注入）
回流
系統瀏覽器關閉 → 回到原生列表
關閉 Webviewer → 回到原頁面
實施優先級建議
短期（低成本高收益）：把 Wiki 從頂部 Tab 移除，改為 Webviewer Stack 入口；Harbor 的 WebView 模式移除，統一用 openLink
中期：Harbor Tab 改為原生 API 驅動的列表頁 + FAB 發帖按鈕
長期：Harbor 推送通知 + 深度連結；Wiki 搜索整合
你覺得這個方向符合你的產品願景嗎？特別是 Harbor 從 WebView 改為原生 API 列表頁這一步，工作量會比較大，但對用戶體驗的提升也是最顯著的。
