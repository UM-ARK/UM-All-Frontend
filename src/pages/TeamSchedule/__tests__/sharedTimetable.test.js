import {buildImportText} from '../../TabbarPages/course/utils/parseImportData';
import {
    aggregateSharedTimetableMeetings,
    areSharedTimetablePayloadsEqual,
    buildSharedTimetableHeatmapSlots,
    buildSharedTimetablePayload,
    resolveSharedTimetableMeetings,
} from '../utils/sharedTimetable';
import {
    getSharedTimetableMemberOptions,
    getSharedTimetableQuickMembers,
} from '../utils/sharedTimetableMembers';

describe('共享課表成員選擇器', () => {
    const members = [
        {harborUserId: 1, username: 'zeta', sharedTimetable: {}},
        {harborUserId: 2, username: 'Alpha', sharedTimetable: null},
        {harborUserId: 3, username: 'beta', sharedTimetable: {}},
        {harborUserId: 4, username: 'Me', sharedTimetable: null},
    ];

    test('本人置頂，其次依共享狀態與 username 排序', () => {
        expect(
            getSharedTimetableMemberOptions(members, {myHarborUserId: 4})
                .map(member => member.harborUserId),
        ).toEqual([4, 3, 1, 2]);
    });

    test('username 搜尋不區分大小寫', () => {
        expect(
            getSharedTimetableMemberOptions(members, {query: 'ALP'})
                .map(member => member.harborUserId),
        ).toEqual([2]);
    });

    test('未搜尋時顯示預設成員，最近選擇的人排在最前', () => {
        expect(
            getSharedTimetableQuickMembers(members, ['3', '1'], 3)
                .map(member => member.harborUserId),
        ).toEqual([3, 1, 2]);
        expect(
            getSharedTimetableQuickMembers(members, [], 3)
                .map(member => member.harborUserId),
        ).toEqual([1, 2, 3]);
    });
});

describe('小組共享課表 payload', () => {
    test('課程身份會 trim、轉大寫、補足 Section 並去重', () => {
        const payload = buildSharedTimetablePayload({
            sharingLevel: 'course_identity',
            planList: [
                {'Course Code': ' comp1000 ', Section: '1'},
                {'Course Code': 'COMP1000', Section: '001'},
                {'Course Code': 'bad', Section: '1'},
            ],
        });

        expect(payload).toEqual({
            sharingLevel: 'course_identity',
            courses: [{courseCode: 'COMP1000', section: '001'}],
            revision: 0,
        });
        expect(buildImportText(payload.courses)).toBe('COMP1000(001)');
    });

    test('只共享時間時不輸出課程身份且合併相鄰課堂', () => {
        const payload = buildSharedTimetablePayload({
            sharingLevel: 'time_only',
            planSlots: [
                {Day: 'MON', 'Time From': '10:00', 'Time To': '11:00'},
                {Day: 'MON', 'Time From': '11:00', 'Time To': '11:30'},
            ],
        });

        expect(payload).toEqual({
            sharingLevel: 'time_only',
            busyRanges: [{weekday: 1, startMinute: 600, endMinute: 690}],
            revision: 0,
        });
        expect(payload.courses).toBeUndefined();
    });

    test('本機 catalog 找不到的課程會保留為未還原身份', () => {
        const result = resolveSharedTimetableMeetings(
            {
                sharingLevel: 'course_identity',
                courses: [
                    {courseCode: 'COMP1000', section: '001'},
                    {courseCode: 'ISOM2000', section: '002'},
                ],
            },
            [
                {
                    'Course Code': 'COMP1000',
                    Section: '001',
                    Day: 'MON',
                    'Time From': '10:00',
                    'Time To': '11:00',
                },
            ],
        );

        expect(result.meetings).toHaveLength(1);
        expect(result.meetings[0].identity).toEqual({
            courseCode: 'COMP1000',
            section: '001',
        });
        expect(result.unresolvedCourses).toEqual([
            {courseCode: 'ISOM2000', section: '002'},
        ]);
    });

    test('canonical payload equality 不受輸入順序影響', () => {
        expect(
            areSharedTimetablePayloadsEqual(
                {
                    sharingLevel: 'course_identity',
                    courses: [
                        {courseCode: 'ISOM2000', section: '002'},
                        {courseCode: 'COMP1000', section: '001'},
                    ],
                },
                {
                    sharingLevel: 'course_identity',
                    courses: [
                        {courseCode: 'COMP1000', section: '001'},
                        {courseCode: 'ISOM2000', section: '002'},
                    ],
                },
            ),
        ).toBe(true);
    });
});

