# React Navigation 8.x Documentation

## Getting started

Source: https://reactnavigation.org/docs/8.x/getting-started

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

The _Fundamentals_ section covers the most important aspects of React Navigation. It should be enough to build a typical mobile application and give you the background to dive deeper into the more advanced topics.

<details>
<summary>Prior knowledge</summary>

If you're already familiar with JavaScript, React and React Native, you'll be able to get moving with React Navigation quickly! If not, we recommend gaining some basic knowledge first, then coming back here when you're done.

1. [React Documentation](https://react.dev/learn)
2. [React Native Documentation](https://reactnative.dev/docs/getting-started)

</details>

<details>
<summary>Minimum requirements</summary>

- `react-native` >= 0.81
- `expo` >= 54 ([development build](https://docs.expo.dev/development/introduction/) is required)
- `typescript` >= 5.9.2 (if you use TypeScript)
- `react-native-web` >= 0.21.0 (if you support Web)

</details>

## Installation

The `@react-navigation/native` package contains the core functionality of React Navigation.

In your project directory, run:

```bash npm2yarn
npm install @react-navigation/native@next
```

### Installing dependencies

Next, install the dependencies used by most navigators: [`react-native-screens`](https://github.com/software-mansion/react-native-screens) and [`react-native-safe-area-context`](https://github.com/th3rdwave/react-native-safe-area-context).

<Tabs groupId='framework' queryString="framework">
<TabItem value='expo' label='Expo' default>

In your project directory, run:

```bash
npx expo install react-native-screens react-native-safe-area-context @callstack/liquid-glass
```

This will install versions of these libraries that are compatible with your Expo SDK version.

</TabItem>
<TabItem value='community-cli' label='Community CLI'>

In your project directory, run:

```bash npm2yarn
npm install react-native-screens react-native-safe-area-context @callstack/liquid-glass
```

If you're on a Mac and developing for iOS, install the pods via [Cocoapods](https://cocoapods.org/) to complete the linking:

```bash
npx pod-install ios
```

#### Configuring `react-native-screens` on Android

[`react-native-screens`](https://github.com/software-mansion/react-native-screens) requires one additional configuration to properly work on Android.

Edit `MainActivity.kt` or `MainActivity.java` under `android/app/src/main/java/<your package name>/` and add the highlighted code:

<Tabs>
<TabItem value='kotlin' label='Kotlin' default>

```kotlin
// highlight-start
import android.os.Bundle
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory
// highlight-end

// ...

class MainActivity: ReactActivity() {
  // ...

  // highlight-start
  override fun onCreate(savedInstanceState: Bundle?) {
    supportFragmentManager.fragmentFactory = RNScreensFragmentFactory()
    super.onCreate(savedInstanceState)
  }
  // highlight-end

  // ...
}
```

</TabItem>
<TabItem value='java' label='Java'>

```java
// highlight-start
import android.os.Bundle;
import com.swmansion.rnscreens.fragment.restoration.RNScreensFragmentFactory;
// highlight-end

// ...

public class MainActivity extends ReactActivity {
  // ...

  // highlight-start
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    getSupportFragmentManager().setFragmentFactory(new RNScreensFragmentFactory());
    super.onCreate(savedInstanceState);
  }
  // highlight-end

  // ...
}
```

</TabItem>
</Tabs>

This avoids crashes related to View state not being persisted across Activity restarts.

#### Opting-out of predictive back on Android

React Navigation doesn't yet support Android's predictive back gesture, so you need to disable it for the system back gesture to work properly.

In `AndroidManifest.xml`, set `android:enableOnBackInvokedCallback` to `false` in the `<application>` tag (or `<activity>` tag to opt-out at activity level):

```xml
<application
  // highlight-next-line
  android:enableOnBackInvokedCallback="false"
  >
  <!-- ... -->
</application>
```

</TabItem>
</Tabs>

## Setting up React Navigation

When using React Navigation, you configure [**navigators**](glossary-of-terms.md#navigator) in your app. Navigators handle transitions between screens and provide UI such as headers, tab bars, etc.

:::info

When you use a navigator (such as stack navigator), you'll need to follow that navigator's installation instructions for any additional dependencies.

:::

There are 2 ways to configure navigators:

### Static configuration

The static configuration API lets you write your navigation configuration in an object. This reduces boilerplate and simplifies TypeScript types and deep linking. Some aspects can still be changed dynamically.

This is the **recommended way** to set up your app. If you need more flexibility later, you can mix and match with the dynamic configuration.

Continue to ["Hello React Navigation"](hello-react-navigation.md?config=static) to start writing some code with the static API.

### Dynamic configuration

The dynamic configuration API lets you write your navigation configuration using React components that can change at runtime based on state or props. This offers more flexibility but requires significantly more boilerplate for TypeScript types, deep linking, etc.

Continue to ["Hello React Navigation"](hello-react-navigation.md?config=dynamic) to start writing some code with the dynamic API.

---

## Hello React Navigation

Source: https://reactnavigation.org/docs/8.x/hello-react-navigation

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

In a web browser, clicking a link pushes a page onto the browser's history stack, and pressing the back button pops the page from the stack, making the previous page active again. React Native doesn't have a built-in history like a web browser - this is where React Navigation comes in.

The native stack navigator keeps track of visited screens in a history stack. It also provides UI elements such as headers, native gestures, and animations to transition between screens etc. that you'd expect in a mobile app.

## Installing the native stack navigator library

Each navigator in React Navigation lives in its own library.

To use the native stack navigator, we need to install [`@react-navigation/native-stack`](https://github.com/react-navigation/react-navigation/tree/main/packages/native-stack):

```bash npm2yarn
npm install @react-navigation/native-stack@next
```

:::info

`@react-navigation/native-stack` depends on `react-native-screens` and the other libraries that we installed in [Getting started](getting-started.md). If you haven't installed those yet, head over to that page and follow the installation instructions.

:::

## Installing the elements library

The [`@react-navigation/elements`](elements.md) library provides components designed to work with React Navigation. In this guide, we'll use components like [`Button`](elements.md#button) from the elements library:

```bash npm2yarn
npm install @react-navigation/elements
```

## Creating a native stack navigator

We can create a native stack navigator by using the `createNativeStackNavigator` function:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Native Stack Example" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

`createNativeStackNavigator` takes a configuration object containing the screens to include, as well as various other options.

`createNativeStackScreen` takes a configuration object for a screen, where the `screen` property is the component to render (or a nested navigator, which we'll cover later).

`createStaticNavigation` takes the navigator and returns a component to render in the app. It should only be called once, typically at the root of your app (e.g., in `App.tsx`):

:::warning

In a typical React Native app, the `createStaticNavigation` function should be only used once in your app at the root.

:::

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Native Stack Example" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

const Stack = createNativeStackNavigator();

function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
```

`createNativeStackNavigator` returns an object with `Screen` and `Navigator` components. The `Navigator` should render `Screen` elements as children to define routes.

`NavigationContainer` manages the navigation tree and holds the [navigation state](navigation-state.md). It must wrap all navigators and should be rendered at the root of your app (e.g., in `App.tsx`):

:::warning

In a typical React Native app, the `NavigationContainer` should be only used once in your app at the root. You shouldn't nest multiple `NavigationContainer`s unless you have a specific use case for them.

:::

</TabItem>
</Tabs>

![Basic app using stack navigator](/assets/navigators/stack/basic_stack_nav.png)

If you run this code, you will see a screen with an empty navigation bar and a grey content area containing your `HomeScreen` component (shown above). These are the default styles for a stack navigator - we'll learn how to customize them later.

:::tip

The casing of the route name doesn't matter -- you can use lowercase `home` or capitalized `Home`, it's up to you. We prefer capitalizing our route names.

:::

## Configuring the navigator

We haven't passed any configuration to the navigator yet, so it just uses the default configuration.

Let's add a second screen and configure `Home` as the initial route:

```js name="Native Stack Example" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const RootStack = createNativeStackNavigator({
  // highlight-next-line
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

Now our stack has two _routes_: `Home` and `Details`. Routes are defined under the `screens` property - the property name is the route name, and the value is the component to render.

Here, the initial route is set to `Home`. Try changing `initialRouteName` to `Details` and reload the app (Fast Refresh won't pick up this change) to see the Details screen first.

## Specifying options

Each screen can specify options such as the header title.

We can specify the `options` property in the screen configuration to set screen-specific options:

```js name="Options for Screen" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      // highlight-start
      options: {
        title: 'Overview',
      },
      // highlight-end
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

To apply the same options to all screens, we can use `screenOptions` on the navigator:

```js name="Common options for Screens" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  // highlight-start
  screenOptions: {
    headerStyle: { backgroundColor: 'tomato' },
  },
  // highlight-end
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      options: {
        title: 'Overview',
      },
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

## Passing additional props

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

Passing additional props to a screen is not supported in the static API.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

We can pass additional props to a screen with 2 approaches:

1. [React context](https://react.dev/reference/react/useContext) and wrap the navigator with a context provider to pass data to the screens (recommended).
2. Render callback for the screen instead of specifying a `component` prop:

   ```js
   <Stack.Screen name="Home">
     // highlight-next-line
     {(props) => <HomeScreen {...props} extraData={someData} />}
   </Stack.Screen>
   ```

   :::warning

   React Navigation applies optimizations to screen components to prevent unnecessary renders. Using a render callback removes those optimizations, so you'll need to use [`React.memo`](https://react.dev/reference/react/memo) or [`React.PureComponent`](https://react.dev/reference/react/PureComponent) for your screen components to avoid performance issues.

   :::

</TabItem>
</Tabs>

## Setting up TypeScript

If you're using TypeScript, you need to tell React Navigation about your root navigator by declaring a module augmentation:

```ts
type RootStackType = typeof RootStack;

declare module '@react-navigation/core' {
  interface RootNavigator extends RootStackType {}
}
```

Here, `RootStack` is the root navigator we created earlier using `createNativeStackNavigator`. You can place this code just below the code where you created your root navigator.

Check out the [Type checking with TypeScript](typescript.md) guide for more details.

## What's next?

Now that we have two screens, "How do we navigate from `Home` to `Details`?". That's covered in the [next section](navigating.md).

## Summary

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

- React Native doesn't have a built-in API for navigation like a web browser does. React Navigation provides this for you, along with the iOS and Android gestures and animations to transition between screens.
- [`createNativeStackNavigator`](native-stack-navigator.md) is a function that takes the screens configuration and renders our content.
- Each property under screens refers to the name of the route, and the value is the component to render for the route.
- To specify what the initial route in a stack is, provide an [`initialRouteName`](navigator.md#initial-route-name) option for the navigator.
- To specify screen-specific options, we can specify an [`options`](screen-options.md#options-prop-on-screen) property, and for common options, we can specify [`screenOptions`](screen-options.md#screenoptions-prop-on-the-navigator).

</TabItem>
<TabItem value="dynamic" label="Dynamic">

- React Native doesn't have a built-in API for navigation like a web browser does. React Navigation provides this for you, along with the iOS and Android gestures and animations to transition between screens.
- [`Stack.Navigator`](native-stack-navigator.md) is a component that takes route configuration as its children with additional props for configuration and renders our content.
- Each [`Stack.Screen`](screen.md) component takes a [`name`](screen.md#name) prop which refers to the name of the route and [`component`](screen.md#component) prop which specifies the component to render for the route. These are the 2 required props.
- To specify what the initial route in a stack is, provide an [`initialRouteName`](navigator.md#initial-route-name) as the prop for the navigator.
- To specify screen-specific options, we can pass an [`options`](screen-options.md#options-prop-on-screen) prop to `Stack.Screen`, and for common options, we can pass [`screenOptions`](screen-options.md#screenoptions-prop-on-the-navigator) to `Stack.Navigator`.

</TabItem>
</Tabs>

---

## Moving between screens

Source: https://reactnavigation.org/docs/8.x/navigating

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

In the previous section, we defined a stack navigator with two routes (`Home` and `Details`), but we didn't learn how to let a user navigate from `Home` to `Details`.

If this was a web browser, we'd be able to write something like this:

```js
<a href="details.html">Go to Details</a>
```

Or programmatically in JavaScript:

```js
window.location.href = 'details.html';
```

So how do we do this in React Navigation? There are two main ways to navigate between screens in React Navigation:

## Using `Link` or `Button` components

The simplest way to navigate is using the [`Link`](link.md) component from `@react-navigation/native` or the [`Button`](elements.md#button) component from `@react-navigation/elements`:

```js name="Navigation with Link and Button" snack static2dynamic
// codeblock-focus-start
import * as React from 'react';
import { View, Text } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
// highlight-start
import { Link } from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// highlight-end

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      // highlight-start
      <Link screen="Details">Go to Details</Link>
      <Button screen="Details">Go to Details</Button>
      // highlight-end
    </View>
  );
}

// ... other code from the previous section
// codeblock-focus-end

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

The `Link` and `Button` components accept a `screen` prop specifying where to navigate when pressed. [On the web](web-support.md), they render as anchor tags (`<a>`) with proper `href` attributes.

:::note

The built-in `Link` and `Button` components have their own styling. To create custom link or button components matching your app's design, see the [`useLinkProps`](use-link-props.md) hook.

:::

## Using the `navigation` object

Another way to navigate is by using the `navigation` object. This method gives you more control over when and how navigation happens.

The `navigation` object is available in your screen components through the [`useNavigation`](use-navigation.md) hook:

```js name="Navigating to a new screen" snack static2dynamic
// codeblock-focus-start
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  // highlight-next-line
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  // highlight-next-line
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      // highlight-start
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details
      </Button>
      // highlight-end
    </View>
  );
}

// ... other code from the previous section
// codeblock-focus-end

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/stack/simple-details.mp4" />
</video>

The [`useNavigation`](use-navigation.md) hook takes the current route name as an argument. We can call `navigate` with the route name we want to go to.

:::note

Calling `navigation.navigate` with an incorrect route name shows an error in development and does nothing in production.

:::

## Navigate to a screen multiple times

What happens if we navigate to `Details` again while already on the `Details` screen?

```js name="Navigate to a screen multiple times" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details
      </Button>
    </View>
  );
}

// codeblock-focus-start
function DetailsScreen() {
  const navigation = useNavigation('Details');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
      // highlight-start
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details... again
      </Button>
      // highlight-end
    </View>
  );
}
// codeblock-focus-end

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

Tapping "Go to Details... again" does nothing because we're already on that route. The `navigate` function means "go to this screen" - if you're already there, it does nothing.

Let's say we actually _want_ to add another Details screen. This is common when you pass unique data to each route (more on that when we talk about `params`!). To do this, use `push` instead of `navigate`. This adds another route regardless of the existing navigation history:

```js name="Navigate to a screen multiple times" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details
      </Button>
    </View>
  );
}

function DetailsScreen() {
  const navigation = useNavigation('Details');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
      // codeblock-focus-start
      <Button onPress={() => navigation.push('Details')}>
        Go to Details... again
      </Button>
      // codeblock-focus-end
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/stack/stack-push.mp4" />
</video>

Each `push` call adds a new route to the stack, while `navigate` only pushes if you're not already on that route.

## Going back

The native stack navigator's header automatically shows a back button when there's a screen to go back to.

You can use `navigation.goBack()` to trigger going back programmatically from your own buttons:

```js name="Going back" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details
      </Button>
    </View>
  );
}

// codeblock-focus-start
function DetailsScreen() {
  const navigation = useNavigation('Details');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
      <Button onPress={() => navigation.push('Details')}>
        Go to Details... again
      </Button>
      // highlight-start
      <Button onPress={() => navigation.goBack()}>Go back</Button>
      // highlight-end
    </View>
  );
}
// codeblock-focus-end

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/stack/back-home.mp4" />
</video>

:::note

On Android, React Navigation calls `goBack()` automatically on hardware back button press or back gesture.

:::

Sometimes you need to go back multiple screens at once. For example, if you're several screens deep in a stack and want to go back to the first screen. You have two options:

- `navigation.popTo('Home')` - Go back to a specific screen (in this case, Home)
- `navigation.popToTop()` - Go back to the first screen in the stack

```js name="Going back to specific screen" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details
      </Button>
    </View>
  );
}

// codeblock-focus-start
function DetailsScreen() {
  const navigation = useNavigation('Details');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
      <Button onPress={() => navigation.push('Details')}>
        Go to Details... again
      </Button>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
      // highlight-start
      <Button onPress={() => navigation.popTo('Home')}>Go to Home</Button>
      <Button onPress={() => navigation.popToTop()}>
        Go back to first screen in stack
      </Button>
      // highlight-end
    </View>
  );
}
// codeblock-focus-end

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/stack/pop-to-top.mp4" />
</video>

## Summary

- [`Link`](link.md) and [`Button`](elements.md#button) components can be used to navigate between screens declaratively.
- We can use [`useLinkProps`](use-link-props.md) to create our own link components.
- [`navigation.navigate('RouteName')`](navigation-object.md#navigate) pushes a new route to the native stack navigator if you're not already on that route.
- We can call [`navigation.push('RouteName')`](stack-actions.md#push) as many times as we like and it will continue pushing routes.
- The header bar will automatically show a back button, but you can programmatically go back by calling [`navigation.goBack()`](navigation-object.md#goback). On Android, the hardware back button just works as expected.
- You can go back to an existing screen in the stack with [`navigation.popTo('RouteName')`](stack-actions.md#popto), and you can go back to the first screen in the stack with [`navigation.popToTop()`](stack-actions.md#poptotop).
- The [`navigation`](navigation-object.md) object is available to all screen components with the [`useNavigation`](use-navigation.md) hook.

---

## Passing parameters to routes

Source: https://reactnavigation.org/docs/8.x/params

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Now that we know how to [navigate between routes](navigating.md), let's look at how to pass data to routes when navigating.

## Passing params

Params can be passed to screens as the second argument to navigation methods like [`navigate`](navigation-actions.md#navigate), [`push`](stack-actions.md#push), or [`jumpTo`](tab-actions.md#jumpto):

```js
navigation.navigate('Details', {
  itemId: 86,
  otherParam: 'anything you want here',
});
```

:::note

Params should be JSON-serializable to support [state persistence](state-persistence.md) and [deep linking](deep-linking.md).

:::

## Reading params

Params can be read from the `params` property of the `route` object. There are 2 ways to access the `route` object:

1. Your screen components receive `route` as a prop:

   ```js
   // highlight-next-line
   function DetailsScreen({ route }) {
     // Access params from route.params
     const { itemId, otherParam } = route.params;

     return (
       // ...
     );
   }
   ```

2. You can use the [`useRoute`](use-route.md) hook in any component inside your screen:

   ```js
   import { useRoute } from '@react-navigation/native';

   function SomeComponent() {
     // highlight-next-line
     const route = useRoute('Details');
     const { itemId, otherParam } = route.params;

     return (
       // ...
     );
   }
   ```

   The `useRoute` hook takes the name of the current screen (or any parent screen) as an argument, and returns the route object containing the params for that screen.

In this example, the `HomeScreen` passes params to the `DetailsScreen`. The `DetailsScreen` then reads and displays those params:

```js name="Passing params" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button
        onPress={() => {
          /* 1. Navigate to the Details route with params */
          // highlight-start
          navigation.navigate('Details', {
            itemId: 86,
            otherParam: 'anything you want here',
          });
          // highlight-end
        }}
      >
        Go to Details
      </Button>
    </View>
  );
}

function DetailsScreen({ route }) {
  const navigation = useNavigation('Details');

  /* 2. Get the param */
  // highlight-next-line
  const { itemId, otherParam } = route.params;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
      <Text>itemId: {JSON.stringify(itemId)}</Text>
      <Text>otherParam: {JSON.stringify(otherParam)}</Text>
      <Button
        onPress={
          () =>
            // highlight-start
            navigation.push('Details', {
              // Randomly generate an ID for demonstration purposes
              itemId: Math.floor(Math.random() * 100),
            })
          // highlight-end
        }
      >
        Go to Details... again
      </Button>
      <Button onPress={() => navigation.navigate('Home')}>Go to Home</Button>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}
// codeblock-focus-end

const RootStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/passing-params.mp4" />
</video>

## Initial params

You can specify default params for a screen using `initialParams`. These are used when no params are passed during navigation, and are shallow merged with any params you do pass:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
createNativeStackScreen({
  Details: {
    screen: DetailsScreen,
    // highlight-next-line
    initialParams: { itemId: 42 },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Screen
  name="Details"
  component={DetailsScreen}
  // highlight-next-line
  initialParams={{ itemId: 42 }}
/>
```

</TabItem>
</Tabs>

## Updating params

Screens can also update their params, like they can update their state. There are few ways to do this:

- [`setParams`](navigation-actions.md#setparams) - updates the params by merging new params object with existing params
- [`replaceParams`](navigation-actions.md#replaceparams) - replaces the params with new params object
- [`pushParams`](navigation-actions.md#pushparams) - pushes a new entry in the history stack with the new params object

All of these methods are available on the `navigation` object and they take a params object as their argument.

Example:

```js name="Updating params" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen({ route }) {
  const navigation = useNavigation('Home');
  const { itemId } = route.params;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Text>itemId: {JSON.stringify(itemId)}</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.setParams({
              itemId: Math.floor(Math.random() * 100),
            })
          // codeblock-focus-end
        }
      >
        Update param
      </Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      initialParams: { itemId: 42 },
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

:::note

Avoid using `setParams`, `replaceParams`, or `pushParams` to update screen options such as `title` etc. If you need to update options, use [`setOptions`](navigation-object.md#setoptions) instead.

:::

## Passing params to a previous screen

Params aren't only useful for passing data to a new screen - they can also pass data back to a previous screen. For example, say you have a screen with a "Create post" button that opens a new screen. After creating the post, you want to pass the data back to the previous screen.

To achieve this, you can use the `popTo` method to go back while also passing params:

```js name="Passing params back" snack static2dynamic
import * as React from 'react';
import { Text, View, TextInput } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
function HomeScreen({ route }) {
  const navigation = useNavigation('Home');

  // Use an effect to monitor the update to params
  // highlight-start
  React.useEffect(() => {
    if (route.params?.post) {
      // Post updated, do something with `route.params.post`
      // For example, send the post to the server
      alert('New post: ' + route.params?.post);
    }
  }, [route.params?.post]);
  // highlight-end

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('CreatePost')}>
        Create post
      </Button>
      <Text style={{ margin: 10 }}>Post: {route.params?.post}</Text>
    </View>
  );
}

function CreatePostScreen({ route }) {
  const navigation = useNavigation('CreatePost');
  const [postText, setPostText] = React.useState('');

  return (
    <>
      <TextInput
        multiline
        placeholder="What's on your mind?"
        style={{ height: 200, padding: 10, backgroundColor: 'white' }}
        value={postText}
        onChangeText={setPostText}
      />
      <Button
        onPress={() => {
          // Pass params back to home screen
          // highlight-next-line
          navigation.popTo('Home', { post: postText });
        }}
      >
        Done
      </Button>
    </>
  );
}
// codeblock-focus-end

const RootStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    CreatePost: createNativeStackScreen({
      screen: CreatePostScreen,
    }),
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/params-to-parent.mp4" />
</video>

Here, after you press "Done", the home screen's `route.params` will be updated to reflect the post text that you passed in `navigate`.

## Passing params to a nested screen

If you have nested navigators, you need to pass params a bit differently. For example, say you have a navigator inside the `More` screen and want to pass params to the `Settings` screen inside that navigator. Then you can pass params as the following:

```js name="Passing params to nested screen" snack static2dynamic
import * as React from 'react';
import { Text, View, TextInput } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function SettingsScreen({ route }) {
  const navigation = useNavigation('Settings');
  const { userId } = route.params;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
      <Text>User ID: {JSON.stringify(userId)}</Text>
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
    </View>
  );
}

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.navigate('More', {
              screen: 'Settings',
              params: { userId: 'jane' },
            })
          // codeblock-focus-end
        }
      >
        Go to Settings
      </Button>
    </View>
  );
}

const MoreStack = createNativeStackNavigator({
  screens: {
    Settings: createNativeStackScreen({
      screen: SettingsScreen,
    }),
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
    }),
  },
});

const RootTabs = createBottomTabNavigator({
  screens: {
    Home: createBottomTabScreen({
      screen: HomeScreen,
    }),
    More: createBottomTabScreen({
      screen: MoreStack,
    }),
  },
});

const Navigation = createStaticNavigation(RootTabs);

export default function App() {
  return <Navigation />;
}
```

See [Nesting navigators](nesting-navigators.md) for more details on nesting.

## Reserved param names

Some param names are reserved by React Navigation as part of the API for nested navigators. The list of the reserved param names are as follows:

- `screen`
- `params`
- `initial`
- `state`

Avoid using these param names in your code. Trying to read these params in parent screens is not recommended and will cause unexpected behavior.

## What should be in params

Params serve two main purposes:

- Information required to identify and display data on a screen (e.g. id of an object to be displayed on the screen)
- State specific to a screen (e.g. sort order, filters, page numbers etc. that can also be changed on the screen)

Params should contain only the minimal information needed to show a screen. Think of params like URL query parameters - they identify what to show, not the actual data itself.

Think of visiting a shopping website; when you see product listings, the URL usually contains category name, type of sort, any filters etc., not the actual list of products displayed on the screen.

For example, when navigating to a `Profile` screen, you might be tempted to pass the user object:

```js
// Don't do this
navigation.navigate('Profile', {
  user: {
    id: 'jane',
    firstName: 'Jane',
    lastName: 'Done',
    age: 25,
  },
});
```

This looks convenient - you can access the user with `route.params.user` without any extra work. However, this is an anti-pattern because:

- The same data is duplicated in multiple places, leading to bugs like the profile showing outdated data after the user object changes
- Every screen navigating to `Profile` needs to know how to fetch user data
- URLs/deep links will contain the full object. This is problematic because random or malformed data could be passed in the URL, and the URLs become very long and unreadable

Instead, pass only the ID:

```js
navigation.navigate('Profile', { userId: 'jane' });
```

Then fetch the user data using the ID from a global cache or API. Libraries like [React Query](https://tanstack.com/query/) make this easy.

Some examples of what should be in params are:

- IDs such as user id, item id etc., e.g. `navigation.navigate('Profile', { userId: 'Jane' })`
- State for sorting, filtering data etc. when you have a list of items, e.g. `navigation.navigate('Feeds', { sortBy: 'latest' })`
- Timestamps, page numbers or cursors for pagination, e.g. `navigation.navigate('Chat', { beforeTime: 1603897152675 })`
- Data to fill inputs on a screen to compose something, e.g. `navigation.navigate('ComposeTweet', { title: 'Hello world!' })`

## Summary

- [`navigate`](navigation-actions.md#navigate) and [`push`](stack-actions.md#push) accept an optional second argument to let you pass parameters to the route you are navigating to. For example: `navigation.navigate('RouteName', { paramName: 'value' })`.
- You can read the params through [`route.params`](route-object.md) inside a screen
- You can update the screen's params with [`navigation.setParams`](navigation-object.md#setparams), [`navigation.replaceParams`](navigation-object.md#replaceparams) or [`navigation.pushParams`](navigation-object.md#pushparams)
- Initial params can be passed via the [`initialParams`](screen.md#initial-params) prop on `Screen` or in the navigator config
- State such as sort order, filters etc. should be kept in params so that the state is reflected in the URL and can be shared/bookmarked.
- Params should contain the least amount of data required to identify a screen; for most cases, this means passing the ID of an object instead of passing a full object.
- Don't keep application specific data or cached data in params; instead, use a global store or cache.
- Some [param names are reserved](#reserved-param-names) by React Navigation and should be avoided

---

## Configuring the header bar

Source: https://reactnavigation.org/docs/8.x/headers

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

We've seen how to configure the header title already, but let's go over that again before moving on to some other options.

## Setting the header title

Each screen has an `options` property (an object or function returning an object) for configuring the navigator. For the header title, we can use the `title` option:

```js name="Setting header title" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      // highlight-start
      options: {
        title: 'My home',
      },
      // highlight-end
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

![Header title](/assets/headers/header-title.png)

## Using params in the title

To use params in the title, make `options` a function that returns a configuration object. React Navigation calls this function with `{ navigation, route }` - so you can use `route.params` to access the params:

```js name="Using params in the title" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button
        onPress={() =>
          navigation.navigate('Profile', {
            name: 'Jane',
          })
        }
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
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      options: {
        title: 'My home',
      },
    }),
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
      // highlight-start
      options: ({ route }) => ({
        title: route.params.name,
      }),
      // highlight-end
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

The argument that is passed in to the `options` function is an object with the following properties:

- `navigation` - The [navigation object](navigation-object.md) for the screen.
- `route` - The [route object](route-object.md) for the screen

We only needed the `route` object in the above example but you may in some cases want to use `navigation` as well.

## Updating `options` with `setOptions`

We can update the header from within a screen using `navigation.setOptions`:

```js name="Updating options" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      // codeblock-focus-start
      <Button
        onPress={() =>
          // highlight-next-line
          navigation.setOptions({ title: 'Updated!' })
        }
      >
        Update the title
      </Button>
      // codeblock-focus-end
    </View>
  );
}

const MyStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        title: 'My home',
      },
    },
  },
});

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

## Adjusting header styles

There are three key properties to use when customizing the style of your header:

- `headerStyle`: A style object that will be applied to the view that wraps the header. If you set `backgroundColor` on it, that will be the color of your header.
- `headerTintColor`: The back button and title both use this property as their color. In the example below, we set the tint color to white (`#fff`) so the back button and the header title would be white.
- `headerTitleStyle`: If we want to customize the `fontFamily`, `fontWeight` and other `Text` style properties for the title, we can use this to do it.

```js name="Header styles" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      options: {
        title: 'My home',
        // highlight-start
        headerStyle: {
          backgroundColor: '#f4511e',
        },
        headerTintColor: '#fff',
        headerTitleStyle: {
          fontWeight: 'bold',
        },
        // highlight-end
      },
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

![Custom header styles](/assets/headers/custom_headers.png)

There are a couple of things to notice here:

1. On iOS, the status bar text and icons are black by default, which doesn't look great over a dark background. We won't discuss it here, but see the [status bar guide](status-bar.md) to configure it.
2. The configuration we set only applies to the home screen; when we navigate to the details screen, the default styles are back. We'll look at how to share `options` between screens next.

## Sharing common `options` across screens

Often we want to apply the same options to all screens in a navigator. Instead of repeating the same options for each screen, we can use `screenOptions` on the navigator.

```js name="Common screen options" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details
      </Button>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  // highlight-start
  screenOptions: {
    headerStyle: {
      backgroundColor: '#f4511e',
    },
    headerTintColor: '#fff',
    headerTitleStyle: {
      fontWeight: 'bold',
    },
  },
  // highlight-end
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

All screens in this navigator will now share these styles. Individual screens can still override them in their own `options`.

## Replacing the title with a custom component

Sometimes you need more control than just changing the text and styles of your title -- for example, you may want to render an image in place of the title, or make the title into a button. In these cases, you can completely override the component used for the title and provide your own.

```js name="Custom title" snack static2dynamic
import * as React from 'react';
import { Text, View, Image } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

// codeblock-focus-start
function LogoTitle() {
  return (
    <Image
      style={{ width: 50, height: 50 }}
      source={require('@expo/snack-static/react-native-logo.png')}
    />
  );
}

const MyStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        // highlight-next-line
        headerTitle: (props) => <LogoTitle {...props} />,
      },
    },
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

![Header custom title](/assets/headers/header-custom-title.png)

:::note

`headerTitle` is header-specific, while `title` is also used by tab bars and drawers, or as page title on web. `headerTitle` defaults to displaying the `title` in a `Text` component.

:::

## Additional configuration

See the full list of header options in the [`createNativeStackNavigator` reference](native-stack-navigator.md#options).

## Summary

- Headers can be customized via the [`options`](screen-options.md) property on screens
- The `options` property can be an object or a function that receives the [`navigation`](navigation-object.md) and [`route`](route-object.md) objects
- The [`screenOptions`](screen-options.md#screenoptions-prop-on-the-navigator) property on the navigator can be used to apply shared styles across all screens

---

## Header buttons

Source: https://reactnavigation.org/docs/8.x/header-buttons

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Now that we know how to customize the look of our headers, let's make them interactive!

## Adding a button to the header

The most common way to interact with a header is by tapping a button to the left or right of the title. Let's add a button to the right side of the header:

```js name="Header button" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      options: {
        // highlight-start
        headerRight: () => (
          <Button onPress={() => alert('This is a button!')}>Info</Button>
        ),
        // highlight-end
      },
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

![Header button](/assets/headers/header-button.png)

When we define our button this way, you can't access or update the screen component's state in it. This is pretty important because it's common to want the buttons in your header to interact with the screen that the header belongs to. So, we will look how to do this next.

## Header interaction with its screen component

To make header buttons interact with screen state, we can use [`navigation.setOptions`](navigation-object.md#setoptions) inside the screen component:

```js name="Header button" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
function HomeScreen() {
  const navigation = useNavigation('Home');
  const [count, setCount] = React.useState(0);

  React.useEffect(() => {
    // Use `setOptions` to update the button that we previously specified
    // Now the button includes an `onPress` handler to update the count
    // highlight-start
    navigation.setOptions({
      headerRight: () => (
        <Button onPress={() => setCount((c) => c + 1)}>Update count</Button>
      ),
    });
    // highlight-end
  }, [navigation]);

  return <Text>Count: {count}</Text>;
}

const MyStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
      options: {
        // Add a placeholder button without the `onPress` to avoid flicker
        // highlight-next-line
        headerRight: () => <Button>Update count</Button>,
      },
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop >
  <source src="/assets/headers/header-update-screen.mp4" />
</video>

Here we update `headerRight` with a button that has `onPress` handler that can access and update the component's state, since it's defined inside the component.

## Customizing the back button

The back button is rendered automatically in a stack navigator whenever there another screen to go back to.

The native stack navigator provides platform-specific defaults for this back button. On older iOS versions, this may includes a label next to the button showing the previous screen's title when space allows.

You can customize the back button using various options such as:

- `headerBackTitle`: Change the back button label (iOS)
- `headerBackTitleStyle`: Style the back button label
- `headerBackIcon`: Custom back button icon

```js static2dynamic
const MyStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        headerBackTitle: 'Custom Back',
        headerBackTitleStyle: { fontSize: 30 },
      },
    },
  },
});
```

![Header custom back](/assets/headers/header-back-custom.png)

If you want to customize it beyond what the above options allow, you can use `headerLeft` to render your own component instead. The `headerLeft` option accepts a React Component, which you can use to override the onPress behavior or replace the button entirely. See the [API reference](native-stack-navigator.md#headerleft) for details.

## Summary

- Buttons can be added to the header using [`headerLeft`](elements.md#headerleft) and [`headerRight`](elements.md#headerright) in [`options`](screen-options.md)
- The back button can be customized with [`headerBackTitle`](native-stack-navigator.md#headerbacktitle), [`headerBackTitleStyle`](native-stack-navigator.md#headerbacktitlestyle), [`headerBackIcon`](native-stack-navigator.md#headerbackicon), or replaced entirely with `headerLeft`
- To make header buttons interact with screen state, use [`navigation.setOptions`](navigation-object.md#setoptions) inside the screen component

---

## Nesting navigators

Source: https://reactnavigation.org/docs/8.x/nesting-navigators

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Nesting navigators means rendering a navigator inside a screen of another navigator, for example:

```js name="Nested navigators" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function MessagesScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: createBottomTabScreen({
      screen: FeedScreen,
    }),
    Messages: createBottomTabScreen({
      screen: MessagesScreen,
    }),
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      // highlight-next-line
      screen: HomeTabs,
      options: {
        headerShown: false,
      },
    }),
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

In this example, a tab navigator (`HomeTabs`) is nested inside a stack navigator (`RootStack`) under the `Home` screen. The structure looks like this:

- `RootStack` (Stack navigator)
  - `HomeTabs` (Tab navigator)
    - `Feed` (screen)
    - `Messages` (screen)
  - `Profile` (screen)

Nesting navigators works much like nesting regular components. To achieve the behavior you want, it's often necessary to nest multiple navigators.

## How nesting navigators affects the behaviour

When nesting navigators, there are some things to keep in mind:

### Each navigator keeps its own navigation history

Lets say you have a stack navigator (lets call it `StackA`) nested within another navigator (lets call it `NavigatorB`). When you press the back button in a screen inside `StackA`, it will go to the previous screen of the closest ancestor navigator of the screen - i.e. `StackA`.

If the current screen is the first screen in `StackA`, then pressing back will go to the previous screen in `NavigatorB`.

### Each navigator has its own options

Specifying a `title` option in a screen nested in a child navigator won't affect the title shown in a parent navigator.

If you want to achieve this behavior, see the guide for [screen options with nested navigators](screen-options-resolution.md#setting-parent-screen-options-based-on-child-navigators-state). this could be useful if you are rendering a tab navigator inside a stack navigator and want to show the title of the active screen inside the tab navigator in the header of the stack navigator.

### Each screen in a navigator has its own params

Any `params` passed to a screen in a nested navigator are in the `route` object of that screen and aren't accessible from a screen in a parent or child navigator.

If you need to access params of the parent screen from a child screen, you can pass the name of the screen to the `useRoute` hook to get the route object of the parent screen:

```js
const route = useRoute('ParentScreenName');

console.log(route.params);
```

### Navigation actions bubble up

Actions like `navigate` and `goBack` are handled by the current navigator first. If it can't handle the action, the parent navigator tries. For example, calling `navigate('Messages')` from `Feed` is handled by the tab navigator, but `navigate('Settings')` bubbles up to the parent stack.

### Navigator-specific methods are available in child navigators

If you have a stack inside a drawer navigator, the drawer's `openDrawer`, `closeDrawer`, `toggleDrawer` methods etc. will also be available on the `navigation` object in the screens inside the stack navigator. But say you have a stack navigator as the parent of the drawer, then the screens inside the stack navigator won't have access to these methods, because they aren't nested inside the drawer.

Similarly, if you have a tab navigator inside stack navigator, the screens in the tab navigator will get the `push` and `replace` methods for stack in their `navigation` object.

### Nested navigators don't receive parent's events

Screens in a nested navigator won't receive the events emitted by the parent tab navigator such as `tabPress` when using `navigation.addListener`. We can get the parent navigation object with [`navigation.getParent`](navigation-object.md#getparent) to listen to parent events:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Events from parent" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.navigate('Messages')}>
        Go to Messages
      </Button>
    </View>
  );
}

function MessagesScreen() {
  const navigation = useNavigation('Messages');

  React.useEffect(() => {
    // codeblock-focus-start
    const unsubscribe = navigation
      .getParent('Home')
      .addListener('tabPress', (e) => {
        // Do something
        alert('Tab pressed!');
      });
    // codeblock-focus-end

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
    </View>
  );
}

const HomeStack = createNativeStackNavigator({
  screens: {
    Feed: FeedScreen,
    Messages: MessagesScreen,
  },
});

const RootTabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeStack,
      options: {
        headerShown: false,
      },
    },
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(RootTabs);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Events from parent" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.navigate('Messages')}>
        Go to Messages
      </Button>
    </View>
  );
}

function MessagesScreen() {
  const navigation = useNavigation('Messages');

  React.useEffect(() => {
    // codeblock-focus-start
    const unsubscribe = navigation
      .getParent('Home')
      .addListener('tabPress', (e) => {
        // Do something
        alert('Tab pressed!');
      });
    // codeblock-focus-end

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Feed" component={FeedScreen} />
      <Stack.Screen name="Messages" component={MessagesScreen} />
    </Stack.Navigator>
  );
}

function RootTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={HomeStack}
        options={{ headerShown: false }}
      />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootTabs />
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

Here `'Home'` refers to the name of the parent screen that contains the tab navigator whose event you want to listen to.

### Parent navigator's UI is rendered on top of child navigator

When you nest a stack navigator inside a drawer navigator, you'll see that the drawer appears above the stack navigator's header. However, if you nest the drawer navigator inside a stack, the drawer will appear below the header of the stack. This is an important point to consider when deciding how to nest your navigators.

In your app, you'd use these patterns depending on the behavior you want:

- **Tabs inside the first screen of stack**: New screens pushed to the stack cover the tab bar
- **Drawer inside the first screen of stack**: Drawer only opens from first screen
- **Stack inside each screen of drawer**: Drawer appears over the stack's header
- **Stack inside each screen of tabs**: Tab bar is always visible, pressing tab again when a stack is focused pops stack to top

## Navigating to a screen in a nested navigator

Consider this example where you want to navigate to the `Messages` screen in `MoreTabs` from your `HomeScreen`:

```js name="Navigating to nested screen" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('More')}>Go to More</Button>
      <Button
        onPress={() => navigation.navigate('More', { screen: 'Messages' })}
      >
        Go to Messages
      </Button>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

function MessagesScreen() {
  const navigation = useNavigation('Messages');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

// codeblock-focus-start
const MoreTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedScreen,
    Messages: MessagesScreen,
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    More: {
      screen: MoreTabs,
      options: {
        headerShown: false,
      },
    },
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

Here, you might want to navigate to the `More` screen (which contains `MoreTabs`) from your `HomeScreen` component:

```js
navigation.navigate('More');
```

It works, and the initial screen inside the `MoreTabs` component is shown, which is `Feed`. But sometimes you may want to control the screen that should be shown upon navigation. To achieve it, you can pass the name of the screen in params:

```js
navigation.navigate('More', { screen: 'Messages' });
```

This navigates to `More` and shows `Messages` instead of the initial screen.

### Passing params to a screen in a nested navigator

You can also pass params by specifying a `params` key:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Navigating to nested screen" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.navigate('More', {
              screen: 'Messages',
              params: { user: 'jane' },
            })
          // codeblock-focus-end
        }
      >
        Go to Messages
      </Button>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

function MessagesScreen({ route }) {
  const navigation = useNavigation('Messages');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
      <Text>User: {route.params.user}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

const MoreTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedScreen,
    Messages: MessagesScreen,
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    More: {
      screen: MoreTabs,
      options: {
        headerShown: false,
      },
    },
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Navigating to nested screen" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.navigate('More', {
              screen: 'Messages',
              params: { user: 'jane' },
            })
          // codeblock-focus-end
        }
      >
        Go to Messages
      </Button>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

function MessagesScreen({ route }) {
  const navigation = useNavigation('Messages');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
      <Text>User: {route.params.user}</Text>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MoreTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen
        name="More"
        component={MoreTabs}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

If the navigator was already rendered, navigating to another screen will push a new screen in case of a stack navigator.

You can follow a similar approach for deeply nested screens. Note that the second argument to `navigate` here is just `params`, so you can do something like:

```js
navigation.navigate('Home', {
  screen: 'Settings',
  params: {
    screen: 'Sound',
    params: {
      screen: 'Media',
    },
  },
});
```

In the above case, you're navigating to the `Media` screen, which is in a navigator nested inside the `Sound` screen, which is in a navigator nested inside the `Settings` screen.

:::warning

The `screen`, `params`, `initial`, and `state` param names are reserved and managed by React Navigation. Accessing `route.params.screen` etc. in the parent screens may lead to unexpected behavior.

:::

### Rendering initial route defined in the navigator

By default, when you navigate to specific a screen in the nested navigator, the specified screen is used as the initial screen and the `initialRouteName` prop on the navigator is ignored.

If you need to render the initial route specified in the navigator, you can disable the behaviour of using the specified screen as the initial screen by setting `initial: false`:

```js
navigation.navigate('Root', {
  screen: 'Settings',
  initial: false,
});
```

This affects what happens when pressing the back button. When there's an initial screen, the back button will take the user there.

## Avoiding multiple headers when nesting

When nesting multiple stack, drawer or bottom tab navigators, headers from both child and parent navigators would be shown. However, usually it's more desirable to show the header in the child navigator and hide the header in the screen of the parent navigator.

To achieve this, you can hide the header in the screen containing the navigator using the `headerShown: false` option.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Nested navigators" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function MessagesScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedScreen,
    Messages: MessagesScreen,
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeTabs,
      options: {
        // highlight-next-line
        headerShown: false,
      },
    },
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Nested navigators" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Feed Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function MessagesScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Messages Screen</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// codeblock-focus-start
function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen
        name="Home"
        component={HomeTabs}
        options={{
          // highlight-next-line
          headerShown: false,
        }}
      />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
// codeblock-focus-end

export default function App() {
  return (
    <NavigationContainer>
      <RootStack />
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

These examples use a bottom tab navigator directly nested inside another stack navigator, but the same principle applies when there are other navigators in between - for example, a stack inside a tab navigator inside another stack, or a stack inside a drawer navigator.

If you don't want headers in any of the navigators, you can specify `headerShown: false` in all of the navigators:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const HomeTabs = createBottomTabNavigator({
  // highlight-start
  screenOptions: {
    headerShown: false,
  },
  // highlight-end
  screens: {
    Feed: FeedScreen,
    Messages: MessagesScreen,
  },
});

const RootStack = createStackNavigator({
  // highlight-start
  screenOptions: {
    headerShown: false,
  },
  // highlight-end
  screens: {
    Home: HomeTabs,
    Profile: ProfileScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
function HomeTabs() {
  return (
    <Tab.Navigator
      // highlight-start
      screenOptions={{
        headerShown: false,
      }}
      // highlight-end
    >
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Messages" component={MessagesScreen} />
    </Tab.Navigator>
  );
}

function RootStack() {
  return (
    <Stack.Navigator
      // highlight-start
      screenOptions={{
        headerShown: false,
      }}
      // highlight-end
    >
      <Stack.Screen name="Home" component={HomeTabs} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

</TabItem>
</Tabs>

## Best practices when nesting

We recommend keeping navigator nesting to a minimum. Try to achieve the behavior you want with as little nesting as possible.

- It results in deeply nested view hierarchy which can cause memory and performance issues in lower end devices
- Nesting the same type of navigator (e.g. tabs inside tabs, drawer inside drawer etc.) might lead to a confusing UX
- With excessive nesting, code becomes difficult to follow when navigating to nested screens, configuring deep link etc.

Think of nesting navigators as a way to achieve the UI you want, not as a way to organize your code. If you want to create separate groups of screens for organization, use the [`Group`](group.md) component for dynamic configuration or [`groups` property](static-configuration.md#groups) for static configuration:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const MyStack = createStackNavigator({
  screens: {
    // Common screens
  },
  groups: {
    // Common modal screens
    Modal: {
      screenOptions: {
        presentation: 'modal',
      },
      screens: {
        Help,
        Invite,
      },
    },
    // Screens for logged in users
    User: {
      if: useIsLoggedIn,
      screens: {
        Home,
        Profile,
      },
    },
    // Auth screens
    Guest: {
      if: useIsGuest,
      screens: {
        SignIn,
        SignUp,
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Navigator>
  {isLoggedIn ? (
    // Screens for logged in users
    <Stack.Group>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Profile" component={Profile} />
    </Stack.Group>
  ) : (
    // Auth screens
    <Stack.Group screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignIn} />
      <Stack.Screen name="SignUp" component={SignUp} />
    </Stack.Group>
  )}
  {/* Common modal screens */}
  <Stack.Group screenOptions={{ presentation: 'modal' }}>
    <Stack.Screen name="Help" component={Help} />
    <Stack.Screen name="Invite" component={Invite} />
  </Stack.Group>
</Stack.Navigator>
```

</TabItem>
</Tabs>

---

## Navigation lifecycle
