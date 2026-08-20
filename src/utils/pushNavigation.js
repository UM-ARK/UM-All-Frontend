function positiveInteger(value) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getNotificationResponseId(response) {
    const identifier = response?.notification?.request?.identifier;
    const actionIdentifier = response?.actionIdentifier;
    if (!identifier) {
        return null;
    }
    return `${identifier}:${actionIdentifier || 'default'}`;
}

export function getHarborPushNavigationTarget(data) {
    if (!data || data.source !== 'harbor') {
        return null;
    }

    if (data.type === 'harbor_topic') {
        const topicId = positiveInteger(data.topicId);
        const postNumber = positiveInteger(data.postNumber);
        if (topicId) {
            return {
                routeName: 'HarborTopicDetail',
                params: {
                    topicId,
                    ...(postNumber ? {postNumber} : {}),
                },
                kind: 'topic',
            };
        }
    }

    // Chat 的真實 User API push 欄位及帳號 discriminator 尚待 canary 驗證。
    return {
        routeName: 'HarborInbox',
        params: undefined,
        kind: data.type === 'harbor_chat' ? 'chat_fallback' : 'inbox',
    };
}
