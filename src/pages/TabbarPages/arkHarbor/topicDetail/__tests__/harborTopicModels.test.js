jest.mock('../../../../../utils/harbor/harborApi', () => ({
    HARBOR_TOPIC_NOTIFICATION_LEVELS: {},
}));
jest.mock('../../../../../utils/pathMap', () => ({
    ARK_HARBOR_ABSOLUTE_URL: value => value,
}));

import {
    canDeleteHarborPost,
    canFlagPost,
    canShowFlagMenu,
    canUpdatePostReaction,
    extractPostImages,
    flattenNestedPosts,
    formatHarborFlagTypesForPost,
    getFlagActions,
    getHarborImagePressAction,
    getNestedReplyPreviewLimit,
    interpolateHarborI18nTemplate,
    isHarborPostDeleted,
    mergeAvailableFlagTypes,
    updateNestedPostTree,
    updateOptimisticFlag,
} from '../harborTopicModels';

describe('extractPostImages', () => {
    it('以 lightbox 原圖地址提供 Composer 預覽映射', () => {
        expect(
            extractPostImages(
                '<a class="lightbox" ' +
                'href="https://assert.umall.one/original/1X/b27fa981.jpeg">' +
                '<img src="https://assert.umall.one/optimized/1X/b27fa981.jpeg">' +
                '</a>',
            ),
        ).toEqual([
            'https://assert.umall.one/original/1X/b27fa981.jpeg',
        ]);
    });
});

describe('getHarborImagePressAction', () => {
    it('優先以父連結或圖片來源開啟相簿', () => {
        const imageUrls = ['/uploads/original.jpeg', '/uploads/plain.jpeg'];

        expect(
            getHarborImagePressAction({
                parentUrl: '/uploads/original.jpeg',
                sourceUrl: '/uploads/thumbnail.jpeg',
                imageUrls,
            }),
        ).toEqual({ type: 'image', imageIndex: 0 });
        expect(
            getHarborImagePressAction({
                sourceUrl: '/uploads/plain.jpeg',
                imageUrls,
            }),
        ).toEqual({ type: 'image', imageIndex: 1 });
    });

    it('非相簿圖片優先開啟父連結，並忽略頁內錨點', () => {
        expect(
            getHarborImagePressAction({
                parentUrl: 'https://www.youtube.com/watch?v=I78NqlA0EWI',
                sourceUrl: '/uploads/youtube-thumbnail.jpeg',
                imageUrls: ['/uploads/youtube-thumbnail.jpeg'],
            }),
        ).toEqual({
            type: 'link',
            url: 'https://www.youtube.com/watch?v=I78NqlA0EWI',
        });
        expect(
            getHarborImagePressAction({
                parentUrl: '#heading',
                sourceUrl: '/uploads/thumbnail.jpeg',
                imageUrls: [],
            }),
        ).toBeNull();
    });
});

describe('canDeleteHarborPost', () => {
    it('回覆只依帖子權限判斷', () => {
        expect(
            canDeleteHarborPost(
                { post_number: 2, can_delete: false },
                { details: { can_delete: true } },
            ),
        ).toBe(false);
        expect(
            canDeleteHarborPost(
                { post_number: 2, can_delete: true },
                { details: { can_delete: false } },
            ),
        ).toBe(true);
    });

    it('首帖可使用話題層刪除權限', () => {
        expect(
            canDeleteHarborPost(
                { post_number: 1, can_delete: false },
                { details: { can_delete: true } },
            ),
        ).toBe(true);
        expect(
            canDeleteHarborPost(
                { post_number: 1, can_delete: false },
                { details: { can_delete: false } },
            ),
        ).toBe(false);
    });
});

describe('isHarborPostDeleted', () => {
    it('辨識 deleted_at、user_deleted 與巢狀刪除佔位', () => {
        expect(isHarborPostDeleted({ deleted_at: '2026-01-01' })).toBe(true);
        expect(isHarborPostDeleted({ user_deleted: true })).toBe(true);
        expect(
            isHarborPostDeleted({ deleted_post_placeholder: true }),
        ).toBe(true);
        expect(isHarborPostDeleted({ post_number: 2 })).toBe(false);
        expect(isHarborPostDeleted(null)).toBe(false);
    });
});

