# ARK ALL 前端專案指引

## 產品與受眾定位

- **定位**：**ARK ALL** 是面向**澳門大學（UM）**社群的免費開源一站式校園生活應用，涵蓋 **iOS／iPadOS、Android 與 Web**（`https://umall.one/webAPP/`）。
- **核心受眾**：澳門大學本科生與研究生（次要受眾：教職員與校友），支援**港澳繁體中文**與**英文**雙語。
- **五大核心模組（行動端 Tab）**：
  1. **資訊**（`info`）：校園活動、學生組織、澳大新聞與校內搜尋。
  2. **論壇**（`arkHarbor`）：ARK Harbor 校園討論區（Discourse 驅動，含發帖、聊天、信箱與審核）。
  3. **選課**（`course`）：搵課（`what2Reg`）與課表模擬（`courseSim`），支援本科／研究生與寬屏左右分屏。
  4. **服務**（`features`）：校巴實時、停車場、餐飲時間、澳大部門、組隊排班（`TeamSchedule`）與 ARK Wiki。
  5. **我的**（`my`）：Harbor 個人主頁、信箱、成就徽章與應用設定。
- **Web 端定位**：免安裝輕量工具版，僅掛載「選課、服務、設置」三個分頁及部分深鏈接；論壇／Wiki／推送等純行動能力不打包進 Web。
- **產品氣質與文案語氣**：清爽實用的現代校園助手（藍白主調 + Tonal 淺色層級 + 細膩微縮按壓與觸覺回饋）；中文介面採用親切精簡的**港澳繁體用語**（如「搵課」「選課」「課表」「校巴」），避免簡體字或生硬機翻。

## 技術棧與常用指令

技術棧採 **Expo CNG + React Native + React Navigation V7 + pnpm**（套件與 App 版本一律以 `package.json`、`app.json` 為準，不在規則中硬寫版本號）。

```bash
pnpm install                                    # 安裝依賴
npx expo prebuild --clean                       # 首次或原生依賴／app.json 變更時生成原生工程
pnpm start                                      # 啟動 Metro（--reset-cache）
pnpm ios                                        # 選擇 iOS 裝置／模擬器運行（等同 pnpm iosTrue）
pnpm iosNew                                     # iPhone 17 Pro 模擬器
pnpm iosBig                                     # iPad Pro 13-inch 模擬器
pnpm iosRelease                                 # 本機 Release 真機建置
pnpm android                                    # Android 模擬器／裝置運行
pnpm androidRelease                             # Android Release 真機建置
npx expo start --web                            # 啟動 Web 本地開發（Metro 代理 /api/*）
pnpm lint                                       # ESLint 檢查
pnpm exec jest <測試檔路徑> --watchman=false     # 執行單元測試（避開 sandbox Watchman 權限問題）
```

# 編輯規則（最高優先級）

- 保留每個檔案現有的縮排、空格、換行與程式碼風格；以修改點周圍的格式為準。
- 只修改完成任務必要的最少行，使用最小範圍 patch。
- 禁止順手重排 import、重新縮排、重新換行、改引號或逗號、排序 object/JSON keys。
- 除非使用者明確要求，禁止執行 Prettier、ESLint --fix 或任何會寫入檔案的 formatter。
- 禁止整個檔案重寫。修改 JSON、YAML、i18n 時只能局部文字修改，不得 parse 後重新 serialize。
- 不得修改與任務無關的既有內容，也不得復原使用者原本的修改。
- 如果無法在不改變既有格式的情況下完成，先停止並向使用者說明。

## JavaScript 格式化

- JavaScript 使用 Cursor 內建的 `vscode.typescript-language-features` formatter。
- 縮排使用 4 個空格。
- 禁止使用 Prettier 格式化 `.js`。
- 保留既有換行；避免整檔重新排版。

# 開發硬性護欄

