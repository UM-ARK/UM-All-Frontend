import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {AppState} from 'react-native';

import * as Notifications from 'expo-notifications';

import {useHarborSession} from './HarborSessionContext';
import i18n from '../i18n/i18n';
import {loadHarborCredentials} from '../utils/harbor/harborAuthStorage';
import {HARBOR_PUSH_URL} from '../utils/pathMap';
import {
    deleteCurrentHarborPushBinding,
    patchCurrentPushEndpointLocale,
    putCurrentPushEndpoint,
} from '../utils/pushApi';
import {
    getSafeNotificationLogDetails,
    logPushError,
    logPushEvent,
} from '../utils/pushLogger';
import {getNotificationResponseId} from '../utils/pushNavigation';
import {
    canAutomaticallyRetryHarborDisable,
    canAutomaticallyRetryPushRegistration,
    ensureVisiblePushRegistration,
    getHarborPushDisplayStatus,
    getPushNotificationLocale,
    isPushAuthorizationCurrent,
    PUSH_SERVICE_UNAVAILABLE_ERROR_CODE,
    readVisiblePushPermission,
    runPushSchedulingOperation,
    shouldShowHarborPushPrompt,
} from '../utils/pushRegistration';
import {
    createHarborPushAccountKey,
    DEFAULT_HARBOR_PUSH_STATE,
    DEFAULT_PUSH_REGISTRATION_STATE,
    loadHarborPushState,
    loadPushRegistrationState,
    saveHarborPushState,
    savePushRegistrationState,
} from '../utils/pushStorage';
import {
    getSchedulingSession,
    reverifyHarborBindingForPush,
} from '../utils/scheduling/schedulingAuth';
import {getSchedulingDeviceId} from '../utils/scheduling/schedulingAuthStorage';

const RETRY_BASE_DELAY_MS = 2000;
const RETRY_MAX_DELAY_MS = 60 * 1000;
const RETRY_MAX_COUNT = 5;
const LOCALE_SYNC_DEBOUNCE_MS = 300;
const PERMISSION_STATE_FIELDS = [
    'status',
    'systemStatus',
    'iosAuthorizationStatus',
    'allowsAlert',
    'allowsDisplayInNotificationCenter',
    'allowsDisplayOnLockScreen',
    'allowsSound',
    'allowsBadge',
    'canAskAgain',
    'usable',
];

let foregroundPermission = null;

function arePermissionStatesEqual(current, next) {
    return (
        current &&
        next &&
        PERMISSION_STATE_FIELDS.every(key => current[key] === next[key])
    );
}

Notifications.setNotificationHandler({
    handleNotification: async notification => {
        const isHarbor =
            notification?.request?.content?.data?.source === 'harbor';
        return {
            shouldPlaySound:
                isHarbor && foregroundPermission?.allowsSound === true,
            shouldSetBadge: false,
            shouldShowBanner:
                isHarbor && foregroundPermission?.usable === true,
            shouldShowList:
                isHarbor && foregroundPermission?.usable === true,
        };
    },
});

const PushRegistrationContext = createContext(null);

function nextRetryState(current, error) {
    const retryCount = Math.min(
        Number(current?.retryCount || 0) + 1,
        RETRY_MAX_COUNT,
    );
    const retryDelay = Math.min(
        RETRY_MAX_DELAY_MS,
        RETRY_BASE_DELAY_MS * 2 ** Math.max(0, retryCount - 1),
    );
    return {
        ...current,
        status: 'retry_pending',
        retryCount,
        retryAt:
            retryCount < RETRY_MAX_COUNT
                ? Date.now() + retryDelay
                : null,
        errorCode: error?.code || 'push_registration_failed',
    };
}

function nextDisableRetryState(current, error) {
    const disableRetryCount = Math.min(
        Number(current?.disableRetryCount || 0) + 1,
        RETRY_MAX_COUNT,
    );
    const retryDelay = Math.min(
        RETRY_MAX_DELAY_MS,
        RETRY_BASE_DELAY_MS *
            2 ** Math.max(0, disableRetryCount - 1),
    );
    return {
        desiredEnabled: false,
        pendingAction: 'disable',
        disableRetryCount,
        disableRetryAt:
            disableRetryCount < RETRY_MAX_COUNT
                ? Date.now() + retryDelay
                : null,
        errorCode: error?.code || 'harbor_push_disable_failed',
    };
}

