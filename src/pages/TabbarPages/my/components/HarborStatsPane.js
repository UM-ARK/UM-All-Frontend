import React from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';

import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import HarborSectionHeader from './HarborSectionHeader';
import HarborStatsCard from './HarborStatsCard';

const HarborStatsPane = ({
    user,
    contentBottomInset,
    isRefreshing,
    onRefresh,
    navigation,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('my');

    return (
        <ScrollView
            style={{ backgroundColor: theme.white }}
            contentInsetAdjustmentBehavior="never"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
                styles.content,
                { paddingBottom: contentBottomInset },
            ]}
            refreshControl={
                <RefreshControl
                    refreshing={isRefreshing}
                    tintColor={theme.themeColor}
                    colors={[theme.themeColor]}
                    onRefresh={onRefresh}
                />
            }>
            <HarborStatsCard
                title={t('我的貢獻')}
                items={user.contributions}
            />

            <View
                style={[
                    styles.badgesCard,
                    { backgroundColor: theme.white },
                ]}>
                <HarborSectionHeader
                    title={t('社群成就')}
                    actionLabel={t('查看全部')}
                    onAction={() => navigation.navigate('HarborBadges')}
                />
                <View style={styles.badgesRow}>
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
                                            source={{ uri: badge.imageUrl }}
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
                                        { color: theme.black.second },
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
                                    { color: theme.black.third },
                                ]}>
                                {t('繼續參與社群即可解鎖徽章')}
                            </Text>
                        </View>
                    )}
                </View>
            </View>

            <HarborStatsCard title={t('閱讀概況')} items={user.stats} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    content: {
        gap: verticalScale(8),
        paddingTop: verticalScale(8),
    },
    badgesCard: {
        borderRadius: scale(10),
        paddingBottom: verticalScale(16),
    },
    badgesRow: {
        minHeight: verticalScale(96),
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(8),
    },
    badgeItem: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: scale(4),
    },
    badgeIcon: {
        width: scale(46),
        height: scale(46),
        borderRadius: scale(10),
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
    compactEmptyText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        textAlign: 'center',
    },
});

export default HarborStatsPane;
