const path = require('path');
const https = require('https');
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

// web 本地調試：umall.one/api 不回 CORS 頭，瀏覽器直連會被擋，於是讓 Metro 開發服務器把
// /api/* 原樣轉發到線上後端（頁面側在 src/utils/pathMap.js 裡改走同源相對路徑）。
// 手機端直接請求 umall.one，不會經過這裡；正式 web 構建也不走 Metro，部署在 umall.one/webAPP/ 與 /api/ 同源
const API_PROXY_HOST = 'umall.one';
const API_PROXY_PREFIX = '/api/';
const defaultEnhanceMiddleware = config.server.enhanceMiddleware;
config.server = {
    ...config.server,
    enhanceMiddleware: (metroMiddleware, server) => {
        const inner = defaultEnhanceMiddleware
            ? defaultEnhanceMiddleware(metroMiddleware, server)
            : metroMiddleware;
        return (req, res, next) => {
            if (!req.url.startsWith(API_PROXY_PREFIX)) {
                return inner(req, res, next);
            }
            // 去掉瀏覽器的來源頭，避免後端按 Origin 拒絕；Host 改成線上域名
            const { origin, referer, ...headers } = req.headers;
            const upstream = https.request(
                { hostname: API_PROXY_HOST, path: req.url, method: req.method, headers: { ...headers, host: API_PROXY_HOST } },
                (upRes) => {
                    res.writeHead(upRes.statusCode, upRes.headers);
                    upRes.pipe(res);
                },
            );
            upstream.on('error', (err) => {
                res.writeHead(502, { 'content-type': 'text/plain' });
                res.end(`API proxy error: ${err.message}`);
            });
            req.pipe(upstream);
        };
    },
};

// 最後用 Reanimated 包裹配置
module.exports = wrapWithReanimatedMetroConfig(config);
