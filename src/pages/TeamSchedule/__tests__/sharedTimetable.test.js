import {buildImportText} from '../../TabbarPages/course/utils/parseImportData';
import {
    aggregateSharedTimetableMeetings,
    areSharedTimetablePayloadsEqual,
    buildSharedTimetablePayload,
    resolveSharedTimetableMeetings,
} from '../utils/sharedTimetable';

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
});
