import {
    getLocalStorage,
    setLocalStorage,
} from '../storageKits';

const HARBOR_LOGIN_INTENT_KEY = 'harbor_login_intent';
const HARBOR_LOGIN_INTENT_TTL = 10 * 60 * 1000;
const HARBOR_LOGIN_INTENT_ROUTES = new Set([
    'HarborAccountSettings',
    'HarborComposer',
    'HarborDrafts',
    'HarborTopicDetail',
    'Tabbar',
]);

function normalizeHarborLoginIntent(intent) {
    if (
        !intent ||
        typeof intent !== 'object' ||
        !HARBOR_LOGIN_INTENT_ROUTES.has(intent.routeName)
    ) {
        return null;
    }

    const createdAt = Number(intent.createdAt);
    if (
        !Number.isFinite(createdAt) ||
        Date.now() - createdAt > HARBOR_LOGIN_INTENT_TTL
    ) {
        return null;
    }

    return {
        routeName: intent.routeName,
        params:
            intent.params &&
            typeof intent.params === 'object' &&
            !Array.isArray(intent.params)
                ? intent.params
                : undefined,
        createdAt,
    };
}

export async function saveHarborLoginIntent(intent) {
    const nextIntent = normalizeHarborLoginIntent({
        ...intent,
        createdAt: Date.now(),
    });
    await setLocalStorage(HARBOR_LOGIN_INTENT_KEY, nextIntent);
    return nextIntent;
}

export async function loadHarborLoginIntent() {
    const storedIntent = await getLocalStorage(HARBOR_LOGIN_INTENT_KEY);
    const intent = normalizeHarborLoginIntent(storedIntent);
    if (!intent && storedIntent) {
        await clearHarborLoginIntent();
    }
    return intent;
}

export function clearHarborLoginIntent() {
    return setLocalStorage(HARBOR_LOGIN_INTENT_KEY, null);
}
