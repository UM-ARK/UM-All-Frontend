import {
    getLocalStorage,
    removeLocalStorageItems,
    setLocalStorageSilently,
} from '../storageKits';

export const HARBOR_CHAT_DRAFT_STORAGE_KEY_PREFIX =
    'ARK_Harbor_Chat_Draft_v1';

let storageQueue = Promise.resolve();

const getStorageKey = (accountId, channelId) => {
    const normalizedAccountId = String(accountId || '').trim();
    const normalizedChannelId = Number(channelId);
    if (
        !normalizedAccountId ||
        !Number.isInteger(normalizedChannelId) ||
        normalizedChannelId <= 0
    ) {
        return '';
    }
    return `${HARBOR_CHAT_DRAFT_STORAGE_KEY_PREFIX}:${encodeURIComponent(normalizedAccountId)}:${normalizedChannelId}`;
};

const enqueueStorageTask = task => {
    const result = storageQueue.then(task, task);
    storageQueue = result.catch(() => null);
    return result;
};

export const getLocalHarborChatDraft = (accountId, channelId) => {
    const storageKey = getStorageKey(accountId, channelId);
    if (!storageKey) {
        return Promise.resolve('');
    }
    return enqueueStorageTask(async () => {
        const value = await getLocalStorage(storageKey);
        if (value instanceof Error) {
            throw value;
        }
        return typeof value === 'string' ? value : '';
    });
};

export const saveLocalHarborChatDraft = (accountId, channelId, value) => {
    const storageKey = getStorageKey(accountId, channelId);
    if (!storageKey || typeof value !== 'string') {
        return Promise.reject(new TypeError('Invalid local Harbor Chat draft'));
    }
    return enqueueStorageTask(async () => {
        const result = value
            ? await setLocalStorageSilently(storageKey, value)
            : await removeLocalStorageItems([storageKey]);
        if (result instanceof Error) {
            throw result;
        }
        return value;
    });
};
