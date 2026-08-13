import {
    invalidateHarborQueryCache,
    patchHarborQueryCache,
    patchHarborQueryCachePrefix,
} from './harborQueryCache';

const topicUpdateListeners = new Set();
const TOPIC_CACHE_NAMESPACE = 'topic';
const TOPIC_LIST_CACHE_NAMESPACE = 'topic-list';

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
                        item.id === id ? {...item, ...itemPatch} : item,
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
