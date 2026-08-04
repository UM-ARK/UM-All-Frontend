/**
 * 組隊約時間列表列：標題、候選星期摘要、角色、狀態／截止、chevron
 */
import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import moment from 'moment-timezone';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {trigger} from '../../../utils/trigger';

/**
 * 截止提示：已過→已截止填寫；未過→相對時間；無 deadline→不顯示
 * @param {string|null|undefined} responseDeadlineAt
 * @param {string} timezone
 * @param {(key: string, options?: object) => string} t
 * @returns {string|null}
 */
function formatDeadlineHint(responseDeadlineAt, timezone, t) {
    if (responseDeadlineAt == null || responseDeadlineAt === '') {
        return null;
    }
    const deadline = moment.tz(responseDeadlineAt, timezone);
    if (!deadline.isValid()) {
        return null;
    }
    const now = moment.tz(timezone);
    if (!deadline.isAfter(now)) {
        return t('已截止填寫');
    }

    const diffMs = deadline.diff(now);
    const minute = 60 * 1000;
    const hour = 60 * minute;
    const day = 24 * hour;
    if (diffMs < hour) {
        const count = Math.max(1, Math.round(diffMs / minute));
        return t('{{count}} 分鐘後截止', {count});
    }
    if (diffMs < day) {
        const count = Math.max(1, Math.round(diffMs / hour));
        return t('{{count}} 小時後截止', {count});
    }
    const count = Math.max(1, Math.round(diffMs / day));
    return t('{{count}} 日後截止', {count});
}

const TeamScheduleEventRow = ({
    item,
    onPress,
    showDivider = false,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const event = item?.event || {};
    const membership = item?.membership || {};
    const timezone = event.timezone || 'Asia/Macau';
    const isOwner = membership.role === 'owner';
    const isClosed = event.status === 'closed';
    const deadlineHint = isClosed
        ? null
        : formatDeadlineHint(event.responseDeadlineAt, timezone, t);
    const statusLabel = isClosed ? t('已關閉') : null;
    const roleLabel = isOwner ? t('我建立的') : t('我參加的');

    return (
        <Pressable
            accessibilityRole="button"
            accessibilityLabel={event.title || t('組隊約時間')}
            style={({pressed}) => [
                styles.container,
                pressed && {backgroundColor: theme.tonal.primary08},
            ]}
            onPress={() => {
                trigger();
                onPress?.(item);
            }}>
            <View style={styles.content}>
                <View style={styles.metaRow}>
                    <Text
                        numberOfLines={1}
                        style={[styles.meta, {color: theme.themeColor}]}>
                        {roleLabel}
                    </Text>
                    {statusLabel || deadlineHint ? (
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.status,
                                {
                                    color: isClosed
                                        ? theme.black.third
                                        : theme.unread || theme.black.third,
                                },
                            ]}>
                            {statusLabel || deadlineHint}
                        </Text>
                    ) : null}
                </View>
                <Text
                    numberOfLines={2}
                    style={[styles.title, {color: theme.black.main}]}>
                    {event.title || t('未命名活動')}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[styles.dateLine, {color: theme.black.third}]}>
                    {t('每週 24 小時')}
                </Text>
            </View>
            <Ionicons
                name="chevron-forward"
                size={scale(17)}
                color={theme.black.third}
            />
            {showDivider ? (
                <View
                    style={[
                        styles.divider,
                        {backgroundColor: theme.themeColorUltraLight},
                    ]}
                />
            ) : null}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(72),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(11),
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(8),
        marginBottom: verticalScale(3),
    },
    meta: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '700',
    },
    status: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '600',
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '650',
        lineHeight: verticalScale(18),
    },
    dateLine: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginTop: verticalScale(3),
    },
    divider: {
        position: 'absolute',
        right: scale(14),
        bottom: 0,
        left: scale(14),
        height: StyleSheet.hairlineWidth,
    },
});

export default TeamScheduleEventRow;
