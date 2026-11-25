---
name: rn-debugging
description: 排查 React Native / Expo CNG 開發、Jest Watchman 權限錯誤、iOS 預編譯依賴下載失敗、模擬器控制台日誌讀取與截圖狀態列覆寫。
---

# React Native 與 Expo CNG 除錯排雷手冊

## 一、Jest 遭遇 Watchman 權限錯誤

在 sandbox、Cursor Agent 或本機 Watchman socket 異常時，直接跑 `jest` 可能報：
`fchmod(.../watchman/...-state, 2700): Operation not permitted` 或 `watchman --no-pretty get-sockname returned with exit code=1`。

**解法**：加上 `--watchman=false`（改用 Node 端掃描，測試結果完全等價，無需為此改動 `package.json`）：

```bash
pnpm exec jest <測試檔案路徑> --watchman=false
# 或不產出覆蓋率以加速
pnpm exec jest <測試檔案路徑> --no-coverage --watchman=false
```

## 二、讀取模擬器控制台日誌（`react-native-debugger-mcp`）

若工作區已啟用 `react-native-debugger-mcp` 且 Metro（預設 port `8081`）與 App 正在運行：

1. 呼叫 `getConnectedApps({ metroServerPort: 8081 })` 取得連線中的 App（`id`、`description`、`webSocketDebuggerUrl`）。
2. 呼叫 `readConsoleLogsFromApp({ app, maxLogs: 50 })` 讀取 `log`／`warn`／`error` 輸出。
3. App 重啟後需重新執行步驟 1 取得新連線資訊。

## 三、iOS `prebuild` 預編譯依賴下載失敗（HTTP 403）

若 iOS 編譯出現找不到 `ReactNativeFeatureFlagsDefaults.h`、`react_native_assert.h` 或 `folly/dynamic.h`，通常是網路訪問 Maven Central 檢查預編譯依賴回傳 HTTP 403 導致 CocoaPods 退回源碼編譯。

**解法**（勿改 `node_modules` 或 Pod header search paths）：

```bash
env ENTERPRISE_REPOSITORY=https://maven.aliyun.com/repository/central npx expo prebuild --clean --platform ios
```

確認 `ios/Podfile.lock` 包含 `React-Core-prebuilt` 與 `ReactNativeDependencies`：

```bash
grep -nE "React-Core-prebuilt \(|ReactNativeDependencies \(" ios/Podfile.lock
```

之後以同一環境變數啟動：

```bash
env ENTERPRISE_REPOSITORY=https://maven.aliyun.com/repository/central pnpm iosNew
```

## 四、Metro、Dev Menu 與 Firebase 除錯

- **清快取重啟 Metro**：`pnpm start`（`npx expo start --reset-cache`）；修改 `.env` 或 `metro.config.js` 後必須重啟。
- **開啟 React DevTools**：於 Metro 終端按 `j`。
- **開啟 Dev Menu / Tools button**：
  - Metro 終端按 `m`；或 iOS 模擬器按 `⌘ + D`（選單 `Device → Shake`）；真機搖晃設備。
  - 進入 `Dev Menu → Tools button → 開啟` 顯示浮動工具鈕。
- **Firebase Analytics 即時事件**：依 [Firebase DebugView](https://firebase.google.com/docs/analytics/debugview) 啟用偵錯模式後於控制台查看 `logToFirebase` 上報。

## 五、iOS 模擬器截圖狀態列覆寫

製作發版或 README 截圖前覆寫乾淨狀態列：

```bash
xcrun simctl status_bar booted override \
  --time "9:41" \
  --cellularMode active \
  --cellularBars 4 \
  --wifiMode active \
  --wifiBars 3 \
  --batteryState charged \
  --batteryLevel 100
```

完成後復原：

```bash
xcrun simctl status_bar booted clear
```
