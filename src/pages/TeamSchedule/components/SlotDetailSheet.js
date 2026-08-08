/**
 * 時段詳情 Sheet：可出席人數、未提交、有空成員
 */
import React, {memo, useMemo, useRef, useEffect} from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Image} from 'expo-image';
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
import {
    meetingOverlapsSlot,
    resolveSharedTimetableMeetings,
} from '../utils/sharedTimetable';
import {
    formatMinuteOfDay,
    getWeekdayShortLabel,
} from './scheduleWeekHelpers';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {object|null} props.slot heatmap slot
 * @param {Array} [props.slots] 同一天合併後的 heatmap slots
 * @param {Array} props.members
 * @param {string} props.timezone
 * @param {string|number|null} [props.myHarborUserId]
 * @param {Array|null} [props.sharedTimetableMembers]
 * @param {Array} [props.courseSlots]
 * @param {(username: string) => void} [props.onMemberPress]
 */
const SlotDetailSheet = ({
    visible,
    onClose,
    slot,
    slots = [],
    members = [],
    timezone = 'Asia/Macau',
    myHarborUserId = null,
    sharedTimetableMembers = null,
    courseSlots = [],
    onMemberPress,
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
        const detailSlot = slot.representativeSlot || slot;
        const weekdayLabel = getWeekdayShortLabel(detailSlot.weekday, t);
        const freeMembers = Array.isArray(detailSlot.freeMembers)
            ? detailSlot.freeMembers
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
                rangeCoversSlot(range, detailSlot),
            );
            if (isMe) {
                myStatus = covered ? 'free' : 'busy';
            }
        }

        const sharedGroups = Array.isArray(sharedTimetableMembers)
            ? {
                  free: [],
                  inClass: [],
                  busyOther: [],
                  unsubmitted: [],
              }
            : null;
        if (sharedGroups) {
            sharedTimetableMembers.forEach(sharedMember => {
                const member = list.find(item =>
                    String(item?.harborUserId) ===
                    String(sharedMember?.harborUserId),
                ) || sharedMember;
                const availability = normalizeAvailability(
                    member?.availability,
                    timezone,
                );
                if (!isAvailabilitySubmitted(availability)) {
                    sharedGroups.unsubmitted.push(member);
                    return;
                }
                const isFree = availability.ranges.some(range =>
                    rangeCoversSlot(range, detailSlot),
                );
                const {meetings} = resolveSharedTimetableMeetings(
                    sharedMember?.sharedTimetable,
                    courseSlots,
                );
                const hasClass = meetings.some(meeting =>
                    meetingOverlapsSlot(meeting, detailSlot),
                );
                if (isFree) {
                    sharedGroups.free.push({...member, hasClass});
                } else if (hasClass) {
                    sharedGroups.inClass.push(member);
                } else {
                    sharedGroups.busyOther.push(member);
                }
            });
        }

        return {
            weekdayLabel,
            timeLabel: `${formatMinuteOfDay(detailSlot.startMinute)} – ${formatMinuteOfDay(detailSlot.endMinute)}`,
            availableCount:
                detailSlot.availableCount ?? freeMembers.length,
            memberCount: detailSlot.memberCount ?? list.length,
            freeMembers,
            freeIds,
            unsubmittedCount,
            myStatus,
            sharedGroups,
        };
    }, [
        courseSlots,
        members,
        myHarborUserId,
        sharedTimetableMembers,
        slot,
        t,
        timezone,
    ]);

    const dayInfo = useMemo(() => {
        if (!slot || !Array.isArray(slots) || slots.length === 0) {
            return null;
        }
        return {
            weekdayLabel: getWeekdayShortLabel(slot.weekday, t),
            submittedCount: slots[0].submittedCount ?? 0,
            memberCount: slots[0].memberCount ?? 0,
            slots,
        };
    }, [slot, slots, t]);

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
                    {dayInfo
                        ? t('{{weekday}}空檔統計', {
                              weekday: dayInfo.weekdayLabel,
                          })
                        : t('時段詳情')}
                </Text>
                {dayInfo ? (
                    <>
                        <Text
                            style={[
                                styles.timeLine,
                                {color: theme.black.second},
                            ]}>
                            {t('已提交 {{submitted}}／{{total}} 人', {
                                submitted: dayInfo.submittedCount,
                                total: dayInfo.memberCount,
                            })}
                        </Text>
                        <ScrollView
                            nestedScrollEnabled
                            showsVerticalScrollIndicator
                            style={styles.dayList}>
                            {dayInfo.slots.map(daySlot => {
                                const freeMembers = Array.isArray(
                                    daySlot.freeMembers,
                                )
                                    ? daySlot.freeMembers
                                    : [];
                                return (
                                    <View
                                        key={`${daySlot.weekday}:${daySlot.startMinute}`}
                                        style={[
                                            styles.daySlotRow,
                                            {
                                                borderBottomColor:
                                                    theme.tonal.primary15,
                                            },
                                        ]}>
                                        <View style={styles.daySlotHeader}>
                                            <Text
                                                style={[
                                                    styles.daySlotTime,
                                                    {color: theme.black.main},
                                                ]}>
                                                {formatMinuteOfDay(
                                                    daySlot.startMinute,
                                                )}{' '}
                                                –{' '}
                                                {formatMinuteOfDay(
                                                    daySlot.endMinute,
                                                )}
                                            </Text>
                                            <Text
                                                style={[
                                                    styles.daySlotCount,
                                                    {color: theme.themeColor},
                                                ]}>
                                                {t(
                                                    '{{available}}／{{total}} 人可出席',
                                                    {
                                                        available:
                                                            daySlot.availableCount,
                                                        total:
                                                            daySlot.memberCount,
                                                    },
                                                )}
                                            </Text>
                                        </View>
                                        {freeMembers.length > 0 ? (
                                            <View
                                                style={styles.dayMemberList}>
                                                {freeMembers.map(member => {
                                                    const name =
                                                        member.username ||
                                                        t('成員');
                                                    const avatarUri =
                                                        member.avatarTemplate
                                                            ? ARK_HARBOR_AVATAR_TEMPLATE(
                                                                  member.avatarTemplate,
                                                                  48,
                                                              )
                                                            : null;
                                                    const canOpenProfile =
                                                        Boolean(
                                                            onMemberPress &&
                                                                member.username,
                                                        );
                                                    return (
                                                        <Pressable
                                                            key={String(
                                                                member.harborUserId ??
                                                                    member.username,
                                                            )}
                                                            accessibilityRole="link"
                                                            accessibilityLabel={
                                                                name
                                                            }
                                                            disabled={
                                                                !canOpenProfile
                                                            }
                                                            onPress={() => {
                                                                trigger();
                                                                onMemberPress(
                                                                    member.username,
                                                                );
                                                            }}
                                                            style={({pressed}) => [
                                                                styles.dayMember,
                                                                pressed &&
                                                                    canOpenProfile && {
                                                                        opacity: 0.7,
                                                                    },
                                                            ]}>
                                                            {avatarUri ? (
                                                                <Image
                                                                    source={{
                                                                        uri: avatarUri,
                                                                    }}
                                                                    style={
                                                                        styles.dayMemberAvatar
                                                                    }
                                                                />
                                                            ) : (
                                                                <View
                                                                    style={[
                                                                        styles.dayMemberAvatar,
                                                                        {
                                                                            backgroundColor:
                                                                                theme
                                                                                    .tonal
                                                                                    .primary15,
                                                                        },
                                                                    ]}
                                                                />
                                                            )}
                                                            <Text
                                                                style={[
                                                                    styles.dayMemberName,
                                                                    {
                                                                        color: theme
                                                                            .black
                                                                            .third,
                                                                    },
                                                                ]}
                                                                numberOfLines={
                                                                    1
                                                                }>
                                                                {name}
                                                            </Text>
                                                        </Pressable>
                                                    );
                                                })}
                                            </View>
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.daySlotEmpty,
                                                    {color: theme.black.third},
                                                ]}>
                                                {t('此時段尚無人有空')}
                                            </Text>
                                        )}
                                    </View>
                                );
                            })}
                        </ScrollView>
                    </>
                ) : info ? (
                    <>
                        <Text
                            style={[
                                styles.timeLine,
                                {color: theme.black.second},
                            ]}>
                            {info.weekdayLabel} · {info.timeLabel}
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
                            {(info.sharedGroups?.free || info.freeMembers)
                                .length === 0 ? (
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
                                (info.sharedGroups?.free || info.freeMembers).map(member => {
                                    const name =
                                        member.username || t('成員');
                                    const avatarUri = member.avatarTemplate
                                        ? ARK_HARBOR_AVATAR_TEMPLATE(
                                              member.avatarTemplate,
                                              72,
                                          )
                                        : null;
                                    const canOpenProfile = Boolean(
                                        onMemberPress && member.username,
                                    );
                                    return (
                                        <View
                                            key={String(member.harborUserId)}
                                            style={styles.memberRow}>
                                            <Pressable
                                                accessibilityRole="link"
                                                accessibilityLabel={name}
                                                disabled={!canOpenProfile}
                                                onPress={() => {
                                                    trigger();
                                                    onMemberPress(
                                                        member.username,
                                                    );
                                                }}
                                                style={({pressed}) => [
                                                    pressed &&
                                                        canOpenProfile && {
                                                            opacity: 0.7,
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
                                                            styles.avatarFallback,
                                                            {
                                                                backgroundColor:
                                                                    theme.tonal
                                                                        .primary15,
                                                            },
                                                        ]}
                                                    />
                                                )}
                                            </Pressable>
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
                                            {member.hasClass ? (
                                                <Text
                                                    style={[
                                                        styles.classBadge,
                                                        {
                                                            color: theme.black
                                                                .third,
                                                        },
                                                    ]}>
                                                    {t('課表有課')}
                                                </Text>
                                            ) : null}
                                        </View>
                                    );
                                })
                            )}
                        </ScrollView>
                        {info.sharedGroups ? (
                            <>
                                <MemberGroup
                                    members={info.sharedGroups.inClass}
                                    title={t('上課中')}
                                />
                                <MemberGroup
                                    members={info.sharedGroups.busyOther}
                                    title={t('其他原因沒空')}
                                />
                                <MemberGroup
                                    members={info.sharedGroups.unsubmitted}
                                    title={t('未提交')}
                                />
                            </>
                        ) : null}
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

