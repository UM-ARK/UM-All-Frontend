/**
 * 本人共享與管理課表的明確確認 Sheet。
 */
import React, {memo, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Alert, Pressable, StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import ActionSheet from 'react-native-actions-sheet';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {logToFirebase} from '../../../utils/firebaseAnalytics';
import {trigger} from '../../../utils/trigger';
import {buildSharedTimetablePayload} from '../utils/sharedTimetable';

const SharedTimetableSheet = ({
    visible,
    onClose,
    eventStatus,
    serverSnapshot,
    onLoadLocal,
    onSave,
    onStop,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);
    const [sharingLevel, setSharingLevel] = useState('time_only');
    const [local, setLocal] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loadError, setLoadError] = useState(null);

    useEffect(() => {
        if (visible) {
            sheetRef.current?.show();
        } else {
            sheetRef.current?.hide();
        }
    }, [visible]);

    useEffect(() => {
        if (!visible) {
            return;
        }
        let cancelled = false;
        setSharingLevel(serverSnapshot?.sharingLevel || 'time_only');
        setLocal(null);
        setLoadError(null);
        setLoading(true);
        Promise.resolve(onLoadLocal?.())
            .then(value => {
                if (!cancelled) {
                    setLocal(value || null);
                }
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError(t('無法讀取本機課程資料。'));
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [onLoadLocal, serverSnapshot, t, visible]);

    const payload = useMemo(
        () => buildSharedTimetablePayload({
            sharingLevel,
            planList: local?.planList,
            planSlots: local?.planSlots,
            revision: serverSnapshot?.revision || 0,
        }),
        [local, serverSnapshot?.revision, sharingLevel],
    );
    const canSave =
        eventStatus === 'active' &&
        local?.hasPlan &&
        !loading &&
        !saving;
    const timePreview = payload.busyRanges
        ?.map(item => {
            const formatMinute = minute => {
                const hours = Math.floor(minute / 60);
                const minutes = minute % 60;
                return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
            };
            return `週${item.weekday} ${formatMinute(item.startMinute)}–${formatMinute(item.endMinute)}`;
        })
        .join('\n');

    const handleSave = async () => {
        trigger();
        if (!canSave) {
            return;
        }
        setSaving(true);
        try {
            const result = await onSave?.(payload);
            if (result?.conflict) {
                Alert.alert(
                    t('另一部裝置已更新你的課表'),
                    t('已載入伺服器最新版本，請重新確認要共享的內容。'),
                );
                return;
            }
            logToFirebase('team_timetable_share', {
                sharing_level: sharingLevel,
                is_update: serverSnapshot != null ? 1 : 0,
            });
            sheetRef.current?.hide();
        } catch (error) {
            Alert.alert(
                t('操作失敗'),
                error?.message || t('暫時無法完成，請稍後再試。'),
            );
        } finally {
            setSaving(false);
        }
    };

    const handleStop = () => {
        trigger();
        Alert.alert(
            t('停止共享課表？'),
            t('此組隊的成員將無法再查看你的課表。'),
            [
                {text: t('取消'), style: 'cancel', onPress: () => trigger()},
                {
                    text: t('停止共享'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        setSaving(true);
                        try {
                            await onStop?.();
                            logToFirebase('team_timetable_stop', {});
                            sheetRef.current?.hide();
                        } catch (error) {
                            Alert.alert(
                                t('操作失敗'),
                                error?.message || t('暫時無法完成，請稍後再試。'),
                            );
                        } finally {
                            setSaving(false);
                        }
                    },
                },
            ],
        );
    };

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled={!saving}
            containerStyle={{
                backgroundColor: theme.bg_color,
                borderTopLeftRadius: scale(16),
                borderTopRightRadius: scale(16),
            }}
            onClose={() => onClose?.()}>
            <View style={[styles.sheet, {paddingBottom: Math.max(insets.bottom, verticalScale(16))}]}> 
                <Text style={[styles.title, {color: theme.black.main}]}> 
                    {serverSnapshot ? t('管理共享課表') : t('共享我的課表')}
                </Text>
                <Text style={[styles.hint, {color: theme.black.third}]}> 
                    {t('只會向此組隊的成員顯示；可隨時停止共享。')}
                </Text>
                <Text style={[styles.hint, {color: theme.black.third}]}>
                    {t('每個組隊的共享內容彼此獨立。本機課表變更後不會自動更新此組隊，需再次點擊「確定更新」。')}
                </Text>
                {loading ? <ActivityIndicator color={theme.themeColor} /> : null}
                {loadError ? <Text style={[styles.error, {color: theme.unread}]}>{loadError}</Text> : null}
                {!loading && !loadError && !local?.hasPlan ? (
                    <Text style={[styles.error, {color: theme.black.second}]}>{t('尚未建立模擬課表')}</Text>
                ) : null}
                <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{selected: sharingLevel === 'time_only'}}
                    disabled={eventStatus !== 'active' || saving}
                    onPress={() => {
                        trigger();
                        setSharingLevel('time_only');
                    }}
                    style={({pressed}) => [styles.option, {backgroundColor: sharingLevel === 'time_only' ? theme.tonal.primary15 : pressed ? theme.tonal.primary08 : theme.white, borderColor: theme.themeColorUltraLight}]}> 
                    <Text style={[styles.optionTitle, {color: theme.black.main}]}>{t('只共享上課時間')}</Text>
                    <Text style={[styles.optionHint, {color: theme.black.third}]}>{t('組員只會看到上課與時間。')}</Text>
                </Pressable>
                <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{selected: sharingLevel === 'course_identity'}}
                    disabled={eventStatus !== 'active' || saving}
                    onPress={() => {
                        trigger();
                        setSharingLevel('course_identity');
                    }}
                    style={({pressed}) => [styles.option, {backgroundColor: sharingLevel === 'course_identity' ? theme.tonal.primary15 : pressed ? theme.tonal.primary08 : theme.white, borderColor: theme.themeColorUltraLight}]}> 
                    <Text style={[styles.optionTitle, {color: theme.black.main}]}>{t('共享 Course Code + Section')}</Text>
                    <Text style={[styles.optionHint, {color: theme.black.third}]}>{t('組員會看到 Course Code、Section 與可還原的上課時間。')}</Text>
                </Pressable>
                {local?.hasPlan ? <Text style={[styles.preview, {color: theme.black.second}]}>{sharingLevel === 'course_identity' ? payload.courses.map(item => `${item.courseCode} · ${item.section}`).join('\n') : timePreview}</Text> : null}
                {serverSnapshot ? <Pressable accessibilityRole="button" disabled={saving} onPress={handleStop} style={({pressed}) => [styles.stop, {backgroundColor: pressed ? theme.tonal.unread30 : theme.tonal.unread15}]}><Text style={[styles.actionText, {color: theme.unread}]}>{t('停止共享')}</Text></Pressable> : null}
                {eventStatus === 'active' ? <Pressable accessibilityRole="button" disabled={!canSave} onPress={handleSave} style={({pressed}) => [styles.action, {backgroundColor: pressed ? theme.tonal.primary50 : theme.themeColor, opacity: canSave ? 1 : 0.5}]}><Text style={[styles.actionText, {color: theme.trueWhite}]}>{serverSnapshot ? t('確定更新') : t('確定共享')}</Text></Pressable> : <Text style={[styles.closedHint, {color: theme.black.third}]}>{t('活動已關閉，不能新增或更新共享課表。')}</Text>}
                <Pressable accessibilityRole="button" disabled={saving} onPress={() => { trigger(); sheetRef.current?.hide(); }} style={({pressed}) => [styles.cancel, {backgroundColor: pressed ? theme.tonal.primary15 : theme.white, borderColor: theme.themeColorUltraLight}]}><Text style={[styles.actionText, {color: theme.themeColor}]}>{t('取消')}</Text></Pressable>
            </View>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    sheet: {paddingHorizontal: scale(18), paddingTop: verticalScale(18)},
    title: {...uiStyle.defaultText, fontSize: scale(18), fontWeight: '700'},
    hint: {...uiStyle.defaultText, fontSize: scale(12), lineHeight: verticalScale(18), marginTop: verticalScale(6)},
    option: {borderRadius: scale(10), borderWidth: StyleSheet.hairlineWidth, marginTop: verticalScale(12), paddingHorizontal: scale(12), paddingVertical: verticalScale(10)},
    optionTitle: {...uiStyle.defaultText, fontSize: scale(14), fontWeight: '700'},
    optionHint: {...uiStyle.defaultText, fontSize: scale(11), lineHeight: verticalScale(16), marginTop: verticalScale(3)},
    preview: {...uiStyle.defaultText, fontSize: scale(11), lineHeight: verticalScale(17), marginTop: verticalScale(12)},
    error: {...uiStyle.defaultText, fontSize: scale(12), marginTop: verticalScale(12)},
    action: {alignItems: 'center', borderRadius: scale(10), marginTop: verticalScale(14), paddingVertical: verticalScale(11)},
    stop: {alignItems: 'center', borderRadius: scale(10), marginTop: verticalScale(14), paddingVertical: verticalScale(11)},
    cancel: {alignItems: 'center', borderRadius: scale(10), borderWidth: StyleSheet.hairlineWidth, marginTop: verticalScale(10), paddingVertical: verticalScale(11)},
    actionText: {...uiStyle.defaultText, fontSize: scale(13), fontWeight: '700'},
    closedHint: {...uiStyle.defaultText, fontSize: scale(12), marginTop: verticalScale(14), textAlign: 'center'},
});

export default memo(SharedTimetableSheet);
