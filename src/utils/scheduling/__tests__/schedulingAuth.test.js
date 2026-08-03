jest.mock('../../harbor/harborAuthStorage', () => ({
    loadHarborCredentials: jest.fn(),
}));

const mockAuthStorage = jest.requireMock('../../harbor/harborAuthStorage');

import axios from 'axios';
import {
    SCHEDULING_BASE_URI,
    SCHEDULING_TOKEN_EXPIRY_SKEW_MS,
    __resetSchedulingAuthForTests,
    clearSchedulingSession,
    exchangeSchedulingToken,
    ensureSchedulingSession,
    getSchedulingSession,
    isSchedulingTokenExpired,
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
        expect(postSpy).toHaveBeenCalledTimes(1);

        const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();
        resolvePost({
            data: {
                accessToken: 'jwt-token',
                tokenType: 'Bearer',
                expiresAt,
                user: {harborUserId: 1, username: 'u'},
            },
        });

        const session = await first;
        await expect(second).resolves.toBe(session);
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy).toHaveBeenCalledWith(
            `${SCHEDULING_BASE_URI}/auth/harbor/exchange`,
            {},
            expect.objectContaining({
                headers: expect.objectContaining({
                    'User-Api-Key': 'harbor-key',
                    'User-Api-Client-Id': 'harbor-client',
                }),
            }),
        );
        expect(getSchedulingSession()?.accessToken).toBe('jwt-token');
    });

    it('expiresAt 前 30 秒即視為過期', () => {
        const now = Date.parse('2026-08-03T12:00:00.000Z');
        const expiresAt = new Date(
            now + SCHEDULING_TOKEN_EXPIRY_SKEW_MS,
        ).toISOString();

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

    it('接近過期時 ensureSchedulingSession 會重新換票', async () => {
        const almostExpired = new Date(
            Date.now() + SCHEDULING_TOKEN_EXPIRY_SKEW_MS - 1000,
        ).toISOString();
        setSchedulingSession({
            accessToken: 'old-jwt',
            expiresAt: almostExpired,
            user: {harborUserId: 1},
        });

        mockExchangeSuccess({accessToken: 'new-jwt'});
        const session = await ensureSchedulingSession();
        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(session.accessToken).toBe('new-jwt');
    });

    it('clearSchedulingSession（登出）會清空記憶體 JWT', async () => {
        mockExchangeSuccess();
        await exchangeSchedulingToken();
        expect(getSchedulingSession()).not.toBeNull();

        clearSchedulingSession();
        expect(getSchedulingSession()).toBeNull();
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
});
