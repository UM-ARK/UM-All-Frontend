```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

## ⚠️ 代码读取与编辑规则（最高优先级）

### Serena MCP 工具使用规范

- **优先使用 Serena MCP 工具**（find_symbol、find_referencing_symbols 等）来查找和定位代码
- **不要**使用 Read File 读取整个文件，而是通过符号查找定位具体代码
- 每次对话开始时，先调用 `serena.check_onboarding_performed` 和 `serena.initial_instructions`

### 代码编辑策略

**重要：优先使用 filesystem/edit_file 工具进行小范围修改**

| 场景 | 推荐工具 | 避免使用 |
|------|---------|---------|
| 单行/小范围修改 | `filesystem/edit_file` | `serena/replace_symbol_body` |
| 大段代码重写 | `filesystem/write_file` | - |
| 符号级修改 | `serena/replace_symbol_body` | - |

**原因**: `replace_symbol_body` 工具会重写整个符号体，容易导致：
1. 意外的代码格式变化
2. 丢失原有代码中的注释和细节
3. 大规模 diff，难以 code review

**最佳实践**:
- 使用 `edit_file` 进行精确的小范围修改
- 对于需要添加 `pointerEvents` 等属性的小改动，直接编辑对应行
- 保留原始代码格式和注释

---

## Project Configuration

### Development Rules

- Always use memory-keeper to track progress
- Save architectural decisions and test results
- Create checkpoints before context limits
- Use Gitmoji for commit messages following the guidelines in `.cursor/rules/gitmoji.mdc`

### Quality Standards

- All tests must pass before marking complete
- Document actual vs claimed results

### Git Commit Guidelines

Use Gitmoji (https://gitmoji.dev/) to standardize commit messages for better readability. See `.cursor/rules/gitmoji.mdc` for detailed guidelines.

## Project Overview

- **Type**: React Native 0.81.5 mobile application for University of Macau students using Expo SDK 54
- **Name**: ARK ALL
- **Version**: 26.1.1
- **Target Platforms**: iOS, Android
- **Architecture**: Offline-first with Cloudflare Workers API, 6h auto-update cycle

## Build/Lint/Test Commands

- Install dependencies: `yarn install` (Node ≥18 required)
- iOS simulator: `yarn ios` (iPhone 16 Pro), `yarn iosNew` (iPhone 17 Pro), `yarn iosBig` (iPad Pro), `yarn iosTrue` (physical device)
- Android: `yarn android` (requires API 31 or 33 emulator)
- Lint: `yarn lint` (ESLint extends @react-native config)
- Lint specific file: `yarn lint src/pages/TabbarPages/info/ClubPage.js`
- Start Metro: `yarn start` (with --reset-cache flag: `expo start --reset-cache`)

## Development Workflow

**Important**: The project is already running in development mode. For JavaScript/React Native code changes:

- ✅ **No need to re-run `yarn ios`** - Metro will hot reload changes automatically
- ✅ **Only restart Metro** if you see "Metro has encountered an error" or need to clear cache
- ✅ **Only re-run `yarn ios`** if:
  - You added/removed native dependencies
  - You modified `app.json` or native configuration files
  - You changed `package.json` dependencies

**Hot Reload Tips**:
- Press `R` in Metro terminal to reload the app
- Press `D` to open developer menu on simulator
- Enable "Fast Refresh" in developer menu for instant updates

## Expo SDK 54 (Continuous Native Generation)

This project uses Expo SDK 54 with Continuous Native Generation (CNG) workflow. Key points:

1. **No manual pod install needed**: Expo CNG manages iOS dependencies automatically
2. **Native files are generated**: iOS and Android native project files are generated from app config
3. **Configuration in app.json**: Most native settings are configured in app.json
4. **Expo Development Builds**: Use `expo run:ios` or `expo run:android` to create development builds

## Language Requirements

### 注釋語言 (Comment Language)
- **所有代碼注釋必須使用繁體中文**
- 函數/組件的 JSDoc 註釋使用繁體中文描述功能
- 複雜邏輯的說明註釋使用繁體中文

### APP 文本語言 (APP Text Language)
- **APP 介面中顯示的所有中文文本必須使用繁體中文**
- 包括：按鈕文字、提示信息、標題、對話框內容等
- 例外：技術術語、品牌名稱、API 返回的原始數據

### 示例 (Examples)
```javascript
// ✅ 正確：繁體中文注釋
// 獲取用戶資料並更新本地存儲
const fetchUserData = async () => {
    // 發送 API 請求
    const response = await axios.get(BASE_URI + GET.USER_INFO);
};

