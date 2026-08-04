/**
 * 組隊約時間全部列表頁
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';

import { useTheme } from '../../components/ThemeContext';
import { trigger } from '../../utils/trigger';
import { useTeamEvents } from './hooks/useTeamEvents';
import TeamScheduleEventRow from './components/TeamScheduleEventRow';
import {
    TeamScheduleFullState,
    TeamScheduleInlineError,
    TeamScheduleSkeletonList,
} from './components/TeamScheduleStateView';

const ListSeparator = () => <View style={styles.separator} />;

const TeamScheduleListPage = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('my');
    const headerHeight = useHeaderHeight();
    const { events, favoriteEventIds, status, error, refresh } = useTeamEvents({ autoLoad: true });
    const [isRefreshing, setIsRefreshing] = useState(false);

    useEffect(() => {
        navigation.setOptions({ headerTitle: t('全部組隊約時間') });
    }, [navigation, t]);

    // 重新 focus 且 cache 過期時更新
    useFocusEffect(
        useCallback(() => {
            refresh({ force: false }).catch(() => { });
        }, [refresh]),
    );

    const handleRefresh = useCallback(async () => {
        trigger();
        setIsRefreshing(true);
        try {
            await refresh({ force: true });
        } catch (_error) {
            // 錯誤已寫入 hook state
        } finally {
            setIsRefreshing(false);
        }
    }, [refresh]);

    const openDetail = useCallback(
        item => {
            const eventId = item?.event?.eventId;
            if (!eventId) {
                return;
            }
            navigation.navigate('TeamScheduleDetail', { eventId });
        },
        [navigation],
    );

    const openCreate = useCallback(() => {
        navigation.navigate('TeamScheduleCreate');
    }, [navigation]);

    const handleRetry = useCallback(() => {
        refresh({ force: true }).catch(() => { });
    }, [refresh]);

    const renderItem = useCallback(
        ({ item }) => (
            <View
                style={[
                    styles.rowCard,
                    { backgroundColor: theme.white },
                    theme.viewShadow,
                ]}>
                <TeamScheduleEventRow
                    item={item}
                    isFavorite={favoriteEventIds.includes(
                        String(item?.event?.eventId),
                    )}
                    onPress={openDetail}
                />
            </View>
        ),
        [favoriteEventIds, openDetail, theme.viewShadow, theme.white],
    );

    const showInitialLoading =
        (status === 'loading' || status === 'idle') && events.length === 0;
    const showFullError = status === 'error' && events.length === 0;

    const listTopPad = isLiquidGlassSupported
        ? { paddingTop: headerHeight + verticalScale(12) }
        : null;

    const refreshControl = (
        <RefreshControl
            refreshing={isRefreshing}
            tintColor={theme.themeColor}
            colors={[theme.themeColor]}
            progressViewOffset={
                isLiquidGlassSupported
                    ? headerHeight + verticalScale(12)
                    : undefined
            }
            onRefresh={handleRefresh}
        />
    );

    // 初次載入也保留下拉刷新，避免 skeleton 期間無法重試
    if (showInitialLoading) {
        return (
            <View
                style={[styles.container, { backgroundColor: theme.bg_color }]}>
                <ScrollView
                    contentInsetAdjustmentBehavior={
                        isLiquidGlassSupported ? 'never' : 'automatic'
                    }
                    contentContainerStyle={[styles.skeletonWrap, listTopPad]}
                    refreshControl={refreshControl}>
                    <TeamScheduleSkeletonList rows={3} />
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.bg_color }]}>
            <FlashList
                data={events}
                keyExtractor={(item, index) =>
                    String(item?.event?.eventId || index)
                }
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? { top: headerHeight } : undefined
                }
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={[styles.content, listTopPad]}
                showsVerticalScrollIndicator={false}
                renderItem={renderItem}
                ItemSeparatorComponent={ListSeparator}
                ListHeaderComponent={
                    status === 'error' && events.length > 0 ? (
                        <TeamScheduleInlineError
                            message={error?.message || t('無法載入')}
                            actionLabel={t('重試')}
                            onRetry={handleRetry}
                        />
                    ) : null
                }
                ListEmptyComponent={
                    showFullError ? (
                        <TeamScheduleFullState
                            icon="cloud-off-outline"
                            title={t('無法載入')}
                            description={
                                error?.message ||
                                t('請檢查網絡後再試。')
                            }
                            actionLabel={t('重試')}
                            onAction={handleRetry}
                        />
                    ) : (
                        <TeamScheduleFullState
                            icon="calendar-blank-outline"
                            title={t('還沒有組隊約時間')}
                            description={t('建立一個組隊，邀請朋友一起約時間。')}
                            actionLabel={t('新建組隊')}
                            onAction={openCreate}
                        />
                    )
                }
                refreshControl={refreshControl}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    skeletonWrap: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(32),
    },
    rowCard: {
        borderRadius: scale(16),
        overflow: 'hidden',
    },
    separator: {
        height: verticalScale(10),
    },
});

export default TeamScheduleListPage;