describe('canUpdatePostReaction', () => {
    it('允許對可讚好的帖子新增回應', () => {
        expect(
            canUpdatePostReaction({
                actions_summary: [{ id: 2, can_act: true }],
            }),
        ).toBe(true);
    });

    it('拒絕對不可讚好或缺少權限資料的帖子新增回應', () => {
        expect(
            canUpdatePostReaction({
                actions_summary: [{ id: 2, can_act: false }],
            }),
        ).toBe(false);
        expect(canUpdatePostReaction({})).toBe(false);
    });

    it('依現有回應的 can_undo 決定能否切換或取消', () => {
        expect(
            canUpdatePostReaction({
                current_user_reaction: {
                    id: 'heart',
                    can_undo: true,
                },
            }),
        ).toBe(true);
        expect(
            canUpdatePostReaction({
                current_user_reaction: {
                    id: 'heart',
                    can_undo: false,
                },
            }),
        ).toBe(false);
    });
});

describe('Flag 資料模型', () => {
    const flagTypes = [
        { id: 3, name: '偏離主題', requiresMessage: false },
        { id: 7, name: '通知管理員', requiresMessage: true },
        { id: 8, name: '垃圾訊息', requiresMessage: false },
    ];

    it('取得可檢舉的 actions_summary 項目', () => {
        expect(
            getFlagActions({
                actions_summary: [
                    { id: 2, can_act: true },
                    { id: 3, can_act: true },
                    { id: 7, can_act: false },
                    { id: 8, can_act: true },
                ],
            }),
        ).toEqual([
            { id: 3, can_act: true },
            { id: 8, can_act: true },
        ]);
        expect(
            getFlagActions(
                {
                    actions_summary: [
                        { id: 3, can_act: true },
                        { id: 8, can_act: true },
                    ],
                },
                [3],
            ),
        ).toEqual([{ id: 3, can_act: true }]);
    });

    it('未登入可顯示舉報；自己的帖子不顯示', () => {
        expect(
            canShowFlagMenu({ username: 'alice', actions_summary: [] }, null),
        ).toBe(true);
        expect(
            canShowFlagMenu(
                { username: 'alice', actions_summary: [] },
                'alice',
            ),
        ).toBe(false);
        expect(
            canShowFlagMenu(
                {
                    username: 'bob',
                    actions_summary: [{ id: 3, can_act: true }],
                },
                'alice',
            ),
        ).toBe(true);
    });

    it('依 can_act 判斷是否可送出檢舉', () => {
        expect(
            canFlagPost(
                {
                    username: 'bob',
                    actions_summary: [{ id: 3, can_act: true }],
                },
                'alice',
            ),
        ).toBe(true);
        expect(
            canFlagPost(
                {
                    username: 'alice',
                    actions_summary: [{ id: 3, can_act: true }],
                },
                'alice',
            ),
        ).toBe(false);
        expect(
            canFlagPost(
                {
                    username: 'bob',
                    actions_summary: [{ id: 3, can_act: false }],
                },
                'alice',
            ),
        ).toBe(false);
    });

    it('合併站點旗標類型與帖子 can_act', () => {
        expect(
            mergeAvailableFlagTypes(flagTypes, {
                actions_summary: [
                    { id: 3, can_act: true },
                    { id: 7, can_act: false },
                    { id: 8, can_act: true },
                ],
            }),
        ).toEqual([
            { id: 3, name: '偏離主題', requiresMessage: false },
            { id: 8, name: '垃圾訊息', requiresMessage: false },
        ]);
        expect(
            mergeAvailableFlagTypes(flagTypes, {
                actions_summary: [{ id: 7, can_act: false }],
            }),
        ).toEqual([]);
    });

    it('樂觀更新已檢舉狀態', () => {
        expect(
            updateOptimisticFlag(
                {
                    id: 12,
                    actions_summary: [
                        { id: 2, can_act: true },
                        { id: 3, can_act: true },
                    ],
                },
                3,
            ),
        ).toEqual({
            id: 12,
            actions_summary: [
                { id: 2, can_act: true },
                {
                    id: 3,
                    can_act: false,
                    acted: true,
                    can_undo: false,
                },
            ],
        });
    });

    it('替換旗標文案中的 Discourse %{username} 佔位符', () => {
        expect(
            interpolateHarborI18nTemplate('給 @%{username} 送出一則訊息', {
                username: 'alice',
            }),
        ).toBe('給 @alice 送出一則訊息');
        expect(
            formatHarborFlagTypesForPost(
                [
                    {
                        id: 6,
                        name: '給 @%{username} 送出一則訊息',
                        description: '直接和 %{username} 溝通',
                        requiresMessage: true,
                    },
                ],
                { username: 'bob' },
            ),
        ).toEqual([
            {
                id: 6,
                name: '給 @bob 送出一則訊息',
                description: '直接和 bob 溝通',
                requiresMessage: true,
            },
        ]);
    });
});

