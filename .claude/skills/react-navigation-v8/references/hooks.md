
You can wrap your class component in a function component to use the hook:

```js
class MyText extends React.Component {
  render() {
    // Get it from props
    const { route } = this.props;
  }
}

// Wrap and export
export default function (props) {
  const route = useRoute('Profile');

  return <MyText {...props} route={route} />;
}
```

---

## useNavigationState

Source: https://reactnavigation.org/docs/8.x/use-navigation-state

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

`useNavigationState` is a hook which gives access to the [navigation state](navigation-state.md) of the navigator which contains the screen. It's useful in rare cases where you want to render something based on the navigation state.

:::warning

Consider the navigator's state object to be internal and subject to change in a minor release. Avoid using properties from the [navigation state](navigation-state.md) state object except `index` and `routes`, unless you really need it. If there is some functionality you cannot achieve without relying on the structure of the state object, please open an issue.

:::

It can be used in two ways.

## Getting the navigation state by screen name

The hook accepts the name of the current screen or any of its parent screens as the first argument to get the navigation state for the navigator containing that screen. The second argument is a selector function that receives the full [navigation state](navigation-state.md) and can return a specific value from the state:

```js name="useNavigationState hook" snack static2dynamic
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// codeblock-focus-start
import { useNavigationState } from '@react-navigation/native';

function CurrentRouteDisplay() {
  // highlight-start
  const focusedRouteName = useNavigationState(
    'Home',
    (state) => state.routes[state.index]
  );
  // highlight-end

  return <Text>Current route: {focusedRouteName}</Text>;
}
// codeblock-focus-end

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <CurrentRouteDisplay />
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
      <CurrentRouteDisplay />
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

The selector function helps to reduce unnecessary re-renders, so your screen will re-render only when that's something you care about. If you actually need the whole state object, you can do this explicitly:

```js
const state = useNavigationState('Home', (state) => state);
```

## Getting the current navigation state

You can also use `useNavigationState` without a screen name to get the navigation state for the current screen's navigator. In this case, it takes a selector function as the only argument:

```js
const focusedRouteName = useNavigationState(
  (state) => state.routes[state.index].name
);
```

This is often useful for re-usable components that are used across multiple screens.

:::warning

This hook is useful for advanced cases and it's easy to introduce performance issues if you're not careful. For most of the cases, you don't need the navigator's state.

:::

## How is `useNavigationState` different from `navigation.getState()`?

The `navigation.getState()` function also returns the current [navigation state](navigation-state.md). The main difference is that the `useNavigationState` hook will trigger a re-render when values change, while `navigation.getState()` won't. For example, the following code will be incorrect:

```js
function Profile() {
  const routesLength = navigation.getState().routes.length; // Don't do this

  return <Text>Number of routes: {routesLength}</Text>;
}
```

In this example, even if you push a new screen, this text won't update. If you use the hook, it'll work as expected:

```js name="useNavigation hook" snack static2dynamic
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
  useRoute,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// codeblock-focus-start
import { useNavigationState } from '@react-navigation/native';

function useIsFirstRouteInParent() {
  const route = useRoute();
  const isFirstRouteInParent = useNavigationState(
    (state) => state.routes[0].key === route.key
  );

  return isFirstRouteInParent;
}

function usePreviousRouteName() {
  return useNavigationState((state) =>
    state.routes[state.index - 1]?.name
      ? state.routes[state.index - 1].name
      : 'None'
  );
}
// codeblock-focus-end

