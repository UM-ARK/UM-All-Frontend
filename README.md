## 最新版本號 `2.4.0`

- [最新版本號 `2.4.0`](#最新版本號-240)
- [React Native 初始化新項目](#react-native-初始化新項目)
  - [Android 環境 Install](#android-環境-install)
  - [iOS 環境 Install](#ios-環境-install)
    - [初始化React Native新項目](#初始化react-native新項目)
  - [使用 Debugger （Web Console工具）](#使用-debugger-web-console工具)
- [開發本倉庫項目準備](#開發本倉庫項目準備)
  - [安裝及運行流程](#安裝及運行流程)
- [打包方式](#打包方式)
  - [iOS打包](#ios打包)
  - [Android打包](#android打包)
  - [故障排除](#故障排除)
- [維護須知](#維護須知)

---

## React Native 初始化新項目

### Android 環境 [Install](https://reactnative.dev/docs/environment-setup)

1. 確保自己是 `Android API 33` 的模擬器環境
2. 本地運行指令 `npm i --legacy-peer-deps` 安裝依賴的 npm 包
3. 敲入 `react-native run-android` or `npm run android` or `yarn android` 運行吧~

在此查看[已知 BUG](https://github.com/UM-ARK/UM-All-Frontend/blob/master/debugging_doc.md#android%E9%96%8B%E7%99%BC%E7%92%B0%E5%A2%83)

---


### iOS 環境 [Install](https://reactnative.dev/docs/environment-setup)

> 基於 React Native CLI 下的安裝流程，iOS APP目前只能在Mac開發調試

#### 初始化React Native新項目

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

5. 確保以上的都安裝後，就可以建立新的 react-native 項目

```console
npx react-native init <project-name>
```

6. 項目建立後沒有錯誤就可以運行模擬器

```console
npx react-native run-ios
```

> `npx`指令會從線上找最新的包去執行，不要求有相關的包在本地。[詳細](https://www.reddit.com/r/reactnative/comments/hmqvcm/why_is_npx_react_native_preferred_over_installing/)

---

&nbsp;

### 使用 Debugger （Web Console工具）

* 當需要 log 出對象或者數組時，有 Chrome 的 Web Debugger 肯定更好用。
* 舊版的項目可以在 `Metro` 的命令窗口中按下 `d` 再在模擬器中選擇 `Debug` 即可直接跳轉瀏覽器查看 log。
* 新版項目因為使用了組件 react-native-reanimated 導致不支持遠程調試，現在需要使用[Flipper](https://fbflipper.com/).
* 下載 Flipper 後，Mac 和 Windows 可能還要安裝一兩個工具，比如 Windows 要安裝 OpenSSL，參考：https://www.cnblogs.com/dingshaohua/p/12271280.html

---


## 開發本倉庫項目準備

> 在 Mac M1 系統下複製開發項目的代碼和運行模擬器

### 安裝及運行流程

1. 克隆倉庫的代碼到本地（推薦使用`GitHub Desktop`）

```console
git clone <repo:link>
```

2. 在項目根目錄下啟動控制台安裝依賴包

```console
npm i
or
npm install
or
忽略警告安裝 - 正常會使用這條指令，因為某些有問題的包未有更新
npm i --legacy-peer-deps
```

3. 在 android 上編譯/運行App

```console
npx react-native run-android
or
yarn android
or
npm run android
or
（已開啟Debug版App的情況下）
npx react-native start --reset-cache
```

1. 在 ios 上編譯/運行App

```console
cd ios
pod install
```

5. 在 ios 模擬器上編譯/運行App

```console
npx react-native run-ios
or
yarn ios
or
yarn ios --simulator="iPhone 15"
```

---

## 打包方式
### iOS打包
1. 找到 ``./ios/UMALL.xcworkspace``，點擊打開Xcode。
2. Build。
- 點擊左側欄目找到``UMALL``項目，然後再中間的面板中輸入新的版本號（Version和Build通常一樣）。
- 將設備設為"Any iOS Device"，並``command+B``來Build，並進行實機測試。
3. 歸檔並發佈。
- Build成功後，點擊頂欄 Product->Archive歸檔，隨後在彈出的頁面中一直點擊確認。
- 最後點擊 Distribute App按鈕發佈。
4. 到[Appstore Connect頁面](https://appstoreconnect.apple.com)查看並提交審核。
5. 注意：
- 一個Build號只能用一次。如果build失敗則更換build號，通常加一個小版本即可（如2.2.0->2.2.1）。
- 檢查``Info.plist``的``App Uses Non-Exempt Encription``選項，必須設置為No，否則會被Apple禁止上傳。

### Android打包
1. Android端需保存好`.keystore`或`.jks`文件。編譯出包時，將該文件放置在`android/app`目錄下，以作App密鑰。
2. Android打包，需要保證jdk版本為`18.0.2.1` 
3. 在 `./android` 目錄下，使用 `gradlew assembleRelease` 打包APK文件，但似乎會出現密鑰不正確的問題無法繼承安裝。
4. 在 `./android` 目錄下，使用 `gradlew bundleRelease` 打包Google Play Store所需的 `.adb` 文件。

### 故障排除

在此查看[Android 解決方案](https://github.com/UM-ARK/UM-All-Frontend/blob/master/debugging_doc.md#android)與[iOS 解決方案](https://github.com/UM-ARK/UM-All-Frontend/blob/master/debugging_doc.md#ios)


---

&nbsp;

## 維護須知

1. 澳大日曆更新。從 `https://reg.um.edu.mo/university-almanac/?lang=zh-hant` 獲取 ics 文件；使用任何工具將 ics 轉為 json，例如 `https://ical-to-json.herokuapp.com/`。**務必注意最終 json 中的 key 必須為小寫**。覆蓋 `src/static/UMCalendar/UMCalendar.json` 中的內容即可。
   * 按照程序注釋增加校曆的繁體中文翻譯內容。
2. 澳大課程更新。使用預選課Excel，使用Excel to JSON工具獲得JSON數據，放入`src/static/UMCourses/offer courses.json`。
   * 按照程序注釋增加開設課程的繁體中文翻譯內容。

