let mockStorageValue;

jest.mock('../../storageKits', () => ({
    getLocalStorage: jest.fn(async () => mockStorageValue),
    setLocalStorage: jest.fn(async (_key, value) => {
        mockStorageValue = value;
        return 'ok';
    }),
}));

jest.mock('../harborDraftImages', () => ({
    deleteHarborDraftImageFiles: jest.fn(),
}));

import {deleteHarborDraftImageFiles} from '../harborDraftImages';
import {
    deleteHarborComposerDraft,
    getHarborComposerDraftKey,
    getHarborDraftAccountId,
    hasHarborEditDraftConflict,
    getLocalHarborDraft,
    getLocalHarborDrafts,
    loadHarborComposerDraft,
    saveLocalHarborDraft,
} from '../harborDrafts';

describe('Harbor 草稿', () => {
    beforeEach(() => {
        mockStorageValue = undefined;
        jest.clearAllMocks();
    });

    it('依 Harbor 帳號隔離本機草稿', async () => {
        const firstAccount = getHarborDraftAccountId({
            id: 7,
            username: 'first',
        });
        const secondAccount = getHarborDraftAccountId({
            id: 8,
            username: 'second',
        });
        const firstDraft = {
            draftKey: 'new_topic',
            sequence: 0,
            mode: 'newTopic',
            data: {
                reply: '第一個帳號',
                action: 'createTopic',
            },
        };
        const secondDraft = {
            ...firstDraft,
            data: {
                reply: '第二個帳號',
                action: 'createTopic',
            },
        };

        await saveLocalHarborDraft(firstAccount, firstDraft);
        await saveLocalHarborDraft(secondAccount, secondDraft);

        await expect(
            getLocalHarborDrafts(firstAccount),
        ).resolves.toMatchObject([
            {data: {reply: '第一個帳號'}},
        ]);
        await expect(
            getLocalHarborDrafts(secondAccount),
        ).resolves.toMatchObject([
            {data: {reply: '第二個帳號'}},
        ]);
    });

    it('建立與回覆使用 Discourse 官方 draft key', () => {
        expect(
            getHarborComposerDraftKey({mode: 'newTopic'}),
        ).toBe('new_topic');
        expect(
            getHarborComposerDraftKey({
                mode: 'reply',
                topicId: 31,
            }),
        ).toBe('topic_31');
        expect(
            getHarborComposerDraftKey({
                mode: 'edit',
                topicId: 31,
            }),
        ).toBe('topic_31');
    });

    it('編輯草稿基準與服務器正文不同時判定為衝突', () => {
        expect(
            hasHarborEditDraftConflict(
                {original_text: '圖片 A\n\n圖片 B'},
                '圖片 B\n\n圖片 A',
            ),
        ).toBe(true);
        expect(
            hasHarborEditDraftConflict(
                {original_text: '圖片 A\n\n圖片 B'},
                '圖片 A\n\n圖片 B',
            ),
        ).toBe(false);
        expect(
            hasHarborEditDraftConflict({}, '服務器正文'),
        ).toBe(false);
        expect(
            hasHarborEditDraftConflict(
                {
                    original_text: '正文',
                    original_title: '原標題',
                    original_category_id: 2,
                    original_tags: [{name: '校園'}],
                },
                '正文',
                {
                    title: 'Web 新標題',
                    categoryId: 2,
                    tags: [{name: '校園'}],
                },
            ),
        ).toBe(true);
    });

    it('載入草稿只讀本機，不同步遠端', async () => {
        const accountId = 'id:7';
        await saveLocalHarborDraft(accountId, {
            draftKey: 'new_topic',
            sequence: 1,
            mode: 'newTopic',
            data: {
                reply: '本機內容',
                action: 'createTopic',
            },
        });

        await expect(
            loadHarborComposerDraft(accountId, 'new_topic'),
        ).resolves.toMatchObject({
            data: {reply: '本機內容'},
            syncStatus: 'local',
            source: 'local',
        });
    });

    it('刪除草稿只清本機並清理圖片檔', async () => {
        const accountId = 'id:7';
        await saveLocalHarborDraft(accountId, {
            draftKey: 'new_topic',
            sequence: 1,
            mode: 'newTopic',
            data: {
                reply: '待刪內容',
                action: 'createTopic',
                appImages: [
                    {
                        id: 'img-1',
                        localUri:
                            'file:///document/harbor-draft-images/img-1.jpg',
                    },
                ],
            },
        });

        await expect(
            deleteHarborComposerDraft(accountId, 'new_topic'),
        ).resolves.toBe(true);
        await expect(
            getLocalHarborDraft(accountId, 'new_topic'),
        ).resolves.toBeNull();
        expect(deleteHarborDraftImageFiles).toHaveBeenCalledWith([
            {
                id: 'img-1',
                localUri:
                    'file:///document/harbor-draft-images/img-1.jpg',
            },
        ]);
    });

    it('儲存草稿時 syncStatus 固定為 local', async () => {
        const accountId = 'id:7';
        const draft = await saveLocalHarborDraft(accountId, {
            draftKey: 'topic_31',
            sequence: 3,
            mode: 'reply',
            data: {
                reply: '回覆內容',
                action: 'reply',
            },
            syncStatus: 'synced',
        });

        expect(draft).toMatchObject({
            syncStatus: 'local',
            source: 'local',
        });
    });
});
