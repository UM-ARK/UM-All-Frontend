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

    const borderRadius = scale(8);

    return (
        <View style={{
            position: 'absolute',
            right: scale(8),
            borderRadius,
            ...(isLiquidGlassSupported ? theme.viewShadow : {}),
        }}>
            <FirstLetterNavContainer style={{
                justifyContent: 'center',
                alignItems: 'center',
                borderRadius,
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
                            color: theme.black.third,
                        }}>
                            {letter}
                        </Text>
                    </Pressable>
                ))}
            </FirstLetterNavContainer>
        </View>
    );
};

export default FirstLetterNav;
