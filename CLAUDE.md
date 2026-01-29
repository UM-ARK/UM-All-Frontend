```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

## Project Overview

- **Type**: React Native 0.79.6 mobile application for University of Macau students using Expo CNG (Continuous Native Generation)
- **Name**: ARK ALL
- **Version**: 26.1.0
- **Target Platforms**: iOS, Android
- **Architecture**: Offline-first with Cloudflare Workers API, 6h auto-update cycle

## Build/Lint/Test Commands

- Install dependencies: `yarn install` (Node ≥18 required)
- iOS simulator: `yarn ios` (iPhone 16 Pro), `yarn iosNew` (iPhone 17 Pro), `yarn iosBig` (iPad Pro), `yarn iosTrue` (physical device)
- Android: `yarn android` (requires API 31 or 33 emulator)
- Lint: `yarn lint` (ESLint extends @react-native config)
- Run all tests: `yarn test`
- Run single test: `yarn test -- --testPathPattern=App.test.tsx` or `yarn test -- <test-file-path>`
- Start Metro: `yarn start` (with --reset-cache flag: `react-native start --reset-cache`)

## Expo CNG (Continuous Native Generation)

This project uses Expo's Continuous Native Generation (CNG) workflow. Key points:

1. **No manual pod install needed**: Expo CNG manages iOS dependencies automatically
2. **Native files are generated**: iOS and Android native project files are generated from app config
3. **Configuration in app.json**: Most native settings are configured in app.json
4. **Expo Development Builds**: Use `expo run:ios` or `expo run:android` to create development builds

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

**MUST use ThemeContext for light/dark mode support**:

```javascript
import {useTheme} from '../../components/ThemeContext';

const {theme} = useTheme();
// Access: theme.themeColor, theme.black.main, theme.bg_color, theme.viewShadow, etc.
```

**AVOID**: `COLOR_DIY` from `uiMap.js` (legacy, breaks dark mode)

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

### Navigation Structure

- **Main navigation**: `src/Nav.js` (stack navigator)
- **Bottom tabs**: `src/Tabbar.js` (6 main tabs using AnimatedTabBarNavigator)
- New screens must be registered in BOTH `Nav.js` and `Tabbar.js`
- Modal vs card transitions configured per-platform

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

// Auth (restarts app via RNRestart)
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

<TouchableOpacity onPress={() => { trigger(); handleAction(); }}>
```

### Firebase Analytics

Use `logToFirebase()` for analytics events:

```javascript
import {logToFirebase} from '../../utils/firebaseAnalytics';

logToFirebase('screen_view', {screen_name: 'ClubDetail'});
```

### Internationalization (i18n)

Add translations to `src/i18n/en-us.js` and `src/i18n/zh-hk.js`:

```javascript
import {useTranslation} from 'react-i18next';

const {t} = useTranslation(['namespace']);
console.log(t('namespace:key'));
```

## Gotchas & Critical Don'ts

### Critical Don'ts

- ❌ **NEVER** use AsyncStorage directly - always use `storageKits.js` helpers
- ❌ **NEVER** write to `offer_courses`, `course_plan`, `course_plan_time` keys directly - use `checkCoursesKits.js`
- ❌ **NEVER** remove bundled JSONs - they're offline fallbacks
- ❌ **NEVER** use `COLOR_DIY` from `uiMap.js` - use `useTheme()` for dark mode support
- ❌ **NEVER** forget `trigger()` on interactive elements
- ❌ **NEVER** suppress type errors with `as any`, `@ts-ignore`, `@ts-except-error`

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
