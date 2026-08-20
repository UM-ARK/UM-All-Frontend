import {
    getSafeNotificationLogDetails,
    logPushError,
} from '../pushLogger';

describe('pushLogger', () => {
    it('錯誤 log 不輸出 message、token 或 request config', () => {
        const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
        const error = new Error(
            'ExpoPushToken[secret-token] Bearer secret-access-token',
        );
        error.code = 'ERR_NETWORK';
        error.config = {
            headers: {Authorization: 'Bearer secret-access-token'},
        };

        logPushError('registration.failed', error);

        expect(consoleSpy).toHaveBeenCalledWith(
            '[Push] registration.failed',
            {
                errorCode: 'ERR_NETWORK',
                httpStatus: null,
            },
        );
        consoleSpy.mockRestore();
    });

    it('通知 log 只保留 type 與導航欄位是否存在', () => {
        const details = getSafeNotificationLogDetails({
            request: {
                content: {
                    title: 'private title',
                    body: 'private body',
                    data: {
                        type: 'harbor_topic',
                        notificationType: 2,
                        topicId: 123,
                        postNumber: 4,
                        url: 'https://private.example/topic/123',
                        excerpt: 'private excerpt',
                        token: 'secret-token',
                    },
                },
            },
        });

        expect(details).toEqual({
            dataType: 'harbor_topic',
            notificationType: 2,
            hasTopicId: true,
            hasPostNumber: true,
            hasChannelId: false,
            hasMessageId: false,
        });
        expect(JSON.stringify(details)).not.toContain('private');
        expect(JSON.stringify(details)).not.toContain('secret-token');
    });
});
