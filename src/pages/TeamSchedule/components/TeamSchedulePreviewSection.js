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
import {StyleSheet, View} from 'react-native';

import {useFocusEffect} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import PhosphorFeatureIcon from '../../TabbarPages/info/home/search/components/PhosphorFeatureIcon';
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
                <ScalePressable
                    accessibilityRole="button"
                    accessibilityLabel={t('組隊約時間')}
                    accessibilityState={{expanded}}
                    onPress={() => {
                        trigger();
                        setExpanded(current => !current);
                    }}
                    style={myCardStyles.heading}>
                    <View style={myCardStyles.iconColumn}>
                        <PhosphorFeatureIcon
                            name="calendar-check"
                            size={scale(22)}
                            color={theme.featureIconTones.green.foreground}
                        />
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
                </ScalePressable>

                <View style={[styles.actionRow, !expanded && styles.collapsed]}>
                    <View style={styles.primaryActions}>
                        <ScalePressable
                            accessibilityRole="button"
                            accessibilityLabel={t('新建組隊')}
                            onPress={openCreate}
                            hitSlop={{top: 4, bottom: 4}}
                            style={[
                                styles.actionButton,
                                {backgroundColor: theme.white},
                                theme.viewShadow,
                            ]}>
                            <PhosphorFeatureIcon
                                name="plus-circle"
                                size={scale(17)}
                                color={theme.themeColor}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.actionButtonText,
                                    {color: theme.accentForeground},
                                ]}>
                                {t('新建組隊')}
                            </Text>
                        </ScalePressable>
                        <ScalePressable
                            accessibilityRole="button"
                            accessibilityLabel={t('加入隊伍')}
                            onPress={openJoin}
                            hitSlop={{top: 4, bottom: 4}}
                            style={[
                                styles.actionButton,
                                {backgroundColor: theme.white},
                                theme.viewShadow,
                            ]}>
                            <PhosphorFeatureIcon
                                name="user-plus"
                                size={scale(17)}
                                color={theme.themeColor}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.actionButtonText,
                                    {color: theme.accentForeground},
                                ]}>
                                {t('加入隊伍')}
                            </Text>
                        </ScalePressable>
                    </View>
                    <ScalePressable
                        accessibilityRole="button"
                        accessibilityLabel={t('了解組隊約時間')}
                        onPress={openIntro}
                        style={[
                            myCardStyles.iconColumn,
                            styles.infoButton,
                        ]}>
                        <Ionicons
                            name="information-circle-outline"
                            size={scale(18)}
                            color={theme.black.third}
                        />
                    </ScalePressable>
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
                                    <PhosphorFeatureIcon
                                        name="users"
                                        size={scale(20)}
                                        color={theme.featureIconTones.green.foreground}
                                    />
                                </View>
                            }
                        />
                    ) : null}
                    <ScalePressable
                        accessibilityRole="button"
                        accessibilityLabel={t('全部組隊約時間')}
                        onPress={openList}
                        hitSlop={{top: 4, bottom: 4}}
                        style={[
                            styles.listLink,
                            {borderTopColor: theme.disabled},
                        ]}>
                        <Text
                            style={[
                                styles.listLinkText,
                                {color: theme.accentForeground},
                            ]}>
                            {t('全部')}
                        </Text>
                        <View style={myCardStyles.iconColumn}>
                            <Ionicons
                                name="chevron-forward"
                                size={scale(17)}
                                color={theme.black.third}
                            />
                        </View>
                    </ScalePressable>
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
        paddingLeft: scale(10),
        gap: scale(6),
    },
    primaryActions: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    actionButton: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: verticalScale(38),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(7),
        borderRadius: scale(10),
        borderCurve: 'continuous',
        gap: scale(6),
    },
    actionButtonText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(13),
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
        minHeight: verticalScale(38),
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    listLinkText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
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