// ❌ 錯誤：簡體中文或英文注釋（除非是 JSDoc 類型）
// 获取用户数据
// fetch user data

// ✅ APP 文本使用繁體中文
Alert.alert('確認刪除', '您確定要刪除這個項目嗎？', [
    {text: '取消', style: 'cancel'},
    {text: '確認刪除', style: 'destructive'},
]);

// ❌ 錯誤：簡體中文
// Alert.alert('确认删除', '您确定要删除这个项目吗？')
```

## Code Style Guidelines

### Import Conventions

- Group imports in this order: React Native → third-party → local → utils/components
- Use relative imports with `../../` for local modules (no absolute imports)

### Naming Conventions

- **Components**: PascalCase (e.g., `ClubDetail.js`, `Header.js`)
- **Pages**: PascalCase (e.g., `ClubDetail.js`, `NewsDetail.js`)
- **Utilities/Functions**: camelCase (e.g., `handleLogin`, `getLocalStorage`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `BASE_URI`, `GET`)
- **Variables**: camelCase for standard naming

### Formatting (Prettier)

```javascript
{
  singleQuote: true,
  trailingComma: 'all',
  tabWidth: 4,
  arrowParens: 'avoid',
  bracketSpacing: false,
  bracketSameLine: true
}
```

### Theming & Styling

**⚠️ 強制規定：所有顏色必須使用 ThemeContext 定義的顏色，禁止任何形式的硬編碼顏色**

#### 正確使用方式

```javascript
import {useTheme} from '../../components/ThemeContext';

const {theme} = useTheme();
// 推薦：解構取出常用顏色
const {white, black, bg_color, themeColor, glass} = theme;

// 使用 theme 定義的顏色
// white, black.main, bg_color, themeColor, glass 等
```

#### 需要新增顏色時的處理流程

如果需要使用 ThemeContext 中不存在的顏色：**禁止在組件中硬編碼**，必須按以下流程處理：

1. **在 ThemeContext.js 中添加新顏色定義**：
   ```javascript
   // 在 getColorDiy 函數中添加新顏色
   const getColorDiy = (isLight) => ({
       // ... 現有顏色 ...

       // 新增顏色（必須同時定義亮色和暗色版本）
       newCustomColor: isLight ? '#xxxxxx' : '#xxxxxx',
       newCustomBg: isLight ? '#xxxxxx' : '#xxxxxx',
   });
   ```

2. **在組件中使用新定義的顏色**：
   ```javascript
   const {theme} = useTheme();
   const {newCustomColor, newCustomBg} = theme;
   ```

#### 禁止行為（絕對不允許）

| 禁止的寫法                    | 原因                           |
| ----------------------------- | ------------------------------ |
| `'#fff'` 或 `'#ffffff'`       | 硬編碼白色，不支援暗色模式     |
| `'#000'` 或 `'#000000'`       | 硬編碼黑色，不支援暗色模式     |
| `'rgba(255,255,255,0.2)'`     | 硬編碼半透明色，不支援暗色模式 |
| `'rgba(0,0,0,0.5)'`           | 硬編碼半透明色，不支援暗色模式 |
| 直接從 `uiMap.js` 導入顏色   | `uiMap.js` 已刪除，統一使用 ThemeContext |
| 任何非 `theme` 對象提供的顏色 | 無法保證亮色/暗色一致性        |

#### 半透明/玻璃態效果處理

對於需要半透明或玻璃態效果的情況，**禁止**使用硬編碼的 `rgba` 值：

```javascript
// ❌ 錯誤：硬編碼 rgba
backgroundColor: 'rgba(255, 255, 255, 0.2)'

// ✅ 正確：使用 ThemeContext 定義的 glass 顏色
const {glass} = theme;
backgroundColor: glass  // 定義為 'rgba(255, 255, 255, 0.2)'
```

如需不同透明度的玻璃效果，應在 ThemeContext.js 中定義多個層級（如 `glassLight`, `glassMedium`, `glassHeavy`）。

#### Tonal Color System（色調配色系統）

本項目採用 **Tonal Color System**——通過主題色的不同透明度生成背景層級，前景（文字、圖標）使用 100% 主題色。核心目的是 **淡化強主題色的視覺疲勞和強硬感**，同時保持品牌識別。

所有 Tonal 背景色已在 `ThemeContext.js` 的 `theme.tonal` 對象中預定義，無需每次手寫透明度。

**推薦寫法：使用 theme.tonal 預定義色值**

```javascript
const { themeColor, tonal } = theme;

