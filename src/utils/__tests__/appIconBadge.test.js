jest.mock('react-native', () => ({
    Platform: {
        OS: 'ios',
    },
}));

const mockGetPermissionsAsync = jest.fn();
const mockRequestPermissionsAsync = jest.fn();
const mockSetBadgeCountAsync = jest.fn();

jest.mock('expo-notifications', () => ({
    IosAuthorizationStatus: {
        NOT_DETERMINED: 0,
        DENIED: 1,
        AUTHORIZED: 2,
        PROVISIONAL: 3,
        EPHEMERAL: 4,
    },
    getPermissionsAsync: (...args) => mockGetPermissionsAsync(...args),
    requestPermissionsAsync: (...args) => mockRequestPermissionsAsync(...args),
    setBadgeCountAsync: (...args) => mockSetBadgeCountAsync(...args),
}));

describe('appIconBadge', () => {
    beforeEach(() => {
        jest.resetModules();
        mockGetPermissionsAsync.mockReset();
        mockRequestPermissionsAsync.mockReset();
        mockSetBadgeCountAsync.mockReset();
    });

    it('normalizeAppIconBadgeCount 會正規化為非負整數', () => {
        const {
            normalizeAppIconBadgeCount,
        } = require('../appIconBadge');
        expect(normalizeAppIconBadgeCount(3.7)).toBe(3);
        expect(normalizeAppIconBadgeCount(-2)).toBe(0);
        expect(normalizeAppIconBadgeCount('12')).toBe(12);
        expect(normalizeAppIconBadgeCount(null)).toBe(0);
    });

    it('已允許 allowBadge 時會寫入系統角標', async () => {
        mockGetPermissionsAsync.mockResolvedValue({
            granted: true,
            ios: {
                status: 2,
                allowsBadge: true,
            },
        });
        mockSetBadgeCountAsync.mockResolvedValue(true);

        const {
            syncAppIconBadgeCount,
            resetAppIconBadgePermissionCacheForTests,
        } = require('../appIconBadge');
        resetAppIconBadgePermissionCacheForTests();

        await expect(syncAppIconBadgeCount(5)).resolves.toBe(true);
        expect(mockRequestPermissionsAsync).not.toHaveBeenCalled();
        expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(5);
    });

    it('尚未決定權限時會請求 allowBadge 再寫入', async () => {
        mockGetPermissionsAsync.mockResolvedValue({
            ios: {
                status: 0,
                allowsBadge: null,
            },
        });
        mockRequestPermissionsAsync.mockResolvedValue({
            granted: true,
            ios: {
                status: 2,
                allowsBadge: true,
            },
        });
        mockSetBadgeCountAsync.mockResolvedValue(true);

        const {
            syncAppIconBadgeCount,
            resetAppIconBadgePermissionCacheForTests,
        } = require('../appIconBadge');
        resetAppIconBadgePermissionCacheForTests();

        await expect(syncAppIconBadgeCount(2)).resolves.toBe(true);
        expect(mockRequestPermissionsAsync).toHaveBeenCalledWith({
            ios: {
                allowAlert: false,
                allowBadge: true,
                allowSound: false,
            },
        });
        expect(mockSetBadgeCountAsync).toHaveBeenCalledWith(2);
    });

    it('權限被拒時不寫入角標', async () => {
        mockGetPermissionsAsync.mockResolvedValue({
            ios: {
                status: 1,
                allowsBadge: false,
            },
        });

        const {
            syncAppIconBadgeCount,
            resetAppIconBadgePermissionCacheForTests,
        } = require('../appIconBadge');
        resetAppIconBadgePermissionCacheForTests();

        await expect(syncAppIconBadgeCount(4)).resolves.toBe(false);
        expect(mockSetBadgeCountAsync).not.toHaveBeenCalled();
    });
});
