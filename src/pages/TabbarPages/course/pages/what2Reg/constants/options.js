import {
    DEFAULT_TIME_FROM,
    DEFAULT_TIME_TO,
} from '../../../constants';

// add drop, pre enroll 中文參考
export const adpeMap = {
    'ad': '增退選',
    'preEnroll': '預選課',
};

export const modeENStr = {
    'ad': 'Add Drop',
    'preEnroll': 'Pre Enroll',
};

export const DEPARTMENT_ALL = '__all__';
export const DEPARTMENT_UNSPECIFIED = '__unspecified__';

export const defaultFilterOptions = {
    mode: 'ad',
    option: 'CMRE',
    facultyName: 'FST',
    depaName: DEPARTMENT_ALL,
    GE: 'GEST',
};

export const CMGEList = ['CMRE', 'GE'];
export const dayList = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

export {DEFAULT_TIME_FROM, DEFAULT_TIME_TO};

// 星期／時段篩選刻意獨立於 defaultFilterOptions：
// filterOptions 會寫入 ARK_Courses_filterOptions，若記住星期會讓下次開 APP 出現無法解釋的空列表。
export const defaultTimeFilter = {
    day: null,
    from: DEFAULT_TIME_FROM,
    to: DEFAULT_TIME_TO,
};
