jest.mock('../storageKits', () => ({
    getLocalStorage: jest.fn(),
    setLocalStorage: jest.fn(),
}));

import { DEFAULT_FREQUENT_FEATURE_KEYS } from '../featureRecentUsage';
import { getLocalStorage, setLocalStorage } from '../storageKits';
import {
    CUSTOM_FREQUENT_FEATURES_STORAGE_KEY,
    addCustomFrequentFeatureKey,
    getCustomFrequentFeatureKeys,
    removeCustomFrequentFeatureKey,
    reorderCustomFrequentFeatureKeys,
    resolveCustomFrequentFeatures,
    sanitizeCustomFrequentKeys,
    saveCustomFrequentFeatureKeys,
} from '../customFrequentFeatures';

describe('服務頁自訂常用服務', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        getLocalStorage.mockResolvedValue(null);
        setLocalStorage.mockResolvedValue('ok');
    });

    it('未設定過自訂清單時回傳預設常用服務', async () => {
        getLocalStorage.mockResolvedValue(null);

        await expect(getCustomFrequentFeatureKeys()).resolves.toEqual(
            DEFAULT_FREQUENT_FEATURE_KEYS,
        );
        expect(getLocalStorage).toHaveBeenCalledWith(
            CUSTOM_FREQUENT_FEATURES_STORAGE_KEY,
        );
    });

    it('使用者主動清空清單時保留空陣列，不回退為預設值', async () => {
        getLocalStorage.mockResolvedValue([]);

        await expect(getCustomFrequentFeatureKeys()).resolves.toEqual([]);
    });

    it('讀取與儲存時會清理無效與重複鍵值', async () => {
        getLocalStorage.mockResolvedValue([
            ' 校園巴士 ',
            '',
            '車位',
            '校園巴士',
            null,
            123,
        ]);

        await expect(getCustomFrequentFeatureKeys()).resolves.toEqual([
            '校園巴士',
            '車位',
        ]);

        await expect(
            saveCustomFrequentFeatureKeys([' 車位 ', '校園巴士', '車位', ' ']),
        ).resolves.toEqual(['車位', '校園巴士']);
        expect(setLocalStorage).toHaveBeenCalledWith(
            CUSTOM_FREQUENT_FEATURES_STORAGE_KEY,
            ['車位', '校園巴士'],
        );
    });

    it('新增、移除與拖拽排序皆維持不可變且去重', () => {
        expect(addCustomFrequentFeatureKey(['校園巴士'], '車位')).toEqual([
            '校園巴士',
            '車位',
        ]);
        expect(addCustomFrequentFeatureKey(['校園巴士', '車位'], '車位')).toEqual([
            '校園巴士',
            '車位',
        ]);
        expect(removeCustomFrequentFeatureKey(['校園巴士', '車位'], '校園巴士')).toEqual([
            '車位',
        ]);
        expect(
            reorderCustomFrequentFeatureKeys(['A', 'B', 'C', 'D'], 0, 2),
        ).toEqual(['B', 'C', 'A', 'D']);
        expect(
            reorderCustomFrequentFeatureKeys(['A', 'B', 'C', 'D'], 3, 1),
        ).toEqual(['A', 'D', 'B', 'C']);
        expect(
            reorderCustomFrequentFeatureKeys(['A', 'B'], 0, 5),
        ).toEqual(['A', 'B']);
    });

    it('解析服務項目時跳過不存在的鍵值', () => {
        const featureByKey = new Map([
            ['校園巴士', { key_name: '校園巴士', fn_name: '校園巴士' }],
            ['車位', { key_name: '車位', fn_name: '車位' }],
        ]);

        expect(
            resolveCustomFrequentFeatures(featureByKey, ['車位', '已下架服務', '校園巴士']).map(
                item => item.key_name,
            ),
        ).toEqual(['車位', '校園巴士']);
        expect(sanitizeCustomFrequentKeys(null)).toEqual([]);
    });
});
