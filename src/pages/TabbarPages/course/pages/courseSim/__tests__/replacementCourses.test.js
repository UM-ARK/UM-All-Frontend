import {
    getReplacementCourses,
    getReplacementWindow,
} from '../utils/replacementCourses';

const makeSlot = (courseCode, section, day, timeFrom, timeTo) => ({
    'Course Code': courseCode,
    'Course Title': `${courseCode} title`,
    'Course Title Chi': `${courseCode} 中文名`,
    Section: section,
    Day: day,
    'Time From': timeFrom,
    'Time To': timeTo,
    'Teacher Information': `${courseCode} teacher`,
});

describe('getReplacementWindow', () => {
    it('以前後相鄰課程建立空檔，並排除目標 Section 的其他課節', () => {
        const target = makeSlot('TARGET01', '001', 'TUE', '11:30', '12:45');
        const planSlots = [
            makeSlot('BEFORE01', '001', 'TUE', '10:00', '11:15'),
            target,
            makeSlot('TARGET01', '001', 'FRI', '11:30', '12:45'),
            makeSlot('AFTER001', '001', 'TUE', '14:00', '15:15'),
        ];

        expect(getReplacementWindow(target, planSlots)).toEqual({
            day: 'TUE',
            from: '11:15',
            to: '14:00',
        });
    });

    it('首節與末節分別使用當日開始及結束時間', () => {
        const first = makeSlot('FIRST001', '001', 'MON', '09:00', '10:00');
        const last = makeSlot('LAST0001', '001', 'MON', '13:00', '14:00');
        const planSlots = [first, last];

        expect(getReplacementWindow(first, planSlots)).toEqual({
            day: 'MON',
            from: '00:00',
            to: '13:00',
        });
        expect(getReplacementWindow(last, planSlots)).toEqual({
            day: 'MON',
            from: '10:00',
            to: '23:59',
        });
    });
});

describe('getReplacementCourses', () => {
    const target = makeSlot('TARGET01', '001', 'TUE', '11:30', '12:45');
    const planSlots = [
        makeSlot('BEFORE01', '001', 'TUE', '10:00', '11:15'),
        target,
        makeSlot('TARGET01', '001', 'FRI', '11:30', '12:45'),
        makeSlot('AFTER001', '001', 'TUE', '14:00', '15:15'),
        makeSlot('FRIDAY01', '001', 'FRI', '14:00', '15:15'),
    ];
    const planList = [
        {'Course Code': 'BEFORE01', Section: '001'},
        {'Course Code': 'TARGET01', Section: '001'},
        {'Course Code': 'AFTER001', Section: '001'},
        {'Course Code': 'FRIDAY01', Section: '001'},
    ];

    it('只保留目標日落入空檔且整週不衝突的 Section', () => {
        const fittingSection = [
            makeSlot('FITTING1', '001', 'TUE', '11:30', '12:45'),
            makeSlot('FITTING1', '001', 'THU', '11:30', '12:45'),
        ];
        const outsideWindow = [
            makeSlot('OUTSIDE1', '001', 'TUE', '13:30', '14:15'),
        ];
        const otherDayConflict = [
            makeSlot('CONFLICT', '001', 'TUE', '11:30', '12:45'),
            makeSlot('CONFLICT', '001', 'FRI', '14:30', '15:00'),
        ];

        const result = getReplacementCourses({
            targetSlot: target,
            planSlots,
            planList,
            courseTimeList: [
                ...fittingSection,
                ...outsideWindow,
                ...otherDayConflict,
            ],
            adddropCourseList: [
                fittingSection[0],
                outsideWindow[0],
                otherDayConflict[0],
            ],
        });

        expect(result.window).toEqual({
            day: 'TUE',
            from: '11:15',
            to: '14:00',
        });
        expect(result.courses).toHaveLength(1);
        expect(result.courses[0]['Course Code']).toBe('FITTING1');
        expect(result.courses[0].sections.map(item => item.section)).toEqual([
            '001',
        ]);
    });

    it('排除原 Course Code、已排 Course Code 與時間資料不完整的 Section', () => {
        const result = getReplacementCourses({
            targetSlot: target,
            planSlots,
            planList,
            courseTimeList: [
                makeSlot('TARGET01', '002', 'TUE', '11:30', '12:45'),
                makeSlot('BEFORE01', '002', 'TUE', '11:30', '12:45'),
                {
                    ...makeSlot('NOTIMES1', '001', 'TUE', '11:30', '12:45'),
                    Day: '',
                },
            ],
            adddropCourseList: [],
        });

        expect(result.courses).toEqual([]);
    });
});
