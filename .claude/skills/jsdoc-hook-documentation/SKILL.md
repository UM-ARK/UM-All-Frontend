---
name: jsdoc-hook-documentation
description: 為自訂 hooks 添加詳細的 JSDoc 註釋，包含依賴、回傳值和副作用
license: MIT
metadata:
  author: UM All Team
  tags: jsdoc, documentation, react-native, hooks
---

# 自訂 Hooks JSDoc 註釋規範

## Overview

為 React 自訂 hooks 添加詳細的 JSDoc 註釋，包含功能描述、依賴、回傳值和副作用。

## When to Apply

在以下情況時使用此技能：
- 創建新的自訂 hooks
- 修改現有 hooks 的行為
- 建立 hooks 庫或共用邏輯

## Skill Format

### Quick Pattern: 自訂 Hooks 註釋

**Incorrect:**
```javascript
// 課程數據管理 Hook
const useCourseData = (semester, autoUpdate = true) => {
  // ...
};
```

**Correct:**
```javascript
/**
 * 課程數據管理 Hook
 * 提供課程數據的獲取、快取和更新功能
 * @param {string} semester - 學期（如 'pre' 或 'adddrop'）
 * @param {boolean} [autoUpdate=true] - 是否自動檢查更新
 * @returns {Object} 包含課程數據和操作方法的物件
 * @returns {Course[]} returns.courses - 課程列表
 * @returns {boolean} returns.loading - 加載狀態
 * @returns {Error|null} returns.error - 錯誤信息
 * @returns {Function} returns.refresh - 手動刷新數據的方法
 * @example
 * ```javascript
 * const { courses, loading, error, refresh } = useCourseData('pre');
 *
 * if (loading) return <LoadingSpinner />;
 * if (error) return <ErrorDisplay error={error} />;
 *
 * return (
 *   <FlatList
 *     data={courses}
 *     renderItem={({ item }) => <CourseItem course={item} />}
 *   />
 * );
 * ```
 */
const useCourseData = (semester, autoUpdate = true) => {
  // Hook 實現
};
```

### Quick Reference: Hooks JSDoc 必要元素

| 元素 | 用途 | 必填 |
|------|------|------|
| 功能描述 | 說明 Hook 的主要功能 | 是 |
| `@param` | 參數描述 | 有參數時 |
| `@returns` | 回傳值描述（包含各個欄位） | 有回傳時 |
| 副作用說明 | 說明副作用（API 呼叫、DOM 操作等） | 有副作用時 |
| `@example` | 使用範例 | 建議 |

### Quick Reference: 回傳值結構

| 結構類型 | 說明 | 範例 |
|----------|------|------|
| 單一值 | 回傳單個值 | `@returns {boolean} 是否登錄` |
| 物件 | 回傳包含多個屬性的物件 | `@returns {Object} 包含用戶資訊的物件` |
| 陣列（Tuple） | 回傳有固定長度的陣列 | `@returns {[boolean, Function]} [isOpen, toggle]` |
| 複雜物件 | 回傳包含嵌套結構的物件 | `@returns {Course[]} returns.courses` |

## Deep Dive

### 核心原則

1. **明確性**：清楚說明 Hook 的功能和用途
2. **完整性**：涵蓋所有輸入、輸出和副作用
3. **一致性**：使用統一的格式和術語
4. **實用性**：提供真實的使用範例

### 書寫指南

1. **功能描述**：說明 Hook 的主要功能和使用場景
2. **參數描述**：每個參數都要有 `@param` 標註，包含型別和語意
3. **回傳值描述**：
   - 使用 `@returns` 說明回傳值的類型
   - 對於複雜物件，說明每個屬性的用途
4. **副作用說明**：說明 Hook 的副作用（如 API 呼叫、DOM 操作、狀態管理）
5. **範例**：提供至少一個完整的使用範例

### Hooks 特定規範

1. **命名約定**：使用 `use` 前綴
2. **依賴描述**：說明 Hook 的外部依賴
3. **狀態管理**：說明內部狀態的管理方式
4. **錯誤處理**：說明錯誤處理機制

### 常見錯誤

- **缺少回傳值描述**：不說明回傳值的結構和用途
- **省略副作用說明**：重要的副作用沒有說明
- **不完整的範例**：使用方法不清晰
- **未說明依賴**：外部依賴沒有描述

## Checklist

- [ ] 包含 Hook 的功能描述
- [ ] 所有參數都有 `@param` 標註
- [ ] 回傳值有完整的 `@returns` 標註
- [ ] 說明 Hook 的副作用
- [ ] 包含使用範例
- [ ] 回傳值結構有明確的描述
- [ ] 副作用（API 呼叫、DOM 操作等）有說明

