import {
    formatHarborChatListTime,
    mergeHarborChatMessages,
    normalizeHarborChatMessages,
    normalizeHarborDirectMessageChannels,
} from '../harborChat';

jest.mock('../../pathMap', () => ({
    ARK_HARBOR_AVATAR_TEMPLATE: template =>
        `https://harbor.example.com${template.replace('{size}', '96')}`,
}));

describe('Harbor Chat 資料', () => {
    it('只保留私聊頻道並讀取未讀數', () => {
        const result = normalizeHarborDirectMessageChannels({
            public_channels: [{id: 1, title: '公開頻道'}],
            direct_message_channels: [
                {
                    id: 9,
                    chatable_type: 'DirectMessage',
                    title: 'Reader',
                    chatable: {
                        group: false,
                        users: [
                            {
                                id: 2,
                                username: 'reader',
                                name: 'Reader',
                                avatar_template: '/avatar/{size}.png',
                            },
                        ],
                    },
                    last_message: {
                        id: 33,
                        excerpt: '你好 :slight_smile:',
                        created_at: '2026-08-12T12:00:00Z',
                    },
                },
                {
                    id: 10,
                    chatable_type: 'Category',
                    title: '偽裝公開頻道',
                },
            ],
            tracking: {
                channel_tracking: {
                    9: {unread_count: 3, mention_count: 1},
                },
            },
        });

        expect(result.unreadCount).toBe(3);
        expect(result.items).toEqual([
            expect.objectContaining({
                id: 9,
                title: 'Reader',
                lastMessage: '你好 🙂',
                unreadCount: 3,
                mentionCount: 1,
                avatarUrl: 'https://harbor.example.com/avatar/96.png',
            }),
        ]);
    });

    it('不把空私聊的 NullMessage 當成真實訊息', () => {
        const result = normalizeHarborDirectMessageChannels({
            direct_message_channels: [
                {
                    id: 4,
                    chatable_type: 'DirectMessage',
                    title: 'New Chat',
                    chatable: {group: false, users: []},
                    last_message: {
                        id: null,
                        excerpt: '',
                        created_at: '2026-08-12T12:00:00Z',
                    },
                },
            ],
        });

        expect(result.items[0]).toEqual(
            expect.objectContaining({
                lastMessage: '',
                lastMessageAt: '',
                lastMessageId: null,
            }),
        );
    });

    it('正規化訊息分頁並合併去重', () => {
        const first = normalizeHarborChatMessages({
            messages: [
                {
                    id: 2,
                    chat_channel_id: 9,
                    cooked: '<p>第二則</p>',
                    created_at: '2026-08-12T12:02:00Z',
                    user: {username: 'reader'},
                },
            ],
            meta: {can_load_more_past: true},
        });
        const merged = mergeHarborChatMessages(
            [
                {
                    id: 1,
                    createdAt: '2026-08-12T12:01:00Z',
                },
            ],
            first.items,
            first.items,
        );

        expect(first.canLoadMorePast).toBe(true);
        expect(first.items[0]).toEqual(
            expect.objectContaining({content: '第二則', channelId: 9}),
        );
        expect(merged.map(item => item.id)).toEqual([1, 2]);
    });

    it('以微信式精簡時間顯示今日、昨日與日期', () => {
        const now = new Date(2026, 7, 12, 21, 0);
        expect(formatHarborChatListTime(new Date(2026, 7, 12, 20, 5), 'tc', now))
            .toBe('20:05');
        expect(formatHarborChatListTime(new Date(2026, 7, 11, 20, 5), 'tc', now))
            .toBe('昨日 20:05');
        expect(formatHarborChatListTime(new Date(2026, 6, 2, 20, 5), 'tc', now))
            .toBe('7月2日');
        expect(formatHarborChatListTime(new Date(2025, 11, 31, 20, 5), 'tc', now))
            .toBe('2025/12/31');
        expect(formatHarborChatListTime(new Date(2026, 7, 11, 20, 5), 'en', now))
            .toBe('Yesterday 20:05');
    });
});
