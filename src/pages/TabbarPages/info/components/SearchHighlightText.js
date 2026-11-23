import React, { useMemo } from 'react';

import Text from '../../../../components/AppText';
import { buildTitleHighlightParts } from '../utils/umOpenDataSearch';

/** 依搜尋詞把標題中命中的片段高亮 */
const SearchHighlightText = ({
    text,
    query,
    style,
    highlightStyle,
    numberOfLines,
}) => {
    const parts = useMemo(
        () => buildTitleHighlightParts(text, query),
        [text, query],
    );

    return (
        <Text numberOfLines={numberOfLines} style={style}>
            {parts.map((part, index) => (
                <Text
                    key={`${index}-${part.highlight ? '1' : '0'}`}
                    style={part.highlight ? highlightStyle : null}>
                    {part.text}
                </Text>
            ))}
        </Text>
    );
};

export default SearchHighlightText;
