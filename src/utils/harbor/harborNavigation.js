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

    if (section === 'search') {
        return {
            type: 'search',
            query: harborUrl.searchParams.get('q') || '',
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

const normalizeOptionalPostNumber = value => {
    const number = Number(value);
    return Number.isInteger(number) && number > 0 ? number : null;
};

/** 判斷 stack 中既有 Composer 是否對應同一回覆／編輯目標 */
export const isSameHarborComposerTarget = (routeParams, targetParams) => {
    const mode = targetParams?.mode || 'reply';
    if ((routeParams?.mode || 'reply') !== mode) {
        return false;
    }

    if (Number(routeParams?.topicId) !== Number(targetParams?.topicId)) {
        return false;
    }

    if (mode === 'edit') {
        return Number(routeParams?.postId) === Number(targetParams?.postId);
    }

    return (
        normalizeOptionalPostNumber(routeParams?.replyToPostNumber) ===
        normalizeOptionalPostNumber(targetParams?.replyToPostNumber)
    );
};

/**
 * 開啟 Harbor Composer：若 stack 已有同一目標，pop 回去避免重複疊層；
 * 否則才 navigate 新頁（保留既有 draftKey／fromDraftBox 等 params）。
 */
export const openHarborComposer = (navigation, params) => {
    const state = navigation?.getState?.();
    const routes = state?.routes;
    const currentIndex = Number.isInteger(state?.index) ? state.index : -1;

    if (Array.isArray(routes) && currentIndex > 0) {
        for (let index = currentIndex - 1; index >= 0; index -= 1) {
            const route = routes[index];
            if (
                route?.name === 'HarborComposer' &&
                isSameHarborComposerTarget(route.params, params)
            ) {
                const popCount = currentIndex - index;
                if (
                    popCount > 0 &&
                    typeof navigation.pop === 'function'
                ) {
                    navigation.pop(popCount);
                    return;
                }
                break;
            }
        }
    }

    navigation.navigate('HarborComposer', params);
};
