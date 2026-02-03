## Material Top Tabs Navigator

Source: https://reactnavigation.org/docs/8.x/material-top-tab-navigator

A material-design themed tab bar on the top of the screen that lets you switch between different routes by tapping the tabs or swiping horizontally. Transitions are animated by default. Screen components for each route are mounted immediately.

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/material-top-tabs.mp4" />
</video>

This wraps [`react-native-tab-view`](tab-view.md). If you want to use the tab view without React Navigation integration, use the library directly instead.

## Installation

To use this navigator, ensure that you have [`@react-navigation/native` and its dependencies (follow this guide)](getting-started.md), then install [`@react-navigation/material-top-tabs`](https://github.com/react-navigation/react-navigation/tree/main/packages/material-top-tabs):

```bash npm2yarn
npm install @react-navigation/material-top-tabs@next
```

The navigator depends on [`react-native-pager-view`](https://github.com/callstack/react-native-pager-view) for rendering the pages.

<Tabs groupId='framework' queryString="framework">
<TabItem value='expo' label='Expo' default>

If you have a Expo managed project, in your project directory, run:

```bash
npx expo install react-native-pager-view
```

</TabItem>
<TabItem value='community-cli' label='Community CLI'>

If you have a bare React Native project, in your project directory, run:

```bash npm2yarn
npm install react-native-pager-view
```

</TabItem>
</Tabs>

If you're on a Mac and developing for iOS, you also need to install [pods](https://cocoapods.org/) to complete the linking.

```bash
npx pod-install ios
```

## Usage

To use this navigator, import it from `@react-navigation/material-top-tabs`:

```js name="Material Top Tab Navigator" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

// codeblock-focus-end
function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  const navigation = useNavigation('Profile');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
      <Button onPress={() => navigation.navigate('Home')}>Go to Home</Button>
    </View>
  );
}

// codeblock-focus-start
const MyTabs = createMaterialTopTabNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

## API Definition

### Props

In addition to the [common props](navigator.md#configuration) shared by all navigators, the material top tabs navigator component accepts the following additional props:

#### `backBehavior`

This controls what happens when `goBack` is called in the navigator. This includes pressing the device's back button or back gesture on Android.

It supports the following values:

- `firstRoute` - return to the first screen defined in the navigator (default)
- `initialRoute` - return to initial screen passed in `initialRouteName` prop, if not passed, defaults to the first screen
- `order` - return to screen defined before the focused screen
- `history` - return to last visited screen in the navigator; if the same screen is visited multiple times, the older entries are dropped from the history
- `none` - do not handle back button

#### `tabBarPosition`

Position of the tab bar in the tab view. Possible values are `'top'` and `'bottom'`. Defaults to `'top'`.

#### `keyboardDismissMode`

String indicating whether the keyboard gets dismissed in response to a drag gesture. Possible values are:

- `'auto'` (default): the keyboard is dismissed when the index changes.
- `'on-drag'`: the keyboard is dismissed when a drag begins.
- `'none'`: drags do not dismiss the keyboard.

##### `overScrollMode`

Used to override default value of pager's overScroll mode.

Possible values:

- `'auto'` (default): Allow a user to over-scroll this view only if the content is large enough to meaningfully scroll.
- `'always'`: Always allow a user to over-scroll this view.
- `'never'`: Never allow a user to over-scroll this view.

Only supported on Android.

#### `initialLayout`

Object containing the initial height and width of the screens. Passing this will improve the initial rendering performance. For most apps, this is a good default:

```js
{
  width: Dimensions.get('window').width;
}
```

#### `style`

Style to apply to the tab view container.

#### `tabBar`

Function that returns a React element to display as the tab bar.

Example:

```js name="Custom Tab Bar" snack static2dynamic
import * as React from 'react';
import { Animated, View, Platform, Text } from 'react-native';
import {
  createStaticNavigation,
  useLinkBuilder,
  useTheme,
} from '@react-navigation/native';
import { PlatformPressable } from '@react-navigation/elements';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
    </View>
  );
}

// codeblock-focus-start
function MyTabBar({ state, descriptors, navigation, position }) {
  const { colors } = useTheme();
  const { buildHref } = useLinkBuilder();

  return (
    <View style={{ flexDirection: 'row' }}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label =
          options.tabBarLabel !== undefined
            ? options.tabBarLabel
            : options.title !== undefined
              ? options.title
              : route.name;

        const isFocused = state.index === index;

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name, route.params);
          }
        };

        const onLongPress = () => {
          navigation.emit({
            type: 'tabLongPress',
            target: route.key,
          });
        };

        const inputRange = state.routes.map((_, i) => i);
        const opacity = position.interpolate({
          inputRange,
          outputRange: inputRange.map((i) => (i === index ? 1 : 0.5)),
        });

        return (
          <PlatformPressable
            key={route.key}
            href={buildHref(route.name, route.params)}
            aria-label={options.tabBarAccessibilityLabel}
            aria-selected={isFocused}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ flex: 1, padding: 16, alignItems: 'center' }}
          >
            <Animated.Text style={{ opacity, color: colors.text }}>
              {label}
            </Animated.Text>
          </PlatformPressable>
        );
      })}
    </View>
  );
}

const MyTabs = createMaterialTopTabNavigator({
  tabBar: (props) => <MyTabBar {...props} />,
  screens: {
    Home: HomeScreen,
    Settings: SettingsScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

This example will render a basic tab bar with labels.

Note that you **cannot** use the `useNavigation` hook inside the `tabBar` since `useNavigation` is only available inside screens. You get a `navigation` prop for your `tabBar` which you can use instead:

```js
function MyTabBar({ navigation }) {
  return (
    <Button
      onPress={() => {
        // Navigate using the `navigation` prop that you received
        // highlight-next-line
        navigation.navigate('SomeScreen');
      }}
    >
      Go somewhere
    </Button>
  );
}
```

### Options

The following [options](screen-options.md) can be used to configure the screens in the navigator:

Example:

```js name="Tab Navigator Options" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyTabs = createMaterialTopTabNavigator({
  // highlight-start
  screenOptions: {
    tabBarLabelStyle: { fontSize: 12 },
    tabBarItemStyle: { width: 100 },
    tabBarStyle: { backgroundColor: 'powderblue' },
  },
  // highlight-end
  screens: {
    Home: HomeScreen,
    Settings: SettingsScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

#### `title`

Generic title that can be used as a fallback for `headerTitle` and `tabBarLabel`.

#### `tabBarLabel`

Title string of a tab displayed in the tab bar or a function that given `{ focused: boolean, color: string }` returns a React.Node, to display in tab bar. When undefined, scene `title` is used. To hide, see [`tabBarShowLabel`](#tabbarshowlabel) option.

#### `tabBarAccessibilityLabel`

Accessibility label for the tab button. This is read by the screen reader when the user taps the tab. It's recommended to set this if you don't have a label for the tab.

#### `tabBarAllowFontScaling`

Whether label font should scale to respect Text Size accessibility settings.

#### `tabBarShowLabel`

Whether the tab label should be visible. Defaults to `true`.

#### `tabBarIcon`

Function that given `{ focused: boolean, color: string }` returns a React.Node, to display in the tab bar.

#### `tabBarShowIcon`

Whether the tab icon should be visible. Defaults to `false`.

#### `tabBarBadge`

Function that returns a React element to use as a badge for the tab.

#### `tabBarIndicator`

Function that returns a React element as the tab bar indicator.

#### `tabBarIndicatorStyle`

Style object for the tab bar indicator.

#### `tabBarIndicatorContainerStyle`

Style object for the view containing the tab bar indicator.

#### `tabBarButtonTestID`

ID to locate this tab button in tests.

#### `tabBarActiveTintColor`

Color for the icon and label in the active tab.

#### `tabBarInactiveTintColor`

Color for the icon and label in the inactive tabs.

#### `tabBarPressColor`

Color for material ripple (Android >= 5.0 only).

#### `tabBarPressOpacity`

Opacity for pressed tab (iOS and Android < 5.0 only).

#### `tabBarBounces`

Boolean indicating whether the tab bar bounces when overscrolling.

#### `tabBarScrollEnabled`

Boolean indicating whether to make the tab bar scrollable.

If you set this to `true`, you should also specify a width in `tabBarItemStyle` to improve the performance of initial render.

#### `tabBarLabelStyle`

Style object for the tab label.

#### `tabBarItemStyle`

Style object for the individual tab items.

#### `tabBarContentContainerStyle`

Style object for the view containing the tab items.

#### `tabBarStyle`

Style object for the tab bar.

#### `swipeEnabled`

Boolean indicating whether to enable swipe gestures. Swipe gestures are enabled by default. Passing `false` will disable swipe gestures, but the user can still switch tabs by pressing the tab bar.

#### `lazy`

Whether this screen should be lazily rendered. When this is set to `true`, the screen will be rendered as it comes into the viewport. By default all screens are rendered to provide a smoother swipe experience. But you might want to defer the rendering of screens out of the viewport until the user sees them. To enable lazy rendering for this screen, set `lazy` to `true`.

When you enable `lazy`, the lazy loaded screens will usually take some time to render when they come into the viewport. You can use the `lazyPlaceholder` prop to customize what the user sees during this short period.

#### `lazyPreloadDistance`

When `lazy` is enabled, you can specify how many adjacent screens should be preloaded in advance with this prop. This value defaults to `0` which means lazy pages are loaded as they come into the viewport.

#### `lazyPlaceholder`

Function that returns a React element to render if this screen hasn't been rendered yet. The `lazy` option also needs to be enabled for this to work.

This view is usually only shown for a split second. Keep it lightweight.

By default, this renders `null`.

#### `sceneStyle`

Style to apply to the view wrapping each screen. You can pass this to override some default styles such as overflow clipping.

### Events

The navigator can [emit events](navigation-events.md) on certain actions. Supported events are:

#### `tabPress`

This event is fired when the user presses the tab button for the current screen in the tab bar. By default a tab press does several things:

- If the tab is not focused, tab press will focus that tab
- If the tab is already focused:
  - If the screen for the tab renders a scroll view, you can use [`useScrollToTop`](use-scroll-to-top.md) to scroll it to top
  - If the screen for the tab renders a stack navigator, a `popToTop` action is performed on the stack

To prevent the default behavior, you can call `event.preventDefault`:

```js name="Tab Press Event" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

function HomeScreen() {
  const navigation = useNavigation('Home');

  // codeblock-focus-start
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('tabPress', (e) => {
      // Prevent default behavior
      e.preventDefault();

      // Do something manually
      // ...
    });

    return unsubscribe;
  }, [navigation]);
  // codeblock-focus-end

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Text style={{ marginTop: 10, color: 'gray' }}>
        Tab press event is prevented
      </Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
    </View>
  );
}

const MyTabs = createMaterialTopTabNavigator({
  screens: {
    Home: HomeScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

If you have a custom tab bar, make sure to emit this event.

:::note

By default, tabs are rendered lazily. So if you add a listener inside a screen component, it won't receive the event until the screen is focused for the first time. If you need to listen to this event before the screen is focused, you can specify the [listener in the screen config](navigation-events.md#listeners-prop-on-screen) instead.

:::

#### `tabLongPress`

This event is fired when the user presses the tab button for the current screen in the tab bar for an extended period.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('tabLongPress', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

### Helpers

The tab navigator adds the following methods to the navigation object:

#### `jumpTo`

Navigates to an existing screen in the tab navigator. The method accepts following arguments:

- `name` - _string_ - Name of the route to jump to.
- `params` - _object_ - Screen params to pass to the destination route.

```js name="Tab Navigator - jumpTo" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.jumpTo('Profile', { name: 'Michaś' })
          // codeblock-focus-end
        }
      >
        Jump to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
      {route.params?.name && (
        <Text style={{ marginTop: 10 }}>Name: {route.params.name}</Text>
      )}
    </View>
  );
}

const MyTabs = createMaterialTopTabNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

### Hooks

The material top tab navigator exports the following hooks:

#### `useTabAnimation`

This hook returns an object containing an animated value that represents the current position of the tabs. This can be used to animate elements based on the swipe position of the tabs, such as the tab indicator:

```js
import { Animated } from 'react-native';
import { useTabAnimation } from '@react-navigation/material-top-tabs';

function MyView() {
  const { position } = useTabAnimation();

  return (
    <Animated.View
      style={{
        width: '50%',
        height: 2,
        backgroundColor: 'tomato',
        transform: [{ translateX: position }],
      }}
    />
  );
}
```

---

## Developer tools

Source: https://reactnavigation.org/docs/8.x/devtools

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Developer tools to make debugging easier when using React Navigation.

To use the developer tools, install [`@react-navigation/devtools`](https://github.com/react-navigation/react-navigation/tree/master/packages/devtools):

```bash npm2yarn
npm install @react-navigation/devtools@next
```

Hooks from this package only work during development and are disabled in production. You don't need to do anything special to remove them from the production build.

## API Definition

The package exposes the following APIs:

### `useLogger`

This hook provides a logger for React Navigation. It logs the navigation state and actions to the console.

<video playsInline autoPlay muted loop style={{ width: "585px" }}>

  <source src="/assets/7.x/devtool-logger.mp4" />
</video>

**Usage:**

To use the hook, import it and pass a `ref` to the `NavigationContainer` as its argument:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import * as React from 'react';
import {
  createStaticNavigation,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useLogger } from '@react-navigation/devtools';

/* content */

export default function App() {
  const navigationRef = useNavigationContainerRef();

  useLogger(navigationRef);

  return <Navigation ref={navigationRef} />;
}
```

</TabItem>

<TabItem value="dynamic" label="Dynamic">

```js
import * as React from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useLogger } from '@react-navigation/devtools';

export default function App() {
  const navigationRef = useNavigationContainerRef();

  useLogger(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>{/* ... */}</NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

### `useReduxDevToolsExtension`

This hook provides integration with [Redux DevTools Extension](https://github.com/reduxjs/redux-devtools). It also works with [`React Native Debugger app`](https://github.com/jhen0409/react-native-debugger) which includes this extension.

**Usage:**

To use the hook, import it and pass a `ref` to the `NavigationContainer` as its argument:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import * as React from 'react';
import {
  createStaticNavigation,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useReduxDevToolsExtension } from '@react-navigation/devtools';

/* content */

export default function App() {
  const navigationRef = useNavigationContainerRef();

  useReduxDevToolsExtension(navigationRef);

  return <Navigation ref={navigationRef} />;
}
```

</TabItem>

<TabItem value="dynamic" label="Dynamic">

```js
import * as React from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import { useReduxDevToolsExtension } from '@react-navigation/devtools';

export default function App() {
  const navigationRef = useNavigationContainerRef();

  useReduxDevToolsExtension(navigationRef);

  return (
    <NavigationContainer ref={navigationRef}>{/* ... */}</NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

Now, you'll be able to see logs from React Navigation in Redux DevTools Extension, e.g. when you're debugging your app with React Native Debugger app.

---

## Elements Library

Source: https://reactnavigation.org/docs/8.x/elements

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A component library containing the UI elements and helpers used in React Navigation. It can be useful if you're building your own navigator, or want to reuse a default functionality in your app.

## Installation

To use this package, ensure that you have [`@react-navigation/native` and its dependencies (follow this guide)](getting-started.md), then install [`@react-navigation/elements`](https://github.com/react-navigation/react-navigation/tree/main/packages/elements):

```bash npm2yarn
npm install @react-navigation/elements@next
```

## Components

### `Header`

A component that can be used as a header. This is used by all the navigators by default.

Usage:

```js name="React Navigation Elements Header" snack
import * as React from 'react';
import { SafeAreaProviderCompat } from '@react-navigation/elements';
import { NavigationContainer } from '@react-navigation/native';
// codeblock-focus-start
import { Header } from '@react-navigation/elements';

function MyHeader() {
  return <Header title="My app" />;
}
// codeblock-focus-end

export default function App() {
  return (
    <NavigationContainer>
      <SafeAreaProviderCompat>
        <MyHeader />
      </SafeAreaProviderCompat>
    </NavigationContainer>
  );
}
```

To use the header in a navigator, you can use the `header` option in the screen options:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Header with Native Stack" snack
import * as React from 'react';
import { Text, View, Button } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// codeblock-focus-start
import { Header, getHeaderTitle } from '@react-navigation/elements';

// codeblock-focus-end
function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  screenOptions: {
    header: ({ options, route, back }) => (
      <Header
        {...options}
        back={back}
        title={getHeaderTitle(options, route.name)}
      />
    ),
  },
  screens: {
    Home: HomeScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Header with Native Stack" snack
import * as React from 'react';
import { Text, View, Button } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// codeblock-focus-start
import { Header, getHeaderTitle } from '@react-navigation/elements';

const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        header: ({ options, route, back }) => (
          <Header
            {...options}
            back={back}
            title={getHeaderTitle(options, route.name)}
          />
        ),
      }}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}
// codeblock-focus-end

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <MyStack />
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

:::note

This doesn't replicate the behavior of the header in stack and native stack navigators as the stack navigator also includes animations, and the native stack navigator header is provided by the native platform.

:::

It accepts the following props:

#### `headerTitle`

String or a function that returns a React Element to be used by the header. Defaults to scene `title`.

When a function is specified, it receives an object containing following properties:

- `allowFontScaling`: Whether it scale to respect Text Size accessibility settings.
- `tintColor`: Text color of the header title.
- `style`: Style object for the `Text` component.
- `children`: The title string (from `title` in `options`).

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        headerTitle: ({ allowFontScaling, tintColor, style, children }) => (
          <Text
            style={[style, { color: tintColor }]}
            allowFontScaling={allowFontScaling}
          >
            {children}
          </Text>
        ),
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Screen
  name="Home"
  component={HomeScreen}
  options={{
    headerTitle: ({ allowFontScaling, tintColor, style, children }) => (
      <Text
        style={[style, { color: tintColor }]}
        allowFontScaling={allowFontScaling}
      >
        {children}
      </Text>
    ),
  }}
/>
```

</TabItem>
</Tabs>

#### `headerTitleAlign`

How to align the header title. Possible values:

- `left`
- `center`

Defaults to `center` on iOS and `left` on Android.

#### `headerTitleAllowFontScaling`

Whether header title font should scale to respect Text Size accessibility settings. Defaults to `false`.

#### `headerLeft`

Function which returns a React Element to display on the left side of the header.

It receives an object containing following properties:

- `tintColor`: The color of the icon and label.
- `pressColor`: The color of the material ripple (Android >= 5.0 only).
- `pressOpacity`: The opacity of the button when it's pressed (Android < 5.0, and iOS).
- `displayMode`: How the element displays icon and title. Defaults to `default` on iOS and `minimal` on Android. Possible values:
  - `default`: Displays one of the following depending on the available space: previous screen's title, generic title (e.g. 'Back') or no title (only icon).
  - `generic`: Displays one of the following depending on the available space: generic title (e.g. 'Back') or no title (only icon). iOS >= 14 only, falls back to "default" on older iOS versions.
  - `minimal`: Always displays only the icon without a title.
- `href`: The URL to open when the button is pressed on the Web.

You can use it to implement your custom left button, for example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        headerLeft: (props) => (
          <MyButton {...props} onPress={() => {
            // Do something
          }}>
        )
      }
    }
  }
})
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Screen
  name="Home"
  component={HomeScreen}
  options={{
    headerLeft: (props) => (
      <MyButton
        {...props}
        onPress={() => {
          // Do something
        }}
      />
    ),
  }}
/>
```

</TabItem>
</Tabs>

#### `headerRight`

Function which returns a React Element to display on the right side of the header.

It receives an object containing following properties:

- `tintColor`: The color of the icon and label.
- `pressColor`: The color of the material ripple (Android >= 5.0 only).
- `pressOpacity`: The opacity of the button when it's pressed (Android < 5.0, and iOS).

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        headerLeft: (props) => (
          <MyButton {...props} onPress={() => {
            // Do something
          }}>
        )
      }
    }
  }
})
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Screen
  name="Home"
  component={HomeScreen}
  options={{
    headerLeft: (props) => (
      <MyButton
        {...props}
        onPress={() => {
          // Do something
        }}
      />
    ),
  }}
/>
```

</TabItem>
</Tabs>

#### `headerSearchBarOptions`

Options for the search bar in the header. When this is specified, the header will contain a button to show a search input.

