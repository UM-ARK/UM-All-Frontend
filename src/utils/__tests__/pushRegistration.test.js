jest.mock('react-native', () => ({
    Platform: {OS: 'ios'},
}));

jest.mock('expo-application', () => ({
    nativeApplicationVersion: '26.8.8',
    nativeBuildVersion: '90',
}));

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockGetExpoPushTokenAsync = jest.fn();

jest.mock('expo-notifications', () => ({
    AndroidImportance: {DEFAULT: 3},
    IosAuthorizationStatus: {
        NOT_DETERMINED: 0,
        DENIED: 1,
        AUTHORIZED: 2,
        PROVISIONAL: 3,
    },
    getPermissionsAsync: (...args) => mockGetPermissionsAsync(...args),
    requestPermissionsAsync: (...args) =>
        mockRequestPermissionsAsync(...args),
    getExpoPushTokenAsync: (...args) => mockGetExpoPushTokenAsync(...args),
    getNotificationChannelAsync: jest.fn(),
    setNotificationChannelAsync: jest.fn(),
}));

jest.mock('../scheduling/schedulingAuthStorage', () => ({
    getSchedulingDeviceId: jest.fn(
        async () => '5d2b67a4-d4ca-4b8a-b409-466fcdab198d',
    ),
}));

jest.mock('../pushApi', () => ({
    putCurrentPushEndpoint: jest.fn(),
}));

const mockPushApi = jest.requireMock('../pushApi');
const mockNotifications = jest.requireMock('expo-notifications');
const mockReactNative = jest.requireMock('react-native');
const mockSchedulingStorage = jest.requireMock(
    '../scheduling/schedulingAuthStorage',
);

import {
    __resetPushRegistrationForTests,
    canAutomaticallyRetryHarborDisable,
    canAutomaticallyRetryPushRegistration,
    ensureVisiblePushRegistration,
    isPushAuthorizationCurrent,
    shouldShowHarborPushPrompt,
} from '../pushRegistration';

const GRANTED_PERMISSION = {
    granted: true,
    canAskAgain: true,
    ios: {
        status: 2,
        allowsAlert: true,
        allowsSound: true,
        allowsBadge: true,
    },
};

