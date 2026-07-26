import {
    clearHarborDiscoveryCache,
    fetchHarborBadges,
    fetchHarborCategories,
    fetchHarborMessages,
    fetchHarborNotifications,
    fetchHarborSearch,
    fetchHarborSiteCapabilities,
    fetchHarborTags,
    fetchHarborTopic,
    fetchHarborTopicList,
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
        clearHarborDiscoveryCache();
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

        expect(putSpy).toHaveBeenCalledWith('/notifications/mark-read.json', {
            id: 8,
        });
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
            ['/categories.json', {skipHarborCredentials: true}],
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
                replyCount: 4,
                viewCount: 120,
                likeCount: 9,
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
                                subcategory_ids: [11],
                                subcategory_list: [
                                    {
                                        id: 11,
                                        name: '互相幫助',
                                        slug: 'help',
                                        parent_category_id: 4,
                                        position: 3,
                                        read_restricted: true,
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
                subcategoryIds: [11],
                topicCount: 30,
                postCount: 46,
            }),
            expect.objectContaining({
                id: 11,
                parentCategoryId: 4,
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