It can contain the following properties:

- `ref`: Ref to manipulate the search input imperatively. It contains the following methods:
  - `focus` - focuses the search bar
  - `blur` - removes focus from the search bar
  - `setText` - sets the search bar's content to given value
  - `clearText` - removes any text present in the search bar input field
  - `cancelSearch` - cancel the search and close the search bar
- `autoCapitalize`: The auto-capitalization behavior. Possible values: `none`, `words`, `sentences`, `characters`.
- `autoFocus`: Automatically focus search input on mount.
- `cancelButtonText`: Text to be used instead of default `Cancel` button text (iOS only).
- `inputType`: Type of the input. Possible values: `text`, `phone`, `number`, `email`.
- `onBlur`: Callback that gets called when search input has lost focus.
- `onChange`: Callback that gets called when the text changes.
- `onClose`: Callback that gets called when search input is closed.
- `onFocus`: Callback that gets called when search input has received focus.
- `placeholder`: Text displayed when search input is empty.

```js
React.useLayoutEffect(() => {
  navigation.setOptions({
    headerSearchBarOptions: {
      placeholder: 'Search',
      onChange: (event) => {
        const text = event.nativeEvent.text;

        // Do something
      },
    },
  });
}, [navigation]);
```

#### `headerShadowVisible`

Whether to hide the elevation shadow (Android) or the bottom border (iOS) on the header.

This is a short-hand for the following styles:

```js
{
  elevation: 0,
  shadowOpacity: 0,
  borderBottomWidth: 0,
}
```

If any of the above styles are specified in `headerStyle` along with `headerShadowVisible: false`, then the styles in `headerStyle` will take precedence.

#### `headerStyle`

Style object for the header. You can specify a custom background color here, for example:

```js
{
  backgroundColor: 'tomato',
}
```

Note that `headerStyle` won't take effect if you are also using [`headerBackground`](#headerbackground). In that case, you should style the element returned from `headerBackground` instead.

#### `headerTitleStyle`

Style object for the title component

#### `headerLeftBackgroundVisible`

Whether the liquid glass background is visible for the item.

Only supported on iOS 26.0 and later. Older versions of iOS and other platforms never show the background.

Defaults to `true`.

#### `headerLeftContainerStyle`

Customize the style for the container of the `headerLeft` component, for example to add padding.

#### `headerRightBackgroundVisible`

Whether the liquid glass background is visible for the item.

Only supported on iOS 26.0 and later. Older versions of iOS and other platforms never show the background.\

Defaults to `true`.

#### `headerRightContainerStyle`

Customize the style for the container of the `headerRight` component, for example to add padding.

#### `headerTitleContainerStyle`

Customize the style for the container of the `headerTitle` component, for example to add padding.

By default, `headerTitleContainerStyle` is with an absolute position style and offsets both `left` and `right`. This may lead to white space or overlap between `headerLeft` and `headerTitle` if a customized `headerLeft` is used. It can be solved by adjusting `left` and `right` style in `headerTitleContainerStyle` and `marginHorizontal` in `headerTitleStyle`.

#### `headerBackgroundContainerStyle`

Style object for the container of the `headerBackground` element.

#### `headerTintColor`

Tint color for the header

#### `headerPressColor`

Color for material ripple (Android >= 5.0 only)

#### `headerPressOpacity`

Press opacity for the buttons in header (Android < 5.0, and iOS)

#### `headerTransparent`

Defaults to `false`. If `true`, the header will not have a background unless you explicitly provide it with `headerBackground`. The header will also float over the screen so that it overlaps the content underneath.

This is useful if you want to render a semi-transparent header or a blurred background.

Note that if you don't want your content to appear under the header, you need to manually add a top margin to your content. React Navigation won't do it automatically.

To get the height of the header, you can use [`HeaderHeightContext`](#headerheightcontext) with [React's Context API](https://react.dev/reference/react/useContext#contextconsumer) or [`useHeaderHeight`](#useheaderheight).

#### `headerBackground`

Function which returns a React Element to render as the background of the header. This is useful for using backgrounds such as an image or a gradient.

For example, you can use this with `headerTransparent` to render a blur view to create a translucent header.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Header blur" snack dependencies=expo-blur
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';
import { BlurView } from 'expo-blur';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  const navigation = useNavigation('Profile');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

// codeblock-focus-start
const Stack = createStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        headerTransparent: true,
        headerBackground: () => (
          <BlurView
            tint="dark"
            intensity={100}
            style={StyleSheet.absoluteFill}
          />
        ),
      },
    },
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(Stack);

function App() {
  return <Navigation />;
}

export default App;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Header blur" snack dependencies=expo-blur
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { BlurView } from 'expo-blur';

// codeblock-focus-end

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  const navigation = useNavigation('Profile');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        // codeblock-focus-start
        <Stack.Screen
          name="Home"
          component={HomeScreen}
          options={{
            headerTransparent: true,
            headerBackground: () => (
              <BlurView
                tint="dark"
                intensity={100}
                style={StyleSheet.absoluteFill}
              />
            ),
          }}
        />
        // codeblock-focus-end
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

</TabItem>
</Tabs>

#### `headerStatusBarHeight`

Extra padding to add at the top of header to account for translucent status bar. By default, it uses the top value from the safe area insets of the device. Pass 0 or a custom value to disable the default behavior, and customize the height.

### `HeaderBackground`

A component containing the styles used in the background of the header, such as the background color and shadow. It's the default for [`headerBackground`](#headerbackground). It accepts the same props as a [`View`](https://reactnative.dev/docs/view).

Usage:

```js
<HeaderBackground style={{ backgroundColor: 'tomato' }} />
```

### `HeaderTitle`

A component used to show the title text in header. It's the default for [`headerTitle`](#headertitle). It accepts the same props as a [`Text`](https://reactnative.dev/docs/Text).

The color of title defaults to the [theme text color](themes.md). You can override it by passing a `tintColor` prop.

Usage:

```js
<HeaderTitle>Hello</HeaderTitle>
```

### `HeaderButton`

A component used to show a button in header. It can be used for both left and right buttons. It accepts the following props:

- `onPress` - Callback to call when the button is pressed.
- `href` - The `href` to use for the anchor tag on web.
- `disabled` - Boolean which controls whether the button is disabled.
- `accessibilityLabel` - Accessibility label for the button for screen readers.
- `testID` - ID to locate this button in tests.
- `tintColor` - Tint color for the header button.
- `pressColor` - Color for material ripple (Android >= 5.0 only).
- `pressOpacity` - Opacity when the button is pressed if material ripple isn't supported by the platform.
- `style` - Style object for the button.
- `children` - Content to render for the button. Usually the icon.

Usage:

```js
<HeaderButton
  accessibilityLabel="More options"
  onPress={() => console.log('button pressed')}
>
  <MaterialCommunityIcons
    name="dots-horizontal-circle-outline"
    size={24}
    color={tintColor}
  />
</HeaderButton>
```

### `HeaderBackButton`

A component used to show the back button header. It's the default for [`headerLeft`](#headerleft) in the [stack navigator](stack-navigator.md). It accepts the following props:

- `disabled` - Boolean which controls Whether the button is disabled.
- `onPress` - Callback to call when the button is pressed.
- `pressColor` - Color for material ripple (Android >= 5.0 only).
- `backImage` - Function which returns a React Element to display custom image in header's back button.
- `tintColor` - Tint color for the header.
- `label` - Label text for the button. Usually the title of the previous screen. By default, this is only shown on iOS.
- `truncatedLabel` - Label text to show when there isn't enough space for the full label.
- `displayMode`: How the back button displays icon and title. Defaults to `default` on iOS and `minimal` on Android. Possible values:
  - `default`: Displays one of the following depending on the available space: previous screen's title, generic title (e.g. 'Back') or no title (only icon).
  - `generic`: Displays one of the following depending on the available space: generic title (e.g. 'Back') or no title (only icon). iOS >= 14 only, falls back to "default" on older iOS versions.
  - `minimal`: Always displays only the icon without a title.
- `labelStyle` - Style object for the label.
- `allowFontScaling` - Whether label font should scale to respect Text Size accessibility settings.
- `onLabelLayout` - Callback to trigger when the size of the label changes.
- `screenLayout` - Layout of the screen.
- `titleLayout` - Layout of the title element in the header.
- `canGoBack` - Boolean to indicate whether it's possible to navigate back in stack.
- `accessibilityLabel` - Accessibility label for the button for screen readers.
- `testID` - ID to locate this button in tests.
- `style` - Style object for the button.

Usage:

```js
<HeaderBackButton label="Hello" onPress={() => console.log('back pressed')} />
```

### `MissingIcon`

A component that renders a missing icon symbol. It can be used as a fallback for icons to show that there's a missing icon. It accepts the following props:

- `color` - Color of the icon.
- `size` - Size of the icon.
- `style` - Additional styles for the icon.

### `PlatformPressable`