// 背景用 tonal 預定義色值
backgroundColor: tonal.primary08   // ~3%  極淺底：輸入框背景
backgroundColor: tonal.primary15   // ~8%  淺色底：普通按鈕、標籤
backgroundColor: tonal.primary30   // ~19% 中等底：重點按鈕
backgroundColor: tonal.primary50   // ~31% 較深底：強調容器、pressed態

// 副主題色
backgroundColor: tonal.secondary15 // 副主題色淺色底

// 前景始終用原色
color: themeColor                   // 文字、圖標
```

**透明度分級速查表：**

| theme.tonal 鍵名 | 透明度 | 用途 | 視覺重要性 |
|-------------------|--------|------|-----------|
| `tonal.primary08` / `tonal.secondary08` | ~3% | 大面積輸入區域背景 | ★☆☆☆☆ |
| `tonal.primary15` / `tonal.secondary15` | ~8% | 普通按鈕、標籤、輕量容器 | ★★☆☆☆ |
| `tonal.primary30` / `tonal.secondary30` | ~19% | 重點按鈕、CTA 次級按鈕 | ★★★☆☆ |
| `tonal.primary50` / `tonal.secondary50` | ~31% | 高強調容器、pressed 態 | ★★★★☆ |
| `themeColor` 實色 | 100% | 最高優先級 CTA 按鈕 | ★★★★★ |

**典型組合模式：**

```javascript
const { themeColor, themeColorUltraLight, tonal, white } = theme;

// 模式一：淺底 + 深字（最常用）
<View style={{ backgroundColor: tonal.primary15 }}>
    <Text style={{ color: themeColor }}>按鈕</Text>
</View>

// 模式二：淺底 + 邊框（卡片/輸入區）
<View style={{
    backgroundColor: tonal.primary08,
    borderWidth: 1,
    borderColor: themeColorUltraLight,
}}>
    <Text style={{ color: themeColor }}>內容</Text>
</View>

// 模式三：實色底 + 白字（主 CTA）
<Pressable style={{ backgroundColor: themeColor }}>
    <Text style={{ color: white }}>確認</Text>
</Pressable>

// 模式四：按壓態反饋
<Pressable style={({ pressed }) => ({
    backgroundColor: pressed ? tonal.primary50 : tonal.primary15,
})}>
    <Text style={{ color: themeColor }}>按鈕</Text>
</Pressable>
```

**注意**：`theme.tonal` 基於 `themeColor`（已根據亮/暗模式調整色值）生成，天然支持暗色模式。

> 完整規範見 `.cursor/rules/tonal-color-system.mdc`

### Typography

All text components must use `uiStyle.defaultText` with scaled font sizes:

```javascript
import { uiStyle } from '../../components/ThemeContext';
import { scale } from 'react-native-size-matters';

style={{ ...uiStyle.defaultText, fontSize: scale(14), color: theme.black.main }}
```

### UI Scaling

ALWAYS use `react-native-size-matters` for responsive dimensions:

```javascript
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';

width: scale(100),        // horizontal scaling
height: verticalScale(50), // vertical scaling
fontSize: moderateScale(16) // font scaling
```

## Project-Specific Patterns

### React Navigation V7

本項目使用 React Navigation V7 穩定版本。

#### 導航結構

- **Main navigation**: `src/Nav.js` (stack navigator - `createNativeStackNavigator`)
- **Bottom tabs**: `src/Tabbar.js` (6 main tabs - `createNativeBottomTabNavigator`)
- New screens must be registered in BOTH `Nav.js` and `Tabbar.js`
- Modal vs card: card 動畫配置

#### 液態玻璃效果支持（iOS 26+）

使用 `isLiquidGlassSupported` 判斷是否支持液態玻璃樣式（來自 `@callstack/liquid-glass` 包）：

```javascript
import { isLiquidGlassSupported } from '@callstack/liquid-glass';

// Stack Navigator 配置
screenOptions={{
    headerTransparent: isLiquidGlassSupported,
    headerBlurEffect: isLiquidGlassSupported ? null : 'systemThinMaterial',
}}

// Tab Navigator 配置
translucent: isLiquidGlassSupported,

// ScrollView 內容區域
contentInsetAdjustmentBehavior={isLiquidGlassSupported ? null : "automatic"}
```

#### `LiquidGlassView` 組件

用於為獨立 UI 元素（如浮動按鈕、工具欄按鈕）添加液態玻璃效果：

```javascript
import { isLiquidGlassSupported, LiquidGlassView } from '@callstack/liquid-glass';