function HomeScreen() {
  const navigation = useNavigation('Home');
  const isFirstRoute = useIsFirstRouteInParent();
  const previousRouteName = usePreviousRouteName();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>It is {isFirstRoute ? '' : 'not '}first route in navigator</Text>
      <Text>Previous route name: {previousRouteName}</Text>

      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  const navigation = useNavigation('Profile');
  const isFirstRoute = useIsFirstRouteInParent();
  const previousRouteName = usePreviousRouteName();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>It is {isFirstRoute ? '' : 'not '}first route in navigator</Text>
      <Text>Previous route name: {previousRouteName}</Text>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

function SettingsScreen() {
  const navigation = useNavigation('Settings');
  const isFirstRoute = useIsFirstRouteInParent();
  const previousRouteName = usePreviousRouteName();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>It is {isFirstRoute ? '' : 'not '}first route in navigator</Text>
      <Text>Previous route name: {previousRouteName}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

So when do you use `navigation.getState()`? It's mostly useful within event listeners where you don't care about what's rendered. In most cases, using the hook should be preferred.

## Using with class component

You can wrap your class component in a function component to use the hook:

```js
class Profile extends React.Component {
  render() {
    // Get it from props
    const { routesLength } = this.props;
  }
}

// Wrap and export
export default function (props) {
  const routesLength = useNavigationState((state) => state.routes.length);

  return <Profile {...props} routesLength={routesLength} />;
}
```

---

## useFocusEffect

Source: https://reactnavigation.org/docs/8.x/use-focus-effect

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Sometimes we want to run side-effects when a screen is focused. A side effect may involve things like adding an event listener, fetching data, updating document title, etc. While this can be achieved using `focus` and `blur` events, it's not very ergonomic.

To make this easier, the library exports a `useFocusEffect` hook:

```js name="useFocusEffect hook" snack static2dynamic
import * as React from 'react';
import { View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
// codeblock-focus-start
import { useFocusEffect } from '@react-navigation/native';

function ProfileScreen() {
  useFocusEffect(
    React.useCallback(() => {
      // Do something when the screen is focused
      return () => {
        // Do something when the screen is unfocused
        // Useful for cleanup functions
      };
    }, [])
  );

  return <View />;
}
// codeblock-focus-end

function HomeScreen() {
  return <View />;
}

const MyTabs = createBottomTabNavigator({
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

:::warning

To avoid the running the effect too often, it's important to wrap the callback in `useCallback` before passing it to `useFocusEffect` as shown in the example.

:::

The `useFocusEffect` is analogous to React's `useEffect` hook. The only difference is that it only runs if the screen is currently focused.

The effect will run whenever the dependencies passed to `React.useCallback` change, i.e. it'll run on initial render (if the screen is focused) as well as on subsequent renders if the dependencies have changed. If you don't wrap your effect in `React.useCallback`, the effect will run every render if the screen is focused.

The cleanup function runs when the previous effect needs to be cleaned up, i.e. when dependencies change and a new effect is scheduled and when the screen unmounts or blurs.

## Running asynchronous effects

When running asynchronous effects such as fetching data from server, it's important to make sure that you cancel the request in the cleanup function (similar to `React.useEffect`). If you're using an API that doesn't provide a cancellation mechanism, make sure to ignore the state updates:

```js
useFocusEffect(
  React.useCallback(() => {
    let isActive = true;

    const fetchUser = async () => {
      try {
        const user = await API.fetch({ userId });

        if (isActive) {
          setUser(user);
        }
      } catch (e) {
        // Handle error
      }
    };

    fetchUser();

    return () => {
      isActive = false;
    };
  }, [userId])
);
```

If you don't ignore the result, then you might end up with inconsistent data due to race conditions in your API calls.

## Delaying effect until transition finishes

The `useFocusEffect` hook runs the effect as soon as the screen comes into focus. This often means that if there is an animation for the screen change, it might not have finished yet.

The navigators in React Navigation run animations in native thread when possible, so it's not a problem in most cases. But if the effect updates the UI or renders something expensive, then it can affect the animation performance. In such cases, you can listen to the `transitionEnd` event to defer your work until the transition has finished:

```js
useFocusEffect(
  React.useCallback(() => {
    const unsubscribe = navigation.addListener('transitionEnd', () => {
      // Expensive task after transition finishes
    });

    return unsubscribe;
  }, [navigation])
);
```

Keep in mind that the `transitionEnd` event is specific to stack navigators. For other navigators, you may need to use different approaches or events.

## How is `useFocusEffect` different from adding a listener for `focus` event

The `focus` event fires when a screen comes into focus. Since it's an event, your listener won't be called if the screen was already focused when you subscribed to the event. This also doesn't provide a way to perform a cleanup function when the screen becomes unfocused. You can subscribe to the `blur` event and handle it manually, but it can get messy. You will usually need to handle `componentDidMount` and `componentWillUnmount` as well in addition to these events, which complicates it even more.

The `useFocusEffect` allows you to run an effect on focus and clean it up when the screen becomes unfocused. It also handles cleanup on unmount. It re-runs the effect when dependencies change, so you don't need to worry about stale values in your listener.

## When to use `focus` and `blur` events instead

Like `useEffect`, a cleanup function can be returned from the effect in `useFocusEffect`. The cleanup function is intended to cleanup the effect - e.g. abort an asynchronous task, unsubscribe from an event listener, etc. It's not intended to be used to do something on `blur`.

For example, **don't do the following**:

```js
useFocusEffect(
  React.useCallback(() => {
    return () => {
      // Do something that should run on blur
    };
  }, [])
);
```

The cleanup function runs whenever the effect needs to cleanup, i.e. on `blur`, unmount, dependency change etc. It's not a good place to update the state or do something that should happen on `blur`. You should use listen to the `blur` event instead:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('blur', () => {
    // Do something when the screen blurs
  });

  return unsubscribe;
}, [navigation]);
```

Similarly, if you want to do something when the screen receives focus (e.g. track screen focus) and it doesn't need cleanup or need to be re-run on dependency changes, then you should use the `focus` event instead:

## Using with class component

You can make a component for your effect and use it in your class component:

```js
function FetchUserData({ userId, onUpdate }) {
  useFocusEffect(
    React.useCallback(() => {
      const unsubscribe = API.subscribe(userId, onUpdate);

      return () => unsubscribe();
    }, [userId, onUpdate])
  );

  return null;
}

// ...

class Profile extends React.Component {
  _handleUpdate = (user) => {
    // Do something with user object
  };

  render() {
    return (
      <>
        <FetchUserData
          userId={this.props.userId}
          onUpdate={this._handleUpdate}
        />
        {/* rest of your code */}
      </>
    );
  }
}
```

---

## useIsFocused

Source: https://reactnavigation.org/docs/8.x/use-is-focused

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

We might want to render different content based on the current focus state of the screen. The library exports a `useIsFocused` hook to make this easier:

```js name="useIsFocused hook" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';
// codeblock-focus-start
import { useIsFocused } from '@react-navigation/native';

function ProfileScreen() {
  // This hook returns `true` if the screen is focused, `false` otherwise
  // highlight-next-line
  const isFocused = useIsFocused();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>{isFocused ? 'focused' : 'unfocused'}</Text>
    </View>
  );
}
// codeblock-focus-end

function HomeScreen() {
  return <View />;
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

Note that using this hook triggers a re-render for the component when the screen it's in changes focus. This might cause lags during the animation if your component is heavy. You might want to extract the expensive parts to separate components and use [`React.memo`](https://react.dev/reference/react/memo) or [`React.PureComponent`](https://react.dev/reference/react/PureComponent) to minimize re-renders for them.

## Using with class component

You can wrap your class component in a function component to use the hook:

```js
class Profile extends React.Component {
  render() {
    // Get it from props
    const { isFocused } = this.props;
  }
}

// Wrap and export
export default function (props) {
  const isFocused = useIsFocused();

  return <Profile {...props} isFocused={isFocused} />;
}
```

---

## usePreventRemove

Source: https://reactnavigation.org/docs/8.x/use-prevent-remove

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The `usePreventRemove` hook allows you to prevent the user from leaving a screen. For example, if there are unsaved changes, you might want to show a confirmation dialog before the user can navigate away.

The hook takes 2 parameters:

- `preventRemove`: A boolean value indicating whether to prevent the screen from being removed.
- `callback`: A function that will be called when the removal is prevented. This can be used to show a confirmation dialog.

The callback receives a `data` object with the `action` that triggered the removal of the screen. You can dispatch this action again after confirmation, or check the action object to determine what to do.

Example:

```js name="usePreventRemove hook" snack static2dynamic
import * as React from 'react';
import { Alert, View, TextInput, Platform, StyleSheet } from 'react-native';
import {
  useNavigation,
  usePreventRemove,
  createStaticNavigation,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
const EditTextScreen = () => {
  const [text, setText] = React.useState('');
  const navigation = useNavigation('EditText');

  const hasUnsavedChanges = Boolean(text);

  usePreventRemove(hasUnsavedChanges, ({ data }) => {
    if (Platform.OS === 'web') {
      const discard = confirm(
        'You have unsaved changes. Discard them and leave the screen?'
      );

      if (discard) {
        navigation.dispatch(data.action);
      }
    } else {
      Alert.alert(
        'Discard changes?',
        'You have unsaved changes. Discard them and leave the screen?',
        [
          { text: "Don't leave", style: 'cancel', onPress: () => {} },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: () => navigation.dispatch(data.action),
          },
        ]
      );
    }
  });

  return (
    <View style={styles.content}>
      <TextInput
        autoFocus
        style={styles.input}
        value={text}
        placeholder="Type something…"
        onChangeText={setText}
      />
    </View>
  );
};
// codeblock-focus-end

const HomeScreen = () => {
  const navigation = useNavigation('Home');

  return (
    <View style={styles.buttons}>
      <Button onPress={() => navigation.push('EditText')} style={styles.button}>
        Push EditText
      </Button>
    </View>
  );
};

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    EditText: EditTextScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    padding: 16,
  },
  input: {
    margin: 8,
    padding: 10,
    borderRadius: 3,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    backgroundColor: 'white',
  },
  buttons: {
    flex: 1,
    justifyContent: 'center',
    padding: 8,
  },
  button: {
    margin: 8,
  },
});
```

<video playsInline autoPlay muted loop>
  <source src="/assets/behavior/prevent-closing.mp4" />
</video>

Internally, the hook uses the [`beforeRemove`](navigation-events.md#beforeremove) event to prevent the screen from being removed. This event is triggered whenever a screen is being removed due to a navigation action.

## Limitations

There are a couple of limitations to be aware of when using the `usePreventRemove` hook. It is **only** triggered whenever a screen is being removed due to a navigation state change. For example:

- The user pressed the back button on a screen in a stack.
- The user performed a swipe-back gesture.
- Some action such as `pop` or `reset` was dispatched which removes the screen from the state.

It **does not prevent** a screen from being unfocused if it's not being removed. For example:

- The user pushed a new screen on top of the screen with the listener in a stack.
- The user navigated from one tab/drawer screen to another tab/drawer screen.

It also **does not prevent** a screen from being removed when the user is exiting the screen due to actions not controlled by the navigation state:

- The user closes the app (e.g. by pressing the back button on the home screen, closing the tab in the browser, closing it from the app switcher etc.). You can additionally use [`hardwareBackPress`](https://reactnative.dev/docs/backhandler) event on Android, [`beforeunload`](https://developer.mozilla.org/en-US/docs/web/api/window/beforeunload_event) event on the Web etc. to handle some of these cases. See [Prevent the user from leaving the app](preventing-going-back.md#prevent-the-user-from-leaving-the-app) for more details.
- A screen gets unmounted due to conditional rendering, or due to a parent component being unmounted.

## UX considerations

Generally, we recommend using this hook sparingly. A better approach is to persist the unsaved data into [`AsyncStorage`](https://github.com/react-native-async-storage/async-storage) or similar persistent storage and prompt to restore it when the user returns to the screen.

Doing so has several benefits:

- This approach still works if the app is closed or crashes unexpectedly.
- It's less intrusive to the user as they can still navigate away from the screen to check something and return without losing the data.

---

## useRoutePath

Source: https://reactnavigation.org/docs/8.x/use-route-path

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The `useRoutePath` hook can be used to get the path of a route based on the [`linking` configuration](configuring-links.md). This can be useful if you need to generate a URL for a specific route in your app to share as a deep link.

## Example

```js
import { useRoutePath } from '@react-navigation/native';

