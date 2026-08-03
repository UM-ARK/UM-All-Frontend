jest.mock('../../harbor/harborAuthStorage', () => ({
    loadHarborCredentials: jest.fn(),
}));

const mockAuthStorage = jest.requireMock('../../harbor/harborAuthStorage');

import axios from 'axios';
import {
    __resetSchedulingAuthForTests,
    getSchedulingSession,
    setSchedulingSession,
} from '../schedulingAuth';
import {
    getTeamEvent,
    listMyTeamEvents,
    schedulingHttp,
} from '../schedulingApi';

describe('schedulingApi 授權與重試', () => {
    let axiosPostSpy;
    let httpRequestSpy;

    beforeEach(() => {
        __resetSchedulingAuthForTests();
        jest.clearAllMocks();
        mockAuthStorage.loadHarborCredentials.mockResolvedValue({
            userApiKey: 'harbor-key',
            clientId: 'harbor-client',
        });
        axiosPostSpy = jest.spyOn(axios, 'post');
        httpRequestSpy = jest.spyOn(schedulingHttp, 'request');
    });

    afterEach(() => {
        axiosPostSpy.mockRestore();
        httpRequestSpy.mockRestore();
        __resetSchedulingAuthForTests();
    });

    function mockExchange(accessToken = 'jwt-1') {
        axiosPostSpy.mockResolvedValue({
            data: {
                accessToken,
                tokenType: 'Bearer',
                expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
                user: {harborUserId: 7, username: 'ark'},
            },
        });
    }

    it('401 invalid_token 時清票、換票並只重試原請求一次', async () => {
        setSchedulingSession({
            accessToken: 'stale-jwt',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            user: {harborUserId: 7},
        });

        mockExchange('fresh-jwt');

        httpRequestSpy
            .mockRejectedValueOnce({
                response: {
                    status: 401,
                    data: {
                        error: {
                            code: 'invalid_token',
                            message: 'token 無效',
                        },
                    },
                    config: {
                        headers: {
                            Authorization: 'Bearer stale-jwt',
                        },
                        url: '/team-events/evt-1?invite=should-not-leak',
                    },
                },
                config: {
                    headers: {
                        Authorization: 'Bearer stale-jwt',
                    },
                    url: '/team-events/evt-1?invite=should-not-leak',
                },
            })
            .mockResolvedValueOnce({
                data: {event: {eventId: 'evt-1'}},
            });

        const result = await getTeamEvent('evt-1');
        expect(result).toEqual({event: {eventId: 'evt-1'}});
        expect(axiosPostSpy).toHaveBeenCalledTimes(1);
        expect(httpRequestSpy).toHaveBeenCalledTimes(2);

        expect(httpRequestSpy.mock.calls[0][0]).toMatchObject({
            method: 'get',
            url: '/team-events/evt-1',
            headers: {
                Authorization: 'Bearer stale-jwt',
            },
        });
        expect(httpRequestSpy.mock.calls[1][0]).toMatchObject({
            method: 'get',
            url: '/team-events/evt-1',
            headers: {
                Authorization: 'Bearer fresh-jwt',
            },
        });
        expect(getSchedulingSession()?.accessToken).toBe('fresh-jwt');
    });

    it('重試後仍 401 時不再無限交換', async () => {
        mockExchange('jwt-a');
        axiosPostSpy
            .mockResolvedValueOnce({
                data: {
                    accessToken: 'jwt-a',
                    tokenType: 'Bearer',
                    expiresAt: new Date(
                        Date.now() + 30 * 60 * 1000,
                    ).toISOString(),
                    user: {harborUserId: 7},
                },
            })
            .mockResolvedValueOnce({
                data: {
                    accessToken: 'jwt-b',
                    tokenType: 'Bearer',
                    expiresAt: new Date(
                        Date.now() + 30 * 60 * 1000,
                    ).toISOString(),
                    user: {harborUserId: 7},
                },
            });

        httpRequestSpy.mockRejectedValue({
            response: {
                status: 401,
                data: {
                    error: {
                        code: 'invalid_token',
                        message: 'token 無效',
                    },
                },
            },
        });

        await expect(listMyTeamEvents()).rejects.toMatchObject({
            code: 'invalid_token',
            status: 401,
        });

        // 初次 ensure 一次 + invalid_token 後再 exchange 一次
        expect(axiosPostSpy).toHaveBeenCalledTimes(2);
        expect(httpRequestSpy).toHaveBeenCalledTimes(2);
    });

    it('401 harbor_auth_failed 不清無限重試，錯誤不含敏感資訊', async () => {
        setSchedulingSession({
            accessToken: 'jwt-ok',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            user: {harborUserId: 7},
        });

        httpRequestSpy.mockRejectedValue({
            response: {
                status: 401,
                data: {
                    error: {
                        code: 'harbor_auth_failed',
                        message: 'Harbor 驗證失敗',
                    },
                },
                config: {
                    headers: {
                        Authorization: 'Bearer jwt-ok',
                    },
                    url: '/me/team-events?invite=secret',
                },
            },
            config: {
                headers: {
                    Authorization: 'Bearer jwt-ok',
                },
                url: '/me/team-events?invite=secret',
            },
        });

        let thrown;
        try {
            await listMyTeamEvents();
        } catch (error) {
            thrown = error;
        }

        expect(thrown).toMatchObject({
            code: 'harbor_auth_failed',
            status: 401,
        });
        expect(httpRequestSpy).toHaveBeenCalledTimes(1);
        expect(axiosPostSpy).not.toHaveBeenCalled();
        expect(getSchedulingSession()).toBeNull();
        expect(JSON.stringify(thrown)).not.toContain('jwt-ok');
        expect(JSON.stringify(thrown)).not.toContain('invite=secret');
        expect(thrown.config).toBeUndefined();
        expect(thrown.response).toBeUndefined();
    });

    it('路徑參數會 encodeURIComponent', async () => {
        setSchedulingSession({
            accessToken: 'jwt-ok',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            user: {harborUserId: 7},
        });
        httpRequestSpy.mockResolvedValue({
            data: {ok: true},
        });

        await getTeamEvent('a/b c');
        expect(httpRequestSpy).toHaveBeenCalledWith(
            expect.objectContaining({
                url: `/team-events/${encodeURIComponent('a/b c')}`,
            }),
        );
    });
});
