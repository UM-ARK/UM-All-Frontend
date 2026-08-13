import {
    fetchHarborQueryCache,
    patchHarborQueryCache,
    patchHarborQueryCachePrefix,
    readHarborQueryCache,
    resetHarborQueryCache,
    setHarborQueryNamespaceLimit,
    writeHarborQueryCache,
} from '../harborQueryCache';

describe('Harbor query cache', () => {
    let now;

    beforeEach(() => {
        now = 1000;
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        resetHarborQueryCache();
    });

    afterEach(() => {
        resetHarborQueryCache();
        jest.restoreAllMocks();
    });

    it('fresh cache 命中時不執行 fetcher', async () => {
        const fetcher = jest.fn();
        writeHarborQueryCache(['topic', 7], {id: 7});

        await expect(
            fetchHarborQueryCache(['topic', 7], fetcher, {freshMs: 1000}),
        ).resolves.toEqual({id: 7});
        expect(fetcher).not.toHaveBeenCalled();
    });

    it('force 會繞過 fresh cache 並更新內容', async () => {
        const fetcher = jest.fn().mockResolvedValue({id: 7, title: '新版'});
        writeHarborQueryCache(['topic', 7], {id: 7, title: '舊版'});

        await expect(
            fetchHarborQueryCache(['topic', 7], fetcher, {
                force: true,
                freshMs: 1000,
            }),
        ).resolves.toEqual({id: 7, title: '新版'});
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(readHarborQueryCache(['topic', 7])).toEqual({
            id: 7,
            title: '新版',
        });
    });

    it('stale cache 仍可同步讀取並重新請求', async () => {
        const fetcher = jest.fn().mockResolvedValue({id: 7, title: '新版'});
        writeHarborQueryCache(['topic', 7], {id: 7, title: '舊版'});
        now += 2000;

        expect(readHarborQueryCache(['topic', 7])).toEqual({
            id: 7,
            title: '舊版',
        });
        await expect(
            fetchHarborQueryCache(['topic', 7], fetcher, {
                freshMs: 1000,
                staleMs: 5000,
            }),
        ).resolves.toEqual({id: 7, title: '新版'});
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('合併相同 key 的進行中請求', async () => {
        let resolveRequest;
        const fetcher = jest.fn(
            () => new Promise(resolve => {
                resolveRequest = resolve;
            }),
        );
        const first = fetchHarborQueryCache(['topic', 7], fetcher);
        const second = fetchHarborQueryCache(['topic', 7], fetcher);
        expect(first).toBe(second);
        await Promise.resolve();
        resolveRequest({id: 7});

        await expect(first).resolves.toEqual({id: 7});
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('請求失敗後會清理 in-flight 並允許重試', async () => {
        const fetcher = jest.fn()
            .mockRejectedValueOnce(new Error('network'))
            .mockResolvedValueOnce({id: 7});

        await expect(
            fetchHarborQueryCache(['topic', 7], fetcher),
        ).rejects.toThrow('network');
        await expect(
            fetchHarborQueryCache(['topic', 7], fetcher),
        ).resolves.toEqual({id: 7});
        expect(fetcher).toHaveBeenCalledTimes(2);
    });

    it('按 namespace limit 淘汰最久未使用項目', () => {
        setHarborQueryNamespaceLimit('topic', 2);
        writeHarborQueryCache(['topic', 1], {id: 1});
        writeHarborQueryCache(['topic', 2], {id: 2});
        readHarborQueryCache(['topic', 1]);
        writeHarborQueryCache(['topic', 3], {id: 3});

        expect(readHarborQueryCache(['topic', 1])).toEqual({id: 1});
        expect(readHarborQueryCache(['topic', 2])).toBeUndefined();
        expect(readHarborQueryCache(['topic', 3])).toEqual({id: 3});
    });

    it('patch 可保留原本 freshness 時間', async () => {
        const fetcher = jest.fn().mockResolvedValue({count: 3});
        writeHarborQueryCache(['profile', 'ark'], {count: 1});
        now += 900;
        patchHarborQueryCache(
            ['profile', 'ark'],
            value => ({...value, count: 2}),
            {preserveUpdatedAt: true},
        );
        now += 200;

        await fetchHarborQueryCache(['profile', 'ark'], fetcher, {
            freshMs: 1000,
        });
        expect(fetcher).toHaveBeenCalledTimes(1);
    });

    it('prefix patch 更新所有匹配項並返回數量', () => {
        writeHarborQueryCache(['topic-list', 'latest'], {count: 1});
        writeHarborQueryCache(['topic-list', 'top'], {count: 2});
        writeHarborQueryCache(['profile', 'ark'], {count: 3});

        expect(
            patchHarborQueryCachePrefix(
                ['topic-list'],
                value => ({...value, count: value.count + 1}),
                {preserveUpdatedAt: true},
            ),
        ).toBe(2);
        expect(readHarborQueryCache(['topic-list', 'latest'])).toEqual({
            count: 2,
        });
        expect(readHarborQueryCache(['topic-list', 'top'])).toEqual({
            count: 3,
        });
        expect(readHarborQueryCache(['profile', 'ark'])).toEqual({count: 3});
    });

    it('reset 後中止舊請求並防止結果回填', async () => {
        let resolveRequest;
        let requestSignal;
        const request = fetchHarborQueryCache(
            ['topic', 7],
            ({signal}) => {
                requestSignal = signal;
                return new Promise(resolve => {
                    resolveRequest = resolve;
                });
            },
        );
        await Promise.resolve();

        resetHarborQueryCache();
        expect(requestSignal.aborted).toBe(true);
        resolveRequest({id: 7});
        await expect(request).resolves.toEqual({id: 7});
        expect(readHarborQueryCache(['topic', 7])).toBeUndefined();
    });

    it('reset 後保留 namespace limit 設定', () => {
        setHarborQueryNamespaceLimit('topic', 1);
        resetHarborQueryCache();
        writeHarborQueryCache(['topic', 1], {id: 1});
        writeHarborQueryCache(['topic', 2], {id: 2});

        expect(readHarborQueryCache(['topic', 1])).toBeUndefined();
        expect(readHarborQueryCache(['topic', 2])).toEqual({id: 2});
    });
});
