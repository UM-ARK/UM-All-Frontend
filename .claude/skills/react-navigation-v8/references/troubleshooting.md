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

