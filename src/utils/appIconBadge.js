import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// 只快取已允許；系統設定可能隨時由使用者重新開啟。
let badgePermissionGranted = null;

export function normalizeAppIconBadgeCount(count) {
    return Math.max(0, Math.floor(Number(count) || 0));
}

function isIosBadgeAllowed(settings) {
    const ios = settings?.ios;
    if (!ios) {
        return settings?.granted === true;
    }
    if (ios.status === Notifications.IosAuthorizationStatus.DENIED) {
        return false;
    }
    if (ios.status === Notifications.IosAuthorizationStatus.NOT_DETERMINED) {
        return null;
    }
    // 已授權時以 allowsBadge 為準（使用者可在系統設定單獨關閉角標）
    if (ios.allowsBadge === false) {
        return false;
    }
    return true;
}

function isAndroidBadgeAllowed(settings) {
    if (settings?.granted === true || settings?.status === 'granted') {
        return true;
    }
    if (settings?.status === 'denied' || settings?.canAskAgain === false) {
        return false;
    }
    return null;
}

function evaluateBadgePermission(settings) {
    return Platform.OS === 'ios'
        ? isIosBadgeAllowed(settings)
        : isAndroidBadgeAllowed(settings);
}

/**
 * 被動檢查主畫面 App 角標權限；首次通知權限只可由明確推送 CTA 請求。
 * @returns {Promise<boolean>}
 */
export async function ensureAppIconBadgePermission() {
    if (badgePermissionGranted === true) {
        return true;
    }

    try {
        const current = await Notifications.getPermissionsAsync();
        const currentAllowed = evaluateBadgePermission(current);
        if (currentAllowed === true) {
            badgePermissionGranted = true;
            return true;
        }
        if (currentAllowed === false) {
            return false;
        }

        return false;
    } catch {
        // 原生模組未就緒等暫時錯誤：不快取，下次再試
        return false;
    }
}

/**
 * 將未讀數寫入主畫面 App 圖示角標；0 會清除。
 * @returns {Promise<boolean>} 是否成功寫入
 */
export async function syncAppIconBadgeCount(count) {
    const normalized = normalizeAppIconBadgeCount(count);
    try {
        const allowed = await ensureAppIconBadgePermission();
        if (!allowed) {
            return false;
        }
        return Boolean(await Notifications.setBadgeCountAsync(normalized));
    } catch {
        return false;
    }
}

/** 僅供測試重設權限快取 */
export function resetAppIconBadgePermissionCacheForTests() {
    badgePermissionGranted = null;
}
