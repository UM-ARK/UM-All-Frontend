/**
 * 小組課表模式：成員選擇、個人課表與全體上課概覽。
 */
import React, {memo, useMemo, useState} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';
import Ionicons from '@react-native-vector-icons/ionicons';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';
import CourseActionMenuCard from '../../TabbarPages/course/components/CourseActionMenuCard';
import {getSlotKey} from '../../TabbarPages/course/hooks/useConflict';
import {
    getCourseInfoMenuActions,
    handleCourseInfoMenuAction,
} from '../../TabbarPages/course/utils/courseInfoMenu';
import {computeOverviewCourseFrames} from '../../TabbarPages/course/pages/courseSim/utils/overviewLayout';
import {
    OVERVIEW_COURSE_H_GAP,
    OVERVIEW_COURSE_H_PADDING,
    OVERVIEW_COURSE_V_GAP,
    OVERVIEW_MAX_COURSE_HEIGHT,
} from '../../TabbarPages/course/pages/courseSim/utils/overviewConfig';
import {
    buildSharedTimetableHeatmapSlots,
    resolveSharedTimetableMeetings,
} from '../utils/sharedTimetable';
import SharedTimetableSlotDetailSheet from './SharedTimetableSlotDetailSheet';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];
const WEEKDAY_CODES = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
const OVERVIEW_TIME_LABEL_WIDTH = scale(34);

