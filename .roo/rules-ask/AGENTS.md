# Project Documentation Rules (Non-Obvious Only)

## Project Overview
- **Purpose**: Free open-source mobile app for University of Macau students
- **Version**: 26.1.0
- **App Store Links**: iOS (1636670554), Android (one.umall)

## Key Features
1. **Information Hub**: News, events, club details, UM calendar
2. **Course Management**: What2Reg (course search), course simulation
3. **Campus Services**: Bus routes, car park info, lost & found, UM organizations
4. **Community**: ARK Harbor (career hub), ARK Wiki (encyclopedia)

## Architecture Context
- **Main Entry**: `App.js` initializes MobX store, theme, and navigation
- **Navigation**: Stack navigator (`src/Nav.js`) with modal and card animations
- **Tabbar**: Animated bottom tabs at `src/Tabbar.js` with 6 main sections

## Data Management
- **Static Data**: `src/static/` contains course info, calendar, app config
- **Course Updates**: Uses cloud version checking (`src/utils/checkCoursesKits.js`) with 6-hour interval
- **Storage**: AsyncStorage wrapper at `src/utils/storageKits.js`

## Critical Dependencies
- React Native 0.79.6 with Expo 53.0.0
- MobX for state management
- i18next for localization (zh-hk, en-us)
- react-native-size-matters for responsive design

## Gotchas & Limitations
- Requires `umAPIToken.json` file in root for API calls
- iOS development restricted to macOS
- Firebase config files must be present for analytics
- First run may fail without clearing Metro cache
