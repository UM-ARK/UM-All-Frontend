import {
    getCourseCatalog,
    getPostgraduateCatalog,
} from '../../../utils/checkCoursesKits';
import {getLocalStorage} from '../../../utils/storageKits';
import {loadSavedCourseSlots} from '../utils/loadSavedCourseSlots';

jest.mock('../../../utils/checkCoursesKits', () => ({
    getCourseCatalog: jest.fn(),
    getPostgraduateCatalog: jest.fn(),
}));
jest.mock('../../../utils/storageKits', () => ({
    getLocalStorage: jest.fn(),
}));

describe('loadSavedCourseSlots', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('沒有模擬課表時不載入完整課程資料', async () => {
        getLocalStorage.mockResolvedValue([]);

        await expect(loadSavedCourseSlots()).resolves.toEqual({
            hasPlan: false,
            planSlots: [],
        });
        expect(getCourseCatalog).not.toHaveBeenCalled();
    });

    test('只展開已選 Course Code 與 Section 的課堂', async () => {
        getLocalStorage.mockResolvedValue([
            {'Course Code': 'TEST1000', Section: '001'},
        ]);
        getCourseCatalog.mockResolvedValue({
            Courses: [
                {
                    'Course Code': 'TEST1000',
                    Section: '001',
                    Day: 'MON',
                    'Time From': '10:00',
                    'Time To': '11:15',
                },
                {
                    'Course Code': 'TEST1000',
                    Section: '002',
                    Day: 'TUE',
                    'Time From': '10:00',
                    'Time To': '11:15',
                },
            ],
        });

        const result = await loadSavedCourseSlots();

        expect(result.hasPlan).toBe(true);
        expect(result.planSlots).toHaveLength(1);
        expect(result.planSlots[0].Section).toBe('001');
        expect(getCourseCatalog).toHaveBeenCalledWith('adddrop');
    });

    test('研究生模式讀取獨立課表與 catalog', async () => {
        getLocalStorage
            .mockResolvedValueOnce('postgraduate')
            .mockResolvedValueOnce([
                {'Course Code': 'PG1000', Section: '001'},
            ]);
        getPostgraduateCatalog.mockResolvedValue({
            catalog: {
                Courses: [
                    {
                        'Course Code': 'PG1000',
                        Section: '001',
                        Day: 'SAT',
                        'Time From': '10:00',
                        'Time To': '13:00',
                    },
                ],
            },
        });

        const result = await loadSavedCourseSlots();

        expect(result.planSlots).toHaveLength(1);
        expect(getPostgraduateCatalog).toHaveBeenCalledTimes(1);
        expect(getCourseCatalog).not.toHaveBeenCalled();
        expect(getLocalStorage).toHaveBeenNthCalledWith(
            2,
            'ARK_Timetable_Storage_postgraduate',
        );
    });
});
