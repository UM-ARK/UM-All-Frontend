# MobX 重構計劃：Course 數據管理（更新版）


### 當前問題
- `what2Reg` 和 `courseSim` 兩個頁面都維護各自的課程數據 state
- 重複的課程數據獲取和版本檢查邏輯
- 數據不一致風險：一個頁面更新後，另一個頁面不知道

### 重構目標
- 使用 MobX 建立統一的 CourseStore
- 兩個頁面共享同一份課程數據
- 簡化組件代碼，移除重複的數據獲取邏輯
- 配合 React Navigation V7 的性能優化特性

---

## 2. 關鍵架構發現

| 項目 | 現狀 | 影響 |
|------|------|------|
| MobX 版本 | 6.x（使用 `makeObservable`） | 與原計劃兼容 |
| 現有 RootStore | `src/mobx/index.js`，僅存 `userInfo` | 需要擴展而非替換 |
| Tabbar 注入方式 | `inject('RootStore')` | 需保持向後兼容 |
| 目標頁面 | 函數組件（Hooks） | 使用 `mobx-react-lite` 的 `observer` |
| 導航特性 | 已啟用 `freezeOnBlur: true` | 減少不必要的重渲染 |

---

## 3. 修改後的架構設計

### 3.1 CourseStore 結構

```javascript
// src/mobx/CourseStore.js
import { observable, action, computed, makeObservable, runInAction } from 'mobx';
import {
    getCourseData,
    checkCloudCourseVersion,
} from '../utils/checkCoursesKits';

class CourseStore {
    // State
    coursePlan = null;        // Add Drop 課程數據
    offerCourses = null;      // Pre Enroll 課程數據
    coursePlanTime = null;    // 課程時間表
    courseVersion = null;     // 版本信息

    // UI State
    isLoading = false;
    error = null;
    lastUpdateTime = null;

    constructor() {
        makeObservable(this, {
            // Observables
            coursePlan: observable,
            offerCourses: observable,
            coursePlanTime: observable,
            courseVersion: observable,
            isLoading: observable,
            error: observable,
            lastUpdateTime: observable,

            // Computeds
            isVersionOutdated: computed,
            allCourseData: computed,

            // Actions
            initialize: action,
            refreshCourses: action,
            setError: action,
        });

        this.initialize();
    }

    // Actions
    async initialize() {
        // 並行加載所有課程數據
        this.isLoading = true;

        try {
            const [preData, adddropData, versionData] = await Promise.all([
                getCourseData('pre'),
                getCourseData('adddrop'),
                getCourseData('version'),
            ]);

            runInAction(() => {
                this.offerCourses = preData;
                this.coursePlan = adddropData.adddrop;
                this.coursePlanTime = adddropData.timetable;
                this.courseVersion = versionData;
                this.lastUpdateTime = new Date();
                this.error = null;
            });

            // 在背景檢查版本更新
            this.checkVersionInBackground();
        } catch (err) {
            runInAction(() => {
                this.error = err.message;
            });
        } finally {
            runInAction(() => {
                this.isLoading = false;
            });
        }
    }

    async refreshCourses() {
        this.isLoading = true;

        try {
            await checkCloudCourseVersion();
            await this.initialize();
        } catch (err) {
            runInAction(() => {
                this.error = err.message;
            });
        } finally {
            runInAction(() => {
                this.isLoading = false;
            });
        }
    }

    // Computeds
    get isVersionOutdated() {
        // 基於 lastUpdateTime 判斷是否需要刷新
        if (!this.lastUpdateTime) return true;

        const hoursSinceUpdate = (new Date() - this.lastUpdateTime) / (1000 * 60 * 60);
        return hoursSinceUpdate > 6; // 6小時自動更新
    }

    get allCourseData() {
        return {
            offerCourses: this.offerCourses,
            coursePlan: this.coursePlan,
            coursePlanTime: this.coursePlanTime,
            courseVersion: this.courseVersion,
        };
    }
}

// 導出單例
export default new CourseStore();
```

### 3.2 與 RootStore 整合

```javascript
// src/mobx/index.js
import { observable, action, makeObservable } from 'mobx';
import courseStore from './CourseStore';

class RootStore {
    userInfo = {};

    // 引入 CourseStore 作為子 store
    get courseStore() {
        return courseStore;
    }

    constructor() {
        makeObservable(this, {
            userInfo: observable,
            setUserInfo: action,
        });
    }

    setUserInfo(userInfo) {
        this.userInfo = userInfo;
    }
}

export default new RootStore();
```

---

## 4. 組件層級優化策略

### 4.1 what2Reg 頁面重構

```javascript
// src/pages/TabbarPages/what2Reg/index.js
import { observer } from 'mobx-react-lite';
import courseStore from '../../../mobx/CourseStore';

// 使用 observer 包裝組件
const What2Reg = observer((props) => {
    const { theme } = useTheme();

    // 直接從 store 獲取數據，不再需要本地 state
    const {
        offerCourses,
        coursePlan,
        isLoading,
        error,
        refreshCourses
    } = courseStore;

    // 移除原有的數據加載邏輯
    useEffect(() => {
        // 只需調用一次初始化，store 會自動處理
        if (!offerCourses && !isLoading) {
            courseStore.initialize();
        }
    }, []);

    // 刷新處理
    const handleRefresh = useCallback(() => {
        refreshCourses();
    }, []);

    // 渲染邏輯...
}));
```