function MyComponent() {
  const path = useRoutePath();

  // Construct a URL using the path and app's base URL
  const url = new URL(path, 'https://example.com');

  return <Text>Shareable URL: {url.href}</Text>;
}
```

---

## useLinkTo

Source: https://reactnavigation.org/docs/8.x/use-link-to

The `useLinkTo` hook lets us navigate to a screen using a path instead of a screen name based on the [`linking` options](navigation-container.md#linking). It returns a function that receives the path to navigate to.

```js
import { useLinkTo } from '@react-navigation/native';

// ...

function Home() {
  const linkTo = useLinkTo();

  return (
    <Button onPress={() => linkTo('/profile/jane')}>
      Go to Jane's profile
    </Button>
  );
}
```

This is a low-level hook used to build more complex behavior on top. We recommended using the [`useLinkProps` hook](use-link-props.md) to build your custom link components instead of using this hook directly. It will ensure that your component is properly accessible on the web.

:::warning

Navigating via `href` strings is not type-safe. If you want to navigate to a screen with type-safety, it's recommended to use screen names directly.

:::

## Using with class component

You can wrap your class component in a function component to use the hook:

```js
class Home extends React.Component {
  render() {
    // Get it from props
    const { linkTo } = this.props;
  }
}

// Wrap and export
export default function (props) {
  const linkTo = useLinkTo();

  return <Profile {...props} linkTo={linkTo} />;
}
```

---

## useLinkProps

Source: https://reactnavigation.org/docs/8.x/use-link-props

The `useLinkProps` hook lets us build our custom link component. The link component can be used as a button to navigate to a screen. On the web, it will be rendered as an anchor tag (`<a>`) with the `href` attribute so that all the accessibility features of a link are preserved, e.g. - such as `Right click -> Open link in new tab"`, `Ctrl+Click`/`⌘+Click` etc.

