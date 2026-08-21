import {
    getLocalStorage,
    setLocalStorageSilently,
} from './storageKits';

const REGISTRATION_KEY = 'push_registration_v1';
const HARBOR_STATES_KEY = 'harbor_push_states_v1';
let harborStateWriteQueue = Promise.resolve();

export const DEFAULT_PUSH_REGISTRATION_STATE = Object.freeze({
    status: 'idle',
    endpointId: null,
    retryCount: 0,
    retryAt: null,
    errorCode: null,
    registeredLocale: null,
    localeSyncPending: false,
});

export const DEFAULT_HARBOR_PUSH_STATE = Object.freeze({
    desiredEnabled: false,
    pendingAction: null,
    dismissedPrompt: false,
    disableRetryCount: 0,
    disableRetryAt: null,
    errorCode: null,
    updatedAt: null,
});

function asObject(value) {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value
        : {};
}

export function createHarborPushAccountKey(user, installationId) {
    const userId = Number(user?.id);
    const username = String(user?.username || '').trim().toLowerCase();
    const accountId = Number.isSafeInteger(userId) && userId > 0
        ? String(userId)
        : username;
    if (!accountId || !installationId) {
        return null;
    }
    return `${accountId}:${installationId}`;
}

export async function loadPushRegistrationState() {
    return {
        ...DEFAULT_PUSH_REGISTRATION_STATE,
        ...asObject(await getLocalStorage(REGISTRATION_KEY)),
    };
}

export async function savePushRegistrationState(state) {
    const value = {
        ...DEFAULT_PUSH_REGISTRATION_STATE,
        ...asObject(state),
    };
    await setLocalStorageSilently(REGISTRATION_KEY, value);
    return value;
}

export async function loadHarborPushState(accountKey) {
    if (!accountKey) {
        return {...DEFAULT_HARBOR_PUSH_STATE};
    }
    const states = asObject(await getLocalStorage(HARBOR_STATES_KEY));
    return {
        ...DEFAULT_HARBOR_PUSH_STATE,
        ...asObject(states[accountKey]),
    };
}

export function saveHarborPushState(accountKey, state) {
    if (!accountKey) {
        return Promise.resolve({...DEFAULT_HARBOR_PUSH_STATE});
    }
    const request = harborStateWriteQueue
        .catch(() => {})
        .then(async () => {
            const states = asObject(await getLocalStorage(HARBOR_STATES_KEY));
            const value = {
                ...DEFAULT_HARBOR_PUSH_STATE,
                ...asObject(state),
                updatedAt: Date.now(),
            };
            await setLocalStorageSilently(HARBOR_STATES_KEY, {
                ...states,
                [accountKey]: value,
            });
            return value;
        });
    harborStateWriteQueue = request.catch(() => {});
    return request;
}
