## Stack Navigator

Source: https://reactnavigation.org/docs/8.x/stack-navigator

Stack Navigator provides a way for your app to transition between screens where each new screen is placed on top of a stack.

By default the stack navigator is configured to have the familiar iOS and Android look & feel: new screens slide in from the right on iOS, use OS default animation on Android. But the [animations can be customized](#animation-related-options) to match your needs.

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/stack-android.mp4" />
</video>

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/stack-ios.mp4" />
</video>

One thing to keep in mind is that while `@react-navigation/stack` is extremely customizable, it's implemented in JavaScript. While it runs animations and gestures using natively, the performance may not be as fast as a native implementation. This may not be an issue for a lot of apps, but if you're experiencing performance issues during navigation, consider using [`@react-navigation/native-stack`](native-stack-navigator.md) instead - which uses native navigation primitives.

## Installation

To use this navigator, ensure that you have [`@react-navigation/native` and its dependencies (follow this guide)](getting-started.md), then install [`@react-navigation/stack`](https://github.com/react-navigation/react-navigation/tree/main/packages/stack):

```bash npm2yarn
npm install @react-navigation/stack@next
```

The navigator depends on [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) for gestures and optionally [`@react-native-masked-view/masked-view`](https://github.com/react-native-masked-view/masked-view) for [UIKit style animations for the header](#headerstyleinterpolator).

<Tabs groupId='framework' queryString="framework">
<TabItem value='expo' label='Expo' default>

If you have a Expo managed project, in your project directory, run:

```bash
npx expo install react-native-gesture-handler @react-native-masked-view/masked-view
```

</TabItem>
<TabItem value='community-cli' label='Community CLI'>

If you have a bare React Native project, in your project directory, run:

```bash npm2yarn
npm install react-native-gesture-handler @react-native-masked-view/masked-view
```

</TabItem>
</Tabs>

If you're on a Mac and developing for iOS, you also need to install [pods](https://cocoapods.org/) to complete the linking.

```bash
npx pod-install ios
```

## Usage

To use this navigator, import it from `@react-navigation/stack`:

```js name="Stack Navigator" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { createStackNavigator } from '@react-navigation/stack';

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
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

## API Definition

### Props

In addition to the [common props](navigator.md#configuration) shared by all navigators, the stack navigator accepts the following additional props:

#### `detachInactiveScreens`

Boolean used to indicate whether inactive screens should be detached from the view hierarchy to save memory. This enables integration with [react-native-screens](https://github.com/software-mansion/react-native-screens). Defaults to `true`.

If you need to disable this optimization for specific screens (e.g. you want to screen to stay in view even when unfocused) [`detachPreviousScreen`](#detachpreviousscreen) option.

### Options

The following [options](screen-options.md) can be used to configure the screens in the navigator. These can be specified under `screenOptions` prop of `Stack.Navigator` or `options` prop of `Stack.Screen`.

#### `title`

String that can be used as a fallback for `headerTitle`.

#### `cardShadowEnabled`

Use this prop to have visible shadows during transitions. Defaults to `true`.

#### `cardOverlayEnabled`

Use this prop to have a semi-transparent dark overlay visible under the card during transitions. Defaults to `true` on Android and `false` on iOS.

#### `cardOverlay`

Function which returns a React Element to display as the overlay for the card. Make sure to set `cardOverlayEnabled` to `true` when using this.

#### `cardStyle`

Style object for the card in stack. You can provide a custom background color to use instead of the default background here.

You can also specify `{ backgroundColor: 'transparent' }` to make the previous screen visible underneath (for transparent modals). This is useful to implement things like modal dialogs. You should also specify `presentation: 'modal'` in the options when using a transparent background so previous screens aren't detached and stay visible underneath.

On Web, the height of the screen isn't limited to the height of the viewport. This is by design to allow the browser's address bar to hide when scrolling. If this isn't desirable behavior, you can set `cardStyle` to `{ flex: 1 }` to force the screen to fill the viewport.

#### `presentation`

This is shortcut option which configures several options to configure the style for rendering and transitions:

- `card`: Use the default OS animations for iOS and Android screen transitions.
- `modal`: Use Modal animations. This changes a few things:
  - Sets `headerMode` to `screen` for the screen unless specified otherwise.
  - Changes the screen animation to match the platform behavior for modals.
- `transparentModal`: Similar to `modal`. This changes following things:
  - Sets `headerMode` to `screen` for the screen unless specified otherwise.
  - Sets background color of the screen to transparent, so previous screen is visible
  - Adjusts the `detachPreviousScreen` option so that the previous screen stays rendered.
  - Prevents the previous screen from animating from its last position.
  - Changes the screen animation to a vertical slide animation.

See [Transparent modals](#transparent-modals) for more details on how to customize `transparentModal`.

#### `animationTypeForReplace`

The type of animation to use when this screen replaces another screen. It takes the following values:

- `push` - The animation of a new screen being pushed will be used
- `pop` - The animation of a screen being popped will be used

Defaults to `push`.

When `pop` is used, the `pop` animation is applied to the screen being replaced.

#### `gestureEnabled`

Whether you can use gestures to dismiss this screen. Defaults to `true` on iOS, `false` on Android.

Gestures are not supported on Web.

#### `gestureResponseDistance`

Number to override the distance of touch start from the edge of the screen to recognize gestures.

It'll configure either the horizontal or vertical distance based on the [`gestureDirection`](#gesturedirection) value.

The default values are:

- `50` - when `gestureDirection` is `horizontal` or `horizontal-inverted`
- `135` - when `gestureDirection` is `vertical` or `vertical-inverted`

This is not supported on Web.

#### `gestureVelocityImpact`

Number which determines the relevance of velocity for the gesture. Defaults to 0.3.

This is not supported on Web.

#### `gestureDirection`

Direction of the gestures. Refer the [Animations section](#animations) for details.

This is not supported on Web.

#### `transitionSpec`

Configuration object for the screen transition. Refer the [Animations section](#animations) for details.

#### `cardStyleInterpolator`

Interpolated styles for various parts of the card. Refer the [Animations section](#animations) for details.

#### `headerStyleInterpolator`

Interpolated styles for various parts of the header. Refer the [Animations section](#animations) for details.

#### `keyboardHandlingEnabled`

If `false`, the keyboard will NOT automatically dismiss when navigating to a new screen from this screen. Defaults to `true`.

#### `detachPreviousScreen`

Boolean used to indicate whether to detach the previous screen from the view hierarchy to save memory. Set it to `false` if you need the previous screen to be seen through the active screen. Only applicable if `detachInactiveScreens` isn't set to `false`.

This is automatically adjusted when using [`presentation`](#presentation) as `transparentModal` or `modal` to keep the required screens visible. Defaults to `true` in other cases.

#### `freezeOnBlur`

Boolean indicating whether to prevent inactive screens from re-rendering. Defaults to `false`.
Defaults to `true` when `enableFreeze()` from `react-native-screens` package is run at the top of the application.

Only supported on iOS and Android.

### Header related options

You can find the list of header related options [here](elements.md#header). These [options](screen-options.md) can be specified under `screenOptions` prop of `Stack.Navigator` or `options` prop of `Stack.Screen`. You don't have to be using `@react-navigation/elements` directly to use these options, they are just documented in that page.

In addition to those, the following options are also supported in stack:

#### `header`

Custom header to use instead of the default header.

This accepts a function that returns a React Element to display as a header. The function receives an object containing the following properties as the argument:

- `navigation` - The navigation object for the current screen.
- `route` - The route object for the current screen.
- `options` - The options for the current screen
- `layout` - Dimensions of the screen, contains `height` and `width` properties.
- `progress` Animated nodes representing the progress of the animation.
- `back` - Options for the back button, contains an object with a `title` property to use for back button label.
- `styleInterpolator` - Function which returns interpolated styles for various elements in the header.

Make sure to set `headerMode` to `screen` as well when using a custom header (see below for more details).

Example:

```js
import { getHeaderTitle } from '@react-navigation/elements';

// ..

header: ({ navigation, route, options, back }) => {
  const title = getHeaderTitle(options, route.name);

  return (
    <MyHeader
      title={title}
      leftButton={
        back ? <MyBackButton onPress={navigation.goBack} /> : undefined
      }
      style={options.headerStyle}
    />
  );
};
```

To set a custom header for all the screens in the navigator, you can specify this option in the `screenOptions` prop of the navigator.

When using a custom header, there are 2 things to keep in mind:

##### Specify a `height` in `headerStyle` to avoid glitches

If your header's height differs from the default header height, then you might notice glitches due to measurement being async. Explicitly specifying the height will avoid such glitches.

Example:

```js
headerStyle: {
  height: 80, // Specify the height of your custom header
};
```

Note that this style is not applied to the header by default since you control the styling of your custom header. If you also want to apply this style to your header, use `headerStyle` from the props.

##### Set `headerMode` to `float` for custom header animations

By default, there is one floating header which renders headers for multiple screens on iOS for non-modals. These headers include animations to smoothly switch to one another.

If you specify a custom header, React Navigation will change it to `screen` automatically so that the header animated along with the screen instead. This means that you don't have to implement animations to animate it separately.

But you might want to keep the floating header to have a different transition animation between headers. To do that, you'll need to specify `headerMode: 'float'` in the options, and then interpolate on the `progress.current` and `progress.next` props in your custom header. For example, following will cross-fade the header:

```js
const opacity = Animated.add(progress.current, progress.next || 0).interpolate({
  inputRange: [0, 1, 2],
  outputRange: [0, 1, 0],
});

return (
  <Animated.View style={{ opacity }}>{/* Header content */}</Animated.View>
);
```

#### `headerMode`

Specifies how the header should be rendered:

- `float` - The header is rendered above the screen and animates independently of the screen. This is default on iOS for non-modals.
- `screen` - The header is rendered as part of the screen and animates together with the screen. This is default on other platforms.

#### `headerShown`

Whether to show or hide the header for the screen. The header is shown by default. Setting this to `false` hides the header.

#### `headerBackAllowFontScaling`

Whether back button title font should scale to respect Text Size accessibility settings. Defaults to false.

#### `headerBackAccessibilityLabel`

Accessibility label for the header back button.

#### `headerBackImage`

Function which returns a React Element to display custom image in header's back button. When a function is used, it receives the `tintColor` in it's argument object. Defaults to Image component with back image source, which is the default back icon image for the platform (a chevron on iOS and an arrow on Android).

#### `headerBackTitle`

Title string used by the back button on iOS. Defaults to the previous scene's title. Use `headerBackButtonDisplayMode` to customize the behavior.

#### `headerTruncatedBackTitle`

Title string used by the back button when `headerBackTitle` doesn't fit on the screen. `"Back"` by default.

#### `headerBackButtonDisplayMode`

How the back button displays icon and title.

Supported values:

- `default`: Displays one of the following depending on the available space: previous screen's title, generic title (e.g. 'Back') or no title (only icon).
- `generic`: Displays one of the following depending on the available space: generic title (e.g. 'Back') or no title (only icon).
- `minimal`: Always displays only the icon without a title.

Defaults to `default` on iOS, and `minimal` on Android.

#### `headerBackTitleStyle`

Style object for the back title.

#### `headerBackTestID`

Test ID for the back button for testing purposes.

### Events

The navigator can [emit events](navigation-events.md) on certain actions. Supported events are:

#### `transitionStart`

This event is fired when the transition animation starts for the current screen.

Event data:

- `e.data.closing` - Boolean indicating whether the screen is being opened or closed.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('transitionStart', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `transitionEnd`

This event is fired when the transition animation ends for the current screen.

Event data:

- `e.data.closing` - Boolean indicating whether the screen was opened or closed.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('transitionEnd', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `gestureStart`

This event is fired when the swipe gesture starts for the current screen.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('gestureStart', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `gestureEnd`

This event is fired when the swipe gesture ends for the current screen. e.g. a screen was successfully dismissed.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('gestureEnd', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `gestureCancel`

This event is fired when the swipe gesture is cancelled for the current screen. e.g. a screen wasn't dismissed by the gesture.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('gestureCancel', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

### Helpers

The stack navigator adds the following methods to the navigation object:

#### `replace`

Replaces the current screen with a new screen in the stack. The method accepts the following arguments:

- `name` - _string_ - Name of the route to push onto the stack.
- `params` - _object_ - Screen params to pass to the destination route.

```js
navigation.replace('Profile', { owner: 'Michaś' });
```

#### `push`

Pushes a new screen to the top of the stack and navigate to it. The method accepts the following arguments:

- `name` - _string_ - Name of the route to push onto the stack.
- `params` - _object_ - Screen params to pass to the destination route.

```js
navigation.push('Profile', { owner: 'Michaś' });
```

#### `pop`

Pops the current screen from the stack and navigates back to the previous screen. It takes one optional argument (`count`), which allows you to specify how many screens to pop back by.

```js
navigation.pop();
```

#### `popTo`

Navigates back to a previous screen in the stack by popping screens after it. The method accepts the following arguments:

- `name` - _string_ - Name of the route to navigate to.
- `params` - _object_ - Screen params to pass to the destination route.
- `options` - Options object containing the following properties:
  - `merge` - _boolean_ - Whether params should be merged with the existing route params, or replace them (when navigating to an existing screen). Defaults to `false`.

If a matching screen is not found in the stack, this will pop the current screen and add a new screen with the specified name and params.

```js
navigation.popTo('Profile', { owner: 'Michaś' });
```

#### `popToTop`

Pops all of the screens in the stack except the first one and navigates to it.

```js
navigation.popToTop();
```

### Hooks

The stack navigator exports the following hooks:

#### `useCardAnimation`

This hook returns values related to the screen's animation. It contains the following properties:

- `current` - Values for the current screen:
  - `progress` - Animated node representing the progress value of the current screen.
- `next` - Values for the screen after this one in the stack. This can be `undefined` in case the screen animating is the last one.
  - `progress` - Animated node representing the progress value of the next screen.
- `closing` - Animated node representing whether the card is closing. `1` when closing, `0` if not.
- `swiping` - Animated node representing whether the card is being swiped. `1` when swiping, `0` if not.
- `inverted` - Animated node representing whether the card is inverted. `-1` when inverted, `1` if not.
- `index` - The index of the card in the stack.
- `layouts` - Layout measurements for various items we use for animation.
  - `screen` - Layout of the whole screen. Contains `height` and `width` properties.
- `insets` - Layout of the safe area insets. Contains `top`, `right`, `bottom` and `left` properties.

See [Transparent modals](#transparent-modals) for an example of how to use this hook.

## Animations

You can specify the `animation` option to customize the transition animation for screens being pushed or popped.

Supported values for `animation` are:

- `default` - Default animation based on the platform and OS version.
- `fade` - Simple fade animation for dialogs.
- `fade_from_bottom` - Standard Android-style fade-in from the bottom for Android Oreo.
- `fade_from_right` - Standard Android-style fade-in from the right for Android 14.
- `reveal_from_bottom` - Standard Android-style reveal from the bottom for Android Pie.
- `scale_from_center` - Scale animation from the center.
- `slide_from_right` - Standard iOS-style slide in from the right.
- `slide_from_left` - Similar to `slide_from_right`, but the screen will slide in from the left.
- `slide_from_bottom` - Slide animation from the bottom for modals and bottom sheets.
- `none` - The screens are pushed or popped immediately without any animation.

By default, Android and iOS use the `default` animation and other platforms use `none`.

If you need more control over the animation, you can customize individual parts of the animation using the various animation-related options:

### Animation related options

Stack Navigator exposes various options to configure the transition animation when a screen is added or removed. These transition animations can be customized on a per-screen basis by specifying the options in the `options` prop for each screen.

- `gestureDirection` - The direction of swipe gestures:
  - `horizontal` - The gesture to close the screen will start from the left, and from the right in RTL. For animations, screen will slide from the right with `SlideFromRightIOS`, and from the left in RTL.
  - `horizontal-inverted` - The gesture to close the screen will start from the right, and from the left in RTL. For animations, screen will slide from the left with `SlideFromRightIOS`, and from the right in RTL as the direction is inverted.
  - `vertical` - The gesture to close the screen will start from the top. For animations, screen will slide from the bottom.
  - `vertical-inverted` - The gesture to close the screen will start from the bottom. For animations, screen will slide from the top.

  You may want to specify a matching horizontal/vertical animation along with `gestureDirection` as well. For the animations included in the library, if you set `gestureDirection` to one of the inverted ones, it'll also flip the animation direction.

- `transitionSpec` - An object which specifies the animation type (`timing` or `spring`) and their options (such as `duration` for `timing`). It takes 2 properties:
  - `open` - Configuration for the transition when adding a screen
  - `close` - Configuration for the transition when removing a screen.

  Each of the object should specify 2 properties:
  - `animation` - The animation function to use for the animation. Supported values are `timing` and `spring`.
  - `config` - The configuration object for the timing function. For `timing`, it can be `duration` and `easing`. For `spring`, it can be `stiffness`, `damping`, `mass`, `overshootClamping`, `restDisplacementThreshold` and `restSpeedThreshold`.

  A config which uses spring animation looks like this:

  ```js
  const config = {
    animation: 'spring',
    config: {
      stiffness: 1000,
      damping: 500,
      mass: 3,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    },
  };
  ```

  We can pass this config in the `transitionSpec` option:

  ```js name="Custom Transition Config" snack static2dynamic
  import * as React from 'react';
  import { Text, View } from 'react-native';
  import {
    createStaticNavigation,
    useNavigation,
  } from '@react-navigation/native';
  import { Button } from '@react-navigation/elements';
  import { createStackNavigator } from '@react-navigation/stack';

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
        <Button onPress={() => navigation.goBack()}>Go back</Button>
      </View>
    );
  }

  // codeblock-focus-start
  const config = {
    animation: 'spring',
    config: {
      stiffness: 1000,
      damping: 500,
      mass: 3,
      overshootClamping: true,
      restDisplacementThreshold: 0.01,
      restSpeedThreshold: 0.01,
    },
  };

  const MyStack = createStackNavigator({
    screens: {
      Home: HomeScreen,
      Profile: {
        screen: ProfileScreen,
        options: {
          transitionSpec: {
            open: config,
            close: config,
          },
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

- `cardStyleInterpolator` - This is a function which specifies interpolated styles for various parts of the card. This allows you to customize the transitions when navigating from screen to screen. It is expected to return at least empty object, possibly containing interpolated styles for container, the card itself, overlay and shadow. Supported properties are:
  - `containerStyle` - Style for the container view wrapping the card.
  - `cardStyle` - Style for the view representing the card.
  - `overlayStyle` - Style for the view representing the semi-transparent overlay below
  - `shadowStyle` - Style for the view representing the card shadow.

  The function receives the following properties in its argument:
  - `current` - Values for the current screen:
    - `progress` - Animated node representing the progress value of the current screen.
  - `next` - Values for the screen after this one in the stack. This can be `undefined` in case the screen animating is the last one.
    - `progress` - Animated node representing the progress value of the next screen.
  - `index` - The index of the card in the stack.
  - `closing` - Animated node representing whether the card is closing. `1` when closing, `0` if not.
  - `layouts` - Layout measurements for various items we use for animation.
    - `screen` - Layout of the whole screen. Contains `height` and `width` properties.

  > **Note that when a screen is not the last, it will use the next screen's transition config.** This is because many transitions involve an animation of the previous screen, and so these two transitions need to be kept together to prevent running two different kinds of transitions on the two screens (for example a slide and a modal). You can check the `next` parameter to find out if you want to animate out the previous screen. For more information about this parameter, see [Animation](stack-navigator.md#animations) section.

  A config which just fades the screen looks like this:

  ```js
  const forFade = ({ current }) => ({
    cardStyle: {
      opacity: current.progress,
    },
  });
  ```

  We can pass this function in `cardStyleInterpolator` option:

  ```js name="Custom Card Style Interpolator" snack static2dynamic
  import * as React from 'react';
  import { Text, View } from 'react-native';
  import {
    createStaticNavigation,
    useNavigation,
  } from '@react-navigation/native';
  import { Button } from '@react-navigation/elements';
  import { createStackNavigator } from '@react-navigation/stack';

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
        <Button onPress={() => navigation.goBack()}>Go back</Button>
      </View>
    );
  }

  // codeblock-focus-start
  const forFade = ({ current }) => ({
    cardStyle: {
      opacity: current.progress,
    },
  });

  const MyStack = createStackNavigator({
    screens: {
      Home: HomeScreen,
      Profile: {
        screen: ProfileScreen,
        options: {
          cardStyleInterpolator: forFade,
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

The interpolator will be called for each screen. For example, say you have a 2 screens in the stack, A & B. B is the new screen coming into focus and A is the previous screen. The interpolator will be called for each screen:

- The interpolator is called for `B`: Here, the `current.progress` value represents the progress of the transition, which will start at `0` and end at `1`. There won't be a `next.progress` since `B` is the last screen.
- The interpolator is called for `A`: Here, the `current.progress` will stay at the value of `1` and won't change, since the current transition is running for `B`, not `A`. The `next.progress` value represents the progress of `B` and will start at `0` and end at `1`.

Say we want to animate both screens during the transition. The easiest way to do it would be to combine the progress value of current and next screens:

```js
const progress = Animated.add(
  current.progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  }),
  next
    ? next.progress.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
        extrapolate: 'clamp',
      })
    : 0
);
```

Here, the screen `A` will have both `current.progress` and `next.progress`, and since `current.progress` stays at `1` and `next.progress` is changing, combined, the progress will change from `1` to `2`. The screen `B` will only have `current.progress` which will change from `0` to `1`. So, we can apply different interpolations for `0-1` and `1-2` to animate focused screen and unfocused screen respectively.

A config which translates the previous screen slightly to the left, and translates the current screen from the right edge would look like this:

```js
const forSlide = ({ current, next, inverted, layouts: { screen } }) => {
  const progress = Animated.add(
    current.progress.interpolate({
      inputRange: [0, 1],
      outputRange: [0, 1],
      extrapolate: 'clamp',
    }),
    next
      ? next.progress.interpolate({
          inputRange: [0, 1],
          outputRange: [0, 1],
          extrapolate: 'clamp',
        })
      : 0
  );

  return {
    cardStyle: {
      transform: [
        {
          translateX: Animated.multiply(
            progress.interpolate({
              inputRange: [0, 1, 2],
              outputRange: [
                screen.width, // Focused, but offscreen in the beginning
                0, // Fully focused
                screen.width * -0.3, // Fully unfocused
              ],
              extrapolate: 'clamp',
            }),
            inverted
          ),
        },
      ],
    },
  };
};
```

- `headerStyleInterpolator` - This is a function which specifies interpolated styles for various parts of the header. It is expected to return at least empty object, possibly containing interpolated styles for left label and button, right button, title and background. Supported properties are:
  - `leftLabelStyle` - Style for the label of the left button (back button label).
  - `leftButtonStyle` - Style for the left button (usually the back button).
  - `rightButtonStyle` - Style for the right button.
  - `titleStyle` - Style for the header title text.
  - `backgroundStyle` - Style for the header background.

  The function receives the following properties in it's argument:
  - `current` - Values for the current screen (the screen which owns this header).
    - `progress` - Animated node representing the progress value of the current screen. `0` when screen should start coming into view, `0.5` when it's mid-way, `1` when it should be fully in view.
  - `next` - Values for the screen after this one in the stack. This can be `undefined` in case the screen animating is the last one.
    - `progress` - Animated node representing the progress value of the next screen.
  - `layouts` - Layout measurements for various items we use for animation. Each layout object contain `height` and `width` properties.
    - `screen` - Layout of the whole screen.
    - `title` - Layout of the title element. Might be `undefined` when not rendering a title.
    - `leftLabel` - Layout of the back button label. Might be `undefined` when not rendering a back button label.

  A config that just fades the elements looks like this:

  ```js
  const forFade = ({ current, next }) => {
    const opacity = Animated.add(
      current.progress,
      next ? next.progress : 0
    ).interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0, 1, 0],
    });

    return {
      leftButtonStyle: { opacity },
      rightButtonStyle: { opacity },
      titleStyle: { opacity },
      backgroundStyle: { opacity },
    };
  };
  ```

  We can pass this function in `headerStyleInterpolator` option:

  ```js name="Custom Header Style Interpolator" snack static2dynamic
  import * as React from 'react';
  import { Text, View } from 'react-native';
  import {
    createStaticNavigation,
    useNavigation,
  } from '@react-navigation/native';
  import { Button } from '@react-navigation/elements';
  import { createStackNavigator } from '@react-navigation/stack';

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
        <Button onPress={() => navigation.goBack()}>Go back</Button>
      </View>
    );
  }

  // codeblock-focus-start
  const forFade = ({ current, next }) => {
    const opacity = Animated.add(
      current.progress,
      next ? next.progress : 0
    ).interpolate({
      inputRange: [0, 1, 2],
      outputRange: [0, 1, 0],
    });

    return {
      leftButtonStyle: { opacity },
      rightButtonStyle: { opacity },
      titleStyle: { opacity },
      backgroundStyle: { opacity },
    };
  };

  const MyStack = createStackNavigator({
    screens: {
      Home: HomeScreen,
      Profile: {
        screen: ProfileScreen,
        options: {
          headerStyleInterpolator: forFade,
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

### Pre-made configs

With these options, it's possible to build custom transition animations for screens. We also export various configs from the library with ready-made animations which you can use:

#### `TransitionSpecs`

- `TransitionIOSSpec` - Exact values from UINavigationController's animation configuration.
- `FadeInFromBottomAndroidSpec` - Configuration for activity open animation from Android Nougat.
- `FadeOutToBottomAndroidSpec` - Configuration for activity close animation from Android Nougat.
- `RevealFromBottomAndroidSpec` - Approximate configuration for activity open animation from Android Pie.

Example:

```js
import { TransitionSpecs } from '@react-navigation/stack';

// ...

<Stack.Screen
  name="Profile"
  component={Profile}
  options={{
    transitionSpec: {
      open: TransitionSpecs.TransitionIOSSpec,
      close: TransitionSpecs.TransitionIOSSpec,
    },
  }}
/>;
```

#### `CardStyleInterpolators`

- `forHorizontalIOS` - Standard iOS-style slide in from the right.
- `forVerticalIOS` - Standard iOS-style slide in from the bottom (used for modals).
- `forModalPresentationIOS` - Standard iOS-style modal animation in iOS 13.
- `forFadeFromBottomAndroid` - Standard Android-style fade in from the bottom for Android Oreo.
- `forRevealFromBottomAndroid` - Standard Android-style reveal from the bottom for Android Pie.

Example configuration for Android Oreo style vertical screen fade animation:

```js name="Card Style Interpolators" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import {
  createStackNavigator,
  CardStyleInterpolators,
} from '@react-navigation/stack';
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
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: {
      screen: ProfileScreen,
      options: {
        title: 'Profile',
        cardStyleInterpolator: CardStyleInterpolators.forFadeFromBottomAndroid,
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

#### `HeaderStyleInterpolators`

- `forUIKit` - Standard UIKit style animation for the header where the title fades into the back button label.
- `forFade` - Simple fade animation for the header elements.
- `forStatic` - Simple translate animation to translate the header along with the sliding screen.

Example configuration for default iOS animation for header elements where the title fades into the back button:

```js name="Header Style Interpolators" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import {
  createStackNavigator,
  HeaderStyleInterpolators,
} from '@react-navigation/stack';
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
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: {
      screen: ProfileScreen,
      options: {
        title: 'Profile',
        headerStyleInterpolator: HeaderStyleInterpolators.forUIKit,
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

:::warning

Always define your animation configuration at the top-level of the file to ensure that the references don't change across re-renders. This is important for smooth and reliable transition animations.

:::

#### `TransitionPresets`

We export various transition presets which bundle various set of these options together to match certain native animations. A transition preset is an object containing few animation related screen options exported under `TransitionPresets`. Currently the following presets are available:

- `SlideFromRightIOS` - Standard iOS navigation transition.
- `ModalSlideFromBottomIOS` - Standard iOS navigation transition for modals.
- `ModalPresentationIOS` - Standard iOS modal presentation style (introduced in iOS 13).
- `FadeFromBottomAndroid` - Standard Android navigation transition when opening or closing an Activity on Android < 9 (Oreo).
- `RevealFromBottomAndroid` - Standard Android navigation transition when opening or closing an Activity on Android 9 (Pie).
- `ScaleFromCenterAndroid` - Standard Android navigation transition when opening or closing an Activity on Android >= 10.
- `DefaultTransition` - Default navigation transition for the current platform.
- `ModalTransition` - Default modal transition for the current platform.

You can spread these presets in `options` to customize the animation for a screen:

```js name="Transition Presets - Modal Slide" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import {
  createStackNavigator,
  TransitionPresets,
} from '@react-navigation/stack';
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
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: {
      screen: ProfileScreen,
      options: {
        title: 'Profile',
        ...TransitionPresets.ModalSlideFromBottomIOS,
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

If you want to customize the transition animations for all of the screens in the navigator, you can specify it in `screenOptions` prop for the navigator.

Example configuration for iOS modal presentation style:

```js name="Transition Presets - Modal Presentation" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import {
  createStackNavigator,
  TransitionPresets,
} from '@react-navigation/stack';
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
      <Button onPress={() => navigation.goBack()}>Go back</Button>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createStackNavigator({
  initialRouteName: 'Home',
  screenOptions: {
    headerShown: false,
    ...TransitionPresets.ModalPresentationIOS,
  },
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

### Transparent modals

A transparent modal is like a modal dialog which overlays the screen. The previous screen still stays visible underneath. To get a transparent modal screen, you can specify `presentation: 'transparentModal'` in the screen's options.

Example:

```js
<Stack.Navigator>
  <Stack.Screen name="Home" component={HomeStack} />
  <Stack.Screen
    name="Modal"
    component={ModalScreen}
    options={{ presentation: 'transparentModal' }}
  />
</Stack.Navigator>
```

Now, when you navigate to the `Modal` screen, it'll have a transparent background and the `Home` screen will be visible underneath.

In addition to `presentation`, you might want to optionally specify few more things to get a modal dialog like behavior:

- Disable the header with `headerShown: false`
- Enable the overlay with `cardOverlayEnabled: true` (you can't tap the overlay to close the screen this way, see below for alternatives)

If you want to further customize how the dialog animates, or want to close the screen when tapping the overlay etc., you can use the `useCardAnimation` hook to customize elements inside your screen.

Example:

```js
import { Animated, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme, useNavigation } from '@react-navigation/native';
import { useCardAnimation } from '@react-navigation/stack';
import { Button } from '@react-navigation/elements';

function ModalScreen() {
  const navigation = useNavigation('Modal');
  const { colors } = useTheme();
  const { current } = useCardAnimation();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Pressable
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: 'rgba(0, 0, 0, 0.5)' },
        ]}
        onPress={navigation.goBack}
      />
      <Animated.View
        style={{
          padding: 16,
          width: '90%',
          maxWidth: 400,
          borderRadius: 3,
          backgroundColor: colors.card,
          transform: [
            {
              scale: current.progress.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
                extrapolate: 'clamp',
              }),
            },
          ],
        }}
      >
        <Text>
          Mise en place is a French term that literally means “put in place.” It
          also refers to a way cooks in professional kitchens and restaurants
          set up their work stations—first by gathering all ingredients for a
          recipes, partially preparing them (like measuring out and chopping),
          and setting them all near each other. Setting up mise en place before
          cooking is another top tip for home cooks, as it seriously helps with
          organization. It’ll pretty much guarantee you never forget to add an
          ingredient and save you time from running back and forth from the
          pantry ten times.
        </Text>
        <Button
          color={colors.primary}
          style={{ alignSelf: 'flex-end' }}
          onPress={navigation.goBack}
        >
          Okay
        </Button>
      </Animated.View>
    </View>
  );
}
```

Here we animate the scale of the dialog, and also add an overlay to close the dialog.

---

## Native Stack Navigator

Source: https://reactnavigation.org/docs/8.x/native-stack-navigator

Native Stack Navigator provides a way for your app to transition between screens where each new screen is placed on top of a stack.

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack-android.mp4" />
</video>

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack-ios.mp4" />
</video>

This navigator uses the native APIs `UINavigationController` on iOS and `Fragment` on Android so that navigation built with `createNativeStackNavigator` will behave exactly the same and have the same performance characteristics as apps built natively on top of those APIs. It also offers basic Web support using [`react-native-web`](https://github.com/necolas/react-native-web).

One thing to keep in mind is that while `@react-navigation/native-stack` offers native performance and exposes native features such as large title on iOS etc., it may not be as customizable as [`@react-navigation/stack`](stack-navigator.md) depending on your needs. So if you need more customization than what's possible in this navigator, consider using `@react-navigation/stack` instead - which is a more customizable JavaScript based implementation.

## Installation

To use this navigator, ensure that you have [`@react-navigation/native` and its dependencies (follow this guide)](getting-started.md), then install [`@react-navigation/native-stack`](https://github.com/react-navigation/react-navigation/tree/main/packages/native-stack):

```bash npm2yarn
npm install @react-navigation/native-stack@next
```

## Usage

To use this navigator, import it from `@react-navigation/native-stack`:

```js name="Native Stack Navigator" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyStack);

export default function App() {
  return <Navigation />;
}
```

:::info

If you encounter any bugs while using `createNativeStackNavigator`, please open issues on [`react-native-screens`](https://github.com/software-mansion/react-native-screens) rather than the `react-navigation` repository!

:::

## API Definition

### Props

The native stack navigator accepts the [common props](navigator.md#configuration) shared by all navigators.

### Options

The following [options](screen-options.md) can be used to configure the screens in the navigator:

#### `title`

String that can be used as a fallback for `headerTitle`.

#### `statusBarAnimation`

Sets the status bar animation (similar to the `StatusBar` component). Defaults to `fade` on iOS and `none` on Android.

Supported values:

- `"fade"`
- `"none"`
- `"slide"`

On Android, setting either `fade` or `slide` will set the transition of status bar color. On iOS, this option applies to the appereance animation of the status bar.

Requires setting `View controller-based status bar appearance -> YES` (or removing the config) in your `Info.plist` file.

Only supported on Android and iOS.

#### `statusBarHidden`

Whether the status bar should be hidden on this screen.

Requires setting `View controller-based status bar appearance -> YES` (or removing the config) in your `Info.plist` file.

Only supported on Android and iOS.

#### `statusBarStyle`

Sets the status bar color (similar to the `StatusBar` component).

Supported values:

- `"auto"` (iOS only)
- `"inverted"` (iOS only)
- `"dark"`
- `"light"`

Defaults to `auto` on iOS and `light` on Android.

Requires setting `View controller-based status bar appearance -> YES` (or removing the config) in your `Info.plist` file.

Only supported on Android and iOS.

#### `statusBarBackgroundColor`

:::warning

This option is deprecated and will be removed in a future release (for apps targeting Android SDK 35 or above edge-to-edge mode is enabled by default
and it is expected that the edge-to-edge will be enforced in future SDKs, see [here](https://developer.android.com/about/versions/15/behavior-changes-15#ux) for more information).

:::

Sets the background color of the status bar (similar to the `StatusBar` component).

Only supported on Android.

#### `statusBarTranslucent`

:::warning

This option is deprecated and will be removed in a future release (for apps targeting Android SDK 35 or above edge-to-edge mode is enabled by default
and it is expected that the edge-to-edge will be enforced in future SDKs, see [here](https://developer.android.com/about/versions/15/behavior-changes-15#ux) for more information).

:::

Sets the translucency of the status bar (similar to the `StatusBar` component). Defaults to `false`.

Only supported on Android.

#### `contentStyle`

Style object for the scene content.

#### `animationMatchesGesture`

Whether the gesture to dismiss should use animation provided to `animation` prop. Defaults to `false`.

Doesn't affect the behavior of screens presented modally.

Only supported on iOS.

#### `fullScreenGestureEnabled`

Whether the gesture to dismiss should work on the whole screen. Using gesture to dismiss with this option results in the same transition animation as `simple_push`. This behavior can be changed by setting `customAnimationOnGesture` prop. Achieving the default iOS animation isn't possible due to platform limitations. Defaults to `false`.

Doesn't affect the behavior of screens presented modally.

Only supported on iOS.

#### `fullScreenGestureShadowEnabled`

Whether the full screen dismiss gesture has shadow under view during transition. Defaults to `true`.

This does not affect the behavior of transitions that don't use gestures enabled by `fullScreenGestureEnabled` prop.

#### `gestureEnabled`

Whether you can use gestures to dismiss this screen. Defaults to `true`. Only supported on iOS.

#### `animationTypeForReplace`

The type of animation to use when this screen replaces another screen. Defaults to `push`.

Supported values:

- `push`: the new screen will perform push animation.

  <video playsInline autoPlay muted loop>
    <source src="/assets/7.x/native-stack/animationTypeForReplace-push.mp4" />
  </video>

- `pop`: the new screen will perform pop animation.

  <video playsInline autoPlay muted loop>
    <source src="/assets/7.x/native-stack/animationTypeForReplace-pop.mp4" />
  </video>

#### `animation`

How the screen should animate when pushed or popped.

Only supported on Android and iOS.

Supported values:

- `default`: use the platform default animation
  <video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/native-stack-animation-default.mp4" />
  </video>

- `fade`: fade screen in or out
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-fade.mp4" />
  </video>

- `fade_from_bottom`: fade the new screen from bottom
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-fade-from-bottom.mp4" />
  </video>

- `flip`: flip the screen, requires `presentation: "modal"` (iOS only)
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-flip.mp4" />
  </video>

- `simple_push`: default animation, but without shadow and native header transition (iOS only, uses default animation on Android)
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-simple-push.mp4" />
  </video>

- `slide_from_bottom`: slide in the new screen from bottom
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-slide-from-bottom.mp4" />
  </video>

- `slide_from_right`: slide in the new screen from right (Android only, uses default animation on iOS)
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-slide-from-right.mp4" />
  </video>

- `slide_from_left`: slide in the new screen from left (Android only, uses default animation on iOS)
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-slide-from-left.mp4" />
  </video>

- `none`: don't animate the screen
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/native-stack-animation-none.mp4" />
  </video>

#### `presentation`

How should the screen be presented.

Only supported on Android and iOS.

Supported values:

- `card`: the new screen will be pushed onto a stack, which means the default animation will be slide from the side on iOS, the animation on Android will vary depending on the OS version and theme.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-card.mp4" />
  </video>

- `modal`: the new screen will be presented modally. this also allows for a nested stack to be rendered inside the screen.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-modal.mp4" />
  </video>

- `transparentModal`: the new screen will be presented modally, but in addition, the previous screen will stay so that the content below can still be seen if the screen has translucent background.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-transparentModal.mp4" />
  </video>

- `containedModal`: will use "UIModalPresentationCurrentContext" modal style on iOS and will fallback to "modal" on Android.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-containedModal.mp4" />
  </video>

- `containedTransparentModal`: will use "UIModalPresentationOverCurrentContext" modal style on iOS and will fallback to "transparentModal" on Android.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-containedTransparentModal.mp4" />
  </video>

- `fullScreenModal`: will use "UIModalPresentationFullScreen" modal style on iOS and will fallback to "modal" on Android. A screen using this presentation style can't be dismissed by gesture.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-fullScreenModal.mp4" />
  </video>

- `formSheet`: will use "BottomSheetBehavior" on Android and "UIModalPresentationFormSheet" modal style on iOS.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-formSheet-android.mp4" />
  </video>
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/native-stack/presentation-formSheet-ios.mp4" />
  </video>

##### Using Form Sheet

To use Form Sheet for your screen, add `presentation: 'formSheet'` to the `options`.

```js name="Form Sheet" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';

// codeblock-focus-start
import { createNativeStackNavigator } from '@react-navigation/native-stack';

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
    <View style={{ padding: 15 }}>
      <Text style={{ fontSize: 30, fontWeight: 'bold' }}>Profile Screen</Text>
      <Text style={{ marginTop: 10 }}>
        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Etiam accumsan
        euismod enim, quis porta ligula egestas sed. Maecenas vitae consequat
        odio, at dignissim lorem. Ut euismod eros ac mi ultricies, vel pharetra
        tortor commodo. Interdum et malesuada fames ac ante ipsum primis in
        faucibus. Nullam at urna in metus iaculis aliquam at sed quam. In
        ullamcorper, ex ut facilisis commodo, urna diam posuere urna, at
        condimentum mi orci ac ipsum. In hac habitasse platea dictumst. Donec
        congue pharetra ipsum in finibus. Nulla blandit finibus turpis, non
        vulputate elit viverra a. Curabitur in laoreet nisl.
      </Text>
      <Button onPress={() => navigation.goBack()} style={{ marginTop: 15 }}>
        Go back
      </Button>
    </View>
  );
}

// codeblock-focus-start
const MyStack = createNativeStackNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
    },
    Profile: {
      screen: ProfileScreen,
      options: {
        presentation: 'formSheet',
        headerShown: false,
        sheetAllowedDetents: 'fitToContents',
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

:::warning

Due to technical issues in platform component integration with `react-native`, `presentation: 'formSheet'` has limited support for `flex: 1`.

On Android, using `flex: 1` on a top-level content container passed to a `formSheet` with `showAllowedDetents: 'fitToContents'` causes the sheet to not display at all, leaving only the dimmed background visible. This is because it is the sheet, not the parent who is source of the size. Setting fixed values for `sheetAllowedDetents`, e.g. `[0.4, 0.9]`, works correctly (content is aligned for the highest detent).

On iOS, `flex: 1` with `showAllowedDetents: 'fitToContents'` works properly but setting a fixed value for `showAllowedDetents` causes the screen to not respect the `flex: 1` style - the height of the container does not fill the `formSheet` fully, but rather inherits intrinsic size of its contents. This tradeoff is _currently_ necessary to prevent ["sheet flickering" problem on iOS](https://github.com/software-mansion/react-native-screens/issues/1722).

If you don't use `flex: 1` but the content's height is less than max screen height, the rest of the sheet might become translucent or use the default theme background color (you can see this happening on the screenshots in the descrption of [this PR](https://github.com/software-mansion/react-native-screens/pull/2462)). To match the sheet to the background of your content, set `backgroundColor` in the `contentStyle` prop of the given screen.

On Android, there are also some problems with getting nested ScrollViews to work properly. The solution is to set `nestedScrollEnabled` on the `ScrollView`, but this does not work if the content's height is less than the `ScrollView`'s height. Please see [this PR](https://github.com/facebook/react-native/pull/44099) for details and suggested [workaround](https://github.com/facebook/react-native/pull/44099#issuecomment-2058469661).

On Android, nested stack and `headerShown` prop are not currently supported for screens with `presentation: 'formSheet'`.

:::

#### `sheetAllowedDetents`

:::note

Works only when `presentation` is set to `formSheet`.

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/formSheet-sheetAllowedDetents.mp4" />
</video>

Describes heights where a sheet can rest.

Supported values:

- `fitToContents` - intents to set the sheet height to the height of its contents.
- Array of fractions, e.g. `[0.25, 0.5, 0.75]`:
  - Heights should be described as fraction (a number from `[0, 1]` interval) of screen height / maximum detent height.
  - The array **must** be sorted in ascending order. This invariant is verified only in developement mode, where violation results in error.
  - iOS accepts any number of detents, while **Android is limited to three** - any surplus values, beside first three are ignored.

Defaults to `[1.0]`.

Only supported on Android and iOS.

#### `sheetElevation`

:::note

Works only when `presentation` is set to `formSheet`.

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/formSheet-sheetElevation.mp4" />
</video>

Integer value describing elevation of the sheet, impacting shadow on the top edge of the sheet.

Not dynamic - changing it after the component is rendered won't have an effect.

Defaults to `24`.

Only supported on Android.

#### `sheetExpandsWhenScrolledToEdge`

:::note

Works only when `presentation` is set to `formSheet`.

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/formSheet-sheetExpandsWhenScrolledToEdge.mp4" />
</video>

Whether the sheet should expand to larger detent when scrolling.

Defaults to `true`.

Only supported on iOS.

:::warning

Please note that for this interaction to work, the ScrollView must be "first-subview-chain" descendant of the Screen component. This restriction is due to platform requirements.

:::

#### `sheetCornerRadius`

:::note

Works only when `presentation` is set to `formSheet`.

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/formSheet-sheetCornerRadius.mp4" />
</video>

The corner radius that the sheet will try to render with.

If set to non-negative value it will try to render sheet with provided radius, else it will apply system default.

If left unset, system default is used.

Only supported on Android and iOS.

#### `sheetInitialDetentIndex`

:::note

Works only when `presentation` is set to `formSheet`.

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/formSheet-sheetInitialDetentIndex.mp4" />
</video>

**Index** of the detent the sheet should expand to after being opened.

If the specified index is out of bounds of `sheetAllowedDetents` array, in dev environment more errors will be thrown, in production the value will be reset to default value.

Additionaly there is `last` value available, when set the sheet will expand initially to last (largest) detent.

Defaults to `0` - which represents first detent in the detents array.

Only supported on Android and iOS.

#### `sheetGrabberVisible`

:::note

Works only when `presentation` is set to `formSheet`.

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/formSheet-sheetGrabberVisible.mp4" />
</video>

Boolean indicating whether the sheet shows a grabber at the top.

Defaults to `false`.

Only supported on iOS.

#### `sheetLargestUndimmedDetentIndex`

:::note

Works only when `presentation` is set to `formSheet`.

:::

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-stack/formSheet-sheetLargestUndimmedDetentIndex.mp4" />
</video>

The largest sheet detent for which a view underneath won't be dimmed.

This prop can be set to an number, which indicates index of detent in `sheetAllowedDetents` array for which there won't be a dimming view beneath the sheet.

Additionaly there are following options available:

- `none` - there will be dimming view for all detents levels,
- `last` - there won't be a dimming view for any detent level.

:::warning

On iOS, the native implementation might resize the the sheet w/o explicitly changing the detent level, e.g. in case of keyboard appearance.

In case after such resize the sheet exceeds height for which in regular scenario a dimming view would be applied - it will be applied, even if the detent has not effectively been changed.

:::

Defaults to `none`, indicating that the dimming view should be always present.

Only supported on Android and iOS.

#### `sheetShouldOverflowTopInset`

:::note

Works only when `presentation` is set to `formSheet`.

:::

Boolean indicating whether the sheet content should be rendered behind the **status bar** or **display cutouts**.

When set to `true`, the sheet will extend to the physical edges of the stack, allowing content to be visible behind the status bar or display cutouts. Detent ratios in `sheetAllowedDetents` will be measured relative to the **full stack height**.

When set to `false`, the sheet's layout will be constrained by the inset from the top and the detent ratios will then be measured relative to the **adjusted height** (excluding the top inset). This means that `sheetAllowedDetents` will result in different sheet heights depending on this prop.

Defaults to `false`.

Only supported on Android.

#### `sheetResizeAnimationEnabled`

:::note

Works only when `presentation` is set to `formSheet`.

:::

Boolean indicating whether the default native animation should be used when the sheet's content size changes (specifically when using `fitToContents`).

When set to `true`, the sheet uses internal logic to synchronize size updates and translation animations during entry, exit, or content updates. This ensures a smooth transition for standard, static content mounting/unmounting.

When set to `false`, the internal animation and translation logic is ignored. This allows the sheet to adjust its size dynamically based on the current dimensions of the content provided by the developer, allowing implementing **custom resizing animations**.

Defaults to `true`.

Only supported on Android.

#### `orientation`

The display orientation to use for the screen.

Supported values:

- `default` - resolves to "all" without "portrait_down" on iOS. On Android, this lets the system decide the best orientation.
- `all`: all orientations are permitted.
- `portrait`: portrait orientations are permitted.
- `portrait_up`: right-side portrait orientation is permitted.
- `portrait_down`: upside-down portrait orientation is permitted.
- `landscape`: landscape orientations are permitted.
- `landscape_left`: landscape-left orientation is permitted.
- `landscape_right`: landscape-right orientation is permitted.

Only supported on Android and iOS.

#### `autoHideHomeIndicator`

Boolean indicating whether the home indicator should prefer to stay hidden. Defaults to `false`.

Only supported on iOS.

#### `gestureDirection`

Sets the direction in which you should swipe to dismiss the screen.

Supported values:

- `vertical` – dismiss screen vertically
- `horizontal` – dismiss screen horizontally (default)

When using `vertical` option, options `fullScreenGestureEnabled: true`, `customAnimationOnGesture: true` and `animation: 'slide_from_bottom'` are set by default.

Only supported on iOS.

#### `animationDuration`

Changes the duration (in milliseconds) of `slide_from_bottom`, `fade_from_bottom`, `fade` and `simple_push` transitions on iOS. Defaults to `500`.

The duration is not customizable for:

- Screens with `default` and `flip` animations
- Screens with `presentation` set to `modal`, `formSheet`, `pageSheet` (regardless of animation)

Only supported on iOS.

#### `navigationBarColor`

:::warning

This option is deprecated and will be removed in a future release (for apps targeting Android SDK 35 or above edge-to-edge mode is enabled by default
and it is expected that the edge-to-edge will be enforced in future SDKs, see [here](https://developer.android.com/about/versions/15/behavior-changes-15#ux) for more information).

:::

Sets the navigation bar color. Defaults to initial status bar color.

Only supported on Android.

#### `navigationBarHidden`

Boolean indicating whether the navigation bar should be hidden. Defaults to `false`.

Only supported on Android.

#### `freezeOnBlur`

Boolean indicating whether to prevent inactive screens from re-rendering. Defaults to `false`.
Defaults to `true` when `enableFreeze()` from `react-native-screens` package is run at the top of the application.

Only supported on iOS and Android.

#### `scrollEdgeEffects`

Configures the scroll edge effect for the _content ScrollView_ (the ScrollView that is present in first descendants chain of the Screen).
Depending on values set, it will blur the scrolling content below certain UI elements (e.g. header items, search bar) for the specified edge of the ScrollView.
When set in nested containers, i.e. Native Stack inside Native Bottom Tabs, or the other way around, the ScrollView will use only the innermost one's config.

Edge effects can be configured for each edge separately. The following values are currently supported:

- `automatic` - the automatic scroll edge effect style,
- `hard` - a scroll edge effect with a hard cutoff and dividing line,
- `soft` - a soft-edged scroll edge effect,
- `hidden` - no scroll edge effect.

Defaults to `automatic` for each edge.

:::note

Using both `blurEffect` and `scrollEdgeEffects` (>= iOS 26) simultaneously may cause overlapping effects.

:::

Only supported on iOS, starting from iOS 26.

### Header related options

The navigator supports following options to configure the header:

#### `headerBackButtonMenuEnabled`

Boolean indicating whether to show the menu on longPress of iOS >= 14 back button. Defaults to `true`.

Only supported on iOS.

<img src="/assets/7.x/native-stack/headerBackButtonMenuEnabled.png" width="500" alt="Header back button menu enabled" />

#### `headerBackVisible`

Whether the back button is visible in the header. You can use it to show a back button alongside `headerLeft` if you have specified it.

This will have no effect on the first screen in the stack.

#### `headerBackTitle`

Title string used by the back button on iOS. Defaults to the previous scene's title, "Back" or arrow icon depending on the available space. See `headerBackButtonDisplayMode` to read about limitations and customize the behavior.

Use `headerBackButtonDisplayMode: "minimal"` to hide it.

Only supported on iOS.

<img src="/assets/7.x/native-stack/headerBackTitle.jpeg" width="500" alt="Header back title" />

#### `headerBackButtonDisplayMode`

How the back button displays icon and title.

Supported values:

- "default" - Displays one of the following depending on the available space: previous screen's title, generic title (e.g. 'Back') or no title (only icon).
- "generic" – Displays one of the following depending on the available space: generic title (e.g. 'Back') or no title (only icon).
- "minimal" – Always displays only the icon without a title.

The space-aware behavior is disabled when:

- The iOS version is 13 or lower
- Custom font family or size is set (e.g. with `headerBackTitleStyle`)
- Back button menu is disabled (e.g. with `headerBackButtonMenuEnabled`)

In such cases, a static title and icon are always displayed.

Only supported on iOS.

#### `headerBackTitleStyle`

Style object for header back title. Supported properties:

- `fontFamily`
- `fontSize`

Only supported on iOS.

<img src="/assets/7.x/native-stack/headerBackTitleStyle.png" width="500" alt="Header back title style" />

Example:

```js
headerBackTitleStyle: {
  fontSize: 14,
  fontFamily: 'Georgia',
},
```

#### `headerBackIcon`

Icon to display in the header as the icon in the back button. Defaults to back icon image for the platform:

- A chevron on iOS
- An arrow on Android

Currently only supports image sources.

Example:

```js
headerBackIcon: {
  type: 'image',
  source: require('./path/to/icon.png'),
}
```

#### `headerLargeStyle`

Style of the header when a large title is shown. The large title is shown if `headerLargeTitleEnabled` is `true` and the edge of any scrollable content reaches the matching edge of the header.

Supported properties:

- backgroundColor

Only supported on iOS.

<video playsInline autoPlay muted loop style={{ width: "500px" }}>

  <source src="/assets/7.x/native-stack/headerLargeStyle.mp4" />
</video>

#### `headerLargeTitleEnabled`

Whether to enable header with large title which collapses to regular header on scroll.
Defaults to `false`.

For large title to collapse on scroll, the content of the screen should be wrapped in a scrollable view such as `ScrollView` or `FlatList`. If the scrollable area doesn't fill the screen, the large title won't collapse on scroll. You also need to specify `contentInsetAdjustmentBehavior="automatic"` in your `ScrollView`, `FlatList` etc.

Only supported on iOS.

<video playsInline autoPlay muted loop style={{ width: "500px" }}>

  <source src="/assets/7.x/native-stack/headerLargeTitle.mp4" />
</video>

#### `headerLargeTitleShadowVisible`

Whether drop shadow of header is visible when a large title is shown.

#### `headerLargeTitleStyle`

Style object for large title in header. Supported properties:

- `fontFamily`
- `fontSize`
- `fontWeight`
- `color`

Only supported on iOS.

<img src="/assets/7.x/native-stack/headerLargeTitleStyle.png" width="500" alt="Header large title style" />

Example:

```js
    headerLargeTitleStyle: {
      fontFamily: 'Georgia',
      fontSize: 22,
      fontWeight: '500',
      color: 'blue',
    },
```

#### `headerStyle`

Style object for header. Supported properties:

- `backgroundColor`

<video playsInline autoPlay muted loop style={{ width: "500px" }}>

  <source src="/assets/7.x/native-stack/headerStyle.mp4" />
</video>

#### `headerShadowVisible`

Whether to hide the elevation shadow (Android) or the bottom border (iOS) on the header.

Android:
<img src="/assets/7.x/native-stack/headerShadowVisible-Android.png" width="500" alt="Header shadow visible Android" />

iOS:
<img src="/assets/7.x/native-stack/headerShadowVisible-iOS.png" width="500" alt="Header shadow visible iOS" />

#### `headerTransparent`

Boolean indicating whether the navigation bar is translucent.

Defaults to `false`. Setting this to `true` makes the header absolutely positioned - so that the header floats over the screen so that it overlaps the content underneath, and changes the background color to `transparent` unless specified in `headerStyle`.

This is useful if you want to render a semi-transparent header or a blurred background.

Note that if you don't want your content to appear under the header, you need to manually add a top margin to your content. React Navigation won't do it automatically.

To get the height of the header, you can use [`HeaderHeightContext`](elements.md#headerheightcontext) with [React's Context API](https://react.dev/reference/react/useContext#contextconsumer) or [`useHeaderHeight`](elements.md#useheaderheight).

#### `headerBlurEffect`

Blur effect for the translucent header. The `headerTransparent` option needs to be set to `true` for this to work.

Supported values:

- `extraLight`

- `light`
  <img src="/assets/7.x/native-stack/headerBlurEffect-light.png" width="500" alt="Header blur effect light" />

- `dark`
  <img src="/assets/7.x/native-stack/headerBlurEffect-dark.png" width="500" alt="Header blur effect dark" />

- `regular`
  <img src="/assets/7.x/native-stack/headerBlurEffect-regular.png" width="500" alt="Header blur effect regular" />

- `prominent`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemUltraThinMaterial.png" width="500" alt="Header blur effect systemUltraThinMaterial" />

- `systemUltraThinMaterial`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemUltraThinMaterial.png" width="500" alt="Header blur effect systemUltraThinMaterial" />

- `systemThinMaterial`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemThinMaterial.png" width="500" alt="Header blur effect systemThinMaterial" />

- `systemMaterial`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemMaterial.png" width="500" alt="Header blur effect systemMaterial" />

- `systemThickMaterial`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemThickMaterial.png" width="500" alt="Header blur effect systemThickMaterial" />

- `systemChromeMaterial`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemChromeMaterial.png" width="500" alt="Header blur effect systemChromeMaterial" />

- `systemUltraThinMaterialLight`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemUltraThinMaterialLight.png" width="500" alt="Header blur effect systemUltraThinMaterialLight" />

- `systemThinMaterialLight`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemThinMaterialLight.png" width="500" alt="Header blur effect systemThinMaterialLight" />

- `systemMaterialLight`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemMaterialLight.png" width="500" alt="Header blur effect systemMaterialLight" />

- `systemThickMaterialLight`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemThickMaterialLight.png" width="500" alt="Header blur effect systemThickMaterialLight" />

- `systemChromeMaterialLight`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemChromeMaterialLight.png" width="500" alt="Header blur effect systemChromeMaterialLight" />

- `systemUltraThinMaterialDark`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemUltraThinMaterialDark.png" width="500" alt="Header blur effect systemUltraThinMaterialDark" />
- `systemThinMaterialDark`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemThinMaterialDark.png" width="500" alt="Header blur effect systemThinMaterialDark" />

- `systemMaterialDark`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemMaterialDark.png" width="500" alt="Header blur effect systemMaterialDark" />
- `systemThickMaterialDark`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemThickMaterialDark.png" width="500" alt="Header blur effect systemThickMaterialDark" />

- `systemChromeMaterialDark`
  <img src="/assets/7.x/native-stack/headerBlurEffect-systemChromeMaterialDark.png" width="500" alt="Header blur effect systemChromeMaterialDark" />

:::note

Using both [`headerBlurEffect`](#headerblureffect) and `scrollEdgeEffects` (>= iOS 26) simultaneously may cause overlapping effects.

:::

Only supported on iOS.

#### `headerBackground`

Function which returns a React Element to render as the background of the header. This is useful for using backgrounds such as an image or a gradient.

  <img src="/assets/7.x/native-stack/headerBackground.png" width="500" alt="Header background"/>

Example:

```js
     headerBackground: () => (
      <LinearGradient
        colors={['#c17388', '#90306f']}
        style={{ flex: 1 }}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      />
      ),
```

#### `headerTintColor`

Tint color for the header. Changes the color of back button and title.

  <img src="/assets/7.x/native-stack/headerTintColor.png" width="500" alt="Header tint color" />

#### `headerLeft`

Function which returns a React Element to display on the left side of the header. This replaces the back button. See `headerBackVisible` to show the back button along side left element. It receives the following properties in the arguments:

- `tintColor` - The tint color to apply. Defaults to the [theme](themes.md)'s primary color.
- `canGoBack` - Boolean indicating whether there is a screen to go back to.
- `label` - Label text for the button. Usually the title of the previous screen.
- `href` - The `href` to use for the anchor tag on web

<img src="/assets/7.x/native-stack/headerLeft.png" width="500" alt="Header right"/>

Example:

```js
    headerLeft: () => (
      <MaterialCommunityIcons name="map" color="gray" size={36} />
    ),
    headerBackVisible: true,
    headerBackTitle: 'Back',
```

#### `headerLeftBackgroundVisible`

Whether the liquid glass background is visible for the item.

Only supported on iOS 26.0 and later. Older versions of iOS and other platforms never show the background.

Defaults to `true`.

#### `unstable_headerLeftItems`

:::warning

This option is experimental and may change in a minor release.

:::

Function which returns an array of items to display as on the left side of the header. This will override `headerLeft` if both are specified. It receives the following properties in the arguments:

- `tintColor` - The tint color to apply. Defaults to the [theme](themes.md)'s primary color.
- `canGoBack` - Boolean indicating whether there is a screen to go back to.

Example:

```js
unstable_headerLeftItems: () => [
  {
    type: 'button',
    title: 'Edit',
    onPress: () => {
      // Do something
    },
  },
],
```

See [Header items](#header-items) for more information.

Only supported on iOS.

#### `headerRight`

Function which returns a React Element to display on the right side of the header. It receives the following properties in the arguments:

- `tintColor` - The tint color to apply. Defaults to the [theme](themes.md)'s primary color.
- `canGoBack` - Boolean indicating whether there is a screen to go back to.

  <img src="/assets/7.x/native-stack/headerRight.png" width="500" alt="Header right"/>

Example:

```js
headerRight: () => <MaterialCommunityIcons name="map" color="blue" size={36} />;
```

#### `headerRightBackgroundVisible`

Whether the liquid glass background is visible for the item.

Only supported on iOS 26.0 and later. Older versions of iOS and other platforms never show the background.\

Defaults to `true`.

#### `unstable_headerRightItems`

:::warning

This option is experimental and may change in a minor release.

:::

Function which returns an array of items to display as on the right side of the header. This will override `headerRight` if both are specified. It receives the following properties in the arguments:

- `tintColor` - The tint color to apply. Defaults to the [theme](themes.md)'s primary color.
- `canGoBack` - Boolean indicating whether there is a screen to go back to.

Example:

```js
unstable_headerRightItems: () => [
  {
    type: 'button',
    title: 'Edit',
    onPress: () => {
      // Do something
    },
  },
],
```

See [Header items](#header-items) for more information.

Only supported on iOS.

#### `headerTitle`

String or a function that returns a React Element to be used by the header. Defaults to `title` or name of the screen.

When a function is passed, it receives `tintColor` and`children` in the options object as an argument. The title string is passed in `children`.

Note that if you render a custom element by passing a function, animations for the title won't work.

#### `headerTitleAlign`

How to align the header title. Possible values:

- `left`
  <img src="/assets/7.x/native-stack/headerTitleAlign-left.png" width="500" alt="Header title align left"/>

- `center`
  <img src="/assets/7.x/native-stack/headerTitleAlign-center.png" width="500" alt="Header title align center"/>

Defaults to `left` on platforms other than iOS.

Not supported on iOS. It's always `center` on iOS and cannot be changed.

#### `headerTitleStyle`

Style object for header title. Supported properties:

- `fontFamily`
- `fontSize`
- `fontWeight`
- `color`

  <img src="/assets/7.x/native-stack/headerTitleStyle.png" width="500" alt="Header title style"/>

Example:

```js
    headerTitleStyle: {
      color: 'blue',
      fontSize: 22,
      fontFamily: 'Georgia',
      fontWeight: 300,
    },
```

#### `headerSearchBarOptions`

Options to render a native search bar. Search bars are rarely static so normally it is controlled by passing an object to `headerSearchBarOptions` navigation option in the component's body.

On iOS, you also need to specify `contentInsetAdjustmentBehavior="automatic"` in your `ScrollView`, `FlatList` etc. If you don't have a `ScrollView`, specify `headerTransparent: false`.

Example:

```js
React.useLayoutEffect(() => {
  navigation.setOptions({
    headerSearchBarOptions: {
      // search bar options
    },
  });
}, [navigation]);
```

Supported properties are:

##### `ref`

Ref to manipulate the search input imperatively. It contains the following methods:

- `focus` - focuses the search bar
- `blur` - removes focus from the search bar
- `setText` - sets the search bar's content to given value
- `clearText` - removes any text present in the search bar input field
- `cancelSearch` - cancel the search and close the search bar
- `toggleCancelButton` - depending on passed boolean value, hides or shows cancel button (only supported on iOS)

##### `autoCapitalize`

Controls whether the text is automatically auto-capitalized as it is entered by the user.
Possible values:

- `systemDefault`
- `none`
- `words`
- `sentences`
- `characters`

Defaults to `systemDefault` which is the same as `sentences` on iOS and `none` on Android.

##### `autoFocus`

Whether to automatically focus search bar when it's shown. Defaults to `false`.

Only supported on Android.

##### `barTintColor`

The search field background color. By default bar tint color is translucent.

Only supported on iOS.

<img src="/assets/7.x/native-stack/headerSearchBarOptions-barTintColor.png" width="500" alt="Header search bar options - Bar tint color" />

##### `tintColor`

The color for the cursor caret and cancel button text.

Only supported on iOS.

<img src="/assets/7.x/native-stack/headerSearchBarOptions-tintColor.png" width="500" alt="Header search bar options - Tint color" />

##### `cancelButtonText`

The text to be used instead of default `Cancel` button text.

Only supported on iOS. **Deprecated** starting from iOS 26.

##### `disableBackButtonOverride`

Whether the back button should close search bar's text input or not. Defaults to `false`.

Only supported on Android.

##### `hideNavigationBar`

Boolean indicating whether to hide the navigation bar during searching.

If left unset, system default is used.

Only supported on iOS.

##### `hideWhenScrolling`

Boolean indicating whether to hide the search bar when scrolling. Defaults to `true`.

Only supported on iOS.

##### `inputType`

The type of the input. Defaults to `"text"`.

Supported values:

- `"text"`
- `"phone"`
- `"number"`
- `"email"`

Only supported on Android.

##### `obscureBackground`

Boolean indicating whether to obscure the underlying content with semi-transparent overlay.

If left unset, system default is used.

Only supported on iOS.

##### `placement`

Controls preferred placement of the search bar. Defaults to `automatic`.

Supported values:

- `automatic`
- `stacked`
- `inline` (**deprecated** starting from iOS 26, it is mapped to `integrated`)
- `integrated` (available starting from iOS 26, on prior versions it is mapped to `inline`)
- `integratedButton` (available starting from iOS 26, on prior versions it is mapped to `inline`)
- `integratedCentered` (available starting from iOS 26, on prior versions it is mapped to `inline`)

Only supported on iOS.

##### `allowToolbarIntegration`

Boolean indicating whether the system can place the search bar among other toolbar items on iPhone.

Set this prop to `false` to prevent the search bar from appearing in the toolbar when `placement` is `automatic`, `integrated`, `integratedButton` or `integratedCentered`.

Defaults to `true`. If `placement` is set to `stacked`, the value of this prop will be overridden with `false`.

Only supported on iOS, starting from iOS 26.

##### `placeholder`

Text displayed when search field is empty.

##### `textColor`

The color of the text in the search field.

<img src="/assets/7.x/native-stack/headerSearchBarOptions-textColor.png" width="500" alt="Header search bar options - Text color" />

##### `hintTextColor`

The color of the hint text in the search field.

Only supported on Android.

<img src="/assets/7.x/native-stack/headerSearchBarOptions-hintTextColor.png" width="500" alt="Header search bar options - Hint text color" />

##### `headerIconColor`

The color of the search and close icons shown in the header

Only supported on Android.

<img src="/assets/7.x/native-stack/headerSearchBarOptions-headerIconColor.png" width="500" alt="Header search bar options - Header icon color" />

##### `shouldShowHintSearchIcon`

Whether to show the search hint icon when search bar is focused. Defaults to `true`.

Only supported on Android.

##### `onBlur`

A callback that gets called when search bar has lost focus.

##### `onCancelButtonPress`

A callback that gets called when the cancel button is pressed.

##### `onSearchButtonPress`

A callback that gets called when the search button is pressed.

```js
const [search, setSearch] = React.useState('');

React.useLayoutEffect(() => {
  navigation.setOptions({
    headerSearchBarOptions: {
      onSearchButtonPress: (event) => setSearch(event?.nativeEvent?.text),
    },
  });
}, [navigation]);
```

##### `onChange`

A callback that gets called when the text changes. It receives en event containing the current text value of the search bar.

Example:

```js
const [search, setSearch] = React.useState('');

React.useLayoutEffect(() => {
  navigation.setOptions({
    headerSearchBarOptions: {
      onChange: (event) => setSearch(event.nativeEvent.text),
    },
  });
}, [navigation]);
```

#### `headerShown`

Whether to show the header. The header is shown by default. Setting this to `false` hides the header.

#### `header`

Custom header to use instead of the default header.

This accepts a function that returns a React Element to display as a header. The function receives an object containing the following properties as the argument:

- `navigation` - The navigation object for the current screen.
- `route` - The route object for the current screen.
- `options` - The options for the current screen
- `back` - Options for the back button, contains an object with a `title` property to use for back button label.

Example:

```js
import { getHeaderTitle } from '@react-navigation/elements';

// ..

header: ({ navigation, route, options, back }) => {
  const title = getHeaderTitle(options, route.name);

  return (
    <MyHeader
      title={title}
      leftButton={
        back ? <MyBackButton onPress={navigation.goBack} /> : undefined
      }
      style={options.headerStyle}
    />
  );
};
```

To set a custom header for all the screens in the navigator, you can specify this option in the `screenOptions` prop of the navigator.

Note that if you specify a custom header, the native functionality such as large title, search bar etc. won't work.

### Events

The navigator can [emit events](navigation-events.md) on certain actions. Supported events are:

#### `transitionStart`

This event is fired when the transition animation starts for the current screen.

Event data:

- `e.data.closing` - Boolean indicating whether the screen is being opened or closed.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('transitionStart', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `transitionEnd`

This event is fired when the transition animation ends for the current screen.

Event data:

- `e.data.closing` - Boolean indicating whether the screen was opened or closed.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('transitionEnd', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `gestureCancel`

This event is fired when the swipe back gesture is canceled. Only supported on iOS.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('gestureCancel', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `sheetDetentChange`

This event is fired when the screen has [`presentation`](#presentation) set to `formSheet` and the sheet detent changes.

Event data:

- `e.data.index` - Index of the current detent in the `sheetAllowedDetents` array.
- `e.data.stable` - Boolean indicating whether the sheet is being dragged or settling. Only supported on Android. On iOS, this is always `true`.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('sheetDetentChange', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

### Helpers

The native stack navigator adds the following methods to the navigation object:

#### `replace`

Replaces the current screen with a new screen in the stack. The method accepts the following arguments:

- `name` - _string_ - Name of the route to push onto the stack.
- `params` - _object_ - Screen params to pass to the destination route.

```js
navigation.replace('Profile', { owner: 'Michaś' });
```

#### `push`

Pushes a new screen to the top of the stack and navigate to it. The method accepts the following arguments:

- `name` - _string_ - Name of the route to push onto the stack.
- `params` - _object_ - Screen params to pass to the destination route.

```js
navigation.push('Profile', { owner: 'Michaś' });
```

#### `pop`

Pops the current screen from the stack and navigates back to the previous screen. It takes one optional argument (`count`), which allows you to specify how many screens to pop back by.

```js
navigation.pop();
```

#### `popTo`

Navigates back to a previous screen in the stack by popping screens after it. The method accepts the following arguments:

- `name` - _string_ - Name of the route to navigate to.
- `params` - _object_ - Screen params to pass to the destination route.
- `options` - Options object containing the following properties:
  - `merge` - _boolean_ - Whether params should be merged with the existing route params, or replace them (when navigating to an existing screen). Defaults to `false`.

If a matching screen is not found in the stack, this will pop the current screen and add a new screen with the specified name and params.

```js
navigation.popTo('Profile', { owner: 'Michaś' });
```

#### `popToTop`

Pops all of the screens in the stack except the first one and navigates to it.

```js
navigation.popToTop();
```

### Hooks

The native stack navigator exports the following hooks:

#### `useAnimatedHeaderHeight`

The hook returns an animated value representing the height of the header. This is similar to [`useHeaderHeight`](elements.md#useheaderheight) but returns an animated value that changed as the header height changes, e.g. when expanding or collapsing large title or search bar on iOS.

It can be used to animated content along with header height changes.

```js
import { Animated } from 'react-native';
import { useAnimatedHeaderHeight } from '@react-navigation/native-stack';

const MyView = () => {
  const headerHeight = useAnimatedHeaderHeight();

  return (
    <Animated.View
      style={{
        height: 100,
        aspectRatio: 1,
        backgroundColor: 'tomato',
        transform: [{ translateY: headerHeight }],
      }}
    />
  );
};
```

## Header items

The [`unstable_headerLeftItems`](#unstable_headerleftitems) and [`unstable_headerRightItems`](#unstable_headerrightitems) options allow you to add header items to the left and right side of the header respectively. This items can show native buttons, menus or custom React elements.

On iOS 26+, the header right items can also be collapsed into an overflow menu by the system when there is not enough space to show all items. Note that custom elements (with `type: 'custom'`) won't be collapsed into the overflow menu.

<img src="/assets/header-items/header-items.png" width="300" alt="Header items" />

<img src="/assets/header-items/header-items-menu.png" width="300" alt="Header item with menu" />

There are 3 categories of items that can be displayed in the header:

### Action

A regular button that performs an action when pressed, or shows a menu.

Common properties:

- `type`: Must be `button` or `menu`.
- `label`: Label of the item. The label is not shown if `icon` is specified. However, it is used by screen readers, or if the header items get collapsed due to lack of space.
- `labelStyle`: Style object for the label. Supported properties:
  - `fontFamily`
  - `fontSize`
  - `fontWeight`
  - `color`
- `icon`: Optional icon to show instead of the label.

  The icon can be an image:

  ```js
  {
    type: 'image',
    source: require('./path/to/image.png'),
    tinted: true, // Whether to apply tint color to the icon. Defaults to true.
  }
  ```

  Or a [SF Symbols](https://developer.apple.com/sf-symbols/) name:

  ```js
  {
    type: 'sfSymbol',
    name: 'heart',
  }
  ```

- `variant`: Visual variant of the button. Supported values:
  - `plain` (default)
  - `done`
  - `prominent` (iOS 26+)
- `tintColor`: Tint color to apply to the item.
- `disabled`: Whether the item is disabled.
- `width`: Width of the item.
- `hidesSharedBackground` (iOS 26+): Whether the background this item may share with other items in the bar should be hidden. Setting this to `true` hides the liquid glass background.
- `sharesBackground` (iOS 26+): Whether this item can share a background with other items. Defaults to `true`.
- `identifier` (iOS 26+) - An identifier used to match items across transitions.
- `badge` (iOS 26+): An optional badge to display alongside the item. Supported properties:
  - `value`: The value to display in the badge. It can be a string or a number.
  - `style`: Style object for the badge. Supported properties:
    - `fontFamily`
    - `fontSize`
    - `fontWeight`
    - `color`
    - `backgroundColor`
- `accessibilityLabel`: Accessibility label for the item.
- `accessibilityHint`: Accessibility hint for the item.

Supported properties when `type` is `button`:

- `onPress`: Function to call when the button is pressed.
- `selected`: Whether the button is in a selected state.

Example:

```js
unstable_headerRightItems: () => [
  {
    type: 'button',
    label: 'Edit',
    icon: {
      type: 'sfSymbol',
      name: 'pencil',
    },
    onPress: () => {
      // Do something
    },
  },
],
```

Supported properties when `type` is `menu`:

- `changesSelectionAsPrimaryAction`: Whether the menu is a selection menu. Tapping an item in a selection menu will add a checkmark to the selected item. Defaults to `false`.
- `menu`: An object containing the menu items. It contains the following properties:
  - `title`: Optional title to show on top of the menu.
  - `multiselectable`: Whether multiple items in the menu can be selected (i.e. in "on" state). Defaults to `false`.
  - `layout`: How the menu items are displayed. Supported values:
    - `default` (default): menu items are displayed normally.
    - `palette`: menu items are displayed in a horizontal row.
  - `items`: An array of menu items. A menu item can be either an `action` or a `submenu`.
    - `action`: An object with the following properties:
      - `type`: Must be `action`.
      - `label`: Label of the menu item.
      - `description`: The secondary text displayed alongside the label of the menu item.
      - `icon`: Optional icon to show alongside the label. The icon can be a [SF Symbols](https://developer.apple.com/sf-symbols/) name:

        ```js
        {
          type: 'sfSymbol',
          name: 'trash',
        }
        ```

      - `onPress`: Function to call when the menu item is pressed.
      - `state`: Optional state of the menu item. Supported values:
        - `on`
        - `off`
        - `mixed`
      - `disabled`: Whether the menu item is disabled.
      - `destructive`: Whether the menu item is styled as destructive.
      - `hidden`: Whether the menu item is hidden.
      - `keepsMenuPresented`: Whether to keep the menu open after selecting this item. Defaults to `false`.
      - `discoverabilityLabel`: An elaborated title that explains the purpose of the action. On iOS, the system displays this title in the discoverability heads-up display (HUD). If this is not set, the HUD displays the label property.

    - `submenu`: An object with the following properties:
      - `type`: Must be `submenu`.
      - `label`: Label of the submenu item.
      - `icon`: Optional icon to show alongside the label. The icon can be a [SF Symbols](https://developer.apple.com/sf-symbols/) name:

        ```js
        {
          type: 'sfSymbol',
          name: 'pencil',
        }
        ```

      - `inline`: Whether the menu is displayed inline with the parent menu. By default, submenus are displayed after expanding the parent menu item. Inline menus are displayed as part of the parent menu as a section. Defaults to `false`.
      - `layout`: How the submenu items are displayed. Supported values:
        - `default` (default): menu items are displayed normally.
        - `palette`: menu items are displayed in a horizontal row.
      - `destructive`: Whether the submenu is styled as destructive.
      - `multiselectable`: Whether multiple items in the submenu can be selected (i.e. in "on" state). Defaults to `false`.
      - `items`: An array of menu items (can be either `action` or `submenu`).

Example:

```js
unstable_headerRightItems: () => [
  {
    type: 'menu',
    label: 'Options',
    icon: {
      type: 'sfSymbol',
      name: 'ellipsis',
    },
    menu: {
      title: 'Options',
      items: [
        {
          type: 'action',
          label: 'Edit',
          icon: {
            type: 'sfSymbol',
            name: 'pencil',
          },
          onPress: () => {
            // Do something
          },
        },
        {
          type: 'submenu',
          label: 'More',
          items: [
            {
              type: 'action',
              label: 'Delete',
              destructive: true,
              onPress: () => {
                // Do something
              },
            },
          ],
        },
      ],
    },
  },
],
```

### Spacing

An item to add spacing between other items in the header.

Supported properties:

- `type`: Must be `spacing`.
- `spacing`: Amount of spacing to add.

```js
unstable_headerRightItems: () => [
  {
    type: 'button',
    label: 'Edit',
    onPress: () => {
      // Do something
    },
  },
  {
    type: 'spacing',
    spacing: 10,
  },
  {
    type: 'button',
    label: 'Delete',
    onPress: () => {
      // Do something
    },
  },
],
```

### Custom

A custom item to display any React Element in the header.

Supported properties:

- `type`: Must be `custom`.
- `element`: A React Element to display as the item.
- `hidesSharedBackground`: Whether the background this item may share with other items in the bar should be hidden. Setting this to `true` hides the liquid glass background on iOS 26+.

Example:

```js
unstable_headerRightItems: () => [
  {
    type: 'custom',
    element: <MaterialCommunityIcons name="map" color="gray" size={36} />,
  },
],
```

The advantage of using this over [`headerLeft`](#headerleft) or [`headerRight`](#headerright) options is that it supports features like shared background on iOS 26+.

---

## Bottom Tabs Navigator

Source: https://reactnavigation.org/docs/8.x/bottom-tab-navigator

Bottom Tab Navigator displays a set of screens with a tab bar to switch between them.

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-bottom-tabs-android.mp4" />
</video>

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/native-bottom-tabs-ios.mp4" />
</video>

## Installation

To use this navigator, ensure that you have [`@react-navigation/native` and its dependencies (follow this guide)](getting-started.md), then install [`@react-navigation/bottom-tabs`](https://github.com/react-navigation/react-navigation/tree/main/packages/bottom-tabs):

```bash npm2yarn
npm install @react-navigation/bottom-tabs@next
```

## Usage

To use this navigator, import it from `@react-navigation/bottom-tabs`:

```js name="Bottom Tab Navigator" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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
const MyTabs = createBottomTabNavigator({
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

## Native vs Custom implementation

The navigator provides 2 implementations that can be specified using the [`implementation`](#implementation) prop, `native` and `custom`. Many customization options are exclusive to one of the implementations. Make sure to check the documentation of each option to see which implementation it supports.

A custom [`tabBar`](#tabbar) can be provided with either implementation. However, you'll need to handle most of the options in your custom tab bar.

### `native`

Uses native primitives for rendering content - `UITabBarController` on iOS and `BottomNavigationView` on Android. This allows matching the native design such as liquid glass effect on iOS 26, native tab switch animations etc.

This is the default implementation on Android and iOS, and does not support other platforms.

### `custom`

Uses a JavaScript-based implementation for rendering content.

This is the default implementation on other platforms such as web, macOS and Windows, and supports all platforms.

## Notes

- Liquid Glass effect on iOS 26+ requires your app to be built with Xcode 26 or above.
- On Android, at most 5 tabs are supported with the `native` implementation. This is a limitation of the underlying native component.

## API Definition

### Props

In addition to the [common props](navigator.md#configuration) shared by all navigators, the bottom tab navigator accepts the following additional props:

#### `implementation`

The implementation to use for rendering the tab bar. Possible values:

- `native` - Uses native primitives for rendering content
- `custom` - Uses a JavaScript-based implementation for rendering content

See [Native vs Custom implementation](#native-vs-custom-implementation) for more details.

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
createBottomTabNavigator({
  implementation: 'custom',
  // ...
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Tab.Navigator implementation="custom">{/* ... */}</Tab.Navigator>
```

</TabItem>
</Tabs>

#### `backBehavior`

This controls what happens when `goBack` is called in the navigator. This includes pressing the device's back button or back gesture on Android.

It supports the following values:

- `firstRoute` - return to the first screen defined in the navigator (default)
- `initialRoute` - return to initial screen passed in `initialRouteName` prop, if not passed, defaults to the first screen
- `order` - return to screen defined before the focused screen
- `history` - return to last visited screen in the navigator; if the same screen is visited multiple times, the older entries are dropped from the history
- `fullHistory` - return to last visited screen in the navigator; doesn't drop duplicate entries unlike `history` - this behavior is useful to match how web pages work
- `none` - do not handle back button

#### `detachInactiveScreens`

Boolean used to indicate whether inactive screens should be detached from the view hierarchy to save memory. This enables integration with [react-native-screens](https://github.com/software-mansion/react-native-screens). Defaults to `true`.

Only supported with `custom` implementation.

#### `tabBar`

Function that returns a React element to display as the tab bar.

The function receives an object containing the following properties as the argument:

- `state` - The state object for the tab navigator.
- `descriptors` - The descriptors object containing options for the tab navigator.
- `navigation` - The navigation object for the tab navigator.

The `state.routes` array contains all the routes defined in the navigator. Each route's options can be accessed using `descriptors[route.key].options`.

Example:

```js name="Custom tab bar" snack static2dynamic
import * as React from 'react';
import {
  createStaticNavigation,
  NavigationContainer,
} from '@react-navigation/native';
// codeblock-focus-start
import { View, Platform } from 'react-native';
import { useLinkBuilder, useTheme } from '@react-navigation/native';
import { Text, PlatformPressable } from '@react-navigation/elements';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

function MyTabBar({ state, descriptors, navigation }) {
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

        return (
          <PlatformPressable
            key={route.key}
            href={buildHref(route.name, route.params)}
            accessibilityState={isFocused ? { selected: true } : {}}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            testID={options.tabBarButtonTestID}
            onPress={onPress}
            onLongPress={onLongPress}
            style={{ flex: 1 }}
          >
            <Text style={{ color: isFocused ? colors.primary : colors.text }}>
              {label}
            </Text>
          </PlatformPressable>
        );
      })}
    </View>
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

function ProfileScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Profile Screen</Text>
    </View>
  );
}

// codeblock-focus-start
const MyTabs = createBottomTabNavigator({
  // highlight-next-line
  tabBar: (props) => <MyTabBar {...props} />,
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

This example will render a basic tab bar with labels.

Note that you **cannot** use the `useNavigation` hook inside the `tabBar` since `useNavigation` is only available inside screens. You get a `navigation` prop for your `tabBar` which you can use instead:

```js
function MyTabBar({ navigation }) {
  return (
    <Button
      onPress={() => {
        // Navigate using the `navigation` prop that you received
        navigation.navigate('SomeScreen');
      }}
    >
      Go somewhere
    </Button>
  );
}
```

### Options

The following [options](screen-options.md) can be used to configure the screens in the navigator. These can be specified under `screenOptions` prop of `Tab.Navigator` or `options` prop of `Tab.Screen`.

#### `title`

Generic title that can be used as a fallback for `headerTitle` and `tabBarLabel`.

#### `tabBarLabel`

Title string of a tab displayed in the tab bar. When undefined, scene `title` is used. To hide, see [`tabBarLabelVisibilityMode`](#tabbarlabelvisibilitymode).

Overrides the label provided by [`tabBarSystemItem`](#tabbarsystemitem) on iOS.

#### `tabBarSystemItem`

Uses iOS built-in tab bar items with standard iOS styling and localized titles. Supported values:

- `bookmarks`
- `contacts`
- `downloads`
- `favorites`
- `featured`
- `history`
- `more`
- `mostRecent`
- `mostViewed`
- `recents`
- `search`
- `topRated`

Only supported on iOS with `native` implementation.

The [`tabBarIcon`](#tabbaricon) and [`tabBarLabel`](#tabbarlabel) options will override the icon and label from the system item. If you want to keep the system behavior on iOS, but need to provide icon and label for other platforms, use `Platform.OS` or `Platform.select` to conditionally set `undefined` for `tabBarIcon` and `tabBarLabel` on iOS.

##### Search tab on iOS 26+

The `tabBarSystemItem` option has special styling and behavior when set to `search` on iOS 26+.

Additionally, when the `search` tab is selected, the tab bar transforms into a search field if:

- The screen has a nested [native stack navigator](native-stack-navigator.md)
- The focused screen in the nested native stack has [`headerSearchBarOptions`](native-stack-navigator.md#headersearchbaroptions)

This won't work if `headerSearchBarOptions` is set on the tab screen itself.

Example:

```js name="Search Tab on iOS 26" snack static2dynamic
import * as React from 'react';
import { View, Text, FlatList } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const DATA = [
  'Apple',
  'Banana',
  'Cherry',
  'Durian',
  'Elderberry',
  'Fig',
  'Grape',
];

function HomeScreen() {
  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Text>Home Screen</Text>
    </View>
  );
}

function FruitsListScreen() {
  const [searchText, setSearchText] = React.useState('');

  const filteredData = DATA.filter((item) =>
    item.toLowerCase().includes(searchText.toLowerCase())
  );

  const navigation = useNavigation('FruitsList');

  React.useEffect(() => {
    navigation.setOptions({
      headerSearchBarOptions: {
        placeholder: 'Search fruits',
        onChange: (e) => {
          setSearchText(e.nativeEvent.text);
        },
      },
    });
  }, [navigation]);

  return (
    <FlatList
      data={filteredData}
      keyExtractor={(item) => item}
      renderItem={({ item }) => (
        <View
          style={{ padding: 16, borderBottomWidth: 1, borderColor: '#ccc' }}
        >
          <Text>{item}</Text>
        </View>
      )}
    />
  );
}

// codeblock-focus-start
const SearchStack = createNativeStackNavigator({
  screens: {
    FruitsList: {
      screen: FruitsListScreen,
      options: {
        title: 'Search',
        // highlight-start
        headerSearchBarOptions: {
          placeholder: 'Search fruits',
        },
        // highlight-end
      },
    },
  },
});

const HomeTabs = createBottomTabNavigator({
  screens: {
    Home: {
      screen: HomeScreen,
      options: {
        tabBarIcon: Platform.select({
          ios: {
            type: 'sfSymbol',
            name: 'house',
          },
          android: {
            type: 'materialSymbol',
            name: 'home',
          },
        }),
      },
    },
    Search: {
      // highlight-next-line
      screen: SearchStack,
      options: {
        // highlight-next-line
        tabBarSystemItem: 'search',
      },
    },
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(HomeTabs);

export default function App() {
  return <Navigation />;
}
```

<video playsInline autoPlay muted loop data-landscape style={{ maxWidth: '402px' }}>

  <source src="/assets/7.x/native-bottom-tabs-ios-search.mp4" />
</video>

#### `tabBarLabelVisibilityMode`

The label visibility mode for the tab bar items. Supported values:

- `auto` - decided based on platform and implementation (default)
- `labeled` - labels are always shown
- `unlabeled` - labels are never shown
- `selected` - labels shown only for selected tab (only supported on Android with `native` implementation)

Supported on all platforms with `custom` implementation. Only supported on Android with `native` implementation.

#### `tabBarLabelPosition`

Whether the label is shown below the icon or beside the icon.

By default, the position is chosen automatically based on device width.

Only supported with `custom` implementation.

- `below-icon`: the label is shown below the icon (typical for iPhones)
  <img src="/assets/7.x/bottom-tabs/tabBarLabelPosition-below.png" width="400" alt="Tab bar label position - below" />

- `beside-icon` the label is shown next to the icon (typical for iPad)
  <img src="/assets/7.x/bottom-tabs/tabBarLabelPosition-beside.png" width="700" alt="Tab bar label position - beside" />

#### `tabBarAllowFontScaling`

Whether label font should scale to respect Text Size accessibility settings. Defaults to `true`.

Only supported with `custom` implementation.

#### `tabBarLabelStyle`

Style object for the tab label. Supported properties:

- `fontFamily`
- `fontSize`
- `fontWeight`
- `fontStyle`

<img src="/assets/7.x/bottom-tabs/tabBarLabelStyle.png" width="500" alt="Tab bar label style" />

Example:

```js
tabBarLabelStyle: {
  fontSize: 16,
  fontFamily: 'Georgia',
  fontWeight: 300,
},
```

#### `tabBarIcon`

Icon object to display or a function that given `{ focused: boolean, color: string, size: number }` returns an icon to display in the tab bar. It can be one of the following:

- An icon object with both `native` and `custom` implementations
- A React element with `custom` implementation only

It overrides the icon provided by [`tabBarSystemItem`](#tabbarsystemitem) on iOS.

The icon object can be one of the following types:

- Local image - Supported on all platforms

  ```js
  tabBarIcon: {
    type: 'image',
    source: require('./path/to/icon.png'),
  }
  ```

  It's necessary to provide icons for multiple screen densities (1x, 2x, 3x), e.g.: `icon.png`, `icon@2x.png`, `icon@3x.png` etc. as icons are not scaled automatically on iOS for the `native` implementation.

  A `tinted` property can be used to control whether the icon should be tinted with the active/inactive color:

  ```js
  tabBarIcon: {
    type: 'image',
    source: require('./path/to/icon.png'),
    tinted: false,
  }
  ```

  Set `tinted` to `false` if the image has its own colors that you want to preserve.

  The image is tinted by default. Overriding is only supported on iOS for the `native` implementation, all platforms for the `custom` implementation.

- [SF Symbols](https://developer.apple.com/sf-symbols/) name - Supported on iOS

  ```js
  tabBarIcon: {
    type: 'sfSymbol',
    name: 'heart',
  }
  ```

- [Material Symbols](https://fonts.google.com/icons) name - Supported on Android

  ```js
  tabBarIcon: {
    type: 'materialSymbol',
    name: 'favorite',
  }
  ```

  It also supports the following optional properties:
  - `variant` - Supported values: `outlined`, `rounded`, `sharp`
  - `weight` - Supported values: `100`, `200`, `300`, `400`, `500`, `600`, `700`

  To avoid bundling all the Material Symbols icons in your app, only the `outlined` variant and `400` weight are included by default. To use a different variant and weight, you can customize the font by setting a `"react-navigation"` key in your app's `package.json`:

  ```json
  "react-navigation": {
    "material-symbols": {
      "fonts": [
        {
          "variant": "rounded",
          "weights": [300]
        }
      ]
    }
  }
  ```

  You don't need to specify `variant` and `weight` in the `tabBarIcon` option if you only include one variant and weight. The available variant and weight will be used automatically.

  If you don't use Material Symbols and want to reduce your app size, you can also disable the font entirely by specifying an empty array for `fonts`:

  ```json
  "react-navigation": {
    "material-symbols": {
      "fonts": []
    }
  }
  ```

  :::info

  You'll need to rebuild your app after changing the font configuration in `package.json`.

  :::

- [Drawable resource](https://developer.android.com/guide/topics/resources/drawable-resource) name - Supported on Android

  ```js
  tabBarIcon: {
    type: 'drawableResource',
    name: 'sunny',
  }
  ```

To render different icons for active and inactive states, you can use a function:

```js
tabBarIcon: ({ focused }) => {
  return {
    type: 'sfSymbol',
    name: focused ? 'heart.fill' : 'heart',
  };
},
```

This not supported on Android with `native` implementation, the icon specified for inactive state will be used for both active and inactive states.

To provide different icons for different platforms, you can use [`Platform.select`](https://reactnative.dev/docs/platform-specific-code):

```js
tabBarIcon: Platform.select({
  ios: {
    type: 'sfSymbol',
    name: 'heart',
  },
  android: {
    type: 'materialSymbol',
    name: 'favorite',
  },
  default: {
    type: 'image',
    source: require('./path/to/icon.png'),
  },
});
```

#### `tabBarIconStyle`

Style object for the tab icon.

Only supported with `custom` implementation.

#### `tabBarBadge`

Text to show in a badge on the tab icon. Accepts a `string` or a `number`.

<img src="/assets/7.x/bottom-tabs/tabBarBadge.png" width="500" alt="Tab bar badge" />

#### `tabBarBadgeStyle`

Style for the badge on the tab icon. Supported properties:

- `backgroundColor`
- `color`

Supported on all platforms with `custom` implementation. Only supported with `native` implementation on Android.

<img src="/assets/7.x/bottom-tabs/tabBarBadgeStyle.png" width="500" alt="Tab bar badge style" />

Example:

```js
tabBarBadgeStyle: {
  color: 'black',
  backgroundColor: 'yellow',
},
```

#### `tabBarAccessibilityLabel`

Accessibility label for the tab button. This is read by the screen reader when the user taps the tab. It's recommended to set this if you don't have a label for the tab.

Only supported with `custom` implementation.

#### `tabBarButton`

Function which returns a React element to render as the tab bar button. It wraps the icon and label. Renders [`PlatformPressable`](elements.md#platformpressable) by default.

Only supported with `custom` implementation.

You can specify a custom implementation here:

```js
tabBarButton: (props) => <TouchableOpacity {...props} />;
```

#### `tabBarButtonTestID`

ID to locate this tab button in tests.

Only supported with `custom` implementation.

#### `tabBarActiveTintColor`

Color for the icon and label in the active tab.
<img src="/assets/7.x/bottom-tabs/tabBarActiveTintColor.png" width="500" alt="Tab bar active tint color" />

#### `tabBarInactiveTintColor`

Color for the icon and label in the inactive tabs.
<img src="/assets/7.x/bottom-tabs/tabBarInactiveTintColor.png" width="500" alt="Tab bar inactive tint color" />

#### `tabBarActiveIndicatorColor`

Background color of the active indicator.

Only supported with `native` implementation on Android.

#### `tabBarActiveIndicatorEnabled`

Whether the active indicator should be used. Defaults to `true`.

Only supported with `native` implementation on Android.

#### `tabBarRippleColor`

Color of the ripple effect when pressing a tab.

Only supported with `native` implementation on Android.

#### `tabBarActiveBackgroundColor`

Background color for the active tab.

Only supported with `custom` implementation.

#### `tabBarInactiveBackgroundColor`

Background color for the inactive tabs.

Only supported with `custom` implementation.

#### `tabBarHideOnKeyboard`

Whether the tab bar is hidden when the keyboard opens. Defaults to `false`.

Only supported with `custom` implementation.

#### `tabBarVisibilityAnimationConfig`

Animation config for showing and hiding the tab bar when the keyboard is shown/hidden.

Only supported with `custom` implementation.

Example:

```js
tabBarVisibilityAnimationConfig: {
  show: {
    animation: 'timing',
    config: {
      duration: 200,
    },
  },
  hide: {
    animation: 'timing',
    config: {
      duration: 100,
    },
  },
},
```

#### `tabBarItemStyle`

Style object for the tab item container.

Only supported with `custom` implementation.

#### `tabBarStyle`

Style object for the tab bar. You can configure styles such as background color here.

With `custom` implementation, this accepts any style properties. With `native` implementation, only `backgroundColor` and `shadowColor` (iOS 18 and below) are supported.

To show your screen under the tab bar, you can set the `position` style to absolute (only with `custom` implementation):

```js
<Tab.Navigator
  screenOptions={{
    tabBarStyle: { position: 'absolute' },
  }}
>
```

You also might need to add a bottom margin to your content if you have an absolutely positioned tab bar. React Navigation won't do it automatically. See [`useBottomTabBarHeight`](#usebottomtabbarheight) for more details.

#### `tabBarBackground`

Function which returns a React Element to use as background for the tab bar. You could render an image, a gradient, blur view etc.

Only supported with `custom` implementation.

Example:

```js
import { BlurView } from 'expo-blur';

// ...

<Tab.Navigator
  screenOptions={{
    tabBarStyle: { position: 'absolute' },
    tabBarBackground: () => (
      <BlurView tint="light" intensity={100} style={StyleSheet.absoluteFill} />
    ),
  }}
>
```

When using `BlurView`, make sure to set `position: 'absolute'` in `tabBarStyle` as well. You'd also need to use [`useBottomTabBarHeight`](#usebottomtabbarheight) to add bottom padding to your content.

<img src="/assets/7.x/bottom-tabs/tabBarBackground.png" width="500" alt="Tab bar background" />

#### `tabBarPosition`

Position of the tab bar. Available values are:

- `bottom` (Default)
- `top`
- `left`
- `right`

Only supported with `custom` implementation, or if a custom `tabBar` is provided with the [`tabBar`](#tabbar) prop.

When the tab bar is positioned on the `left` or `right`, it is styled as a sidebar. This can be useful when you want to show a sidebar on larger screens and a bottom tab bar on smaller screens:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Tabs = createBottomTabNavigator({
  screenOptions: {
    tabBarPosition: isLargeScreen ? 'left' : 'bottom',
  },

  // ...
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Tab.Navigator
  screenOptions={{
    tabBarPosition: isLargeScreen ? 'left' : 'bottom',
  }}
>
```

</TabItem>
</Tabs>

<img src="/assets/7.x/bottom-tabs-side.png" alt="Sidebar" data-landscape></img>

You can also render a compact sidebar by placing the label below the icon. This is only supported when the [`tabBarVariant`](#tabbarvariant) is set to `material`:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
const Tabs = createBottomTabNavigator({
  screenOptions: {
    tabBarPosition: isLargeScreen ? 'left' : 'bottom',
    tabBarVariant: isLargeScreen ? 'material' : 'uikit',
    tabBarLabelPosition: 'below-icon',
  },

  // ...
});
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
<Tab.Navigator
  screenOptions={{
    tabBarPosition: dimensions.width < 600 ? 'bottom' : 'left',
    tabBarLabelPosition: 'below-icon',
  }}
>
```

</TabItem>
</Tabs>

![Compact sidebar](/assets/7.x/bottom-tabs-side-compact.png)

#### `tabBarVariant`

Variant of the tab bar. Available values are:

- `uikit` (Default) - The tab bar will be styled according to the iOS UIKit guidelines.
- `material` - The tab bar will be styled according to the Material Design guidelines.

Only supported with `custom` implementation.

The `material` variant is currently only supported when the [`tabBarPosition`](#tabbarposition) is set to `left` or `right`.

![Material sidebar](/assets/7.x/bottom-tabs-side-material.png)

#### `tabBarBlurEffect`

Blur effect applied to the tab bar on iOS 18 and lower when tab screen is selected.

Supported values:

- `none` - no blur effect
- `systemDefault` - default blur effect applied by the system
- `extraLight`
- `light`
- `dark`
- `regular`
- `prominent`
- `systemUltraThinMaterial`
- `systemThinMaterial`
- `systemMaterial`
- `systemThickMaterial`
- `systemChromeMaterial`
- `systemUltraThinMaterialLight`
- `systemThinMaterialLight`
- `systemMaterialLight`
- `systemThickMaterialLight`
- `systemChromeMaterialLight`
- `systemUltraThinMaterialDark`
- `systemThinMaterialDark`
- `systemMaterialDark`
- `systemThickMaterialDark`
- `systemChromeMaterialDark`

Defaults to `systemDefault`.

Only supported with `native` implementation on iOS 18 and below.

#### `tabBarControllerMode`

The display mode for the tab bar. Supported values:

- `auto` - the system sets the display mode based on the tab's content
- `tabBar` - the system displays the content only as a tab bar
- `tabSidebar` - the tab bar is displayed as a sidebar

Supported on all platforms with `custom` implementation. By default:

- `tabBar` is positioned at the bottom
- `tabSidebar` is positioned on the left (LTR) or right (RTL)

The [`tabBarPosition`](#tabbarposition) option can be used to override this in `custom` implementation or for custom [`tabBar`](#tabbar).

Supported on iOS 18 and above with `native` implementation. Not supported on tvOS.

#### `tabBarMinimizeBehavior`

The minimize behavior for the tab bar. Supported values:

- `auto` - resolves to the system default minimize behavior
- `never` - the tab bar does not minimize
- `onScrollDown` - the tab bar minimizes when scrolling down and expands when scrolling back up
- `onScrollUp` - the tab bar minimizes when scrolling up and expands when scrolling back down

Only supported with `native` implementation on iOS 26 and above.

<video playsInline autoPlay muted loop data-landscape style={{ maxWidth: '402px' }}>

  <source src="/assets/7.x/native-bottom-tabs-ios-minimize.mp4" />
</video>

#### `bottomAccessory`

Function that returns a React element to display as an accessory view. The function receives an options object with a `placement` parameter that can be one of the following values:

- `regular` - at bottom of the screen, above the tab bar if tab bar is at the bottom
- `inline` - inline with the collapsed bottom tab bar (e.g., when minimized based on [`tabBarMinimizeBehavior`](#tabbarminimizebehavior))

Example:

```js
bottomAccessory: ({ placement }) => {
  return (
    <View style={{ padding: 16 }}>
      <Text>Placement: {placement}</Text>
    </View>
  );
};
```

Only supported with `native` implementation on iOS 26 and above.

On Android, iOS 18 and below, nothing is rendered. You can either use the [`screenLayout`](navigator.md#screen-layout) or [`layout`](screen.md) props, or render content inside your screen component directly as a fallback.

<video playsInline autoPlay muted loop data-landscape style={{ maxWidth: '402px' }}>

  <source src="/assets/7.x/native-bottom-tabs-ios-bottom-accessory.mp4" />
</video>

:::note

The content is rendered twice for both placements, but only one is visible at a time based on the tab bar state. Any shared state should be stored outside of the component to keep both versions in sync.

:::

#### `scrollEdgeEffects`

Configures the scroll edge effect for the _content ScrollView_ (the ScrollView that is present in first descendants chain of the Screen).
Depending on values set, it will blur the scrolling content below certain UI elements (e.g. header items, search bar) for the specified edge of the ScrollView.
When set in nested containers, i.e. Native Stack inside Native Bottom Tabs, or the other way around, the ScrollView will use only the innermost one's config.

Edge effects can be configured for each edge separately. The following values are currently supported:

- `automatic` - the automatic scroll edge effect style,
- `hard` - a scroll edge effect with a hard cutoff and dividing line,
- `soft` - a soft-edged scroll edge effect,
- `hidden` - no scroll edge effect.

Defaults to `automatic` for each edge.

Only supported with `native` implementation on iOS 26 and above.

#### `lazy`

Whether this screen should render only after the first time it's accessed. Defaults to `true`. Set it to `false` if you want to render the screen on the initial render of the navigator.

#### `popToTopOnBlur`

Boolean indicating whether any nested stack should be popped to the top of the stack when navigating away from this tab. Defaults to `false`.

It only works when there is a stack navigator (e.g. [stack navigator](stack-navigator.md) or [native stack navigator](native-stack-navigator.md)) nested under the tab navigator.

#### `sceneStyle`

Style object for the component wrapping the screen content.

### Header related options

The navigator does not show a header by default. It renders a native stack header if `headerShown` is set to `true` in the screen options explicitly, or if a custom header is provided with the `header` option.

You can find the list of header related options [here](elements.md#header). These [options](screen-options.md) can be specified under `screenOptions` prop of `Tab.Navigator` or `options` prop of `Tab.Screen`. You don't have to be using `@react-navigation/elements` directly to use these options, they are just documented in that page.

In addition to those, the following options are also supported in bottom tabs:

#### `header`

Custom header to use instead of the default header.

This accepts a function that returns a React Element to display as a header. The function receives an object containing the following properties as the argument:

- `navigation` - The navigation object for the current screen.
- `route` - The route object for the current screen.
- `options` - The options for the current screen

Example:

```js
import { getHeaderTitle } from '@react-navigation/elements';

// ..

header: ({ navigation, route, options }) => {
  const title = getHeaderTitle(options, route.name);

  return <MyHeader title={title} style={options.headerStyle} />;
};
```

To set a custom header for all the screens in the navigator, you can specify this option in the `screenOptions` prop of the navigator.

##### Specify a `height` in `headerStyle`

If your custom header's height differs from the default header height, then you might notice glitches due to measurement being async. Explicitly specifying the height will avoid such glitches.

Example:

```js
headerStyle: {
  height: 80, // Specify the height of your custom header
};
```

Note that this style is not applied to the header by default since you control the styling of your custom header. If you also want to apply this style to your header, use `options.headerStyle` from the props.

#### `headerShown`

Whether to show or hide the header for the screen. The header is not shown by default unless a custom header is provided with the `header` option.

### Events

The navigator can [emit events](navigation-events.md) on certain actions. Supported events are:

#### `tabPress`

This event is fired when the user presses the tab button for the current screen in the tab bar. By default a tab press does several things:

- If the tab is not focused, tab press will focus that tab
- If the tab is already focused:
  - If the screen for the tab renders a scroll view, you can use [`useScrollToTop`](use-scroll-to-top.md) to scroll it to top
  - If the screen for the tab renders a stack navigator, a `popToTop` action is performed on the stack

To prevent the default behavior, you can call `event.preventDefault`.

:::note

Calling `event.preventDefault` is only supported with the `custom` implementation. The default behavior cannot be prevented with the `native` implementation.

:::

```js name="Tab Press Event" snack static2dynamic
import * as React from 'react';
import { Alert, Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

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

const MyTabs = createBottomTabNavigator({
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

This event is fired when the user presses the tab button for the current screen in the tab bar for an extended period. If you have a custom tab bar, make sure to emit this event.

Only supported with the `custom` implementation.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('tabLongPress', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `transitionStart`

This event is fired when a transition animation starts when switching tabs.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('transitionStart', (e) => {
    // Do something
  });

  return unsubscribe;
}, [navigation]);
```

#### `transitionEnd`

This event is fired when a transition animation ends when switching tabs.

Example:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('transitionEnd', (e) => {
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
- `params` - _object_ - Screen params to use for the destination route.

```js name="Tab Navigator - jumpTo" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.jumpTo('Profile', { owner: 'Michaś' })
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
      {route.params?.owner && (
        <Text style={{ marginTop: 10 }}>Owner: {route.params.owner}</Text>
      )}
    </View>
  );
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

### Hooks

The bottom tab navigator exports the following hooks:

#### `useBottomTabBarHeight`

This hook returns the height of the bottom tab bar. By default, the screen content doesn't go under the tab bar. However, if you want to make the tab bar absolutely positioned and have the content go under it (e.g. to show a blur effect), it's necessary to adjust the content to take the tab bar height into account.

Example:

```js
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

function MyComponent() {
  const tabBarHeight = useBottomTabBarHeight();

  return (
    <ScrollView contentStyle={{ paddingBottom: tabBarHeight }}>
      {/* Content */}
    </ScrollView>
  );
}
```

Alternatively, you can use the `BottomTabBarHeightContext` directly if you are using a class component or need it in a reusable component that can be used outside the bottom tab navigator:

```js
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

// ...

<BottomTabBarHeightContext.Consumer>
  {tabBarHeight => (
    /* render something */
  )}
</BottomTabBarHeightContext.Consumer>
```

## Animations

By default, switching between tabs doesn't have any animation. You can specify the `animation` option to customize the transition animation.

:::note

Customizing animations are only supported with the `custom` implementation.

:::

Supported values for `animation` are:

- `fade` - Cross-fade animation for the screen transition where the new screen fades in and the old screen fades out.

  <video playsInline autoPlay muted loop>
    <source src="/assets/7.x/bottom-tabs-fade.mp4" />
  </video>

- `shift` - Shifting animation for the screen transition where the screens slightly shift to left/right.

  <video playsInline autoPlay muted loop>
    <source src="/assets/7.x/bottom-tabs-shift.mp4" />
  </video>

- `none` - The screen transition doesn't have any animation. This is the default value.

```js name="Bottom Tabs animation" snack static2dynamic
import * as React from 'react';
import { View, Text, Easing } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home!</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile!</Text>
    </View>
  );
}

// codeblock-focus-start
const RootTabs = createBottomTabNavigator({
  screenOptions: {
    // highlight-start
    animation: 'fade',
    // highlight-end
  },
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootTabs);

export default function App() {
  return <Navigation />;
}
```

If you need more control over the animation, you can customize individual parts of the animation using the various animation-related options:

### Animation related options

Bottom Tab Navigator exposes various options to configure the transition animation when switching tabs. These transition animations can be customized on a per-screen basis by specifying the options in the `options` for each screen, or for all screens in the tab navigator by specifying them in the `screenOptions`.

- `transitionSpec` - An object that specifies the animation type (`timing` or `spring`) and its options (such as `duration` for `timing`). It contains 2 properties:
  - `animation` - The animation function to use for the animation. Supported values are `timing` and `spring`.
  - `config` - The configuration object for the timing function. For `timing`, it can be `duration` and `easing`. For `spring`, it can be `stiffness`, `damping`, `mass`, `overshootClamping`, `restDisplacementThreshold` and `restSpeedThreshold`.

  A config that uses a timing animation looks like this:

  ```js
  const config = {
    animation: 'timing',
    config: {
      duration: 150,
      easing: Easing.inOut(Easing.ease),
    },
  };
  ```

  We can pass this config in the `transitionSpec` option:

  <Tabs groupId="config" queryString="config">
  <TabItem value="static" label="Static" default>

  ```js
  {
    Profile: {
      screen: Profile,
      options: {
        // highlight-start
        transitionSpec: {
          animation: 'timing',
          config: {
            duration: 150,
            easing: Easing.inOut(Easing.ease),
          },
        },
        // highlight-end
      },
    },
  }
  ```

  </TabItem>
  <TabItem value="dynamic" label="Dynamic">

  ```js
  <Tab.Screen
    name="Profile"
    component={Profile}
    options={{
      // highlight-start
      transitionSpec: {
        animation: 'timing',
        config: {
          duration: 150,
          easing: Easing.inOut(Easing.ease),
        },
      },
      // highlight-end
    }}
  />
  ```

  </TabItem>
  </Tabs>

- `sceneStyleInterpolator` - This is a function that specifies interpolated styles for various parts of the scene. It currently supports style for the view containing the screen:
  - `sceneStyle` - Style for the container view wrapping the screen content.

  The function receives the following properties in its argument:
  - `current` - Animation values for the current screen:
    - `progress` - Animated node representing the progress value of the current screen.

  A config that fades the screen looks like this:

  ```js
  const forFade = ({ current }) => ({
    sceneStyle: {
      opacity: current.progress.interpolate({
        inputRange: [-1, 0, 1],
        outputRange: [0, 1, 0],
      }),
    },
  });
  ```

  The value of `current.progress` is as follows:
  - -1 if the index is lower than the active tab,
  - 0 if they're active,
  - 1 if the index is higher than the active tab

  We can pass this function in `sceneStyleInterpolator` option:

  <Tabs groupId="config" queryString="config">
  <TabItem value="static" label="Static" default>

  ```js
  {
    Profile: {
      screen: Profile,
      options: {
        // highlight-start
        sceneStyleInterpolator: ({ current }) => ({
          sceneStyle: {
            opacity: current.progress.interpolate({
              inputRange: [-1, 0, 1],
              outputRange: [0, 1, 0],
            }),
          },
        }),
        // highlight-end
      },
    },
  }
  ```

  </TabItem>
  <TabItem value="dynamic" label="Dynamic">

  ```js
  <Tab.Screen
    name="Profile"
    component={Profile}
    options={{
      // highlight-start
      sceneStyleInterpolator: ({ current }) => ({
        sceneStyle: {
          opacity: current.progress.interpolate({
            inputRange: [-1, 0, 1],
            outputRange: [0, 1, 0],
          }),
        },
      }),
      // highlight-end
    }}
  />
  ```

  </TabItem>
  </Tabs>

Putting these together, you can customize the transition animation for a screen:

Putting these together, you can customize the transition animation for a screen:

```js name="Bottom Tabs custom animation" snack static2dynamic
import * as React from 'react';
import { View, Text, Easing } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

function HomeScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Home!</Text>
    </View>
  );
}

function ProfileScreen() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Profile!</Text>
    </View>
  );
}

// codeblock-focus-start
const RootTabs = createBottomTabNavigator({
  screenOptions: {
    transitionSpec: {
      animation: 'timing',
      config: {
        duration: 150,
        easing: Easing.inOut(Easing.ease),
      },
    },
    sceneStyleInterpolator: ({ current }) => ({
      sceneStyle: {
        opacity: current.progress.interpolate({
          inputRange: [-1, 0, 1],
          outputRange: [0, 1, 0],
        }),
      },
    }),
  },
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(RootTabs);

export default function App() {
  return <Navigation />;
}
```

### Pre-made configs

We also export various configs from the library with ready-made configs that you can use to customize the animations:

#### `TransitionSpecs`

- `FadeSpec` - Configuration for a cross-fade animation between screens.
- `ShiftSpec` - Configuration for a shifting animation between screens.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import { TransitionSpecs } from '@react-navigation/bottom-tabs';

// ...

{
  Profile: {
    screen: Profile,
    options: {
      // highlight-start
      transitionSpec: TransitionSpecs.CrossFadeSpec,
      // highlight-end
    },
  },
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import { TransitionSpecs } from '@react-navigation/bottom-tabs';

// ...

<Tab.Screen
  name="Profile"
  component={Profile}
  options={{
    // highlight-start
    transitionSpec: TransitionSpecs.FadeSpec,
    // highlight-end
  }}
/>;
```

</TabItem>
</Tabs>

#### `SceneStyleInterpolators`

- `forFade` - Cross-fade animation for the screen transition where the new screen fades in and the old screen fades out.
- `forShift` - Shifting animation for the screen transition where the screens slightly shift to left/right.

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import { SceneStyleInterpolators } from '@react-navigation/bottom-tabs';

// ...

{
  Profile: {
    screen: Profile,
    options: {
      // highlight-start
      sceneStyleInterpolator: SceneStyleInterpolators.forFade,
      // highlight-end
    },
  },
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import { SceneStyleInterpolators } from '@react-navigation/bottom-tabs';

// ...

<Tab.Screen
  name="Profile"
  component={Profile}
  options={{
    // highlight-start
    sceneStyleInterpolator: SceneStyleInterpolators.forFade,
    // highlight-end
  }}
/>;
```

</TabItem>
</Tabs>

#### `TransitionPresets`

We export transition presets that bundle various sets of these options together. A transition preset is an object containing a few animation-related screen options exported under `TransitionPresets`. Currently the following presets are available:

- `FadeTransition` - Cross-fade animation for the screen transition where the new screen fades in and the old screen fades out.
- `ShiftTransition` - Shifting animation for the screen transition where the screens slightly shift to left/right.

You can spread these presets in `options` to customize the animation for a screen:

Example:

<Tabs groupId="config" queryString="config">
<TabItem value="static" label="Static" default>

```js
import { TransitionPresets } from '@react-navigation/bottom-tabs';

// ...

{
  Profile: {
    screen: Profile,
    options: {
      // highlight-start
      ...TransitionPresets.FadeTransition,
      // highlight-end
    },
  },
}
```

</TabItem>
<TabItem value="dynamic" label="Dynamic">

```js
import { TransitionPresets } from '@react-navigation/bottom-tabs';

// ...

<Tab.Screen
  name="Profile"
  component={Profile}
  options={{
    // highlight-start
    ...TransitionPresets.FadeTransition,
    // highlight-end
  }}
/>;
```

</TabItem>
</Tabs>

---

## Drawer Navigator

Source: https://reactnavigation.org/docs/8.x/drawer-navigator

Drawer Navigator renders a navigation drawer on the side of the screen which can be opened and closed via gestures.

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/drawer.mp4" />
</video>

This wraps [`react-native-drawer-layout`](drawer-layout.md). If you want to use the drawer without React Navigation integration, use the library directly instead.

## Installation

To use this navigator, ensure that you have [`@react-navigation/native` and its dependencies (follow this guide)](getting-started.md), then install [`@react-navigation/drawer`](https://github.com/react-navigation/react-navigation/tree/main/packages/drawer):

```bash npm2yarn
npm install @react-navigation/drawer@next
```

The navigator depends on [`react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/) for gestures and [`react-native-reanimated`](https://docs.swmansion.com/react-native-reanimated/) for animations.

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

## Usage

To use this navigator, import it from `@react-navigation/drawer`:

```js name="Drawer Navigator" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import { createDrawerNavigator } from '@react-navigation/drawer';

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
const MyDrawer = createDrawerNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});
// codeblock-focus-end

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  return <Navigation />;
}
```

## API Definition

### Props

In addition to the [common props](navigator.md#configuration) shared by all navigators, the drawer navigator component accepts the following additional props:

#### `backBehavior`

This controls what happens when `goBack` is called in the navigator. This includes pressing the device's back button or back gesture on Android.

It supports the following values:

- `firstRoute` - return to the first screen defined in the navigator (default)
- `initialRoute` - return to initial screen passed in `initialRouteName` prop, if not passed, defaults to the first screen
- `order` - return to screen defined before the focused screen
- `history` - return to last visited screen in the navigator; if the same screen is visited multiple times, the older entries are dropped from the history
- `fullHistory` - return to last visited screen in the navigator; doesn't drop duplicate entries unlike `history` - this behavior is useful to match how web pages work
- `none` - do not handle back button

#### `defaultStatus`

The default status of the drawer - whether the drawer should stay `open` or `closed` by default.

When this is set to `open`, the drawer will be open from the initial render. It can be closed normally using gestures or programmatically. However, when going back, the drawer will re-open if it was closed. This is essentially the opposite of the default behavior of the drawer where it starts `closed`, and the back button closes an open drawer.

#### `detachInactiveScreens`

Boolean used to indicate whether inactive screens should be detached from the view hierarchy to save memory. This enables integration with [react-native-screens](https://github.com/software-mansion/react-native-screens). Defaults to `true`.

#### `drawerContent`

Function that returns React element to render as the content of the drawer, for example, navigation items

The content component receives the following props by default:

- `state` - The [navigation state](navigation-state.md) of the navigator.
- `navigation` - The navigation object for the navigator.
- `descriptors` - An descriptor object containing options for the drawer screens. The options can be accessed at `descriptors[route.key].options`.

##### Providing a custom `drawerContent`

The default component for the drawer is scrollable and only contains links for the routes in the RouteConfig. You can easily override the default component to add a header, footer, or other content to the drawer. The default content component is exported as `DrawerContent`. It renders a `DrawerItemList` component inside a `ScrollView`.

By default, the drawer is scrollable and supports devices with notches. If you customize the content, you can use `DrawerContentScrollView` to handle this automatically:

```js
import {
  DrawerContentScrollView,
  DrawerItemList,
} from '@react-navigation/drawer';

function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
    </DrawerContentScrollView>
  );
}
```

To add additional items in the drawer, you can use the `DrawerItem` component:

```js name="Custom Drawer Content" snack static2dynamic
import * as React from 'react';
import { Text, View, Linking } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import {
  createDrawerNavigator,
  DrawerContentScrollView,
  DrawerItemList,
  DrawerItem,
} from '@react-navigation/drawer';

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
function CustomDrawerContent(props) {
  return (
    <DrawerContentScrollView {...props}>
      <DrawerItemList {...props} />
      <DrawerItem
        label="Help"
        onPress={() => Linking.openURL('https://mywebsite.com/help')}
      />
    </DrawerContentScrollView>
  );
}
// codeblock-focus-end

const MyDrawer = createDrawerNavigator({
  drawerContent: (props) => <CustomDrawerContent {...props} />,
  screens: {
    Home: HomeScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  return <Navigation />;
}
```

The `DrawerItem` component accepts the following props:

- `label` (required): The label text of the item. Can be string, or a function returning a react element. e.g. `({ focused, color }) => <Text style={{ color }}>{focused ? 'Focused text' : 'Unfocused text'}</Text>`.
- `icon`: Icon to display for the item. Accepts a function returning a react element. e.g. `({ focused, color, size }) => <Icon color={color} size={size} name={focused ? 'heart' : 'heart-outline'} />`.
- `focused`: Boolean indicating whether to highlight the drawer item as active.
- `onPress` (required): Function to execute on press.
- `activeTintColor`: Color for the icon and label when the item is active.
- `inactiveTintColor`: Color for the icon and label when the item is inactive.
- `activeBackgroundColor`: Background color for item when it's active.
- `inactiveBackgroundColor`: Background color for item when it's inactive.
- `labelStyle`: Style object for the label `Text`.
- `style`: Style object for the wrapper `View`.

Note that you **cannot** use the `useNavigation` hook inside the `drawerContent` since `useNavigation` is only available inside screens. You get a `navigation` prop for your `drawerContent` which you can use instead:

```js
function CustomDrawerContent({ navigation }) {
  return (
    <Button
      onPress={() => {
        // Navigate using the `navigation` prop that you received
        navigation.navigate('SomeScreen');
      }}
    >
      Go somewhere
    </Button>
  );
}
```

To use the custom component, we need to pass it in the `drawerContent` prop:

```js
<Drawer.Navigator drawerContent={(props) => <CustomDrawerContent {...props} />}>
  {/* screens */}
</Drawer.Navigator>
```

### Options

The following [options](screen-options.md) can be used to configure the screens in the navigator. These can be specified under `screenOptions` prop of `Drawer.Navigator` or `options` prop of `Drawer.Screen`.

#### `title`

A generic title that can be used as a fallback for `headerTitle` and `drawerLabel`.

#### `lazy`

Whether this screen should render the first time it's accessed. Defaults to `true`. Set it to `false` if you want to render the screen on initial render.

#### `drawerLabel`

String or a function that given `{ focused: boolean, color: string }` returns a React.Node, to display in drawer sidebar. When undefined, scene `title` is used.

#### `drawerIcon`

Function, that given `{ focused: boolean, color: string, size: number }` returns a React.Node to display in drawer sidebar.

#### `drawerActiveTintColor`

Color for the icon and label in the active item in the drawer.

<img src="/assets/7.x/drawer/drawerActiveTintColor.png" width="500" alt="Drawer active tint color" />

```js
   drawerActiveTintColor: 'green',
```

#### `drawerActiveBackgroundColor`

Background color for the active item in the drawer.

<img src="/assets/7.x/drawer/drawerActiveBackgroundColor.png" width="500" alt="Drawer active background color" />

```js
    screenOptions={{
      drawerActiveTintColor: 'white',
      drawerActiveBackgroundColor: '#003CB3',
      drawerLabelStyle: {
        color: 'white',
      },
    }}
```

#### `drawerInactiveTintColor`

Color for the icon and label in the inactive items in the drawer.

#### `drawerInactiveBackgroundColor`

Background color for the inactive items in the drawer.

#### `drawerItemStyle`

Style object for the single item, which can contain an icon and/or a label.

<img src="/assets/7.x/drawer/drawerItemStyle.png" width="500" alt="Drawer item style" />

Example:

```js
   drawerItemStyle: {
    backgroundColor: '#9dd3c8',
    borderColor: 'black',
    borderWidth: 2,
    opacity: 0.6,
  },
```

#### `drawerLabelStyle`

Style object to apply to the `Text` style inside content section which renders a label.

<img src="/assets/7.x/drawer/drawerLabelStyle.png" width="500" alt="Drawer label style" />

Example:

```js
   drawerLabelStyle: {
      color: 'black',
      fontSize: 20,
      fontFamily: 'Georgia',
    },
```

#### `drawerContentContainerStyle`

Style object for the content section inside the `ScrollView`.

#### `drawerContentStyle`

Style object for the wrapper view.

#### `drawerStyle`

Style object for the drawer component. You can pass a custom background color for a drawer or a custom width here.

<img src="/assets/7.x/drawer/drawerStyle.png" width="500" alt="Drawer style" />

```js
<Drawer.Navigator
  screenOptions={{
    drawerStyle: {
      backgroundColor: '#c6cbef',
      width: 240,
    },
  }}
>
  {/* screens */}
</Drawer.Navigator>
```

#### `drawerPosition`

Options are `left` or `right`. Defaults to `left` for LTR languages and `right` for RTL languages.

#### `drawerType`

Type of the drawer. It determines how the drawer looks and animates.

- `front`: Traditional drawer which covers the screen with an overlay behind it.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/drawer/drawerType-front.mp4" />
  </video>

- `back`: The drawer is revealed behind the screen on swipe.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/drawer/drawerType-back.mp4" />
  </video>

- `slide`: Both the screen and the drawer slide on swipe to reveal the drawer.
  <video playsInline autoPlay muted loop>
   <source src="/assets/7.x/drawer/drawerType-slide.mp4" />
  </video>

- `permanent`: A permanent drawer is shown as a sidebar. Useful for having always visible drawer on larger screens.

Defaults to `slide` on iOS and `front` on other platforms.

You can conditionally specify the `drawerType` to show a permanent drawer on bigger screens and a traditional drawer drawer on small screens:

```js
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function MyDrawer() {
  const dimensions = useWindowDimensions();

  return (
    <Drawer.Navigator
      screenOptions={{
        drawerType: dimensions.width >= 768 ? 'permanent' : 'front',
      }}
    >
      {/* Screens */}
    </Drawer.Navigator>
  );
}
```

You can also specify other props such as `drawerStyle` based on screen size to customize the behavior. For example, you can combine it with `defaultStatus="open"` to achieve a master-detail layout:

<video playsInline autoPlay muted loop>
  <source src="/assets/7.x/drawer/drawerType-masterDetail.mp4" />
</video>

```js
import { useWindowDimensions } from 'react-native';
import { createDrawerNavigator } from '@react-navigation/drawer';

const Drawer = createDrawerNavigator();

function MyDrawer() {
  const dimensions = useWindowDimensions();

  const isLargeScreen = dimensions.width >= 768;

  return (
    <Drawer.Navigator
      defaultStatus="open"
      screenOptions={{
        drawerType: isLargeScreen ? 'permanent' : 'back',
        drawerStyle: isLargeScreen ? null : { width: '100%' },
        overlayStyle: { backgroundColor: 'transparent' },
      }}
    >
      {/* Screens */}
    </Drawer.Navigator>
  );
}
```

#### `drawerHideStatusBarOnOpen`

When set to `true`, Drawer will hide the OS status bar whenever the drawer is pulled or when it's in an "open" state.

#### `drawerStatusBarAnimation`

Animation of the statusbar when hiding it. use in combination with `drawerHideStatusBarOnOpen`.

This is only supported on iOS. Defaults to `slide`.

Supported values:

- `slide`
  <video playsInline autoPlay muted loop>
    <source src="/assets/7.x/drawer/drawerStatusBarAnimation-slide.mp4" />
  </video>

- `fade`
  <video playsInline autoPlay muted loop>
    <source src="/assets/7.x/drawer/drawerStatusBarAnimation-fade.mp4" />
  </video>

- `none`

#### `overlayStyle`

Style for the overlay on top of the content view when drawer gets open. You can use this to customize the overlay color, opacity, and other properties:

```js
overlayStyle: {
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
}
```

  <video playsInline autoPlay muted loop>
    <source src="/assets/7.x/drawer/overlayColor.mp4" />
  </video>

#### `sceneStyle`

Style object for the component wrapping the screen content.

#### `configureGestureHandler`

Callback to configure the underlying [gesture from `react-native-gesture-handler`](https://docs.swmansion.com/react-native-gesture-handler/docs/gestures/gesture). It receives the `gesture` object as an argument:

```js
configureGestureHandler: ({ gesture }) => {
  return gesture.enableTrackpadTwoFingerGesture(false);
},
```

This is not supported on Web.

#### `swipeEnabled`

Whether you can use swipe gestures to open or close the drawer. Defaults to `true`.

Swipe gesture is not supported on Web.

#### `swipeEdgeWidth`

Allows for defining how far from the edge of the content view the swipe gesture should activate.

This is not supported on Web.

#### `swipeMinDistance`

Minimum swipe distance threshold that should activate opening the drawer.

#### `keyboardDismissMode`

Whether the keyboard should be dismissed when the swipe gesture begins. Defaults to `'on-drag'`. Set to `'none'` to disable keyboard handling.

#### `freezeOnBlur`

Boolean indicating whether to prevent inactive screens from re-rendering. Defaults to `false`.
Defaults to `true` when `enableFreeze()` from `react-native-screens` package is run at the top of the application.

Only supported on iOS and Android.

#### `popToTopOnBlur`

Boolean indicating whether any nested stack should be popped to the top of the stack when navigating away from this drawer screen. Defaults to `false`.

It only works when there is a stack navigator (e.g. [stack navigator](stack-navigator.md) or [native stack navigator](native-stack-navigator.md)) nested under the drawer navigator.

### Header related options

You can find the list of header related options [here](elements.md#header). These [options](screen-options.md) can be specified under `screenOptions` prop of `Drawer.Navigator` or `options` prop of `Drawer.Screen`. You don't have to be using `@react-navigation/elements` directly to use these options, they are just documented in that page.

In addition to those, the following options are also supported in drawer:

#### `header`

Custom header to use instead of the default header.

This accepts a function that returns a React Element to display as a header. The function receives an object containing the following properties as the argument:

- `navigation` - The navigation object for the current screen.
- `route` - The route object for the current screen.
- `options` - The options for the current screen

Example:

```js
import { getHeaderTitle } from '@react-navigation/elements';

// ..

header: ({ navigation, route, options }) => {
  const title = getHeaderTitle(options, route.name);

  return <MyHeader title={title} style={options.headerStyle} />;
};
```

To set a custom header for all the screens in the navigator, you can specify this option in the `screenOptions` prop of the navigator.

##### Specify a `height` in `headerStyle`

If your custom header's height differs from the default header height, then you might notice glitches due to measurement being async. Explicitly specifying the height will avoid such glitches.

Example:

```js
headerStyle: {
  height: 80, // Specify the height of your custom header
};
```

Note that this style is not applied to the header by default since you control the styling of your custom header. If you also want to apply this style to your header, use `options.headerStyle` from the props.

#### `headerShown`

Whether to show or hide the header for the screen. The header is shown by default. Setting this to `false` hides the header.

### Events

The navigator can [emit events](navigation-events.md) on certain actions. Supported events are:

#### `drawerItemPress`

This event is fired when the user presses the button for the screen in the drawer. By default a drawer item press does several things:

- If the screen is not focused, drawer item press will focus that screen
- If the screen is already focused, then it'll close the drawer

To prevent the default behavior, you can call `event.preventDefault`:

```js
React.useEffect(() => {
  const unsubscribe = navigation.addListener('drawerItemPress', (e) => {
    // Prevent default behavior
    e.preventDefault();

    // Do something manually
    // ...
  });

  return unsubscribe;
}, [navigation]);
```

If you have custom drawer content, make sure to emit this event.

### Helpers

The drawer navigator adds the following methods to the navigation object:

#### `openDrawer`

Opens the drawer pane.

```js name="Drawer Helper Methods" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
import { createDrawerNavigator } from '@react-navigation/drawer';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}
    >
      <Text>Home Screen</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.openDrawer()
          // codeblock-focus-end
        }
      >
        Open Drawer
      </Button>
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

const MyDrawer = createDrawerNavigator({
  screens: {
    Home: HomeScreen,
    Settings: SettingsScreen,
  },
});

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  return <Navigation />;
}
```

#### `closeDrawer`

Closes the drawer pane.

```js
navigation.closeDrawer();
```

#### `toggleDrawer`

Opens the drawer pane if closed, closes the drawer pane if opened.

```js
navigation.toggleDrawer();
```

#### `jumpTo`

Navigates to an existing screen in the drawer navigator. The method accepts the following arguments:

- `name` - _string_ - Name of the route to jump to.
- `params` - _object_ - Screen params to pass to the destination route.

```js name="Drawer Navigator - jumpTo" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import {
  createStaticNavigation,
  useNavigation,
} from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
import { createDrawerNavigator } from '@react-navigation/drawer';

function HomeScreen() {
  const navigation = useNavigation('Home');

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text>Home Screen</Text>
      <Button
        onPress={
          () =>
            // codeblock-focus-start
            navigation.jumpTo('Profile', { owner: 'Satya' })
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
      {route.params?.owner && (
        <Text style={{ marginTop: 10 }}>Owner: {route.params.owner}</Text>
      )}
    </View>
  );
}

const MyDrawer = createDrawerNavigator({
  screens: {
    Home: HomeScreen,
    Profile: ProfileScreen,
  },
});

const Navigation = createStaticNavigation(MyDrawer);

export default function App() {
  return <Navigation />;
}
```

### Hooks

The drawer navigator exports the following hooks:

#### `useDrawerProgress`

This hook returns the progress of the drawer. It is available in the screen components rendered by the drawer navigator as well as in the [custom drawer content](#drawercontent).

The `progress` object is a `SharedValue` that represents the animated position of the drawer (`0` is closed; `1` is open). It can be used to animate elements based on the animation of the drawer with [Reanimated](https://docs.swmansion.com/react-native-reanimated/):

```js name="Drawer animation progress" snack static2dynamic
import * as React from 'react';
import { Text, View } from 'react-native';
import { createStaticNavigation } from '@react-navigation/native';
import { Button } from '@react-navigation/elements';
// codeblock-focus-start
import {
  createDrawerNavigator,
  useDrawerProgress,
} from '@react-navigation/drawer';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

function HomeScreen() {
  // highlight-next-line
  const progress = useDrawerProgress();

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * -100 }],
  }));

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View
        style={[
          {
            height: 100,
            aspectRatio: 1,
            backgroundColor: 'tomato',
          },
          animatedStyle,
        ]}
      />
    </View>
  );
}
// codeblock-focus-end

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

If you are using class components, you can use the `DrawerProgressContext` to get the progress value.

:::warning

The `useDrawerProgress` hook (or `DrawerProgressContext`) will return a mock value on Web since Reanimated is not used on Web. The mock value can only represent the open state of the drawer (`0` when closed, `1` when open), and not the progress of the drawer.

:::

#### `useDrawerStatus`

You can check if the drawer is open by using the `useDrawerStatus` hook.

```js
import { useDrawerStatus } from '@react-navigation/drawer';

// ...

const isDrawerOpen = useDrawerStatus() === 'open';
```

If you can't use the hook, you can also use the `getDrawerStatusFromState` helper:

```js
import { getDrawerStatusFromState } from '@react-navigation/drawer';

// ...

const isDrawerOpen = getDrawerStatusFromState(navigation.getState()) === 'open';
```

For class components, you can listen to the `state` event to check if the drawer was opened or closed:

```js
class Profile extends React.Component {
  componentDidMount() {
    this._unsubscribe = navigation.addListener('state', () => {
      const isDrawerOpen =
        getDrawerStatusFromState(navigation.getState()) === 'open';

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

## Nesting drawer navigators inside others

If a drawer navigator is nested inside of another navigator that provides some UI, for example, a tab navigator or stack navigator, then the drawer will be rendered below the UI from those navigators. The drawer will appear below the tab bar and below the header of the stack. You will need to make the drawer navigator the parent of any navigator where the drawer should be rendered on top of its UI.

---