describe('pushRegistration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        __resetPushRegistrationForTests();
        mockReactNative.Platform.OS = 'ios';
        mockGetPermissionsAsync.mockResolvedValue(GRANTED_PERMISSION);
        mockGetExpoPushTokenAsync.mockResolvedValue({
            data: 'ExpoPushToken[test-token]',
        });
        mockPushApi.putCurrentPushEndpoint.mockResolvedValue({
            endpoint: {
                endpointId: 'endpoint-id',
                active: true,
                tokenStored: true,
            },
        });
    });

    it('推送尚未完成時持續顯示提示，成功後才隱藏', () => {
        const baseState = {
            desiredEnabled: true,
            pendingAction: 'enable',
            dismissedPrompt: false,
        };

        expect(shouldShowHarborPushPrompt({
            sessionStatus: 'signedIn',
            accountKey: '2893:installation-id',
            harborState: baseState,
            harborDisplayStatus: 'needs_permission',
        })).toBe(true);
        expect(shouldShowHarborPushPrompt({
            sessionStatus: 'signedIn',
            accountKey: '2893:installation-id',
            harborState: {...baseState, dismissedPrompt: true},
            harborDisplayStatus: 'syncing',
        })).toBe(true);
        expect(shouldShowHarborPushPrompt({
            sessionStatus: 'signedIn',
            accountKey: '2893:installation-id',
            harborState: baseState,
            harborDisplayStatus: 'enabled',
        })).toBe(false);
        expect(shouldShowHarborPushPrompt({
            sessionStatus: 'signedIn',
            accountKey: '2893:installation-id',
            harborState: {
                desiredEnabled: false,
                pendingAction: null,
                dismissedPrompt: true,
            },
            harborDisplayStatus: 'disabled',
        })).toBe(false);
    });

    it('已授權時按正確順序準備身份及註冊 endpoint', async () => {
        const prepareAuthorization = jest.fn(async () => {});

        await expect(
            ensureVisiblePushRegistration({
                requestPermission: false,
                prepareAuthorization,
            }),
        ).resolves.toMatchObject({endpointId: 'endpoint-id'});

        expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
        expect(prepareAuthorization).toHaveBeenCalledTimes(1);
        expect(mockSchedulingStorage.getSchedulingDeviceId).toHaveBeenCalledTimes(1);
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledWith({
            projectId: 'cf0bd876-f7b8-4a6d-b40c-a1708d2d636c',
        });
        expect(mockPushApi.putCurrentPushEndpoint).toHaveBeenCalledWith({
            installationId: '5d2b67a4-d4ca-4b8a-b409-466fcdab198d',
            expoPushToken: 'ExpoPushToken[test-token]',
            platform: 'ios',
            appVersion: '26.8.8',
            buildNumber: '90',
        });
    });

    it('非 CTA reconcile 不會首次請權限或取得 token', async () => {
        mockGetPermissionsAsync.mockResolvedValue({
            canAskAgain: true,
            ios: {
                status: 0,
                allowsAlert: false,
                allowsSound: false,
                allowsBadge: false,
            },
        });

        await expect(
            ensureVisiblePushRegistration({requestPermission: false}),
        ).rejects.toMatchObject({code: 'push_permission_required'});
        expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
        expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
        expect(mockPushApi.putCurrentPushEndpoint).not.toHaveBeenCalled();
    });

    it('只有 CTA 可請 alert、sound、badge 權限', async () => {
        mockGetPermissionsAsync.mockResolvedValue({
            canAskAgain: true,
            ios: {status: 0},
        });
        mockRequestPermissionsAsync.mockResolvedValue(GRANTED_PERMISSION);

        await ensureVisiblePushRegistration({requestPermission: true});

        expect(mockRequestPermissionsAsync).toHaveBeenCalledWith({
            ios: {
                allowAlert: true,
                allowBadge: true,
                allowSound: true,
                allowProvisional: true,
            },
        });
    });

    it('既有 badge-only iOS 授權必須引導至系統設定', async () => {
        mockGetPermissionsAsync.mockResolvedValue({
            granted: true,
            canAskAgain: true,
            ios: {
                status: 2,
                allowsAlert: false,
                allowsSound: false,
                allowsBadge: true,
            },
        });

        await expect(
            ensureVisiblePushRegistration({requestPermission: true}),
        ).rejects.toMatchObject({code: 'push_permission_required'});
        expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
        expect(mockGetExpoPushTokenAsync).not.toHaveBeenCalled();
    });

    it('iOS 通知中心或鎖定畫面可顯示時可繼續註冊', async () => {
        mockGetPermissionsAsync.mockResolvedValue({
            granted: true,
            canAskAgain: false,
            ios: {
                status: 2,
                allowsAlert: false,
                allowsDisplayInNotificationCenter: true,
                allowsDisplayOnLockScreen: false,
                allowsSound: true,
                allowsBadge: true,
            },
        });

        await expect(
            ensureVisiblePushRegistration({requestPermission: false}),
        ).resolves.toMatchObject({endpointId: 'endpoint-id'});
        expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(1);
        expect(mockPushApi.putCurrentPushEndpoint).toHaveBeenCalledTimes(1);
    });

    it('多個 caller 共用 single-flight token 與 endpoint request', async () => {
        let resolveToken;
        mockGetExpoPushTokenAsync.mockReturnValue(
            new Promise(resolve => {
                resolveToken = resolve;
            }),
        );

        const first = ensureVisiblePushRegistration({
            requestPermission: false,
        });
        const second = ensureVisiblePushRegistration({
            requestPermission: false,
        });
        expect(first).toBe(second);

        await new Promise(resolve => setImmediate(resolve));
        resolveToken({data: 'ExpoPushToken[test-token]'});
        await Promise.all([first, second]);

        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(1);
        expect(mockPushApi.putCurrentPushEndpoint).toHaveBeenCalledTimes(1);
    });

    it('不同帳號或 session 不共用 authorization in-flight', async () => {
        let resolveFirstToken;
        mockGetExpoPushTokenAsync
            .mockReturnValueOnce(new Promise(resolve => {
                resolveFirstToken = resolve;
            }))
            .mockResolvedValueOnce({
                data: 'ExpoPushToken[second-token]',
            });
        const first = ensureVisiblePushRegistration({
            requestPermission: false,
            singleFlightKey: 'account-a:session-a',
        });
        const second = ensureVisiblePushRegistration({
            requestPermission: false,
            singleFlightKey: 'account-b:session-b',
        });

        expect(first).not.toBe(second);
        await new Promise(resolve => setImmediate(resolve));
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(1);
        resolveFirstToken({data: 'ExpoPushToken[first-token]'});
        await Promise.all([first, second]);
        expect(mockGetExpoPushTokenAsync).toHaveBeenCalledTimes(2);
        expect(mockPushApi.putCurrentPushEndpoint).toHaveBeenCalledTimes(2);
    });

    it('回傳 authorization context 供帳號及 session fence 核對', async () => {
        const authorizationContext = {
            accountKey: '1:installation-id',
            schedulingSessionId: 'session-a',
        };

        await expect(
            ensureVisiblePushRegistration({
                requestPermission: false,
                prepareAuthorization: async () => authorizationContext,
            }),
        ).resolves.toMatchObject({authorizationContext});

        expect(isPushAuthorizationCurrent({
            expectedAccountKey: '1:installation-id',
            authorizationContext,
            currentAccountKey: '1:installation-id',
            currentSchedulingSessionId: 'session-a',
        })).toBe(true);
        expect(isPushAuthorizationCurrent({
            expectedAccountKey: '1:installation-id',
            authorizationContext,
            currentAccountKey: '2:installation-id',
            currentSchedulingSessionId: 'session-a',
        })).toBe(false);
        expect(isPushAuthorizationCurrent({
            expectedAccountKey: '1:installation-id',
            authorizationContext,
            currentAccountKey: '1:installation-id',
            currentSchedulingSessionId: 'session-b',
        })).toBe(false);
    });

    it('自動 retry 尊重 retryAt 及最大次數', () => {
        expect(canAutomaticallyRetryPushRegistration({
            status: 'registered',
            retryCount: 0,
            retryAt: null,
        }, 1000, 5)).toBe(true);
        expect(canAutomaticallyRetryPushRegistration({
            status: 'idle',
            retryCount: 0,
            retryAt: null,
        }, 1000, 5)).toBe(false);
        expect(canAutomaticallyRetryPushRegistration({
            status: 'retry_pending',
            retryCount: 2,
            retryAt: 5000,
        }, 4999, 5)).toBe(false);
        expect(canAutomaticallyRetryPushRegistration({
            status: 'retry_pending',
            retryCount: 2,
            retryAt: 5000,
        }, 5000, 5)).toBe(true);
        expect(canAutomaticallyRetryPushRegistration({
            status: 'retry_pending',
            retryCount: 5,
            retryAt: null,
        }, 10000, 5)).toBe(false);

        expect(canAutomaticallyRetryHarborDisable({
            pendingAction: 'disable',
            disableRetryCount: 2,
            disableRetryAt: 5000,
        }, 5000, 5)).toBe(true);
        expect(canAutomaticallyRetryHarborDisable({
            pendingAction: 'disable',
            disableRetryCount: 5,
            disableRetryAt: null,
        }, 10000, 5)).toBe(false);
    });

    it('Android 已授權時確認 default channel 後才註冊', async () => {
        mockReactNative.Platform.OS = 'android';
        mockGetPermissionsAsync.mockResolvedValue({
            status: 'granted',
            granted: true,
        });
        mockNotifications.getNotificationChannelAsync.mockResolvedValue({
            importance: 3,
            sound: 'default',
        });

        await ensureVisiblePushRegistration({requestPermission: false});

        expect(
            mockNotifications.getNotificationChannelAsync,
        ).toHaveBeenCalledWith('default');
        expect(
            mockNotifications.setNotificationChannelAsync,
        ).toHaveBeenCalledWith('default', expect.objectContaining({
            name: 'ARK ALL',
        }));
    });

    it('後端未確認 endpoint ready 時保留可重試錯誤', async () => {
        mockPushApi.putCurrentPushEndpoint.mockResolvedValue({
            endpoint: {
                endpointId: 'endpoint-id',
                active: false,
                tokenStored: true,
            },
        });

        await expect(
            ensureVisiblePushRegistration({requestPermission: false}),
        ).rejects.toMatchObject({
            code: 'push_endpoint_not_ready',
            retryable: true,
        });
    });
});
