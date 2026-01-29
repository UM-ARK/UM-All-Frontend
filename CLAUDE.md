```
# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.
```

## Available Skills and MCP Tools

### Recommended Skills for This Project

#### React Native / Expo Development
- **react-native-expert**: Building cross-platform mobile applications with React Native/Expo, navigation patterns, platform-specific code
- **expo-app-design:building-native-ui**: Building beautiful apps with Expo Router, styling, components, navigation, animations
- **expo-app-design:native-data-fetching**: Implementing/debugging network requests, API calls, data fetching with fetch API, axios, etc.
- **upgrading-expo:upgrading-expo**: Upgrading Expo SDK versions and fixing dependency issues
- **expo-deployment:expo-deployment**: Deploying to iOS App Store, Android Play Store, web hosting, and API routes
- **react-native-best-practices**: React Native performance optimization guidelines for FPS, TTI, bundle size, memory leaks, re-renders, and animations

#### General Development Skills
- **fullstack-dev-skills:react-expert**: React 18+ component architecture, hooks patterns, and state management
- **fullstack-dev-skills:javascript-pro**: Modern JavaScript (ES2023+) async patterns and Node.js development
- **fullstack-dev-skills:code-reviewer**: Code review, quality audits, and security vulnerability identification
- **fullstack-dev-skills:debugging-wizard**: Error investigation, stack trace analysis, and root cause location
- **fullstack-dev-skills:test-master**: Writing tests, creating test strategies, and building automation frameworks

#### Project-Specific Skills
- **fullstack-dev-skills:feature-forge**: Defining new features, gathering requirements, and writing specifications
- **fullstack-dev-skills:architecture-designer**: Designing system architecture and reviewing existing designs
- **fullstack-dev-skills:legacy-modernizer**: Modernizing legacy systems and implementing incremental migration strategies
- **fullstack-dev-skills:spec-miner**: Understanding legacy/undocumented systems and creating documentation

### Available MCP Tools

#### Code Operations
- **mcp__filesystem__read_text_file**: Read code file contents
- **mcp__filesystem__read_multiple_files**: Read multiple files simultaneously
- **mcp__filesystem__edit_file**: Edit file contents with precise changes
- **mcp__filesystem__write_file**: Create or overwrite files (use with caution)
- **mcp__filesystem__list_directory**: List directory contents
- **mcp__filesystem__search_files**: Recursively search for files

#### Knowledge Management
- **mcp__memory__create_entities**: Create entities in knowledge graph
- **mcp__memory__create_relations**: Create relations between entities
- **mcp__memory__add_observations**: Add observations to existing entities
- **mcp__memory__search_nodes**: Search for nodes in knowledge graph
- **mcp__memory__read_graph**: Read the entire knowledge graph

#### Documentation Query
- **mcp__plugin_context7_context7__resolve-library-id**: Resolve library name to Context7-compatible library ID
- **mcp__plugin_context7_context7__query-docs**: Query library documentation and code examples

#### Web Operations
- **mcp__fetch__fetch**: Fetch URL content from internet and extract as Markdown

### Usage Recommendations

1. **Development Tasks**: Prioritize `react-native-expert` and `expo-app-design` series skills for UI development and navigation
2. **Data Handling**: Use `expo-app-design:native-data-fetching` for API calls and data management
3. **Debugging**: Use `fullstack-dev-skills:debugging-wizard` to locate and fix issues
4. **Testing**: Use `fullstack-dev-skills:test-master` to write and run tests
5. **Code Quality**: Use `fullstack-dev-skills:code-reviewer` to ensure code quality

### File Operation Best Practices
- Use `mcp__filesystem__read_text_file` to read source files
- Use `mcp__filesystem__edit_file` for precise modifications
- Avoid directly using `Write` tool to overwrite existing files unless absolutely necessary

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
