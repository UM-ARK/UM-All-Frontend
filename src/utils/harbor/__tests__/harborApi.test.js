import {
    calculateHarborInboxUnreadCount,
    clearHarborComposerMetadataCache,
    clearHarborDiscoveryCache,
    createHarborPostBookmark,
    deleteHarborBookmark,
    deleteHarborPost,
    fetchHarborBadges,
    fetchHarborCategories,
    fetchCurrentHarborUser,
    fetchHarborInboxUnreadCount,
    fetchHarborMessages,
    fetchHarborNotificationPage,
    fetchHarborNestedPostChildren,
    fetchHarborNotifications,
    fetchHarborSearch,
    fetchHarborSiteCapabilities,
    fetchHarborTags,
    fetchHarborTopic,
    fetchHarborTopicList,
    fetchHarborTopicPosts,
    fetchHarborUnreadNotificationCount,
    fetchHarborForumBadgeSnapshot,
    fetchHarborUserActions,
    fetchCachedHarborFlagTypes,
    flagHarborPost,
    getHarborTopicViews,
    HARBOR_TOPIC_NOTIFICATION_LEVELS,
    harborApi,
    likeHarborPost,
    markHarborTopicUnread,
    markHarborNotificationRead,
    normalizeHarborFlagTypes,
    saveHarborTopicTimings,
    setActiveHarborCredentials,
    setHarborCredentialRejectedHandler,
    setHarborTopicNotificationLevel,
    toggleHarborPostReaction,
    unlikeHarborPost,
    updateHarborBookmark,
    validateActiveHarborSession,
} from '../harborApi';

jest.mock('../../pathMap', () => ({
    ARK_HARBOR: 'https://harbor.example.com',
    ARK_HARBOR_AVATAR_TEMPLATE: template => template,
}));

