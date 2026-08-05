import {
    clearTeamScheduleDataCache,
    clearTeamScheduleEventCache,
    ensureTeamScheduleCacheScope,
    getCachedSharedTimetables,
    getCachedTeamEventDetail,
    getCachedTeamEventSummary,
    loadCachedSharedTimetables,
    loadCachedTeamEventDetail,
    loadCachedTeamEventSummary,
    patchCachedTeamEventSummary,
    peekCachedTeamEventSummary,
    TEAM_EVENT_DETAIL_CACHE_TTL_MS,
    TEAM_EVENT_SUMMARY_CACHE_TTL_MS,
} from '../utils/teamScheduleDataCache';

describe('組隊資料 cache', () => {
    beforeEach(() => {
        ensureTeamScheduleCacheScope(null);
        clearTeamScheduleDataCache();
        jest.restoreAllMocks();
    });

    test('詳情與 summary 使用各自 TTL', async () => {
        let now = 1000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        const detailLoader = jest.fn().mockResolvedValue({event: {eventId: '1'}});
        const summaryLoader = jest.fn().mockResolvedValue({members: []});

        await loadCachedTeamEventDetail('1', detailLoader);
        await loadCachedTeamEventSummary('1', summaryLoader);

        now += TEAM_EVENT_SUMMARY_CACHE_TTL_MS;
        expect(getCachedTeamEventSummary('1')).toBeNull();
        expect(peekCachedTeamEventSummary('1')).not.toBeNull();
        expect(getCachedTeamEventDetail('1')).not.toBeNull();

        now = 1000 + TEAM_EVENT_DETAIL_CACHE_TTL_MS;
        expect(getCachedTeamEventDetail('1')).toBeNull();
    });

    test('同一資源的同時讀取只執行一次 loader', async () => {
        let resolveRequest;
        const loader = jest.fn(() =>
            new Promise(resolve => {
                resolveRequest = resolve;
            }),
        );

        const first = loadCachedSharedTimetables('event-a', loader);
        const second = loadCachedSharedTimetables('event-a', loader);
        await Promise.resolve();
        resolveRequest([{harborUserId: 1}]);

        const [firstEntry, secondEntry] = await Promise.all([first, second]);
        expect(loader).toHaveBeenCalledTimes(1);
        expect(firstEntry).toEqual(secondEntry);
    });

    test('force 略過新鮮 cache 並覆蓋資料', async () => {
        const loader = jest
            .fn()
            .mockResolvedValueOnce({members: [{harborUserId: 1}]})
            .mockResolvedValueOnce({members: [{harborUserId: 2}]});

        await loadCachedTeamEventSummary('1', loader);
        await loadCachedTeamEventSummary('1', loader);
        expect(loader).toHaveBeenCalledTimes(1);

        await loadCachedTeamEventSummary('1', loader, {force: true});
        expect(loader).toHaveBeenCalledTimes(2);
        expect(getCachedTeamEventSummary('1').value.members).toEqual([
            {harborUserId: 2},
        ]);
    });

    test('mutation patch 立即更新，單一活動清除不影響其他活動', async () => {
        await loadCachedTeamEventSummary('1', async () => ({members: []}));
        await loadCachedTeamEventSummary('2', async () => ({members: []}));
        await loadCachedSharedTimetables('1', async () => []);

        patchCachedTeamEventSummary('1', current => ({
            ...current,
            members: [{harborUserId: 7}],
        }));
        expect(getCachedTeamEventSummary('1').value.members).toEqual([
            {harborUserId: 7},
        ]);

        clearTeamScheduleEventCache('1');
        expect(getCachedTeamEventSummary('1')).toBeNull();
        expect(getCachedSharedTimetables('1')).toBeNull();
        expect(getCachedTeamEventSummary('2')).not.toBeNull();
    });

    test('清除後不接受較早開始的請求寫回', async () => {
        let resolveRequest;
        const request = loadCachedTeamEventSummary(
            '1',
            () => new Promise(resolve => {
                resolveRequest = resolve;
            }),
        );
        await Promise.resolve();

        clearTeamScheduleDataCache();
        resolveRequest({members: [{harborUserId: 9}]});
        await request;

        expect(peekCachedTeamEventSummary('1')).toBeNull();
    });

    test('mutation 後不接受較早開始的請求覆蓋', async () => {
        let resolveRequest;
        const request = loadCachedTeamEventSummary(
            '1',
            () => new Promise(resolve => {
                resolveRequest = resolve;
            }),
        );
        await Promise.resolve();

        patchCachedTeamEventSummary('1', {members: [{harborUserId: 2}]});
        resolveRequest({members: [{harborUserId: 1}]});
        await request;

        expect(peekCachedTeamEventSummary('1').value.members).toEqual([
            {harborUserId: 2},
        ]);
    });

    test('切換 Harbor 帳號時清除所有活動資料', async () => {
        ensureTeamScheduleCacheScope(101);
        await loadCachedTeamEventSummary('1', async () => ({members: []}));
        expect(peekCachedTeamEventSummary('1')).not.toBeNull();

        ensureTeamScheduleCacheScope(202);
        expect(peekCachedTeamEventSummary('1')).toBeNull();
    });
});
