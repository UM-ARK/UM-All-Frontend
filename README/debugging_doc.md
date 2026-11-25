# Debugging Documentation for UM-All-Frontend

本文件記錄 **Expo CNG + pnpm** 工作流下常見的建置、執行期與測試排錯方式。

> **Expo CNG 原則**：`ios/` 與 `android/` 由 `app.json` 及 `plugins/` 自動生成。遇到編譯問題請優先透過 `npx expo prebuild --clean`、清理快取或 Config Plugin 處理，**勿手動修改 `node_modules` 或直接編輯生成後的原生工程**。

## 目錄

- [通用／Metro／測試](#通用metro測試)
- [iOS](#ios)
- [Android](#android)

---

## 通用／Metro／測試

### 1. 修改 `.env` 或 `metro.config.js` 後未生效

Expo 內嵌 `EXPO_PUBLIC_*` 環境變數與 Metro 解析規則都會被快取，修改後請清除快取重啟：

```console
pnpm start
```

（對應 `npx expo start --reset-cache`）

### 2. Jest 遭遇 Watchman 權限錯誤

在 sandbox、部分本機環境或 Watchman socket 權限異常時，執行測試可能出現：

```text
fchmod(.../watchman/...-state, 2700): Operation not permitted
watchman --no-pretty get-sockname returned with exit code=1
```

改用 `--watchman=false` 即可：

```console
pnpm exec jest <測試檔案路徑> --watchman=false
```

### 3. 修改原生依賴或 `app.json` 後找不到原生模組

JS 熱重載不會更新原生層。新增／升級原生套件、或修改 `app.json`／`plugins/` 後，需重新生成原生工程並重編譯：

```console
npx expo prebuild --clean
pnpm ios      # 或 pnpm android
```

---

## iOS

### iOS 預編譯依賴下載失敗（HTTP 403）

若 `prebuild` 後編譯出現找不到 `ReactNativeFeatureFlagsDefaults.h`、`react_native_assert.h` 或 `folly/dynamic.h`，可能是當前網路對 Maven Central 探測 React Native 預編譯依賴時返回 HTTP 403，令 CocoaPods 退回從源碼編譯。

改用 Maven mirror 重新生成 iOS 原生工程（無需改動 `node_modules` 或 `useFrameworks`）：

```console
env ENTERPRISE_REPOSITORY=https://maven.aliyun.com/repository/central npx expo prebuild --clean --platform ios
```

確認 `ios/Podfile.lock` 包含 `React-Core-prebuilt` 與 `ReactNativeDependencies`：

```console
grep -nE "React-Core-prebuilt \(|ReactNativeDependencies \(" ios/Podfile.lock
```

之後在同一 mirror 環境變數下啟動：

```console
env ENTERPRISE_REPOSITORY=https://maven.aliyun.com/repository/central pnpm iosNew
```

### Xcode 真機簽名失敗

執行 `pnpm iosRelease` 或在 Xcode 歸檔時若提示 `Signing for ... requires a development team`：

1. 確認透過 `.xcworkspace`（而非 `.xcodeproj`）開啟 `./ios/` 內工程。
2. 於 **Signing & Capabilities** 選擇有效的 Apple Developer Team，並確認目標裝置已加入開發團隊且在裝置上信任該開發者憑證。

### CocoaPods 或原生建置狀態異常

無需手動到 `ios/` 執行繁複清理，直接透過 CNG 重建即可：

```console
npx expo prebuild --clean --platform ios
```

若仍殘留 Xcode 舊編譯快取，可在 Xcode 執行 `Product → Clean Build Folder`（`⇧⌘K`）或清理 `~/Library/Developer/Xcode/DerivedData/`。

---

## Android

### 1. `./gradlew` 執行權限報錯（`EACCES`）

```console
cd android
chmod +x ./gradlew
xattr -l ./gradlew
```

### 2. Release 建置未套用正式簽名

- 確認 `~/.gradle/gradle.properties` 已設定 `MYAPP_RELEASE_STORE_FILE`、`MYAPP_RELEASE_STORE_PASSWORD`、`MYAPP_RELEASE_KEY_ALIAS`、`MYAPP_RELEASE_KEY_PASSWORD`。
- `MYAPP_RELEASE_STORE_FILE` 解析自**專案根目錄**（詳見 `plugins/withAndroidSigning.js`）。
- 確認已跑過 `npx expo prebuild --clean --platform android` 讓 config plugin 注入 `signingConfigs.release`。

### 3. Gradle / JDK 版本相容問題

確保本機 Android 建置環境使用 **JDK 18 或以上**；若原生依賴快取異常，先重新生成工程：

```console
npx expo prebuild --clean --platform android
```