It returns an object with some props that you can pass to a component.

Example:

```js
import { useLinkProps } from '@react-navigation/native';

// ...

const LinkButton = ({ screen, params, action, href, children, ...rest }) => {
  const props = useLinkProps({ screen, params, action, href });

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <Pressable {...props} {...rest}>
      <Text>{children}</Text>
    </Pressable>
  );
};
```

Then you can use the `LinkButton` component elsewhere in your app:

```js
function Home() {
  return (
    <LinkButton screen="Profile" params={{ id: 'jane' }}>
      Go to Jane's profile
    </LinkButton>
  );
}
```

## Options

### `screen` and `params`

You can pass `screen` and `params` to navigate to a screen on press:

```js
function Home() {
  return (
    <LinkButton screen="Profile" params={{ id: 'jane' }}>
      Go to Jane's profile
    </LinkButton>
  );
}
```

If you want to navigate to a nested screen, you can pass the name of the `screen` in `params` similar to [navigating to a screen in a nested navigator](nesting-navigators.md#navigating-to-a-screen-in-a-nested-navigator):

```js
<LinkButton screen="Root" params={{ screen: 'Post', params: { id: 123 } }}>
  Go to post 123
</LinkButton>
```

### `action`

Sometimes we want a different behavior for in-page navigation, such as `replace` instead of `navigate`. We can use the `action` prop to customize it:

Example:

```js
import { StackActions } from '@react-navigation/native';

// ...

function Home() {
  return (
    <LinkButton
      screen="Profile"
      params={{ id: 'jane' }}
      action={StackActions.replace('Profile', { id: 'jane' })}
    >
      Go to Jane's profile
    </LinkButton>
  );
}
```

The `screen` and `params` props can be omitted if the `action` prop is specified. In that case, we recommend specifying the `href` prop as well to ensure that the link is accessible.

### `href`

The `href` is used for the `href` attribute of the anchor tag on the Web to make the links accessible. By default, this is automatically determined based on the [`linking` options](navigation-container.md#linking) using the `screen` and `params` props.

If you want to use a custom `href`, you can pass it as the `href` prop:

```js
function Home() {
  return (
    <LinkButton
      action={StackActions.replace('Profile', { id: 'jane' })}
      href="/users/jane"
    >
      Getting Started
    </LinkButton>
  );
}
```

---

## useLinkBuilder

Source: https://reactnavigation.org/docs/8.x/use-link-builder

The `useLinkBuilder` hook returns helpers to build `href` or action based on the [`linking` configuration](configuring-links.md). It returns an object with the following properties:

- [`buildHref`](#buildhref)
- [`buildAction`](#buildaction)

## `buildHref`

The `buildHref` method lets us build a path to use for links for a screen in the current navigator's state. It returns a function that takes `name` and `params` for the screen to focus and returns path based on the [`linking` configuration](configuring-links.md).

```js
import { useLinkBuilder } from '@react-navigation/native';
import { PlatformPressable } from '@react-navigation/elements';

// ...

function DrawerContent({ state, descriptors, navigation }) {
  const { buildHref } = useLinkBuilder();

  return state.routes((route) => (
    <PlatformPressable
      href={buildHref(route.name, route.params)}
      onPress={() => navigation.navigate(route.name, route.params)}
    >
      {descriptors[route.key].options.title}
    </PlatformPressable>
  ));
}
```

This hook is intended to be used in navigators to show links to various pages in the navigator, such as drawer and tab navigators. If you're building a custom navigator, custom drawer content, custom tab bar etc. then you might want to use this hook.

There are couple of important things to note:

- The destination screen must be present in the current navigator. It cannot be in a parent navigator or a navigator nested in a child.
- It's intended to be only used in custom navigators to keep them reusable in multiple apps. For your regular app code, use screen names directly instead of building paths for screens.

## `buildAction`

The `buildAction` method lets us parse a `href` string into an action object that can be used with [`navigation.dispatch`](navigation-object.md#dispatch) to navigate to the relevant screen.

```js
import { Link, CommonActions, useLinkBuilder } from '@react-navigation/native';
import { Button } from '@react-navigation/elements';

// ...

function MyComponent() {
  const { buildAction } = useLinkBuilder();

  return (
    <Button onPress={() => navigation.dispatch(buildAction('/users/jane'))}>
      Go to Jane's profile
    </Button>
  );
}
```

The [`useLinkTo`](use-link-to.md) hook is a convenient wrapper around this hook to navigate to a screen using a `href` string.

---

## useScrollToTop

Source: https://reactnavigation.org/docs/8.x/use-scroll-to-top

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The expected native behavior of scrollable components is to respond to events from navigation that will scroll to top when tapping on the active tab as you would expect from native tab bars.

In order to achieve it we export `useScrollToTop` which accept ref to scrollable component (e,g. `ScrollView` or `FlatList`).

Example:

```js name="useScrollToTop hook" snack static2dynamic
import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStaticNavigation } from '@react-navigation/native';
import { View, Image } from 'react-native';
// codeblock-focus-start
import { ScrollView } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';

function Albums() {
  const ref = React.useRef(null);

  // highlight-next-line
  useScrollToTop(ref);

  return (
    <ScrollView ref={ref}>
      {/* content */}
      // codeblock-focus-end
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="1"
      />
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="2"
      />
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="3"
      />
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="4"
      />
      // codeblock-focus-start
    </ScrollView>
  );
}
// codeblock-focus-end

function HomeScreen() {
  return <View />;
}

const MyTabs = createBottomTabNavigator({
  screens: {
    Home: HomeScreen,
    Albums: Albums,
  },
});

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

## Using with class component

You can wrap your class component in a function component to use the hook:

```js
class Albums extends React.Component {
  render() {
    return <ScrollView ref={this.props.scrollRef}>{/* content */}</ScrollView>;
  }
}

// Wrap and export
export default function (props) {
  const ref = React.useRef(null);

  useScrollToTop(ref);

  return <Albums {...props} scrollRef={ref} />;
}
```

## Providing scroll offset

If you require offset to scroll position you can wrap and decorate passed reference:

```js name="useScrollToTop hook - providing scroll offset" snack static2dynamic
import * as React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Image } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';

// codeblock-focus-start
import { ScrollView } from 'react-native';
import { useScrollToTop } from '@react-navigation/native';

function Albums() {
  const ref = React.useRef(null);

  useScrollToTop(
    React.useRef({
      scrollToTop: () => ref.current?.scrollTo({ y: 100 }),
    })
  );

  return (
    <ScrollView ref={ref}>
      {/* content */}
      // codeblock-focus-end
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="1"
      />
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="2"
      />
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="3"
      />
      <Image
        source={{ uri: 'https://facebook.github.io/react/logo-og.png' }}
        style={{ width: 400, height: 400 }}
        key="4"
      />
      // codeblock-focus-start
    </ScrollView>
  );
}
// codeblock-focus-end

function HomeScreen() {
  return <View />;
}

const MyTab = createBottomTabNavigator({
  screens: {
    Home: HomeScreen,
    Albums: Albums,
  },
});

const Navigation = createStaticNavigation(MyTab);

export default function App() {
  return <Navigation />;
}
```

---

## useTheme

Source: https://reactnavigation.org/docs/8.x/use-theme

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The `useTheme` hook lets us access the currently active theme. You can use it in your own components to have them respond to changes in the theme.

```js name="useTheme hook" snack static2dynamic
import * as React from 'react';
import {
  useNavigation,
  createStaticNavigation,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { useTheme } from '@react-navigation/native';

// codeblock-focus-end

function SettingsScreen({ route }) {
  const navigation = useNavigation('Settings');
  const { user } = route.params;
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text }}>Settings Screen</Text>
      <Text style={{ color: colors.text }}>
        userParam: {JSON.stringify(user)}
      </Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text }}>Profile Screen</Text>
    </View>
  );
}

