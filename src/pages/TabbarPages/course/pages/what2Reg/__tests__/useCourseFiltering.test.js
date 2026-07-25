import { isCourseRecommended } from '../hooks/useCourseFiltering';

const makeSlot = (courseCode, section, day, timeFrom, timeTo) => ({
    'Course Code': courseCode,
    Section: section,
    Day: day,
    'Time From': timeFrom,
    'Time To': timeTo,
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
});
