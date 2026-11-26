import { DEFAULT_FREQUENT_FEATURE_KEYS } from './featureRecentUsage';
import { getLocalStorage, setLocalStorage } from './storageKits';

export const CUSTOM_FREQUENT_FEATURES_STORAGE_KEY = 'ARK_Features_Custom_Frequent';

const normalizeKeyName = keyName =>
    typeof keyName === 'string' ? keyName.trim() : '';

/**
 * 清理並去重自訂常用服務鍵值清單
 * @param {unknown} keys
 * @returns {string[]}
 */
export const sanitizeCustomFrequentKeys = keys => {
    if (!Array.isArray(keys)) {
        return [];
    }

    const seen = new Set();
    const result = [];
    keys.forEach(rawKey => {
        const key = normalizeKeyName(rawKey);
        if (!key || seen.has(key)) {
            return;
        }
        seen.add(key);
        result.push(key);
    });
    return result;
};

/**
 * 讀取使用者自訂的常用服務鍵值；若從未自訂過，則回傳預設常用清單
 * @returns {Promise<string[]>}
 */
export const getCustomFrequentFeatureKeys = async () => {
    const stored = await getLocalStorage(CUSTOM_FREQUENT_FEATURES_STORAGE_KEY);
    if (stored === null || stored === undefined) {
        return [...DEFAULT_FREQUENT_FEATURE_KEYS];
    }
    return sanitizeCustomFrequentKeys(stored);
};

/**
 * 儲存使用者自訂的常用服務鍵值
 * @param {string[]} keys
 * @returns {Promise<string[]>}
 */
export const saveCustomFrequentFeatureKeys = async keys => {
    const sanitized = sanitizeCustomFrequentKeys(keys);
    await setLocalStorage(CUSTOM_FREQUENT_FEATURES_STORAGE_KEY, sanitized);
    return sanitized;
};

/**
 * 將指定服務加入自訂常用清單尾端（若已存在則維持原順序）
 */
export const addCustomFrequentFeatureKey = (currentKeys, keyName) => {
    const sanitized = sanitizeCustomFrequentKeys(currentKeys);
    const normalized = normalizeKeyName(keyName);
    if (!normalized || sanitized.includes(normalized)) {
        return sanitized;
    }
    return [...sanitized, normalized];
};

/**
 * 從自訂常用清單移除指定服務
 */
export const removeCustomFrequentFeatureKey = (currentKeys, keyName) => {
    const sanitized = sanitizeCustomFrequentKeys(currentKeys);
    const normalized = normalizeKeyName(keyName);
    if (!normalized) {
        return sanitized;
    }
    return sanitized.filter(key => key !== normalized);
};

/**
 * 調整自訂常用清單內指定項目的位置
 */
export const reorderCustomFrequentFeatureKeys = (currentKeys, fromIndex, toIndex) => {
    const sanitized = sanitizeCustomFrequentKeys(currentKeys);
    const count = sanitized.length;
    if (
        count <= 1 ||
        !Number.isInteger(fromIndex) ||
        !Number.isInteger(toIndex) ||
        fromIndex < 0 ||
        fromIndex >= count ||
        toIndex < 0 ||
        toIndex >= count ||
        fromIndex === toIndex
    ) {
        return sanitized;
    }

    const next = [...sanitized];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
};

/**
 * 依自訂鍵值順序解析出對應的服務項目陣列（忽略不存在或已下架的鍵值）
 * @param {Map<string, object>} featureByKey
 * @param {string[]} keys
 */
export const resolveCustomFrequentFeatures = (featureByKey, keys) => {
    if (!featureByKey || typeof featureByKey.get !== 'function') {
        return [];
    }

    const result = [];
    sanitizeCustomFrequentKeys(keys).forEach(key => {
        const item = featureByKey.get(key);
        if (item) {
            result.push(item);
        }
    });
    return result;
};
