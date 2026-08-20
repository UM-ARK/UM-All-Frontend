const mockValues = new Map();

jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(async key => mockValues.get(key)),
    setLocalStorageSilently: jest.fn(async (key, value) => {
        mockValues.set(key, value);
        return 'ok';
    }),
}));

import {
    createHarborPushAccountKey,
    loadHarborPushState,
    saveHarborPushState,
} from '../pushStorage';

describe('pushStorage', () => {
    beforeEach(() => {
        mockValues.clear();
        jest.clearAllMocks();
    });

    it('Harbor intent 以帳號及 installation 隔離', async () => {
        const installationId = '5d2b67a4-d4ca-4b8a-b409-466fcdab198d';
        const accountA = createHarborPushAccountKey(
            {id: 1, username: 'a'},
            installationId,
        );
        const accountB = createHarborPushAccountKey(
            {id: 2, username: 'b'},
            installationId,
        );

        await saveHarborPushState(accountA, {desiredEnabled: true});

        await expect(loadHarborPushState(accountA)).resolves.toMatchObject({
            desiredEnabled: true,
        });
        await expect(loadHarborPushState(accountB)).resolves.toMatchObject({
            desiredEnabled: false,
            pendingAction: null,
        });
    });

    it('不同帳號同時保存不會互相覆蓋', async () => {
        await Promise.all([
            saveHarborPushState('1:installation-id', {
                desiredEnabled: true,
            }),
            saveHarborPushState('2:installation-id', {
                desiredEnabled: false,
                dismissedPrompt: true,
            }),
        ]);

        await expect(
            loadHarborPushState('1:installation-id'),
        ).resolves.toMatchObject({desiredEnabled: true});
        await expect(
            loadHarborPushState('2:installation-id'),
        ).resolves.toMatchObject({dismissedPrompt: true});
    });
});
