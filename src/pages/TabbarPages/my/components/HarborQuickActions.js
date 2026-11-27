import React from 'react';
import {StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import {trigger} from '../../../../utils/trigger';
import {myCardStyles} from './myCardStyles';

const QUICK_ACTIONS = [
    {
        key: 'chat',
        label: '私訊',
        phosphorIcon: 'message-circle',
        iconTone: 'blue',
    },
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

const QUICK_ACTION_ROWS = [QUICK_ACTIONS.slice(0, 3), QUICK_ACTIONS.slice(3)];

const HarborQuickActions = ({unreadCount = 0, chatUnreadCount = 0, onSelect}) => {
    const {theme} = useTheme();
    const {t} = useTranslation(['my', 'harbor']);
    const unreadCounts = {chat: chatUnreadCount, notifications: unreadCount};

    return (
        <View style={styles.container}>
            {QUICK_ACTION_ROWS.map(row => (
                <View key={row[0].key} style={styles.row}>
                    {row.map(item => {
                        const label = t(item.label, {context: 'shortcut'});
                        const count = unreadCounts[item.key] ?? 0;

                        return (
                            <ScalePressable
                                key={item.key}
                                accessibilityRole="button"
                                accessibilityLabel={label}
                                accessibilityValue={count > 0 ? {
                                    text: t('{{count}} 未讀', {ns: 'harbor', count}),
                                } : undefined}
                                style={[styles.action, myCardStyles.column]}
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
                                    {count > 0 ? (
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
                                                {count > 99 ? '99+' : count}
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
                                    {label}
                                </Text>
                            </ScalePressable>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: verticalScale(4),
    },
    row: {
        flexDirection: 'row',
        columnGap: scale(8),
    },
    action: {
        minHeight: 48,
        alignItems: 'center',
        gap: verticalScale(4),
        paddingVertical: verticalScale(6),
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
        fontWeight: '500',
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
