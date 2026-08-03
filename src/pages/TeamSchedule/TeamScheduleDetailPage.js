/**
 * 組隊詳情：熱力週視圖、可用時間編輯、建議時段、owner／member 選單
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Modal,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {MenuView} from '@react-native-menu/menu';
import {useHeaderHeight} from '@react-navigation/elements';
import {usePreventRemove} from '@react-navigation/native';
import moment from 'moment-timezone';
import {useTranslation} from 'react-i18next';
import {
    KeyboardAwareScrollView,
    KeyboardToolbar,
} from 'react-native-keyboard-controller';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import {useHarborSession} from '../../contexts/HarborSessionContext';
import {useSchedulingSession} from '../../contexts/SchedulingSessionContext';
import {uiStyle, useTheme} from '../../components/ThemeContext';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../utils/pathMap';
import {
    deleteTeamEvent,
    leaveTeamEvent,
    updateTeamEvent,
} from '../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../utils/scheduling/schedulingErrors';
import {
    isAvailabilitySubmitted,
    normalizeAvailability,
} from '../../utils/scheduling/schedulingModels';
import {trigger} from '../../utils/trigger';
import AvailabilityEditorFooter from './components/AvailabilityEditorFooter';
import AvailabilityLegend from './components/AvailabilityLegend';
import InviteManagementSheet from './components/InviteManagementSheet';
import ScheduleWeekGrid from './components/ScheduleWeekGrid';
import ScheduleWeekPager from './components/ScheduleWeekPager';
import SlotDetailSheet from './components/SlotDetailSheet';
import TeamScheduleEventHeader from './components/TeamScheduleEventHeader';
import {TeamScheduleFullState} from './components/TeamScheduleStateView';
import {
    formatSuggestionLabel,
    wallClockDateToOffsetIso,
} from './components/scheduleWeekHelpers';
import {
    clearTeamEventsCache,
    removeTeamEventFromCache,
} from './hooks/useTeamEvents';
import {useAvailabilityEditor} from './hooks/useAvailabilityEditor';
import {useTeamScheduleDetail} from './hooks/useTeamScheduleDetail';
import {createAvailabilityDraftFromServer} from './utils/scheduleDraft';
import {
    buildWeekPages,
    findWeekPageIndexByDate,
} from './utils/scheduleGrid';
import {slotKey} from './utils/scheduleRanges';
import {
    buildHeatmapWithSuggestions,
    getActiveMembers,
} from './utils/scheduleRecommendations';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 4000;

/**
 * @param {string} code
 * @param {Function} t
 */
function errorMessageForCode(code, t) {
    switch (code) {
        case 'event_not_found':
            return t('活動不存在、無權查看或已刪除。');
        case 'event_expired':
            return t('活動已過期。');
        case 'event_closed':
            return t('活動已關閉。');
        case 'invite_closed':
            return t('邀請已關閉。');
        case 'invalid_invite':
        case 'invite_changed':
            return t('邀請連結無效或已更換，請索取新連結。');
        case 'response_deadline_passed':
            return t('已截止填寫');
        case 'revision_conflict':
            return t('另一部裝置已更新你的時間，請重新檢查後再儲存。');
        case 'membership_create_pending':
        case 'membership_leave_pending':
        case 'availability_update_pending':
            return t('正在處理中，請稍後再試。');
        case 'harbor_unavailable':
            return t('身分服務暫時不可用，請稍後再試。');
        case 'harbor_auth_failed':
            return t('Harbor 登入已失效，請重新登入後再試。');
        case 'owner_cannot_leave':
            return t('建立者無法退出，請關閉或刪除活動。');
        default:
            return t('暫時無法完成，請稍後再試。');
    }
}

/**
 * 是否可編輯可用時間
 */
function computeCanEdit(event, timezone) {
    if (!event || event.status !== 'active') {
        return false;
    }
    const tz = timezone || event.timezone || 'Asia/Macau';
    const now = moment.tz(tz);
    if (event.expiresAt) {
        const expires = moment.tz(event.expiresAt, tz);
        if (expires.isValid() && !expires.isAfter(now)) {
            return false;
        }
    }
    if (event.responseDeadlineAt) {
        const deadline = moment.tz(event.responseDeadlineAt, tz);
        if (deadline.isValid() && !deadline.isAfter(now)) {
            return false;
        }
    }
    return true;
}

function readOnlyReasonFor(event, t) {
    if (!event) {
        return null;
    }
    const tz = event.timezone || 'Asia/Macau';
    const now = moment.tz(tz);
    if (event.expiresAt) {
        const expires = moment.tz(event.expiresAt, tz);
        if (expires.isValid() && !expires.isAfter(now)) {
            return t('活動已過期，僅供查看。');
        }
    }
    if (event.status === 'closed') {
        return t('活動已關閉，全員唯讀且無法加入。');
    }
    if (event.responseDeadlineAt) {
        const deadline = moment.tz(event.responseDeadlineAt, tz);
        if (deadline.isValid() && !deadline.isAfter(now)) {
            return t('已截止填寫，目前為唯讀。');
        }
    }
    return null;
}

