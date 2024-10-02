# 忽略部分警告安裝npm
npm i --legacy-peer-deps

# 檢查漏洞
# npm audit

# 檢查xxx包的依賴關係
# npm ls xxx

# 開啟Metro
# yarn start

# 調試Android或iOS
# yarn android
# yarn ios

# 打包發佈，需確保jdk版本為18.0.2.1
# 在./android/目錄下
# gradlew clean
# gradlew assembleRelease
# gradlew bundleRelease

# 在android\app\build\outputs\apk\release目錄下
# adb install app-release.apk
# 指定device安裝
# adb -s 128c3062 install app-release.apk

# 使用本地服務器需要在WiFi處設置代理
# 代理主機名：10.0.2.2
# 代理端口：10809

# 使用 npx patch-package react-native 為react-native打上補丁，用來修復ViewPropTypes問題

# 適用於 pod install 後，watchman權限未更新
# 使用 watchman shutdown-server，使用watchman啟動，再進行 yarn start
# 或使用：
# watchman watch-del '/Users/linzhanyang/Documents/GitHub/UM-All-Frontend' ; watchman watch-project '/Users/linzhanyang/Documents/GitHub/UM-All-Frontend'