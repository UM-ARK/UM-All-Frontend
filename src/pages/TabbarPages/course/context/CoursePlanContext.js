import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import lodash from 'lodash';
import moment from 'moment';

import useCourseData from '../pages/what2Reg/hooks/useCourseData';
import {
    getSectionConflicts as computeSectionConflicts,
    useConflict,
} from '../hooks/useConflict';
import parseImportData from '../utils/parseImportData';
import { buildAdddropCourseList } from '../utils/courseCatalog';
import { getLocalStorage, setLocalStorage } from '../../../../utils/storageKits';
import { useProgrammeLevel } from '../../../../contexts/ProgrammeLevelContext';
import {
    getCoursePlanStorageKey,
    getCourseWeekPlanStorageKey,
    PROGRAMME_LEVELS,
} from '../../../../utils/courseProgramme';

const CoursePlanContext = createContext(null);

/**
 * 由選課清單展開為完整課節列表。
 *
 * @param {Array<{'Course Code': string, Section: string}>} planList 選課清單
 * @param {Array<Object>} courseTimeList 該學期所有含時間的課節
 * @returns {Array<Object>} 使用者一週內的所有課節
 */
const buildPlanSlots = (planList, courseTimeList) =>
    lodash
        .chain(planList)
        .map(codeSection =>
            lodash.filter(
                courseTimeList,
                courseTime =>
                    courseTime['Course Code'] === codeSection['Course Code'] &&
                    courseTime.Section === codeSection.Section,
            ),
        )
        .flatten()
        .value();

/**
 * 整理成首頁「下節課」使用的一週課表結構。
 *
 * @param {Array<Object>} planSlots 使用者的所有課節
 * @returns {Object} key 為 Day，value 為該天依 Time From 排序的課節陣列
 */
const buildWeekPlan = planSlots =>
    lodash
        .chain(planSlots)
        .groupBy('Day')
        .mapValues(courses =>
            lodash
                .chain(courses)
                .map(courseTime => ({
                    'Course Code': courseTime['Course Code'],
                    Section: courseTime.Section,
                    'Time From': courseTime['Time From'],
                    // 課程 JSON 並無 color 欄位，此處實際寫入 undefined。
                    // 首頁讀取端已依賴這個格式，補上顏色會改變既有儲存結構，故照原樣保留。
                    color: courseTime.color,
                }))
                .sortBy(course => moment(course['Time From'], 'HH:mm'))
                .value(),
        )
        .value();

/**
 * 選課 Tab 的共享狀態：課程資料、模擬排課、衝突判斷。
 *
 * 本 Provider 不做任何 UI 副作用（觸覺、Toast、Alert、導覽、埋點），
 * 這些一律留給呼叫端頁面處理。
 */
