import { getHarborHtmlAttribute } from './harborHtml';

// Discourse Post Event：優先用 API 的 post.event，否則從 cooked 空容器 data 屬性解析。
const parseHarborPostEventFromCooked = html => {
    if (!html || typeof html !== 'string') {
        return null;
    }

    const match = html.match(
        /<div\b[^>]*\bclass=(?:"[^"]*\bdiscourse-post-event\b[^"]*"|'[^']*\bdiscourse-post-event\b[^']*')[^>]*>/i,
    );
    if (!match) {
        return null;
    }

    const tag = match[0];
    const name = getHarborHtmlAttribute(tag, 'data-name');
    const startsAt = getHarborHtmlAttribute(tag, 'data-start');
    if (!name && !startsAt) {
        return null;
    }

    return {
        name: name || '',
        startsAt: startsAt || null,
        endsAt: getHarborHtmlAttribute(tag, 'data-end') || null,
        timezone: getHarborHtmlAttribute(tag, 'data-timezone') || null,
        location: getHarborHtmlAttribute(tag, 'data-location') || '',
        creatorUsername: '',
        isExpired: false,
        isOngoing: false,
        isClosed: false,
        goingCount: 0,
    };
};

export const parseHarborPostEvent = post => {
    const apiEvent = post?.event;
    if (apiEvent && typeof apiEvent === 'object') {
        return {
            name: apiEvent.name || '',
            startsAt: apiEvent.starts_at || null,
            endsAt: apiEvent.ends_at || null,
            timezone: apiEvent.timezone || null,
            location: apiEvent.location || '',
            creatorUsername: apiEvent.creator?.username || '',
            isExpired: Boolean(apiEvent.is_expired),
            isOngoing: Boolean(apiEvent.is_ongoing),
            isClosed: Boolean(apiEvent.is_closed),
            goingCount: Number(apiEvent.stats?.going || 0),
        };
    }

    return parseHarborPostEventFromCooked(post?.cooked);
};

export const HARBOR_INTERACTIVE_CONTENT_PATTERN =
    /<(?:video|audio)\b|class=(?:"[^"]*\b(?:poll|discourse-post-event)\b[^"]*"|'[^']*\b(?:poll|discourse-post-event)\b[^']*')/i;

export const hasHarborInteractiveContent = html => {
    return HARBOR_INTERACTIVE_CONTENT_PATTERN.test(html || '');
};
