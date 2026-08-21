jest.mock('../../storageKits', () => ({
    getLocalStorage: jest.fn(),
    removeLocalStorageItems: jest.fn(),
    setLocalStorageSilently: jest.fn(),
}));

import {
    getLocalStorage,
    removeLocalStorageItems,
    setLocalStorageSilently,
} from '../../storageKits';
import {
    HARBOR_CHAT_DRAFT_STORAGE_KEY_PREFIX,
    getLocalHarborChatDraft,
    saveLocalHarborChatDraft,
} from '../harborChatDrafts';

const STORAGE_KEY = `${HARBOR_CHAT_DRAFT_STORAGE_KEY_PREFIX}:id%3A7:12`;

describe('harborChatDrafts', () => {
    beforeEach(() => {
        getLocalStorage.mockReset();
        removeLocalStorageItems.mockReset();
        setLocalStorageSilently.mockReset();
        removeLocalStorageItems.mockResolvedValue('ok');
        setLocalStorageSilently.mockResolvedValue('ok');
    });

    it('按帳號及頻道讀取本機私信草稿', async () => {
        getLocalStorage.mockResolvedValue(' 仍未傳送 ');

        await expect(getLocalHarborChatDraft('id:7', 12)).resolves.toBe(
            ' 仍未傳送 ',
        );
        expect(getLocalStorage).toHaveBeenCalledWith(STORAGE_KEY);
    });

    it('保存原始輸入且不使用 Harbor 草稿箱 key', async () => {
        await expect(
            saveLocalHarborChatDraft('id:7', 12, '  保留空格  '),
        ).resolves.toBe('  保留空格  ');

        expect(setLocalStorageSilently).toHaveBeenCalledWith(
            STORAGE_KEY,
            '  保留空格  ',
        );
        expect(STORAGE_KEY).not.toBe('ARK_Harbor_Drafts_v1');
    });

    it('輸入清空後移除該頻道的本機草稿', async () => {
        await expect(
            saveLocalHarborChatDraft('id:7', 12, ''),
        ).resolves.toBe('');

        expect(removeLocalStorageItems).toHaveBeenCalledWith([STORAGE_KEY]);
        expect(setLocalStorageSilently).not.toHaveBeenCalled();
    });

    it('清空操作會等待較早的保存完成，避免舊草稿復活', async () => {
        let finishSave;
        setLocalStorageSilently.mockImplementation(
            () =>
                new Promise(resolve => {
                    finishSave = () => resolve('ok');
                }),
        );

        const saving = saveLocalHarborChatDraft('id:7', 12, '舊草稿');
        const clearing = saveLocalHarborChatDraft('id:7', 12, '');
        await Promise.resolve();

        expect(removeLocalStorageItems).not.toHaveBeenCalled();
        finishSave();
        await Promise.all([saving, clearing]);
        expect(removeLocalStorageItems).toHaveBeenCalledWith([STORAGE_KEY]);
    });

    it('無有效帳號或頻道時不讀取草稿', async () => {
        await expect(getLocalHarborChatDraft(null, 12)).resolves.toBe('');
        await expect(getLocalHarborChatDraft('id:7', 0)).resolves.toBe('');

        expect(getLocalStorage).not.toHaveBeenCalled();
    });
});
