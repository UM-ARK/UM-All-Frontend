import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';

const QUICK_ACTIONS = [
    {
        key: 'messages',
        label: '消息',
        icon_name: 'mail-outline',
    },
    {
        key: 'bookmarks',
        label: '收藏',
        icon_name: 'bookmark-outline',
    },
    {
        key: 'likes',
        label: '贊過',
        icon_name: 'heart-outline',
    },
    {
        key: 'drafts',
        label: '草稿',
        icon_name: 'document-text-outline',
    },
    {
        key: 'badges',
        label: '成就',
        icon_name: 'ribbon-outline',
    },
];

const HarborQuickActions = ({unreadCount = 0, onSelect}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    return (
        <View style={styles.container}>
            {QUICK_ACTIONS.map(item => (
                <Pressable
                    key={item.key}
                    accessibilityRole="button"
                    accessibilityLabel={t(item.label)}
                    style={({pressed}) => [
                        styles.action,
                        pressed && styles.pressed,
                    ]}
                    onPress={() => {
                        trigger();
                        onSelect(item.key);
                    }}>
                    <View style={styles.iconWrap}>
                        <Ionicons
                            name={item.icon_name}
                            size={scale(22)}
                            color={theme.accentForeground}
                        />
                        {item.key === 'messages' && unreadCount > 0 ? (
                            <View
                                style={[
                                    styles.badge,
                                    {backgroundColor: theme.unreadForeground},
                                ]}>
                                <Text
                                    style={[
                                        styles.badgeText,
                                        {color: theme.white},
                                    ]}>
                                    {unreadCount > 99
                                        ? '99+'
                                        : unreadCount}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <Text
                        numberOfLines={2}
                        style={[
                            styles.label,
                            {color: theme.black.second},
                        ]}>
                        {t(item.label)}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        gap: scale(4),
    },
    action: {
        flex: 1,
        minWidth: 0,
        minHeight: 44,
        alignItems: 'center',
        gap: verticalScale(4),
        paddingVertical: verticalScale(6),
    },
    pressed: {
        opacity: 0.65,
    },
    iconWrap: {
        position: 'relative',
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
        textAlign: 'center',
    },
    badge: {
        position: 'absolute',
        top: scale(-3),
        right: scale(-8),
        minWidth: scale(15),
        height: scale(15),
        borderRadius: scale(8),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(3),
    },
    badgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(8),
        fontWeight: '800',
    },
});

export default HarborQuickActions;
