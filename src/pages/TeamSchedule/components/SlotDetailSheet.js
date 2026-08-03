/**
 * 時段詳情 Sheet：可出席人數、未提交、有空成員
 */
import React, {memo, useMemo, useRef, useEffect} from 'react';
import {Image, Pressable, StyleSheet, Text, View} from 'react-native';

import moment from 'moment-timezone';
import {useTranslation} from 'react-i18next';
import ActionSheet, {ScrollView} from 'react-native-actions-sheet';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../../utils/pathMap';
import {
    isAvailabilitySubmitted,
    normalizeAvailability,
    rangeCoversSlot,
} from '../../../utils/scheduling/schedulingModels';
import {trigger} from '../../../utils/trigger';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {object|null} props.slot heatmap slot
 * @param {Array} props.members
 * @param {string} props.timezone
 * @param {string|number|null} [props.myHarborUserId]
 */
const SlotDetailSheet = ({
    visible,
    onClose,
    slot,
    members = [],
    timezone = 'Asia/Macau',
    myHarborUserId = null,
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

    const info = useMemo(() => {
        if (!slot) {
            return null;
        }
        const start = moment.tz(slot.startAt, timezone);
        const end = moment.tz(slot.endAt, timezone);
        const freeMembers = Array.isArray(slot.freeMembers)
            ? slot.freeMembers
            : [];
        const freeIds = new Set(
            freeMembers.map(m => String(m.harborUserId)),
        );

        let unsubmittedCount = 0;
        let myStatus = 'unknown';
        const list = Array.isArray(members) ? members : [];

        for (let i = 0; i < list.length; i++) {
            const member = list[i];
            const availability = normalizeAvailability(
                member.availability,
                timezone,
            );
            const isMe =
                myHarborUserId != null &&
                String(member.harborUserId) === String(myHarborUserId);

            if (!isAvailabilitySubmitted(availability)) {
                unsubmittedCount += 1;
                if (isMe) {
                    myStatus = 'unsubmitted';
                }
                continue;
            }
            const covered = availability.ranges.some(range =>
                rangeCoversSlot(range, slot),
            );
            if (isMe) {
                myStatus = covered ? 'free' : 'busy';
            }
        }

        return {
            dateLabel: start.format('M月D日'),
            timeLabel: `${start.format('HH:mm')} – ${end.format('HH:mm')}`,
            availableCount: slot.availableCount ?? freeMembers.length,
            memberCount: slot.memberCount ?? list.length,
            freeMembers,
            freeIds,
            unsubmittedCount,
            myStatus,
        };
    }, [members, myHarborUserId, slot, timezone]);

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            containerStyle={{
                backgroundColor: theme.bg_color,
                borderTopLeftRadius: scale(16),
                borderTopRightRadius: scale(16),
            }}
            onClose={() => {
                onClose?.();
            }}>
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
                    {t('時段詳情')}
                </Text>
                {info ? (
                    <>
                        <Text
                            style={[
                                styles.timeLine,
                                {color: theme.black.second},
                            ]}>
                            {info.dateLabel} · {info.timeLabel}
                        </Text>
                        <Text
                            style={[
                                styles.countLine,
                                {color: theme.themeColor},
                            ]}>
                            {info.unsubmittedCount > 0
                                ? t(
                                      '{{available}}／{{total}} 人可出席 · {{unsubmitted}} 人未提交',
                                      {
                                          available: info.availableCount,
                                          total: info.memberCount,
                                          unsubmitted: info.unsubmittedCount,
                                      },
                                  )
                                : t('{{available}}／{{total}} 人可出席', {
                                      available: info.availableCount,
                                      total: info.memberCount,
                                  })}
                        </Text>
                        {info.myStatus === 'unsubmitted' ? (
                            <Text
                                style={[
                                    styles.hint,
                                    {color: theme.black.third},
                                ]}>
                                {t('你尚未提交此時段的可用時間')}
                            </Text>
                        ) : info.myStatus === 'busy' ? (
                            <Text
                                style={[
                                    styles.hint,
                                    {color: theme.black.third},
                                ]}>
                                {t('你在此時段標記為沒空')}
                            </Text>
                        ) : info.myStatus === 'free' ? (
                            <Text
                                style={[
                                    styles.hint,
                                    {color: theme.black.third},
                                ]}>
                                {t('你在此時段有空')}
                            </Text>
                        ) : null}
                        <Text
                            style={[
                                styles.sectionTitle,
                                {color: theme.black.main},
                            ]}>
                            {t('有空成員')}
                        </Text>
                        <ScrollView style={styles.memberList}>
                            {info.freeMembers.length === 0 ? (
                                <Text
                                    style={[
                                        styles.empty,
                                        {color: theme.black.third},
                                    ]}>
                                    {info.unsubmittedCount === info.memberCount
                                        ? t('尚未有可用時間資料')
                                        : t('此時段尚無人有空')}
                                </Text>
                            ) : (
                                info.freeMembers.map(member => {
                                    const name =
                                        member.displayName ||
                                        member.username ||
                                        t('成員');
                                    const avatarUri = member.avatarTemplate
                                        ? ARK_HARBOR_AVATAR_TEMPLATE(
                                              member.avatarTemplate,
                                              72,
                                          )
                                        : null;
                                    return (
                                        <View
                                            key={String(member.harborUserId)}
                                            style={styles.memberRow}>
                                            {avatarUri ? (
                                                <Image
                                                    source={{uri: avatarUri}}
                                                    style={styles.avatar}
                                                />
                                            ) : (
                                                <View
                                                    style={[
                                                        styles.avatar,
                                                        styles.avatarFallback,
                                                        {
                                                            backgroundColor:
                                                                theme.tonal
                                                                    .primary15,
                                                        },
                                                    ]}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.memberName,
                                                    {
                                                        color: theme.black
                                                            .main,
                                                    },
                                                ]}
                                                numberOfLines={1}>
                                                {name}
                                            </Text>
                                        </View>
                                    );
                                })
                            )}
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
                        styles.closeBtn,
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
    hint: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        marginTop: verticalScale(4),
    },
    sectionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
        marginTop: verticalScale(14),
        marginBottom: verticalScale(6),
    },
    memberList: {
        maxHeight: verticalScale(180),
    },
    empty: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
    },
    memberRow: {
        alignItems: 'center',
        flexDirection: 'row',
        marginBottom: verticalScale(8),
    },
    avatar: {
        borderRadius: scale(14),
        height: scale(28),
        width: scale(28),
    },
    avatarFallback: {},
    memberName: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
        marginLeft: scale(10),
    },
    closeBtn: {
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

export default memo(SlotDetailSheet);
