import React from 'react';
import {Text, Linking} from 'react-native';

import {useToast} from 'native-base';
import Hyperlink from 'react-native-hyperlink';
import Clipboard from '@react-native-clipboard/clipboard';
import {COLOR_DIY, ToastText} from '../utils/uiMap';

const HyperlinkText = ({
    children,
    title,
    linkStyle,
    style,
    navigation,
    beforeJump,
}) => {
    const toast = useToast();

    const options = {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false,
    };

    // 定義默認參數
    let webview_param = {
        url: '',
        title: '',
        text_color: '#FFF',
        bg_color_diy: COLOR_DIY.themeColor,
        isBarStyleBlack: false,
    };

    const handleHyperLink = (url, text) => {
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

                navigation.navigate('Webviewer', webview_param);
            }
        }
    };

    const copyToClipboard = (url, text) => {
        Clipboard.setString(text);
        showClipedMessage();
    };

    const showClipedMessage = () => {
        toast.show({
            title: 'Text Copied',
            placement: 'top',
            duration: 1000,
            render: () => (
                <ToastText backgroundColor={'#748DA6'} text={'Text Copied'} />
            ),
        });
    };

    return (
        <>
            <Hyperlink
                linkStyle={linkStyle}
                linkDefault={false}
                onPress={(url, text) => handleHyperLink(url, text)}
                onLongPress={(url, text) => copyToClipboard(url, text)}>
                {/* <Text style={style}>{children}</Text> */}
                {children}
            </Hyperlink>
        </>
    );
};

export default HyperlinkText;
