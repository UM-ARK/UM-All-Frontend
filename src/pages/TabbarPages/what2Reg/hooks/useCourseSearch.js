import { useMemo, useState } from 'react';
import { hasChinese } from '../utils/text';
import { buildSearchResults } from '../utils/search';

/**
 * 管理搜尋輸入與候選結果
 * - 中文：輸入長度 > 0 即開始搜尋
 * - 非中文：輸入長度 > 2 才開始搜尋
 */
const useCourseSearch = ({ offerCourseList, coursePlanTimeCourses }) => {
    const [inputText, setInputText] = useState('');

    const inputOK = inputText.length > 0;

    const searchFilterCourse = useMemo(() => {
        if (hasChinese(inputText)) {
            return inputText.length > 0
                ? buildSearchResults(inputText, offerCourseList, coursePlanTimeCourses)
                : null;
        }

        return inputText.length > 2
            ? buildSearchResults(inputText, offerCourseList, coursePlanTimeCourses)
            : null;
    }, [inputText, offerCourseList, coursePlanTimeCourses]);

    const clearInput = () => {
        setInputText('');
    };

    return {
        inputText,
        inputOK,
        setInputText,
        clearInput,
        searchFilterCourse,
    };
};

export default useCourseSearch;
