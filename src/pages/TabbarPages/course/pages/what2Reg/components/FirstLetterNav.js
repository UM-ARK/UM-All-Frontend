import React from 'react';
import { Pressable, View } from 'react-native';
import { scale } from 'react-native-size-matters';
import Text from '../../../../../../components/AppText';
import { uiStyle } from '../../../../../../components/ThemeContext';

/**
 * 側邊首字母快速導航
 */
const FirstLetterNav = ({ firstLetterList, scrollData, theme, onScrollTo }) => {
    if ((firstLetterList || []).length <= 1) {
        return null;
    }

    return (
        <View style={{
            position: 'absolute',
            right: scale(8),
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: theme.white,
            borderRadius: scale(8),
            padding: scale(3),
            ...theme.viewShadow,
        }}>
            {firstLetterList.map(letter => (
                <Pressable
                    key={letter}
                    style={{ padding: scale(3) }}
                    onPress={() => onScrollTo(letter)}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(15),
                        color: theme.themeColor,
                    }}>
                        {letter}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
};

export default FirstLetterNav;
