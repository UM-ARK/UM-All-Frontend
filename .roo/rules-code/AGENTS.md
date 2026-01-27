# Project Coding Rules (Non-Obvious Only)

## Architecture & File Structure
- Main entry point: `App.js` initializes MobX store, theme context, and navigation
- Navigation: `src/Nav.js` (stack navigator) and `src/Tabbar.js` (bottom tabs with animated transitions)
- State management: Simple MobX store at `src/mobx/index.js` with userInfo observable
- Theme system: `src/components/ThemeContext.js` provides light/dark mode with custom theme colors

## Key Utilities & Patterns
- Storage: Use `src/utils/storageKits.js` wrapper around AsyncStorage instead of direct access
- UI scaling: Must use `scale()` and `verticalScale()` from react-native-size-matters for responsive design
- Analytics: Track events via `src/utils/firebaseAnalytics.js` (Firebase Analytics)
- Localization: Use i18next with translations in `src/i18n/` (zh-hk and en-us)
- Course data management: `src/utils/checkCoursesKits.js` handles course version checking and updates

## Component Development
- All pages must be registered in `src/Nav.js` for navigation
- Modal screens should be placed in the Modal animation group in `src/Nav.js`
- Use `src/components/ThemeContext.js` hook to access theme colors
- Prefer styled-components for styling (already in dependencies)

## Data Management
- Static course data: `src/static/UMCourses/` contains course plan and version info
- Course versioning: Check `src/utils/checkCoursesKits.js` for update logic
- Storage keys: Use constants defined in utils files for consistency

## Gotchas
- Must have `umAPIToken.json` file in root with valid API token for API calls
- iOS requires CocoaPods installation: `cd ios && pod install --repo-update`
- Android requires API 31 or 33 emulator for development
- First run may require clearing Metro cache: `npm start -- --reset-cache`
