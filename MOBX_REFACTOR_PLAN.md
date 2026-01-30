# MobX 重構計劃：Course 數據管理

## 1. 背景與目標

### 當前問題
- `what2Reg` 和 `courseSim` 兩個頁面都維護各自的課程數據 state
- 重複的課程數據獲取和版本檢查邏輯
- 數據不一致風險：一個頁面更新後，另一個頁面不知道

### 重構目標
- 使用 MobX 建立統一的 CourseStore
- 兩個頁面共享同一份課程數據
- 簡化組件代碼，移除重複的數據獲取邏輯

---

## 2. 架構設計

### 2.1 Store 結構

```javascript
// stores/CourseStore.js
class CourseStore {
    // State
    coursePlan = null;        // Add Drop 課程數據
    offerCourses = null;      // Pre Enroll 課程數據
    coursePlanTime = null;    // 課程時間表
    courseVersion = null;     // 版本信息

    // UI State
    isLoading = false;
    error = null;

    constructor() {
        makeAutoObservable(this, {}, { autoBind: true });
        this.initialize();
    }

    // Actions
    async initialize() { /* 從 AsyncStorage 加載 */ }
    async refreshCourses() { /* 檢查並更新課程數據 */ }

    // Computed
    get isVersionOutdated() { /* 檢查版本 */ }
    getCourseByMode(mode) { /* 根據模式獲取課程 */ }
}
```

### 2.2 組件使用方式

```javascript
// what2Reg/index.js
import { observer } from 'mobx-react-lite';
import { courseStore } from '../../stores/CourseStore';

const What2Reg = observer((props) => {
    // 直接訪問 store 數據
    const { coursePlan, offerCourses, isLoading } = courseStore;

    // 調用 action
    const handleRefresh = () => {
        courseStore.refreshCourses();
    };

    // 使用 computed
    const courseList = courseStore.getCourseByMode(mode);

    // ... 渲染邏輯
});
```

---

## 3. 遷移步驟

### Phase 1: 創建 Store（第 1-2 天）

1. **創建文件** `src/stores/CourseStore.js`
2. **遷移數據邏輯**：
   - 從 `checkCoursesKits.js` 導入數據獲取函數
   - 實現 `initialize()` 和 `refreshCourses()`
3. **添加 computed**：
   - `getCourseByMode(mode)`
   - `isVersionOutdated`

### Phase 2: 重構 what2Reg（第 3-4 天）

1. **導入和裝飾**：
   ```javascript
   import { observer } from 'mobx-react-lite';
   import { courseStore } from '../../stores/CourseStore';

   const What2Reg = observer((props) => { ... });
   ```

2. **移除本地 state**：
   - ❌ 刪除：`s_coursePlan`, `s_offerCourses`, `s_courseVersion` 等
   - ✅ 使用：`courseStore.coursePlan` 等

3. **簡化方法**：
   - ❌ 刪除：`init()` 中的數據獲取邏輯
   - ✅ 使用：`courseStore.initialize()`

### Phase 3: 重構 courseSim（第 5-6 天）

步驟與 Phase 2 類似：
1. 導入 `observer` 和 `courseStore`
2. 移除本地課程數據 state
3. 使用 store 的數據和方法

### Phase 4: 測試和優化（第 7 天）

1. **測試場景**：
   - 首次進入頁面，數據加載
   - 切換頁面，數據一致性
   - 手動刷新，版本更新
   - 離線模式，使用緩存

2. **性能檢查**：
   - 使用 React DevTools Profiler 檢查重渲染
   - 確保 `observer` 只訂閱必要的 state

---

## 4. 預期收益

| 指標 | 重構前 | 重構後 |
|------|--------|--------|
| 代碼行數（what2Reg）| ~1260 | ~900（預計）|
| 代碼行數（courseSim）| ~1365 | ~1000（預計）|
| 數據一致性 | 需手動同步 | 自動同步 |
| 可測試性 | 低 | 高 |

---

## 5. 風險與注意事項

1. **MobX 版本**：確認項目使用 MobX 6.x，使用 `makeAutoObservable` 而非舊的裝飾器語法

2. **異步 Action**：在 MobX 6 中，異步操作後的 state 修改需要用 `runInAction` 包裹

3. **漸進式遷移**：可以先創建 Store，讓兩個頁面並存舊邏輯和新 Store，逐步替換

4. **測試覆蓋**：重構後需要確保原有功能正常，特別是課程數據的獲取和顯示

---

## 6. 下一步行動

如果你同意這個計劃，我們可以開始 **Phase 1** 的實施：

1. 檢查當前項目的 MobX 版本和配置
2. 創建 `src/stores/CourseStore.js`
3. 遷移數據邏輯到 Store

是否需要我開始實施，或者你有其他考慮？
