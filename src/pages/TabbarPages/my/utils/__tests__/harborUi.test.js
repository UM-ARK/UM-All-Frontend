import {
    formatRelativeTime,
    getHarborNotificationPresentation,
    getHarborNotificationTarget,
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

describe('Harbor 消息中心', () => {
    it('為通知類型提供可辨識內容與原生目標', () => {
        expect(
            getHarborNotificationPresentation(
                {
                    typeName: 'reaction',
                    actingUsername: 'reader',
                    title: '測試話題',
                },
                value => `t:${value}`,
            ),
        ).toEqual({
            icon: 'happy-outline',
            isAdmin: false,
            label: 't:反應',
            title: '測試話題',
            excerpt: 'reader',
        });
        expect(
            getHarborNotificationTarget(
                {topicId: 31, postNumber: 2},
                'ark-user',
            ),
        ).toEqual({
            kind: 'topic',
            topicId: 31,
            postNumber: 2,
        });
        expect(
            getHarborNotificationTarget({badgeId: 3}, 'ark-user'),
        ).toEqual({kind: 'badges'});
    });

    it('清楚標示管理員通知', () => {
        expect(
            getHarborNotificationPresentation(
                {
                    typeName: 'upcoming_change_available',
                },
                value => `t:${value}`,
            ),
        ).toEqual({
            icon: 'time-outline',
            isAdmin: true,
            label: 't:內容更新',
            title: 't:內容更新',
            excerpt: '',
        });
        expect(
            getHarborNotificationPresentation(
                {
                    typeName: 'custom',
                    data: {path: '/admin/plugins'},
                },
                value => `t:${value}`,
            ).isAdmin,
        ).toBe(true);
    });

    it('為私人訊息與通知連結提供原生目標', () => {
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'group_message_summary',
                    data: {group_name: 'course helpers'},
                },
                'ark user',
            ),
        ).toEqual({kind: 'messages'});
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'bookmark_reminder',
                    data: {bookmarkable_url: '/t/topic-name/31/4'},
                },
                'ark-user',
            ),
        ).toEqual({
            kind: 'topic',
            topicId: 31,
            postNumber: 4,
        });
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'custom',
                    data: {path: '/tag/campus-life'},
                },
                'ark-user',
            ),
        ).toEqual({
            kind: 'tag',
            tag: 'campus-life',
        });
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'custom',
                    data: {url: '/c/campus/activities/8'},
                },
                'ark-user',
            ),
        ).toEqual({
            kind: 'category',
            categorySlug: 'activities',
            categoryId: 8,
        });
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'custom',
                    data: {link: '/search?q=course+review'},
                },
                'ark-user',
            ),
        ).toEqual({
            kind: 'search',
            query: 'course review',
        });
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'custom',
                    data: {path: '/u/ark-user/messages/group/helpers'},
                },
                'ark-user',
            ),
        ).toEqual({kind: 'messages'});
    });

    it('只為有明確目標的通知提供 Web fallback', () => {
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'chat_mention',
                    data: {
                        chat_channel_id: 4,
                        chat_message_id: 9,
                    },
                },
                'ark-user',
            ),
        ).toEqual({
            kind: 'web',
            path: '/chat/c/-/4/9',
        });
        expect(
            getHarborNotificationTarget(
                {typeName: 'unknown', data: {}},
                'ark-user',
            ),
        ).toEqual({kind: 'none'});
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'membership_request_accepted',
                    data: {group_name: 'course helpers'},
                },
                'ark-user',
            ),
        ).toEqual({
            kind: 'web',
            path: '/g/course%20helpers',
        });
        expect(
            getHarborNotificationTarget(
                {
                    typeName: 'bookmark_reminder',
                    data: {bookmarkable_url: '/chat/c/-/4/9'},
                },
                'ark-user',
            ),
        ).toEqual({
            kind: 'web',
            path: '/chat/c/-/4/9',
        });
    });
});
