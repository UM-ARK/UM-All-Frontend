jest.mock('../../../../../utils/harbor/harborApi', () => ({
    HARBOR_TOPIC_NOTIFICATION_LEVELS: {},
}));
jest.mock('../../../../../utils/pathMap', () => ({
    ARK_HARBOR_ABSOLUTE_URL: value => value,
}));

import {
    canUpdatePostReaction,
    flattenNestedPosts,
    updateNestedPostTree,
} from '../harborTopicModels';

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
