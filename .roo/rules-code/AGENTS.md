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

## 搜索最佳實踐
當你需要搜索代碼內容時，**絕對禁止**使用 `grep` 或 `find` 等 Shell 命令。
**必須優先使用 `search_files` 工具**。

原因：
1. `search_files` 基於 ripgrep，速度更快。
2. 它會自動忽略 .git 和 node_modules，避免無效輸出。
3. 它能提供更好的上下文格式供你閱讀。

僅當 `search_files` 無法滿足特殊正則需求時，才允許降級使用 `execute_command`。
