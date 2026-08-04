/**
 * 「我的」頁組隊約時間預覽：最近三筆、查看全部、新建／加入組隊
 */
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {openTeamInviteDetail} from '../../../utils/scheduling/teamInviteLink';
import {trigger} from '../../../utils/trigger';
import {useTeamEvents} from '../hooks/useTeamEvents';
import JoinTeamSheet from './JoinTeamSheet';
import TeamScheduleEventRow from './TeamScheduleEventRow';
import {
    TeamScheduleInlineError,
    TeamScheduleSkeletonList,
} from './TeamScheduleStateView';

const TeamSchedulePreviewSection = forwardRef(
    ({navigation, refreshHandle}, ref) => {
        const {theme} = useTheme();
        const {t} = useTranslation('my');
        const [joinSheetVisible, setJoinSheetVisible] = useState(false);
        const {
            recentEvents,
            status,
            error,
            refresh,
            invalidate,
        } = useTeamEvents({autoLoad: true});

        const handleApi = useMemo(
            () => ({
                refresh: (options) => refresh(options),
                invalidate,
            }),
            [invalidate, refresh],
        );

        useImperativeHandle(ref, () => handleApi, [handleApi]);

        // 供「我的」頁下拉更新掛接（與 forwardRef 並存）
        useEffect(() => {
            if (refreshHandle && typeof refreshHandle === 'object') {
                refreshHandle.current = handleApi;
            }
            return () => {
                if (
                    refreshHandle &&
                    typeof refreshHandle === 'object' &&
                    refreshHandle.current === handleApi
                ) {
                    refreshHandle.current = null;
                }
            };
        }, [handleApi, refreshHandle]);

        // 從詳情返回時：cache 已失效則重抓，與列表頁一致
        useFocusEffect(
            useCallback(() => {
                refresh({force: false}).catch(() => {});
            }, [refresh]),
        );

        const openList = useCallback(() => {
            trigger();
            navigation.navigate('TeamScheduleList');
        }, [navigation]);

        const openCreate = useCallback(() => {
            trigger();
            navigation.navigate('TeamScheduleCreate');
        }, [navigation]);

        const openJoin = useCallback(() => {
            trigger();
            setJoinSheetVisible(true);
        }, []);

        const handleJoinSubmit = useCallback(
            ({eventId, invite}) => {
                setJoinSheetVisible(false);
                openTeamInviteDetail(navigation, {eventId, invite});
            },
            [navigation],
        );

        const openDetail = useCallback(
            item => {
                const eventId = item?.event?.eventId;
                if (!eventId) {
                    return;
                }
                navigation.navigate('TeamScheduleDetail', {eventId});
            },
            [navigation],
        );

        const handleRetry = useCallback(() => {
            refresh({force: true}).catch(() => {});
        }, [refresh]);

        const showSkeleton =
            (status === 'loading' || status === 'idle') &&
            recentEvents.length === 0;
        const showError = status === 'error' && recentEvents.length === 0;
        const showSoftError = status === 'error' && recentEvents.length > 0;
        const showEmpty = status === 'ready' && recentEvents.length === 0;
        const showRows = recentEvents.length > 0;

        return (
            <View
                style={[
                    styles.container,
                    {backgroundColor: theme.white},
                ]}>
                <View style={styles.header}>
                    <Text
                        style={[styles.headerTitle, {color: theme.black.main}]}>
                        {t('組隊約時間')}
                    </Text>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('查看全部')}
                        hitSlop={scale(8)}
                        onPress={openList}
                        style={({pressed}) => [
                            styles.headerAction,
                            pressed && {opacity: 0.65},
                        ]}>
                        <Text
                            style={[
                                styles.headerActionText,
                                {color: theme.themeColor},
                            ]}>
                            {t('查看全部')}
                        </Text>
                        <Ionicons
                            name="chevron-forward"
                            size={scale(14)}
                            color={theme.themeColor}
                        />
                    </Pressable>
                </View>

                <View style={styles.actionRow}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('新建組隊')}
                        onPress={openCreate}
                        style={({pressed}) => [
                            styles.actionButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary50
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <Ionicons
                            name="add-circle-outline"
                            size={scale(18)}
                            color={theme.themeColor}
                        />
                        <Text
                            style={[
                                styles.actionButtonText,
                                {color: theme.themeColor},
                            ]}>
                            {t('新建')}
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('加入隊伍')}
                        onPress={openJoin}
                        style={({pressed}) => [
                            styles.actionButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary50
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <Ionicons
                            name="enter-outline"
                            size={scale(18)}
                            color={theme.themeColor}
                        />
                        <Text
                            style={[
                                styles.actionButtonText,
                                {color: theme.themeColor},
                            ]}>
                            {t('加入')}
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.listWrap}>
                    {showSkeleton ? (
                        <View style={styles.listInner}>
                            <TeamScheduleSkeletonList rows={3} />
                        </View>
                    ) : null}

                    {showError || showSoftError ? (
                        <View style={styles.listInner}>
                            <TeamScheduleInlineError
                                message={
                                    error?.message || t('無法載入')
                                }
                                actionLabel={t('重試')}
                                onRetry={handleRetry}
                            />
                        </View>
                    ) : null}

                    {showEmpty ? (
                        <View style={styles.emptyWrap}>
                            <Text
                                style={[
                                    styles.emptyText,
                                    {color: theme.black.third},
                                ]}>
                                {t('還沒有組隊約時間')}
                            </Text>
                            <Pressable
                                accessibilityRole="button"
                                onPress={openCreate}
                                style={({pressed}) => [
                                    styles.emptyAction,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.primary50
                                            : theme.themeColor,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.emptyActionText,
                                        {color: theme.trueWhite},
                                    ]}>
                                    {t('新建組隊')}
                                </Text>
                            </Pressable>
                        </View>
                    ) : null}

                    {showRows
                        ? recentEvents.map((item, index) => (
                              <TeamScheduleEventRow
                                  key={String(
                                      item?.event?.eventId || index,
                                  )}
                                  item={item}
                                  onPress={openDetail}
                                  showDivider={
                                      index < recentEvents.length - 1
                                  }
                              />
                          ))
                        : null}
                </View>

                <JoinTeamSheet
                    visible={joinSheetVisible}
                    onClose={() => setJoinSheetVisible(false)}
                    onSubmit={handleJoinSubmit}
                />
            </View>
        );
    },
);

