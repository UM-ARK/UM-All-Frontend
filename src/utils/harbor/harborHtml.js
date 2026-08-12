import harborEmojiShortcodes from './harborEmojiShortcodes.json';

// Discourse 常用別名（與 gemoji 名稱不完全一致）
const DISCOURSE_EMOJI_ALIASES = Object.freeze({
    plus: 'heavy_plus_sign',
    minus: 'heavy_minus_sign',
    slight_smile: 'slightly_smiling_face',
    smirking_face: 'smirk',
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

// Discourse cooked 常帶尾部空段落／換行，RenderHTML 會多佔一行高度
export const stripTrailingEmptyHarborHtml = html => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    let next = html;
    let previous;
    do {
        previous = next;
        next = next
            .replace(/(?:\s*<p>(?:\s|&nbsp;|\u00a0|<br\s*\/?>)*<\/p>)+$/gi, '')
            .replace(/(?:\s*<br\s*\/?>)+$/gi, '')
            .replace(/(?:\s|&nbsp;|\u00a0)+$/gi, '');
    } while (next !== previous);

    return next;
};

const EMPTY_BLOCK_PATTERN =
    /^(?:\s|&nbsp;|\u00a0|<br\s*\/?>|<p>(?:\s|&nbsp;|\u00a0|<br\s*\/?>)*<\/p>)+/i;

const escapeHarborHtmlAttribute = value =>
    String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;');

const hasHtmlClass = (tag, className) => {
    const classAttr = getHarborHtmlAttribute(tag, 'class');
    return classAttr.split(/\s+/).includes(className);
};

// 從 start 起匹配成對的 <div>...</div>（含巢狀）
const matchBalancedDiv = (html, start) => {
    if (!html.slice(start).match(/^<div\b/i)) {
        return null;
    }

    const tagPattern = /<\/?div\b[^>]*>/gi;
    tagPattern.lastIndex = start;
    let depth = 0;
    let match = tagPattern.exec(html);
    while (match) {
        if (/^<\/div/i.test(match[0])) {
            depth -= 1;
        } else {
            depth += 1;
        }
        if (depth === 0) {
            const end = match.index + match[0].length;
            return {
                html: html.slice(start, end),
                end,
            };
        }
        match = tagPattern.exec(html);
    }
    return null;
};

const extractImageFromBlockHtml = blockHtml => {
    const anchorMatch = blockHtml.match(/<a\b[^>]*>/i);
    const imageMatch = blockHtml.match(/<img\b[^>]*>/i);
    if (!imageMatch) {
        return null;
    }

    const imageTag = imageMatch[0];
    if (hasHtmlClass(imageTag, 'emoji')) {
        return null;
    }

    const src = getHarborHtmlAttribute(imageTag, 'src');
    if (!src) {
        return null;
    }

    const href = anchorMatch
        ? getHarborHtmlAttribute(anchorMatch[0], 'href')
        : '';
    const alt =
        getHarborHtmlAttribute(imageTag, 'alt') ||
        getHarborHtmlAttribute(imageTag, 'title') ||
        '';

    return {
        src,
        href: href || src,
        alt,
    };
};

// 匹配不含 <p> 包裹的單一圖片單元
const matchBareHarborImageUnitAt = (html, index) => {
    const remaining = html.slice(index);
    if (!remaining) {
        return null;
    }

    const divOpen = remaining.match(/^<div\b[^>]*>/i);
    if (divOpen && hasHtmlClass(divOpen[0], 'lightbox-wrapper')) {
        const balanced = matchBalancedDiv(html, index);
        if (!balanced) {
            return null;
        }
        const image = extractImageFromBlockHtml(balanced.html);
        if (!image) {
            return null;
        }
        return { end: balanced.end, image, html: balanced.html };
    }

    const imageTagMatch = remaining.match(/^<img\b[^>]*(?:\/>|>)/i);
    if (imageTagMatch) {
        const imageTag = imageTagMatch[0];
        if (hasHtmlClass(imageTag, 'emoji')) {
            return null;
        }
        const image = extractImageFromBlockHtml(imageTag);
        if (!image) {
            return null;
        }
        return {
            end: index + imageTag.length,
            image,
            html: imageTag,
        };
    }

    const anchorOpen = remaining.match(/^<a\b[^>]*>/i);
    if (anchorOpen && hasHtmlClass(anchorOpen[0], 'lightbox')) {
        const anchorClose = remaining.match(/<\/a>/i);
        if (!anchorClose) {
            return null;
        }
        const blockHtml = remaining.slice(
            0,
            anchorClose.index + anchorClose[0].length,
        );
        const image = extractImageFromBlockHtml(blockHtml);
        if (!image) {
            return null;
        }
        return {
            end: index + blockHtml.length,
            image,
            html: blockHtml,
        };
    }

    return null;
};

const INNER_IMAGE_GAP_PATTERN =
    /^(?:\s|&nbsp;|\u00a0|<br\s*\/?>)+/i;

// 解析「純圖片區塊」：獨立 lightbox/img，或僅含圖片的 <p>
const matchHarborImageBlocksAt = (html, index) => {
    const remaining = html.slice(index);
    if (!remaining) {
        return null;
    }

    const paragraphOpen = remaining.match(/^<p\b[^>]*>/i);
    if (paragraphOpen) {
        const innerStart = index + paragraphOpen[0].length;
        const closeMatch = html.slice(innerStart).match(/<\/p>/i);
        if (!closeMatch) {
            return null;
        }
        const innerEnd = innerStart + closeMatch.index;
        const paragraphEnd = innerEnd + closeMatch[0].length;
        const blocks = [];
        let cursor = innerStart;
        while (cursor < innerEnd) {
            const gap = html.slice(cursor, innerEnd).match(INNER_IMAGE_GAP_PATTERN);
            if (gap) {
                cursor += gap[0].length;
                continue;
            }
            const unit = matchBareHarborImageUnitAt(html, cursor);
            if (!unit || unit.end > innerEnd) {
                return null;
            }
            blocks.push(unit);
            cursor = unit.end;
        }
        if (blocks.length === 0) {
            return null;
        }
        // 單圖段落保留原 <p>，避免改變既有全寬排版 HTML
        if (blocks.length === 1) {
            return {
                end: paragraphEnd,
                blocks: [
                    {
                        ...blocks[0],
                        html: html.slice(index, paragraphEnd),
                    },
                ],
            };
        }
        return { end: paragraphEnd, blocks };
    }

    const unit = matchBareHarborImageUnitAt(html, index);
    if (!unit) {
        return null;
    }
    return { end: unit.end, blocks: [unit] };
};

const buildHarborImageGridHtml = images => {
    const children = images
        .map(image => {
            const src = escapeHarborHtmlAttribute(image.src);
            const href = escapeHarborHtmlAttribute(image.href);
            const alt = escapeHarborHtmlAttribute(image.alt);
            return `<harbor-grid-img src="${src}" href="${href}" alt="${alt}"></harbor-grid-img>`;
        })
        .join('');
    return `<harbor-image-grid>${children}</harbor-image-grid>`;
};

/**
 * 將連續純圖片區塊合併為 harbor-image-grid，供詳情頁以 3 列網格展示。
 * 單張圖片維持原 HTML，避免破壞既有全寬排版。
 */
export const groupConsecutiveHarborImages = html => {
    if (!html || typeof html !== 'string') {
        return '';
    }

    let result = '';
    let index = 0;
    const pendingImages = [];

    const flushImages = () => {
        if (pendingImages.length === 0) {
            return;
        }
        if (pendingImages.length === 1) {
            result += pendingImages[0].html;
        } else {
            result += buildHarborImageGridHtml(
                pendingImages.map(item => item.image),
            );
        }
        pendingImages.length = 0;
    };

    while (index < html.length) {
        const imageBlocks = matchHarborImageBlocksAt(html, index);
        if (imageBlocks) {
            pendingImages.push(...imageBlocks.blocks);
            index = imageBlocks.end;
            continue;
        }

        const emptyMatch = html.slice(index).match(EMPTY_BLOCK_PATTERN);
        if (emptyMatch) {
            const afterEmpty = index + emptyMatch[0].length;
            // 連續圖片之間的空白／空段落可略過，視為同一組
            if (
                pendingImages.length > 0 &&
                matchHarborImageBlocksAt(html, afterEmpty)
            ) {
                index = afterEmpty;
                continue;
            }
            flushImages();
            result += emptyMatch[0];
            index = afterEmpty;
            continue;
        }

        flushImages();
        // 消耗到下一個可能的圖片起點，避免逐字元過慢
        const nextCandidate = html.slice(index + 1).search(/<(?:p|div|a|img)\b/i);
        if (nextCandidate < 0) {
            result += html.slice(index);
            break;
        }
        const nextIndex = index + 1 + nextCandidate;
        result += html.slice(index, nextIndex);
        index = nextIndex;
    }

    flushImages();
    return result;
};