<LiquidGlassView
    interactive={true}
    hover={isLiquidGlassSupported ? { effect: 'highlight' } : null}
    style={{
        backgroundColor: isLiquidGlassSupported ? null : theme.white,
        borderRadius: scale(25),
        // ...
    }}
>
    <Pressable onPress={handlePress}>
        <Ionicons name="icon" color={theme.themeColor} size={scale(24)} />
    </Pressable>
</LiquidGlassView>
```

**`LiquidGlassView` 在不支持的平台上自動降級為普通 `View`**，但 `backgroundColor` 等視覺屬性需手動處理 fallback。

**已使用的文件**：`ARKImageView.js`、`ScrollToTopButton.js`、`UMEventDetail.js`

#### 液態玻璃使用原則

- ✅ **推薦場景**：導航欄、Tab Bar、浮動按鈕（FAB）、圖片查看器覆蓋層按鈕、工具欄
- ❌ **避免場景**：列表項/卡片內部、文字標籤、整個頁面背景、輸入框
- **每個頁面使用液態玻璃的元素應控制在 2-4 個關鍵交互點**

#### 原生按鈕適配

優先使用 React Navigation 提供的原生按鈕組件，iOS 26+ 自動適配液態玻璃樣式：

```javascript
import { Button, HeaderBackButton } from '@react-navigation/elements';

headerLeft: () => <HeaderBackButton onPress={navigation.goBack} />,
headerRight: () => <Button onPress={handleAction}>Action</Button>,
```

#### 禁止的平台檢測方式

```javascript
// ❌ 絕對禁止：使用 Platform 判斷版本
const isIOS26OrLater = Platform.OS === 'ios' && parseInt(Platform.Version, 10) >= 26;
```

**完整的液態玻璃設計規範見** `.cursor/rules/ios26-modern-design.mdc`

### State Management

- **MobX**: `src/mobx/index.js` (RootStore singleton)
- Stores `userInfo` only - access via `inject('RootStore')` or props
- All other state should be local to components or cached in AsyncStorage

### Storage (CRITICAL)

**NEVER use AsyncStorage directly**. Use `src/utils/storageKits.js`:

```javascript
import {
    getLocalStorage,
    setLocalStorage,
    handleLogin,
    handleLogout,
    updateUserInfo,
} from '../../utils/storageKits';

// Data persistence
await setLocalStorage('key', object);
const data = await getLocalStorage('key');

// Auth (restarts app via reloadAppAsync)
await handleLogin(userInfo);
await handleLogout();

// Live update without restart
await updateUserInfo(userInfo);
```

### Course Data Management

Bundled JSONs are **offline fallbacks**. Auto-update flow runs max once per 6h:

- **Storage keys**: `offer_courses`, `course_plan`, `course_plan_time`, `course_version`
- **Use helpers from** `src/utils/checkCoursesKits.js`:

    ```javascript
    import {
        getCourseData,
        needUpdate,
        saveCourseDataToStorage,
        checkCloudCourseVersion,
    } from '../../utils/checkCoursesKits';

    // Get current data (from bundle or cache)
    const courses = getCourseData('pre'); // or 'adddrop'
    ```

### API Calls

All endpoints defined in `src/utils/pathMap.js`:

```javascript
import {BASE_URI, BASE_HOST, GET, POST} from '../../utils/pathMap';

