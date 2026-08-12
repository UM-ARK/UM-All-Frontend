import * as OpenCC from 'opencc-js';

const traditionalToSimplified = OpenCC.Converter({ from: 'tw', to: 'cn' });
const simplifiedToTraditional = OpenCC.Converter({ from: 'cn', to: 'tw' });

const getSearchVariants = (value) => {
    const normalized = value.toLowerCase();
    return [
        normalized,
        traditionalToSimplified(normalized),
        simplifiedToTraditional(normalized),
    ];
};

/** 依所有語言版本的標題篩選澳大活動或新聞 */
export function filterUMOpenDataItemsBySearchQuery(items, searchQuery) {
    const query = String(searchQuery || '').trim();
    if (!query) {
        return items || [];
    }

    const queryVariants = getSearchVariants(query);
    return (items || []).filter(item => (
        (item?.details || []).some(detail => {
            const title = detail?.title;
            if (typeof title !== 'string') {
                return false;
            }
            const titleVariants = getSearchVariants(title);
            return queryVariants.some(queryVariant => (
                titleVariants.some(titleVariant => titleVariant.includes(queryVariant))
            ));
        })
    ));
}