// codeblock-focus-start
function MyButton() {
  // highlight-next-line
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={{ backgroundColor: colors.card }}>
      <Text style={{ color: colors.text }}>Button!</Text>
    </TouchableOpacity>
  );
}
// codeblock-focus-end

function HomeScreen() {
  const navigation = useNavigation('Home');
  const { colors } = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text }}>Home Screen</Text>
      <MyButton />
      <Button
        onPress={() =>
          navigation.navigate('Root', {
            screen: 'Settings',
            params: { user: 'jane' },
          })
        }
      >
        Go to Settings
      </Button>
    </View>
  );
}

const PanelStack = createNativeStackNavigator({
  screens: {
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
});

const MyDrawer = createDrawerNavigator({
  initialRouteName: 'Panel',
  screens: {
    Home: HomeScreen,
    Panel: {
      screen: PanelStack,
      options: {
        headerShown: false,
      },
    },
  },
});

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  const scheme = useColorScheme();
  return <Navigation theme={scheme === 'dark' ? DarkTheme : DefaultTheme} />;
}
```

See [theming guide](themes.md) for more details and usage guide around how to configure themes.

## Using with class component

You can wrap your class component in a function component to use the hook:

```js
class MyButton extends React.Component {
  render() {
    // Get it from props
    const { theme } = this.props;
  }
}

// Wrap and export
export default function (props) {
  const theme = useTheme();

  return <MyButton {...props} theme={theme} />;
}
```

---

## CommonActions reference

Source: https://reactnavigation.org/docs/8.x/navigation-actions

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

A navigation action is an object containing at least a `type` property. Internally, the action can be handled by [routers](custom-routers.md) with the `getStateForAction` method to return a new state from an existing [navigation state](navigation-state.md).

Each navigation actions can contain at least the following properties:

- `type` (required) - A string that represents the name of the action.
- `payload` (options) - An object containing additional information about the action. For example, it will contain `name` and `params` for `navigate`.
- `source` (optional) - The key of the route which should be considered as the source of the action. This is used for some actions to determine which route to apply the action on. By default, `navigation.dispatch` adds the key of the route that dispatched the action.
- `target` (optional) - The key of the [navigation state](navigation-state.md) the action should be applied on.

It's important to highlight that dispatching a navigation action doesn't throw any error when the action is unhandled (similar to when you dispatch an action that isn't handled by a reducer in redux and nothing happens).

## Common actions

The library exports several action creators under the `CommonActions` namespace. You should use these action creators instead of writing action objects manually.

### navigate

The `navigate` action allows to navigate to a specific route. It takes the following arguments:

- `name` - _string_ - A destination name of the screen in the current or a parent navigator.
- `params` - _object_ - Params to use for the destination route.
- `options` - Options object containing the following properties:
  - `merge` - _boolean_ - Whether params should be merged with the existing route params, or replace them (when navigating to an existing screen). Defaults to `false`.
  - `pop` - _boolean_ - Whether screens should be popped to navigate to a matching screen in the stack. Defaults to `false`.

```js name="Common actions navigate" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          // codeblock-focus-start
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
          // codeblock-focus-end
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

