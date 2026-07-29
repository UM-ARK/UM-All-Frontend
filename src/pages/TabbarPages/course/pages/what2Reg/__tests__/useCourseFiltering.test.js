jest.mock('../../../constants', () => ({
    DEFAULT_TIME_FROM: '00:00',
    DEFAULT_TIME_TO: '23:59',
}));

import {
    isCourseRecommended,
    isSectionRecommended,
    isSlotWithinTimeFilter,
} from '../hooks/useCourseFiltering';

const makeSlot = (courseCode, section, day, timeFrom, timeTo) => ({
    'Course Code': courseCode,
    Section: section,
    Day: day,
    'Time From': timeFrom,
    'Time To': timeTo,
});

describe('isSlotWithinTimeFilter', () => {
    const timeFilter = {
        day: 'MON',
        from: '17:50',
        to: '23:59',
    };

    it('課節開始時間早於篩選起點時不列入', () => {
        expect(isSlotWithinTimeFilter(
            makeSlot('TEST1000', '001', 'MON', '17:30', '18:45'),
            timeFilter,
        )).toBe(false);
    });

    it('課節剛好在篩選起點開始時列入', () => {
        expect(isSlotWithinTimeFilter(
            makeSlot('TEST1000', '001', 'MON', '17:50', '18:45'),
            timeFilter,
        )).toBe(true);
    });
});

describe('isCourseRecommended', () => {
    const planSlots = [
        makeSlot('PLAN1000', '001', 'MON', '09:00', '10:00'),
    ];

    it('至少有一個 Section 不衝突時列入建議', () => {
        const courseSlots = [
            makeSlot('TEST1000', '001', 'MON', '09:30', '10:30'),
            makeSlot('TEST1000', '002', 'TUE', '09:30', '10:30'),
        ];

        expect(isCourseRecommended({
            courseCode: 'TEST1000',
            courseSlots,
            planCourseCodeSet: new Set(),
            planSlots,
        })).toBe(true);
    });

    it('全部 Section 都衝突時不列入建議', () => {
        const courseSlots = [
            makeSlot('TEST1000', '001', 'MON', '09:30', '10:30'),
            makeSlot('TEST1000', '002', 'MON', '08:30', '09:30'),
        ];

        expect(isCourseRecommended({
            courseCode: 'TEST1000',
            courseSlots,
            planCourseCodeSet: new Set(),
            planSlots,
        })).toBe(false);
    });

    it('已加入課表的課程不重複建議', () => {
        expect(isCourseRecommended({
            courseCode: 'TEST1000',
            courseSlots: [
                makeSlot('TEST1000', '001', 'TUE', '09:30', '10:30'),
            ],
            planCourseCodeSet: new Set(['TEST1000']),
            planSlots,
        })).toBe(false);
    });

    it('時間未完整公佈時不宣稱為不衝突', () => {
        expect(isCourseRecommended({
            courseCode: 'TEST1000',
            courseSlots: [
                makeSlot('TEST1000', '001', '', '', ''),
            ],
            planCourseCodeSet: new Set(),
            planSlots,
        })).toBe(false);
    });

    it('時段與不衝突條件必須由同一個 Section 滿足', () => {
        const courseSlots = [
            makeSlot('TEST1000', '001', 'MON', '17:50', '18:45'),
            makeSlot('TEST1000', '002', 'TUE', '11:30', '12:45'),
        ];

        expect(isCourseRecommended({
            courseCode: 'TEST1000',
            courseSlots,
            planCourseCodeSet: new Set(),
            planSlots: [
                makeSlot('PLAN1000', '001', 'MON', '17:00', '18:00'),
            ],
            timeFilter: {
                day: 'MON',
                from: '17:50',
                to: '23:59',
            },
        })).toBe(false);
    });

    it('相接且完整落在時段內的 Section 仍列入建議', () => {
        const courseSlots = [
            makeSlot('TEST1000', '001', 'MON', '17:50', '18:45'),
            makeSlot('TEST1000', '001', 'THU', '17:50', '18:45'),
        ];

        expect(isCourseRecommended({
            courseCode: 'TEST1000',
            courseSlots,
            planCourseCodeSet: new Set(),
            planSlots: [
                makeSlot('PLAN1000', '001', 'MON', '17:00', '17:50'),
            ],
            timeFilter: {
                day: 'MON',
                from: '17:50',
                to: '23:59',
            },
        })).toBe(true);
    });
});

describe('isSectionRecommended', () => {
    it('只高亮時間完整且不衝突的 Section', () => {
        const planSlots = [
            makeSlot('PLAN1000', '001', 'MON', '09:00', '10:00'),
        ];

        expect(isSectionRecommended({
            sectionSlots: [
                makeSlot('TEST1000', '001', 'MON', '09:30', '10:30'),
            ],
            planSlots,
        })).toBe(false);
        expect(isSectionRecommended({
            sectionSlots: [
                makeSlot('TEST1000', '002', 'TUE', '09:30', '10:30'),
            ],
            planSlots,
        })).toBe(true);
    });
});
