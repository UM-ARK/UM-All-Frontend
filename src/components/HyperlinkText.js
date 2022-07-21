import React from 'react';
import {Text} from 'react-native';
import Hyperlink from 'react-native-hyperlink';
import Clipboard from '@react-native-clipboard/clipboard';
import {useToast} from 'native-base';
import { COLOR_DIY, ToastText } from '../utils/uiMap';

const HyperlinkText = ({children, linkStyle, style}) => {
    const toast = useToast();

    const handleLink = (url, text) => {};

    const copyToClipboard = (url, text) => {
        console.log('copying');
        Clipboard.setString(text);
        showClipedMessage();
        console.log('copied');
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
                // linkDefault={true}
                onPress={(url, text) => handleLink(url, text)}
                onLongPress={(url, text) => {
                    copyToClipboard(url, text);
                }}>
                <Text style={style}>{children}</Text>
            </Hyperlink>
        </>
    );
};

export default HyperlinkText;
