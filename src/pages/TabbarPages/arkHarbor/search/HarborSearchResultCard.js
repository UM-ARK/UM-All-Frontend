import React, {memo} from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {Image} from 'expo-image';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

/** 搜尋結果中的使用者列（話題／貼文直接複用 HarborTopicCard） */
const HarborSearchResultCard = memo(({user, onPress, onAvatarPress}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={user.username || t('Harbor 會員')}
            onPress={() => {
                trigger();
                onPress(user);
            }}
            style={({pressed}) => [
                styles.userResultCard,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary08
                        : theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <Pressable
                accessibilityRole="link"
                accessibilityLabel={user.username || t('Harbor 會員')}
                onPress={event => {
                    event.stopPropagation?.();
                    trigger();
                    onAvatarPress(user.username);
                }}
                style={({pressed}) => [
                    pressed && styles.avatarPressed,
                ]}>
                {user.avatarUrl ? (
                    <Image
                        source={{uri: user.avatarUrl}}
                        style={[
                            styles.resultAvatar,
                            {backgroundColor: theme.tonal.primary15},
                        ]}
                        contentFit="cover"
                        placeholder={theme.imagePlaceholder}
                        transition={180}
                    />
                ) : (
                    <View
                        style={[
                            styles.resultAvatarFallback,
                            {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <MaterialCommunityIcons
                            name="account-outline"
                            size={scale(20)}
                            color={theme.themeColor}
                        />
                    </View>
                )}
            </Pressable>
            <View style={styles.userResultText}>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.resultTitle,
                        {color: theme.black.main},
                    ]}>
                    {user.username || t('Harbor 會員')}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.resultMetaText,
                        {color: theme.black.third},
                    ]}>
                    @{user.username} · {t('查看此作者的貼文')}
                </Text>
            </View>
            <MaterialCommunityIcons
                name="chevron-right"
                size={scale(20)}
                color={theme.black.third}
            />
        </Pressable>
    );
});

const styles = StyleSheet.create({
    // 與 HarborTopicCard 外邊距對齊
    userResultCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        marginHorizontal: scale(6),
        marginBottom: verticalScale(4),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(11),
        flexDirection: 'row',
        alignItems: 'center',
        overflow: 'hidden',
    },
    resultAvatar: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
    },
    resultAvatarFallback: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarPressed: {
        opacity: 0.65,
    },
    userResultText: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: scale(10),
    },
    resultTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        lineHeight: scale(19),
        fontWeight: '600',
    },
    resultMetaText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(2),
    },
});

export default HarborSearchResultCard;
