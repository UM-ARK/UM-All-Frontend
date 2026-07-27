import {
    deleteHarborDraft,
    fetchHarborDraft,
    saveHarborDraft,
} from './harborApi';
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
const HARBOR_REMOTE_DRAFT_CHECK_TTL = 30 * 1000;

let storageQueue = Promise.resolve();
const remoteDraftCheckCache = new Map();

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

const getRemoteDraftCheckKey = (accountId, draftKey) =>
    `${accountId || 'anonymous'}:${draftKey}`;

const markRemoteDraftChecked = (accountId, draftKey) => {
    remoteDraftCheckCache.set(
        getRemoteDraftCheckKey(accountId, draftKey),
        Date.now(),
    );
};

export function clearHarborDraftRemoteCheckCache() {
    remoteDraftCheckCache.clear();
}

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
        syncStatus:
            typeof value?.syncStatus === 'string'
                ? value.syncStatus
                : 'local',
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

export const normalizeHarborRemoteDraft = value => {
    const draftKey = normalizeDraftKey(
        value?.draft_key ?? value?.draftKey,
    );
    const data = parseDraftData(value?.data ?? value?.draft);
    const mode = getHarborDraftMode(data);
    if (!draftKey || !mode) {
        return null;
    }
    return {
        draftKey,
        sequence: normalizeSequence(
            value?.sequence ?? value?.draft_sequence,
        ),
        mode,
        data: {
            ...data,
            topicId:
                data.topicId ??
                data.topic_id ??
                value?.topic_id ??
                null,
            topicTitle:
                data.topicTitle ??
                (mode === 'newTopic' ? '' : value?.title) ??
                '',
        },
        createdAt:
            Date.parse(value?.created_at || '') ||
            normalizeTimestamp(value?.createdAt) ||
            Date.now(),
        updatedAt:
            Date.parse(value?.updated_at || '') ||
            normalizeTimestamp(value?.updatedAt) ||
            Date.parse(value?.created_at || '') ||
            Date.now(),
        syncStatus: 'synced',
        source: 'remote',
    };
};

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

export const syncLocalHarborDraft = async (accountId, draft, options = {}) => {
    const result = await saveHarborDraft(draft.draftKey, {
        data: options.data ?? draft.data,
        sequence: draft.sequence,
        signal: options.signal,
    });
    let syncedDraft = {
        ...draft,
        sequence: result.sequence,
        syncStatus: result.conflictUser ? 'conflict' : 'synced',
    };
    if (accountId) {
        const latestDraft = await getLocalHarborDraft(
            accountId,
            draft.draftKey,
        );
        if (
            latestDraft &&
            JSON.stringify(latestDraft.data) !==
                JSON.stringify(draft.data)
        ) {
            syncedDraft = {
                ...latestDraft,
                sequence: result.sequence,
                syncStatus: result.conflictUser
                    ? 'conflict'
                    : latestDraft.syncStatus,
            };
        }
        syncedDraft = await saveLocalHarborDraft(accountId, syncedDraft);
    }
    markRemoteDraftChecked(accountId, draft.draftKey);
    return {
        draft: syncedDraft,
        conflictUser: result.conflictUser,
    };
};

export const getPendingHarborDraftDeletes = accountId => {
    if (!accountId) {
        return Promise.resolve([]);
    }
    return enqueueStorageTask(async () => {
        const store = await readStore();
        return getAccount(store, accountId).pendingDeletes;
    });
};

export const markHarborDraftForDeletion = (
    accountId,
    draftKey,
    sequence,
) => {
    if (!accountId || !normalizeDraftKey(draftKey)) {
        return Promise.resolve(null);
    }
    return enqueueStorageTask(async () => {
        const store = await readStore();
        const account = getAccount(store, accountId);
        const pendingDelete = {
            draftKey,
            sequence: normalizeSequence(sequence),
            requestedAt: Date.now(),
        };
        store.accounts[accountId] = {
            drafts: account.drafts.filter(
                draft => draft.draftKey !== draftKey,
            ),
            pendingDeletes: [
                pendingDelete,
                ...account.pendingDeletes.filter(
                    item => item.draftKey !== draftKey,
                ),
            ],
        };
        await writeStore(store);
        return pendingDelete;
    });
};

export const completeHarborDraftDeletion = (accountId, draftKey) => {
    if (!accountId) {
        return Promise.resolve();
    }
    return enqueueStorageTask(async () => {
        const store = await readStore();
        const account = getAccount(store, accountId);
        store.accounts[accountId] = {
            ...account,
            pendingDeletes: account.pendingDeletes.filter(
                item => item.draftKey !== draftKey,
            ),
        };
        await writeStore(store);
    });
};

