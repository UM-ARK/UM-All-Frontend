# Debugging Documentation for UM-All-Frontend

此文檔記錄了開發中遇到的問題與解決方案。

## 內容

- [Debugging Documentation for UM-All-Frontend](#debugging-documentation-for-um-all-frontend)
  - [內容](#內容)
  - [環境安裝與運行模擬器時的問題](#環境安裝與運行模擬器時的問題)
    - [Android 開發環境](#android-開發環境)
  - [開發本倉庫項目時的問題](#開發本倉庫項目時的問題)
    - [通用方案](#通用方案)
    - [Android](#android)
    - [iOS](#ios)

---

&nbsp;

## 環境安裝與運行模擬器時的問題

### Android 開發環境

1. 如果遇到`react-native-vector-icons/xxxx`圖標錯誤顯示(正方形框裡面是 X)
    > 需要參考文檔 `https://github.com/oblador/react-native-vector-icons#android` 進行修復。
2. 如果在使用 Flipper 後，再次運行項目而不運行 Flipper，Metro 命令行提示無連接設備。則需要重啟模擬器，並在另一個 RN 項目 run 一次（正常來講另外的項目會成功運行），再回本項目不使用 Flipper 地 run。
3. 如果在安裝 npm 包或刪除本地文件時出現卡頓或提示正在使用中
    > 需要在任務管理器停止所有 `Java SE xxxx` 字樣的進程，即可恢復 npm 的運作。

<!-- ### iOS開發環境 -->

---

&nbsp;

## 開發本倉庫項目時的問題

### 通用方案

**2022.06.26 更新：**
因為某些包的 npm 和 yarn 兼容性問題，安裝依賴的指令有所改變：

1. 如果你是新 clone 請使用 `npm i --legacy-peer-deps` 安裝依賴。
2. 如果你是已有倉庫，建議把 `node_modules` 刪除後再使用 `npm i --legacy-peer-deps` 安裝依賴。
3. 此指令適用於大多數 npm 報 ERROR 的情況。
4. 如需 update 包，可以使用 `npm info 包名` 先查看需要版本，再在 package.json 裡修改版本號，`npm i --legacy-peer-deps`。

    2022.06.28 更新：
    加入 linear-gradient，在 android 配置了若干項，如 IOS 編譯出錯則應該前往 github 頁查看文檔再進行安裝。

5. 可能的隱患：更改了此文件`android\app\src\main\java\com\umall\MainApplication.java`路徑上存在現版本的項目名`umall`，如果項目更名後發現報錯，需來這裡修改代碼。

**2024.09.30 更新:tada::tada:：**
更新`react-native@0.69.0`後，對重新開始開發的流程產生了重大變化：

1. ViewPropTypes 的棄用，參考教程進行補丁修復：https://stackoverflow.com/questions/72755476/invariant-violation-viewproptypes-has-been-removed-from-react-native-migrate-t ，使用`yarn postinstall`安裝先前的補丁，如再更新 RN 版本，需再修改`node_modules`中 react-native 的 index.js 代碼，再打上補丁。
2. 部分第三方包使用了過時的`jcenter()`，主要是 Android 端問題，需使用 `mavenCentral()`代替，也是需要修改`node_modules`中對應的包的代碼。

### Android

1. Android 檔案權限報錯-`Error: spawn ./gradlew EACCES`

```console
cd android
chmod +x ./gradlew
xattr -l ./gradlew
```

### iOS

1. iOS 实机调试报错-`Signing for XXX requires a development team. Select a development team in the Signing and Cap Editor`

    > 请尝试在 Xcode 中双击 Pods，然后在 Targets 中选择 React-Core-AccessibilityResources，找到 Singing 中的 Development Team 进行选择。仅在 UMAllWhite 中选择 Development Team 无效

2. iOS 实机调试报错-`module map file not found`

    > 请在 Xcode 选择项目时选择 UMAllWhite.xcworkspace 打开，不要选择 UMAllWhite.xcodeproj

3. iOS 運行文件報錯-`error React Native CLI uses autolinking for native dependencies`

```console
npx react-native unlink react-native-vector-icons
本条已经尝试修复，需要后续测试
```

4. Pod 找不到目標工程-`Could not automatically select an Xcode project`
    > 在`ios/Podfile`中加入以下路徑以解決報錯

```console
target 'ProjectName' do
 project './ProjectName.xcodeproj'
...
end
```

5. Build 時遇到`yoga.cpp`編譯問題:

```console
The following build commands failed:
    CompileC ......
    Yoga.cpp normal arm64 c++ com.apple.compilers.llvm.clang.1_0.compiler (in target 'Yoga' from project 'Pods')
(1 failure)
```

&emsp; 使用 Xcode Build，雙擊該錯誤提示定位到錯誤發生位置，點按`Fix`快速修復錯誤。即可正常編譯。

6. Build 時遇到`hash`編譯問題：
   &emsp; 與上一點修復方式相同。

7. 再莫名遇到`CompileC`錯誤：
   刪除`./package-lock.json`，刪除`./ios`下的`Pods`和`build`文件夾。
   刪除`~/Library/Developer/Xcode/DerivedData/`目錄下的所有文件。
   回到`./`使用`npm i --legacy-peer-deps`重新安裝依賴包。
   到`./ios`使用`pod install --repo-update;`安裝 Pod 相關包，**該步驟可能會使電腦重裝 iOS 模擬器**。
   使用 Xcode 嘗試 Build，Fix`yoga.cpp`和`hash`問題後，應該可以正常 Build。

8. Build、Archive 等步驟出現問題。提示`Multiple commands produce`。

<img width="844" alt="Snipaste_2023-12-20_00-50-41" src="https://github.com/UM-ARK/UM-All-Frontend/assets/55580370/7a8b6b21-6e0b-44a9-9586-12c4e7c397a1">

在 Xcode 中 點選目錄中的`Pods`，選擇`Signing & Capabilities`選擇正確的`Team`。

<img width="960" alt="Snipaste_2023-12-20_00-51-06" src="https://github.com/UM-ARK/UM-All-Frontend/assets/55580370/665b0ea6-b5be-488f-87b3-2d5b2b43baf2">

在`TARGETS`中使用底部的篩選輸入框，輸入`Core`定位重複的文件，右鍵`Delete` `React-Core.common-Access`。

<img width="320" alt="Snipaste_2023-12-20_00-51-31" src="https://github.com/UM-ARK/UM-All-Frontend/assets/55580370/0e29a0bf-8469-419d-bf2b-377b8936b106">

然後重新 Run 和 Build 試試。

9. `pod install`時遇到`hermes-engine`報錯：

```bash
Fetching podspec for `hermes-engine` from `../node_modules/react-native/sdks/hermes-engine/hermes-engine.podspec`
[!] Failed to load 'hermes-engine' podspec:
[!] Invalid `hermes-engine.podspec` file: undefined method `exists?' for class File.

 #  from /pathToProject/UM-All-Frontend/node_modules/react-native/sdks/hermes-engine/hermes-engine.podspec:46
 #  -------------------------------------------
 #    source[:http] = "file://#{destination_path}"
 >  elsif File.exists?(hermestag_file) && isInCI
 #    Pod::UI.puts '[Hermes] Detected that you are on a React Native release branch, building Hermes from source but fetched from tag...'.yellow if Object.const_defined?("Pod::UI")
```

找到 `/node_modules/react-native/sdks/hermes-engine/hermes-engine.podspec`，修改`File.exists?(hermestag_file)`為`File.exist?(hermestag_file)`。

---
