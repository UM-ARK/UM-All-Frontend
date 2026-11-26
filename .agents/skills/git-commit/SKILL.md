---
name: git-commit
description: 生成 Git commit message（Gitmoji + 繁體中文）或合併 Pull Request 時保留原作者資訊的操作規範。
---

# Git Commit 與 PR 合併規範

## 一、Commit Message 格式

所有提交訊息須使用 **Gitmoji**（https://gitmoji.dev/）搭配**繁體中文**描述：

```text
<gitmoji> 簡明描述（建議 50 字元內）

詳細描述（可選，空一行後列出重點）
```

- 語言：**一律使用繁體中文**（技術術語、元件／函式名除外），禁用簡體中文，亦不使用 `feat:`／`fix:` 等 Conventional Commits 前綴。
- Gitmoji 形式：優先使用 Unicode Emoji（如 `✨`、`🐛`、`💄`），亦接受標準 Gitmoji shortcode（如 `:sparkles:`），同一條訊息不混用。

### 常用 Gitmoji 對照

| 變更類型 | Emoji | Shortcode | 說明 |
| --- | --- | --- | --- |
| 新功能 | ✨ | `:sparkles:` | 新增功能 |
| Bug 修復 | 🐛 | `:bug:` | 修復問題 |
| UI／樣式 | 💄 | `:lipstick:` | 介面、佈局、樣式調整 |
| 重構 | ♻️ | `:recycle:` | 重構程式碼 |
| 效能優化 | ⚡️ | `:zap:` | 效能提升 |
| 無障礙 | ♿️ | `:wheelchair:` | 無障礙、減少動態效果等改善 |
| 文檔 | 📝 | `:memo:` | 新增或更新文檔／規則 |
| 刪除程式 | 🔥 | `:fire:` | 移除程式碼或檔案 |
| 測試 | ✅ | `:white_check_mark:` | 新增或更新測試 |
| 依賴增刪升 | ➕／➖／⬆️ | `:heavy_plus_sign:` 等 | 新增、移除或升級依賴 |
| 設定檔 | 🔧 | `:wrench:` | 調整組態檔 |
| 發布／版本 | 🚀 | `:rocket:` | 版本號更新與部署相關 |
| 簡單修復 | 🩹 | `:adhesive_bandage:` | 非關鍵小修 |
| 緊急修復 | 🚑️ | `:ambulance:` | 緊急修正 |
| 合併／回滾 | 🔀／⏪️ | `:twisted_rightwards_arrows:`／`:rewind:` | 合併分支或回滾變更 |

（其他明確語意可依 gitmoji.dev 選用對應 emoji。）

### 範例

```text
✨ 校園搜尋可收合並高亮標題

- 捲動時自動收合搜尋列，往回滑重新展開
- 搜尋結果標題依匹配區間高亮顯示
```

## 二、合併 PR 時保留原作者資訊

合併他人 PR 時，**必須保留原作者資訊**，不得用自己的 Git 作者覆蓋：

1. **GitHub 網頁（推薦）**：使用 "Merge pull request" 按鈕，自動保留原作者。
2. **GitHub CLI**：
   ```bash
   gh pr merge <pr-number> --merge
   ```
3. **命令列合併**：
   ```bash
   git checkout main
   git merge --no-ff <pr-branch-name>
   ```
   若需調整提交，務必加上 `--author="Original Author <author@example.com>"`。
