import {getLocalStorage, setLocalStorage} from './storageKits';

export const FEATURE_RECENT_USAGE_STORAGE_KEY = 'ARK_Features_Recent_Usage';
export const FEATURE_RECENT_USAGE_LIMIT = 20;
export const FREQUENT_FEATURES_DISPLAY_LIMIT = 8;

// 預設高頻入口（以 FeatureList key_name 為準）
export const DEFAULT_FREQUENT_FEATURE_KEYS = [
    '校園巴士',
    '校曆',
    '圖書館',
    '打印餘額',
    '失物認領',
    '課表模擬',
    '選咩課',
    '飯堂排隊',
];

const normalizeTimestamp = usedAt =>
    Number.isFinite(usedAt) && usedAt >= 0 ? usedAt : 0;

const normalizeKeyName = keyName =>
    typeof keyName === 'string' ? keyName.trim() : '';

const normalizeRecord = record => {
    if (!record || typeof record !== 'object') {
        return null;
    }

    const keyName = normalizeKeyName(record.keyName);
    if (!keyName) {
        return null;
    }

    return {
        keyName,
        usedAt: normalizeTimestamp(record.usedAt),
    };
};

export const sanitizeFeatureRecentUsage = history => {
    if (!Array.isArray(history)) {
        return [];
    }

    const normalizedHistory = history
        .map((record, index) => {
            const normalizedRecord = normalizeRecord(record);
            return normalizedRecord
                ? {
                      record: normalizedRecord,
                      index,
                  }
                : null;
        })
        .filter(Boolean)
        .sort(
            (first, second) =>
                second.record.usedAt - first.record.usedAt ||
                first.index - second.index,
        );
    const seenKeys = new Set();

    return normalizedHistory
        .filter(({record}) => {
            if (seenKeys.has(record.keyName)) {
                return false;
            }

            seenKeys.add(record.keyName);
            return true;
        })
        .slice(0, FEATURE_RECENT_USAGE_LIMIT)
        .map(({record}) => record);
};

export const getFeatureRecentUsage = async () => {
    const history = await getLocalStorage(FEATURE_RECENT_USAGE_STORAGE_KEY);
    return sanitizeFeatureRecentUsage(history);
};

export const recordFeatureUsage = async keyName => {
    const normalizedKeyName = normalizeKeyName(keyName);
    if (!normalizedKeyName) {
        return getFeatureRecentUsage();
    }

    const history = await getFeatureRecentUsage();
    const nextHistory = [
        {
            keyName: normalizedKeyName,
            usedAt: Date.now(),
        },
        ...history.filter(record => record.keyName !== normalizedKeyName),
    ].slice(0, FEATURE_RECENT_USAGE_LIMIT);

    await setLocalStorage(FEATURE_RECENT_USAGE_STORAGE_KEY, nextHistory);
    return nextHistory;
};

/**
 * 合併最近使用與預設高頻入口，去重後回傳功能項目陣列
 * @param {Map<string, object>} featureByKey key_name → feature item
 * @param {Array<{keyName: string, usedAt: number}>} usageRecords
 * @param {number} [limit]
 */
export const buildFrequentFeatures = (
    featureByKey,
    usageRecords,
    limit = FREQUENT_FEATURES_DISPLAY_LIMIT,
) => {
    if (!featureByKey || typeof featureByKey.get !== 'function') {
        return [];
    }

    const result = [];
    const seenKeys = new Set();
    const pushByKey = keyName => {
        const normalizedKey = normalizeKeyName(keyName);
        if (!normalizedKey || seenKeys.has(normalizedKey)) {
            return;
        }

        const item = featureByKey.get(normalizedKey);
        if (!item) {
            return;
        }

        seenKeys.add(normalizedKey);
        result.push(item);
    };

    const sanitizedUsage = sanitizeFeatureRecentUsage(usageRecords);
    sanitizedUsage.forEach(record => pushByKey(record.keyName));
    DEFAULT_FREQUENT_FEATURE_KEYS.forEach(pushByKey);

    return result.slice(0, limit);
};
