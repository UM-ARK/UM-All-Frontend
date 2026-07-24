import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {trigger} from '../../../../utils/trigger';
import HarborActivityRow from './HarborActivityRow';
import HarborProfileCard from './HarborProfileCard';
import HarborSectionHeader from './HarborSectionHeader';
import HarborStatsCard from './HarborStatsCard';

const HarborDashboard = ({user, navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    const actions = [
        {
            key: 'topics',
            label: t('我的話題'),
            icon: 'chatbox-ellipses-outline',
            kind: 'topics',
        },
        {
            key: 'replies',
            label: t('我的回覆'),
            icon: 'arrow-undo-outline',
            kind: 'replies',
        },
        {
            key: 'bookmarks',
            label: t('我的收藏'),
            icon: 'bookmark-outline',
            kind: 'bookmarks',
        },
        {
            key: 'likes',
            label: t('我讚好的'),
            icon: 'heart-outline',
            kind: 'likes',
        },
        {
            key: 'messages',
            label: t('站內訊息'),
            icon: 'mail-outline',
            route: 'HarborInbox',
            params: {initialTab: 'messages'},
            badge: user.unreadMessages,
        },
        {
            key: 'activity',
            label: t('所有活動'),
            icon: 'pulse-outline',
            kind: 'all',
        },
    ];

    const handleActionPress = action => {
        trigger();
        if (action.route) {
            navigation.navigate(action.route, action.params);
            return;
        }
        navigation.navigate('HarborActivity', {
            kind: action.kind,
            title: action.label,
        });
    };

    const handleActivityPress = activity => {
        if (activity.topicId) {
            navigation.navigate('HarborTopicDetail', {
                topicId: activity.topicId,
                postNumber: activity.postNumber,
                topicTitle: activity.title,
            });
            return;
        }
        navigation.navigate('HarborActivity', {kind: 'all'});
    };

    const attentionItems = [
        {
            key: 'notifications',
            label: t('新通知'),
            description: t('查看回覆、提及與互動'),
            icon: 'notifications-outline',
            value: user.unreadNotifications || 0,
            initialTab: 'notifications',
        },
        {
            key: 'messages',
            label: t('站內訊息'),
            description: t('查看 Harbor 私人對話'),
            icon: 'mail-unread-outline',
            value: user.unreadMessages || 0,
            initialTab: 'messages',
        },
    ];

    return (
        <View style={styles.container}>
            <HarborProfileCard
                user={user}
                onPress={() => navigation.navigate('HarborAccountSettings')}
            />

            <HarborSectionHeader title={t('需要處理')} />
            <View style={styles.attentionGrid}>
                {attentionItems.map(item => (
                    <TouchableScale
                        key={item.key}
                        accessibilityRole="button"
                        accessibilityLabel={`${item.value} ${item.label}`}
                        activeScale={0.97}
                        style={[
                            styles.attentionCard,
                            {backgroundColor: theme.white},
                            theme.viewShadow,
                        ]}
                        onPress={() => {
                            trigger();
                            navigation.navigate('HarborInbox', {
                                initialTab: item.initialTab,
                            });
                        }}>
                        <View style={styles.attentionTopRow}>
                            <View
                                style={[
                                    styles.attentionIcon,
                                    {
                                        backgroundColor: theme.tonal.primary15,
                                    },
                                ]}>
                                <Ionicons
                                    name={item.icon}
                                    size={scale(20)}
                                    color={theme.themeColor}
                                />
                            </View>
                            <Text
                                style={[
                                    styles.attentionValue,
                                    {
                                        color: item.value
                                            ? theme.unread
                                            : theme.black.main,
                                    },
                                ]}>
                                {item.value}
                            </Text>
                        </View>
                        <Text
                            style={[
                                styles.attentionLabel,
                                {color: theme.black.main},
                            ]}>
                            {item.label}
                        </Text>
                        <Text
                            numberOfLines={2}
                            style={[
                                styles.attentionDescription,
                                {color: theme.black.third},
                            ]}>
                            {item.description}
                        </Text>
                    </TouchableScale>
                ))}
            </View>

            <HarborSectionHeader
                title={t('我的 Harbor')}
                actionLabel={t('所有活動')}
                onAction={() =>
                    navigation.navigate('HarborActivity', {kind: 'all'})
                }
            />
            <View
                style={[
                    styles.actionsCard,
                    {backgroundColor: theme.white},
                    theme.viewShadow,
                ]}>
                {actions.map(action => (
                    <TouchableScale
                        key={action.key}
                        accessibilityRole="button"
                        accessibilityLabel={action.label}
                        activeScale={0.94}
                        style={styles.actionItem}
                        onPress={() => handleActionPress(action)}>
                        <View
                            style={[
                                styles.actionIcon,
                                {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <Ionicons
                                name={action.icon}
                                size={scale(23)}
                                color={theme.themeColor}
                            />
                            {action.badge ? (
                                <View
                                    style={[
                                        styles.actionBadge,
                                        {backgroundColor: theme.unread},
                                    ]}>
                                    <Text
                                        style={[
                                            styles.actionBadgeText,
                                            {color: theme.trueWhite},
                                        ]}>
                                        {action.badge > 99
                                            ? '99+'
                                            : action.badge}
                                    </Text>
                                </View>
                            ) : null}
                        </View>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.actionLabel,
                                {color: theme.black.second},
                            ]}>
                            {action.label}
                        </Text>
                    </TouchableScale>
                ))}
            </View>

            <HarborSectionHeader
                title={t('最近活動')}
                actionLabel={t('全部')}
                onAction={() =>
                    navigation.navigate('HarborActivity', {kind: 'all'})
                }
            />
            <View
                style={[
                    styles.activityCard,
                    {backgroundColor: theme.white},
                    theme.viewShadow,
                ]}>
                {user.activity?.length ? (
                    user.activity.map((activity, index) => (
                        <HarborActivityRow
                            key={activity.id}
                            item={activity}
                            showDivider={index < user.activity.length - 1}
                            onPress={handleActivityPress}
                        />
                    ))
                ) : (
                    <View style={styles.compactEmpty}>
                        <Text
                            style={[
                                styles.compactEmptyText,
                                {color: theme.black.third},
                            ]}>
                            {t('暫時沒有最近活動')}
                        </Text>
                    </View>
                )}
            </View>

            <HarborSectionHeader title={t('我的貢獻')} />
            <HarborStatsCard items={user.contributions} />

            <HarborSectionHeader
                title={t('社群成就')}
                actionLabel={t('查看全部')}
                onAction={() => navigation.navigate('HarborBadges')}
            />
            <Pressable
                accessibilityRole="button"
                style={({pressed}) => [
                    styles.badgesCard,
                    {backgroundColor: theme.white},
                    theme.viewShadow,
                    pressed && {backgroundColor: theme.tonal.primary08},
                ]}
                onPress={() => {
                    trigger();
                    navigation.navigate('HarborBadges');
                }}>
                {user.badges?.length ? (
                    user.badges.slice(0, 3).map(badge => (
                        <View key={badge.id} style={styles.badgeItem}>
                            <View
                                style={[
                                    styles.badgeIcon,
                                    {
                                        backgroundColor:
                                            theme.tonal.secondary15,
                                    },
                                ]}>
                                {badge.imageUrl ? (
                                    <Image
                                        source={{uri: badge.imageUrl}}
                                        style={styles.badgeImage}
                                        contentFit="contain"
                                    />
                                ) : (
                                    <MaterialCommunityIcons
                                        name="medal-outline"
                                        size={scale(23)}
                                        color={theme.secondThemeColor}
                                    />
                                )}
                            </View>
                            <Text
                                numberOfLines={2}
                                style={[
                                    styles.badgeName,
                                    {color: theme.black.second},
                                ]}>
                                {badge.name}
                            </Text>
                        </View>
                    ))
                ) : (
                    <View style={styles.badgeEmpty}>
                        <MaterialCommunityIcons
                            name="medal-outline"
                            size={scale(22)}
                            color={theme.black.third}
                        />
                        <Text
                            style={[
                                styles.compactEmptyText,
                                {color: theme.black.third},
                            ]}>
                            {t('繼續參與社群即可解鎖徽章')}
                        </Text>
                    </View>
                )}
            </Pressable>

            <HarborSectionHeader title={t('閱讀概況')} />
            <HarborStatsCard items={user.stats} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: verticalScale(12),
    },
    attentionGrid: {
        flexDirection: 'row',
        gap: scale(10),
    },
    attentionCard: {
        flex: 1,
        minHeight: verticalScale(122),
        borderRadius: scale(20),
        padding: scale(15),
    },
    attentionTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(10),
    },
    attentionIcon: {
        width: scale(39),
        height: scale(39),
        borderRadius: scale(13),
        alignItems: 'center',
        justifyContent: 'center',
    },
    attentionValue: {
        ...uiStyle.defaultText,
        fontSize: scale(22),
        fontWeight: '780',
    },
    attentionLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
    attentionDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
        marginTop: verticalScale(4),
    },
    actionsCard: {
        borderRadius: scale(20),
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingTop: verticalScale(16),
        paddingBottom: verticalScale(3),
    },
    actionItem: {
        width: '33.333%',
        alignItems: 'center',
        paddingHorizontal: scale(4),
        paddingBottom: verticalScale(16),
    },
    actionIcon: {
        width: scale(48),
        height: scale(48),
        borderRadius: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(7),
    },
    actionBadge: {
        position: 'absolute',
        top: scale(-4),
        right: scale(-4),
        minWidth: scale(18),
        height: scale(18),
        borderRadius: scale(9),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(4),
    },
    actionBadgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '800',
    },
    actionLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
        textAlign: 'center',
    },
    activityCard: {
        borderRadius: scale(20),
        overflow: 'hidden',
    },
    compactEmpty: {
        minHeight: verticalScale(76),
        alignItems: 'center',
        justifyContent: 'center',
        padding: scale(16),
    },
    compactEmptyText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        textAlign: 'center',
    },
    badgesCard: {
        minHeight: verticalScale(112),
        borderRadius: scale(20),
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(16),
    },
    badgeItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: scale(4),
    },
    badgeIcon: {
        width: scale(46),
        height: scale(46),
        borderRadius: scale(15),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(7),
    },
    badgeImage: {
        width: scale(30),
        height: scale(30),
    },
    badgeName: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
        lineHeight: verticalScale(14),
        textAlign: 'center',
    },
    badgeEmpty: {
        flex: 1,
        minHeight: verticalScale(76),
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(8),
    },
});

export default HarborDashboard;
