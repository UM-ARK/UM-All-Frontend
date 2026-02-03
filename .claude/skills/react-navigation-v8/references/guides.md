
Source: https://reactnavigation.org/docs/8.x/navigation-lifecycle

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

If you're coming from a web background, you might expect that when navigating from route A to route B, A unmounts and remounts when you return. React Navigation works differently - this is driven by the more complex needs of mobile navigation.

Unlike web browsers, React Navigation doesn't unmount screens when navigating away. When you navigate from `Home` to `Profile`:

- `Profile` mounts
- `Home` stays mounted

When going back from `Profile` to `Home`:

- `Profile` unmounts
- `Home` is not remounted, existing instance is shown

Similar behavior can be observed (in combination) with other navigators as well. Consider a tab navigator with two tabs, where each tab is a stack navigator:

```js name="Navigation lifecycle" snack static2dynamic
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
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function SettingsScreen() {
  const navigation = useNavigation('Settings');

  React.useEffect(() => {
    console.log('SettingsScreen mounted');

    return () => console.log('SettingsScreen unmounted');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
    </View>
  );
}

function ProfileScreen() {
  const navigation = useNavigation('Profile');

  React.useEffect(() => {
    console.log('ProfileScreen mounted');

    return () => console.log('ProfileScreen unmounted');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function HomeScreen() {
  const navigation = useNavigation('Home');

  React.useEffect(() => {
    console.log('HomeScreen mounted');

    return () => console.log('HomeScreen unmounted');
  }, []);

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

  React.useEffect(() => {
    console.log('DetailsScreen mounted');

    return () => console.log('DetailsScreen unmounted');
  }, []);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Details Screen</Text>
      <Button onPress={() => navigation.push('Details')}>
        Go to Details... again
      </Button>
    </View>
  );
}

// codeblock-focus-start
const SettingsStack = createNativeStackNavigator({
  screens: {
    Settings: createNativeStackScreen({
      screen: SettingsScreen,
    }),
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
    }),
  },
});

const HomeStack = createNativeStackNavigator({
  screens: {
    Home: createNativeStackScreen({
      screen: HomeScreen,
    }),
    Details: createNativeStackScreen({
      screen: DetailsScreen,
    }),
  },
});

const MyTabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: false,
  },
  screens: {
    First: createBottomTabScreen({
      screen: SettingsStack,
    }),
    Second: createBottomTabScreen({
      screen: HomeStack,
    }),
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/lifecycle.mp4" />
</video>

We start on the `HomeScreen` and navigate to `DetailsScreen`. Then we use the tab bar to switch to the `SettingsScreen` and navigate to `ProfileScreen`. After this sequence of operations is done, all 4 of the screens are mounted! If you use the tab bar to switch back to the `HomeStack`, you'll notice you'll be presented with the `DetailsScreen` - the navigation state of the `HomeStack` has been preserved!

## React Navigation lifecycle events

Now that we understand how React lifecycle methods work in React Navigation, let's answer an important question: "How do we find out that a user is leaving (blur) it or coming back to it (focus)?"

To detect when a screen gains or loses focus, we can listen to `focus` and `blur` events:

```js name="Focus and blur" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  React.useEffect(() => {
    // highlight-start
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('ProfileScreen focused');
    });
    // highlight-end

    return unsubscribe;
  }, [navigation]);

  React.useEffect(() => {
    // highlight-start
    const unsubscribe = navigation.addListener('blur', () => {
      console.log('ProfileScreen blurred');
    });
    // highlight-end

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}
// codeblock-focus-end

function HomeScreen() {
  const navigation = useNavigation('Home');

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      console.log('HomeScreen focused');
    });

    return unsubscribe;
  }, [navigation]);

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('blur', () => {
      console.log('HomeScreen blurred');
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
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

See [Navigation events](navigation-events.md) for more details.

For performing side effects, we can use the [`useFocusEffect`](use-focus-effect.md) - it's like `useEffect` but ties to the navigation lifecycle -- it runs the effect when the screen comes into focus and cleans it up when the screen goes out of focus:

```js name="Focus effect" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { useFocusEffect } from '@react-navigation/native';

function ProfileScreen() {
  // highlight-start
  useFocusEffect(
    React.useCallback(() => {
      // Do something when the screen is focused
      console.log('ProfileScreen focus effect');

      return () => {
        // Do something when the screen is unfocused
        // Useful for cleanup functions
        console.log('ProfileScreen focus effect cleanup');
      };
    }, [])
  );
  // highlight-end

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}
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

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/lifecycle-focus.mp4" />
</video>

To render different things based on whether the screen is focused, we can use the [`useIsFocused`](use-is-focused.md) hook which returns a boolean indicating whether the screen is focused.

To know the focus state inside of an event listener, we can use the [`navigation.isFocused()`](navigation-object.md#isfocused) method. Note that using this method doesn't trigger a re-render like the `useIsFocused` hook does, so it is not suitable for rendering different things based on focus state.

## Summary

- Screens stay mounted when navigating away from them
- The [`useFocusEffect`](use-focus-effect.md) hook is like [`useEffect`](https://react.dev/reference/react/useEffect) but tied to the navigation lifecycle instead of the component lifecycle
- The [`useIsFocused`](use-is-focused.md) hook and [`navigation.isFocused()`](navigation-object.md#isfocused) method can be used to determine if a screen is currently focused
- The [`focus`](navigation-events.md#focus) and [`blur`](navigation-events.md#blur) events can be used to know when a screen gains or loses focus

---

## Next steps

Source: https://reactnavigation.org/docs/8.x/next-steps

You now know how to create a stack navigator, configure screens, navigate between routes, and display [modals](modal.md).

Stack navigators and their related APIs will be the most frequently used tools in your React Navigation toolbelt, but there are problems that they don't solve. For example, you can't build tab-based navigation using a stack navigator &mdash; for that, you need to use a [Bottom Tabs Navigator](bottom-tab-navigator.md).

You can check out the **"Navigators"** section in the sidebar to learn more about the different navigators available in React Navigation.

The **"Guides"** section covers common topics that you'll encounter when building navigation in your app. Some of the guides you may want to check out are:

- [Authentication flows](auth-flow.md)
- [Supporting safe areas](handling-safe-area.md)
- [Deep linking](deep-linking.md)
- [Themes](themes.md)
- [Testing with Jest](testing.md)
- [Configuring TypeScript](typescript.md)

While most users won't need to do this, if you are curious and want to learn more about how React Navigation works, it's recommended to work through the [Navigation State reference](navigation-state.md) and [Build your own Navigator](custom-navigators.md) sections.

Good luck!

---

## Authentication flows

Source: https://reactnavigation.org/docs/8.x/auth-flow

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Most apps require that a user authenticates in some way to have access to data associated with a user or other private content. Typically the flow will look like this:

- The user opens the app.
- The app loads some authentication state from encrypted persistent storage (for example, [`SecureStore`](https://docs.expo.io/versions/latest/sdk/securestore/)).
- When the state has loaded, the user is presented with either authentication screens or the main app, depending on whether valid authentication state was loaded.
- When the user signs out, we clear the authentication state and send them back to authentication screens.

:::note

We say "authentication screens" because usually there is more than one. You may have a main screen with a username and password field, another for "forgot password", and another set for sign up.

:::

## What we need

We want the following behavior from our authentication flow:

- When the user is signed in, we want to show the main app screens and not the authentication-related screens.
- When the user is signed out, we want to show the authentication screens and not the main app screens.
- After the user goes through the authentication flow and signs in, we want to unmount all of the screens related to authentication, and when we press the hardware back button, we expect to not be able to go back to the authentication flow.

## How it will work

We can configure different screens to be available based on some condition. For example, if the user is signed in, we want `Home` to be available. If the user is not signed in, we want `SignIn` to be available.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Authentication flow" snack
import * as React from 'react';
import { View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const useIsSignedIn = () => {
  return true;
};

const useIsSignedOut = () => {
  return !useIsSignedIn();
};

// codeblock-focus-start
const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      if: useIsSignedIn,
      screen: HomeScreen,
    },
    SignIn: {
      if: useIsSignedOut,
      screen: SignInScreen,
    },
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}

function HomeScreen() {
  return <View />;
}

function SignInScreen() {
  return <View />;
}
```

Here, for each screen, we have defined a condition using the `if` property which takes a hook. The hook returns a boolean value indicating whether the user is signed in or not. If the hook returns `true`, the screen will be available, otherwise it won't.

This means:

- When `useIsSignedIn` returns `true`, React Navigation will only use the `Home` screen, since it's the only screen matching the condition.
- Similarly, when `useIsSignedOut` returns `true`, React Navigation will use the `SignIn` screen.

This makes it impossible to navigate to the `Home` when the user is not signed in, and to `SignIn` when the user is signed in.

When the values returned by `useIsSignedin` and `useIsSignedOut` change, the screens matching the condition will change:

- Let's say, initially `useIsSignedOut` returns `true`. This means that `SignIn` screens is shown.
- After the user signs in, the return value of `useIsSignedIn` will change to `true` and `useIsSignedOut` will change to `false`, which means:
  - React Navigation will see that the `SignIn` screen is no longer matches the condition, so it will remove the screen.
  - Then it'll show the `Home` screen automatically because that's the first screen available when `useIsSignedIn` returns `true`.

The order of the screens matters when there are multiple screens matching the condition. For example, if there are two screens matching `useIsSignedIn`, the first screen will be shown when the condition is `true`.

## Define the hooks

To implement the `useIsSignedIn` and `useIsSignedOut` hooks, we can start by creating a context to store the authentication state. Let's call it `SignInContext`:

```js
import * as React from 'react';

const SignInContext = React.createContext();
```

Then we can implement the `useIsSignedIn` and `useIsSignedOut` hooks as follows:

```js
function useIsSignedIn() {
  const isSignedIn = React.useContext(SignInContext);
  return isSignedIn;
}

function useIsSignedOut() {
  return !useIsSignedIn();
}
```

We'll discuss how to provide the context value later.

</TabItem>

<TabItem value="dynamic" label="Dynamic">

```js name="Authentication flow" snack
import * as React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Stack = createNativeStackNavigator();

export default function App() {
  const isSignedIn = true;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        // codeblock-focus-start
        {isSignedIn ? (
          <Stack.Screen name="Home" component={HomeScreen} />
        ) : (
          <Stack.Screen name="SignIn" component={SignInScreen} />
        )}
        // codeblock-focus-end
      </Stack.Navigator>
    </NavigationContainer>
  );
}

function HomeScreen() {
  return <View />;
}

function SignInScreen() {
  return <View />;
}
```

Here, we have conditionally defined the screens based on the value of `isSignedIn`.

This means:

- When `isSignedIn` is `true`, React Navigation will only see the `Home` screen, since it's the only screen defined based on the condition.
- Similarly, when `isSignedIn` is `false`, React Navigation will only see the `SignIn` screen.

This makes it impossible to navigate to the `Home` when the user is not signed in, and to `SignIn` when the user is signed in.

When the value of `isSignedin` changes, the screens defined based on the condition will change:

- Let's say, initially `isSignedin` is `false`. This means that `SignIn` screens is shown.
- After the user signs in, the value of `isSignedin` will change to `true`, which means:
  - React Navigation will see that the `SignIn` screen is no longer defined, so it will remove the screen.
  - Then it'll show the `Home` screen automatically because that's the first screen defined when `isSignedin` returns `true`.

The order of the screens matters when there are multiple screens matching the condition. For example, if there are two screens defined based on `isSignedin`, the first screen will be shown when the condition is `true`.

</TabItem>
</Tabs>

## Add more screens

For our case, let's say we have 3 screens:

- `SplashScreen` - This will show a splash or loading screen when we're restoring the token.
- `SignIn` - This is the screen we show if the user isn't signed in already (we couldn't find a token).
- `Home` - This is the screen we show if the user is already signed in.

So our navigator will look like:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createNativeStackNavigator({
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

const Navigation = createStaticNavigation(RootStack);
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const Stack = createNativeStackNavigator();

export default function App() {
  const isSignedIn = true;

  return (
    <NavigationContainer>
      <Stack.Navigator>
        {isSignedIn ? (
          <Stack.Screen
            name="SignIn"
            component={SimpleSignInScreen}
            options={{
              title: 'Sign in',
            }}
            initialParams={{ setUserToken }}
          />
        ) : (
          <Stack.Screen name="Home" component={HomeScreen} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

Notice how we have only defined the `Home` and `SignIn` screens here, and not the `SplashScreen`. The `SplashScreen` should be rendered before we render any navigators so that we don't render incorrect screens before we know whether the user is signed in or not.

When we use this in our component, it'd look something like this:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
if (isLoading) {
  // We haven't finished checking for the token yet
  return <SplashScreen />;
}

const isSignedIn = userToken != null;

return (
  <SignInContext.Provider value={isSignedIn}>
    <Navigation />
  </SignInContext.Provider>
);
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
if (isLoading) {
  // We haven't finished checking for the token yet
  return <SplashScreen />;
}

const isSignedIn = userToken != null;

return (
  <NavigationContainer>
    <Stack.Navigator>
      {isSignedIn ? (
        <Stack.Screen
          name="SignIn"
          component={SimpleSignInScreen}
          options={{
            title: 'Sign in',
          }}
          initialParams={{ setUserToken }}
        />
      ) : (
        <Stack.Screen name="Home" component={HomeScreen} />
      )}
    </Stack.Navigator>
  </NavigationContainer>
);
```

</TabItem>
</Tabs>

In the above snippet, `isLoading` means that we're still checking if we have a token. This can usually be done by checking if we have a token in `SecureStore` and validating the token.

Next, we're exposing the sign in status via the `SignInContext` so that it's available to the `useIsSignedIn` and `useIsSignedOut` hooks.

In the above example, we have one screen for each case. But you could also define multiple screens. For example, you probably want to define password reset, signup, etc screens as well when the user isn't signed in. Similarly for the screens accessible after sign in, you probably have more than one screen.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

We can use [`groups`](static-configuration.md#groups) to define multiple screens:

```js
const RootStack = createNativeStackNavigator({
  screens: {
    // Common screens
  },
  groups: {
    SignedIn: {
      if: useIsSignedIn,
      screens: {
        Home: HomeScreen,
        Profile: ProfileScreen,
      },
    },
    SignedOut: {
      if: useIsSignedOut,
      screens: {
        SignIn: SignInScreen,
        SignUp: SignUpScreen,
        ResetPassword: ResetPasswordScreen,
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

We can use [`React.Fragment`](https://react.dev/reference/react/Fragment) or [`Group`](group.md) to define multiple screens:

```js
isSignedIn ? (
  <>
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPassword} />
  </>
) : (
  <>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
  </>
);
```

:::tip

Instead of having your login-related screens and rest of the screens in two different Stack navigators and render them conditionally, we recommend to use a single Stack navigator and place the conditional inside. This makes it possible to have a proper transition animation during login/logout.

:::

</TabItem>
</Tabs>

## Implement the logic for restoring the token

:::note

The following is just an example of how you might implement the logic for authentication in your app. You don't need to follow it as is.

:::

From the previous snippet, we can see that we need 3 state variables:

- `isLoading` - We set this to `true` when we're trying to check if we already have a token saved in `SecureStore`.
- `isSignout` - We set this to `true` when user is signing out, otherwise set it to `false`. This can be used to customize the animation when signing out.
- `userToken` - The token for the user. If it's non-null, we assume the user is logged in, otherwise not.

So we need to:

- Add some logic for restoring token, signing in and signing out
- Expose methods for signing in and signing out to other components

We'll use `React.useReducer` and `React.useContext` in this guide. But if you're using a state management library such as Redux or Mobx, you can use them for this functionality instead. In fact, in bigger apps, a global state management library is more suitable for storing authentication tokens. You can adapt the same approach to your state management library.

First we'll need to create a context for auth where we can expose the necessary methods:

```js
import * as React from 'react';

const AuthContext = React.createContext();
```

In our component, we will:

- Store the token and loading state in `useReducer`
- Persist it to `SecureStore` and read it from there on app launch
- Expose the methods for sign in and sign out to child components using `AuthContext`

So our component will look like this:
<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Signing in and signing out with AuthContext" snack dependencies=expo-secure-store
// codeblock-focus-start
import * as React from 'react';
import * as SecureStore from 'expo-secure-store';

// codeblock-focus-end
import { Text, TextInput, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

const AuthContext = React.createContext();

const SignInContext = React.createContext();

function useIsSignedIn() {
  const isSignedIn = React.useContext(SignInContext);
  return isSignedIn;
}

function useIsSignedOut() {
  return !useIsSignedIn();
}

function SplashScreen() {
  return (
    <View>
      <Text>Loading...</Text>
    </View>
  );
}

function HomeScreen() {
  const { signOut } = React.useContext(AuthContext);

  return (
    <View>
      <Text>Signed in!</Text>
      <Button onPress={signOut}>Sign out</Button>
    </View>
  );
}

function SignInScreen() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const { signIn } = React.useContext(AuthContext);

  return (
    <View>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button onPress={() => signIn({ username, password })}>Sign in</Button>
    </View>
  );
}

// codeblock-focus-start
export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  React.useEffect(() => {
    // Fetch the token from storage then navigate to our appropriate place
    const bootstrapAsync = async () => {
      let userToken;

      try {
        // Restore token stored in `SecureStore` or any other encrypted storage
        userToken = await SecureStore.getItemAsync('userToken');
      } catch (e) {
        // Restoring token failed
      }

      // After restoring token, we may need to validate it in production apps

      // This will switch to the App screen or Auth screen and this loading
      // screen will be unmounted and thrown away.
      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (data) => {
        // In a production app, we need to send some data (usually username, password) to server and get a token
        // We will also need to handle errors if sign in failed
        // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
        // In the example, we'll use a dummy token

        dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
      },
      signOut: () => dispatch({ type: 'SIGN_OUT' }),
      signUp: async (data) => {
        // In a production app, we need to send user data to server and get a token
        // We will also need to handle errors if sign up failed
        // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
        // In the example, we'll use a dummy token

        dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
      },
    }),
    []
  );

  if (state.isLoading) {
    // We haven't finished checking for the token yet
    return <SplashScreen />;
  }

  const isSignedIn = state.userToken != null;

  return (
    <AuthContext.Provider value={authContext}>
      <SignInContext.Provider value={isSignedIn}>
        <Navigation />
      </SignInContext.Provider>
    </AuthContext.Provider>
  );
}

const RootStack = createNativeStackNavigator({
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

const Navigation = createStaticNavigation(RootStack);
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Signing in and signing out with AuthContext" snack dependencies=expo-secure-store
// codeblock-focus-start
import * as React from 'react';
import * as SecureStore from 'expo-secure-store';

// codeblock-focus-end
import { Text, TextInput, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

const AuthContext = React.createContext();

function SplashScreen() {
  return (
    <View>
      <Text>Loading...</Text>
    </View>
  );
}

function HomeScreen() {
  const { signOut } = React.useContext(AuthContext);

  return (
    <View>
      <Text>Signed in!</Text>
      <Button onPress={signOut}>Sign out</Button>
    </View>
  );
}

function SignInScreen() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const { signIn } = React.useContext(AuthContext);

  return (
    <View>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button onPress={() => signIn({ username, password })}>Sign in</Button>
    </View>
  );
}

const Stack = createNativeStackNavigator();

// codeblock-focus-start
export default function App() {
  const [state, dispatch] = React.useReducer(
    (prevState, action) => {
      switch (action.type) {
        case 'RESTORE_TOKEN':
          return {
            ...prevState,
            userToken: action.token,
            isLoading: false,
          };
        case 'SIGN_IN':
          return {
            ...prevState,
            isSignout: false,
            userToken: action.token,
          };
        case 'SIGN_OUT':
          return {
            ...prevState,
            isSignout: true,
            userToken: null,
          };
      }
    },
    {
      isLoading: true,
      isSignout: false,
      userToken: null,
    }
  );

  React.useEffect(() => {
    // Fetch the token from storage then navigate to our appropriate place
    const bootstrapAsync = async () => {
      let userToken;

      try {
        // Restore token stored in `SecureStore` or any other encrypted storage
        userToken = await SecureStore.getItemAsync('userToken');
      } catch (e) {
        // Restoring token failed
      }

      // After restoring token, we may need to validate it in production apps

      // This will switch to the App screen or Auth screen and this loading
      // screen will be unmounted and thrown away.
      dispatch({ type: 'RESTORE_TOKEN', token: userToken });
    };

    bootstrapAsync();
  }, []);

  const authContext = React.useMemo(
    () => ({
      signIn: async (data) => {
        // In a production app, we need to send some data (usually username, password) to server and get a token
        // We will also need to handle errors if sign in failed
        // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
        // In the example, we'll use a dummy token

        dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
      },
      signOut: () => dispatch({ type: 'SIGN_OUT' }),
      signUp: async (data) => {
        // In a production app, we need to send user data to server and get a token
        // We will also need to handle errors if sign up failed
        // After getting token, we need to persist the token using `SecureStore` or any other encrypted storage
        // In the example, we'll use a dummy token

        dispatch({ type: 'SIGN_IN', token: 'dummy-auth-token' });
      },
    }),
    []
  );

  return (
    <AuthContext.Provider value={authContext}>
      <NavigationContainer>
        <Stack.Navigator>
          {state.isLoading ? (
            // We haven't finished checking for the token yet
            <Stack.Screen name="Splash" component={SplashScreen} />
          ) : state.userToken == null ? (
            // No token found, user isn't signed in
            <Stack.Screen
              name="SignIn"
              component={SignInScreen}
              options={{
                title: 'Sign in',
                // When logging out, a pop animation feels intuitive
                animationTypeForReplace: state.isSignout ? 'pop' : 'push',
              }}
            />
          ) : (
            // User is signed in
            <Stack.Screen name="Home" component={HomeScreen} />
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </AuthContext.Provider>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

## Fill in other components

We won't talk about how to implement the text inputs and buttons for the authentication screen, that is outside of the scope of navigation. We'll just fill in some placeholder content.

```js
function SignInScreen() {
  const [username, setUsername] = React.useState('');
  const [password, setPassword] = React.useState('');

  const { signIn } = React.useContext(AuthContext);

  return (
    <View>
      <TextInput
        placeholder="Username"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      <Button onPress={() => signIn({ username, password })}>Sign in</Button>
    </View>
  );
}
```

You can similarly fill in the other screens according to your requirements.

## Removing shared screens when auth state changes

Consider the following example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createNativeStackNavigator({
  groups: {
    LoggedIn: {
      if: useIsSignedIn,
      screens: {
        Home: HomeScreen,
        Profile: ProfileScreen,
      },
    },
    LoggedOut: {
      if: useIsSignedOut,
      screens: {
        SignIn: SignInScreen,
        SignUp: SignUpScreen,
      },
    },
  },
  screens: {
    Help: HelpScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
isSignedIn ? (
  <>
    <Stack.Screen name="Home" component={HomeScreen} />
    <Stack.Screen name="Profile" component={ProfileScreen} />
    <Stack.Screen name="Help" component={HelpScreen} />
  </>
) : (
  <>
    <Stack.Screen name="SignIn" component={SignInScreen} />
    <Stack.Screen name="SignUp" component={SignUpScreen} />
    <Stack.Screen name="Help" component={HelpScreen} />
  </>
);
```

</TabItem>
</Tabs>

Here we have specific screens such as `SignIn`, `Home` etc. which are only shown depending on the sign in state. But we also have the `Help` screen which can be shown regardless of the login status. This also means that if the sign in state changes when the user is in the `Help` screen, they'll stay on the `Help` screen.

This can be a problem, we probably want the user to be taken to the `SignIn` screen or `Home` screen instead of keeping them on the `Help` screen.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

To make this work, we can move the `Help` screen to both of the groups instead of keeping it outside. This will ensure that the [`navigationKey`](screen.md#navigation-key) (the name of the group) for the screen changes when the sign in state changes.

So our updated code will look like the following:

```js
const RootStack = createNativeStackNavigator({
  groups: {
    LoggedIn: {
      if: useIsSignedIn,
      screens: {
        Home: HomeScreen,
        Profile: ProfileScreen,
        Help: HelpScreen,
      },
    },
    LoggedOut: {
      if: useIsSignedOut,
      screens: {
        SignIn: SignInScreen,
        SignUp: SignUpScreen,
        Help: HelpScreen,
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

To make this work, we can use [`navigationKey`](screen.md#navigation-key). When the `navigationKey` changes, React Navigation will remove all the screen.

So our updated code will look like the following:

```js
<>
  {isSignedIn ? (
    <>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </>
  ) : (
    <>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </>
  )}
  <Stack.Screen
    navigationKey={isSignedIn ? 'user' : 'guest'}
    name="Help"
    component={HelpScreen}
  />
</>
```

If you have a bunch of shared screens, you can also use [`navigationKey` with a `Group`](group.md#navigation-key) to remove all of the screens in the group. For example:

```js
<>
  {isSignedIn ? (
    <>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </>
  ) : (
    <>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
    </>
  )}
  <Stack.Group navigationKey={isSignedIn ? 'user' : 'guest'}>
    <Stack.Screen name="Help" component={HelpScreen} />
    <Stack.Screen name="About" component={AboutScreen} />
  </Stack.Group>
</>
```

</TabItem>
</Tabs>

The examples above show stack navigator, but you can use the same approach with any navigator.

By specifying a condition for our screens, we can implement auth flow in a simple way that doesn't require additional logic to make sure that the correct screen is shown.

## Don't manually navigate when conditionally rendering screens

It's important to note that when using such a setup, you **don't manually navigate** to the `Home` screen by calling `navigation.navigate('Home')` or any other method. **React Navigation will automatically navigate to the correct screen** when `isSignedIn` changes - `Home` screen when `isSignedIn` becomes `true`, and to `SignIn` screen when `isSignedIn` becomes `false`. You'll get an error if you attempt to navigate manually.

## Handling deep links after auth

When using deep links, you may want to handle the case where the user opens a deep link that requires authentication.

Example scenario:

- User opens a deep link to `myapp://profile` but is not signed in.
- The app shows the `SignIn` screen.
- After the user signs in, you want to navigate them to the `Profile` screen.

To achieve this, you can set [`routeNamesChangeBehavior`](navigator.md#route-names-change-behavior) to `"lastUnhandled"`:

:::warning

This API is experimental and may change in a minor release.

:::

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

The `routeNamesChangeBehavior` option allows you to control how React Navigation handles navigation when the available screens change because of conditions such as authentication state. When `lastUnhandled` is specified, React Navigation will remember the last screen that couldn't be handled, and after the condition changes, it'll automatically navigate to that screen if it's now available.

---

## Supporting safe areas

Source: https://reactnavigation.org/docs/8.x/handling-safe-area

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

By default, React Navigation tries to ensure that the elements of the navigators display correctly on devices with notches (e.g. iPhone X) and UI elements which may overlap the app content. Such items include:

- Physical notches
- Status bar overlay
- Home activity indicator on iOS
- Navigation bar on Android

The area not overlapped by such items is referred to as "safe area".

We try to apply proper insets on the UI elements of the navigators to avoid being overlapped by such items. The goal is to (a) maximize usage of the screen (b) without hiding content or making it difficult to interact with by having it obscured by a physical display cutout or some operating system UI.

While React Navigation handles safe areas for the built-in UI elements by default, your own content may also need to handle it to ensure that content isn't hidden by these items.

It's tempting to solve (a) by wrapping your entire app in a container with padding that ensures all content will not be occluded. But in doing so, we waste a bunch of space on the screen, as pictured in the image on the left below. What we ideally want is the image pictured on the right.

![Notch on the iPhone X](/assets/iphoneX/00-intro.png)

While React Native exports a `SafeAreaView` component, this component only supports iOS 10+ with no support for older iOS versions or Android. In addition, it also has some issues, i.e. if a screen containing safe area is animating, it causes jumpy behavior. So we recommend to use the `useSafeAreaInsets` hook from the [react-native-safe-area-context](https://github.com/th3rdwave/react-native-safe-area-context) library to handle safe areas in a more reliable way.

:::warning

The `react-native-safe-area-context` library also exports a `SafeAreaView` component. While it works on Android, it also has the same issues with jumpy behavior on vertical animations. In addition, the `SafeAreaView` component and `useSafeAreaInsets` hook can update at different times, resulting in flickering when using them together. So we recommend always using the `useSafeAreaInsets` hook instead and avoid using the `SafeAreaView` component for consistent behavior.

:::

The rest of this guide gives more information on how to support safe areas in React Navigation.

## Hidden/Custom Header or Tab Bar

![Default React Navigation Behavior](/assets/iphoneX/01-iphonex-default.png)

React Navigation handles safe area in the default header. However, if you're using a custom header, it's important to ensure your UI is within the safe area.

For example, if I render nothing for the `header` or `tabBar`, nothing renders

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Hidden components" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function Demo() {
  return (
    <View
      style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}
    >
      <Text>This is top text.</Text>
      <Text>This is bottom text.</Text>
    </View>
  );
}

// codeblock-focus-start
const MyTabs = createBottomTabNavigator({
  initialRouteName: 'Analytics',
  // highlight-start
  tabBar: () => null,
  screenOptions: {
    headerShown: false,
  },
  // highlight-end
  screens: {
    Analytics: Demo,
    Profile: Demo,
  },
});

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  // highlight-start
  screenOptions: {
    headerShown: false,
  },
  // highlight-end
  screens: {
    Home: MyTabs,
    Settings: Demo,
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

```js name="Hidden components" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function Demo() {
  return (
    <View
      style={{ flex: 1, justifyContent: 'space-between', alignItems: 'center' }}
    >
      <Text>This is top text.</Text>
      <Text>This is bottom text.</Text>
    </View>
  );
}
const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName="Home"
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Home">
          {() => (
            <Tab.Navigator
              initialRouteName="Analytics"
              tabBar={() => null}
              screenOptions={{ headerShown: false }}
            >
              <Tab.Screen name="Analytics" component={Demo} />
              <Tab.Screen name="Profile" component={Demo} />
            </Tab.Navigator>
          )}
        </Stack.Screen>

        <Stack.Screen name="Settings" component={Demo} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

![Text hidden by iPhoneX UI elements](/assets/iphoneX/02-iphonex-content-hidden.png)

To fix this issue you can apply safe area insets on your content. This can be achieved using the `useSafeAreaInsets` hook from the `react-native-safe-area-context` library:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Safe area example" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// codeblock-focus-start
function Demo() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <Text>This is top text.</Text>
      <Text>This is bottom text.</Text>
    </View>
  );
}
// codeblock-focus-end

const MyTabs = createBottomTabNavigator({
  initialRouteName: 'Analytics',
  tabBar: () => null,
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Analytics: Demo,
    Profile: Demo,
  },
});

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Home: MyTabs,
    Settings: Demo,
  },
});

// codeblock-focus-start

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  );
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Safe area example" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

// codeblock-focus-start
function Demo() {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: insets.top,
        paddingBottom: insets.bottom,
        paddingLeft: insets.left,
        paddingRight: insets.right,
      }}
    >
      <Text>This is top text.</Text>
      <Text>This is bottom text.</Text>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// codeblock-focus-start
export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        {/*(...) */}
        // codeblock-focus-end
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home">
            {() => (
              <Tab.Navigator
                initialRouteName="Analytics"
                tabBar={() => null}
                screenOptions={{ headerShown: false }}
              >
                <Tab.Screen name="Analytics" component={Demo} />
                <Tab.Screen name="Profile" component={Demo} />
              </Tab.Navigator>
            )}
          </Stack.Screen>
          <Stack.Screen name="Settings" component={Demo} />
        </Stack.Navigator>
        // codeblock-focus-start
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

Make sure to wrap your app in `SafeAreaProvider` as per the instructions [here](https://github.com/th3rdwave/react-native-safe-area-context#usage).

![Content spaced correctly with safe area insets](/assets/iphoneX/03-iphonex-content-fixed.png)

This will detect if the app is running on a device with notches, if so, ensure the content isn't hidden behind any hardware elements.

## Landscape Mode

Even if you're using the default navigation bar and tab bar - if your application works in landscape mode it's important to ensure your content isn't hidden behind the sensor cluster.

![App in landscape mode with text hidden](/assets/iphoneX/04-iphonex-landscape-hidden.png)

To fix this you can, once again, apply safe area insets to your content. This will not conflict with the navigation bar nor the tab bar's default behavior in portrait mode.

![App in landscape mode with text visible](/assets/iphoneX/05-iphonex-landscape-fixed.png)

## Use the hook for more control

In some cases you might need more control over which paddings are applied. For example, you can only apply the top and the bottom padding by changing the `style` object:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="useSafeAreaInsets hook" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
// codeblock-focus-start
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function Demo() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,

        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text>This is top text.</Text>
      <Text>This is bottom text.</Text>
    </View>
  );
}
// codeblock-focus-end

const MyTabs = createBottomTabNavigator({
  initialRouteName: 'Analytics',
  tabBar: () => null,
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Analytics: Demo,
    Profile: Demo,
  },
});

const RootStack = createNativeStackNavigator({
  initialRouteName: 'Home',
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Home: MyTabs,
    Settings: Demo,
  },
});

// codeblock-focus-start

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return (
    <SafeAreaProvider>
      <Navigation />
    </SafeAreaProvider>
  );
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="useSafeAreaInsets hook" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
// codeblock-focus-start
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function Demo() {
  const insets = useSafeAreaInsets();
  return (
    <View
      style={{
        paddingTop: insets.top,
        paddingBottom: insets.bottom,

        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'center',
      }}
    >
      <Text>This is top text.</Text>
      <Text>This is bottom text.</Text>
    </View>
  );
}
// codeblock-focus-end

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{ headerShown: false }}
        >
          <Stack.Screen name="Home">
            {() => (
              <Tab.Navigator
                initialRouteName="Analytics"
                tabBar={() => null}
                screenOptions={{ headerShown: false }}
              >
                <Tab.Screen name="Analytics" component={Demo} />
                <Tab.Screen name="Profile" component={Demo} />
              </Tab.Navigator>
            )}
          </Stack.Screen>

          <Stack.Screen name="Settings" component={Demo} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
```

</TabItem>
</Tabs>

Similarly, you could apply these paddings in `contentContainerStyle` of `FlatList` to have the content avoid the safe areas, but still show them under the statusbar and navigation bar when scrolling.

## Summary

- Use [`useSafeAreaInsets`](https://appandflow.github.io/react-native-safe-area-context/api/use-safe-area-insets) hook from `react-native-safe-area-context` instead of [`SafeAreaView`](https://reactnative.dev/docs/safeareaview) component
- Don't wrap your whole app in `SafeAreaView`, instead apply the styles to content inside your screens
- Apply only specific insets using the `useSafeAreaInsets` hook for more control

---

## Hiding tab bar in specific screens

Source: https://reactnavigation.org/docs/8.x/hiding-tabbar-in-screens

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Sometimes we may want to hide the tab bar in specific screens in a stack navigator nested in a tab navigator. Let's say we have 5 screens: `Home`, `Feed`, `Notifications`, `Profile` and `Settings`, and your navigation structure looks like this:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Hiding tab bar in screens"
const HomeStack = createNativeStackNavigator({
  screens: {
    Home: Home,
    Profile: Profile,
    Settings: Settings,
  },
});

const MyTabs = createBottomTabNavigator({
  screens: {
    Home: HomeStack,
    Feed: Feed,
    Notifications: Notifications,
  },
});

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
function HomeStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="Profile" component={Profile} />
      <Stack.Screen name="Settings" component={Settings} />
    </Stack.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeStack} />
        <Tab.Screen name="Feed" component={Feed} />
        <Tab.Screen name="Notifications" component={Notifications} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

With this structure, when we navigate to the `Profile` or `Settings` screen, the tab bar will still stay visible over those screens.

But if we want to show the tab bar only on the `Home`, `Feed` and `Notifications` screens, but not on the `Profile` and `Settings` screens, we'll need to change the navigation structure. The easiest way to achieve this is to nest the tab navigator inside the first screen of the stack instead of nesting stack inside tab navigator:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Hiding tabbar" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

function EmptyScreen() {
  return <View />;
}

function Home() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

// codeblock-focus-start
const HomeTabs = createBottomTabNavigator({
  screens: {
    Home: Home,
    Feed: EmptyScreen,
    Notifications: EmptyScreen,
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeTabs,
    Profile: EmptyScreen,
    Settings: EmptyScreen,
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

```js name="Hiding tabbar" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Button } from '@react-navigation/elements';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function EmptyScreen() {
  return <View />;
}

function Home() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button onPress={() => navigation.navigate('Profile')}>
        Go to Profile
      </Button>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

// codeblock-focus-start
function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Feed" component={EmptyScreen} />
      <Tab.Screen name="Notifications" component={EmptyScreen} />
    </Tab.Navigator>
  );
}

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeTabs} />
        <Stack.Screen name="Profile" component={EmptyScreen} />
        <Stack.Screen name="Settings" component={EmptyScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
// codeblock-focus-end

export default App;
```

</TabItem>
</Tabs>

After re-organizing the navigation structure, now if we navigate to the `Profile` or `Settings` screens, the tab bar won't be visible over the screen anymore.

---

## Different status bar configuration based on route

Source: https://reactnavigation.org/docs/8.x/status-bar

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

If you don't have a navigation header, or your navigation header changes color based on the route, you'll want to ensure that the correct color is used for the content.

## Stack

This is a simple task when using a stack. You can render the `StatusBar` component, which is exposed by React Native, and set your config.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Different status bar" snack
import * as React from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function Screen1() {
  const navigation = useNavigation('Screen1');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#6a51ae',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      // highlight-start
      <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      // highlight-end
      <Text style={{ color: '#fff' }}>Light Screen</Text>
      <Button onPress={() => navigation.navigate('Screen2')}>
        Next screen
      </Button>
    </View>
  );
}

function Screen2() {
  const navigation = useNavigation('Screen2');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#ecf0f1',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      // highlight-start
      <StatusBar barStyle="dark-content" backgroundColor="#ecf0f1" />
      // highlight-end
      <Text>Dark Screen</Text>
      <Button onPress={() => navigation.navigate('Screen1')}>
        Next screen
      </Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Screen1: Screen1,
    Screen2: Screen2,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
});
```

</TabItem>

<TabItem value="dynamic" label="Dynamic">

```js name="Different status bar" snack
import * as React from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function Screen1() {
  const navigation = useNavigation('Screen1');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#6a51ae',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      // highlight-start
      <StatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      // highlight-end
      <Text style={{ color: '#fff' }}>Light Screen</Text>
      <Button onPress={() => navigation.navigate('Screen2')}>
        Next screen
      </Button>
    </View>
  );
}

function Screen2() {
  const navigation = useNavigation('Screen2');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#ecf0f1',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      // highlight-start
      <StatusBar barStyle="dark-content" backgroundColor="#ecf0f1" />
      // highlight-end
      <Text>Dark Screen</Text>
      <Button onPress={() => navigation.navigate('Screen1')}>
        Next screen
      </Button>
    </View>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Screen1" component={Screen1} />
          <Stack.Screen name="Screen2" component={Screen2} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

</TabItem>
</Tabs>

<video playsInline autoPlay muted loop>
  <source src="/assets/statusbar/status-stack-ios.mp4" />
</video>

<video playsInline autoPlay muted loop>
  <source src="/assets/statusbar/status-stack-android.mp4" />
</video>

## Tabs and Drawer

If you're using a tab or drawer navigator, it's a bit more complex because all of the screens in the navigator might be rendered at once and kept rendered - that means that the last `StatusBar` config you set will be used (likely on the final tab of your tab navigator, not what the user is seeing).

To fix this, we'll have to do make the status bar component aware of screen focus and render it only when the screen is focused. We can achieve this by using the [`useIsFocused` hook](use-is-focused.md) and creating a wrapper component:

```js
import * as React from 'react';
import { StatusBar } from 'react-native';
import { useIsFocused } from '@react-navigation/native';

function FocusAwareStatusBar(props) {
  const isFocused = useIsFocused();

  return isFocused ? <StatusBar {...props} /> : null;
}
```

Now, our screens (both `Screen1.js` and `Screen2.js`) will use the `FocusAwareStatusBar` component instead of the `StatusBar` component from React Native:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Different status bar based on tabs" snack
import * as React from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function FocusAwareStatusBar(props) {
  const isFocused = useIsFocused();

  return isFocused ? <StatusBar {...props} /> : null;
}

// codeblock-focus-start
function Screen1() {
  const navigation = useNavigation('Screen1');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#6a51ae',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      <Text style={{ color: '#fff' }}>Light Screen</Text>
      <Button onPress={() => navigation.navigate('Screen2')}>
        Next screen
      </Button>
    </View>
  );
}

function Screen2() {
  const navigation = useNavigation('Screen2');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#ecf0f1',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ecf0f1" />
      <Text>Dark Screen</Text>
      <Button onPress={() => navigation.navigate('Screen1')}>
        Next screen
      </Button>
    </View>
  );
}
// codeblock-focus-end

const RootStack = createNativeStackNavigator({
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Screen1: Screen1,
    Screen2: Screen2,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Different status bar based on tabs" snack
import * as React from 'react';
import { View, Text, StatusBar, StyleSheet } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

function FocusAwareStatusBar(props) {
  const isFocused = useIsFocused();

  return isFocused ? <StatusBar {...props} /> : null;
}

// codeblock-focus-start
function Screen1() {
  const navigation = useNavigation('Screen1');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#6a51ae',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <FocusAwareStatusBar barStyle="light-content" backgroundColor="#6a51ae" />
      <Text style={{ color: '#fff' }}>Light Screen</Text>
      <Button onPress={() => navigation.navigate('Screen2')}>
        Next screen
      </Button>
    </View>
  );
}

function Screen2() {
  const navigation = useNavigation('Screen2');
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: '#ecf0f1',
          paddingTop: insets.top,
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        },
      ]}
    >
      <FocusAwareStatusBar barStyle="dark-content" backgroundColor="#ecf0f1" />
      <Text>Dark Screen</Text>
      <Button onPress={() => navigation.navigate('Screen1')}>
        Next screen
      </Button>
    </View>
  );
}
// codeblock-focus-end

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Screen1" component={Screen1} />
          <Stack.Screen name="Screen2" component={Screen2} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
```

</TabItem>
</Tabs>

Although not necessary, you can use the `FocusAwareStatusBar` component in the screens of the native stack navigator as well.

<div>
  <video playsInline autoPlay muted loop>
    <source src="/assets/statusbar/status-drawer-ios.mp4" />
  </video>

  <video playsInline autoPlay muted loop>
    <source src="/assets/statusbar/status-drawer-android.mp4" />
  </video>

  <video playsInline autoPlay muted loop>
    <source src="/assets/statusbar/status-tab-ios.mp4" />
  </video>

  <video playsInline autoPlay muted loop>
    <source src="/assets/statusbar/status-tab-android.mp4" />
  </video>
</div>

---

## Opening a modal

Source: https://reactnavigation.org/docs/8.x/modal

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

![Modal shown on screen](/assets/modal/modal-demo.gif)

A modal displays content that temporarily blocks interactions with the main view.

A modal is like a popup &mdash; it usually has a different transition animation, and is intended to focus on one particular interaction or piece of content.

## Creating a stack with modal screens

```js name="Modal" snack static2dynamic
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 30 }}>This is the home screen!</Text>
      <Button onPress={() => navigation.navigate('MyModal')}>Open Modal</Button>
    </View>
  );
}

function ModalScreen() {
  const navigation = useNavigation('MyModal');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: 30 }}>This is a modal!</Text>
      <Button onPress={() => navigation.goBack()}>Dismiss</Button>
    </View>
  );
}

function DetailsScreen() {
  return (
    <View>
      <Text>Details</Text>
    </View>
  );
}

// codeblock-focus-start
const HomeStack = createStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        headerShown: false,
      },
    },
    Details: {
      screen: DetailsScreen,
      options: {
        headerShown: false,
      },
    },
  },
});

const RootStack = createStackNavigator({
  groups: {
    Home: {
      screens: {
        App: {
          screen: HomeStack,
          options: { title: 'My App' },
        },
      },
    },
    // highlight-start
    Modal: {
      screenOptions: {
        presentation: 'modal',
      },
      screens: {
        MyModal: ModalScreen,
      },
    },
    // highlight-end
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
// codeblock-focus-end
```

<video playsInline autoPlay muted loop>
  <source src="/assets/modal/modal.mp4" />
</video>

Here, we are creating 2 groups of screens using the `RootStack.Group` component. The first group is for our regular screens, and the second group is for our modal screens. For the modal group, we have specified `presentation: 'modal'` in `screenOptions`. This will apply this option to all the screens inside the group. This option will change the animation for the screens to animate from bottom-to-top rather than right to left. The `presentation` option for stack navigator can be either `card` (default) or `modal`. The `modal` behavior slides the screen in from the bottom and allows the user to swipe down from the top to dismiss it on iOS.

Instead of specifying this option for a group, it's also possible to specify it for a single screen using the `options` prop on `RootStack.Screen`.

## Summary

- To change the type of transition on a stack navigator you can use the [`presentation`](native-stack-navigator.md#presentation) option.
- When `presentation` is set to `modal`, the screens behave like a modal, i.e. they have a bottom to top transition and may show part of the previous screen in the background.
- Setting `presentation: 'modal'` on a group makes all the screens in the group modals, so to use non-modal transitions on other screens, we add another group with the default configuration.

## Best practices

Since modals are intended to be on top of other content, there are a couple of things to keep in mind when using modals:

- Avoid nesting them inside other navigators like tab or drawer. Modal screens should be defined as part of the root stack.
- Modal screens should be the last in the stack - avoid pushing regular screens on top of modals.
- The first screen in a stack appears as a regular screen even if configured as a modal, since there is no screen before it to show behind. So always make sure that modal screens are pushed on top of a regular screen or another modal screen.

---

## Multiple drawers

Source: https://reactnavigation.org/docs/8.x/multiple-drawers

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Sometimes we want to have multiple drawers on the same screen: one on the left and one on the right. This can be achieved in 2 ways:

1. By using [`react-native-drawer-layout`](drawer-layout.md) directly (Recommended).
2. By [nesting](nesting-navigators.md) 2 [drawer navigators](drawer-navigator.md).

## Using `react-native-drawer-layout`

When we have multiple drawers, only one of them shows the list of screens. The second drawer may often be used to show some additional information such as the list of users etc.

In such cases, we can use [`react-native-drawer-layout`](drawer-layout.md) directly to render the second drawer. The drawer navigator will be used to render the first drawer and can be nested inside the second drawer:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import * as React from 'react';
import { View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.openDrawer()}>Open drawer</Button>
    </View>
  );
}

const LeftDrawerScreen = createDrawerNavigator({
  screenOptions: {
    drawerPosition: 'left',
  },
  screens: {
    Home: HomeScreen,
  },
});

function RightDrawerScreen() {
  const [rightDrawerOpen, setRightDrawerOpen] = React.useState(false);

  return (
    <Drawer
      open={rightDrawerOpen}
      onOpen={() => setRightDrawerOpen(true)}
      onClose={() => setRightDrawerOpen(false)}
      drawerPosition="right"
      renderDrawerContent={() => <>{/* Right drawer content */}</>}
    >
      <LeftDrawerScreen />
    </Drawer>
  );
}

const Navigation = createStaticNavigation(RightDrawerScreen);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import * as React from 'react';
import { View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useNavigation } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.openDrawer()}>Open drawer</Button>
    </View>
  );
}

const LeftDrawer = createDrawerNavigator();

const LeftDrawerScreen = () => {
  return (
    <LeftDrawer.Navigator screenOptions={{ drawerPosition: 'left' }}>
      <LeftDrawer.Screen name="Home" component={HomeScreen} />
    </LeftDrawer.Navigator>
  );
};

function RightDrawerScreen() {
  const [rightDrawerOpen, setRightDrawerOpen] = React.useState(false);

  return (
    <Drawer
      open={rightDrawerOpen}
      onOpen={() => setRightDrawerOpen(true)}
      onClose={() => setRightDrawerOpen(false)}
      drawerPosition="right"
      renderDrawerContent={() => <>{/* Right drawer content */}</>}
    >
      <LeftDrawerScreen />
    </Drawer>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RightDrawerScreen />
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

But there is one problem. When we call `navigation.openDrawer()` in our `HomeScreen`, it always opens the left drawer. We don't have access to the right drawer via the `navigation` object since it's not a navigator.

To solve this, we need to use context API to pass down a function to control the right drawer:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import * as React from 'react';
import { View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';

const RightDrawerContext = React.createContext();

function HomeScreen() {
  const { openRightDrawer } = React.useContext(RightDrawerContext);
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.openDrawer()}>Open left drawer</Button>
      <Button onPress={() => openRightDrawer()}>Open right drawer</Button>
    </View>
  );
}

const LeftDrawerScreen = createDrawerNavigator({
  screenOptions: {
    drawerPosition: 'left',
  },
  screens: {
    Home: HomeScreen,
  },
});

function RightDrawerScreen() {
  const [rightDrawerOpen, setRightDrawerOpen] = React.useState(false);

  const value = React.useMemo(
    () => ({
      openRightDrawer: () => setRightDrawerOpen(true),
      closeRightDrawer: () => setRightDrawerOpen(false),
    }),
    []
  );

  return (
    <Drawer
      open={rightDrawerOpen}
      onOpen={() => setRightDrawerOpen(true)}
      onClose={() => setRightDrawerOpen(false)}
      drawerPosition="right"
      renderDrawerContent={() => <>{/* Right drawer content */}</>}
    >
      <RightDrawerContext.Provider value={value}>
        <LeftDrawerScreen />
      </RightDrawerContext.Provider>
    </Drawer>
  );
}

const Navigation = createStaticNavigation(RightDrawerScreen);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import * as React from 'react';
import { View } from 'react-native';
import { Drawer } from 'react-native-drawer-layout';
import { useNavigation } from '@react-navigation/native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';

const RightDrawerContext = React.createContext();

function HomeScreen() {
  const navigation = useNavigation('Home');
  const { openRightDrawer } = React.useContext(RightDrawerContext);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.openDrawer()}>Open left drawer</Button>
      <Button onPress={() => openRightDrawer()}>Open right drawer</Button>
    </View>
  );
}

const LeftDrawer = createDrawerNavigator();

const LeftDrawerScreen = () => {
  return (
    <LeftDrawer.Navigator screenOptions={{ drawerPosition: 'left' }}>
      <LeftDrawer.Screen name="Home" component={HomeScreen} />
    </LeftDrawer.Navigator>
  );
};

function RightDrawerScreen() {
  const [rightDrawerOpen, setRightDrawerOpen] = React.useState(false);

  const value = React.useMemo(
    () => ({
      openRightDrawer: () => setRightDrawerOpen(true),
      closeRightDrawer: () => setRightDrawerOpen(false),
    }),
    []
  );

  return (
    <Drawer
      open={rightDrawerOpen}
      onOpen={() => setRightDrawerOpen(true)}
      onClose={() => setRightDrawerOpen(false)}
      drawerPosition="right"
      renderDrawerContent={() => <>{/* Right drawer content */}</>}
    >
      <RightDrawerContext.Provider value={value}>
        <LeftDrawerScreen />
      </RightDrawerContext.Provider>
    </Drawer>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <RightDrawerScreen />
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

Here, we are using the `RightDrawerContext` to pass down the `openRightDrawer` function to the `HomeScreen`. Then we use `openRightDrawer` to open the right drawer.

## Nesting 2 drawer navigators

An alternative approach is to nest 2 [drawer navigators](drawer-navigator.md) inside each other. This is not recommended since it requires creating an additional screen and more nesting - which can make navigating and type checking more verbose. But this can be useful if both navigators include multiple screens.

Here we have 2 drawer navigators nested inside each other, one is positioned on left and the other on the right:

```js name="Multiple drawers" snack static2dynamic
import * as React from 'react';
import { View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.openDrawer()}>Open drawer</Button>
    </View>
  );
}

const LeftDrawerScreen = createDrawerNavigator({
  screenOptions: {
    drawerPosition: 'left',
  },
  screens: {
    Home: HomeScreen,
  },
});

const RightDrawerScreen = createDrawerNavigator({
  screenOptions: {
    drawerPosition: 'right',
    headerShown: false,
  },
  screens: {
    HomeDrawer: LeftDrawerScreen,
  },
});

const Navigation = createStaticNavigation(RightDrawerScreen);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop>
  <source src="/assets/navigators/drawer/drawer-multiple.mp4" />
</video>

But there is one problem. When we call `navigation.openDrawer()` in our `HomeScreen`, it always opens the left drawer since it's the immediate parent of the screen.

To solve this, we need to use [`navigation.getParent`](navigation-object.md#getparent) to refer to the right drawer which is the parent of the left drawer. So our code would look like:

```js
<Button onPress={() => navigation.openDrawer()} >Open left drawer</Button>
<Button onPress={() => navigation.getParent().openDrawer()}>Open right drawer</Button>
```

However, this means that our button needs to know about the parent navigators, which isn't ideal. If our button is further nested inside other navigators, it'd need multiple `getParent()` calls. To solve this, we can pass the name of the screen where the navigator is to the `getParent` method to directly refer to the desired navigator.

In this case:

- `navigation.getParent('Home').openDrawer()` opens the left drawer since `'Home'` is a screen in the left drawer navigator.
- `navigation.getParent('HomeDrawer').openDrawer()` opens the right drawer since `'HomeDrawer'` is a screen in the right drawer navigator.

To customize the contents of the drawer, we can use the [`drawerContent` prop](drawer-navigator.md#drawercontent) to pass in a function that renders a custom component.

The final code would look like this:

```js name="Multiple drawers navigators" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.getParent('Home').openDrawer()}>
        Open left drawer
      </Button>
      <Button onPress={() => navigation.getParent('HomeDrawer').openDrawer()}>
        Open right drawer
      </Button>
    </View>
  );
}

function RightDrawerContent() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>This is the right drawer</Text>
    </View>
  );
}

const LeftDrawer = createDrawerNavigator({
  screenOptions: {
    drawerPosition: 'left',
  },
  screens: {
    Home: HomeScreen,
  },
});

const RightDrawer = createDrawerNavigator({
  drawerContent: (props) => <RightDrawerContent {...props} />,
  screenOptions: {
    drawerPosition: 'right',
    headerShown: false,
  },
  screens: {
    HomeDrawer: LeftDrawer,
  },
});

const Navigation = createStaticNavigation(RightDrawer);

export default function App() {
  return <Navigation />;
}
```

## Summary

- To have multiple drawers, you can use [`react-native-drawer-layout`](drawer-layout.md) directly in combination with a drawer navigator.
- The [`drawerPosition`](drawer-layout.md#drawerposition) prop can be used to position the drawer on the right.
- The methods to control the drawer can be passed down using context API when using [`react-native-drawer-layout`](drawer-layout.md).
- When nesting multiple navigators, you can use [`navigation.getParent`](navigation-object.md#getparent) with a screen name to refer to the desired drawer.

---

## Screen options with nested navigators

Source: https://reactnavigation.org/docs/8.x/screen-options-resolution

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

In this document we'll explain how [screen options](screen-options.md) work when there are multiple navigators. It's important to understand this so that you put your `options` in the correct place and can properly configure your navigators. If you put them in the wrong place, at best nothing will happen and at worst something confusing and unexpected will happen.

**You can only modify navigation options for a navigator from one of its screen components. This applies equally to navigators that are nested as screens.**

Let's take for example a tab navigator that contains a native stack in each tab. What happens if we set the `options` on a screen inside of the stack?

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Tabs with native stack" snack
import * as React from 'react';
import { View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function A() {
  return <View />;
}

function B() {
  return <View />;
}

// codeblock-focus-start
const HomeStackScreen = createNativeStackNavigator({
  screens: {
    A: {
      screen: A,
      options: {
        tabBarLabel: 'Home',
      },
    },
  },
});

const SettingsStackScreen = createNativeStackNavigator({
  screens: {
    B: {
      screen: B,
      options: {
        tabBarLabel: 'Settings!',
      },
    },
  },
});

const Tab = createBottomTabNavigator({
  screens: {
    Home: HomeStackScreen,
    Settings: SettingsStackScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(Tab);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Tabs with native stack" snack
import * as React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function A() {
  return <View />;
}

function B() {
  return <View />;
}
// codeblock-focus-start
function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen
        name="A"
        component={A}
        options={{ tabBarLabel: 'Home!' }}
      />
    </HomeStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen
        name="B"
        component={B}
        options={{ tabBarLabel: 'Settings!' }}
      />
    </SettingsStack.Navigator>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeStackScreen} />
        <Tab.Screen name="Settings" component={SettingsStackScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

As we mentioned earlier, you can only modify navigation options for a navigator from one of its screen components. `A` and `B` above are screen components in `HomeStack` and `SettingsStack` respectively, not in the tab navigator. So the result will be that the `tabBarLabel` property is not applied to the tab navigator. We can fix this though!

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Tabs with native stack" snack
import * as React from 'react';
import { View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function A() {
  return <View />;
}

function B() {
  return <View />;
}

const HomeStackScreen = createNativeStackNavigator({
  screens: {
    A: A,
  },
});

const SettingsStackScreen = createNativeStackNavigator({
  screens: {
    B: B,
  },
});

// codeblock-focus-start
const Tab = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeStackScreen,
      options: {
        tabBarLabel: 'Home!',
      },
    },
    Settings: {
      screen: SettingsStackScreen,
      options: {
        tabBarLabel: 'Settings!',
      },
    },
  },
});
// codeblock-focus-start

const Navigation = createStaticNavigation(Tab);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Tabs with native stack" snack
import * as React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function A() {
  return <View />;
}

function B() {
  return <View />;
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="A" component={A} />
    </HomeStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen name="B" component={B} />
    </SettingsStack.Navigator>
  );
}

// codeblock-focus-start
export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen
          name="Home"
          component={HomeStackScreen}
          options={{ tabBarLabel: 'Home!' }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsStackScreen}
          options={{ tabBarLabel: 'Settings!' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

When we set the `options` directly on `Screen` components containing the `HomeStack` and `SettingsStack` component, it allows us to control the options for its parent navigator when its used as a screen component. In this case, the options on our stack components configure the label in the tab navigator that renders the stacks.

## Setting parent screen options based on child navigator's state

Imagine the following configuration:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Parent options from a child" snack
import * as React from 'react';
import { View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return <View />;
}

function AccountScreen() {
  return <View />;
}

function SettingsScreen() {
  return <View />;
}

// codeblock-focus-start
const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedScreen,
    Profile: ProfileScreen,
    Account: AccountScreen,
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeTabs,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Parent options from a child" snack
import * as React from 'react';
import { View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return <View />;
}

function AccountScreen() {
  return <View />;
}

function SettingsScreen() {
  return <View />;
}

// codeblock-focus-start
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={HomeTabs} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// codeblock-focus-end
```

</TabItem>
</Tabs>

If we were to set the `headerTitle` with `options` for the `FeedScreen`, this would not work. This is because `App` stack will only look at its immediate children for configuration: `HomeTabs` and `SettingsScreen`.

But we can determine the `headerTitle` option based on the [navigation state](navigation-state.md) of our tab navigator using the `getFocusedRouteNameFromRoute` helper. Let's create a function to get the title first:

```js
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';

function getHeaderTitle(route) {
  // If the focused route is not found, we need to assume it's the initial screen
  // This can happen during if there hasn't been any navigation inside the screen
  // In our case, it's "Feed" as that's the first screen inside the navigator
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'Feed';

  switch (routeName) {
    case 'Feed':
      return 'News feed';
    case 'Profile':
      return 'My profile';
    case 'Account':
      return 'My account';
  }
}
```

Then we can use this function with the `options` prop on `Screen`:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Parent options from a child" snack
import * as React from 'react';
import { View } from 'react-native';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function getHeaderTitle(route) {
  // If the focused route is not found, we need to assume it's the initial screen
  // This can happen during if there hasn't been any navigation inside the screen
  // In our case, it's "Feed" as that's the first screen inside the navigator
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'Feed';

  switch (routeName) {
    case 'Feed':
      return 'News feed';
    case 'Profile':
      return 'My profile';
    case 'Account':
      return 'My account';
  }
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return <View />;
}

function AccountScreen() {
  return <View />;
}

function SettingsScreen() {
  return <View />;
}
const HomeTabs = createBottomTabNavigator({
  screenOptions: {
    headerShown: false,
  },
  screens: {
    Feed: FeedScreen,
    Profile: ProfileScreen,
    Account: AccountScreen,
  },
});

// codeblock-focus-start
const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeTabs,
      options: ({ route }) => ({
        headerTitle: getHeaderTitle(route),
      }),
    },
    Settings: SettingsScreen,
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

```js name="Parent options from a child" snack
import * as React from 'react';
import { View } from 'react-native';
import {
  NavigationContainer,
  useNavigation,
  getFocusedRouteNameFromRoute,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function getHeaderTitle(route) {
  // If the focused route is not found, we need to assume it's the initial screen
  // This can happen during if there hasn't been any navigation inside the screen
  // In our case, it's "Feed" as that's the first screen inside the navigator
  const routeName = getFocusedRouteNameFromRoute(route) ?? 'Feed';

  switch (routeName) {
    case 'Feed':
      return 'News feed';
    case 'Profile':
      return 'My profile';
    case 'Account':
      return 'My account';
  }
}

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return <View />;
}

function AccountScreen() {
  return <View />;
}

function SettingsScreen() {
  return <View />;
}

const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
      <Tab.Screen name="Account" component={AccountScreen} />
    </Tab.Navigator>
  );
}

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        // codeblock-focus-start
        <Stack.Screen
          name="Home"
          component={HomeTabs}
          options={({ route }) => ({
            headerTitle: getHeaderTitle(route),
          })}
        />
        // codeblock-focus-end
        <Stack.Screen name="Settings" component={SettingsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

So what's happening here? With the `getFocusedRouteNameFromRoute` helper, we can get the currently active route name from this child navigator (in this case it's the tab navigator since that's what we're rendering) and setting an appropriate title for the header.

This approach can be used anytime you want to set options for a parent navigator based on a child navigator's state. Common use cases are:

1. Show tab title in stack header: a stack contains a tab navigator and you want to set the title on the stack header (above example)
2. Show screens without tab bar: a tab navigator contains a stack and you want to hide the tab bar on specific screens (not recommended, see [Hiding tab bar in specific screens](hiding-tabbar-in-screens.md) instead)
3. Lock drawer on certain screens: a drawer has a stack inside of it and you want to lock the drawer on certain screens

In many cases, similar behavior can be achieved by reorganizing our navigators. We usually recommend this option if it fits your use case.

For example, for the above use case, instead of adding a tab navigator inside a stack navigator, we can add a stack navigator inside each of the tabs.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Reorganized navigators" snack
import * as React from 'react';
import { View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return <View />;
}

function SettingsScreen() {
  return <View />;
}

// codeblock-focus-start
const FeedStackScreen = createNativeStackNavigator({
  screens: {
    Feed: FeedScreen,
    /* other screens */
  },
});

const ProfileStackScreen = createNativeStackNavigator({
  screens: {
    Profile: ProfileScreen,
    /* other screens */
  },
});

const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedStackScreen,
    Profile: ProfileStackScreen,
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeTabs,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Reorganized navigators" snack
import * as React from 'react';
import { View } from 'react-native';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

function FeedScreen() {
  const navigation = useNavigation('Feed');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function ProfileScreen() {
  return <View />;
}

function SettingsScreen() {
  return <View />;
}

const FeedStack = createNativeStackNavigator();

// codeblock-focus-start
function FeedStackScreen() {
  return (
    <FeedStack.Navigator>
      <FeedStack.Screen name="Feed" component={FeedScreen} />
      {/* other screens */}
    </FeedStack.Navigator>
  );
}

const ProfileStack = createNativeStackNavigator();

function ProfileStackScreen() {
  return (
    <ProfileStack.Navigator>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
      {/* other screens */}
    </ProfileStack.Navigator>
  );
}

const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedStackScreen} />
      <Tab.Screen name="Profile" component={ProfileStackScreen} />
    </Tab.Navigator>
  );
}

const RootStack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <RootStack.Navigator>
        <RootStack.Screen name="Home" component={HomeTabs} />
        <RootStack.Screen name="Settings" component={SettingsScreen} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

Additionally, this lets you push new screens to the feed and profile stacks without hiding the tab bar by adding more routes to those stacks.

If you want to push screens on top of the tab bar (i.e. that don't show the tab bar), then you can add them to the `App` stack instead of adding them into the screens inside the tab navigator.

---

## Custom Android back button behavior

Source: https://reactnavigation.org/docs/8.x/custom-android-back-button-handling

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

By default, when user presses the Android hardware back button, react-navigation will pop a screen or exit the app if there are no screens to pop. This is a sensible default behavior, but there are situations when you might want to implement custom handling.

As an example, consider a screen where user is selecting items in a list, and a "selection mode" is active. On a back button press, you would first want the "selection mode" to be deactivated, and the screen should be popped only on the second back button press. The following code snippet demonstrates the situation. We make use of [`BackHandler`](https://reactnative.dev/docs/backhandler.html) which comes with react-native, along with the `useFocusEffect` hook to add our custom `hardwareBackPress` listener.

Returning `true` from `onBackPress` denotes that we have handled the event, and react-navigation's listener will not get called, thus not popping the screen. Returning `false` will cause the event to bubble up and react-navigation's listener will pop the screen.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Custom android back button" snack
import * as React from 'react';
import { Text, View, BackHandler, StyleSheet } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlatformPressable, Button } from '@react-navigation/elements';

const listData = [{ key: 'Apple' }, { key: 'Orange' }, { key: 'Carrot' }];

// codeblock-focus-start
function ScreenWithCustomBackBehavior() {
  // codeblock-focus-end
  const [selected, setSelected] = React.useState(listData[0].key);
  const [isSelectionModeEnabled, setIsSelectionModeEnabled] =
    React.useState(false);

  // codeblock-focus-start
  // ...

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isSelectionModeEnabled) {
          setIsSelectionModeEnabled(false);
          return true;
        } else {
          return false;
        }
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [isSelectionModeEnabled])
  );
  // codeblock-focus-end

  return (
    <View style={styles.container}>
      {listData.map((item) => (
        <>
          {isSelectionModeEnabled ? (
            <PlatformPressable
              onPress={() => {
                setSelected(item.key);
              }}
              style={{
                textDecorationLine: item.key === selected ? 'underline' : '',
              }}
            >
              <Text
                style={{
                  textDecorationLine: item.key === selected ? 'underline' : '',
                  ...styles.text,
                }}
              >
                {item.key}
              </Text>
            </PlatformPressable>
          ) : (
            <Text style={styles.text}>
              {item.key === selected ? 'Selected: ' : ''}
              {item.key}
            </Text>
          )}
        </>
      ))}
      <Button
        onPress={() => setIsSelectionModeEnabled(!isSelectionModeEnabled)}
      >
        Toggle selection mode
      </Button>
      <Text>Selection mode: {isSelectionModeEnabled ? 'ON' : 'OFF'}</Text>
    </View>
  );
  // codeblock-focus-start

  // ...
}
// codeblock-focus-end

const RootStack = createNativeStackNavigator({
  screens: {
    CustomScreen: ScreenWithCustomBackBehavior,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation />;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    marginBottom: 20,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Custom android back button" snack
import * as React from 'react';
import { Text, View, BackHandler, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { PlatformPressable, Button } from '@react-navigation/elements';

const Stack = createNativeStackNavigator();

const listData = [{ key: 'Apple' }, { key: 'Orange' }, { key: 'Carrot' }];

// codeblock-focus-start
function ScreenWithCustomBackBehavior() {
  // codeblock-focus-end

  const [selected, setSelected] = React.useState(listData[0].key);
  const [isSelectionModeEnabled, setIsSelectionModeEnabled] =
    React.useState(false);
  // codeblock-focus-start
  // ...

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        if (isSelectionModeEnabled) {
          setIsSelectionModeEnabled(false);
          return true;
        } else {
          return false;
        }
      };

      const subscription = BackHandler.addEventListener(
        'hardwareBackPress',
        onBackPress
      );

      return () => subscription.remove();
    }, [isSelectionModeEnabled])
  );
  // codeblock-focus-end

  return (
    <View style={styles.container}>
      {listData.map((item) => (
        <>
          {isSelectionModeEnabled ? (
            <PlatformPressable
              onPress={() => {
                setSelected(item.key);
              }}
              style={{
                textDecorationLine: item.key === selected ? 'underline' : '',
              }}
            >
              <Text
                style={{
                  textDecorationLine: item.key === selected ? 'underline' : '',
                  ...styles.text,
                }}
              >
                {item.key}
              </Text>
            </PlatformPressable>
          ) : (
            <Text style={styles.text}>
              {item.key === selected ? 'Selected: ' : ''}
              {item.key}
            </Text>
          )}
        </>
      ))}
      <Button
        onPress={() => setIsSelectionModeEnabled(!isSelectionModeEnabled)}
      >
        Toggle selection mode
      </Button>
      <Text>Selection mode: {isSelectionModeEnabled ? 'ON' : 'OFF'}</Text>
    </View>
  );
  // codeblock-focus-start

  // ...
}
// codeblock-focus-end

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="CustomScreen"
          component={ScreenWithCustomBackBehavior}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    fontSize: 20,
    marginBottom: 20,
  },
});
```

</TabItem>
</Tabs>

The presented approach will work well for screens that are shown in a `StackNavigator`. Custom back button handling in other situations may not be supported at the moment (eg. A known case when this does not work is when you want to handle back button press in an open drawer. PRs for such use cases are welcome!).

If instead of overriding system back button, you'd like to prevent going back from the screen, see docs for [preventing going back](preventing-going-back.md).

## Why not use component lifecycle methods

At first, you may be inclined to use `componentDidMount` to subscribe for the back press event and `componentWillUnmount` to unsubscribe, or use `useEffect` to add the listener. This approach will not work - learn more about this in [navigation lifecycle](navigation-lifecycle.md).

---

## Animating elements between screens

Source: https://reactnavigation.org/docs/8.x/shared-element-transitions

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This guide covers how to animate elements between screens. This feature is known as a [Shared Element Transition](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/) and it's implemented in the [`@react-navigation/native-stack`](native-stack-navigator.md) with [React Native Reanimated](https://docs.swmansion.com/react-native-reanimated/).

:::warning

Shared Element Transitions are an experimental feature not recommended for production use yet.

**Reanimated 4** supports Shared Element Transitions on the **New Architecture** (Fabric) since **4.2.0**, but the feature is behind a feature flag. You need to [enable the `ENABLE_SHARED_ELEMENT_TRANSITIONS` feature flag](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags#enable_shared_element_transitions) to use it.

Check [the Reanimated documentation](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/) for details and [send feedback to the Reanimated team](https://github.com/software-mansion/react-native-reanimated)

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/shared-element-transitions/shared-element-transitions.mp4" />
</video>

## Pre-requisites

Before continuing this guide make sure your app meets these criteria:

- You are using [`@react-navigation/native-stack`](native-stack-navigator.md). JS-based [`@react-navigation/stack`](stack-navigator.md) or other navigators are not supported.
- You have [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/getting-started) **v4.2.0 or higher** installed and configured.
- You have [enabled the `ENABLE_SHARED_ELEMENT_TRANSITIONS` feature flag](https://docs.swmansion.com/react-native-reanimated/docs/guides/feature-flags#enable_shared_element_transitions).

## Minimal example

To create a shared transition:

1. Use `Animated` components imported from `react-native-reanimated`.
2. Assign the same `sharedTransitionTag` to elements on different screens.
3. Navigate between screens. The transition will start automatically.

```js static2dynamic name="Shared transition"
import * as React from 'react';
import { View, StyleSheet } from 'react-native';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import {
  createNativeStackNavigator,
  createNativeStackScreen,
} from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

import Animated from 'react-native-reanimated';

// codeblock-focus-start
function HomeScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Button onPress={() => navigation.navigate('Details')}>
        Go to Details
      </Button>
      <Animated.Image
        source={{ uri: 'https://picsum.photos/id/39/200' }}
        style={{ width: 300, height: 300 }}
        // highlight-next-line
        sharedTransitionTag="tag"
      />
    </View>
  );
}

function DetailsScreen() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <Button onPress={() => navigation.goBack()}>Go back</Button>
      <Animated.Image
        source={{ uri: 'https://picsum.photos/id/39/200' }}
        style={{ width: 100, height: 100 }}
        // highlight-next-line
        sharedTransitionTag="tag"
      />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
});
```

`sharedTransitionTag` is a string that has to be unique in the context of a single screen, but has to match elements between screens. This prop allows Reanimated to identify and animate the elements, similarly to the [`key`](https://react.dev/learn/rendering-lists#keeping-list-items-in-order-with-key) property, which tells React which element in the list is which.

## Customizing the transition

You can customize the transition by passing a custom `SharedTransition` configuration via the `sharedTransitionStyle` prop. Apply the same `sharedTransitionStyle` to the matching element on the target screen.

The default transition animates `width`, `height`, `originX`, `originY`, `transform`, `backgroundColor`, and `opacity` using `withTiming` with a 500 ms duration.

Currently customization is more limited due to ongoing development. You can't define fully custom animation functions. Instead, use the `SharedTransition` builder class to configure duration and spring-based animations:

```jsx
import { SharedTransition } from 'react-native-reanimated';

// Customize duration and use spring animation
// highlight-next-line
const customTransition = SharedTransition.duration(550).springify();

function HomeScreen() {
  return (
    <Animated.Image
      style={{ width: 300, height: 300 }}
      sharedTransitionTag="tag"
      // highlight-next-line
      sharedTransitionStyle={customTransition}
    />
  );
}
```

Custom transition configuration is not fully finalized and might change in a future release.

## Reference

You can find a full Shared Element Transitions reference in the [React Native Reanimated documentation](https://docs.swmansion.com/react-native-reanimated/docs/shared-element-transitions/overview/).

## Limitations

Shared Element Transitions currently have several limitations to be aware of:

- Only the [native stack navigator](native-stack-navigator.md) is supported
- Other navigators such as JS stack, drawer, and bottom tabs are not supported
- Transitions with native modals don't work properly on iOS
- The feature must be enabled via the `ENABLE_SHARED_ELEMENT_TRANSITIONS` feature flag
- Custom animation functions are not supported; you can only customize duration and use spring-based animations
- Some properties (e.g., `backgroundColor`) are not supported in progress-based transitions (iOS back gesture)
- There are performance bottlenecks with transforms being recalculated too eagerly
- On iOS, you may encounter issues with vertical positioning due to header height information propagation

The limitations will be addressed in future Reanimated releases.

---

## Preventing going back

Source: https://reactnavigation.org/docs/8.x/preventing-going-back

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Sometimes you may want to prevent the user from leaving a screen to avoid losing unsaved changes. There are a couple of things you may want to do in this case:

## Prevent the user from leaving the screen

The `usePreventRemove` hook allows you to prevent the user from leaving a screen. See the [`usePreventRemove`](use-prevent-remove.md) docs for more details.

<details>
<summary>Previous approach</summary>

Previously, the way to do this was to:

- Override the back button in the header
- Disable back swipe gesture
- Override system back button/gesture on Android

However, using the hook has many important differences in addition to being less code:

- It's not coupled to any specific buttons, going back from custom buttons will trigger it as well
- It's not coupled to any specific actions, any action that removes the route from the state will trigger it
- It works across nested navigators, e.g. if the screen is being removed due to an action in the parent navigator
- The user can still swipe back in the stack navigator, however, the swipe will be canceled if the event is prevented
- It's possible to continue the same action that triggered the event

</details>

## Prevent the user from leaving the app

To be able to prompt the user before they leave the app on Android, you can use the `BackHandler` API from React Native:

```js
import { Alert, BackHandler } from 'react-native';

// ...

React.useEffect(() => {
  const onBackPress = () => {
    Alert.alert(
      'Exit App',
      'Do you want to exit?',
      [
        {
          text: 'Cancel',
          onPress: () => {
            // Do nothing
          },
          style: 'cancel',
        },
        { text: 'YES', onPress: () => BackHandler.exitApp() },
      ],
      { cancelable: false }
    );

    return true;
  };

  const backHandler = BackHandler.addEventListener(
    'hardwareBackPress',
    onBackPress
  );

  return () => backHandler.remove();
}, []);
```

On the Web, you can use the `beforeunload` event to prompt the user before they leave the browser tab:

```js
React.useEffect(() => {
  const onBeforeUnload = (event) => {
    // Prevent the user from leaving the page
    event.preventDefault();
    event.returnValue = true;
  };

  window.addEventListener('beforeunload', onBeforeUnload);

  return () => {
    window.removeEventListener('beforeunload', onBeforeUnload);
  };
}, []);
```

:::warning

The user can still close the app by swiping it away from the app switcher or closing the browser tab. Or the app can be closed by the system due to low memory or other reasons. It's also not possible to prevent leaving the app on iOS. We recommend persisting the data and restoring it when the app is opened again instead of prompting the user before they leave the app.

:::

---

## Call a function when focused screen changes

Source: https://reactnavigation.org/docs/8.x/function-after-focusing-screen

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

In this guide we will call a function or render something on screen focusing. This is useful for making additional API calls when a user revisits a particular screen in a Tab Navigator, or to track user events as they tap around our app.

There are multiple approaches available to us:

1. Listening to the `'focus'` event with an event listener.
2. Using the `useFocusEffect` hook provided by react-navigation.
3. Using the `useIsFocused` hook provided by react-navigation.

## Triggering an action with a `'focus'` event listener

We can also listen to the `'focus'` event with an event listener. After setting up an event listener, we must also stop listening to the event when the screen is unmounted.

With this approach, we will only be able to call an action when the screen focuses. This is useful for performing an action such as logging the screen view for analytics.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Focus event listener" snack
// codeblock-focus-start
import * as React from 'react';
import { View } from 'react-native';

// codeblock-focus-end
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';

// codeblock-focus-start
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      alert('Screen is focused');
      // The screen is focused
      // Call any action
    });

    // Return the function to unsubscribe from the event so it gets removed on unmount
    return unsubscribe;
  }, [navigation]);

  return <View />;
}
// codeblock-focus-end

function HomeScreen() {
  return <View />;
}

const MyTabs = createBottomTabNavigator({
  screens: {
    Home: createBottomTabScreen({
      screen: HomeScreen,
    }),
    Profile: createBottomTabScreen({
      screen: ProfileScreen,
    }),
  },
});

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Focus event listener" snack
// codeblock-focus-start
import * as React from 'react';
import { View } from 'react-native';

// codeblock-focus-end
import { NavigationContainer, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// codeblock-focus-start
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  React.useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      alert('Screen is focused');
      // The screen is focused
      // Call any action
    });

    // Return the function to unsubscribe from the event so it gets removed on unmount
    return unsubscribe;
  }, [navigation]);

  return <View />;
}
// codeblock-focus-end

function HomeScreen() {
  return <View />;
}

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

See the [navigation events guide](navigation-events.md) for more details on the event listener API.

In most cases, it's recommended to use the `useFocusEffect` hook instead of adding the listener manually. See below for details.

## Triggering an action with the `useFocusEffect` hook

React Navigation provides a [hook](use-focus-effect.md) that runs an effect when the screen comes into focus and cleans it up when it goes out of focus. This is useful for cases such as adding event listeners, for fetching data with an API call when a screen becomes focused, or any other action that needs to happen once the screen comes into view.

This is particularly handy when we are trying to stop something when the page is unfocused, like stopping a video or audio file from playing, or stopping the tracking of a user's location.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="useFocusEffect hook" snack
import * as React from 'react';
import { View } from 'react-native';
import {
  useFocusEffect,
  createStaticNavigation,
} from '@react-navigation/native';
import {
  createBottomTabNavigator,
  createBottomTabScreen,
} from '@react-navigation/bottom-tabs';

// codeblock-focus-start
function ProfileScreen() {
  useFocusEffect(
    React.useCallback(() => {
      alert('Screen was focused');
      // Do something when the screen is focused
      return () => {
        alert('Screen was unfocused');
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
    Home: createBottomTabScreen({
      screen: HomeScreen,
    }),
    Profile: createBottomTabScreen({
      screen: ProfileScreen,
    }),
  },
});
const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="useFocusEffect hook" snack
import * as React from 'react';
import { View } from 'react-native';
import { NavigationContainer, useFocusEffect } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// codeblock-focus-start
function ProfileScreen() {
  useFocusEffect(
    React.useCallback(() => {
      alert('Screen was focused');
      // Do something when the screen is focused
      return () => {
        alert('Screen was unfocused');
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

const Tab = createBottomTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

See the [`useFocusEffect`](https://reactnavigation.org/docs/use-focus-effect/) documentation for more details.

## Re-rendering screen with the `useIsFocused` hook

React Navigation provides a [hook](use-is-focused.md) that returns a boolean indicating whether the screen is focused or not.

The hook will return `true` when the screen is focused and `false` when our component is no longer focused. This enables us to render something conditionally based on whether the user is on the screen or not.

The `useIsFocused` hook will cause our component to re-render when we focus and unfocus a screen. Using this hook component may introduce unnecessary component re-renders as a screen comes in and out of focus. This could cause issues depending on the type of action we're calling on focusing. Hence we recommend to use this hook only if you need to trigger a re-render. For side-effects such as subscribing to events or fetching data, use the methods described above.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="useIsFocused hook" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { useIsFocused, createStaticNavigation } from '@react-navigation/native';
import {
  createMaterialTopTabNavigator,
  createMaterialTopTabScreen,
} from '@react-navigation/material-top-tabs';

// codeblock-focus-start
function ProfileScreen() {
  // codeblock-focus-end
  // This hook returns `true` if the screen is focused, `false` otherwise
  // codeblock-focus-start
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
    Home: createMaterialTopTabScreen({
      screen: HomeScreen,
    }),
    Profile: createMaterialTopTabScreen({
      screen: ProfileScreen,
    }),
  },
});

const Navigation = createStaticNavigation(MyTabs);

export default function App() {
  return <Navigation />;
}
```

</TabItem>
<TabItem value='dynamic' label='Dynamic' default>

```js name="useIsFocused hook" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer, useIsFocused } from '@react-navigation/native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

// codeblock-focus-start
function ProfileScreen() {
  // codeblock-focus-end
  // This hook returns `true` if the screen is focused, `false` otherwise
  // codeblock-focus-start
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

const Tab = createMaterialTopTabNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Profile" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

This example is also documented in the [`useIsFocused` API documentation](use-is-focused.md).

---

## Navigating without the navigation prop

Source: https://reactnavigation.org/docs/8.x/navigating-without-navigation-prop

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Sometimes you need to trigger a navigation action from places where you do not have access to the `navigation` object, such as a Redux middleware. For such cases, you can dispatch navigation actions use a [`ref` on the navigation container](navigation-container.md#ref).

**Do not** use the `ref` if:

- You need to navigate from inside a component without needing to pass the `navigation` prop down, see [`useNavigation`](use-navigation.md) instead. The `ref` behaves differently, and many helper methods specific to screens aren't available.
- You need to handle deep links or universal links. Doing this with the `ref` has many edge cases. See [configuring links](configuring-links.md) for more information on handling deep linking.
- You need to integrate with third party libraries, such as push notifications, branch etc. See [Integrating with other tools](deep-linking.md#integrating-with-other-tools) instead.

**Do** use the `ref` if:

- You use a state management library such as Redux, where you need to dispatch navigation actions from a middleware.

Note that it's usually better to trigger navigation from user actions such as button presses, rather than from a Redux middleware. Navigating on user action makes the app feel more responsive and provides better UX. So consider this before using the `ref` for navigation. The `ref` is an escape hatch for scenarios that can't be handled with the existing APIs and should only be used in rare situations.

## Usage

You can get access to the root navigation object through a `ref` and pass it to the `RootNavigation` which we will later use to navigate.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import { createStaticNavigation } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';

/* ... */

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation ref={navigationRef} />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import { NavigationContainer } from '@react-navigation/native';
import { navigationRef } from './RootNavigation';

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>{/* ... */}</NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

In the next step, we define `RootNavigation`, which is a simple module with functions that dispatch user-defined navigation actions.

```js
// RootNavigation.js

import { createNavigationContainerRef } from '@react-navigation/native';

export const navigationRef = createNavigationContainerRef();

export function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

// add other navigation functions that you need and export them
```

Then, in any of your javascript modules, import the `RootNavigation` and call functions which you exported from it. You may use this approach outside of your React components and, in fact, it works as well when used from within them.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Using navigate in any js module" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  createStaticNavigation,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

const navigationRef = createNavigationContainerRef();

// codeblock-focus-start
function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

// Example of usage in any of js modules
//import * as RootNavigation from './path/to/RootNavigation.js';

// ...

// RootNavigation.navigate('ChatScreen', { userName: 'Lucy' });

function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigate('Settings', { userName: 'Lucy' })}>
        Go to Settings
      </Button>
    </View>
  );
}
// codeblock-focus-end

function Settings({ route }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Hello {route.params.userName}</Text>
      <Button onPress={() => navigate('Home')}>Go to Home</Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screens: {
    Home: Home,
    Settings: Settings,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation ref={navigationRef} />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Using navigate in any js module" snack
import * as React from 'react';
import { View, Text } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

const navigationRef = createNavigationContainerRef();

// codeblock-focus-start
function navigate(name, params) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params);
  }
}

// Example of usage in any of js modules
//import * as RootNavigation from './path/to/RootNavigation.js';

// ...

// RootNavigation.navigate('ChatScreen', { userName: 'Lucy' });

function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigate('Settings', { userName: 'Lucy' })}>
        Go to Settings
      </Button>
    </View>
  );
}
// codeblock-focus-end

function Settings({ route }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Hello {route.params.userName}</Text>
      <Button onPress={() => navigate('Home')}>Go to Home</Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <RootStack.Navigator>
        <RootStack.Screen name="Home" component={Home} />
        <RootStack.Screen name="Settings" component={Settings} />
      </RootStack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

Apart from `navigate`, you can add other navigation actions:

```js
import { StackActions } from '@react-navigation/native';

// ...

export function push(...args) {
  if (navigationRef.isReady()) {
    navigationRef.dispatch(StackActions.push(...args));
  }
}
```

Note that a stack navigators needs to be rendered to handle this action. You may want to check the [docs for nesting](nesting-navigators.md#navigating-to-a-screen-in-a-nested-navigator) for more details.

When writing tests, you may mock the navigation functions, and make assertions on whether the correct functions are called with the correct parameters.

## Handling initialization

When using this pattern, you need to keep few things in mind to avoid navigation from failing in your app.

- The `ref` is set only after the navigation container renders, this can be async when handling deep links
- A navigator needs to be rendered to be able to handle actions, the `ref` won't be ready without a navigator

If you try to navigate without rendering a navigator or before the navigator finishes mounting, it will print an error and do nothing. So you'll need to add an additional check to decide what to do until your app mounts.

For an example, consider the following scenario, you have a screen somewhere in the app, and that screen dispatches a redux action on `useEffect`/`componentDidMount`. You are listening for this action in your middleware and try to perform navigation when you get it. This will throw an error, because by this time, the parent navigator hasn't finished mounting and isn't ready. Parent's `useEffect`/`componentDidMount` is always called **after** child's `useEffect`/`componentDidMount`.

To avoid this, you can use the `isReady()` method available on the ref as shown in the above examples.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Handling navigation init" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
const navigationRef = createNavigationContainerRef();

function navigate(name, params) {
  if (navigationRef.isReady()) {
    // Perform navigation if the react navigation is ready to handle actions
    navigationRef.navigate(name, params);
  } else {
    // You can decide what to do if react navigation is not ready
    // You can ignore this, or add these actions to a queue you can call later
  }
}
// codeblock-focus-end

function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home</Text>
      <Button onPress={() => navigate('Profile')}>Go to Profile</Button>
    </View>
  );
}

function Profile() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile</Text>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screens: {
    Home: Home,
    Profile: Profile,
  },
});

const Navigation = createStaticNavigation(RootStack);

export default function App() {
  return <Navigation ref={navigationRef} />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Handling navigation init" snack
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  NavigationContainer,
  createNavigationContainerRef,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Button } from '@react-navigation/elements';

const Stack = createNativeStackNavigator();
// codeblock-focus-start
const navigationRef = createNavigationContainerRef();

function navigate(name, params) {
  if (navigationRef.isReady()) {
    // Perform navigation if the react navigation is ready to handle actions
    navigationRef.navigate(name, params);
  } else {
    // You can decide what to do if react navigation is not ready
    // You can ignore this, or add these actions to a queue you can call later
  }
}
// codeblock-focus-end

function Home() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home</Text>
      <Button onPress={() => navigate('Profile')}>Go to Profile</Button>
    </View>
  );
}

function Profile() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Profile" component={Profile} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

If you're unsure if a navigator is rendered, you can call `navigationRef.current.getRootState()`, and it'll return a valid state object if any navigators are rendered, otherwise it will return `undefined`.

---

## Deep linking

Source: https://reactnavigation.org/docs/8.x/deep-linking

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This guide will describe how to configure your app to handle deep links on various platforms. To handle incoming links, you need to handle 2 scenarios:

1. If the app wasn't previously open, the deep link needs to set the initial state
2. If the app was already open, the deep link needs to update the state to reflect the incoming link

React Native provides a [`Linking`](https://reactnative.dev/docs/linking) to get notified of incoming links. React Navigation can integrate with the `Linking` module to automatically handle deep links. On Web, React Navigation can integrate with browser's `history` API to handle URLs on client side. See [configuring links](configuring-links.md) to see more details on how to configure links in React Navigation.

While you don't need to use the `linking` prop from React Navigation, and can handle deep links yourself by using the `Linking` API and navigating from there, it'll be significantly more complicated than using the `linking` prop which handles many edge cases for you. So we don't recommend implementing it by yourself.

Below, we'll go through required configurations so that the deep link integration works.

## Setting up deep links

<Tabs groupId='framework' queryString="framework">
<TabItem value='expo' label='Expo' default>

### Configuring URL scheme

First, you will want to specify a URL scheme for your app. This corresponds to the string before `://` in a URL, so if your scheme is `example` then a link to your app would be `example://`. You can register for a scheme in your `app.json` by adding a string under the scheme key:

```json
{
  "expo": {
    "scheme": "example"
  }
}
```

Next, install `expo-linking` which we'd need to get the deep link prefix:

```bash
npx expo install expo-linking
```

Then you can use `Linking.createURL` to get the prefix for your app:

```js
const linking = {
  prefixes: [Linking.createURL('/'),
};
```

See more details below at [Configuring React Navigation](#configuring-react-navigation).

<details>
<summary>Why use `Linking.createURL`?</summary>

It is necessary to use `Linking.createURL` since the scheme differs between the [Expo Dev Client](https://docs.expo.dev/versions/latest/sdk/dev-client/) and standalone apps.

The scheme specified in `app.json` only applies to standalone apps. In the Expo client app you can deep link using `exp://ADDRESS:PORT/--/` where `ADDRESS` is often `127.0.0.1` and `PORT` is often `19000` - the URL is printed when you run `expo start`. The `Linking.createURL` function abstracts it out so that you don't need to specify them manually.

</details>

If you are using universal links, you need to add your domain to the prefixes as well:

```js
const linking = {
  prefixes: [Linking.createURL('/'), 'https://app.example.com'],
};
```

### Universal Links on iOS

To set up iOS universal Links in your Expo app, you need to configure your [app config](https://docs.expo.dev/workflow/configuration) to include the associated domains and entitlements:

```json
{
  "expo": {
    "ios": {
      "associatedDomains": ["applinks:app.example.com"],
      "entitlements": {
        "com.apple.developer.associated-domains": ["applinks:app.example.com"]
      }
    }
  }
}
```

You will also need to setup [Associated Domains](https://developer.apple.com/documentation/Xcode/supporting-associated-domains) on your server.

See [Expo's documentation on iOS Universal Links](https://docs.expo.dev/linking/ios-universal-links/) for more details.

### App Links on Android

To set up Android App Links in your Expo app, you need to configure your [app config](https://docs.expo.dev/workflow/configuration) to include the `intentFilters`:

```json
{
  "expo": {
    "android": {
      "intentFilters": [
        {
          "action": "VIEW",
          "autoVerify": true,
          "data": [
            {
              "scheme": "https",
              "host": "app.example.com"
            }
          ],
          "category": ["BROWSABLE", "DEFAULT"]
        }
      ]
    }
  }
}
```

You will also need to [declare the association](https://developer.android.com/training/app-links/verify-android-applinks#web-assoc) between your website and your intent filters by hosting a Digital Asset Links JSON file.

See [Expo's documentation on Android App Links](https://docs.expo.dev/linking/android-app-links/) for more details.

</TabItem>
<TabItem value='community-cli' label='Community CLI'>

### Setup on iOS

Let's configure the native iOS app to open based on the `example://` URI scheme.

You'll need to add the `LinkingIOS` folder into your header search paths as described [here](https://reactnative.dev/docs/linking-libraries-ios#step-3). Then you'll need to add the following lines to your or `AppDelegate.swift` or `AppDelegate.mm` file:

<Tabs groupId="ios-lang">
<TabItem value='swift' label='Swift' default>

```swift
func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey : Any] = [:]) -> Bool {
  return RCTLinkingManager.application(app, open: url, options: options)
}
```

</TabItem>
<TabItem value='objc' label='Objective-C'>

```objc
#import <React/RCTLinkingManager.h>

- (BOOL)application:(UIApplication *)application
   openURL:(NSURL *)url
   options:(NSDictionary<UIApplicationOpenURLOptionsKey,id> *)options
{
  return [RCTLinkingManager application:application openURL:url options:options];
}
```

</TabItem>
</Tabs>

If your app is using [Universal Links](https://developer.apple.com/ios/universal-links/), you'll need to add the following code as well:

<Tabs groupId="ios-lang">
<TabItem value='swift' label='Swift' default>

```swift
func application(
  _ application: UIApplication,
  continue userActivity: NSUserActivity,
  restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    return RCTLinkingManager.application(
      application,
      continue: userActivity,
      restorationHandler: restorationHandler
    )
  }
```

</TabItem>
<TabItem value='objc' label='Objective-C'>

```objc
- (BOOL)application:(UIApplication *)application continueUserActivity:(nonnull NSUserActivity *)userActivity
 restorationHandler:(nonnull void (^)(NSArray<id<UIUserActivityRestoring>> * _Nullable))restorationHandler
{
 return [RCTLinkingManager application:application
                  continueUserActivity:userActivity
                    restorationHandler:restorationHandler];
}
```

</TabItem>
</Tabs>

Now you need to add the scheme to your project configuration.

The easiest way to do this is with the `uri-scheme` package by running the following:

```bash
npx uri-scheme add example --ios
```

If you want to do it manually, open the project (e.g. `SimpleApp/ios/SimpleApp.xcworkspace`) in Xcode. Select the project in sidebar and navigate to the info tab. Scroll down to "URL Types" and add one. In the new URL type, set the identifier and the URL scheme to your desired URL scheme.

![Xcode project info URL types with example added](/assets/deep-linking/xcode-linking.png)

To make sure Universal Links work in your app, you also need to setup [Associated Domains](https://developer.apple.com/documentation/Xcode/supporting-associated-domains) on your server.

#### Hybrid React Native and native iOS Applications

If you're using React Navigation within a hybrid app - an iOS app that has both Swift/ObjC and React Native parts - you may be missing the `RCTLinkingIOS` subspec in your `Podfile`, which is installed by default in new React Native projects. To add this, ensure your `Podfile` looks like the following:

```pod
 pod 'React', :path => '../node_modules/react-native', :subspecs => [
    . . . // other subspecs
    'RCTLinkingIOS',
    . . .
  ]
```

### Setup on Android

To configure the external linking in Android, you can create a new intent in the manifest.

The easiest way to do this is with the `uri-scheme` package: `npx uri-scheme add example --android`.

If you want to add it manually, open up `SimpleApp/android/app/src/main/AndroidManifest.xml`, and make the following adjustments:

1. Set `launchMode` of `MainActivity` to `singleTask` in order to receive intent on existing `MainActivity` (this is the default, so you may not need to actually change anything).
2. Add the new [`intent-filter`](http://developer.android.com/training/app-indexing/deep-linking.html#adding-filters) inside the `MainActivity` entry with a `VIEW` type action:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="example" />
    </intent-filter>
</activity>
```

Similar to Universal Links on iOS, you can also use a domain to associate the app with your website on Android by [verifying Android App Links](https://developer.android.com/training/app-links/verify-android-applinks). First, you need to configure your `AndroidManifest.xml`:

1. Add `android:autoVerify="true"` to your `<intent-filter>` entry.
2. Add your domain's `scheme` and `host` in a new `<data>` entry inside the `<intent-filter>`.

After adding them, it should look like this:

```xml
<activity
    android:name=".MainActivity"
    android:launchMode="singleTask">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
    <intent-filter>
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="example" />
    </intent-filter>
    <intent-filter android:autoVerify="true">
        <action android:name="android.intent.action.VIEW" />
        <category android:name="android.intent.category.DEFAULT" />
        <category android:name="android.intent.category.BROWSABLE" />
        <data android:scheme="http" />
        <data android:scheme="https" />
        <data android:host="app.example.com" />
    </intent-filter>
</activity>
```

Then, you need to [declare the association](https://developer.android.com/training/app-links/verify-android-applinks#web-assoc) between your website and your intent filters by hosting a Digital Asset Links JSON file.

</TabItem>
</Tabs>

## Configuring React Navigation

To handle deep links, you need to configure React Navigation to use the `scheme` for parsing incoming deep links:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const linking = {
  prefixes: [
    'example://', // Or `Linking.createURL('/')` for Expo apps
  ],
};

function App() {
  return <Navigation linking={linking} />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const linking = {
  prefixes: [
    'example://', // Or `Linking.createURL('/')` for Expo apps
  ],
};

function App() {
  return (
    <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
      {/* content */}
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

If you are using universal links, you need to add your domain to the prefixes as well:

```js
const linking = {
  prefixes: [
    'example://', // Or `Linking.createURL('/')` for Expo apps
    'https://app.example.com',
  ],
};
```

See [configuring links](configuring-links.md) to see further details on how to configure links in React Navigation.

## Testing deep links

Before testing deep links, make sure that you rebuild and install the app in your emulator/simulator/device.

If you're testing on iOS, run:

```bash
npx react-native run-ios
```

If you're testing on Android, run:

```bash
npx react-native run-android
```

If you're using Expo managed workflow and testing on Expo client, you don't need to rebuild the app. However, you will need to use the correct address and port that's printed when you run `expo start`, e.g. `exp://127.0.0.1:19000/--/`.

If you want to test with your custom scheme in your Expo app, you will need rebuild your standalone app by running `expo build:ios -t simulator` or `expo build:android` and install the resulting binaries.

### Testing with `npx uri-scheme`

The `uri-scheme` package is a command line tool that can be used to test deep links on both iOS & Android. It can be used as follows:

```bash
npx uri-scheme open [your deep link] --[ios|android]
```

For example:

```bash
npx uri-scheme open "example://chat/jane" --ios
```

Or if using Expo client:

```bash
npx uri-scheme open "exp://127.0.0.1:19000/--/chat/jane" --ios
```

### Testing with `xcrun` on iOS

The `xcrun` command can be used as follows to test deep links with the iOS simulator:

```bash
xcrun simctl openurl booted [your deep link]
```

For example:

```bash
xcrun simctl openurl booted "example://chat/jane"
```

### Testing with `adb` on Android

The `adb` command can be used as follows to test deep links with the Android emulator or a connected device:

```bash
adb shell am start -W -a android.intent.action.VIEW -d [your deep link] [your android package name]
```

For example:

```bash
adb shell am start -W -a android.intent.action.VIEW -d "example://chat/jane" com.simpleapp
```

Or if using Expo client:

```bash
adb shell am start -W -a android.intent.action.VIEW -d "exp://127.0.0.1:19000/--/chat/jane" host.exp.exponent
```

## Integrating with other tools

In addition to deep links and universal links with React Native's `Linking` API, you may also want to integrate other tools for handling incoming links, e.g. Push Notifications - so that tapping on a notification can open the app to a specific screen.

To achieve this, you'd need to override how React Navigation subscribes to incoming links. To do so, you can provide your own [`getInitialURL`](navigation-container.md#linkinggetinitialurl) and [`subscribe`](navigation-container.md#linkingsubscribe) functions.

Here is an example integration with [expo-notifications](https://docs.expo.dev/versions/latest/sdk/notifications):

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Expo Notifications"
const linking = {
  prefixes: ['example://', 'https://app.example.com'],

  // Custom function to get the URL which was used to open the app
  async getInitialURL() {
    // First, handle deep links
    const url = await Linking.getInitialURL();

    if (url != null) {
      return url;
    }

    // Handle URL from expo push notifications
    const response = await Notifications.getLastNotificationResponseAsync();

    return response?.notification.request.content.data.url;
  },

  // Custom function to subscribe to incoming links
  subscribe(listener) {
    // Listen to incoming links for deep links
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Listen to expo push notifications when user interacts with them
    const pushNotificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const url = response.notification.request.content.data.url;

        listener(url);
      });

    return () => {
      // Clean up the event listeners
      linkingSubscription.remove();
      pushNotificationSubscription.remove();
    };
  },
};
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Expo Notifications"
const linking = {
  prefixes: ['example://', 'https://app.example.com'],

  // Custom function to get the URL which was used to open the app
  async getInitialURL() {
    // First, handle deep links
    const url = await Linking.getInitialURL();

    if (url != null) {
      return url;
    }

    // Handle URL from expo push notifications
    const response = await Notifications.getLastNotificationResponseAsync();

    return response?.notification.request.content.data.url;
  },

  // Custom function to subscribe to incoming links
  subscribe(listener) {
    // Listen to incoming links for deep links
    const linkingSubscription = Linking.addEventListener('url', ({ url }) => {
      listener(url);
    });

    // Listen to expo push notifications when user interacts with them
    const pushNotificationSubscription =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const url = response.notification.request.content.data.url;

        listener(url);
      });

    return () => {
      // Clean up the event listeners
      linkingSubscription.remove();
      pushNotificationSubscription.remove();
    };
  },

  config: {
    // Deep link configuration
  },
};
```

</TabItem>
</Tabs>

Similar to the above example, you can integrate any API that provides a way to get the initial URL and to subscribe to new incoming URLs using the `getInitialURL` and `subscribe` options.

---

## Configuring links

Source: https://reactnavigation.org/docs/8.x/configuring-links

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

In this guide, we will configure React Navigation to handle external links. This is necessary if you want to:

1. Handle deep links in React Native apps on Android and iOS
2. Enable URL integration in browser when using on web
3. Use [`<Link />`](link.md) or [`useLinkTo`](use-link-to.md) to navigate using paths.

Make sure that you have [configured deep links](deep-linking.md) in your app before proceeding.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

React Navigation handles incoming links by default when using [static configuration](static-configuration.md). All leaf screens in the navigator will be assigned a path based on their name automatically. No additional configuration is necessary.

This is equivalent to specifying [`linking`](navigation-container.md#linking) prop on [`Navigation`](static-configuration.md#createstaticnavigation) with `enabled: 'auto'`.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

The [`NavigationContainer`](navigation-container.md) component accepts a [`linking`](navigation-container.md#linking) prop that makes it easier to handle incoming links.

The `config` option in the `linking` prop lets you specify how paths map to screens in your navigation structure:

```js
import { NavigationContainer } from '@react-navigation/native';

// highlight-start
const linking = {
  config: {
    /* configuration for matching screens with paths */
  },
};
// highlight-end

function App() {
  return (
    <NavigationContainer
      // highlight-next-line
      linking={linking}
    >
      {/* content */}
    </NavigationContainer>
  );
}
```

When you specify the `linking` prop, React Navigation will handle incoming links automatically.

</TabItem>
</Tabs>

On Android and iOS, it'll use React Native's [`Linking` module](https://reactnative.dev/docs/linking) to handle incoming deep links and universal links. On the Web, it'll use the [History API](https://developer.mozilla.org/en-US/docs/Web/API/History_API) to sync the URL with the browser.

You can also pass a [`fallback`](navigation-container.md#fallback) prop that controls what's displayed when React Navigation is trying to resolve the initial deep link URL:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import { createStaticNavigation } from '@react-navigation/native';

function App() {
  return (
    <Navigation
      // highlight-next-line
      fallback={<Text>Loading...</Text>}
    />
  );
}

const Navigation = createStaticNavigation(RootStack);
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import { NavigationContainer } from '@react-navigation/native';

const linking = {
  // ...
};

function App() {
  return (
    <NavigationContainer
      linking={linking}
      // highlight-next-line
      fallback={<Text>Loading...</Text>}
    >
      {/* content */}
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

The behavior can be customized further by specifying additional options in the `linking` prop as described below.

## Prefixes

The `prefixes` option can be optionally used to specify custom schemes (e.g. `example://`) as well as host & domain names (e.g. `https://example.com`) if you have configured [Universal Links](https://developer.apple.com/ios/universal-links/) or [Android App Links](https://developer.android.com/training/app-links).

For example:

```js
const linking = {
  prefixes: ['example://', 'https://example.com'],
};
```

If not specified, it defaults to `['*']`, which will match any host starting with `http`, `https`, and custom schemes such as `myapp://`. You only need to specify `prefixes` if you're using **Expo Go** or want to restrict the URLs your app handles.

Note that the `prefixes` option has no effect on Web. The host & domain names will be automatically determined from the Website URL in the browser.

### Multiple subdomains​

To match all subdomains of an associated domain, you can specify a wildcard by prefixing `*`. before the beginning of a specific domain. Note that an entry for `*.example.com` does not match `example.com` because of the period after the asterisk. To enable matching for both `*.example.com` and `example.com`, you need to provide a separate prefix entry for each.

```js
const linking = {
  prefixes: ['example://', 'https://example.com', 'https://*.example.com'],
};
```

## Filtering certain paths

Sometimes we may not want to handle all incoming links. For example, we may want to filter out links meant for authentication (e.g. `expo-auth-session`) or other purposes instead of navigating to a specific screen.

To achieve this, you can use the `filter` option:

```js
const linking = {
  prefixes: ['example://', 'https://example.com'],
  // highlight-next-line
  filter: (url) => !url.includes('+expo-auth-session'),
};
```

This is not supported on Web as we always need to handle the URL of the page.

## Apps under subpaths

If your app is hosted under a subpath, you can specify the subpath at the top-level of the `config`. For example, if your app is hosted at `https://example.com/app`, you can specify the `path` as `app`:

```js
const linking = {
  prefixes: ['example://', 'https://example.com'],
  config: {
    // highlight-next-line
    path: 'app',

    // ...
  },
};
```

It's not possible to specify params here since this doesn't belong to a screen, e.g. `app/:id` won't work.

## Mapping path to route names

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

If you specify `enabled: 'auto'` in the `linking` prop, React Navigation will automatically generate paths for all screens. For example, if you have a `Profile` screen in the navigator, it'll automatically generate a path for it as `profile`.

If you wish to handle the configuration manually, or want to override the generated path for a specific screen, you can specify `linking` property next to the screen in the navigator to map a path to a screen. For example:

```js
const RootStack = createStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      // highlight-start
      linking: {
        path: 'user',
      },
      // highlight-end
    },
    Chat: {
      screen: ChatScreen,
      // highlight-start
      linking: {
        path: 'feed/:sort',
      },
      // highlight-end
    },
  },
});
```

In this example:

- `Chat` screen that handles the URL `/feed` with the param `sort` (e.g. `/feed/latest` - the `Chat` screen will receive a param `sort` with the value `latest`).
- `Profile` screen that handles the URL `/user`.

Similarly, when you have a nested navigator, you can specify the `linking` property for the screens in the navigator to handle the path for the nested screens:

```js
const HomeTabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      // highlight-start
      linking: {
        path: 'home',
      },
      // highlight-end
    },
    Settings: {
      screen: SettingsScreen,
      // highlight-start
      linking: {
        path: 'settings',
      },
      // highlight-end
    },
  },
});

const RootStack = createStackNavigator({
  screens: {
    HomeTabs: {
      screen: HomeTabs,
    },
    Profile: {
      screen: ProfileScreen,
      // highlight-start
      linking: {
        path: 'user',
      },
      // highlight-end
    },
    Chat: {
      screen: ChatScreen,
      // highlight-start
      linking: {
        path: 'feed/:sort',
      },
      // highlight-end
    },
  },
});
```

In the above example, the following path formats are handled:

- `/home` navigates to the `HomeTabs` -> `Home` screen
- `/settings` navigates to the `HomeTabs` -> `Settings` screen
- `/user` navigates to the `Profile` screen
- `/feed/:sort` navigates to the `Chat` screen with the param `sort`

### How does automatic path generation work?

When using automatic path generation with `enabled: 'auto'`, the following rules are applied:

- Screens with an explicit `linking` property are not used for path generation and will be added as-is.
- Screen names will be converted from `PascalCase` to `kebab-case` to use as the path (e.g. `NewsFeed` -> `news-feed`).
- Unless a screen has explicit empty path (`path: ''`) to use for the homepage, the first leaf screen encountered will be used as the homepage.
- Path generation only handles leaf screens, i.e. no path is generated for screens containing nested navigators. It's still possible to specify a path for them with an explicit `linking` property.

Let's say we have the following navigation structure:

```js
const HomeTabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
    },
    Settings: {
      screen: SettingsScreen,
    },
  },
});

const RootStack = createStackNavigator({
  screens: {
    HomeTabs: {
      screen: HomeTabs,
    },
    Profile: {
      screen: ProfileScreen,
    },
    Chat: {
      screen: ChatScreen,
    },
  },
});
```

With automatic path generation, the following paths will be generated:

- `/` navigates to the `HomeTabs` -> `Home` screen
- `/settings` navigates to the `HomeTabs` -> `Settings` screen
- `/profile` navigates to the `Profile` screen
- `/chat` navigates to the `Chat` screen

If the URL contains a query string, it'll be passed as params to the screen. For example, the URL `/profile?user=jane` will pass the `user` param to the `Profile` screen.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

If you specify a `linking` option, by default React Navigation will use the path segments as the route name when parsing the URL. However, directly translating path segments to route names may not be the expected behavior.

You can specify the [`config`](navigation-container.md#linkingconfig) option in `linking` to control how the deep link is parsed to suit your needs. The config should specify the mapping between route names and path patterns:

```js
const config = {
  screens: {
    Chat: 'feed/:sort',
    Profile: 'user',
  },
};
```

In this example:

- `Chat` screen that handles the URL `/feed` with the param `sort` (e.g. `/feed/latest` - the `Chat` screen will receive a param `sort` with the value `latest`).
- `Profile` screen that handles the URL `/user`.

The config option can then be passed in the `linking` prop to the container:

```js
import { NavigationContainer } from '@react-navigation/native';

const config = {
  screens: {
    Chat: 'feed/:sort',
    Profile: 'user',
  },
};

const linking = {
  prefixes: ['https://example.com', 'example://'],
  config,
};

function App() {
  return (
    <NavigationContainer linking={linking} fallback={<Text>Loading...</Text>}>
      {/* content */}
    </NavigationContainer>
  );
}
```

The config object must match the navigation structure for your app. For example, the above configuration is if you have `Chat` and `Profile` screens in the navigator at the root:

```js
function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Chat" component={ChatScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

If your `Chat` screen is inside a nested navigator, we'd need to account for that. For example, consider the following structure where your `Profile` screen is at the root, but the `Chat` screen is nested inside `Home`:

```js
function App() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}

function HomeScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Chat" component={ChatScreen} />
    </Tab.Navigator>
  );
}
```

For the above structure, our configuration will look like this:

```js
const config = {
  screens: {
    Home: {
      screens: {
        Chat: 'feed/:sort',
      },
    },
    Profile: 'user',
  },
};
```

Similarly, any nesting needs to be reflected in the configuration.
</TabItem>
</Tabs>

<details>
<summary>How it works</summary>

The linking works by translating the URL to a valid [navigation state](navigation-state.md) and vice versa using the configuration provided. For example, the path `/rooms/chat?user=jane` may be translated to a state object like this:

```js
const state = {
  routes: [
    {
      name: 'rooms',
      state: {
        routes: [
          {
            name: 'chat',
            params: { user: 'jane' },
          },
        ],
      },
    },
  ],
};
```

For example, you might want to parse the path `/feed/latest` to something like:

```js
const state = {
  routes: [
    {
      name: 'Chat',
      params: {
        sort: 'latest',
      },
    },
  ];
}
```

See [Navigation State reference](navigation-state.md) for more details on how the state object is structured.

</details>

## Passing params

A common use case is to pass params to a screen to pass some data. For example, you may want the `Profile` screen to have an `id` param to know which user's profile it is. It's possible to pass params to a screen through a URL when handling deep links.

By default, query params are parsed to get the params for a screen. For example, with the above example, the URL `/user?id=jane` will pass the `id` param to the `Profile` screen.

You can also customize how the params are parsed from the URL. Let's say you want the URL to look like `/user/jane` where the `id` param is `jane` instead of having the `id` in query params. You can do this by specifying `user/:id` for the `path`. **When the path segment starts with `:`, it'll be treated as a param**. For example, the URL `/user/jane` would resolve to `Profile` screen with the string `jane` as a value of the `id` param and will be available in `route.params.id` in `Profile` screen.

By default, all params are treated as strings. You can also customize how to parse them by specifying a function in the `parse` property to parse the param, and a function in the `stringify` property to convert it back to a string.

If you wanted to resolve `/user/@jane/settings` to result in the params `{ id: 'jane' section: 'settings' }`, you could make `Profile`'s config to look like this:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      // highlight-start
      linking: {
        path: 'user/:id/:section',
        parse: {
          id: (id) => id.replace(/^@/, ''),
        },
        stringify: {
          id: (id) => `@${id}`,
        },
      },
      // highlight-end
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Profile: {
      // highlight-start
      path: 'user/:id/:section',
      parse: {
        id: (id) => id.replace(/^@/, ''),
      },
      stringify: {
        id: (id) => `@${id}`,
      },
      // highlight-end
    },
  },
};
```

</TabItem>
</Tabs>

<details>
<summary>Result Navigation State</summary>

With this configuration, the path `/user/@jane/settings` will resolve to the following state object:

```js
const state = {
  routes: [
    {
      name: 'Profile',
      params: { id: 'jane', section: 'settings' },
    },
  ],
};
```

</details>

## Marking params as optional

Sometimes a param may or may not be present in the URL depending on certain conditions. For example, in the above scenario, you may not always have the section parameter in the URL, i.e. both `/user/jane/settings` and `/user/jane` should go to the `Profile` screen, but the `section` param (with the value `settings` in this case) may or may not be present.

In this case, you would need to mark the `section` param as optional. You can do it by adding the `?` suffix after the param name:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      linking: {
        // highlight-next-line
        path: 'user/:id/:section?',
        parse: {
          id: (id) => `user-${id}`,
        },
        stringify: {
          id: (id) => id.replace(/^user-/, ''),
        },
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Profile: {
      // highlight-next-line
      path: 'user/:id/:section?',
      parse: {
        id: (id) => `user-${id}`,
      },
      stringify: {
        id: (id) => id.replace(/^user-/, ''),
      },
    },
  },
};
```

</TabItem>
</Tabs>

<details>
<summary>Result Navigation State</summary>

With this configuration, the path `/user/jane` will resolve to the following state object:

```js
const state = {
  routes: [
    {
      name: 'Profile',
      params: { id: 'user-jane' },
    },
  ],
};
```

If the URL contains a `section` param (e.g. `/user/jane/settings`), this will result in the following with the same config:

```js
const state = {
  routes: [
    {
      name: 'Profile',
      params: { id: 'user-jane', section: 'settings' },
    },
  ],
};
```

</details>

## Handling unmatched routes or 404

If your app is opened with an invalid URL, most of the times you'd want to show an error page with some information. On the web, this is commonly known as 404 - or page not found error.

To handle this, you'll need to define a catch-all route that will be rendered if no other routes match the path. You can do it by specifying `*` for the path matching pattern:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: {
      screen: FeedScreen,
    },
    Profile: {
      screen: HomeScreen,
      linking: {
        path: 'users/:id',
      },
    },
    Settings: {
      screen: SettingsScreen,
      linking: {
        path: 'settings',
      },
    },
  },
});

const RootStack = createStackNavigator({
  screens: {
    Home: {
      screen: HomeTabs,
    },
    NotFound: {
      screen: NotFoundScreen,
      linking: {
        // highlight-next-line
        path: '*',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Home: {
      initialRouteName: 'Feed',
      screens: {
        Profile: 'users/:id',
        Settings: 'settings',
      },
    },
    NotFound: {
      // highlight-start
      path: '*',
    },
  },
};
```

</TabItem>
</Tabs>

Here, we have defined a route named `NotFound` and set it to match `*` aka everything. If the path didn't match `user/:id` or `settings`, it'll be matched by this route.

<details>
<summary>Result Navigation State</summary>

With this configuration, a path like `/library` or `/settings/notification` will resolve to the following state object:

```js
const state = {
  routes: [{ name: 'NotFound' }],
};
```

</details>

You can even go more specific, for example, say if you want to show a different screen for invalid paths under `/settings`, you can specify such a pattern under `Settings`:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const SettingsStack = createStackNavigator({
  screens: {
    UserSettings: {
      screen: UserSettingsScreen,
      linking: {
        path: 'user-settings',
      },
    },
    InvalidSettings: {
      screen: InvalidSettingsScreen,
      linking: {
        // highlight-next-line
        path: '*',
      },
    },
  },
});

const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: {
      screen: FeedScreen,
    },
    Profile: {
      screen: HomeScreen,
      linking: {
        path: 'users/:id',
      },
    },
    Settings: {
      screen: SettingsStack,
    },
  },
});

const RootStack = createStackNavigator({
  screens: {
    Home: {
      screen: HomeTabs,
    },
    NotFound: {
      screen: NotFoundScreen,
      linking: {
        path: '*',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Home: {
      initialRouteName: 'Feed',
      screens: {
        Profile: 'users/:id',
        Settings: {
          path: 'settings',
          screens: {
            InvalidSettings: '*',
          },
        },
      },
    },
    NotFound: '*',
  },
};
```

</TabItem>
</Tabs>

<details>
<summary>Result Navigation State</summary>

With this configuration, the path `/settings/notification` will resolve to the following state object:

```js
const state = {
  routes: [
    {
      name: 'Home',
      state: {
        index: 1,
        routes: [
          { name: 'Feed' },
          {
            name: 'Settings',
            state: {
              routes: [
                { name: 'InvalidSettings', path: '/settings/notification' },
              ],
            },
          },
        ],
      },
    },
  ],
};
```

</details>

The `route` passed to the `NotFound` screen will contain a `path` property which corresponds to the path that opened the page. If you need, you can use this property to customize what's shown in this screen, e.g. load the page in a `WebView`:

```js
function NotFoundScreen({ route }) {
  if (route.path) {
    return <WebView source={{ uri: `https://mywebsite.com/${route.path}` }} />;
  }

  return <Text>This screen doesn't exist!</Text>;
}
```

When doing server rendering, you'd also want to return correct status code for 404 errors. See [server rendering docs](server-rendering.md#handling-404-or-other-status-codes) for a guide on how to handle it.

## Rendering an initial route

Sometimes you want to ensure that a certain screen will always be present as the first screen in the navigator's state. You can use the `initialRouteName` property to specify the screen to use for the initial screen.

In the above example, if you want the `Feed` screen to be the initial route in the navigator under `Home`, your config will look like this:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: {
      screen: FeedScreen,
    },
    Profile: {
      screen: HomeScreen,
      linking: {
        path: 'users/:id',
      },
    },
    Settings: {
      screen: SettingsScreen,
      linking: {
        path: 'settings',
      },
    },
  },
});

const RootStack = createStackNavigator({
  screens: {
    Home: {
      screen: HomeTabs,
      linking: {
        // highlight-next-line
        initialRouteName: 'Feed',
      },
    },
    NotFound: {
      screen: NotFoundScreen,
      linking: {
        path: '*',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Home: {
      // highlight-next-line
      initialRouteName: 'Feed',
      screens: {
        Profile: 'users/:id',
        Settings: 'settings',
      },
    },
  },
};
```

</TabItem>
</Tabs>

<details>
<summary>Result Navigation State</summary>

With this configuration, the path `/users/42` will resolve to the following state object:

```js
const state = {
  routes: [
    {
      name: 'Home',
      state: {
        index: 1,
        routes: [
          { name: 'Feed' },
          {
            name: 'Profile',
            params: { id: '42' },
          },
        ],
      },
    },
  ],
};
```

</details>

:::warning

The `initialRouteName` will add the screen to React Navigation's state only. If your app is running on the Web, the browser's history will not contain this screen as the user has never visited it. So, if the user presses the browser's back button, it'll not go back to this screen.

:::

Another thing to keep in mind is that it's not possible to pass params to the initial screen through the URL. So make sure that your initial route doesn't need any params or specify `initialParams` in the screen configuration to pass the required params.

In this case, any params in the URL are only passed to the `Profile` screen which matches the path pattern `users/:id`, and the `Feed` screen doesn't receive any params. If you want to have the same params in the `Feed` screen, you can specify a [custom `getStateFromPath` function](navigation-container.md#linkinggetstatefrompath) and copy those params.

Similarly, if you want to access params of a parent screen from a child screen, you can use [React Context](https://react.dev/reference/react/useContext) to expose them.

## Matching exact paths

By default, paths defined for each screen are matched against the URL relative to their parent screen's path. Consider the following config:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const ProfileTabs = createBottomTabNavigator({
  screens: {
    Profile: {
      screen: HomeScreen,
      linking: {
        path: 'users/:id',
      },
    },
  },
});

const RootStack = createStackNavigator({
  screens: {
    Home: {
      screen: ProfileTabs,
      linking: {
        path: 'feed',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Home: {
      path: 'feed',
      screens: {
        Profile: 'users/:id',
      },
    },
  },
};
```

</TabItem>
</Tabs>

Here, you have a `path` property defined for the `Home` screen, as well as the child `Profile` screen. The profile screen specifies the path `users/:id`, but since it's nested inside a screen with the path `feed`, it'll try to match the pattern `feed/users/:id`.

This will result in the URL `/feed` navigating to `Home` screen, and `/feed/users/cal` navigating to the `Profile` screen.

In this case, it makes more sense to navigate to the `Profile` screen using a URL like `/users/cal`, rather than `/feed/users/cal`. To achieve this, you can override the relative matching behavior to `exact` matching:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const ProfileTabs = createBottomTabNavigator({
  screens: {
    Profile: {
      screen: HomeScreen,
      linking: {
        path: 'users/:id',
        // highlight-next-line
        exact: true,
      },
    },
  },
});

const RootStack = createStackNavigator({
  screens: {
    Home: {
      screen: ProfileTabs,
      linking: {
        path: 'feed',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Home: {
      path: 'feed',
      screens: {
        Profile: {
          path: 'users/:id',
          // highlight-next-line
          exact: true,
        },
      },
    },
  },
};
```

</TabItem>
</Tabs>

With `exact` property set to `true`, `Profile` will ignore the parent screen's `path` config and you'll be able to navigate to `Profile` using a URL like `users/cal`.

## Omitting a screen from path

Sometimes, you may not want to have the route name of a screen in the path. For example, let's say you have a `Home` screen and the following config. When the page is opened in the browser you'll get `/home` as the URL:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Home: {
      screen: ProfileScreen,
      linking: {
        path: 'home',
      },
    },
    Profile: {
      screen: HomeScreen,
      linking: {
        path: 'users/:id',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Home: {
      path: 'home',
    },
    Profile: 'users/:id',
  },
};
```

</TabItem>
</Tabs>

But it'll be nicer if the URL was just `/` when visiting the home screen.

You can specify an empty string as path or not specify a path at all, and React Navigation won't add the screen to the path (think of it like adding empty string to the path, which doesn't change anything):

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Home: {
      screen: ProfileScreen,
      linking: {
        path: '',
      },
    },
    Profile: {
      screen: HomeScreen,
      linking: {
        path: 'users/:id',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Home: {
      path: '',
    },
    Profile: 'users/:id',
  },
};
```

</TabItem>
</Tabs>

## Serializing and parsing params

Since URLs are strings, any params you have for routes are also converted to strings when constructing the path.

For example, say you have the URL `/chat/1589842744264` with the following config:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Chat: {
      screen: ChatScreen,
      linking: {
        path: 'chat/:date',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Chat: 'chat/:date',
  },
};
```

</TabItem>
</Tabs>

When handling the URL, your params will look like this:

```json
{ "date": "1589842744264" }
```

Here, the `date` param was parsed as a string because React Navigation doesn't know that it's supposed to be a timestamp, and hence number. You can customize it by providing a custom function to use for parsing:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Chat: {
      screen: ChatScreen,
      linking: {
        path: 'chat/:date',
        parse: {
          date: Number,
        },
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Chat: {
      path: 'chat/:date',
      parse: {
        date: Number,
      },
    },
  },
};
```

</TabItem>
</Tabs>

You can also provide a your own function to serialize the params. For example, let's say that you want to use a DD-MM-YYYY format in the path instead of a timestamp:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Chat: {
      screen: ChatScreen,
      linking: {
        path: 'chat/:date',
        parse: {
          date: (date) => new Date(date).getTime(),
        },
        stringify: {
          date: (date) => {
            const d = new Date(date);

            return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
          },
        },
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Chat: {
      path: 'chat/:date',
      parse: {
        date: (date) => new Date(date).getTime(),
      },
      stringify: {
        date: (date) => {
          const d = new Date(date);

          return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
        },
      },
    },
  },
};
```

</TabItem>
</Tabs>

Depending on your requirements, you can use this functionality to parse and stringify more complex data.

## Matching regular expressions

If you need more complex matching logic, you can use regular expressions to match the path. For example, if you want to use the pattern `@username` to match a user's profile, you can use a regular expression to match the path. This allows you to have the same path pattern for multiple screens, but fine-tune the matching logic to be more specific for a particular screen.

Regular expressions can be specified between parentheses `(` and `)` in the after a param name. For example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Feed: {
      screen: FeedScreen,
      linking: {
        path: ':sort(latest|popular)',
      },
    },
    Profile: {
      screen: ProfileScreen,
      linking: {
        path: ':username(@[A-Za-z0-9_]+)',
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Feed: ':sort(latest|popular)',
    Profile: ':username(@[A-Za-z0-9_]+)',
  },
};
```

</TabItem>
</Tabs>

This will only match the path if it starts with `@` followed by alphanumeric characters or underscores. For example, the URL `/@jane` will match the `Profile` screen, but `/jane` won't.

Regular expressions are intended to only match path segments, not the entire path. So avoid using `/`, `^`, `$`, etc. in the regular expressions.

:::warning

Regular expressions are an advanced feature. They cannot be validated to warn you about potential issues, so it's up to you to ensure that the regular expression is correct.

:::

## Alias for paths

If you want to have multiple paths for the same screen, you can use the `alias` property to specify an array of paths. This can be useful to keep backward compatibility with old URLs while transitioning to a new URL structure.

For example, if you want to match both `/users/:id` and `/:id` to the `Profile` screen, you can do this:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const RootStack = createStackNavigator({
  screens: {
    Profile: {
      screen: ProfileScreen,
      linking: {
        path: ':id',
        alias: ['users/:id'],
      },
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
const config = {
  screens: {
    Profile: {
      path: ':id',
      alias: ['users/:id'],
    },
  },
};
```

</TabItem>
</Tabs>

In this case, when the URL is `/users/jane` or `/jane`, it'll match the `Profile` screen. The `path` is the primary pattern that will be used to generate the URL, e.g. when navigating to the `Profile` screen in the app on the Web. The patterns in `alias` will be ignored when generating URLs. The `alias` patterns are not used for matching any child screens in nested navigators.

On the web, if a screen containing an alias contains a nested navigator, the URL matching the alias will only be used to match the screen, and will be updated to the URL of the focused child screen once the app renders.

Each item in the `alias` array can be a string matching the syntax of the `path` property, or an object with the following properties:

- `path` (required) - The path pattern to match.
- `exact` - Whether to match the path exactly. Defaults to `false`. See [Matching exact paths](#matching-exact-paths) for more details.
- `parse` - Function to parse path segments into param values. See [Passing params](#passing-params) for more details.

## Advanced cases

For some advanced cases, specifying the mapping may not be sufficient. To handle such cases, you can specify a custom function to parse the URL into a state object ([`getStateFromPath`](navigation-container.md#linkinggetstatefrompath)), and a custom function to serialize the state object into an URL ([`getPathFromState`](navigation-container.md#linkinggetpathfromstate)).

Example:

```js
const linking = {
  prefixes: ['https://example.com', 'example://'],
  getStateFromPath(path, options) {
    // Return a state object here
    // You can also reuse the default logic by importing `getStateFromPath` from `@react-navigation/native`
  },
  getPathFromState(state, config) {
    // Return a path string here
    // You can also reuse the default logic by importing `getPathFromState` from `@react-navigation/native`
  },

  // ...
};
```

## Playground

import LinkingTester from '@site/src/components/LinkingTester'

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

Playground is not available for static config.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

You can play around with customizing the config and path below, and see how the path is parsed.

<LinkingTester />

</TabItem>
</Tabs>

---

## React Navigation on Web

Source: https://reactnavigation.org/docs/8.x/web-support

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

React Navigation has built-in support for the Web platform. This allows you to use the same navigation logic in your React Native app as well as on the web. The navigators require using [React Native for Web](https://github.com/necolas/react-native-web) to work on the web.

## Pre-requisites

While Web support works out of the box, there are some things to configure to ensure a good experience on the web:

1. [**Configure linking**](configuring-links.md)

   Configuring linking allows React Navigation to integrate with the browser's URL bar. This is crucial for web apps to have proper URLs for each screen.

2. [**Use Button or Link components**](link.md)

   You may be familiar with using `navigation.navigate` to navigate between screens. But it's important to avoid using it when supporting the web. Instead, use the `Link` or [`Button`](elements.md#button) components to navigate between screens. This ensures that an anchor tag is rendered which provides the expected behavior on the web.

3. [**Server rendering**](server-rendering.md)

   Currently, React Navigation works best with fully client-side rendered apps. However, minimal server-side rendering support is available. So you can optionally choose to server render your app.

4. **Adapt to web-specific behavior**

   Depending on your app's requirements and design, you may also want to tweak some of the navigators' behavior on the web. For example:
   - Change `backBehavior` to `fullHistory` for [tabs](bottom-tab-navigator.md#backbehavior) and [drawer](drawer-navigator.md#backbehavior) on the web to always push a new entry to the browser history.
   - Use sidebars on larger screens instead of [bottom tabs](bottom-tab-navigator.md#tabbarposition) - while not specific to web, responsive design much more important on the web.

:::note

In React Navigation 4, it was necessary to install a separate package called `@react-navigation/web` to use web integration. This package is no longer needed in recent versions of React Navigation. If you have it installed, make sure to uninstall it to avoid conflicts.

:::

## Lazy loading screens

By default, screen components are bundled in the main bundle. This can lead to a large bundle size if you have many screens. It's important to keep the bundle size small on the web for faster loading times.

To reduce the bundle size, you can use [dynamic `import()`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/import) with [`React.lazy`](https://react.dev/reference/react/lazy) to lazy load screens:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Lazy loading screens" snack
import { Suspense, lazy } from 'react';

const MyStack = createNativeStackNavigator({
  screenLayout: ({ children }) => (
    <Suspense fallback={<Loading />}>{children}</Suspense>
  ),
  screens: {
    Home: {
      component: lazy(() => import('./HomeScreen')),
    },
    Profile: {
      component: lazy(() => import('./ProfileScreen')),
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Lazy loading screens" snack
import { Suspense, lazy } from 'react';

const HomeScreen = lazy(() => import('./HomeScreen'));
const ProfileScreen = lazy(() => import('./ProfileScreen'));

function MyStack() {
  return (
    <Stack.Navigator
      screenLayout={({ children }) => (
        <Suspense fallback={<Loading />}>{children}</Suspense>
      )}
    >
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
}
```

:::warning

Make sure to use `React.lazy` **outside** the component containing the navigator configuration. Otherwise, it will return a new component on each render, causing the [screen to be unmounted and remounted](troubleshooting.md#screens-are-unmountingremounting-during-navigation) every time the component rerenders.

:::

</TabItem>
</Tabs>

This will split the screen components into separate chunks (depending on your bundler) which are loaded on-demand when the screen is rendered. This can significantly reduce the initial bundle size.

In addition, you can use the [`screenLayout`](navigator.md#screen-layout) to wrap your screens in a [`<Suspense>`](https://react.dev/reference/react/Suspense) boundary. The suspense fallback can be used to show a loading indicator and will be shown while the screen component is being loaded.

## Web-specific behavior

Some of the navigators have different behavior on the web compared to native platforms:

1. [**Native Stack Navigator**](stack-navigator.md)

   Native Stack Navigator uses the platform's primitives to handle animations and gestures on native platforms. However, animations and gestures are not supported on the web.

2. [**Stack Navigator**](stack-navigator.md)

   Stack Navigator uses [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) to handle swipe gestures on native platforms. However, gestures are not supported on the web.

   In addition, screen transitions are disabled by default on the web. You can enable them by setting `animationEnabled: true` in the navigator's options.

3. [**Drawer Navigator**](drawer-navigator.md)

   Drawer Navigator uses [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) to handle swipe gestures and [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/) for animations on native platforms. However, gestures are not supported on the web, and animations are handled using CSS transitions.

In addition, navigators render hyperlinks on the web when possible, such as in the drawer sidebar, tab bar, stack navigator's back button, etc.

Since `react-native-gesture-handler` and `react-native-reanimated` are not used on the web, avoid importing them in your own code to reduce the bundle size unless you need them for your components. You can use `.native.js` or `.native.ts` extensions for code specific to native platforms.

## Configuring hosting providers

React Navigation is designed for Single Page Applications (SPAs). This usually means that the `index.html` file needs to be served for all routes.

During development, the bundler such as Webpack or Metro automatically handles this. However, when deploying the site, you may need to configure redirects to ensure that the `index.html` file is served for all routes to avoid 404 errors.

Here are instructions for some of the popular hosting providers:

### Netlify

To handle redirects on Netlify, add the following in the `netlify.toml` file at the root of your project:

```toml
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### Vercel

To handle redirects on Vercel, add the following in the `vercel.json` file at the root of your project:

```json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

### GitHub Pages

GitHub Pages doesn't support such redirection configuration for SPAs. There are a couple of ways to work around this:

- Rename your `index.html` to `404.html`. This will serve the `404.html` file for all routes. However, this will cause a 404 status code to be returned for all routes. So it's not ideal for SEO.
- Write a script that copies the `index.html` file to all routes in the build output. For example, if your app has routes `/`, `/about`, and `/contact`, you can copy the `index.html` file to `about.html` and `contact.html`.

---

## Server rendering

Source: https://reactnavigation.org/docs/8.x/server-rendering

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This guide will cover how to server render your React Native app using React Native for Web and React Navigation. We'll cover the following cases:

1. Rendering the correct layout depending on the request URL
2. Setting appropriate page metadata based on the focused screen

:::warning

Server rendering support is currently limited. It's not possible to provide a seamless SSR experience due to a lack of APIs such as media queries. In addition, many third-party libraries often don't work well with server rendering.

:::

## Pre-requisites

Before you follow the guide, make sure that your app already renders fine on server. To do that, you will need to ensure the following:

- All of the dependencies that you use are [compiled before publishing](https://github.com/react-native-community/bob) to npm, so that you don't get syntax errors on Node.
- Node is configured to be able to `require` asset files such as images and fonts. You can try [webpack-isomorphic-tools](https://github.com/catamphetamine/webpack-isomorphic-tools) to do that.
- `react-native` is aliased to `react-native-web`. You can do it with [babel-plugin-module-resolver](https://github.com/tleunen/babel-plugin-module-resolver).

## Rendering the app

First, let's take a look at an example of how you'd do [server rendering with React Native Web](http://necolas.github.io/react-native-web/docs/?path=/docs/guides-server-side--page) without involving React Navigation:

```js
import { AppRegistry } from 'react-native-web';
import ReactDOMServer from 'react-dom/server';
import App from './src/App';

const { element, getStyleElement } = AppRegistry.getApplication('App');

const html = ReactDOMServer.renderToString(element);
const css = ReactDOMServer.renderToStaticMarkup(getStyleElement());

const document = `
  <!DOCTYPE html>
  <html style="height: 100%">
  <meta charset="utf-8">
  <meta httpEquiv="X-UA-Compatible" content="IE=edge">
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover"
  >
  ${css}
  <body style="min-height: 100%">
  <div id="root" style="display: flex; min-height: 100vh">
  ${html}
  </div>
`;
```

Here, `./src/App` is the file where you have `AppRegistry.registerComponent('App', () => App)`.

If you're using React Navigation in your app, this will render the screens rendered by your home page. However, if you have [configured links](configuring-links.md) in your app, you'd want to render the correct screens for the request URL on server so that it matches what'll be rendered on the client.

We can use the [`ServerContainer`](server-container.md) to do that by passing this info in the `location` prop. For example, with Koa, you can use the `path` and `search` properties from the context argument:

```js
app.use(async (ctx) => {
  const location = new URL(ctx.url, 'https://example.org/');

  const { element, getStyleElement } = AppRegistry.getApplication('App');

  const html = ReactDOMServer.renderToString(
    <ServerContainer location={location}>{element}</ServerContainer>
  );

  const css = ReactDOMServer.renderToStaticMarkup(getStyleElement());

  const document = `
    <!DOCTYPE html>
    <html style="height: 100%">
    <meta charset="utf-8">
    <meta httpEquiv="X-UA-Compatible" content="IE=edge">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover"
    >
    ${css}
    <body style="min-height: 100%">
    <div id="root" style="display: flex; min-height: 100vh">
    ${html}
    </div>
`;

  ctx.body = document;
});
```

You may also want to set the correct document title and descriptions for search engines, open graph etc. To do that, you can pass a `ref` to the container which will give you the current screen's options.

```js
app.use(async (ctx) => {
  const location = new URL(ctx.url, 'https://example.org/');

  const { element, getStyleElement } = AppRegistry.getApplication('App');

  const ref = React.createRef<ServerContainerRef>();

  const html = ReactDOMServer.renderToString(
    <ServerContainer
      ref={ref}
      location={location}
    >
      {element}
    </ServerContainer>
  );

  const css = ReactDOMServer.renderToStaticMarkup(getStyleElement());

  const options = ref.current?.getCurrentOptions();

  const document = `
    <!DOCTYPE html>
    <html style="height: 100%">
    <meta charset="utf-8">
    <meta httpEquiv="X-UA-Compatible" content="IE=edge">
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1.00001, viewport-fit=cover"
    >
    ${css}
    <title>${options.title}</title>
    <body style="min-height: 100%">
    <div id="root" style="display: flex; min-height: 100vh">
    ${html}
    </div>
`;

  ctx.body = document;
});
```

Make sure that you have specified a `title` option for your screens:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Stack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        // highlight-next-line
        title: 'My App',
      },
    },
    Profile: {
      screen: ProfileScreen,
      options: ({ route }) => ({
        // highlight-next-line
        title: `${route.params.name}'s Profile`,
      }),
    },
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Stack.Navigator>
  <Stack.Screen
    name="Home"
    component={HomeScreen}
    options={{
      // highlight-next-line
      title: 'My App',
    }}
  />
  <Stack.Screen
    name="Profile"
    component={ProfileScreen}
    options={({ route }) => ({
      // highlight-next-line
      title: `${route.params.name}'s Profile`,
    })}
  />
</Stack.Navigator>
```

</TabItem>
</Tabs>

## Handling 404 or other status codes

When [rendering a screen for an invalid URL](configuring-links.md#handling-unmatched-routes-or-404), we should also return a `404` status code from the server.

First, we need to create a context where we'll attach the status code. To do this, place the following code in a separate file that we will be importing on both the server and client:

```js
import * as React from 'react';

const StatusCodeContext = React.createContext();

export default StatusCodeContext;
```

Then, we need to use the context in our `NotFound` screen. Here, we add a `code` property with the value of `404` to signal that the screen was not found:

```js
function NotFound() {
  const status = React.useContext(StatusCodeContext);

  if (status) {
    status.code = 404;
  }

  return (
    <View>
      <Text>Oops! This URL doesn't exist.</Text>
    </View>
  );
}
```

You could also attach additional information in this object if you need to.

Next, we need to create a status object to pass in the context on our server. By default, we'll set the `code` to `200`. Then pass the object in `StatusCodeContext.Provider` which should wrap the element with `ServerContainer`:

```js
// Create a status object
const status = { code: 200 };

const html = ReactDOMServer.renderToString(
  // Pass the status object via context
  <StatusCodeContext.Provider value={status}>
    <ServerContainer ref={ref} location={location}>
      {element}
    </ServerContainer>
  </StatusCodeContext.Provider>
);

// After rendering, get the status code and use it for server's response
ctx.status = status.code;
```

After we render the app with `ReactDOMServer.renderToString`, the `code` property of the `status` object will be updated to be `404` if the `NotFound` screen was rendered.

You can follow a similar approach for other status codes too, for example, `401` for unauthorized etc.

## Summary

- Use the `location` prop on `ServerContainer` to render correct screens based on the incoming request.
- Attach a `ref` to the `ServerContainer` get options for the current screen.
- Use context to attach more information such as status code.

---

## Screen tracking for analytics

Source: https://reactnavigation.org/docs/8.x/screen-tracking

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

To track the currently active screen, we need to:

1. Add a callback to get notified of state changes
2. Get the root navigator state and find the active route name

To get notified of state changes, we can use the `onStateChange` prop on `NavigationContainer`. To get the root navigator state, we can use the `getRootState` method on the container's ref. Please note that `onStateChange` is not called on initial render so you have to set your initial screen separately.

## Example

This example shows how the approach can be adapted to any mobile analytics SDK.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Screen tracking for analytics" snack
import * as React from 'react';
import { View } from 'react-native';
// codeblock-focus-start
import {
  createStaticNavigation,
  useNavigationContainerRef,
  useNavigation,
} from '@react-navigation/native';
// codeblock-focus-end
import { Button } from '@react-navigation/elements';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function Home() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function Settings() {
  const navigation = useNavigation('Settings');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Home')}>Go to Home</Button>
    </View>
  );
}

const RootStack = createNativeStackNavigator({
  screens: {
    Home: Home,
    Settings: Settings,
  },
});

const Navigation = createStaticNavigation(RootStack);

// codeblock-focus-start

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = React.useRef();

  return (
    <Navigation
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current.getCurrentRoute().name;

        // Replace the line below to add the tracker from a mobile analytics SDK
        await trackScreenView(currentRouteName);
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current.getCurrentRoute().name;
        const trackScreenView = () => {
          // Your implementation of analytics goes here!
        };

        if (previousRouteName !== currentRouteName) {
          // Replace the line below to add the tracker from a mobile analytics SDK
          await trackScreenView(currentRouteName);
        }

        // Save the current route name for later comparison
        routeNameRef.current = currentRouteName;
      }}
    />
  );
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Screen tracking for analytics" snack
import * as React from 'react';
import { View } from 'react-native';
// codeblock-focus-start
import {
  NavigationContainer,
  useNavigation,
  useNavigationContainerRef,
} from '@react-navigation/native';
// codeblock-focus-end
import { Button } from '@react-navigation/elements';
import { createStackNavigator } from '@react-navigation/stack';

function Home() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Settings')}>
        Go to Settings
      </Button>
    </View>
  );
}

function Settings() {
  const navigation = useNavigation('Settings');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('Home')}>Go to Home</Button>
    </View>
  );
}

const Stack = createStackNavigator();

// codeblock-focus-start

export default function App() {
  const navigationRef = useNavigationContainerRef();
  const routeNameRef = React.useRef();

  return (
    <NavigationContainer
      ref={navigationRef}
      onReady={() => {
        routeNameRef.current = navigationRef.current.getCurrentRoute().name;

        // Replace the line below to add the tracker from a mobile analytics SDK
        await trackScreenView(routeNameRef.current);
      }}
      onStateChange={async () => {
        const previousRouteName = routeNameRef.current;
        const currentRouteName = navigationRef.current.getCurrentRoute().name;
        const trackScreenView = () => {
          // Your implementation of analytics goes here!
        };

        if (previousRouteName !== currentRouteName) {
          // Replace the line below to add the tracker from a mobile analytics SDK
          await trackScreenView(currentRouteName);
        }

        // Save the current route name for later comparison
        routeNameRef.current = currentRouteName;
      }}
    >
      {/* ... */}
      // codeblock-focus-end
      <Stack.Navigator>
        <Stack.Screen name="Home" component={Home} />
        <Stack.Screen name="Settings" component={Settings} />
      </Stack.Navigator>
      // codeblock-focus-start
    </NavigationContainer>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

:::note

If you are building a library that wants to provide screen tracking integration with React Navigation, you can accept a [`ref`](navigation-container.md#ref) to the navigation container and use the [`ready`](navigation-container.md#ready) and [`state`](navigation-container.md#state) events instead of `onReady` and `onStateChange` props to keep your logic self-contained.

:::

---

## Themes

Source: https://reactnavigation.org/docs/8.x/themes

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

Themes allow you to change the colors and fonts of various components provided by React Navigation. You can use themes to:

- Customize the colors and fonts to match your brand
- Provide light and dark themes based on the time of the day or user preference

## Basic usage

To pass a custom theme, you can pass the `theme` prop to the navigation container.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Simple theme" snack
// codeblock-focus-start
import * as React from 'react';
import {
  useNavigation,
  createStaticNavigation,
  DefaultTheme,
} from '@react-navigation/native';
// codeblock-focus-end
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'rgb(140, 201, 125)',
    primary: 'rgb(255, 45, 85)',
  },
};
// codeblock-focus-end

function SettingsScreen({ route }) {
  const navigation = useNavigation('Settings');
  const { user } = route.params;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
      <Text>userParam: {JSON.stringify(user)}</Text>
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
        onPress={() =>
          navigation.navigate('Panel', {
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

const Drawer = createDrawerNavigator({
  initialRouteName: 'Panel',
  screens: {
    Home: HomeScreen,
    Panel: PanelStack,
  },
});

// codeblock-focus-start

const Navigation = createStaticNavigation(Drawer);

export default function App() {
  // highlight-next-line
  return <Navigation theme={MyTheme} />;
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Simple theme" snack
// codeblock-focus-start
import * as React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
  useNavigation,
} from '@react-navigation/native';
// codeblock-focus-end
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'rgb(140, 201, 125)',
    primary: 'rgb(255, 45, 85)',
  },
};
// codeblock-focus-end

function SettingsScreen({ route }) {
  const navigation = useNavigation('Settings');
  const { user } = route.params;

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Settings Screen</Text>
      <Text>userParam: {JSON.stringify(user)}</Text>
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
    </View>
  );
}

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
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

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function Root() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

// codeblock-focus-start

export default function App() {
  return (
    // highlight-next-line
    <NavigationContainer theme={MyTheme}>
      <Drawer.Navigator initialRouteName="Root">
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen
          name="Root"
          component={Root}
          options={{ headerShown: false }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
// codeblock-focus-start
```

</TabItem>
</Tabs>

You can change the theme prop dynamically and all the components will automatically update to reflect the new theme. If you haven't provided a `theme` prop, the default theme will be used.

## Properties

A theme is a JS object containing a list of colors to use. It contains the following properties:

- `dark` (`boolean`): Whether this is a dark theme or a light theme
- `colors` (`object`): Various colors used by react navigation components:
  - `primary` (`string`): The primary color of the app used to tint various elements. Usually you'll want to use your brand color for this.
  - `background` (`string`): The color of various backgrounds, such as the background color for the screens.
  - `card` (`string`): The background color of card-like elements, such as headers, tab bars etc.
  - `text` (`string`): The text color of various elements.
  - `border` (`string`): The color of borders, e.g. header border, tab bar border etc.
  - `notification` (`string`): The color of notifications and badge (e.g. badge in bottom tabs).
- `fonts` (`object`): Various fonts used by react navigation components:
  - `regular` (`object`): Style object for the primary font used in the app.
  - `medium` (`object`): Style object for the semi-bold variant of the primary font.
  - `bold` (`object`): Style object for the bold variant of the primary font.
  - `heavy` (`object`): Style object for the extra-bold variant of the primary font.

The style objects for fonts contain the following properties:

- `fontFamily` (`string`): The name of the font family (or font stack on Web) to use, e.g. `Roboto` or `Helvetica Neue`. The system fonts are used by default.
- `fontWeight` (`string`): The font weight to use. Valid values are `normal`, `bold`, `100`, `200`, `300`, `400`, `500`, `600`, `700`, `800`, `900`.

When creating a custom theme, you will need to provide all of these properties.

Example theme:

```js
const WEB_FONT_STACK =
  'system-ui, "Segoe UI", Roboto, Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"';

const MyTheme = {
  dark: false,
  colors: {
    primary: 'rgb(255, 45, 85)',
    background: 'rgb(242, 242, 242)',
    card: 'rgb(255, 255, 255)',
    text: 'rgb(28, 28, 30)',
    border: 'rgb(199, 199, 204)',
    notification: 'rgb(255, 69, 58)',
  },
  fonts: Platform.select({
    web: {
      regular: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '400',
      },
      medium: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '500',
      },
      bold: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '600',
      },
      heavy: {
        fontFamily: WEB_FONT_STACK,
        fontWeight: '700',
      },
    },
    ios: {
      regular: {
        fontFamily: 'System',
        fontWeight: '400',
      },
      medium: {
        fontFamily: 'System',
        fontWeight: '500',
      },
      bold: {
        fontFamily: 'System',
        fontWeight: '600',
      },
      heavy: {
        fontFamily: 'System',
        fontWeight: '700',
      },
    },
    default: {
      regular: {
        fontFamily: 'sans-serif',
        fontWeight: 'normal',
      },
      medium: {
        fontFamily: 'sans-serif-medium',
        fontWeight: 'normal',
      },
      bold: {
        fontFamily: 'sans-serif',
        fontWeight: '600',
      },
      heavy: {
        fontFamily: 'sans-serif',
        fontWeight: '700',
      },
    },
  }),
};
```

Providing a theme will take care of styling of all the official navigators. React Navigation also provides several tools to help you make your customizations of those navigators and the screens within the navigators can use the theme too.

## Using platform colors

Theme colors support `ColorValue` type, which means you can use `PlatformColor`, `DynamicColorIOS` on native, and CSS custom properties on Web for more flexibility.

Example theme using `PlatformColor`:

```js
import { Platform, PlatformColor } from 'react-native';
import { DefaultTheme } from '@react-navigation/native';

const MyTheme = {
  ...DefaultTheme,
  colors: Platform.select({
    ios: () => ({
      primary: PlatformColor('systemRed'),
      background: PlatformColor('systemGroupedBackground'),
      card: PlatformColor('tertiarySystemBackground'),
      text: PlatformColor('label'),
      border: PlatformColor('separator'),
      notification: PlatformColor('systemRed'),
    }),
    android: () => ({
      primary: PlatformColor('@android:color/system_primary_light'),
      background: PlatformColor(
        '@android:color/system_surface_container_light'
      ),
      card: PlatformColor('@android:color/system_background_light'),
      text: PlatformColor('@android:color/system_on_surface_light'),
      border: PlatformColor('@android:color/system_outline_variant_light'),
      notification: PlatformColor('@android:color/holo_red_light'),
    }),
    default: () => DefaultTheme.colors,
  })(),
};
```

This allows your app's navigation UI to automatically adapt to system theme changes and use native colors.

:::note

When using dynamic colors like `PlatformColor` or `DynamicColorIOS`, React Navigation cannot automatically adjust colors in some scenarios (e.g., adjusting the text color based on background color). In these cases, it will fall back to pre-defined colors according to the theme.

:::

## Built-in themes

As operating systems add built-in support for light and dark modes, supporting dark mode is less about keeping hip to trends and more about conforming to the average user expectations for how apps should work. In order to provide support for light and dark mode in a way that is reasonably consistent with the OS defaults, these themes are built in to React Navigation.

You can import the default and dark themes like so:

```js
import { DefaultTheme, DarkTheme } from '@react-navigation/native';
```

## Keeping the native theme in sync

If you're changing the theme in the app, native UI elements such as Alert, ActionSheet etc. won't reflect the new theme. You can do the following to keep the native theme in sync:

```js
React.useEffect(() => {
  const colorScheme = theme.dark ? 'dark' : 'light';

  if (Platform.OS === 'web') {
    document.documentElement.style.colorScheme = colorScheme;
  } else {
    Appearance.setColorScheme(colorScheme);
  }
}, [theme.dark]);
```

Alternatively, you can use the [`useColorScheme`](#using-the-operating-system-preferences) hook to get the current native color scheme and update the theme accordingly.

## Using the operating system preferences

On iOS 13+ and Android 10+, you can get user's preferred color scheme (`'dark'` or `'light'`) with the ([`useColorScheme` hook](https://reactnative.dev/docs/usecolorscheme)).

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Operating system color theme" snack
import * as React from 'react';
// codeblock-focus-start
import {
  useNavigation,
  createStaticNavigation,
  DefaultTheme,
  DarkTheme,
  useTheme,
} from '@react-navigation/native';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
// codeblock-focus-end
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';

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

function MyButton() {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={{ backgroundColor: colors.card }}>
      <Text style={{ color: colors.text }}>Button!</Text>
    </TouchableOpacity>
  );
}

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

const Drawer = createDrawerNavigator({
  initialRouteName: 'Panel',
  screens: {
    Home: HomeScreen,
    Panel: PanelStack,
  },
});

// codeblock-focus-start

const Navigation = createStaticNavigation(Drawer);

export default function App() {
  // highlight-next-line
  const scheme = useColorScheme();

  // highlight-next-line
  return <Navigation theme={scheme === 'dark' ? DarkTheme : DefaultTheme} />;
}

// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Operating system color theme" snack
import * as React from 'react';
// codeblock-focus-start
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useTheme,
} from '@react-navigation/native';
// codeblock-focus-end
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';

function SettingsScreen({ route, navigation }) {
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

function MyButton() {
  const { colors } = useTheme();

  return (
    <TouchableOpacity style={{ backgroundColor: colors.card }}>
      <Text style={{ color: colors.text }}>Button!</Text>
    </TouchableOpacity>
  );
}

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

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function Root() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

// codeblock-focus-start

export default function App() {
  // highlight-next-line
  const scheme = useColorScheme();

  return (
    // highlight-next-line
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer.Navigator>
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen
          name="Root"
          component={Root}
          options={{ headerShown: false }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

## Using the current theme in your own components

To gain access to the theme in any component that is rendered inside the navigation container:, you can use the `useTheme` hook. It returns the theme object:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="System themes" snack
import * as React from 'react';
// codeblock-focus-start
import {
  useNavigation,
  createStaticNavigation,
  DefaultTheme,
  DarkTheme,
  useTheme,
} from '@react-navigation/native';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
// codeblock-focus-end
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';
import { Button } from '@react-navigation/elements';

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

const Drawer = createDrawerNavigator({
  initialRouteName: 'Panel',
  screens: {
    Home: HomeScreen,
    Panel: PanelStack,
  },
});

const Navigation = createStaticNavigation(Drawer);

export default function App() {
  const scheme = useColorScheme();

  return <Navigation theme={scheme === 'dark' ? DarkTheme : DefaultTheme} />;
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="System themes" snack
import * as React from 'react';
// codeblock-focus-start
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import {
  NavigationContainer,
  DefaultTheme,
  DarkTheme,
  useTheme,
  useNavigation,
} from '@react-navigation/native';
// codeblock-focus-end
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createDrawerNavigator } from '@react-navigation/drawer';

function SettingsScreen({ route, navigation }) {
  const { colors } = useTheme();
  const { user } = route.params;

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

const Drawer = createDrawerNavigator();
const Stack = createNativeStackNavigator();

function Root() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}

export default function App() {
  const scheme = useColorScheme();

  return (
    <NavigationContainer theme={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Drawer.Navigator initialRouteName="Root">
        <Drawer.Screen name="Home" component={HomeScreen} />
        <Drawer.Screen
          name="Root"
          component={Root}
          options={{ headerShown: false }}
        />
      </Drawer.Navigator>
    </NavigationContainer>
  );
}
```

</TabItem>
</Tabs>

---

## State persistence

Source: https://reactnavigation.org/docs/8.x/state-persistence

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

You might want to save the user's location in the app, so that they are immediately returned to the same location after the app is restarted.

This is especially valuable during development because it allows the developer to stay on the same screen when they refresh the app.

## Usage

To be able to persist the [navigation state](navigation-state.md), we can use the `persistor` prop of the container. The `persistor` prop accepts an object with two functions:

- `persist` - Function that receives the navigation state as an argument and should save it to storage.
- `restore` - Function that returns the previously saved state from storage, or `undefined` if there's no saved state.

These function can be both synchronous or asynchronous. If a promise is returned from the `restore` function, make sure to provide a [`fallback`](navigation-container.md#fallback).

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js name="Persisting the navigation state" snack dependencies=@react-native-async-storage/async-storage
import * as React from 'react';
// codeblock-focus-start
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useNavigation,
  createStaticNavigation,
} from '@react-navigation/native';
// codeblock-focus-end
import { Button } from '@react-navigation/elements';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

function A() {
  return <View />;
}

function B() {
  const navigation = useNavigation('B');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('C')}>Go to C</Button>
    </View>
  );
}

function C() {
  const navigation = useNavigation('C');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('D')}>Go to D</Button>
    </View>
  );
}

function D() {
  return <View />;
}

const HomeStackScreen = createNativeStackNavigator({
  screens: {
    A: A,
  },
});

const SettingsStackScreen = createNativeStackNavigator({
  screens: {
    B: B,
    C: C,
    D: D,
  },
});

const Tab = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeStackScreen,
      options: {
        headerShown: false,
        tabBarLabel: 'Home!',
      },
    },
    Settings: {
      screen: SettingsStackScreen,
      options: {
        headerShown: false,
        tabBarLabel: 'Settings!',
      },
    },
  },
});

const Navigation = createStaticNavigation(Tab);

// codeblock-focus-start

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

export default function App() {
  return (
    <Navigation
      fallback={<Text>Loading...</Text>}
      persistor={{
        async persist(state) {
          await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
        },
        async restore() {
          const state = await AsyncStorage.getItem(PERSISTENCE_KEY);

          return state ? JSON.parse(state) : undefined;
        },
      }}
    />
  );
}
// codeblock-focus-end
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js name="Persisting the navigation state" snack dependencies=@react-native-async-storage/async-storage
import * as React from 'react';
// codeblock-focus-start
import { View, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer, useNavigation } from '@react-navigation/native';
// codeblock-focus-end
import { Button } from '@react-navigation/elements';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const SettingsStack = createNativeStackNavigator();

function A() {
  return <View />;
}

function B() {
  const navigation = useNavigation('B');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('C')}>Go to C</Button>
    </View>
  );
}

function C() {
  const navigation = useNavigation('C');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Button onPress={() => navigation.navigate('D')}>Go to D</Button>
    </View>
  );
}

function D() {
  return <View />;
}

function HomeStackScreen() {
  return (
    <HomeStack.Navigator>
      <HomeStack.Screen name="A" component={A} />
    </HomeStack.Navigator>
  );
}

function SettingsStackScreen() {
  return (
    <SettingsStack.Navigator>
      <SettingsStack.Screen name="B" component={B} />
      <SettingsStack.Screen name="C" component={C} />
      <SettingsStack.Screen name="D" component={D} />
    </SettingsStack.Navigator>
  );
}

function RootTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen
        name="Home"
        component={HomeStackScreen}
        options={{ tabBarLabel: 'Home!' }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsStackScreen}
        options={{ tabBarLabel: 'Settings!' }}
      />
    </Tab.Navigator>
  );
}

// codeblock-focus-start

const PERSISTENCE_KEY = 'NAVIGATION_STATE_V1';

export default function App() {
  return (
    <NavigationContainer
      fallback={<Text>Loading...</Text>}
      persistor={{
        async persist(state) {
          await AsyncStorage.setItem(PERSISTENCE_KEY, JSON.stringify(state));
        },
        async restore() {
          const state = await AsyncStorage.getItem(PERSISTENCE_KEY);

          return state ? JSON.parse(state) : undefined;
        },
      }}
    >
      <RootTabs />
    </NavigationContainer>
  );
}
// codeblock-focus-end
```

</TabItem>
</Tabs>

This feature is particularly useful in development mode. You can enable it selectively by providing the `persistor` prop only if `__DEV__` is `true`.

While it can be used for production as well, use it with caution as it can make the app unusable if the app is crashing on a particular screen - as the user will still be on the same screen after restarting. So if you are using it in production, make sure to clear the persisted state if an error occurs.

:::warning

It is recommended to use an [error boundary](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary) in your app and clear the persisted state if an error occurs. This will ensure that the app doesn't get stuck in an error state if a screen crashes.

:::

Alternatively, you can manually implement it using the `initialState` and `onStateChange` props. Make sure to not provide an `initialState` if there is a deep link to handle, otherwise the deep link will be ignored.

## Warning: Serializable State

Each param, route, and navigation state must be fully serializable for this feature to work. Typically, you would serialize the state as a JSON string. This means that your routes and params must contain no functions, class instances, or recursive data structures. React Navigation already [warns you during development](troubleshooting.md#i-get-the-warning-non-serializable-values-were-found-in-the-navigation-state) if it encounters non-serializable data, so watch out for the warning if you plan to persist navigation state.

You can modify the initial state object before passing it to container, but note that if your `initialState` isn't a [valid navigation state](navigation-state.md#stale-state-objects), React Navigation may not be able to handle the situation gracefully in some scenarios.

---

## Combining static and dynamic APIs

Source: https://reactnavigation.org/docs/8.x/combine-static-with-dynamic

While the static API has many advantages, it doesn't fit use cases where the navigation configuration needs to be dynamic. So React Navigation supports interop between the static and dynamic APIs.

Keep in mind that the features provided by the static API such as automatic linking configuration and automatic TypeScript types need the whole configuration to be static. If part of the configuration is dynamic, you'll need to handle those parts manually.

There are 2 ways you may want to combine the static and dynamic APIs:

## Static root navigator, dynamic nested navigator

This is useful if you want to keep your configuration static, but need to use a dynamic configuration for a specific navigator.

Let's consider the following example:

- You have a root stack navigator that contains a tab navigator in a screen.
- The tab navigator is defined using the dynamic API.

Our static configuration would look like this:

```js
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
    },
    Feed: {
      screen: FeedScreen,
      linking: {
        path: 'feed',
      },
    },
  },
});
```

Here, `FeedScreen` is a component that renders a tab navigator and is defined using the dynamic API:

```js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const Tab = createBottomTabNavigator();

function FeedScreen() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Latest" component={LatestScreen} />
      <Tab.Screen name="Popular" component={PopularScreen} />
    </Tab.Navigator>
  );
}
```

This code will work, but we're missing 2 things:

- Linking configuration for the screens in the top tab navigator.
- TypeScript types for the screens in the top tab navigator.

Since the nested navigator is defined using the dynamic API, we need to handle these manually. For the linking configuration, we can define the screens in the `linking` property of the `Feed` screen:

```js
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
    },
    Feed: {
      screen: FeedScreen,
      linking: {
        path: 'feed',
        // highlight-start
        screens: {
          Latest: 'latest',
          Popular: 'popular',
        },
        // highlight-end
      },
    },
  },
});
```

Here the `screens` property is the same as how you'd define it with `linking` config with the dynamic API. It can contain configuration for any nested navigators as well. See [configuring links](configuring-links.md) for more details on the API.

For the TypeScript types, we can define the type of the `FeedScreen` component:

```tsx
import {
  StaticScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';

type FeedParamList = {
  Latest: undefined;
  Popular: undefined;
};

// highlight-next-line
type Props = StaticScreenProps<NavigatorScreenParams<FeedParamList>>;

// highlight-next-line
function FeedScreen(_: Props) {
  // ...
}
```

In the above snippet:

1. We first define the param list type for screens in the navigator that defines params for each screen
2. Then we use the `NavigatorScreenParams` type to get the type of route's `params` which will include types for the nested screens
3. Finally, we use the type of `params` with `StaticScreenProps` to define the type of the screen component

This is based on how we'd define the type for a screen with a nested navigator with the dynamic API. See [Type checking screens and params in nested navigator](typescript.md#type-checking-screens-and-params-in-nested-navigator).

## Dynamic root navigator, static nested navigator

This is useful if you already have a dynamic configuration, but want to migrate to the static API. This way you can migrate one navigator at a time.

Let's consider the following example:

- You have a root stack navigator that contains a tab navigator in a screen.
- The root stack navigator is defined using the dynamic API.

Our dynamic configuration would look like this:

```js
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const RootStack = createNativeStackNavigator();

function RootStackScreen() {
  return (
    <RootStack.Navigator>
      <RootStack.Screen name="Home" component={HomeScreen} />
      <RootStack.Screen name="Feed" component={FeedScreen} />
    </RootStack.Navigator>
  );
}
```

Here, `FeedScreen` is a component that renders a tab navigator and is defined using the static API:

```js
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

const FeedTabs = createBottomTabNavigator({
  screens: {
    Latest: {
      screen: LatestScreen,
    },
    Popular: {
      screen: PopularScreen,
    },
  },
});
```

To use the `FeedTabs` navigator for the `Feed` screen, we need to use the `createComponentForStaticNavigation` function:

```js
import { createComponentForStaticNavigation } from '@react-navigation/native';

// highlight-next-line
const FeedScreen = createComponentForStaticNavigation(FeedTabs, 'Feed');
```

In addition, we can generate the TypeScript types for the `FeedTabs` navigator and use it in the types of `RootStack` without needing to write them manually:

```tsx
import {
  StaticParamList,
  NavigatorScreenParams,
} from '@react-navigation/native';

// highlight-next-line
type FeedTabsParamList = StaticParamList<typeof FeedTabs>;

type RootStackParamList = {
  Home: undefined;
  // highlight-next-line
  Feed: NavigatorScreenParams<FeedTabsParamList>;
};
```

Similarly, we can generate the linking configuration for the `FeedTabs` navigator and use it in the linking configuration passed to `NavigationContainer`:

```js
import { createPathConfigForStaticNavigation } from '@react-navigation/native';

// highlight-next-line
const feedScreens = createPathConfigForStaticNavigation(FeedTabs);

const linking = {
  prefixes: ['https://example.com', 'example://'],
  config: {
    screens: {
      Home: '',
      Feed: {
        path: 'feed',
        // highlight-next-line
        screens: feedScreens,
      },
    },
  },
};
```

This will generate the linking configuration for the `Feed` screen based on the configuration of the `FeedTabs` navigator.

---

## Writing tests

Source: https://reactnavigation.org/docs/8.x/testing

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

React Navigation components can be tested in a similar way to other React components. This guide will cover how to write tests for components using React Navigation using [Jest](https://jestjs.io).

## Guiding principles

When writing tests, it's encouraged to write tests that closely resemble how users interact with your app. Keeping this in mind, here are some guiding principles to follow:

- **Test the result, not the action**: Instead of checking if a specific navigation action was called, check if the expected components are rendered after navigation.
- **Avoid mocking React Navigation**: Mocking React Navigation components can lead to tests that don't match the actual logic. Instead, use a real navigator in your tests.

Following these principles will help you write tests that are more reliable and easier to maintain by avoiding testing implementation details.

## Setting up Jest

### Compiling React Navigation

React Navigation ships [ES modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules). However, Jest does not support ES modules natively.

It's necessary to transform the code to CommonJS to use them in tests. The `react-native` preset for Jest does not transform the code in `node_modules` by default. To enable this, you need to add the [`transformIgnorePatterns`](https://jestjs.io/docs/configuration#transformignorepatterns-arraystring) option in your Jest configuration where you can specify a regexp pattern. To compile React Navigation packages, you can add `@react-navigation` to the regexp.

This is usually done in a `jest.config.js` file or the `jest` key in `package.json`:

```diff lang=json
{
  "preset": "react-native",
+   "transformIgnorePatterns": [
+     "node_modules/(?!(@react-native|react-native|@react-navigation)/)"
+   ]
}
```

### Mocking native dependencies

To be able to test React Navigation components, certain dependencies will need to be mocked depending on which components are being used.

If you're using `@react-navigation/stack`, you will need to mock:

- `react-native-gesture-handler`

If you're using `@react-navigation/drawer`, you will need to mock:

- `react-native-reanimated`
- `react-native-gesture-handler`

To add the mocks, create a file `jest/setup.js` (or any other file name of your choice) and paste the following code in it:

```js
// Include this line for mocking react-native-gesture-handler
import 'react-native-gesture-handler/jestSetup';

// Include this section for mocking react-native-reanimated
import { setUpTests } from 'react-native-reanimated';

setUpTests();

// Silence the warning: Animated: `useNativeDriver` is not supported because the native animated module is missing
import { jest } from '@jest/globals';

jest.mock('react-native/Libraries/Animated/NativeAnimatedHelper');
```

Then we need to use this setup file in our jest config. You can add it under [`setupFilesAfterEnv`](https://jestjs.io/docs/configuration#setupfilesafterenv-array) option in a `jest.config.js` file or the `jest` key in `package.json`:

```diff lang=json
{
  "preset": "react-native",
  "transformIgnorePatterns": [
    "node_modules/(?!(@react-native|react-native|@react-navigation)/)"
  ],
+   "setupFilesAfterEnv": ["<rootDir>/jest/setup.js"]
}
```

Jest will run the files specified in `setupFilesAfterEnv` before running your tests, so it's a good place to put your global mocks.

<details>
<summary>Mocking `react-native-screens`</summary>

This shouldn't be necessary in most cases. However, if you find yourself in a need to mock `react-native-screens` component for some reason, you should do it by adding following code in `jest/setup.js` file:

```js
// Include this section for mocking react-native-screens
jest.mock('react-native-screens', () => {
  // Require actual module instead of a mock
  let screens = jest.requireActual('react-native-screens');

  // All exports in react-native-screens are getters
  // We cannot use spread for cloning as it will call the getters
  // So we need to clone it with Object.create
  screens = Object.create(
    Object.getPrototypeOf(screens),
    Object.getOwnPropertyDescriptors(screens)
  );

  // Add mock of the component you need
  // Here is the example of mocking the Screen component as a View
  Object.defineProperty(screens, 'Screen', {
    value: require('react-native').View,
  });

  return screens;
});
```

</details>

If you're not using Jest, then you'll need to mock these modules according to the test framework you are using.

## Fake timers

When writing tests containing navigation with animations, you need to wait until the animations finish. In such cases, we recommend using [`Fake Timers`](https://jestjs.io/docs/timer-mocks) to simulate the passage of time in your tests. This can be done by adding the following line at the beginning of your test file:

```js
jest.useFakeTimers();
```

Fake timers replace real implementation of the native timer functions (e.g. `setTimeout()`, `setInterval()` etc,) with a custom implementation that uses a fake clock. This lets you instantly skip animations and reduce the time needed to run your tests by calling methods such as `jest.runAllTimers()`.

Often, component state is updated after an animation completes. To avoid getting an error in such cases, wrap `jest.runAllTimers()` in `act`:

```js
import { act } from 'react-test-renderer';

// ...

act(() => jest.runAllTimers());
```

See the examples below for more details on how to use fake timers in tests involving navigation.

## Navigation and visibility

In React Navigation, the previous screen is not unmounted when navigating to a new screen. This means that the previous screen is still present in the component tree, but it's not visible.

When writing tests, you should assert that the expected component is visible or hidden instead of checking if it's rendered or not. React Native Testing Library provides a `toBeVisible` matcher that can be used to check if an element is visible to the user.

```js
expect(screen.getByText('Settings screen')).toBeVisible();
```

This is in contrast to the `toBeOnTheScreen` matcher, which checks if the element is rendered in the component tree. This matcher is not recommended when writing tests involving navigation.

By default, the queries from React Native Testing Library (e.g. `getByRole`, `getByText`, `getByLabelText` etc.) [only return visible elements](https://callstack.github.io/react-native-testing-library/docs/api/queries#includehiddenelements-option). So you don't need to do anything special. However, if you're using a different library for your tests, you'll need to account for this behavior.

## Example tests

We recommend using [React Native Testing Library](https://callstack.github.io/react-native-testing-library/) to write your tests.

In this guide, we will go through some example scenarios and show you how to write tests for them using Jest and React Native Testing Library:

### Navigation between tabs

In this example, we have a bottom tab navigator with two tabs: Home and Settings. We will write a test that asserts that we can navigate between these tabs by pressing the tab bar buttons.

<Tabs groupId="example" queryString="example">
<TabItem value="static" label="Static" default>

```js title="MyTabs.js"
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

const HomeScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home screen</Text>
    </View>
  );
};

const SettingsScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Settings screen</Text>
    </View>
  );
};

export const MyTabs = createBottomTabNavigator({
  screens: {
    Home: HomeScreen,
    Settings: SettingsScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js title="MyTabs.js"
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, View } from 'react-native';

const HomeScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home screen</Text>
    </View>
  );
};

const SettingsScreen = () => {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Settings screen</Text>
    </View>
  );
};

const Tab = createBottomTabNavigator();

export const MyTabs = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
};
```

</TabItem>
</Tabs>

<Tabs groupId="example" queryString="example">
<TabItem value="static" label="Static" default>

```js title="MyTabs.test.js"
import { expect, jest, test } from '@jest/globals';
import { createStaticNavigation } from '@react-navigation/native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { MyTabs } from './MyTabs';

jest.useFakeTimers();

test('navigates to settings by tab bar button press', async () => {
  const user = userEvent.setup();

  const Navigation = createStaticNavigation(MyTabs);

  render(<Navigation />);

  const button = screen.getByRole('button', { name: 'Settings, tab, 2 of 2' });

  await user.press(button);

  act(() => jest.runAllTimers());

  expect(screen.getByText('Settings screen')).toBeVisible();
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js title="MyTabs.test.js"
import { expect, jest, test } from '@jest/globals';
import { NavigationContainer } from '@react-navigation/native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { MyTabs } from './MyTabs';

jest.useFakeTimers();

test('navigates to settings by tab bar button press', async () => {
  const user = userEvent.setup();

  render(
    <NavigationContainer>
      <MyTabs />
    </NavigationContainer>
  );

  const button = screen.getByLabelText('Settings, tab, 2 of 2');

  await user.press(button);

  act(() => jest.runAllTimers());

  expect(screen.getByText('Settings screen')).toBeVisible();
});
```

</TabItem>
</Tabs>

In the above test, we:

- Render the `MyTabs` navigator within a [NavigationContainer](navigation-container.md) in our test.
- Get the tab bar button using the `getByLabelText` query that matches its accessibility label.
- Press the button using `userEvent.press(button)` to simulate a user interaction.
- Run all timers using `jest.runAllTimers()` to skip animations (e.g. animations in the `Pressable` for the button).
- Assert that the `Settings screen` is visible after the navigation.

### Reacting to a navigation event

In this example, we have a stack navigator with two screens: Home and Surprise. We will write a test that asserts that the text "Surprise!" is displayed after navigating to the Surprise screen.

<Tabs groupId="example" queryString="example">
<TabItem value="static" label="Static" default>

```js title="MyStack.js"
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { Button, Text, View } from 'react-native';
import { useEffect, useState } from 'react';

const HomeScreen = () => {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home screen</Text>
      <Button
        onPress={() => navigation.navigate('Surprise')}
        title="Click here!"
      />
    </View>
  );
};

const SurpriseScreen = () => {
  const navigation = useNavigation('Surprise');

  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    navigation.addListener('transitionEnd', () => setTextVisible(true));
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {textVisible ? <Text>Surprise!</Text> : ''}
    </View>
  );
};

export const MyStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Surprise: SurpriseScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js title="MyStack.js"
import { useNavigation } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useEffect, useState } from 'react';
import { Button, Text, View } from 'react-native';

const HomeScreen = () => {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home screen</Text>
      <Button
        onPress={() => navigation.navigate('Surprise')}
        title="Click here!"
      />
    </View>
  );
};

const SurpriseScreen = () => {
  const navigation = useNavigation('Surprise');

  const [textVisible, setTextVisible] = useState(false);

  useEffect(() => {
    navigation.addListener('transitionEnd', () => setTextVisible(true));
  }, [navigation]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      {textVisible ? <Text>Surprise!</Text> : ''}
    </View>
  );
};

const Stack = createStackNavigator();

export const MyStack = () => {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Surprise" component={SurpriseScreen} />
    </Stack.Navigator>
  );
};
```

</TabItem>
</Tabs>

<Tabs groupId="example" queryString="example">
<TabItem value="static" label="Static" default>

```js title="MyStack.test.js"
import { expect, jest, test } from '@jest/globals';
import { createStaticNavigation } from '@react-navigation/native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { MyStack } from './MyStack';

jest.useFakeTimers();

test('shows surprise text after navigating to surprise screen', async () => {
  const user = userEvent.setup();

  const Navigation = createStaticNavigation(MyStack);

  render(<Navigation />);

  await user.press(screen.getByLabelText('Click here!'));

  act(() => jest.runAllTimers());

  expect(screen.getByText('Surprise!')).toBeVisible();
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js title="MyStack.test.js"
import { expect, jest, test } from '@jest/globals';
import { NavigationContainer } from '@react-navigation/native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { MyStack } from './MyStack';

jest.useFakeTimers();

test('shows surprise text after navigating to surprise screen', async () => {
  const user = userEvent.setup();

  render(
    <NavigationContainer>
      <MyStack />
    </NavigationContainer>
  );

  await user.press(screen.getByLabelText('Click here!'));

  act(() => jest.runAllTimers());

  expect(screen.getByText('Surprise!')).toBeVisible();
});
```

</TabItem>
</Tabs>

In the above test, we:

- Render the `MyStack` navigator within a [NavigationContainer](navigation-container.md) in our test.
- Get the button using the `getByLabelText` query that matches its title.
- Press the button using `userEvent.press(button)` to simulate a user interaction.
- Run all timers using `jest.runAllTimers()` to skip animations (e.g. navigation animation between screens).
- Assert that the `Surprise!` text is visible after the transition to the Surprise screen is complete.

### Fetching data with `useFocusEffect`

In this example, we have a bottom tab navigator with two tabs: Home and Pokemon. We will write a test that asserts the data fetching logic on focus in the Pokemon screen.

<Tabs groupId="example" queryString="example">
<TabItem value="static" label="Static" default>

```js title="MyTabs.js"
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home screen</Text>
    </View>
  );
}

const url = 'https://pokeapi.co/api/v2/pokemon/ditto';

function PokemonScreen() {
  const [profileData, setProfileData] = useState({ status: 'loading' });

  useFocusEffect(
    useCallback(() => {
      if (profileData.status === 'success') {
        return;
      }

      setProfileData({ status: 'loading' });

      const controller = new AbortController();

      const fetchUser = async () => {
        try {
          const response = await fetch(url, { signal: controller.signal });
          const data = await response.json();

          setProfileData({ status: 'success', data: data });
        } catch (error) {
          setProfileData({ status: 'error' });
        }
      };

      fetchUser();

      return () => {
        controller.abort();
      };
    }, [profileData.status])
  );

  if (profileData.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (profileData.status === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>An error occurred!</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{profileData.data.name}</Text>
    </View>
  );
}

export const MyTabs = createBottomTabNavigator({
  screens: {
    Home: HomeScreen,
    Pokemon: PokemonScreen,
  },
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js title="MyTabs.js"
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useState } from 'react';
import { Text, View } from 'react-native';

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home screen</Text>
    </View>
  );
}

const url = 'https://pokeapi.co/api/v2/pokemon/ditto';

function PokemonInfoScreen() {
  const [profileData, setProfileData] = useState({ status: 'loading' });

  useFocusEffect(
    useCallback(() => {
      if (profileData.status === 'success') {
        return;
      }

      setProfileData({ status: 'loading' });

      const controller = new AbortController();

      const fetchUser = async () => {
        try {
          const response = await fetch(url, { signal: controller.signal });
          const data = await response.json();

          setProfileData({ status: 'success', data: data });
        } catch (error) {
          setProfileData({ status: 'error' });
        }
      };

      fetchUser();

      return () => {
        controller.abort();
      };
    }, [profileData.status])
  );

  if (profileData.status === 'loading') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (profileData.status === 'error') {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>An error occurred!</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>{profileData.data.name}</Text>
    </View>
  );
}

const Tab = createBottomTabNavigator();

export function MyTabs() {
  return (
    <Tab.Navigator screenOptions={{ headerShown: false }}>
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Pokemon" component={PokemonScreen} />
    </Tab.Navigator>
  );
}
```

</TabItem>
</Tabs>

To make the test deterministic and isolate it from the real backend, you can mock the network requests with a library such as [Mock Service Worker](https://mswjs.io/):

```js title="msw-handlers.js"
import { delay, http, HttpResponse } from 'msw';

export const handlers = [
  http.get('https://pokeapi.co/api/v2/pokemon/ditto', async () => {
    await delay(1000);

    return HttpResponse.json({
      id: 132,
      name: 'ditto',
    });
  }),
];
```

Here we setup a handler that mocks responses from the API (for this example we're using [PokéAPI](https://pokeapi.co/)). Additionally, we `delay` the response by 1000ms to simulate a network request delay.

Then, we write a Node.js integration module to use the Mock Service Worker in our tests:

```js title="msw-node.js"
import { setupServer } from 'msw/node';
import { handlers } from './msw-handlers';

const server = setupServer(...handlers);
```

Refer to the documentation of the library to learn more about setting it up in your project - [Getting started](https://mswjs.io/docs/getting-started), [React Native integration](https://mswjs.io/docs/integrations/react-native).

<Tabs groupId="example" queryString="example">
<TabItem value="static" label="Static" default>

```js title="MyTabs.test.js"
import './msw-node';

import { expect, jest, test } from '@jest/globals';
import { createStaticNavigation } from '@react-navigation/native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { MyTabs } from './MyTabs';

jest.useFakeTimers();

test('loads data on Pokemon info screen after focus', async () => {
  const user = userEvent.setup();

  const Navigation = createStaticNavigation(MyTabs);

  render(<Navigation />);

  const homeTabButton = screen.getByLabelText('Home, tab, 1 of 2');
  const profileTabButton = screen.getByLabelText('Profile, tab, 2 of 2');

  await user.press(profileTabButton);

  expect(screen.getByText('Loading...')).toBeVisible();

  await act(() => jest.runAllTimers());

  expect(screen.getByText('ditto')).toBeVisible();

  await user.press(homeTabButton);

  await act(() => jest.runAllTimers());

  await user.press(profileTabButton);

  expect(screen.queryByText('Loading...')).not.toBeVisible();
  expect(screen.getByText('ditto')).toBeVisible();
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js title="MyTabs.test.js"
import './msw-node';

import { expect, jest, test } from '@jest/globals';
import { NavigationContainer } from '@react-navigation/native';
import { act, render, screen, userEvent } from '@testing-library/react-native';

import { MyTabs } from './MyTabs';

jest.useFakeTimers();

test('loads data on Pokemon info screen after focus', async () => {
  const user = userEvent.setup();

  render(
    <NavigationContainer>
      <MyTabs />
    </NavigationContainer>
  );

  const homeTabButton = screen.getByLabelText('Home, tab, 1 of 2');
  const profileTabButton = screen.getByLabelText('Profile, tab, 2 of 2');

  await user.press(profileTabButton);

  expect(screen.getByText('Loading...')).toBeVisible();

  await act(() => jest.runAllTimers());

  expect(screen.getByText('ditto')).toBeVisible();

  await user.press(homeTabButton);

  await act(() => jest.runAllTimers());

  await user.press(profileTabButton);

  expect(screen.queryByText('Loading...')).not.toBeVisible();
  expect(screen.getByText('ditto')).toBeVisible();
});
```

</TabItem>
</Tabs>

In the above test, we:

- Assert that the `Loading...` text is visible while the data is being fetched.
- Run all timers using `jest.runAllTimers()` to skip delays in the network request.
- Assert that the `ditto` text is visible after the data is fetched.
- Press the home tab button to navigate to the home screen.
- Run all timers using `jest.runAllTimers()` to skip animations (e.g. animations in the `Pressable` for the button).
- Press the profile tab button to navigate back to the Pokemon screen.
- Ensure that cached data is shown by asserting that the `Loading...` text is not visible and the `ditto` text is visible.

:::note

In a production app, we recommend using a library like [React Query](https://tanstack.com/query/) to handle data fetching and caching. The above example is for demonstration purposes only.

:::

### Re-usable components

To make it easier to test components that don't depend on the navigation structure, we can create a light-weight test navigator:

```js title="TestStackNavigator.js"
import { useNavigationBuilder, StackRouter } from '@react-navigation/native';

function TestStackNavigator(props) {
  const { state, descriptors, NavigationContent } = useNavigationBuilder(
    StackRouter,
    props
  );

  return (
    <NavigationContent>
      {state.routes.map((route, index) => {
        return (
          <View key={route.key} aria-hidden={index !== state.index}>
            {descriptors[route.key].render()}
          </View>
        );
      })}
    </NavigationContent>
  );
}

export function createTestStackNavigator(config) {
  return createNavigatorFactory(TestStackNavigator)(config);
}
```

This lets us test React Navigation specific logic such as `useFocusEffect` without needing to set up a full navigator.

We can use this test navigator in our tests like this:

<Tabs groupId="example" queryString="example">
<TabItem value="static" label="Static" default>

```js title="MyComponent.test.js"
import { act, render, screen } from '@testing-library/react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createTestStackNavigator } from './TestStackNavigator';
import { MyComponent } from './MyComponent';

test('does not show modal when not focused', () => {
  const TestStack = createTestStackNavigator({
    screens: {
      A: MyComponent,
      B: () => null,
    },
  });

  const Navigation = createStaticNavigation(TestStack);

  render(
    <Navigation
      initialState={{
        routes: [{ name: 'A' }, { name: 'B' }],
      }}
    />
  );

  expect(screen.queryByText('Modal')).not.toBeVisible();
});

test('shows modal when focused', () => {
  const TestStack = createTestStackNavigator({
    screens: {
      A: MyComponent,
      B: () => null,
    },
  });

  const Navigation = createStaticNavigation(TestStack);

  render(
    <Navigation
      initialState={{
        routes: [{ name: 'B' }, { name: 'A' }],
      }}
    />
  );

  expect(screen.getByText('Modal')).toBeVisible();
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js title="MyComponent.test.js"
import { act, render, screen } from '@testing-library/react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createTestStackNavigator } from './TestStackNavigator';
import { MyComponent } from './MyComponent';

test('does not show modal when not focused', () => {
  const Stack = createTestStackNavigator();

  const TestStack = () => (
    <Stack.Navigator>
      <Stack.Screen name="A" component={MyComponent} />
      <Stack.Screen name="B" component={() => null} />
    </Stack.Navigator>
  );

  render(
    <NavigationContainer
      initialState={{
        routes: [{ name: 'A' }, { name: 'B' }],
      }}
    >
      <TestStack />
    </NavigationContainer>
  );

  expect(screen.queryByText('Modal')).not.toBeVisible();
});

test('shows modal when focused', () => {
  const Stack = createTestStackNavigator();

  const TestStack = () => (
    <Stack.Navigator>
      <Stack.Screen name="A" component={MyComponent} />
      <Stack.Screen name="B" component={() => null} />
    </Stack.Navigator>
  );

  render(
    <NavigationContainer
      initialState={{
        routes: [{ name: 'B' }, { name: 'A' }],
      }}
    >
      <TestStack />
    </NavigationContainer>
  );

  expect(screen.getByText('Modal')).toBeVisible();
});
```

</TabItem>
</Tabs>

Here we create a test stack navigator using the `createTestStackNavigator` function. We then render the `MyComponent` component within the test navigator and assert that the modal is shown or hidden based on the focus state.

The `initialState` prop is used to set the initial state of the navigator, i.e. which screens are rendered in the stack and which one is focused. See [navigation state](navigation-state.md) for more information on the structure of the state object.

You can also pass a [`ref`](navigation-container.md#ref) to programmatically navigate in your tests.

The test navigator is a simplified version of the stack navigator, but it's still a real navigator and behaves like one. This means that you can use it to test any other navigation logic.

See [Custom navigators](custom-navigators.md) for more information on how to write custom navigators if you want adjust the behavior of the test navigator or add more functionality.

## Best practices

Generally, we recommend avoiding mocking React Navigation. Mocking can help you isolate the component you're testing, but when testing components with navigation logic, mocking means that your tests don't test for the navigation logic.

- Mocking APIs such as `useFocusEffect` means you're not testing the focus logic in your component.
- Mocking `navigation` prop or `useNavigation` means that the `navigation` object may not have the same shape as the real one.
- Asserting `navigation.navigate` calls means you only test that the function was called, not that the call was correct based on the navigation structure.
- etc.

Avoiding mocks means additional work when writing tests, but it also means:

- Refactors that don't change the logic won't break the tests, e.g. changing `navigation` prop to `useNavigation`, using a different navigation action that does the same thing, etc.
- Library upgrades or refactor that actually change the behavior will correctly break the tests, surfacing actual regressions.

Tests should break when there's a regression, not due to a refactor. Otherwise it leads to additional work to fix the tests, making it harder to know when a regression is introduced.

---

## Type checking with TypeScript

Source: https://reactnavigation.org/docs/8.x/typescript

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

React Navigation can be configured to type-check screens and their params, as well as various other APIs using TypeScript. This provides better intelliSense and type safety when working with React Navigation.

First, make sure you have the following configuration in your `tsconfig.json` under `compilerOptions`:

- `strict: true` or `strictNullChecks: true` - Necessary for intelliSense and type inference to work correctly.
- `moduleResolution: "bundler"` - Necessary to resolve the types correctly and match the behavior of [Metro](https://metrobundler.dev/) and other bundlers.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

## Setting up the types

There are 2 steps to configure TypeScript with the static API:

### Specify the root navigator's type

For the type-inference to work, React Navigation needs to know the type of the root navigator in your app. To do this, you can declare a module augmentation for `@react-navigation/core` and extend the `RootNavigator` interface with the type of your root navigator.

```ts
const HomeTabs = createBottomTabNavigator({
  screens: {
    Feed: FeedScreen,
    Profile: ProfileScreen,
  },
});

const RootStack = createNativeStackNavigator({
  screens: {
    Home: HomeTabs,
  },
});

// highlight-next-line
type RootStackType = typeof RootStack;

// highlight-start
declare module '@react-navigation/core' {
  interface RootNavigator extends RootStackType {}
}
// highlight-end
```

This is needed to type-check hooks such as [`useNavigation`](use-navigation.md), [`useRoute`](use-route.md), [`useNavigationState`](use-navigation-state.md) etc.

### Specify param types for screens

After setting up the type for the root navigator, all we need to do is specify the type of params that our screens accept.

This can be done in 2 ways:

1. The type annotation for the component specified in `screen`:

   ```ts
   import type { StaticScreenProps } from '@react-navigation/native';

   // highlight-start
   type ProfileParams = {
     userId: string;
   };
   // highlight-end

   // highlight-next-line
   function ProfileScreen({ route }: StaticScreenProps<ProfileParams>) {
     // ...
   }
   ```

   In the above example, the type of `route.params` is `{ userId: string }` based on the type annotation in `StaticScreenProps<ProfileParams>`.

   If you aren't using the `route` object in the component, you can specify the `props` as `_` to avoid unused variable warnings:

   ```ts
   // highlight-next-line
   function ProfileScreen(_: StaticScreenProps<ProfileParams>) {
     // ...
   }
   ```

2. The path pattern specified in the linking config (e.g. for `linking: 'profile/:userId'`, the type of `route.params` is `{ userId: string }`). The type can be further customized by using a [`parse` function in the linking config](configuring-links.md#passing-params):

   ```ts
   linking: {
     path: 'profile/:userId',
     parse: {
       userId: (id) => parseInt(id, 10),
     },
   },
   ```

   The above example would make the type of `route.params` be `{ userId: number }` since the `parse` function converts the string from the URL to a number.

If both `screen` and `linking` specify params, the final type of `route.params` is the intersection of both types.

This is how the complete example would look like:

```ts
const MyStack = createNativeStackNavigator({
  screens: {
    // highlight-start
    Profile: createNativeStackScreen({
      screen: ProfileScreen,
      linking: {
        path: 'profile/:userId',
        parse: {
          userId: (id) => parseInt(id, 10),
        },
      },
    }),
    // highlight-end
  },
});
```

If your app supports deep linking or runs on the Web, it is recommended to specify params that appear in the path pattern in the linking config. Any additional params (e.g. query params) can be specified in the component's props.

If you have specified the params in `linking`, it's recommended to not specify them again in the component's props, and use `useRoute('ScreenName')` instead to get the correctly typed `route` object.

The `createXScreen` helper functions enable type inference in screen configuration callbacks like `options`, `listeners`, etc. Each navigator exports its own version of the helper function:

- `createNativeStackScreen` from `@react-navigation/native-stack`
- `createStackScreen` from `@react-navigation/stack`
- `createBottomTabScreen` from `@react-navigation/bottom-tabs`
- `createDrawerScreen` from `@react-navigation/drawer`
- `createMaterialTopTabScreen` from `@react-navigation/material-top-tabs`

See [Static configuration](static-configuration.md#createxscreen) for more details.

## Using typed hooks

The [`useRoute`](use-route.md), [`useNavigation`](use-navigation.md), and [`useNavigationState`](use-navigation-state.md) hooks accept the name of the current screen or any parent screen where it's nested as an argument to infer the correct types.

Once the types are set up, these hooks are automatically typed based on the name of the screen passed to them.

With `useRoute`:

```ts
function ProfileScreen() {
  const route = useRoute('Profile');

  // The params are correctly typed here
  const { userId } = route.params;

  // ...
}
```

With `useNavigation`:

```ts
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  // Helpers like `push` are correctly typed here
  navigation.push('Feed');

  // ...
}
```

With `useNavigationState`:

```ts
function ProfileScreen() {
  const focusedRouteName = useNavigationState(
    'Profile',
    // The state is correctly typed here
    (state) => state.routes[state.index].name
  );

  // The `focusedRouteName` type is one of the route names
  // defined in the navigator where `Profile` is defined
  console.log(focusedRouteName);

  // ...
}
```

It's also possible to use these hooks without specifying the screen name - which can be useful in re-usable components that can be used across multiple screens. In this case, different things happen based on the hook.

The `useRoute` hook returns a union of all routes in the app, and can be narrowed down using type guards:

```ts
function Header() {
  const route = useRoute();

  // The route is an union of all routes in the app
  console.log(route.name);

  // It's possible to narrow down the type using type guards
  if (route.name === 'Profile') {
    // Here route.params is correctly typed
    const { userId } = route.params;
  }

  // ...
}
```

The `useNavigation` hook returns a generic navigation object that refers to the root navigator. This means that any navigation actions can be called as if they are used in a screen of the root navigator:

```ts
function Header() {
  const navigation = useNavigation();

  // A generic navigation object that refers to the root navigator
  navigation.navigate('Profile', { userId: '123' });

  // ...
}
```

The `useNavigationState` hook returns a generic navigation state without any navigator-specific types:

```ts
function Header() {
  const focusedRouteName = useNavigationState((state) => {
    // The state is a generic navigation state
    return state.routes[state.index].name;
  });

  // The `focusedRouteName` type is `string`
  console.log(focusedRouteName);

  // ...
}
```

## Nesting navigator using dynamic API

Consider the following example:

```js
const Tab = createBottomTabNavigator();

function HomeTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const RootStack = createStackNavigator({
  screens: {
    Home: HomeTabs,
  },
});
```

Here, the `HomeTabs` component is defined using the dynamic API. This means that React Navigation won't know about the screens defined in the nested navigator and the types for those screens. To fix this, we'd need to specify the types for the nested navigator explicitly.

This can be done by annotating the type of the [`route`](route-object.md) prop that the screen component receives:

```ts
type HomeTabsParamList = {
  Feed: undefined;
  Profile: undefined;
};

// highlight-start
type HomeTabsProps = StaticScreenProps<
  NavigatorScreenParams<HomeTabsParamList>
>;
// highlight-end

// highlight-next-line
function HomeTabs(_: HomeTabsProps) {
  return (
    <Tab.Navigator>
      <Tab.Screen name="Feed" component={FeedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
```

Here the `HomeTabsParamList` type defines the mapping of route names in the tab navigator to the types of their params. We then use the `NavigatorScreenParams` utility to say that these are the screens in a nested navigator in the `HomeTabs` component.

Now, React Navigation knows about the screens in the nested navigator and their params, and the types can be inferred with hooks such as `useRoute`.

</TabItem>
<TabItem value="dynamic" label="Dynamic">

When using the dynamic API, it is necessary to specify the types for each screen as well as the nesting structure as it cannot be inferred from the code.

## Typechecking the navigator

To typecheck our route name and params, the first thing we need to do is to create an object type with mappings for route names to the params of the route. For example, say we have a route called `Profile` in our root navigator which should have a param `userId`:

```tsx
type RootStackParamList = {
  Profile: { userId: string };
};
```

Similarly, we need to do the same for each route:

```tsx
type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Feed: { sort: 'latest' | 'top' } | undefined;
};
```

Specifying `undefined` means that the route doesn't have params. A union type with `undefined` (e.g. `SomeType | undefined`) means that params are optional.

After we have defined the mapping, we need to tell our navigator to use it. To do that, we can pass it as a generic to the [`createXNavigator`](static-configuration.md) functions:

```tsx
import { createStackNavigator } from '@react-navigation/stack';

const RootStack = createStackNavigator<RootStackParamList>();
```

And then we can use it:

```tsx
<RootStack.Navigator initialRouteName="Home">
  <RootStack.Screen name="Home" component={Home} />
  <RootStack.Screen
    name="Profile"
    component={Profile}
    initialParams={{ userId: user.id }}
  />
  <RootStack.Screen name="Feed" component={Feed} />
</RootStack.Navigator>
```

This will provide type checking and intelliSense for props of the [`Navigator`](navigator.md) and [`Screen`](screen.md) components.

:::note

The type containing the mapping must be a type alias (e.g. `type RootStackParamList = { ... }`). It cannot be an interface (e.g. `interface RootStackParamList { ... }`). It also shouldn't extend `ParamListBase` (e.g. `interface RootStackParamList extends ParamListBase { ... }`). Doing so will result in incorrect type checking which allows you to pass incorrect route names.

:::

## Type checking screens

To typecheck our screens, we need to annotate the `navigation` and the `route` props received by a screen. The navigator packages in React Navigation export generic types to define types for both the `navigation` and `route` props from the corresponding navigator.

For example, you can use `NativeStackScreenProps` for the Native Stack Navigator.

```tsx
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  Home: undefined;
  Profile: { userId: string };
  Feed: { sort: 'latest' | 'top' } | undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'Profile'>;
```

The type takes 2 generics:

- The param list object we defined earlier
- The name of the route the screen belongs to

This allows us to type check route names and params which you're navigating using [`navigate`](navigation-object.md#navigate), [`push`](stack-actions.md#push) etc. The name of the current route is necessary to type check the params in `route.params` and when you call [`setParams`](navigation-actions#setparams) or [`replaceParams`](navigation-actions#replaceparams).

Similarly, you can import `StackScreenProps` from [`@react-navigation/stack`](stack-navigator.md), `DrawerScreenProps` from [`@react-navigation/drawer`](drawer-navigator.md), `BottomTabScreenProps` from [`@react-navigation/bottom-tabs`](bottom-tab-navigator.md) and so on.

Then you can use the `Props` type you defined above to annotate your component.

For function components:

```tsx
function ProfileScreen({ route, navigation }: Props) {
  // ...
}
```

For class components:

```ts
class ProfileScreen extends React.Component<Props> {
  render() {
    // ...
  }
}
```

You can get the types for `navigation` and `route` from the `Props` type as follows:

```ts
type ProfileScreenNavigationProp = Props['navigation'];

type ProfileScreenRouteProp = Props['route'];
```

Alternatively, you can also annotate the `navigation` and `route` objects separately.

To get the type for the `navigation` prop, we need to import the corresponding type from the navigator. For example, `NativeStackNavigationProp` for `@react-navigation/native-stack`:

```tsx
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type ProfileScreenNavigationProp = NativeStackNavigationProp<
  RootStackParamList,
  'Profile'
>;
```

Similarly, you can import `StackNavigationProp` from [`@react-navigation/stack`](stack-navigator.md), `DrawerNavigationProp` from [`@react-navigation/drawer`](drawer-navigator.md), `BottomTabNavigationProp` from [`@react-navigation/bottom-tabs`](bottom-tab-navigator.md) etc.

To get the type for the `route` object, we need to use the `RouteProp` type from `@react-navigation/native`:

```tsx
import type { RouteProp } from '@react-navigation/native';

type ProfileScreenRouteProp = RouteProp<RootStackParamList, 'Profile'>;
```

We recommend creating a separate file: `types.tsx` - where you keep the types and import from there in your component files instead of repeating them in each file.

## Nesting navigators

### Type checking screens and params in nested navigator

You can [navigate to a screen in a nested navigator](nesting-navigators.md#navigating-to-a-screen-in-a-nested-navigator) by passing `screen` and `params` properties for the nested screen:

```ts
navigation.navigate('Home', {
  screen: 'Feed',
  params: { sort: 'latest' },
});
```

To be able to type check this, we need to extract the params from the screen containing the nested navigator. This can be done using the `NavigatorScreenParams` utility:

```ts
import { NavigatorScreenParams } from '@react-navigation/native';

type TabParamList = {
  Home: NavigatorScreenParams<StackParamList>;
  Profile: { userId: string };
};
```

### Combining navigation props

When you nest navigators, the navigation prop of the screen is a combination of multiple navigation props. For example, if we have a tab inside a stack, the `navigation` prop will have both [`jumpTo`](tab-actions.md#jumpto) (from the tab navigator) and [`push`](stack-actions.md#push) (from the stack navigator). To make it easier to combine types from multiple navigators, you can use the `CompositeScreenProps` type.

For example, if we have a `Profile` in a navigator, nested inside `Account` screen of a stack navigator, we can combine the types as follows:

```ts
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { StackScreenProps } from '@react-navigation/stack';

type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  StackScreenProps<StackParamList, 'Account'>
>;
```

The `CompositeScreenProps` type takes 2 parameters:

- The first parameter is the type for the navigator that owns this screen, in our case the tab navigator which contains the `Profile` screen
- The second parameter is the type of props for a parent navigator, in our case the stack navigator which contains the `Account` screen

For multiple parent navigators, this second parameter can nest another `CompositeScreenProps`:

```ts
type ProfileScreenProps = CompositeScreenProps<
  BottomTabScreenProps<TabParamList, 'Profile'>,
  CompositeScreenProps<
    StackScreenProps<StackParamList, 'Account'>,
    DrawerScreenProps<DrawerParamList, 'Home'>
  >
>;
```

If annotating the `navigation` prop separately, you can use `CompositeNavigationProp` instead. The usage is similar to `CompositeScreenProps`:

```ts
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';

type ProfileScreenNavigationProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  StackNavigationProp<StackParamList, 'Account'>
>;
```

## Annotating hooks

The [`useRoute`](use-route.md), [`useNavigation`](use-navigation.md), and [`useNavigationState`](use-navigation-state.md) hooks accept the name of the current screen or any parent screen where it's nested as an argument for limited type inference in dynamic API after [specifying root navigator type](#specifying-root-navigator-type).

With `useRoute`:

```ts
function ProfileScreen() {
  const route = useRoute('Profile');

  // The params are correctly typed here
  const { userId } = route.params;

  // ...
}
```

With `useNavigation`:

```ts
function ProfileScreen() {
  const navigation = useNavigation('Profile');

  // Helpers like `getState` are correctly typed here
  const state = navigation.getState();

  // ...
}
```

This will automatically infer the type for methods such as `getState`, `setParams` etc. However, it doesn't include navigator-specific types, and they cannot be automatically inferred when using the dynamic configuration.

So if we want to use a navigator-specific method (e.g. `push` from stack navigator), we need to annotate the type of the returned `navigation` object.

This can be done using [type assertion](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#type-assertions) with the `as` keyword:

```ts
function ProfileScreen() {
  const navigation = useNavigation('Profile') as ProfileScreenNavigationProp;

  // ...
}
```

:::danger

Annotating `useNavigation` isn't type-safe because we cannot verify that the provided type matches the actual navigators.

:::

With `useNavigationState`:

```ts
function ProfileScreen() {
  const focusedRouteName = useNavigationState(
    'Profile',
    // The state is correctly typed here
    (state) => state.routes[state.index].name
  );

  // The `focusedRouteName` type is one of the route names
  // defined in the navigator where `Profile` is defined
  console.log(focusedRouteName);

  // ...
}
```

## Annotating `options` and `screenOptions`

When you pass the `options` to a `Screen` or `screenOptions` prop to a `Navigator` component, they are already type-checked and you don't need to do anything special. However, sometimes you might want to extract the options to a separate object, and you might want to annotate it.

To annotate the options, we need to import the corresponding type from the navigator. For example, `StackNavigationOptions` for `@react-navigation/stack`:

```ts
import type { StackNavigationOptions } from '@react-navigation/stack';

const options: StackNavigationOptions = {
  headerShown: false,
};
```

Similarly, you can import `DrawerNavigationOptions` from `@react-navigation/drawer`, `BottomTabNavigationOptions` from `@react-navigation/bottom-tabs` etc.

When using the function form of `options` and `screenOptions`, you can annotate the arguments with a type exported from the navigator, e.g. `StackOptionsArgs` for `@react-navigation/stack`, `DrawerOptionsArgs` for `@react-navigation/drawer`, `BottomTabOptionsArgs` for `@react-navigation/bottom-tabs` etc.:

```ts
import type {
  StackNavigationOptions,
  StackOptionsArgs,
} from '@react-navigation/stack';

const options = ({ route }: StackOptionsArgs): StackNavigationOptions => {
  return {
    headerTitle: route.name,
  };
};
```

If you want to annotate the type of params in the `route` object, you can use pass the param list and route name as generics to the `StackOptionsArgs` type:

```ts
import type {
  StackNavigationOptions,
  StackOptionsArgs,
} from '@react-navigation/stack';

const options = ({
  route,
}: StackOptionsArgs<RootStackParamList, 'Profile'>): StackNavigationOptions => {
  const { userId } = route.params;

  return {
    headerTitle: `Profile of ${userId}`,
  };
};
```

## Annotating `ref` on `NavigationContainer`

If you use the `createNavigationContainerRef()` method to create the ref, you can annotate it to type-check navigation actions:

```ts
import { createNavigationContainerRef } from '@react-navigation/native';

// ...

const navigationRef = createNavigationContainerRef<RootStackParamList>();
```

Similarly, for `useNavigationContainerRef()`:

```ts
import { useNavigationContainerRef } from '@react-navigation/native';

// ...

const navigationRef = useNavigationContainerRef<RootStackParamList>();
```

If you're using a regular `ref` object, you can pass a generic to the `NavigationContainerRef` type..

Example when using `React.useRef` hook:

```ts
import type { NavigationContainerRef } from '@react-navigation/native';

// ...

const navigationRef =
  React.useRef<NavigationContainerRef<RootStackParamList>>(null);
```

Example when using `React.createRef`:

```ts
import type { NavigationContainerRef } from '@react-navigation/native';

// ...

const navigationRef =
  React.createRef<NavigationContainerRef<RootStackParamList>>();
```

## Specifying root navigator type

You can specify the type for your root navigator which will enable automatic type inference (with limitations) for [`useRoute`](use-route.md), [`useNavigation`](use-navigation.md), [`useNavigationState`](use-navigation-state.md), [`Link`](link.md), [`ref`](navigation-container.md#ref), [`linking`](navigation-container.md#linking) etc.

To do this, you can use module augmentation for `@react-navigation/core` and extend the `RootNavigator` interface with the type of your root navigator.

```ts
const RootStack = createNativeStackNavigator<RootStackParamList>();

function App() {
  // ...
}

// highlight-next-line
type RootStackType = typeof RootStack;

// highlight-start
declare module '@react-navigation/core' {
  interface RootNavigator extends RootStackType {}
}
// highlight-end
```

Here `RootStack` refers to the navigator used at the root of your app.

## Organizing types

When writing types for React Navigation, there are a couple of things we recommend to keep things organized.

1. It's good to create a separate file (e.g. `navigation/types.tsx`) that contains the types related to React Navigation.
2. Instead of using `CompositeNavigationProp` directly in your components, it's better to create a helper type that you can reuse.
3. Specifying a global type for your root navigator would avoid manual annotations in many places.

Considering these recommendations, the file containing the types may look something like this:

```ts
import type {
  CompositeScreenProps,
  NavigatorScreenParams,
} from '@react-navigation/native';
import type { StackScreenProps } from '@react-navigation/stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';

export type RootStackParamList = {
  Home: NavigatorScreenParams<HomeTabParamList>;
  PostDetails: { id: string };
  NotFound: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> =
  StackScreenProps<RootStackParamList, T>;

export type HomeTabParamList = {
  Popular: undefined;
  Latest: undefined;
};

export type HomeTabScreenProps<T extends keyof HomeTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<HomeTabParamList, T>,
    RootStackScreenProps<keyof RootStackParamList, 'Home'>
  >;
```

Then, you'd set up the global type for your root navigator in the same file where your root navigator is defined:

```ts
import { createStackNavigator } from '@react-navigation/stack';
import type { RootStackParamList } from './navigation/types';

const RootStack = createStackNavigator<RootStackParamList>();

function App() {
  // ...
}

// Specify the global type for the root navigator
type RootStackType = typeof RootStack;

declare module '@react-navigation/core' {
  interface RootNavigator extends RootStackType {}
}
```

Now, when annotating your components, you can write:

```ts
import type { HomeTabScreenProps } from './navigation/types';

function PopularScreen({ navigation, route }: HomeTabScreenProps<'Popular'>) {
  // ...
}
```

</TabItem>
</Tabs>

---

## Troubleshooting

Source: https://reactnavigation.org/docs/8.x/troubleshooting

import Tabs from '@theme/Tabs';
import TabItem from '@theme/TabItem';

This section attempts to outline issues that users frequently encounter when first getting accustomed to using React Navigation. These issues may or may not be related to React Navigation itself.

Before troubleshooting an issue, make sure that you have upgraded to **the latest available versions** of the packages. You can install the latest versions by installing the packages again (e.g. `npm install package-name`).

## I'm getting an error "Unable to resolve module" after updating to the latest version

This might happen for 3 reasons:

### Stale cache of Metro bundler

If the module points to a local file (i.e. the name of the module starts with `./`), then it's probably due to stale cache. To fix this, try the following solutions.

If you're using Expo, run:

```bash
expo start -c
```

If you're not using Expo, run:

```bash
npx react-native start --reset-cache
```

If that doesn't work, you can also try the following:

```bash
rm -rf $TMPDIR/metro-bundler-cache-*
```

### Missing peer dependency

If the module points to an npm package (i.e. the name of the module doesn't with `./`), then it's probably due to a missing dependency. To fix this, install the dependency in your project:

```bash npm2yarn
npm install name-of-the-module
```

Sometimes it might even be due to a corrupt installation. If clearing cache didn't work, try deleting your `node_modules` folder and run `npm install` again.

### Missing extensions in metro configuration

Sometimes the error may look like this:

```bash
Error: While trying to resolve module "@react-navigation/native" from file "/path/to/src/App.js", the package "/path/to/node_modules/@react-navigation/native/package.json" was successfully found. However, this package itself specifies a "main" module field that could not be resolved ("/path/to/node_modules/@react-navigation/native/src/index.tsx"
```

This can happen if you have a custom configuration for metro and haven't specified `ts` and `tsx` as valid extensions. These extensions are present in the default configuration. To check if this is the issue, look for a `metro.config.js` file in your project and check if you have specified the [`sourceExts`](https://facebook.github.io/metro/docs/en/configuration#sourceexts) option. It should at least have the following configuration:

```js
sourceExts: ['js', 'json', 'ts', 'tsx'];
```

If it's missing these extensions, add them and then clear metro cache as shown in the section above.

## I'm getting "SyntaxError in @react-navigation/xxx/xxx.tsx" or "SyntaxError: /xxx/@react-navigation/xxx/xxx.tsx: Unexpected token"

This might happen if you have an old version of the `@react-native/babel-preset` package. Try upgrading it to the latest version.

```bash npm2yarn
npm install --save-dev @react-native/babel-preset
```

If you have `@babel/core` installed, also upgrade it to latest version.

```bash npm2yarn
npm install --save-dev @babel/core
```

If upgrading the packages don't help, you can also try deleting your `node_modules` and then the lock the file and reinstall your dependencies.

If you use `npm`:

```bash
rm -rf node_modules
rm package-lock.json
npm install
```

If you use `yarn`:

```bash
rm -rf node_modules
rm yarn.lock
yarn
```

:::warning

Deleting the lockfile is generally not recommended as it may upgrade your dependencies to versions that haven't been tested with your project. So only use this as a last resort.

:::

After upgrading or reinstalling the packages, you should also clear Metro bundler's cache following the instructions earlier in the page.

