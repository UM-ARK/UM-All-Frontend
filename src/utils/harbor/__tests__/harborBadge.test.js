let mockStoredBadgeState;

jest.mock('../../storageKits', () => ({
    getLocalStorage: jest.fn(async () => mockStoredBadgeState),
    setLocalStorage: jest.fn(async (_key, value) => {
        mockStoredBadgeState = value;
        return 'ok';
    }),
}));

import {
    acknowledgeHarborForumBadgeState,
    calculateHarborUnreadTotal,
    createHarborForumBadgeState,
    formatHarborTabBadge,
    getHarborForumBadgeCount,
    loadHarborForumBadgeState,
    saveHarborForumBadgeState,
    updateHarborForumBadgeState,
} from '../harborBadge';
import { getLocalStorage, setLocalStorage } from '../../storageKits';

describe('Harbor 論壇 Tab 角標', () => {
    beforeEach(() => {
        mockStoredBadgeState = undefined;
        getLocalStorage.mockClear();
        setLocalStorage.mockClear();
    });

    it('顯示新話題數量並將超過 99 的數量縮寫', () => {
        expect(formatHarborTabBadge(0)).toBeUndefined();
        expect(formatHarborTabBadge(8)).toBe(8);
        expect(formatHarborTabBadge(100)).toBe('99+');
    });

    it('將消息中心與 Chat 未讀合併為我的總角標', () => {
        expect(calculateHarborUnreadTotal(3, 2)).toBe(5);
        expect(calculateHarborUnreadTotal(undefined, 2)).toBe(2);
        expect(calculateHarborUnreadTotal(3, -1)).toBe(3);
    });

    it('首次升級時以目前最新內容建立基準而不顯示歷史角標', () => {
        const state = updateHarborForumBadgeState(
            createHarborForumBadgeState('ark-user'),
            'ark-user',
            {
                latestAt: '2026-07-31T08:00:00Z',
                topicCount: 8,
            },
        );

        expect(state.acknowledgedAt).toBe('2026-07-31T08:00:00.000Z');
        expect(getHarborForumBadgeCount(state, 'ark-user')).toBe(0);
    });

    it('只顯示上次進入論壇後新建立的話題數', () => {
        let state = updateHarborForumBadgeState(
            createHarborForumBadgeState('ark-user'),
            'ark-user',
            {
                latestAt: '2026-07-31T08:00:00Z',
                topicCount: 0,
            },
        );
        state = updateHarborForumBadgeState(state, 'ark-user', {
            latestAt: '2026-07-31T09:00:00Z',
            topicCount: 3,
        });

        expect(getHarborForumBadgeCount(state, 'ark-user')).toBe(3);

        state = acknowledgeHarborForumBadgeState(state, 'ark-user');
        state = updateHarborForumBadgeState(state, 'ark-user', {
            latestAt: '2026-07-31T09:00:00Z',
            topicCount: 3,
        });

        expect(getHarborForumBadgeCount(state, 'ark-user')).toBe(0);
        expect(state.acknowledgedAt).toBe('2026-07-31T09:00:00.000Z');

        state = updateHarborForumBadgeState(state, 'ark-user', {
            latestAt: '2026-07-31T10:00:00Z',
            topicCount: 1,
        });

        expect(getHarborForumBadgeCount(state, 'ark-user')).toBe(1);
    });

    it('請求完成前進入論壇時確認該次載入結果', () => {
        let state = acknowledgeHarborForumBadgeState(
            createHarborForumBadgeState('ark-user'),
            'ark-user',
        );
        state = updateHarborForumBadgeState(state, 'ark-user', {
            latestAt: '2026-07-31T08:00:00Z',
            topicCount: 4,
        });

        expect(getHarborForumBadgeCount(state, 'ark-user')).toBe(0);
    });

    it('切換帳號時不沿用上一個帳號的角標狀態', () => {
        const previousState = updateHarborForumBadgeState(
            createHarborForumBadgeState('ark-user'),
            'ark-user',
            {
                latestAt: '2026-07-31T08:00:00Z',
                topicCount: 0,
            },
        );
        const nextState = updateHarborForumBadgeState(
            previousState,
            'new-user',
            {
                latestAt: '2026-07-31T09:00:00Z',
                topicCount: 2,
            },
        );

        expect(getHarborForumBadgeCount(nextState, 'new-user')).toBe(0);
        expect(getHarborForumBadgeCount(nextState, 'ark-user')).toBe(0);
    });

    it('APP 重啟後恢復尚未進入論壇的角標', async () => {
        mockStoredBadgeState = {
            version: 2,
            accounts: [
                {
                    username: 'ARK-User',
                    acknowledgedAt: '2026-07-31T08:00:00Z',
                    latestObservedAt: '2026-07-31T09:00:00Z',
                    badgeCount: 3,
                },
            ],
        };

        const state = await loadHarborForumBadgeState('ark-user');

        expect(state).toEqual({
            username: 'ark-user',
            acknowledgedAt: '2026-07-31T08:00:00.000Z',
            latestObservedAt: '2026-07-31T09:00:00.000Z',
            badgeCount: 3,
            loaded: true,
            acknowledgePending: false,
        });
        expect(getHarborForumBadgeCount(state, 'ark-user')).toBe(3);
    });

    it('升級角標語意時保留確認游標但捨棄舊計數', async () => {
        mockStoredBadgeState = {
            version: 1,
            accounts: [
                {
                    username: 'ARK-User',
                    acknowledgedAt: '2026-07-31T08:00:00Z',
                    latestObservedAt: '2026-07-31T09:00:00Z',
                    badgeCount: 3,
                },
            ],
        };

        const state = await loadHarborForumBadgeState('ark-user');

        expect(state.acknowledgedAt).toBe('2026-07-31T08:00:00.000Z');
        expect(state.latestObservedAt).toBe('2026-07-31T09:00:00.000Z');
        expect(getHarborForumBadgeCount(state, 'ark-user')).toBe(0);
    });

    it('進入論壇後持久保存清零游標', async () => {
        mockStoredBadgeState = {
            version: 2,
            accounts: [
                {
                    username: 'ark-user',
                    acknowledgedAt: '2026-07-31T08:00:00Z',
                    latestObservedAt: '2026-07-31T09:00:00Z',
                    badgeCount: 3,
                },
            ],
        };
        const restoredState = await loadHarborForumBadgeState('ark-user');
        const acknowledgedState = acknowledgeHarborForumBadgeState(
            restoredState,
            'ark-user',
        );

        await saveHarborForumBadgeState(acknowledgedState);
        const reloadedState = await loadHarborForumBadgeState('ark-user');

        expect(reloadedState.acknowledgedAt).toBe(
            '2026-07-31T09:00:00.000Z',
        );
        expect(getHarborForumBadgeCount(reloadedState, 'ark-user')).toBe(0);
    });

    it('Storage 只保留最近三個帳號並覆寫同一帳號', async () => {
        mockStoredBadgeState = {
            version: 2,
            accounts: [
                {username: 'user-b', badgeCount: 2},
                {username: 'user-c', badgeCount: 3},
                {username: 'user-d', badgeCount: 4},
            ],
        };
        const state = {
            ...createHarborForumBadgeState('user-a'),
            acknowledgedAt: '2026-07-31T08:00:00Z',
            latestObservedAt: '2026-07-31T09:00:00Z',
            badgeCount: 5,
            loaded: true,
        };

        await saveHarborForumBadgeState(state);
        await saveHarborForumBadgeState({
            ...state,
            badgeCount: 6,
        });

        expect(setLocalStorage).toHaveBeenLastCalledWith(
            'ARK_Harbor_Forum_Badge_State',
            expect.objectContaining({
                version: 2,
                accounts: [
                    expect.objectContaining({
                        username: 'user-a',
                        badgeCount: 6,
                    }),
                    expect.objectContaining({username: 'user-b'}),
                    expect.objectContaining({username: 'user-c'}),
                ],
            }),
        );
    });
});