const response = await axios.get(BASE_URI + GET.CLUB_INFO_ALL);
// Note: BASE_URI includes trailing slash
```

### Utility Libraries

#### Lodash (^4.17.21)

Lodash is a utility library providing helper functions for common data manipulation tasks. **Always import as `lodash` (full import):**

```javascript
import lodash from 'lodash';
```

**Common Use Cases:**

| Method               | Description                | Example Usage                                          |
| -------------------- | -------------------------- | ------------------------------------------------------ |
| `lodash.isEqual()`   | Deep comparison of objects | `lodash.isEqual(obj1, obj2)`                           |
| `lodash.uniq()`      | Array deduplication        | `lodash.uniq(array)`                                   |
| `lodash.groupBy()`   | Group array by property    | `lodash.groupBy(array, 'property')`                    |
| `lodash.chain()`     | Chain operations           | `lodash.chain(array).filter().map().value()`           |
| `lodash.cloneDeep()` | Deep clone object          | `lodash.cloneDeep(object)`                             |
| `lodash.uniqBy()`    | Deduplicate by property    | `lodash.uniqBy(array, 'id')`                           |
| `lodash.sortBy()`    | Sort array by property     | `lodash.sortBy(array, 'name')`                         |
| `lodash.filter()`    | Filter array               | `lodash.filter(array, condition)`                      |
| `lodash.get()`       | Safe property access       | `lodash.get(object, 'path.to.property', defaultValue)` |

**Key Files Using Lodash:**
- `src/pages/TabbarPages/what2Reg/index.js` - Course data processing
- `src/pages/TabbarPages/info/home/index.js` - Home screen data handling

#### Moment.js (^2.30.1) and Moment-Timezone (^0.5.48)

Moment.js is used for date and time manipulation. For timezone support, use `moment-timezone`:

```javascript
import moment from 'moment';        // Basic import
import moment from 'moment-timezone'; // With timezone support
```

**Common Use Cases:**

| Method                | Description      | Example Usage                          |
| --------------------- | ---------------- | -------------------------------------- |
| `moment()`            | Initialize time  | `const now = moment()`                 |
| `moment().format()`   | Format date/time | `moment().format('MM-DD HH:mm')`       |
| `moment().isBefore()` | Time comparison  | `moment(date1).isBefore(date2)`        |
| `moment().isAfter()`  | Time comparison  | `moment(date1).isAfter(date2)`         |
| `moment().isSame()`   | Date comparison  | `moment(date1).isSame(date2, 'day')`   |
| `moment().diff()`     | Time difference  | `moment(date1).diff(date2, 'minutes')` |

**Key Files Using Moment.js:**
- `src/utils/checkCoursesKits.js` - Course version comparison
- `src/pages/TabbarPages/info/UMEventPage.js` - Event date handling
- `src/pages/TabbarPages/info/news/UMEventDetail.js` - Event detail formatting
- `src/pages/TabbarPages/what2Reg/index.js` - Course schedule time calculations

### Error Handling

**User-facing errors MUST show Alert or Toast**:

```javascript
try {
    // API call or operation
} catch (error) {
    Alert.alert(
        'Error Title',
        'Descriptive error message.\nPlease check network...',
        null,
        {cancelable: true},
    );
    // OR
    Toast.show({type: 'error', text1: 'Error', text2: 'Message'});
}
```

### Haptics

Call `trigger()` on all user interactions (button press, tab press):

```javascript
import { trigger } from '../../utils/trigger';

<Pressable onPress={() => { trigger(); handleAction(); }}>
```

### Firebase Analytics

Use `logToFirebase()` for analytics events:

```javascript
import {logToFirebase} from '../../utils/firebaseAnalytics';

logToFirebase('screen_view', {screen_name: 'ClubDetail'});
```

### List Rendering (FlashList)

**项目统一使用 `@shopify/flash-list` 的 `FlashList` 渲染长列表。**

#### 强制规范

- **新代码中列表渲染统一使用 `FlashList`**（来自 `@shopify/flash-list`）
- **禁止**在新代码中使用 `ScrollView` + `.map()`、`FlatList`、`VirtualizedList` 渲染长列表
- `renderItem` 函数必须用 `useCallback` 包裹以保持引用稳定
- 20 个以下的静态短列表可继续使用 `ScrollView` + `map`
- `BottomSheet` 内列表使用 `@gorhom/bottom-sheet` 的 `BottomSheetFlatList`（FlashList 与 BottomSheet 目前不兼容）

#### FlashList v2 特性

- **不需要 `estimatedItemSize`**：v2 自动处理尺寸
- **New Architecture 优化**：专为 Fabric 重写，性能提升 5-10 倍
- **View 回收**：复用列表项 View 而非销毁重建
- **API 兼容**：与 FlatList API 几乎相同，迁移成本低

#### 示例用法

```javascript
import { FlashList } from '@shopify/flash-list';

const MyList = ({ data }) => {
    // renderItem 必须用 useCallback 包裹
    const renderItem = useCallback(({ item }) => (
        <MyCard data={item} />
    ), []);

    return (
        <FlashList
            data={data}
            keyExtractor={item => item._id}
            renderItem={renderItem}
            drawDistance={500}
            ListHeaderComponent={<Header />}
            ListFooterComponent={<Footer />}
        />
    );
};
```

### Keyboard Handling (react-native-keyboard-controller)

本項目統一使用 `react-native-keyboard-controller` 處理鍵盤交互，提供 iOS 和 Android 一致的原生體驗。

#### 根級配置

`KeyboardProvider` 已在 `App.js` 根層包裹整個應用，無需在子組件中重複設置：

```javascript
// App.js
import { KeyboardProvider } from 'react-native-keyboard-controller';

