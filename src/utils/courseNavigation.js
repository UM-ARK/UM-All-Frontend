// 選課 Tab 的導覽入口。全站只認這一個 helper，路由名調整時不必再掃各處呼叫點。

/** 底部 Tab 中選課頁的路由名 */
export const COURSE_TAB_ROUTE = 'CourseTab';

/** 選課頁內兩個段落（material top tabs）的路由名 */
export const COURSE_SEARCH_SEGMENT = 'CourseSearchSegment';
export const COURSE_TIMETABLE_SEGMENT = 'CourseTimetableSegment';

const SEGMENT_ROUTES = {
    search: COURSE_SEARCH_SEGMENT,
    timetable: COURSE_TIMETABLE_SEGMENT,
};

/**
 * 跳轉到選課 Tab 的指定段落。
 *
 * 採用 React Navigation 的 nested navigate（Stack → BottomTab → TopTab），
 * 參數直接落到段落自己的 route.params，容器不需要再解讀一次。
 *
 * @param {object} navigation React Navigation 的 navigation 物件
 * @param {object} [options]
 * @param {'search'|'timetable'} [options.segment] 目標段落；未指定時由 courseCode／add 推導，預設為課表
 * @param {string} [options.courseCode] 要查詢的課號，對應課表段落的 check 參數
 * @param {object} [options.add] 要直接加入課表的課節資料列
 */
export const navigateToCourseTab = (navigation, options = {}) => {
    if (!navigation) {
        return;
    }

    const { segment, courseCode, add } = options;
    const segmentRoute = SEGMENT_ROUTES[segment] ?? COURSE_TIMETABLE_SEGMENT;

    const segmentParams = {};
    if (courseCode) {
        segmentParams.check = courseCode;
    }
    if (add) {
        segmentParams.add = add;
    }

    navigation.navigate('Tabbar', {
        screen: COURSE_TAB_ROUTE,
        params: {
            screen: segmentRoute,
            params: segmentParams,
        },
    });
};
