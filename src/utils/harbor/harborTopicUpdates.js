const topicUpdateListeners = new Set();

export function publishHarborTopicUpdate(topicId, patch) {
    const id = Number(topicId);
    if (!Number.isInteger(id) || id <= 0 || !patch) {
        return;
    }
    topicUpdateListeners.forEach(listener => listener(id, patch));
}

export function subscribeHarborTopicUpdates(listener) {
    if (typeof listener !== 'function') {
        return () => {};
    }
    topicUpdateListeners.add(listener);
    return () => topicUpdateListeners.delete(listener);
}
