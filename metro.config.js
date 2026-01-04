const { getDefaultConfig } = require('expo/metro-config');
const { mergeConfig } = require('@react-native/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {};

// 1. 獲取 Expo 的默認配置（這很重要，包含了 Expo 模塊的解析規則）
const expoConfig = getDefaultConfig(__dirname);

// 2. 合併您的自定義配置（如果有）
const mergedConfig = mergeConfig(expoConfig, config);

// 3. 最後用 Reanimated 包裹配置
module.exports = wrapWithReanimatedMetroConfig(mergedConfig);