<SafeAreaProvider>
    <KeyboardProvider>
        <Provider RootStore={RootStore}>
            {/* ... */}
        </Provider>
    </KeyboardProvider>
</SafeAreaProvider>
```

#### KeyboardAwareScrollView

替代 React Native 原生 `ScrollView`，自動處理鍵盤彈出時的滾動行為，確保聚焦的 `TextInput` 不被鍵盤遮擋：

```javascript
import { KeyboardAwareScrollView } from 'react-native-keyboard-controller';

<KeyboardAwareScrollView
    bottomOffset={50}
    keyboardDismissMode="on-drag"
    // 支持所有 ScrollView 原有屬性
    stickyHeaderIndices={[1]}
    contentInsetAdjustmentBehavior="never"
>
    {/* 頁面內容 */}
</KeyboardAwareScrollView>
```

**關鍵屬性：**

| 屬性 | 類型 | 說明 |
|------|------|------|
| `bottomOffset` | `number` | 鍵盤與聚焦輸入框之間的間距（默認 `0`） |
| `disableScrollOnKeyboardHide` | `boolean` | 鍵盤收起時禁止自動滾動（默認 `false`） |
| `enabled` | `boolean` | 啟用/禁用鍵盤感知（默認 `true`） |

#### KeyboardToolbar

在鍵盤上方顯示工具欄（上一個/下一個/完成），方便多個輸入框之間切換：

```javascript
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';

<KeyboardAwareScrollView bottomOffset={50}>
    <TextInput placeholder="輸入框 1" />
    <TextInput placeholder="輸入框 2" />