describe('小組共享課表概覽', () => {
    test('依重疊邊界計算每段上課人數', () => {
        const members = [
            {
                harborUserId: 1,
                resolved: {
                    meetings: [
                        {weekday: 1, startMinute: 600, endMinute: 660},
                    ],
                },
            },
            {
                harborUserId: 2,
                resolved: {
                    meetings: [
                        {weekday: 1, startMinute: 600, endMinute: 690},
                    ],
                },
            },
        ];

        expect(aggregateSharedTimetableMeetings(members)).toEqual([
            {
                weekday: 1,
                startMinute: 600,
                endMinute: 660,
                members,
                memberKeys: ['1', '2'],
            },
            {
                weekday: 1,
                startMinute: 660,
                endMinute: 690,
                members: [members[1]],
                memberKeys: ['2'],
            },
        ]);
    });

    test('同一人的重疊課堂不會重複計數', () => {
        const member = {
            harborUserId: 1,
            resolved: {
                meetings: [
                    {weekday: 3, startMinute: 600, endMinute: 660},
                    {weekday: 3, startMinute: 630, endMinute: 690},
                ],
            },
        };

        expect(aggregateSharedTimetableMeetings([member])).toEqual([
            {
                weekday: 3,
                startMinute: 600,
                endMinute: 690,
                members: [member],
                memberKeys: ['1'],
            },
        ]);
    });

    test('固定 30 分鐘格保留每位成員的實際課堂明細', () => {
        const firstMember = {
            harborUserId: 1,
            resolved: {
                meetings: [
                    {
                        weekday: 2,
                        startMinute: 545,
                        endMinute: 645,
                        identity: {
                            courseCode: 'COMP1000',
                            section: '001',
                        },
                    },
                ],
            },
        };
        const secondMember = {
            harborUserId: 2,
            resolved: {
                meetings: [
                    {weekday: 2, startMinute: 600, endMinute: 660},
                ],
            },
        };

        const slots = buildSharedTimetableHeatmapSlots([
            firstMember,
            secondMember,
        ]);

        expect(slots.map(slot => ({
            startMinute: slot.startMinute,
            endMinute: slot.endMinute,
            memberCount: slot.members.length,
        }))).toEqual([
            {startMinute: 540, endMinute: 600, memberCount: 1},
            {startMinute: 600, endMinute: 660, memberCount: 2},
        ]);
        expect(slots[0].memberEntries[0].meetings[0]).toEqual(
            firstMember.resolved.meetings[0],
        );
    });

    test('同一成員在固定格內的重疊課堂只計算一次', () => {
        const member = {
            harborUserId: 1,
            resolved: {
                meetings: [
                    {weekday: 4, startMinute: 600, endMinute: 630},
                    {weekday: 4, startMinute: 615, endMinute: 645},
                ],
            },
        };

        const slots = buildSharedTimetableHeatmapSlots([member]);

        expect(slots).toHaveLength(1);
        expect(slots[0].members).toEqual([member]);
        expect(slots[0].memberEntries[0].meetings).toHaveLength(2);
    });

    test('相鄰格人數相同但成員不同時不會合併', () => {
        const firstMember = {
            harborUserId: 1,
            resolved: {
                meetings: [
                    {weekday: 5, startMinute: 600, endMinute: 630},
                ],
            },
        };
        const secondMember = {
            harborUserId: 2,
            resolved: {
                meetings: [
                    {weekday: 5, startMinute: 630, endMinute: 660},
                ],
            },
        };

        const slots = buildSharedTimetableHeatmapSlots([
            firstMember,
            secondMember,
        ]);

        expect(slots).toHaveLength(2);
        expect(slots[0].members).toEqual([firstMember]);
        expect(slots[1].members).toEqual([secondMember]);
    });
});
