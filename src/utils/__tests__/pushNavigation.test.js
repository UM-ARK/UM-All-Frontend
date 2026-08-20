import {
    getHarborPushNavigationTarget,
    getNotificationResponseId,
} from '../pushNavigation';

describe('pushNavigation', () => {
    it('只以正數 topic/post ID 建立原生 Harbor 導航', () => {
        expect(
            getHarborPushNavigationTarget({
                source: 'harbor',
                type: 'harbor_topic',
                topicId: 123,
                postNumber: 4,
            }),
        ).toEqual({
            routeName: 'HarborTopicDetail',
            params: {topicId: 123, postNumber: 4},
            kind: 'topic',
        });
    });

    it('Chat 未完成真實 payload 驗證前只 fallback Inbox', () => {
        expect(
            getHarborPushNavigationTarget({
                source: 'harbor',
                type: 'harbor_chat',
                channelId: 12,
                messageId: 456,
                url: 'https://evil.example',
            }),
        ).toEqual({
            routeName: 'HarborInbox',
            params: undefined,
            kind: 'chat_fallback',
        });
    });

    it('未知 Harbor payload fallback Inbox，其他來源不處理', () => {
        expect(
            getHarborPushNavigationTarget({
                source: 'harbor',
                type: 'unknown',
                url: 'https://evil.example',
            }),
        ).toMatchObject({routeName: 'HarborInbox'});
        expect(
            getHarborPushNavigationTarget({source: 'bus'}),
        ).toBeNull();
    });

    it('response identifier 與 action 組成穩定去重鍵', () => {
        expect(
            getNotificationResponseId({
                actionIdentifier: 'default',
                notification: {request: {identifier: 'request-id'}},
            }),
        ).toBe('request-id:default');
    });
});
