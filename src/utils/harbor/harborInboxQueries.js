import {
    fetchHarborQueryCache,
    patchHarborQueryCachePrefix,
    readHarborQueryCache,
    setHarborQueryNamespaceLimit,
} from './harborQueryCache';

const INBOX_NAMESPACE = 'inbox';
const INBOX_FRESH_MS = 10 * 1000;
const INBOX_STALE_MS = 2 * 60 * 1000;

setHarborQueryNamespaceLimit(INBOX_NAMESPACE, 10);

export function getHarborInboxQueryKey(username, filter) {
    return [
        INBOX_NAMESPACE,
        String(username || '').trim().toLowerCase(),
        filter || 'all',
    ];
}

export function readHarborInboxFirstPage(username, filter) {
    return readHarborQueryCache(
        getHarborInboxQueryKey(username, filter),
        {
            namespace: INBOX_NAMESPACE,
            maxAgeMs: INBOX_STALE_MS,
        },
    );
}

export function fetchHarborInboxFirstPage(
    username,
    filter,
    fetcher,
    {force = false} = {},
) {
    const key = getHarborInboxQueryKey(username, filter);
    const cachedResult = readHarborInboxFirstPage(username, filter);
    const request = fetchHarborQueryCache(key, fetcher, {
        namespace: INBOX_NAMESPACE,
        freshMs: INBOX_FRESH_MS,
        staleMs: INBOX_STALE_MS,
        force,
    });
    return {cachedResult, request};
}

export function patchHarborInboxNotificationRead(username, notificationId) {
    const normalizedId = String(notificationId);
    patchHarborQueryCachePrefix(
        [INBOX_NAMESPACE, String(username || '').trim().toLowerCase()],
        (payload, key) => ({
            ...payload,
            items:
                key[2] === 'unread'
                    ? payload.items.filter(
                        item =>
                            item.inboxType !== 'notification' ||
                            String(item.id) !== normalizedId,
                    )
                    : payload.items.map(item =>
                        item.inboxType === 'notification' &&
                        String(item.id) === normalizedId
                            ? {...item, isRead: true}
                            : item,
                    ),
            unreadNotificationCount: Math.max(
                0,
                Number(payload.unreadNotificationCount || 0) - 1,
            ),
        }),
        {namespace: INBOX_NAMESPACE, preserveUpdatedAt: true},
    );
}

export function patchHarborInboxNotificationsReadAll(username) {
    patchHarborQueryCachePrefix(
        [INBOX_NAMESPACE, String(username || '').trim().toLowerCase()],
        (payload, key) => ({
            ...payload,
            items:
                key[2] === 'unread'
                    ? payload.items.filter(
                        item => item.inboxType !== 'notification',
                    )
                    : payload.items.map(item =>
                        item.inboxType === 'notification'
                            ? {...item, isRead: true}
                            : item,
                    ),
            hasMore: key[2] === 'unread' ? false : payload.hasMore,
            nextOffset: key[2] === 'unread' ? null : payload.nextOffset,
            unreadNotificationCount: 0,
        }),
        {namespace: INBOX_NAMESPACE, preserveUpdatedAt: true},
    );
}

export function patchHarborInboxMessageRead(username, messageId) {
    const normalizedId = String(messageId);
    patchHarborQueryCachePrefix(
        [INBOX_NAMESPACE, String(username || '').trim().toLowerCase()],
        (payload, key) => ({
            ...payload,
            items: payload.items
                .map(item =>
                    item.inboxType === 'message' &&
                    String(item.id) === normalizedId
                        ? {...item, unreadCount: 0}
                        : item,
                )
                .filter(item =>
                    key[2] !== 'unread' ||
                    item.inboxType !== 'message' ||
                    item.unreadCount > 0,
                ),
        }),
        {namespace: INBOX_NAMESPACE, preserveUpdatedAt: true},
    );
}
