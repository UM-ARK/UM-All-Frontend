# Copilot Instructions for UM-All-Frontend

## Project Overview
React Native 0.79 university app combining local course data, real-time UM APIs, and community features (Wiki/Harbor). The app prioritizes offline-first with cached fallbacks and auto-updates every 6h from Cloudflare Workers.

## Architecture & Data Flow

**Entry Point**: [App.js](../App.js) bootstraps with:
1. AnimatedSplash → ThemeProvider → i18n init
2. AsyncStorage hydration of `userInfo` into MobX `RootStore`
3. Course version check (compares bundled JSON vs cached vs remote)
4. Language prompt if first launch (defaults to system language or `en`)
5. Firebase device model reporting via `getPreciseDeviceName()`

**Navigation**: [Nav.js](../src/Nav.js) defines stack navigator; [Tabbar.js](../src/Tabbar.js) defines 6 main tabs using `AnimatedTabBarNavigator`. New screens must be registered here. Modal vs card transitions configured per-platform.

**State Management**: MobX `RootStore` (singleton) stores `userInfo` only. Access via `inject('RootStore')` or props. All other state is local to components or cached in AsyncStorage.

**Course Data Strategy** (critical to understand):
- Bundled JSONs in [src/static/UMCourses](../src/static/UMCourses) are offline fallbacks
- On launch: compare bundled `courseVersion` → cached `course_version` → remote (Cloudflare Workers `/version` API)
- Auto-update flow triggered max once per 6h (stored in `last_version_check_timestamp`)
- ALWAYS use helpers: `getCourseData('pre'|'adddrop')`, `needUpdate()`, `saveCourseDataToStorage()` from [checkCoursesKits.js](../src/utils/checkCoursesKits.js)
- Storage keys: `offer_courses` (pre-enroll), `course_plan` (add/drop), `course_plan_time` (timetable), `course_version` (metadata)

## Developer Workflows

**Setup**:
1. Clone repo, `npm i --legacy-peer-deps` (Node ≥18 required)
2. Create `umAPIToken.json` at root: `{"token":"YOUR_UM_API_TOKEN"}`
3. iOS: `cd ios && pod install --repo-update`, then `npm run ios`
4. Android: Launch emulator (API 31/33), `npm run android`

**Debug**:
- Metro hotkey `j` opens React DevTools (RN 0.77+)
- Chrome: `chrome://inspect` → find "React Native Experimental"
- Firebase Analytics: Enable debug mode (see README), view in Firebase Console DebugView

**Build**:
- iOS: Xcode → `UMALL.xcworkspace` → bump Version/Build → Archive → Distribute
- Android: `cd android && gradlew bundleRelease` (needs `.jks` keystore in `android/app`)

## Coding Conventions

**Theming**: Use `useTheme()` hook from [ThemeContext.js](../src/components/ThemeContext.js). Avoid `COLOR_DIY` from [uiMap.js](../src/utils/uiMap.js) (legacy). Pattern:
```javascript
const { theme } = useTheme();
// theme.themeColor, theme.black.main, theme.bg_color, theme.viewShadow, etc.
```

**Typography**: All text uses `uiStyle.defaultText` + size scaling:
```javascript
style={{ ...uiStyle.defaultText, fontSize: scale(14), color: theme.black.main }}
```

**Icons**: MaterialCommunityIcons with focused/blur variants. Size via `scale()/verticalScale()` and `Dimensions` checks for landscape.

**Storage**: NEVER use AsyncStorage directly. Use [storageKits.js](../src/utils/storageKits.js):
- `setLocalStorage(key, obj)` / `getLocalStorage(key)` for data persistence
- `handleLogin(userInfo)` / `handleLogout()` both restart the app via `RNRestart`
- `updateUserInfo(userInfo)` for live updates without restart

**Error Handling**: User-facing errors MUST show via `Alert.alert()` or `Toast.show()`. Example pattern from checkCoursesKits:
```javascript
try { /* API call */ } 
catch (error) {
    Alert.alert('', 'Descriptive error!\nPlease check network...', null, { cancelable: true });
}
```

**Haptics**: Call `trigger()` from [utils/trigger.js](../src/utils/trigger.js) on user interactions (tab press, button press). Defaults to `'soft'` method.

**Firebase Analytics**: Use `logToFirebase(eventName, {})` from [firebaseAnalytics.js](../src/utils/firebaseAnalytics.js). Already wired into tab presses.

**API Calls**: All endpoints in [pathMap.js](../src/utils/pathMap.js). Use constants like `BASE_URI + GET.CLUB_INFO_ALL` or `COURSE_API_CF_WORKERS + '/pre'`. Axios is pre-configured; base paths need trailing slashes.

**i18n**: Add translations to [i18n/en-us.js](../src/i18n/en-us.js) and [i18n/zh-hk.js](../src/i18n/zh-hk.js) with namespaces (e.g., `common`, `about`). Use `useTranslation(['namespace'])` hook.

## Critical Don'ts
- ❌ Don't remove bundled JSONs—they're offline fallbacks
- ❌ Don't write to AsyncStorage keys `offer_courses`, `course_plan`, `course_plan_time` directly—use helpers
- ❌ Don't extend [ClubSystem](../src/pages/ClubSystem) native flows (deprecated, use web)
- ❌ Don't hardcode colors—use ThemeContext for light/dark support
- ❌ Don't modify navigation structure without updating both Nav.js and Tabbar.js
- ❌ Don't forget `trigger()` on new interactive elements

## Platform-Specific Notes
- iOS builds require Xcode workspace (`.xcworkspace`), not project file
- Android APK signing needs `.jks` file in `android/app` (not in repo)
- iOS modal transitions differ on iPad (use `card` instead)
- Header component has `iOSDIY` prop for iOS-specific close button on modals
- Firebase config files: `android/app/google-services.json` and `ios/GoogleService-Info.plist`
