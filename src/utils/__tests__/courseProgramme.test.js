import {
    DEFAULT_PROGRAMME_LEVEL,
    getCourseFilterStorageKey,
    getCoursePlanStorageKey,
    getCourseProgrammeLevel,
    getCourseWeekPlanStorageKey,
    PROGRAMME_LEVELS,
    setCourseProgrammeLevel,
} from '../courseProgramme';
import {getLocalStorage, setLocalStorage} from '../storageKits';

jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

describe('courseProgramme', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        setLocalStorage.mockResolvedValue('ok');
    });

    test('未知或缺少設定時使用本科', async () => {
        getLocalStorage.mockResolvedValue('unknown');

        await expect(getCourseProgrammeLevel()).resolves.toBe(
            DEFAULT_PROGRAMME_LEVEL,
        );
    });

    test('本科與研究生使用獨立課表、週課表及篩選鍵', () => {
        expect(getCoursePlanStorageKey(PROGRAMME_LEVELS.undergraduate)).toBe(
            'ARK_Timetable_Storage',
        );
        expect(getCoursePlanStorageKey(PROGRAMME_LEVELS.postgraduate)).toBe(
            'ARK_Timetable_Storage_postgraduate',
        );
        expect(getCourseWeekPlanStorageKey(PROGRAMME_LEVELS.postgraduate)).toBe(
            'ARK_WeekTimetable_Storage_postgraduate',
        );
        expect(getCourseFilterStorageKey(PROGRAMME_LEVELS.postgraduate)).toBe(
            'ARK_Courses_filterOptions_postgraduate',
        );
        const historicalPeriod = {
            isHistorical: true,
            year: 2025,
            sem: '2',
        };
        expect(getCoursePlanStorageKey(
            PROGRAMME_LEVELS.undergraduate,
            historicalPeriod,
        )).toBe('ARK_Timetable_Storage_history_2025_2');
        expect(getCourseWeekPlanStorageKey(
            PROGRAMME_LEVELS.postgraduate,
            historicalPeriod,
        )).toBe(
            'ARK_WeekTimetable_Storage_postgraduate_history_2025_2',
        );
    });

    test('只保存合法課表模式', async () => {
        await expect(setCourseProgrammeLevel('unknown')).rejects.toThrow(
            'Unknown course programme level',
        );
        await expect(setCourseProgrammeLevel('postgraduate')).resolves.toBe(
            'ok',
        );
    });
});