A component which provides an abstraction on top of [`Pressable`](https://reactnative.dev/docs/Pressable) to handle platform differences. In addition to `Pressable`'s props, it accepts following additional props:

- `pressColor` - Color of material ripple on Android when it's pressed
- `pressOpacity` - Opacity when it's pressed if material ripple isn't supported by the platform

### `Button`

A component that renders a button. In addition to [`PlatformPressable`](#platformpressable)'s props, it accepts following additional props:

- `variant` - Variant of the button. Possible values are:
  - `tinted` (default)
  - `plain`
  - `filled`
- `color` - Color of the button. Defaults to the [theme](themes.md)'s primary color.
- `children` - Content to render inside the button.

In addition, the button integrates with React Navigation and accepts the same props as [`useLinkProps`](use-link-props.md#options) hook.

It can be used to navigate between screens by specifying a screen name and params:

```js
<Button screen="Profile" params={{ userId: 'jane' }}>
  Go to Profile
</Button>
```

Or as a regular button:

```js
<Button onPress={() => console.log('button pressed')}>Press me</Button>
```

### `Label`

The `Label` component is used to render small text. It is used in [Bottom Tab Navigator](bottom-tab-navigator.md) to render the label for each tab.

In addition to the standard [`Text`](https://reactnative.dev/docs/text) props, it accepts the following props:

- `tintColor` - Color of the label. Defaults to the [theme](themes.md)'s text color.

Usage:

```jsx
<Label>Home</Label>
```

### `Badge`

A component that renders a badge, typically used to show a count or status indicator on tab icons.

It accepts the following props:

- `visible` - Whether the badge is visible.
- `children` - Content of the badge (string or number).
- `size` - Size of the badge. Defaults to `18`.
- `style` - Style object for the badge.

Usage:

```jsx
<Badge visible={true}>5</Badge>
```

### `Text`

A themed text component that automatically applies the theme's text color and font styles.

It accepts the same props as React Native's [`Text`](https://reactnative.dev/docs/text) component.

Usage:

```jsx
<Text>Hello World</Text>
```

## Utilities

### `SafeAreaProviderCompat`

A wrapper over the `SafeAreaProvider` component from [`react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) which includes initial values.

Usage:

```js
<SafeAreaProviderCompat>{/* Your components */}</SafeAreaProviderCompat>
```

### `HeaderBackContext`

React context that can be used to get the back title of the parent screen.

```js
import { HeaderBackContext } from '@react-navigation/elements';

// ...

<HeaderBackContext.Consumer>
  {(headerBack) => {
    if (headerBack) {
      const backTitle = headerBack.title;

      /* render something */
    }

    /* render something */
  }}
</HeaderBackContext.Consumer>;
```

### `HeaderShownContext`

React context that can be used to check if a header is visible in a parent screen.

```js
import { HeaderShownContext } from '@react-navigation/elements';

// ...

<HeaderShownContext.Consumer>
  {(headerShown) => {
    /* render something */
  }}
</HeaderShownContext.Consumer>;
```

### `HeaderHeightContext`

React context that can be used to get the height of the nearest visible header in a parent screen.

```js
import { HeaderHeightContext } from '@react-navigation/elements';

// ...

<HeaderHeightContext.Consumer>
  {(headerHeight) => {
    /* render something */
  }}
</HeaderHeightContext.Consumer>;
```

### `useHeaderHeight`

Hook that returns the height of the nearest visible header in the parent screen.

```js
import { useHeaderHeight } from '@react-navigation/elements';

// ...

const headerHeight = useHeaderHeight();
```

### `useFrameSize`

Hook that returns the size of the frame of the parent navigator. It accepts a selector function which receives the frame dimensions and returns a value:

```js
import { useFrameSize } from '@react-navigation/elements';

// ...

const isLandscape = useFrameSize((frame) => frame.width > frame.height);
```

The selector ensures that the component only re-renders when we need to.

### `getDefaultHeaderHeight`

Helper that returns the default header height. It takes an object with the following properties:

- `landscape` - Whether the device is in landscape orientation.
- `modalPresentation` - Whether the screen is presented as a modal.
- `topInset` - The height of the top inset (status bar height).

```js
import { getDefaultHeaderHeight } from '@react-navigation/elements';

// ...

const headerHeight = getDefaultHeaderHeight({
  landscape: false,
  modalPresentation: false,
  topInset: statusBarHeight,
});
```

### `getHeaderTitle`

Helper that returns the title text to use in header. It takes the following parameters:

- `options` - The options object of the screen.
- `fallback` - Fallback title string if no title was found in options.

### `getLabel`

Helper that returns the label text to use. It takes the following parameters:

- `options` - An object with optional `label` and `title` properties.
- `fallback` - Fallback label string if no label or title was found in options.

```js
import { getLabel } from '@react-navigation/elements';

// ...

const label = getLabel(options, route.name);
```

### `getDefaultSidebarWidth`

Helper that returns the default sidebar width based on the screen dimensions. It follows Material Design 3 guidelines for navigation drawer specs.

It takes an object with the following property:

- `width` - The width of the screen.

```js
import { getDefaultSidebarWidth } from '@react-navigation/elements';

// ...

const sidebarWidth = getDefaultSidebarWidth({ width: screenWidth });
```

---

## React Native Tab View

Source: https://reactnavigation.org/docs/8.x/tab-view

React Native Tab View is a cross-platform Tab View component for React Native implemented using [`react-native-pager-view`](https://github.com/callstack/react-native-viewpager) on Android & iOS, and [PanResponder](https://reactnative.dev/docs/panresponder) on Web, macOS, and Windows.

It follows material design guidelines by default, but you can also use your own custom tab bar or position the tab bar at the bottom.

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/tab-view.mp4" />
</video>

This package doesn't integrate with React Navigation. If you want to integrate the tab view with React Navigation's navigation system, e.g. want to show screens in the tab bar and be able to navigate between them using `navigation.navigate` etc, use [Material Top Tab Navigator](material-top-tab-navigator.md) instead.

## Installation

To use this package, open a Terminal in the project root and run:

```bash npm2yarn
npm install react-native-tab-view@next
```

The library depends on [`react-native-pager-view`](https://github.com/callstack/react-native-pager-view) for rendering the pages.

<Tabs groupId='framework' queryString="framework">
<TabItem value='expo' label='Expo' default>

If you have a Expo managed project, in your project directory, run:

```bash
npx expo install react-native-pager-view
```

</TabItem>
<TabItem value='community-cli' label='Community CLI'>

If you have a bare React Native project, in your project directory, run:

```bash npm2yarn
npm install react-native-pager-view
```

</TabItem>
</Tabs>

If you're on a Mac and developing for iOS, you also need to install [pods](https://cocoapods.org/) to complete the linking.

```bash
npx pod-install ios
```

## Quick start

```js name="React Native Tab View" snack
// codeblock-focus-start
import * as React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { TabView, SceneMap } from 'react-native-tab-view';

// codeblock-focus-end
const FirstRoute = () => (
  <View style={{ flex: 1, backgroundColor: '#ff4081' }} />
);

const SecondRoute = () => (
  <View style={{ flex: 1, backgroundColor: '#673ab7' }} />
);

// codeblock-focus-start
const renderScene = SceneMap({
  first: FirstRoute,
  second: SecondRoute,
});

const routes = [
  { key: 'first', title: 'First' },
  { key: 'second', title: 'Second' },
];

export default function TabViewExample() {
  const layout = useWindowDimensions();
  const [index, setIndex] = React.useState(0);

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      initialLayout={{ width: layout.width }}
    />
  );
}
// codeblock-focus-end
```

## More examples on Snack

- [Custom Tab Bar](https://snack.expo.io/@satya164/react-native-tab-view-custom-tabbar)
- [Lazy Load](https://snack.expo.io/@satya164/react-native-tab-view-lazy-load)

## API reference

The package exports a `TabView` component which is the one you'd use to render the tab view, and a `TabBar` component which is the default tab bar implementation.

### `TabView`

Container component responsible for rendering and managing tabs. Follows material design styles by default.

Basic usage look like this:

```js
<TabView
  navigationState={{ index, routes }}
  onIndexChange={setIndex}
  renderScene={SceneMap({
    first: FirstRoute,
    second: SecondRoute,
  })}
/>
```

#### TabView Props

##### `navigationState` (`required`)

State for the tab view. The state should contain the following properties:

- `index`: a number representing the index of the active route in the `routes` array
- `routes`: an array containing a list of route objects used for rendering the tabs

Each route object should contain the following properties:

- `key`: a unique key to identify the route (required)
- `title`: title for the route to display in the tab bar
- `icon`: icon for the route to display in the tab bar
- `accessibilityLabel`: accessibility label for the tab button
- `testID`: test id for the tab button

Example:

```js
{
  index: 1,
  routes: [
    { key: 'music', title: 'Music' },
    { key: 'albums', title: 'Albums' },
    { key: 'recents', title: 'Recents' },
    { key: 'purchased', title: 'Purchased' },
  ]
}
```

`TabView` is a controlled component, which means the `index` needs to be updated via the `onIndexChange` callback.

##### `onIndexChange` (`required`)

Callback which is called on tab change, receives the index of the new tab as argument.
The navigation state needs to be updated when it's called, otherwise the change is dropped.

##### `renderScene` (`required`)

Callback which returns a react element to render as the page for the tab. Receives an object containing the route as the argument:

```js
const renderScene = ({ route, jumpTo }) => {
  switch (route.key) {
    case 'music':
      return <MusicRoute jumpTo={jumpTo} />;
    case 'albums':
      return <AlbumsRoute jumpTo={jumpTo} />;
  }
};
```

You need to make sure that your individual routes implement a `shouldComponentUpdate` to improve the performance. To make it easier to specify the components, you can use the `SceneMap` helper.

`SceneMap` takes an object with the mapping of `route.key` to React components and returns a function to use with `renderScene` prop.

```js
import { SceneMap } from 'react-native-tab-view';

...

const renderScene = SceneMap({
  music: MusicRoute,
  albums: AlbumsRoute,
});
```

Specifying the components this way is easier and takes care of implementing a `shouldComponentUpdate` method.

Each scene receives the following props:

- `route`: the current route rendered by the component
- `jumpTo`: method to jump to other tabs, takes a `route.key` as it's argument
- `position`: animated node which represents the current position

The `jumpTo` method can be used to navigate to other tabs programmatically:

```js
props.jumpTo('albums');
```

All the scenes rendered with `SceneMap` are optimized using `React.PureComponent` and don't re-render when parent's props or states change. If you need more control over how your scenes update (e.g. - triggering a re-render even if the `navigationState` didn't change), use `renderScene` directly instead of using `SceneMap`.

:::warning

**Do not** pass inline functions to `SceneMap`, for example, don't do the following:

```js
SceneMap({
  first: () => <FirstRoute foo={props.foo} />,
  second: SecondRoute,
});
```

:::

Always define your components elsewhere in the top level of the file. If you pass inline functions, it'll re-create the component every render, which will cause the entire route to unmount and remount every change. It's very bad for performance and will also cause any local state to be lost.

If you need to pass additional props, use a custom `renderScene` function:

```js
const renderScene = ({ route }) => {
  switch (route.key) {
    case 'first':
      return <FirstRoute foo={this.props.foo} />;
    case 'second':
      return <SecondRoute />;
    default:
      return null;
  }
};
```

##### `renderTabBar`

Callback which returns a custom React Element to use as the tab bar:

```js
import { TabBar } from 'react-native-tab-view';

...

<TabView
  renderTabBar={props => <TabBar {...props} />}
  ...
/>
```

If this is not specified, the default tab bar is rendered. You pass this props to customize the default tab bar, provide your own tab bar, or disable the tab bar completely.

```js
<TabView
  renderTabBar={() => null}
  ...
/>
```

##### `tabBarPosition`

Position of the tab bar in the tab view. Possible values are `'top'` and `'bottom'`. Defaults to `'top'`.

##### `lazy`

Function which takes an object with the current route and returns a boolean to indicate whether to lazily render the scenes.

By default all scenes are rendered to provide a smoother swipe experience. But you might want to defer the rendering of unfocused scenes until the user sees them. To enable lazy rendering for a particular scene, return `true` from `lazy` for that `route`:

```js
<TabView
  lazy={({ route }) => route.name === 'Albums'}
  ...
/>
```

When you enable lazy rendering for a screen, it will usually take some time to render when it comes into focus. You can use the `renderLazyPlaceholder` prop to customize what the user sees during this short period.

You can also pass a boolean to enable lazy for all of the scenes:

```js
<TabView lazy />
```

##### `lazyPreloadDistance`

When `lazy` is enabled, you can specify how many adjacent routes should be preloaded with this prop. This value defaults to `0` which means lazy pages are loaded as they come into the viewport.

##### `renderLazyPlaceholder`

Callback which returns a custom React Element to render for routes that haven't been rendered yet. Receives an object containing the route as the argument. The `lazy` prop also needs to be enabled.

This view is usually only shown for a split second. Keep it lightweight.

By default, this renders `null`.

##### `keyboardDismissMode`

String indicating whether the keyboard gets dismissed in response to a drag gesture. Possible values are:

- `'auto'` (default): the keyboard is dismissed when the index changes.
- `'on-drag'`: the keyboard is dismissed when a drag begins.
- `'none'`: drags do not dismiss the keyboard.

##### `overScrollMode`

Used to override default value of pager's overScroll mode.

Possible values:

- `'auto'` (default): Allow a user to over-scroll this view only if the content is large enough to meaningfully scroll.
- `'always'`: Always allow a user to over-scroll this view.
- `'never'`: Never allow a user to over-scroll this view.

Only supported on Android.

##### `swipeEnabled`

Boolean indicating whether to enable swipe gestures. Swipe gestures are enabled by default. Passing `false` will disable swipe gestures, but the user can still switch tabs by pressing the tab bar.

##### `renderAdapter`

A function that returns a custom adapter for rendering pages. By default, `react-native-tab-view` uses [`react-native-pager-view`](https://github.com/callstack/react-native-pager-view) for rendering pages on Android and iOS. However, it may not be suitable for all use cases.

You can use built-in adapters or create your own custom adapter. For example, you can use `ScrollViewAdapter` to use a `ScrollView` for rendering pages:

```js
import React from 'react';
import { TabView, ScrollViewAdapter } from 'react-native-tab-view';

export default function TabViewExample() {
  const [index, setIndex] = React.useState(0);

  return (
    <TabView
      navigationState={{ index, routes }}
      renderScene={renderScene}
      onIndexChange={setIndex}
      renderAdapter={ScrollViewAdapter}
    />
  );
}
```

The following built-in adapters are available:

- `PagerViewAdapter`: Uses [`react-native-pager-view`](https://github.com/callstack/react-native-pager-view) for rendering pages (default on Android & iOS).
- `PanResponderAdapter`: Uses [`PanResponder`](https://reactnative.dev/docs/panresponder) for handling gestures (default on Web and other platforms).
- `ScrollViewAdapter`: Uses [`ScrollView`](https://reactnative.dev/docs/scrollview) for rendering pages.

You can also create your own custom adapter by implementing the required interface:

```ts
function MyAdapter({ navigationState, children }: AdapterProps) {
  const { index, routes } = navigationState;

  // Animated.Value containing the current position (index + offset)
  // This should be updated as the user swipes between pages
  const [position] = useState(() => new Animated.Value(index));

  const subscribe = useCallback(
    (callback: (event: { type: 'enter'; index: number }) => void) => {
      // Subscribe to `enter` events and call the callback when the page comes into view
      // This is used to render lazy loaded pages only when they come into view
    },
    []
  );

  const jumpTo = useCallback((key: string) => {
    // Function to jump to a specific page by key of the route
  }, []);

  return children({
    position,
    subscribe,
    jumpTo,
    render: (children) => {
      // Render the pages based on the `children` array
      // The `children` array contains react elements for each route in the routes array
    },
  });
}
```

Check out the [source code of the built-in adapters](https://github.com/react-navigation/react-navigation/tree/main/packages/react-native-tab-view/src) for reference.

#### `animationEnabled`

Enables animation when changing tab. By default it's true.

##### `onSwipeStart`

Callback which is called when the swipe gesture starts, i.e. the user touches the screen and moves it.

##### `onSwipeEnd`

Callback which is called when the swipe gesture ends, i.e. the user lifts their finger from the screen after the swipe gesture.

##### `initialLayout`

Object containing the initial height and width of the screens. Passing this will improve the initial rendering performance. For most apps, this is a good default:

```js
<TabView
  initialLayout={{ width: Dimensions.get('window').width }}
  ...
/>
```

##### `pagerStyle`

Style to apply to the pager view wrapping all the scenes.

##### `style`

Style to apply to the tab view container.

### `TabBar`

Material design themed tab bar. To customize the tab bar, you'd need to use the `renderTabBar` prop of `TabView` to render the `TabBar` and pass additional props.

For example, to customize the indicator color and the tab bar background color, you can pass `indicatorStyle` and `style` props to the `TabBar` respectively:

```js
const renderTabBar = props => (
  <TabBar
    {...props}
    indicatorStyle={{ backgroundColor: 'white' }}
    style={{ backgroundColor: 'pink' }}
  />
);

//...


return (
  <TabView
    renderTabBar={renderTabBar}
    ...
  />
);
```

#### TabBar Props

##### `renderTabBarItem`

Function which takes a `TabBarItemProps` object and returns a custom React Element to be used as a tab button.

##### `renderIndicator`

Function which takes an object with the current route and returns a custom React Element to be used as a tab indicator.

##### `onTabPress`

Function to execute on tab press. It receives the scene for the pressed tab, useful for things like scroll to top.

By default, tab press also switches the tab. To prevent this behavior, you can call `preventDefault`:

```js
<TabBar
  onTabPress={({ route, preventDefault }) => {
    if (route.key === 'home') {
      preventDefault();

      // Do something else
    }
  }}
  ...
/>
```

##### `onTabLongPress`

Function to execute on tab long press, use for things like showing a menu with more options

##### `activeColor`

Custom color for icon and label in the active tab.

##### `inactiveColor`

Custom color for icon and label in the inactive tab.

##### `pressColor`

Color for material ripple (Android >= 5.0 only).

##### `pressOpacity`

Opacity for pressed tab (iOS and Android < 5.0 only).

##### `scrollEnabled`

Boolean indicating whether to make the tab bar scrollable.

If you set `scrollEnabled` to `true`, you should also specify a `width` in `tabStyle` to improve the initial render.

##### `bounces`

Boolean indicating whether the tab bar bounces when scrolling.

##### `tabStyle`

Style to apply to the individual tab items in the tab bar.

By default, all tab items take up the same pre-calculated width based on the width of the container. If you want them to take their original width, you can specify `width: 'auto'` in `tabStyle`.

##### `indicatorStyle`

Style to apply to the active indicator.

##### `indicatorContainerStyle`

Style to apply to the container view for the indicator.

##### `contentContainerStyle`

Style to apply to the inner container for tabs.

##### `style` (`TabBar`)

Style to apply to the tab bar container.

##### `gap`

Spacing between the tab items.

##### `testID` (`TabBar`)

Test ID for the tab bar. Can be used for scrolling the tab bar in tests

#### Options

Options describe how each tab should be configured. There are 2 ways to specify options:

- `commonOptions`: Options that apply to all tabs.
- `options`: Options that apply to specific tabs. It has the route key as the key and the object with options.

Example:

```js
<TabView
  commonOptions={{
    icon: ({ route, focused, color }) => (
      <Icon name={route.icon} color={color} />
    ),
  }}
  options={{
    albums: {
      labelText: 'Albums',
    },
    profile: {
      labelText: 'Profile',
    },
  }}
/>
```

The following options are available:

##### `accessibilityLabel`

Accessibility label for the tab button. Uses `route.accessibilityLabel` by default if specified, otherwise uses the route title.

##### `accessible`

Whether to mark the tab as `accessible`. Defaults to `true`.

##### `testID`

Test ID for the tab button. Uses `route.testID` by default.

##### `labelText`

Label text for the tab button. Uses `route.title` by default.

##### `labelAllowFontScaling`

Whether label font should scale to respect Text Size accessibility settings. Defaults to `true`.

##### `href`

URL to use for the anchor tag for the tab button on the Web.

##### `label`

A function that returns a custom React Element to be used as a label. The function receives an object with the following properties:

- `route` - The route object for the tab.
- `labelText` - The label text for the tab specified in the `labelText` option or the `route title`.
- `focused` - Whether the label is for the focused state.
- `color` - The color of the label.
- `allowFontScaling` - Whether label font should scale to respect Text Size accessibility settings.
- `style` - The style object for the label.

```js
label: ({ route, labelText, focused, color }) => (
  <Text style={{ color, margin: 8 }}>{labelText ?? route.name}</Text>
);
```

##### `labelStyle`

Style to apply to the tab item label.

##### `icon`

A function that returns a custom React Element to be used as an icon. The function receives an object with the following properties:

- `route` - The route object for the tab.
- `focused` - Whether the icon is for the focused state.
- `color` - The color of the icon.
- `size` - The size of the icon.

```js
icon: ({ route, focused, color }) => (
  <Icon name={focused ? 'albums' : 'albums-outlined'} color={color} />
);
```

##### `badge`

A function that returns a custom React Element to be used as a badge. The function receives an object with the following properties:

- `route` - The route object for the tab.

```js
badge: ({ route }) => (
  <View
    style={{ backgroundColor: 'red', width: 20, height: 20, borderRadius: 10 }}
  />
);
```

##### `sceneStyle`

Style to apply to the view wrapping each screen. You can pass this to override some default styles such as overflow clipping.

## Optimization Tips

### Avoid unnecessary re-renders

The `renderScene` function is called every time the index changes. If your `renderScene` function is expensive, it's good idea move each route to a separate component if they don't depend on the index, and use `shouldComponentUpdate` or `React.memo` in your route components to prevent unnecessary re-renders.

For example, instead of:

```js
const renderScene = ({ route }) => {
  switch (route.key) {
    case 'home':
      return (
        <View style={styles.page}>
          <Avatar />
          <NewsFeed />
        </View>
      );
    default:
      return null;
  }
};
```

Do the following:

```js
const renderScene = ({ route }) => {
  switch (route.key) {
    case 'home':
      return <HomeComponent />;
    default:
      return null;
  }
};
```

Where `<HomeComponent />` is a `PureComponent` if you're using class components:

```js
export default class HomeComponent extends React.PureComponent {
  render() {
    return (
      <View style={styles.page}>
        <Avatar />
        <NewsFeed />
      </View>
    );
  }
}
```

Or, wrapped in `React.memo` if you're using function components:

```js
function HomeComponent() {
  return (
    <View style={styles.page}>
      <Avatar />
      <NewsFeed />
    </View>
  );
}

export default React.memo(HomeComponent);
```

### Avoid one frame delay

We need to measure the width of the container and hence need to wait before rendering some elements on the screen. If you know the initial width upfront, you can pass it in and we won't need to wait for measuring it. Most of the time, it's just the window width.

For example, pass the following `initialLayout` to `TabView`:

```js
const initialLayout = {
  height: 0,
  width: Dimensions.get('window').width,
};
```

The tab view will still react to changes in the dimension and adjust accordingly to accommodate things like orientation change.

### Optimize large number of routes

If you've a large number of routes, especially images, it can slow the animation down a lot. You can instead render a limited number of routes.

For example, do the following to render only 2 routes on each side:

```js
const renderScene = ({ route }) => {
  if (Math.abs(index - routes.indexOf(route)) > 2) {
    return <View />;
  }

  return <MySceneComponent route={route} />;
};
```

### Avoid rendering TabView inside ScrollView

Nesting the `TabView` inside a vertical `ScrollView` will disable the optimizations in the `FlatList` components rendered inside the `TabView`. So avoid doing it if possible.

### Use `lazy` and `renderLazyPlaceholder` props to render routes as needed

The `lazy` option is disabled by default to provide a smoother tab switching experience, but you can enable it and provide a placeholder component for a better lazy loading experience. Enabling `lazy` can improve initial load performance by rendering routes only when they come into view. Refer the [prop reference](#lazy) for more details.

---

## React Native Drawer Layout

Source: https://reactnavigation.org/docs/8.x/drawer-layout

A cross-platform Drawer component for React Native implemented using [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) and [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/) on native platforms and CSS transitions on Web.

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/drawer-layout.mp4" />
</video>

This package doesn't integrate with React Navigation. If you want to integrate the drawer layout with React Navigation's navigation system, e.g. want to show screens in the drawer and be able to navigate between them using `navigation.navigate` etc, use [Drawer Navigator](drawer-navigator.md) instead.

## Installation

To use this package, open a Terminal in the project root and run:

```bash npm2yarn
npm install react-native-drawer-layout@next
```

The library depends on [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) for gestures and [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/) for animations.

<Tabs groupId='framework' queryString="framework">
<TabItem value='expo' label='Expo' default>

If you have a Expo managed project, in your project directory, run:

```bash
npx expo install react-native-gesture-handler react-native-reanimated react-native-worklets
```

</TabItem>
<TabItem value='community-cli' label='Community CLI'>

If you have a bare React Native project, in your project directory, run:

```bash npm2yarn
npm install react-native-gesture-handler react-native-reanimated react-native-worklets
```

After installation, configure the Reanimated Babel Plugin in your project following the [installation guide](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started).

</TabItem>
</Tabs>

If you're on a Mac and developing for iOS, you also need to install [pods](https://cocoapods.org/) to complete the linking.

```bash
npx pod-install ios
```

## Quick start

```js
import * as React from 'react';
import { Text } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { Button } from '@react-navigation/elements';

export default function DrawerExample() {
  const [open, setOpen] = React.useState(false);

  return (
    <Drawer
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      renderDrawerContent={() => {
        return <Text>Drawer content</Text>;
      }}
    >
      <Button
        onPress={() => setOpen((prevOpen) => !prevOpen)}
        title={`${open ? 'Close' : 'Open'} drawer`}
      />
    </Drawer>
  );
}
```

## API reference

The package exports a `Drawer` component which is the one you'd use to render the drawer.

### `Drawer`

Component is responsible for rendering a drawer sidebar with animations and gestures.

#### Drawer Props

##### `open`

Whether the drawer is open or not.

##### `onOpen`

Callback which is called when the drawer is opened.

##### `onClose`

Callback which is called when the drawer is closed.

##### `renderDrawerContent`

Callback which returns a react element to render as the content of the drawer.

##### `layout`

Object containing the layout of the container. Defaults to the dimensions of the application's window.

##### `drawerPosition`

Position of the drawer on the screen. Defaults to `right` in RTL mode, otherwise `left`.

##### `drawerType`

Type of the drawer. It determines how the drawer looks and animates.

- `front`: Traditional drawer which covers the screen with a overlay behind it.
- `back`: The drawer is revealed behind the screen on swipe.
- `slide`: Both the screen and the drawer slide on swipe to reveal the drawer.
- `permanent`: A permanent drawer is shown as a sidebar.

Defaults to `front`.

##### `drawerStyle`

Style object for the drawer. You can pass a custom background color for drawer or a custom width for the drawer.

##### `overlayStyle`

Style object for the overlay.

##### `hideStatusBarOnOpen`

Whether to hide the status bar when the drawer is open. Defaults to `false`.

##### `keyboardDismissMode`

Whether to dismiss the keyboard when the drawer is open. Supported values are:

- `none`: The keyboard will not be dismissed when the drawer is open.
- `on-drag`: The keyboard will be dismissed when the drawer is opened by a swipe gesture.

Defaults to `on-drag`.

##### `statusBarAnimation`

Animation to use when the status bar is hidden. Supported values are:

- `slide`: The status bar will slide out of view.
- `fade`: The status bar will fade out of view.
- `none`: The status bar will not animate.

Use it in combination with `hideStatusBarOnOpen`.

##### `swipeEnabled`

Whether to enable swipe gestures to open the drawer. Defaults to `true`.

Swipe gestures are only supported on iOS and Android.

##### `swipeEdgeWidth`

How far from the edge of the screen the swipe gesture should activate. Defaults to `32`.

This is only supported on iOS and Android.

##### `swipeMinDistance`

Minimum swipe distance that should activate opening the drawer. Defaults to `60`.

This is only supported on iOS and Android.

##### `swipeMinVelocity`

Minimum swipe velocity that should activate opening the drawer. Defaults to `500`.

This is only supported on iOS and Android.

#### `configureGestureHandler`

Callback to configure the underlying [gesture from `react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/gesture). It receives the `gesture` object as an argument:

```js
configureGestureHandler={({ gesture }) => {
  return gesture.enableTrackpadTwoFingerGesture(false);
}}
```

##### `children`

Content that the drawer should wrap.

### `useDrawerProgress`

The `useDrawerProgress` hook returns a Reanimated `SharedValue` which represents the progress of the drawer. It can be used to animate the content of the screen.

Example with modern implementation:

```js
import { Animated } from 'react-native-reanimated';
import { useDrawerProgress } from 'react-native-drawer-layout';

// ...

function MyComponent() {
  const progress = useDrawerProgress();

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          translateX: interpolate(progress, [0, 1], [-100, 0]),
        },
      ],
    };
  });

  return <Animated.View style={animatedStyle}>{/* ... */}</Animated.View>;
}
```

If you are using class components, you can use the `DrawerProgressContext` to get the progress value.

```js
import { DrawerProgressContext } from 'react-native-drawer-layout';

// ...

class MyComponent extends React.Component {
  static contextType = DrawerProgressContext;

  render() {
    const progress = this.context;

    // ...
  }
}
```

:::warning

The `useDrawerProgress` hook (or `DrawerProgressContext`) will return a mock value on Web since Reanimated is not used on Web. The mock value can only represent the open state of the drawer (`0` when closed, `1` when open), and not the progress of the drawer.

:::

---

## Static configuration

Source: https://reactnavigation.org/docs/8.x/static-configuration

The bulk of the static configuration is done using the `createXNavigator` functions, e.g. [`createNativeStackNavigator`](native-stack-navigator.md), [`createBottomTabNavigator`](bottom-tab-navigator.md), [`createDrawerNavigator`](drawer-navigator.md) etc. We'll refer to these functions as `createXNavigator` in the rest of this guide.

## `createXNavigator`

The `createXNavigator` functions take one argument, which is an object with the following properties:

- Same props as the navigator component, e.g. `id`, `initialRouteName`, `screenOptions` etc. See [Navigator](navigator.md) as well as the docs for each navigator for more details on the props they accept.
- `screens` - an object containing configuration for each screen in the navigator.
- `groups` - an optional object containing groups of screens (equivalent to [`Group`](group.md) in the dynamic API).

For example:

```js
const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screenOptions: {
    headerTintColor: 'white',
    headerStyle: {
      backgroundColor: 'tomato',
    },
  },
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

### `screens`

The `screens` object can contain key value pairs where the key is the name of the screen and the value can be several things:

- A component to render:

  ```js
  const RootStack = createNativeStackNavigator({
    screens: {
      Home: HomeScreen,
    },
  });
  ```

- A navigator configured using `createXNavigator` for nested navigators:

  ```js
  const HomeTabs = createBottomTabNavigator({
    screens: {
      Groups: GroupsScreen,
      Chats: ChatsScreen,
    },
  });

  const RootStack = createNativeStackNavigator({
    screens: {
      Home: HomeTabs,
    },
  });
  ```

- An object containing configuration for the screen. This configuration contains the various properties:

  ```js
  const RootStack = createNativeStackNavigator({
    screens: {
      Home: {
        screen: HomeScreen,
        linking: {
          path: 'home',
        },
      },
    },
  });
  ```

  See [Screen configuration](#screen-configuration) for more details.

### `groups`

The `groups` object can contain key-value pairs where the key is the name of the group and the value is the group configuration.

The configuration object for a screen accepts the [properties described in the Group page](group.md). In addition, the following properties are available when using static configuration:

- `if` - this can be used to conditionally render the group and works the same as the [`if` property in the screen configuration](#if).
- `screens` - an object containing configuration for each screen in the group. The configuration is the same as the [`screens` object in the navigator configuration](#screens).

Example:

```js
const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
  groups: {
    Guest: {
      if: useIsGuest,
      screenOptions: {
        headerShown: false,
      },
      screens: {
        // ...
      },
    },
    User: {
      if: useIsUser,
      screens: {
        // ...
      },
    },
  },
});
```

### Screen configuration

The configuration object for a screen accepts the [properties described in the Screen page](screen.md). In addition, the following properties are available when using static configuration:

#### `createXScreen`

Each navigator exports a helper function to create screen configurations with proper TypeScript types. These helpers enable type inference for the params in the configuration.

Example usage:

```js
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator({
  screens: {
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
      options: ({ route }) => {
        const userId = route.params.userId;

        return {
          title: `${userId}'s profile`,
        };
      },
    }),
  },
});
```

Each navigator exports its own helper function:

- `createNativeStackScreen` from `@react-navigation/native-stack`
- `createStackScreen` from `@react-navigation/stack`
- `createBottomTabScreen` from `@react-navigation/bottom-tabs`
- `createDrawerScreen` from `@react-navigation/drawer`
- `createMaterialTopTabScreen` from `@react-navigation/material-top-tabs`

#### `linking`

[Linking configuration](configuring-links.md) for the screen. It can be either a string for a path or an object with the linking configuration:

```js
const RootStack = createNativeStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      linking: {
        path: 'u/:userId',
        parse: {
          userId: (id) => id.replace(/^@/, ''),
        },
        stringify: {
          userId: (id) => `@${id}`,
        },
      },
    },
    Chat: {
      screen: ChatScreen,
      linking: 'chat/:chatId',
    },
  },
});
```

The `linking` object supports the same configuration options described in [Configuring links](configuring-links.md) such as `parse`, `stringify` and `exact`.

To make deep links work on native apps, you also need to [configure your app](deep-linking.md) and pass `prefixes` to the navigation component returned by [`createStaticNavigation`](static-configuration.md#createstaticnavigation):

```js
const Navigation = createStaticNavigation(RootStack);

