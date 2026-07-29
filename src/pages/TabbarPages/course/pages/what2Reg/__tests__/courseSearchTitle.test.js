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
    const coursePlanTimeCourses = [
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
            coursePlanTimeCourses,
        );

        expect(result).toHaveLength(1);
        expect(result[0]['Course Code']).toBe('CPED1001');
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