export const PushRegistrationProvider = ({children}) => {
    const {
        status: harborSessionStatus,
        user,
        login,
        refreshInboxUnreadCount,
        refreshChatUnreadCount,
    } = useHarborSession();
    const [permission, setPermission] = useState(null);
    const [registration, setRegistration] = useState(
        DEFAULT_PUSH_REGISTRATION_STATE,
    );
    const [registrationRestored, setRegistrationRestored] = useState(false);
    const [harborState, setHarborState] = useState(
        DEFAULT_HARBOR_PUSH_STATE,
    );
    const [harborCredentialPush, setHarborCredentialPush] = useState(null);
    const [accountKey, setAccountKey] = useState(null);
    const [pendingNotificationResponse, setPendingNotificationResponse] =
        useState(null);
    const mountedRef = useRef(true);
    const harborStateRef = useRef(harborState);
    const registrationRef = useRef(registration);
    const accountKeyRef = useRef(accountKey);
    const handledResponseIdsRef = useRef(new Set());
    const reconcileRef = useRef(null);
    const localeSyncRef = useRef(null);
    const localeSyncInFlightRef = useRef(null);
    const localeSyncTimerRef = useRef(null);
    const disableInFlightRef = useRef(new Map());

    useEffect(() => {
        harborStateRef.current = harborState;
    }, [harborState]);

    useEffect(() => {
        registrationRef.current = registration;
    }, [registration]);

    useEffect(() => {
        accountKeyRef.current = accountKey;
    }, [accountKey]);

    const updatePermission = useCallback(async () => {
        try {
            const nextPermission = await readVisiblePushPermission();
            foregroundPermission = nextPermission;
            logPushEvent('permission.read', {
                status: nextPermission.status,
                systemStatus: nextPermission.systemStatus,
                iosAuthorizationStatus:
                    nextPermission.iosAuthorizationStatus,
                allowsAlert: nextPermission.allowsAlert,
                allowsDisplayInNotificationCenter:
                    nextPermission.allowsDisplayInNotificationCenter,
                allowsDisplayOnLockScreen:
                    nextPermission.allowsDisplayOnLockScreen,
                allowsSound: nextPermission.allowsSound,
                allowsBadge: nextPermission.allowsBadge,
                usable: nextPermission.usable,
            });
            if (mountedRef.current) {
                setPermission(currentPermission =>
                    arePermissionStatesEqual(
                        currentPermission,
                        nextPermission,
                    )
                        ? currentPermission
                        : nextPermission,
                );
            }
            return nextPermission;
        } catch (error) {
            logPushError('permission.read.failed', error);
            return null;
        }
    }, []);

    const updateRegistration = useCallback(async patch => {
        const nextState = {
            ...registrationRef.current,
            ...patch,
        };
        registrationRef.current = nextState;
        if (mountedRef.current) {
            setRegistration(nextState);
        }
        await savePushRegistrationState(nextState);
        return nextState;
    }, []);

    const updateHarborState = useCallback(async (
        patch,
        expectedAccountKey = accountKeyRef.current,
    ) => {
        if (
            !expectedAccountKey ||
            accountKeyRef.current !== expectedAccountKey
        ) {
            return null;
        }
        const nextState = {
            ...harborStateRef.current,
            ...patch,
        };
        harborStateRef.current = nextState;
        await saveHarborPushState(expectedAccountKey, nextState);
        if (accountKeyRef.current !== expectedAccountKey) {
            return null;
        }
        if (mountedRef.current) {
            setHarborState(nextState);
        }
        return nextState;
    }, []);

    const ensureCurrentHarborAccountState = useCallback(async () => {
        if (accountKeyRef.current) {
            return accountKeyRef.current;
        }
        const installationId = await getSchedulingDeviceId();
        const nextAccountKey = createHarborPushAccountKey(
            user,
            installationId,
        );
        if (!nextAccountKey) {
            const error = new Error('Harbor 推送帳號狀態尚未準備完成。');
            error.code = 'harbor_push_account_not_ready';
            throw error;
        }
        const storedState = await loadHarborPushState(nextAccountKey);
        accountKeyRef.current = nextAccountKey;
        harborStateRef.current = storedState;
        if (mountedRef.current) {
            setAccountKey(nextAccountKey);
            setHarborState(storedState);
        }
        return nextAccountKey;
    }, [user]);

    useEffect(() => {
        mountedRef.current = true;
        Promise.all([
            loadPushRegistrationState(),
            updatePermission(),
        ]).then(([storedRegistration]) => {
            registrationRef.current = storedRegistration;
            if (mountedRef.current) {
                setRegistration(storedRegistration);
                setRegistrationRestored(true);
            }
        }).catch(error => {
            logPushError('state.restore.failed', error);
        });
        return () => {
            mountedRef.current = false;
            if (localeSyncTimerRef.current) {
                clearTimeout(localeSyncTimerRef.current);
            }
        };
    }, [updatePermission]);

    useEffect(() => {
        let cancelled = false;
        if (
            harborSessionStatus === 'authorizing' &&
            user &&
            accountKeyRef.current
        ) {
            return () => {
                cancelled = true;
            };
        }
        if (harborSessionStatus !== 'signedIn' || !user) {
            accountKeyRef.current = null;
            setAccountKey(null);
            setHarborState({...DEFAULT_HARBOR_PUSH_STATE});
            setHarborCredentialPush(null);
            return () => {
                cancelled = true;
            };
        }

        Promise.all([
            getSchedulingDeviceId(),
            loadHarborCredentials(),
        ]).then(async ([installationId, credentials]) => {
            const nextAccountKey = createHarborPushAccountKey(
                user,
                installationId,
            );
            const nextHarborState = await loadHarborPushState(nextAccountKey);
            if (cancelled || !mountedRef.current) {
                return;
            }
            accountKeyRef.current = nextAccountKey;
            harborStateRef.current = nextHarborState;
            setAccountKey(nextAccountKey);
            setHarborState(nextHarborState);
            setHarborCredentialPush(credentials?.push === true);
        }).catch(error => {
            logPushError('harbor.state.restore.failed', error);
        });

        return () => {
            cancelled = true;
        };
    }, [harborSessionStatus, user]);

    const prepareHarborAuthorization = useCallback(
        async (allowReauthorization, expectedAccountKey) => {
            if (accountKeyRef.current !== expectedAccountKey) {
                const error = new Error('Harbor 推送帳號已改變。');
                error.code = 'harbor_push_operation_stale';
                throw error;
            }
            let credentials = await loadHarborCredentials();
            if (credentials?.push !== true && allowReauthorization) {
                const completed = await login(
                    {
                        routeName: 'HarborAccountSettings',
                    },
                    {
                        purpose: 'harbor_push',
                        scopes: ['read', 'write', 'push'],
                        pushUrl: HARBOR_PUSH_URL,
                    },
                );
                if (!completed) {
                    const error = new Error('已取消 Harbor 推送授權。');
                    error.code = 'harbor_push_authorization_cancelled';
                    throw error;
                }
                credentials = await loadHarborCredentials();
            }
            if (accountKeyRef.current !== expectedAccountKey) {
                const error = new Error('Harbor 推送帳號已改變。');
                error.code = 'harbor_push_operation_stale';
                throw error;
            }
            const pushCapable = credentials?.push === true;
            if (mountedRef.current) {
                setHarborCredentialPush(pushCapable);
            }
            if (!pushCapable) {
                const error = new Error('需要重新授權 Harbor 推送。');
                error.code = 'harbor_push_authorization_required';
                throw error;
            }
            const verifiedSession = await reverifyHarborBindingForPush();
            if (accountKeyRef.current !== expectedAccountKey) {
                const error = new Error('Harbor 推送帳號已改變。');
                error.code = 'harbor_push_operation_stale';
                throw error;
            }
            return {
                accountKey: expectedAccountKey,
                schedulingSessionId: verifiedSession.sessionId,
                schedulingSession: {
                    sessionId: verifiedSession.sessionId,
                    accessToken: verifiedSession.accessToken,
                },
            };
        },
        [login],
    );

    const reconcileHarborPush = useCallback(
        async ({
            requestPermission = false,
            allowReauthorization = false,
            expectedAccountKey = null,
        } = {}) => {
            if (harborSessionStatus !== 'signedIn') {
                return null;
            }
            if (
                !requestPermission &&
                harborStateRef.current.desiredEnabled !== true
            ) {
                return null;
            }
            const operationAccountKey =
                expectedAccountKey || accountKeyRef.current;
            if (
                !operationAccountKey ||
                accountKeyRef.current !== operationAccountKey
            ) {
                return null;
            }
            const initialSchedulingSessionId =
                getSchedulingSession()?.sessionId || 'exchange';
            const notificationLocale = getPushNotificationLocale(
                i18n.resolvedLanguage || i18n.language,
            );
            let operationSchedulingSessionId = null;

            try {
                const result = await ensureVisiblePushRegistration({
                    reason: 'harbor',
                    requestPermission,
                    singleFlightKey:
                        `${operationAccountKey}:${initialSchedulingSessionId}:` +
                        notificationLocale,
                    notificationLocale,
                    prepareAuthorization: async () => {
                        const authorizationContext =
                            await prepareHarborAuthorization(
                                allowReauthorization,
                                operationAccountKey,
                            );
                        operationSchedulingSessionId =
                            authorizationContext.schedulingSessionId;
                        return authorizationContext;
                    },
                    registerEndpoint: (payload, authorizationContext) => {
                        if (!isPushAuthorizationCurrent({
                            expectedAccountKey: operationAccountKey,
                            authorizationContext,
                            currentAccountKey: accountKeyRef.current,
                            currentSchedulingSessionId:
                                getSchedulingSession()?.sessionId,
                        })) {
                            const error = new Error(
                                'Harbor 推送帳號已改變。',
                            );
                            error.code = 'harbor_push_operation_stale';
                            throw error;
                        }
                        return putCurrentPushEndpoint(
                            payload,
                            authorizationContext.schedulingSession,
                        );
                    },
                    onStateChange: patch => {
                        updateRegistration({
                            ...patch,
                            retryAt: null,
                            errorCode: null,
                        }).catch(() => {});
                    },
                });
                const currentSchedulingSession = getSchedulingSession();
                if (!isPushAuthorizationCurrent({
                    expectedAccountKey: operationAccountKey,
                    authorizationContext: result.authorizationContext,
                    currentAccountKey: accountKeyRef.current,
                    currentSchedulingSessionId:
                        currentSchedulingSession?.sessionId,
                })) {
                    logPushEvent('harbor.registration.stale');
                    return null;
                }
                await updatePermission();
                const schedulingSessionBeforeCommit = getSchedulingSession();
                if (!isPushAuthorizationCurrent({
                    expectedAccountKey: operationAccountKey,
                    authorizationContext: result.authorizationContext,
                    currentAccountKey: accountKeyRef.current,
                    currentSchedulingSessionId:
                        schedulingSessionBeforeCommit?.sessionId,
                })) {
                    logPushEvent('harbor.registration.stale');
                    return null;
                }
                await updateRegistration({
                    status: 'registered',
                    endpointId: result.endpointId,
                    retryCount: 0,
                    retryAt: null,
                    errorCode: null,
                    registeredLocale: result.notificationLocale,
                    localeSyncPending:
                        result.notificationLocale !==
                        getPushNotificationLocale(
                            i18n.resolvedLanguage || i18n.language,
                        ),
                });
                const committedState = await updateHarborState({
                    desiredEnabled: true,
                    pendingAction: null,
                    errorCode: null,
                }, operationAccountKey);
                if (!committedState) {
                    logPushEvent('harbor.registration.stale');
                    return null;
                }
                logPushEvent('harbor.registration.ready');
                return result;
            } catch (error) {
                const currentSchedulingSession = getSchedulingSession();
                if (
                    accountKeyRef.current !== operationAccountKey ||
                    (operationSchedulingSessionId &&
                        operationSchedulingSessionId !==
                            currentSchedulingSession?.sessionId)
                ) {
                    logPushEvent('harbor.registration.stale');
                    throw error;
                }
                const permissionRequired =
                    error?.code === 'push_permission_required';
                const pushServiceUnavailable =
                    error?.code === PUSH_SERVICE_UNAVAILABLE_ERROR_CODE;
                if (!permissionRequired && error?.retryable === true) {
                    await updateRegistration(
                        nextRetryState(registrationRef.current, error),
                    );
                } else if (!permissionRequired) {
                    await updateRegistration({
                        status: 'idle',
                        retryAt: null,
                        errorCode:
                            error?.code || 'push_registration_failed',
                    });
                }
                await updateHarborState({
                    desiredEnabled: !pushServiceUnavailable,
                    pendingAction: pushServiceUnavailable ? null : 'enable',
                    ...(pushServiceUnavailable
                        ? {dismissedPrompt: true}
                        : {}),
                    errorCode: error?.code || 'push_registration_failed',
                }, operationAccountKey);
                logPushError('harbor.registration.failed', error);
                throw error;
            }
        },
        [
            harborSessionStatus,
            prepareHarborAuthorization,
            updateHarborState,
            updatePermission,
            updateRegistration,
        ],
    );

    useEffect(() => {
        reconcileRef.current = reconcileHarborPush;
    }, [reconcileHarborPush]);

    const syncNotificationLocale = useCallback(() => {
        if (
            harborSessionStatus !== 'signedIn' ||
            !accountKeyRef.current ||
            harborStateRef.current.desiredEnabled !== true
        ) {
            return Promise.resolve(null);
        }
        const desiredLocale = getPushNotificationLocale(
            i18n.resolvedLanguage || i18n.language,
        );
        if (
            registrationRef.current.registeredLocale === desiredLocale &&
            registrationRef.current.localeSyncPending !== true
        ) {
            return Promise.resolve(desiredLocale);
        }
        if (localeSyncInFlightRef.current) {
            return localeSyncInFlightRef.current;
        }

        const operationAccountKey = accountKeyRef.current;
        let completedLocale = null;
        let needsFullRegistration = false;
        const request = runPushSchedulingOperation(async () => {
            if (
                accountKeyRef.current !== operationAccountKey ||
                harborStateRef.current.desiredEnabled !== true
            ) {
                return null;
            }
            const notificationLocale = getPushNotificationLocale(
                i18n.resolvedLanguage || i18n.language,
            );
            await updateRegistration({localeSyncPending: true});
            const installationId = await getSchedulingDeviceId();
            const response = await patchCurrentPushEndpointLocale(
                installationId,
                notificationLocale,
            );
            if (!response?.endpoint?.active) {
                const error = new Error('推送 endpoint 尚未準備完成。');
                error.code = 'push_endpoint_not_ready';
                throw error;
            }
            if (
                response.endpoint.notificationLocale !== notificationLocale
            ) {
                const error = new Error('推送語言回應無效。');
                error.code = 'push_locale_response_invalid';
                throw error;
            }
            if (accountKeyRef.current !== operationAccountKey) {
                return null;
            }
            completedLocale = response.endpoint.notificationLocale;
            const currentLocale = getPushNotificationLocale(
                i18n.resolvedLanguage || i18n.language,
            );
            await updateRegistration({
                registeredLocale: completedLocale,
                localeSyncPending: completedLocale !== currentLocale,
            });
            logPushEvent('notification.locale.synced', {
                notificationLocale: completedLocale,
            });
            return completedLocale;
        }).catch(async error => {
            needsFullRegistration = [
                'push_endpoint_not_found',
                'push_endpoint_not_ready',
            ].includes(error?.code);
            await updateRegistration({localeSyncPending: true});
            logPushError('notification.locale.sync.failed', error);
            return null;
        }).finally(() => {
            if (localeSyncInFlightRef.current === request) {
                localeSyncInFlightRef.current = null;
            }
            if (
                accountKeyRef.current !== operationAccountKey ||
                harborStateRef.current.desiredEnabled !== true
            ) {
                return;
            }
            const currentLocale = getPushNotificationLocale(
                i18n.resolvedLanguage || i18n.language,
            );
            if (needsFullRegistration) {
                setTimeout(() => {
                    reconcileRef.current?.({requestPermission: false}).catch(
                        () => {},
                    );
                }, 0);
            } else if (completedLocale && completedLocale !== currentLocale) {
                setTimeout(() => {
                    localeSyncRef.current?.().catch(() => {});
                }, 0);
            }
        });
        localeSyncInFlightRef.current = request;
        return request;
    }, [harborSessionStatus, updateRegistration]);

    useEffect(() => {
        localeSyncRef.current = syncNotificationLocale;
    }, [syncNotificationLocale]);

    const scheduleNotificationLocaleSync = useCallback(() => {
        if (localeSyncTimerRef.current) {
            clearTimeout(localeSyncTimerRef.current);
        }
        localeSyncTimerRef.current = setTimeout(() => {
            localeSyncTimerRef.current = null;
            localeSyncRef.current?.().catch(() => {});
        }, LOCALE_SYNC_DEBOUNCE_MS);
    }, []);

    useEffect(() => {
        const handleLanguageChanged = () => {
            if (harborStateRef.current.desiredEnabled !== true) {
                return;
            }
            updateRegistration({localeSyncPending: true}).catch(() => {});
            scheduleNotificationLocaleSync();
        };
        i18n.on('languageChanged', handleLanguageChanged);
        return () => {
            i18n.off('languageChanged', handleLanguageChanged);
        };
    }, [scheduleNotificationLocaleSync, updateRegistration]);

    useEffect(() => {
        const notificationLocale = getPushNotificationLocale(
            i18n.resolvedLanguage || i18n.language,
        );
        if (
            harborSessionStatus === 'signedIn' &&
            accountKey &&
            harborState.desiredEnabled &&
            registration.status === 'registered' &&
            registration.registeredLocale !== notificationLocale
        ) {
            syncNotificationLocale().catch(() => {});
        }
    }, [
        accountKey,
        harborSessionStatus,
        harborState.desiredEnabled,
        registration.registeredLocale,
        registration.status,
        syncNotificationLocale,
    ]);

    useEffect(() => {
        if (
            harborSessionStatus === 'signedIn' &&
            accountKey &&
            harborState.desiredEnabled &&
            canAutomaticallyRetryPushRegistration(
                registrationRef.current,
                Date.now(),
                RETRY_MAX_COUNT,
            )
        ) {
            reconcileHarborPush({requestPermission: false}).catch(() => {});
        }
    }, [
        accountKey,
        harborSessionStatus,
        harborState.desiredEnabled,
        reconcileHarborPush,
    ]);

    const enableHarborPush = useCallback(async () => {
        const operationAccountKey = await ensureCurrentHarborAccountState();
        await updateRegistration({
            status: 'idle',
            retryCount: 0,
            retryAt: null,
            errorCode: null,
        });
        const savedIntent = await updateHarborState({
            desiredEnabled: true,
            pendingAction: 'enable',
            errorCode: null,
        }, operationAccountKey);
        if (!savedIntent) {
            return null;
        }
        return reconcileHarborPush({
            requestPermission: true,
            allowReauthorization: true,
            expectedAccountKey: operationAccountKey,
        });
    }, [
        ensureCurrentHarborAccountState,
        reconcileHarborPush,
        updateHarborState,
        updateRegistration,
    ]);

    const disableHarborPush = useCallback(async ({automatic = false} = {}) => {
        const operationAccountKey = await ensureCurrentHarborAccountState();
        if (
            automatic &&
            !canAutomaticallyRetryHarborDisable(
                harborStateRef.current,
                Date.now(),
                RETRY_MAX_COUNT,
            )
        ) {
            return false;
        }
        const existingRequest =
            disableInFlightRef.current.get(operationAccountKey);
        if (existingRequest) {
            return existingRequest;
        }
        const request = (async () => {
            const savedIntent = await updateHarborState({
                desiredEnabled: false,
                pendingAction: 'disable',
                dismissedPrompt: true,
                ...(!automatic
                    ? {
                        disableRetryCount: 0,
                        disableRetryAt: Date.now(),
                    }
                    : {}),
                errorCode: null,
            }, operationAccountKey);
            if (!savedIntent) {
                logPushEvent('harbor.binding.disable.stale');
                return false;
            }
            try {
                await runPushSchedulingOperation(async () => {
                    const authorizationContext =
                        await prepareHarborAuthorization(
                            false,
                            operationAccountKey,
                        );
                    if (!isPushAuthorizationCurrent({
                        expectedAccountKey: operationAccountKey,
                        authorizationContext,
                        currentAccountKey: accountKeyRef.current,
                        currentSchedulingSessionId:
                            getSchedulingSession()?.sessionId,
                    })) {
                        const error = new Error('Harbor 推送帳號已改變。');
                        error.code = 'harbor_push_operation_stale';
                        throw error;
                    }
                    const installationId = await getSchedulingDeviceId();
                    if (!isPushAuthorizationCurrent({
                        expectedAccountKey: operationAccountKey,
                        authorizationContext,
                        currentAccountKey: accountKeyRef.current,
                        currentSchedulingSessionId:
                            getSchedulingSession()?.sessionId,
                    })) {
                        const error = new Error('Harbor 推送帳號已改變。');
                        error.code = 'harbor_push_operation_stale';
                        throw error;
                    }
                    await deleteCurrentHarborPushBinding(
                        installationId,
                        authorizationContext.schedulingSession,
                    );
                });
                if (accountKeyRef.current !== operationAccountKey) {
                    logPushEvent('harbor.binding.disable.stale');
                    return false;
                }
                await updateHarborState({
                    desiredEnabled: false,
                    pendingAction: null,
                    disableRetryCount: 0,
                    disableRetryAt: null,
                    errorCode: null,
                }, operationAccountKey);
                logPushEvent('harbor.binding.disabled');
                return true;
            } catch (error) {
                if (accountKeyRef.current !== operationAccountKey) {
                    logPushEvent('harbor.binding.disable.stale');
                    throw error;
                }
                await updateHarborState(
                    nextDisableRetryState(harborStateRef.current, error),
                    operationAccountKey,
                );
                logPushError('harbor.binding.disable.failed', error);
                throw error;
            }
        })().finally(() => {
            if (
                disableInFlightRef.current.get(operationAccountKey) ===
                request
            ) {
                disableInFlightRef.current.delete(operationAccountKey);
            }
        });
        disableInFlightRef.current.set(operationAccountKey, request);
        return request;
    }, [
        ensureCurrentHarborAccountState,
        prepareHarborAuthorization,
        updateHarborState,
    ]);

    const dismissHarborPushPrompt = useCallback(() => {
        return updateHarborState({dismissedPrompt: true});
    }, [updateHarborState]);

    useEffect(() => {
        if (
            harborSessionStatus === 'signedIn' &&
            accountKey &&
            canAutomaticallyRetryHarborDisable(
                harborState,
                Date.now(),
                RETRY_MAX_COUNT,
            )
        ) {
            disableHarborPush({automatic: true}).catch(() => {});
        }
    }, [
        accountKey,
        disableHarborPush,
        harborSessionStatus,
        harborState,
    ]);

    const captureNotificationResponse = useCallback(response => {
        const responseId = getNotificationResponseId(response);
        if (!responseId || handledResponseIdsRef.current.has(responseId)) {
            return;
        }
        handledResponseIdsRef.current.add(responseId);
        setPendingNotificationResponse(response);
        logPushEvent(
            'notification.response.received',
            getSafeNotificationLogDetails(response.notification),
        );
    }, []);

    useEffect(() => {
        const receivedSubscription =
            Notifications.addNotificationReceivedListener(notification => {
                if (
                    notification?.request?.content?.data?.source !== 'harbor'
                ) {
                    return;
                }
                logPushEvent(
                    'notification.received',
                    getSafeNotificationLogDetails(notification),
                );
                Promise.allSettled([
                    refreshInboxUnreadCount(),
                    refreshChatUnreadCount(),
                ]);
            });
        const responseSubscription =
            Notifications.addNotificationResponseReceivedListener(
                captureNotificationResponse,
            );
        const tokenSubscription = Notifications.addPushTokenListener(() => {
            if (harborStateRef.current.desiredEnabled === true) {
                reconcileRef.current?.({requestPermission: false}).catch(
                    () => {},
                );
            }
        });
        Notifications.getLastNotificationResponseAsync()
            .then(captureNotificationResponse)
            .catch(error => {
                logPushError('notification.response.restore.failed', error);
            });

        return () => {
            receivedSubscription.remove();
            responseSubscription.remove();
            tokenSubscription.remove();
        };
    }, [
        captureNotificationResponse,
        refreshChatUnreadCount,
        refreshInboxUnreadCount,
    ]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState !== 'active') {
                return;
            }
            updatePermission().catch(() => {});
            if (harborStateRef.current.pendingAction === 'disable') {
                disableHarborPush({automatic: true}).catch(() => {});
            } else if (
                harborStateRef.current.desiredEnabled === true &&
                canAutomaticallyRetryPushRegistration(
                    registrationRef.current,
                    Date.now(),
                    RETRY_MAX_COUNT,
                )
            ) {
                reconcileRef.current?.({requestPermission: false}).catch(
                    () => {},
                );
            } else if (
                harborStateRef.current.desiredEnabled === true &&
                registrationRef.current.registeredLocale !==
                    getPushNotificationLocale(
                        i18n.resolvedLanguage || i18n.language,
                    )
            ) {
                localeSyncRef.current?.().catch(() => {});
            }
        });
        return () => subscription.remove();
    }, [
        disableHarborPush,
        updatePermission,
    ]);

    useEffect(() => {
        if (
            harborSessionStatus !== 'signedIn' ||
            harborState.pendingAction !== 'disable' ||
            !harborState.disableRetryAt ||
            harborState.disableRetryCount >= RETRY_MAX_COUNT
        ) {
            return undefined;
        }
        const delay = Math.max(
            0,
            harborState.disableRetryAt - Date.now(),
        );
        const timer = setTimeout(() => {
            disableHarborPush({automatic: true}).catch(() => {});
        }, delay);
        return () => clearTimeout(timer);
    }, [
        disableHarborPush,
        harborSessionStatus,
        harborState.disableRetryAt,
        harborState.disableRetryCount,
        harborState.pendingAction,
    ]);

    useEffect(() => {
        if (
            harborSessionStatus !== 'signedIn' ||
            harborState.pendingAction !== 'enable' ||
            registration.status !== 'retry_pending' ||
            !registration.retryAt
        ) {
            return undefined;
        }
        const delay = Math.max(0, registration.retryAt - Date.now());
        const timer = setTimeout(() => {
            reconcileHarborPush({requestPermission: false}).catch(() => {});
        }, delay);
        return () => clearTimeout(timer);
    }, [
        harborSessionStatus,
        harborState.pendingAction,
        reconcileHarborPush,
        registration.retryAt,
        registration.status,
    ]);

    const consumePendingNotificationResponse = useCallback(() => {
        setPendingNotificationResponse(null);
        Notifications.clearLastNotificationResponseAsync().catch(() => {});
    }, []);

    const harborDisplayStatus = useMemo(
        () => getHarborPushDisplayStatus({
            harborState,
            registration,
            permission,
            harborCredentialPush,
        }),
        [
            harborCredentialPush,
            harborState,
            permission,
            registration,
        ],
    );

    useEffect(() => {
        if (!permission) {
            return;
        }
        logPushEvent('harbor.display_status', {
            displayStatus: harborDisplayStatus,
            reason:
                harborDisplayStatus === 'silent'
                    ? permission.status === 'provisional'
                        ? 'provisional_authorization'
                        : 'sound_disabled'
                    : null,
            permissionStatus: permission.status,
            systemStatus: permission.systemStatus,
            iosAuthorizationStatus: permission.iosAuthorizationStatus,
            allowsAlert: permission.allowsAlert,
            allowsDisplayInNotificationCenter:
                permission.allowsDisplayInNotificationCenter,
            allowsDisplayOnLockScreen:
                permission.allowsDisplayOnLockScreen,
            allowsSound: permission.allowsSound,
            allowsBadge: permission.allowsBadge,
            usable: permission.usable,
        });
    }, [harborDisplayStatus, permission]);

    const value = useMemo(
        () => ({
            permission,
            registration,
            harborState,
            harborDisplayStatus,
            shouldShowHarborPrompt: shouldShowHarborPushPrompt({
                sessionStatus: harborSessionStatus,
                accountKey,
                stateReady:
                    registrationRestored &&
                    permission !== null &&
                    harborCredentialPush !== null,
                harborState,
                harborDisplayStatus,
            }),
            pendingNotificationResponse,
            enableHarborPush,
            disableHarborPush,
            dismissHarborPushPrompt,
            updatePermission,
            consumePendingNotificationResponse,
        }),
        [
            consumePendingNotificationResponse,
            disableHarborPush,
            dismissHarborPushPrompt,
            enableHarborPush,
            harborDisplayStatus,
            harborCredentialPush,
            harborSessionStatus,
            harborState,
            accountKey,
            pendingNotificationResponse,
            permission,
            registration,
            registrationRestored,
            updatePermission,
        ],
    );

    return (
        <PushRegistrationContext.Provider value={value}>
            {children}
        </PushRegistrationContext.Provider>
    );
};

export function usePushRegistration() {
    const context = useContext(PushRegistrationContext);
    if (!context) {
        throw new Error(
            'usePushRegistration 必須在 PushRegistrationProvider 內使用。',
        );
    }
    return context;
}
