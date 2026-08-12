import {
    getHarborAppShareMessage,
    getRecentAppShareChannels,
    getSystemAppSharePayload,
    normalizeAppSharePayload,
} from '../appShare';

describe('APP 內分享資料', () => {
    it('以標題和連結建立分享訊息', () => {
        expect(normalizeAppSharePayload({
            title: 'CPED1000',
            url: 'https://example.com/course/CPED1000',
        })).toEqual({
            title: 'CPED1000',
            url: 'https://example.com/course/CPED1000',
            message: 'CPED1000\nhttps://example.com/course/CPED1000',
        });
    });

    it('拒絕沒有內容的分享 payload', () => {
        expect(normalizeAppSharePayload(null)).toBeNull();
        expect(normalizeAppSharePayload({title: '只有標題'})).toBeNull();
    });

    it('Harbor 私信保留標題及 Universal Link', () => {
        const payload = normalizeAppSharePayload({
            title: '屬會節攤位來啦',
            url: 'https://umall.one/app/event/event-1',
        });

        expect(getHarborAppShareMessage(payload)).toBe(
            '屬會節攤位來啦\nhttps://umall.one/app/event/event-1',
        );
    });

    it('Android message 保留連結，iOS 分開 message 和 URL', () => {
        const payload = normalizeAppSharePayload({
            title: 'CPED1000',
            url: 'https://example.com/course/CPED1000',
        });
        expect(getSystemAppSharePayload(payload, 'android')).toEqual({
            message: 'CPED1000\nhttps://example.com/course/CPED1000',
            title: 'CPED1000',
        });
        expect(getSystemAppSharePayload(payload, 'ios')).toEqual({
            message: 'CPED1000',
            url: 'https://example.com/course/CPED1000',
        });
        expect(getSystemAppSharePayload(normalizeAppSharePayload({
            message: '一起看看這門課',
            url: 'https://example.com/course/CPED1000',
        }), 'ios')).toEqual({
            message: '一起看看這門課',
            url: 'https://example.com/course/CPED1000',
        });
    });

    it('最近聊天按時間排序並排除群聊', () => {
        const channels = [
            {id: 1, title: '較早', lastMessageAt: '2026-08-10T10:00:00Z'},
            {id: 2, title: '群聊', isGroup: true, lastMessageAt: '2026-08-12T10:00:00Z'},
            {id: 3, title: '最新', lastMessageAt: '2026-08-11T10:00:00Z'},
        ];

        expect(getRecentAppShareChannels(channels).map(item => item.id))
            .toEqual([3, 1]);
    });
});
