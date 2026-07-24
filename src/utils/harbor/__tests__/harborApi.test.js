import {
    fetchHarborBadges,
    fetchHarborMessages,
    fetchHarborNotifications,
    fetchHarborTopic,
    fetchHarborUserActions,
    harborApi,
    markHarborNotificationRead,
} from '../harborApi';

jest.mock('../../pathMap', () => ({
    ARK_HARBOR: 'https://harbor.example.com',
    ARK_HARBOR_AVATAR_TEMPLATE: template => template,
}));

describe('Harbor API 資料正規化', () => {
    let getSpy;
    let putSpy;

    beforeEach(() => {
        getSpy = jest.spyOn(harborApi, 'get');
        putSpy = jest.spyOn(harborApi, 'put');
    });

    afterEach(() => {
        getSpy.mockRestore();
        putSpy.mockRestore();
    });

    it('將 User Actions 轉為 App 活動項目', async () => {
        getSpy.mockResolvedValue({
            data: {
                user_actions: [
                    {
                        post_id: 12,
                        action_type: 5,
                        title: 'Harbor 回覆',
                        excerpt: '<p>你好 &amp; 歡迎</p>',
                        created_at: '2026-07-21T08:00:00Z',
                        topic_id: 42,
                        post_number: 3,
                    },
                ],
            },
        });

        const result = await fetchHarborUserActions('ark-user', {
            kind: 'replies',
        });

        expect(getSpy).toHaveBeenCalledWith(
            '/user_actions.json',
            expect.objectContaining({
                params: expect.objectContaining({
                    username: 'ark-user',
                    filter: '5',
                }),
            }),
        );
        expect(result.items).toEqual([
            expect.objectContaining({
                id: '12',
                kind: 'reply',
                title: 'Harbor 回覆',
                excerpt: '你好 & 歡迎',
                topicId: 42,
                postNumber: 3,
            }),
        ]);
    });

    it('分別正規化通知與私人訊息', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    notifications: [
                        {
                            id: 8,
                            read: false,
                            topic_id: 20,
                            post_number: 2,
                            created_at: '2026-07-21T08:00:00Z',
                            data: {topic_title: '新回覆'},
                        },
                        {
                            id: 9,
                            read: true,
                            created_at: '2026-07-21T09:00:00Z',
                            notification_type: 12,
                            data: {
                                badge_id: 3,
                                badge_name: '首次分享',
                            },
                        },
                    ],
                },
            })
            .mockResolvedValueOnce({
                data: {
                    topic_list: {
                        topics: [
                            {
                                id: 31,
                                slug: 'private-topic',
                                title: '私人對話',
                                unread_posts: 2,
                            },
                        ],
                    },
                },
            });

        const notifications = await fetchHarborNotifications();
        const messages = await fetchHarborMessages('ark-user');

        expect(notifications[0]).toEqual(
            expect.objectContaining({
                id: '8',
                title: '新回覆',
                isRead: false,
                topicId: 20,
            }),
        );
        expect(notifications[1]).toEqual(
            expect.objectContaining({
                id: '9',
                title: '首次分享',
                badgeId: 3,
                topicId: null,
            }),
        );
        expect(messages[0]).toEqual(
            expect.objectContaining({
                id: '31',
                slug: 'private-topic',
                unreadCount: 2,
            }),
        );
    });

    it('透過已授權 API 將單一通知標為已讀', async () => {
        putSpy.mockResolvedValue({data: {success: 'OK'}});

        await markHarborNotificationRead('8');

        expect(putSpy).toHaveBeenCalledWith(
            '/notifications/mark-read.json',
            {id: 8},
        );
    });

    it('透過已授權 API 載入完整話題內容', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    id: 31,
                    post_stream: {
                        stream: [1, 2],
                        posts: [{id: 1, post_number: 1}],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    post_stream: {
                        posts: [{id: 2, post_number: 2}],
                    },
                },
            });

        const topic = await fetchHarborTopic(31);

        expect(getSpy).toHaveBeenNthCalledWith(
            1,
            '/t/31.json',
            expect.objectContaining({
                params: {track_visit: true, forceLoad: true},
            }),
        );
        expect(getSpy).toHaveBeenNthCalledWith(
            2,
            '/t/31/posts.json',
            expect.objectContaining({params: {post_ids: [2]}}),
        );
        expect(topic.post_stream.posts.map(post => post.id)).toEqual([1, 2]);
    });

    it('把最愛徽章排在預覽清單前方', async () => {
        getSpy.mockResolvedValue({
            data: {
                badges: [
                    {id: 1, name: '首次分享', badge_type_id: 3},
                    {id: 2, name: '熱心回覆', badge_type_id: 2},
                ],
                user_badges: [
                    {
                        id: 10,
                        badge_id: 1,
                        granted_at: '2026-07-20T08:00:00Z',
                    },
                    {
                        id: 11,
                        badge_id: 2,
                        granted_at: '2026-07-01T08:00:00Z',
                        is_favorite: true,
                    },
                ],
            },
        });

        const badges = await fetchHarborBadges('ark-user');

        expect(badges.map(badge => badge.name)).toEqual([
            '熱心回覆',
            '首次分享',
        ]);
    });
});
