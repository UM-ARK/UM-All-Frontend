import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { AppState } from 'react-native';

import * as Crypto from 'expo-crypto';

import {
    completeInitialHarborCallback,
    ensureHarborRsaKeyPair,
    HARBOR_AUTH_ERROR,
    startHarborAuthorization,
} from '../utils/harbor/harborAuth';
import {
    fetchCurrentHarborUser,
    fetchHarborInboxUnreadCount,
    isHarborCredentialRejected,
    revokeHarborCredentials,
    setActiveHarborCredentials,
    setHarborCredentialRejectedHandler,
} from '../utils/harbor/harborApi';
import {
    clearHarborCredentials,
    clearPendingHarborRevocation,
    loadHarborCredentials,
    loadPendingHarborRevocation,
    savePendingHarborRevocation,
} from '../utils/harbor/harborAuthStorage';
import {
    logHarborAuthError,
    logHarborAuthEvent,
} from '../utils/harbor/harborLogger';
import {
    clearHarborLoginIntent,
    loadHarborLoginIntent,
    saveHarborLoginIntent,
} from '../utils/harbor/harborLoginIntent';
import { syncAppIconBadgeCount } from '../utils/appIconBadge';
import { getLocalStorage, setLocalStorage } from '../utils/storageKits';

const PROFILE_CACHE_KEY = 'harbor_profile_cache';
const PROFILE_VALIDATION_INTERVAL = 5 * 60 * 1000;

const HarborSessionContext = createContext(null);

function createFallbackUser() {
    return {
        displayName: 'Harbor',
        username: '',
        role: 'Harbor 會員',
        trustLevel: 0,
        joinedAt: '',
        unreadNotifications: 0,
        unreadMessages: 0,
        avatarUrl: null,
        contributions: [],
        stats: [],
        activity: [],
        badges: [],
    };
}

function getCredentialCacheId(credentials) {
    return Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        credentials.userApiKey,
    );
}

