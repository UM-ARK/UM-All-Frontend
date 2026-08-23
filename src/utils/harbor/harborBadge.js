import { getLocalStorage, setLocalStorage } from '../storageKits';

const HARBOR_FORUM_BADGE_STORAGE_KEY = 'ARK_Harbor_Forum_Badge_State';
const HARBOR_FORUM_BADGE_STORAGE_VERSION = 2;
const HARBOR_FORUM_BADGE_LEGACY_STORAGE_VERSION = 1;
const HARBOR_FORUM_BADGE_MAX_COUNT = 100;
const HARBOR_FORUM_BADGE_MAX_ACCOUNTS = 3;

export const HARBOR_FORUM_BADGE_GUEST_SCOPE = '@guest';

let harborForumBadgeStorageQueue = Promise.resolve();

const normalizeUsername = username =>
    typeof username === 'string' ? username.trim().toLowerCase() : '';

const normalizeTimestamp = value => {
    const timestamp = Date.parse(value);
    return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : '';
};

const getLatestTimestamp = (...values) => {
    return values.reduce((latest, value) => {
        const normalized = normalizeTimestamp(value);
        if (!normalized) {
            return latest;
        }
        if (!latest || Date.parse(normalized) > Date.parse(latest)) {
            return normalized;
        }
        return latest;
    }, '');
};

const normalizeBadgeCount = count =>
    Math.min(
        HARBOR_FORUM_BADGE_MAX_COUNT,
        Math.max(0, Math.floor(Number(count) || 0)),
    );

const isSupportedStorageVersion = version =>
    version === HARBOR_FORUM_BADGE_STORAGE_VERSION ||
    version === HARBOR_FORUM_BADGE_LEGACY_STORAGE_VERSION;

export function formatHarborTabBadge(count) {
    const normalized = Math.max(0, Number(count) || 0);
    if (normalized <= 0) {
        return undefined;
    }
    return normalized > 99 ? '99+' : normalized;
}

export function calculateHarborUnreadTotal(inboxUnreadCount, chatUnreadCount) {
    return (
        Math.max(0, Number(inboxUnreadCount) || 0) +
        Math.max(0, Number(chatUnreadCount) || 0)
    );
}

export function calculateHarborMyTabBadgeTotal(
    inboxUnreadCount,
    chatUnreadCount,
    reviewCount,
    shouldShowPushPrompt,
) {
    return (
        calculateHarborUnreadTotal(inboxUnreadCount, chatUnreadCount) +
        Math.max(0, Number(reviewCount) || 0) +
        (shouldShowPushPrompt ? 1 : 0)
    );
}

export function createHarborForumBadgeState(username = '') {
    return {
        username,
        acknowledgedAt: '',
        latestObservedAt: '',
        badgeCount: 0,
        loaded: false,
        acknowledgePending: false,
    };
}

export function updateHarborForumBadgeState(
    currentState,
    username,
    snapshot,
    { acknowledge = false } = {},
) {
    const isSameAccount = currentState.username === username;
    const baseState = isSameAccount
        ? currentState
        : createHarborForumBadgeState(username);
    const latestObservedAt = getLatestTimestamp(
        baseState.latestObservedAt,
        snapshot?.latestAt,
    );
    const shouldAcknowledge =
        acknowledge ||
        baseState.acknowledgePending ||
        !baseState.acknowledgedAt;

    return {
        username,
        acknowledgedAt: shouldAcknowledge
            ? getLatestTimestamp(baseState.acknowledgedAt, latestObservedAt)
            : baseState.acknowledgedAt,
        latestObservedAt,
        badgeCount: shouldAcknowledge
            ? 0
            : normalizeBadgeCount(snapshot?.topicCount),
        loaded: true,
        acknowledgePending: false,
    };
}

export function acknowledgeHarborForumBadgeState(currentState, username) {
    if (currentState.username !== username) {
        return {
            ...createHarborForumBadgeState(username),
            acknowledgePending: true,
        };
    }
    return {
        ...currentState,
        acknowledgedAt: getLatestTimestamp(
            currentState.acknowledgedAt,
            currentState.latestObservedAt,
        ),
        badgeCount: 0,
        acknowledgePending: true,
    };
}

export function getHarborForumBadgeCount(currentState, username) {
    if (currentState.username !== username || !currentState.loaded) {
        return 0;
    }
    return normalizeBadgeCount(currentState.badgeCount);
}

export async function loadHarborForumBadgeState(username) {
    const nextState = {
        ...createHarborForumBadgeState(username),
        loaded: true,
    };
    const normalizedUsername = normalizeUsername(username);
    if (!normalizedUsername) {
        return nextState;
    }

    const stored = await getLocalStorage(HARBOR_FORUM_BADGE_STORAGE_KEY);
    if (
        stored instanceof Error ||
        !isSupportedStorageVersion(stored?.version) ||
        !Array.isArray(stored.accounts)
    ) {
        return nextState;
    }

    const account = stored.accounts.find(
        item => normalizeUsername(item?.username) === normalizedUsername,
    );
    if (!account) {
        return nextState;
    }

    return {
        username,
        acknowledgedAt: normalizeTimestamp(account.acknowledgedAt),
        latestObservedAt: normalizeTimestamp(account.latestObservedAt),
        badgeCount:
            stored.version === HARBOR_FORUM_BADGE_STORAGE_VERSION
                ? normalizeBadgeCount(account.badgeCount)
                : 0,
        loaded: true,
        acknowledgePending: false,
    };
}

export function saveHarborForumBadgeState(state) {
    const normalizedUsername = normalizeUsername(state?.username);
    if (!normalizedUsername || !state?.loaded) {
        return Promise.resolve();
    }

    const account = {
        username: state.username,
        acknowledgedAt: normalizeTimestamp(state.acknowledgedAt),
        latestObservedAt: normalizeTimestamp(state.latestObservedAt),
        badgeCount: normalizeBadgeCount(state.badgeCount),
        updatedAt: new Date().toISOString(),
    };

    harborForumBadgeStorageQueue = harborForumBadgeStorageQueue
        .catch(() => {})
        .then(async () => {
            const stored = await getLocalStorage(
                HARBOR_FORUM_BADGE_STORAGE_KEY,
            );
            if (stored instanceof Error) {
                throw stored;
            }
            const previousAccounts =
                isSupportedStorageVersion(stored?.version) &&
                Array.isArray(stored.accounts)
                    ? stored.accounts.map(item =>
                        stored.version ===
                        HARBOR_FORUM_BADGE_LEGACY_STORAGE_VERSION
                            ? { ...item, badgeCount: 0 }
                            : item,
                    )
                    : [];
            let accountCount = 0;
            const accounts = [
                account,
                ...previousAccounts.filter(
                    item =>
                        normalizeUsername(item?.username) !==
                        normalizedUsername,
                ),
            ].filter(item => {
                if (
                    normalizeUsername(item?.username) ===
                    HARBOR_FORUM_BADGE_GUEST_SCOPE
                ) {
                    return true;
                }
                accountCount += 1;
                return accountCount <= HARBOR_FORUM_BADGE_MAX_ACCOUNTS;
            });

            const result = await setLocalStorage(
                HARBOR_FORUM_BADGE_STORAGE_KEY,
                {
                    version: HARBOR_FORUM_BADGE_STORAGE_VERSION,
                    accounts,
                },
            );
            if (result instanceof Error) {
                throw result;
            }
        });

    return harborForumBadgeStorageQueue;
}
