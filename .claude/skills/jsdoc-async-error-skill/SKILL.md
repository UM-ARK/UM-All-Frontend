---
name: jsdoc-async-error-skill
description: 為非同步函式和錯誤處理添加 JSDoc 註釋，包含 Promise、錯誤、取消、重試、超時
license: MIT
metadata:
  author: UM All Team
  tags: jsdoc, documentation, async, error, promise
---

# 非同步與錯誤處理 JSDoc 註釋規範

## Overview

為非同步函式和錯誤處理添加詳細的 JSDoc 註釋，包含 Promise、錯誤、取消、重試、超時等機制。

## When to Apply

在以下情況時使用此技能：
- 創建新的非同步函式
- 修改現有非同步函式的行為
- 實現 API 呼叫或網路請求
- 添加錯誤處理邏輯

## Skill Format

### Quick Pattern: 非同步函式註釋

**Incorrect:**
```javascript
// 獲取使用者課程表
export const getUserSchedule = async (userId) => {
  // ...
};
```

**Correct:**
```javascript
/**
 * 獲取使用者課程表
 * 從 API 獲取使用者的課程表數據，包含快取機制
 * @param {string} userId - 使用者 ID
 * @param {Object} [options] - 請求選項
 * @param {number} [options.timeout=10000] - 請求超時時間（毫秒）
 * @param {boolean} [options.forceRefresh=false] - 是否強制刷新（跳過快取）
 * @returns {Promise<CourseSchedule>} 課程表數據
 * @throws {NetworkError} 網路連接失敗時
 * @throws {TimeoutError} 請求超時時
 * @throws {AuthError} 認證失敗時
 * @example
 * ```javascript
 * try {
 *   const schedule = await getUserSchedule('12345', {
 *     timeout: 15000,
 *     forceRefresh: true
 *   });
 *   console.log('課程表:', schedule);
 * } catch (error) {
 *   if (error instanceof NetworkError) {
 *     Alert.alert('網路錯誤', '請檢查網路連接');
 *   } else if (error instanceof TimeoutError) {
 *     Alert.alert('超時', '請求已超時，請稍後再試');
 *   }
 * }
 * ```
 */
export const getUserSchedule = async (userId, options = {}) => {
  // 函式實現
};
```

### Quick Reference: 非同步函式 JSDoc 必要元素

| 元素 | 用途 | 必填 |
|------|------|------|
| `{Promise<T>}` | 回傳值型別 | 是 |
| `@throws` | 可能的例外狀況 | 有例外時 |
| 選項參數 | 超時、取消、重試等 | 建議 |
| 快取機制 | 是否有快取及如何處理 | 有快取時 |
| `@example` | 使用範例（包含錯誤處理） | 建議 |

### Quick Reference: 錯誤類型

| 錯誤類型 | 說明 | 範例 |
|----------|------|------|
| `NetworkError` | 網路連接錯誤 | 無法連接到伺服器 |
| `TimeoutError` | 請求超時 | 請求在指定時間內未完成 |
| `AuthError` | 認證失敗 | 使用者未登錄或權限不足 |
| `APIError` | API 返回錯誤 | 伺服器返回錯誤代碼 |
| `ValidationError` | 數據驗證錯誤 | 參數格式無效 |

## Deep Dive

### 核心原則

1. **明確性**：清楚說明非同步操作的功能和行為
2. **完整性**：涵蓋所有可能的錯誤和邊界條件
3. **一致性**：使用統一的錯誤類型和訊息格式
4. **實用性**：提供包含錯誤處理的使用範例

### 書寫指南

1. **功能描述**：說明非同步操作的主要功能
2. **參數描述**：
   - 主要參數
   - 選項參數（超時、取消、重試等）
3. **回傳值**：使用 `{Promise<T>}` 格式
4. **錯誤處理**：使用 `@throws` 標註所有可能的錯誤類型
5. **範例**：提供包含 try-catch 錯誤處理的範例

### 非同步特定規範

1. **Promise 型別**：明確標註 Promise 的泛型型別
2. **錯誤類型**：使用自訂錯誤類型提高可讀性
3. **取消機制**：說明如何取消操作
4. **重試機制**：說明重試策略
5. **超時**：說明預設超時和自定義超時

### 常見錯誤

- **缺少 Promise 型別**：只標註 `{Promise}` 而不標註泛型
- **不完整的錯誤描述**：只說明有錯誤，不說明錯誤類型
- **缺少錯誤處理範例**：使用範例中不包含錯誤處理
- **未說明邊界條件**：超時、取消等邊界條件沒有說明

## Checklist

- [ ] 回傳值有 `{Promise<T>}` 型別標註
- [ ] 所有可能的錯誤有 `@throws` 標註
- [ ] 說明錯誤處理機制
- [ ] 包含異常狀況的使用範例
- [ ] 選項參數（超時、取消、重試等）有說明
- [ ] 快取機制有說明（如有）
- [ ] 取消和重試機制有說明（如有）

