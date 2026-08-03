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

import {
    clearSchedulingSessionStorage,
    loadSchedulingSession,
    saveSchedulingSession,
} from '../schedulingAuthStorage';

const SESSION_KEY = 'scheduling.auth.session.v1';
const SecureStore = jest.requireMock('expo-secure-store');

describe('schedulingAuthStorage', () => {
    beforeEach(() => {
        SecureStore.__values.clear();
        jest.clearAllMocks();
    });

    it('保存並讀回 session', async () => {
        const session = {
            accessToken: 'jwt-1',
            expiresAt: '2026-08-04T12:00:00.000Z',
            user: {harborUserId: 1, username: 'ark'},
        };
        await saveSchedulingSession(session);
        await expect(loadSchedulingSession()).resolves.toEqual(session);
        expect(SecureStore.__values.get(SESSION_KEY)).toContain('jwt-1');
    });

    it('無效 JSON 會清鍵並回傳 null', async () => {
        SecureStore.__values.set(SESSION_KEY, '{not-json');
        await expect(loadSchedulingSession()).resolves.toBeNull();
        expect(SecureStore.__values.has(SESSION_KEY)).toBe(false);
    });

    it('缺少 accessToken 會清鍵', async () => {
        await saveSchedulingSession({
            accessToken: '',
            expiresAt: '2026-08-04T12:00:00.000Z',
        });
        expect(SecureStore.__values.has(SESSION_KEY)).toBe(false);
    });

    it('clearSchedulingSessionStorage 刪除鍵', async () => {
        await saveSchedulingSession({
            accessToken: 'jwt',
            expiresAt: '2026-08-04T12:00:00.000Z',
            user: null,
        });
        await clearSchedulingSessionStorage();
        expect(SecureStore.__values.has(SESSION_KEY)).toBe(false);
    });
});
