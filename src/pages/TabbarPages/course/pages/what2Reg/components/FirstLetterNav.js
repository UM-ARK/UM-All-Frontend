import React from 'react';
import { Pressable, View } from 'react-native';
import { scale } from 'react-native-size-matters';
import Text from '../../../../../../components/AppText';
import { uiStyle } from '../../../../../../components/ThemeContext';
import { GlassView, isLiquidGlassSupported } from '../../../../../../utils/glassEffect';

const FirstLetterNavContainer = isLiquidGlassSupported ? GlassView : View;

/**
 * 側邊首字母快速導航
 */
const FirstLetterNav = ({ firstLetterList, scrollData, theme, onScrollTo }) => {
    if ((firstLetterList || []).length <= 1) {
        return null;
    }

    return (
        <FirstLetterNavContainer style={{
            position: 'absolute',
            right: scale(8),
            justifyContent: 'center',
            alignItems: 'center',
            borderRadius: scale(8),
            padding: scale(3),
            ...(isLiquidGlassSupported ? {
                overflow: 'hidden',
            } : {
                backgroundColor: theme.white,
                ...theme.floatingShadow,
            }),
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
        </FirstLetterNavContainer>
    );
};

export default FirstLetterNav;
