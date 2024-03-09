import React from 'react';
import { Text, Linking } from 'react-native';

import { COLOR_DIY, ToastText } from '../utils/uiMap';
import { trigger } from '../utils/trigger';
import { openLink } from '../utils/browser';

import Hyperlink from 'react-native-hyperlink';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from "react-native-toast-message";
import { scale } from 'react-native-size-matters';

const HyperlinkText = ({
    children,
    title,
    linkStyle,
    style,
    navigation,
    beforeJump,
}) => {
    // 定義默認參數
    let webview_param = {
        url: '',
        title: '',
        text_color: '#FFF',
        bg_color_diy: COLOR_DIY.themeColor,
        isBarStyleBlack: false,
    };

    const handleHyperLink = (url, text) => {
        trigger();
        if (beforeJump) {
            beforeJump();
        }
        if (url.includes('mailto:')) {
            Linking.openURL(url);
        } else if (url.includes('http')) {
            // both for http & https
            if (navigation) {
                webview_param.url = url;
                webview_param.title = title ? title : 'ARK ALL 集成瀏覽器';

                // navigation.navigate('Webviewer', webview_param);
                // 使用瀏覽器選項卡打開
                openLink(url);
            }
        }
    };

    const copyToClipboard = (url, text) => {
        trigger();
        Clipboard.setString(text);
        Toast.show({
            type: 'arkToast',
            text1: '已複製Link到粘貼板！',
            topOffset: scale(100),
            onPress: () => Toast.hide(),
        });
    };

    return (
        <>
            <Hyperlink
                linkStyle={linkStyle}
                linkDefault={false}
                onPress={(url, text) => handleHyperLink(url, text)}
                onLongPress={(url, text) => copyToClipboard(url, text)}
            >
                {/* <Text style={style}>{children}</Text> */}
                {children}
            </Hyperlink>
        </>
    );
};

export default HyperlinkText;
