import lodash from 'lodash';
import * as OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });

export const getSearchMatchRanges = (value, query) => {
    const text = String(value || '').toUpperCase();
    const upperQuery = (query || '').toUpperCase();
    if (!upperQuery) {
        return [];
    }

    const ranges = [];
    lodash.uniq([upperQuery, converter(upperQuery)]).forEach(keyword => {
        let start = text.indexOf(keyword);
        while (start !== -1) {
            ranges.push({ start, end: start + keyword.length });
            start = text.indexOf(keyword, start + 1);
        }
    });

    return lodash.sortBy(ranges, 'start').reduce((merged, range) => {
        const previous = merged[merged.length - 1];
        if (previous && range.start <= previous.end) {
            previous.end = Math.max(previous.end, range.end);
        } else {
            merged.push({ ...range });
        }
        return merged;
    }, []);
};

// 每種欄位保留一則命中片段，省略前後文或其他匹配時顯示省略號。
const getMatchedSearchText = (values, query) => {
    const matches = lodash.uniq(values.filter(Boolean)).filter(value =>
        getSearchMatchRanges(value, query).length > 0,
    );
    if (matches.length === 0) {
        return null;
    }

    const value = matches[0];
    const [match] = getSearchMatchRanges(value, query);
    const start = Math.max(0, match.start - 16);
    const end = Math.min(value.length, match.end + 24);
    return `${start > 0 ? '…' : ''}${value.slice(start, end)}${end < value.length || matches.length > 1 ? '…' : ''}`;
};

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
    const keywords = lodash.uniq([upperText, converter(upperText)]);
    const matchesSearch = value => value && keywords.some(keyword =>
        value.toUpperCase().includes(keyword),
    );

    let result = (offerCourseList || []).filter(itm => {
        return [itm['Course Code'], itm['Course Title'], itm['Course Title Chi']]
            .some(matchesSearch);
    });

    if ((adddropCourses || []).length > 0) {
        const matchingCourseCodes = new Set(
            adddropCourses.filter(itm => {
                return [
                    itm['Course Code'],
                    itm['Course Title'],
                    itm['Teacher Information'],
                    itm.Day,
                    itm['Offering Department'],
                    itm['Offering Unit'],
                    itm['Course Title Chi'],
                ].some(matchesSearch);
            }).map(itm => itm['Course Code']),
        );
        const adddropSearchList = adddropCourseList.filter(itm =>
            matchingCourseCodes.has(itm['Course Code']),
        );

        result = lodash.uniqBy(result.concat(adddropSearchList), 'Course Code');
    }

    const sectionsByCourseCode = lodash.groupBy(adddropCourses || [], 'Course Code');
    return lodash.sortBy(result, ['Course Code']).map(item => {
        const rows = [item, ...(sectionsByCourseCode[item['Course Code']] || [])];
        return {
            ...item,
            searchMatch: {
                query: text,
                title: getMatchedSearchText(rows.map(row => row['Course Title']), text),
                titleChi: getMatchedSearchText(rows.map(row => row['Course Title Chi']), text),
                teacher: getMatchedSearchText(rows.map(row => row['Teacher Information']), text),
            },
        };
    });
}
