import {Platform} from 'react-native';

import * as Application from 'expo-application';
import * as Notifications from 'expo-notifications';

import appConfig from '../../app.json';
import {getSchedulingDeviceId} from './scheduling/schedulingAuthStorage';
import {putCurrentPushEndpoint} from './pushApi';

const PROJECT_ID = appConfig.expo?.extra?.eas?.projectId;
const TOKEN_REQUEST_TIMEOUT_MS = 15000;
const DEFAULT_NOTIFICATION_LOCALE = 'zh-Hant';
export const PUSH_SERVICE_UNAVAILABLE_ERROR_CODE =
    'push_service_unavailable';
const registrationInFlight = new Map();
let schedulingOperationQueue = Promise.resolve();

export function getPushNotificationLocale(language) {
    return language === 'en' ? 'en' : DEFAULT_NOTIFICATION_LOCALE;
}

function normalizeOptionalBoolean(value) {
    if (value === true || value === false) {
        return value;
    }
    return null;
}

function createPushError(code, message, retryable = false) {
    const error = new Error(message);
    error.code = code;
    error.retryable = retryable;
    return error;
}

export function normalizePushTokenError(
    error,
    platform = Platform.OS,
    platformConstants = Platform.constants,
) {
    const huaweiLike = ['Brand', 'Manufacturer', 'Model'].some(key =>
        /huawei|honor|harmony/.test(
            String(platformConstants?.[key] || '').toLowerCase(),
        ),
    );
    if (
        platform === 'android' &&
        (
            [
                'E_REGISTRATION_FAILED',
                'ERR_NOTIFICATIONS_PUSH_REGISTRATION_FAILED',
            ].includes(error?.code) ||
            (huaweiLike && error?.code === 'expo_push_token_timeout')
        )
    ) {
        return createPushError(
            PUSH_SERVICE_UNAVAILABLE_ERROR_CODE,
            '此裝置目前無法使用 Google 推送服務。',
        );
    }
    if (error?.code === 'expo_push_token_timeout') {
        return error;
    }
    return createPushError(
        'expo_push_token_unavailable',
        '暫時無法取得推送 token。',
        true,
    );
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

export function getHarborPushDisplayStatus({
    harborState,
    registration,
    permission,
    harborCredentialPush,
}) {
    if (harborState?.pendingAction === 'disable') {
        return 'syncing';
    }
    if (
        harborState?.errorCode === PUSH_SERVICE_UNAVAILABLE_ERROR_CODE ||
        registration?.errorCode === PUSH_SERVICE_UNAVAILABLE_ERROR_CODE
    ) {
        return PUSH_SERVICE_UNAVAILABLE_ERROR_CODE;
    }
    if (!harborState?.desiredEnabled) {
        return 'disabled';
    }
    if (!permission?.usable) {
        return 'needs_permission';
    }
    if (harborCredentialPush !== true) {
        return 'needs_harbor_authorization';
    }
    if (
        harborState?.pendingAction ||
        registration?.status !== 'registered'
    ) {
        return 'syncing';
    }
    if (
        permission.status === 'provisional' ||
        permission.allowsSound === false
    ) {
        return 'silent';
    }
    return 'enabled';
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
            systemStatus: settings?.status ?? null,
            iosAuthorizationStatus: ios.status ?? null,
            allowsAlert: normalizeOptionalBoolean(ios.allowsAlert),
            allowsDisplayInNotificationCenter:
                normalizeOptionalBoolean(
                    ios.allowsDisplayInNotificationCenter,
                ),
            allowsDisplayOnLockScreen:
                normalizeOptionalBoolean(
                    ios.allowsDisplayOnLockScreen,
                ),
            allowsSound: normalizeOptionalBoolean(ios.allowsSound),
            allowsBadge: normalizeOptionalBoolean(ios.allowsBadge),
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
        systemStatus: settings?.status ?? null,
        iosAuthorizationStatus: null,
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
            },
        }),
    );
}

async function performVisiblePushRegistration({
    requestPermission,
    prepareAuthorization,
    registerEndpoint = putCurrentPushEndpoint,
    notificationLocale = DEFAULT_NOTIFICATION_LOCALE,
    onStateChange,
}) {
    let permission = await readVisiblePushPermission();
    if (
        requestPermission &&
        (permission.status === 'provisional' ||
            (!permission.usable && permission.canAskAgain))
    ) {
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
        throw normalizePushTokenError(error);
    }
    const expoPushToken = tokenResult?.data;
    if (!expoPushToken) {
        throw createPushError(
            'expo_push_token_unavailable',
            '暫時無法取得推送 token。',
            true,
        );
    }

    const authorizationContext = await prepareAuthorization?.();

    const endpointPayload = {
        installationId,
        expoPushToken,
        platform: Platform.OS,
        appVersion: Application.nativeApplicationVersion || '',
        buildNumber: Application.nativeBuildVersion || '',
        notificationLocale: getPushNotificationLocale(notificationLocale),
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
        notificationLocale:
            response.endpoint.notificationLocale ||
            endpointPayload.notificationLocale,
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