export const CoursePlanProvider = ({ children }) => {
    const { programmeLevel } = useProgrammeLevel();
    const {
        courseMode,
        setCourseMode,
        preenrollCatalog,
        adddropCatalog,
        postgraduateCatalog,
        catalogMetadata,
        initCourseData,
        refreshCourseData,
    } = useCourseData();

    const [planList, setPlanList] = useState([]);

    const planStorageKey = getCoursePlanStorageKey(programmeLevel);
    const weekPlanStorageKey = getCourseWeekPlanStorageKey(programmeLevel);

    const courseTimeList = useMemo(
        () => programmeLevel === PROGRAMME_LEVELS.postgraduate
            ? postgraduateCatalog?.Courses || []
            : adddropCatalog?.Courses || [],
        [adddropCatalog, postgraduateCatalog, programmeLevel],
    );

    const adddropCourseList = useMemo(
        () => buildAdddropCourseList(adddropCatalog?.Courses),
        [adddropCatalog],
    );

    const postgraduateCourseList = useMemo(
        () => buildAdddropCourseList(postgraduateCatalog?.Courses),
        [postgraduateCatalog],
    );

    const activeCourseList = programmeLevel === PROGRAMME_LEVELS.postgraduate
        ? postgraduateCourseList
        : adddropCourseList;

    const sectionsByCourseCode = useMemo(
        () => lodash.groupBy(courseTimeList, 'Course Code'),
        [courseTimeList],
    );

    const planSlots = useMemo(
        () => buildPlanSlots(planList, courseTimeList),
        [planList, courseTimeList],
    );

    const planCourseCodes = useMemo(
        () => planList.map(item => item['Course Code']),
        [planList],
    );

    // 同一個事件中可能連續呼叫多次增刪，用 ref 取代 state 閉包避免讀到舊清單
    const planListRef = useRef(planList);
    const loadedPlanStorageKeyRef = useRef(null);
    useEffect(() => {
        planListRef.current = planList;
    }, [planList]);

    /**
     * 套用新的選課清單並寫回儲存（對應舊 courseSim 的 handleCourseList）。
     *
     * @param {Array<{'Course Code': string, Section: string}>} nextPlanList 新的選課清單
     */
    const commitPlan = useCallback(
        nextPlanList => {
            const nextPlanSlots = buildPlanSlots(nextPlanList, courseTimeList);

            setLocalStorage(weekPlanStorageKey, buildWeekPlan(nextPlanSlots));
            planListRef.current = nextPlanList;
            setPlanList(nextPlanList);
            setLocalStorage(planStorageKey, nextPlanList);
        },
        [courseTimeList, planStorageKey, weekPlanStorageKey],
    );

    // 掛載時還原選課清單。還原本身不回寫，避免蓋掉尚未讀取完成的儲存內容
    useEffect(() => {
        let cancelled = false;

        loadedPlanStorageKeyRef.current = null;
        planListRef.current = [];
        setPlanList([]);

        getLocalStorage(planStorageKey).then(storedPlanList => {
            if (cancelled) {
                return;
            }
            const nextPlanList = Array.isArray(storedPlanList)
                ? storedPlanList
                : [];
            loadedPlanStorageKeyRef.current = planStorageKey;
            planListRef.current = nextPlanList;
            setPlanList(nextPlanList);
        });

        return () => {
            cancelled = true;
        };
    }, [planStorageKey]);

    // planList 的寫入由 commitPlan 負責，這裡只處理課程資料更新的情況：
    // 同一個 section 的上課時間可能被改動，需重算課節並更新首頁依賴的週課表
    useEffect(() => {
        if (loadedPlanStorageKeyRef.current !== planStorageKey) {
            return;
        }
        if (planListRef.current.length === 0) {
            return;
        }
        commitPlan(planListRef.current);
    }, [courseTimeList, commitPlan, planStorageKey]);

    /**
     * 加入單一 section，同一 Course Code 的既有選擇會被取代。
     *
     * @param {{'Course Code': string, Section: string}} courseRow 課節或選課列
     */
    const addCourse = useCallback(
        courseRow => {
            commitPlan([
                ...lodash.filter(
                    planListRef.current,
                    item => item['Course Code'] !== courseRow['Course Code'],
                ),
                {
                    'Course Code': courseRow['Course Code'],
                    Section: courseRow.Section,
                },
            ]);
        },
        [commitPlan],
    );

    /**
     * 一次加入某課程的所有 section。
     *
     * @param {string} courseCode 課程代碼
     * @param {Object} sectionObj 以 Section 為 key 的物件（lodash.groupBy 結果）
     */
    const addAllSections = useCallback(
        (courseCode, sectionObj) => {
            commitPlan([
                ...lodash.filter(
                    planListRef.current,
                    item => item['Course Code'] !== courseCode,
                ),
                ...lodash.map(Object.keys(sectionObj || {}), key => ({
                    'Course Code': courseCode,
                    Section: key,
                })),
            ]);
        },
        [commitPlan],
    );

    /**
     * 移除指定 Course Code + Section。
     *
     * @param {{'Course Code': string, Section: string}} courseRow 課節或選課列
     */
    const dropCourse = useCallback(
        courseRow => {
            commitPlan(
                lodash.filter(
                    planListRef.current,
                    item =>
                        !(
                            item['Course Code'] === courseRow['Course Code'] &&
                            item.Section === courseRow.Section
                        ),
                ),
            );
        },
        [commitPlan],
    );

    /**
     * 移除某課程的全部 section。
     *
     * @param {string} courseCode 課程代碼
     */
    const dropAllSections = useCallback(
        courseCode => {
            commitPlan(
                lodash.filter(
                    planListRef.current,
                    item => item['Course Code'] !== courseCode,
                ),
            );
        },
        [commitPlan],
    );

    /** 清空模擬課表。兩個儲存鍵一律寫成 []，與舊版行為一致 */
    const clearPlan = useCallback(() => {
        planListRef.current = [];
        setPlanList([]);
        setLocalStorage(planStorageKey, []);
        setLocalStorage(weekPlanStorageKey, []);
    }, [planStorageKey, weekPlanStorageKey]);

    /**
     * 匯入 UM ISW 課表文字。
     *
     * @param {string} text ISW 課表原始文字
     * @returns {boolean} 是否解析成功並已套用
     */
    const importFromISW = useCallback(
        text => {
            const parseRes = parseImportData(text);
            if (!parseRes) {
                return false;
            }

            commitPlan(parseRes);
            return true;
        },
        [commitPlan],
    );

    const { conflictPairs, conflictCount, hasConflict, conflictSlotKeys } =
        useConflict(planSlots);

    /**
     * 判斷課程在課表中的加入狀態。
     *
     * @param {string} courseCode 課程代碼
     * @returns {'added'|'partial'|'none'} 全部 section 已加入／部分加入／未加入
     */
    const getCourseStatus = useCallback(
        courseCode => {
            const addedSectionCount = lodash
                .chain(planList)
                .filter(item => item['Course Code'] === courseCode)
                .map('Section')
                .uniq()
                .value().length;

            if (addedSectionCount === 0) {
                return 'none';
            }

            const totalSectionCount = lodash
                .chain(sectionsByCourseCode[courseCode] || [])
                .map('Section')
                .uniq()
                .value().length;

            return addedSectionCount >= totalSectionCount ? 'added' : 'partial';
        },
        [planList, sectionsByCourseCode],
    );

    /**
     * 計算候選 section 與目前課表的碰撞。
     *
     * @param {Array<Object>} candidateSlots 候選 section 的所有課節
     * @returns {Array<Object>} 撞到的既有課節描述
     */
    const getSectionConflicts = useCallback(
        candidateSlots => computeSectionConflicts(candidateSlots, planSlots),
        [planSlots],
    );

    const value = useMemo(
        () => ({
            programmeLevel,
            courseMode,
            setCourseMode,
            preenrollCatalog,
            adddropCatalog,
            postgraduateCatalog,
            catalogMetadata,
            initCourseData,
            refreshCourseData,
            courseTimeList,
            adddropCourseList,
            postgraduateCourseList,
            activeCourseList,
            sectionsByCourseCode,
            planList,
            planSlots,
            planCourseCodes,
            commitPlan,
            addCourse,
            addAllSections,
            dropCourse,
            dropAllSections,
            clearPlan,
            importFromISW,
            conflictPairs,
            conflictCount,
            hasConflict,
            conflictSlotKeys,
            getCourseStatus,
            getSectionConflicts,
        }),
        [
            programmeLevel,
            courseMode,
            setCourseMode,
            preenrollCatalog,
            adddropCatalog,
            postgraduateCatalog,
            catalogMetadata,
            initCourseData,
            refreshCourseData,
            courseTimeList,
            adddropCourseList,
            postgraduateCourseList,
            activeCourseList,
            sectionsByCourseCode,
            planList,
            planSlots,
            planCourseCodes,
            commitPlan,
            addCourse,
            addAllSections,
            dropCourse,
            dropAllSections,
            clearPlan,
            importFromISW,
            conflictPairs,
            conflictCount,
            hasConflict,
            conflictSlotKeys,
            getCourseStatus,
            getSectionConflicts,
        ],
    );

    return (
        <CoursePlanContext.Provider value={value}>
            {children}
        </CoursePlanContext.Provider>
    );
};

/**
 * 取用選課共享狀態。
 *
 * @returns {Object} CoursePlanProvider 提供的完整 API
 */
export const useCoursePlan = () => {
    const context = useContext(CoursePlanContext);

    if (!context) {
        throw new Error('useCoursePlan 必須在 CoursePlanProvider 內使用');
    }

    return context;
};

export default CoursePlanContext;