const linking = {
  prefixes: ['https://example.com', 'example://'],
};

function App() {
  return <Navigation linking={linking} />;
}
```

#### `if`

Callback to determine whether the screen should be rendered or not. It doesn't receive any arguments. This can be useful for conditional rendering of screens, e.g. - if you want to render a different screen for logged in users.

You can use a custom hook to use custom logic to determine the return value:

```js
const useIsLoggedIn = () => {
  const { isLoggedIn } = React.useContext(AuthContext);

  return isLoggedIn;
};

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      if: useIsLoggedIn,
    },
  },
});
```

The above example will only render the `HomeScreen` if the user is logged in.

For more details, see [Authentication flow](auth-flow.md?config=static).

## `createStaticNavigation`

The `createStaticNavigation` function takes the static config returned by `createXNavigator` functions and returns a React component to render:

```js
const Navigation = createStaticNavigation(RootStack);

function App() {
  return <Navigation />;
}
```

This component is a wrapper around the `NavigationContainer` component and accepts the [same props and ref as the `NavigationContainer`](navigation-container.md) component. It is intended to be rendered once at the root of your app similar to how you'd use `NavigationContainer` component.

### Differences in the `linking` prop

Similar to `NavigationContainer`, the component returned by `createStaticNavigation` also accepts a [`linking`](navigation-container.md#linking) prop. However, there are some key differences:

1. It's not possible to pass a full `config` object to the `linking` prop. It can only accept [`path`](configuring-links.md#apps-under-subpaths) and an [`initialRouteName` for the root navigator](configuring-links.md#rendering-an-initial-route).
2. The linking config is collected from the [`linking`](#linking) properties specified in the screen configuration.
3. It's possible to pass `enabled: 'auto'` to automatically generate paths for all leaf screens:

   ```js
   const Navigation = createStaticNavigation(RootStack);

   const linking = {
     enabled: 'auto',
     prefixes: ['https://example.com', 'example://'],
   };

   function App() {
     return <Navigation linking={linking} />;
   }
   ```

   See [How does automatic path generation work](configuring-links.md#how-does-automatic-path-generation-work) for more details.

By default, linking is enabled in static configuration with automatic path generation. It needs to be explicitly disabled by passing `enabled: false` to the `linking` prop if you don't want linking support.

## `createComponentForStaticNavigation`

The `createComponentForStaticNavigation` function takes the static config returned by `createXNavigator` functions and returns a React component to render. The second argument is a name for the component that'd be used in React DevTools:

```js
const RootStackNavigator = createComponentForStaticNavigation(
  RootStack,
  'RootNavigator'
);
```

The returned component doesn't take any props. All of the configuration is inferred from the static config. It's essentially the same as defining a component using the dynamic API.

This looks similar to `createStaticNavigation` however they are very different. When using static configuration, you'd never use this function directly. The only time you'd use this is if you're migrating away from static configuration and want to reuse existing code you wrote instead of rewriting it to the dynamic API. See [Combining static and dynamic APIs](combine-static-with-dynamic.md) for more details.

## `createPathConfigForStaticNavigation`

The `createPathConfigForStaticNavigation` function takes the static config returned by `createXNavigator` functions and returns a path config object that can be used within the linking config.

```js
const config = {
  screens: {
    Home: {
      screens: createPathConfigForStaticNavigation(HomeTabs),
    },
  },
};
```

Similar to `createComponentForStaticNavigation`, this is intended to be used when migrating away from static configuration. See [Combining static and dynamic APIs](combine-static-with-dynamic.md) for more details.

---

## NavigationContainer

Source: https://reactnavigation.org/docs/8.x/navigation-container

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The `NavigationContainer` is responsible for managing your app's navigation state and linking your top-level navigator to the app environment.

The container takes care of platform specific integration and provides various useful functionality:

1. Deep link integration with the [`linking`](#linking) prop.
2. Notify state changes for [screen tracking](screen-tracking.md), [state persistence](state-persistence.md) etc.
3. Handle system back button on Android by using the [`BackHandler`](https://reactnative.dev/docs/backhandler) API from React Native.

Usage:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

When using the static API, the component returned by [`createStaticNavigation`](static-configuration.md#createstaticnavigation) is equivalent to the `NavigationContainer` component.

```js
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator({
  screens: {
    /* ... */
  },
});

const Navigation = createStaticNavigation(Stack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>{/* ... */}</Stack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

## Ref

It's possible to pass a [`ref`](https://react.dev/learn/referencing-values-with-refs) to the container to get access to various helper methods, for example, dispatch navigation actions. This should be used in rare cases when you don't have access to the [`navigation` object](navigation-object.md), such as a Redux middleware.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Using refs" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import {
  createStaticNavigation,
  useNavigationContainerRef,
} from '@react-navigation/native';
// codeblock-focus-end
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator({
  initialRouteName: 'Empty',
  screens: {
    Empty: () => <View></View>,
    Home: HomeScreen,
  },
});

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

const Navigation = createStaticNavigation(Stack);

// codeblock-focus-start

