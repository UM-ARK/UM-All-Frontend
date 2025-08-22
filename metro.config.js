const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('metro-config').MetroConfig}
 */
const config = {};

// First merge the default config with any custom config
const mergedConfig = mergeConfig(getDefaultConfig(__dirname), config);

// Then wrap the merged config with Reanimated's metro config so both take effect
module.exports = wrapWithReanimatedMetroConfig(mergedConfig);