import React from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import HarborBadgeIcon from './HarborBadgeIcon';
import HarborProfileCard from './HarborProfileCard';
import HarborQuickActions from './HarborQuickActions';
import HarborSectionHeader from './HarborSectionHeader';
import HarborStatsCard from './HarborStatsCard';

const QUICK_ACTION_ROUTES = {
    messages: navigation => navigation.navigate('HarborInbox'),
    bookmarks: (navigation, t) =>
        navigation.navigate('HarborActivity', {
            kind: 'bookmarks',
            title: t('收藏'),
        }),
    likes: (navigation, t) =>
        navigation.navigate('HarborActivity', {
            kind: 'likes',
            title: t('贊過'),
        }),
    drafts: navigation => navigation.navigate('HarborDrafts'),
};

const HarborProfileOverview = ({
    user,
    unreadCount,
    chatUnreadCount,
    navigation,
    onChatPress,
    onSettingsPress,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');

    const openBadges = React.useCallback(() => {
        navigation.navigate('HarborBadges');
    }, [navigation]);

    const contributionItems = React.useMemo(() => {
        return (user.contributions || [])
            .filter(item => item.key !== 'badges')
            .map(item => {
                if (item.key === 'topicsCreated') {
                    return {
                        ...item,
                        label: '發佈',
                        onPress: () =>
                            navigation.navigate('HarborActivity', {
                                kind: 'topics',
                                title: t('發佈'),
                            }),
                    };
                }
                if (item.key === 'postsCreated') {
                    return {
                        ...item,
                        onPress: () =>
                            navigation.navigate('HarborActivity', {
                                kind: 'replies',
                                title: t('評論'),
                            }),
                    };
                }
                if (item.key === 'likesReceived') {
                    return {
                        ...item,
                        onPress: () =>
                            navigation.navigate('HarborActivity', {
                                kind: 'likesReceived',
                                title: t('收到的讚'),
                            }),
                    };
                }
                return item;
            });
    }, [navigation, t, user.contributions]);

    const handleQuickAction = React.useCallback(
        key => {
            QUICK_ACTION_ROUTES[key]?.(navigation, t);
        },
        [navigation, t],
    );

    return (
        <View style={styles.container}>
            <HarborProfileCard
                user={user}
                onProfilePress={() =>
                    navigation.navigate('HarborProfile', {
                        username: user.username,
                        mode: 'preview',
                    })
                }
                onChatPress={onChatPress}
                chatUnreadCount={chatUnreadCount}
                onSettingsPress={onSettingsPress}
            />
            {user.partialProfile ? (
                <View
                    style={[
                        styles.partialProfile,
                        {backgroundColor: theme.tonal.secondary15},
                    ]}>
                    <Text
                        style={[
                            styles.partialProfileText,
                            {color: theme.black.second},
                        ]}>
                        {user.usedPreviousProfileData
                            ? t('部分資料暫時無法更新，已保留上次成功資料。')
                            : t('部分資料暫時無法更新，未知統計暫不顯示。')}
                    </Text>
                </View>
            ) : null}

            <HarborQuickActions
                unreadCount={unreadCount}
                onSelect={handleQuickAction}
            />

            <HarborStatsCard items={contributionItems} />

            <Pressable
                accessibilityRole="button"
                accessibilityLabel={t('論壇成就')}
                style={[
                    styles.badgesCard,
                    {backgroundColor: theme.white},
                ]}
                onPress={() => {
                    trigger();
                    openBadges();
                }}>
                <HarborSectionHeader
                    title={t('論壇成就')}
                    showAction
                />
                <View style={styles.badgesRow}>
                    {user.badges?.length ? (
                        user.badges.slice(0, 3).map(badge => (
                            <View
                                key={badge.id}
                                style={styles.badgeItem}>
                                <HarborBadgeIcon badge={badge} compact />
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
                </View>
            </Pressable>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: verticalScale(8),
    },
    partialProfile: {
        borderRadius: scale(10),
        marginHorizontal: scale(0),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(9),
    },
    partialProfileText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
        textAlign: 'center',
    },
    badgesCard: {
        borderRadius: scale(10),
        paddingBottom: verticalScale(10),
    },
    badgesRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(4),
    },
    badgeItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: scale(4),
    },
    badgeName: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
        lineHeight: verticalScale(13),
        textAlign: 'center',
    },
    badgeEmpty: {
        flex: 1,
        minHeight: verticalScale(56),
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(6),
        paddingVertical: verticalScale(8),
    },
    compactEmptyText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        textAlign: 'center',
    },
});

export default HarborProfileOverview;
