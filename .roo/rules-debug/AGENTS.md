# Project Debug Rules (Non-Obvious Only)

## Debugging Environment Setup
- Android: Must use API 31 or 33 emulator
- iOS: Simulator versions specified in package.json scripts (iPhone 16 Pro, 17 Pro, iPad Pro)
- First run may require clearing Metro cache: `npm start -- --reset-cache`

## Logging & Debugging
- Chrome DevTools: Access via `chrome://inspect` → Remote Target → React Native Experimental
- React DevTools: Use `j` command in Metro terminal (RN 0.77+) or `sh debug.sh` (npx react-devtools)
- Console logs: Appear in Metro terminal or browser DevTools
- Firebase Analytics DebugView: Enable debug mode to see real-time events (1min delay)

## Common Debug Scenarios
- **App initialization errors**: Check async storage, API token, and course data loading
- **Course data issues**: Verify `umAPIToken.json` and check `src/utils/checkCoursesKits.js`
- **Navigation problems**: Ensure screens are registered in `src/Nav.js`
- **Theme issues**: Check `src/components/ThemeContext.js` and useColorScheme() hook

## Key Files for Debugging
- `App.js`: Initialization, theme setup, course data loading
- `src/utils/checkCoursesKits.js`: Course version checking and update logic
- `src/utils/storageKits.js`: Async storage wrapper
- `src/mobx/index.js`: State management