const MemberGroup = ({members, title}) => {
    const {theme} = useTheme();
    if (!Array.isArray(members) || members.length === 0) {
        return null;
    }
    return (
        <View style={styles.statusGroup}>
            <Text style={[styles.statusTitle, {color: theme.black.second}]}>
                {title}
            </Text>
            <Text style={[styles.statusNames, {color: theme.black.third}]}>
                {members
                    .map(member => member.username || '')
                    .filter(Boolean)
                    .join('、')}
            </Text>
        </View>
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
    dayList: {
        maxHeight: verticalScale(360),
        marginTop: verticalScale(8),
    },
    daySlotRow: {
        borderBottomWidth: StyleSheet.hairlineWidth,
        paddingVertical: verticalScale(10),
    },
    daySlotHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    daySlotTime: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '600',
    },
    daySlotCount: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(12),
        fontWeight: '700',
        marginLeft: scale(8),
        textAlign: 'right',
    },
    dayMemberList: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(8),
        marginTop: verticalScale(6),
    },
    dayMember: {
        alignItems: 'center',
        flexDirection: 'row',
        maxWidth: '48%',
    },
    dayMemberAvatar: {
        borderRadius: scale(10),
        height: scale(20),
        width: scale(20),
    },
    dayMemberName: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(11),
        marginLeft: scale(4),
    },
    daySlotEmpty: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginTop: verticalScale(3),
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
    classBadge: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginLeft: scale(6),
    },
    statusGroup: {
        marginTop: verticalScale(10),
    },
    statusTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '600',
    },
    statusNames: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginTop: verticalScale(3),
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