TeamSchedulePreviewSection.displayName = 'TeamSchedulePreviewSection';

const styles = StyleSheet.create({
    container: {
        borderRadius: scale(10),
        marginTop: verticalScale(8),
        marginBottom: verticalScale(6),
        paddingBottom: verticalScale(10),
        overflow: 'hidden',
    },
    header: {
        minHeight: verticalScale(30),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(10),
        paddingBottom: verticalScale(2),
    },
    headerTitle: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(14),
    },
    headerAction: {
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: scale(8),
        paddingVertical: verticalScale(2),
    },
    headerActionText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
        marginRight: scale(2),
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(14),
        marginBottom: verticalScale(8),
        gap: scale(8),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: scale(10),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(8),
        gap: scale(6),
    },
    actionButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
    listWrap: {
        overflow: 'hidden',
    },
    listInner: {
        padding: scale(12),
    },
    emptyWrap: {
        alignItems: 'center',
        paddingHorizontal: scale(18),
        paddingVertical: verticalScale(22),
    },
    emptyText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        textAlign: 'center',
    },
    emptyAction: {
        minWidth: scale(112),
        alignItems: 'center',
        borderRadius: scale(10),
        marginTop: verticalScale(12),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(8),
    },
    emptyActionText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '700',
    },
});

export default TeamSchedulePreviewSection;
