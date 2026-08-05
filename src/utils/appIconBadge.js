import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

// null：尚未決定；true/false：本進程內快取結果，避免重複彈權限
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
 * 確保具備寫入主畫面 App 角標的權限（iOS 需 allowBadge）。
 * @returns {Promise<boolean>}
 */
export async function ensureAppIconBadgePermission() {
    if (badgePermissionGranted === true || badgePermissionGranted === false) {
        return badgePermissionGranted;
    }

    try {
        const current = await Notifications.getPermissionsAsync();
        const currentAllowed = evaluateBadgePermission(current);
        if (currentAllowed === true) {
            badgePermissionGranted = true;
            return true;
        }
        if (currentAllowed === false) {
            badgePermissionGranted = false;
            return false;
        }

        // 僅請求角標；之後若要推播再擴充 alert/sound
        const next = await Notifications.requestPermissionsAsync({
            ios: {
                allowAlert: false,
                allowBadge: true,
                allowSound: false,
            },
        });
        const nextAllowed = evaluateBadgePermission(next) === true;
        badgePermissionGranted = nextAllowed;
        return nextAllowed;
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
