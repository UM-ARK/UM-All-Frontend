jest.mock('expo-crypto', () => ({
    randomUUID: jest.fn(),
}));

jest.mock('expo-secure-store', () => {
    const values = new Map();
    return {
        __values: values,
        WHEN_UNLOCKED_THIS_DEVICE_ONLY: 1,
        deleteItemAsync: jest.fn(async key => {
            values.delete(key);
        }),
        getItemAsync: jest.fn(async key => values.get(key) || null),
        setItemAsync: jest.fn(async (key, value) => {
            values.set(key, value);
        }),
    };
});

import * as Crypto from 'expo-crypto';

import {
    clearSchedulingDeviceId,
    clearSchedulingSessionStorage,
    getSchedulingDeviceId,
    loadSchedulingSession,
    saveSchedulingSession,
} from '../schedulingAuthStorage';

const SESSION_KEY = 'scheduling.auth.session.v2';
const LEGACY_SESSION_KEY = 'scheduling.auth.session.v1';
const DEVICE_ID_KEY = 'scheduling.auth.device-id.v1';
const DEVICE_ID = '5d2b67a4-d4ca-4b8a-b409-466fcdab198d';
const SecureStore = jest.requireMock('expo-secure-store');

const SESSION = {
    accessToken: 'access-token',
    expiresAt: '2026-08-04T12:00:00.000Z',
    refreshToken: 'refresh-token',
    refreshIdleExpiresAt: '2026-09-04T12:00:00.000Z',
    refreshAbsoluteExpiresAt: '2027-08-04T12:00:00.000Z',
    harborReverifyAfter: '2026-08-18T12:00:00.000Z',
    sessionId: 'session-id',
    user: {harborUserId: 1, username: 'ark'},
};

describe('schedulingAuthStorage', () => {
    beforeEach(() => {
        SecureStore.__values.clear();
        jest.clearAllMocks();
        Crypto.randomUUID.mockReturnValue(DEVICE_ID);
    });

    it('保存並讀回完整 v2 session', async () => {
        await saveSchedulingSession(SESSION);
        await expect(loadSchedulingSession()).resolves.toEqual(SESSION);
        expect(SecureStore.__values.get(SESSION_KEY)).toContain('refresh-token');
    });

    it('缺少 refresh session 必要欄位會清鍵', async () => {
        SecureStore.__values.set(
            SESSION_KEY,
            JSON.stringify({...SESSION, refreshToken: ''}),
        );
        await expect(loadSchedulingSession()).resolves.toBeNull();
        expect(SecureStore.__values.has(SESSION_KEY)).toBe(false);
    });

    it('讀取 v2 時刪除舊 v1 而不遷移', async () => {
        SecureStore.__values.set(LEGACY_SESSION_KEY, JSON.stringify(SESSION));
        await expect(loadSchedulingSession()).resolves.toBeNull();
        expect(SecureStore.__values.has(LEGACY_SESSION_KEY)).toBe(false);
    });

    it('為安裝建立並重用隨機 deviceId', async () => {
        await expect(getSchedulingDeviceId()).resolves.toBe(DEVICE_ID);
        await expect(getSchedulingDeviceId()).resolves.toBe(DEVICE_ID);
        expect(Crypto.randomUUID).toHaveBeenCalledTimes(1);
        expect(SecureStore.__values.get(DEVICE_ID_KEY)).toBe(DEVICE_ID);
    });

    it('無效 deviceId 會替換為新的 UUID', async () => {
        SecureStore.__values.set(DEVICE_ID_KEY, 'not-a-device-id');
        await expect(getSchedulingDeviceId()).resolves.toBe(DEVICE_ID);
        expect(SecureStore.__values.get(DEVICE_ID_KEY)).toBe(DEVICE_ID);
    });

    it('clearSchedulingSessionStorage 不會刪除 installation deviceId', async () => {
        await saveSchedulingSession(SESSION);
        await getSchedulingDeviceId();
        await clearSchedulingSessionStorage();
        expect(SecureStore.__values.has(SESSION_KEY)).toBe(false);
        expect(SecureStore.__values.get(DEVICE_ID_KEY)).toBe(DEVICE_ID);
        await clearSchedulingDeviceId();
    });
});