export default function App() {
  // highlight-next-line
  const navigationRef = useNavigationContainerRef(); // You can also use a regular ref with `React.useRef()`

  return (
    <View style={{ flex: 1 }}>
      <Button onPress={() => navigationRef.navigate('Home')}>Go home</Button>
      <Navigation ref={navigationRef} />
    </View>
  );
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Using refs" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
// codeblock-focus-end
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createStackNavigator();

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

// codeblock-focus-start

export default function App() {
  // highlight-next-line
  const navigationRef = useNavigationContainerRef(); // You can also use a regular ref with `React.useRef()`

  return (
    <View style={{ flex: 1 }}>
      <Button onPress={() => navigationRef.navigate('Home')}>Go home</Button>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator initialRouteName="Empty">
          <Stack.Screen name="Empty" component={() => <View></View>} />
          <Stack.Screen name="Home" component={HomeScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </View>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

If you're using a regular ref object, keep in mind that the ref may be initially `null` in some situations (such as when linking is enabled). To make sure that the ref is initialized, you can use the [`onReady`](#onready) callback to get notified when the navigation container finishes mounting.

Check how to setup `ref` with TypeScript [here](typescript.md#annotating-ref-on-navigationcontainer).

See the [Navigating without the navigation prop](navigating-without-navigation-prop.md) guide for more details.

### Methods on the ref

The ref object includes all of the common navigation methods such as `navigate`, `goBack` etc. See [docs for `CommonActions`](navigation-actions.md) for more details.

Example:

```js
navigationRef.navigate(name, params);
```

All of these methods will act as if they were called inside the currently focused screen. It's important note that there must be a navigator rendered to handle these actions.

In addition to these methods, the ref object also includes the following special methods:

#### `isReady`

The `isReady` method returns a `boolean` indicating whether the navigation tree is ready. The navigation tree is ready when the `NavigationContainer` contains at least one navigator and all of the navigators have finished mounting.

This can be used to determine whether it's safe to dispatch navigation actions without getting an error. See [handling initialization](navigating-without-navigation-prop.md#handling-initialization) for more details.

#### `resetRoot`

The `resetRoot` method lets you reset the state of the navigation tree to the specified state object:

```js
navigationRef.resetRoot({
  index: 0,
  routes: [{ name: 'Profile' }],
});
```

Unlike the `reset` method, this acts on the root navigator instead of navigator of the currently focused screen.

#### `getRootState`

The `getRootState` method returns a [navigation state](navigation-state.md) object containing the navigation states for all navigators in the navigation tree:

```js
const state = navigationRef.getRootState();
```

Note that the returned `state` object will be `undefined` if there are no navigators currently rendered.

#### `getCurrentRoute`

The `getCurrentRoute` method returns the route object for the currently focused screen in the whole navigation tree:

```js
const route = navigationRef.getCurrentRoute();
```

Note that the returned `route` object will be `undefined` if there are no navigators currently rendered.

#### `getCurrentOptions`

The `getCurrentOptions` method returns the options for the currently focused screen in the whole navigation tree:

```js
const options = navigationRef.getCurrentOptions();
```

Note that the returned `options` object will be `undefined` if there are no navigators currently rendered.

#### `addListener`

The `addListener` method lets you listen to the following events:

##### `ready`

The event is triggered when the navigation tree is ready. This is useful for cases where you want to wait until the navigation tree is mounted:

```js
const unsubscribe = navigationRef.addListener('ready', () => {
  // Get the initial state of the navigation tree
  console.log(navigationRef.getRootState());
});
```

This is analogous to the [`onReady`](#onready) method.

##### `state`

The event is triggered whenever the [navigation state](navigation-state.md) changes in any navigator in the navigation tree:

```js
const unsubscribe = navigationRef.addListener('state', (e) => {
  // You can get the raw navigation state (partial state object of the root navigator)
  console.log(e.data.state);

  // Or get the full state object with `getRootState()`
  console.log(navigationRef.getRootState());
});
```

This is analogous to the [`onStateChange`](#onstatechange) method. The only difference is that the `e.data.state` object might contain partial state object unlike the `state` argument in `onStateChange` which will always contain the full state object.

##### `options`

The event is triggered whenever the options change for the currently focused screen in the navigation tree:

```js
const unsubscribe = navigationRef.addListener('options', (e) => {
  // You can get the new options for the currently focused screen
  console.log(e.data.options);
});
```

## Props

### `initialState`

Prop that accepts initial state for the navigator. This can be useful for cases such as deep linking, state persistence etc.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  // highlight-next-line
  initialState={initialState}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  // highlight-next-line
  initialState={initialState}
>
  {/* ... */}
</NavigationContainer>
```

</TabItem>
</Tabs>

See [Navigation state reference](navigation-state.md) for more details on the structure of the state object.

Providing a custom initial state object will override the initial state object obtained via linking configuration or from browser's URL. If you're providing an initial state object, make sure that you don't pass it on web and that there's no deep link to handle.

Example:

```js
const initialUrl = await Linking.getInitialURL();

if (Platform.OS !== 'web' && initialUrl == null) {
  // Only restore state if there's no deep link and we're not on web
}
```

See [state persistence guide](state-persistence.md) for more details on how to persist and restore state.

### `onStateChange`

:::warning

Consider the navigator's state object to be internal and subject to change in a minor release. Avoid using properties from the [navigation state](navigation-state.md) state object except `index` and `routes`, unless you really need it. If there is some functionality you cannot achieve without relying on the structure of the state object, please open an issue.

:::

Function that gets called every time [navigation state](navigation-state.md) changes. It receives the new navigation state as the argument.

You can use it to track the focused screen, persist the navigation state etc.

Example:
<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  // highlight-next-line
  onStateChange={(state) => console.log('New state is', state)}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  // highlight-next-line
  onStateChange={(state) => console.log('New state is', state)}
>
  {/* ... */}
</NavigationContainer>
```

</TabItem>
</Tabs>

### `onReady`

Function which is called after the navigation container and all its children finish mounting for the first time. You can use it for:

- Making sure that the `ref` is usable. See [docs regarding initialization of the ref](navigating-without-navigation-prop.md#handling-initialization) for more details.
- Hiding your native splash screen

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  // highlight-next-line
  onReady={() => console.log('Navigation container is ready')}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  // highlight-next-line
  onReady={() => console.log('Navigation container is ready')}
>
  {/* ... */}
</NavigationContainer>
```

</TabItem>
</Tabs>

This callback won't fire if there are no navigators rendered inside the container.

The current status can be obtained with the [`isReady`](#isready) method on the ref.

### `onUnhandledAction`

Function which is called when a navigation action is not handled by any of the navigators.

By default, React Navigation will show a development-only error message when an action is not handled. You can override the default behavior by providing a custom function.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  // highlight-next-line
  onUnhandledAction={(action) => console.error('Unhandled action', action)}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  // highlight-next-line
  onUnhandledAction={(action) => console.error('Unhandled action', action)}
>
  {/* ... */}
</NavigationContainer>
```

</TabItem>
</Tabs>

### `linking`

Configuration for linking integration used for deep linking, URL support in browsers etc.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: Home,
      linking: {
        path: 'feed/:sort',
      },
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

function App() {
  const linking = {
    prefixes: ['https://example.com', 'example://'],
  };

  return (
    <Navigation
      // highlight-next-line
      linking={linking}
      fallback={<Text>Loading...</Text>}
    />
  );
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import { NavigationContainer } from '@react-navigation/native';

function App() {
  const linking = {
    prefixes: ['https://example.com', 'example://'],
    config: {
      screens: {
        Home: 'feed/:sort',
      },
    },
  };

  return (
    <NavigationContainer
      // highlight-next-line
      linking={linking}
      fallback={<Text>Loading...</Text>}
    >
      {/* content */}
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>
See [configuring links guide](configuring-links.md) for more details on how to configure deep links and URL integration.

#### Options

##### `linking.prefixes`

URL prefixes to handle. You can provide multiple prefixes to support custom schemes as well as [universal links](https://developer.apple.com/ios/universal-links/).

Only URLs matching these prefixes will be handled. The prefix will be stripped from the URL before parsing.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  linking={{
    // highlight-next-line
    prefixes: ['https://example.com', 'example://'],
  }}
  fallback={<Text>Loading...</Text>}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  linking={{
    // highlight-next-lineP
    prefixes: ['https://example.com', 'example://'],
    config: {
      // ...
    },
  }}
>
  {/* content */}
</NavigationContainer>
```

</TabItem>
</Tabs>

This is only supported on iOS and Android.

##### `linking.config`

Config to fine-tune how to parse the path.

When using dynamic API, the config object should represent the structure of the navigators in the app.

See the [configuring links guide](configuring-links.md) for more details on how to configure deep links and URL integration.

##### `linking.enabled`

Optional boolean to enable or disable the linking integration. Defaults to `true` if the `linking` prop is specified.

When using the static API, it's possible to pass `'auto'` to automatically generate the config based on the navigator's structure. See the [configuring links guide](configuring-links.md) for more details.

##### `linking.getInitialURL`

By default, linking integrates with React Native's `Linking` API and uses `Linking.getInitialURL()` to provide built-in support for deep linking. However, you might also want to handle links from other sources, such as [Branch](https://help.branch.io/developers-hub/docs/react-native), or push notifications using [Firebase](https://rnfirebase.io/messaging/notifications) etc.

You can provide a custom `getInitialURL` function where you can return the link which we should use as the initial URL. The `getInitialURL` function should return a `string` if there's a URL to handle, otherwise `undefined`.

For example, you could do something like following to handle both deep linking and [Firebase notifications](https://rnfirebase.io/messaging/notifications):

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import messaging from '@react-native-firebase/messaging';

<Navigation
  linking={{
    prefixes: ['https://example.com', 'example://'],
    // highlight-start
    async getInitialURL() {
      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();

      if (url != null) {
        return url;
      }

      // Check if there is an initial firebase notification
      const message = await messaging().getInitialNotification();

      // Get the `url` property from the notification which corresponds to a screen
      // This property needs to be set on the notification payload when sending it
      return message?.data?.url;
    },
    // highlight-end
  }}
/>;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import messaging from '@react-native-firebase/messaging';

<NavigationContainer
  linking={{
    prefixes: ['https://example.com', 'example://'],
    config: {
      // ...
    },
    // highlight-start
    async getInitialURL() {
      // Check if app was opened from a deep link
      const url = await Linking.getInitialURL();

      if (url != null) {
        return url;
      }

      // Check if there is an initial firebase notification
      const message = await messaging().getInitialNotification();

      // Get the `url` property from the notification which corresponds to a screen
      // This property needs to be set on the notification payload when sending it
      return message?.data?.url;
    },
    // highlight-end
  }}
>
  {/* content */}
</NavigationContainer>;
```

</TabItem>
</Tabs>

This option is not available on Web.

##### `linking.subscribe`

Similar to [`getInitialURL`](#linkinggetinitialurl), you can provide a custom `subscribe` function to handle any incoming links instead of the default deep link handling. The `subscribe` function will receive a listener as the argument and you can call it with a URL string whenever there's a new URL to handle. It should return a cleanup function where you can unsubscribe from any event listeners that you have setup.

For example, you could do something like following to handle both deep linking and [Firebase notifications](https://rnfirebase.io/messaging/notifications):

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import messaging from '@react-native-firebase/messaging';

<Navigation
  linking={{
    prefixes: ['https://example.com', 'example://'],
    // highlight-start
    subscribe(listener) {
      const onReceiveURL = ({ url }: { url: string }) => listener(url);

      // Listen to incoming links from deep linking
      const subscription = Linking.addEventListener('url', onReceiveURL);

      // Listen to firebase push notifications
      const unsubscribeNotification = messaging().onNotificationOpenedApp(
        (message) => {
          const url = message.data?.url;

          if (url) {
            // Any custom logic to check whether the URL needs to be handled
            //...

            // Call the listener to let React Navigation handle the URL
            listener(url);
          }
        }
      );

      return () => {
        // Clean up the event listeners
        subscription.remove();
        unsubscribeNotification();
      };
    },
    // highlight-end
  }}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import messaging from '@react-native-firebase/messaging';

<NavigationContainer
  linking={{
    prefixes: ['https://example.com', 'example://'],
    config: {
      // ...
    },
    // highlight-start
    subscribe(listener) {
      const onReceiveURL = ({ url }: { url: string }) => listener(url);

      // Listen to incoming links from deep linking
      const subscription = Linking.addEventListener('url', onReceiveURL);

      // Listen to firebase push notifications
      const unsubscribeNotification = messaging().onNotificationOpenedApp(
        (message) => {
          const url = message.data?.url;

          if (url) {
            // Any custom logic to check whether the URL needs to be handled
            //...

            // Call the listener to let React Navigation handle the URL
            listener(url);
          }
        }
      );

      return () => {
        // Clean up the event listeners
        subscription.remove();
        unsubscribeNotification();
      };
    },
    // highlight-end
  }}
>
  {/* content */}
</NavigationContainer>;
```

</TabItem>
</Tabs>

This option is not available on Web.

##### `linking.getStateFromPath`

React Navigation handles deep links and [URLs on Web](web-support.md) by parsing the path to a [navigation state](navigation-state.md) object based on the [linking config](#linkingconfig). You can optionally override the way the parsing happens by providing your own `getStateFromPath` function.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  linking={{
    prefixes: ['https://example.com', 'example://'],
    // highlight-start
    getStateFromPath(path, config) {
      // Return a state object here
      // You can also reuse the default logic by importing `getStateFromPath` from `@react-navigation/native`
    },
    // highlight-end
  }}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  linking={{
    prefixes: ['https://example.com', 'example://'],
    config: {
      // ...
    },
    // highlight-start
    getStateFromPath(path, config) {
      // Return a state object here
      // You can also reuse the default logic by importing `getStateFromPath` from `@react-navigation/native`
    },
    // highlight-end
  }}
>
  {/* content */}
</NavigationContainer>
```

</TabItem>
</Tabs>

##### `linking.getPathFromState`

On Web, React Navigation automatically updates the [URL in the browser's address bar](web-support.md) to match the current navigation state by serializing the state to a path based on the [linking config](#linkingconfig). You can optionally override the way the serialization happens by providing your own `getPathFromState` function.

If you provide a custom [`getStateFromPath`](#linkinggetstatefrompath), you should also provide a custom `getPathFromState` to ensure that the parsing and serialization are consistent with each other for Web support to work correctly.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  linking={{
    prefixes: ['https://example.com', 'example://'],
    // highlight-start
    getPathFromState(state, config) {
      // Return a path string here
      // You can also reuse the default logic by importing `getPathFromState` from `@react-navigation/native`
    },
    // highlight-end
  }}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  linking={{
    prefixes: ['https://example.com', 'example://'],
    config: {
      // ...
    },
    // highlight-start
    getPathFromState(state, config) {
      // Return a path string here
      // You can also reuse the default logic by importing `getPathFromState` from `@react-navigation/native`
    },
    // highlight-end
  }}
>
  {/* content */}
</NavigationContainer>
```

</TabItem>
</Tabs>

##### `linking.getActionFromState`

The state parsed with [`getStateFromPath`](#linkinggetstatefrompath) is used as the initial state of the navigator. But for subsequent deep links and URLs, the state is converted to a navigation action. Typically it is a [`navigate`](navigation-actions.md#navigate) action.

You can provide a custom `getActionFromState` function to customize how the state is converted to an action.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  linking={{
    prefixes: ['https://example.com', 'example://'],
    // highlight-start
    getActionFromState(state, config) {
      // Return a navigation action here
      // You can also reuse the default logic by importing `getActionFromState` from `@react-navigation/native`
    },
    // highlight-end
  }}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  linking={{
    prefixes: ['https://example.com', 'example://'],
    config: {
      // ...
    },
    // highlight-start
    getActionFromState(state, config) {
      // Return a navigation action here
      // You can also reuse the default logic by importing `getActionFromState` from `@react-navigation/native`
    },
    // highlight-end
  }}
>
  {/* content */}
</NavigationContainer>
```

</TabItem>
</Tabs>

### `fallback`

React Element to use as a fallback while we resolve deep links. Defaults to `null`.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  // highlight-next-line
  fallback={<Text>Loading...</Text>}
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  // highlight-next-line
  fallback={<Text>Loading...</Text>}
>
  {/* content */}
</NavigationContainer>
```

</TabItem>
</Tabs>

If you have a native splash screen, please use [`onReady`](#onready) instead of `fallback` prop.

### `documentTitle`

By default, React Navigation automatically updates the document title on Web to match the `title` option of the focused screen. You can disable it or customize it using this prop. It accepts a configuration object with the following options:

#### `documentTitle.enabled`

Whether document title handling should be enabled. Defaults to `true`.

#### `documentTitle.formatter`

Custom formatter to use if you want to customize the title text. Defaults to:

```js
(options, route) => options?.title ?? route?.name;
```

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  // highlight-start
  documentTitle={{
    formatter: (options, route) =>
      `${options?.title ?? route?.name} - My Cool App`,
  }}
  // highlight-end
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  // highlight-start
  documentTitle={{
    formatter: (options, route) =>
      `${options?.title ?? route?.name} - My Cool App`,
  }}
  // highlight-end
>
  {/* content */}
</NavigationContainer>
```

</TabItem>
</Tabs>

### `theme`

Custom theme to use for the navigation components such as the header, tab bar etc. See [theming guide](themes.md) for more details and usage guide.

### `direction`

The direction of the text configured in the app. Defaults to `'rtl'` when `I18nManager.getConstants().isRTL` returns `true`, otherwise `'ltr'`.

Supported values:

- `'ltr'`: Left-to-right text direction for languages like English, French etc.
- `'rtl'`: Right-to-left text direction for languages like Arabic, Hebrew etc.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
<Navigation
  // highlight-next-line
  direction="rtl"
/>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<NavigationContainer
  // highlight-next-line
  direction="rtl"
>
  {/* content */}
</NavigationContainer>
```

</TabItem>
</Tabs>

This is used in various navigators to adjust the content according to the text direction, for example, the drawer in the [drawer navigator](drawer-navigator.md) is positioned on the right side in RTL languages.

This prop informs React Navigation about the text direction in the app, it doesn't change the text direction by itself. If you intend to support RTL languages, it's important to set this prop to the correct value that's configured in the app. If it doesn't match the actual text direction, the layout might be incorrect.

On the Web, it may also be necessary to set the `dir` attribute on the root element of the app to ensure that the text direction is correct:

```html
<html dir="rtl">
  <!-- App content -->
</html>
```

The `direction` will be available to use in your own components via the `useLocale` hook:

```js
import { useLocale } from '@react-navigation/native';

function MyComponent() {
  const { direction } = useLocale();

  // Use the direction
}
```

### `persistor`

An object containing functions to persist and restore the [navigation state](navigation-state.md).
The `persistor` object should contain two functions:

- `persist` - Function that receives the navigation state as an argument and should save it to storage.
- `restore` - Function that returns the previously saved state from storage, or `undefined` if there's no saved state.

These function can be both synchronous or asynchronous. If a promise is returned from the `restore` function, make sure to provide a [`fallback`](navigation-container.md#fallback).

See [state persistence guide](state-persistence.md) for example usage.

## Independent navigation containers

:::warning

This is an advanced use case. Don't use this unless you are 100% sure that you need it.

:::

In most apps, there will be only a single `NavigationContainer`. Nesting multiple `NavigationContainer`s will throw an error. However, in rare cases, it may be useful to have multiple independent navigation trees, e.g. including a mini-app inside a larger app.

You can wrap the nested `NavigationContainer` with the `NavigationIndependentTree` component to make it independent from the parent navigation tree:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import {
  createStaticNavigation,
  NavigationIndependentTree,
} from '@react-navigation/native';

/* content */

const Navigation = createStaticNavigation(RootStack);

function NestedApp() {
  return (
    // highlight-start
    <NavigationIndependentTree>
      <Navigation />
    </NavigationIndependentTree>
    // highlight-end
  );
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import {
  NavigationContainer,
  NavigationIndependentTree,
} from '@react-navigation/native';

function NestedApp() {
  return (
    // highlight-start
    <NavigationIndependentTree>
      <NavigationContainer>{/* content */}</NavigationContainer>
    </NavigationIndependentTree>
    // highlight-end
  );
}
```

</TabItem>
</Tabs>

Doing this disconnects any children navigators from the parent container and doesn't allow navigation between them.

Avoid using this if you need to integrate with third-party components such as modals or bottom sheets. Consider using a [custom navigator](custom-navigators.md) instead.

---

## ServerContainer

Source: https://reactnavigation.org/docs/8.x/server-container

The `ServerContainer` component provides utilities to render your app on server with the correct [navigation state](navigation-state.md).

Example:

```js
// Ref which will be populated with the screen options
const ref = React.createRef();

// Location object containing the `pathname` and `search` fields of the current URL
const location = { pathname: '/profile', search: '?user=jane' };

// Get rendered HTML
const html = ReactDOMServer.renderToString(
  <ServerContainer ref={ref} location={location}>
    <App />
  </ServerContainer>
);

// Then you can access the options for the current screen in the ref
const options = ref.current.getCurrentOptions(); // { title: 'My Profile' }
```

The `ServerContainer` component should wrap your entire app during server rendering. Note that you still need a `NavigationContainer` in your app, `ServerContainer` doesn't replace it.'

See the [`server rendering guide`](server-rendering.md) for a detailed guide and examples.

## Ref

If you attach a `ref` to the container, you can get the options for the current screen after rendering the app. The `ref` will contain a method called `getCurrentOptions` which will return an object with options for the focused screen in the navigation tree:

```js
const options = ref.current.getCurrentOptions();
```

Then you can access the options for the screen from this object and put it in the HTML:

```jsx
<title>{options.title}</title>
<meta name="description" content={options.description} />
```

Note that the `options` object can be undefined if you are not rendering a navigator on the initial render.

## Props

### `location`

Location object containing the location to use for server rendered output. You can pass the `pathname` and `search` properties matching the `location` object in the browsers:

```js
<ServerContainer location={{ pathname: '/profile', search: '' }}>
  <App />
</ServerContainer>
```

Normally, you'd construct this object based on the incoming request.

Basic example with Koa (don't use as is in production):

```js
app.use(async (ctx) => {
  const html = ReactDOMServer.renderToString(
    <ServerContainer location={{ pathname: ctx.path, search: ctx.search }}>
      <App />
    </ServerContainer>
  );

  ctx.body = html;
});
```

---

## Navigator

Source: https://reactnavigation.org/docs/8.x/navigator

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A navigator is responsible for managing and rendering a set of screens. It can be created using the `createXNavigator` functions, e.g. [`createStackNavigator`](stack-navigator.md), [`createNativeStackNavigator`](native-stack-navigator.md), [`createBottomTabNavigator`](bottom-tab-navigator.md), [`createMaterialTopTabNavigator`](material-top-tab-navigator.md), [`createDrawerNavigator`](drawer-navigator.md) etc.:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

In addition to the built-in navigators, it's also possible to build your custom navigators or use third-party navigators. See [custom navigators](custom-navigators.md) for more details.

## Configuration

Different navigators accept different configuration options. You can find the list of options for each navigator in their respective documentation.

There is a set of common configurations that are shared across all navigators:

### Initial route name

The name of the route to render on the first load of the navigator.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  // highlight-next-line
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator
      // highlight-next-line
      initialRouteName="Home"
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

### Layout

A layout is a wrapper around the navigator. It can be useful for augmenting the navigators with additional UI with a wrapper.

The difference from adding a wrapper around the navigator manually is that the code in a layout callback has access to the navigator's state, options etc.

It takes a function that returns a React element:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  // highlight-start
  layout: ({ children, state, descriptors, navigation }) => (
    <View style={styles.container}>
      <Breadcrumbs
        state={state}
        descriptors={descriptors}
        navigation={navigation}
      />
      {children}
    </View>
  ),
  // highlight-end
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator
      // highlight-start
      layout={({ children, state, descriptors, navigation }) => (
        <View style={styles.container}>
          <Breadcrumbs
            state={state}
            descriptors={descriptors}
            navigation={navigation}
          />
          {children}
        </View>
      )}
      // highlight-end
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

### Screen options

Default options to use for all the screens in the navigator. It accepts either an object or a function returning an object:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  // highlight-start
  screenOptions: {
    headerShown: false,
  },
  // highlight-end
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator
      // highlight-start
      screenOptions={{ headerShown: false }}
      // highlight-end
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

See [Options for screens](screen-options.md) for more details and examples.

### Screen listeners

Event listeners can be used to subscribe to various events emitted for the screen. See [`screenListeners` prop on the navigator](navigation-events.md#screenlisteners-prop-on-the-navigator) for more details.

### Screen layout

A screen layout is a wrapper around each screen in the navigator. It makes it easier to provide things such as an error boundary and suspense fallback for all screens in the navigator, or wrap each screen with additional UI.

It takes a function that returns a React element:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  // highlight-start
  screenLayout: ({ children }) => (
    <ErrorBoundary>
      <React.Suspense
        fallback={
          <View style={styles.fallback}>
            <Text style={styles.text}>Loading…</Text>
          </View>
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  ),
  // highlight-end
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator
      // highlight-start
      screenLayout={({ children }) => (
        <ErrorBoundary>
          <React.Suspense
            fallback={
              <View style={styles.fallback}>
                <Text style={styles.text}>Loading…</Text>
              </View>
            }
          >
            {children}
          </React.Suspense>
        </ErrorBoundary>
      )}
      // highlight-end
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

### Router

Routers can be customized with the `router` prop on navigator to override how navigation actions are handled.

It takes a function that receives the original router and returns an object with overrides:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  // highlight-start
  router: (original) => ({
    getStateForAction(state, action) {
      if (action.type === 'SOME_ACTION') {
        // Custom logic
      }

      // Fallback to original behavior
      return original.getStateForAction(state, action);
    },
  }),
  // highlight-end
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator
      // highlight-start
      router={(original) => ({
        getStateForAction(state, action) {
          if (action.type === 'SOME_ACTION') {
            // Custom logic
          }

          // Fallback to original behavior
          return original.getStateForAction(state, action);
        },
      })}
      // highlight-end
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

The function passed to `router` **must be a pure function and cannot reference outside dynamic variables**.

The overrides object is shallow merged with the original router. So you don't need to specify all properties of the router, only the ones you want to override.

See [custom routers](custom-routers.md) for more details on routers.

### Route names change behavior

:::warning

This API is experimental and may change in a minor release.

:::

When the list of available routes in a navigator changes dynamically, e.g. based on conditional rendering, looping over data from an API etc., the navigator needs to update the [navigation state](navigation-state.md) according to the new list of routes.

By default, it works as follows:

- Any routes not present in the new available list of routes are removed from the navigation state
- If the currently focused route is still present in the new available list of routes, it remains focused.
- If the currently focused route has been removed, but the navigation state has other routes that are present in the new available list, the first route in from the list of rendered routes becomes focused.
- If none of the routes in the navigation state are present in the new available list of routes, one of the following things can happen based on the `routeNamesChangeBehavior` prop:
  - `'firstMatch'` - The first route defined in the new list of routes becomes focused. This is the default behavior based on [`getStateForRouteNamesChange`](custom-routers.md) in the router.
  - `'lastUnhandled'` - The last state that was unhandled due to conditional rendering is restored.

Example cases where state might have been unhandled:

- Opened a deep link to a screen, but a login screen was shown.
- Navigated to a screen containing a navigator, but a different screen was shown.
- Reset the navigator to a state with different routes not matching the available list of routes.

In these cases, specifying `'lastUnhandled'` will reuse the unhandled state if present. If there's no unhandled state, it will fallback to `'firstMatch'` behavior.

Caveats:

- Direct navigation is only handled for `NAVIGATE` actions.
- Unhandled state is restored only if the current state becomes invalid, i.e. it doesn't contain any currently defined screens.

Example usage:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createNativeStackNavigator({
  // highlight-next-line
  routeNamesChangeBehavior: 'lastUnhandled',
  screens: {
    Home: {
      if: useIsSignedIn,
      screen: HomeScreen,
    },
    SignIn: {
      if: useIsSignedOut,
      screen: SignInScreen,
      options: {
        title: 'Sign in',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Navigator
  // highlight-next-line
  routeNamesChangeBehavior="lastUnhandled"
>
  {isSignedIn ? (
    <Stack.Screen name="Home" component={HomeScreen} />
  ) : (
    <Stack.Screen name="SignIn" component={SignInScreen} />
  )}
</Stack.Navigator>
```

</TabItem>
</Tabs>

The most common use case for this is to [show the correct screen based on authentication based on deep link](auth-flow.md#handling-deep-links-after-auth).

---

## Group

Source: https://reactnavigation.org/docs/8.x/group

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A group contains several [screens](screen.md) inside a navigator for organizational purposes. They can also be used to apply the same options such as header styles to a group of screens, or to define a common layout etc.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

Groups can be defined using the `groups` property in the navigator configuration:

```js name="Stack groups" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Search')}>
        Go to Search
      </Button>
    </View>
  );
}

function EmptyScreen() {
  return <View />;
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  groups: {
    App: {
      screenOptions: {
        headerStyle: {
          backgroundColor: '#FFB6C1',
        },
      },
      screens: {
        Home: HomeScreen,
        Profile: EmptyScreen,
      },
    },
    Modal: {
      screenOptions: {
        presentation: 'modal',
      },
      screens: {
        Search: EmptyScreen,
        Share: EmptyScreen,
      },
    },
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(Stack);

export default function App() {
  return <Navigation />;
}
```

The keys of the `groups` object (e.g. `Guest`, `User`) are used as the [`navigationKey`](#navigation-key) for the group. You can use any string as the key.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

A `Group` component is returned from a `createXNavigator` function. After creating the navigator, it can be used as children of the `Navigator` component:

```js name="Stack groups" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, useNavigation } from '@react-navigation/native';

const Stack = createNativeStackNavigator();

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Search')}>
        Go to Search
      </Button>
    </View>
  );
}

function EmptyScreen() {
  return <View />;
}

export default function App() {
  return (
    <NavigationContainer>
      // codeblock-focus-start
      <Stack.Navigator>
        <Stack.Group
          screenOptions={{ headerStyle: { backgroundColor: 'papayawhip' } }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={EmptyScreen} />
        </Stack.Group>
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="Search" component={EmptyScreen} />
          <Stack.Screen name="Share" component={EmptyScreen} />
        </Stack.Group>
      </Stack.Navigator>
      // codeblock-focus-end
    </NavigationContainer>
  );
}
```

It's also possible to nest `Group` components inside other `Group` components.

</TabItem>
</Tabs>

## Configuration

### Screen options

Options to configure how the screens inside the group get presented in the navigator. It accepts either an object or a function returning an object:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  groups: {
    Modal: {
      // highlight-start
      screenOptions: {
        presentation: 'modal',
      },
      // highlight-end
      screens: {
        /* screens */
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Group
  // highlight-start
  screenOptions={{
    presentation: 'modal',
  }}
  // highlight-end
>
  {/* screens */}
</Stack.Group>
```

</TabItem>
</Tabs>

When you pass a function, it'll receive the [`route`](route-object.md) and [`navigation`](navigation-object.md):

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  groups: {
    Modal: {
      // highlight-start
      screenOptions: ({ route, navigation }) => ({
        title: route.params.title,
      }),
      // highlight-end
      screens: {
        /* screens */
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Group
  // highlight-start
  screenOptions={({ route, navigation }) => ({
    title: route.params.title,
  })}
  // highlight-end
>
  {/* screens */}
</Stack.Group>
```

</TabItem>
</Tabs>

These options are merged with the `options` specified in the individual screens, and the screen's options will take precedence over the group's options.

See [Options for screens](screen-options.md) for more details and examples.

### Screen layout

A screen layout is a wrapper around each screen in the group. It makes it easier to provide things such as an error boundary and suspense fallback for all screens in the group, or wrap each screen with additional UI.

It takes a function that returns a React element:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createNativeStackNavigator({
  groups: {
    Modal: {
      // highlight-start
      screenLayout: ({ children }) => (
        <ErrorBoundary>
          <React.Suspense
            fallback={
              <View style={styles.fallback}>
                <Text style={styles.text}>Loading…</Text>
              </View>
            }
          >
            {children}
          </React.Suspense>
        </ErrorBoundary>
      ),
      // highlight-end
      screens: {
        /* screens */
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Group
  // highlight-start
  screenLayout={({ children }) => (
    <ErrorBoundary>
      <React.Suspense
        fallback={
          <View style={styles.fallback}>
            <Text style={styles.text}>Loading…</Text>
          </View>
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  )}
  // highlight-end
>
  {/* screens */}
</Stack.Group>
```

</TabItem>
</Tabs>

### Navigation key

Optional key for a group of screens. If the key changes, all existing screens in this group will be removed (if used in a stack navigator) or reset (if used in a tab or drawer navigator):

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

The name of the group is used as the `navigationKey`:

```js
const MyStack = createNativeStackNavigator({
  groups: {
    // highlight-next-line
    User: {
      screens: {
        /* screens */
      },
    },
    // highlight-next-line
    Guest: {
      screens: {
        /* screens */
      },
    },
  },
});
```

This means if a screen is defined in 2 groups and the groups use the [`if`](static-configuration.md#if) property, the screen will remount if the condition changes resulting in one group being removed and the other group being used.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Group
  // highlight-next-line
  navigationKey={isSignedIn ? 'user' : 'guest'}
>
  {/* screens */}
</Stack.Group>
```

</TabItem>
</Tabs>

This is similar to the [`navigationKey`](screen.md#navigation-key) prop for screens, but applies to a group of screens.

---

## Screen

Source: https://reactnavigation.org/docs/8.x/screen

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A screen represents routes in a navigator. A screen's configuration contains the component for the route, options, event listeners, etc.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

Screens can be defined under the `screens` key in the navigator configuration:

```js
const MyStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

A `Screen` component is returned from a `createXNavigator` function. After creating the navigator, it can be used as children of the `Navigator` component:

```js
const Stack = createNativeStackNavigator();

function MyStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

You need to provide at least a name and a component to render for each screen.

</TabItem>
</Tabs>

## Configuration

### Name

The name to use for the screen.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

The key in the `screens` object is used as the name:

```js
const Stack = createNativeStackNavigator({
  screens: {
    // highlight-next-line
    Profile: {
      screen: ProfileScreen,
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

It can be passed in the `name` prop to the `Screen` component:

```jsx
<Stack.Screen
  // highlight-next-line
  name="Profile"
  component={ProfileScreen}
/>
```

</TabItem>
</Tabs>

This name is used to navigate to the screen:

```js
navigation.navigate('Profile');
```

It is also used for the `name` property in the [`route`](route-object.md).

While it is supported, we recommend avoiding spaces or special characters in screen names and keeping them simple.

### Options

Options are used to configure how the screen gets presented in the navigator. It accepts either an object or a function returning an object:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      // highlight-start
      options: {
        title: 'Awesome app',
      },
      // highlight-end
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  // highlight-start
  options={{
    title: 'Awesome app',
  }}
  // highlight-end
/>
```

</TabItem>
</Tabs>

When you pass a function, it'll receive the [`route`](route-object.md), [`navigation`](navigation-object.md) and [`theme`](themes.md) as arguments:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      // highlight-start
      options: ({ route, navigation, theme }) => ({
        title: route.params.userId,
      }),
      // highlight-end
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  // highlight-start
  options={({ route, navigation }) => ({
    title: route.params.userId,
  })}
  // highlight-end
/>
```

</TabItem>
</Tabs>

See [Options for screens](screen-options.md) for more details and examples.

### Initial params

Initial params are used as the default params for the screen. If a screen is used as `initialRouteName`, it'll contain the params from `initialParams`. If you navigate to a new screen, the params passed are shallow merged with the initial params.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Details: {
      screen: DetailsScreen,
      // highlight-next-line
      initialParams: { itemId: 42 },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  // highlight-next-line
  initialParams={{ itemId: 42 }}
/>
```

</TabItem>
</Tabs>

### ID

A screen can have an ID to identify it uniquely. This is useful when you want to ensure that the screen with the same ID doesn't appear multiple times in the stack.

This can be done by specifying the `getId` callback. It receives an object with the route params:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      // highlight-next-line
      getId: ({ params }) => params.userId,
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Screen
  name="Profile"
  component={ProfileScreen}
  // highlight-next-line
  getId={({ params }) => params.userId}
/>
```

</TabItem>
</Tabs>

In the above example, `params.userId` is used as an ID for the `Profile` screen with `getId`. This changes how the navigation works to ensure that the screen with the same ID appears only once in the stack.

Let's say you have a stack with the history `Home > Profile (userId: bob) > Settings`, consider following scenarios:

- You call `navigate(Profile, { userId: 'bob' })`:
  The resulting screens will be `Home > Settings > Profile (userId: bob)` since the existing `Profile` screen matches the ID.
- You call `navigate(Profile, { userId: 'alice' })`:
  The resulting screens will be `Home > Profile (userId: bob) > Settings > Profile (userId: alice)` since it'll add a new `Profile` screen as no matching screen was found.

If `getId` is specified in a tab or drawer navigator, the screen will remount if the ID changes.

:::warning

If you're using [`@react-navigation/native-stack`](native-stack-navigator.md), it doesn't work correctly with the `getId` callback. So it's recommended to avoid using it in that case.

:::

### Component

Each screen must specify a component to render for that route.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

It can be passed under the `screen` property in the screen configuration:

```js
const Stack = createNativeStackNavigator({
  screens: {
    Profile: {
      // highlight-next-line
      screen: ProfileScreen,
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

#### `component`

It can be passed in the `component` prop to the `Screen` component:

```jsx
<Stack.Screen
  name="Profile"
  // highlight-next-line
  component={ProfileScreen}
/>
```

#### `getComponent`

It's also possible to pass a function in the `getComponent` prop to lazily evaluate the component:

```jsx
<Stack.Screen
  name="Profile"
  // highlight-next-line
  getComponent={() => require('./ProfileScreen').default}
/>
```

You can use this approach instead of the `component` prop if you want the `ProfileScreen` module to be lazily evaluated when needed. This is especially useful when using [ram bundles](https://reactnative.dev/docs/ram-bundles-inline-requires) to improve initial load.

#### `children`

Another way is to pass a render callback to return React Element to use for the screen:

```jsx
<Stack.Screen name="Profile">
  // highlight-next-line
  {(props) => <ProfileScreen {...props} />}
</Stack.Screen>
```

You can use this approach instead of the `component` prop if you need to pass additional props. Though we recommend using [React context](https://react.dev/reference/react/useContext) for passing data instead.

:::warning

By default, React Navigation applies optimizations to screen components to prevent unnecessary renders. Using a render callback removes those optimizations. So if you use a render callback, you'll need to ensure that you use [`React.memo`](https://react.dev/reference/react/memo) or [`React.PureComponent`](https://react.dev/reference/react/PureComponent) for your screen components to avoid performance issues.

:::

</TabItem>
</Tabs>

### Layout

A layout is a wrapper around the screen. It makes it easier to provide things such as an error boundary and suspense fallback for a screen, or wrap the screen with additional UI.

It takes a function that returns a React element:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      // highlight-start
      layout: ({ children }) => (
        <ErrorBoundary>
          <React.Suspense
            fallback={
              <View style={styles.fallback}>
                <Text style={styles.text}>Loading…</Text>
              </View>
            }
          >
            {children}
          </React.Suspense>
        </ErrorBoundary>
      ),
      // highlight-end
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Screen
  name="MyScreen"
  component={MyScreenComponent}
  // highlight-start
  layout={({ children }) => (
    <ErrorBoundary>
      <React.Suspense
        fallback={
          <View style={styles.fallback}>
            <Text style={styles.text}>Loading…</Text>
          </View>
        }
      >
        {children}
      </React.Suspense>
    </ErrorBoundary>
  )}
  // highlight-end
/>
```

To specify a layout for all multiple screens, you can use `screenLayout` in a [group](group.md#screen-layout) or [navigator](navigator.md#screen-layout).

</TabItem>
</Tabs>

### Navigation key

A navigation key is an optional key for this screen. This doesn't need to be unique. If the key changes, existing screens with this name will be removed (if used in a stack navigator) or reset (if used in a tab or drawer navigator).

This can be useful when we have some screens that we want to be removed or reset when the condition changes:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      // highlight-next-line
      navigationKey: 'user',
    },
  },
});
```

For the static API, we recommend using the [`groups`](group.md#navigation-key) instead of the `navigationKey` for each screen as you can dynamically add or remove groups with the [`if`](static-configuration.md#if) property.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```jsx
<Stack.Screen
  // highlight-next-line
  navigationKey={isSignedIn ? 'user' : 'guest'}
  name="Profile"
  component={ProfileScreen}
/>
```

</TabItem>
</Tabs>

### Event listeners

Event listeners can be used to subscribe to various events emitted for the screen. See [`listeners` prop on `Screen`](navigation-events.md#listeners-prop-on-screen) for more details.

---

## Options for screens

Source: https://reactnavigation.org/docs/8.x/screen-options

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Each screen can configure various aspects about how it gets presented in the navigator that renders it by specifying certain options, for example, the header title in stack navigator, tab bar icon in bottom tab navigator etc. Different navigators support different set of options.

In the [configuring the header bar](headers.md) section of the fundamentals documentation we explain the basics of how this works. Also see the [screen options resolution guide](screen-options-resolution.md) to get an idea of how they work when there are multiple navigators.

See [our docs](typescript.md#annotating-options-and-screenoptions) to learn more about how to use TypeScript with `screenOptions` and `options`.

There are 3 ways of specifying options for screens:

## `options` prop on `Screen`

You can pass a prop named `options` to the `Screen` component to configure a screen, where you can specify an object with different options for that screen:

```js name="Screen title option" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  const navigation = useNavigation('Profile');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile Screen</Text>
      <Button onPress={() => navigation.navigate('Home')}>Go to Home</Button>
    </View>
  );
}

// codeblock-focus-start
const RootStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      options: {
        title: 'Awesome app',
      },
    }),
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
      options: {
        title: 'My profile',
      },
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
// codeblock-focus-end
```

You can also pass a function to `options`. The function will receive the [`navigation` object](navigation-object.md) and the [`route` object](route-object.md) for that screen, as well as the [`theme` object](themes.md). This can be useful if you want to perform navigation in your options:

```js static2dynamic
const RootStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      options: ({ navigation }) => ({
        title: 'Awesome app',
        headerLeft: () => {
          <DrawerButton onPress={() => navigation.toggleDrawer()} />;
        },
      }),
    }),
  },
});
```

## `screenOptions` prop on `Group`

You can pass a prop named `screenOptions` to the `Group` component to configure screens inside the group, where you can specify an object with different options. The options specified in `screenOptions` apply to all of the screens in the group.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Screen options for group" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';

// codeblock-focus-start
const RootStack = createNativeStackNavigator({
  groups: {
    App: {
      screenOptions: {
        headerStyle: {
          backgroundColor: '#FFB6C1',
        },
      },
      screens: {
        Home: ScreenWithButton('Home', 'Profile'),
        Profile: ScreenWithButton('Profile', 'Settings'),
      },
    },
    Modal: {
      screenOptions: {
        presentation: 'modal',
      },
      screens: {
        Settings: ScreenWithButton('Settings', 'Share'),
        Share: ScreenWithButton('Share'),
      },
    },
  },
});
// codeblock-focus-end

function ScreenWithButton(screenName, navigateTo) {
  return function () {
    const navigation = useNavigation(screenName);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{screenName} Screen</Text>
        {navigateTo && (
          <Button onPress={() => navigation.navigate(navigateTo)}>
            Go to {navigateTo}
          </Button>
        )}
      </View>
    );
  };
}

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Screen options for group" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

function ScreenWithButton(screenName, navigateTo) {
  return function () {
    const navigation = useNavigation(screenName);

    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>{screenName} Screen</Text>
        {navigateTo && (
          <Button onPress={() => navigation.navigate(navigateTo)}>
            Go to {navigateTo}
          </Button>
        )}
      </View>
    );
  };
}

const HomeScreen = ScreenWithButton('Home', 'Profile');
const ProfileScreen = ScreenWithButton('Profile', 'Settings');
const SettingsScreen = ScreenWithButton('Settings', 'Share');
const ShareScreen = ScreenWithButton('Share');

export default function App() {
  return (
    <NavigationContainer>
      // codeblock-focus-start
      <Stack.Navigator>
        <Stack.Group
          screenOptions={{ headerStyle: { backgroundColor: 'papayawhip' } }}
        >
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Profile" component={ProfileScreen} />
        </Stack.Group>
        <Stack.Group screenOptions={{ presentation: 'modal' }}>
          <Stack.Screen name="Settings" component={SettingsScreen} />
          <Stack.Screen name="Share" component={ShareScreen} />
        </Stack.Group>
      </Stack.Navigator>
      // codeblock-focus-end
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

Similar to `options`, you can also pass a function to `screenOptions`. The function will receive the [`navigation` object](navigation-object.md) and the [`route` object](route-object.md) for each screen. This can be useful if you want to configure options for all the screens in one place based on the route:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
    }),
  },
  groups: {
    Modal: {
      screenOptions: {
        presentation: 'modal',
        headerLeft: () => <CancelButton onPress={navigation.goBack} />,
      },
      screens: {
        Settings: createNativeStackScreen({
          screen: Settings,
        }),
        Share: createNativeStackScreen({
          screen: Share,
        }),
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Profile" component={ProfileScreen} />
  <Stack.Group
    screenOptions={({ navigation }) => ({
      presentation: 'modal',
      headerLeft: () => <CancelButton onPress={navigation.goBack} />,
    })}
  >
    <Stack.Screen name="Settings" component={Settings} />
    <Stack.Screen name="Share" component={Share} />
  </Stack.Group>
</Stack.Navigator>
```

</TabItem>
</Tabs>

## `screenOptions` prop on the navigator

You can pass a prop named `screenOptions` to the navigator component, where you can specify an object with different options. The options specified in `screenOptions` apply to all of the screens in the navigator. So this is a good place to specify options that you want to configure for the whole navigator.

Example:

```js static2dynamic
const RootStack = createNativeStackNavigator({
  screenOptions: {
    headerStyle: {
      backgroundColor: 'papayawhip',
    },
  },
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
    }),
  },
});
```

Similar to `options`, you can also pass a function to `screenOptions`. The function will receive the [`navigation` object](navigation-object.md) and the [`route` object](route-object.md) for each screen. This can be useful if you want to configure options for all the screens in one place based on the route:

```js name="Screen options for tab navigator" snack static2dynamic
import * as React from 'react';
import { View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';

// codeblock-focus-start
const MyTabs = createBottomTabNavigator({
  screenOptions: ({ route }) => {
    const title = route.name === 'Home' ? 'Welcome' : `${route.name} screen`;

    return {
      headerTitle: title,
    };
  },
  screens: {
    Home: createBottomTabScreen({
      screen: EmptyScreen,
    }),
    Profile: createBottomTabScreen({
      screen: EmptyScreen,
    }),
  },
});
// codeblock-focus-end

function EmptyScreen() {
  return <View />;
}

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

## `navigation.setOptions` method

The `navigation` object has a `setOptions` method that lets you update the options for a screen from within a component. See [navigation object's docs](navigation-object.md#setoptions) for more details.

```js
<Button onPress={() => navigation.setOptions({ title: 'Updated!' })}>
  Update options
</Button>
```

---

## Route object reference

Source: https://reactnavigation.org/docs/8.x/route-object

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Each `screen` component in your app is provided with the `route` object as a prop automatically. The prop contains various information regarding current route (place in navigation hierarchy component lives).

- `route`
  - `key` - Unique key of the screen. Created automatically or added while navigating to this screen.
  - `name` - Name of the screen. Defined in navigator component hierarchy.
  - `path` - An optional string containing the path that opened the screen, exists when the screen was opened via a deep link.
  - `params` - An optional object containing params which is defined while navigating e.g. `navigate('Twitter', { user: 'Dan Abramov' })`.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Route prop" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator({
  screens: {
    Profile: ProfileScreen,
  },
});

// codeblock-focus-start
function ProfileScreen({ route }) {
  return (
    <View>
      <Text>This is the profile screen of the app</Text>
      <Text>{route.name}</Text>
    </View>
  );
}
// codeblock-focus-end

const Navigation = createStaticNavigation(Stack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Route prop" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

// codeblock-focus-start
function ProfileScreen({ route }) {
  return (
    <View>
      <Text>This is the profile screen of the app</Text>
      <Text>{route.name}</Text>
    </View>
  );
}
// codeblock-focus-end

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

---

## Navigation object reference

Source: https://reactnavigation.org/docs/8.x/navigation-object

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The `navigation` object contains various convenience functions that dispatch navigation actions. It looks like this:

- `navigation`
  - `navigate` - go to the given screen, this will behave differently based on the navigator
  - `goBack` - go back to the previous screen, this will pop the current screen when used in a stack
  - `reset` - replace the navigation state of the navigator with the given state
  - `preload` - preload a screen in the background before navigating to it
  - `setParams` - merge new params onto the route's params
  - `replaceParams` - replace the route's params with new params
  - `pushParams` - update params and push a new entry to history stack
  - `dispatch` - send an action object to update the [navigation state](navigation-state.md)
  - `setOptions` - update the screen's options
  - `isFocused` - check whether the screen is focused
  - `canGoBack` - check whether it's possible to go back from the current screen
  - `getState` - get the navigation state of the navigator
  - `getParent` - get the navigation object of the parent screen, if any
  - `addListener` - subscribe to events for the screen
  - `removeListener` - unsubscribe from events for the screen

The `navigation` object can be accessed inside any screen component with the [`useNavigation`](use-navigation.md) hook. It's also passed as a prop only to screens components defined with the dynamic API.

:::warning

`setParams`/`setOptions` etc. should only be called in event listeners or `useEffect`/`useLayoutEffect`/`componentDidMount`/`componentDidUpdate` etc. Not during render or in constructor.

:::

## Navigator-dependent functions

There are several additional functions present on `navigation` object based on the kind of the current navigator.

If the navigator is a stack navigator, several alternatives to `navigate` and `goBack` are provided and you can use whichever you prefer. The functions are:

- `navigation`
  - `replace` - replace the current screen with a new one
  - `push` - push a new screen onto the stack
  - `pop` - go back in the stack
  - `popTo` - go back to a specific screen in the stack
  - `popToTop` - go to the top of the stack

See [Stack navigator helpers](stack-navigator.md#helpers) and [Native Stack navigator helpers](native-stack-navigator.md#helpers) for more details on these methods.

If the navigator is a tab navigator, the following are also available:

- `navigation`
  - `jumpTo` - go to a specific screen in the tab navigator

See [Bottom Tab navigator helpers](bottom-tab-navigator.md#helpers) and [Material Top Tab navigator helpers](material-top-tab-navigator.md#helpers) for more details on these methods.

If the navigator is a drawer navigator, the following are also available:

- `navigation`
  - `jumpTo` - go to a specific screen in the drawer navigator
  - `openDrawer` - open the drawer
  - `closeDrawer` - close the drawer
  - `toggleDrawer` - toggle the state, ie. switch from closed to open and vice versa

See [Drawer navigator helpers](drawer-navigator.md#helpers) for more details on these methods.

## Common API reference

The vast majority of your interactions with the `navigation` object will involve `navigate`, `goBack`, and `setParams`.

### `navigate`

The `navigate` method lets us navigate to another screen in your app. It takes the following arguments:

`navigation.navigate(name, params)`

- `name` - _string_ - A destination name of the screen in the current or a parent navigator.
- `params` - _object_ - Params to use for the destination route.
- `options` - Options object containing the following properties:
  - `merge` - _boolean_ - Whether params should be merged with the existing route params, or replace them (when navigating to an existing screen). Defaults to `false`.
  - `pop` - _boolean_ - Whether screens should be popped to navigate to a matching screen in the stack. Defaults to `false`.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigate method" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// codeblock-focus-start
function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          // highlight-start
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
          // highlight-end
        }}
      >
        Go to Brent's profile
      </Button>
    </View>
  );
}
// codeblock-focus-end

function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.names[0]}</Text>
      <Text>{route.params.names[1]}</Text>
      <Text>{route.params.names[2]}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

const Stack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(Stack);

function App() {
  return <Navigation />;
}

export default App;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigate method" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

// codeblock-focus-start
function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          // highlight-start
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
          // highlight-end
        }}
      >
        Go to Brent's profile
      </Button>
    </View>
  );
}
// codeblock-focus-end

function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.names[0]}</Text>
      <Text>{route.params.names[1]}</Text>
      <Text>{route.params.names[2]}</Text>
      <Button onPress={() => navigation.goBack()}>Go back </Button>
    </View>
  );
}

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

</TabItem>
</Tabs>

In a stack navigator ([stack](stack-navigator.md) or [native stack](native-stack-navigator.md)), calling `navigate` with a screen name will have the following behavior:

- If you're already on a screen with the same name, it will update its params and not push a new screen.
- If you're on a different screen, it will push the new screen onto the stack.
- If the [`getId`](screen.md#id) prop is specified, and another screen in the stack has the same ID, it will bring that screen to focus and update its params instead.
- If none of the above conditions match, it'll push a new screen to the stack.

In a tab or drawer navigator, calling `navigate` will switch to the relevant screen if it's not focused already and update the params of the screen.

### `goBack`

The `goBack` method lets us go back to the previous screen in the navigator.

By default, `goBack` will go back from the screen that it is called from:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigate method" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
        }}
      >
        Go to Brent's profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.names[0]}</Text>
      <Text>{route.params.names[1]}</Text>
      <Text>{route.params.names[2]}</Text>
      // highlight-next-line
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(Stack);

function App() {
  return <Navigation />;
}

export default App;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigate method" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
        }}
      >
        Go to Brent's profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.names[0]}</Text>
      <Text>{route.params.names[1]}</Text>
      <Text>{route.params.names[2]}</Text>
      // highlight-next-line
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

</TabItem>
</Tabs>

### `reset`

The `reset` method lets us replace the navigator state with a new state:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigation object replace and reset" snack
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.names[0]}</Text>
      <Text>{route.params.names[1]}</Text>
      <Text>{route.params.names[2]}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
      <Button
        onPress={() => {
          navigation.replace('Settings', {
            someParam: 'Param',
          });
        }}
      >
        Replace this screen with Settings
      </Button>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'Settings',
                params: { someParam: 'Param1' },
              },
            ],
          });
          // codeblock-focus-end
        }}
      >
        Reset navigator state to Settings
      </Button>
      <Button onPress={() => navigation.navigate('Home')}> Go to Home </Button>
      <Button
        onPress={() => navigation.navigate('Settings', { someParam: 'Param1' })}
      >
        Go to Settings
      </Button>
    </View>
  );
}

function SettingsScreen({ route }) {
  const navigation = useNavigation('Settings');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Settings screen</Text>
      <Text>{route.params.someParam}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

const Stack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(Stack);

function App() {
  return <Navigation />;
}

export default App;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigation object replace and reset" snack
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.names[0]}</Text>
      <Text>{route.params.names[1]}</Text>
      <Text>{route.params.names[2]}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
      <Button
        onPress={() =>
          navigation.replace('Settings', {
            someParam: 'Param',
          })
        }
      >
        Replace this screen with Settings
      </Button>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.reset({
            index: 0,
            routes: [
              {
                name: 'Settings',
                params: { someParam: 'Param1' },
              },
            ],
          });
          // codeblock-focus-end
        }}
      >
        Reset navigator state to Settings
      </Button>
      <Button onPress={() => navigation.navigate('Home')}> Go to Home </Button>
      <Button
        onPress={() => navigation.navigate('Settings', { someParam: 'Param1' })}
      >
        {' '}
        Go to Settings{' '}
      </Button>
    </View>
  );
}

function SettingsScreen({ route }) {
  const navigation = useNavigation('Settings');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Settings screen</Text>
      <Text>{route.params.someParam}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            names: ['Brent', 'Satya', 'Michaś'],
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Profile" component={ProfileScreen} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

</TabItem>
</Tabs>

The state object specified in `reset` replaces the existing [navigation state](navigation-state.md) with the new one, i.e. removes existing screens and add new ones. If you want to preserve the existing screens when changing the state, you can use [`CommonActions.reset`](navigation-actions.md#reset) with [`dispatch`](#dispatch) instead.

:::warning

Consider the navigator's state object to be internal and subject to change in a minor release. Avoid using properties from the [navigation state](navigation-state.md) state object except `index` and `routes`, unless you really need it. If there is some functionality you cannot achieve without relying on the structure of the state object, please open an issue.

:::

### `preload`

The `preload` method allows preloading a screen in the background before navigating to it. It takes the following arguments:

- `name` - _string_ - A destination name of the screen in the current or a parent navigator.
- `params` - _object_ - Params to use for the destination route.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Common actions preload" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Home!</Text>
      <Button
        onPress={() => {
          // highlight-next-line
          navigation.preload('Profile', { user: 'jane' });
        }}
      >
        Preload Profile
      </Button>
      <Button
        onPress={() => {
          navigation.navigate('Profile', { user: 'jane' });
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}
// codeblock-focus-end

function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');
  const [startTime] = React.useState(Date.now());
  const [endTime, setEndTime] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setEndTime(Date.now());
    });

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile!</Text>
      <Text>{route.params.user}'s profile</Text>
      <Text>Preloaded for: {endTime ? endTime - startTime : 'N/A'}ms</Text>
    </View>
  );
}

const Stack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(Stack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Common actions preload" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  NavigationContainer,
  CommonActions,
  useNavigation,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Home!</Text>
      <Button
        onPress={() => {
          // highlight-next-line
          navigation.preload('Profile', { user: 'jane' });
        }}
      >
        Preload Profile
      </Button>
      <Button
        onPress={() => {
          navigation.navigate('Profile', { user: 'jane' });
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}
// codeblock-focus-end

function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');
  const [startTime] = React.useState(Date.now());
  const [endTime, setEndTime] = React.useState(null);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setEndTime(Date.now());
    });

    return () => {
      unsubscribe();
    };
  }, [navigation]);

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile!</Text>
      <Text>{route.params.user}'s profile</Text>
      <Text>Preloaded for: {endTime ? endTime - startTime : 'N/A'}ms</Text>
    </View>
  );
}

const Stack = createStackNavigator();

export default function App() {
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

</TabItem>
</Tabs>

Preloading a screen means that the screen will be rendered in the background. All the components in the screen will be mounted and the `useEffect` hooks will be called. This can be useful when you want to improve the perceived performance by hiding the delay in mounting heavy components or loading data.

Depending on the navigator, `preload` may work slightly differently:

- In a stack navigator ([stack](stack-navigator.md), [native stack](native-stack-navigator.md)), the screen will be rendered off-screen and animated in when you navigate to it. If [`getId`](screen.md#id) is specified, it'll be used for the navigation to identify the preloaded screen.
- In a tab or drawer navigator ([bottom tabs](bottom-tab-navigator.md), [material top tabs](material-top-tab-navigator.md), [drawer](drawer-navigator.md), etc.), the existing screen will be rendered as if `lazy` was set to `false`. Calling `preload` on a screen that is already rendered will not have any effect.

When a screen is preloaded in a stack navigator, it can't dispatch navigation actions (e.g. `navigate`, `goBack`, etc.) until it becomes active.

### `setParams`

The `setParams` method lets us update the params (`route.params`) of the current screen. `setParams` works like React's `setState` - it shallow merges the provided params object with the current params.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigation object setParams" snack
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            friends: ['Brent', 'Satya', 'Michaś'],
            title: "Brent's Profile",
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.friends[0]}</Text>
      <Text>{route.params.friends[1]}</Text>
      <Text>{route.params.friends[2]}</Text>
      <Button
        onPress={() => {
          // highlight-start
          navigation.setParams({
            friends:
              route.params.friends[0] === 'Brent'
                ? ['Wojciech', 'Szymon', 'Jakub']
                : ['Brent', 'Satya', 'Michaś'],
            title:
              route.params.title === "Brent's Profile"
                ? "Lucy's Profile"
                : "Brent's Profile",
          });
          // highlight-end
        }}
      >
        Swap title and friends
      </Button>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: {
      screen: ProfileScreen,
      options: ({ route }) => ({ title: route.params.title }),
    },
  },
});

const Navigation = createStaticNavigation(Stack);

function App() {
  return <Navigation />;
}

export default App;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigation object setParams" snack
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            friends: ['Brent', 'Satya', 'Michaś'],
            title: "Brent's Profile",
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.friends[0]}</Text>
      <Text>{route.params.friends[1]}</Text>
      <Text>{route.params.friends[2]}</Text>
      <Button
        onPress={() => {
          // highlight-start
          navigation.setParams({
            friends:
              route.params.friends[0] === 'Brent'
                ? ['Wojciech', 'Szymon', 'Jakub']
                : ['Brent', 'Satya', 'Michaś'],
            title:
              route.params.title === "Brent's Profile"
                ? "Lucy's Profile"
                : "Brent's Profile",
          });
          // highlight-end
        }}
      >
        Swap title and friends
      </Button>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

</TabItem>
</Tabs>

### `replaceParams`

The `replaceParams` method lets us replace the params (`route.params`) of the current screen with a new params object.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigation object replaceParams" snack
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            friends: ['Brent', 'Satya', 'Michaś'],
            title: "Brent's Profile",
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.friends[0]}</Text>
      <Text>{route.params.friends[1]}</Text>
      <Text>{route.params.friends[2]}</Text>
      <Button
        onPress={() => {
          // highlight-start
          navigation.replaceParams({
            friends:
              route.params.friends[0] === 'Brent'
                ? ['Wojciech', 'Szymon', 'Jakub']
                : ['Brent', 'Satya', 'Michaś'],
            title:
              route.params.title === "Brent's Profile"
                ? "Lucy's Profile"
                : "Brent's Profile",
          });
          // highlight-end
        }}
      >
        Swap title and friends
      </Button>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: {
      screen: ProfileScreen,
      options: ({ route }) => ({ title: route.params.title }),
    },
  },
});

const Navigation = createStaticNavigation(Stack);

function App() {
  return <Navigation />;
}

export default App;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigation object replaceParams" snack
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', {
            friends: ['Brent', 'Satya', 'Michaś'],
            title: "Brent's Profile",
          });
        }}
      >
        Go to Brents profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Text>Friends: </Text>
      <Text>{route.params.friends[0]}</Text>
      <Text>{route.params.friends[1]}</Text>
      <Text>{route.params.friends[2]}</Text>
      <Button
        onPress={() => {
          // highlight-start
          navigation.replaceParams({
            friends:
              route.params.friends[0] === 'Brent'
                ? ['Wojciech', 'Szymon', 'Jakub']
                : ['Brent', 'Satya', 'Michaś'],
            title:
              route.params.title === "Brent's Profile"
                ? "Lucy's Profile"
                : "Brent's Profile",
          });
          // highlight-end
        }}
      >
        Swap title and friends
      </Button>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

</TabItem>
</Tabs>

### `pushParams`

The `pushParams` method lets us update the params (`route.params`) of the current screen and push a new entry to the history stack. Unlike `setParams` which merges the new params with the existing ones, `pushParams` uses the new params object as-is.

`navigation.pushParams(params)`

- `params` - _object_ - New params to use for the route.

This is useful in scenarios like:

- A product listing page with filters, where changing filters should create a new history entry so users can go back to previous filter states.
- A screen with a custom modal component, where the modal is not a separate screen but its state should be reflected in the URL and history.

```js
navigation.pushParams({ filter: 'new' });
```

The action works in all navigators, including stack, tab, and drawer navigators.

### `setOptions`

The `setOptions` method lets us set screen options from within the component. This is useful if we need to use the component's props, state or context to configure our screen.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigation object setOptions" snack
import * as React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', { title: "Brent's profile" });
        }}
      >
        Go to Profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');
  const [value, onChangeText] = React.useState(route.params.title);

  React.useEffect(() => {
    // highlight-start
    navigation.setOptions({
      title: value === '' ? 'No title' : value,
    });
    // highlight-end
  }, [navigation, value]);

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
        onChangeText={onChangeText}
        value={value}
      />
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: {
      screen: ProfileScreen,
      options: ({ route }) => ({ title: route.params.title }),
    },
  },
});

const Navigation = createStaticNavigation(Stack);

function App() {
  return <Navigation />;
}

export default App;
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigation object setOptions" snack
import * as React from 'react';
import { View, Text, TextInput } from 'react-native';
import { Button } from '@react-navigation/elements';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() =>
          navigation.navigate('Profile', { title: "Brent's profile" })
        }
      >
        Go to Profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ route }) {
  const navigation = useNavigation('Profile');
  const [value, onChangeText] = React.useState(route.params.title);

  React.useEffect(() => {
    // highlight-start
    navigation.setOptions({
      title: value === '' ? 'No title' : value,
    });
    // highlight-end
  }, [navigation, value]);

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <TextInput
        style={{ height: 40, borderColor: 'gray', borderWidth: 1 }}
        onChangeText={onChangeText}
        value={value}
      />
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen
          name="Profile"
          component={ProfileScreen}
          options={({ route }) => ({ title: route.params.title })}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
```

</TabItem>
</Tabs>

Any options specified here are shallow merged with the options specified when defining the screen.

When using `navigation.setOptions`, we recommend specifying a placeholder in the screen's `options` prop and update it using `navigation.setOptions`. This makes sure that the delay for updating the options isn't noticeable to the user. It also makes it work with lazy-loaded screens.

You can also use `React.useLayoutEffect` to reduce the delay in updating the options. But we recommend against doing it if you support web and do server side rendering.

:::note

`navigation.setOptions` is intended to provide the ability to update existing options when necessary. It's not a replacement for the `options` prop on the screen. Make sure to use `navigation.setOptions` sparingly only when absolutely necessary.

:::

## Navigation events

Screens can add listeners on the `navigation` object with the `addListener` method. For example, to listen to the `focus` event:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigation events" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function SettingsScreen() {
  const navigation = useNavigation('Settings');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Settings Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  React.useEffect(
    () => navigation.addListener('focus', () => alert('Screen was focused')),
    [navigation]
  );

  React.useEffect(
    () => navigation.addListener('blur', () => alert('Screen was unfocused')),
    [navigation]
  );

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}
// codeblock-focus-end

const SettingsStack = createNativeStackNavigator({
  screens: {
    Settings: SettingsScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(SettingsStack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigation events" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function SettingsScreen() {
  const navigation = useNavigation('Settings');

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Settings Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  React.useEffect(
    () => navigation.addListener('focus', () => alert('Screen was focused')),
    [navigation]
  );

  React.useEffect(
    () => navigation.addListener('blur', () => alert('Screen was unfocused')),
    [navigation]
  );

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Profile Screen</Text>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}
// codeblock-focus-end

const SettingsStack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <SettingsStack.Navigator>
        <SettingsStack.Screen name="Settings" component={SettingsScreen} />
        <SettingsStack.Screen name="Profile" component={ProfileScreen} />
      </SettingsStack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

See [Navigation events](navigation-events.md) for more details on the available events and the API usage.

### `isFocused`

This method lets us check whether the screen is currently focused. Returns `true` if the screen is focused and `false` otherwise.

```js
const isFocused = navigation.isFocused();
```

This method doesn't re-render the screen when the value changes and mainly useful in callbacks. You probably want to use [useIsFocused](use-is-focused.md) instead of using this directly, it will return a boolean a prop to indicating if the screen is focused.

## Advanced API Reference

The `dispatch` function is much less commonly used, but a good escape hatch if you can't do what you need with the available methods such as `navigate`, `goBack` etc. We recommend to avoid using the `dispatch` method often unless absolutely necessary.

### `dispatch`

The `dispatch` method lets us send a navigation action object which determines how the [navigation state](navigation-state.md) will be updated. All of the navigation functions like `navigate` use `dispatch` behind the scenes.

Note that if you want to dispatch actions you should use the action creators provided in this library instead of writing the action object directly.

See [Navigation Actions Docs](navigation-actions.md) for a full list of available actions.

```js
import { CommonActions } from '@react-navigation/native';

navigation.dispatch(
  CommonActions.navigate({
    name: 'Profile',
    params: {},
  })
);
```

When dispatching action objects, you can also specify few additional properties:

- `source` - The key of the route which should be considered as the source of the action. For example, the `replace` action will replace the route with the given key. By default, it'll use the key of the route that dispatched the action. You can explicitly pass `undefined` to override this behavior.
- `target` - The key of the [navigation state](navigation-state.md) the action should be applied on. By default, actions bubble to other navigators if not handled by a navigator. If `target` is specified, the action won't bubble if the navigator with the same key didn't handle it.

Example:

```js
import { CommonActions } from '@react-navigation/native';

navigation.dispatch({
  ...CommonActions.navigate('Profile'),
  source: 'someRoutekey',
  target: 'someStatekey',
});
```

#### Custom action creators

It's also possible to pass a action creator function to `dispatch`. The function will receive the current state and needs to return a navigation action object to use:

```js
import { CommonActions } from '@react-navigation/native';

navigation.dispatch((state) => {
  // Add the home route to the start of the stack
  const routes = [{ name: 'Home' }, ...state.routes];

  return CommonActions.reset({
    ...state,
    routes,
    index: routes.length - 1,
  });
});
```

You can use this functionality to build your own helpers that you can utilize in your app. Here is an example which implements inserting a screen just before the last one:

```js
import { CommonActions } from '@react-navigation/native';

const insertBeforeLast = (routeName, params) => (state) => {
  const routes = [
    ...state.routes.slice(0, -1),
    { name: routeName, params },
    state.routes[state.routes.length - 1],
  ];

  return CommonActions.reset({
    ...state,
    routes,
    index: routes.length - 1,
  });
};
```

Then use it like:

```js
navigation.dispatch(insertBeforeLast('Home'));
```

### `canGoBack`

This method returns a boolean indicating whether there's any navigation history available in the current navigator, or in any parent navigators. You can use this to check if you can call `navigation.goBack()`:

```js
if (navigation.canGoBack()) {
  navigation.goBack();
}
```

Don't use this method for rendering content as this will not trigger a re-render. This is only intended for use inside callbacks, event listeners etc.

### `getParent`

This method returns the navigation object from the parent navigator that the current navigator is nested in. For example, if you have a stack navigator and a tab navigator nested inside the stack, then you can use `getParent` inside a screen of the tab navigator to get the navigation object passed from the stack navigator.

It accepts an optional screen name parameter to refer to a specific parent screen. For example, if your screen is nested with multiple levels of nesting somewhere under a drawer navigator, you can directly refer to it by the name of the screen in the drawer navigator instead of calling `getParent` multiple times.

For example, consider the following structure:

```js static2dynamic
const LeftDrawer = createDrawerNavigator({
  screens: {
    Feed: {
      screen: FeedScreen,
    },
    Messages: {
      screen: MessagesScreen,
    },
  },
});

const RootDrawer = createDrawerNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
    },
    Dashboard: {
      screen: LeftDrawer,
    },
  },
});
```

Then when using `getParent` inside of `FeedScree`, instead of:

```js
// Avoid this
const drawerNavigation = navigation.getParent();

// ...

drawerNavigation?.openDrawer();
```

You can do:

```js
// Do this
const drawerNavigation = navigation.getParent('Dashboard');

// ...

drawerNavigation?.openDrawer();
```

In this case, `'Dashboard'` refers to the name of a parent screen of `Feed` that's used in the parent drawer navigator.

This approach allows components to not have to know the nesting structure of the navigators. So it's highly recommended to use a screen name when using `getParent`.

This method will return `undefined` if there is no matching parent navigator.

### `getState`

:::warning

Consider the navigator's state object to be internal and subject to change in a minor release. Avoid using properties from the [navigation state](navigation-state.md) state object except `index` and `routes`, unless you really need it. If there is some functionality you cannot achieve without relying on the structure of the state object, please open an issue.

:::

This method returns the state object of the navigator which contains the screen. Getting the navigator state could be useful in very rare situations. You most likely don't need to use this method. If you do, make sure you have a good reason.

If you need the state for rendering content, you should use [`useNavigationState`](use-navigation-state.md) instead of this method.

---

## NavigationContext

Source: https://reactnavigation.org/docs/8.x/navigation-context

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

`NavigationContext` provides the `navigation` object (same object as the [navigation](navigation-object.md) prop). In fact, [useNavigation](use-navigation.md) uses this context to get the `navigation` prop.

Most of the time, you won't use `NavigationContext` directly, as the provided `useNavigation` covers most use cases. But just in case you have something else in mind, `NavigationContext` is available for you to use.

Example:

```js name="Navigation context" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { NavigationContext } from '@react-navigation/native';
// codeblock-focus-end
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  return <SomeComponent />;
}

// codeblock-focus-start

function SomeComponent() {
  // We can access navigation object via context
  const navigation = React.useContext(NavigationContext);
  // codeblock-focus-end

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Some component inside HomeScreen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
  // codeblock-focus-start
}
// codeblock-focus-end

function ProfileScreen() {
  const navigation = useNavigation('Profile');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

function App() {
  return <Navigation />;
}

export default App;
```

---

## Navigation events

Source: https://reactnavigation.org/docs/8.x/navigation-events

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

You can listen to various events emitted by React Navigation to get notified of certain events, and in some cases, override the default action. There are few core events such as `focus`, `blur` etc. (documented below) that work for every navigator, as well as navigator specific events that work only for certain navigators.

Apart from the core events, each navigator can emit their own custom events. For example, stack navigator emits `transitionStart` and `transitionEnd` events, tab navigator emits `tabPress` event etc. You can find details about the events emitted on the individual navigator's documentation.

## Core events

Following are the events available in every navigator:

### `focus`

This event is emitted when the screen comes into focus.

For most cases, the [`useFocusEffect`](use-focus-effect.md) hook might be appropriate than adding the listener manually. See [this guide](function-after-focusing-screen.md) for more details to decide which API you should use.

### `blur`

This event is emitted when the screen goes out of focus.

:::note

In some cases, such as going back from a screen in [native-stack navigator](native-stack-navigator.md), the screen may not receive the `blur` event as the screen is unmounted immediately. For cleaning up resources, it's recommended to use the cleanup function of [`useFocusEffect`](use-focus-effect.md) hook instead that considers both blur and unmounting of the screen.

:::

### `state`

This event is emitted when the navigator's state changes. This event receives the navigator's state in the event data (`event.data.state`).

### `beforeRemove`

This event is emitted when the user is leaving the screen due to a navigation action. It is possible to prevent the user from leaving the screen by calling `e.preventDefault()` in the event listener.

```js
React.useEffect(
  () =>
    navigation.addListener('beforeRemove', (e) => {
      if (!hasUnsavedChanges) {
        return;
      }

      // Prevent default behavior of leaving the screen
      e.preventDefault();

      // Prompt the user before leaving the screen
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Are you sure to discard them and leave the screen?',
        [
          {
            text: "Don't leave",
            style: 'cancel',
            onPress: () => {
              // Do nothing
            },
          },
          {
            text: 'Discard',
            style: 'destructive',
            // If the user confirmed, then we dispatch the action we blocked earlier
            // This will continue the action that had triggered the removal of the screen
            onPress: () => navigation.dispatch(e.data.action),
          },
        ]
      );
    }),
  [navigation, hasUnsavedChanges]
);
```

:::warning

Preventing the action in this event doesn't work properly with [`@react-navigation/native-stack`](native-stack-navigator.md). We recommend using the [`usePreventRemove` hook](preventing-going-back.md) instead.

:::

## Listening to events

There are multiple ways to listen to events from the navigators. Each callback registered as an event listener receives an event object as its argument. The event object contains few properties:

- `data` - Additional data regarding the event passed by the navigator. This can be `undefined` if no data was passed.
- `target` - The route key for the screen that should receive the event. For some events, this maybe `undefined` if the event wasn't related to a specific screen.
- `preventDefault` - For some events, there may be a `preventDefault` method on the event object. Calling this method will prevent the default action performed by the event (such as switching tabs on `tabPress`). Support for preventing actions are only available for certain events like `tabPress` and won't work for all events.

You can listen to events with the following APIs:

### `navigation.addListener`

Inside a screen, you can add listeners on the `navigation` object with the `addListener` method. The `addListener` method takes 2 arguments: type of the event, and a callback to be called on the event. It returns a function that can be called to unsubscribe from the event.

Example:

```js
const unsubscribe = navigation.addListener('tabPress', (e) => {
  // Prevent default action
  e.preventDefault();
});
```

Normally, you'd add an event listener in `React.useEffect` for function components. For example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="navigation.addListener with focus" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function SettingsScreen() {
  const navigation = useNavigation('Settings');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Screen was focused
    });
    return unsubscribe;
  }, [navigation]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      // Screen was unfocused
    });
    return unsubscribe;
  }, [navigation]);

  // Rest of the component
  // codeblock-focus-end
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
  // codeblock-focus-start
}
// codeblock-focus-end

const SettingsStack = createNativeStackNavigator({
  screens: {
    Settings: SettingsScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(SettingsStack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="navigation.addListener with focus" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function SettingsScreen({ navigation }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

// codeblock-focus-start
function ProfileScreen({ navigation }) {
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // Screen was focused
    });
    return unsubscribe;
  }, [navigation]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      // Screen was unfocused
    });
    return unsubscribe;
  }, [navigation]);

  // Rest of the component
  // codeblock-focus-end
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
  // codeblock-focus-start
}
// codeblock-focus-end

const SettingsStack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <SettingsStack.Navigator>
        <SettingsStack.Screen name="Settings" component={SettingsScreen} />
        <SettingsStack.Screen name="Profile" component={ProfileScreen} />
      </SettingsStack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

The `unsubscribe` function can be returned as the cleanup function in the effect.

For class components, you can add the event in the `componentDidMount` lifecycle method and unsubscribe in `componentWillUnmount`:

```js
class Profile extends React.Component {
  componentDidMount() {
    this._unsubscribe = navigation.addListener('focus', () => {
      // do something
    });
  }

  componentWillUnmount() {
    this._unsubscribe();
  }

  render() {
    // Content of the component
  }
}
```

Keep in mind that you can only listen to events from the immediate navigator with `addListener`. For example, if you try to add a listener in a screen that's inside a stack that's nested in a tab, it won't get the `tabPress` event. If you need to listen to an event from a parent navigator, you may use [`navigation.getParent`](navigation-object.md#getparent) to get a reference to the parent screen's navigation object and add a listener.

```js
const unsubscribe = navigation
  .getParent('MyTabs')
  .addListener('tabPress', (e) => {
    // Do something
  });
```

Here `'MyTabs'` refers to the name of the parent screen in the tab navigator whose event you want to listen to.

:::warning

The component needs to be rendered for the listeners to be added in `useEffect` or `componentDidMount`. Navigators such as [bottom tabs](bottom-tab-navigator.md) and [drawer](drawer-navigator.md) lazily render the screen after navigating to it. So if your listener is not being called, double check that the component is rendered.

:::

### `listeners` prop on `Screen`

Sometimes you might want to add a listener from the component where you defined the navigator rather than inside the screen. You can use the `listeners` prop on the `Screen` component to add listeners. The `listeners` prop takes an object with the event names as keys and the listener callbacks as values.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Tab = createBottomTabNavigatior({
  screens: {
    Chat: {
      screen: Chat,
      listeners: {
        tabPress: (e) => {
          // Prevent default action
          e.preventDefault();
        },
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Tab.Screen
  name="Chat"
  component={Chat}
  listeners={{
    tabPress: (e) => {
      // Prevent default action
      e.preventDefault();
    },
  }}
/>
```

</TabItem>
</Tabs>

You can also pass a callback which returns the object with listeners. It'll receive `navigation` and `route` as the arguments.

Example:
<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Tab = createBottomTabNavigatior({
  screens: {
    Chat: {
      screen: Chat,
      listeners: ({ navigation, route }) => ({
        tabPress: (e) => {
          // Prevent default action
          e.preventDefault();

          // Do something with the `navigation` object
          navigation.navigate('AnotherPlace');
        },
      }),
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Tab.Screen
  name="Chat"
  component={Chat}
  listeners={({ navigation, route }) => ({
    tabPress: (e) => {
      // Prevent default action
      e.preventDefault();

      // Do something with the `navigation` object
      navigation.navigate('AnotherPlace');
    },
  })}
/>
```

</TabItem>
</Tabs>

### `screenListeners` prop on the navigator

You can pass a prop named `screenListeners` to the navigator component, where you can specify listeners for events from all screens for this navigator. This can be useful if you want to listen to specific events regardless of the screen, or want to listen to common events such as `state` which is emitted to all screens.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screenListeners: {
    state: (e) => {
      // Do something with the state
      console.log('state changed', e.data);
    },
  },
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Navigator
  screenListeners={{
    state: (e) => {
      // Do something with the state
      console.log('state changed', e.data);
    },
  }}
>
  <Stack.Screen name="Home" component={HomeScreen} />
  <Stack.Screen name="Profile" component={ProfileScreen} />
</Stack.Navigator>
```

</TabItem>
</Tabs>

Similar to `listeners`, you can also pass a function to `screenListeners`. The function will receive the [`navigation` object](navigation-object.md) and the [`route` object](route-object.md) for each screen. This can be useful if you need access to the `navigation` object.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Tab = createBottomTabNavigatior({
  screenListeners: ({ navigation }) => ({
    state: (e) => {
      // Do something with the state
      console.log('state changed', e.data);

      // Do something with the `navigation` object
      if (!navigation.canGoBack()) {
        console.log("we're on the initial screen");
      }
    },
  }),
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Tab.Navigator
  screenListeners={({ navigation }) => ({
    state: (e) => {
      // Do something with the state
      console.log('state changed', e.data);

      // Do something with the `navigation` object
      if (!navigation.canGoBack()) {
        console.log("we're on the initial screen");
      }
    },
  })}
>
  <Tab.Screen name="Home" component={HomeScreen} />
  <Tab.Screen name="Profile" component={ProfileScreen} />
</Tab.Navigator>
```

</TabItem>
</Tabs>

---

## Navigation state reference

Source: https://reactnavigation.org/docs/8.x/navigation-state

The navigation state is the state where React Navigation stores the navigation structure and history of the app. It's useful to know about the structure of the navigation state if you need to do advanced operations such as [resetting the state](navigation-actions.md#reset), [providing a custom initial state](navigation-container.md#initialstate) etc.

It's a JavaScript object which looks like this:

```js
const state = {
  type: 'stack',
  key: 'stack-1',
  routeNames: ['Home', 'Profile', 'Settings'],
  routes: [
    { key: 'home-1', name: 'Home', params: { sortBy: 'latest' } },
    { key: 'settings-1', name: 'Settings' },
  ],
  index: 1,
  stale: false,
};
```

There are few properties present in every navigation state object:

- `type` - Type of the navigator that the state belongs to, e.g. `stack`, `tab`, `drawer`.
- `key` - Unique key to identify the navigator.
- `routeNames` - Name of the screens defined in the navigator. This is an unique array containing strings for each screen.
- `routes` - List of route objects (screens) which are rendered in the navigator. It also represents the history in a stack navigator. There should be at least one item present in this array.
- `index` - Index of the focused route object in the `routes` array.
- `history` - An optional list of visited items. See [History stack](#history-stack) for more details.
- `stale` - A navigation state is assumed to be stale unless the `stale` property is explicitly set to `false`. This means that the state object needs to be ["rehydrated"](#stale-state-objects).

Each route object in a `routes` array may contain the following properties:

- `key` - Unique key of the screen. Created automatically or added while navigating to this screen.
- `name` - Name of the screen. Defined in navigator component hierarchy.
- `params` - An optional object containing params which is defined while navigating e.g. `navigate('Home', { sortBy: 'latest' })`.
- `history` - An optional list of history items for the route. See [History stack](#history-stack) for more details.
- `state` - An optional object containing the [stale navigation state](#stale-state-objects) of a child navigator nested inside this screen.

For example, a stack navigator containing a tab navigator nested inside it's home screen may have a navigation state object like this:

```js
const state = {
  type: 'stack',
  key: 'stack-1',
  routeNames: ['Home', 'Profile', 'Settings'],
  routes: [
    {
      key: 'home-1',
      name: 'Home',
      state: {
        key: 'tab-1',
        routeNames: ['Feed', 'Library', 'Favorites'],
        routes: [
          { key: 'feed-1', name: 'Feed', params: { sortBy: 'latest' } },
          { key: 'library-1', name: 'Library' },
          { key: 'favorites-1', name: 'Favorites' },
        ],
        index: 0,
      },
    },
    { key: 'settings-1', name: 'Settings' },
  ],
  index: 1,
};
```

It's important to note that even if there's a nested navigator, the `state` property on the `route` object is not added until a navigation happens, hence it's not guaranteed to exist, or maybe [stale](#stale-state-objects).

## History stack

In React Navigation, each navigator may maintain a history stack to keep track of visited entries. This is used when navigating back, syncing with browser history on the Web, etc.

Unlike Web, which has a linear history stack, React Navigation uses a nested history stack mirroring mobile navigation patterns. A parent navigator maintains its own history stack, while each child navigator also maintains its own history stack. When navigating back, it goes back in the history stack of the navigator where the "go back" action was triggered - and if that stack is empty, it bubbles up to the parent navigator's history stack. Any sibling navigators' history stacks are not affected.

The history stack for a navigator is determined from the following sources:

- `state.history` if present, otherwise `state.routes`
- `route.history` for each route in `state.routes`

When determining total length of history stack (e.g. to sync with browser history on the Web), these 2 sources are combined.

The content and shape of items in the `state.history` array can vary depending on the navigator. There should be at least one item present in this array. Among built-in navigators, this property is present only in tab and drawer navigators. For example, the `history` array in a drawer navigator looks like this:

```js
const state = {
  history: [
    { type: 'route', key: 'home-1' },
    { type: 'route', key: 'settings-1' },
    { type: 'drawer', status: 'open' },
  ],

  // ...
};
```

This array is populated based on the `backBehavior` prop of the tab or drawer navigators:

- `firstRoute` - the first route defined in the navigator and the focused route
- `initialRoute` - the initial route defined in the navigator and the focused route
- `order` - the focused route and any routes defined before it in the navigator, in the order they are defined
- `history` - deduplicated list of previously visited routes in the navigator and the focused route
- `fullHistory` - full list of previously visited routes in the navigator and the focused route
- `none` - only the focused route

Similarly, each `route` object in the `routes` array may also have a `history` property which maintains a history stack for that specific route. It contains previous params in built-in navigators:

```js
const route = {
  history: [
    { type: 'params', params: { sortBy: 'latest' } },
    { type: 'params', params: { sortBy: 'popular' } },
  ],
  params: { sortBy: 'trending' },

  // ...
};
```

By default, this property is populated when using the [`pushParams`](navigation-actions.md#pushparams) action. The `params` property on the route object always contains the latest params, while the `history` array contains previous params in the order they were updated.

[Custom routers](custom-routers.md) may also add different types of items to the `history` array to represent different kinds of history entries.

## Stale state objects

Earlier there was a mention of `stale` property in the navigation state. If the `stale` property is set to `true` or is missing, the state is assumed to be stale. Typically this is not something to worry about unless you're using the navigation state object directly for advanced use-cases.

A stale navigation state means that the state object may be partial, such as missing keys or routes, contain invalid routes, or may not be up-to-date. A stale state can be a result of [deep linking](deep-linking.md), [restoring from a persisted state](state-persistence.md) etc.

The state object is guaranteed to not be stale when accessing it with built-in APIs such as:

- Navigator's state with [`useNavigationState()`](use-navigation-state.md) or [`navigation.getState()`](navigation-object.md#getstate) - not including child navigators.
- Complete state of the navigation tree with [`ref.getRootState()`](navigation-container.md#getrootstate) including root navigator and all child navigators.

However, if you try to access a child navigator's state with the `state` property on the [`route`](route-object.md) object, it maybe a stale or partial state object. So it's not recommended to use this property directly.

When React Navigation encounters stale or partial state, it will automatically fix it up before using it. This includes adding missing keys, removing any invalid routes, ensuring the `index` is correct etc. This process of fixing stale state is called **rehydration**. If you're writing a [custom router](custom-routers.md), the `getRehydratedState` method lets you write custom rehydration logic to fix up state objects.

This feature comes handy when doing operations such as [reset](navigation-actions.md#reset), [providing a initial state](navigation-container.md#initialstate) etc., as you can safely omit many properties from the navigation state object and relying on React Navigation to add those properties for you, making your code simpler.

For example, you can only provide a state without `index`, `keys` etc. only with a `routes` array without any keys and React Navigation will automatically add everything that's needed to make it work:

```js
const state = {
  routes: [{ name: 'Home' }, { name: 'Profile' }],
};
```

After rehydration, it'll look something like this:

```js
const state = {
  type: 'stack',
  key: 'stack-1',
  routeNames: ['Home', 'Profile', 'Settings'],
  routes: [
    { key: 'home-1', name: 'Home' },
    { key: 'profile-1', name: 'Profile' },
  ],
  index: 1,
  stale: false,
};
```

Here, React Navigation filled in the missing bits such as keys, route names, index etc.

It's also possible to provide invalid data such as non-existent screens and it'll be fixed automatically. While it's not recommended to write code with invalid state objects, it can be super useful if you do things like [state persistence](state-persistence.md), where the configured screens might have changed after an update, which could cause problems if React Navigation didn't fix the state object automatically.

:::tip

If you want React Navigation to fix invalid state, make sure that you don't have `stale: false` in the state object. State objects with `stale: false` are assumed to be valid state objects and React Navigation won't attempt to fix them. If `stale` is missing or set to `true`, React Navigation will always try to rehydrate the state object.

:::

When you're providing a state object in [`initialState`](navigation-container.md#initialstate), React Navigation will always assume that it's a stale state object, since navigation configuration may have changed since the last time. This makes sure that things like [state persistence](state-persistence.md) work smoothly without extra manipulation of the state object.

---

## Link

Source: https://reactnavigation.org/docs/8.x/link

The `Link` component renders a component that can navigate to a screen on press. This renders a `<a>` tag when used on the Web and uses a `Text` component on other platforms. It preserves the default behavior of anchor tags in the browser such as `Right click -> Open link in new tab"`, `Ctrl+Click`/`⌘+Click` etc. to provide a native experience.

The path in the `href` for the `<a>` tag is generated based on your [`linking` options](navigation-container.md#linking).

Example:

```js
import { Link } from '@react-navigation/native';

// ...

function Home() {
  return (
    <Link screen="Profile" params={{ id: 'jane' }}>
      Go to Jane's profile
    </Link>
  );
}
```

If you want to use your own custom link component, you can use [`useLinkProps`](use-link-props.md) instead.

The `Link` component accepts the [same props as `useLinkProps`](use-link-props.md#options)

---

## useNavigation

Source: https://reactnavigation.org/docs/8.x/use-navigation

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

`useNavigation` is a hook that gives access to `navigation` object. It's useful when you cannot pass the `navigation` object as a prop to the component directly, or don't want to pass it in case of a deeply nested child.

It can be used in two ways.

## Getting the navigation object by screen name

The hook accepts the name of the current screen or any of its parent screens to get the corresponding navigation object:

```js name="useNavigation hook" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// codeblock-focus-start
import { useNavigation } from '@react-navigation/native';

function MyBackButton() {
  // highlight-next-line
  const navigation = useNavigation('Profile');

  return (
    <Button
      onPress={() => {
        navigation.goBack();
      }}
    >
      Back
    </Button>
  );
}
// codeblock-focus-end

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>This is the home screen of the app</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
      <MyBackButton />
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

function App() {
  return <Navigation />;
}

export default App;
```

## Getting the current navigation object

You can also use `useNavigation` without any arguments to get the navigation object for the current screen:

```js
function MyComponent() {
  const navigation = useNavigation();

  return <Button onPress={() => navigation.goBack()}>Go back</Button>;
}
```

This is often useful for re-usable components that are used across multiple screens.

See the documentation for the [`navigation` object](navigation-object.md) for more info.

## Using with class component

You can wrap your class component in a function component to use the hook:

```js
class MyBackButton extends React.Component {
  render() {
    // Get it from props
    const { navigation } = this.props;
  }
}

// Wrap and export
export default function (props) {
  const navigation = useNavigation();

  return <MyBackButton {...props} navigation={navigation} />;
}
```

---

## useRoute

Source: https://reactnavigation.org/docs/8.x/use-route

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

`useRoute` is a hook which gives access to `route` object. It's useful when you cannot pass down the `route` object from props to the component, or don't want to pass it in case of a deeply nested child.

It can be used in two ways.

## Getting the route object by screen name

The hook accepts the name of the current screen or any of its parent screens to get the corresponding route object:

```js name="useRoute hook" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// codeblock-focus-start
import { useRoute } from '@react-navigation/native';

function MyText() {
  // highlight-next-line
  const route = useRoute('Profile');

  return <Text>{route.params.caption}</Text>;
}
// codeblock-focus-end

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>This is the home screen of the app</Text>
      <Button
        onPress={() => {
          navigation.navigate('Profile', { caption: 'Some caption' });
        }}
      >
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
      <MyText />
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

function App() {
  return <Navigation />;
}

export default App;
```

## Getting the current route object

You can also use `useRoute` without any arguments to get the route object for the current screen:

```js
function MyComponent() {
  const route = useRoute();

  return <Text>{route.name}</Text>;
}
```

This is often useful for re-usable components that are used across multiple screens.

See the documentation for the [`route` object](route-object.md) for more info.

## Using with class component
