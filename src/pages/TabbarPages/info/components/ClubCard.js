import React, { useContext, useCallback, memo } from 'react';
import { View, StyleSheet } from 'react-native';

import Text from '../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';

import { NavigationContext } from '@react-navigation/native';
import { Image } from 'expo-image';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from '../../../../components/TouchableScale';

const IMG_SIZE = verticalScale(45);

const ClubCard = ({ data }) => {
    // NavigationContext 可在非基頁拿到路由資訊
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { black, white, trueWhite, imagePlaceholder } = theme;
    const { logo_url, name } = data;

    // 點擊跳轉組織詳情
    const handleJumpToDetail = useCallback(() => {
        trigger();
        setTimeout(() => {
            navigation.navigate('ClubDetail', {
                data: data,
            });
        }, 50);
    }, [navigation, data]);

    return (
        <TouchableScale
            style={[styles.card, { backgroundColor: white }]}
            activeOpacity={0.8}
            onPress={handleJumpToDetail}>
            {/* 社團 / 組織 Logo */}
            <Image
                source={{ uri: logo_url }}
                style={[styles.logo, { backgroundColor: trueWhite }]}
                contentFit="contain"
                placeholder={imagePlaceholder}
                placeholderContentFit="contain"
                transition={200}
            />

            {/* 組織名 */}
            <View style={styles.titleWrapper}>
                <Text
                    style={{ ...uiStyle.defaultText, color: black.main, fontSize: verticalScale(10) }}
                    numberOfLines={1}>
                    {name}
                </Text>
            </View>
        </TouchableScale>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: scale(10),
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: scale(8),
        margin: scale(3),
        width: '100%',
    },
    logo: {
        width: IMG_SIZE,
        height: IMG_SIZE,
        borderRadius: scale(50),
    },
    titleWrapper: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: scale(5),
        width: '80%',
    },
});

export default memo(ClubCard, (prev, next) => prev.data?._id === next.data?._id);
