const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { wrapWithReanimatedMetroConfig } = require('react-native-reanimated/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('expo/metro-config').MetroConfig}
 */
const config = getDefaultConfig(__dirname);

// web 平台下，把只有 iOS/Android 實現的原生模塊指向 src/web-stubs 裡的替身，
// 避免 Metro 報「Importing native-only module」；手機端打包不受影響
const WEB_STUBS = {
    '@react-native-firebase/analytics': 'firebase-analytics.js',
    '@react-native-firebase/app': 'firebase-app.js',
    '@react-native-menu/menu': 'menu.js',
    'react-native-simple-toast': 'simple-toast.js',
    'expo-media-library': 'media-library.js',
    'react-native-quick-crypto': 'quick-crypto.js',
};
// 全平台：把 react-native-size-matters 指向本地替身，寬屏（iPad／桌面）下把縮放係數封頂，
// 手機行為不變；3000 多處 scale() 調用無需逐一修改。替身本身不得再 import 該包，否則自我循環
const SCALING_SHIM = path.resolve(__dirname, 'src/utils/scaling.js');
const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
    if (moduleName === 'react-native-size-matters') {
        return { type: 'sourceFile', filePath: SCALING_SHIM };
    }
    if (platform === 'web' && WEB_STUBS[moduleName]) {
        return {
            type: 'sourceFile',
            filePath: path.resolve(__dirname, 'src/web-stubs', WEB_STUBS[moduleName]),
        };
    }
    return defaultResolveRequest
        ? defaultResolveRequest(context, moduleName, platform)
        : context.resolveRequest(context, moduleName, platform);
};

// 最後用 Reanimated 包裹配置
module.exports = wrapWithReanimatedMetroConfig(config);
