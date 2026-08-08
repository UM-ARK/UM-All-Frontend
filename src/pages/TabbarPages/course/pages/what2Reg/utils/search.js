import lodash from 'lodash';
import * as OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

/**
 * 根據輸入字串篩選課程
 * - 支援課程代碼、英文課名、中文課名
 * - 支援簡體輸入自動轉繁體比對
 * - 額外合併課表資料再去重
 */
export function buildSearchResults(
    text,
    offerCourseList,
    adddropCourses,
    adddropCourseList = [],
) {
    const upperText = (text || '').toUpperCase();

    let result = (offerCourseList || []).filter(itm => {
        return itm['Course Code']?.toUpperCase().indexOf(upperText) !== -1
            || itm['Course Title']?.toUpperCase().indexOf(upperText) !== -1
            || itm['Course Title Chi']?.indexOf(upperText) !== -1
            || itm['Course Title Chi']?.indexOf(converter(upperText)) !== -1;
    });

    if ((adddropCourses || []).length > 0) {
        const matchingCourseCodes = new Set(
            adddropCourses.filter(itm => {
                return itm['Course Code']?.toUpperCase().indexOf(upperText) !== -1
                || itm['Course Title']?.toUpperCase().indexOf(upperText) !== -1
                || itm['Teacher Information']?.toUpperCase().indexOf(upperText) !== -1
                || itm.Day?.toUpperCase().indexOf(upperText) !== -1
                || itm['Offering Department']?.toUpperCase().indexOf(upperText) !== -1
                || itm['Offering Unit']?.toUpperCase().indexOf(upperText) !== -1
                || itm['Course Title Chi']?.indexOf(upperText) !== -1;
            }).map(itm => itm['Course Code']),
        );
        const adddropSearchList = adddropCourseList.filter(itm =>
            matchingCourseCodes.has(itm['Course Code']),
        );

        result = lodash.uniqBy(result.concat(adddropSearchList), 'Course Code');
    }

    return lodash.sortBy(result, ['Course Code']);
}
