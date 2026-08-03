/**
 * 新建組隊：基本資料表單＋七日候選時間編輯
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import moment from 'moment-timezone';
import {useTranslation} from 'react-i18next';
import {
    KeyboardAwareScrollView,
    KeyboardToolbar,
} from 'react-native-keyboard-controller';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../components/ThemeContext';
import {createTeamEvent} from '../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../utils/scheduling/schedulingErrors';
import {
    ALLOWED_SLOT_MINUTES,
    DEFAULT_SLOT_MINUTES,
    DEFAULT_TIMEZONE,
    normalizeSlotMinutes,
} from '../../utils/scheduling/schedulingModels';
import {trigger} from '../../utils/trigger';
import ScheduleWeekGrid from './components/ScheduleWeekGrid';
import ScheduleWeekPager from './components/ScheduleWeekPager';
import {
    EVENT_EXPIRY_DAYS,
    formatOffsetIso,
    getEarliestSelectableStart,
    getEventExpiryMoment,
    isCandidateSlotSelectable,
    slotsFromSelectedKeys,
    wallClockDateToOffsetIso,
} from './components/scheduleWeekHelpers';
import {clearTeamEventsCache} from './hooks/useTeamEvents';
import {
    commitCandidateDraft,
    createEmptyDraft,
} from './utils/scheduleDraft';
import {
    getWeekDateKeys,
    getWeekStartDate,
} from './utils/scheduleGrid';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 4000;

/**
 * 後端錯誤碼 → 可讀文案 key
 * @param {string} code
 * @returns {string}
 */
function errorMessageForCode(code) {
    switch (code) {
        case 'candidate_after_expiry':
            return '候選時段超出活動有效期（約 180 天），請調整後再試。';
        case 'deadline_after_expiry':
            return '回覆截止時間不能晚於活動有效期。';
        case 'invalid_title':
            return '請輸入 1 至 200 字的活動名稱。';
        case 'invalid_description':
            return '說明最多 4000 字。';
        case 'invalid_candidate_windows':
            return '請至少選擇一個有效的候選時段。';
        case 'invalid_candidate_date':
            return '候選時段日期與時間不一致，請重新選擇。';
        case 'slot_alignment_required':
            return '候選時段須對齊所選時間粒度。';
        case 'overlapping_candidate_windows':
            return '候選時段不可重疊。';
        case 'harbor_unavailable':
            return '身分服務暫時不可用，請稍後再試。';
        case 'harbor_auth_failed':
            return 'Harbor 登入已失效，請重新登入後再試。';
        default:
            return '暫時無法完成，請稍後再試。';
    }
}

