import harborEmojiShortcodes from './harborEmojiShortcodes.json';

// Discourse 常用別名（與 gemoji 名稱不完全一致）
const DISCOURSE_EMOJI_ALIASES = Object.freeze({
    plus: 'heavy_plus_sign',
    minus: 'heavy_minus_sign',
    slight_smile: 'slightly_smiling_face',
});

const HARBOR_EMOJI_SHORTCODES = Object.freeze({
    ...harborEmojiShortcodes,
    ...Object.fromEntries(
        Object.entries(DISCOURSE_EMOJI_ALIASES).map(([alias, target]) => [
            alias,
            harborEmojiShortcodes[target],
        ]),
    ),
});

const HARBOR_EMOJI_SHORTCODE_PATTERN = /:([a-zA-Z0-9_+-]+):/g;

export const getHarborHtmlAttribute = (tag, attribute) => {
    const expression = new RegExp(`${attribute}=(?:"([^"]*)"|'([^']*)')`, 'i');
    const match = tag.match(expression);
    return match?.[1] || match?.[2] || '';
};

// 將 :sob: 這類 Discourse shortcode 轉成 Unicode，供列表摘要等純文字場景使用
export const replaceHarborEmojiShortcodes = text => {
    if (!text || typeof text !== 'string') {
        return '';
    }

    return text.replace(HARBOR_EMOJI_SHORTCODE_PATTERN, (match, name) => {
        return HARBOR_EMOJI_SHORTCODES[name] || match;
    });
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
