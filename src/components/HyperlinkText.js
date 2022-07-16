import React from 'react';
import {Text} from 'react-native';
import Hyperlink from 'react-native-hyperlink';

const HyperlinkText = ({children, linkStyle, style }) => {
    return (
        <Hyperlink
            linkStyle={linkStyle}
            onPress={link => console.log(link)}>
            <Text style={style}>{children}</Text>
        </Hyperlink>
    );
};

export default HyperlinkText;
