/**
 * 組隊詳情：熱力週視圖、可用時間編輯、建議時段、owner／member 選單
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {MenuView} from '@react-native-menu/menu';
import {useHeaderHeight} from '@react-navigation/elements';
import {usePreventRemove} from '@react-navigation/native';
import {Image} from 'expo-image';
import moment from 'moment-timezone';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import Ionicons from '@react-native-vector-icons/ionicons';

import {useHarborSession} from '../../contexts/HarborSessionContext';
import {useSchedulingSession} from '../../contexts/SchedulingSessionContext';
import {uiStyle, useTheme} from '../../components/ThemeContext';
import SegmentControl from '../../components/SegmentControl';
import {getCourseData} from '../../utils/checkCoursesKits';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../utils/pathMap';
import {
    deleteTeamEvent,
    leaveTeamEvent,
    updateTeamEvent,
} from '../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../utils/scheduling/schedulingErrors';
import {
    ALLOWED_SLOT_MINUTES,
    DEFAULT_WEEKLY_SCROLL_MINUTE,
    getEarliestAvailabilityStartMinute,
    isAvailabilitySubmitted,
    normalizeAvailability,
} from '../../utils/scheduling/schedulingModels';
import {getLocalStorage, setLocalStorage} from '../../utils/storageKits';
import {buildTeamInviteShareMessage} from '../../utils/scheduling/teamInviteLink';
import {trigger} from '../../utils/trigger';
import AvailabilityEditorFooter from './components/AvailabilityEditorFooter';
import AvailabilityLegend from './components/AvailabilityLegend';
import CourseSchedulePreviewLegend from './components/CourseSchedulePreviewLegend';
import InviteManagementSheet from './components/InviteManagementSheet';
import ScheduleWeekGrid from './components/ScheduleWeekGrid';
import ScheduleTimeRangeInsert from './components/ScheduleTimeRangeInsert';
import SharedTimetableSheet from './components/SharedTimetableSheet';
import SlotDetailSheet from './components/SlotDetailSheet';
import TeamSharedTimetableView from './components/TeamSharedTimetableView';
import TeamScheduleEventHeader from './components/TeamScheduleEventHeader';
import {TeamScheduleFullState} from './components/TeamScheduleStateView';
import {
    buildWeeklySlots,
    formatSuggestionLabel,
} from './components/scheduleWeekHelpers';
import {
    clearTeamEventsCache,
    removeTeamEventFromCache,
} from './hooks/useTeamEvents';
import {useTeamEventFavorites} from './hooks/useTeamEventFavorites';
import {useAvailabilityEditor} from './hooks/useAvailabilityEditor';
import {useSharedTimetables} from './hooks/useSharedTimetables';
import {useTeamScheduleDetail} from './hooks/useTeamScheduleDetail';
import {
    clearDraftRange,
    createAvailabilityDraftFromServer,
    insertDraftRange,
} from './utils/scheduleDraft';
import {createCourseSchedulePrefill} from './utils/courseSchedulePrefill';
import {loadSavedCourseSlots} from './utils/loadSavedCourseSlots';
import {slotKey} from './utils/scheduleRanges';
import {
    aggregateHeatmapSlots,
    buildHeatmapWithSuggestions,
    getActiveMembers,
    mergeHeatmapSlotsForDay,
} from './utils/scheduleRecommendations';

const DISPLAY_SLOT_MINUTES_STORAGE_KEY = 'ARK_TeamSchedule_Display_Slot_Minutes';
const SCHEDULE_MODE_STORAGE_KEY = 'ARK_TeamSchedule_Schedule_Mode';
const DEFAULT_DISPLAY_SLOT_MINUTES = 30;
const EDIT_SLOT_MINUTES = 15;

const isScheduleMode = value =>
    value === 'availability' || value === 'shared';

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
        case 'joined_event_limit_reached':
            return t('你最多可同時加入 100 個尚未過期的活動，請先退出其他活動。');
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
    const {favoriteEventIds, toggleFavorite} = useTeamEventFavorites();
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
        inviteLink,
        members,
        error,
        joinError,
        isRefreshing,
        isInvitePending,
        refresh,
        retryJoin,
        patchMyAvailability,
        updateDetailEvent,
        updateInviteLink,
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

    const sharedTimetables = useSharedTimetables({
        eventId,
        myHarborUserId,
    });
    const [scheduleMode, setScheduleMode] = useState('availability');
    const [courseCatalogSlots, setCourseCatalogSlots] = useState([]);
    const loadedSharedTimetableEventRef = useRef(null);
    const [sharedTimetableSheetVisible, setSharedTimetableSheetVisible] =
        useState(false);

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

    const loadSharedTimetables = useCallback(async () => {
        const [sharedResult, courseResult] = await Promise.allSettled([
            sharedTimetables.load(),
            getCourseData('adddrop'),
        ]);
        if (courseResult.status === 'fulfilled') {
            const slots = courseResult.value?.timetable?.Courses;
            setCourseCatalogSlots(Array.isArray(slots) ? slots : []);
        }
        if (sharedResult.status === 'rejected') {
            return false;
        }
        return true;
    }, [sharedTimetables]);

    const handleScheduleModeChange = useCallback(
        index => {
            const nextMode = index === 1 ? 'shared' : 'availability';
            if (nextMode === 'shared' && editor.isEditing) {
                return;
            }
            setScheduleMode(nextMode);
            setLocalStorage(SCHEDULE_MODE_STORAGE_KEY, nextMode);
        },
        [editor.isEditing],
    );

    useEffect(() => {
        let cancelled = false;
        getLocalStorage(SCHEDULE_MODE_STORAGE_KEY).then(value => {
            if (!cancelled && isScheduleMode(value)) {
                setScheduleMode(value);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (scheduleMode !== 'shared') {
            loadedSharedTimetableEventRef.current = null;
            setCourseCatalogSlots(current =>
                current.length > 0 ? [] : current,
            );
            return;
        }
        if (loadedSharedTimetableEventRef.current === eventId) {
            return;
        }
        loadedSharedTimetableEventRef.current = eventId;
        setCourseCatalogSlots([]);
        loadSharedTimetables();
    }, [eventId, loadSharedTimetables, scheduleMode]);
    const [displaySlotMinutes, setDisplaySlotMinutes] = useState(
        DEFAULT_DISPLAY_SLOT_MINUTES,
    );

    useEffect(() => {
        let cancelled = false;
        getLocalStorage(DISPLAY_SLOT_MINUTES_STORAGE_KEY).then(value => {
            const persisted = Number(value);
            if (!cancelled && ALLOWED_SLOT_MINUTES.includes(persisted)) {
                setDisplaySlotMinutes(persisted);
            }
        });
        return () => {
            cancelled = true;
        };
    }, []);

    const handleDisplaySlotMinutesChange = useCallback(nextSlotMinutes => {
        if (!ALLOWED_SLOT_MINUTES.includes(nextSlotMinutes)) {
            return;
        }
        trigger();
        setDisplaySlotMinutes(nextSlotMinutes);
        setLocalStorage(
            DISPLAY_SLOT_MINUTES_STORAGE_KEY,
            nextSlotMinutes,
        ).catch(() => {});
    }, []);

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

    const heatmapBundle = useMemo(() => {
        if (!event) {
            return {heatmap: null, suggestions: []};
        }
        return buildHeatmapWithSuggestions({
            candidateWindows: event.candidateWindows,
            slotMinutes: EDIT_SLOT_MINUTES,
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
            slotMinutes: EDIT_SLOT_MINUTES,
            timezone: event.timezone,
        });
        return draft.selectedKeys || [];
    }, [event, myAvailability]);

    const displayHeatmapByKey = useMemo(() => {
        const map = new Map();
        const slots = aggregateHeatmapSlots(
            heatmapBundle.heatmap?.slots,
            displaySlotMinutes,
            selfSelectedKeys,
        );
        for (let i = 0; i < slots.length; i++) {
            const item = slots[i];
            map.set(slotKey(item), item);
        }
        return map;
    }, [displaySlotMinutes, heatmapBundle, selfSelectedKeys]);
    const displayCandidateWindows = useMemo(
        () =>
            Array.from(displayHeatmapByKey.values()).map(item => ({
                weekday: item.weekday,
                startMinute: item.startMinute,
                endMinute: item.endMinute,
            })),
        [displayHeatmapByKey],
    );
    const displaySelfSelectedKeys = useMemo(
        () =>
            Array.from(displayHeatmapByKey.values())
                .filter(item => item.isSelfSelected)
                .map(slotKey),
        [displayHeatmapByKey],
    );
    const candidateSlots = useMemo(
        () =>
            buildWeeklySlots(
                event?.candidateWindows,
                EDIT_SLOT_MINUTES,
            ),
        [event?.candidateWindows],
    );
    const handleInsertRange = useCallback(
        range => {
            const next = insertDraftRange(editor.draft, range, candidateSlots);
            if (next === editor.draft) {
                return false;
            }
            editor.onDraftChange(next);
            setScrollToStartMinute(range.startMinute);
            return true;
        },
        [candidateSlots, editor],
    );
    const handleClearRange = useCallback(
        range => {
            const next = clearDraftRange(editor.draft, range, candidateSlots);
            if (next === editor.draft) {
                return false;
            }
            editor.onDraftChange(next);
            setScrollToStartMinute(range.startMinute);
            return true;
        },
        [candidateSlots, editor],
    );

    const stats = heatmapBundle.heatmap?.stats || {
        submittedCount: 0,
        memberCount: 0,
    };
    const earliestAvailabilityStartMinute = useMemo(
        () =>
            getEarliestAvailabilityStartMinute(
                getActiveMembers({members}),
                DEFAULT_WEEKLY_SCROLL_MINUTE,
            ),
        [members],
    );

    const [slotSheet, setSlotSheet] = useState({
        visible: false,
        slot: null,
        slots: [],
    });
    const [inviteSheetVisible, setInviteSheetVisible] = useState(false);
    const [scrollToStartMinute, setScrollToStartMinute] = useState(null);

    useEffect(() => {
        setScrollToStartMinute(null);
    }, [event?.eventId, members]);
    const [isPainting, setIsPainting] = useState(false);
    const [actionBusy, setActionBusy] = useState(false);
    const [coursePrefillLoading, setCoursePrefillLoading] = useState(false);
    const [coursePrefillError, setCoursePrefillError] = useState(null);
    const coursePrefillRequestRef = useRef(0);

    useEffect(() => {
        if (!editor.isEditing) {
            coursePrefillRequestRef.current += 1;
            setCoursePrefillLoading(false);
            setCoursePrefillError(null);
        }
    }, [editor.isEditing]);

    const handleSlotPress = useCallback(
        slotItem => {
            if (editor.isEditing) {
                return;
            }
            const heatSlot = displayHeatmapByKey.get(slotKey(slotItem)) || {
                ...slotItem,
                availableCount: 0,
                memberCount: stats.memberCount,
                freeMembers: [],
            };
            const daySlots = mergeHeatmapSlotsForDay(
                heatmapBundle.heatmap?.slots,
                slotItem.weekday,
            );
            setSlotSheet({visible: true, slot: heatSlot, slots: daySlots});
        },
        [displayHeatmapByKey, editor.isEditing, heatmapBundle, stats.memberCount],
    );

    const handleSuggestionPress = useCallback(
        suggestion => {
            trigger();
            if (!Number.isInteger(suggestion?.startMinute)) {
                return;
            }
            setScrollToStartMinute(suggestion.startMinute);
        },
        [],
    );

    const applyCoursePrefill = useCallback(async () => {
        if (!event || coursePrefillLoading) {
            return;
        }
        const requestId = coursePrefillRequestRef.current + 1;
        coursePrefillRequestRef.current = requestId;
        setCoursePrefillLoading(true);
        setCoursePrefillError(null);
        try {
            const {hasPlan, planSlots} = await loadSavedCourseSlots();
            if (coursePrefillRequestRef.current !== requestId) {
                return;
            }
            if (!hasPlan) {
                editor.disableCoursePrefill();
                setCoursePrefillError(t('尚未建立模擬課表'));
                return;
            }
            if (planSlots.length === 0) {
                editor.disableCoursePrefill();
                setCoursePrefillError(t('無法讀取模擬課表'));
                return;
            }
            const result = createCourseSchedulePrefill({
                candidateWindows: event.candidateWindows,
                courseSlots: planSlots,
                slotMinutes: EDIT_SLOT_MINUTES,
            });
            editor.applyCoursePrefill(result.courseConflictKeys);
        } catch (_error) {
            editor.disableCoursePrefill();
            setCoursePrefillError(t('無法讀取模擬課表'));
        } finally {
            if (coursePrefillRequestRef.current === requestId) {
                setCoursePrefillLoading(false);
            }
        }
    }, [coursePrefillLoading, editor, event, t]);

    const handleCoursePrefillChange = useCallback(
        enabled => {
            trigger();
            if (enabled) {
                applyCoursePrefill();
                return;
            }
            coursePrefillRequestRef.current += 1;
            setCoursePrefillLoading(false);
            setCoursePrefillError(null);
            editor.disableCoursePrefill();
        },
        [applyCoursePrefill, editor],
    );

    const coursePrefillAutoAppliedRef = useRef(false);
    useEffect(() => {
        if (!editor.isEditing) {
            coursePrefillAutoAppliedRef.current = false;
            return;
        }
        if (
            editor.isCoursePrefillEnabled &&
            !coursePrefillAutoAppliedRef.current
        ) {
            coursePrefillAutoAppliedRef.current = true;
            applyCoursePrefill();
        }
    }, [applyCoursePrefill, editor.isCoursePrefillEnabled, editor.isEditing]);

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
        navigation.navigate('TeamScheduleEdit', {
            eventId,
            title: event?.title || '',
            description: event?.description || '',
            responseDeadlineAt: event?.responseDeadlineAt || null,
            timezone: event?.timezone,
        });
    }, [event, eventId, navigation]);

    // 編輯頁儲存成功後帶回更新
    useEffect(() => {
        const editedBasics = route?.params?.editedBasics;
        if (!editedBasics) {
            return;
        }
        updateDetailEvent(editedBasics);
        navigation.setParams({editedBasics: undefined});
    }, [navigation, route?.params?.editedBasics, updateDetailEvent]);

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
    const isFavorite = favoriteEventIds.includes(eventId);

    const handleShareInvite = useCallback(async () => {
        if (!eventId || eventClosed || inviteLink?.status !== 'open') {
            if (eventClosed) {
                Alert.alert(
                    t('活動已關閉'),
                    t('請先重新開啟活動後，再管理邀請連結。'),
                );
            } else if (inviteLink?.status === 'closed') {
                Alert.alert(t('邀請已關閉。'));
            }
            return;
        }
        const url = inviteLink?.shareUrl || null;
        if (!url) {
            Alert.alert(t('無法分享'), t('暫時無法取得邀請連結。'));
            return;
        }
        try {
            const message = buildTeamInviteShareMessage({
                title: event?.title,
                url,
                hint: t(
                    '請用瀏覽器開啟下方連結，或於組隊頁手動貼上即可加入。',
                ),
            });
            await Share.share({
                message,
                url,
            });
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            Alert.alert(
                t('無法分享'),
                normalized.message || t('暫時無法完成，請稍後再試。'),
            );
        }
    }, [event?.title, eventClosed, eventId, inviteLink, t]);

    const menuActions = useMemo(() => {
        if (isInvitePending || phase !== 'ready' || !event) {
            return [];
        }
        const favoriteAction = {
            id: 'favorite',
            title: isFavorite ? t('取消收藏') : t('收藏'),
            image: Platform.select({
                ios: isFavorite ? 'star.fill' : 'star',
                android: isFavorite
                    ? 'btn_star_big_on'
                    : 'btn_star_big_off',
            }),
            imageColor: theme.warning,
        };
        if (isOwner) {
            // 活動關閉時邀請管理不可用；分享改由邀請管理 Sheet 內操作
            const actions = [
                favoriteAction,
                {
                    id: 'edit',
                    title: t('編輯基本資料'),
                    image: Platform.select({
                        ios: 'pencil',
                        android: 'ic_menu_edit',
                    }),
                    imageColor: theme.black.third,
                },
                {
                    id: 'invite',
                    title: t('邀請管理'),
                    image: Platform.select({
                        ios: 'person.crop.circle.badge.plus',
                        android: 'ic_menu_add',
                    }),
                    imageColor: theme.themeColor,
                },
                {
                    id: 'toggleStatus',
                    title: eventClosed
                        ? t('重新開啟活動')
                        : t('關閉活動'),
                    image: Platform.select({
                        ios: eventClosed ? 'lock.open' : 'lock',
                        android: eventClosed
                            ? 'ic_media_play'
                            : 'ic_menu_close_clear_cancel',
                    }),
                    imageColor: eventClosed
                        ? theme.themeColor
                        : theme.warning,
                },
                {
                    id: 'delete',
                    title: t('永久刪除'),
                    image: Platform.select({
                        ios: 'trash',
                        android: 'ic_menu_delete',
                    }),
                    imageColor: theme.unread,
                    attributes: {destructive: true},
                },
            ];
            if (eventClosed) {
                actions[2] = {
                    ...actions[2],
                    attributes: {disabled: true},
                };
            }
            return actions;
        }
        return [
            favoriteAction,
            {
                id: 'leave',
                title: t('退出活動'),
                image: Platform.select({
                    ios: 'rectangle.portrait.and.arrow.right',
                    android: 'ic_menu_close_clear_cancel',
                }),
                imageColor: theme.unread,
                attributes: {destructive: true},
            },
        ];
    }, [
        event,
        eventClosed,
        isFavorite,
        isInvitePending,
        isOwner,
        phase,
        t,
        theme.black.third,
        theme.themeColor,
        theme.unread,
        theme.warning,
    ]);

    const runMenuAction = useCallback(
        id => {
            trigger();
            switch (id) {
                case 'favorite':
                    toggleFavorite(eventId);
                    break;
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
            eventId,
            handleDelete,
            handleLeave,
            openEditBasics,
            toggleFavorite,
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
                              key={`team-menu-${event?.status}-${isFavorite}`}
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
                                      icon: action.image
                                          ? {
                                                type: 'sfSymbol',
                                                name: action.image,
                                            }
                                          : undefined,
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
        isFavorite,
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
                    {backgroundColor: theme.bg_color},
                ]}>
                <ScrollView
                    contentContainerStyle={[styles.centerGrow, statePad]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            tintColor={theme.themeColor}
                            colors={[theme.themeColor]}
                            onRefresh={() => {
                                trigger();
                                if (canRetry) {
                                    retryJoin().catch(() => {});
                                } else {
                                    refresh();
                                }
                            }}
                        />
                    }>
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
                </ScrollView>
            </View>
        );
    }

    if (phase === 'loading') {
        return (
            <View
                style={[
                    styles.container,
                    {backgroundColor: theme.bg_color},
                ]}>
                <ScrollView
                    contentContainerStyle={[styles.centerGrow, statePad]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            tintColor={theme.themeColor}
                            colors={[theme.themeColor]}
                            onRefresh={() => {
                                trigger();
                                refresh();
                            }}
                        />
                    }>
                    <ActivityIndicator
                        color={theme.themeColor}
                        size="large"
                    />
                </ScrollView>
            </View>
        );
    }

    if (phase === 'error' && !event) {
        return (
            <View
                style={[
                    styles.container,
                    {backgroundColor: theme.bg_color},
                ]}>
                <ScrollView
                    contentContainerStyle={[styles.centerGrow, statePad]}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            tintColor={theme.themeColor}
                            colors={[theme.themeColor]}
                            onRefresh={() => {
                                trigger();
                                refresh();
                            }}
                        />
                    }>
                    <TeamScheduleFullState
                        icon="alert-circle-outline"
                        title={errorMessageForCode(error?.code, t)}
                        actionLabel={t('重試')}
                        onAction={() => refresh()}
                    />
                </ScrollView>
            </View>
        );
    }

    const hasSubmitted = isAvailabilitySubmitted(
        normalizeAvailability(myAvailability, event?.timezone),
    );
    const mySharingLevel = sharedTimetables.mySharedTimetable?.sharingLevel;
    const mySharingStatus = sharedTimetables.phase === 'loading' ||
        sharedTimetables.phase === 'idle'
        ? {
              title: t('正在載入小組課表…'),
              hint: null,
              icon: 'hourglass-outline',
          }
        : sharedTimetables.phase === 'error'
          ? {
                title: t('暫時無法載入小組課表。'),
                hint: null,
                icon: 'alert-circle-outline',
            }
          : mySharingLevel === 'course_identity'
            ? {
                  title: t('我的課表共享'),
                  hint: t('共享 Course Code + Section'),
                  icon: 'school-outline',
              }
            : mySharingLevel === 'time_only'
              ? {
                    title: t('我的課表共享'),
                    hint: t('只共享上課時間'),
                    icon: 'time-outline',
                }
              : {
                    title: t('我的課表共享'),
                    hint: t('尚未共享課表'),
                    icon: 'calendar-outline',
                };

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
                            trigger();
                            refresh();
                        }}
                        tintColor={theme.themeColor}
                        colors={[theme.themeColor]}
                    />
                }>
                <TeamScheduleEventHeader
                    event={event}
                    membership={membership}
                    stats={stats}
                    readOnlyReason={readOnlyReason}
                    inviteStatus={inviteLink?.status || null}
                    onSharePress={
                        !isInvitePending &&
                        !eventClosed &&
                        inviteLink?.status === 'open'
                            ? handleShareInvite
                            : undefined
                    }
                />

                <View style={styles.scheduleModeControl}>
                    <SegmentControl
                        options={[
                            {key: 'availability', label: t('共同空檔')},
                            {key: 'shared', label: t('小組課表')},
                        ]}
                        selectedIndex={
                            scheduleMode === 'shared' ? 1 : 0
                        }
                        onChange={handleScheduleModeChange}
                        trackBackgroundColor={theme.tonal.primary08}
                    />
                </View>

                {scheduleMode === 'availability' &&
                heatmapBundle.suggestions.length > 0 ? (
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
                                key={`suggest-${item.weekday}-${item.startMinute}-${index}`}
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
                                    {formatSuggestionLabel(item)}
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

                {scheduleMode === 'availability' && event?.candidateWindows ? (
                    <View style={styles.section}>
                        {!editor.isEditing ? (
                            <View style={styles.displaySlotPicker}>
                                <Text
                                    style={[
                                        styles.displaySlotLabel,
                                        {color: theme.black.second},
                                    ]}>
                                    {t('顯示粒度')}
                                </Text>
                                <View style={styles.displaySlotOptions}>
                                    {ALLOWED_SLOT_MINUTES.map(value => {
                                        const selected =
                                            value === displaySlotMinutes;
                                        return (
                                            <Pressable
                                                key={value}
                                                accessibilityRole="radio"
                                                accessibilityState={{selected}}
                                                onPress={() =>
                                                    handleDisplaySlotMinutesChange(
                                                        value,
                                                    )
                                                }
                                                style={({pressed}) => [
                                                    styles.displaySlotOption,
                                                    {
                                                        backgroundColor: selected
                                                            ? theme.themeColor
                                                            : pressed
                                                              ? theme.tonal.primary30
                                                              : theme.tonal.primary15,
                                                    },
                                                ]}>
                                                <Text
                                                    style={[
                                                        styles.displaySlotOptionText,
                                                        {
                                                            color: selected
                                                                ? theme.trueWhite
                                                                : theme.themeColor,
                                                        },
                                                    ]}>
                                                    {value}
                                                    {t('分鐘')}
                                                </Text>
                                            </Pressable>
                                        );
                                    })}
                                </View>
                            </View>
                        ) : null}
                        {editor.isEditing ? (
                            <View style={styles.coursePrefillRow}>
                                <CourseSchedulePreviewLegend
                                    error={coursePrefillError}
                                />
                                {coursePrefillLoading ? (
                                    <ActivityIndicator
                                        color={theme.themeColor}
                                    />
                                ) : (
                                    <Switch
                                        accessibilityLabel={t('課表預覽')}
                                        accessibilityRole="switch"
                                        accessibilityState={{
                                            checked:
                                                editor.isCoursePrefillEnabled,
                                        }}
                                        value={editor.isCoursePrefillEnabled}
                                        onValueChange={
                                            handleCoursePrefillChange
                                        }
                                        trackColor={{
                                            false: theme.tonal.primary15,
                                            true: theme.tonal.primary50,
                                        }}
                                        thumbColor={theme.trueWhite}
                                        ios_backgroundColor={
                                            theme.tonal.primary15
                                        }
                                    />
                                )}
                            </View>
                        ) : null}
                        {editor.isEditing ? (
                            <ScheduleTimeRangeInsert
                                onClear={handleClearRange}
                                onInsert={handleInsertRange}
                                emptyRangeMessage={t(
                                    '所選時段不在可填寫範圍內。',
                                )}
                            />
                        ) : null}
                        <ScheduleWeekGrid
                            mode={
                                editor.isEditing ? 'availability' : 'readonly'
                            }
                            slotMinutes={
                                editor.isEditing
                                    ? EDIT_SLOT_MINUTES
                                    : displaySlotMinutes
                            }
                            candidateWindows={
                                editor.isEditing
                                    ? event.candidateWindows
                                    : displayCandidateWindows
                            }
                            heatmapByKey={
                                editor.isEditing
                                    ? heatmapByKey
                                    : displayHeatmapByKey
                            }
                            selfSelectedKeys={
                                editor.isEditing
                                    ? selfSelectedKeys
                                    : displaySelfSelectedKeys
                            }
                            courseConflictKeys={editor.courseConflictKeys}
                            draft={editor.draft}
                            onDraftChange={editor.onDraftChange}
                            onPaintingChange={setIsPainting}
                            onSlotPress={handleSlotPress}
                            scrollToStartMinute={
                                scrollToStartMinute ??
                                earliestAvailabilityStartMinute
                            }
                        />
                        <AvailabilityLegend
                            submittedCount={stats.submittedCount}
                            memberCount={stats.memberCount}
                        />
                    </View>
                ) : null}

                {scheduleMode === 'shared' ? (
                    <View style={styles.section}>
                        <Pressable
                            accessibilityRole="button"
                            onPress={() => {
                                trigger();
                                setSharedTimetableSheetVisible(true);
                            }}
                            style={({pressed}) => [
                                styles.sharedTimetableCta,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.primary30
                                        : theme.tonal.primary15,
                                },
                            ]}>
                            <View
                                style={[
                                    styles.sharedTimetableStatusIcon,
                                    {backgroundColor: theme.tonal.primary30},
                                ]}>
                                <Ionicons
                                    name={mySharingStatus.icon}
                                    color={theme.themeColor}
                                    size={scale(18)}
                                />
                            </View>
                            <View style={styles.sharedTimetableStatusContent}>
                                <Text
                                    style={[
                                        styles.sharedTimetableCtaText,
                                        {color: theme.themeColor},
                                    ]}>
                                    {mySharingStatus.title}
                                </Text>
                                {mySharingStatus.hint ? (
                                    <Text
                                        style={[
                                            styles.sharedTimetableStatusHint,
                                            {color: theme.black.third},
                                        ]}>
                                        {mySharingStatus.hint}
                                    </Text>
                                ) : null}
                            </View>
                            <Ionicons
                                name="chevron-forward"
                                color={theme.themeColor}
                                size={scale(17)}
                            />
                        </Pressable>
                        <TeamSharedTimetableView
                            members={sharedTimetables.members}
                            courseSlots={courseCatalogSlots}
                            navigation={navigation}
                            loading={sharedTimetables.phase === 'loading'}
                            error={sharedTimetables.error}
                            onRetry={() => loadSharedTimetables()}
                        />
                    </View>
                ) : null}

                {scheduleMode === 'availability' &&
                !editor.isEditing &&
                canEdit ? (
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
                slots={slotSheet.slots}
                members={members}
                timezone={event?.timezone}
                myHarborUserId={myHarborUserId}
                sharedTimetableMembers={
                    sharedTimetables.phase === 'ready'
                        ? sharedTimetables.members
                        : null
                }
                courseSlots={courseCatalogSlots}
                onMemberPress={openHarborProfile}
                onClose={() =>
                    setSlotSheet({visible: false, slot: null, slots: []})
                }
            />

            <InviteManagementSheet
                visible={inviteSheetVisible}
                eventId={eventId}
                eventTitle={event?.title}
                eventStatus={event?.status}
                initialInviteLink={inviteLink}
                onInviteChange={updateInviteLink}
                onClose={() => setInviteSheetVisible(false)}
            />

            <SharedTimetableSheet
                visible={sharedTimetableSheetVisible}
                eventStatus={event?.status}
                serverSnapshot={sharedTimetables.mySharedTimetable}
                onLoadLocal={() =>
                    loadSavedCourseSlots({includePlanList: true})
                }
                onSave={sharedTimetables.save}
                onStop={sharedTimetables.stopSharing}
                onClose={() => setSharedTimetableSheetVisible(false)}
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
    centerGrow: {
        flexGrow: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(14),
    },
    joiningText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        marginTop: verticalScale(12),
    },
    section: {
        marginTop: verticalScale(14),
    },
    scheduleModeControl: {
        alignItems: 'center',
        marginTop: verticalScale(14),
    },
    displaySlotPicker: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(8),
    },
    displaySlotLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
    displaySlotOptions: {
        flexDirection: 'row',
    },
    displaySlotOption: {
        alignItems: 'center',
        borderRadius: scale(6),
        justifyContent: 'center',
        marginLeft: scale(6),
        minWidth: scale(48),
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(6),
    },
    displaySlotOptionText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '600',
    },
    coursePrefillRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(8),
        minHeight: scale(34),
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
    sharedTimetableCta: {
        alignItems: 'center',
        borderRadius: scale(10),
        flexDirection: 'row',
        marginBottom: verticalScale(12),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(9),
    },
    sharedTimetableStatusIcon: {
        alignItems: 'center',
        borderRadius: scale(17),
        height: scale(34),
        justifyContent: 'center',
        width: scale(34),
    },
    sharedTimetableStatusContent: {
        flex: 1,
        marginHorizontal: scale(9),
    },
    sharedTimetableCtaText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
    sharedTimetableStatusHint: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(15),
        marginTop: verticalScale(2),
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
});

export default TeamScheduleDetailPage;