describe('Harbor API 資料正規化', () => {
    let getSpy;
    let postSpy;
    let putSpy;
    let deleteSpy;

    beforeEach(() => {
        clearHarborDiscoveryCache();
        clearHarborComposerMetadataCache();
        getSpy = jest.spyOn(harborApi, 'get');
        postSpy = jest.spyOn(harborApi, 'post');
        putSpy = jest.spyOn(harborApi, 'put');
        deleteSpy = jest.spyOn(harborApi, 'delete');
    });

    afterEach(() => {
        setActiveHarborCredentials(null);
        setHarborCredentialRejectedHandler(null);
        getSpy.mockRestore();
        postSpy.mockRestore();
        putSpy.mockRestore();
        deleteSpy.mockRestore();
    });

    it('輕量 Session 驗證共用進行中的請求並使用短期快取', async () => {
        setActiveHarborCredentials({
            userApiKey: 'session-key',
            clientId: 'session-client',
        });
        getSpy.mockResolvedValue({
            data: {
                current_user: {
                    id: 7,
                    username: 'ark-user',
                },
            },
        });

        const firstRequest = validateActiveHarborSession();
        const secondRequest = validateActiveHarborSession();

        expect(firstRequest).toBe(secondRequest);
        await expect(firstRequest).resolves.toBe(true);
        await expect(validateActiveHarborSession()).resolves.toBe(true);
        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(getSpy).toHaveBeenCalledWith('/session/current.json', {
            harborCredentials: {
                userApiKey: 'session-key',
                clientId: 'session-client',
            },
        });
    });

    it('輕量 Session 驗證以 403 判定憑證失效', async () => {
        const rejectedHandler = jest.fn();
        setActiveHarborCredentials({
            userApiKey: 'expired-key',
            clientId: 'session-client',
        });
        setHarborCredentialRejectedHandler(rejectedHandler);
        getSpy.mockRejectedValue({
            response: { status: 403 },
        });

        await expect(validateActiveHarborSession()).resolves.toBe(false);
        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(rejectedHandler).toHaveBeenCalledWith(
            expect.objectContaining({
                response: { status: 403 },
            }),
            'expired-key',
        );
    });

    it('輕量 Session 驗證期間切換帳號時忽略舊結果', async () => {
        let resolveRequest;
        setActiveHarborCredentials({
            userApiKey: 'previous-key',
            clientId: 'session-client',
        });
        getSpy.mockReturnValue(
            new Promise(resolve => {
                resolveRequest = resolve;
            }),
        );

        const validationRequest = validateActiveHarborSession();
        setActiveHarborCredentials({
            userApiKey: 'next-key',
            clientId: 'session-client',
        });
        resolveRequest({
            data: {
                current_user: {
                    id: 7,
                    username: 'ark-user',
                },
            },
        });

        await expect(validationRequest).resolves.toBeNull();
        expect(getSpy).toHaveBeenCalledTimes(1);
    });

    it('已登入且能力資料尚未恢復時保留會員話題視圖', () => {
        expect(
            getHarborTopicViews(
                { topicViews: ['latest', 'top'] },
                {
                    signedIn: true,
                    unavailable: true,
                },
            ),
        ).toEqual(['latest', 'top', 'new', 'unread']);
    });

    it('未登入且能力資料尚未恢復時只顯示公開話題視圖', () => {
        expect(
            getHarborTopicViews(null, {
                signedIn: false,
                unavailable: true,
            }),
        ).toEqual(['latest', 'top']);
    });

    it('Secondary profile API 失敗時保留同帳號上次成功資料', async () => {
        const previousUser = {
            username: 'ark-user',
            displayName: 'ARK User',
            role: 'Harbor 會員',
            joinedAt: '2025-07',
            contributions: [
                {key: 'topicsCreated', value: '12'},
                {key: 'postsCreated', value: '34'},
                {key: 'likesReceived', value: '56'},
                {key: 'badges', value: '7'},
            ],
            stats: [
                {key: 'daysVisited', value: '90'},
                {key: 'readTime', value: '120'},
                {key: 'topicsRead', value: '45'},
            ],
            badges: [{id: 'badge-1'}],
        };
        getSpy
            .mockResolvedValueOnce({
                data: {
                    current_user: {
                        username: 'ark-user',
                        unread_notifications: 2,
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    user: {
                        username: 'ark-user',
                        name: 'ARK User',
                    },
                },
            })
            .mockRejectedValueOnce(new Error('summary unavailable'))
            .mockRejectedValueOnce(new Error('badges unavailable'));

        const result = await fetchCurrentHarborUser(
            {userApiKey: 'key', clientId: 'client'},
            previousUser,
        );

        expect(result.contributions.map(item => item.value)).toEqual([
            '12',
            '34',
            '56',
            '7',
        ]);
        expect(result.stats.map(item => item.value)).toEqual([
            '90',
            '120',
            '45',
        ]);
        expect(result.badges).toEqual(previousUser.badges);
        expect(result.partialProfile).toBe(true);
        expect(result.usedPreviousProfileData).toBe(true);
        expect(result.unavailableProfileSections).toEqual([
            'summary',
            'badges',
        ]);
        expect(getSpy.mock.calls.map(([path]) => path)).not.toContain(
            '/user_actions.json',
        );
        expect(getSpy.mock.calls.map(([path]) => path)).not.toContain(
            '/notifications.json',
        );
    });

    it('沒有上次資料時以未知狀態取代 Secondary API 的假 0', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    current_user: {
                        username: 'new-user',
                    },
                },
            })
            .mockRejectedValue(new Error('secondary unavailable'));

        const result = await fetchCurrentHarborUser(
            {
                userApiKey: 'key',
                clientId: 'client',
            },
            {
                username: 'other-user',
                contributions: [{key: 'topicsCreated', value: '99'}],
                stats: [{key: 'daysVisited', value: '99'}],
            },
        );

        expect(result.contributions.map(item => item.value)).toEqual([
            '—',
            '—',
            '—',
            '—',
        ]);
        expect(result.stats.map(item => item.value)).toEqual([
            '—',
            '—',
            '—',
        ]);
        expect(result.partialProfile).toBe(true);
        expect(result.usedPreviousProfileData).toBe(false);
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

    it('贊過列表優先使用 discourse-reactions，並合併 heart 影子讚', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: [
                    {
                        id: 88,
                        created_at: '2026-07-22T10:00:00Z',
                        post: {
                            topic_id: 42,
                            topic_title: 'Reactions 話題',
                            post_number: 2,
                            excerpt: '<p>表情回應</p>',
                        },
                    },
                ],
            })
            .mockResolvedValueOnce({
                data: {
                    user_actions: [
                        {
                            post_id: 15,
                            action_type: 1,
                            title: 'Heart 影子讚',
                            excerpt: '<p>愛心</p>',
                            created_at: '2026-07-22T11:00:00Z',
                            topic_id: 43,
                            post_number: 1,
                        },
                    ],
                },
            });

        const result = await fetchHarborUserActions('ark-user', {
            kind: 'likes',
        });

        expect(getSpy).toHaveBeenNthCalledWith(
            1,
            '/discourse-reactions/posts/reactions.json',
            expect.objectContaining({
                params: expect.objectContaining({
                    username: 'ark-user',
                }),
            }),
        );
        expect(getSpy).toHaveBeenNthCalledWith(
            2,
            '/user_actions.json',
            expect.objectContaining({
                params: expect.objectContaining({
                    username: 'ark-user',
                    filter: '1',
                }),
            }),
        );
        expect(result.items).toEqual([
            expect.objectContaining({
                id: '15',
                kind: 'like',
                title: 'Heart 影子讚',
                topicId: 43,
            }),
            expect.objectContaining({
                id: '88',
                kind: 'like',
                title: 'Reactions 話題',
                excerpt: '表情回應',
                topicId: 42,
                postNumber: 2,
            }),
        ]);
    });

    it('收藏列表支援分頁、名稱及提醒狀態', async () => {
        getSpy.mockResolvedValue({
            data: {
                user_bookmark_list: {
                    more_bookmarks_url: '/u/ark-user/bookmarks?page=2',
                    bookmarks: [
                        {
                            id: 8,
                            name: '稍後跟進',
                            title: 'Harbor 話題',
                            excerpt: '<p>提醒內容</p>',
                            topic_id: 42,
                            linked_post_number: 3,
                            reminder_at: '2026-07-28T08:00:00Z',
                        },
                    ],
                },
            },
        });

        const result = await fetchHarborUserActions('ark-user', {
            kind: 'bookmarks',
            offset: 1,
        });

        expect(getSpy).toHaveBeenCalledWith('/u/ark-user/bookmarks.json', {
            params: {page: 1},
            signal: undefined,
        });
        expect(result).toEqual({
            items: [
                expect.objectContaining({
                    id: '8',
                    title: '稍後跟進',
                    postNumber: 3,
                    bookmarkName: '稍後跟進',
                    reminderAt: '2026-07-28T08:00:00Z',
                }),
            ],
            hasMore: true,
            nextOffset: 2,
        });
    });

    it('分別正規化通知與私人訊息', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    notifications: [
                        {
                            id: 8,
                            read: false,
                            high_priority: true,
                            topic_id: 20,
                            post_number: 2,
                            created_at: '2026-07-21T08:00:00Z',
                            notification_type: 2,
                            slug: 'new-reply',
                            data: {
                                topic_title: '新回覆',
                                display_username: 'reader',
                            },
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
                            {
                                id: 32,
                                slug: 'viewed-private-topic',
                                title: '已讀私人對話',
                                unread_posts: 0,
                                new_posts: 0,
                                unseen: true,
                            },
                            {
                                id: 33,
                                slug: 'new-private-topic',
                                title: '新私人對話',
                                unread_posts: 0,
                                new_posts: 1,
                                unseen: true,
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
                typeName: 'replied',
                highPriority: true,
                slug: 'new-reply',
                actingUsername: 'reader',
                data: expect.objectContaining({
                    display_username: 'reader',
                }),
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
        expect(messages[1]).toEqual(
            expect.objectContaining({
                id: '32',
                unreadCount: 0,
            }),
        );
        expect(messages[2]).toEqual(
            expect.objectContaining({
                id: '33',
                unreadCount: 1,
            }),
        );
    });

    it('載入通知分頁及未讀總數', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    notifications: [
                        {
                            id: 31,
                            read: false,
                            notification_type: 29,
                            data: {chat_channel_id: 4},
                        },
                    ],
                    total_rows_notifications: 62,
                },
            })
            .mockResolvedValueOnce({
                data: {
                    notifications: [{id: 32, read: false}],
                    total_rows_notifications: 7,
                },
            });
        const controller = new AbortController();

        const page = await fetchHarborNotificationPage({
            filter: 'unread',
            offset: 30,
            limit: 30,
            signal: controller.signal,
        });
        const unreadCount = await fetchHarborUnreadNotificationCount({
            signal: controller.signal,
        });

        expect(page).toEqual({
            items: [
                expect.objectContaining({
                    id: '31',
                    typeName: 'chat_mention',
                }),
            ],
            totalCount: 62,
            hasMore: true,
            nextOffset: 31,
        });
        expect(unreadCount).toBe(7);
        expect(getSpy).toHaveBeenNthCalledWith(1, '/notifications.json', {
            params: {
                offset: 30,
                limit: 30,
                filter: 'unread',
            },
            signal: controller.signal,
        });
        expect(getSpy).toHaveBeenNthCalledWith(2, '/notifications.json', {
            params: {
                offset: 0,
                limit: 1,
                filter: 'unread',
            },
            signal: controller.signal,
        });
    });

    it('以消息中心相同口徑聚合通知及私人訊息未讀數', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    notifications: [{id: 32, read: false}],
                    total_rows_notifications: 4,
                },
            })
            .mockResolvedValueOnce({
                data: {
                    topic_list: {
                        topics: [
                            {id: 41, unread_posts: 2},
                            {id: 42, unread_posts: 0},
                            {id: 43, new_posts: 1},
                        ],
                    },
                },
            });

        await expect(
            fetchHarborInboxUnreadCount('ark-user'),
        ).resolves.toBe(6);
        expect(
            calculateHarborInboxUnreadCount(4, [
                {unreadCount: 2},
                {unreadCount: 0},
                {unreadCount: 1},
            ]),
        ).toBe(6);
    });

    it('透過已授權 API 將單一通知標為已讀', async () => {
        putSpy.mockResolvedValue({data: {success: 'OK'}});

        await markHarborNotificationRead('8');

        expect(putSpy).toHaveBeenCalledWith('/notifications/mark-read.json', {
            id: 8,
        });
    });

    it('首次建立論壇角標基準時只讀取最新一頁', async () => {
        getSpy.mockResolvedValueOnce({
            data: {
                topic_list: {
                    topics: [
                        {
                            id: 1,
                            last_posted_at: '2026-07-31T08:00:00Z',
                        },
                        {
                            id: 2,
                            last_posted_at: '2026-07-31T09:00:00Z',
                        },
                    ],
                    more_topics_url: '/latest?page=1',
                },
            },
        });

        const snapshot = await fetchHarborForumBadgeSnapshot();

        expect(snapshot).toEqual({
            latestAt: '2026-07-31T09:00:00.000Z',
            topicCount: 0,
        });
        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(getSpy).toHaveBeenCalledWith('/latest.json', {
            params: {page: 0},
            signal: undefined,
        });
    });

    it('按話題去重計算上次進入論壇後的新貼文', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    topic_list: {
                        topics: [
                            {
                                id: 1,
                                last_posted_at: '2026-07-31T10:00:00Z',
                            },
                            {
                                id: 2,
                                last_posted_at: '2026-07-31T09:00:00Z',
                            },
                        ],
                        more_topics_url: '/latest?page=1',
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    topic_list: {
                        topics: [
                            {
                                id: 2,
                                last_posted_at: '2026-07-31T09:00:00Z',
                            },
                            {
                                id: 3,
                                last_posted_at: '2026-07-31T07:00:00Z',
                            },
                        ],
                        more_topics_url: '/latest?page=2',
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    topic_list: {
                        topics: [
                            {
                                id: 4,
                                last_posted_at: '2026-07-30T23:00:00Z',
                            },
                        ],
                        more_topics_url: '/latest?page=3',
                    },
                },
            });

        const snapshot = await fetchHarborForumBadgeSnapshot({
            since: '2026-07-31T08:00:00Z',
        });

        expect(snapshot).toEqual({
            latestAt: '2026-07-31T10:00:00.000Z',
            topicCount: 2,
        });
        expect(getSpy).toHaveBeenNthCalledWith(1, '/latest.json', {
            params: {page: 0},
            signal: undefined,
        });
        expect(getSpy).toHaveBeenNthCalledWith(2, '/latest.json', {
            params: {page: 1},
            signal: undefined,
        });
        expect(getSpy).toHaveBeenNthCalledWith(3, '/latest.json', {
            params: {page: 2},
            signal: undefined,
        });
    });

    it('論壇角標最多計算 100 個更新話題', async () => {
        getSpy.mockResolvedValueOnce({
            data: {
                topic_list: {
                    topics: Array.from({length: 120}, (_, index) => ({
                        id: index + 1,
                        last_posted_at: '2026-07-31T10:00:00Z',
                    })),
                    more_topics_url: null,
                },
            },
        });

        await expect(
            fetchHarborForumBadgeSnapshot({
                since: '2026-07-31T08:00:00Z',
            }),
        ).resolves.toEqual({
            latestAt: '2026-07-31T10:00:00.000Z',
            topicCount: 100,
        });
    });

    it('論壇角標回應格式錯誤時拒絕更新舊狀態', async () => {
        getSpy.mockResolvedValueOnce({data: {}});

        await expect(fetchHarborForumBadgeSnapshot()).rejects.toThrow(
            'Invalid Harbor forum badge response',
        );
    });

    it('透過已授權 API 從指定樓層載入首窗話題內容', async () => {
        getSpy.mockResolvedValueOnce({
            data: {
                id: 31,
                post_stream: {
                    stream: [1, 2],
                    posts: [{id: 1, post_number: 1}],
                },
            },
        });

        const topic = await fetchHarborTopic(31, {postNumber: 2});

        expect(getSpy).toHaveBeenCalledWith(
            '/t/31/2.json',
            expect.objectContaining({
                params: {track_visit: true, forceLoad: true},
            }),
        );
        expect(getSpy.mock.calls[0][1]).not.toHaveProperty('headers');
        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(topic.post_stream.posts.map(post => post.id)).toEqual([1]);
    });

    it('僅在指定時為話題首窗請求加入觀看追蹤標頭', async () => {
        getSpy.mockResolvedValueOnce({
            data: {
                id: 31,
                post_stream: {
                    stream: [1],
                    posts: [{id: 1, post_number: 1}],
                },
            },
        });

        await fetchHarborTopic(31, {trackPageView: true});

        expect(getSpy).toHaveBeenCalledWith(
            '/t/31.json',
            expect.objectContaining({
                headers: {
                    'Discourse-Track-View': 'true',
                    'Discourse-Track-View-Topic-Id': '31',
                },
            }),
        );
    });

    it('話題啟用 Nested Replies 時改讀官方根回覆樹', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    id: 31,
                    is_nested_view: true,
                    highest_post_number: 8,
                    post_stream: {
                        stream: [1, 2, 3],
                        posts: [{id: 1, post_number: 1}],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    topic: {
                        id: 31,
                        is_nested_view: true,
                        highest_post_number: null,
                    },
                    op_post: {id: 1, post_number: 1},
                    roots: [
                        {
                            id: 2,
                            post_number: 2,
                            direct_reply_count: 1,
                            total_descendant_count: 2,
                            children: [],
                        },
                    ],
                    has_more_roots: true,
                    page: 0,
                    sort: 'old',
                    effective_sort: 'old',
                },
            });

        const topic = await fetchHarborTopic(31);

        expect(getSpy).toHaveBeenNthCalledWith(
            2,
            '/n/-/31.json',
            expect.objectContaining({
                params: {page: 0, sort: 'old', track_visit: true},
            }),
        );
        expect(topic.highest_post_number).toBe(8);
        expect(topic.nested_has_more_roots).toBe(true);
        expect(topic.post_stream.posts.map(post => post.id)).toEqual([1, 2]);
    });

    it('依父樓層與深度載入官方 Nested Replies 子樹', async () => {
        getSpy.mockResolvedValueOnce({
            data: {
                children: [{id: 3, post_number: 3, children: []}],
                has_more: false,
                page: 0,
            },
        });

        const response = await fetchHarborNestedPostChildren(31, 2, {
            depth: 2,
        });

        expect(getSpy).toHaveBeenCalledWith(
            '/n/-/31/children/2.json',
            expect.objectContaining({
                params: {depth: 2, page: 0, sort: 'old'},
            }),
        );
        expect(response.children.map(post => post.id)).toEqual([3]);
    });

    it('分批載入、去重並排序指定話題貼文', async () => {
        const postIds = Array.from({length: 22}, (value, index) => index + 1);
        getSpy
            .mockResolvedValueOnce({
                data: {
                    post_stream: {
                        posts: postIds
                            .slice(0, 20)
                            .reverse()
                            .map(id => ({id, post_number: id})),
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    post_stream: {
                        posts: [
                            {id: 22, post_number: 22},
                            {id: 21, post_number: 21},
                        ],
                    },
                },
            });

        const posts = await fetchHarborTopicPosts(
            31,
            [...postIds, 2, 0, -1, 1.5],
        );

        expect(getSpy).toHaveBeenNthCalledWith(
            1,
            '/t/31/posts.json',
            expect.objectContaining({
                params: {post_ids: postIds.slice(0, 20)},
            }),
        );
        expect(getSpy).toHaveBeenNthCalledWith(
            2,
            '/t/31/posts.json',
            expect.objectContaining({
                params: {post_ids: [21, 22]},
            }),
        );
        expect(posts.map(post => post.id)).toEqual(postIds);
    });

    it('指定貼文為空時不發出請求', async () => {
        await expect(
            fetchHarborTopicPosts(31, [0, -1, 1.5]),
        ).resolves.toEqual([]);

        expect(getSpy).not.toHaveBeenCalled();
    });

    it('儲存話題閱讀時間並忽略無效樓層', async () => {
        postSpy.mockResolvedValue({data: {success: 'OK'}});

        await saveHarborTopicTimings(31, {
            postNumber: 7,
            timeMs: 1234.9,
            topicTimeMs: -8,
        });
        await saveHarborTopicTimings(31, {postNumber: 0});

        expect(postSpy).toHaveBeenCalledTimes(1);
        expect(postSpy).toHaveBeenCalledWith('/topics/timings', {
            topic_id: 31,
            topic_time: 0,
            timings: {
                7: 1234,
            },
        });
    });

    it('透過 Discourse Core API 讚好及取消讚好', async () => {
        postSpy.mockResolvedValue({data: {id: 12, like_count: 3}});
        deleteSpy.mockResolvedValue({data: {id: 12, like_count: 2}});

        await expect(likeHarborPost(12)).resolves.toEqual({
            id: 12,
            like_count: 3,
        });
        await expect(unlikeHarborPost(12)).resolves.toEqual({
            id: 12,
            like_count: 2,
        });

        expect(postSpy).toHaveBeenCalledWith('/post_actions.json', {
            id: 12,
            post_action_type_id: 2,
        });
        expect(deleteSpy).toHaveBeenCalledWith('/post_actions/12.json', {
            data: {post_action_type_id: 2},
        });
    });

    it('透過 Discourse Core API 檢舉帖子並可附帶說明', async () => {
        postSpy.mockResolvedValue({data: {id: 12, success: 'OK'}});

        await expect(
            flagHarborPost(12, {postActionTypeId: 8}),
        ).resolves.toEqual({id: 12, success: 'OK'});
        await expect(
            flagHarborPost(12, {
                postActionTypeId: 7,
                message: '  請協助處理  ',
            }),
        ).resolves.toEqual({id: 12, success: 'OK'});

        expect(postSpy).toHaveBeenNthCalledWith(1, '/post_actions.json', {
            id: 12,
            post_action_type_id: 8,
            flag_topic: false,
        });
        expect(postSpy).toHaveBeenNthCalledWith(2, '/post_actions.json', {
            id: 12,
            post_action_type_id: 7,
            flag_topic: false,
            message: '請協助處理',
        });
        await expect(flagHarborPost(0, {postActionTypeId: 8})).rejects.toThrow(
            'Invalid Harbor post id',
        );
        await expect(flagHarborPost(12, {postActionTypeId: 0})).rejects.toThrow(
            'Invalid Harbor post action type id',
        );
    });

    it('從 site.json 正規化並快取旗標類型', async () => {
        getSpy.mockResolvedValue({
            data: {
                post_action_types: [
                    {
                        id: 2,
                        name_key: 'like',
                        name: '讚好',
                        is_flag: false,
                    },
                    {
                        id: 3,
                        name_key: 'off_topic',
                        name: '偏離主題',
                        description: '與討論無關',
                        is_flag: true,
                    },
                    {
                        id: 7,
                        name_key: 'notify_moderators',
                        name: '通知管理員',
                        short_description: '需要管理員協助',
                        is_flag: true,
                    },
                    {
                        id: 9,
                        name_key: 'custom_something',
                        name: '其他原因',
                        is_flag: true,
                        is_custom_flag: true,
                    },
                ],
            },
        });

        const flagTypes = await fetchCachedHarborFlagTypes();
        await fetchCachedHarborFlagTypes();

        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(getSpy).toHaveBeenCalledWith('/site.json', {
            signal: undefined,
        });
        expect(flagTypes).toEqual([
            {
                id: 3,
                name: '偏離主題',
                description: '與討論無關',
                nameKey: 'off_topic',
                requiresMessage: false,
                isCustomFlag: false,
            },
            {
                id: 7,
                name: '通知管理員',
                description: '需要管理員協助',
                nameKey: 'notify_moderators',
                requiresMessage: true,
                isCustomFlag: false,
            },
            {
                id: 9,
                name: '其他原因',
                description: '',
                nameKey: 'custom_something',
                requiresMessage: true,
                isCustomFlag: true,
            },
        ]);
        expect(
            normalizeHarborFlagTypes({
                post_action_types: [{id: 2, is_flag: false}],
            }),
        ).toEqual([]);
    });

    it('透過 Discourse Core API 刪除帖子', async () => {
        const signal = new AbortController().signal;
        deleteSpy.mockResolvedValue({data: {success: 'OK'}});

        await expect(
            deleteHarborPost(12, {signal}),
        ).resolves.toEqual({success: 'OK'});

        expect(deleteSpy).toHaveBeenCalledWith('/posts/12.json', {signal});
        await expect(deleteHarborPost(0)).rejects.toThrow(
            'Invalid Harbor post id',
        );
    });

    it('僅透過 Reactions 插件端點切換有效 Reaction', async () => {
        putSpy.mockResolvedValue({
            data: {id: 12, current_user_reaction: {id: 'heart'}},
        });

        await toggleHarborPostReaction(12, 'heart');

        expect(putSpy).toHaveBeenCalledWith(
            '/discourse-reactions/posts/12/custom-reactions/heart/toggle.json',
        );
        await expect(toggleHarborPostReaction(12, '')).rejects.toThrow(
            'Invalid Harbor reaction',
        );
    });

    it('建立、更新及刪除含提醒日期的收藏', async () => {
        postSpy.mockResolvedValue({data: {id: 91}});
        putSpy.mockResolvedValue({data: {success: 'OK'}});
        deleteSpy.mockResolvedValue({data: {success: 'OK'}});

        await expect(
            createHarborPostBookmark(12, {
                name: ' 稍後閱讀 ',
                reminderAt: '2026-07-28T08:00:00.000Z',
            }),
        ).resolves.toEqual({id: 91});
        await updateHarborBookmark(91, {
            name: '',
            reminderAt: null,
        });
        await deleteHarborBookmark(91);

        expect(postSpy).toHaveBeenCalledWith('/bookmarks.json', {
            bookmarkable_id: 12,
            bookmarkable_type: 'Post',
            name: '稍後閱讀',
            reminder_at: '2026-07-28T08:00:00.000Z',
        });
        expect(putSpy).toHaveBeenCalledWith('/bookmarks/91.json', {
            id: 91,
            name: null,
            reminder_at: null,
        });
        expect(deleteSpy).toHaveBeenCalledWith('/bookmarks/91.json');
    });

    it('更新 Topic 通知層級並標為未讀', async () => {
        postSpy.mockResolvedValue({data: {success: 'OK'}});
        deleteSpy.mockResolvedValue({data: null});

        await setHarborTopicNotificationLevel(
            31,
            HARBOR_TOPIC_NOTIFICATION_LEVELS.watchingFirstPost,
        );
        await markHarborTopicUnread(31);

        expect(postSpy).toHaveBeenCalledWith('/t/31/notifications.json', {
            notification_level: 4,
        });
        expect(deleteSpy).toHaveBeenCalledWith('/t/31/timings.json');
        await expect(
            setHarborTopicNotificationLevel(31, 9),
        ).rejects.toThrow('Invalid Harbor topic notification level');
    });

    it('公開分類載入失敗時仍返回 id-only 話題分類', async () => {
        getSpy.mockImplementation(path => {
            if (path === '/categories.json') {
                return Promise.reject(new Error('Category unavailable'));
            }
            return Promise.resolve({
                data: {
                    topic_list: {
                        more_topics_url: null,
                        topics: [
                            {
                                id: 40,
                                title: '公開話題',
                                category_id: 4,
                            },
                        ],
                    },
                },
            });
        });

        const result = await fetchHarborTopicList();

        expect(result.items[0]).toEqual(
            expect.objectContaining({
                id: 40,
                category: expect.objectContaining({
                    id: 4,
                    name: '',
                    slug: '',
                }),
            }),
        );
    });

    it('共享公開分類請求並為同時載入的話題補齊分類資料', async () => {
        getSpy.mockImplementation(path => {
            if (path === '/categories.json') {
                return Promise.resolve({
                    data: {
                        category_list: {
                            categories: [
                                {
                                    id: 4,
                                    name: '吹水台',
                                    slug: 'general',
                                },
                            ],
                        },
                    },
                });
            }

            return Promise.resolve({
                data: {
                    topic_list: {
                        more_topics_url: null,
                        topics: [
                            {
                                id: path === '/latest.json' ? 41 : 42,
                                title: '需要補齊分類',
                                category_id: 4,
                            },
                        ],
                    },
                },
            });
        });

        const [latest, top] = await Promise.all([
            fetchHarborTopicList({view: 'latest'}),
            fetchHarborTopicList({view: 'top'}),
        ]);
        const categoryRequests = getSpy.mock.calls.filter(
            ([path]) => path === '/categories.json',
        );

        expect(categoryRequests).toEqual([
            [
                '/categories.json',
                {
                    params: {include_subcategories: true},
                    skipHarborCredentials: true,
                },
            ],
        ]);
        expect(latest.items[0].category).toEqual(
            expect.objectContaining({
                id: 4,
                name: '吹水台',
                slug: 'general',
            }),
        );
        expect(top.items[0].category).toEqual(
            expect.objectContaining({
                id: 4,
                name: '吹水台',
                slug: 'general',
            }),
        );
    });

    it('已登入時補齊受限分類並在登出後清除分類快取', async () => {
        const credentials = {
            userApiKey: 'staff-key',
            clientId: 'session-client',
        };
        setActiveHarborCredentials(credentials);
        getSpy.mockImplementation((path, config) => {
            if (path === '/categories.json') {
                const isSignedIn =
                    config?.harborCredentials?.userApiKey ===
                    credentials.userApiKey;
                return Promise.resolve({
                    data: {
                        category_list: {
                            categories: isSignedIn
                                ? [
                                    {
                                        id: 3,
                                        name: 'Staff',
                                        slug: 'staff',
                                        read_restricted: true,
                                    },
                                ]
                                : [],
                        },
                    },
                });
            }

            return Promise.resolve({
                data: {
                    topic_list: {
                        more_topics_url: null,
                        topics: [
                            {
                                id: 43,
                                title: '受限話題',
                                category_id: 3,
                            },
                        ],
                    },
                },
            });
        });

        const signedInResult = await fetchHarborTopicList();
        const signedInNextPageResult = await fetchHarborTopicList({page: 1});
        setActiveHarborCredentials(null);
        const signedOutResult = await fetchHarborTopicList();
        const categoryRequests = getSpy.mock.calls.filter(
            ([path]) => path === '/categories.json',
        );

        expect(signedInResult.items[0].category).toEqual(
            expect.objectContaining({
                id: 3,
                name: 'Staff',
                slug: 'staff',
                readRestricted: true,
            }),
        );
        expect(signedInNextPageResult.items[0].category).toEqual(
            expect.objectContaining({
                id: 3,
                name: 'Staff',
                slug: 'staff',
            }),
        );
        expect(signedOutResult.items[0].category).toEqual(
            expect.objectContaining({
                id: 3,
                name: '',
                slug: '',
            }),
        );
        expect(categoryRequests).toEqual([
            [
                '/categories.json',
                {
                    params: {include_subcategories: true},
                    harborCredentials: credentials,
                },
            ],
            [
                '/categories.json',
                {
                    params: {include_subcategories: true},
                    skipHarborCredentials: true,
                },
            ],
        ]);
    });

    it('用公開分類 cache 補齊 Topic Detail 的分類資料', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    id: 43,
                    category_id: 4,
                    post_stream: {
                        stream: [1],
                        posts: [{id: 1, post_number: 1}],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    category_list: {
                        categories: [
                            {
                                id: 4,
                                name: '吹水台',
                                slug: 'general',
                            },
                        ],
                    },
                },
            });

        const topic = await fetchHarborTopic(43);

        expect(topic.category).toEqual(
            expect.objectContaining({
                id: 4,
                name: '吹水台',
                slug: 'general',
            }),
        );
        expect(getSpy).toHaveBeenNthCalledWith(2, '/categories.json', {
            params: {include_subcategories: true},
            skipHarborCredentials: true,
        });
    });

    it('正規化 Latest 話題狀態、作者、分類及分頁資訊', async () => {
        getSpy.mockResolvedValue({
            data: {
                users: [
                    {
                        id: 7,
                        username: 'topic-author',
                        name: 'Topic Author',
                        avatar_template: '/avatar/{size}.png',
                    },
                    {
                        id: 8,
                        username: 'last-poster',
                        avatar_template: '/last/{size}.png',
                    },
                ],
                category_list: {
                    categories: [
                        {
                            id: 4,
                            name: '吹水台',
                            slug: 'general',
                            color: '25AAE2',
                            text_color: 'FFFFFF',
                            position: 2,
                        },
                    ],
                },
                topic_list: {
                    can_create_topic: true,
                    per_page: 30,
                    more_topics_url: '/latest?no_definitions=true&page=3',
                    topics: [
                        {
                            id: 42,
                            unicode_title: 'Harbor &amp; APP 👋',
                            slug: 'harbor-app',
                            excerpt: '<p>原生探索&hellip;</p>',
                            category_id: 4,
                            tags: [
                                {
                                    id: 3,
                                    name: '校內美食',
                                    slug: '3-tag',
                                },
                            ],
                            posters: [
                                {user_id: 7},
                                {user_id: 8, extras: 'latest'},
                            ],
                            last_poster_username: 'last-poster',
                            posts_count: 6,
                            reply_count: 4,
                            views: 120,
                            like_count: 9,
                            liked: true,
                            created_at: '2026-07-20T08:00:00Z',
                            last_posted_at: '2026-07-21T08:00:00Z',
                            bumped_at: '2026-07-22T08:00:00Z',
                            unread_posts: 3,
                            last_read_post_number: 2,
                            highest_post_number: 6,
                            pinned: true,
                            pinned_globally: true,
                            closed: true,
                            archived: false,
                            notification_level: 0,
                            has_accepted_answer: true,
                        },
                    ],
                },
            },
        });

        const result = await fetchHarborTopicList({
            view: 'latest',
            page: 2,
        });

        expect(getSpy).toHaveBeenCalledWith('/latest.json', {
            params: {page: 2},
            signal: undefined,
        });
        expect(result).toEqual(
            expect.objectContaining({
                hasMore: true,
                nextPage: 3,
                capabilities: {
                    canCreateTopic: true,
                    solved: true,
                },
            }),
        );
        expect(result.items[0]).toEqual(
            expect.objectContaining({
                id: 42,
                title: 'Harbor & APP 👋',
                excerpt: '原生探索…',
                category: expect.objectContaining({
                    id: 4,
                    name: '吹水台',
                }),
                tags: [
                    expect.objectContaining({
                        id: 3,
                        name: '校內美食',
                        routeName: '校內美食',
                    }),
                ],
                author: expect.objectContaining({
                    id: 7,
                    username: 'topic-author',
                }),
                lastPoster: expect.objectContaining({
                    id: 8,
                    username: 'last-poster',
                }),
                postCount: 6,
                replyCount: 5,
                viewCount: 120,
                likeCount: 9,
                liked: true,
                activityAt: '2026-07-22T08:00:00Z',
                unreadCount: 3,
                lastReadPostNumber: 2,
                highestPostNumber: 6,
                isUnread: true,
                pinned: true,
                pinnedGlobally: true,
                closed: true,
                archived: false,
                muted: true,
                solved: true,
                capabilities: {solved: true},
            }),
        );
    });

    it('正規化 Harbor Topic、Post、User 搜尋結果及指定樓層', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    posts: [
                        {
                            id: 51,
                            username: 'topic-author',
                            avatar_template: '/author/{size}.png',
                            created_at: '2026-07-20T08:00:00Z',
                            like_count: 2,
                            blurb: '<p>命中 &amp; 摘要</p>',
                            post_number: 3,
                            topic_id: 42,
                        },
                    ],
                    topics: [
                        {
                            id: 42,
                            title: 'Harbor 搜尋',
                            slug: 'harbor-search',
                            category_id: 4,
                            tags: ['原生'],
                        },
                    ],
                    users: [],
                    categories: [
                        {
                            id: 4,
                            name: '吹水台',
                            slug: 'general',
                        },
                    ],
                    grouped_search_result: {
                        more_full_page_results: true,
                        search_log_id: 9,
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    users: [
                        {
                            id: 7,
                            username: 'harbor-user',
                            avatar_template: '/user/{size}.png',
                        },
                    ],
                },
            });

        const result = await fetchHarborSearch({
            query: 'Harbor category:general',
            userQuery: 'Harbor',
        });

        expect(getSpy).toHaveBeenNthCalledWith(1, '/search.json', {
            params: {
                q: 'Harbor category:general',
                page: 0,
            },
            signal: undefined,
        });
        expect(getSpy).toHaveBeenNthCalledWith(2, '/search/query.json', {
            params: {
                term: 'Harbor',
                include_blurbs: true,
            },
            signal: undefined,
        });
        expect(result).toEqual(
            expect.objectContaining({
                hasMore: true,
                nextPage: 1,
                searchLogId: 9,
            }),
        );
        expect(result.items).toEqual([
            expect.objectContaining({
                id: 'post-51',
                kind: 'post',
                topicId: 42,
                postNumber: 3,
                title: 'Harbor 搜尋',
                excerpt: '命中 & 摘要',
                author: expect.objectContaining({
                    username: 'topic-author',
                }),
                category: expect.objectContaining({
                    id: 4,
                    name: '吹水台',
                }),
            }),
            expect.objectContaining({
                kind: 'user',
                user: expect.objectContaining({
                    id: 7,
                    username: 'harbor-user',
                }),
            }),
        ]);
    });

    it('分頁搜尋不再額外請求 User suggestion', async () => {
        getSpy.mockResolvedValue({
            data: {
                posts: [],
                topics: [],
                users: [],
                grouped_search_result: {
                    more_posts: null,
                },
            },
        });

        const result = await fetchHarborSearch({
            query: 'Harbor',
            page: 2,
        });

        expect(getSpy).toHaveBeenCalledTimes(1);
        expect(getSpy).toHaveBeenCalledWith('/search.json', {
            params: {
                q: 'Harbor',
                page: 2,
            },
            signal: undefined,
        });
        expect(result).toEqual(
            expect.objectContaining({
                items: [],
                hasMore: false,
                nextPage: null,
            }),
        );
    });

    it.each([
        ['top', '/top.json'],
        ['new', '/new.json'],
        ['unread', '/unread.json'],
    ])('使用 %s 話題視圖端點', async (view, expectedPath) => {
        getSpy.mockResolvedValue({
            data: {
                topic_list: {
                    per_page: 30,
                    more_topics_url: null,
                    topics: [],
                },
            },
        });

        const result = await fetchHarborTopicList({view});

        expect(getSpy).toHaveBeenCalledWith(expectedPath, {
            params: {page: 0},
            signal: undefined,
        });
        expect(result).toEqual(
            expect.objectContaining({
                items: [],
                hasMore: false,
                nextPage: null,
            }),
        );
    });

    it('為分類及標籤話題建立正確的 Discourse 路徑', async () => {
        getSpy.mockResolvedValue({
            data: {
                topic_list: {
                    per_page: 30,
                    more_topics_url: null,
                    topics: [],
                },
            },
        });

        await fetchHarborTopicList({
            view: 'top',
            categoryId: 4,
            categorySlug: 'general chat',
        });
        await fetchHarborTopicList({
            tag: {
                name: '校內美食',
                slug: '3-tag',
            },
        });

        expect(getSpy).toHaveBeenNthCalledWith(
            1,
            '/c/general%20chat/4/l/top.json',
            {
                params: {page: 0},
                signal: undefined,
            },
        );
        expect(getSpy).toHaveBeenNthCalledWith(
            2,
            '/tag/%E6%A0%A1%E5%85%A7%E7%BE%8E%E9%A3%9F.json',
            {
                params: {page: 0},
                signal: undefined,
            },
        );
    });

    it('兼容內嵌作者、字串標籤及布林未讀欄位變體', async () => {
        getSpy.mockResolvedValue({
            data: {
                topic_list: {
                    per_page: 1,
                    topics: [
                        {
                            id: '88',
                            title: 'API &#x1F680;',
                            category: {
                                id: '5',
                                name: '開發',
                                slug: 'development',
                            },
                            author: {
                                id: 9,
                                username: 'developer',
                                avatar_url: 'https://example.com/avatar.png',
                            },
                            last_poster: {
                                id: 10,
                                username: 'reviewer',
                            },
                            tags: ['React Native'],
                            posts_count: 3,
                            reply_count: 0,
                            highest_post_number: 5,
                            last_read_post_number: 3,
                            unread: true,
                            unseen: true,
                            archived: true,
                            is_solved: false,
                        },
                    ],
                },
            },
        });

        const result = await fetchHarborTopicList({page: 4});
        const topic = result.items[0];

        expect(topic).toEqual(
            expect.objectContaining({
                id: 88,
                title: 'API 🚀',
                replyCount: 2,
                unreadCount: 2,
                isNew: true,
                liked: false,
                archived: true,
                solved: false,
                capabilities: {solved: true},
            }),
        );
        expect(topic.author.username).toBe('developer');
        expect(topic.lastPoster.username).toBe('reviewer');
        expect(topic.tags[0].name).toBe('React Native');
        expect(result).toEqual(
            expect.objectContaining({
                hasMore: true,
                nextPage: 5,
            }),
        );
    });

    it('正規化分類、子分類及標籤探索資料', async () => {
        getSpy
            .mockResolvedValueOnce({
                data: {
                    category_list: {
                        can_create_category: false,
                        can_create_topic: true,
                        categories: [
                            {
                                id: 4,
                                name: '吹水台',
                                slug: 'general',
                                description: '<p>日常交流 &amp; 校園生活</p>',
                                topic_count: 30,
                                post_count: 46,
                                position: 2,
                                read_restricted: false,
                                emoji: 'blue_book',
                                style_type: 'emoji',
                                subcategory_ids: [11],
                                subcategory_list: [
                                    {
                                        id: 11,
                                        name: '互相幫助',
                                        slug: 'help',
                                        parent_category_id: 4,
                                        position: 3,
                                        read_restricted: true,
                                        emoji: 'handshake',
                                        style_type: 'emoji',
                                    },
                                ],
                            },
                        ],
                    },
                },
            })
            .mockResolvedValueOnce({
                data: {
                    tags: [
                        {
                            id: 3,
                            text: '校內美食',
                            name: '校內美食',
                            slug: '3-tag',
                            description: '校園餐飲',
                            count: 6,
                            pm_only: false,
                        },
                        'ark攻略',
                    ],
                },
            });

        const categories = await fetchHarborCategories();
        const tags = await fetchHarborTags();

        expect(categories).toEqual(
            expect.objectContaining({
                hasMore: false,
                nextPage: null,
                canCreateCategory: false,
                canCreateTopic: true,
            }),
        );
        expect(categories.items).toEqual([
            expect.objectContaining({
                id: 4,
                description: '日常交流 & 校園生活',
                emoji: 'blue_book',
                styleType: 'emoji',
                subcategoryIds: [11],
                topicCount: 30,
                postCount: 46,
            }),
            expect.objectContaining({
                id: 11,
                parentCategoryId: 4,
                emoji: 'handshake',
                styleType: 'emoji',
                readRestricted: true,
            }),
        ]);
        expect(tags.items).toEqual([
            expect.objectContaining({
                id: 3,
                name: '校內美食',
                slug: '3-tag',
                routeName: '校內美食',
                topicCount: 6,
            }),
            expect.objectContaining({
                id: null,
                name: 'ark攻略',
                routeName: 'ark攻略',
            }),
        ]);
    });

    it('由 site.json 能力欄位決定可用視圖與條件式插件', async () => {
        getSpy.mockResolvedValue({
            data: {
                filters: ['latest', 'unread', 'new', 'top', 'votes', 'read'],
                top_menu_items: ['latest', 'unread', 'new', 'top', 'votes'],
                anonymous_top_menu_items: ['latest', 'top', 'categories'],
                notification_types: {
                    reaction: 25,
                    event_reminder: 27,
                    chat_message: 30,
                    assigned: 34,
                },
                categories: [
                    {
                        id: 4,
                        custom_fields: {
                            enable_accepted_answers: null,
                            enable_topic_voting: null,
                        },
                    },
                ],
                can_tag_topics: true,
                can_create_tag: false,
            },
        });

        const capabilities = await fetchHarborSiteCapabilities();

        expect(getSpy).toHaveBeenCalledWith('/site.json', {
            signal: undefined,
        });
        expect(capabilities).toEqual({
            topicViews: ['latest', 'top', 'new', 'unread'],
            anonymousTopicViews: ['latest', 'top'],
            viewRequirements: {
                latest: null,
                top: null,
                new: 'authenticated',
                unread: 'authenticated',
            },
            plugins: {
                solved: true,
                reactions: true,
                voting: true,
                assign: true,
                calendarEvents: true,
                chat: true,
            },
            solved: true,
            reactions: true,
            voting: true,
            assign: true,
            calendarEvents: true,
            chat: true,
            canTagTopics: true,
            canCreateTag: false,
        });
    });

    it('把最愛徽章排在預覽清單前方', async () => {
        getSpy.mockResolvedValue({
            data: {
                badges: [
                    {
                        id: 1,
                        name: '首次分享',
                        description: '<a href="/guidelines">授與</a>社群功能',
                        badge_type_id: 3,
                    },
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
        expect(badges[1].description).toBe('授與 社群功能');
    });
});
