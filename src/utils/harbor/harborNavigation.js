const decodePathSegment = segment => {
    try {
        return decodeURIComponent(segment);
    } catch {
        return segment;
    }
};

const parsePositiveInteger = value => {
    if (!/^\d+$/.test(value || '')) {
        return null;
    }

    const number = Number(value);
    return Number.isSafeInteger(number) && number > 0 ? number : null;
};

const createUrl = (url, harborBaseUrl) => {
    if (typeof url !== 'string' || !url.trim()) {
        return null;
    }

    try {
        return new URL(url.trim(), `${harborBaseUrl}/`);
    } catch {
        return null;
    }
};

export const parseHarborUrl = (url, harborBaseUrl) => {
    const harborUrl = createUrl(url, harborBaseUrl);
    const baseUrl = createUrl(harborBaseUrl, harborBaseUrl);

    if (
        !harborUrl ||
        !baseUrl ||
        !['http:', 'https:'].includes(harborUrl.protocol) ||
        harborUrl.origin !== baseUrl.origin
    ) {
        return null;
    }

    const segments = harborUrl.pathname
        .split('/')
        .filter(Boolean)
        .map(decodePathSegment);
    const [section] = segments;

    if (section === 't') {
        const topicIdIndex = segments.findIndex((segment, index) => {
            return index > 0 && parsePositiveInteger(segment) !== null;
        });
        const topicId = parsePositiveInteger(segments[topicIdIndex]);

        if (topicId) {
            const postNumber = parsePositiveInteger(segments[topicIdIndex + 1]);
            return {
                type: 'topic',
                topicId,
                ...(postNumber ? { postNumber } : {}),
            };
        }
    }

    if (section === 'c' && segments.length >= 3) {
        const categoryId = parsePositiveInteger(segments.at(-1));

        if (categoryId) {
            return {
                type: 'category',
                categoryId,
                categorySlug: segments.slice(1, -1).join('/'),
            };
        }
    }

    if (section === 'tag' && segments[1]) {
        return {
            type: 'tag',
            tag: segments[1],
        };
    }

    if (section === 'u' && segments[1]) {
        return {
            type: 'user',
            username: segments[1],
            url: harborUrl.toString(),
        };
    }

    return {
        type: 'web',
        url: harborUrl.toString(),
    };
};
