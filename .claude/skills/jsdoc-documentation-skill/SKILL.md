---
name: jsdoc-documentation-skill
description: 為通用函式、React 元件、工具函式添加高品質 JSDoc 註釋
license: MIT
metadata:
  author: UM All Team
  tags: jsdoc, documentation, react-native, javascript, typescript
---

# JSDoc 通用函式與元件註釋規範

## Overview

為所有 export 的函式、React 元件、工具函式添加高品質的 JSDoc 註釋，確保程式碼的可讀性和可維護性。

## When to Apply

在以下情況時使用此技能：
- 編寫新的 export 函式、React 元件或工具函式
- 修改現有函式的簽名或功能
- 審查未註釋的程式碼
- 建立新的公用 API

## Skill Format

### Quick Pattern: 通用函式註釋

**Incorrect:**
```javascript
// 格式化課程代碼
export const formatCourseCode = (courseCode, addSpace = true) => {
  // ...
};
```

**Correct:**
```javascript
/**
 * 格式化課程代碼顯示
 * 將原始課程代碼轉換為使用者友好的格式（例如：COMP1011 → COMP 1011）
 * @param {string} courseCode - 原始課程代碼（不含空格）
 * @param {boolean} [addSpace=true] - 是否添加空格分隔
 * @returns {string} 格式化後的課程代碼
 * @throws {Error} 當課程代碼格式無效時
 * @example
 * ```javascript
 * const formattedCode = formatCourseCode('COMP1011'); // 回傳 'COMP 1011'
 * const compactCode = formatCourseCode('COMP1011', false); // 回傳 'COMP1011'
 * ```
 */
export const formatCourseCode = (courseCode, addSpace = true) => {
  if (!/^[A-Z]{4}\d{4}$/.test(courseCode)) {
    throw new Error('無效的課程代碼格式');
  }
  return addSpace ? `${courseCode.slice(0, 4)} ${courseCode.slice(4)}` : courseCode;
};
```

### Quick Reference: JSDoc 必要元素

| 元素 | 用途 | 必填 |
|------|------|------|
| `/** */` | 註釋格式 | 是 |
| 簡述 | 一句話說明功能 | 是 |
| 詳細描述 | 功能、使用場景、設計考量 | 建議 |
| `@param` | 參數描述（型別、語意） | 有參數時 |
| `@returns` | 回傳值描述（型別、語意） | 有回傳時 |
| `@throws` | 可能的例外狀況 | 有例外時 |
| `@example` | 使用範例 | 複雜函式 |

### Quick Reference: 型別標註

| 型別 | 語法 | 範例 |
|------|------|------|
| 基本型別 | `{string}`, `{number}`, `{boolean}` | `@param {string} name` |
| 可選參數 | `[paramName=default]` | `@param {boolean} [active=true]` |
| 物件 | `{Object}` 或 `{TypeName}` | `@param {User} userData` |
| 陣列 | `{Array}` 或 `{TypeName[]}` | `@param {string[]} tags` |
| 非同步 | `{Promise<TypeName>}` | `@returns {Promise<User[]>}` |
| 函式 | `{Function}` 或 `{(param) => return}` | `@param {Function} callback` |

## Deep Dive

### 核心原則

1. **明確性**：註釋應清楚說明「做什麼」、「為什麼」和「如何使用」
2. **完整性**：涵蓋所有重要的輸入、輸出和邊界條件
3. **一致性**：使用相同的格式和術語
4. **實用性**：提供真實的使用範例

### 書寫指南

1. **開頭簡述**：使用一句話總結功能
2. **詳細描述**：解釋功能、使用場景、設計考量
3. **參數標註**：每個參數都要有 `@param`，包含型別和語意
4. **回傳值標註**：如果有回傳值，使用 `@returns` 描述
5. **例外標註**：如果函式可能丟出例外，使用 `@throws` 描述
6. **範例**：為複雜函式添加 `@example`，包含代碼範例和說明

### 常見錯誤

- **只重述函式名稱**：`/** 格式化課程代碼 */` 無資訊量
- **不完整的型別標註**：只標註型別，不說明語意
- **缺少範例**：複雜函式需要範例幫助理解
- **過時的註釋**：修改程式碼時忘記更新註釋

## Checklist

- [ ] 使用 `/** ... */` 格式
- [ ] 包含一句話簡述
- [ ] 所有參數都有 `@param` 標註
- [ ] 回傳值有 `@returns` 標註
- [ ] 可能的例外有 `@throws` 標註
- [ ] 複雜函式有 `@example` 標註
- [ ] 註釋語言使用繁體中文
- [ ] 型別標註精確（`{Promise<User[]>}` 而非 `{Object}`）
