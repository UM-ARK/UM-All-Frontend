import {Platform} from 'react-native';

import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';

import appConfig from '../../app.json';
import {getSchedulingDeviceId} from './scheduling/schedulingAuthStorage';
import {putCurrentPushEndpoint} from './pushApi';

const PROJECT_ID = appConfig.expo?.extra?.eas?.projectId;
const TOKEN_REQUEST_TIMEOUT_MS = 15000;
const registrationInFlight = new Map();
let schedulingOperationQueue = Promise.resolve();

function createPushError(code, message, retryable = false) {
    const error = new Error(message);
    error.code = code;
    error.retryable = retryable;
    return error;
}

function withTimeout(request, timeoutMs) {
    let timer;
    const timeout = new Promise((_, reject) => {
        timer = setTimeout(() => {
            reject(
                createPushError(
                    'expo_push_token_timeout',
                    '取得推送 token 逾時。',
                    true,
                ),
            );
        }, timeoutMs);
    });
    return Promise.race([request, timeout]).finally(() => {
        clearTimeout(timer);
    });
}

export function isPushAuthorizationCurrent({
    expectedAccountKey,
    authorizationContext,
    currentAccountKey,
    currentSchedulingSessionId,
}) {
    return (
        Boolean(expectedAccountKey) &&
        authorizationContext?.accountKey === expectedAccountKey &&
        currentAccountKey === expectedAccountKey &&
        Boolean(currentSchedulingSessionId) &&
        authorizationContext?.schedulingSessionId ===
            currentSchedulingSessionId
    );
}

export function canAutomaticallyRetryPushRegistration(
    registration,
    now,
    maxRetryCount,
) {
    if (registration?.status === 'registered') {
        return true;
    }
    if (
        registration?.status !== 'retry_pending' ||
        Number(registration?.retryCount || 0) >= maxRetryCount
    ) {
        return false;
    }
    return (
        Number.isFinite(registration.retryAt) &&
        registration.retryAt <= now
    );
}

export function canAutomaticallyRetryHarborDisable(
    harborState,
    now,
    maxRetryCount,
) {
    return (
        harborState?.pendingAction === 'disable' &&
        Number(harborState?.disableRetryCount || 0) < maxRetryCount &&
        Number.isFinite(harborState?.disableRetryAt) &&
        harborState.disableRetryAt <= now
    );
}

export function shouldShowHarborPushPrompt({
    sessionStatus,
    accountKey,
    harborState,
    harborDisplayStatus,
}) {
    if (sessionStatus !== 'signedIn' || !accountKey) {
        return false;
    }
    if (harborState?.desiredEnabled === true) {
        return !['enabled', 'silent'].includes(harborDisplayStatus);
    }
    return (
        !harborState?.pendingAction &&
        harborState?.dismissedPrompt !== true
    );
}

export function runPushSchedulingOperation(operation) {
    const request = schedulingOperationQueue
        .catch(() => {})
        .then(operation);
    schedulingOperationQueue = request.catch(() => {});
    return request;
}

export function evaluateVisiblePushPermission(settings) {
    const ios = settings?.ios;
    if (Platform.OS === 'ios' && ios) {
        const provisional =
            ios.status === Notifications.IosAuthorizationStatus.PROVISIONAL;
        const denied =
            ios.status === Notifications.IosAuthorizationStatus.DENIED;
        const undetermined =
            ios.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED;
        const allowsVisibleNotification =
            ios.allowsAlert === true ||
            ios.allowsDisplayInNotificationCenter === true ||
            ios.allowsDisplayOnLockScreen === true;
        return {
            status: provisional
                ? 'provisional'
                : denied
                    ? 'denied'
                    : undetermined
                        ? 'undetermined'
                        : 'granted',
            allowsAlert: ios.allowsAlert === true,
            allowsDisplayInNotificationCenter:
                ios.allowsDisplayInNotificationCenter === true,
            allowsDisplayOnLockScreen:
                ios.allowsDisplayOnLockScreen === true,
            allowsSound: ios.allowsSound === true,
            allowsBadge: ios.allowsBadge === true,
            canAskAgain:
                undetermined && settings?.canAskAgain !== false,
            usable: provisional || allowsVisibleNotification,
        };
    }

    const granted =
        settings?.granted === true || settings?.status === 'granted';
    const denied = settings?.status === 'denied';
    return {
        status: granted ? 'granted' : denied ? 'denied' : 'undetermined',
        allowsAlert: granted,
        allowsDisplayInNotificationCenter: granted,
        allowsDisplayOnLockScreen: granted,
        allowsSound: granted,
        allowsBadge: granted,
        canAskAgain: settings?.canAskAgain !== false,
        usable: granted,
    };
}

