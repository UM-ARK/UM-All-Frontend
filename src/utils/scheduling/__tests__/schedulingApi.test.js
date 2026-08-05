jest.mock('../../harbor/harborAuthStorage', () => ({
    loadHarborCredentials: jest.fn(),
}));

jest.mock('../schedulingAuthStorage', () => ({
    loadSchedulingSession: jest.fn(async () => null),
    saveSchedulingSession: jest.fn(async () => {}),
    clearSchedulingSessionStorage: jest.fn(async () => {}),
    getSchedulingDeviceId: jest.fn(async () => 'device-id'),
}));

const mockAuthStorage = jest.requireMock('../../harbor/harborAuthStorage');

import axios from 'axios';
import {
    __resetSchedulingAuthForTests,
    getSchedulingSession,
    setSchedulingSession,
} from '../schedulingAuth';
import {
    deleteMySharedTimetable,
    getMySharedTimetable,
    getTeamEvent,
    getTeamSharedTimetables,
    listMyTeamEvents,
    putMySharedTimetable,
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

    function makeSession(overrides = {}) {
        return {
            accessToken: 'jwt-1',
            expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
            refreshToken: 'refresh-token',
            refreshIdleExpiresAt: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString(),
            refreshAbsoluteExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
            harborReverifyAfter: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
            sessionId: 'session-id',
            user: {harborUserId: 7, username: 'ark'},
            ...overrides,
        };
    }

    function mockAuthResponse(accessToken = 'jwt-1') {
        return {data: makeSession({accessToken})};
    }

    it('401 invalid_token 時 refresh 並只重試原請求一次', async () => {
        setSchedulingSession(makeSession({
            accessToken: 'stale-jwt',
        }));

        axiosPostSpy.mockResolvedValue(mockAuthResponse('fresh-jwt'));

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
        expect(axiosPostSpy).toHaveBeenCalledWith(
            expect.stringMatching(/\/auth\/refresh$/),
            {refreshToken: 'refresh-token'},
            expect.any(Object),
        );
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
        axiosPostSpy
            .mockResolvedValueOnce(mockAuthResponse('jwt-a'))
            .mockResolvedValueOnce(mockAuthResponse('jwt-b'));

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

        // 初次 exchange 一次 + invalid_token 後 refresh 一次
        expect(axiosPostSpy).toHaveBeenCalledTimes(2);
        expect(httpRequestSpy).toHaveBeenCalledTimes(2);
    });

    it('401 harbor_auth_failed 不清無限重試，錯誤不含敏感資訊', async () => {
        setSchedulingSession(makeSession({
            accessToken: 'jwt-ok',
        }));

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
        setSchedulingSession(makeSession({
            accessToken: 'jwt-ok',
        }));
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

    it('共享課表 endpoints 使用 strict method 與路徑', async () => {
        setSchedulingSession(makeSession({accessToken: 'jwt-ok'}));
        httpRequestSpy.mockResolvedValue({data: {ok: true}});
        const payload = {
            sharingLevel: 'time_only',
            busyRanges: [{weekday: 1, startMinute: 600, endMinute: 675}],
            revision: 0,
        };

        await putMySharedTimetable('evt-1', payload);
        await getMySharedTimetable('evt-1');
        await getTeamSharedTimetables('evt-1');
        await deleteMySharedTimetable('evt-1');

        expect(httpRequestSpy.mock.calls.map(call => call[0])).toEqual([
            expect.objectContaining({
                method: 'put',
                url: '/team-events/evt-1/me/shared-timetable',
                data: payload,
            }),
            expect.objectContaining({
                method: 'get',
                url: '/team-events/evt-1/me/shared-timetable',
            }),
            expect.objectContaining({
                method: 'get',
                url: '/team-events/evt-1/shared-timetables',
            }),
            expect.objectContaining({
                method: 'delete',
                url: '/team-events/evt-1/me/shared-timetable',
            }),
        ]);
    });
});
