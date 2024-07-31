# Debugging Documentation for UM-All-Frontend
此文檔記錄了開發中遇到的問題與解決方案。

## 內容
- [環境安裝與運行模擬器時的問題](#環境安裝與運行模擬器時的問題)
  - [Android開發環境](#android開發環境)
<!--   - [iOS開發環境](#ios開發環境) -->
- [Debugging Documentation for UM-All-Frontend](#debugging-documentation-for-um-all-frontend)
  - [內容](#內容)
  - [環境安裝與運行模擬器時的問題](#環境安裝與運行模擬器時的問題)
    - [Android開發環境](#android開發環境)
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
5. Build時遇到`yoga.cpp`編譯問題:
```console
The following build commands failed:
    CompileC ......
    Yoga.cpp normal arm64 c++ com.apple.compilers.llvm.clang.1_0.compiler (in target 'Yoga' from project 'Pods')
(1 failure)
```
&emsp; 使用Xcode Build，雙擊該錯誤提示定位到錯誤發生位置，點按`Fix`快速修復錯誤。即可正常編譯。

6. Build時遇到`hash`編譯問題：
&emsp; 與上一點修復方式相同。

7. 再莫名遇到`CompileC`錯誤：
刪除`./package-lock.json`，刪除`./ios`下的`Pods`和`build`文件夾。
刪除`~/Library/Developer/Xcode/DerivedData/`目錄下的所有文件。
回到`./`使用`npm i --legacy-peer-deps`重新安裝依賴包。
到`./ios`使用`pod install --repo-update;`安裝Pod相關包，**該步驟可能會使電腦重裝iOS模擬器**。
使用Xcode嘗試Build，Fix`yoga.cpp`和`hash`問題後，應該可以正常Build。

8. Build、Archive等步驟出現問題。提示`Multiple commands produce`。

<img width="844" alt="Snipaste_2023-12-20_00-50-41" src="https://github.com/UM-ARK/UM-All-Frontend/assets/55580370/7a8b6b21-6e0b-44a9-9586-12c4e7c397a1">

在Xcode中 點選目錄中的`Pods`，選擇`Signing & Capabilities`選擇正確的`Team`。

<img width="960" alt="Snipaste_2023-12-20_00-51-06" src="https://github.com/UM-ARK/UM-All-Frontend/assets/55580370/665b0ea6-b5be-488f-87b3-2d5b2b43baf2">

在`TARGETS`中使用底部的篩選輸入框，輸入`Core`定位重複的文件，右鍵`Delete` `React-Core.common-Access`。

<img width="320" alt="Snipaste_2023-12-20_00-51-31" src="https://github.com/UM-ARK/UM-All-Frontend/assets/55580370/0e29a0bf-8469-419d-bf2b-377b8936b106">

然後重新Run和Build試試。

---
