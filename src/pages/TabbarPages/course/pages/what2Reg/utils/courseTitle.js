const PHYSICAL_EDUCATION_COURSE_PREFIX = 'CPED';

/**
 * 體育課各 Section 的課名包含具體項目，課程列表只顯示共同課名。
 */
export const getCourseDisplayTitle = (courseCode, title) => {
    if (!courseCode?.startsWith(PHYSICAL_EDUCATION_COURSE_PREFIX)) {
        return title;
    }

    return title?.replace(/\s*-\s*.*$/, '') ?? title;
};

/**
 * 體育課 Section 只顯示共同課名後的運動項目。
 */
export const getCourseSectionDisplayTitle = (courseCode, title) => {
    if (!courseCode?.startsWith(PHYSICAL_EDUCATION_COURSE_PREFIX)) {
        return title;
    }

    return title?.replace(/^.*?\s*-\s*/, '') ?? title;
};
