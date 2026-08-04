/**
 * Owner 邀請管理 Sheet：分享、開啟／關閉、更換連結
 */
import React, {memo, useEffect, useRef, useState} from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    Share,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {useTranslation} from 'react-i18next';
import ActionSheet from 'react-native-actions-sheet';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {
    getInviteLink,
    rotateInviteLink,
    updateInviteLink,
} from '../../../utils/scheduling/schedulingApi';
import {normalizeSchedulingError} from '../../../utils/scheduling/schedulingErrors';
import {buildTeamInviteShareMessage} from '../../../utils/scheduling/teamInviteLink';
import {trigger} from '../../../utils/trigger';

/**
 * 從 invite API 回應取出 shareUrl／status（契約：{ inviteLink: { shareUrl, status, ... } }）
 * @param {object} data
 */
function pickInvitePayload(data) {
    const nested = data?.inviteLink || data;
    return {
        url: nested?.shareUrl || null,
        status: nested?.status || null,
    };
}

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {string} props.eventId
 * @param {string} [props.eventTitle]
 * @param {string} [props.eventStatus] active／closed；活動關閉時邀請操作不可用
 */
const InviteManagementSheet = ({
    visible,
    onClose,
    eventId,
    eventTitle = '',
    eventStatus = 'active',
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);
    const [loading, setLoading] = useState(false);
    const [busy, setBusy] = useState(false);
    const [inviteUrl, setInviteUrl] = useState(null);
    const [inviteStatus, setInviteStatus] = useState(null);
    const [errorMessage, setErrorMessage] = useState(null);

    // 活動關閉時邀請連結即使仍 open，也無法加入
    const eventClosed = eventStatus === 'closed';
    const actionsDisabled = busy || loading || eventClosed;

    useEffect(() => {
        if (visible) {
            sheetRef.current?.show();
            loadInvite();
        } else {
            sheetRef.current?.hide();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visible]);

    const loadInvite = async () => {
        if (!eventId) {
            return;
        }
        setLoading(true);
        setErrorMessage(null);
        try {
            const data = await getInviteLink(eventId);
            const picked = pickInvitePayload(data);
            setInviteUrl(picked.url);
            setInviteStatus(picked.status);
        } catch (requestError) {
            const normalized = normalizeSchedulingError(requestError);
            setErrorMessage(
                normalized.message || t('暫時無法完成，請稍後再試。'),
            );
        } finally {
            setLoading(false);
        }
    };

    const alertEventClosed = () => {
        Alert.alert(
            t('活動已關閉'),
            t('請先重新開啟活動後，再管理邀請連結。'),
        );
    };

    const handleShare = async () => {
        trigger();
        if (eventClosed) {
            alertEventClosed();
            return;
        }
        setBusy(true);
        try {
            let url = inviteUrl;
            if (!url) {
                const data = await getInviteLink(eventId);
                const picked = pickInvitePayload(data);
                url = picked.url;
                setInviteUrl(url);
                setInviteStatus(picked.status);
            }
            if (!url) {
                Alert.alert(t('無法分享'), t('暫時無法取得邀請連結。'));
                return;
            }
            const message = buildTeamInviteShareMessage({
                title: eventTitle,
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
        } finally {
            setBusy(false);
        }
    };

    const handleToggleStatus = async () => {
        trigger();
        if (eventClosed) {
            alertEventClosed();
            return;
        }
        const next = inviteStatus === 'open' ? 'closed' : 'open';
        const title =
            next === 'closed' ? t('關閉邀請？') : t('開啟邀請？');
        const message =
            next === 'closed'
                ? t('關閉後新成員無法加入，不影響現有成員。')
                : t('開啟後他人可透過邀請連結加入。');
        Alert.alert(title, message, [
            {text: t('取消'), style: 'cancel', onPress: () => trigger()},
            {
                text: t('確定'),
                onPress: async () => {
                    trigger();
                    setBusy(true);
                    try {
                        const data = await updateInviteLink(eventId, next);
                        const picked = pickInvitePayload(data);
                        setInviteStatus(picked.status || next);
                        if (picked.url) {
                            setInviteUrl(picked.url);
                        }
                    } catch (requestError) {
                        const normalized =
                            normalizeSchedulingError(requestError);
                        Alert.alert(
                            t('操作失敗'),
                            normalized.message ||
                                t('暫時無法完成，請稍後再試。'),
                        );
                    } finally {
                        setBusy(false);
                    }
                },
            },
        ]);
    };

    const handleRotate = () => {
        trigger();
        if (eventClosed) {
            alertEventClosed();
            return;
        }
        Alert.alert(
            t('更換邀請連結？'),
            t('舊連結會立即失效，已分享的連結將無法再使用。'),
            [
                {text: t('取消'), style: 'cancel', onPress: () => trigger()},
                {
                    text: t('更換連結'),
                    style: 'destructive',
                    onPress: async () => {
                        trigger();
                        setBusy(true);
                        try {
                            const data = await rotateInviteLink(eventId);
                            const picked = pickInvitePayload(data);
                            setInviteUrl(picked.url);
                            setInviteStatus(picked.status || inviteStatus);
                        } catch (requestError) {
                            const normalized =
                                normalizeSchedulingError(requestError);
                            Alert.alert(
                                t('操作失敗'),
                                normalized.message ||
                                    t('暫時無法完成，請稍後再試。'),
                            );
                        } finally {
                            setBusy(false);
                        }
                    },
                },
            ],
        );
    };

    const isOpen = inviteStatus === 'open';
    let statusLabel = t('邀請已關閉');
    if (eventClosed) {
        statusLabel = t('活動已關閉');
    } else if (isOpen) {
        statusLabel = t('邀請開放中');
    }

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            containerStyle={{
                backgroundColor: theme.bg_color,
                borderTopLeftRadius: scale(16),
                borderTopRightRadius: scale(16),
            }}
            onClose={() => onClose?.()}>
            <View
                style={[
                    styles.sheet,
                    {
                        paddingBottom:
                            verticalScale(24) +
                            Math.max(insets.bottom, verticalScale(8)),
                    },
                ]}>
                <Text style={[styles.title, {color: theme.black.main}]}>
                    {t('邀請管理')}
                </Text>
                <Text style={[styles.hint, {color: theme.black.third}]}>
                    {t('邀請連結僅影響新成員加入，不影響現有成員。')}
                </Text>
                {loading ? (
                    <ActivityIndicator
                        color={theme.themeColor}
                        style={styles.loader}
                    />
                ) : errorMessage ? (
                    <Text style={[styles.error, {color: theme.unread}]}>
                        {errorMessage}
                    </Text>
                ) : (
                    <>
                        <Text
                            style={[
                                styles.status,
                                {color: theme.black.second},
                            ]}>
                            {t('目前狀態')}：{statusLabel}
                        </Text>
                        {eventClosed ? (
                            <Text
                                style={[
                                    styles.eventClosedHint,
                                    {color: theme.black.third},
                                ]}>
                                {t(
                                    '活動關閉期間無法加入；請先重新開啟活動後再管理邀請。',
                                )}
                            </Text>
                        ) : null}
                    </>
                )}

                <Pressable
                    accessibilityRole="button"
                    disabled={actionsDisabled}
                    onPress={handleShare}
                    style={({pressed}) => [
                        styles.action,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary50
                                : theme.themeColor,
                            opacity: actionsDisabled ? 0.6 : 1,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.actionText,
                            {color: theme.trueWhite},
                        ]}>
                        {t('分享邀請')}
                    </Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    disabled={actionsDisabled || !inviteStatus}
                    onPress={handleToggleStatus}
                    style={({pressed}) => [
                        styles.action,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary30
                                : theme.tonal.primary15,
                            opacity:
                                actionsDisabled || !inviteStatus ? 0.6 : 1,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.actionText,
                            {color: theme.themeColor},
                        ]}>
                        {isOpen ? t('關閉邀請') : t('開啟邀請')}
                    </Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    disabled={actionsDisabled}
                    onPress={handleRotate}
                    style={({pressed}) => [
                        styles.action,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.unread30
                                : theme.tonal.unread15,
                            opacity: actionsDisabled ? 0.6 : 1,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.actionText,
                            {color: theme.unread || theme.themeColor},
                        ]}>
                        {t('更換邀請連結')}
                    </Text>
                </Pressable>

                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        sheetRef.current?.hide();
                    }}
                    style={({pressed}) => [
                        styles.cancel,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary15
                                : theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.actionText,
                            {color: theme.black.second},
                        ]}>
                        {t('關閉')}
                    </Text>
                </Pressable>
            </View>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    sheet: {
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(12),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '700',
    },
    hint: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginTop: verticalScale(6),
    },
    loader: {
        marginVertical: verticalScale(16),
    },
    error: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        marginTop: verticalScale(10),
    },
    status: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        marginTop: verticalScale(12),
        marginBottom: verticalScale(8),
    },
    eventClosedHint: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginBottom: verticalScale(8),
    },
    eventClosedHint: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginBottom: verticalScale(8),
    },
    action: {
        alignItems: 'center',
        borderRadius: scale(12),
        marginTop: verticalScale(8),
        paddingVertical: verticalScale(12),
    },
    cancel: {
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: verticalScale(8),
        paddingVertical: verticalScale(12),
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
});

export default memo(InviteManagementSheet);
