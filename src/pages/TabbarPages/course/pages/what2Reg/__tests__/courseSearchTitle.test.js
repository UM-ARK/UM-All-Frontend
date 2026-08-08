import { buildSearchResults } from '../utils/search';
import {
    getCourseDisplayTitle,
    getCourseSectionDisplayTitle,
} from '../utils/courseTitle';

describe('What2Reg 體育課搜尋與顯示', () => {
    const offerCourseList = [
        {
            'Course Code': 'CPED1001',
            'Course Title': 'Physical Education I',
            'Course Title Chi': '體育一',
        },
    ];
    const adddropCourses = [
        {
            'Course Code': 'CPED1001',
            'Course Title': 'Physical Education I - Soccer',
            'Course Title Chi': '體育一-足球',
        },
    ];

    it('可用 Section 的中文項目搜尋體育課', () => {
        const result = buildSearchResults(
            '足球',
            offerCourseList,
            adddropCourses,
            adddropCourses,
        );

        expect(result).toHaveLength(1);
        expect(result[0]['Course Code']).toBe('CPED1001');
    });

    it('以教師搜尋時只回填課程摘要，不帶首個 Section 時間', () => {
        const result = buildSearchResults(
            'TEST TEACHER',
            [],
            [
                {
                    'Course Code': 'TEST1000',
                    'Course Title': 'Test Course',
                    'Teacher Information': 'Test Teacher',
                    Section: '001',
                    Day: 'MON',
                    'Time From': '10:00',
                },
            ],
            [
                {
                    'Course Code': 'TEST1000',
                    'Course Title': 'Test Course',
                },
            ],
        );

        expect(result).toEqual([
            {
                'Course Code': 'TEST1000',
                'Course Title': 'Test Course',
            },
        ]);
        expect(result[0]).not.toHaveProperty('Section');
        expect(result[0]).not.toHaveProperty('Day');
        expect(result[0]).not.toHaveProperty('Time From');
    });

    it('課程卡不顯示體育課的具體 Section 項目', () => {
        expect(
            getCourseDisplayTitle('CPED1001', 'Physical Education I - Soccer'),
        ).toBe('Physical Education I');
        expect(getCourseDisplayTitle('CPED1001', '體育一-足球')).toBe('體育一');
    });

    it('Section 卡片只顯示代表的運動項目', () => {
        expect(
            getCourseSectionDisplayTitle(
                'CPED1002',
                'Physical Education II - Rock Climbing',
            ),
        ).toBe('Rock Climbing');
        expect(
            getCourseSectionDisplayTitle('CPED1002', '體育二-攀岩'),
        ).toBe('攀岩');
    });

    it('其他課程標題保持不變', () => {
        expect(
            getCourseDisplayTitle('HIST1001', 'History - An Introduction'),
        ).toBe('History - An Introduction');
        expect(
            getCourseSectionDisplayTitle(
                'HIST1001',
                'History - An Introduction',
            ),
        ).toBe('History - An Introduction');
    });
});
