import { getLocalStorage, setLocalStorage } from './storageKits';

export const PROGRAMME_LEVELS = {
    undergraduate: 'undergraduate',
    postgraduate: 'postgraduate',
};

export const DEFAULT_PROGRAMME_LEVEL = PROGRAMME_LEVELS.undergraduate;
export const PROGRAMME_LEVEL_STORAGE_KEY = 'ARK_CourseProgrammeLevel';

const PLAN_STORAGE_KEYS = {
    undergraduate: 'ARK_Timetable_Storage',
    postgraduate: 'ARK_Timetable_Storage_postgraduate',
};

const WEEK_PLAN_STORAGE_KEYS = {
    undergraduate: 'ARK_WeekTimetable_Storage',
    postgraduate: 'ARK_WeekTimetable_Storage_postgraduate',
};

const FILTER_STORAGE_KEYS = {
    undergraduate: 'ARK_Courses_filterOptions',
    postgraduate: 'ARK_Courses_filterOptions_postgraduate',
};

export const isProgrammeLevel = level =>
    Object.values(PROGRAMME_LEVELS).includes(level);

export async function getCourseProgrammeLevel() {
    const storedLevel = await getLocalStorage(PROGRAMME_LEVEL_STORAGE_KEY);
    return isProgrammeLevel(storedLevel)
        ? storedLevel
        : DEFAULT_PROGRAMME_LEVEL;
}

export async function setCourseProgrammeLevel(level) {
    if (!isProgrammeLevel(level)) {
        throw new Error('Unknown course programme level');
    }
    return setLocalStorage(PROGRAMME_LEVEL_STORAGE_KEY, level);
}

export const getCoursePlanStorageKey = level =>
    PLAN_STORAGE_KEYS[level] || PLAN_STORAGE_KEYS.undergraduate;

export const getCourseWeekPlanStorageKey = level =>
    WEEK_PLAN_STORAGE_KEYS[level] || WEEK_PLAN_STORAGE_KEYS.undergraduate;

export const getCourseFilterStorageKey = level =>
    FILTER_STORAGE_KEYS[level] || FILTER_STORAGE_KEYS.undergraduate;
