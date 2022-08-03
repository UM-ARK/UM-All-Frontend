# Debugging Documentation for UM-All-Frontend
此文檔記錄了開發中遇到的問題與解決方案。

## 內容
- [環境安裝與運行模擬器時的問題](#環境安裝與運行模擬器時的問題)
  - [Android開發環境](#android開發環境)
<!--   - [iOS開發環境](#ios開發環境) -->
- [開發本倉庫項目時的問題](#開發本倉庫項目時的問題)
  - [通用方案](#通用方案)
  - [Android](#android)
  - [iOS](#ios)

---
&nbsp;

## 環境安裝與運行模擬器時的問題
### Android開發環境
1. 如果遇到`react-native-vector-icons/xxxx`圖標錯誤顯示(正方形框裡面是X)
> 需要參考文檔 `https://github.com/oblador/react-native-vector-icons#android` 進行修復。
2. 如果在使用Flipper後，再次運行項目而不運行Flipper，Metro命令行提示無連接設備。則需要重啟模擬器，並在另一個RN項目run一次（正常來講另外的項目會成功運行），再回本項目不使用Flipper地run。
3. 如果在安裝npm包或刪除本地文件時出現卡頓或提示正在使用中
> 需要在任務管理器停止所有 `Java SE xxxx` 字樣的進程，即可恢復npm的運作。

<!-- ### iOS開發環境 -->

---
&nbsp;

## 開發本倉庫項目時的問題
### 通用方案
2022.06.26更新：
因為某些包的npm和yarn兼容性問題，安裝依賴的指令有所改變：

1. 如果你是新clone請使用 `npm i --legacy-peer-deps` 安裝依賴。
2. 如果你是已有倉庫，建議把 `node_modules` 刪除後再使用 `npm i --legacy-peer-deps` 安裝依賴。
3. 此指令適用於大多數npm報ERROR的情況。
4. 如需update包，可以使用 `npm info 包名` 先查看需要版本，再在package.json裡修改版本號，`npm i --legacy-peer-deps`。

2022.06.28更新：
加入linear-gradient，在android配置了若干項，如IOS編譯出錯則應該前往github頁查看文檔再進行安裝。
1. 可能的隱患：更改了此文件`android\app\src\main\java\com\umall\MainApplication.java`路徑上存在現版本的項目名`umall`，如果項目更名後發現報錯，需來這裡修改代碼。

### Android
1. Android檔案權限報錯-`Error: spawn ./gradlew EACCES`
```console
cd android
chmod +x ./gradlew
xattr -l ./gradlew
```

### iOS
1. iOS实机调试报错-`Signing for XXX requires a development team. Select a development team in the Signing and Cap Editor`
> 请尝试在Xcode中双击Pods，然后在Targets中选择React-Core-AccessibilityResources，找到Singing中的Development Team进行选择。仅在UMAllWhite中选择Development Team无效

2. iOS实机调试报错-`module map file not found`
> 请在Xcode选择项目时选择UMAllWhite.xcworkspace打开，不要选择UMAllWhite.xcodeproj

3. iOS運行文件報錯-`error React Native CLI uses autolinking for native dependencies`
```console
npx react-native unlink react-native-vector-icons
本条已经尝试修复，需要后续测试
```

4. Pod找不到目標工程-`Could not automatically select an Xcode project`
> 在`ios/Podfile`中加入以下路徑以解決報錯
```console
target 'ProjectName' do
 project './ProjectName.xcodeproj'
...
end
```

---
