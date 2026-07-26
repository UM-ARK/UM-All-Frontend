import {
    createHarborPost,
    fetchHarborCategories,
    fetchHarborComposerSettings,
    fetchHarborPostForEdit,
    harborApi,
    uploadHarborComposerImage,
    updateHarborPost,
} from '../harborApi';

jest.mock('../../pathMap', () => ({
    ARK_HARBOR: 'https://harbor.example.com',
    ARK_HARBOR_AVATAR_TEMPLATE: template => template,
}));

describe('Harbor Composer API', () => {
    let getSpy;
    let postSpy;
    let putSpy;

    beforeEach(() => {
        getSpy = jest.spyOn(harborApi, 'get');
        postSpy = jest.spyOn(harborApi, 'post');
        putSpy = jest.spyOn(harborApi, 'put');
    });

    afterEach(() => {
        getSpy.mockRestore();
        postSpy.mockRestore();
        putSpy.mockRestore();
    });

    it('從 Harbor client settings 取得 Composer 發佈要求', async () => {
        const signal = {aborted: false};
        getSpy.mockResolvedValue({
            data: {
                min_topic_title_length: 4,
                max_topic_title_length: 255,
                min_post_length: 3,
                min_first_post_length: 5,
                max_post_length: 64000,
                max_tags_per_topic: 5,
                default_composer_category: '4',
                allow_uncategorized_topics: false,
                simultaneous_uploads: 4,
                max_image_size_kb: 5120,
            },
        });

        await expect(
            fetchHarborComposerSettings({signal}),
        ).resolves.toEqual({
            minTopicTitleLength: 4,
            maxTopicTitleLength: 255,
            minPostLength: 3,
            minFirstPostLength: 5,
            maxPostLength: 64000,
            maxTagsPerTopic: 5,
            defaultCategoryId: 4,
            allowUncategorizedTopics: false,
            simultaneousUploads: 4,
            maxImageSizeKb: 5120,
        });
        expect(getSpy).toHaveBeenCalledWith('/site/settings.json', {signal});
    });

    it('保留分類的標籤要求與 Topic template', async () => {
        getSpy.mockResolvedValue({
            data: {
                category_list: {
                    categories: [
                        {
                            id: 5,
                            name: '搵工賺錢',
                            minimum_required_tags: 1,
                            allowed_tags: ['校招'],
                            allowed_tag_groups: ['工作'],
                            required_tag_groups: [
                                {name: '工作', min_count: 1},
                            ],
                            topic_template: '**職位描述**：',
                        },
                    ],
                },
            },
        });

        await expect(fetchHarborCategories()).resolves.toMatchObject({
            items: [
                {
                    id: 5,
                    minimumRequiredTags: 1,
                    allowedTags: ['校招'],
                    allowedTagGroups: ['工作'],
                    requiredTagGroups: [
                        {name: '工作', min_count: 1},
                    ],
                    topicTemplate: '**職位描述**：',
                },
            ],
        });
    });

    it('建立含分類、標籤及草稿 key 的新話題', async () => {
        const signal = {aborted: false};
        postSpy.mockResolvedValue({
            data: {id: 81, topic_id: 31, post_number: 1},
        });

        await expect(
            createHarborPost({
                raw: '話題內容',
                title: '新話題',
                categoryId: '4',
                tags: [
                    {id: 7, name: '校園', slug: 'campus'},
                    ' 活動 ',
                    {name: '新標籤'},
                ],
                draftKey: 'new_topic',
                signal,
            }),
        ).resolves.toEqual({id: 81, topic_id: 31, post_number: 1});

        expect(postSpy).toHaveBeenCalledWith(
            '/posts.json',
            {
                raw: '話題內容',
                title: '新話題',
                category: 4,
                tags: [
                    {id: 7, name: '校園'},
                    {name: '活動'},
                    {name: '新標籤'},
                ],
                draft_key: 'new_topic',
            },
            {signal},
        );
    });

    it('回覆指定樓層時省略所有新話題欄位', async () => {
        postSpy.mockResolvedValue({
            data: {id: 82, topic_id: 31, post_number: 5},
        });

        await createHarborPost({
            raw: '回覆內容',
            topicId: 31,
            replyToPostNumber: 3,
        });

        expect(postSpy).toHaveBeenCalledWith(
            '/posts.json',
            {
                raw: '回覆內容',
                topic_id: 31,
                reply_to_post_number: 3,
            },
            {signal: undefined},
        );
    });

    it('省略空標籤陣列且不改動 raw 的空白', async () => {
        postSpy.mockResolvedValue({
            data: {id: 81, topic_id: 31, post_number: 1},
        });

        await createHarborPost({
            raw: '  保留內文空白  ',
            title: '新話題',
            tags: [],
        });

        expect(postSpy).toHaveBeenCalledWith(
            '/posts.json',
            {
                raw: '  保留內文空白  ',
                title: '新話題',
            },
            {signal: undefined},
        );
    });

    it('上傳 Composer 圖片並正規化 short URL', async () => {
        const signal = {aborted: false};
        const onUploadProgress = jest.fn();
        postSpy.mockResolvedValue({
            data: {id: '91', short_url: 'upload://abc123.jpeg'},
        });

        await expect(
            uploadHarborComposerImage(
                {
                    uri: 'file:///photo.jpeg',
                    fileName: 'photo.jpeg',
                    mimeType: 'image/jpeg',
                },
                {signal, onUploadProgress},
            ),
        ).resolves.toEqual({
            id: 91,
            shortUrl: 'upload://abc123.jpeg',
        });

        expect(postSpy).toHaveBeenCalledWith(
            '/uploads.json',
            expect.any(FormData),
            {
                headers: {'Content-Type': 'multipart/form-data'},
                onUploadProgress,
                signal,
            },
        );
    });

    it.each([
        [{title: '缺少內文'}, 'Invalid Harbor post raw'],
        [{raw: '內文'}, 'Invalid Harbor topic title'],
        [
            {raw: '內文', title: '話題', topicId: 31},
            'Invalid Harbor topic title',
        ],
        [
            {raw: '內文', topicId: 31, categoryId: 4},
            'Invalid Harbor category id',
        ],
        [
            {raw: '內文', title: '話題', replyToPostNumber: 2},
            'Invalid Harbor reply post number',
        ],
        [
            {raw: '內文', title: '話題', tags: [' ']},
            'Invalid Harbor post tags',
        ],
        [
            {raw: '內文', title: '話題', tags: [{id: 0, name: '校園'}]},
            'Invalid Harbor tag id',
        ],
    ])('拒絕無效的建立參數 %#', async (params, message) => {
        await expect(createHarborPost(params)).rejects.toThrow(message);
        expect(postSpy).not.toHaveBeenCalled();
    });

    it('從官方貼文端點載入並正規化編輯資料', async () => {
        const signal = {aborted: false};
        getSpy.mockResolvedValue({
            data: {
                id: '81',
                raw: '原始 Markdown',
                topic_id: '31',
                post_number: '1',
                topic_title: '原始標題',
                category_id: '4',
                tags: [
                    {id: '7', name: '校園'},
                    ' 活動 ',
                ],
                can_edit: 1,
            },
        });

        await expect(
            fetchHarborPostForEdit(81, {signal}),
        ).resolves.toEqual({
            id: 81,
            raw: '原始 Markdown',
            topicId: 31,
            postNumber: 1,
            title: '原始標題',
            categoryId: 4,
            tags: [
                {id: 7, name: '校園'},
                {name: '活動'},
            ],
            canEdit: true,
        });
        expect(getSpy).toHaveBeenCalledWith('/posts/81.json', {signal});
    });

    it('編輯資料缺少 raw 時回報明確錯誤', async () => {
        getSpy.mockResolvedValue({
            data: {id: 81, topic_id: 31, can_edit: true},
        });

        await expect(fetchHarborPostForEdit(81)).rejects.toThrow(
            'Invalid Harbor editable post response: missing raw',
        );
    });

    it('單帖回應未提供 Topic tags 時保留 unknown 狀態', async () => {
        getSpy.mockResolvedValue({
            data: {
                id: 81,
                raw: '原始 Markdown',
                topic_id: 31,
                post_number: 1,
                can_edit: true,
            },
        });

        await expect(fetchHarborPostForEdit(81)).resolves.toMatchObject({
            tags: null,
        });
    });

    it('先更新貼文 raw，再更新首帖 metadata', async () => {
        const signal = {aborted: false};
        putSpy
            .mockResolvedValueOnce({data: {post: {id: 81}}})
            .mockResolvedValueOnce({data: {basic_topic: {id: 31}}});

        await expect(
            updateHarborPost(81, {
                raw: '更新後內文',
                originalText: '更新前內文',
                topicId: 31,
                title: '更新後標題',
                originalTitle: '更新前標題',
                categoryId: 5,
                tags: [
                    {id: 7, name: '校園'},
                    {name: '新標籤'},
                ],
                originalTags: ['校園'],
                signal,
            }),
        ).resolves.toEqual({post: {id: 81}});

        expect(putSpy).toHaveBeenNthCalledWith(
            1,
            '/posts/81.json',
            {
                post: {
                    raw: '更新後內文',
                    original_text: '更新前內文',
                },
            },
            {signal},
        );
        expect(putSpy).toHaveBeenNthCalledWith(
            2,
            '/t/31.json',
            {
                title: '更新後標題',
                original_title: '更新前標題',
                category_id: 5,
                tags: [
                    {id: 7, name: '校園'},
                    {name: '新標籤'},
                ],
                original_tags: [{name: '校園'}],
            },
            {signal},
        );
    });

    it('Topic metadata 更新失敗時標記貼文 raw 已成功更新', async () => {
        const topicError = new Error('Topic update failed');
        putSpy
            .mockResolvedValueOnce({data: {post: {id: 81}}})
            .mockRejectedValueOnce(topicError);

        await expect(
            updateHarborPost(81, {
                raw: '更新後內文',
                originalText: '更新前內文',
                topicId: 31,
                title: '更新後標題',
            }),
        ).rejects.toMatchObject({
            harborPostUpdated: true,
            harborUpdatedPost: {post: {id: 81}},
        });
    });

    it('只編輯回覆內容時不發送 Topic metadata 請求', async () => {
        putSpy.mockResolvedValue({data: {post: {id: 82}}});

        await updateHarborPost(82, {
            raw: '更新後回覆',
            originalText: '更新前回覆',
        });

        expect(putSpy).toHaveBeenCalledTimes(1);
        expect(putSpy).toHaveBeenCalledWith(
            '/posts/82.json',
            {
                post: {
                    raw: '更新後回覆',
                    original_text: '更新前回覆',
                },
            },
            {signal: undefined},
        );
    });

    it('更新 metadata 時要求有效 Topic id', async () => {
        await expect(
            updateHarborPost(81, {
                raw: '更新後內文',
                originalText: '更新前內文',
                title: '更新後標題',
            }),
        ).rejects.toThrow('Invalid Harbor topic id');
        expect(putSpy).not.toHaveBeenCalled();
    });

    it.each([
        [
            {
                raw: '',
                originalText: '更新前內文',
            },
            'Invalid Harbor post raw',
        ],
        [
            {
                raw: '更新後內文',
                originalText: '',
            },
            'Invalid Harbor original post raw',
        ],
        [
            {
                raw: '更新後內文',
                originalText: '更新前內文',
                topicId: 31,
                tags: [{name: ''}],
            },
            'Invalid Harbor topic tags',
        ],
    ])('拒絕無效的編輯參數 %#', async (params, message) => {
        await expect(updateHarborPost(81, params)).rejects.toThrow(message);
        expect(putSpy).not.toHaveBeenCalled();
    });
});