In a stack navigator ([stack](stack-navigator.md) or [native stack](native-stack-navigator.md)), calling `navigate` with a screen name will have the following behavior:

- If you're already on a screen with the same name, it will update its params and not push a new screen.
- If you're on a different screen, it will push the new screen onto the stack.
- If the [`getId`](screen.md#id) prop is specified, and another screen in the stack has the same ID, it will bring that screen to focus and update its params instead.

<details>
<summary>Advanced usage</summary>

The `navigate` action can also accepts an object as the argument with the following properties:

- `name` - _string_ - A destination name of the screen in the current or a parent navigator
- `params` - _object_ - Params to use for the destination route.
- `merge` - _boolean_ - Whether params should be merged with the existing route params, or replace them (when navigating to an existing screen). Defaults to `false`.
- `pop` - _boolean_ - Whether screens should be popped to navigate to a matching screen in the stack. Defaults to `false`.
- `path` - _string_ - The path (from deep link or universal link) to associate with the screen.

This is primarily used internally to associate a path with a screen when it's from a URL.

</details>

### reset

The `reset` action allows to reset the [navigation state](navigation-state.md) to the given state. It takes the following arguments:

- `state` - _object_ - The new [navigation state](navigation-state.md) object to use.

```js name="Common actions reset" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(
            CommonActions.reset({
              index: 1,
              routes: [
                {
                  name: 'Profile',
                  params: { user: 'jane', key: route.params.key },
                },
                { name: 'Home' },
              ],
            })
          );
          // codeblock-focus-end
        }}
      >
        Reset navigation state
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

The state object specified in `reset` replaces the existing [navigation state](navigation-state.md) with the new one. This means that if you provide new route objects without a key, or route objects with a different key, it'll remove the existing screens for those routes and add new screens.

If you want to preserve the existing screens but only want to modify the state, you can pass a function to `dispatch` where you can get the existing state. Then you can change it as you like (make sure not to mutate the existing state, but create new state object for your changes). and return a `reset` action with the desired state:

```js
import { CommonActions } from '@react-navigation/native';

navigation.dispatch((state) => {
  // Remove all the screens after `Profile`
  const index = state.routes.findIndex((r) => r.name === 'Profile');
  const routes = state.routes.slice(0, index + 1);

  return CommonActions.reset({
    ...state,
    routes,
    index: routes.length - 1,
  });
});
```

:::warning

Consider the navigator's state object to be internal and subject to change in a minor release. Avoid using properties from the [navigation state](navigation-state.md) state object except `index` and `routes`, unless you really need it. If there is some functionality you cannot achieve without relying on the structure of the state object, please open an issue.

:::

#### Rewriting the history with `reset`

Since the `reset` action can update the navigation state with a new state object, it can be used to rewrite the navigation history. However, rewriting the history to alter the back stack is not recommended in most cases:

- It can lead to a confusing user experience, as users expect to be able to go back to the screen they were on before.
- When supporting the Web platform, the browser's history will still reflect the old navigation state, so users will see the old screen if they use the browser's back button - resulting in 2 different experiences depending on which back button the user presses.

So if you have such a use case, consider a different approach - e.g. updating the history once the user navigates back to the screen that has changed.

### goBack

The `goBack` action creator allows to go back to the previous route in history. It doesn't take any arguments.

```js name="Common actions goBack" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(CommonActions.goBack());
          // codeblock-focus-end
        }}
      >
        Go back
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

If you want to go back from a particular route, you can add a `source` property referring to the route key and a `target` property referring to the `key` of the navigator which contains the route:

```js name="Common actions goBack" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch({
            ...CommonActions.goBack(),
            source: route.key,
            target: navigation.getState().key,
          });
          // codeblock-focus-end
        }}
      >
        Go back
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

By default, the key of the route that dispatched the action is passed as the `source` property and the `target` property is `undefined`.

### preload

The `preload` action allows preloading a screen in the background before navigating to it. It takes the following arguments:

- `name` - _string_ - A destination name of the screen in the current or a parent navigator.
- `params` - _object_ - Params to use for the destination route.

```js name="Common actions preload" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation();

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
          // codeblock-focus-start
          navigation.dispatch(
            CommonActions.preload('Profile', { user: 'jane' })
          );
          // codeblock-focus-end
        }}
      >
        Preload Profile
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

Preloading a screen means that the screen will be rendered in the background. All the components in the screen will be mounted and the `useEffect` hooks will be called. This can be useful when you want to improve the perceived performance by hiding the delay in mounting heavy components or loading data.

Depending on the navigator, `preload` may work differently:

