export function normalizeAppSharePayload(payload) {
    if (!payload || typeof payload !== 'object') {
        return null;
    }
    const title = String(payload.title || '').trim();
    const url = String(payload.url || '').trim();
    const message = String(payload.message || '').trim();
    if (!url && !message) {
        return null;
    }
    const baseMessage = message || title;
    const shareMessage =
        url && !baseMessage.includes(url)
            ? [baseMessage, url].filter(Boolean).join('\n')
            : baseMessage;
    return {
        title,
        url,
        message: shareMessage,
    };
}

export function getRecentAppShareChannels(channels, limit = 8) {
    if (!Array.isArray(channels)) {
        return [];
    }
    return channels
        .filter(channel => channel?.id && !channel.isGroup)
        .map((channel, index) => ({channel, index}))
        .sort((left, right) => {
            const timeDifference =
                (Date.parse(right.channel.lastMessageAt) || 0) -
                (Date.parse(left.channel.lastMessageAt) || 0);
            return timeDifference || left.index - right.index;
        })
        .slice(0, limit)
        .map(entry => entry.channel);
}

export function getHarborAppShareMessage(payload) {
    if (!payload?.url) {
        return '';
    }
    return String(payload.message || payload.url).trim();
}

export function getSystemAppSharePayload(payload, platform) {
    if (!payload) {
        return null;
    }
    if (platform === 'ios' && payload.url) {
        const urlSuffix = `\n${payload.url}`;
        const message = payload.message.endsWith(urlSuffix)
            ? payload.message.slice(0, -urlSuffix.length)
            : payload.message;
        return {
            message: message || payload.title || '',
            url: payload.url,
        };
    }
    return {
        message: payload.message,
        ...(payload.title ? {title: payload.title} : {}),
    };
}
