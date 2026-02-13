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

<div align="center">

**APP熒幕截圖**

| | | |
|:---:|:---:|:---:|
| <img src="/README/img/Home.png" width="30%" alt="Home" /> | <img src="/README/img/Club.png" width="30%" alt="Club" /> | <img src="/README/img/Courses.png" width="30%" alt="Courses" /> |
| <img src="/README/img/Timetable.png" width="30%" alt="Timetable" /> | <img src="/README/img/Features.png" width="30%" alt="Features" /> | <img src="/README/img/Bus.png" width="30%" alt="Bus" /> |

</div>

- [**🎉ARK ALL 是一個免費的開源 APP🎉**](#ark-all-是一個免費的開源-app)
- [🎉 首次運行該項目](#-首次運行該項目)
  - [🤖 Android 環境 Setup](#-android-環境-setup)
  - [🍎 iOS 環境 Setup](#-ios-環境-setup)
  - [📘 Expo CNG 工作流說明](#-expo-cng-工作流說明)
- [🌈 開發本項目準備](#-開發本項目準備)
  - [⛵ 啟動流程](#-啟動流程)
    - [🤖 Android 運行](#-android-運行)
    - [🍎 iOS 運行](#-ios-運行)
    - [配置Firebase](#配置firebase)
  - [🐛 如何 Debug?](#-如何-debug)
    - [Google Firebase Analytics](#google-firebase-analytics)
- [📦 打包方式](#-打包方式)
  - [🍎 iOS 打包](#-ios-打包)
    - [方式一：使用 Expo 構建（推薦）](#方式一使用-expo-構建推薦)
    - [方式二：本地 Xcode 構建（傳統方式）](#方式二本地-xcode-構建傳統方式)
  - [🤖 Android 打包](#-android-打包)
    - [方式一：使用 Expo 構建（推薦）](#方式一使用-expo-構建推薦-1)
    - [方式二：本地 Gradle 構建](#方式二本地-gradle-構建)
  - [🐛 故障排除](#-故障排除)
- [⛵ 維護須知](#-維護須知)

---

## 🎉 首次運行該項目

在此查看[已知 BUG](./README/debugging_doc.md#android%E9%96%8B%E7%99%BC%E7%92%B0%E5%A2%83)，現在可以參考`./AGENTS.md`文件看項目說明了~~AI萬歲~~。

### 🤖 Android 環境 [Setup](https://reactnative.dev/docs/environment-setup)

1. 確保自己是 `Android API 33` 或 `API 31` 的模擬器環境，下載安裝 JDK、SDK
2. 在項目根目錄(`package.json`所在的目錄)打開命令行運行 `yarn install` 安裝依賴
3. 執行 `npx expo prebuild --clean` 生成 Android 原生項目
   - 僅生成 Android：`npx expo prebuild --clean --platform android`
   - 僅生成 iOS：`npx expo prebuild --clean --platform ios`
   - 如安裝了跨平台庫，直接使用 `npx expo prebuild --clean` 生成兩個平台
4. 前往 `Android Studio` 啟動所需的模擬器
5. 敲入 `yarn android` 運行本項目吧!

---

### 🍎 iOS 環境 [Setup](https://reactnative.dev/docs/environment-setup)

> 基於 Expo SDK 54 + React Native 0.81.5，iOS APP 目前只能在 Mac 開發調試

1. 先安裝`node`包（Node ≥18），方便之後使用指令

```console
brew install node
brew install watchman
```

2. 確保安裝了 `Xcode` (版本 15 或以上)，建議在[官網](https://developer.apple.com/download/all/?q=Xcode)下載
3. 在項目根目錄(`package.json`所在的目錄)打開命令行運行 `yarn install` 安裝依賴
4. 執行 `npx expo prebuild --clean` 生成 iOS 原生項目
   - 僅生成 iOS：`npx expo prebuild --clean --platform ios`
   - 僅生成 Android：`npx expo prebuild --clean --platform android`
   - 如安裝了跨平台庫，直接使用 `npx expo prebuild --clean` 生成兩個平台

5. 使用 Expo 運行 iOS（**不需要手動管理 CocoaPods**）

```console
yarn ios          # 運行 iPhone 16 Pro 模擬器
yarn iosNew       # 運行 iPhone 17 Pro 模擬器
yarn iosTrue      # 運行到真實設備
yarn iosBig       # 運行 iPad Pro 13-inch 模擬器
```

> **注意**：Expo CNG 會自動處理 iOS 原生代碼生成和 CocoaPods 依賴，無需手動運行 `pod install` 或 `prebuild`。首次運行 `yarn ios` 時會自動生成原生項目文件。

---

### 📘 Expo CNG 工作流說明

項目使用 **Expo CNG (Continuous Native Generation)** 自動管理原生項目：

| 操作         | 命令                             | 說明                                                           |
| ------------ | -------------------------------- | -------------------------------------------------------------- |
| 安裝依賴     | `yarn install` 或 `expo install` | 推薦使用 yarn                                                  |
| 生成原生項目 | `npx expo prebuild --clean`      | **首次運行前必須執行**，可加 `--platform ios/android` 指定平台 |
| ------       | ------                           | ------                                                         |
| 運行 iOS     | `yarn ios`                       | 運行 iOS 模擬器或真機                                          |
| 運行 Android | `yarn android`                   | 運行 Android 模擬器                                            |

**重要**：
- **首次運行前必須先執行 `npx expo prebuild --clean`** 生成原生項目文件
- 生成後會創建 `./ios` 和 `./android` 目錄
- **無需手動運行 `pod install`**：Expo CNG 會自動處理
- 如果遇到原生構建問題，可重新運行 `npx expo prebuild --clean` 重新生成

---

## 🌈 開發本項目準備

### ⛵ 啟動流程

1. 克隆倉庫的代碼到本地（推薦使用`GitHub Desktop`）

```console
git clone https://github.com/UM-ARK/UM-All-Frontend.git
```

2. 在項目根目錄下(`./package.json`所在的目錄)啟動 Terminal/命令行安裝依賴包

```console
yarn install
# 或使用 expo install（自動處理依賴兼容性）
expo install
```

3. 執行 `npx expo prebuild --clean` 生成 iOS/Android 原生項目
   - 僅生成 iOS：`npx expo prebuild --clean --platform ios`
   - 僅生成 Android：`npx expo prebuild --clean --platform android`
   - 如安裝了跨平台庫，直接使用 `npx expo prebuild --clean` 生成兩個平台

4. 需要在項目根目錄放`umAPIToken.json`文件，內容格式為：
```
{
    "token":"YOURE_UM_API_TOKEN"
}
```

#### 🤖 Android 運行

1. 在 Android 上運行 App

```console
yarn android
```

**說明：**
- Expo CNG 會在首次運行時自動生成 Android 原生項目文件
- 首次運行前需先執行 `npx expo prebuild --clean` 生成原生項目
- 運行 `yarn android` 前不需要手動執行 `prebuild`

#### 🍎 iOS 運行

> 項目使用 Expo SDK 54 與 CNG (Continuous Native Generation)，無需手動管理 CocoaPods

1. 確保已安裝依賴

```console
yarn install
```

2. 使用 Expo 運行 iOS

```console
yarn ios          # 運行 iPhone 16 Pro 模擬器
yarn iosNew       # 運行 iPhone 17 Pro 模擬器
yarn iosTrue      # 運行到真實設備
yarn iosBig       # 運行 iPad Pro 13-inch 模擬器
```

**說明：**
- Expo CNG 會自動處理 iOS 原生代碼生成和 CocoaPods 依賴
- **首次運行前需先執行 `npx expo prebuild --clean` 生成原生項目**
- **無需手動運行 `pod install`**
- **無需手動打開 Xcode** 進行編譯
- 如需在 Xcode 中調試，可打開 `./ios` 目錄下的項目文件（首次運行 `yarn ios` 後會生成）

#### 配置Firebase
從Firebase控制台導出配置文件放入`android/app/google-services.json`和`ios/GoogleService-Info.plist`。

---

### 🐛 如何 Debug?

-   當需要 log 出對象或者數組時，有 Chrome 的 Web Debugger 肯定更好用。
-   舊版的項目可以在 `Metro` 的命令窗口中按下 `d` 再在模擬器中選擇 `Debug` 即可直接跳轉瀏覽器查看 log。
<br>

**react-native@0.81+更新：**
- 在`Metro`中直接使用`j`調出React DevTools。
- iOS 模擬器支持最新的 Debugging 方案。

#### Google Firebase Analytics

iOS和Android平台：打開 [偵錯事件](https://firebase.google.com/docs/analytics/debugview)
隨後可以在Firebase控制台`Debug View`中看到近乎實時(可能有1min延遲)的logEvent反饋，用於測試Analytics是否正常。

---

## 📦 打包方式

### 🍎 iOS 打包

> 項目使用 Expo SDK 54 與 CNG，推薦使用 Expo 進行打包

#### 方式一：使用 Expo 構建（推薦）

1. 確保已安裝 EAS CLI

```console
yarn global add eas-cli
# 或
npm install -g eas-cli
```

2. 登錄 Expo 賬號

```console
eas login
```

3. 構建 iOS 應用

```console
eas build --platform ios
```

4. 按照提示選擇構建類型（內部分發或 App Store 提交）

#### 方式二：本地 Xcode 構建（傳統方式）

如需在 Xcode 中手動構建：

1. 確保已運行過 `npx expo prebuild --clean` 生成 iOS 項目文件
2. 打開 `./ios/UMALL.xcworkspace`
3. 在 Xcode 中配置簽名和版本號
4. 使用 `Product -> Archive` 進行歸檔和發佈

**注意事項：**
- 版本號在 `app.json` 中統一管理，構建時會自動同步到原生項目
- 使用 EAS 構建時，不需要手動管理簽名證書
- 提交 App Store 前確保已在 [App Store Connect](https://appstoreconnect.apple.com) 創建應用記錄

---

### 🤖 Android 打包

#### 方式一：使用 Expo 構建（推薦）

```console
eas build --platform android
```

選擇構建類型：
- **APK**：內部分發測試
- **AAB (Android App Bundle)**：Google Play Store 提交

#### 方式二：本地 Gradle 構建

1. 確保已運行過 `npx expo prebuild --clean` 生成 Android 項目文件
2. 確保密鑰文件配置正確
3. 在 `android/app` 目錄下放置簽名密鑰（`.keystore` 或 `.jks`）
4. 運行構建命令：

```console
cd android
./gradlew assembleRelease  # 構建 APK
# 或
./gradlew bundleRelease    # 構建 AAB (Google Play)
```

**注意事項：**
- 確保 JDK 版本為 18 或以上
- 版本號在 `app.json` 中統一管理
- 首次發布到 Play Store 需要使用 AAB 格式
- 內部測試可使用 APK 格式直接安裝

---

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