</KeyboardAwareScrollView>
<KeyboardToolbar />
```

#### 使用規範

- **包含 `TextInput` 的 `ScrollView`** 應替換為 `KeyboardAwareScrollView`
- **多個 `TextInput` 的頁面** 應搭配 `<KeyboardToolbar />` 使用
- `KeyboardAwareScrollView` 繼承所有 `ScrollView` 屬性，遷移成本極低
- 仍可使用 `Keyboard.dismiss()` 手動收起鍵盤

**已使用的文件**：`src/pages/TabbarPages/what2Reg/index.js`

### Internationalization (i18n)

#### 翻譯文件位置
- **英文翻譯**：`src/i18n/en-us.json`
- **繁體中文翻譯**：`src/i18n/zh-hk.js`

#### 使用規範

1. **命名空間**：`useTranslation` 可以設置多個命名空間：
   ```javascript
   import {useTranslation} from 'react-i18next';

   // 單個命名空間
   const {t} = useTranslation('common');

   // 多個命名空間
   const {t} = useTranslation(['common', 'home']);
   ```

2. **鍵名使用中文**：代碼中使用繁體中文作為鍵名：
   ```javascript
   // ✅ 正確：使用繁體中文鍵名
   t('資訊')
   t('設置')
   t('關於')

   // ❌ 錯誤：使用英文鍵名
   t('info')
   t('settings')
   ```

3. **en-us.json 結構**：英文翻譯文件中使用中文作為鍵名：
   ```json
   {
       "common": {
           "資訊": "Info",
           "設置": "Settings",
           "關於": "About"
       },
       "home": {
           "校園巴士": "Bus",
           "支持我們": "Donate"
       }
   }
   ```

4. **命名空間分組**：按功能模塊劃分命名空間：
   - `common` - 通用翻譯（按鈕、提示等）
   - `home` - 主頁相關
   - `about` - 關於頁
   - `setting` - 設置頁
   - `catalog` - 課表相關
   - `timetable` - 模擬課表
   - `features` - 服務功能
   - `club` - 組織相關
   - `wiki` - 百科
   - `harbor` - 職涯港

## 現代化 UI 設計目標（2026）

本項目正在進行現代化 UI 重構，目標是打造 2026 年流行的、現代化的移動應用界面。

### 設計方向

1. **Tonal Color System（色調配色）** — 主題色不再大面積實色使用，改用 `08`/`15`/`30`/`50` 透明度作背景，前景用原色，淡化視覺疲勞
2. **擁抱平台原生特性** — 特別是 iOS 26 液態玻璃（Liquid Glass）、原生導航按鈕等新特性
3. **優雅降級** — Android 和舊版 iOS 有合理的 fallback（模糊效果、實色背景等）
4. **材質層次感** — 用液態玻璃、模糊、Tonal 色調區分 UI 層級
5. **大圓角與柔和陰影** — 卡片圓角 `scale(12)` - `scale(16)`，陰影柔和
6. **留白與呼吸感** — 元素間距充足，避免擁擠
7. **動效自然** — 使用 `react-native-reanimated` 實現流暢過渡

### AI 助手行為準則

- **遇到 UI 改動需求時**，應主動考慮如何利用原生新特性提升體驗
- **配色調整或布局重構**，必須先與用戶討論方案再實施
- **發現現有顏色不滿足設計目標時**，應主動提議在 ThemeContext 中新增顏色
- **小幅優化**（間距、圓角、字重調整）可直接實施，無需額外討論

### 配色方案演進流程

當需要引入新配色時：

1. **說明需求**：為什麼現有顏色不滿足
2. **提供方案**：新顏色的亮色/暗色值
3. **對比展示**：與現有配色的協調性
4. **用戶確認後**：在 `ThemeContext.js` 的 `getColorDiy` 中添加

---

## Gotchas & Critical Don'ts

### Critical Don'ts

- ❌ **NEVER** use AsyncStorage directly - always use `storageKits.js` helpers
- ❌ **NEVER** write to `offer_courses`, `course_plan`, `course_plan_time` keys directly - use `checkCoursesKits.js`
- ❌ **NEVER** remove bundled JSONs - they're offline fallbacks
- ❌ **NEVER** use hardcoded colors or legacy color imports - always use `useTheme()` from `ThemeContext` for dark mode support
- ❌ **NEVER** forget `trigger()` on interactive elements
- ❌ **NEVER** suppress type errors with `as any`, `@ts-ignore`, `@ts-except-error`
- ❌ **NEVER** use hardcoded color values (e.g., `'rgba(255,255,255,0.2)'`) - always use ThemeContext colors
- ❌ **NEVER** use `TouchableOpacity` series in new code - use `Pressable` instead (migrate legacy code during refactoring)
- ❌ **NEVER** use `FlatList` / `VirtualizedList` / `ScrollView` + `.map()` for lists with 20+ items - use `FlashList` from `@shopify/flash-list`（BottomSheet 内除外）

### Setup Requirements

- **iOS**: Requires Xcode 10+ and Expo CNG will manage CocoaPods automatically
- **Android**: Requires API 31 or 33 emulator
- **Firebase config**: `android/app/google-services.json` and `ios/GoogleService-Info.plist`
- **API Token**: `umAPIToken.json` in root with `{"token":"YOUR_UM_API_TOKEN"}`

## File Structure Reference

```
src/
├── components/          # Reusable UI components
├── pages/
│   ├── TabbarPages/    # Main tab screens
│   ├── ClubSystem/     # Club-related screens
│   └── Features/       # Feature pages
├── utils/
│   ├── storageKits.js  # AsyncStorage wrappers
│   ├── pathMap.js      # API endpoint constants
│   ├── uiMap.js        # Legacy color constants (AVOID)
│   └── ...
├── mobx/
│   └── index.js        # MobX RootStore
├── static/
│   ├── UMCourses/      # Bundled course JSONs (offline fallbacks)
│   └── UMARK_Assets/   # Images, icons, etc.
└── i18n/
    ├── en-us.js        # English translations
    └── zh-hk.js        # Traditional Chinese translations
```

---

## Agent Memory Management

### 讀取在線文檔後的記錄規範

每次從網絡讀取技術文檔（如 React Navigation、Expo 等官方文檔）後，**必須**將關鍵信息記錄到 **Serena MCP Memory** 中。

#### 為什麼使用 Serena MCP？

| 特性 | Serena MCP | Memory-Keeper |
|------|-----------|---------------|
| 存儲內容 | 項目文檔、技術規範 | 會話狀態、臨時筆記 |
| 持久性 | ⭐⭐⭐ 高（文件形式） | ⭐⭐ 中等 |
| 與代碼關聯 | ✅ 同層級，易關聯 | ❌ 獨立存儲 |
| 適合 | 長期參考的文檔用法 | 動態變化的會話信息 |

**結論**：技術文檔屬於項目知識庫，使用 Serena MCP 更合適。

#### 記錄流程

```
1. 讀取在線文檔 (fetch/fetch 或 web_search)
   ↓
2. 提取關鍵信息（核心概念、API 用法、注意事項）
   ↓
3. 創建/更新 Serena Memory 文件
   ↓
4. 記錄本次學習的內容摘要到 Memory-Keeper（可選）
```

#### Serena Memory 文件命名規範

```
<技術名稱>_<主題>_v<版本>.md

