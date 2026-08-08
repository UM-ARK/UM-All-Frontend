import offerCourses from './offerCourses';
import bundledAdddropData from './coursePlanTime';
import courseVersion from './courseVersion';

export const preenrollCatalog = {
    schemaVersion: 2,
    mode: 'preenroll',
    updateTime: offerCourses.updateTime,
    academicYear: offerCourses.academicYear,
    sem: offerCourses.sem,
    revision: `preenroll-${offerCourses.updateTime}-bundled`,
    Courses: offerCourses.Courses,
};

export const adddropCatalog = {
    schemaVersion: 2,
    mode: 'adddrop',
    updateTime: courseVersion.adddrop.updateTime,
    academicYear: courseVersion.adddrop.academicYear,
    sem: courseVersion.adddrop.sem,
    revision: `adddrop-${courseVersion.adddrop.updateTime}-bundled`,
    Courses: bundledAdddropData.Courses,
};
