/**
 * 組隊約時間列表列：標題、建立時間、角色、狀態／截止、chevron
 */
import React from 'react';
import {StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import moment from 'moment-timezone';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
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

/**
 * 建立時間：活動時區下的絕對時間；無效則不顯示
 * @param {string|null|undefined} createdAt
 * @param {string} timezone
 * @param {(key: string, options?: object) => string} t
 * @returns {string|null}
 */
function formatCreatedAt(createdAt, timezone, t) {
    if (createdAt == null || createdAt === '') {
        return null;
    }
    const created = moment.tz(createdAt, timezone);
    if (!created.isValid()) {
        return null;
    }
    // nsSeparator 為 ':'，格式字串含冒號時必須關閉，否則會被拆成 key「mm」只顯示分鐘
    return t('建立於 {{time}}', {
        time: created.format(t('M月D日 HH:mm', {nsSeparator: false})),
    });
}

const TeamScheduleEventRow = ({
    item,
    isFavorite = false,
    onPress,
    showDivider = false,
    compact = false,
    leadingAccessory,
    chevronContainerStyle,
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
    const createdAtLabel = formatCreatedAt(event.createdAt, timezone, t);
    const metaLabel = compact && createdAtLabel
        ? `${roleLabel} · ${createdAtLabel}`
        : roleLabel;
    const title = (
        <Text
            numberOfLines={2}
            style={[styles.title, {color: theme.black.main}]}>
            {event.title || t('未命名活動')}
        </Text>
    );

    return (
        <>
            <ScalePressable
                accessibilityRole="button"
                accessibilityLabel={event.title || t('組隊約時間')}
                style={[
                    styles.container,
                    compact && styles.compactContainer,
                ]}
                onPress={() => {
                    trigger();
                    onPress?.(item);
                }}>
                {leadingAccessory}
                <View style={[styles.content, compact && styles.compactContent]}>
                    {compact ? title : null}
                    <View style={[styles.metaRow, compact && styles.compactMetaRow]}>
                        <Text
                            numberOfLines={compact ? 2 : 1}
                            style={[
                                styles.meta,
                                compact && styles.compactMeta,
                                {color: compact ? theme.black.third : theme.black.second},
                            ]}>
                            {metaLabel}
                        </Text>
                        {statusLabel || deadlineHint ? (
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.status,
                                    {
                                        color: isClosed
                                            ? theme.black.third
                                            : theme.unreadForeground,
                                    },
                                ]}>
                                {statusLabel || deadlineHint}
                            </Text>
                        ) : null}
                    </View>
                    {compact ? null : title}
                    {!compact && createdAtLabel ? (
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.createdAt,
                                {color: theme.black.third},
                            ]}>
                            {createdAtLabel}
                        </Text>
                    ) : null}
                </View>
                <View style={styles.trailing}>
                    {isFavorite ? (
                        <Ionicons
                            name="star"
                            size={scale(17)}
                            color={theme.warning}
                        />
                    ) : null}
                    <View style={chevronContainerStyle}>
                        <Ionicons
                            name="chevron-forward"
                            size={scale(17)}
                            color={theme.black.third}
                        />
                    </View>
                </View>
            </ScalePressable>
            {showDivider ? (
                <View
                    style={[
                        styles.divider,
                        compact && styles.compactDivider,
                        {backgroundColor: theme.disabled},
                    ]}
                />
            ) : null}
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(10),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(8),
    },
    compactContainer: {
        minHeight: 44,
        paddingHorizontal: 0,
        gap: 0,
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    compactContent: {
        paddingEnd: scale(8),
    },
    trailing: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(7),
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(8),
        marginBottom: verticalScale(3),
    },
    compactMetaRow: {
        marginBottom: 0,
        marginTop: verticalScale(2),
    },
    meta: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '700',
    },
    compactMeta: {
        fontWeight: '400',
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
    createdAt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(15),
        marginTop: verticalScale(2),
    },
    // 與 HarborTopicDetail topicHeaderDivider 一致：內縮髮絲線
    divider: {
        height: StyleSheet.hairlineWidth,
        marginHorizontal: scale(16),
    },
    compactDivider: {
        marginHorizontal: 0,
    },
});

export default TeamScheduleEventRow;
