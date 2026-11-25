import React from 'react';
import {StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import {trigger} from '../../../../utils/trigger';
import HarborProfileCard from './HarborProfileCard';
import HarborQuickActions from './HarborQuickActions';
import HarborStatsCard from './HarborStatsCard';
import {myCardStyles} from './myCardStyles';

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
    badges: navigation => navigation.navigate('HarborBadges'),
};

const HarborProfileOverview = ({
    user,
    unreadCount,
    chatUnreadCount,
    reviewCount = 0,
    navigation,
    onChatPress,
    onSettingsPress,
    teamSchedule,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation(['my', 'harbor', 'common']);

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
                if (item.key === 'topicsViewed') {
                    return {
                        ...item,
                        onPress: () =>
                            navigation.navigate('HarborRecentReads'),
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

    const sectionStyle = [
        styles.section,
        {backgroundColor: theme.white},
        theme.viewShadow,
    ];

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
                onEditProfilePress={
                    user.profile?.canEdit
                        ? () =>
                            navigation.navigate('HarborProfile', {
                                username: user.username,
                                mode: 'edit',
                            })
                        : undefined
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

            <View style={sectionStyle}>{teamSchedule}</View>

            <View style={sectionStyle}>
                <View style={myCardStyles.heading}>
                    <View style={myCardStyles.iconColumn}>
                        <PhosphorFeatureIcon
                            name="messages-square"
                            size={scale(22)}
                            color={theme.featureIconTones.orange.foreground}
                        />
                    </View>
                    <Text
                        accessibilityRole="header"
                        style={[myCardStyles.headingTitle, {color: theme.black.main}]}>
                        {t('論壇', {ns: 'common'})}
                    </Text>
                </View>
                <HarborQuickActions
                    unreadCount={unreadCount}
                    onSelect={handleQuickAction}
                />

                {user.isAdmin || user.isModerator ? (
                    <ScalePressable
                        accessibilityRole="button"
                        accessibilityLabel={t('審核', {ns: 'harbor'})}
                        style={[
                            styles.reviewRow,
                            {borderTopColor: theme.disabled},
                        ]}
                        onPress={() => {
                            trigger();
                            navigation.navigate('HarborReviewQueue');
                        }}>
                        <View style={myCardStyles.iconColumn}>
                            <PhosphorFeatureIcon
                                name="shield"
                                size={scale(20)}
                                color={theme.featureIconTones.pink.foreground}
                            />
                        </View>
                        <View style={styles.reviewContent}>
                            <Text
                                style={[
                                    styles.reviewTitle,
                                    {color: theme.black.main},
                                ]}>
                                {t('審核', {ns: 'harbor'})}
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.reviewDescription,
                                    {color: theme.black.third},
                                ]}>
                                {reviewCount > 0
                                    ? t('{{count}} 項內容等待處理', {
                                        ns: 'harbor',
                                        count: reviewCount,
                                    })
                                    : t('目前沒有待審核內容', {ns: 'harbor'})}
                            </Text>
                        </View>
                        {reviewCount > 0 ? (
                            <View
                                style={[
                                    styles.reviewBadge,
                                    {backgroundColor: theme.unreadForeground},
                                ]}>
                                <Text style={[styles.reviewBadgeText, {color: theme.white}]}>
                                    {reviewCount > 99 ? '99+' : reviewCount}
                                </Text>
                            </View>
                        ) : null}
                        <View style={myCardStyles.iconColumn}>
                            <Ionicons
                                name="chevron-forward"
                                size={scale(17)}
                                color={theme.black.third}
                            />
                        </View>
                    </ScalePressable>
                ) : null}

                <HarborStatsCard items={contributionItems} />
                <Text style={[styles.footnote, {color: theme.black.third}]}>
                    {t('更新可能會有延遲')}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: verticalScale(16),
    },
    section: {
        gap: verticalScale(8),
        borderRadius: scale(16),
        borderCurve: 'continuous',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
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
    reviewRow: {
        minHeight: 44,
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        paddingVertical: verticalScale(10),
    },
    reviewContent: {
        flex: 1,
        minWidth: 0,
    },
    reviewTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '750',
    },
    reviewDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
        marginTop: verticalScale(2),
    },
    reviewBadge: {
        minWidth: scale(24),
        height: scale(24),
        borderRadius: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(6),
    },
    reviewBadgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '800',
    },
    footnote: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(13),
        textAlign: 'center',
        paddingHorizontal: scale(12),
    },
});

export default HarborProfileOverview;
