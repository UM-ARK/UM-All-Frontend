let mockStoredIntent;

jest.mock('../../storageKits', () => ({
    getLocalStorage: jest.fn(async () => mockStoredIntent),
    setLocalStorage: jest.fn(async (_key, value) => {
        mockStoredIntent = value;
        return 'ok';
    }),
}));

import {
    clearHarborLoginIntent,
    loadHarborLoginIntent,
    saveHarborLoginIntent,
} from '../harborLoginIntent';

describe('Harbor 登入意圖', () => {
    beforeEach(() => {
        mockStoredIntent = null;
        jest.spyOn(Date, 'now').mockReturnValue(1000);
    });

    afterEach(() => {
        Date.now.mockRestore();
    });

    it('保存並恢復登入前路由', async () => {
        await saveHarborLoginIntent({
            routeName: 'HarborTopicDetail',
            params: {topicId: 42, postNumber: 3},
        });

        await expect(loadHarborLoginIntent()).resolves.toEqual({
            routeName: 'HarborTopicDetail',
            params: {topicId: 42, postNumber: 3},
            createdAt: 1000,
        });
    });

    it('拒絕未知路由並清除逾時意圖', async () => {
        await expect(
            saveHarborLoginIntent({routeName: 'SettingPage'}),
        ).resolves.toBeNull();

        mockStoredIntent = {
            routeName: 'HarborComposer',
            params: {mode: 'newTopic'},
            createdAt: 1000,
        };
        Date.now.mockReturnValue(6 * 60 * 1000);

        await expect(loadHarborLoginIntent()).resolves.toBeNull();
        expect(mockStoredIntent).toBeNull();
    });

    it('完成或取消登入後可清除意圖', async () => {
        await saveHarborLoginIntent({
            routeName: 'Tabbar',
            params: {screen: 'MyTabbar'},
        });
        await clearHarborLoginIntent();

        expect(mockStoredIntent).toBeNull();
    });
});
