import lodash from 'lodash';

const ADDDROP_COURSE_FIELDS = [
    'Course Code',
    'Course Title',
    'Course Title Chi',
    'Offering Unit',
    'Offering Department',
    'Course Type',
];

/**
 * 從完整 Add Drop 課節衍生課程級清單，不保留首個 Section 的時間欄位。
 *
 * @param {Array<Object>} courses 完整 Add Drop 課節
 * @returns {Array<Object>} 依 Course Code 去重的課程摘要
 */
export const buildAdddropCourseList = courses =>
    lodash
        .chain(courses || [])
        .uniqBy('Course Code')
        .map(course => lodash.pick(course, ADDDROP_COURSE_FIELDS))
        .value();
