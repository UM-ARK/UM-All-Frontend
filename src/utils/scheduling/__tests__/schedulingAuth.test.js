jest.mock('../../harbor/harborAuthStorage', () => ({
    loadHarborCredentials: jest.fn(),
}));

jest.mock('../schedulingAuthStorage', () => ({
    loadSchedulingSession: jest.fn(async () => null),
    saveSchedulingSession: jest.fn(async () => {}),
    clearSchedulingSessionStorage: jest.fn(async () => {}),
    getSchedulingDeviceId: jest.fn(async () => 'device-id'),
}));

jest.mock('../../pathMap', () => ({
    SCHEDULING_BASE_URI: 'https://umall.one/api/v2',
}));

const mockAuthStorage = jest.requireMock('../../harbor/harborAuthStorage');
const mockSessionStorage = jest.requireMock('../schedulingAuthStorage');
const {SCHEDULING_BASE_URI} = jest.requireMock('../../pathMap');

import axios from 'axios';
import {
    SCHEDULING_TOKEN_EXPIRY_SKEW_MS,
    __resetSchedulingAuthForTests,
    clearSchedulingSession,
    exchangeSchedulingToken,
    ensureSchedulingSession,
    getSchedulingSession,
    isSchedulingTokenExpired,
    logoutSchedulingSession,
    refreshSchedulingToken,
    reverifyExistingSchedulingSession,
    reverifySchedulingSession,
    setSchedulingHarborAuthFailureHandler,
    setSchedulingSession,
} from '../schedulingAuth';

