/**
 * 「我的」頁組隊約時間預覽：一筆隊伍、全部、新建／加入組隊
 */
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useState,
} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {logToFirebase} from '../../../utils/firebaseAnalytics';
import {openTeamInviteDetail} from '../../../utils/scheduling/teamInviteLink';
import {trigger} from '../../../utils/trigger';
import {myCardStyles} from '../../TabbarPages/my/components/myCardStyles';
import {useTeamEvents} from '../hooks/useTeamEvents';
import JoinTeamSheet from './JoinTeamSheet';
import TeamScheduleEventRow from './TeamScheduleEventRow';
import TeamScheduleIntroSheet from './TeamScheduleIntroSheet';
import {
    TeamScheduleEventSkeleton,
    TeamScheduleInlineError,
} from './TeamScheduleStateView';

const TeamSchedulePreviewSection = forwardRef(
    ({navigation, refreshHandle}, ref) => {
        const {theme} = useTheme();
        const {t} = useTranslation('my');
        const [expanded, setExpanded] = useState(true);
        const [joinSheetVisible, setJoinSheetVisible] = useState(false);
        const [introSheetVisible, setIntroSheetVisible] = useState(false);
        const {
            recentEvents,
            favoriteEventIds,
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

        useEffect(() => {
            logToFirebase('team_schedule_feature_view', {});
        }, []);

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

        const openIntro = useCallback(() => {
            trigger();
            logToFirebase('team_schedule_intro_view', {});
            setIntroSheetVisible(true);
        }, []);

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
        const previewEvent = recentEvents[0];

        return (
            <>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t('組隊約時間')}
                    accessibilityState={{expanded}}
                    onPress={() => {
                        trigger();
                        setExpanded(current => !current);
                    }}
                    style={({pressed}) => [
                        myCardStyles.heading,
                        pressed && styles.actionPressed,
                    ]}>
                    <View style={myCardStyles.iconColumn}>
                        <View
                            style={[
                                myCardStyles.headingIcon,
                                {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <Ionicons
                                name="calendar-outline"
                                size={scale(19)}
                                color={theme.themeColor}
                            />
                        </View>
                    </View>
                    <Text
                        style={[
                            myCardStyles.headingTitle,
                            {color: theme.black.main},
                        ]}>
                        {t('組隊約時間')}
                    </Text>
                    <View style={myCardStyles.iconColumn}>
                        <Ionicons
                            name={expanded ? 'chevron-up' : 'chevron-down'}
                            size={scale(17)}
                            color={theme.black.third}
                        />
                    </View>
                </Pressable>

                <View style={[styles.actionRow, !expanded && styles.collapsed]}>
                    <View style={myCardStyles.column} />
                    <View style={styles.primaryActions}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('新建組隊')}
                            onPress={openCreate}
                            style={({pressed}) => [
                                styles.actionButton,
                                pressed && styles.actionPressed,
                            ]}>
                            <Ionicons
                                name="add-circle-outline"
                                size={scale(16)}
                                color={theme.themeColor}
                            />
                            <Text
                                style={[
                                    styles.actionButtonText,
                                    {color: theme.accentForeground},
                                ]}>
                                {t('新建組隊')}
                            </Text>
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('加入隊伍')}
                            onPress={openJoin}
                            style={({pressed}) => [
                                styles.actionButton,
                                pressed && styles.actionPressed,
                            ]}>
                            <Ionicons
                                name="enter-outline"
                                size={scale(16)}
                                color={theme.themeColor}
                            />
                            <Text
                                style={[
                                    styles.actionButtonText,
                                    {color: theme.accentForeground},
                                ]}>
                                {t('加入隊伍')}
                            </Text>
                        </Pressable>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('了解組隊約時間')}
                        onPress={openIntro}
                        style={({pressed}) => [
                            myCardStyles.iconColumn,
                            styles.infoButton,
                            pressed && styles.actionPressed,
                        ]}>
                        <Ionicons
                            name="information-circle-outline"
                            size={scale(17)}
                            color={theme.black.third}
                        />
                    </Pressable>
                </View>

                <View
                    style={[
                        styles.listWrap,
                        !expanded && styles.collapsed,
                        {borderTopColor: theme.disabled},
                    ]}>
                    {showSkeleton ? (
                        <View style={styles.listInner}>
                            <TeamScheduleEventSkeleton />
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
                        </View>
                    ) : null}

                    {previewEvent ? (
                        <TeamScheduleEventRow
                            item={previewEvent}
                            isFavorite={favoriteEventIds.includes(
                                String(previewEvent.event.eventId),
                            )}
                            onPress={openDetail}
                            compact
                            chevronContainerStyle={myCardStyles.iconColumn}
                            leadingAccessory={
                                <View style={myCardStyles.iconColumn}>
                                    <Ionicons
                                        name="people-outline"
                                        size={scale(17)}
                                        color={theme.black.third}
                                    />
                                </View>
                            }
                        />
                    ) : null}
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('全部組隊約時間')}
                        onPress={openList}
                        style={({pressed}) => [
                            styles.listLink,
                            {borderTopColor: theme.disabled},
                            pressed && styles.actionPressed,
                        ]}>
                        <Text
                            style={[
                                styles.actionButtonText,
                                {color: theme.accentForeground},
                            ]}>
                            {t('查看全部')}
                        </Text>
                        <View style={myCardStyles.iconColumn}>
                            <Ionicons
                                name="chevron-forward"
                                size={scale(17)}
                                color={theme.black.third}
                            />
                        </View>
                    </Pressable>
                </View>

                <JoinTeamSheet
                    visible={joinSheetVisible}
                    onClose={() => setJoinSheetVisible(false)}
                    onSubmit={handleJoinSubmit}
                />
                <TeamScheduleIntroSheet
                    visible={introSheetVisible}
                    onClose={() => setIntroSheetVisible(false)}
                />
            </>
        );
    },
);

TeamSchedulePreviewSection.displayName = 'TeamSchedulePreviewSection';

const styles = StyleSheet.create({
    collapsed: {
        display: 'none',
    },
    infoButton: {
        minHeight: 44,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    primaryActions: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'flex-start',
        columnGap: scale(24),
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        minHeight: 44,
        flexShrink: 1,
        gap: scale(4),
    },
    actionPressed: {
        opacity: 0.65,
    },
    actionButtonText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(12),
        fontWeight: '600',
    },
    listWrap: {
        borderTopWidth: StyleSheet.hairlineWidth,
        overflow: 'hidden',
    },
    listLink: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        minHeight: 44,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    listInner: {
        paddingVertical: verticalScale(12),
    },
    emptyWrap: {
        alignItems: 'center',
        paddingVertical: verticalScale(16),
    },
    emptyText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        textAlign: 'center',
    },
});

export default TeamSchedulePreviewSection;
