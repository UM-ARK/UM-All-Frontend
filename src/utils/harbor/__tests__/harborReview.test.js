import {harborApi} from '../harborApi';
import {
    fetchHarborReviewable,
    fetchHarborReviewables,
    fetchHarborReviewCount,
    getHarborReviewErrorKind,
    isHarborReviewConflict,
    isHarborReviewForbidden,
    performHarborReviewAction,
    updateHarborReviewable,
} from '../harborReview';

jest.mock('../../pathMap', () => ({
    ARK_HARBOR: 'https://harbor.example.com',
    ARK_HARBOR_ABSOLUTE_URL: value => value,
    ARK_HARBOR_AVATAR_TEMPLATE: template => template,
}));

describe('Harbor 審核 API', () => {
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

    it('取得待審數量並安全處理無效回應', async () => {
        getSpy
            .mockResolvedValueOnce({data: {count: 4}})
            .mockResolvedValueOnce({data: {count: 'invalid'}});

        await expect(fetchHarborReviewCount()).resolves.toBe(4);
        await expect(fetchHarborReviewCount()).resolves.toBe(0);
        expect(getSpy).toHaveBeenNthCalledWith(1, '/review/count.json', {
            signal: undefined,
        });
    });

    it('以 page 轉換 offset，保留伺服器提供的審核動作', async () => {
        const signal = {aborted: false};
        getSpy.mockResolvedValue({
            data: {
                reviewables: [
                    {
                        id: 12,
                        type: 'ReviewableFlaggedPost',
                        version: 3,
                        target_created_by_id: 2,
                        topic_id: 8,
                        bundled_action_ids: ['12-agree'],
                    },
                    {
                        id: 13,
                        type: 'ReviewableQueuedPost',
                        version: 0,
                    },
                ],
                bundled_actions: [
                    {
                        id: '12-agree',
                        action_ids: ['12-agree-action', '12-delete-action'],
                    },
                ],
                actions: [
                    {
                        id: '12-agree-action',
                        action_name: 'agree',
                        label: '同意',
                        icon: 'check',
                        client_action: 'perform',
                    },
                    {
                        id: '12-delete-action',
                        action_name: 'delete',
                        label: '刪除',
                        confirm_message: '確認刪除？',
                        confirm_destructive: true,
                    },
                ],
                meta: {
                    total_rows_reviewables: 11,
                    reviewable_count: 11,
                    unseen_reviewable_count: 2,
                    load_more_reviewables: '/review.json?offset=10',
                },
                users: [{id: 2, username: 'reporter'}],
                topics: [{id: 8, title: '測試'}],
            },
        });

        await expect(
            fetchHarborReviewables({
                page: 1,
                type: 'ReviewableFlaggedPost',
                categoryId: 3,
                username: 'moderator',
                priority: 'high',
                claimedBy: 'staff',
                signal,
            }),
        ).resolves.toMatchObject({
            page: 1,
            hasMore: true,
            meta: {
                totalRows: 11,
                reviewableCount: 11,
                unseenReviewableCount: 2,
            },
            items: [
                {
                    id: 12,
                    version: 3,
                    target_created_by: {id: 2, username: 'reporter'},
                    topic: {id: 8, title: '測試'},
                    bundledActions: [
                        {
                            id: '12-agree',
                            actions: [
                                {
                                    id: '12-agree-action',
                                    actionId: 'agree',
                                    clientAction: 'perform',
                                },
                                {
                                    id: '12-delete-action',
                                    actionId: 'delete',
                                    confirmMessage: '確認刪除？',
                                    confirmDestructive: true,
                                },
                            ],
                        },
                    ],
                },
                {
                    id: 13,
                    actions: [],
                    bundledActions: [],
                },
            ],
        });
        expect(getSpy).toHaveBeenCalledWith('/review.json', {
            params: {
                offset: 10,
                status: 'pending',
                type: 'ReviewableFlaggedPost',
                category_id: 3,
                username: 'moderator',
                priority: 'high',
                claimed_by: 'staff',
            },
            signal,
        });
    });

    it('載入單一審核項目與 side-loaded 動作', async () => {
        getSpy.mockResolvedValue({
            data: {
                reviewable: {
                    id: 4,
                    version: 0,
                    bundled_action_ids: ['4-approve-bundle'],
                },
                bundled_actions: [
                    {
                        id: '4-approve-bundle',
                        action_ids: ['4-approve-action'],
                    },
                ],
                actions: [
                    {
                        id: '4-approve-action',
                        action_name: 'approve',
                        title: '批准',
                    },
                ],
                meta: {reviewable_count: 1},
            },
        });

        await expect(fetchHarborReviewable(4)).resolves.toMatchObject({
            item: {
                id: 4,
                version: 0,
                bundledActions: [
                    {
                        id: '4-approve-bundle',
                        actions: [{actionId: 'approve', label: '批准'}],
                    },
                ],
            },
            meta: {reviewableCount: 1},
        });
        expect(getSpy).toHaveBeenCalledWith('/review/4.json', {
            signal: undefined,
        });
    });

    it('執行動作及更新欄位時附上目前 version', async () => {
        putSpy
            .mockResolvedValueOnce({data: {success: true}})
            .mockResolvedValueOnce({data: {version: 3}});

        await expect(
            performHarborReviewAction({
                reviewableId: 12,
                actionId: 'agree-and-delete',
                version: 2,
                params: {send_email: true},
            }),
        ).resolves.toEqual({success: true});
        await expect(
            updateHarborReviewable({
                reviewableId: 12,
                version: 2,
                fields: {payload: {title: '修訂標題'}},
            }),
        ).resolves.toEqual({version: 3});

        expect(putSpy).toHaveBeenNthCalledWith(
            1,
            '/review/12/perform/agree-and-delete.json',
            {send_email: true, version: 2},
        );
        expect(putSpy).toHaveBeenNthCalledWith(2, '/review/12.json', {
            reviewable: {payload: {title: '修訂標題'}},
            version: 2,
        });
    });

    it('提供版主介面需要的權限、過期與欄位錯誤判定', () => {
        expect(getHarborReviewErrorKind({response: {status: 403}})).toBe(
            'forbidden',
        );
        expect(getHarborReviewErrorKind({response: {status: 404}})).toBe(
            'not_found',
        );
        expect(getHarborReviewErrorKind({response: {status: 409}})).toBe(
            'conflict',
        );
        expect(getHarborReviewErrorKind({response: {status: 422}})).toBe(
            'validation',
        );
        expect(isHarborReviewForbidden({response: {status: 403}})).toBe(true);
        expect(isHarborReviewConflict({response: {status: 409}})).toBe(true);
    });

    it('在缺少必填 id、action 或 version 時拒絕送出', async () => {
        await expect(fetchHarborReviewable('invalid')).rejects.toThrow(
            'Harbor reviewable id is required',
        );
        await expect(
            performHarborReviewAction({
                reviewableId: 1,
                actionId: 'approve',
            }),
        ).rejects.toThrow('Harbor review version is required');
        await expect(
            performHarborReviewAction({
                reviewableId: 1,
                actionId: 'approve',
                version: '',
            }),
        ).rejects.toThrow('Harbor review version is required');
        await expect(
            performHarborReviewAction({
                reviewableId: 1,
                actionId: 'approve',
                version: null,
            }),
        ).rejects.toThrow('Harbor review version is required');
        await expect(
            updateHarborReviewable({
                reviewableId: 1,
                version: 0,
                fields: [],
            }),
        ).rejects.toThrow('Harbor review fields must be an object');
    });
});
