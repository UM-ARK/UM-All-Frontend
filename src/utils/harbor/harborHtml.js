export const getHarborHtmlAttribute = (tag, attribute) => {
    const expression = new RegExp(`${attribute}=(?:"([^"]*)"|'([^']*)')`, 'i');
    const match = tag.match(expression);
    return match?.[1] || match?.[2] || '';
};

export const replaceHarborEmojiImages = html => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    return html.replace(/<img\b[^>]*>/gi, tag => {
        const className = getHarborHtmlAttribute(tag, 'class');
        if (!className.split(/\s+/).includes('emoji')) {
            return tag;
        }

        const src = getHarborHtmlAttribute(tag, 'src');
        const label =
            getHarborHtmlAttribute(tag, 'alt') ||
            getHarborHtmlAttribute(tag, 'title');
        if (!src) {
            return label;
        }

        // 保留零寬字元，避免 RenderHTML 的空文字清理移除 emoji 節點。
        return `<harbor-emoji src="${src}" alt="${label}">\u200b</harbor-emoji>`;
    });
};
