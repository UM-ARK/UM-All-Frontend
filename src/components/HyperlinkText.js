import React from 'react';
import {Text, Vibration} from 'react-native';

import {useToast} from 'native-base';
import Hyperlink from 'react-native-hyperlink';
import Clipboard from '@react-native-clipboard/clipboard';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { COLOR_DIY, ToastText } from '../utils/uiMap';

const HyperlinkText = ({children, linkStyle, style}) => {
    const toast = useToast();

    const options = {
        enableVibrateFallback: true,
        ignoreAndroidSystemSettings: false
      };

    const handleLink = (url, text) => {};

    const copyToClipboard = (url, text) => {
        Clipboard.setString(text);
        Vibration.vibrate(10 * 1000);
        ReactNativeHapticFeedback.trigger("impactMedium", options);
        showClipedMessage();
    };

    const showClipedMessage = () => {
        toast.show({
            title: "Text Copied",
            placement: "top",
            duration: 1000,
            render: () => (
                <ToastText
                    backgroundColor={"#748DA6"}
                    text={"Text Copied"}
                />
            )
        });
    };

    return (
        <>
            <Hyperlink
                linkStyle={linkStyle}
                linkDefault={true}
                onPress={() => Vibration.vibrate()}
                onLongPress={(url, text) => {
                    copyToClipboard(url, text);
                }}>
                <Text style={style}>{children}</Text>
            </Hyperlink>
        </>
    );
};

export default HyperlinkText;
