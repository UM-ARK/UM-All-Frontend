import React, {
    memo,
    useMemo,
} from 'react';
import {
    Pressable,
    Text,
    View,
} from 'react-native';

import moment from 'moment-timezone';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../../components/ThemeContext';
import { openLink } from '../../../../utils/browser';
import { trigger } from '../../../../utils/trigger';
import styles from './styles';

const formatEventMoment = (value, timezone) => {
    if (!value) {
        return null;
    }
    const parsed = timezone
        ? moment.tz(value, timezone)
        : moment.tz(value, 'Asia/Macau');
    return parsed.isValid() ? parsed : null;
};

const formatEventRange = (startsAt, endsAt, timezone, t) => {
    const start = formatEventMoment(startsAt, timezone);
    if (!start) {
        return '';
    }

    const end = formatEventMoment(endsAt, timezone);
    const startText = start.format('YYYY/MM/DD HH:mm');
    if (!end) {
        return startText;
    }

    const sameDay = start.isSame(end, 'day');
    const endText = sameDay
        ? end.format('HH:mm')
        : end.format('YYYY/MM/DD HH:mm');
    return t('{{start}} → {{end}}', { start: startText, end: endText });
};

const HarborPostEventCard = memo(({ event, postUrl }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const {
        black,
        success,
        themeColor,
        themeColorUltraLight,
        tonal,
        unread,
        white,
    } = theme;

    const startMoment = useMemo(
        () => formatEventMoment(event?.startsAt, event?.timezone),
        [event?.startsAt, event?.timezone],
    );

    const rangeText = useMemo(
        () =>
            formatEventRange(
                event?.startsAt,
                event?.endsAt,
                event?.timezone,
                t,
            ),
        [event?.endsAt, event?.startsAt, event?.timezone, t],
    );

    const statusLabel = useMemo(() => {
        if (event?.isClosed) {
            return t('已關閉');
        }
        if (event?.isExpired) {
            return t('已過期');
        }
        if (event?.isOngoing) {
            return t('進行中');
        }
        return '';
    }, [event?.isClosed, event?.isExpired, event?.isOngoing, t]);

    const statusColor = event?.isExpired || event?.isClosed ? unread : success;

    if (!event || (!event.name && !event.startsAt)) {
        return null;
    }

    return (
        <Pressable
            accessibilityRole="link"
            accessibilityLabel={event.name || t('活動')}
            onPress={() => {
                trigger();
                if (postUrl) {
                    openLink({ URL: postUrl, mode: 'fullScreen' });
                }
            }}
            style={({ pressed }) => [
                styles.eventCard,
                {
                    backgroundColor: pressed ? tonal.primary15 : white,
                    borderColor: themeColorUltraLight,
                },
            ]}>
            <View
                style={[
                    styles.eventDateBlock,
                    { backgroundColor: tonal.primary15 },
                ]}>
                <Text style={[styles.eventDateMonth, { color: themeColor }]}>
                    {startMoment ? startMoment.format('M月') : '—'}
                </Text>
                <Text style={[styles.eventDateDay, { color: themeColor }]}>
                    {startMoment ? startMoment.format('D') : '—'}
                </Text>
            </View>
            <View style={styles.eventBody}>
                <View style={styles.eventTitleRow}>
                    <Text
                        style={[styles.eventTitle, { color: black.main }]}
                        numberOfLines={2}>
                        {event.name || t('活動')}
                    </Text>
                    {statusLabel ? (
                        <Text
                            style={[
                                styles.eventStatus,
                                { color: statusColor },
                            ]}>
                            {statusLabel}
                        </Text>
                    ) : null}
                </View>
                {event.creatorUsername ? (
                    <Text
                        style={[styles.eventCreatorText, { color: black.third }]}
                        numberOfLines={1}>
                        {t('由 {{username}} 建立', {
                            username: event.creatorUsername,
                        })}
                    </Text>
                ) : null}
                {rangeText ? (
                    <View style={styles.eventMetaRow}>
                        <MaterialCommunityIcons
                            name="clock-outline"
                            size={scale(13)}
                            color={black.third}
                        />
                        <Text
                            style={[
                                styles.eventMetaText,
                                { color: black.second },
                            ]}
                            numberOfLines={2}>
                            {rangeText}
                        </Text>
                    </View>
                ) : null}
                {event.location ? (
                    <View style={styles.eventMetaRow}>
                        <MaterialCommunityIcons
                            name="map-marker-outline"
                            size={scale(13)}
                            color={black.third}
                        />
                        <Text
                            style={[
                                styles.eventMetaText,
                                { color: black.second },
                            ]}
                            numberOfLines={1}>
                            {event.location}
                        </Text>
                    </View>
                ) : null}
                <Text
                    style={[styles.eventGoingText, { color: black.third }]}
                    numberOfLines={1}>
                    {t('{{count}} going', { count: event.goingCount || 0 })}
                </Text>
            </View>
        </Pressable>
    );
});

export default HarborPostEventCard;