示例：
- react_navigation_v7_static_api.md
- expo_sdk_54_cng_workflow.md
- mobx_v6_store_patterns.md
```

#### 文件內容模板

```markdown
# [技術名稱] [主題]

## 來源
- **文檔 URL**: [原始文檔鏈接]
- **讀取時間**: [日期]
- **版本**: [文檔版本號]

## 核心概念

### 1. [概念名稱]
簡要說明...

```javascript
// 代碼示例
const example = () => {
    // 實際用法
};
```

### 2. [概念名稱]
...

## 本項目應用

### 當前使用方式
```javascript
// src/[文件路徑]
// 實際代碼片段
```

### 注意事項
- ⚠️ [重要提醒]
- ✅ [最佳實踐]
- ❌ [避免的做法]

## 相關鏈接
- [官方文檔]
- [相關教程]
- [GitHub Issues]

---

## 更新日誌

### [日期] - 初始記錄
- 創建本文檔
- 記錄 [主要內容]
```

#### 實際操作示例

**場景**：讀取 React Navigation V7 官方文檔後

```javascript
// 步驟 1: 讀取文檔
const docContent = await fetch('https://reactnavigation.org/docs/getting-started/');

// 步驟 2: 提取關鍵信息
const keyPoints = {
    staticAPI: '使用對象配置而非 JSX',
    dynamicAPI: '使用 React 組件，支持運行時變化',
    recommended: 'Static API 是推薦方式'
};

// 步驟 3: 創建 Serena Memory 文件
await writeMemory({
    file_name: 'react_navigation_v7_static_api.md',
    content: `
# React Navigation V7 Static API

## 來源
- **文檔 URL**: https://reactnavigation.org/docs/getting-started/
- **讀取時間**: 2026-02-05
- **版本**: V7

## 核心概念

### Static Configuration（推薦）
使用對象配置，減少樣板代碼，簡化 TypeScript 類型和深度鏈接。

\`\`\`javascript
const Stack = createNativeStackNavigator({
    screens: {
        Home: HomeScreen,
        Profile: ProfileScreen,
    },
});
\`\`\`

### Dynamic Configuration
使用 React 組件，支持運行時根據 state 或 props 變化。

## 本項目應用

### 當前使用方式
見 \`src/Nav.js\` 和 \`src/Tabbar.js\`

### 注意事項
- ✅ 本項目使用 Static API
- ⚠️ 如需動態靈活性，可混合使用兩種配置
    `
});

// 步驟 4: 記錄到 Memory-Keeper（可選）
await contextSave({
    key: 'rn_v7_learned_today',
    value: '學到：Static API 使用對象配置而非 JSX',
    category: 'note'
});
```

---

## 記憶管理最佳實踐

### 何時使用 Serena MCP

✅ **推薦使用**:
- 技術文檔的核心用法和 API 參考
- 項目架構決策和設計模式
- 代碼規範和最佳實踐
- 第三方庫的版本信息和遷移指南

❌ **不推薦使用**:
- 臨時的會話狀態
- 頻繁變更的進度信息
- 一次性的調試記錄

### 何時使用 Memory-Keeper

✅ **推薦使用**:
- 當前任務的進度追蹤
- 本次會話完成的工作摘要
- 遇到的錯誤和解決方案
- 臨時的筆記和想法

❌ **不推薦使用**:
- 需要長期保存的技術知識
- 項目的核心文檔

### 記憶文件維護

1. **定期回顧**: 每月檢查一次記憶文件，刪除過時信息
2. **版本控制**: 重大更新時在文件頂部添加更新日誌
3. **交叉引用**: 相關記憶文件之間添加鏈接
4. **保持簡潔**: 只記錄核心信息，避免冗長

---

**記住：Serena MCP 是你的項目知識庫，Memory-Keeper 是你的會議記錄本。根據內容的性質選擇合適的工具，才能建立高效的記憶管理系統。**

---

## 工具使用注意事項

### Filesystem MCP 工具

#### `mcp__filesystem__read_text_file` 注意事項
- **`head` 和 `tail` 參數不能同時使用**：同時指定 `head` 和 `tail` 會報錯 `Cannot specify both head and tail parameters simultaneously`。如果需要同時限制頭尾，建議先讀取整個文件後再自行處理。

#### 錯誤處理策略
- 如果 filesystem MCP 工具遇到持續性錯誤無法正常工作，可以回退使用默認的讀寫工具（如 `Read`、`Edit`、`Write` 等）作為備選方案。
