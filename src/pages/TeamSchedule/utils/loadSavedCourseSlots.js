/**
 * 按需讀取模擬課表，避免把 CoursePlanProvider 搬到 App 根層。
 */
import {
    getCourseCatalog,
    getPostgraduateCatalog,
} from '../../../utils/checkCoursesKits';
import {getLocalStorage} from '../../../utils/storageKits';
import {
    getCoursePlanStorageKey,
    getCourseProgrammeLevel,
    PROGRAMME_LEVELS,
} from '../../../utils/courseProgramme';

/**
 * 讀取已選課程並展開成完整課堂時間。
 */
export async function loadSavedCourseSlots({includePlanList = false} = {}) {
    const programmeLevel = await getCourseProgrammeLevel();
    const planList = await getLocalStorage(
        getCoursePlanStorageKey(programmeLevel),
    );
    if (!Array.isArray(planList) || planList.length === 0) {
        return includePlanList
            ? {hasPlan: false, planList: [], planSlots: []}
            : {hasPlan: false, planSlots: []};
    }

    const courseData = programmeLevel === PROGRAMME_LEVELS.postgraduate
        ? (await getPostgraduateCatalog()).catalog
        : await getCourseCatalog('adddrop');
    const courseTimeList = Array.isArray(courseData?.Courses)
        ? courseData.Courses
        : [];
    const selectedSections = new Set(
        planList.map(
            item => `${item?.['Course Code'] || ''}\u0000${item?.Section || ''}`,
        ),
    );
    const planSlots = courseTimeList.filter(item =>
        selectedSections.has(
            `${item?.['Course Code'] || ''}\u0000${item?.Section || ''}`,
        ),
    );

    return includePlanList
        ? {hasPlan: true, planList, planSlots}
        : {hasPlan: true, planSlots};
}

export default loadSavedCourseSlots;
