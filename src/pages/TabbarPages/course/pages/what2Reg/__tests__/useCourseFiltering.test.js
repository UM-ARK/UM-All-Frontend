jest.mock('../../../constants', () => ({
    DEFAULT_TIME_FROM: '00:00',
    DEFAULT_TIME_TO: '23:59',
}));
jest.mock('../../../../../../utils/courseProgramme', () => ({
    PROGRAMME_LEVELS: {
        undergraduate: 'undergraduate',
        postgraduate: 'postgraduate',
    },
}));

import {
    getSectionFilterStatus,
    getFacultyDepartmentOptions,
    filterFacultyCoursesByDepartment,
    isCourseRecommended,
    isSectionRecommended,
    isSlotWithinTimeFilter,
} from '../hooks/useCourseFiltering';
import {
    DEPARTMENT_ALL,
    DEPARTMENT_UNSPECIFIED,
} from '../constants/options';

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
        from: '12:00',
        to: '13:00',
    };

    it('課節與篩選時段部分重疊時列入', () => {
        expect(isSlotWithinTimeFilter(
            makeSlot('TEST1000', '001', 'MON', '11:30', '12:45'),
            timeFilter,
        )).toBe(true);
    });

    it('課節只與篩選時段邊界相接時不列入', () => {
        expect(isSlotWithinTimeFilter(
            makeSlot('TEST1000', '001', 'MON', '11:00', '12:00'),
            timeFilter,
        )).toBe(false);
        expect(isSlotWithinTimeFilter(
            makeSlot('TEST1000', '001', 'MON', '13:00', '14:00'),
            timeFilter,
        )).toBe(false);
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

    it('符合時段但撞課時回傳 conflict 狀態', () => {
        expect(getSectionFilterStatus({
            sectionSlots: [
                makeSlot('TEST1000', '001', 'MON', '11:30', '12:45'),
            ],
            planSlots: [
                makeSlot('PLAN1000', '001', 'MON', '12:00', '13:00'),
            ],
            timeFilter: {
                day: 'MON',
                from: '12:00',
                to: '13:00',
            },
        })).toBe('conflict');
    });

    it('時間未完整的 Section 仍可標示符合時段，但不列為不衝突', () => {
        const sectionSlots = [
            makeSlot('TEST1000', '001', 'MON', '11:30', '12:45'),
            makeSlot('TEST1000', '001', '', '', ''),
        ];
        const timeFilter = {
            day: 'MON',
            from: '12:00',
            to: '13:00',
        };

        expect(getSectionFilterStatus({
            sectionSlots,
            timeFilter,
        })).toBe('time');
        expect(isSectionRecommended({
            sectionSlots,
            timeFilter,
        })).toBe(false);
    });
});

describe('研究生 Department 篩選', () => {
    const facultyCourses = [
        {'Course Code': 'FST-CIS', 'Offering Department': 'CIS'},
        {'Course Code': 'FST-ECE', 'Offering Department': 'ECE'},
        {'Course Code': 'FST-UNKNOWN', 'Offering Department': ''},
    ];

    it('提供全部及未指定學系選項', () => {
        expect(getFacultyDepartmentOptions(facultyCourses)).toEqual([
            DEPARTMENT_ALL,
            'CIS',
            'ECE',
            DEPARTMENT_UNSPECIFIED,
        ]);
    });

    it('只在目前學院資料內篩 Department', () => {
        const result = filterFacultyCoursesByDepartment(
            facultyCourses,
            'CIS',
        );

        expect(result.map(course => course['Course Code'])).toEqual([
            'FST-CIS',
        ]);
        expect(filterFacultyCoursesByDepartment(
            facultyCourses,
            DEPARTMENT_UNSPECIFIED,
        ).map(course => course['Course Code'])).toEqual([
            'FST-UNKNOWN',
        ]);
    });
});
