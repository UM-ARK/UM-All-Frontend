# UM ALL - Backend - Public

## RN使用方法（在模擬器中）

### Android環境 Install
1. 確保自己是 `Android11` 的模擬器環境（其他安卓版本尚未測試）
2. 本地運行指令 `npm i` 安裝依賴的npm包
3. 敲入 `react-native run-android` 運行吧~


### IOS環境 Install
1. 尚未測試，靜待有緣人





## Git方法
### 基本的push
1. 指定自己的賬號和郵箱（GitHub username）

git config --global user.name "yyyyyyounger"
git config --global user.email "1049825685@qq.com"

2. git add -A 或者使用 `git add .`

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



