## **🎉ARK ALL 是一個免費的開源 APP🎉**
[![GitHub release (latest by date)](https://img.shields.io/github/v/release/UM-ARK/UM-All-Frontend?style=for-the-badge&label=Github%20Release)](https://github.com/UM-ARK/UM-All-Frontend/releases/latest)

<div align="center">
<a href="https://apps.apple.com/app/id1636670554" style="display:inline-block;">
  <img src="https://tools.applemediaservices.com/api/badges/download-on-the-app-store/black/en-us" width="250" height="83" alt="Download on the App Store"/>
</a>
<a href="https://play.google.com/store/apps/details?id=one.umall" style="display:inline-block;">
  <img src="https://raw.githubusercontent.com/pioug/google-play-badges/refs/heads/main/svg/English.svg" width="250" height="83" alt="Get it on Google Play"/>
</a>
</div>

-   感興趣的話可以來 Wiki 看看更多[關於 ARK 的故事](https://wiki.umall.one/wiki/ARK_ALL)~
-   如果 ARK ALL 有幫助到您，可以請我們[喝杯咖啡](https://github.com/UM-ARK/Donate)！
-   如果您也想參與到 ARK ALL 的開發中，立即聯繫我們 `umacark@gmail.com`！

<details>
  <summary>APP熒幕截圖</summary>
  <img src="/README/img/Home.png" height="500rem" alt="Home" />
  <img src="/README/img/Club.png" height="500rem" alt="Club" />
  <img src="/README/img/Courses.png" height="500rem" alt="Courses" />
  <img src="/README/img/Timetable.png" height="500rem" alt="Timetable" />
  <img src="/README/img/Features.png" height="500rem" alt="Features" />
  <img src="/README/img/Bus.png" height="500rem" alt="Bus" />
</details>

- [**🎉ARK ALL 是一個免費的開源 APP🎉**](#ark-all-是一個免費的開源-app)
- [🎉 首次運行該項目](#-首次運行該項目)
  - [🤖 Android 環境 Setup](#-android-環境-setup)
  - [🍎 iOS 環境 Setup](#-ios-環境-setup)
- [🌈 開發本項目準備](#-開發本項目準備)
  - [⛵ 啟動流程](#-啟動流程)
    - [🤖 Android 運行](#-android-運行)
    - [🍎 iOS 運行](#-ios-運行)
    - [配置Firebase](#配置firebase)
  - [🐛 如何 Debug?](#-如何-debug)
    - [Google Firebase Analytics](#google-firebase-analytics)
- [📦 打包方式](#-打包方式)
  - [🍎 iOS 打包](#-ios-打包)
  - [🤖 Android 打包](#-android-打包)
  - [🐛 故障排除](#-故障排除)
- [⛵ 維護須知](#-維護須知)

---

## 🎉 首次運行該項目

在此查看[已知 BUG](./README/debugging_doc.md#android%E9%96%8B%E7%99%BC%E7%92%B0%E5%A2%83)，現在可以參考`./AGENTS.md`文件看項目說明了~~AI萬歲~~。

### 🤖 Android 環境 [Setup](https://reactnative.dev/docs/environment-setup)

1. 確保自己是 `Android API 33` 或 `API 31` 的模擬器環境，下載安裝 JDK、SDK
2. 在項目根目錄(`package.json`所在的目錄)打開命令行運行 `npm i --legacy-peer-deps` 安裝 npm 依賴
3. 前往 `Android Studio` 啟動所需的模擬器
4. 敲入 `react-native run-android` or `npm run android` or `yarn android` (如需使用 yarn 需要先`npm install yarn -g`) 運行本項目吧!

---

### 🍎 iOS 環境 [Setup](https://reactnative.dev/docs/environment-setup)

> 基於 React Native CLI 下的安裝流程，iOS APP 目前只能在 Mac 開發調試

1. 先安裝`node`包，方便之後使用指令`npm`和`npx`

```console
brew install node
brew install watchman
```

2. 確保安裝了 `Xcode` (版本 10 或以上)，建議在[官網](https://developer.apple.com/download/all/?q=Xcode)下載
3. 安裝`CocoaPods`去管理 ios 系統相關的包

```console
brew install cocoapods
```

4. 在項目根目錄(`package.json`所在的目錄)打開命令行運行 `npm i --legacy-peer-deps` 安裝 npm 依賴
   2024 年更新：在react-native@0.73+，使用`yarn install`安裝依賴。
5. Pod 自動鏈接好 iOS 的包

```console
cd ios
pod install --repo-update
```

如有衝突可先刪除`./ios/Podfile.lock`文件再運行上述命令。

6. 啟動 `Xcode` ，打開項目 `./ios/UMALL.xcworkspace`
7. `Command + R` 運行項目，先除錯，沒有問題再回 VSCode 的命令行使用 `yarn ios` 啟動
   react-native@0.73+更新：需要在`Xcode -> Product -> Scheme -> Edit Scheme`，設置為 Debug 模式，Metro 才能接收控制台命令進行調試和 log。

---

## 🌈 開發本項目準備

### ⛵ 啟動流程

1. 克隆倉庫的代碼到本地（推薦使用`GitHub Desktop`）

```console
git clone https://github.com/UM-ARK/UM-All-Frontend.git
```

2. 在項目根目錄下(`./package.json`所在的目錄)啟動 Terminal/命令行安裝依賴包

```console
忽略警告安裝 - 正常會使用這條指令，因為某些有問題的包尚未能解決衝突
npm i --legacy-peer-deps
```

3. 需要在項目根目錄放`umAPIToken.json`文件，內容格式為：
```
{
    "token":"YOURE_UM_API_TOKEN"
}
```

#### 🤖 Android 運行

1. 在 Android 上運行 App

```console
npx react-native run-android
or
yarn android
or
npm run android
```

如果不喜歡運行命令後彈出新的窗口，可以先在 VSCode 中打開一個命令行窗口，敲入 `yarn start`，再在另一個命令行窗口中 `yarn android`，就不會有額外彈窗了

#### 🍎 iOS 運行

1. 在 ios 上自動鏈接 Pod

```console
cd ios
pod install
```

完成此步驟後，`./ios`的代碼將更新

2. 打開`Xcode`，使用`Command + R`編譯運行 APP，先 Debug，再回 VSCode 開發調試

3. 命令行編譯/運行 App

```console
yarn ios          # 運行 iPhone 16 Pro 模擬器
yarn iosNew       # 運行 iPhone 17 Pro 模擬器
yarn iosTrue      # 運行到真實設備
yarn iosBig       # 運行 iPad Pro 13-inch 模擬器
```

#### 配置Firebase
從Firebase控制台導出配置文件放入`android/app/google-services.json`和`ios/GoogleService-Info.plist`。

---

### 🐛 如何 Debug?

-   當需要 log 出對象或者數組時，有 Chrome 的 Web Debugger 肯定更好用。
-   舊版的項目可以在 `Metro` 的命令窗口中按下 `d` 再在模擬器中選擇 `Debug` 即可直接跳轉瀏覽器查看 log。
<br>

**react-native@0.73+更新：**
- iOS 模擬器`Open Debugger`可能無法正確跳轉到瀏覽器，
    -   方法1：Chrome 可前往`chrome://inspect`，在`Remote Target`中找到`React Native Experimental (Improved Chrome Reloads)`下的 inspect 按鈕打開DevTools。
    -   方法2：使用`sh debug.sh`，其實是運行`npx react-devtools`，然後再在模擬器中`Open Debugger`，即會使用該插件打開Console查看log。

<br>

**react-native@0.77+更新：**
- 在`Metro`中直接使用`j`調出React DevTools。

#### Google Firebase Analytics

iOS和Android平台：打開 [偵錯事件](https://firebase.google.com/docs/analytics/debugview)
隨後可以在Firebase控制台`Debug View`中看到近乎實時(可能有1min延遲)的logEvent反饋，用於測試Analytics是否正常。

---

## 📦 打包方式

### 🍎 iOS 打包

1. Xcode中找到 `./ios/UMALL.xcworkspace`（Pods鏈接的項目使用workspace，其他使用proj），點擊使用Xcode打開。
2. Build。

-   點擊左側欄目找到`UMALL`項目，然後再中間的面板中輸入新的版本號（Version 和 Build 通常一樣）。
-   將設備設為"Any iOS Device"，並`command+B`來 Build，並進行實機測試。

3. 歸檔並發佈。

-   Build 成功後，點擊頂欄 Product->Archive 歸檔，隨後在彈出的頁面中一直點擊確認。
-   最後點擊 Distribute App 按鈕發佈。

4. 到[Appstore Connect 頁面](https://appstoreconnect.apple.com)查看並提交審核。
5. 注意：

-   一個 Build 號只能用一次。如果 build 失敗則更換 build 號，通常加一個小版本即可（如 2.2.0->2.2.1）。
-   檢查`Info.plist`的`App Uses Non-Exempt Encription`選項，必須設置為 No，否則會被 Apple 禁止上傳。

6. 發佈注意：

-   切換 Any iOS Device arm64 進行 Build
-   使用 Product - Archive 進行封包，如提示`React-Core.common`字樣的問題，在 Pods 中刪除非`React-Core.common-CoreModulesHeaders`的相似文件，再進行 Build 與 Archive

### 🤖 Android 打包

1. Android 端需保存好`.keystore`或`.jks`文件。編譯出包時，將該文件放置在`android/app`目錄下，以作 App 密鑰。
2. Android 打包，需要保證 jdk 版本為`18.0.2.1`
3. 在 `./android` 目錄下，使用 `gradlew assembleRelease` 打包 APK 文件，但似乎會出現密鑰不正確的問題無法繼承安裝。
4. 在 `./android` 目錄下，使用 `gradlew bundleRelease` 打包 Google Play Store 所需的 `.adb` 文件。

### 🐛 故障排除

在此查看[Android 解決方案](./README/debugging_doc.md#android)與[iOS 解決方案](./README/debugging_doc.md#ios)

---

&nbsp;

## ⛵ 維護須知

1. 澳大日曆更新。從 `https://reg.um.edu.mo/university-almanac/?lang=zh-hant` 獲取 ics 文件；使用任何工具將 ics 轉為 json（course-data-parse 倉庫內也有 icsToJSON 工具），例如 `https://ical-to-json.herokuapp.com/`。**務必注意最終 json 中的 key 必須為小寫**。覆蓋 `src/static/UMCalendar/UMCalendar.json` 中的內容即可。
    - 按照程序注釋增加校曆的繁體中文翻譯內容。
2. 澳大課程更新。使用預選課 Excel，使用 Excel to JSON 工具獲得 JSON 數據，放入`src/static/UMCourses/offer courses.json`。
    - 按照程序注釋增加開設課程的繁體中文翻譯內容。
3. icon 更新。使用 `https://www.appicon.co/` 生成 iOS icon 文件，使用 `Android Studio` 生成 Android icon 文件（Studio 生成的文件最全面，適配各個廠商的 UI）。
