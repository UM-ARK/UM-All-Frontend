# UM ALL - Frontend - Public

## 最新版本號 `1.1.4`

## 內容

-   [環境安裝與運行模擬器](#環境安裝與運行模擬器)
    -   [Android 環境安裝](#android環境-install)
    -   [iOS 環境安裝](#ios環境-install)
    -   [使用 Debugger](#使用debugger)
-   [開發本倉庫項目準備-MacOS](#開發本倉庫項目準備)
    -   [安裝及運行流程](#安裝及運行流程)
    -   [故障排除](#故障排除)
-   [使用 Git 的方法](#git方法)
-   [使用的第三方庫](#該項目使用的第三方庫)

---

&nbsp;

## 環境安裝與運行模擬器

### Android 環境 [Install](https://reactnative.dev/docs/environment-setup)

1. 確保自己是 `Android11` 的模擬器環境（其他安卓版本尚未測試）
2. 本地運行指令 `npm i --legacy-peer-deps` 安裝依賴的 npm 包
3. 敲入 `react-native run-android` or `npm run android` or `yarn android` 運行吧~

在此查看[已知 BUG](https://github.com/UM-ARK/UM-All-Frontend/blob/master/debugging_doc.md#android%E9%96%8B%E7%99%BC%E7%92%B0%E5%A2%83)

---

&nbsp;

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

### 使用 Debugger

當需要 log 出對象或者數組時，有 Chrome 的 Web Debugger 肯定更好用。
舊版的項目可以在 Metro 的命令窗口中按下 `d` 再在模擬器中選擇 `Debug` 即可直接跳轉瀏覽器查看 log。
新版項目因為使用了組件 react-native-reanimated 導致不支持遠程調試，現在需要使用[Flipper](https://fbflipper.com/).
下載 Flipper 後，Mac 和 Windows 可能還要安裝一兩個工具，比如 Windows 要安裝 OpenSSL，參考：https://www.cnblogs.com/dingshaohua/p/12271280.html

---

&nbsp;

## 開發本倉庫項目準備

> 在 Mac M1 系統下複製開發項目的代碼和運行模擬器

### 安裝及運行流程

1. 去複製倉庫的代碼到本地

```console
git clone <repo:link>
```

2. 安裝 android 模擬器需要的依賴包

```console
cd android
npm i or npm install
```

3. 運行 android 模擬器

```console
npx react-native run-android
```

4. 安裝 ios 模擬器需要的依賴包

```console
cd ios
pod install
```

5. 運行 ios 模擬器

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

## 該項目使用的第三方庫

### 正在使用

請查看 `./package.json` 文件

### 觀望 / 測試中

1. [圖片滑動展示](https://github.com/callstack/react-native-pager-view)
1. [仿 Twitter 開 App 動畫](https://github.com/fabio-alss-freitas/react-native-animated-splash-screen)
1. [日期選擇器 1](https://github.com/mmazzarolo/react-native-modal-datetime-picker)
1. [日期選擇器 2](https://github.com/wix/react-native-calendars)
1. [可折疊組件](https://github.com/oblador/react-native-collapsible)
1. [頂部彈窗，可以用來做消息提示，僅限 app 內](https://github.com/calintamas/react-native-toast-message)
1. [頂部彈窗，有上滑隱藏手勢](https://github.com/testshallpass/react-native-dropdownalert)
1. [通知推送組件，應該用來給本機推送消息](https://github.com/wix/react-native-notifications)
1. [通知推送組件 2](https://github.com/zo0r/react-native-push-notification)
1. [二維碼掃描組件](https://github.com/moaazsidat/react-native-qrcode-scanner)
1. 全局數據：mobx-react 和 mobx
1. 數據緩存：lodash（memoize 可以使用緩存加載）
1. [本地文件訪問系統](https://github.com/itinance/react-native-fs)
1. [對本地照片庫訪問](https://github.com/react-native-cameraroll/react-native-cameraroll)
1. [有顏色的骨架屏](https://github.com/FullstackStation/react-native-svg-animated-linear-gradient)
1. [解析 HTML 或渲染](https://github.com/meliorence/react-native-render-html)
1. [lottie，做動畫](https://github.com/lottie-react-native/lottie-react-native)
1. [組件現成動畫效果](https://github.com/oblador/react-native-animatable)
1. [粘性頂部標題，有動畫](https://github.com/netguru/sticky-parallax-header)
1. [骨架屏](https://github.com/danilowoz/react-content-loader)
1. [進度條、旋轉等待](https://github.com/oblador/react-native-progress)
1. [鍵盤輸入自動向上頂](https://github.com/APSL/react-native-keyboard-aware-scroll-view)
1. [有分 section 的滾屏](https://bolan9999.github.io/react-native-largelist/#/zh-cn/V3/GettingStart)
1. [排版字體樣式](https://github.com/hectahertz/react-native-typography)
1. [分頁組件，感覺可用於新聞頁](https://github.com/garrettmac/react-native-pagination)
1. [初次應用介紹 1](https://github.com/jfilter/react-native-onboarding-swiper)
1. [初次應用介紹 2](https://github.com/xcarpentier/rn-tourguide)
1. [初次應用介紹 3](https://github.com/mohebifar/react-native-copilot)
1. [地圖組件 1](https://github.com/react-native-maps/react-native-maps)
1. [地圖組件 2](https://github.com/rnmapbox/maps)
1. [數據展示 可交互圖表組件 1，說不定可以用在關於頁](https://github.com/Abhinandan-Kushwaha/react-native-gifted-charts)
1. [數據展示 圖表組件 2](https://github.com/indiespirit/react-native-chart-kit)
1. [時間軸組件 1](https://github.com/eugnis/react-native-timeline-flatlist)
1. [時間軸組件 2](https://github.com/WrathChaos/react-native-beautiful-timeline)
1. [時間軸組件 3](https://github.com/24ark/react-native-step-indicator)
1. [時間軸組件 4](https://github.com/Syntax00/react-native-just-timeline)
1. [列表元素拖拽組件 1](https://github.com/computerjazz/react-native-draggable-flatlist)
1. [列表元素拖拽組件 2](https://github.com/gitim/react-native-sortable-list)
1. [佈局元素拖拽組件](https://github.com/mochixuan/react-native-drag-sort)
1. [多選、搜索組件 1](https://github.com/renrizzolo/react-native-sectioned-multi-select)
1. [多選、搜索組件 2](https://github.com/toystars/react-native-multiple-select)
1. [標籤輸入組件，可用於社團創建活動時選擇](https://github.com/jimmybengtsson/react-native-tags-input)
1. [浮动按钮 1](https://github.com/mastermoo/react-native-action-button)
1. [浮动按钮 2](https://github.com/santomegonzalo/react-native-floating-action)
1. [隨分類跳轉對應 tab](https://github.com/bogoslavskiy/react-native-tabs-section-list)
1. [聊天 UI](https://github.com/FaridSafi/react-native-gifted-chat)
1. [滑塊組件](https://github.com/leecade/react-native-swiper)
1. [啟動屏](https://github.com/crazycodeboy/react-native-splash-screen)
1. [首次使用的引導頁](https://github.com/FuYaoDe/react-native-app-intro)
1. [跟手的彈窗](https://github.com/oblador/react-native-lightbox)
1. [RN 與 webview 傳輸數據](https://github.com/alinz/react-native-webview-bridge)
1. [有 Apple 樣式的 Header](https://github.com/WrathChaos/react-native-header-view)