const TeamScheduleDetailPage = ({navigation, route}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const {status: harborStatus, login} = useHarborSession();
    const {user: schedulingUser} = useSchedulingSession();
    const harborSignedIn = harborStatus === 'signedIn';

    const eventId = route?.params?.eventId
        ? String(route.params.eventId)
        : '';

    // 邀請 token：立即 scrub，只留在 ref
    const inviteBootRef = useRef(null);
    if (
        inviteBootRef.current === null &&
        route?.params?.invite != null &&
        route.params.invite !== ''
    ) {
        inviteBootRef.current = String(route.params.invite);
    }
    useEffect(() => {
        if (route?.params?.invite != null) {
            navigation.setParams({invite: undefined});
        }
        // 僅掛載時 scrub
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const detail = useTeamScheduleDetail({
        eventId,
        initialInviteToken: inviteBootRef.current,
        harborSignedIn,
    });

    const {
        phase,
        event,
        membership,
        members,
        error,
        joinError,
        isRefreshing,
        isInvitePending,
        refresh,
        retryJoin,
        patchMyAvailability,
        updateDetailEvent,
    } = detail;

    const myHarborUserId =
        membership?.harborUserId ?? schedulingUser?.harborUserId ?? null;

    const openHarborProfile = useCallback(
        username => {
            if (!username) {
                return;
            }
            navigation.navigate('HarborProfile', {
                username,
                mode: 'preview',
            });
        },
        [navigation],
    );

    const myAvailability = useMemo(() => {
        if (myHarborUserId == null) {
            return null;
        }
        const me = (members || []).find(
            m => String(m.harborUserId) === String(myHarborUserId),
        );
        return me ? me.availability : null;
    }, [members, myHarborUserId]);

    const canEdit = computeCanEdit(event, event?.timezone);
    const readOnlyReason = readOnlyReasonFor(event, t);

    const onAvailabilitySaved = useCallback(
        (availability, summaryRevision) => {
            patchMyAvailability(availability, summaryRevision);
        },
        [patchMyAvailability],
    );

    const editor = useAvailabilityEditor({
        eventId,
        event,
        myAvailability,
        canEdit,
        onSaved: onAvailabilitySaved,
    });

    const allowLeaveRef = useRef(false);
    // Native Stack 需用 usePreventRemove，才會在原生返回／手勢前攔截
    usePreventRemove(editor.isEditing && editor.isDirty, ({data}) => {
        if (allowLeaveRef.current) {
            navigation.dispatch(data.action);
            return;
        }
        Alert.alert(
            t('放棄修改？'),
            t('尚未儲存的可用時間將會遺失。'),
            [
                {
                    text: t('繼續編輯'),
                    style: 'cancel',
                    onPress: () => trigger(),
                },
                {
                    text: t('放棄修改'),
                    style: 'destructive',
                    onPress: () => {
                        trigger();
                        editor.discardEdit();
                        allowLeaveRef.current = true;
                        navigation.dispatch(data.action);
                    },
                },
            ],
        );
    });

    const weekPages = useMemo(() => {
        if (!event?.candidateWindows) {
            return [];
        }
        return buildWeekPages({
            candidateWindows: event.candidateWindows,
            timezone: event.timezone,
            slotMinutes: event.slotMinutes,
        });
    }, [event]);

    const [weekIndex, setWeekIndex] = useState(0);
    useEffect(() => {
        setWeekIndex(0);
    }, [event?.eventId]);

    const currentWeek = weekPages[weekIndex] || weekPages[0] || null;

    const heatmapBundle = useMemo(() => {
        if (!event) {
            return {heatmap: null, suggestions: []};
        }
        return buildHeatmapWithSuggestions({
            candidateWindows: event.candidateWindows,
            slotMinutes: event.slotMinutes,
            timezone: event.timezone,
            members: getActiveMembers({members}),
        });
    }, [event, members]);

    const heatmapByKey = useMemo(() => {
        const map = new Map();
        const slots = heatmapBundle.heatmap?.slots || [];
        for (let i = 0; i < slots.length; i++) {
            const item = slots[i];
            map.set(slotKey(item), item);
        }
        return map;
    }, [heatmapBundle]);

    const selfSelectedKeys = useMemo(() => {
        if (!event || !isAvailabilitySubmitted(myAvailability)) {
            return [];
        }
        const draft = createAvailabilityDraftFromServer({
            availability: myAvailability,
            candidateWindows: event.candidateWindows,
            slotMinutes: event.slotMinutes,
            timezone: event.timezone,
        });
        return draft.selectedKeys || [];
    }, [event, myAvailability]);

    const stats = heatmapBundle.heatmap?.stats || {
        submittedCount: 0,
        memberCount: 0,
    };

    const [slotSheet, setSlotSheet] = useState({visible: false, slot: null});
    const [inviteSheetVisible, setInviteSheetVisible] = useState(false);
    const [scrollToStartAt, setScrollToStartAt] = useState(null);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [editTitle, setEditTitle] = useState('');
    const [editDescription, setEditDescription] = useState('');
    const [editDeadline, setEditDeadline] = useState(null);
    const [deadlinePickerVisible, setDeadlinePickerVisible] = useState(false);
    const [isPainting, setIsPainting] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);

    const handleSlotPress = useCallback(
        slotItem => {
            if (editor.isEditing) {
                return;
            }
            const heatSlot = heatmapByKey.get(slotKey(slotItem)) || {
                ...slotItem,
                availableCount: 0,
                memberCount: stats.memberCount,
                freeMembers: [],
            };
            setSlotSheet({visible: true, slot: heatSlot});
        },
        [editor.isEditing, heatmapByKey, stats.memberCount],
    );

    const handleSuggestionPress = useCallback(
        suggestion => {
            trigger();
            if (!suggestion?.date || weekPages.length === 0) {
                return;
            }
            const index = findWeekPageIndexByDate(weekPages, suggestion.date);
            if (index >= 0) {
                setWeekIndex(index);
            }
            setScrollToStartAt(suggestion.startAt);
        },
        [weekPages],
    );

    const handleConfirmEdit = useCallback(async () => {
        const result = await editor.confirmEdit();
        if (result.ok) {
            return;
        }
        if (result.code === 'revision_conflict') {
            Alert.alert(
                t('時間衝突'),
                t('另一部裝置已更新你的時間，請重新檢查後再儲存。'),
                [
                    {
                        text: t('採用最新版本'),
                        onPress: () => {
                            trigger();
                            editor.adoptServerAvailability();
                        },
                    },
                    {
                        text: t('繼續編輯'),
                        style: 'cancel',
                        onPress: () => {
                            trigger();
                            editor.keepEditingAfterConflict();
                        },
                    },
                ],
            );
            return;
        }
        Alert.alert(
            t('儲存失敗'),
            errorMessageForCode(result.code, t),
        );
    }, [editor, t]);

    const handleLogin = useCallback(async () => {
        trigger();
        try {
            // 登入 intent 絕不可帶 invite
            await login({
                routeName: 'TeamScheduleDetail',
                params: {eventId},
            });
        } catch (_error) {
            // Harbor session 會處理錯誤
        }
    }, [eventId, login]);

    const openEditBasics = useCallback(() => {
        trigger();
        setEditTitle(event?.title || '');
        setEditDescription(event?.description || '');
        setEditDeadline(
            event?.responseDeadlineAt
                ? moment(event.responseDeadlineAt).toDate()
                : null,
        );
        setEditModalVisible(true);
    }, [event]);

    const saveEditBasics = useCallback(async () => {
        trigger();
        const title = editTitle.trim();
        if (title.length < 1 || title.length > TITLE_MAX) {
            Alert.alert(t('無法儲存'), t('請輸入 1 至 200 字的活動名稱。'));
            return;
        }
        if (editDescription.length > DESCRIPTION_MAX) {
            Alert.alert(t('無法儲存'), t('說明最多 4000 字。'));
            return;
        }
        setActionBusy(true);
        try {
            const patch = {
                title,
                description: editDescription.trim(),
                responseDeadlineAt: editDeadline
                    ? wallClockDateToOffsetIso(
                          editDeadline,
                          event?.timezone,
                      )
                    : null,
            };
            const data = await updateTeamEvent(eventId, patch);
            const nextEvent = data?.event || {...event, ...patch};
            updateDetailEvent(nextEvent);
            setEditModalVisible(false);
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            Alert.alert(
                t('無法儲存'),
                errorMessageForCode(normalized.code, t),
            );
        } finally {
            setActionBusy(false);
        }
    }, [
        editDeadline,
        editDescription,
        editTitle,
        event,
        eventId,
        t,
        updateDetailEvent,
    ]);

    const toggleEventStatus = useCallback(() => {
        trigger();
        const next = event?.status === 'closed' ? 'active' : 'closed';
        const title =
            next === 'closed' ? t('關閉活動？') : t('重新開啟活動？');
        const message =
            next === 'closed'
                ? t('關閉後全員唯讀且不能加入。')
                : t('重新開啟後成員可再次填寫時間。');
        Alert.alert(title, message, [
            {text: t('取消'), style: 'cancel', onPress: () => trigger()},
            {
                text: t('確定'),
                onPress: async () => {
                    trigger();
                    setActionBusy(true);
                    try {
                        const data = await updateTeamEvent(eventId, {
                            status: next,
                        });
                        const apiEvent = data?.event;
                        const nextEvent = apiEvent
                            ? {
                                  ...event,
                                  ...apiEvent,
                                  status: apiEvent.status || next,
                              }
                            : {...event, status: next};
                        updateDetailEvent(nextEvent);
                        // 關閉邀請 Sheet，避免仍顯示過期的邀請狀態
                        setInviteSheetVisible(false);
                        clearTeamEventsCache();
                    } catch (requestError) {
                        const normalized =
                            normalizeSchedulingError(requestError);
                        Alert.alert(
                            t('操作失敗'),
                            errorMessageForCode(normalized.code, t),
                        );
                    } finally {
                        setActionBusy(false);
                    }
                },
            },
        ]);
    }, [event, eventId, t, updateDetailEvent]);

    const handleDelete = useCallback(() => {
        trigger();
        Alert.alert(
            t('永久刪除活動？'),
            t('此操作無法復原，所有成員的時間資料都會被刪除。'),
            [
                {text: t('取消'), style: 'cancel', onPress: () => trigger()},
                {
                    text: t('永久刪除'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        setActionBusy(true);
                        try {
                            await deleteTeamEvent(eventId);
                            removeTeamEventFromCache(eventId);
                            allowLeaveRef.current = true;
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.replace('TeamScheduleList');
                            }
                        } catch (requestError) {
                            const normalized =
                                normalizeSchedulingError(requestError);
                            Alert.alert(
                                t('操作失敗'),
                                errorMessageForCode(normalized.code, t),
                            );
                        } finally {
                            setActionBusy(false);
                        }
                    },
                },
            ],
        );
    }, [eventId, navigation, t]);

    const handleLeave = useCallback(() => {
        trigger();
        Alert.alert(
            t('退出活動？'),
            t('退出後你的可用時間會被刪除。'),
            [
                {text: t('取消'), style: 'cancel', onPress: () => trigger()},
                {
                    text: t('退出活動'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        setActionBusy(true);
                        try {
                            await leaveTeamEvent(eventId);
                            removeTeamEventFromCache(eventId);
                            allowLeaveRef.current = true;
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                            } else {
                                navigation.replace('TeamScheduleList');
                            }
                        } catch (requestError) {
                            const normalized =
                                normalizeSchedulingError(requestError);
                            Alert.alert(
                                t('操作失敗'),
                                errorMessageForCode(normalized.code, t),
                            );
                        } finally {
                            setActionBusy(false);
                        }
                    },
                },
            ],
        );
    }, [eventId, navigation, t]);

    const isOwner = membership?.role === 'owner';
    const eventClosed = event?.status === 'closed';

    const menuActions = useMemo(() => {
        if (isInvitePending || phase !== 'ready' || !event) {
            return [];
        }
        if (isOwner) {
            // 活動關閉時邀請管理不可用；分享改由邀請管理 Sheet 內操作
            const actions = [
                {id: 'edit', title: t('編輯基本資料')},
                {id: 'invite', title: t('邀請管理')},
                {
                    id: 'toggleStatus',
                    title: eventClosed
                        ? t('重新開啟活動')
                        : t('關閉活動'),
                },
                {
                    id: 'delete',
                    title: t('永久刪除'),
                    attributes: {destructive: true},
                },
            ];
            if (eventClosed) {
                actions[1] = {
                    ...actions[1],
                    attributes: {disabled: true},
                };
            }
            return actions;
        }
        return [
            {
                id: 'leave',
                title: t('退出活動'),
                attributes: {destructive: true},
            },
        ];
    }, [event, eventClosed, isInvitePending, isOwner, phase, t]);

    const runMenuAction = useCallback(
        id => {
            trigger();
            switch (id) {
                case 'edit':
                    openEditBasics();
                    break;
                case 'invite':
                    if (event?.status === 'closed') {
                        break;
                    }
                    setInviteSheetVisible(true);
                    break;
                case 'toggleStatus':
                    toggleEventStatus();
                    break;
                case 'delete':
                    handleDelete();
                    break;
                case 'leave':
                    handleLeave();
                    break;
                default:
                    break;
            }
        },
        [
            event?.status,
            handleDelete,
            handleLeave,
            openEditBasics,
            toggleEventStatus,
        ],
    );

    useEffect(() => {
        const hasMenu = menuActions.length > 0;
        navigation.setOptions({
            headerTitle: isInvitePending
                ? t('組隊邀請')
                : event?.title || t('組隊詳情'),
            // iOS：原生 UIBarButtonItem + UIMenu，液態玻璃才是標準圓形
            headerRight:
                hasMenu && Platform.OS !== 'ios'
                    ? () => (
                          <MenuView
                              key={`team-menu-${event?.status || 'none'}`}
                              actions={menuActions}
                              onPressAction={({nativeEvent}) =>
                                  runMenuAction(nativeEvent.event)
                              }
                              shouldOpenOnLongPress={false}
                              style={styles.headerMore}>
                              <Pressable
                                  hitSlop={scale(8)}
                                  onPress={() => trigger()}
                                  style={styles.headerMore}>
                                  <Ionicons
                                      name="ellipsis-horizontal"
                                      size={scale(20)}
                                      color={theme.themeColor}
                                  />
                              </Pressable>
                          </MenuView>
                      )
                    : undefined,
            unstable_headerRightItems:
                hasMenu && Platform.OS === 'ios'
                    ? () => [
                          {
                              type: 'menu',
                              label: t('更多'),
                              accessibilityLabel: t('更多'),
                              icon: {
                                  type: 'sfSymbol',
                                  name: 'ellipsis',
                              },
                              tintColor: theme.themeColor,
                              menu: {
                                  items: menuActions.map(action => ({
                                      type: 'action',
                                      label: action.title,
                                      destructive:
                                          action.attributes?.destructive ===
                                          true,
                                      disabled:
                                          action.attributes?.disabled === true,
                                      onPress: () => runMenuAction(action.id),
                                  })),
                              },
                          },
                      ]
                    : undefined,
        });
    }, [
        event?.status,
        event?.title,
        isInvitePending,
        menuActions,
        navigation,
        runMenuAction,
        t,
        theme.themeColor,
    ]);

    // 液態玻璃透明導覽列需手動避開 header；底部加上 Home Indicator
    const topSafePad = isLiquidGlassSupported
        ? headerHeight + verticalScale(8)
        : verticalScale(8);
    const bottomSafePad = Math.max(insets.bottom, verticalScale(16));
    const statePad = {
        paddingTop: topSafePad,
        paddingBottom: bottomSafePad,
    };
    const contentPad = {
        paddingTop: topSafePad,
        paddingBottom: editor.isEditing
            ? verticalScale(90) + insets.bottom
            : verticalScale(40) + insets.bottom,
        paddingHorizontal: scale(14),
    };

    // —— 狀態畫面 ——
    if (!eventId) {
        return (
            <View
                style={[
                    styles.container,
                    styles.center,
                    {backgroundColor: theme.bg_color},
                    statePad,
                ]}>
                <TeamScheduleFullState
                    icon="alert-circle-outline"
                    title={t('活動不存在、無權查看或已刪除。')}
                    actionLabel={t('返回')}
                    onAction={() => navigation.goBack()}
                />
            </View>
        );
    }

    if (phase === 'need_login') {
        return (
            <View
                style={[
                    styles.container,
                    styles.center,
                    {backgroundColor: theme.bg_color},
                    statePad,
                ]}>
                <TeamScheduleFullState
                    icon="account-lock-outline"
                    title={t('組隊邀請')}
                    description={
                        inviteBootRef.current
                            ? t('登入 Harbor 後即可加入組隊。')
                            : t('請先登入 Harbor 以查看組隊詳情。')
                    }
                    actionLabel={t('登入 Harbor')}
                    onAction={handleLogin}
                />
            </View>
        );
    }

    if (phase === 'joining') {
        return (
            <View
                style={[
                    styles.container,
                    styles.center,
                    {backgroundColor: theme.bg_color},
                    statePad,
                ]}>
                <ActivityIndicator color={theme.themeColor} size="large" />
                <Text style={[styles.joiningText, {color: theme.black.third}]}>
                    {t('正在加入組隊…')}
                </Text>
            </View>
        );
    }

    if (phase === 'join_error') {
        const code = joinError?.code;
        const canRetry =
            joinError?.retryable ||
            code === 'harbor_unavailable' ||
            code === 'membership_create_pending';
        return (
            <View
                style={[
                    styles.container,
                    styles.center,
                    {backgroundColor: theme.bg_color},
                    statePad,
                ]}>
                <TeamScheduleFullState
                    icon="link-off"
                    title={t('組隊邀請')}
                    description={errorMessageForCode(code, t)}
                    actionLabel={canRetry ? t('重試') : t('返回')}
                    onAction={() => {
                        if (canRetry) {
                            retryJoin().catch(() => {});
                        } else {
                            navigation.goBack();
                        }
                    }}
                />
            </View>
        );
    }

    if (phase === 'loading') {
        return (
            <View
                style={[
                    styles.container,
                    styles.center,
                    {backgroundColor: theme.bg_color},
                    statePad,
                ]}>
                <ActivityIndicator color={theme.themeColor} size="large" />
            </View>
        );
    }

    if (phase === 'error' && !event) {
        return (
            <View
                style={[
                    styles.container,
                    styles.center,
                    {backgroundColor: theme.bg_color},
                    statePad,
                ]}>
                <TeamScheduleFullState
                    icon="alert-circle-outline"
                    title={errorMessageForCode(error?.code, t)}
                    actionLabel={t('重試')}
                    onAction={() => refresh()}
                />
            </View>
        );
    }

    const hasSubmitted = isAvailabilitySubmitted(
        normalizeAvailability(myAvailability, event?.timezone),
    );

    return (
        <View style={[styles.container, {backgroundColor: theme.bg_color}]}>
            <ScrollView
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={contentPad}
                scrollEnabled={!isPainting}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={() => {
                            if (editor.isEditing) {
                                return;
                            }
                            refresh();
                        }}
                        tintColor={theme.themeColor}
                    />
                }>
                <TeamScheduleEventHeader
                    event={event}
                    membership={membership}
                    stats={stats}
                    readOnlyReason={readOnlyReason}
                />

                {heatmapBundle.suggestions.length > 0 ? (
                    <View style={styles.section}>
                        <View style={styles.suggestHeader}>
                            <Text
                                style={[
                                    styles.sectionTitle,
                                    styles.suggestTitle,
                                    {color: theme.black.main},
                                ]}>
                                {stats.submittedCount < stats.memberCount
                                    ? t('暫時最佳時段')
                                    : t('建議時段')}
                            </Text>
                            {stats.memberCount > 0 ? (
                                <Text
                                    style={[
                                        styles.suggestProgress,
                                        {color: theme.black.third},
                                    ]}>
                                    {t('已提交 {{submitted}}／{{total}} 人', {
                                        submitted: stats.submittedCount,
                                        total: stats.memberCount,
                                    })}
                                </Text>
                            ) : null}
                        </View>
                        {heatmapBundle.suggestions.map((item, index) => (
                            <Pressable
                                key={`suggest-${item.startAt}-${index}`}
                                onPress={() => handleSuggestionPress(item)}
                                style={({pressed}) => [
                                    styles.suggestRow,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.primary30
                                            : theme.tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.suggestBadge,
                                        {color: theme.themeColor},
                                    ]}>
                                    {stats.submittedCount < stats.memberCount
                                        ? t('暫時最佳')
                                        : t('建議')}
                                </Text>
                                <Text
                                    style={[
                                        styles.suggestText,
                                        {color: theme.black.main},
                                    ]}
                                    numberOfLines={1}>
                                    {formatSuggestionLabel(
                                        item,
                                        event.timezone,
                                    )}
                                </Text>
                                <Text
                                    style={[
                                        styles.suggestCount,
                                        {color: theme.black.third},
                                    ]}>
                                    {item.availableCount}/{item.memberCount}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}

                {currentWeek ? (
                    <View style={styles.section}>
                        <ScheduleWeekPager
                            weekStartDate={currentWeek.weekStartDate}
                            weekEndDate={currentWeek.weekEndDate}
                            canPrev={weekIndex > 0}
                            canNext={weekIndex < weekPages.length - 1}
                            onPrev={() =>
                                setWeekIndex(i => Math.max(0, i - 1))
                            }
                            onNext={() =>
                                setWeekIndex(i =>
                                    Math.min(weekPages.length - 1, i + 1),
                                )
                            }
                        />
                        <ScheduleWeekGrid
                            mode={
                                editor.isEditing ? 'availability' : 'readonly'
                            }
                            weekStartDate={currentWeek.weekStartDate}
                            timezone={event.timezone}
                            slotMinutes={event.slotMinutes}
                            candidateWindows={event.candidateWindows}
                            heatmapByKey={heatmapByKey}
                            selfSelectedKeys={selfSelectedKeys}
                            draft={editor.draft}
                            onDraftChange={editor.onDraftChange}
                            onPaintingChange={setIsPainting}
                            onSlotPress={handleSlotPress}
                            scrollToStartAt={scrollToStartAt}
                        />
                        <AvailabilityLegend
                            submittedCount={stats.submittedCount}
                            memberCount={stats.memberCount}
                        />
                    </View>
                ) : null}

                {!editor.isEditing && canEdit ? (
                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            editor.enterEdit();
                        }}
                        style={({pressed}) => [
                            styles.editCta,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary50
                                    : theme.themeColor,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.editCtaText,
                                {color: theme.trueWhite},
                            ]}>
                            {hasSubmitted
                                ? t('修改我的時間')
                                : t('填寫我的時間')}
                        </Text>
                    </Pressable>
                ) : null}

                {members?.length > 0 ? (
                    <View style={styles.section}>
                        <Text
                            style={[
                                styles.sectionTitle,
                                {color: theme.black.main},
                            ]}>
                            {t('成員')}
                        </Text>
                        {members.map(member => {
                            const submitted = isAvailabilitySubmitted(
                                member.availability,
                            );
                            const name =
                                member.displayName ||
                                member.username ||
                                t('成員');
                            const isMe =
                                myHarborUserId != null &&
                                String(member.harborUserId) ===
                                    String(myHarborUserId);
                            const avatarUri = member.avatarTemplate
                                ? ARK_HARBOR_AVATAR_TEMPLATE(
                                      member.avatarTemplate,
                                      72,
                                  )
                                : null;
                            const canOpenProfile = Boolean(member.username);
                            return (
                                <View
                                    key={String(member.harborUserId)}
                                    style={styles.memberRow}>
                                    <Pressable
                                        accessibilityRole="link"
                                        accessibilityLabel={name}
                                        disabled={!canOpenProfile}
                                        onPress={() => {
                                            trigger();
                                            openHarborProfile(member.username);
                                        }}
                                        style={({pressed}) => [
                                            pressed &&
                                                canOpenProfile && {
                                                    opacity: 0.7,
                                                },
                                        ]}>
                                        {avatarUri ? (
                                            <Image
                                                source={{uri: avatarUri}}
                                                style={styles.memberAvatar}
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.memberAvatar,
                                                    {
                                                        backgroundColor:
                                                            theme.tonal
                                                                .primary15,
                                                    },
                                                ]}
                                            />
                                        )}
                                    </Pressable>
                                    <Text
                                        style={[
                                            styles.memberName,
                                            {color: theme.black.main},
                                        ]}
                                        numberOfLines={1}>
                                        {name}
                                        {isMe ? ` (${t('我')})` : ''}
                                        {member.role === 'owner'
                                            ? ` · ${t('建立者')}`
                                            : ''}
                                    </Text>
                                    <Text
                                        style={[
                                            styles.memberStatus,
                                            {
                                                color: submitted
                                                    ? theme.themeColor
                                                    : theme.black.third,
                                            },
                                        ]}>
                                        {submitted
                                            ? t('已提交')
                                            : t('未提交')}
                                    </Text>
                                </View>
                            );
                        })}
                    </View>
                ) : null}

                {actionBusy ? (
                    <ActivityIndicator
                        color={theme.themeColor}
                        style={{marginTop: verticalScale(12)}}
                    />
                ) : null}
            </ScrollView>

            {editor.isEditing ? (
                <AvailabilityEditorFooter
                    confirming={editor.isSaving}
                    onCancel={() => {
                        editor.discardEdit();
                    }}
                    onConfirm={handleConfirmEdit}
                />
            ) : null}

            <SlotDetailSheet
                visible={slotSheet.visible}
                slot={slotSheet.slot}
                members={members}
                timezone={event?.timezone}
                myHarborUserId={myHarborUserId}
                onMemberPress={openHarborProfile}
                onClose={() => setSlotSheet({visible: false, slot: null})}
            />

            <InviteManagementSheet
                visible={inviteSheetVisible}
                eventId={eventId}
                eventTitle={event?.title}
                eventStatus={event?.status}
                onClose={() => setInviteSheetVisible(false)}
            />

            <Modal
                visible={editModalVisible}
                animationType="slide"
                transparent
                onRequestClose={() => setEditModalVisible(false)}>
                <View style={styles.modalBackdrop}>
                    <KeyboardAwareScrollView
                        contentContainerStyle={styles.modalScroll}
                        keyboardDismissMode="on-drag">
                        <View
                            style={[
                                styles.modalCard,
                                {
                                    backgroundColor: theme.bg_color,
                                    paddingBottom:
                                        verticalScale(28) + insets.bottom,
                                },
                            ]}>
                            <Text
                                style={[
                                    styles.modalTitle,
                                    {color: theme.black.main},
                                ]}>
                                {t('編輯基本資料')}
                            </Text>
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    {color: theme.black.third},
                                ]}>
                                {t('活動名稱')}
                            </Text>
                            <TextInput
                                value={editTitle}
                                onChangeText={setEditTitle}
                                maxLength={TITLE_MAX}
                                style={[
                                    styles.input,
                                    {
                                        color: theme.black.main,
                                        backgroundColor: theme.white,
                                        borderColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}
                            />
                            <Text
                                style={[
                                    styles.fieldLabel,
                                    {color: theme.black.third},
                                ]}>
                                {t('說明（選填）')}
                            </Text>
                            <TextInput
                                value={editDescription}
                                onChangeText={setEditDescription}
                                maxLength={DESCRIPTION_MAX}
                                multiline
                                style={[
                                    styles.input,
                                    styles.inputMultiline,
                                    {
                                        color: theme.black.main,
                                        backgroundColor: theme.white,
                                        borderColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}
                            />
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setDeadlinePickerVisible(true);
                                }}
                                style={styles.deadlineRow}>
                                <Text
                                    style={[
                                        styles.fieldLabel,
                                        {color: theme.black.third},
                                    ]}>
                                    {t('回覆截止（選填）')}
                                </Text>
                                <Text
                                    style={[
                                        styles.deadlineValue,
                                        {color: theme.themeColor},
                                    ]}>
                                    {editDeadline
                                        ? moment(editDeadline).format(
                                              'M/D HH:mm',
                                          )
                                        : t('未設定')}
                                </Text>
                            </Pressable>
                            {editDeadline ? (
                                <Pressable
                                    onPress={() => {
                                        trigger();
                                        setEditDeadline(null);
                                    }}>
                                    <Text
                                        style={{
                                            color: theme.black.third,
                                            marginBottom: verticalScale(8),
                                        }}>
                                        {t('清除')}
                                    </Text>
                                </Pressable>
                            ) : null}
                            <View style={styles.modalActions}>
                                <Pressable
                                    onPress={() => {
                                        trigger();
                                        setEditModalVisible(false);
                                    }}
                                    style={({pressed}) => [
                                        styles.modalBtn,
                                        {
                                            backgroundColor: pressed
                                                ? theme.tonal.primary30
                                                : theme.tonal.primary15,
                                        },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.modalBtnText,
                                            {color: theme.themeColor},
                                        ]}>
                                        {t('取消')}
                                    </Text>
                                </Pressable>
                                <Pressable
                                    onPress={saveEditBasics}
                                    style={({pressed}) => [
                                        styles.modalBtn,
                                        {
                                            backgroundColor: pressed
                                                ? theme.tonal.primary50
                                                : theme.themeColor,
                                        },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.modalBtnText,
                                            {color: theme.trueWhite},
                                        ]}>
                                        {t('儲存')}
                                    </Text>
                                </Pressable>
                            </View>
                        </View>
                    </KeyboardAwareScrollView>
                    <KeyboardToolbar />
                </View>
            </Modal>

            <DateTimePickerModal
                isVisible={deadlinePickerVisible}
                mode="datetime"
                date={editDeadline || new Date()}
                onConfirm={date => {
                    setDeadlinePickerVisible(false);
                    setEditDeadline(date);
                }}
                onCancel={() => setDeadlinePickerVisible(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    center: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    joiningText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        marginTop: verticalScale(12),
    },
    section: {
        marginTop: verticalScale(14),
    },
    sectionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
        marginBottom: verticalScale(8),
    },
    suggestHeader: {
        alignItems: 'baseline',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(8),
    },
    suggestTitle: {
        flex: 1,
        marginBottom: 0,
        marginRight: scale(8),
    },
    suggestProgress: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
    },
    suggestRow: {
        alignItems: 'center',
        borderRadius: scale(10),
        flexDirection: 'row',
        marginBottom: verticalScale(6),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(10),
    },
    suggestBadge: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
        marginRight: scale(8),
    },
    suggestText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
    },
    suggestCount: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        marginLeft: scale(8),
    },
    editCta: {
        alignItems: 'center',
        borderRadius: scale(12),
        marginTop: verticalScale(16),
        paddingVertical: verticalScale(12),
    },
    editCtaText: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
    },
    // Android headerRight：固定正方形按鈕
    headerMore: {
        alignItems: 'center',
        borderRadius: scale(18),
        height: scale(36),
        justifyContent: 'center',
        marginRight: scale(4),
        overflow: 'hidden',
        width: scale(36),
    },
    memberRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: verticalScale(6),
    },
    memberAvatar: {
        borderRadius: scale(14),
        height: scale(28),
        marginRight: scale(10),
        width: scale(28),
    },
    memberName: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
        marginRight: scale(8),
    },
    memberStatus: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
    modalBackdrop: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalScroll: {
        flexGrow: 1,
        justifyContent: 'flex-end',
    },
    modalCard: {
        borderTopLeftRadius: scale(16),
        borderTopRightRadius: scale(16),
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(16),
    },
    modalTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '700',
        marginBottom: verticalScale(12),
    },
    fieldLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        marginBottom: verticalScale(4),
    },
    input: {
        ...uiStyle.defaultText,
        borderRadius: scale(10),
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: scale(14),
        marginBottom: verticalScale(10),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(8),
    },
    inputMultiline: {
        minHeight: verticalScale(80),
        textAlignVertical: 'top',
    },
    deadlineRow: {
        marginBottom: verticalScale(4),
    },
    deadlineValue: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '600',
    },
    modalActions: {
        flexDirection: 'row',
        gap: scale(10),
        marginTop: verticalScale(8),
    },
    modalBtn: {
        alignItems: 'center',
        borderRadius: scale(12),
        flex: 1,
        paddingVertical: verticalScale(12),
    },
    modalBtnText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
});

export default TeamScheduleDetailPage;
