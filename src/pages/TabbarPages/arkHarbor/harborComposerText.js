function normalizeSelection(text, selection) {
    const textLength = text.length;
    const start = Math.max(
        0,
        Math.min(Number(selection?.start) || 0, textLength),
    );
    const end = Math.max(
        start,
        Math.min(Number(selection?.end) || start, textLength),
    );
    return {start, end};
}

function wrapSelection(text, selection, prefix, suffix = prefix) {
    const {start, end} = normalizeSelection(text, selection);
    const selectedText = text.slice(start, end);
    const nextText =
        text.slice(0, start) +
        prefix +
        selectedText +
        suffix +
        text.slice(end);

    if (selectedText) {
        return {
            text: nextText,
            selection: {
                start: start + prefix.length,
                end: end + prefix.length,
            },
        };
    }

    return {
        text: nextText,
        selection: {
            start: start + prefix.length,
            end: start + prefix.length,
        },
    };
}

function insertLink(text, selection, linkLabel) {
    const {start, end} = normalizeSelection(text, selection);
    const selectedText = text.slice(start, end);
    const label = selectedText || linkLabel;
    const prefix = `[${label}](`;
    const url = 'https://';
    const nextText =
        text.slice(0, start) + prefix + url + ')' + text.slice(end);

    return {
        text: nextText,
        selection: {
            start: start + prefix.length,
            end: start + prefix.length + url.length,
        },
    };
}

function insertQuote(text, selection) {
    const {start, end} = normalizeSelection(text, selection);
    const lineStart = text.lastIndexOf('\n', start - 1) + 1;

    if (start === end) {
        const prefix = '> ';
        return {
            text: text.slice(0, lineStart) + prefix + text.slice(lineStart),
            selection: {
                start: start + prefix.length,
                end: start + prefix.length,
            },
        };
    }

    const effectiveEnd =
        end > start && text[end - 1] === '\n' ? end - 1 : end;
    const nextLineBreak = text.indexOf('\n', effectiveEnd);
    const lineEnd = nextLineBreak < 0 ? text.length : nextLineBreak;
    const quotedText = text
        .slice(lineStart, lineEnd)
        .split('\n')
        .map(line => `> ${line}`)
        .join('\n');
    return {
        text: text.slice(0, lineStart) + quotedText + text.slice(lineEnd),
        selection: {
            start: lineStart,
            end: lineStart + quotedText.length,
        },
    };
}

export function getHarborComposerResult(result) {
    const data = result?.data || result || {};
    const post = data?.post || {};
    const action = data?.action;
    const pending = action === 'enqueued' || Boolean(data?.pending_post);
    const topicId = Number(
        post.topicId ??
        post.topic_id ??
        data.topicId ??
        data.topic_id,
    );
    const postNumber = Number(
        post.postNumber ??
        post.post_number ??
        data.postNumber ??
        data.post_number,
    );

    return {
        pending,
        topicId:
            Number.isInteger(topicId) && topicId > 0 ? topicId : null,
        postNumber:
            Number.isInteger(postNumber) && postNumber > 0
                ? postNumber
                : null,
    };
}

export function applyHarborComposerFormat(
    text = '',
    selection,
    format,
    {linkLabel = 'link'} = {},
) {
    const normalizedText = String(text);

    switch (format) {
        case 'bold':
            return wrapSelection(normalizedText, selection, '**');
        case 'italic':
            return wrapSelection(normalizedText, selection, '*');
        case 'link':
            return insertLink(normalizedText, selection, linkLabel);
        case 'quote':
            return insertQuote(normalizedText, selection);
        case 'code':
            return wrapSelection(normalizedText, selection, '`');
        default:
            return {
                text: normalizedText,
                selection: normalizeSelection(normalizedText, selection),
            };
    }
}
