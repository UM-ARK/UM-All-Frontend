import React from 'react';
import {Text} from 'react-native';
import Hyperlink from 'react-native-hyperlink';
import Clipboard from '@react-native-clipboard/clipboard';
import Toast from 'react-native-toast-message';

const HyperlinkText = ({children, linkStyle, style}) => {
    const handleLink = (url, text) => {};

    const copyToClipboard = (url, text) => {
        console.log('copying');
        Clipboard.setString(text);
        showClipedMessage();
        console.log('copied');
    };

    const showClipedMessage = () => {
        Toast.show({
            type: 'info',
            text1: `Text copied.`,
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
            <Toast 
                position="top"
                topOffset={0}
                visibilityTime={1000} 
                />
        </>
    );
};

export default HyperlinkText;
