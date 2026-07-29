import {
    formatRelativeTime,
    mergeHarborUnreadItems,
} from '../harborUi';

describe('Harbor 相對時間格式', () => {
    const now = new Date('2026-07-21T10:00:00Z').getTime();

    it('不依賴 Intl.RelativeTimeFormat 產生繁體中文時間', () => {
        expect(formatRelativeTime('2026-07-21T09:58:00Z', 'tc', now)).toBe(
            '2 分鐘前',
        );
        expect(formatRelativeTime('2026-07-20T10:00:00Z', 'tc', now)).toBe(
            '1 日前',
        );
    });

    it('產生英文單複數與未來時間', () => {
        expect(formatRelativeTime('2026-07-21T09:00:00Z', 'en', now)).toBe(
            '1 hour ago',
        );
        expect(formatRelativeTime('2026-07-23T10:00:00Z', 'en', now)).toBe(
            'in 2 days',
        );
    });

    it('處理剛剛及無效日期', () => {
        expect(formatRelativeTime('2026-07-21T09:59:40Z', 'tc', now)).toBe(
            '剛剛',
        );
        expect(formatRelativeTime('invalid', 'tc', now)).toBe('');
    });
});

describe('Harbor 未讀收件匣', () => {
    it('合併未讀通知與站內訊息並按時間排序', () => {
        const result = mergeHarborUnreadItems(
            [
                {
                    id: '1',
                    isRead: false,
                    createdAt: '2026-07-21T09:00:00Z',
                },
                {
                    id: '2',
                    isRead: true,
                    createdAt: '2026-07-21T10:00:00Z',
                },
            ],
            [
                {
                    id: '1',
                    unreadCount: 2,
                    createdAt: '2026-07-21T11:00:00Z',
                },
                {
                    id: '3',
                    unreadCount: 0,
                    createdAt: '2026-07-21T12:00:00Z',
                },
            ],
        );

        expect(result).toEqual([
            expect.objectContaining({
                listId: 'message-1',
                inboxType: 'message',
            }),
            expect.objectContaining({
                listId: 'notification-1',
                inboxType: 'notification',
            }),
        ]);
    });
});