function formatMinute(minute) {
    const hours = Math.floor(minute / 60);
    const minutes = minute % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function memberName(member, t) {
    return member?.displayName || member?.username || t('成員');
}

function colorIndexForCourse(courseCode, colorCount) {
    return Array.from(courseCode || '').reduce(
        (total, character) => total + character.charCodeAt(0),
        0,
    ) % colorCount;
}

const TeamSharedTimetableView = ({
    members = [],
    courseSlots = [],
    loading = false,
    error = null,
    onRetry,
    navigation,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const [selectedId, setSelectedId] = useState('all');
    const [selectedSlot, setSelectedSlot] = useState(null);
    const selectedMember = useMemo(
        () => members.find(member => String(member?.harborUserId) === String(selectedId)),
        [members, selectedId],
    );
    const resolvedMembers = useMemo(
        () => members.map(member => ({
            ...member,
            resolved: resolveSharedTimetableMeetings(
                member?.sharedTimetable,
                courseSlots,
            ),
        })),
        [courseSlots, members],
    );
    const selectedResolved = resolvedMembers.find(member =>
        String(member?.harborUserId) === String(selectedId),
    );
    const unresolvedCount = resolvedMembers.reduce(
        (count, member) => count + member.resolved.unresolvedCourses.length,
        0,
    );
    const heatmapSlots = useMemo(
        () => buildSharedTimetableHeatmapSlots(resolvedMembers),
        [resolvedMembers],
    );
    const sharingMemberCount = resolvedMembers.filter(
        member => member.sharedTimetable,
    ).length;

    if (loading) {
        return <Text style={[styles.message, {color: theme.black.third}]}>{t('正在載入小組課表…')}</Text>;
    }
    if (error) {
        return (
            <View style={styles.state}>
                <Text style={[styles.message, {color: theme.unread}]}>{t('暫時無法載入小組課表。')}</Text>
                <Pressable accessibilityRole="button" onPress={() => { trigger(); onRetry?.(); }} style={({pressed}) => [styles.retry, {backgroundColor: pressed ? theme.tonal.primary30 : theme.tonal.primary15}]}><Text style={[styles.retryText, {color: theme.themeColor}]}>{t('重試')}</Text></Pressable>
            </View>
        );
    }

    return (
        <View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.memberSelector}>
                <Pressable accessibilityRole="tab" accessibilityState={{selected: selectedId === 'all'}} onPress={() => { trigger(); setSelectedId('all'); }} style={({pressed}) => [styles.allSelector, {backgroundColor: selectedId === 'all' ? theme.tonal.primary15 : pressed ? theme.tonal.primary08 : undefined, borderColor: selectedId === 'all' ? theme.themeColor : theme.themeColorUltraLight}]}><Text style={[styles.allSelectorText, {color: theme.themeColor}]}>{t('總覽')}</Text></Pressable>
                {members.map(member => {
                    const name = memberName(member, t);
                    const avatarUri = member.avatarTemplate ? ARK_HARBOR_AVATAR_TEMPLATE(member.avatarTemplate, 72) : null;
                    const selected = String(selectedId) === String(member.harborUserId);
                    return <View key={String(member.harborUserId)} style={styles.memberChoice}><Pressable accessibilityRole="tab" accessibilityState={{selected}} accessibilityLabel={name} onPress={() => { trigger(); setSelectedId(member.harborUserId); }} style={({pressed}) => [styles.memberChoicePress, {backgroundColor: selected ? theme.tonal.primary15 : pressed ? theme.tonal.primary08 : undefined, borderColor: selected ? theme.themeColor : theme.themeColorUltraLight}]}>{avatarUri ? <Image source={{uri: avatarUri}} style={[styles.avatar, {borderColor: selected ? theme.themeColor : theme.themeColorUltraLight, borderWidth: selected ? scale(2) : StyleSheet.hairlineWidth}]} /> : <View style={[styles.avatar, {backgroundColor: theme.tonal.primary15, borderColor: selected ? theme.themeColor : theme.themeColorUltraLight, borderWidth: selected ? scale(2) : StyleSheet.hairlineWidth}]} />}<Text numberOfLines={1} style={[styles.memberLabel, selected && styles.memberLabelSelected, {color: selected ? theme.themeColor : theme.black.third}]}>{name}</Text></Pressable></View>;
                })}
            </ScrollView>
            {selectedId === 'all' ? (
                <>
                    {resolvedMembers.every(member => !member.sharedTimetable) ? <Text style={[styles.message, {color: theme.black.third}]}>{t('目前尚無成員共享課表。')}</Text> : <><View style={styles.overviewSummary}><Text style={[styles.overviewSummaryText, {color: theme.black.second}]}>{t('{{shared}}／{{total}} 人已共享課表', {shared: sharingMemberCount, total: resolvedMembers.length})}</Text><View style={styles.heatLegend}><View style={[styles.heatLegendDot, {backgroundColor: theme.tonal.primary50}]} /><Text style={[styles.heatLegendText, {color: theme.black.third}]}>{t('格內數字為上課人數')}</Text></View></View><WeeklyOverview meetings={heatmapSlots} aggregate aggregateMemberCount={sharingMemberCount} navigation={navigation} onMeetingPress={setSelectedSlot} /></>}
                    {unresolvedCount > 0 ? <Text style={[styles.unresolved, {color: theme.black.third}]}>{t('有 {{count}} 門課的時間暫不可用；全部模式只計入已成功還原的課程。', {count: unresolvedCount})}</Text> : null}
                </>
            ) : !selectedMember?.sharedTimetable ? (
                <Text style={[styles.message, {color: theme.black.third}]}>{t('此成員未共享課表')}</Text>
            ) : (
                <>
                    <View style={[styles.sharingBadge, {backgroundColor: theme.tonal.primary08}]}>
                        <Ionicons name={selectedResolved?.sharedTimetable?.sharingLevel === 'course_identity' ? 'school-outline' : 'time-outline'} color={theme.themeColor} size={scale(14)} />
                        <Text style={[styles.sharingBadgeText, {color: theme.black.second}]}>{selectedResolved?.sharedTimetable?.sharingLevel === 'course_identity' ? t('共享 Course Code + Section') : t('只共享上課時間')}</Text>
                    </View>
                    <WeeklyOverview meetings={selectedResolved?.resolved.meetings || []} navigation={navigation} />
                    {selectedResolved?.resolved.unresolvedCourses.length > 0 ? <View style={[styles.unresolvedBox, {backgroundColor: theme.tonal.primary08}]}><Text style={[styles.unresolved, {color: theme.black.second}]}>{t('課程時間暫不可用')}</Text>{selectedResolved.resolved.unresolvedCourses.map(item => <Text key={`${item.courseCode}-${item.section}`} style={[styles.unresolved, {color: theme.black.third}]}>{item.courseCode} · {item.section}</Text>)}</View> : null}
                </>
            )}
            <SharedTimetableSlotDetailSheet
                visible={Boolean(selectedSlot)}
                slot={selectedSlot}
                onClose={() => setSelectedSlot(null)}
            />
        </View>
    );
};

const WeeklyOverview = ({meetings, aggregate = false, aggregateMemberCount = 0, navigation, onMeetingPress}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const [gridWidth, setGridWidth] = useState(0);
    const courseMenuActions = useMemo(
        () => getCourseInfoMenuActions({
            t,
            themeColor: theme.themeColor,
            secondaryColor: theme.black.third,
        }),
        [t, theme.black.third, theme.themeColor],
    );
    const slots = useMemo(
        () => (Array.isArray(meetings) ? meetings : []).map((meeting, index) => ({
            ...meeting,
            Day: WEEKDAY_CODES[meeting.weekday - 1],
            'Course Code': meeting.identity?.courseCode || `${aggregate ? 'ALL' : 'BUSY'}${index}`,
            Section: meeting.identity?.section || '',
            'Time From': formatMinute(meeting.startMinute),
            'Time To': formatMinute(meeting.endMinute),
        })).filter(slot => slot.Day),
        [aggregate, meetings],
    );
    const dayCount = Math.max(
        5,
        slots.reduce(
            (lastDay, slot) => Math.max(lastDay, WEEKDAY_CODES.indexOf(slot.Day) + 1),
            0,
        ),
    );
    const overviewStart = slots.length > 0
        ? Math.floor(Math.min(...slots.map(slot => slot.startMinute)) / 30) * 30
        : 0;
    const overviewEnd = slots.length > 0
        ? Math.ceil(Math.max(...slots.map(slot => slot.endMinute)) / 30) * 30
        : overviewStart;
    const overviewDuration = Math.max(overviewEnd - overviewStart, 60);
    const hourLines = [];
    for (
        let minute = Math.ceil(overviewStart / 60) * 60;
        minute < overviewEnd;
        minute += 60
    ) {
        hourLines.push(minute);
    }
    const hourHeight = Math.max(
        verticalScale(36),
        Math.min(
            verticalScale(54),
            (verticalScale(420) / overviewDuration) * 60,
        ),
    );
    const overviewHeight = (overviewDuration / 60) * hourHeight;
    const timeLabelWidth = aggregate ? OVERVIEW_TIME_LABEL_WIDTH : 0;
    const dayWidth = dayCount > 0
        ? (gridWidth - timeLabelWidth) / dayCount
        : 0;
    const timeLabels = aggregate
        ? [overviewStart, ...hourLines.filter(minute => minute !== overviewStart)]
        : [];
    const framesByDay = useMemo(() => {
        const result = {};
        if (aggregate) {
            return result;
        }
        WEEKDAY_CODES.slice(0, dayCount).forEach(day => {
            result[day] = computeOverviewCourseFrames({
                courses: slots.filter(slot => slot.Day === day),
                overviewStart,
                hourHeight,
                dayWidth,
                hPadding: OVERVIEW_COURSE_H_PADDING,
                hGap: OVERVIEW_COURSE_H_GAP,
                vGap: OVERVIEW_COURSE_V_GAP,
                maxHeight: OVERVIEW_MAX_COURSE_HEIGHT,
                minHeight: verticalScale(38),
                canvasBottom: overviewHeight,
            });
        });
        return result;
    }, [aggregate, dayCount, dayWidth, hourHeight, overviewHeight, overviewStart, slots]);

    if (slots.length === 0) {
        return <Text style={[styles.message, {color: theme.black.third}]}>{t('沒有可顯示的上課時間')}</Text>;
    }

    return (
        <View
            onLayout={event => setGridWidth(event.nativeEvent.layout.width)}
            style={[styles.overview, {backgroundColor: theme.white, borderColor: theme.themeColorUltraLight}]}>
            <View style={styles.overviewHeader}>
                {aggregate ? <View style={{width: timeLabelWidth}} /> : null}
                {WEEKDAY_LABELS.slice(0, dayCount).map(label => (
                    <Text key={label} style={[styles.dayLabel, {color: theme.black.second, width: dayWidth}]}>週{label}</Text>
                ))}
            </View>
            {gridWidth > 0 ? (
                <View style={[styles.overviewBody, {height: overviewHeight}]}>
                    {hourLines.map(minute => (
                        <View
                            key={minute}
                            style={[
                                styles.overviewGridLine,
                                {
                                    backgroundColor: theme.themeColorUltraLight,
                                    left: timeLabelWidth,
                                    top:
                                        ((minute - overviewStart) / 60) *
                                        hourHeight,
                                },
                            ]}
                        />
                    ))}
                    {timeLabels.map(minute => (
                        <Text
                            key={`time-${minute}`}
                            pointerEvents="none"
                            style={[
                                styles.overviewTimeLabel,
                                {
                                    color: theme.black.third,
                                    top: Math.max(
                                        0,
                                        ((minute - overviewStart) / 60) *
                                            hourHeight -
                                            verticalScale(6),
                                    ),
                                    width: timeLabelWidth,
                                },
                            ]}>
                            {formatMinute(minute)}
                        </Text>
                    ))}
                    {WEEKDAY_CODES.slice(0, dayCount).map((day, dayIndex) => (
                        <View key={day} style={[styles.overviewDay, {borderColor: theme.themeColorUltraLight, height: overviewHeight, left: timeLabelWidth + dayIndex * dayWidth, width: dayWidth}]}>
                            {slots.filter(slot => slot.Day === day).map(slot => {
                                const frame = aggregate
                                    ? {
                                          height: Math.max(
                                              verticalScale(16),
                                              ((slot.endMinute - slot.startMinute) / 60) * hourHeight - verticalScale(2),
                                          ),
                                          left: scale(2),
                                          top: ((slot.startMinute - overviewStart) / 60) * hourHeight + verticalScale(1),
                                          width: Math.max(0, dayWidth - scale(4)),
                                      }
                                    : framesByDay[day]?.get(getSlotKey(slot));
                                if (!frame) {
                                    return null;
                                }
                                const meetingCount = aggregate
                                    ? slot.members?.length || 0
                                    : 1;
                                const courseCode = slot.identity?.courseCode || '';
                                const heat = aggregateMemberCount > 0
                                    ? meetingCount / aggregateMemberCount
                                    : 0;
                                const cardColor = aggregate
                                    ? heat >= 0.67
                                        ? theme.tonal.primary50
                                        : heat >= 0.34
                                          ? theme.tonal.primary30
                                          : theme.tonal.primary15
                                    : courseCode
                                      ? theme.TIME_TABLE_COLOR[colorIndexForCourse(courseCode, theme.TIME_TABLE_COLOR.length)]
                                      : theme.tonal.primary15;
                                const tiny = frame.height < verticalScale(38);
                                const courseLabel =
                                    courseCode && !tiny && courseCode.length > 4
                                        ? `${courseCode.substring(0, 4)}\n${courseCode.substring(4)}`
                                        : courseCode;
                                const card = (
                                    <View style={[styles.overviewMeeting, styles.overviewMeetingFill, {backgroundColor: cardColor}]}>
                                        <Text numberOfLines={tiny ? 1 : 2} style={[styles.meetingText, {color: aggregate || !courseCode ? theme.themeColor : theme.black.main}]}>{aggregate ? t('{{count}} 人上課', {count: meetingCount}) : courseLabel || t('上課')}</Text>
                                        {!aggregate && courseCode && !tiny ? <Text numberOfLines={1} style={[styles.sectionText, {color: theme.black.second}]}>{slot.identity.section}</Text> : null}
                                        {!tiny ? <Text numberOfLines={1} style={[styles.meetingTime, {color: theme.black.third}]}>{formatMinute(slot.startMinute)}–{formatMinute(slot.endMinute)}</Text> : null}
                                    </View>
                                );
                                if (aggregate) {
                                    return <Pressable key={getSlotKey(slot)} accessibilityRole="button" accessibilityLabel={t('{{count}} 人正在上課', {count: meetingCount})} onPress={() => { trigger(); onMeetingPress?.(slot); }} style={({pressed}) => [styles.overviewMeetingFrame, {height: frame.height, left: frame.left, opacity: pressed ? 0.7 : 1, top: frame.top, width: frame.width}]}>{card}</Pressable>;
                                }
                                if (!courseCode) {
                                    return <View key={getSlotKey(slot)} style={[styles.overviewMeetingFrame, {height: frame.height, left: frame.left, top: frame.top, width: frame.width}]}>{card}</View>;
                                }
                                return (
                                    <CourseActionMenuCard
                                        key={getSlotKey(slot)}
                                        actions={courseMenuActions}
                                        accessibilityLabel={`${courseCode}-${slot.identity.section}`}
                                        cardStyle={styles.overviewMeetingFill}
                                        menuStyle={[styles.overviewMeetingFrame, {height: frame.height, left: frame.left, top: frame.top, width: frame.width}]}
                                        onOpen={() => trigger('rigid')}
                                        onPressAction={event => {
                                            trigger();
                                            handleCourseInfoMenuAction({
                                                actionId: event.nativeEvent.event,
                                                course: slot,
                                                navigation,
                                            });
                                        }}>
                                        {card}
                                    </CourseActionMenuCard>
                                );
                            })}
                        </View>
                    ))}
                </View>
            ) : null}
        </View>
    );
};

const styles = StyleSheet.create({
    memberSelector: {gap: scale(10), paddingBottom: verticalScale(10)},
    allSelector: {alignItems: 'center', borderRadius: scale(8), borderWidth: StyleSheet.hairlineWidth, justifyContent: 'center', width: scale(54)},
    allSelectorText: {...uiStyle.defaultText, fontSize: scale(12), fontWeight: '700'},
    memberChoice: {alignItems: 'center', width: scale(54)},
    memberChoicePress: {alignItems: 'center', borderRadius: scale(8), borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: scale(3), paddingVertical: verticalScale(3), width: scale(54)},
    avatar: {borderRadius: scale(18), borderWidth: StyleSheet.hairlineWidth, height: scale(36), width: scale(36)},
    memberLabel: {...uiStyle.defaultText, fontSize: scale(10), marginTop: verticalScale(3), maxWidth: scale(48), textAlign: 'center'},
    memberLabelSelected: {fontWeight: '700'},
    state: {alignItems: 'center', paddingVertical: verticalScale(16)},
    message: {...uiStyle.defaultText, fontSize: scale(12), lineHeight: verticalScale(18), paddingVertical: verticalScale(16), textAlign: 'center'},
    retry: {borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: verticalScale(7)},
    retryText: {...uiStyle.defaultText, fontSize: scale(12), fontWeight: '700'},
    sharingBadge: {alignItems: 'center', alignSelf: 'flex-start', borderRadius: scale(6), flexDirection: 'row', marginBottom: verticalScale(8), paddingHorizontal: scale(8), paddingVertical: verticalScale(5)},
    sharingBadgeText: {...uiStyle.defaultText, fontSize: scale(11), fontWeight: '600', marginLeft: scale(5)},
    overviewSummary: {alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: verticalScale(8)},
    overviewSummaryText: {...uiStyle.defaultText, fontSize: scale(11), fontWeight: '600'},
    heatLegend: {alignItems: 'center', flexDirection: 'row', marginLeft: scale(8)},
    heatLegendDot: {borderRadius: scale(3), height: scale(6), marginRight: scale(4), width: scale(6)},
    heatLegendText: {...uiStyle.defaultText, fontSize: scale(10)},
    overview: {borderRadius: scale(8), borderWidth: StyleSheet.hairlineWidth, overflow: 'hidden'},
    overviewHeader: {flexDirection: 'row'},
    overviewBody: {position: 'relative'},
    overviewGridLine: {height: StyleSheet.hairlineWidth, left: 0, position: 'absolute', right: 0},
    overviewTimeLabel: {...uiStyle.defaultText, fontSize: scale(8), paddingRight: scale(4), position: 'absolute', textAlign: 'right'},
    overviewDay: {borderLeftWidth: StyleSheet.hairlineWidth, position: 'absolute', top: 0},
    dayLabel: {...uiStyle.defaultText, fontSize: scale(11), fontWeight: '700', textAlign: 'center'},
    overviewMeeting: {alignItems: 'center', borderRadius: scale(5), justifyContent: 'center', overflow: 'hidden', paddingHorizontal: scale(2), position: 'absolute'},
    overviewMeetingFill: {height: '100%', width: '100%'},
    overviewMeetingFrame: {position: 'absolute'},
    meetingText: {...uiStyle.defaultText, fontSize: scale(9), fontWeight: '700', textAlign: 'center'},
    sectionText: {...uiStyle.defaultText, fontSize: scale(7), fontWeight: '600', textAlign: 'center'},
    meetingTime: {...uiStyle.defaultText, fontSize: scale(6.5), marginTop: verticalScale(1), textAlign: 'center'},
    unresolved: {...uiStyle.defaultText, fontSize: scale(11), lineHeight: verticalScale(17), marginTop: verticalScale(8)},
    unresolvedBox: {borderRadius: scale(8), marginTop: verticalScale(10), padding: scale(9)},
});

export default memo(TeamSharedTimetableView);
