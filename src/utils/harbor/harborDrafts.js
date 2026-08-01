import {deleteHarborDraftImageFiles} from './harborDraftImages';
import {
    getLocalStorage,
    setLocalStorage,
} from '../storageKits';

export const HARBOR_DRAFTS_STORAGE_KEY = 'ARK_Harbor_Drafts_v1';

const HARBOR_DRAFT_ACTIONS = {
    edit: 'edit',
    newTopic: 'createTopic',
    reply: 'reply',
};
const HARBOR_DRAFT_MODES = {
    createTopic: 'newTopic',
    edit: 'edit',
    reply: 'reply',
};

let storageQueue = Promise.resolve();

const normalizeSequence = value => {
    const sequence = Number(value);
    return Number.isInteger(sequence) && sequence >= 0 ? sequence : 0;
};

const normalizeTimestamp = value => {
    const timestamp = Number(value);
    return Number.isFinite(timestamp) && timestamp > 0 ? timestamp : 0;
};

const parseDraftData = value => {
    if (typeof value === 'string') {
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
                ? parsed
                : {};
        } catch {
            return {};
        }
    }
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
};

const normalizeDraftKey = value => {
    const draftKey = typeof value === 'string' ? value.trim() : '';
    return draftKey && draftKey.length <= 40 ? draftKey : '';
};

const normalizePendingDelete = value => {
    const draftKey = normalizeDraftKey(value?.draftKey);
    if (!draftKey) {
        return null;
    }
    return {
        draftKey,
        sequence: normalizeSequence(value?.sequence),
        requestedAt: normalizeTimestamp(value?.requestedAt) || Date.now(),
    };
};

const normalizeLocalDraft = value => {
    const draftKey = normalizeDraftKey(value?.draftKey);
    const data = parseDraftData(value?.data);
    const mode = getHarborDraftMode(data, value?.mode);
    if (!draftKey || !mode) {
        return null;
    }
    return {
        draftKey,
        sequence: normalizeSequence(value?.sequence),
        mode,
        data,
        createdAt: normalizeTimestamp(value?.createdAt) || Date.now(),
        updatedAt: normalizeTimestamp(value?.updatedAt) || Date.now(),
        // 草稿改為本機專用；舊的 synced / conflict / offline 一律視為 local
        syncStatus: 'local',
        source: 'local',
    };
};

const sanitizeStore = value => {
    const accounts =
        value?.accounts &&
        typeof value.accounts === 'object' &&
        !Array.isArray(value.accounts)
            ? value.accounts
            : {};
    const nextAccounts = {};
    Object.entries(accounts).forEach(([accountId, account]) => {
        if (!accountId || !account || typeof account !== 'object') {
            return;
        }
        nextAccounts[accountId] = {
            drafts: (Array.isArray(account.drafts) ? account.drafts : [])
                .map(normalizeLocalDraft)
                .filter(Boolean),
            // 保留讀取相容；本機專用後不再新增 pendingDeletes
            pendingDeletes: (
                Array.isArray(account.pendingDeletes)
                    ? account.pendingDeletes
                    : []
            )
                .map(normalizePendingDelete)
                .filter(Boolean),
        };
    });
    return {
        version: 1,
        accounts: nextAccounts,
    };
};

const enqueueStorageTask = task => {
    const result = storageQueue.then(task, task);
    storageQueue = result.catch(() => null);
    return result;
};

const readStore = async () => {
    const value = await getLocalStorage(HARBOR_DRAFTS_STORAGE_KEY);
    if (value instanceof Error) {
        throw value;
    }
    return sanitizeStore(value);
};

const writeStore = async store => {
    const result = await setLocalStorage(
        HARBOR_DRAFTS_STORAGE_KEY,
        store,
    );
    if (result instanceof Error) {
        throw result;
    }
};

const getAccount = (store, accountId) => {
    const account = store.accounts[accountId];
    return account || {drafts: [], pendingDeletes: []};
};

export const getHarborDraftAccountId = user => {
    const userId = Number(user?.id);
    if (Number.isInteger(userId) && userId > 0) {
        return `id:${userId}`;
    }
    const username =
        typeof user?.username === 'string'
            ? user.username.trim().toLowerCase()
            : '';
    return username ? `username:${username}` : null;
};

export const getHarborComposerDraftKey = ({mode, topicId} = {}) => {
    if (mode === 'newTopic') {
        return 'new_topic';
    }
    const normalizedTopicId = Number(topicId);
    if (
        (mode === 'reply' || mode === 'edit') &&
        Number.isInteger(normalizedTopicId) &&
        normalizedTopicId > 0
    ) {
        return `topic_${normalizedTopicId}`;
    }
    return '';
};

export const getHarborDraftAction = mode =>
    HARBOR_DRAFT_ACTIONS[mode] || '';

export function getHarborDraftMode(data, fallbackMode) {
    const parsedData = parseDraftData(data);
    return (
        HARBOR_DRAFT_MODES[parsedData.action] ||
        (HARBOR_DRAFT_ACTIONS[fallbackMode] ? fallbackMode : '')
    );
}

export const getLocalHarborDrafts = accountId => {
    if (!accountId) {
        return Promise.resolve([]);
    }
    return enqueueStorageTask(async () => {
        const store = await readStore();
        return getAccount(store, accountId).drafts;
    });
};

export const getLocalHarborDraft = async (accountId, draftKey) => {
    const drafts = await getLocalHarborDrafts(accountId);
    return drafts.find(draft => draft.draftKey === draftKey) || null;
};

export const saveLocalHarborDraft = (accountId, draft) => {
    if (!accountId) {
        return Promise.resolve(null);
    }
    const normalizedDraft = normalizeLocalDraft(draft);
    if (!normalizedDraft) {
        return Promise.reject(new TypeError('Invalid local Harbor draft'));
    }
    return enqueueStorageTask(async () => {
        const store = await readStore();
        const account = getAccount(store, accountId);
        const existingDraft = account.drafts.find(
            item => item.draftKey === normalizedDraft.draftKey,
        );
        const nextDraft = {
            ...normalizedDraft,
            syncStatus: 'local',
            createdAt:
                existingDraft?.createdAt || normalizedDraft.createdAt,
            updatedAt: Date.now(),
        };
        store.accounts[accountId] = {
            ...account,
            drafts: [
                nextDraft,
                ...account.drafts.filter(
                    item => item.draftKey !== nextDraft.draftKey,
                ),
            ],
            pendingDeletes: account.pendingDeletes.filter(
                item => item.draftKey !== nextDraft.draftKey,
            ),
        };
        await writeStore(store);
        return nextDraft;
    });
};

export const loadHarborComposerDraft = async (accountId, draftKey) =>
    getLocalHarborDraft(accountId, draftKey);

export const deleteHarborComposerDraft = async (accountId, draftKey) => {
    if (!accountId || !normalizeDraftKey(draftKey)) {
        return false;
    }
    const removedDraft = await enqueueStorageTask(async () => {
        const store = await readStore();
        const account = getAccount(store, accountId);
        const draft =
            account.drafts.find(item => item.draftKey === draftKey) ||
            null;
        store.accounts[accountId] = {
            drafts: account.drafts.filter(
                item => item.draftKey !== draftKey,
            ),
            pendingDeletes: account.pendingDeletes.filter(
                item => item.draftKey !== draftKey,
            ),
        };
        await writeStore(store);
        return draft;
    });
    deleteHarborDraftImageFiles(removedDraft?.data?.appImages);
    return true;
};
