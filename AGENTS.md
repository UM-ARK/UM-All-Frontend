# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Project Overview
- **Type**: React Native mobile application for University of Macau students
- **Name**: ARK ALL
- **Version**: 26.1.0
- **Target Platforms**: iOS, Android

## Build/Lint/Test Commands
- Install dependencies: `npm i --legacy-peer-deps` (due to peer dependency conflicts)
- iOS simulator: `npm run ios` (iPhone 16 Pro), `npm run iosNew` (iPhone 17 Pro), `npm run iosBig` (iPad Pro)
- Android: `npm run android`
- Lint: `npm run lint` (extends @react-native ESLint config)
- Test: `npm run test` (Jest with react-native preset)

## Code Style Guidelines
- Prettier config: singleQuote: true, trailingComma: 'all', tabWidth: 4, arrowParens: 'avoid'
- ESLint: extends @react-native rules
- File structure:
  - Main entry: `App.js`
  - Navigation: `src/Nav.js` (stack navigator), `src/Tabbar.js` (bottom tabs)
  - Pages: `src/pages/` (organized by feature)
  - Components: `src/components/` (reusable UI)
  - Utilities: `src/utils/` (helper functions)
  - Static data: `src/static/` (JSON files, images, etc.)
  - State management: `src/mobx/index.js` (MobX store)

## Project-Specific Patterns
- Theme management: Use `src/components/ThemeContext.js` for light/dark mode
- Storage: Use `src/utils/storageKits.js` (wrapper around AsyncStorage)
- API integration: Requires `umAPIToken.json` file in root with {"token":"YOUR_TOKEN"}
- Analytics: Uses Firebase Analytics via `src/utils/firebaseAnalytics.js`
- UI scaling: Uses react-native-size-matters (scale() and verticalScale() functions)
- i18n: Uses i18next with translations in `src/i18n/`

## Testing
- Jest with React Native preset
- Test files in __tests__ directory (e.g., App.test.tsx)
- No specific test utilities beyond standard React Native testing library

## Gotchas
- iOS requires CocoaPods installation: `cd ios && pod install --repo-update`
- Android requires API 31 or 33 emulator
- Firebase config files needed: `android/app/google-services.json` and `ios/GoogleService-Info.plist`
- First run requires umAPIToken.json file in project root
