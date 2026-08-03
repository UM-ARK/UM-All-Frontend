/**
 * 組隊詳情頁首：標題、狀態、說明、候選日、截止、提交進度
 */
import React, {memo} from 'react';
import {StyleSheet, Text, View} from 'react-native';

import moment from 'moment-timezone';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {summarizeCandidateDates} from '../../../utils/scheduling/schedulingModels';

/**
 * @param {{kind: string, date?: string, startDate?: string, endDate?: string, dayCount?: number}} summary
 * @param {Function} t
 */
function formatCandidateSummary(summary, t) {
    if (!summary || summary.kind === 'empty') {
        return '';
    }
    if (summary.kind === 'single') {
        return moment(summary.date, 'YYYY-MM-DD').format('M月D日');
    }
    if (summary.kind === 'range') {
        const start = moment(summary.startDate, 'YYYY-MM-DD').format('M月D日');
        const end = moment(summary.endDate, 'YYYY-MM-DD').format('M月D日');
        return t('{{start}} 至 {{end}} · 共{{count}}天', {
            start,
            end,
            count: summary.dayCount,
        });
    }
    return '';
}

/**
 * @param {string|null|undefined} responseDeadlineAt
 * @param {string} timezone
 * @param {Function} t
 */
function formatDeadlineLine(responseDeadlineAt, timezone, t) {
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
    return t('回覆截止：{{time}}', {
        time: deadline.format('M月D日 HH:mm'),
    });
}

/**
 * @param {object} props
 * @param {object} props.event
 * @param {object|null} props.membership
 * @param {{submittedCount: number, memberCount: number}|null} props.stats
 * @param {string|null} [props.readOnlyReason]
 */
const TeamScheduleEventHeader = ({
    event,
    membership,
    stats,
    readOnlyReason,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const timezone = event?.timezone || 'Asia/Macau';
    const isOwner = membership?.role === 'owner';
    const isClosed = event?.status === 'closed';
    const isExpired =
        event?.expiresAt &&
        !moment.tz(event.expiresAt, timezone).isAfter(moment.tz(timezone));

    const candidateSummary = summarizeCandidateDates(
        event?.candidateWindows,
        timezone,
    );
    const dateLabel = formatCandidateSummary(candidateSummary, t);
    const deadlineLine = isClosed
        ? null
        : formatDeadlineLine(event?.responseDeadlineAt, timezone, t);

    let statusLabel = null;
    if (isExpired) {
        statusLabel = t('已過期');
    } else if (isClosed) {
        statusLabel = t('已關閉');
    }

    return (
        <View
            style={[
                styles.card,
                {
                    backgroundColor: theme.white,
                    borderColor: theme.themeColorUltraLight,
                },
            ]}>
            <View style={styles.metaRow}>
                <Text
                    numberOfLines={1}
                    style={[styles.role, {color: theme.themeColor}]}>
                    {isOwner ? t('我建立的') : t('我參加的')}
                </Text>
                {statusLabel ? (
                    <Text
                        numberOfLines={1}
                        style={[styles.status, {color: theme.black.third}]}>
                        {statusLabel}
                    </Text>
                ) : null}
            </View>
            <Text style={[styles.title, {color: theme.black.main}]}>
                {event?.title || t('未命名活動')}
            </Text>
            {event?.description ? (
                <Text style={[styles.description, {color: theme.black.second}]}>
                    {event.description}
                </Text>
            ) : null}
            {dateLabel ? (
                <Text style={[styles.metaLine, {color: theme.black.third}]}>
                    {t('候選日期')}：{dateLabel}
                </Text>
            ) : null}
            {deadlineLine ? (
                <Text style={[styles.metaLine, {color: theme.black.third}]}>
                    {deadlineLine}
                </Text>
            ) : null}
            {stats && stats.memberCount > 0 ? (
                <Text style={[styles.metaLine, {color: theme.black.third}]}>
                    {t('已提交 {{submitted}}／{{total}} 人', {
                        submitted: stats.submittedCount,
                        total: stats.memberCount,
                    })}
                </Text>
            ) : null}
            {readOnlyReason ? (
                <View
                    style={[
                        styles.reasonBox,
                        {backgroundColor: theme.tonal.primary08},
                    ]}>
                    <Text
                        style={[
                            styles.reasonText,
                            {color: theme.black.second},
                        ]}>
                        {readOnlyReason}
                    </Text>
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: scale(14),
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(12),
    },
    metaRow: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: verticalScale(6),
    },
    role: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
    status: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
    },
    description: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: verticalScale(20),
        marginTop: verticalScale(8),
    },
    metaLine: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        marginTop: verticalScale(6),
    },
    reasonBox: {
        borderRadius: scale(10),
        marginTop: verticalScale(10),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(8),
    },
    reasonText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
    },
});

export default memo(TeamScheduleEventHeader);
