jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

import {getLocalStorage, setLocalStorage} from '../storageKits';
import {
    DEFAULT_FREQUENT_FEATURE_KEYS,
    FEATURE_RECENT_USAGE_LIMIT,
    FEATURE_RECENT_USAGE_STORAGE_KEY,
    FREQUENT_FEATURES_DISPLAY_LIMIT,
    buildFrequentFeatures,
    getFeatureRecentUsage,
    recordFeatureUsage,
    sanitizeFeatureRecentUsage,
} from '../featureRecentUsage';

describe('服務頁常用功能紀錄', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getLocalStorage.mockResolvedValue([]);
        setLocalStorage.mockResolvedValue('ok');
    });

    it('清理無效、重複及未排序的使用紀錄', async () => {
        getLocalStorage.mockResolvedValue([
            {keyName: ' 校曆 ', usedAt: 10},
            {keyName: '校園巴士', usedAt: 30},
            {keyName: '校園巴士', usedAt: 5},
            {keyName: ' ', usedAt: 50},
            {keyName: '圖書館', usedAt: 'invalid'},
            null,
            new Error('broken data'),
        ]);

        await expect(getFeatureRecentUsage()).resolves.toEqual([
            {keyName: '校園巴士', usedAt: 30},
            {keyName: '校曆', usedAt: 10},
            {keyName: '圖書館', usedAt: 0},
        ]);
        expect(getLocalStorage).toHaveBeenCalledWith(
            FEATURE_RECENT_USAGE_STORAGE_KEY,
        );
    });

    it('記錄使用時去重並置頂', async () => {
        getLocalStorage.mockResolvedValue([
            {keyName: '校曆', usedAt: 10},
            {keyName: '圖書館', usedAt: 5},
        ]);
        jest.spyOn(Date, 'now').mockReturnValue(100);

        await expect(recordFeatureUsage(' 校曆 ')).resolves.toEqual([
            {keyName: '校曆', usedAt: 100},
            {keyName: '圖書館', usedAt: 5},
        ]);
        expect(setLocalStorage).toHaveBeenCalledWith(
            FEATURE_RECENT_USAGE_STORAGE_KEY,
            [
                {keyName: '校曆', usedAt: 100},
                {keyName: '圖書館', usedAt: 5},
            ],
        );
        Date.now.mockRestore();
    });

    it('最多保留上限筆數', async () => {
        const history = Array.from(
            {length: FEATURE_RECENT_USAGE_LIMIT + 2},
            (_, index) => ({
                keyName: `功能${index}`,
                usedAt: index,
            }),
        );
        getLocalStorage.mockResolvedValue(history);
        jest.spyOn(Date, 'now').mockReturnValue(999);

        const nextHistory = await recordFeatureUsage('新功能');
        expect(nextHistory).toHaveLength(FEATURE_RECENT_USAGE_LIMIT);
        expect(nextHistory[0]).toEqual({keyName: '新功能', usedAt: 999});
        Date.now.mockRestore();
    });

    it('合併最近使用與預設高頻入口並去重', () => {
        const featureByKey = new Map(
            [
                '校園巴士',
                '校曆',
                '圖書館',
                '打印餘額',
                '失物認領',
                '課表模擬',
                '選咩課',
                '飯堂排隊',
                '車位',
            ].map(keyName => [keyName, {key_name: keyName, fn_name: keyName}]),
        );

        const result = buildFrequentFeatures(
            featureByKey,
            [
                {keyName: '車位', usedAt: 50},
                {keyName: '校曆', usedAt: 40},
            ],
            FREQUENT_FEATURES_DISPLAY_LIMIT,
        );

        expect(result.map(item => item.key_name)).toEqual([
            '車位',
            '校曆',
            '校園巴士',
            '圖書館',
            '打印餘額',
            '失物認領',
            '課表模擬',
            '選咩課',
        ]);
        expect(result).toHaveLength(FREQUENT_FEATURES_DISPLAY_LIMIT);
    });

    it('sanitize 對非陣列回傳空陣列', () => {
        expect(sanitizeFeatureRecentUsage(null)).toEqual([]);
        expect(sanitizeFeatureRecentUsage({})).toEqual([]);
    });

    it('預設高頻入口數量符合顯示上限', () => {
        expect(DEFAULT_FREQUENT_FEATURE_KEYS).toHaveLength(
            FREQUENT_FEATURES_DISPLAY_LIMIT,
        );
    });
});