- **繁體中文**：所有程式碼註釋與 APP 中文介面文字一律使用繁體中文（技術術語、品牌名、API 原文除外）。
- **i18n 翻譯檔**：新 key 優先用繁體中文；若繁中文案即 key 本身，**只寫 `src/i18n/en-us.json`**，勿為 identity map 徒增 `src/i18n/zh-hk.js`（詳見 `.cursor/rules/i18n-patterns.mdc`）。
- **文字與輸入框**：禁止從 `react-native` 直接 import `Text`／`TextInput`（ESLint 報錯），統一使用 `src/components/AppText` 與 `src/components/AppTextInput`。
- **主題顏色**：所有顏色取自 `useTheme()`（`src/components/ThemeContext.js`），禁止硬編碼 hex／rgba；善用 `theme.tonal` 與 `theme.viewShadow`。
- **按壓與觸覺回饋**：一般按鈕、列表列、側欄操作統一使用 `src/components/ScalePressable` 並呼叫 `trigger()`（`src/utils/trigger.js`）；禁止新引入 `TouchableOpacity` 系列、禁止按下鋪淺藍底、禁止直接 import `expo-haptics`。
- **液態玻璃**：統一由 `src/utils/glassEffect.js` 匯入 `GlassView`／`isLiquidGlassSupported`（底層 `expo-glass-effect`），禁止手寫 iOS 版本判斷或引用已移除的 `@callstack/liquid-glass`。
- **長列表與鍵盤**：新長列表一律用 `FlashList`（`@shopify/flash-list`）；含輸入框的滾動頁用 `KeyboardAwareScrollView`，勿用 `KeyboardAvoidingView`。
- **資料儲存**：禁止頁面直接用 `AsyncStorage`，一律經由 `src/utils/storageKits.js`；課程目錄走 `src/utils/checkCoursesKits.js`，嚴禁刪除 `src/static/UMCourses/` 離線後備 JSON。
- **響應式佈局**：寬屏／iPad／Web 統一用 `useWindowSizeClass()` 切殼子，一般頁面不分叉 `.web.js`（僅平台 API 缺失時例外，詳見 `.cursor/rules/responsive-layout.mdc`）。
- **Expo CNG 套件安全**：未經使用者明確同意，**嚴禁**修改 `node_modules/**` 或新增／執行任何 patch（優先改用 `app.json`、Expo Config Plugin 或 JS wrapper）。

# 其他規則與按需資源

請依任務類型**按需讀取**對應檔案（避免一次全量載入）：

## 領域規範（`.cursor/rules/`）

| 任務情境 | 讀取檔案 |
| --- | --- |
| UI 樣式、主題／Tonal 配色、文字縮放、按壓、液態玻璃、觸覺回饋、減少動態效果 | `.cursor/rules/design-system.mdc` |
| iPad／Web／寬屏響應式佈局、分欄與 `.web.js` 邊界 | `.cursor/rules/responsive-layout.mdc` |
| 目錄結構、React Navigation V7、行動／Web 路由與 Context 架構 | `.cursor/rules/architecture-navigation.mdc` |
| 本地儲存、v2 課程目錄、API 端點／錯誤處理、Firebase Analytics、工具庫 | `.cursor/rules/data-storage-api.mdc` |
| 新增或修改多語言文案、命名空間與翻譯檔維護 | `.cursor/rules/i18n-patterns.mdc` |
| 長列表 `FlashList`、鍵盤處理、`@expo/ui MenuView` 踩坑與 Expo CNG 擴充 | `.cursor/rules/ui-pitfalls-and-forms.mdc` |

## 任務工作流（`.agents/skills/`）

| 任務情境 | 讀取檔案 |
| --- | --- |
| 生成 Git commit message（Gitmoji + 繁體中文）或合併 PR 保留原作者 | `.agents/skills/git-commit/SKILL.md` |
| 建置、本地驗證與部署 Web 版至 `umall.one/webAPP/` | `.agents/skills/web-deploy/SKILL.md` |
| 更新澳大校曆、v2 課程目錄、Harbor Emoji 或 App Icon | `.agents/skills/update-um-data/SKILL.md` |
| Jest Watchman 報錯、RN Debugger MCP、iOS Maven mirror 排錯、截圖狀態列 | `.agents/skills/rn-debugging/SKILL.md` |

- 其他專案說明與補充文檔可寫在 `./README/` 下。
