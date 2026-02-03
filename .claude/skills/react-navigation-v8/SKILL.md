---
name: react-navigation-v8
description: This skill provides comprehensive knowledge and guidance for React Navigation 8.x, including installation, configuration, navigation patterns, API usage, troubleshooting, and migration from previous versions. Use this skill when working with React Native navigation, setting up or configuring navigators, implementing navigation flows, handling deep linking, or upgrading from React Navigation 7.x.
---

# React Navigation V8

React Navigation V8 is the latest major version of the standard routing and navigation solution for React Native apps. This skill provides comprehensive documentation and best practices for implementing, configuring, and troubleshooting navigation in React Native applications.

## Overview

React Navigation V8 introduces several new features and improvements:

- **Native Bottom Tabs**: Default native implementation for bottom tabs (iOS 26+ liquid glass effect)
- **Improved TypeScript Support**: Better type inference and type checking
- **Simplified State Persistence**: New `persistor` prop for easier state management
- **Enhanced Deep Linking**: Better support for conditional screens and complex routing
- **iOS 26+ Features**: Native navigation with liquid glass and other iOS-specific enhancements

## Installation

### Minimum Requirements

- `react-native` >= 0.81
- `expo` >= 54 (development build required)
- `typescript` >= 5.9.2 (if using TypeScript)
- `react-native-web` >= 0.21.0 (if supporting Web)

### Install Core Package

```bash
npm install @react-navigation/native@next
```

### Install Dependencies

For Expo:
```bash
npx expo install react-native-screens react-native-safe-area-context @callstack/liquid-glass
```

For Community CLI:
```bash
npm install react-native-screens react-native-safe-area-context @callstack/liquid-glass
npx pod-install ios  # iOS only
```

### Android Configuration

**MainActivity.kt/MainActivity.java**: Add `RNScreensFragmentFactory()`

```kotlin
import android.os.Bundle
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory

class MainActivity: ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
  }
}
```

**AndroidManifest.xml**: Disable predictive back

```xml
<application
  android:enableOnBackInvokedCallback="false"
>
```

## Core Concepts

### NavigationContainer

The root container that wraps the entire navigation structure:

```javascript
import { NavigationContainer } from '@react-navigation/native';

function App() {
  return (
    <NavigationContainer>
      {/* Navigators and screens here */}
    </NavigationContainer>
  );
}
```

### Static vs Dynamic Configuration

React Navigation V8 supports both static and dynamic configuration APIs:

**Static Configuration** (Recommended for most apps):
```javascript
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);
```

**Dynamic Configuration** (Legacy):
```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

### Navigation Object

Access the navigation prop in screen components to navigate:

```javascript
function ProfileScreen({ navigation }) {
  return (
    <Button
      title="Go to Home"
      onPress={() => navigation.navigate('Home')}
    />
  );
}

// Or use hooks
import { useNavigation } from '@react-navigation/native';

function ProfileScreen() {
  const navigation = useNavigation();
  // ...
}
```

## Available Navigators

### Stack Navigator

Provides standard stack-based navigation with push/pop transitions.

**Installation**:
```bash
npm install @react-navigation/native-stack@next
```

**Usage**:
```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Details: DetailsScreen,
  },
});
```

### Native Stack Navigator

Native implementation using native navigation APIs for better performance.

**Installation**: Same as Stack Navigator (uses same package)

**Features**:
- Native transitions (slide, fade, none)
- Native gestures for swipe-back
- Better performance than JS-based stack

### Bottom Tabs Navigator

Bottom tab navigation with native support for iOS 26+.

**Installation**:
```bash
npm install @react-navigation/bottom-tabs@next
```

**Usage** (Native - Default):
```javascript
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tabs = createBottomTabNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
});
```

**Custom Implementation**:
```javascript
const Tabs = createBottomTabNavigator({
  implementation: 'custom', // Use JS implementation
  screens: { /* ... */ },
});
```

### Drawer Navigator

Side drawer navigation with swipe gesture support.

**Installation**:
```bash
npm install @react-navigation/drawer@next
```

**Usage**:
```javascript
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

### Material Top Tabs Navigator

Material Design-style top tab navigation with swipeable content.

**Installation**:
```bash
npm install @react-navigation/material-top-tabs@next
```

**Usage**:
```javascript
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

const TopTabs = createMaterialTopTabNavigator({
  screens: {
    Tab1: Tab1Screen,
    Tab2: Tab2Screen,
  },
});
```

## Navigation Patterns

### Navigating Between Screens

```javascript
// Navigate to screen
navigation.navigate('Profile');

// Navigate with params
navigation.navigate('Profile', { userId: 123 });

// Push (add to stack)
navigation.push('Details', { itemId: 42 });

// Go back
navigation.goBack();

// Replace current screen
navigation.replace('Home');

// Pop to top
navigation.popToTop();
```

### Reading Route Params

```javascript
import { useRoute } from '@react-navigation/native';

function ProfileScreen() {
  const route = useRoute();
  const { userId } = route.params;
  // OR
  const params = useRoute().params;
}
```

### Updating Header Options

```javascript
function ProfileScreen({ navigation }) {
  navigation.setOptions({
    title: 'My Profile',
    headerRight: () => <Button onPress={() => alert('Menu')} title="Menu" />,
  });
}
```

### Nested Navigators

Screens can contain nested navigators:

```javascript
const Tabs = createBottomTabNavigator({
  screens: {
    Home: createNativeStackNavigator({
      screens: {
        Feed: FeedScreen,
        Post: PostScreen,
      },
    }),
    Profile: ProfileScreen,
  },
});
```

**Important**: Each navigator maintains its own navigation history. To navigate to a nested screen:
```javascript
navigation.navigate('Home', { screen: 'Post', params: { postId: 123 } });
```

