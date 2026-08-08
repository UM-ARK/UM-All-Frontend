import { buildAdddropCourseList } from '../utils/courseCatalog';

describe('buildAdddropCourseList', () => {
    test('按 Course Code 去重並排除 Section、Day、Time 欄位', () => {
        const result = buildAdddropCourseList([
            {
                'Course Code': 'TEST1000',
                'Course Title': 'Test Course',
                'Course Title Chi': '測試課程',
                'Offering Unit': 'FST',
                'Offering Department': 'CIS',
                'Course Type': 'Major',
                Section: '001',
                Day: 'MON',
                'Time From': '10:00',
                'Time To': '11:15',
            },
            {
                'Course Code': 'TEST1000',
                'Course Title': 'Test Course',
                Section: '002',
                Day: 'TUE',
                'Time From': '12:00',
                'Time To': '13:15',
            },
        ]);

        expect(result).toEqual([
            {
                'Course Code': 'TEST1000',
                'Course Title': 'Test Course',
                'Course Title Chi': '測試課程',
                'Offering Unit': 'FST',
                'Offering Department': 'CIS',
                'Course Type': 'Major',
            },
        ]);
        expect(result[0]).not.toHaveProperty('Section');
        expect(result[0]).not.toHaveProperty('Day');
        expect(result[0]).not.toHaveProperty('Time From');
    });
});
