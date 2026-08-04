/**
 * 小組課表模式：成員選擇、個人課表與全體上課概覽。
 */
import React, {memo, useMemo, useState} from 'react';
import {Image, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {ARK_HARBOR_AVATAR_TEMPLATE} from '../../../utils/pathMap';
import {trigger} from '../../../utils/trigger';
import {resolveSharedTimetableMeetings} from '../utils/sharedTimetable';

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日'];

function formatMinute(minute) {
    const hours = Math.floor(minute / 60);
    const minutes = minute % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function memberName(member, t) {
    return member?.displayName || member?.username || t('成員');
}

const TeamSharedTimetableView = ({
    members = [],
    courseSlots = [],
    loading = false,
    error = null,
    onRetry,
    onProfilePress,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const [selectedId, setSelectedId] = useState('all');
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
                <Pressable accessibilityRole="tab" accessibilityState={{selected: selectedId === 'all'}} onPress={() => { trigger(); setSelectedId('all'); }} style={({pressed}) => [styles.allSelector, {backgroundColor: selectedId === 'all' ? theme.themeColor : pressed ? theme.tonal.primary30 : theme.tonal.primary15}]}><Text style={[styles.allSelectorText, {color: selectedId === 'all' ? theme.trueWhite : theme.themeColor}]}>{t('全部')}</Text></Pressable>
                {members.map(member => {
                    const name = memberName(member, t);
                    const avatarUri = member.avatarTemplate ? ARK_HARBOR_AVATAR_TEMPLATE(member.avatarTemplate, 72) : null;
                    const selected = String(selectedId) === String(member.harborUserId);
                    return <View key={String(member.harborUserId)} style={styles.memberChoice}><Pressable accessibilityRole="link" accessibilityLabel={name} disabled={!member.username} onPress={() => { trigger(); onProfilePress?.(member.username); }}>{avatarUri ? <Image source={{uri: avatarUri}} style={[styles.avatar, {borderColor: selected ? theme.themeColor : theme.themeColorUltraLight}]} /> : <View style={[styles.avatar, {backgroundColor: theme.tonal.primary15, borderColor: selected ? theme.themeColor : theme.themeColorUltraLight}]} />}</Pressable><Pressable accessibilityRole="tab" accessibilityState={{selected}} onPress={() => { trigger(); setSelectedId(member.harborUserId); }} style={({pressed}) => [styles.memberLabelWrap, selected ? {backgroundColor: theme.tonal.primary15} : pressed ? {backgroundColor: theme.tonal.primary08} : null]}><Text numberOfLines={1} style={[styles.memberLabel, {color: selected ? theme.themeColor : theme.black.third}]}>{name}</Text></Pressable></View>;
                })}
            </ScrollView>
            {selectedId === 'all' ? (
                <>
                    {resolvedMembers.every(member => !member.sharedTimetable) ? <Text style={[styles.message, {color: theme.black.third}]}>{t('目前尚無成員共享課表。')}</Text> : <WeeklyMeetings members={resolvedMembers} aggregate />}
                    {unresolvedCount > 0 ? <Text style={[styles.unresolved, {color: theme.black.third}]}>{t('有 {{count}} 門課的時間暫不可用；全部模式只計入已成功還原的課程。', {count: unresolvedCount})}</Text> : null}
                </>
            ) : !selectedMember?.sharedTimetable ? (
                <Text style={[styles.message, {color: theme.black.third}]}>{t('此成員未共享課表')}</Text>
            ) : (
                <>
                    <WeeklyMeetings members={[selectedResolved]} />
                    {selectedResolved?.resolved.unresolvedCourses.length > 0 ? <View style={[styles.unresolvedBox, {backgroundColor: theme.tonal.primary08}]}><Text style={[styles.unresolved, {color: theme.black.second}]}>{t('課程時間暫不可用')}</Text>{selectedResolved.resolved.unresolvedCourses.map(item => <Text key={`${item.courseCode}-${item.section}`} style={[styles.unresolved, {color: theme.black.third}]}>{item.courseCode} · {item.section}</Text>)}</View> : null}
                </>
            )}
        </View>
    );
};

const WeeklyMeetings = ({members, aggregate = false}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const byDay = useMemo(() => {
        const result = Array.from({length: 7}, () => []);
        members.forEach(member => {
            member?.resolved?.meetings.forEach(meeting => {
                if (meeting.weekday >= 1 && meeting.weekday <= 7) {
                    result[meeting.weekday - 1].push({...meeting, member});
                }
            });
        });
        if (aggregate) {
            return result.map(day => {
                const ranges = new Map();
                day.forEach(meeting => {
                    const key = `${meeting.startMinute}:${meeting.endMinute}`;
                    const current = ranges.get(key);
                    if (current) {
                        current.members.push(meeting.member);
                    } else {
                        ranges.set(key, {...meeting, members: [meeting.member]});
                    }
                });
                return Array.from(ranges.values());
            });
        }
        return result;
    }, [aggregate, members]);
    return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.week}><View style={styles.weekRow}>{WEEKDAY_LABELS.map((label, index) => <View key={label} style={[styles.day, {backgroundColor: theme.white, borderColor: theme.themeColorUltraLight}]}><Text style={[styles.dayLabel, {color: theme.black.second}]}>週{label}</Text>{byDay[index].length === 0 ? <Text style={[styles.emptyDay, {color: theme.black.third}]}>-</Text> : byDay[index].map((meeting, meetingIndex) => <View key={`${meetingIndex}-${meeting.startMinute}-${meeting.endMinute}`} style={[styles.meeting, {backgroundColor: theme.tonal.primary15}]}><Text style={[styles.meetingText, {color: theme.themeColor}]}>{aggregate ? t('{{count}} 人上課', {count: meeting.members?.length || 1}) : meeting.identity ? `${meeting.identity.courseCode} · ${meeting.identity.section}` : t('上課')}</Text><Text style={[styles.meetingTime, {color: theme.black.third}]}>{formatMinute(meeting.startMinute)}–{formatMinute(meeting.endMinute)}</Text>{aggregate ? <View style={styles.aggregateAvatars}>{meeting.members.slice(0, 3).map(member => { const avatarUri = member.avatarTemplate ? ARK_HARBOR_AVATAR_TEMPLATE(member.avatarTemplate, 36) : null; return avatarUri ? <Image key={String(member.harborUserId)} source={{uri: avatarUri}} style={[styles.aggregateAvatar, {borderColor: theme.white}]} /> : <View key={String(member.harborUserId)} style={[styles.aggregateAvatar, {backgroundColor: theme.tonal.primary30, borderColor: theme.white}]} />; })}{meeting.members.length > 3 ? <Text style={[styles.aggregateMore, {color: theme.black.third}]}>+{meeting.members.length - 3}</Text> : null}</View> : null}</View>)}</View>)}</View></ScrollView>;
};

const styles = StyleSheet.create({
    memberSelector: {gap: scale(10), paddingBottom: verticalScale(10)},
    allSelector: {alignItems: 'center', borderRadius: scale(16), justifyContent: 'center', minWidth: scale(48), paddingHorizontal: scale(10)},
    allSelectorText: {...uiStyle.defaultText, fontSize: scale(12), fontWeight: '700'},
    memberChoice: {alignItems: 'center', width: scale(54)},
    avatar: {borderRadius: scale(18), borderWidth: StyleSheet.hairlineWidth, height: scale(36), width: scale(36)},
    memberLabelWrap: {borderRadius: scale(6), marginTop: verticalScale(3), maxWidth: scale(54), paddingHorizontal: scale(3)},
    memberLabel: {...uiStyle.defaultText, fontSize: scale(10), textAlign: 'center'},
    state: {alignItems: 'center', paddingVertical: verticalScale(16)},
    message: {...uiStyle.defaultText, fontSize: scale(12), lineHeight: verticalScale(18), paddingVertical: verticalScale(16), textAlign: 'center'},
    retry: {borderRadius: scale(8), paddingHorizontal: scale(12), paddingVertical: verticalScale(7)},
    retryText: {...uiStyle.defaultText, fontSize: scale(12), fontWeight: '700'},
    week: {paddingBottom: verticalScale(4)},
    weekRow: {flexDirection: 'row', gap: scale(6)},
    day: {borderRadius: scale(8), borderWidth: StyleSheet.hairlineWidth, minHeight: verticalScale(118), padding: scale(6), width: scale(94)},
    dayLabel: {...uiStyle.defaultText, fontSize: scale(11), fontWeight: '700', textAlign: 'center'},
    emptyDay: {...uiStyle.defaultText, fontSize: scale(12), marginTop: verticalScale(18), textAlign: 'center'},
    meeting: {borderRadius: scale(6), marginTop: verticalScale(6), padding: scale(5)},
    meetingText: {...uiStyle.defaultText, fontSize: scale(10), fontWeight: '700'},
    meetingTime: {...uiStyle.defaultText, fontSize: scale(9), marginTop: verticalScale(2)},
    aggregateAvatars: {alignItems: 'center', flexDirection: 'row', marginTop: verticalScale(4)},
    aggregateAvatar: {borderRadius: scale(7), borderWidth: StyleSheet.hairlineWidth, height: scale(14), marginRight: scale(-3), width: scale(14)},
    aggregateMore: {...uiStyle.defaultText, fontSize: scale(9), marginLeft: scale(5)},
    unresolved: {...uiStyle.defaultText, fontSize: scale(11), lineHeight: verticalScale(17), marginTop: verticalScale(8)},
    unresolvedBox: {borderRadius: scale(8), marginTop: verticalScale(10), padding: scale(9)},
});

export default memo(TeamSharedTimetableView);
