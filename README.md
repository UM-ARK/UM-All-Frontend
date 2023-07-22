# UM ALL - Frontend - Public

## 最新版本號 `1.5.0`

- [環境安裝運行模擬器](#環境安裝運行模擬器)
  - [Android 環境 Install](#android-環境-install)
  - [iOS 環境 Install](#ios-環境-install)
- [開發本倉庫項目準備](#開發本倉庫項目準備)
  - [安裝及運行流程](#安裝及運行流程)
  - [故障排除](#故障排除)
- [Git 方法](#git-方法)
- [維護須知](#維護須知)

---

## 環境安裝、運行模擬器

### Android 環境 [Install](https://reactnative.dev/docs/environment-setup)

1. 確保自己是 `Android11` 的模擬器環境（其他安卓版本尚未測試）
2. 本地運行指令 `npm i --legacy-peer-deps` 安裝依賴的 npm 包
3. 敲入 `react-native run-android` or `npm run android` or `yarn android` 運行吧~

在此查看[已知 BUG](https://github.com/UM-ARK/UM-All-Frontend/blob/master/debugging_doc.md#android%E9%96%8B%E7%99%BC%E7%92%B0%E5%A2%83)

---


### iOS 環境 [Install](https://reactnative.dev/docs/environment-setup)

> 基於 React Native CLI 下的安裝流程

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

當需要 log 出對象或者數組時，有 Chrome 的 Web Debugger 肯定更好用。
舊版的項目可以在 Metro 的命令窗口中按下 `d` 再在模擬器中選擇 `Debug` 即可直接跳轉瀏覽器查看 log。
新版項目因為使用了組件 react-native-reanimated 導致不支持遠程調試，現在需要使用[Flipper](https://fbflipper.com/).
下載 Flipper 後，Mac 和 Windows 可能還要安裝一兩個工具，比如 Windows 要安裝 OpenSSL，參考：https://www.cnblogs.com/dingshaohua/p/12271280.html

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
（已開啟App的情況下）
npx react-native start --reset-cache
```

4. 安裝 ios 模擬器需要的依賴包

```console
cd ios
pod install
```

5. 在 ios 模擬器上編譯/運行App

```console
npx react-native run-ios
```

### 故障排除

在此查看[Android 解決方案](https://github.com/UM-ARK/UM-All-Frontend/blob/master/debugging_doc.md#android)
與[iOS 解決方案](https://github.com/UM-ARK/UM-All-Frontend/blob/master/debugging_doc.md#ios)

---

&nbsp;

## Git 方法

推薦使用[GitHub Desktop](https://desktop.github.com/)。

基礎教程：[廖雪峰的 Git 教程](https://www.liaoxuefeng.com/wiki/896043488029600)。

---

&nbsp;

## 維護須知

1. 澳大日曆更新。從 `https://reg.um.edu.mo/university-almanac/?lang=zh-hant` 獲取 ics 文件；使用任何工具將 ics 轉為 json，例如 `https://ical-to-json.herokuapp.com/`。**務必注意最終 json 中的 key 必須為小寫**。覆蓋 `src/static/UMCalendar/UMCalendar.json` 中的內容即可。
1. 輪播圖變更。登錄服務器後台，修改 `static/index` 下的文件，並且修改數據庫`app_info`表中輪播圖文本數組的文件名即可。
1. Android端需保存好`.keystore`或`.jks`文件。編譯出包時，將該文件放置在`android/app`目錄下，以作App密鑰。
