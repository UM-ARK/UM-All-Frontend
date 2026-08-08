/**
 * 按需讀取模擬課表，避免把 CoursePlanProvider 搬到 App 根層。
 */
import {getCourseCatalog} from '../../../utils/checkCoursesKits';
import {getLocalStorage} from '../../../utils/storageKits';

const PLAN_STORAGE_KEY = 'ARK_Timetable_Storage';

/**
 * 讀取已選課程並展開成完整課堂時間。
 */
export async function loadSavedCourseSlots({includePlanList = false} = {}) {
    const planList = await getLocalStorage(PLAN_STORAGE_KEY);
    if (!Array.isArray(planList) || planList.length === 0) {
        return includePlanList
            ? {hasPlan: false, planList: [], planSlots: []}
            : {hasPlan: false, planSlots: []};
    }

    const courseData = await getCourseCatalog('adddrop');
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
