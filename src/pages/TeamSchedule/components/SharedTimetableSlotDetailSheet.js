/**
 * 小組課表總覽：固定時段內正在上課的成員與實際課堂明細。
 */
import React, {memo, useEffect, useMemo, useRef} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import ActionSheet, {ScrollView} from 'react-native-actions-sheet';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';
import {
    formatMinuteOfDay,
    getWeekdayShortLabel,
} from './scheduleWeekHelpers';

function meetingLabel(meeting) {
    const courseCode = meeting?.identity?.courseCode;
    if (courseCode) {
        const section = meeting.identity.section;
        return section ? `${courseCode} · ${section}` : courseCode;
    }
    return `${formatMinuteOfDay(meeting.startMinute)} – ${formatMinuteOfDay(meeting.endMinute)}`;
}

const SharedTimetableSlotDetailSheet = ({
    visible,
    slot,
    onClose,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);

    useEffect(() => {
        if (visible) {
            sheetRef.current?.show();
        } else {
            sheetRef.current?.hide();
        }
    }, [visible]);

    const entries = useMemo(
        () =>
            (Array.isArray(slot?.memberEntries) ? slot.memberEntries : []).map(
                entry => ({
                    ...entry,
                    labels: Array.from(
                        new Set(
                            (Array.isArray(entry.meetings)
                                ? entry.meetings
                                : []
                            ).map(meetingLabel),
                        ),
                    ),
                }),
            ),
        [slot],
    );
    const weekdayLabel = getWeekdayShortLabel(slot?.weekday, t);

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
                            verticalScale(20) +
                            Math.max(insets.bottom, verticalScale(8)),
                    },
                ]}>
                <Text style={[styles.title, {color: theme.black.main}]}>
                    {t('正在上課')}
                </Text>
                {slot ? (
                    <>
                        <Text
                            style={[
                                styles.timeLine,
                                {color: theme.black.second},
                            ]}>
                            {weekdayLabel
                                ? `${weekdayLabel} · `
                                : ''}
                            {formatMinuteOfDay(slot.startMinute)} –{' '}
                            {formatMinuteOfDay(slot.endMinute)}
                        </Text>
                        <Text
                            style={[
                                styles.countLine,
                                {color: theme.themeColor},
                            ]}>
                            {t('{{count}} 人正在上課', {
                                count: entries.length,
                            })}
                        </Text>
                        <ScrollView style={styles.memberList}>
                            {entries.map((entry, index) => {
                                const member = entry.member || {};
                                const name = member.username || t('成員');
                                const avatarUri = member.avatarTemplate
                                    ? ARK_HARBOR_AVATAR_TEMPLATE(
                                          member.avatarTemplate,
                                          72,
                                      )
                                    : null;
                                return (
                                    <View
                                        key={String(
                                            member.harborUserId ??
                                                member.username ??
                                                index,
                                        )}
                                        style={[
                                            styles.memberRow,
                                            {
                                                borderBottomColor:
                                                    theme.themeColorUltraLight,
                                            },
                                        ]}>
                                        {avatarUri ? (
                                            <Image
                                                source={{uri: avatarUri}}
                                                style={styles.avatar}
                                            />
                                        ) : (
                                            <View
                                                style={[
                                                    styles.avatar,
                                                    {
                                                        backgroundColor:
                                                            theme.tonal.primary15,
                                                    },
                                                ]}
                                            />
                                        )}
                                        <View style={styles.memberContent}>
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.memberName,
                                                    {color: theme.black.main},
                                                ]}>
                                                {name}
                                            </Text>
                                            {entry.labels.map(label => (
                                                <Text
                                                    key={label}
                                                    style={[
                                                        styles.meetingDetail,
                                                        {
                                                            color: theme.black
                                                                .third,
                                                        },
                                                    ]}>
                                                    {label}
                                                </Text>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </>
                ) : null}
                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        sheetRef.current?.hide();
                    }}
                    style={({pressed}) => [
                        styles.closeButton,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary30
                                : theme.tonal.primary15,
                        },
                    ]}>
                    <Text
                        style={[
                            styles.closeText,
                            {color: theme.themeColor},
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
    timeLine: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        marginTop: verticalScale(8),
    },
    countLine: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
        marginTop: verticalScale(6),
    },
    memberList: {
        marginTop: verticalScale(10),
        maxHeight: verticalScale(360),
    },
    memberRow: {
        alignItems: 'flex-start',
        borderBottomWidth: StyleSheet.hairlineWidth,
        flexDirection: 'row',
        paddingVertical: verticalScale(9),
    },
    avatar: {
        borderRadius: scale(18),
        height: scale(36),
        width: scale(36),
    },
    memberContent: {
        flex: 1,
        marginLeft: scale(10),
    },
    memberName: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    meetingDetail: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(17),
        marginTop: verticalScale(2),
    },
    closeButton: {
        alignItems: 'center',
        borderRadius: scale(12),
        marginTop: verticalScale(12),
        paddingVertical: verticalScale(12),
    },
    closeText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
});

export default memo(SharedTimetableSlotDetailSheet);