export async function readVisiblePushPermission() {
    const permission = evaluateVisiblePushPermission(
        await Notifications.getPermissionsAsync(),
    );
    if (Platform.OS !== 'android' || !permission.usable) {
        return permission;
    }
    const channel = await Notifications.getNotificationChannelAsync(
        'default',
    );
    if (!channel) {
        return permission;
    }
    const allowsAlert = Number(channel.importance) > 0;
    return {
        ...permission,
        allowsAlert,
        allowsSound: allowsAlert && Boolean(channel.sound),
        usable: allowsAlert,
    };
}

export async function ensureAndroidPushChannel() {
    if (Platform.OS !== 'android') {
        return null;
    }
    return Notifications.setNotificationChannelAsync('default', {
        name: 'ARK ALL',
        importance: Notifications.AndroidImportance.DEFAULT,
        sound: 'default',
        vibrationPattern: [0, 250, 250, 250],
    });
}

export async function requestVisiblePushPermission() {
    await ensureAndroidPushChannel();
    return evaluateVisiblePushPermission(
        await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowProvisional: true,
            },
        }),
    );
}

async function performVisiblePushRegistration({
    requestPermission,
    prepareAuthorization,
    registerEndpoint = putCurrentPushEndpoint,
    onStateChange,
}) {
    let permission = await readVisiblePushPermission();
    if (!permission.usable && requestPermission && permission.canAskAgain) {
        permission = await requestVisiblePushPermission();
    }
    if (!permission.usable) {
        onStateChange?.({status: 'needs_permission'});
        throw createPushError(
            'push_permission_required',
            '需要系統通知權限。',
        );
    }

    onStateChange?.({status: 'registering'});
    const authorizationContext = await prepareAuthorization?.();
    await ensureAndroidPushChannel();
    if (!PROJECT_ID) {
        throw createPushError(
            'push_project_id_missing',
            'EAS projectId 未設定。',
        );
    }

    const installationId = await getSchedulingDeviceId();
    let tokenResult;
    try {
        tokenResult = await withTimeout(
            Notifications.getExpoPushTokenAsync({
                projectId: PROJECT_ID,
            }),
            TOKEN_REQUEST_TIMEOUT_MS,
        );
    } catch (error) {
        if (error?.code === 'expo_push_token_timeout') {
            throw error;
        }
        throw createPushError(
            'expo_push_token_unavailable',
            '暫時無法取得推送 token。',
            true,
        );
    }
    const expoPushToken = tokenResult?.data;
    if (!expoPushToken) {
        throw createPushError(
            'expo_push_token_unavailable',
            '暫時無法取得推送 token。',
            true,
        );
    }

    const endpointPayload = {
        installationId,
        expoPushToken,
        platform: Platform.OS,
        appVersion: Application.nativeApplicationVersion || '',
        buildNumber: Application.nativeBuildVersion || '',
    };
    const response = authorizationContext === undefined
        ? await registerEndpoint(endpointPayload)
        : await registerEndpoint(endpointPayload, authorizationContext);
    if (!response?.endpoint?.active || !response?.endpoint?.tokenStored) {
        throw createPushError(
            'push_endpoint_not_ready',
            '推送 endpoint 尚未準備完成。',
            true,
        );
    }
    const result = {
        endpointId: response.endpoint.endpointId,
        installationId,
        permission,
        authorizationContext,
    };
    onStateChange?.({
        status: 'registered',
        endpointId: result.endpointId,
    });
    return result;
}

export function ensureVisiblePushRegistration(options) {
    const singleFlightKey = options?.singleFlightKey || 'default';
    const existingRequest = registrationInFlight.get(singleFlightKey);
    if (existingRequest) {
        return existingRequest;
    }
    const request = runPushSchedulingOperation(() =>
        performVisiblePushRegistration(options),
    ).finally(() => {
        if (registrationInFlight.get(singleFlightKey) === request) {
            registrationInFlight.delete(singleFlightKey);
        }
    });
    registrationInFlight.set(singleFlightKey, request);
    return request;
}

export function __resetPushRegistrationForTests() {
    registrationInFlight.clear();
    schedulingOperationQueue = Promise.resolve();
}