- In a stack navigator ([stack](stack-navigator.md), [native stack](native-stack-navigator.md)), the screen will be rendered off-screen and animated in when you navigate to it. If [`getId`](screen.md#id) is specified, it'll be used for the navigation to identify the preloaded screen.
- In a tab or drawer navigator ([bottom tabs](bottom-tab-navigator.md), [material top tabs](material-top-tab-navigator.md), [drawer](drawer-navigator.md), etc.), the existing screen will be rendered as if `lazy` was set to `false`. Calling `preload` on a screen that is already rendered will not have any effect.

When a screen is preloaded in a stack navigator, it can't dispatch navigation actions (e.g. `navigate`, `goBack`, etc.) until it becomes active.

### setParams

The `setParams` action allows to replace params for a certain route. It takes the following arguments:

- `params` - _object_ - required - New params to be merged into existing route params.

```js name="Common actions setParams" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(CommonActions.setParams({ user: 'Wojtek' }));
          // codeblock-focus-end
        }}
      >
        Set user param
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

If you want to replace params for a particular route, you can add a `source` property referring to the route key:

```js name="Common actions setParams" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch({
            ...CommonActions.setParams({ user: 'Wojtek' }),
            source: route.key,
          });
          // codeblock-focus-end
        }}
      >
        Set user param
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

If the `source` property is explicitly set to `undefined`, it'll replace the params for the focused route.

### replaceParams

The `replaceParams` action allows to replace params for a certain route. It takes the following arguments:

- `params` - _object_ - required - New params to use for the route.

```js name="Common actions replaceParams" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(CommonActions.replaceParams({ user: 'Wojtek' }));
          // codeblock-focus-end
        }}
      >
        Replace params with user
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

If you want to replace params for a particular route, you can add a `source` property referring to the route key:

```js name="Common actions replaceParams" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();

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
          navigation.dispatch(
            CommonActions.navigate('Profile', { user: 'jane' })
          );
        }}
      >
        Navigate to Profile
      </Button>
      <Button onPress={() => navigation.dispatch(CommonActions.goBack())}>
        Go back
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
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
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch({
            ...CommonActions.replaceParams({ user: 'Wojtek' }),
            source: route.key,
          });
          // codeblock-focus-end
        }}
      >
        Replace params with user
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

If the `source` property is explicitly set to `undefined`, it'll replace the params for the focused route.

### pushParams

The `pushParams` action allows to add a new entry to the history stack with new params. It takes the following arguments:

- `params` - _object_ - required - New params to use for the route.

```js name="Common actions pushParams" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

function ProductListScreen({ route }) {
  const navigation = useNavigation();
  const filter = route.params?.filter || 'all';

  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Product List</Text>
      <Text>Filter: {filter}</Text>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(CommonActions.pushParams({ filter: 'popular' }));
          // codeblock-focus-end
        }}
      >
        Show popular
      </Button>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(CommonActions.pushParams({ filter: 'new' }));
          // codeblock-focus-end
        }}
      >
        Show new
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(CommonActions.goBack());
        }}
      >
        Go back
      </Button>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View
      style={{
        flex: 1,
        gap: 8,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Settings</Text>
    </View>
  );
}

const HomeTabs = createBottomTabNavigator({
  screenOptions: {
    backBehavior: 'history',
  },
  screens: {
    ProductList: ProductListScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(HomeTabs);

export default function App() {
  return <Navigation />;
}
```

Unlike `setParams`, the `pushParams` action does not merge the new params with the existing ones. Instead, it uses the new params object as-is and adds a new entry to the history stack.

The action works in all navigators, such as stack, tab, and drawer. This allows adding a new entry to the history stack without needing to push a new screen instance.

This can be useful in various scenarios:

- A product listing page with filters, where changing filters should create a new history entry so that users can go back to previous filter states.
- A screen with a custom modal component, where the modal is not a separate screen in the navigator, but its state should be reflected in the URL and history.

If you want to push params for a particular route, you can add a `source` property referring to the route key:

```js
navigation.dispatch({
  ...CommonActions.pushParams({ filter: 'popular' }),
  source: route.key,
});
```

If the `source` property is explicitly set to `undefined`, it'll push params for the focused route.

---

## StackActions reference

Source: https://reactnavigation.org/docs/8.x/stack-actions

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

`StackActions` is an object containing methods for generating actions specific to stack-based navigators. Its methods expand upon the actions available in [`CommonActions`](navigation-actions.md).

The following actions are supported:

## replace

The `replace` action allows to replace a route in the [navigation state](navigation-state.md). It takes the following arguments:

- `name` - _string_ - A destination name of the route that has been registered somewhere.
- `params` - _object_ - Params to pass to the destination route.

```js name="Stack actions replace" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push Profile on the stack
      </Button>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(
            StackActions.replace('Profile', { user: 'Wojtek' })
          );
          // codeblock-focus-end
        }}
      >
        Replace with Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile!</Text>
      <Text>{route.params.user}'s profile</Text>
      <Button onPress={() => navigation.dispatch(StackActions.pop(1))}>
        Pop one screen from stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push same screen on the stack
      </Button>
      <Button onPress={() => navigation.dispatch(StackActions.popToTop())}>
        Pop to top
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

If you want to replace a particular route, you can add a `source` property referring to the route key and `target` property referring to the navigation state key:

```js
import { StackActions } from '@react-navigation/native';

navigation.dispatch({
  ...StackActions.replace('Profile', {
    user: 'jane',
  }),
  source: route.key,
  target: navigation.getState().key,
});
```

If the `source` property is explicitly set to `undefined`, it'll replace the focused route.

## push

The `push` action adds a route on top of the stack and navigates forward to it. This differs from `navigate` in that `navigate` will pop back to earlier in the stack if a route of the given name is already present there. `push` will always add on top, so a route can be present multiple times.

- `name` - _string_ - Name of the route to push onto the stack.
- `params` - _object_ - Screen params to pass to the destination route.

```js name="Stack actions push" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
          // codeblock-focus-end
        }}
      >
        Push Profile on the stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(
            StackActions.replace('Profile', { user: 'Wojtek' })
          );
        }}
      >
        Replace with Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile!</Text>
      <Text>{route.params.user}'s profile</Text>
      <Button onPress={() => navigation.dispatch(StackActions.pop(1))}>
        Pop one screen from stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push same screen on the stack
      </Button>
      <Button onPress={() => navigation.dispatch(StackActions.popToTop())}>
        Pop to top
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

