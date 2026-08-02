import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { WebView } from 'react-native-webview';

import { useTheme } from '../../../components/ThemeContext';
import { ARK_WIKI } from '../../../utils/pathMap';
import { sanitizeWikiHtml } from './wikiModels';

const getBodyContent = html => {
    const bodyMatch = html.match(/<body\b[^>]*>([\s\S]*?)<\/body\s*>/i);
    return bodyMatch ? bodyMatch[1] : html;
};

const buildArticleDocument = (html, theme) => {
    const content = getBodyContent(sanitizeWikiHtml(html));
    return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5">
<base href="${ARK_WIKI}/wiki/">
<style>
    :root { color-scheme: ${theme.isLight ? 'light' : 'dark'}; }
    * { box-sizing: border-box; }
    html, body { margin: 0; padding: 0; background: ${theme.white}; color: ${theme.black.main}; }
    body { padding: 18px 16px 48px; font: 16px/1.7 -apple-system, BlinkMacSystemFont, sans-serif; overflow-wrap: anywhere; }
    a { color: ${theme.themeColor}; text-decoration: none; }
    h1, h2, h3, h4, h5, h6 { line-height: 1.3; margin: 1.4em 0 .55em; color: ${theme.black.main}; }
    h2 { border-bottom: 1px solid ${theme.disabled}; padding-bottom: .3em; }
    img { max-width: 100%; height: auto; border-radius: 10px; }
    figure { margin: 1em 0; max-width: 100%; }
    figcaption { color: ${theme.black.third}; font-size: .88em; }
    table { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
    th, td { border: 1px solid ${theme.disabled}; padding: 7px 9px; vertical-align: top; }
    th { background: ${theme.tonal.primary15}; }
    pre, code { background: ${theme.tonal.primary08}; border-radius: 6px; }
    pre { overflow-x: auto; padding: 12px; }
    code { padding: 2px 4px; }
    blockquote { margin-left: 0; padding-left: 14px; border-left: 3px solid ${theme.themeColor}; color: ${theme.black.second}; }
    .mw-editsection, .mw-empty-elt, style, link { display: none !important; }
</style>
</head>
<body>${content}
<script>
document.addEventListener('click', function(event) {
    var image = event.target.closest && event.target.closest('img');
    if (image) {
        event.preventDefault();
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'image', url: image.src}));
        return;
    }
    var link = event.target.closest && event.target.closest('a');
    if (link && link.href) {
        if ((link.getAttribute('href') || '').startsWith('#')) {
            return;
        }
        event.preventDefault();
        window.ReactNativeWebView.postMessage(JSON.stringify({type: 'link', url: link.href}));
    }
});
</script>
</body>
</html>`;
};

const WikiArticleWebView = ({html, fragment, onLinkPress, onImagePress}) => {
    const { theme } = useTheme();
    const source = useMemo(
        () => ({html: buildArticleDocument(html, theme), baseUrl: ARK_WIKI}),
        [html, theme],
    );
    const injectedJavaScript = useMemo(() => {
        if (!fragment) {
            return 'true;';
        }
        return `document.getElementById(${JSON.stringify(fragment)})?.scrollIntoView(); true;`;
    }, [fragment]);

    const handleMessage = event => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            if (message.type === 'link') {
                onLinkPress(message.url);
            } else if (message.type === 'image') {
                onImagePress(message.url);
            }
        } catch (_error) {
            // 忽略非閱讀器橋接訊息
        }
    };

    const shouldStartLoad = request =>
        request.url === 'about:blank' ||
        request.url === ARK_WIKI ||
        request.url === `${ARK_WIKI}/` ||
        request.url.startsWith('data:text/html');

    return (
        <View style={[styles.container, {backgroundColor: theme.white}]}>
            <WebView
                source={source}
                originWhitelist={['https://*', 'about:blank', 'data:*']}
                onMessage={handleMessage}
                onShouldStartLoadWithRequest={shouldStartLoad}
                injectedJavaScript={injectedJavaScript}
                javaScriptEnabled
                domStorageEnabled={false}
                sharedCookiesEnabled={false}
                thirdPartyCookiesEnabled={false}
                allowFileAccess={false}
                allowUniversalAccessFromFileURLs={false}
                setSupportMultipleWindows={false}
                mixedContentMode="never"
                allowsInlineMediaPlayback={false}
                style={{backgroundColor: theme.white}}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default WikiArticleWebView;
