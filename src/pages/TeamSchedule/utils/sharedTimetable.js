/**
 * 小組課表共享的 payload、還原與比較純函式。
 */
import {normalizeCourseIdentities, normalizeCourseIdentity} from '../../../utils/courseIdentity';
import {normalizeCandidateWindow} from '../../../utils/scheduling/schedulingModels';
import {normalizeCourseScheduleSlot} from './courseSchedulePrefill';

export function mergeBusyRanges(ranges) {
    const normalized = (Array.isArray(ranges) ? ranges : [])
        .map(normalizeCandidateWindow)
        .filter(Boolean)
        .sort((a, b) => {
            if (a.weekday !== b.weekday) {
                return a.weekday - b.weekday;
            }
            return a.startMinute - b.startMinute;
        });
    const result = [];

    normalized.forEach(range => {
        const previous = result[result.length - 1];
        if (
            previous &&
            previous.weekday === range.weekday &&
            previous.endMinute >= range.startMinute
        ) {
            previous.endMinute = Math.max(previous.endMinute, range.endMinute);
        } else {
            result.push({...range});
        }
    });
    return result;
}

export function buildSharedTimetablePayload({
    sharingLevel = 'time_only',
    planList,
    planSlots,
    revision = 0,
} = {}) {
    const normalizedRevision = Number.isInteger(revision) && revision >= 0
        ? revision
        : 0;
    if (sharingLevel === 'course_identity') {
        return {
            sharingLevel,
            courses: normalizeCourseIdentities(planList),
            revision: normalizedRevision,
        };
    }
    return {
        sharingLevel: 'time_only',
        busyRanges: mergeBusyRanges(
            (Array.isArray(planSlots) ? planSlots : [])
                .map(normalizeCourseScheduleSlot)
                .filter(Boolean),
        ),
        revision: normalizedRevision,
    };
}

export function normalizeSharedTimetable(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') {
        return null;
    }
    const revision = Number.isInteger(snapshot.revision) && snapshot.revision >= 0
        ? snapshot.revision
        : 0;
    if (snapshot.sharingLevel === 'course_identity') {
        return {
            sharingLevel: 'course_identity',
            courses: normalizeCourseIdentities(snapshot.courses),
            revision,
        };
    }
    if (snapshot.sharingLevel === 'time_only') {
        return {
            sharingLevel: 'time_only',
            busyRanges: mergeBusyRanges(snapshot.busyRanges),
            revision,
        };
    }
    return null;
}

export function areSharedTimetablePayloadsEqual(left, right) {
    const leftNormalized = normalizeSharedTimetable(left);
    const rightNormalized = normalizeSharedTimetable(right);
    if (!leftNormalized || !rightNormalized) {
        return leftNormalized === rightNormalized;
    }
    const withoutRevision = value => {
        const {revision: _revision, ...payload} = value;
        return JSON.stringify(payload);
    };
    return withoutRevision(leftNormalized) === withoutRevision(rightNormalized);
}

export function resolveSharedTimetableMeetings(sharedTimetable, courseSlots) {
    const snapshot = normalizeSharedTimetable(sharedTimetable);
    if (!snapshot) {
        return {meetings: [], unresolvedCourses: []};
    }
    if (snapshot.sharingLevel === 'time_only') {
        return {meetings: snapshot.busyRanges, unresolvedCourses: []};
    }

    const catalog = Array.isArray(courseSlots) ? courseSlots : [];
    const meetings = [];
    const unresolvedCourses = [];
    snapshot.courses.forEach(identity => {
        const matching = catalog.filter(item => {
            const catalogIdentity = normalizeCourseIdentity(item);
            return (
                catalogIdentity?.courseCode === identity.courseCode &&
                catalogIdentity?.section === identity.section
            );
        });
        if (matching.length === 0) {
            unresolvedCourses.push(identity);
            return;
        }
        matching.forEach(item => {
            const meeting = normalizeCourseScheduleSlot(item);
            if (meeting) {
                meetings.push({...meeting, identity});
            }
        });
    });
    return {
        meetings: meetings.sort((a, b) => {
            if (a.weekday !== b.weekday) {
                return a.weekday - b.weekday;
            }
            if (a.startMinute !== b.startMinute) {
                return a.startMinute - b.startMinute;
            }
            return a.endMinute - b.endMinute;
        }),
        unresolvedCourses,
    };
}

export function aggregateSharedTimetableMeetings(members) {
    const result = [];

    for (let weekday = 1; weekday <= 7; weekday += 1) {
        const meetings = [];
        (Array.isArray(members) ? members : []).forEach((member, memberIndex) => {
            member?.resolved?.meetings?.forEach(meeting => {
                if (
                    meeting?.weekday === weekday &&
                    meeting.startMinute < meeting.endMinute
                ) {
                    meetings.push({
                        ...meeting,
                        member,
                        memberKey: String(
                            member?.harborUserId ?? `member-${memberIndex}`,
                        ),
                    });
                }
            });
        });
        const boundaries = Array.from(
            new Set(
                meetings.flatMap(meeting => [
                    meeting.startMinute,
                    meeting.endMinute,
                ]),
            ),
        ).sort((a, b) => a - b);

        for (let index = 0; index < boundaries.length - 1; index += 1) {
            const startMinute = boundaries[index];
            const endMinute = boundaries[index + 1];
            const activeMembers = new Map();
            meetings.forEach(meeting => {
                if (
                    meeting.startMinute < endMinute &&
                    startMinute < meeting.endMinute
                ) {
                    activeMembers.set(meeting.memberKey, meeting.member);
                }
            });
            if (activeMembers.size === 0) {
                continue;
            }
            const memberKeys = Array.from(activeMembers.keys()).sort();
            const previous = result[result.length - 1];
            if (
                previous?.weekday === weekday &&
                previous.endMinute === startMinute &&
                previous.memberKeys.join('\u0000') === memberKeys.join('\u0000')
            ) {
                previous.endMinute = endMinute;
                continue;
            }
            result.push({
                weekday,
                startMinute,
                endMinute,
                members: Array.from(activeMembers.values()),
                memberKeys,
            });
        }
    }

    return result;
}

export function meetingOverlapsSlot(meeting, slot) {
    return Boolean(
        meeting &&
            slot &&
            meeting.weekday === slot.weekday &&
            meeting.startMinute < slot.endMinute &&
            slot.startMinute < meeting.endMinute,
    );
}
