# UM ALL - Frontend - Public

## 內容
- [環境安裝與運行模擬器](#環境安裝與運行模擬器)
  * [Android環境安裝](#android環境-install)
  * [IOS環境安裝](#ios環境-install)
- [開發本倉庫項目準備-MacOS](#開發本倉庫項目準備)
  * [安裝及運行流程](#安裝及運行流程)
  * [故障排除](#故障排除)
- [使用Git的方法](#git方法)
- [使用的第三方庫](#該項目使用的第三方庫)

---

&nbsp;
## 環境安裝與運行模擬器

### Android環境 [Install](https://reactnative.dev/docs/environment-setup)
1. 確保自己是 `Android11` 的模擬器環境（其他安卓版本尚未測試）
2. 本地運行指令 `npm i` 安裝依賴的npm包
3. 敲入 `react-native run-android` 運行吧~

已知BUG:
1. 如果遇到`react-native-vector-icons/xxxx`圖標錯誤顯示(正方形框裡面是X)，需要參考文檔 `https://github.com/oblador/react-native-vector-icons#android` 進行修復。

---

&nbsp;
### IOS環境 [Install](https://reactnative.dev/docs/environment-setup)
> 基於React Native CLI下的安裝流程
1. 先安裝`node`包，方便之後使用指令`npm`和`npx`
```console
brew install node
brew install watchman
```
2. 確保安裝了 `Xcode` (版本10或以上)，建議在[官網](https://developer.apple.com/download/all/?q=Xcode)下載
3. 安裝`CocoaPods`去管理ios系統相關的包
```console
brew install cocoapods
```
5. 確保以上的都安裝後，就可以建立新的react-native項目
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
## 開發本倉庫項目準備
> 在Mac M1系統下複製開發項目的代碼和運行模擬器
### 安裝及運行流程
1. 去複製倉庫的代碼到本地
```console
git clone <repo:link>
```
2. 安裝android模擬器需要的依賴包
```console
cd android
npm i or npm install
```
3. 運行android模擬器
```console
npx react-native run-android
```
4. 安裝ios模擬器需要的依賴包
```console
cd ios
pod install
```
5. 運行ios模擬器
```console
npx react-native run-ios
```
### 故障排除
1. Android檔案權限報錯-`Error: spawn ./gradlew EACCES`
```console
cd android
chmod +x ./gradlew
xattr -l ./gradlew
```
3. IOS運行文件報錯-`error React Native CLI uses autolinking for native dependencies`
```console
npx react-native unlink react-native-vector-icons
```
---

&nbsp;
## Git方法
推薦使用[GitHub Desktop](https://desktop.github.com/)。

基礎教程：[廖雪峰的Git教程](https://www.liaoxuefeng.com/wiki/896043488029600)。

---

&nbsp;
## 該項目使用的第三方庫
### 正在使用
請查看 `./package.json` 文件

### 觀望 / 測試中
1. [圖片滑動展示](https://github.com/callstack/react-native-pager-view)
1. [仿Twitter開App動畫](https://github.com/fabio-alss-freitas/react-native-animated-splash-screen)
1. [日期選擇器1](https://github.com/mmazzarolo/react-native-modal-datetime-picker)
1. [日期選擇器2](https://github.com/wix/react-native-calendars)
1. [可折疊組件](https://github.com/oblador/react-native-collapsible)
1. [圖片查看器（日常點擊圖片實現放大）](https://github.com/ascoders/react-native-image-viewer)
1. [底部彈出選擇](https://github.com/osdnk/react-native-reanimated-bottom-sheet)
1. [頂部彈窗，可以用來做消息提示，僅限app內](https://github.com/calintamas/react-native-toast-message)
1. [頂部彈窗，有上滑隱藏手勢](https://github.com/testshallpass/react-native-dropdownalert)
1. [通知推送組件，應該用來給本機推送消息](https://github.com/wix/react-native-notifications)
1. [二維碼掃描組件](https://github.com/moaazsidat/react-native-qrcode-scanner)
1. 全局數據：mobx-react和mobx
