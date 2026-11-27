import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import {trigger} from '../../../../utils/trigger';
import {myCardStyles} from './myCardStyles';

const QUICK_ACTIONS = [
    {
        key: 'notifications',
        label: '通知',
        phosphorIcon: 'bell',
        iconTone: 'blue',
    },
    {
        key: 'bookmarks',
        label: '收藏',
        phosphorIcon: 'bookmark',
        iconTone: 'orange',
    },
    {
        key: 'likes',
        label: '贊過',
        phosphorIcon: 'heart',
        iconTone: 'pink',
    },
    {
        key: 'drafts',
        label: '草稿',
        phosphorIcon: 'note',
        iconTone: 'green',
    },
    {
        key: 'badges',
        label: '成就',
        phosphorIcon: 'award',
        iconTone: 'orange',
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
                    accessibilityLabel={t(item.label, {context: 'shortcut'})}
                    style={({pressed}) => [
                        styles.action,
                        myCardStyles.column,
                        pressed && styles.pressed,
                    ]}
                    onPress={() => {
                        trigger();
                        onSelect(item.key);
                    }}>
                    <View style={styles.iconWrap}>
                        <PhosphorFeatureIcon
                            name={item.phosphorIcon}
                            size={scale(24)}
                            color={
                                theme.featureIconTones[item.iconTone].foreground
                            }
                        />
                        {item.key === 'notifications' && unreadCount > 0 ? (
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
                        numberOfLines={1}
                        style={[
                            styles.label,
                            {color: theme.black.second},
                        ]}>
                        {t(item.label, {context: 'shortcut'})}
                    </Text>
                </Pressable>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        columnGap: scale(8),
    },
    action: {
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
        alignSelf: 'stretch',
        paddingHorizontal: scale(2),
        fontSize: scale(11),
        lineHeight: verticalScale(14),
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