### 4.2 courseSim 頁面重構

```javascript
// src/pages/TabbarPages/courseSim/index.js
import { observer } from 'mobx-react-lite';
import courseStore from '../../../mobx/CourseStore';

const CourseSim = observer(({ route, navigation }) => {
    const { theme } = useTheme();

    // 使用 store 的數據
    const { coursePlan, coursePlanTime, isLoading } = courseStore;

    // 本地 state 僅保留 UI 相關狀態
    const [u_codeSectionList, setU_codeSectionList] = useState([]);
    const [searchText, setSearchText] = useState('');

    // 數據加載
    useEffect(() => {
        if (!coursePlan && !isLoading) {
            courseStore.initialize();
        }
    }, []);

    // 渲染邏輯...
}));
```

---

## 5. 性能優化建議

### 5.1 配合 React Navigation V7 的 `freezeOnBlur`

```javascript
// Nav.js 中已啟用，無需修改
<Stack.Navigator
    screenOptions={{
        freezeOnBlur: true,  // 當頁面不在焦點時凍結，減少重渲染
    }}
>
```

### 5.2 避免過度訂閱

```javascript
// ❌ 錯誤：訂閱整個 store
const What2Reg = observer(() => {
    const { courseStore } = useContext(RootStoreContext);
    const { offerCourses, coursePlan, isLoading, error, lastUpdateTime } = courseStore;
    // ... 這會導致任何 state 變化都觸發重渲染
});

// ✅ 正確：只訂閱需要的數據
const What2Reg = observer(() => {
    // 使用解構來明確依賴
    const { offerCourses, isLoading } = courseStore;

    // 或者使用 computed 值
    const courseList = useMemo(() => {
        return courseStore.getCoursesByMode(mode);
    }, [mode, courseStore.offerCourses]);
});
```

### 5.3 大型列表使用 FlashList

```javascript
// 如果課程列表很長，考慮使用 FlashList 替代 FlatList
import { FlashList } from '@shopify/flash-list';

<FlashList
    data={courseList}
    renderItem={renderCourseItem}
    estimatedItemSize={100}
    keyExtractor={item => item.courseCode}
/>
```

---

## 6. 遷移步驟（調整後）

### Phase 1: 創建 CourseStore（第 1 天）

1. 創建 `src/mobx/CourseStore.js`
2. 實現核心狀態管理（coursePlan, offerCourses, coursePlanTime, courseVersion）
3. 實現 Actions（initialize, refreshCourses）
4. 更新 `src/mobx/index.js` 整合 CourseStore

### Phase 2: 重構 what2Reg（第 2-3 天）

1. 導入 `observer` 和 `courseStore`
2. 移除本地課程數據 state（`s_offerCourses`, `s_coursePlan` 等）
3. 使用 `courseStore.initialize()` 替代原有數據加載邏輯
4. 測試數據加載、刷新、錯誤處理

### Phase 3: 重構 courseSim（第 4-5 天）

步驟與 Phase 2 類似，重點關注：
- 導入功能的兼容性
- 課表渲染的正確性

### Phase 4: 性能優化（第 6 天）

1. 使用 React DevTools Profiler 檢查重渲染
2. 優化 observer 訂閱範圍
3. 考慮是否需要 FlashList 優化

### Phase 5: 測試與部署（第 7 天）

1. 完整功能測試（首次加載、切換頁面、手動刷新、離線模式）
2. 錯誤處理測試
3. 回滾方案準備

---

## 7. 風險與緩解

| 風險 | 緩解措施 |
|------|----------|
| MobX 6 異步 Action | 使用 `runInAction` 包裹異步後的 state 修改 |
| 兩個頁面同時修改數據 | Store 提供統一的數據修改方法，避免直接修改 observable |
| 漸進式遷移期間數據不一致 | 保持原有的本地 state 作為 fallback，完全遷移後再移除 |
| 性能迴歸 | 使用 Profiler 監控，必要時使用 `React.memo` 和細粒度的 observer |

---

## 8. 與原計劃的主要變更

| 項目 | 原計劃 | 修改後 |
|------|--------|--------|
| CourseStore 位置 | `src/stores/CourseStore.js` | `src/mobx/CourseStore.js`（與 RootStore 同層） |
| MobX 版本假設 | 需確認 | 確認使用 6.x，支持 `makeObservable` |
| RootStore 整合 | 獨立 Store | 作為 RootStore 的 getter 屬性，保持向後兼容 |
| 導航優化 | 未提及 | 利用 `freezeOnBlur: true` 減少重渲染 |
| 注入方式 | 僅使用 hooks | 保留 `inject('RootStore')` 兼容性 |

---

**下一步行動**：確認計劃後，開始 Phase 1 實施：創建 `src/mobx/CourseStore.js`