export const HarborSessionProvider = ({ children }) => {
    const [status, setStatus] = useState('restoring');
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
    const [pendingLoginIntent, setPendingLoginIntent] = useState(null);
    const credentialsRef = useRef(null);
    const userRef = useRef(null);
    const mountedRef = useRef(true);
    const inboxUnreadRequestRef = useRef(0);
    const lastValidationRef = useRef(0);
    const lastValidationAttemptRef = useRef(0);
    const validationInFlightRef = useRef(null);
    const sessionGenerationRef = useRef(0);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const applySignedOutState = useCallback((nextStatus = 'signedOut') => {
        sessionGenerationRef.current += 1;
        credentialsRef.current = null;
        lastValidationRef.current = 0;
        lastValidationAttemptRef.current = 0;
        validationInFlightRef.current = null;
        inboxUnreadRequestRef.current += 1;
        setActiveHarborCredentials(null);
        if (mountedRef.current) {
            setUser(null);
            setInboxUnreadCount(0);
            setStatus(nextStatus);
        }
    }, []);

    const activateSession = useCallback(credentials => {
        sessionGenerationRef.current += 1;
        credentialsRef.current = credentials;
        lastValidationRef.current = 0;
        lastValidationAttemptRef.current = 0;
        validationInFlightRef.current = null;
        inboxUnreadRequestRef.current += 1;
        setActiveHarborCredentials(credentials);
        if (mountedRef.current) {
            setInboxUnreadCount(0);
        }
        return sessionGenerationRef.current;
    }, []);

    const isCurrentSession = useCallback((credentials, generation) => {
        return (
            mountedRef.current &&
            sessionGenerationRef.current === generation &&
            credentialsRef.current?.userApiKey === credentials.userApiKey
        );
    }, []);

    const patchInboxUnreadCount = useCallback(count => {
        const normalizedCount = Math.max(0, Number(count) || 0);
        inboxUnreadRequestRef.current += 1;
        if (mountedRef.current) {
            setInboxUnreadCount(normalizedCount);
        }
        return normalizedCount;
    }, []);

    const refreshInboxUnreadCount = useCallback(async () => {
        const username = userRef.current?.username;
        if (!username || !credentialsRef.current) {
            return null;
        }

        const requestId = inboxUnreadRequestRef.current + 1;
        inboxUnreadRequestRef.current = requestId;
        const nextCount = await fetchHarborInboxUnreadCount(username);
        if (
            mountedRef.current &&
            inboxUnreadRequestRef.current === requestId &&
            userRef.current?.username === username
        ) {
            setInboxUnreadCount(nextCount);
        }
        return nextCount;
    }, []);

    const expireSession = useCallback(
        async expectedCredentialKey => {
            if (
                expectedCredentialKey &&
                credentialsRef.current?.userApiKey !== expectedCredentialKey
            ) {
                return false;
            }

            applySignedOutState('expired');
            await clearHarborCredentials();
            await setLocalStorage(PROFILE_CACHE_KEY, null);
            const sessionError = new Error('Harbor 登入已失效，請重新登入。');
            sessionError.code = 'HARBOR_SESSION_EXPIRED';
            if (mountedRef.current) {
                setError(sessionError);
            }
            return true;
        },
        [applySignedOutState],
    );

    const refreshProfile = useCallback(
        async (credentials, generation = sessionGenerationRef.current) => {
            const startedAt = Date.now();
            lastValidationAttemptRef.current = startedAt;
            logHarborAuthEvent('profile.refresh.start');
            const credentialCacheId = await getCredentialCacheId(credentials);
            const cachedProfile = await getLocalStorage(PROFILE_CACHE_KEY);
            const cachedUser =
                cachedProfile?.credentialCacheId === credentialCacheId
                    ? cachedProfile.user
                    : null;

            try {
                const nextUser = await fetchCurrentHarborUser(
                    credentials,
                    cachedUser || userRef.current,
                );
                if (!isCurrentSession(credentials, generation)) {
                    return null;
                }

                await setLocalStorage(PROFILE_CACHE_KEY, {
                    credentialCacheId,
                    user: nextUser,
                });
                if (isCurrentSession(credentials, generation)) {
                    setUser(nextUser);
                    setError(null);
                    setStatus('signedIn');
                    lastValidationRef.current = Date.now();
                }
                logHarborAuthEvent('profile.refresh.success', {
                    durationMs: Date.now() - startedAt,
                });
                return nextUser;
            } catch (requestError) {
                logHarborAuthError('profile.refresh.failed', requestError, {
                    durationMs: Date.now() - startedAt,
                });
                if (!isCurrentSession(credentials, generation)) {
                    return null;
                }

                if (
                    isHarborCredentialRejected(requestError, true) ||
                    requestError.code === 'INVALID_HARBOR_SESSION'
                ) {
                    await expireSession(credentials.userApiKey);
                    throw requestError;
                }

                if (!isCurrentSession(credentials, generation)) {
                    return null;
                }

                setUser(cachedUser || createFallbackUser());
                setError(requestError);
                setStatus('signedIn');
                return cachedUser;
            }
        },
        [expireSession, isCurrentSession],
    );

    const retryPendingRevocation = useCallback(async () => {
        const pendingQueue = await loadPendingHarborRevocation();
        const attemptedCredentialKeys = new Set();
        let remainingCount = 0;

        for (const pendingCredentials of pendingQueue) {
            attemptedCredentialKeys.add(pendingCredentials.userApiKey);
            try {
                await revokeHarborCredentials(pendingCredentials);
                await clearPendingHarborRevocation(pendingCredentials);
            } catch (requestError) {
                if (isHarborCredentialRejected(requestError, true)) {
                    await clearPendingHarborRevocation(pendingCredentials);
                } else {
                    remainingCount += 1;
                }
            }
        }

        return { attemptedCredentialKeys, remainingCount };
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        setHarborCredentialRejectedHandler((_requestError, credentialKey) => {
            if (!credentialKey) {
                return;
            }
            expireSession(credentialKey).catch(sessionError => {
                if (mountedRef.current) {
                    setError(sessionError);
                }
            });
        });

        // App 啟動時背景準備 RSA，登入仍會等待同一個初始化 Promise 並回報錯誤。
        ensureHarborRsaKeyPair()
            .then(() => {
                logHarborAuthEvent('rsa.prewarm.success');
            })
            .catch(rsaError => {
                logHarborAuthError('rsa.prewarm.failed', rsaError);
            });

        const restore = async () => {
            try {
                const { attemptedCredentialKeys } =
                    await retryPendingRevocation();

                let credentials = null;
                try {
                    credentials = await completeInitialHarborCallback();
                } catch (authError) {
                    logHarborAuthError('callback.initial.failed', authError);
                    if (
                        mountedRef.current &&
                        authError.code !== HARBOR_AUTH_ERROR.NO_PENDING_AUTH
                    ) {
                        setError(authError);
                    }
                }
                credentials ||= await loadHarborCredentials();

                if (!credentials) {
                    applySignedOutState();
                    return;
                }

                if (attemptedCredentialKeys.has(credentials.userApiKey)) {
                    await clearHarborCredentials();
                    await setLocalStorage(PROFILE_CACHE_KEY, null);
                    applySignedOutState();
                    return;
                }

                const generation = activateSession(credentials);
                await refreshProfile(credentials, generation);
                const loginIntent = await loadHarborLoginIntent();
                if (mountedRef.current && loginIntent) {
                    setPendingLoginIntent(loginIntent);
                }
            } catch (restoreError) {
                logHarborAuthError('session.restore.failed', restoreError);
                if (
                    isHarborCredentialRejected(restoreError, true) ||
                    restoreError.code === 'INVALID_HARBOR_SESSION'
                ) {
                    return;
                }
                if (mountedRef.current) {
                    setError(restoreError);
                    applySignedOutState();
                }
            }
        };

        restore();
        return () => {
            mountedRef.current = false;
            setHarborCredentialRejectedHandler(null);
        };
    }, [
        activateSession,
        applySignedOutState,
        expireSession,
        refreshProfile,
        retryPendingRevocation,
    ]);

    useEffect(() => {
        if (status === 'signedIn' && user?.username) {
            refreshInboxUnreadCount().catch(() => {});
        }
    }, [refreshInboxUnreadCount, status, user?.username]);

    // 將 Harbor 收件匣未讀同步到主畫面 App 角標；登出時清零
    useEffect(() => {
        const badgeCount =
            status === 'signedIn' ? inboxUnreadCount : 0;
        syncAppIconBadgeCount(badgeCount).catch(() => {});
    }, [inboxUnreadCount, status]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            const credentials = credentialsRef.current;
            const lastValidationTime = Math.max(
                lastValidationRef.current,
                lastValidationAttemptRef.current,
            );
            const shouldValidate =
                nextState === 'active' &&
                credentials &&
                !validationInFlightRef.current &&
                Date.now() - lastValidationTime > PROFILE_VALIDATION_INTERVAL;

            if (shouldValidate) {
                const validationRequest = refreshProfile(
                    credentials,
                    sessionGenerationRef.current,
                ).catch(() => { });
                validationInFlightRef.current = validationRequest;
                validationRequest.finally(() => {
                    if (validationInFlightRef.current === validationRequest) {
                        validationInFlightRef.current = null;
                    }
                });
            }
            if (nextState === 'active' && credentials) {
                refreshInboxUnreadCount().catch(() => {});
            }
        });

        return () => subscription.remove();
    }, [refreshInboxUnreadCount, refreshProfile]);

    const login = useCallback(async intent => {
        const startedAt = Date.now();
        logHarborAuthEvent('login.start');
        setStatus('authorizing');
        setError(null);

        try {
            if (intent) {
                await saveHarborLoginIntent(intent);
            } else {
                await clearHarborLoginIntent();
            }
            const { remainingCount } = await retryPendingRevocation();
            if (remainingCount > 0) {
                const pendingError = new Error(
                    '正在完成上一次 Harbor 登出，請連線後再試。',
                );
                pendingError.code = 'HARBOR_REVOCATION_PENDING';
                throw pendingError;
            }

            const credentials = await startHarborAuthorization();
            logHarborAuthEvent('login.credentials.ready');
            const generation = activateSession(credentials);
            await refreshProfile(credentials, generation);
            logHarborAuthEvent('login.success', {
                durationMs: Date.now() - startedAt,
            });
            await clearHarborLoginIntent();
            return true;
        } catch (authError) {
            await clearHarborLoginIntent();
            if (authError.code === HARBOR_AUTH_ERROR.CANCELLED) {
                logHarborAuthEvent('login.cancelled', {
                    durationMs: Date.now() - startedAt,
                });
                if (mountedRef.current) {
                    setStatus(
                        credentialsRef.current ? 'signedIn' : 'signedOut',
                    );
                }
                return false;
            }
            logHarborAuthError('login.failed', authError, {
                durationMs: Date.now() - startedAt,
            });
            if (mountedRef.current) {
                setError(authError);
                setStatus(credentialsRef.current ? 'signedIn' : 'signedOut');
            }
            throw authError;
        }
    }, [activateSession, refreshProfile, retryPendingRevocation]);

    const logout = useCallback(async () => {
        const credentials = credentialsRef.current;
        setError(null);

        if (credentials) {
            // 先持久化撤銷工作，確保任何時間 crash 都不會遺失需要撤銷的 key。
            await savePendingHarborRevocation(credentials);
        }

        applySignedOutState();
        setPendingLoginIntent(null);
        await clearHarborLoginIntent();
        await clearHarborCredentials();
        await setLocalStorage(PROFILE_CACHE_KEY, null);

        if (credentials) {
            try {
                await revokeHarborCredentials(credentials);
                await clearPendingHarborRevocation(credentials);
            } catch (requestError) {
                if (isHarborCredentialRejected(requestError, true)) {
                    await clearPendingHarborRevocation(credentials);
                }
            }
        }
    }, [applySignedOutState]);

    const consumeLoginIntent = useCallback(async () => {
        setPendingLoginIntent(null);
        await clearHarborLoginIntent();
    }, []);

    const value = useMemo(
        () => ({
            status,
            user,
            error,
            inboxUnreadCount,
            login,
            logout,
            pendingLoginIntent,
            consumeLoginIntent,
            patchInboxUnreadCount,
            refreshInboxUnreadCount,
            refresh: () =>
                credentialsRef.current
                    ? refreshProfile(
                        credentialsRef.current,
                        sessionGenerationRef.current,
                    )
                    : Promise.resolve(null),
        }),
        [
            consumeLoginIntent,
            error,
            inboxUnreadCount,
            login,
            logout,
            patchInboxUnreadCount,
            pendingLoginIntent,
            refreshInboxUnreadCount,
            refreshProfile,
            status,
            user,
        ],
    );

    return (
        <HarborSessionContext.Provider value={value}>
            {children}
        </HarborSessionContext.Provider>
    );
};

export function useHarborSession() {
    const context = useContext(HarborSessionContext);
    if (!context) {
        throw new Error(
            'useHarborSession 必須在 HarborSessionProvider 內使用。',
        );
    }
    return context;
}
