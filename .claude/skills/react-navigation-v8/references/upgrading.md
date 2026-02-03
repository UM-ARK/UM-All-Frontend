## I'm getting "Module '[...]' has no exported member 'xxx' when using TypeScript

This might happen if you have an old version of TypeScript in your project. You can try upgrading it:

```bash npm2yarn
npm install --save-dev typescript
```

## I'm getting an error "null is not an object (evaluating 'RNGestureHandlerModule.default.Direction')"

This and some similar errors might occur if you have a bare React Native project and the library [`react-native-gesture-handler`](https://github.com/software-mansion/react-native-gesture-handler) library isn't linked.

Linking is automatic from React Native 0.60, so if you have linked the library manually, first unlink it:

```bash
react-native unlink react-native-gesture-handler
```

If you're testing on iOS and use Mac, make sure you have run `pod install` in the `ios/` folder:

```bash
cd ios
pod install
cd ..
```

Now rebuild the app and test on your device or simulator.

## I'm getting an error "requireNativeComponent: "RNCSafeAreaProvider" was not found in the UIManager"

This and some similar errors might occur if you have a bare React Native project and the library [`react-native-safe-area-context`](https://github.com/th3rdwave/react-native-safe-area-context) library isn't linked.

Linking is automatic from React Native 0.60, so if you have linked the library manually, first unlink it:

```bash
react-native unlink react-native-safe-area-context
```

If you're testing on iOS and use Mac, make sure you have run `pod install` in the `ios/` folder:

```bash
cd ios
pod install
cd ..
```

Now rebuild the app and test on your device or simulator.

## I'm getting an error "Tried to register two views with the same name RNCSafeAreaProvider"

This might occur if you have multiple versions of [`react-native-safe-area-context`](https://github.com/th3rdwave/react-native-safe-area-context) installed.

If you're using Expo managed workflow, it's likely that you have installed an incompatible version. To install the correct version, run:

```bash
npx expo install react-native-safe-area-context
```

If it didn't fix the error or you're not using Expo managed workflow, you'll need to check which package depends on a different version of `react-native-safe-area-context`.

If you use `yarn`, run:

```bash
yarn why react-native-safe-area-context
```

If you use `npm`, run:

```bash
npm ls react-native-safe-area-context
```

This will tell you if a package you use has a dependency on `react-native-safe-area-context`. If it's a third-party package, you should open an issue on the relevant repo's issue tracker explaining the problem. Generally for libraries, dependencies containing native code should be defined in `peerDependencies` instead of `dependencies` to avoid such issues.

If it's already in `peerDependencies` and not in `dependencies`, and you use `npm`, it might be because of incompatible version range defined for the package. The author of the library will need to relax the version range in such cases to allow a wider range of versions to be installed.

If you use `yarn`, you can also temporarily override the version being installed using `resolutions`. Add the following in your `package.json`:

```json
"resolutions": {
  "react-native-safe-area-context": "<version you want to use>"
}
```

And then run:

```bash
yarn
```

If you're on iOS and not using Expo managed workflow, also run:

```bash
cd ios
pod install
cd ..
```

Now rebuild the app and test on your device or simulator.

## Nothing is visible on the screen after adding a `View`

If you wrap the container in a `View`, make sure the `View` stretches to fill the container using `flex: 1`:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import * as React from 'react';
import { View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';

/* ... */

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return (
    // highlight-next-line
    <View style={{ flex: 1 }}>
      <Navigation />
    </View>
  );
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import * as React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';

export default function App() {
  return (
    // highlight-next-line
    <View style={{ flex: 1 }}>
      <NavigationContainer>{/* ... */}</NavigationContainer>
    </View>
  );
}
```

</TabItem>
</Tabs>

## I get the warning "Non-serializable values were found in the navigation state"

This can happen if you are passing non-serializable values such as class instances, functions etc. in params. React Navigation warns you in this case because this can break other functionality such [state persistence](state-persistence.md), [deep linking](deep-linking.md), [web support](web-support.md) etc.

Example of some use cases for passing functions in params are the following:

- To pass a callback to use in a header button. This can be achieved using `navigation.setOptions` instead. See the [guide for header buttons](header-buttons.md#header-interaction-with-its-screen-component) for examples.
- To pass a callback to the next screen which it can call to pass some data back. You can usually achieve it using `popTo` instead. See [passing params to a previous screen](params.md#passing-params-to-a-previous-screen) for examples.
- To pass complex data to another screen. Instead of passing the data `params`, you can store that complex data somewhere else (like a global store), and pass an id instead. Then the screen can get the data from the global store using the id. See [what should be in params](params.md#what-should-be-in-params).
- Pass data, callbacks etc. from a parent to child screens. You can either use React Context, or pass a children callback to pass these down instead of using params. See [passing additional props](hello-react-navigation.md#passing-additional-props).

We don't generally recommend passing functions in params. But if you don't use state persistence, deep links, or use React Navigation on Web, then you can choose to ignore it. To ignore the warning, you can use `LogBox.ignoreLogs`.

Example:

```js
import { LogBox } from 'react-native';

LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
]);
```

## I'm getting "Invalid hook call. Hooks can only be called inside of the body of a function component"

This can happen when you pass a React component to an option that accepts a function returning a react element. For example, the [`headerTitle` option in native stack navigator](native-stack-navigator.md#headertitle) expects a function returning a react element:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        // highlight-next-line
        headerTitle: (props) => <MyTitle {...props} />,
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
  component={Home}
  option={{
    // highlight-next-line
    headerTitle: (props) => <MyTitle {...props} />,
  }}
/>
```

</TabItem>
</Tabs>

If you directly pass a function here, you'll get this error when using hooks:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: Home,
      options: {
        // This is not correct
        // highlight-next-line
        headerTitle: MyTitle,
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
  component={Home}
  option={{
    // This is not correct
    // highlight-next-line
    headerTitle: MyTitle,
  }}
/>
```

</TabItem>
</Tabs>

The same applies to other options like `headerLeft`, `headerRight`, `tabBarIcon` etc. as well as props such as `tabBar`, `drawerContent` etc.

## Screens are unmounting/remounting during navigation

Sometimes you might have noticed that your screens unmount/remount, or your local component state or the navigation state resets when you navigate. This might happen if you are creating React components during render.

The simplest example is something like following:

```js
function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={() => {
          return <SomeComponent />;
        }}
      />
    </Stack.Navigator>
  );
}
```

The `component` prop expects a React Component, but in the example, it's getting a function returning an React Element. While superficially a component and a function returning a React Element look the exact same, they don't behave the same way when used.

Here, every time the component re-renders, a new function will be created and passed to the `component` prop. React will see a new component and unmount the previous component before rendering the new one. This will cause any local state in the old component to be lost. React Navigation will detect and warn for this specific case but there can be other ways you might be creating components during render which it can't detect.

Another easy to identify example of this is when you create a component inside another component:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
function App() {
  const Home = () => {
    return <SomeComponent />;
  };

  const RootStack = createNativeStackNavigator({
    screens: {
      Home: Home,
    },
  });

  const Navigation = createStaticNavigation(RootStack);

  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
function App() {
  const Home = () => {
    return <SomeComponent />;
  };

  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

Or when you use a higher order component (such as `connect` from Redux, or `withX` functions that accept a component) inside another component:

```js
function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={withSomeData(Home)} />
    </Stack.Navigator>
  );
}
```

If you're unsure, it's always best to make sure that the components you are using as screens are defined outside of a React component. They could be defined in another file and imported, or defined at the top level scope in the same file:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Home = () => {
  // ...

  return <SomeComponent />;
};

const RootStack = createNativeStackNavigator({
  screens: {
    Home: Home,
  },
});

const Navigation = createStaticNavigation(RootStack);

function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Home = () => {
  // ...

  return <SomeComponent />;
};

function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

This is not React Navigation specific, but related to React in general. You should always avoid creating components during render, whether you are using React Navigation or not.

## App is not working properly when connected to Chrome Debugger

When the app is connected to Chrome Debugger (or other tools that use Chrome Debugger such as [React Native Debugger](https://github.com/jhen0409/react-native-debugger)) you might encounter various issues related to timing.

This can result in issues such as button presses taking a long time to register or not working at all, [gestures and animations being slow and buggy](https://github.com/facebook/react-native/issues/2367) etc. There can be other functional issues such as promises not resolving, [timeouts and intervals not working correctly](https://github.com/facebook/react-native/issues/4470) etc. as well.

The issues are not related to React Navigation, but due to the nature of how the Chrome Debugger works. When connected to Chrome Debugger, your whole app runs on Chrome and communicates with the native app via sockets over the network, which can introduce latency and timing related issues.

So, unless you are trying to debug something, it's better to test the app without being connected to the Chrome Debugger. If you are using iOS, you can alternatively use [Safari to debug your app](https://reactnative.dev/docs/debugging#safari-developer-tools) which debugs the app on the device directly and does not have these issues, though it has other downsides.

---

## Upgrading from 7.x

Source: https://reactnavigation.org/docs/8.x/upgrading-from-7.x

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

:::warning

React Navigation 8 is still in pre-release stage. The API may still change before the stable release. Please provide any feedback or suggestions on [GitHub Discussions](https://github.com/react-navigation/react-navigation/discussions).

:::

This guides lists all the breaking changes and new features in React Navigation 8 that you need to be aware of when upgrading from React Navigation 7.

## Dependency changes

The minimum required version of React Native, Expo, and TypeScript have been bumped:

- `react-native` >= 0.81 (planned to be bumped to 0.83)
- `expo` >= 54 (planned to be bumped to 55)
- `typescript` >= 5.9.2 (if you use TypeScript)

The minimum required version of various peer dependencies have also been bumped:

- `react-native-screens` >= 4.20.0
- `react-native-safe-area-context` >= 5.5.0
- `react-native-reanimated` >= 4.0.0
- `react-native-pager-view` >= 7.0.0 (8.0.0 is recommended)
- `react-native-web` >= 0.21.0

Previously, many navigators worked without `react-native-screens`, but now it's required for all navigators.

Additionally, React Navigation now uses [`@callstack/liquid-glass`](https://github.com/callstack/liquid-glass) to implement liquid glass effect on iOS 26.

:::warning

[Expo Go](https://expo.dev/go) doesn't support React Navigation 8. So you need to create a [development build](https://docs.expo.dev/development/introduction/) of your app to use React Navigation 8 with Expo.

:::

## Breaking changes

### Dropping support for old architecture

React Navigation 8 no longer supports the old architecture of React Native. The old architecture has been frozen since React Native 0.80 and removed in React Native 0.82.

So if you're still on the old architecture, you'll need to upgrade to the new architecture in order to use React Navigation 8.

### Changes to TypeScript setup

We introduced a static API in React Navigation 7. However, some of the TypeScript types were not inferred and required manual annotations. In React Navigation 8, we reworked the TypeScript types to solve many of these issues.

#### The root type now uses navigator type instead of param list

Previously the types for the root navigator were specified using `declare global` and `RootParamList`. Now, they can be specified with module augmentation of `@react-navigation/core` and use the navigator's type instead a param list:

```diff lang=ts
- type RootStackParamList = StaticParamList<typeof RootStack>;
-
- declare global {
-   namespace ReactNavigation {
-     interface RootParamList extends RootStackParamList {}
-   }
- }
+ type RootStackType = typeof RootStack;
+
+ declare module '@react-navigation/core' {
+   interface RootNavigator extends RootStackType {}
+ }
```

Using module augmentation is shorter, and avoids namespace usage - which ESLint may complain about in some configurations.

Using the navigator's type instead of a param list allows us to infer the type of navigators - primarily in case of static configuration.

#### Common hooks no longer accept generics

Previously hooks such as `useNavigation`, `useRoute` and `useNavigationState` accepted a generic to override the default types. This is not type-safe as we cannot verify that the provided type matches the actual navigators, and we recommended minimizing such usage.

In React Navigation 8, we reworked the types to automatically determine the correct type [based on the name of the screen](#common-hooks-now-accept-name-of-the-screen) when using static config:

```diff lang=ts
- const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Profile'>>();
+ const navigation = useNavigation('Profile');
```

If you're using dynamic configuration, unfortunately we cannot currently infer the types automatically. So it still requires manual annotation. However, now you need to use `as` instead of generics to make it clearer that this is unsafe:

```diff lang=ts
- const navigation = useNavigation<StackNavigationProp<RootStackParamList, 'Profile'>>();
+ const navigation = useNavigation() as StackNavigationProp<RootStackParamList, 'Profile'>;
```

The `useRoute` type has been updated in the same way:

```diff lang=ts
- const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
+ const route = useRoute('Profile');
```

And if you're using dynamic configuration:

```diff lang=ts
- const route = useRoute<RouteProp<RootStackParamList, 'Profile'>>();
+ const route = useRoute() as RouteProp<RootStackParamList, 'Profile'>;
```

Similarly, the `useNavigationState` type has been updated to accept the name of the screen in addition to the selector:

```diff lang=ts
- const focusedRouteName = useNavigationState<RootStackParamList>((state) => state.routes[state.index].name);
+ const focusedRouteName = useNavigationState('Settings', (state) => state.routes[state.index].name);
```

If you're using dynamic configuration, you can use `as`:

```diff lang=ts
- const focusedRouteName = useNavigationState<RootStackParamList>((state) => state.routes[state.index].name);
+ const focusedRouteName = useNavigationState((state) => state.routes[state.index].name as keyof RootStackParamList);
```

#### New `createXScreen` API for creating screen config

One of the limitations of the static config API is that the type of `route` object can't be inferred in screen callback, listeners callback etc. This made it difficult to use route params in these callbacks.

To address this, we added a new `createXScreen` API for each navigator to create screen config with proper types:

```diff lang=js
const Stack = createStackNavigator({
  screens: {
-     Profile: {
-       screen: ProfileScreen,
-       options: ({ route }) => {
-         const userId = route.params.userId; // Don't know the type of route params
-
-         return { title: `User ${userId}` };
-       },
-     },
+     Profile: createStackScreen({
+       screen: ProfileScreen,
+       options: ({ route }) => {
+         const userId = route.params.userId; // Now correctly inferred
+
+         return { title: `User ${userId}` };
+       },
+     });
  }
});
```

When using the `createXScreen` API, the type of params are automatically inferred based on the type annotation for the component specified in `screen` (e.g. `(props: StaticScreenProps<ProfileParams>)`) and the path pattern specified in the linking config (e.g. `linking: 'profile/:userId'`).

Each navigator exports its own helper function, e.g. `createNativeStackScreen` for Native Stack Navigator, `createBottomTabScreen` for Bottom Tab Navigator, `createDrawerScreen` for Drawer Navigator etc.

:::note

This is technically not a breaking change. It's not required to use this API and your existing code will continue to work as before. You can incrementally adopt this API for new screens to get proper types for `route` object in various callbacks such as `options`, `listeners`, etc.

:::

See [Static configuration docs](static-configuration.md#createxscreen) for more details.

#### Custom navigators now require overloads for types

To work with the reworked TypeScript types, custom navigators now need to provide overloads for static and dynamic configuration APIs, and an additional API to create screen config.

```diff lang=ts
- export function createMyNavigator<
-   const ParamList extends ParamListBase,
-   const NavigatorID extends string | undefined = string | undefined,
-   const TypeBag extends NavigatorTypeBagBase = {
-     ParamList: ParamList;
-     NavigatorID: NavigatorID;
-     State: TabNavigationState<ParamList>;
-     ScreenOptions: MyNavigationOptions;
-     EventMap: MyNavigationEventMap;
-     NavigationList: {
-       [RouteName in keyof ParamList]: MyNavigationProp<
-         ParamList,
-         RouteName,
-         NavigatorID
-       >;
-     };
-     Navigator: typeof MyNavigator;
-   },
-   const Config extends StaticConfig<TypeBag> = StaticConfig<TypeBag>,
- >(config?: Config): TypedNavigator<TypeBag, Config> {
-   return createNavigatorFactory(MyNavigator)(config);
- }
+ type MyTypeBag<ParamList extends {}> = {
+   ParamList: ParamList;
+   State: TabNavigationState<ParamList>;
+   ScreenOptions: MyNavigationOptions;
+   EventMap: MyNavigationEventMap;
+   NavigationList: {
+     [RouteName in keyof ParamList]: MyNavigationProp<
+       ParamList,
+       RouteName
+     >;
+   };
+   Navigator: typeof MyNavigator;
+ };
+
+ export function createMyNavigator<
+   const ParamList extends ParamListBase,
+ >(): TypedNavigator<MyTypeBag<ParamList>, undefined>;
+ export function createMyNavigator<
+   const Config extends StaticConfig<MyTypeBag<ParamListBase>>,
+ >(
+   config: Config
+ ): TypedNavigator<
+   MyTypeBag<StaticParamList<{ config: Config }>>,
+   Config
+ >;
+ export function createMyNavigator(config?: unknown) {
+   return createNavigatorFactory(MyNavigator)(config);
+ }

