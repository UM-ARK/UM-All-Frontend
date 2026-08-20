import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { AppState, Linking } from 'react-native';

import * as Crypto from 'expo-crypto';

import {
    completeHarborAuthorization,
    completeInitialHarborCallback,
    deliverHarborAuthDeepLink,
    ensureHarborRsaKeyPair,
    HARBOR_AUTH_ERROR,
    isHarborAuthSessionActive,
    startHarborAuthorization,
} from '../utils/harbor/harborAuth';
import {
    fetchCurrentHarborUser,
    fetchHarborChatChannels,
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
import { calculateHarborUnreadTotal } from '../utils/harbor/harborBadge';
import {
    clearHarborLoginIntent,
    loadHarborLoginIntent,
    saveHarborLoginIntent,
} from '../utils/harbor/harborLoginIntent';
import { logoutSchedulingSession } from '../utils/scheduling/schedulingAuth';
import { syncAppIconBadgeCount } from '../utils/appIconBadge';
import { getLocalStorage, setLocalStorage } from '../utils/storageKits';

const PROFILE_CACHE_KEY = 'harbor_profile_cache';
const PROFILE_VALIDATION_INTERVAL = 5 * 60 * 1000;
const CHAT_CHANNELS_FRESHNESS_INTERVAL = 60 * 1000;
const UNREAD_FOREGROUND_REFRESH_INTERVAL = 5 * 60 * 1000;

const HarborSessionContext = createContext(null);

function createFallbackUser() {
    return {
        id: null,
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
    const [authorizationPhase, setAuthorizationPhase] = useState(null);
    const [user, setUser] = useState(null);
    const [error, setError] = useState(null);
    const [inboxUnreadCount, setInboxUnreadCount] = useState(0);
    const [chatUnreadCount, setChatUnreadCount] = useState(0);
    const [chatChannels, setChatChannels] = useState([]);
    const [pendingLoginIntent, setPendingLoginIntent] = useState(null);
    const [sessionGeneration, setSessionGeneration] = useState(0);
    const credentialsRef = useRef(null);
    const userRef = useRef(null);
    const mountedRef = useRef(true);
    const inboxUnreadRequestRef = useRef(0);
    const chatUnreadRequestRef = useRef(0);
    const chatChannelsRef = useRef([]);
    const chatUnreadCountRef = useRef(0);
    const chatChannelsFetchedAtRef = useRef(0);
    const chatChannelsInFlightRef = useRef(null);
    const lastValidationRef = useRef(0);
    const lastValidationAttemptRef = useRef(0);
    const validationInFlightRef = useRef(null);
    const revocationInFlightRef = useRef(null);
    const sessionGenerationRef = useRef(0);
    const unreadForegroundLastRefreshAtRef = useRef(0);

    useEffect(() => {
        userRef.current = user;
    }, [user]);

    const applySignedOutState = useCallback((nextStatus = 'signedOut') => {
        sessionGenerationRef.current += 1;
        const nextSessionGeneration = sessionGenerationRef.current;
        credentialsRef.current = null;
        lastValidationRef.current = 0;
        lastValidationAttemptRef.current = 0;
        validationInFlightRef.current = null;
        inboxUnreadRequestRef.current += 1;
        chatUnreadRequestRef.current += 1;
        chatChannelsRef.current = [];
        chatUnreadCountRef.current = 0;
        chatChannelsFetchedAtRef.current = 0;
        chatChannelsInFlightRef.current = null;
        unreadForegroundLastRefreshAtRef.current = 0;
        setActiveHarborCredentials(null);
        if (mountedRef.current) {
            setUser(null);
            setInboxUnreadCount(0);
            setChatUnreadCount(0);
            setChatChannels([]);
            setSessionGeneration(nextSessionGeneration);
            setStatus(nextStatus);
        }
    }, []);

    const activateSession = useCallback(credentials => {
        sessionGenerationRef.current += 1;
        const nextSessionGeneration = sessionGenerationRef.current;
        credentialsRef.current = credentials;
        lastValidationRef.current = 0;
        lastValidationAttemptRef.current = 0;
        validationInFlightRef.current = null;
        inboxUnreadRequestRef.current += 1;
        chatUnreadRequestRef.current += 1;
        chatChannelsRef.current = [];
        chatUnreadCountRef.current = 0;
        chatChannelsFetchedAtRef.current = 0;
        chatChannelsInFlightRef.current = null;
        unreadForegroundLastRefreshAtRef.current = 0;
        setActiveHarborCredentials(credentials);
        if (mountedRef.current) {
            setInboxUnreadCount(0);
            setChatUnreadCount(0);
            setChatChannels([]);
            setSessionGeneration(nextSessionGeneration);
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

    const patchChatUnreadCount = useCallback((count, expectedUsername) => {
        if (
            !credentialsRef.current ||
            (expectedUsername &&
                userRef.current?.username !== expectedUsername)
        ) {
            return null;
        }
        const normalizedCount = Math.max(0, Number(count) || 0);
        chatUnreadRequestRef.current += 1;
        chatUnreadCountRef.current = normalizedCount;
        if (mountedRef.current) {
            setChatUnreadCount(normalizedCount);
        }
        return normalizedCount;
    }, []);

    const refreshChatChannels = useCallback(({force = false} = {}) => {
        const username = userRef.current?.username;
        const credentialKey = credentialsRef.current?.userApiKey;
        if (!username || !credentialKey) {
            return Promise.resolve(null);
        }

        if (
            !force &&
            Date.now() - chatChannelsFetchedAtRef.current <
                CHAT_CHANNELS_FRESHNESS_INTERVAL
        ) {
            return Promise.resolve({
                items: chatChannelsRef.current,
                unreadCount: chatUnreadCountRef.current,
            });
        }

        const generation = sessionGenerationRef.current;
        const inFlight = chatChannelsInFlightRef.current;
        if (
            inFlight?.username === username &&
            inFlight?.credentialKey === credentialKey
        ) {
            return inFlight.promise;
        }

        const requestId = chatUnreadRequestRef.current + 1;
        chatUnreadRequestRef.current = requestId;
        const request = fetchHarborChatChannels()
            .then(result => {
                const nextCount = Math.max(
                    0,
                    Number(result.unreadCount) || 0,
                );
                if (
                    mountedRef.current &&
                    sessionGenerationRef.current === generation &&
                    userRef.current?.username === username &&
                    credentialsRef.current?.userApiKey === credentialKey
                ) {
                    chatChannelsRef.current = result.items;
                    chatChannelsFetchedAtRef.current = Date.now();
                    setChatChannels(result.items);
                    if (chatUnreadRequestRef.current === requestId) {
                        chatUnreadCountRef.current = nextCount;
                        setChatUnreadCount(nextCount);
                    }
                    return {
                        items: result.items,
                        unreadCount:
                            chatUnreadRequestRef.current === requestId
                                ? nextCount
                                : chatUnreadCountRef.current,
                    };
                }
                return null;
            })
            .finally(() => {
                if (chatChannelsInFlightRef.current?.promise === request) {
                    chatChannelsInFlightRef.current = null;
                }
            });
        chatChannelsInFlightRef.current = {
            username,
            credentialKey,
            promise: request,
        };
        return request;
    }, []);

    const refreshChatUnreadCount = useCallback(() => {
        return refreshChatChannels().then(
            result => result?.unreadCount ?? null,
        );
    }, [refreshChatChannels]);

    const expireSession = useCallback(
        async expectedCredentialKey => {
            if (
                expectedCredentialKey &&
                credentialsRef.current?.userApiKey !== expectedCredentialKey
            ) {
                return false;
            }

            await logoutSchedulingSession().catch(() => {});
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

    const retryPendingRevocation = useCallback(pendingQueue => {
        if (revocationInFlightRef.current) {
            return revocationInFlightRef.current;
        }

        const request = (async () => {
            const queue =
                pendingQueue || (await loadPendingHarborRevocation());
            let remainingCount = 0;

            for (const pendingCredentials of queue) {
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

            return { remainingCount };
        })().finally(() => {
            if (revocationInFlightRef.current === request) {
                revocationInFlightRef.current = null;
            }
        });
        revocationInFlightRef.current = request;
        return request;
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
                // pending key 是本地拒絕清單，實際撤銷不可阻塞首屏。
                const pendingQueue = await loadPendingHarborRevocation();
                const pendingCredentialKeys = new Set(
                    pendingQueue.map(item => item.userApiKey),
                );
                const retryRevocationInBackground = () => {
                    retryPendingRevocation(pendingQueue).catch(revokeError => {
                        logHarborAuthError(
                            'revocation.background.failed',
                            revokeError,
                        );
                    });
                };

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
                    retryRevocationInBackground();
                    return;
                }

                if (pendingCredentialKeys.has(credentials.userApiKey)) {
                    applySignedOutState();
                    await clearHarborCredentials();
                    await setLocalStorage(PROFILE_CACHE_KEY, null);
                    retryRevocationInBackground();
                    return;
                }

                const credentialCacheId = await getCredentialCacheId(
                    credentials,
                );
                const cachedProfile = await getLocalStorage(PROFILE_CACHE_KEY);
                const cachedUser =
                    cachedProfile?.credentialCacheId === credentialCacheId
                        ? cachedProfile.user
                        : null;
                const generation = activateSession(credentials);
                if (isCurrentSession(credentials, generation)) {
                    // 先用同一組憑證的快取進頁，再於背景向 Harbor 驗證。
                    setUser(cachedUser || createFallbackUser());
                    setStatus('signedIn');
                }
                retryRevocationInBackground();

                const validationRequest = refreshProfile(
                    credentials,
                    generation,
                ).catch(() => {});
                validationInFlightRef.current = validationRequest;
                validationRequest.finally(() => {
                    if (validationInFlightRef.current === validationRequest) {
                        validationInFlightRef.current = null;
                    }
                });

                loadHarborLoginIntent()
                    .then(loginIntent => {
                        if (mountedRef.current && loginIntent) {
                            setPendingLoginIntent(loginIntent);
                        }
                    })
                    .catch(intentError => {
                        logHarborAuthError(
                            'login.intent.restore.failed',
                            intentError,
                        );
                    });
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
        isCurrentSession,
        refreshProfile,
        retryPendingRevocation,
    ]);

    useEffect(() => {
        if (status === 'signedIn' && user?.username) {
            unreadForegroundLastRefreshAtRef.current = Date.now();
            Promise.allSettled([
                refreshInboxUnreadCount(),
                refreshChatUnreadCount(),
            ]);
        }
    }, [
        refreshChatUnreadCount,
        refreshInboxUnreadCount,
        status,
        user?.username,
    ]);

    // 將 Harbor 收件匣及 Chat 未讀同步到主畫面 App 角標；登出時清零
    useEffect(() => {
        const badgeCount =
            status === 'signedIn'
                ? calculateHarborUnreadTotal(
                    inboxUnreadCount,
                    chatUnreadCount,
                )
                : 0;
        syncAppIconBadgeCount(badgeCount).catch(() => {});
    }, [chatUnreadCount, inboxUnreadCount, status]);

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
            const shouldRefreshUnread =
                nextState === 'active' &&
                credentials &&
                Date.now() - unreadForegroundLastRefreshAtRef.current >
                    UNREAD_FOREGROUND_REFRESH_INTERVAL;

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
            if (shouldRefreshUnread) {
                unreadForegroundLastRefreshAtRef.current = Date.now();
                Promise.allSettled([
                    refreshInboxUnreadCount(),
                    refreshChatUnreadCount(),
                ]);
            }
        });

        return () => subscription.remove();
    }, [refreshChatUnreadCount, refreshInboxUnreadCount, refreshProfile]);

    const activateCredentialsFromCallback = useCallback(
        async credentials => {
            if (!credentials?.userApiKey) {
                return false;
            }
            logHarborAuthEvent('login.credentials.ready', {
                source: 'deeplink',
            });
            const loginIntent = await loadHarborLoginIntent();
            const generation = activateSession(credentials);
            await refreshProfile(credentials, generation);
            await clearHarborLoginIntent();
            if (mountedRef.current) {
                setPendingLoginIntent(loginIntent);
            }
            return true;
        },
        [activateSession, refreshProfile],
    );

    // OEM／系統瀏覽器回傳的 auth deep link（暖啟動）；須已點擊登入且 pending 未逾時。
    useEffect(() => {
        const handleAuthUrl = async ({ url }) => {
            if (!deliverHarborAuthDeepLink(url)) {
                return;
            }

            // 進行中的 Auth Session 會自行競速完成，避免重複處理。
            if (isHarborAuthSessionActive()) {
                return;
            }

            // 已登入時忽略 stray callback，避免覆蓋現有工作階段。
            if (credentialsRef.current) {
                return;
            }

            try {
                const credentials = await completeHarborAuthorization(url);
                if (!mountedRef.current || credentialsRef.current) {
                    return;
                }
                await activateCredentialsFromCallback(credentials);
                logHarborAuthEvent('login.success', { source: 'deeplink' });
            } catch (authError) {
                if (
                    authError.code === HARBOR_AUTH_ERROR.NO_PENDING_AUTH ||
                    authError.code === HARBOR_AUTH_ERROR.EXPIRED ||
                    authError.code === HARBOR_AUTH_ERROR.CANCELLED
                ) {
                    return;
                }
                logHarborAuthError('callback.deeplink.failed', authError);
                if (mountedRef.current) {
                    setError(authError);
                    setStatus(
                        credentialsRef.current ? 'signedIn' : 'signedOut',
                    );
                }
            }
        };

        const subscription = Linking.addEventListener('url', handleAuthUrl);
        return () => subscription.remove();
    }, [activateCredentialsFromCallback]);

    const login = useCallback(async (intent, authorizationOptions) => {
        const startedAt = Date.now();
        logHarborAuthEvent('login.start');
        setStatus('authorizing');
        setAuthorizationPhase('preparing');
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

            const credentials = await startHarborAuthorization({
                ...authorizationOptions,
                onBrowserOpen: () => {
                    if (mountedRef.current) {
                        setAuthorizationPhase('browser');
                        return new Promise(resolve =>
                            requestAnimationFrame(resolve),
                        );
                    }
                },
            });
            if (mountedRef.current) {
                setAuthorizationPhase('finishing');
            }
            logHarborAuthEvent('login.credentials.ready');
            const generation = activateSession(credentials);
            await refreshProfile(credentials, generation);
            logHarborAuthEvent('login.success', {
                durationMs: Date.now() - startedAt,
            });
            await clearHarborLoginIntent();
            return true;
        } catch (authError) {
            // 取消時保留 login intent，方便 OEM deep link 晚到後仍可導回目標頁。
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
            await clearHarborLoginIntent();
            logHarborAuthError('login.failed', authError, {
                durationMs: Date.now() - startedAt,
            });
            if (mountedRef.current) {
                setError(authError);
                setStatus(credentialsRef.current ? 'signedIn' : 'signedOut');
            }
            throw authError;
        } finally {
            if (mountedRef.current) {
                setAuthorizationPhase(null);
            }
        }
    }, [activateSession, refreshProfile, retryPendingRevocation]);

    const logout = useCallback(async () => {
        const credentials = credentialsRef.current;
        setError(null);

        await logoutSchedulingSession().catch(() => {});

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
            authorizationPhase,
            user,
            error,
            inboxUnreadCount,
            chatUnreadCount,
            chatChannels,
            login,
            logout,
            pendingLoginIntent,
            sessionGeneration,
            consumeLoginIntent,
            patchInboxUnreadCount,
            patchChatUnreadCount,
            refreshInboxUnreadCount,
            refreshChatChannels,
            refreshChatUnreadCount,
            refresh: () =>
                credentialsRef.current
                    ? refreshProfile(
                        credentialsRef.current,
                        sessionGenerationRef.current,
                    )
                    : Promise.resolve(null),
        }),
        [
            authorizationPhase,
            consumeLoginIntent,
            chatUnreadCount,
            chatChannels,
            error,
            inboxUnreadCount,
            login,
            logout,
            patchChatUnreadCount,
            patchInboxUnreadCount,
            pendingLoginIntent,
            refreshChatUnreadCount,
            refreshChatChannels,
            refreshInboxUnreadCount,
            refreshProfile,
            sessionGeneration,
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
