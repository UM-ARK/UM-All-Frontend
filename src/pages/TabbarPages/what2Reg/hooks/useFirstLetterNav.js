import { useMemo } from 'react';
import lodash from 'lodash';

/**
 * 根據課程代碼首字母計算側邊導航資料
 */
const useFirstLetterNav = ({ courseList, itemHeight }) => {
    const firstLetterList = useMemo(() => {
        return lodash.uniq(lodash.map(courseList || [], itm => itm['Course Code']?.[0]).filter(Boolean));
    }, [courseList]);

    const scrollData = useMemo(() => {
        const result = {};
        firstLetterList.forEach(letter => {
            const firstIndex = (courseList || []).findIndex(itm => itm['Course Code']?.[0] === letter);
            if (firstIndex !== -1) {
                result[letter] = firstIndex * itemHeight;
            }
        });
        return result;
    }, [firstLetterList, courseList, itemHeight]);

    return {
        firstLetterList,
        scrollData,
    };
};

export default useFirstLetterNav;
