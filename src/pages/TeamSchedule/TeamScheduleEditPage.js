/**
 * 編輯組隊基本資料：名稱、說明、回覆截止
 */
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '../../utils/glassEffect';
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

import Text from '../../components/AppText';
import TextInput from '../../components/AppTextInput';
import {uiStyle, useTheme} from '../../components/ThemeContext';
import {logToFirebase} from '../../utils/firebaseAnalytics';
import {updateTeamEvent} from '../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../utils/scheduling/schedulingErrors';
import {DEFAULT_TIMEZONE} from '../../utils/scheduling/schedulingModels';
import {trigger} from '../../utils/trigger';
import {wallClockDateToOffsetIso} from './components/scheduleWeekHelpers';
import {clearTeamEventsCache} from './hooks/useTeamEvents';

const TITLE_MAX = 200;
const DESCRIPTION_MAX = 4000;
const EVENT_EXPIRY_DAYS = 180;

/**
 * @param {string} code
 * @param {Function} t
 */
function errorMessageForCode(code, t) {
    switch (code) {
        case 'deadline_after_expiry':
            return t('回覆截止時間不能晚於活動有效期。');
        case 'invalid_title':
            return t('請輸入 1 至 200 字的活動名稱。');
        case 'invalid_description':
            return t('說明最多 4000 字。');
        case 'event_not_found':
            return t('活動不存在、無權查看或已刪除。');
        case 'event_closed':
            return t('活動已關閉。');
        case 'harbor_unavailable':
            return t('身分服務暫時不可用，請稍後再試。');
        case 'harbor_auth_failed':
            return t('Harbor 登入已失效，請重新登入後再試。');
        default:
            return t('暫時無法完成，請稍後再試。');
    }
}

const TeamScheduleEditPage = ({navigation, route}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const headerHeight = useHeaderHeight();

    const eventId = route?.params?.eventId
        ? String(route.params.eventId)
        : '';
    const timezone = route?.params?.timezone || DEFAULT_TIMEZONE;
    const initialTitle = route?.params?.title || '';
    const initialDescription = route?.params?.description || '';
    const initialDeadlineIso = route?.params?.responseDeadlineAt || null;

    const [title, setTitle] = useState(initialTitle);
    const [description, setDescription] = useState(initialDescription);
    const [responseDeadlineAt, setResponseDeadlineAt] = useState(
        initialDeadlineIso,
    );
    const [deadlinePickerVisible, setDeadlinePickerVisible] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const submittingRef = useRef(false);
    const allowLeaveRef = useRef(false);

    const hasUnsavedChanges = useMemo(() => {
        const titleChanged = title.trim() !== String(initialTitle || '').trim();
        const descChanged =
            description.trim() !== String(initialDescription || '').trim();
        const deadlineChanged =
            (responseDeadlineAt || null) !== (initialDeadlineIso || null);
        return titleChanged || descChanged || deadlineChanged;
    }, [
        description,
        initialDeadlineIso,
        initialDescription,
        initialTitle,
        responseDeadlineAt,
        title,
    ]);

    useEffect(() => {
        navigation.setOptions({headerTitle: t('編輯基本資料')});
    }, [navigation, t]);

    usePreventRemove(hasUnsavedChanges, ({data}) => {
        if (allowLeaveRef.current) {
            navigation.dispatch(data.action);
            return;
        }
        Alert.alert(t('放棄編輯？'), t('目前的修改尚未儲存，確定要離開嗎？'), [
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
                    allowLeaveRef.current = true;
                    navigation.dispatch(data.action);
                },
            },
        ]);
    });

    const deadlineDisplay = useMemo(() => {
        if (!responseDeadlineAt) {
            return t('未設定');
        }
        const m = moment.tz(responseDeadlineAt, timezone);
        if (!m.isValid()) {
            return t('未設定');
        }
        return m.format('M/D HH:mm');
    }, [responseDeadlineAt, t, timezone]);

    const pickerDate = useMemo(() => {
        if (responseDeadlineAt) {
            const m = moment.tz(responseDeadlineAt, timezone);
            if (m.isValid()) {
                return m.toDate();
            }
        }
        return new Date();
    }, [responseDeadlineAt, timezone]);

    const handleSave = useCallback(async () => {
        trigger();
        if (submittingRef.current || !eventId) {
            return;
        }
        const trimmedTitle = title.trim();
        if (!trimmedTitle || trimmedTitle.length > TITLE_MAX) {
            Alert.alert(t('無法儲存'), t('請輸入 1 至 200 字的活動名稱。'));
            return;
        }
        if (description.length > DESCRIPTION_MAX) {
            Alert.alert(t('無法儲存'), t('說明最多 4000 字。'));
            return;
        }
        submittingRef.current = true;
        setIsSubmitting(true);
        try {
            const patch = {
                title: trimmedTitle,
                description: description.trim(),
                responseDeadlineAt: responseDeadlineAt || null,
            };
            const data = await updateTeamEvent(eventId, patch);
            logToFirebase('team_schedule_update', {
                has_deadline: responseDeadlineAt != null ? 1 : 0,
            });
            const nextEvent = data?.event || {
                eventId,
                ...patch,
                timezone,
            };
            clearTeamEventsCache();
            allowLeaveRef.current = true;
            trigger('success');
            navigation.navigate({
                name: 'TeamScheduleDetail',
                params: {
                    eventId,
                    editedBasics: nextEvent,
                },
                merge: true,
            });
        } catch (requestError) {
            trigger('error');
            const normalized = normalizeSchedulingError(requestError);
            Alert.alert(
                t('無法儲存'),
                errorMessageForCode(normalized.code, t),
            );
        } finally {
            submittingRef.current = false;
            setIsSubmitting(false);
        }
    }, [
        description,
        eventId,
        navigation,
        responseDeadlineAt,
        t,
        timezone,
        title,
    ]);

    return (
        <View style={[styles.container, {backgroundColor: theme.bg_color}]}>
            <KeyboardAwareScrollView
                bottomOffset={scale(50)}
                keyboardDismissMode="on-drag"
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={[
                    styles.content,
                    isLiquidGlassSupported && {
                        paddingTop: headerHeight + verticalScale(8),
                    },
                ]}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? undefined : 'automatic'
                }>
                <Text style={[styles.label, {color: theme.black.second}]}>
                    {t('活動名稱')}
                </Text>
                <TextInput
                    value={title}
                    onChangeText={setTitle}
                    placeholder={t('例如：COMP1000 小組會議')}
                    placeholderTextColor={theme.black.third}
                    maxLength={TITLE_MAX}
                    multiline
                    textAlignVertical="top"
                    style={[
                        styles.input,
                        styles.titleInput,
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
                        styles.descriptionInput,
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

                <Pressable
                    disabled={isSubmitting}
                    onPress={handleSave}
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
                            {t('儲存')}
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
                maximumDate={moment().add(EVENT_EXPIRY_DAYS, 'days').toDate()}
                onConfirm={date => {
                    trigger();
                    setDeadlinePickerVisible(false);
                    setResponseDeadlineAt(
                        wallClockDateToOffsetIso(date, timezone),
                    );
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
    titleInput: {
        // 固定高度，內容超出後由 TextInput 自身滾動（同 courseSim）
        height: verticalScale(72),
    },
    descriptionInput: {
        height: verticalScale(150),
    },
    counter: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(4),
        textAlign: 'right',
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

export default TeamScheduleEditPage;
