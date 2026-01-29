---
name: jsdoc-refactor-with-docs
description: 重構時同步更新 JSDoc 註釋的最佳實務
license: MIT
metadata:
  author: UM All Team
  tags: jsdoc, documentation, refactor
---

# 重構時同步更新 JSDoc 註釋

## Overview

在重構程式碼時，同步更新 JSDoc 註釋以確保註釋與程式碼的一致性和準確性。

## When to Apply

在以下情況時使用此技能：
- 重構現有函式的簽名或功能
- 修改元件的 props 接口
- 更新 API 端點的回應格式
- 優化非同步函式的行為

## Skill Format

### Quick Pattern: 重構時更新 JSDoc

**Before Refactor:**
```javascript
/**
 * 獲取課程信息
 * @param {string} courseId - 課程 ID
 * @returns {Promise<Course>} 課程信息
 */
export const getCourseInfo = async (courseId) => {
  const response = await axios.get(BASE_URI + GET.COURSE_INFO, { params: { id: courseId } });
  return response.data;
};
```

**After Refactor (添加錯誤處理和快取):**
```javascript
/**
 * 獲取課程信息
 * 從 API 獲取課程詳細信息，包含 5 分鐘本地快取機制
 * @param {string} courseId - 課程 ID
 * @param {Object} [options] - 選項
 * @param {boolean} [options.forceRefresh=false] - 是否強制刷新（跳過快取）
 * @returns {Promise<Course>} 課程信息
 * @throws {APIError} 當 API 返回錯誤時
 * @throws {CacheError} 快取操作失敗時
 * @example
 * ```javascript
 * try {
 *   const course = await getCourseInfo('COMP1011', { forceRefresh: true });
 *   console.log('課程信息:', course);
 * } catch (error) {
 *   console.error('獲取課程信息失敗:', error);
 * }
 * ```
 */
export const getCourseInfo = async (courseId, options = {}) => {
  const cacheKey = `course_${courseId}`;
  if (!options.forceRefresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await axios.get(BASE_URI + GET.COURSE_INFO, { params: { id: courseId } });
    setCache(cacheKey, response.data, 300); // 300 秒快取
    return response.data;
  } catch (error) {
    throw new APIError(error);
  }
};
```

### Quick Reference: 重構時需要更新的內容

| 重構類型 | 需要更新的 JSDoc 部分 |
|----------|-----------------------|
| 參數變更 | `@param` 標註 |
| 回傳值變更 | `@returns` 標註 |
| 功能增強 | 功能描述和範例 |
| 錯誤處理 | `@throws` 標註 |
| 行為變更 | 詳細描述和範例 |

### Quick Reference: 檢查清單

| 檢查項目 | 說明 |
|----------|------|
| 一致性 | 註釋與程式碼行為一致 |
| 完整性 | 所有新增功能都有說明 |
| 正確性 | 型別標註和描述準確 |
| 範例更新 | 使用範例包含新功能 |
| 刪除過時 | 移除不再適用的描述 |

## Deep Dive

### 核心原則

1. **同步更新**：重構程式碼後立即更新對應的 JSDoc
2. **完整性**：確保所有變更都有對應的註釋
3. **準確性**：註釋必須反映程式碼的實際行為
4. **清晰性**：使用範例說明新功能

### 重構步驟

1. **重構前檢查**：閱讀現有 JSDoc 註釋，了解功能和接口
2. **程式碼重構**：進行所需的程式碼變更
3. **註釋更新**：
   - 更新功能描述
   - 更新參數和回傳值標註
   - 添加新的 `@throws` 標註
   - 更新使用範例
4. **驗證一致性**：檢查註釋是否與程式碼行為一致

### 常見錯誤

- **忘記更新註釋**：重構後註釋過時
- **不完整的更新**：只更新部分註釋
- **不一致的型別**：型別標註與實際不符
- **缺少範例**：新功能沒有使用範例

### 最佳實務

1. **重構前**：先理解現有註釋
2. **重構時**：同步更新註釋
3. **重構後**：驗證註釋的正確性
4. **測試**：使用範例測試新功能

## Checklist

- [ ] 重構前檢查現有 JSDoc 註釋
- [ ] 修改後立即更新註釋
- [ ] 確保註釋與程式碼行為一致
- [ ] 更新使用範例
- [ ] 檢查所有 `@param` 和 `@returns` 標註
- [ ] 添加新的 `@throws` 標註（如有）
- [ ] 移除過時的描述
- [ ] 驗證註釋的完整性和準確性

