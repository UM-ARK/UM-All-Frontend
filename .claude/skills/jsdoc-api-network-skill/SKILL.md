---
name: jsdoc-api-network-skill
description: 為 API/網路函式添加 JSDoc 註釋，包含請求/回應格式、錯誤碼等
license: MIT
metadata:
  author: UM All Team
  tags: jsdoc, documentation, api, network, axios
---

# API/網路函式 JSDoc 註釋規範

## Overview

為 API/網路函式添加詳細的 JSDoc 註釋，包含請求/回應格式、錯誤碼等。

## When to Apply

在以下情況時使用此技能：
- 創建新的 API 呼叫函式
- 修改現有 API 函式的行為
- 實現新的 API 端點
- 添加 API 版本控制

## Skill Format

### Quick Pattern: API 網路函式註釋

**Incorrect:**
```javascript
// 獲取活動列表
export const getActivityList = async (params = {}) => {
  const response = await axios.get(BASE_URI + GET.ACTIVITY_LIST, { params });
  return response.data;
};
```

**Correct:**
```javascript
/**
 * 獲取活動列表 API
 * 從伺服器獲取校園活動列表
 * @param {Object} params - 查詢參數
 * @param {string} [params.category] - 活動類別（如 'academic', 'sports'）
 * @param {string} [params.date] - 活動日期（格式：YYYY-MM-DD）
 * @param {number} [params.limit=20] - 結果限制數量
 * @param {number} [params.offset=0] - 結果偏移量
 * @returns {Promise<ActivityListResponse>} 活動列表響應
 * @returns {Activity[]} returns.data - 活動列表
 * @returns {number} returns.total - 總活動數
 * @returns {number} returns.page - 當前頁碼
 * @throws {APIError} 當 API 返回錯誤時
 * @example
 * ```javascript
 * const response = await getActivityList({
 *   category: 'academic',
 *   date: '2024-03-15',
 *   limit: 10
 * });
 * console.log('活動列表:', response.data);
 * console.log('總數:', response.total);
 * ```
 */
export const getActivityList = async (params = {}) => {
  const response = await axios.get(BASE_URI + GET.ACTIVITY_LIST, { params });
  return response.data;
};
```

### Quick Reference: API 函式 JSDoc 必要元素

| 元素 | 用途 | 必填 |
|------|------|------|
| API 端點說明 | 端點名稱和基本信息 | 是 |
| `@param` | 請求參數 | 有參數時 |
| `@returns` | 回應格式 | 有回傳時 |
| `@throws` | 錯誤處理 | 有例外時 |
| 請求方法 | HTTP 方法（GET/POST/PUT/DELETE） | 是 |
| 端點路徑 | API 端點的路徑 | 是 |
| `@example` | 使用範例 | 建議 |

### Quick Reference: 回應格式

| 格式類型 | 說明 | 範例 |
|----------|------|------|
| 列表響應 | 包含數據列表和分頁信息 | `{ data: [], total: 0, page: 1 }` |
| 單一數據響應 | 包含單個數據對象 | `{ id: '', name: '' }` |
| 成功響應 | 簡單的成功訊息 | `{ success: true, message: '' }` |
| 錯誤響應 | 包含錯誤信息 | `{ error: true, code: '', message: '' }` |

## Deep Dive

### 核心原則

1. **明確性**：清楚說明 API 的功能和使用方法
2. **完整性**：涵蓋所有請求參數和回應格式
3. **一致性**：使用統一的參數命名和回應格式
4. **實用性**：提供真實的使用範例

### 書寫指南

1. **功能描述**：說明 API 的主要功能和使用場景
2. **請求參數**：
   - 每個參數都要有 `@param` 標註
   - 說明參數的用途、格式和預設值
   - 標示可選參數
3. **回應格式**：
   - 使用 `@returns` 說明回應的類型
   - 對於複雜回應，說明每個屬性的用途
4. **錯誤處理**：使用 `@throws` 標註可能的錯誤
5. **範例**：提供至少一個完整的使用範例

### API 特定規範

1. **HTTP 方法**：明確說明使用的 HTTP 方法
2. **端點路徑**：說明 API 端點的路徑
3. **版本控制**：說明 API 版本（如 v1, v2）
4. **認證方式**：說明是否需要認證
5. **請求頭**：說明必要的請求頭

### 常見錯誤

- **缺少端點說明**：不說明 API 端點的基本信息
- **不完整的參數描述**：參數格式和預設值沒有說明
- **缺少回應格式**：回應的結構和屬性沒有描述
- **未說明錯誤碼**：可能的錯誤碼和訊息沒有說明

## Checklist

- [ ] 說明 API 端點和請求方法
- [ ] 詳細描述請求參數
- [ ] 說明響應格式
- [ ] 列出常見的錯誤碼
- [ ] 包含 API 呼叫範例
- [ ] 有參數的格式和預設值說明
- [ ] 有回應數據結構的詳細描述

