import {
    invalidateHarborQueryCache,
    patchHarborQueryCache,
    patchHarborQueryCachePrefix,
} from './harborQueryCache';

const topicUpdateListeners = new Set();
const TOPIC_CACHE_NAMESPACE = 'topic';
const TOPIC_LIST_CACHE_NAMESPACE = 'topic-list';

export function mergeHarborTopicListItem(item, patch) {
    if (!item) {
        return item;
    }
    const next = {...item, ...patch};
    const itemLastRead = Number(item.lastReadPostNumber || 0);
    const patchLastRead = Number(patch?.lastReadPostNumber || 0);
    const itemHighest = Number(item.highestPostNumber || 0);
    const patchHighest = Number(patch?.highestPostNumber || 0);
    const hasUnreadPatch =
        patch?.unreadCount != null || patch?.isUnread != null;
    const hasStaleReadState =
        hasUnreadPatch &&
        (patchLastRead < itemLastRead ||
            (itemHighest > 0 &&
                (patchHighest <= 0 || patchHighest < itemHighest)));
    if (patch?.lastReadPostNumber != null) {
        next.lastReadPostNumber = Math.max(
            itemLastRead,
            patchLastRead,
        );
    }
    if (patch?.highestPostNumber != null) {
        next.highestPostNumber = Math.max(itemHighest, patchHighest);
    }
    if (hasStaleReadState) {
        next.unreadCount = item.unreadCount;
        next.isUnread = item.isUnread;
        if (Object.prototype.hasOwnProperty.call(patch, 'newContentType')) {
            next.newContentType = item.newContentType;
        }
    }
    return next;
}

export function reconcileHarborTopicListItems(fetchedItems, localItems) {
    if (!Array.isArray(fetchedItems) || fetchedItems.length === 0) {
        return fetchedItems;
    }
    const localById = new Map();
    (Array.isArray(localItems) ? localItems : []).forEach(item => {
        const id = Number(item?.id);
        if (id > 0) {
            localById.set(id, item);
        }
    });
    if (localById.size === 0) {
        return fetchedItems;
    }
    return fetchedItems.map(item => {
        const local = localById.get(item.id);
        if (!local) {
            return item;
        }
        const localLastRead = Number(local.lastReadPostNumber || 0);
        const fetchedLastRead = Number(item.lastReadPostNumber || 0);
        // 本地已讀樓層較新時保留樂觀狀態，避免 timings 尚未寫入的舊列表蓋掉紅點／新回覆
        if (localLastRead <= fetchedLastRead) {
            return item;
        }
        return mergeHarborTopicListItem(item, {
            highestPostNumber: local.highestPostNumber,
            isNew: local.isNew,
            isUnread: local.isUnread,
            lastReadPostNumber: local.lastReadPostNumber,
            newContentType: local.newContentType,
            unreadCount: local.unreadCount,
        });
    });
}

export function publishHarborTopicUpdate(topicId, patch) {
    const id = Number(topicId);
    if (!Number.isInteger(id) || id <= 0 || !patch) {
        return;
    }
    const {
        detailPatch,
        invalidateActivity,
        invalidateDetail,
        invalidateSearch,
        removeDetail,
        ...listPatch
    } = patch;
    if (removeDetail || invalidateDetail) {
        invalidateHarborQueryCache(['topic', id], {
            namespace: TOPIC_CACHE_NAMESPACE,
        });
    } else if (detailPatch) {
        patchHarborQueryCache(
            ['topic', id],
            current => ({...current, ...detailPatch}),
            {
                namespace: TOPIC_CACHE_NAMESPACE,
                preserveUpdatedAt: true,
            },
        );
    }
    if (invalidateActivity) {
        invalidateHarborQueryCache(['activity'], {
            namespace: 'activity',
            prefix: true,
        });
    }
    if (invalidateSearch) {
        invalidateHarborQueryCache(['search'], {
            namespace: 'search',
            prefix: true,
        });
    }
    const {reloadLists, removeFromLists, ...itemPatch} = listPatch;
    if (reloadLists) {
        invalidateHarborQueryCache(['topic-list'], {
            namespace: TOPIC_LIST_CACHE_NAMESPACE,
            prefix: true,
        });
    } else if (removeFromLists || Object.keys(itemPatch).length > 0) {
        patchHarborQueryCachePrefix(
            ['topic-list'],
            current => ({
                ...current,
                items: removeFromLists
                    ? current.items.filter(item => item.id !== id)
                    : current.items.map(item =>
                        item.id === id
                            ? mergeHarborTopicListItem(item, itemPatch)
                            : item,
                    ),
            }),
            {
                namespace: TOPIC_LIST_CACHE_NAMESPACE,
                preserveUpdatedAt: true,
            },
        );
    }
    topicUpdateListeners.forEach(listener => listener(id, listPatch));
}

export function subscribeHarborTopicUpdates(listener) {
    if (typeof listener !== 'function') {
        return () => {};
    }
    topicUpdateListeners.add(listener);
    return () => topicUpdateListeners.delete(listener);
}