export const deleteHarborDraftAtLatestSequence = async (
    draftKey,
    fallbackSequence = 0,
) => {
    const latestDraft = await fetchHarborDraft(draftKey);
    const sequence = normalizeSequence(
        latestDraft?.sequence ?? fallbackSequence,
    );
    await deleteHarborDraft(draftKey, sequence);
    return sequence;
};

export const deleteHarborComposerDraft = async (
    accountId,
    draftKey,
    sequence,
) => {
    await markHarborDraftForDeletion(accountId, draftKey, sequence);
    try {
        await deleteHarborDraftAtLatestSequence(draftKey, sequence);
        await completeHarborDraftDeletion(accountId, draftKey);
        return true;
    } catch {
        return false;
    }
};

export const flushPendingHarborDraftDeletes = async accountId => {
    const pendingDeletes = await getPendingHarborDraftDeletes(accountId);
    await Promise.all(
        pendingDeletes.map(async item => {
            try {
                await deleteHarborDraftAtLatestSequence(
                    item.draftKey,
                    item.sequence,
                );
                await completeHarborDraftDeletion(
                    accountId,
                    item.draftKey,
                );
            } catch {
                return null;
            }
            return item.draftKey;
        }),
    );
};

export const loadHarborComposerDraft = async (
    accountId,
    draftKey,
    {signal} = {},
) => {
    const [
        localDraft,
        pendingDeletes,
    ] = await Promise.all([
        getLocalHarborDraft(accountId, draftKey),
        getPendingHarborDraftDeletes(accountId),
    ]);
    const pendingDelete = pendingDeletes.find(
        item => item.draftKey === draftKey,
    );
    const lastRemoteCheck = remoteDraftCheckCache.get(
        getRemoteDraftCheckKey(accountId, draftKey),
    );
    if (
        lastRemoteCheck &&
        Date.now() - lastRemoteCheck < HARBOR_REMOTE_DRAFT_CHECK_TTL
    ) {
        if (pendingDelete) {
            return {
                draftKey,
                sequence: pendingDelete.sequence,
                pendingDeletion: true,
            };
        }
        return localDraft;
    }
    let remoteDraft = null;
    try {
        const result = await fetchHarborDraft(draftKey, {signal});
        markRemoteDraftChecked(accountId, draftKey);
        if (pendingDelete) {
            return {
                draftKey,
                sequence: result.sequence,
                pendingDeletion: true,
            };
        }
        if (result.data) {
            remoteDraft = normalizeHarborRemoteDraft({
                draft_key: draftKey,
                draft_sequence: result.sequence,
                draft: result.data,
            });
        }
    } catch {
        if (pendingDelete) {
            return {
                draftKey,
                sequence: pendingDelete.sequence,
                pendingDeletion: true,
            };
        }
        return localDraft;
    }

    if (!remoteDraft) {
        return localDraft;
    }
    if (
        localDraft &&
        ['conflict', 'local', 'offline'].includes(localDraft.syncStatus)
    ) {
        return localDraft;
    }
    const selectedDraft =
        !localDraft || remoteDraft.sequence > localDraft.sequence
            ? remoteDraft
            : localDraft;
    if (selectedDraft === remoteDraft && accountId) {
        await saveLocalHarborDraft(accountId, remoteDraft);
    }
    return selectedDraft;
};

export const mergeHarborDrafts = (
    localDrafts,
    remoteDrafts,
    pendingDeletes = [],
) => {
    const pendingKeys = new Set(
        pendingDeletes.map(item => item.draftKey),
    );
    const draftsByKey = new Map();
    (Array.isArray(remoteDrafts) ? remoteDrafts : [])
        .map(normalizeHarborRemoteDraft)
        .filter(Boolean)
        .forEach(draft => {
            if (!pendingKeys.has(draft.draftKey)) {
                draftsByKey.set(draft.draftKey, draft);
            }
        });
    (Array.isArray(localDrafts) ? localDrafts : [])
        .map(normalizeLocalDraft)
        .filter(Boolean)
        .forEach(draft => {
            if (!pendingKeys.has(draft.draftKey)) {
                const remoteDraft = draftsByKey.get(draft.draftKey);
                if (
                    !remoteDraft ||
                    draft.syncStatus !== 'synced' ||
                    draft.sequence >= remoteDraft.sequence
                ) {
                    draftsByKey.set(draft.draftKey, draft);
                }
            }
        });
    return [...draftsByKey.values()].sort(
        (first, second) => second.updatedAt - first.updatedAt,
    );
};
