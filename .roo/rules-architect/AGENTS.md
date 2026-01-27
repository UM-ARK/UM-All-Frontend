# Project Architecture Rules (Non-Obvious Only)

## Core Architecture
- **Monolithic Single-File Entry**: `App.js` handles initialization, theme setup, and MobX store injection
- **Navigation Structure**: Stack navigator (`src/Nav.js`) with modal and card animation groups
- **Tabbed Interface**: Animated bottom tab bar at `src/Tabbar.js` with 6 main sections

## State Management
- **Simple MobX Store**: `src/mobx/index.js` with single observable `userInfo`
- **Reactivity**: Components wrapped with `inject('RootStore')` and use `@observer` decorator
- **Persistence**: AsyncStorage used to persist user info with `src/utils/storageKits.js`

## Theme System
- **Context-Based**: `src/components/ThemeContext.js` provides theme to all components
- **Light/Dark Mode**: Detects device color scheme and applies custom theme colors
- **Responsive Design**: Uses react-native-size-matters (scale/verticalScale functions)

## Data Flow
1. **Initialization**: `App.js` loads user info and checks course data version
2. **Course Updates**: Cloud version checking every 6 hours (`src/utils/checkCoursesKits.js`)
3. **Storage**: AsyncStorage wrapper manages data persistence
4. **API Calls**: Require valid token from `umAPIToken.json` file in root

## Key Constraints
- **API Dependency**: Requires valid UM API token in `umAPIToken.json`
- **Firebase Integration**: Analytics and crash reporting require config files
- **Platform Specifics**: iOS navigation uses modal animations, Android uses card
- **Course Data**: Static data in `src/static/UMCourses/` with version tracking

## Performance Considerations
- **Metro Cache**: First run may require cache reset for proper module resolution
- **Image Optimization**: Use `expo-image` or native image components for best performance
- **Bundle Size**: Remove unused dependencies and optimize static assets

## Maintainability Patterns
- **Centralized Navigation**: All routes in `src/Nav.js` for easy management
- **Reusable Components**: Styled-components in `src/components/` with theme support
- **Utility Functions**: Centralized utils in `src/utils/` with clear responsibilities
