---
name: jsdoc-rn-ui-component
description: 為 React Native UI 元件添加 props 規範的 JSDoc 註釋
license: MIT
metadata:
  author: UM All Team
  tags: jsdoc, documentation, react-native, ui, component
---

# React Native UI 元件 JSDoc 註釋規範

## Overview

為 React Native UI 元件添加詳細的 JSDoc 註釋，包含 props 規範、使用場景和範例。

## When to Apply

在以下情況時使用此技能：
- 創建新的 React Native UI 元件
- 修改現有元件的 props 接口
- 建立元件庫或共用元件

## Skill Format

### Quick Pattern: React Native 元件註釋

**Incorrect:**
```javascript
// 課程卡片元件
const CourseCard = ({ courseCode, courseName, instructor, schedule, room, onPress }) => {
  // ...
};
```

**Correct:**
```javascript
/**
 * 課程卡片元件
 * 顯示課程基本信息的卡片，包含課程代碼、名稱、教師和時間
 * @component
 * @param {Object} props - 組件屬性
 * @param {string} props.courseCode - 課程代碼
 * @param {string} props.courseName - 課程名稱
 * @param {string} props.instructor - 授課教師
 * @param {string} props.schedule - 課程時間表
 * @param {string} [props.room] - 教室地點（可選）
 * @param {Function} props.onPress - 點擊卡片的回調函數
 * @returns {JSX.Element} 課程卡片組件
 * @example
 * ```javascript
 * <CourseCard
 *   courseCode="COMP1011"
 *   courseName="計算機科學導論"
 *   instructor="張教授"
 *   schedule="週一 10:00-12:00"
 *   room="E312"
 *   onPress={() => navigateToCourseDetail('COMP1011')}
 * />
 * ```
 */
const CourseCard = ({ courseCode, courseName, instructor, schedule, room, onPress }) => {
  // 元件實現
};
```

### Quick Reference: React 元件 JSDoc 必要元素

| 元素 | 用途 | 必填 |
|------|------|------|
| `@component` | 標示為 React 元件 | 是 |
| `{Object} props` | 說明 props 物件 | 是 |
| 個別 `@param` | 每個 prop 的描述 | 有 props 時 |
| `@returns {JSX.Element}` | 回傳值類型 | 是 |
| `@example` | 使用範例（JSX） | 建議 |

### Quick Reference: Props 分類

| 類型 | 說明 | 範例 |
|------|------|------|
| 必要屬性 | 元件運作必需的 props | `@param {string} props.title` |
| 可選屬性 | 有預設值或可省略的 props | `@param {string} [props.subtitle]` |
| 事件處理 | 回調函數 | `@param {Function} props.onPress` |
| 樣式屬性 | 樣式相關 | `@param {StyleProp<ViewStyle>} props.style` |
| 資料屬性 | 資料物件 | `@param {Course} props.courseData` |

## Deep Dive

### 核心原則

1. **明確性**：清楚描述每個 prop 的用途和預期值
2. **完整性**：涵蓋所有 props，包括必要和可選屬性
3. **一致性**：使用統一的 prop 命名和型別標註
4. **實用性**：提供真實的使用範例

### 書寫指南

1. **元件描述**：說明元件的主要功能和使用場景
2. **Props 描述**：
   - 每個 prop 都要有 `@param` 標註
   - 說明 prop 的用途和預期值
   - 標示可選屬性和預設值
   - 描述事件處理函數的參數和回傳值
3. **回傳值**：使用 `@returns {JSX.Element}` 標註
4. **範例**：提供至少一個完整的使用範例

### React Native 特定規範

1. **樣式屬性**：使用 `StyleProp` 型別
2. **平台特定屬性**：說明平台差異
3. **可訪問性屬性**：包括 `accessible`, `accessibilityLabel` 等

### 常見錯誤

- **缺少 @component 標籤**：不標示為 React 元件
- **省略必要屬性的描述**：重要 prop 沒有說明
- **不完整的型別標註**：只標示型別，不說明用途
- **缺少範例**：元件使用方法不清晰

## Checklist

- [ ] 使用 `@component` 標籤
- [ ] 包含元件的功能描述
- [ ] 所有 props 都有 `@param` 標註
- [ ] 必要屬性和可選屬性有明確區分
- [ ] 回傳值有 `@returns {JSX.Element}` 標註
- [ ] 包含使用範例
- [ ] 樣式屬性使用適當的型別標註
- [ ] 事件處理函數有完整的描述

