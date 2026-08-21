jest.mock('../scheduling/schedulingApi', () => ({
    requestSchedulingWithAuth: jest.fn(),
    requestSchedulingWithVerifiedSession: jest.fn(),
}));

const mockSchedulingApi = jest.requireMock('../scheduling/schedulingApi');

import {
    deleteCurrentHarborPushBinding,
    patchCurrentPushEndpointLocale,
    putCurrentPushEndpoint,
} from '../pushApi';

describe('pushApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('endpoint body 不申報 Harbor user 或 client identity', async () => {
        const payload = {
            installationId: '5d2b67a4-d4ca-4b8a-b409-466fcdab198d',
            expoPushToken: 'ExpoPushToken[test]',
            platform: 'ios',
            appVersion: '26.8.8',
            buildNumber: '90',
            notificationLocale: 'en',
        };
        await putCurrentPushEndpoint(payload);

        expect(
            mockSchedulingApi.requestSchedulingWithAuth,
        ).toHaveBeenCalledWith({
            method: 'put',
            url: '/push/endpoints/current',
            data: payload,
        });
    });

    it('只更新目前 installation 的通知語言', async () => {
        await patchCurrentPushEndpointLocale('installation-id', 'en');

        expect(
            mockSchedulingApi.requestSchedulingWithAuth,
        ).toHaveBeenCalledWith({
            method: 'patch',
            url: '/push/endpoints/current',
            data: {
                installationId: 'installation-id',
                notificationLocale: 'en',
            },
        });
    });

    it('關閉 Harbor 只停用目前 binding', async () => {
        await deleteCurrentHarborPushBinding('installation-id');

        expect(
            mockSchedulingApi.requestSchedulingWithAuth,
        ).toHaveBeenCalledWith({
            method: 'delete',
            url: '/push/harbor/bindings/current',
            data: {installationId: 'installation-id'},
        });
    });

    it('Harbor 操作可固定使用剛完成 reverify 的 session', async () => {
        const session = {sessionId: 'session-a', accessToken: 'jwt-a'};
        await deleteCurrentHarborPushBinding('installation-id', session);

        expect(
            mockSchedulingApi.requestSchedulingWithVerifiedSession,
        ).toHaveBeenCalledWith({
            method: 'delete',
            url: '/push/harbor/bindings/current',
            data: {installationId: 'installation-id'},
        }, session);
        expect(
            mockSchedulingApi.requestSchedulingWithAuth,
        ).not.toHaveBeenCalled();
    });
});