describe('Nested Replies 資料模型', () => {
    const posts = [
        {
            id: 1,
            post_number: 1,
            direct_reply_count: 1,
            total_descendant_count: 3,
            children: [
                {
                    id: 2,
                    post_number: 2,
                    children: [],
                },
            ],
        },
        {
            id: 2,
            post_number: 2,
            direct_reply_count: 1,
            total_descendant_count: 6,
            children: [
                {
                    id: 3,
                    post_number: 3,
                    direct_reply_count: 5,
                    total_descendant_count: 5,
                    children: [
                        {
                            id: 4,
                            post_number: 4,
                            children: [],
                        },
                        {
                            id: 5,
                            post_number: 5,
                            children: [],
                        },
                        {
                            id: 6,
                            post_number: 6,
                            children: [],
                        },
                        {
                            id: 7,
                            post_number: 7,
                            children: [],
                        },
                        {
                            id: 8,
                            post_number: 8,
                            children: [],
                        },
                    ],
                },
            ],
        },
    ];

    it('每批最多展平五則回覆並計入樓中樓', () => {
        expect(
            flattenNestedPosts(
                posts,
                new Map([
                    [1, 5],
                    [2, 5],
                ]),
            ).map(post => ({
                depth: post.__harborNestedDepth,
                id: post.id,
                replyCount: post.__harborNestedReplyCount,
                visibleReplyCount:
                    post.__harborNestedVisibleReplyCount,
            })),
        ).toEqual([
            {depth: 0, id: 1, replyCount: 0, visibleReplyCount: 0},
            {depth: 0, id: 2, replyCount: 6, visibleReplyCount: 5},
            {depth: 1, id: 3, replyCount: 0, visibleReplyCount: 0},
            {depth: 2, id: 4, replyCount: 0, visibleReplyCount: 0},
            {depth: 2, id: 5, replyCount: 0, visibleReplyCount: 0},
            {depth: 2, id: 6, replyCount: 0, visibleReplyCount: 0},
            {depth: 2, id: 7, replyCount: 0, visibleReplyCount: 0},
        ]);
    });

    it('下一批會接續顯示剩餘的樓中樓回覆', () => {
        expect(
            flattenNestedPosts(
                posts,
                new Map([[2, 10]]),
            ).map(post => post.id),
        ).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    });

    it('少於十則評論時預設顯示最多兩則樓中樓回覆', () => {
        const flattened = flattenNestedPosts(
            posts,
            new Map(),
            getNestedReplyPreviewLimit(10),
        );

        expect(flattened.map(post => post.id)).toEqual([1, 2, 3, 4]);
        expect(flattened[1].__harborNestedReplyPreviewCount).toBe(2);
        expect(flattened[1].__harborNestedVisibleReplyCount).toBe(2);
    });

    it('十則評論起維持樓中樓預設收合', () => {
        expect(getNestedReplyPreviewLimit(10)).toBe(2);
        expect(getNestedReplyPreviewLimit(11)).toBe(0);
        expect(
            flattenNestedPosts(
                posts,
                new Map(),
                getNestedReplyPreviewLimit(11),
            ).map(post => post.id),
        ).toEqual([1, 2]);
    });

    it('可在巢狀子樹中更新指定貼文而不改動其他分支', () => {
        const updated = updateNestedPostTree(posts, 3, post => ({
            ...post,
            cooked: '<p>更新內容</p>',
        }));

        expect(updated[0]).toBe(posts[0]);
        expect(updated[1].children[0].cooked).toBe('<p>更新內容</p>');
        expect(updated[1].children[0].children[0]).toBe(
            posts[1].children[0].children[0],
        );
    });
});
