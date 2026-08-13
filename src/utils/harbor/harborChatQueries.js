import {
    patchHarborQueryCache,
    patchHarborQueryCachePrefix,
    readHarborQueryCache,
    setHarborQueryNamespaceLimit,
    writeHarborQueryCache,
} from './harborQueryCache';

export const HARBOR_CHAT_MESSAGES_NAMESPACE = 'chat-messages';
export const HARBOR_CHAT_MESSAGES_STALE_MS = 5 * 60 * 1000;

setHarborQueryNamespaceLimit(HARBOR_CHAT_MESSAGES_NAMESPACE, 10);

export function getHarborChatMessagesCacheKey(
    username,
    channelId,
    targetMessageId,
) {
    const targetId = Number(targetMessageId);
    return [
        'chat-messages',
        String(username || '').trim().toLowerCase(),
        Number(channelId),
        Number.isInteger(targetId) && targetId > 0
            ? `target:${targetId}`
            : 'latest',
    ];
}

export function readHarborChatMessagesCache(key) {
    return readHarborQueryCache(key, {
        namespace: HARBOR_CHAT_MESSAGES_NAMESPACE,
        maxAgeMs: HARBOR_CHAT_MESSAGES_STALE_MS,
    });
}

export function writeHarborChatMessagesCache(key, value) {
    return writeHarborQueryCache(key, value, {
        namespace: HARBOR_CHAT_MESSAGES_NAMESPACE,
    });
}

export function patchHarborChatMessagesCache(key, updater) {
    return patchHarborQueryCache(key, updater, {
        namespace: HARBOR_CHAT_MESSAGES_NAMESPACE,
        preserveUpdatedAt: true,
    });
}

export function patchHarborChatChannelMessagesCache(
    username,
    channelId,
    updater,
) {
    return patchHarborQueryCachePrefix(
        [
            'chat-messages',
            String(username || '').trim().toLowerCase(),
            Number(channelId),
        ],
        updater,
        {
            namespace: HARBOR_CHAT_MESSAGES_NAMESPACE,
            preserveUpdatedAt: true,
        },
    );
}