const TeamScheduleCreatePage = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const headerHeight = useHeaderHeight();
    const tz = DEFAULT_TIMEZONE;

    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [slotMinutes, setSlotMinutes] = useState(DEFAULT_SLOT_MINUTES);
    const [responseDeadlineAt, setResponseDeadlineAt] = useState(null);
    const [deadlinePickerVisible, setDeadlinePickerVisible] = useState(false);
    const [draft, setDraft] = useState(() =>
        createEmptyDraft({
            mode: 'candidate',
            slotMinutes: DEFAULT_SLOT_MINUTES,
            timezone: tz,
        }),
    );
    const [weekStartDate, setWeekStartDate] = useState(() =>
        getWeekStartDate(moment.tz(tz).format('YYYY-MM-DD'), tz),
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isPainting, setIsPainting] = useState(false);
    const submittingRef = useRef(false);
    const allowLeaveRef = useRef(false);
    const draftRef = useRef(draft);
    draftRef.current = draft;

    const weekEndDate = useMemo(() => {
        const keys = getWeekDateKeys(weekStartDate, tz);
        return keys[6] || weekStartDate;
    }, [weekStartDate, tz]);

    const minWeekStart = useMemo(
        () => getWeekStartDate(moment.tz(tz).format('YYYY-MM-DD'), tz),
        [tz],
    );
    const maxWeekStart = useMemo(() => {
        const expiry = getEventExpiryMoment(tz);
        return getWeekStartDate(expiry.format('YYYY-MM-DD'), tz);
    }, [tz]);

    const canPrev = weekStartDate > minWeekStart;
    const canNext = weekStartDate < maxWeekStart;

    const hasUnsavedDraft = useMemo(() => {
        const trimmedTitle = title.trim();
        const trimmedDesc = description.trim();
        const hasSlots =
            Array.isArray(draft.selectedKeys) && draft.selectedKeys.length > 0;
        return (
            trimmedTitle.length > 0 ||
            trimmedDesc.length > 0 ||
            hasSlots ||
            responseDeadlineAt != null ||
            slotMinutes !== DEFAULT_SLOT_MINUTES
        );
    }, [title, description, draft.selectedKeys, responseDeadlineAt, slotMinutes]);

    useEffect(() => {
        navigation.setOptions({headerTitle: t('新建組隊')});
    }, [navigation, t]);

    // 未保存草稿攔截返回
    useEffect(() => {
        const unsubscribe = navigation.addListener('beforeRemove', event => {
            if (allowLeaveRef.current || !hasUnsavedDraft) {
                return;
            }
            event.preventDefault();
            Alert.alert(t('放棄建立？'), t('目前的內容尚未送出，確定要離開嗎？'), [
                {
                    text: t('繼續編輯'),
                    style: 'cancel',
                    onPress: () => trigger(),
                },
                {
                    text: t('放棄建立'),
                    style: 'destructive',
                    onPress: () => {
                        trigger();
                        allowLeaveRef.current = true;
                        navigation.dispatch(event.data.action);
                    },
                },
            ]);
        });
        return unsubscribe;
    }, [hasUnsavedDraft, navigation, t]);

    const handlePrevWeek = useCallback(() => {
        const prev = moment
            .tz(weekStartDate, 'YYYY-MM-DD', tz)
            .subtract(7, 'days')
            .format('YYYY-MM-DD');
        const nextStart = getWeekStartDate(prev, tz);
        if (nextStart >= minWeekStart) {
            setWeekStartDate(nextStart);
        }
    }, [minWeekStart, tz, weekStartDate]);

    const handleNextWeek = useCallback(() => {
        const next = moment
            .tz(weekStartDate, 'YYYY-MM-DD', tz)
            .add(7, 'days')
            .format('YYYY-MM-DD');
        const nextStart = getWeekStartDate(next, tz);
        if (nextStart <= maxWeekStart) {
            setWeekStartDate(nextStart);
        }
    }, [maxWeekStart, tz, weekStartDate]);

    const resetDraftForSlotMinutes = useCallback(nextSlot => {
        setDraft(
            createEmptyDraft({
                mode: 'candidate',
                slotMinutes: nextSlot,
                timezone: tz,
            }),
        );
    }, [tz]);

    const handleSlotMinutesChange = useCallback(
        nextSlot => {
            const normalized = normalizeSlotMinutes(nextSlot);
            if (normalized === slotMinutes) {
                return;
            }
            trigger();
            const hasSlots =
                Array.isArray(draftRef.current.selectedKeys) &&
                draftRef.current.selectedKeys.length > 0;
            if (!hasSlots) {
                setSlotMinutes(normalized);
                resetDraftForSlotMinutes(normalized);
                return;
            }
            Alert.alert(
                t('變更時間粒度？'),
                t('變更粒度會清空已選的候選時段，且不會自動換算。'),
                [
                    {
                        text: t('取消'),
                        style: 'cancel',
                        onPress: () => trigger(),
                    },
                    {
                        text: t('清空並變更'),
                        style: 'destructive',
                        onPress: () => {
                            trigger();
                            setSlotMinutes(normalized);
                            resetDraftForSlotMinutes(normalized);
                        },
                    },
                ],
            );
        },
        [resetDraftForSlotMinutes, slotMinutes, t],
    );

    const validateLocal = useCallback(() => {
        const trimmedTitle = title.trim();
        if (!trimmedTitle || trimmedTitle.length > TITLE_MAX) {
            return t('請輸入 1 至 200 字的活動名稱。');
        }
        if (description.length > DESCRIPTION_MAX) {
            return t('說明最多 4000 字。');
        }
        const selectedKeys = draft.selectedKeys || [];
        if (selectedKeys.length === 0) {
            return t('請至少選擇一個候選時段。');
        }
        const slots = slotsFromSelectedKeys(selectedKeys, tz);
        const earliest = getEarliestSelectableStart(tz, slotMinutes);
        const expiry = getEventExpiryMoment(tz);
        for (let i = 0; i < slots.length; i++) {
            if (
                !isCandidateSlotSelectable(slots[i], {
                    timezone: tz,
                    slotMinutes,
                    earliestStart: earliest,
                    expiryAt: expiry,
                })
            ) {
                const start = moment.tz(slots[i].startAt, tz);
                if (start.isBefore(earliest)) {
                    return t('候選時段不能早於現在。');
                }
                return t('候選時段超出活動有效期（約 180 天），請調整後再試。');
            }
        }
        if (responseDeadlineAt) {
            const deadline = moment.tz(responseDeadlineAt, tz);
            if (!deadline.isValid()) {
                return t('回覆截止時間無效。');
            }
            if (deadline.isAfter(expiry)) {
                return t('回覆截止時間不能晚於活動有效期。');
            }
            if (!deadline.isAfter(moment.tz(tz))) {
                return t('回覆截止時間須晚於現在。');
            }
        }
        return null;
    }, [
        description.length,
        draft.selectedKeys,
        responseDeadlineAt,
        slotMinutes,
        t,
        title,
        tz,
    ]);

    const buildPayload = useCallback(() => {
        const referenceSlots = slotsFromSelectedKeys(draft.selectedKeys, tz);
        const windows = commitCandidateDraft(draft, referenceSlots);
        const candidateWindows = windows.map(win => ({
            date: win.date,
            startAt: formatOffsetIso(win.startAt, tz),
            endAt: formatOffsetIso(win.endAt, tz),
        }));
        const payload = {
            title: title.trim(),
            description: description.trim(),
            timezone: tz,
            slotMinutes: normalizeSlotMinutes(slotMinutes),
            candidateWindows,
        };
        if (responseDeadlineAt) {
            payload.responseDeadlineAt = responseDeadlineAt;
        } else {
            payload.responseDeadlineAt = null;
        }
        return payload;
    }, [
        description,
        draft,
        responseDeadlineAt,
        slotMinutes,
        title,
        tz,
    ]);

    const handleSubmit = useCallback(async () => {
        if (submittingRef.current) {
            return;
        }
        trigger();
        const localError = validateLocal();
        if (localError) {
            Alert.alert(t('無法建立'), localError);
            return;
        }
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const payload = buildPayload();
            const result = await createTeamEvent(payload);
            const eventId = result?.event?.eventId;
            clearTeamEventsCache();
            allowLeaveRef.current = true;
            if (eventId) {
                navigation.replace('TeamScheduleDetail', {eventId});
            } else {
                navigation.goBack();
            }
        } catch (error) {
            const normalized = normalizeSchedulingError(error);
            Alert.alert(
                t('無法建立'),
                t(errorMessageForCode(normalized.code)),
            );
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [buildPayload, navigation, t, validateLocal]);

    const deadlineDisplay = useMemo(() => {
        if (!responseDeadlineAt) {
            return t('未設定');
        }
        return moment
            .tz(responseDeadlineAt, tz)
            .format('YYYY年M月D日 HH:mm');
    }, [responseDeadlineAt, t, tz]);

    const pickerDate = useMemo(() => {
        if (responseDeadlineAt) {
            const m = moment.tz(responseDeadlineAt, tz);
            // 以牆鐘數字餵給 picker（裝置本地 Date）
            return new Date(
                m.year(),
                m.month(),
                m.date(),
                m.hour(),
                m.minute(),
                0,
                0,
            );
        }
        const soon = moment.tz(tz).add(1, 'day').minutes(0).seconds(0);
        return new Date(
            soon.year(),
            soon.month(),
            soon.date(),
            soon.hour(),
            soon.minute(),
            0,
            0,
        );
    }, [responseDeadlineAt, tz]);

    const selectedCount = (draft.selectedKeys || []).length;

    return (
        <View style={[styles.container, {backgroundColor: theme.bg_color}]}>
            <KeyboardAwareScrollView
                bottomOffset={scale(50)}
                keyboardDismissMode="on-drag"
                scrollEnabled={!isPainting}
                contentContainerStyle={[
                    styles.content,
                    isLiquidGlassSupported && {
                        paddingTop: headerHeight + verticalScale(8),
                    },
                ]}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? undefined : 'automatic'
                }>
                <Text style={[styles.sectionTitle, {color: theme.black.main}]}>
                    {t('基本資料')}
                </Text>

                <Text style={[styles.label, {color: theme.black.second}]}>
                    {t('活動名稱')}
                </Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('例如：COMP1000 小組會議')}
                    placeholderTextColor={theme.black.third}
                    maxLength={TITLE_MAX}
                    style={[
                        styles.input,
                        {
                            backgroundColor: theme.tonal.primary08,
                            borderColor: theme.themeColorUltraLight,
                            color: theme.black.main,
                        },
                    ]}
                />
                <Text style={[styles.counter, {color: theme.black.third}]}>
                    {title.trim().length}/{TITLE_MAX}
                </Text>

                <Text style={[styles.label, {color: theme.black.second}]}>
                    {t('說明（選填）')}
                </Text>
                <TextInput
                    value={description}
                    onChangeText={setDescription}
                    placeholder={t('補充地點、議程或其他說明')}
                    placeholderTextColor={theme.black.third}
                    maxLength={DESCRIPTION_MAX}
                    multiline
                    textAlignVertical="top"
                    style={[
                        styles.input,
                        styles.multiline,
                        {
                            backgroundColor: theme.tonal.primary08,
                            borderColor: theme.themeColorUltraLight,
                            color: theme.black.main,
                        },
                    ]}
                />
                <Text style={[styles.counter, {color: theme.black.third}]}>
                    {description.length}/{DESCRIPTION_MAX}
                </Text>

                <View style={styles.metaRow}>
                    <Text style={[styles.label, {color: theme.black.second}]}>
                        {t('時區')}
                    </Text>
                    <Text style={[styles.metaValue, {color: theme.black.main}]}>
                        {t('澳門時間')}
                    </Text>
                </View>

                <Text style={[styles.label, {color: theme.black.second}]}>
                    {t('時間粒度')}
                </Text>
                <View style={styles.chipRow}>
                    {ALLOWED_SLOT_MINUTES.map(value => {
                        const selected = value === slotMinutes;
                        return (
                            <Pressable
                                key={value}
                                onPress={() => handleSlotMinutesChange(value)}
                                style={({pressed}) => [
                                    styles.chip,
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
                                        styles.chipText,
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

                <Text style={[styles.label, {color: theme.black.second}]}>
                    {t('回覆截止（選填）')}
                </Text>
                <View style={styles.deadlineRow}>
                    <Pressable
                        onPress={() => {
                            trigger();
                            setDeadlinePickerVisible(true);
                        }}
                        style={({pressed}) => [
                            styles.deadlineButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.deadlineButtonText,
                                {color: theme.themeColor},
                            ]}>
                            {deadlineDisplay}
                        </Text>
                    </Pressable>
                    {responseDeadlineAt ? (
                        <Pressable
                            onPress={() => {
                                trigger();
                                setResponseDeadlineAt(null);
                            }}
                            style={({pressed}) => [
                                styles.clearButton,
                                {
                                    backgroundColor: pressed
                                        ? theme.tonal.primary30
                                        : theme.tonal.primary08,
                                },
                            ]}>
                            <Text
                                style={[
                                    styles.clearButtonText,
                                    {color: theme.black.second},
                                ]}>
                                {t('清除')}
                            </Text>
                        </Pressable>
                    ) : null}
                </View>

                <Text
                    style={[
                        styles.sectionTitle,
                        styles.sectionSpacing,
                        {color: theme.black.main},
                    ]}>
                    {t('候選時間')}
                </Text>
                <Text style={[styles.hint, {color: theme.black.third}]}>
                    {t(
                        '點選切換格子；長按後拖動可連續選取或清除。活動有效約 {{days}} 天。',
                        {days: EVENT_EXPIRY_DAYS},
                    )}
                </Text>
                <Text style={[styles.hint, {color: theme.black.third}]}>
                    {t('已選 {{count}} 格', {count: selectedCount})}
                </Text>

                <ScheduleWeekPager
                    weekStartDate={weekStartDate}
                    weekEndDate={weekEndDate}
                    onPrev={handlePrevWeek}
                    onNext={handleNextWeek}
                    canPrev={canPrev}
                    canNext={canNext}
                />
                <ScheduleWeekGrid
                    mode="candidate"
                    weekStartDate={weekStartDate}
                    timezone={tz}
                    slotMinutes={slotMinutes}
                    draft={draft}
                    onDraftChange={setDraft}
                    onPaintingChange={setIsPainting}
                />

                <Pressable
                    disabled={isSubmitting}
                    onPress={handleSubmit}
                    style={({pressed}) => [
                        styles.submitButton,
                        {
                            backgroundColor: pressed
                                ? theme.themeColorLight
                                : theme.themeColor,
                            opacity: isSubmitting ? 0.7 : 1,
                        },
                    ]}>
                    {isSubmitting ? (
                        <ActivityIndicator color={theme.trueWhite} />
                    ) : (
                        <Text
                            style={[
                                styles.submitButtonText,
                                {color: theme.trueWhite},
                            ]}>
                            {t('建立組隊')}
                        </Text>
                    )}
                </Pressable>
            </KeyboardAwareScrollView>
            <KeyboardToolbar />

            <DateTimePickerModal
                isVisible={deadlinePickerVisible}
                mode="datetime"
                date={pickerDate}
                minimumDate={new Date()}
                onConfirm={date => {
                    trigger();
                    setDeadlinePickerVisible(false);
                    setResponseDeadlineAt(wallClockDateToOffsetIso(date, tz));
                }}
                onCancel={() => {
                    trigger();
                    setDeadlinePickerVisible(false);
                }}
                confirmTextIOS={t('確定')}
                cancelTextIOS={t('取消')}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingBottom: verticalScale(40),
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(12),
    },
    sectionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '700',
        marginBottom: verticalScale(10),
    },
    sectionSpacing: {
        marginTop: verticalScale(20),
    },
    label: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
        marginBottom: verticalScale(6),
        marginTop: verticalScale(10),
    },
    input: {
        ...uiStyle.defaultText,
        borderRadius: scale(10),
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: scale(14),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    multiline: {
        minHeight: verticalScale(88),
    },
    counter: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(4),
        textAlign: 'right',
    },
    metaRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: verticalScale(12),
    },
    metaValue: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
    },
    chip: {
        borderRadius: scale(16),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(8),
    },
    chipText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    deadlineRow: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: scale(8),
    },
    deadlineButton: {
        borderRadius: scale(10),
        flex: 1,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    deadlineButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    clearButton: {
        borderRadius: scale(10),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    clearButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    hint: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginBottom: verticalScale(4),
    },
    submitButton: {
        alignItems: 'center',
        borderRadius: scale(12),
        justifyContent: 'center',
        marginTop: verticalScale(24),
        minHeight: verticalScale(48),
        paddingVertical: verticalScale(12),
    },
    submitButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
    },
});

export default TeamScheduleCreatePage;