## pop

The `pop` action takes you back to a previous screen in the stack. It takes one optional argument (`count`), which allows you to specify how many screens to pop back by.

```js name="Stack actions pop" snack static2dynamic
import * as React from 'react';
import { Button } from '@react-navigation/elements';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push Profile on the stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(
            StackActions.replace('Profile', { user: 'Wojtek' })
          );
        }}
      >
        Replace with Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile!</Text>
      <Text>{route.params.user}'s profile</Text>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(StackActions.pop(1));
          // codeblock-focus-end
        }}
      >
        Pop one screen from stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push same screen on the stack
      </Button>
      <Button onPress={() => navigation.dispatch(StackActions.popToTop())}>
        Pop to top
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

## popTo

The `popTo` action takes you back to a previous screen in the stack by the name. It also allows you to pass params to the route.

If a matching screen is not found in the stack, this will pop the current screen and add a new screen with the specified name and params - essentially behaving like a [`replace`](#replace). This ensures that the app doesn't break if a previous screen with the name did not exist - which can happen when the screen was opened from a deep link or push notification, or when used on the web etc.

The method accepts the following arguments:

- `name` - _string_ - Name of the route to navigate to.
- `params` - _object_ - Screen params to pass to the destination route.
- `options` - Options object containing the following properties:
  - `merge` - _boolean_ - Whether params should be merged with the existing route params, or replace them (when navigating to an existing screen). Defaults to `false`.

```js name="Stack actions popTo" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push Profile on the stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Settings'));
        }}
      >
        Push Settings on the stack
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile!</Text>
      <Text>{route?.params?.user || 'Guest'}'s profile</Text>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Settings'));
        }}
      >
        Push Settings on the stack
      </Button>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(StackActions.popTo('Profile', { user: 'jane' }));
          // codeblock-focus-end
        }}
      >
        Pop to Profile with params
      </Button>
    </View>
  );
}

function SettingsScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings!</Text>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push Profile on the stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.popTo('Profile', { user: 'jane' }));
        }}
      >
        Pop to Profile with params
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

## popToTop

The `popToTop` action takes you back to the first screen in the stack, dismissing all the others. It's functionally identical to `StackActions.pop({n: currentIndex})`.

```js name="Stack actions popToTop" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  StackActions,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';

function HomeScreen() {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push Profile on the stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(
            StackActions.replace('Profile', { user: 'Wojtek' })
          );
        }}
      >
        Replace with Profile
      </Button>
    </View>
  );
}

function ProfileScreen({ route }) {
  const navigation = useNavigation();
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile!</Text>
      <Text>{route.params.user}'s profile</Text>
      <Button onPress={() => navigation.dispatch(StackActions.pop(1))}>
        Pop one screen from stack
      </Button>
      <Button
        onPress={() => {
          navigation.dispatch(StackActions.push('Profile', { user: 'Wojtek' }));
        }}
      >
        Push same screen on the stack
      </Button>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(StackActions.popToTop());
          // codeblock-focus-end
        }}
      >
        Pop to top
      </Button>
    </View>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

---

## DrawerActions reference

Source: https://reactnavigation.org/docs/8.x/drawer-actions

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

`DrawerActions` is an object containing methods for generating actions specific to drawer-based navigators. Its methods expand upon the actions available in [CommonActions](navigation-actions.md).

The following actions are supported:

## openDrawer

The `openDrawer` action can be used to open the drawer pane.

```js name="Drawer Actions - openDrawer" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';

function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(DrawerActions.openDrawer());
          // codeblock-focus-end
        }}
      >
        Open Drawer
      </Button>
    </View>
  );
}

const MyDrawer = createDrawerNavigator({
  screens: {
    Home: HomeScreen,
  },
});

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  return <Navigation />;
}
```

## closeDrawer

The `closeDrawer` action can be used to close the drawer pane.

```js name="Drawer Actions - closeDrawer" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  DrawerActions,
} from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from '@react-navigation/drawer';

function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button onPress={() => navigation.dispatch(DrawerActions.openDrawer())}>
        Open Drawer
      </Button>
    </View>
  );
}

function CustomDrawerContent(props) {
  const { navigation } = props;

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Close drawer"
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(DrawerActions.closeDrawer());
          // codeblock-focus-end
        }}
      />
    </DrawerContentScrollView>
  );
}

const MyDrawer = createDrawerNavigator({
  drawerContent: (props) => <CustomDrawerContent {...props} />,
  screens: {
    Home: HomeScreen,
  },
});

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  return <Navigation />;
}
```

## toggleDrawer

The `toggleDrawer` action can be used to toggle the drawer pane.

```js name="Drawer Actions - toggleDrawer" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { Button } from '@react-navigation/elements';
import {
  createStaticNavigation,
  useNavigation,
  DrawerActions,
} from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from '@react-navigation/drawer';

function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home!</Text>
      <Button onPress={() => navigation.dispatch(DrawerActions.toggleDrawer())}>
        Toggle Drawer
      </Button>
    </View>
  );
}

function CustomDrawerContent(props) {
  const { navigation } = props;

  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Toggle drawer"
        onPress={() => {
          // codeblock-focus-start
          navigation.dispatch(DrawerActions.toggleDrawer());
          // codeblock-focus-end
        }}
      />
    </DrawerContentScrollView>
  );
}

const MyDrawer = createDrawerNavigator({
  drawerContent: (props) => <CustomDrawerContent {...props} />,
  screens: {
    Home: HomeScreen,
  },
});

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  return <Navigation />;
}
```