describe('schedulingAuth', () => {
    let postSpy;

    beforeEach(() => {
        __resetSchedulingAuthForTests();
        jest.clearAllMocks();
        mockAuthStorage.loadHarborCredentials.mockResolvedValue({
            userApiKey: 'harbor-key',
            clientId: 'harbor-client',
        });
        mockSessionStorage.loadSchedulingSession.mockResolvedValue(null);
        postSpy = jest.spyOn(axios, 'post');
    });

    afterEach(() => {
        postSpy.mockRestore();
        __resetSchedulingAuthForTests();
    });

    function mockExchangeSuccess(overrides = {}) {
        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        postSpy.mockResolvedValue({
            data: {
                accessToken: 'jwt-token',
                tokenType: 'Bearer',
                expiresAt,
                refreshToken: 'refresh-token',
                refreshIdleExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                refreshAbsoluteExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                harborReverifyAfter: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                sessionId: 'session-id',
                user: {
                    harborUserId: 42,
                    username: 'ark',
                    displayName: 'ARK',
                    avatarTemplate: '/avatar/{size}.png',
                },
                ...overrides,
            },
        });
        return expiresAt;
    }

    function makeSession(overrides = {}) {
        return {
            accessToken: 'jwt-token',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            refreshToken: 'refresh-token',
            refreshIdleExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            refreshAbsoluteExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            harborReverifyAfter: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            sessionId: 'session-id',
            user: {harborUserId: 42, username: 'ark'},
            ...overrides,
        };
    }

    it('exchange 共用同一個 in-flight promise（single-flight）', async () => {
        let resolvePost;
        postSpy.mockReturnValue(
            new Promise(resolve => {
                resolvePost = resolve;
            }),
        );

        const first = exchangeSchedulingToken();
        const second = exchangeSchedulingToken();
        expect(first).toBe(second);

        // loadHarborCredentials 為 async，需等到後續 microtask 才會呼叫 axios.post
        await Promise.resolve();
        await Promise.resolve();
        await Promise.resolve();
        expect(postSpy).toHaveBeenCalledTimes(1);

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        resolvePost({
            data: {
                accessToken: 'jwt-token',
                tokenType: 'Bearer',
                expiresAt,
                refreshToken: 'refresh-token',
                refreshIdleExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
                refreshAbsoluteExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                harborReverifyAfter: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                sessionId: 'session-id',
                user: {harborUserId: 1, username: 'u'},
            },
        });

        const session = await first;
        await expect(second).resolves.toBe(session);
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy).toHaveBeenCalledWith(
            `${SCHEDULING_BASE_URI}/auth/harbor/exchange`,
            {
                deviceId: 'device-id',
                deviceName: null,
                platform: expect.any(String),
            },
            expect.objectContaining({
                headers: expect.objectContaining({
                    'User-Api-Key': 'harbor-key',
                    'User-Api-Client-Id': 'harbor-client',
                }),
            }),
        );
        expect(getSchedulingSession()?.accessToken).toBe('jwt-token');
        expect(mockSessionStorage.saveSchedulingSession).toHaveBeenCalledWith(
            expect.objectContaining({accessToken: 'jwt-token'}),
        );
    });

    it('expiresAt 前五分鐘即視為過期', () => {
        const now = Date.parse('2026-08-03T12:00:00.000Z');
        const expiresAt = new Date(now + SCHEDULING_TOKEN_EXPIRY_SKEW_MS).toISOString();

        expect(
            isSchedulingTokenExpired(
                {accessToken: 'jwt', expiresAt},
                now,
            ),
        ).toBe(true);

        expect(
            isSchedulingTokenExpired(
                {accessToken: 'jwt', expiresAt},
                now - 1,
            ),
        ).toBe(false);
    });

    it('有效 JWT 時 ensureSchedulingSession 不重複換票', async () => {
        mockExchangeSuccess();
        await exchangeSchedulingToken();
        expect(postSpy).toHaveBeenCalledTimes(1);

        const again = await ensureSchedulingSession();
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(again.accessToken).toBe('jwt-token');
    });

    it('記憶體空且 SecureStore 有效時 ensure 不換票', async () => {
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
        mockSessionStorage.loadSchedulingSession.mockResolvedValue(
            makeSession({accessToken: 'stored-jwt', expiresAt}),
        );

        const session = await ensureSchedulingSession();
        expect(postSpy).not.toHaveBeenCalled();
        expect(session.accessToken).toBe('stored-jwt');
        expect(getSchedulingSession()?.accessToken).toBe('stored-jwt');
    });

    it('SecureStore 接近過期時以 refresh token 續期', async () => {
        const expiredAt = new Date(
            Date.now() + SCHEDULING_TOKEN_EXPIRY_SKEW_MS - 1000,
        ).toISOString();
        mockSessionStorage.loadSchedulingSession.mockResolvedValue(
            makeSession({accessToken: 'expired-jwt', expiresAt: expiredAt}),
        );
        mockExchangeSuccess({accessToken: 'fresh-jwt'});

        const session = await ensureSchedulingSession();
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy).toHaveBeenCalledWith(
            `${SCHEDULING_BASE_URI}/auth/refresh`,
            {refreshToken: 'refresh-token'},
            expect.any(Object),
        );
        expect(session.accessToken).toBe('fresh-jwt');
    });

    it('接近過期時 ensureSchedulingSession 會 refresh', async () => {
        const almostExpired = new Date(
            Date.now() + SCHEDULING_TOKEN_EXPIRY_SKEW_MS - 1000,
        ).toISOString();
        setSchedulingSession(makeSession({
            accessToken: 'old-jwt',
            expiresAt: almostExpired,
        }), {persist: false});

        mockExchangeSuccess({accessToken: 'new-jwt'});
        const session = await ensureSchedulingSession();
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(session.accessToken).toBe('new-jwt');
    });

    it('clearSchedulingSession（登出）會清空記憶體與 SecureStore JWT', async () => {
        mockExchangeSuccess();
        await exchangeSchedulingToken();
        expect(getSchedulingSession()).not.toBeNull();

        clearSchedulingSession();
        expect(getSchedulingSession()).toBeNull();
        expect(
            mockSessionStorage.clearSchedulingSessionStorage,
        ).toHaveBeenCalled();
    });

    it('exchange 回 401 harbor_auth_failed 時通知 handler 且不留下 JWT', async () => {
        const handler = jest.fn();
        setSchedulingHarborAuthFailureHandler(handler);
        postSpy.mockRejectedValue({
            response: {
                status: 401,
                data: {
                    error: {
                        code: 'harbor_auth_failed',
                        message: 'Harbor 驗證失敗',
                    },
                },
                config: {
                    headers: {'User-Api-Key': 'harbor-key'},
                },
            },
            config: {
                headers: {'User-Api-Key': 'harbor-key'},
            },
        });

        await expect(exchangeSchedulingToken()).rejects.toMatchObject({
            code: 'harbor_auth_failed',
            status: 401,
        });
        expect(getSchedulingSession()).toBeNull();
        expect(
            mockSessionStorage.clearSchedulingSessionStorage,
        ).toHaveBeenCalled();
        expect(handler).toHaveBeenCalledTimes(1);
        expect(JSON.stringify(handler.mock.calls[0][0])).not.toContain(
            'harbor-key',
        );
    });

    it('exchange 回 503 harbor_unavailable 為可重試且不觸發 Harbor 登出', async () => {
        const handler = jest.fn();
        setSchedulingHarborAuthFailureHandler(handler);
        postSpy.mockRejectedValue({
            response: {
                status: 503,
                data: {
                    error: {
                        code: 'harbor_unavailable',
                        message: '暫時不可用',
                    },
                },
            },
        });

        await expect(exchangeSchedulingToken()).rejects.toMatchObject({
            code: 'harbor_unavailable',
            status: 503,
            retryable: true,
        });
        expect(handler).not.toHaveBeenCalled();
        expect(getSchedulingSession()).toBeNull();
    });

    it('429 會建立冷卻時間，避免重複 exchange storm', async () => {
        postSpy.mockRejectedValue({
            response: {
                status: 429,
                data: {error: {code: 'rate_limited', message: '請稍後再試'}},
            },
        });

        await expect(exchangeSchedulingToken()).rejects.toMatchObject({
            code: 'rate_limited',
            retryable: true,
        });
        await expect(exchangeSchedulingToken()).rejects.toMatchObject({
            code: 'scheduling_auth_cooldown',
            retryable: true,
        });
        expect(postSpy).toHaveBeenCalledTimes(1);
    });

    it('refresh 共用獨立 in-flight promise，且落盤後才完成', async () => {
        setSchedulingSession(makeSession(), {persist: false});
        let resolvePost;
        let resolveSave;
        postSpy.mockReturnValue(new Promise(resolve => {
            resolvePost = resolve;
        }));
        mockSessionStorage.saveSchedulingSession.mockReturnValue(
            new Promise(resolve => {
                resolveSave = resolve;
            }),
        );

        const first = refreshSchedulingToken();
        const second = refreshSchedulingToken();
        expect(first).toBe(second);
        await Promise.resolve();
        resolvePost({data: makeSession({accessToken: 'fresh-jwt'})});
        let resolved = false;
        first.then(() => {
            resolved = true;
        });
        await Promise.resolve();
        expect(resolved).toBe(false);
        resolveSave();
        await expect(first).resolves.toMatchObject({accessToken: 'fresh-jwt'});
        expect(postSpy).toHaveBeenCalledWith(
            `${SCHEDULING_BASE_URI}/auth/refresh`,
            {refreshToken: 'refresh-token'},
            expect.any(Object),
        );
    });

    it('refresh 未回 user snapshot 時保留既有 snapshot', async () => {
        const session = makeSession({
            user: {harborUserId: 42, username: 'ark'},
        });
        setSchedulingSession(session, {persist: false});
        postSpy.mockResolvedValue({
            data: {
                ...makeSession({accessToken: 'fresh-jwt'}),
                user: undefined,
            },
        });

        await expect(refreshSchedulingToken()).resolves.toMatchObject({
            accessToken: 'fresh-jwt',
            user: session.user,
        });
    });

    it('reverify 使用 Harbor 憑證與同一裝置，不會改走 exchange', async () => {
        setSchedulingSession(makeSession(), {persist: false});
        mockExchangeSuccess({accessToken: 'reverified-jwt'});

        await reverifySchedulingSession();

        expect(postSpy).toHaveBeenCalledWith(
            `${SCHEDULING_BASE_URI}/auth/harbor/reverify`,
            {refreshToken: 'refresh-token', deviceId: 'device-id'},
            expect.objectContaining({
                headers: expect.objectContaining({
                    'User-Api-Key': 'harbor-key',
                    'User-Api-Client-Id': 'harbor-client',
                }),
            }),
        );
    });

    it('沒有既有 Scheduling session 時同步身分不換票', async () => {
        await expect(reverifyExistingSchedulingSession()).resolves.toBeNull();

        expect(
            mockSessionStorage.loadSchedulingSession,
        ).toHaveBeenCalledTimes(1);
        expect(mockAuthStorage.loadHarborCredentials).not.toHaveBeenCalled();
        expect(postSpy).not.toHaveBeenCalled();
    });

    it('SecureStore 有既有 session 時同步身分只 reverify 一次', async () => {
        mockSessionStorage.loadSchedulingSession.mockResolvedValue(
            makeSession({accessToken: 'stored-jwt'}),
        );
        mockExchangeSuccess({
            accessToken: 'reverified-jwt',
            user: {
                harborUserId: 42,
                username: 'ark',
                avatarTemplate: '/new/{size}.png',
            },
        });

        await expect(reverifyExistingSchedulingSession()).resolves.toMatchObject({
            accessToken: 'reverified-jwt',
            user: {avatarTemplate: '/new/{size}.png'},
        });
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy.mock.calls[0][0]).toBe(
            `${SCHEDULING_BASE_URI}/auth/harbor/reverify`,
        );
    });

    it('缺少 refresh contract 欄位時拒絕回應且不保留 access token', async () => {
        postSpy.mockResolvedValue({
            data: {accessToken: 'jwt-token', expiresAt: new Date().toISOString()},
        });

        await expect(exchangeSchedulingToken()).rejects.toMatchObject({
            code: 'invalid_auth_response',
        });
        expect(getSchedulingSession()).toBeNull();
    });

    it('invalid_refresh_token 清盤後只重新 exchange 一次', async () => {
        setSchedulingSession(makeSession({
            expiresAt: new Date(
                Date.now() + SCHEDULING_TOKEN_EXPIRY_SKEW_MS - 1,
            ).toISOString(),
        }), {persist: false});
        postSpy
            .mockRejectedValueOnce({
                response: {
                    status: 401,
                    data: {error: {code: 'invalid_refresh_token'}},
                },
            })
            .mockResolvedValueOnce({data: makeSession({accessToken: 'exchanged-jwt'})});

        await expect(ensureSchedulingSession()).resolves.toMatchObject({
            accessToken: 'exchanged-jwt',
        });
        expect(postSpy.mock.calls[0][0]).toBe(
            `${SCHEDULING_BASE_URI}/auth/refresh`,
        );
        expect(postSpy.mock.calls[1][0]).toBe(
            `${SCHEDULING_BASE_URI}/auth/harbor/exchange`,
        );
    });

    it('reverify 的 invalid_refresh_token 也只清盤並重新 exchange 一次', async () => {
        setSchedulingSession(makeSession({
            expiresAt: new Date(
                Date.now() + SCHEDULING_TOKEN_EXPIRY_SKEW_MS - 1,
            ).toISOString(),
            harborReverifyAfter: new Date(Date.now() - 1).toISOString(),
        }), {persist: false});
        postSpy
            .mockRejectedValueOnce({
                response: {
                    status: 401,
                    data: {error: {code: 'invalid_refresh_token'}},
                },
            })
            .mockResolvedValueOnce({data: makeSession({accessToken: 'exchanged-jwt'})});

        await expect(ensureSchedulingSession()).resolves.toMatchObject({
            accessToken: 'exchanged-jwt',
        });
        expect(postSpy.mock.calls[0][0]).toBe(
            `${SCHEDULING_BASE_URI}/auth/harbor/reverify`,
        );
        expect(postSpy.mock.calls[1][0]).toBe(
            `${SCHEDULING_BASE_URI}/auth/harbor/exchange`,
        );
    });

    it('logout 帶 refresh token，網絡失敗仍清除 session', async () => {
        setSchedulingSession(makeSession(), {persist: false});
        postSpy.mockRejectedValue(new Error('offline'));

        await expect(logoutSchedulingSession()).rejects.toThrow('offline');
        expect(postSpy).toHaveBeenCalledWith(
            `${SCHEDULING_BASE_URI}/auth/logout`,
            {refreshToken: 'refresh-token'},
            expect.any(Object),
        );
        expect(getSchedulingSession()).toBeNull();
        expect(mockSessionStorage.clearSchedulingSessionStorage).toHaveBeenCalled();
    });
});
