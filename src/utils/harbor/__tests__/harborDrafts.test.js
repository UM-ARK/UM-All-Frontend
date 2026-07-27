let mockStorageValue;

jest.mock('../../storageKits', () => ({
    getLocalStorage: jest.fn(async () => mockStorageValue),
    setLocalStorage: jest.fn(async (_key, value) => {
        mockStorageValue = value;
        return 'ok';
    }),
}));

jest.mock('../harborApi', () => ({
    deleteHarborDraft: jest.fn(),
    fetchHarborDraft: jest.fn(),
    saveHarborDraft: jest.fn(),
}));

import {
    deleteHarborDraft,
    fetchHarborDraft,
    saveHarborDraft,
} from '../harborApi';
import {
    deleteHarborDraftAtLatestSequence,
    getHarborComposerDraftKey,
    getHarborDraftAccountId,
    getLocalHarborDraft,
    getLocalHarborDrafts,
    getPendingHarborDraftDeletes,
    loadHarborComposerDraft,
    markHarborDraftForDeletion,
    mergeHarborDrafts,
    normalizeHarborRemoteDraft,
    saveLocalHarborDraft,
    syncLocalHarborDraft,
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

    it('放棄草稿前先取得 Harbor 最新 sequence', async () => {
        fetchHarborDraft.mockResolvedValue({
            data: '{"reply":"遠端內容","action":"createTopic"}',
            sequence: 6,
        });
        deleteHarborDraft.mockResolvedValue();

        await expect(
            deleteHarborDraftAtLatestSequence('new_topic', 2),
        ).resolves.toBe(6);
        expect(deleteHarborDraft).toHaveBeenCalledWith(
            'new_topic',
            6,
        );
    });

    it('同一位置重新寫入內容時取消舊的待刪除標記', async () => {
        const accountId = 'id:7';
        await markHarborDraftForDeletion(
            accountId,
            'new_topic',
            2,
        );
        await saveLocalHarborDraft(accountId, {
            draftKey: 'new_topic',
            sequence: 2,
            mode: 'newTopic',
            data: {
                reply: '重新開始',
                action: 'createTopic',
            },
        });

        await expect(
            getPendingHarborDraftDeletes(accountId),
        ).resolves.toEqual([]);
    });

    it('待刪除草稿不恢復舊內容但保留最新 sequence', async () => {
        const accountId = 'id:7';
        await markHarborDraftForDeletion(
            accountId,
            'new_topic',
            2,
        );
        fetchHarborDraft.mockResolvedValue({
            data: JSON.stringify({
                reply: '已發布的舊內容',
                action: 'createTopic',
            }),
            sequence: 4,
        });

        await expect(
            loadHarborComposerDraft(accountId, 'new_topic'),
        ).resolves.toEqual({
            draftKey: 'new_topic',
            sequence: 4,
            pendingDeletion: true,
        });
    });

    it('正規化官方草稿 data 並保留發帖所需欄位', () => {
        expect(
            normalizeHarborRemoteDraft({
                draft_key: 'new_topic',
                sequence: 4,
                data: JSON.stringify({
                    reply: '正文',
                    action: 'createTopic',
                    title: '標題',
                    categoryId: 5,
                    tags: [{id: 7, name: '校園'}],
                }),
            }),
        ).toMatchObject({
            draftKey: 'new_topic',
            sequence: 4,
            mode: 'newTopic',
            data: {
                reply: '正文',
                action: 'createTopic',
                title: '標題',
                categoryId: 5,
                tags: [{id: 7, name: '校園'}],
            },
        });
    });

    it('遠端 sequence 較新時恢復遠端草稿', async () => {
        const accountId = 'id:7';
        await saveLocalHarborDraft(accountId, {
            draftKey: 'new_topic',
            sequence: 1,
            mode: 'newTopic',
            data: {
                reply: '舊內容',
                action: 'createTopic',
            },
            syncStatus: 'synced',
        });
        fetchHarborDraft.mockResolvedValue({
            data: JSON.stringify({
                reply: '新內容',
                action: 'createTopic',
            }),
            sequence: 2,
        });

        await expect(
            loadHarborComposerDraft(accountId, 'new_topic'),
        ).resolves.toMatchObject({
            sequence: 2,
            data: {reply: '新內容'},
        });
        await expect(
            getLocalHarborDraft(accountId, 'new_topic'),
        ).resolves.toMatchObject({
            sequence: 2,
            data: {reply: '新內容'},
        });
    });

    it('本機未同步內容優先於遠端草稿', async () => {
        const accountId = 'id:7';
        await saveLocalHarborDraft(accountId, {
            draftKey: 'new_topic',
            sequence: 1,
            mode: 'newTopic',
            data: {
                reply: '離線內容',
                action: 'createTopic',
            },
            syncStatus: 'offline',
        });
        fetchHarborDraft.mockResolvedValue({
            data: JSON.stringify({
                reply: '遠端內容',
                action: 'createTopic',
            }),
            sequence: 2,
        });

        await expect(
            loadHarborComposerDraft(accountId, 'new_topic'),
        ).resolves.toMatchObject({
            data: {reply: '離線內容'},
            syncStatus: 'offline',
        });
    });

    it('同步成功後保存 Harbor 回傳的最新 sequence', async () => {
        const accountId = 'id:7';
        const localDraft = await saveLocalHarborDraft(accountId, {
            draftKey: 'topic_31',
            sequence: 3,
            mode: 'reply',
            data: {
                reply: '回覆內容',
                action: 'reply',
            },
        });
        saveHarborDraft.mockResolvedValue({
            sequence: 4,
            conflictUser: null,
        });

        await expect(
            syncLocalHarborDraft(accountId, localDraft),
        ).resolves.toMatchObject({
            draft: {
                sequence: 4,
                syncStatus: 'synced',
            },
        });
        expect(saveHarborDraft).toHaveBeenCalledWith(
            'topic_31',
            {
                data: localDraft.data,
                sequence: 3,
                signal: undefined,
            },
        );
    });

    it('合併列表時保留本機衝突版本並隱藏待刪除草稿', () => {
        const drafts = mergeHarborDrafts(
            [
                {
                    draftKey: 'new_topic',
                    sequence: 2,
                    mode: 'newTopic',
                    data: {
                        reply: '本機內容',
                        action: 'createTopic',
                    },
                    syncStatus: 'conflict',
                },
            ],
            [
                {
                    draft_key: 'new_topic',
                    sequence: 3,
                    data: JSON.stringify({
                        reply: '遠端內容',
                        action: 'createTopic',
                    }),
                },
                {
                    draft_key: 'topic_31',
                    sequence: 1,
                    data: JSON.stringify({
                        reply: '待刪除',
                        action: 'reply',
                    }),
                },
            ],
            [{draftKey: 'topic_31', sequence: 1}],
        );

        expect(drafts).toHaveLength(1);
        expect(drafts[0]).toMatchObject({
            draftKey: 'new_topic',
            data: {reply: '本機內容'},
            syncStatus: 'conflict',
        });
    });
});
