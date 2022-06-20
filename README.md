# UM ALL - Frontend - Public

## 內容
- [環境安裝與運行模擬器](#環境安裝與運行模擬器)
  * [Android環境安裝](#android環境-install)
  * [IOS環境安裝](ios環境-install)
- [開發本倉庫項目準備-MacOS](#開發本倉庫項目準備)
  * [安裝及運行流程](#安裝及運行流程)
  * [故障排除](#故障排除)
- [使用Git的方法](#git方法)
  * [基本的push](#基本的push)
  * [分支的複製與合併](#分支的複製與合併)

---

## 環境安裝與運行模擬器

### Android環境 [Install](https://reactnative.dev/docs/environment-setup)
1. 確保自己是 `Android11` 的模擬器環境（其他安卓版本尚未測試）
2. 本地運行指令 `npm i` 安裝依賴的npm包
3. 敲入 `react-native run-android` 運行吧~

已知BUG:
1. 如果遇到`react-native-vector-icons/xxxx`圖標錯誤顯示(正方形框裡面是X)，需要參考文檔 `https://github.com/oblador/react-native-vector-icons#android` 進行修復。

---

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

## Git方法
### 基本的push
1. 指定自己的賬號和郵箱（GitHub username）

git config --global user.name "your GitHub username"
git config --global user.email "xxxxx@xx.com"

2. 添加修改到暫存區 `git add -A`

3. 說說修改了什麼


git commit -m ":art: 修改了主頁的文本顯示"
```
<!-- 可以先在bash中指定遠端倉庫origin分支的地址 -->
<!-- 下方會選擇push到origin分支，也就是遠端的master分支 -->
git remote add origin  https://github.com/xxxxxx/xxxxx
```
4. push上遠程倉庫

git push `剛定義的遠端倉庫名` `選擇push本地哪一個分支`



### 分支的複製與合併
1. 複製使用 `git checkout -b newBranchName`
2. 使用 `git checkout branchName` 可以切換到branchName分支
3. 如果要把分支B的新修改合併到原分支A，先切換到分支A。需要先在分支B add和commit，然後切換回分支A，使用 `git merge B`進行合併分支
4. 如需delete分支B，使用 `git branch -d B`即可。 
5. 使用 `git reset --hard HEAD^` 回滾代碼到上一個版本
6. 使用 `git log` 命令，查看分支提交历史，确认需要回退的版本
7. 使用 `git reset --hard commit_id`命令，可以回退到commit_id的版本

---