## Hooks Reference

### useNavigation

Access the navigation object from any component:

```javascript
import { useNavigation } from '@react-navigation/native';

const navigation = useNavigation();
navigation.navigate('ScreenName');
```

### useRoute

Access the route object with params:

```javascript
import { useRoute } from '@react-navigation/native';

const route = useRoute();
const { itemId } = route.params;
```

### useFocusEffect

Run effects when screen gains/loses focus:

```javascript
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

function ProfileScreen() {
  useFocusEffect(
    useCallback(() => {
      const unsubscribe = someEvent.subscribe();
      return () => unsubscribe();
    }, [])
  );
}
```

### useIsFocused

Check if current screen is focused:

```javascript
import { useIsFocused } from '@react-navigation/native';

function MyComponent() {
  const isFocused = useIsFocused();
  return <Text>{isFocused ? 'Focused' : 'Not focused'}</Text>;
}
```

### useNavigationState

Access the current navigation state:

```javascript
import { useNavigationState } from '@react-navigation/native';

function MyComponent() {
  const state = useNavigationState();
  const currentRoute = state.routes[state.index];
}
```

## Common Tasks

### Authentication Flow

Implement authentication by conditionally rendering screens:

```javascript
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator({
  screens: {
    // If user is logged in, show these screens
    ...(userToken ? {
      Main: createBottomTabNavigator({
        screens: { Home: HomeScreen, Profile: ProfileScreen },
      }),
    } : {}),
    // Always show these screens
    Auth: AuthScreen,
  },
  initialRouteName: userToken ? 'Main' : 'Auth',
});
```

### Deep Linking

Configure deep linking to handle URLs:

```javascript
<NavigationContainer
  linking={{
    prefixes: ['myapp://'],
    config: {
      screens: {
        Home: 'home',
        Profile: 'profile/:userId',
      },
    },
  }}
>
```

### Hiding Tab Bar

Hide tab bar on specific screens using `tabBarStyle` in screen options:

```javascript
const Tabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: { tabBarStyle: { display: 'none' } },
    },
    Profile: ProfileScreen,
  },
});
```

### Status Bar Configuration

Configure status bar per route:

```javascript
<Stack.Navigator
  screenOptions={{
    statusBarStyle: 'dark',
    statusBarBackgroundColor: '#fff',
  }}
>
```

### Modal Presentation

Present screens as modals:

```javascript
const Stack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Modal: {
      screen: ModalScreen,
      options: { presentation: 'modal' },
    },
  },
});
```

## TypeScript Support

### Define Root Stack Type

```typescript
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Details: { itemId: number };
};

export type RootStackNavigationProp = NativeStackNavigationProp<RootStackParamList>;
```

### Type Screen Props

```typescript
type ProfileScreenProps = {
  navigation: RootStackNavigationProp<'Profile'>;
  route: RouteProp<RootStackParamList, 'Profile'>;

function ProfileScreen({ navigation, route }: ProfileScreenProps) {
  const { userId } = route.params; // Type: string
}
```

### Typed Hooks

```typescript
import { useNavigation, useRoute } from '@react-navigation/native';

const navigation = useNavigation<RootStackNavigationProp>();
const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
```

## State Persistence

Persist navigation state across app restarts:

```javascript
import { useReduxPersistor } from '@react-navigation/native';
import { persistStore } from 'redux-persist';

const persistor = persistStore(store);

<NavigationContainer
  persistor={{
    persistNavigationState: (state) => {
      storage.setItem('NAVIGATION_STATE', JSON.stringify(state));
    },
    loadNavigationState: async () => {
      const state = await storage.getItem('NAVIGATION_STATE');
      return state ? JSON.parse(state) : undefined;
    },
  }}
>
```

## Troubleshooting

### Common Issues

1. **"Unable to resolve module"**: Clear Metro cache with `expo start --reset-cache`
2. **Screens unmounting/remounting**: Check for unstable prop references, use `useCallback` for callbacks
3. **TypeScript errors**: Ensure proper type definitions for param lists and navigation props
4. **Deep linking not working**: Verify URL scheme configuration in Info.plist and AndroidManifest.xml

### Debugging

Use React Navigation DevTools:

```bash
npm install @react-navigation/devtools
```

```javascript
import { NavigationContainer } from '@react-navigation/native';
import { useDevTools } from '@react-navigation/devtools';

<NavigationContainer>
  {/* ... */}
  {__DEV__ && <DevTools />}
</NavigationContainer>
```

## References

For detailed documentation on specific topics, refer to the following reference files:

| Reference File | Contents |
|--------------|-----------|
| `references/fundamentals.md` | Getting started, moving between screens, passing parameters, headers, nesting navigators, lifecycle |
| `references/guides.md` | Authentication flows, safe areas, hiding tab bar, status bar, modals, deep linking, themes, state persistence, testing |
| `references/navigators.md` | Stack, Native Stack, Bottom Tabs, Drawer, Material Top Tabs navigators |
| `references/api-reference.md` | NavigationContainer, Navigator, Group, Screen, screen options, routing APIs |
| `references/hooks.md` | useNavigation, useRoute, useNavigationState, useFocusEffect, useIsFocused, and all other hooks |
| `references/actions.md` | CommonActions, StackActions, DrawerActions, TabActions |
| `references/upgrading.md` | Migration guide from React Navigation 7.x |
| `references/troubleshooting.md` | Common issues and solutions |
| `references/advanced.md` | Custom routers, type-checking navigators, community solutions |

When working with React Navigation V8, start with the core concepts in this SKILL.md file. For specific implementation details or API references, load the appropriate reference file based on the topic being addressed.