+ export function createMyScreen<
+  const Linking extends StaticScreenConfigLinking,
+  const Screen extends StaticScreenConfigScreen,
+ >(
+   config: StaticScreenConfig<
+     Linking,
+     Screen,
+     TabNavigationState<ParamListBase>,
+     MyNavigationOptions,
+     MyNavigationEventMap,
+     MyNavigationProp<ParamListBase>
+   >
+ ) {
+   return config;
+ }
```

See [Custom navigators](custom-navigators.md) for more details.

### Changes to navigators

#### Native Bottom Tabs are now default

Previously, the Bottom Tab Navigator used a JavaScript-based implementation and a native implementation was available under `@react-navigation/bottom-tabs/unstable`. The `@react-navigation/bottom-tabs/unstable` entry point has been removed and it has been merged into the main package.

Native bottom tabs are now used by default on iOS and Android. This allows us to match the new native design such as liquid glass effect on iOS 26.

To keep the previous behavior with JavaScript-based tabs, you can pass `implementation: 'custom'` to the navigator:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```diff lang=js
createBottomTabNavigator({
+   implementation: 'custom',
  // ...
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```diff lang=js
<Tab.Navigator
+   implementation="custom"
  // ...
>
```

</TabItem>
</Tabs>

As part of this change, some of the options have changed to work with native tabs:

- `tabBarShowLabel` is replaced with `tabBarLabelVisibilityMode` which accepts:
  - `"auto"` (default)
  - `"selected"`
  - `"labeled"` - same as `tabBarShowLabel: true`
  - `"unlabeled"` - same as `tabBarShowLabel: false`
- `tabBarLabel` now only accepts a `string`
- `tabBarIcon` now accepts an icon object or function that can return an icon object, returning a react element still works with `custom` implementation - so you don't need to change anything if you're using `custom` implementation.

The following props have been removed:

- `safeAreaInsets` from the navigator props
- `insets` from the bottom tab bar props
- `layout` from the bottom tab bar props

If you use `insets` and `layout` in your custom tab bar, you can use [`useSafeAreaInsets`](https://appandflow.github.io/react-native-safe-area-context/api/use-safe-area-insets/) and [`useSafeAreaFrame`](https://appandflow.github.io/react-native-safe-area-context/api/use-safe-area-frame/) from [`react-native-safe-area-context`](https://github.com/th3rdwave/react-native-safe-area-context) instead to get the same values.

See the [Bottom Tab Navigator docs](bottom-tab-navigator.md) for all the available options.

#### Bottom Tabs no longer shows header by default

Since Bottom Tabs now renders native tabs by default, the header is no longer shown by default to match native look and feel. You can nest a [Native Stack Navigator](native-stack-navigator.md) inside each tab to show a header that integrates well with native tabs, e.g. [search tab on iOS 26+](bottom-tab-navigator.md#search-tab-on-ios-26).

Alternatively, you can enable the built-in header by passing `headerShown: true` in `screenOptions` of the navigator:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```diff lang=js
createBottomTabNavigator({
  screenOptions: {
+     headerShown: true,
    // ...
  },
  // ...
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```diff lang=js
<Tab.Navigator
  screenOptions={{
+     headerShown: true,
    // ...
  }}
>
```

</TabItem>
</Tabs>

#### Preloaded screens now behave differently

Previously, when a screen was preloaded in Stack and Native Stack Navigators, there were a few restrictions:

- Options could not be updated with [`setOptions`](navigation-object.md#setoptions) until the screen became active.
- Adding listeners with [`addListener`](navigation-object.md#navigation-events) did nothing until the screen became active.
- Preloaded screens could not contain nested navigators.

In addition, the `navigation` object received by preloaded screens was different from that of active screens. So it resulted in re-rendering the screen when it became active.

We have reworked the implementation of preloaded screens to make it more consistent with active screens:

- Options can now be updated with `setOptions` even when the screen is preloaded.
- Listeners added with `addListener` will now be called even when the screen is preloaded.
- Preloaded screens can now contain nested navigators.
- The `navigation` object now does not change when the screen becomes active.

While this is a breaking change, your existing code will likely continue to work as before if you were not relying on any of the special behaviors of preloaded screens for your logic.

If your existing code checked `navigation.isFocused()` before calling `setOptions`, it will continue to work as before. However, you can now simplify such code by removing the check:

```diff lang=js
- if (navigation.isFocused()) {
    navigation.setOptions({ title: 'New Title' });
- }
```

See [`navigation.preload`](navigation-object.md#preload) for usage details.

#### Navigators no longer accept an `id` prop

Previously, navigators accepted an `id` prop to identify them - which was used with `navigation.getParent(id)` to get a parent navigator by id. However, there were a couple of issues with this approach:

- It wasn't well integrated with TypeScript types, and required manual annotations.
- The navigation object is specific to a screen, so using the navigator's id was inconsistent.
- It was used for a very specific use case, so it added unnecessary complexity.

In React Navigation 8, we removed the `id` prop from navigators. Instead, you can use the screen's name to get a parent navigator:

```diff lang=js
- const parent = navigation.getParent('some-id');
+ const parent = navigation.getParent('SomeScreenName');
```

In this case, 'SomeScreenName' refers to the name of a parent screen that's used in the navigator.

See [navigation object docs](navigation-object.md#getparent) for more details.

#### `setParams` no longer pushes to history in tab and drawer navigators when `backBehavior` is set to `fullHistory`

Previously, when using `setParams` in tab and drawer navigators with `backBehavior` set to `fullHistory`, it would push a new entry to the history stack.

In React Navigation 8, we [added a new `pushParams` action](#new-entry-can-be-added-to-history-stack-with-pushparams-action) that achieves this behavior. So `setParams` now only updates the params without affecting the history stack.

```diff lang=js
- navigation.setParams({ filter: 'new' });
+ navigation.pushParams({ filter: 'new' });
```

This way you have more control over how params are updated in tab and drawer navigators.

See [`setParams` action docs](navigation-actions.md#setparams) for more details.

#### Navigators no longer use `InteractionManager`

Previously, various navigators used `InteractionManager` to mark when animations and gestures were in progress. This was primarily used to defer code that should run after transitions, such as loading data or rendering heavy components.

However, `InteractionManager` has been deprecated in latest React Native versions, so we are removing support for this API in React Navigation 8. As an alternative, consumers can listen to events such as `transitionStart`, `transitionEnd` etc. when applicable:

```diff lang=js
- InteractionManager.runAfterInteractions(() => {
-   // code to run after transition
- });
+ navigation.addListener('transitionEnd', () => {
+   // code to run after transition
+ });
```

Keep in mind that unlike `InteractionManager` which is global, the transition events are specific to a navigator.

If you have a use case that cannot be solved with transition events, please open a [discussion on GitHub](https://github.com/react-navigation/react-navigation/discussions).

#### The color arguments in various navigators now accept `ColorValue`

Previously, color options in various navigators only accepted string values. In React Navigation 8, these options now accept `ColorValue` to match the [changes to theming](#themes-now-support-colorvalue-and-css-custom-properties).

Unless you are using a custom theme with `PlatformColor` or `DynamicColorIOS` etc, this change only breaks TypeScript types:

```diff lang=js
- const tabBarIcon = ({ color, size }: { color: string, size: number }) => {
+ const tabBarIcon = ({ color, size }: { color: ColorValue, size: number }) => {
  // ...
};
```

See [Themes](themes.md#using-platform-colors) for more information about dynamic colors.

#### Various components no longer receive layout related props

Previously, various components such as `Header`, `BottomTabBar`, and `DrawerContent` received layout related props such as `layout` - that contained the dimensions of the screen.

This meant that if the `layout` changed frequently, such as resizing the window on supported platforms (Web, Windows, macOS, iPadOS), it would need to re-render these components frequently - often not being able to keep up with the changes, leading to jank and poor performance.

To avoid this, we have removed layout related props from these components:

- `layout` prop from `Header` component from `@react-navigation/elements`
- `titleLayout` and `screenLayout` props from `HeaderBackButton` component from `@react-navigation/elements`
- `layouts.title` and `layouts.leftLabel` parameters from `headerStyleInterpolator` in `@react-navigation/stack`
- `layout` prop from `react-native-tab-view`
- `layout` prop from `react-native-drawer-layout`

Since React Native doesn't provide APIs to handle layout changes in styles, it may still be necessary to handle layout changes manually in some cases. So we have added a [`useFrameSize`](elements.md#useframesize) hook that takes a selector function to minimize re-renders:

```js
import { useFrameSize } from '@react-navigation/elements';

// ...

const isLandscape = useFrameSize((size) => size.width > size.height);
```

#### The `onChangeText` callback has been renamed to `onChange` for `headerSearchBarOptions`

The `onChangeText` option in `headerSearchBarOptions` was confusingly named after text input's
`onChangeText`, but TextInput's `onChangeText` receives the new text as the first argument, whereas `headerSearchBarOptions.onChangeText` received an event object - similar to TextInput's `onChange`.

To avoid confusion due to this inconsistency, the option has been renamed to `onChange`. To upgrade, simply rename the option:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```diff lang=js
createNativeStackNavigator({
  screens: {
    Search: {
      screen: SearchScreen,
      options: {
        headerSearchBarOptions: {
-           onChangeText: (event) => {
+           onChange: (event) => {
            const text = event.nativeEvent.text;
            // ...
          },
        },
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```diff lang=js
<Stack.Navigator>
  <Stack.Screen
    name="Search"
    component={SearchScreen}
    options={{
      headerSearchBarOptions: {
-         onChangeText: (event) => {
+         onChange: (event) => {
          const text = event.nativeEvent.text;
          // ...
        },
      },
    }}
  />
</Stack.Navigator>
```

</TabItem>
</Tabs>

This applies to all navigators that support `headerSearchBarOptions`, such as Native Stack Navigator with native header, and other navigators using `Header` from `@react-navigation/elements`.

If you're using `Header` from `@react-navigation/elements` directly, the same change applies.

#### APIs for customizing Navigation bar and status bar colors are removed from Native Stack Navigator

Previously, Native Stack Navigator provided options to customize the appearance of the navigation bar and status bar on Android:

- `navigationBarColor`
- `navigationBarTranslucent`
- `statusBarBackgroundColor`
- `statusBarTranslucent`

In Android 15 and onwards, edge-to-edge is now the default behavior, and will likely be enforced in future versions. Therefore, these options have been removed in React Navigation 8.

You can use [`react-native-edge-to-edge`](https://github.com/zoontek/react-native-edge-to-edge) instead to configure status bar and navigation bar related settings.

See [Native Stack Navigator](native-stack-navigator.md) for all available options.

#### Stack Navigator now accepts a number for `gestureResponseDistance`

Previously, the `gestureResponseDistance` option in Stack Navigator accepted an object with `horizontal` and `vertical` properties to specify the distance for gestures. Since it's not pssible to have both horizontal and vertical gestures at the same time, it now accepts a number to specify the distance for the current gesture direction:

```diff lang=js
- gestureResponseDistance: { horizontal: 50 }
+ gestureResponseDistance: 50
```

#### Drawer Navigator now accepts `overlayStyle` instead of `overlayColor`

Previously, the Drawer Navigator accepted an `overlayColor` prop to customize the color of the overlay that appears when the drawer is open. It now accepts `overlayStyle` prop instead to provide more flexibility for styling the overlay:

```diff lang=js
- overlayColor="rgba(0, 0, 0, 0.5)"
+ overlayStyle={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
```

See [Drawer Navigator](drawer-navigator.md) for more details.

### Miscellaneous

#### Various deprecated APIs have been removed

The following API that were marked as deprecated in React Navigation 7 have been removed:

- `navigateDeprecated` from the navigation object has been removed. Use `navigate` instead. To preserve the previous behavior, you can pass `pop: true` as the third argument to `navigate`:

  ```diff lang=js
  - navigation.navigateDeprecated('Profile', { userId: 123 });
  + navigation.navigate('Profile', { userId: 123 }, { pop: true });
  ```

- `getId` from the navigation object has been removed since the [`id` prop has been removed](#navigators-no-longer-accept-an-id-prop).

- `navigationInChildEnabled` prop from `NavigationContainer` has been removed. This behavior is no longer supported.

#### The linking config no longer requires a `prefixes` option

Previously, the linking configuration required a `prefixes` option to specify the URL prefixes that the app should handle. This historical reason for this is to support Expo Go which uses a custom URL scheme.

Since then, the recommended way to develop with Expo has been to use [Development Builds](https://docs.expo.dev/develop/development-builds/introduction/), which use the app's own URL scheme. So the `prefixes` option is not needed for most use cases.

You can now omit the `prefixes` option in the linking configuration unless you're using Expo Go:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```diff lang=js
<Navigation
  linking={{
-     prefixes: ['myapp://', 'https://myapp.com'],
    enabled: 'auto',
  }}
>
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```diff lang=js
<NavigationContainer
  linking={{
-     prefixes: ['myapp://', 'https://myapp.com'],
    config: { /* ... */ }
  }}
>
```

</TabItem>
</Tabs>

The `prefixes` default to `['*']`, which will match any host starting with `http`, `https`, and custom schemes such as `myapp://`.

See [Configuring links](configuring-links.md) for more details.

#### Deep links are now enabled by default in Static Configuration

Previously, deep linking needs to be explicitly enabled by setting `linking.enabled` to `auto` or by passing a `linking` prop. The additional step was necessary since we also needed `prefixes` to be specified in the linking config.

In React Navigation 8, it now defaults to `auto`, so deep linking is enabled by default with automatic path generation based on screen names when using static configuration:

If you don't want to enable deep linking, you can set `linking.enabled` to `false`:

```diff lang=js
<Navigation
+   linking={{
+     enabled: false,
+   }}
>
```

#### Some exports are removed from `@react-navigation/elements`

The `@react-navigation/elements` package has exported some components that were primarily intended for internal usage. These components have been removed from the public API:

- `Background`

  Background color can instead be applied by using it from `useTheme`.

  ```diff lang=js
  - import { Background } from '@react-navigation/elements';
  + import { useTheme } from '@react-navigation/native';
  // ...
  - <Background>{children}</Background>
  + const { colors } = useTheme();
  +
  + <View style={{ backgroundColor: colors.background }}>{children}</View>
  ```

- `Screen`

  You can render the `Header` component directly instead.

- `SafeAreaProviderCompat`

  You can use `SafeAreaProvider` from [`react-native-safe-area-context`](https://github.com/AppAndFlow/react-native-safe-area-context) directly instead.

- `MissingIcon`

  You can copy the implementation from the [source code](https://github.com/react-navigation/react-navigation/blob/main/packages/elements/src/MissingIcon.tsx) if you need a placeholder icon.

Some of these components are still available and exported at `@react-navigation/elements/internal`, so you can continue using them if you really need. However, since they are not part of the public API, they don't follow semver and may change without warning in future releases.

#### The `getDefaultHeaderHeight` utility now accepts an object instead of positional arguments

The `getDefaultHeaderHeight` utility from `@react-navigation/elements` now accepts an object with named properties instead of positional arguments to improve readability"

```diff lang=js
- getDefaultHeaderHeight(layout, false, statusBarHeight);
+ getDefaultHeaderHeight({
+   landscape: false,
+   modalPresentation: false,
+   topInset: statusBarHeight
+ });
```

See [Elements docs](elements.md#getdefaultheaderheight) for more details.

