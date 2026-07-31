# 編輯規則（最高優先級）

- 保留每個檔案現有的縮排、空格、換行與程式碼風格；以修改點周圍的格式為準。
- 只修改完成任務必要的最少行，使用最小範圍 patch。
- 禁止順手重排 import、重新縮排、重新換行、改引號或逗號、排序 object/JSON keys。
- 除非使用者明確要求，禁止執行 Prettier、ESLint --fix 或任何會寫入檔案的 formatter。
- 禁止整個檔案重寫。修改 JSON、YAML、i18n 時只能局部文字修改，不得 parse 後重新 serialize。
- 不得修改與任務無關的既有內容，也不得復原使用者原本的修改。
- 完成前必須檢查 `git diff --check` 和完整 `git diff`，移除自己造成的 whitespace-only 或無關差異。
- 如果無法在不改變既有格式的情況下完成，先停止並向使用者說明。

## JavaScript 格式化

- JavaScript 使用 Cursor 內建的 `vscode.typescript-language-features` formatter。
- 縮排使用 4 個空格。
- 禁止使用 Prettier 格式化 `.js`。
- 保留既有換行；避免整檔重新排版。

# Cursor 規則

- 修改 JavaScript 前讀取 `.cursor/rules/code-style.mdc`。
- 所有任務都遵守 `.cursor/rules/critical-donts.mdc` 與 `.cursor/rules/language-requirements.mdc`。
- 其他 `.cursor/rules/*.mdc` 依任務內容按需讀取。