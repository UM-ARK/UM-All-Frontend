import {Alert, Linking, Platform} from 'react-native';

jest.mock('expo/virtual/env', () => ({env: {}}));
import {
    getAppUpdateChannels,
    getAppUpdateHint,
    getAppUpdateSectionTitle,
    isHuaweiLikeDevice,
    openAppUpdateUrl,
    showAppStoreUpdateAlert,
} from '../appUpdateKits';
import {openLink} from '../browser';
import {
    APPSTORE_URL,
    ARK_APP_LINK,
    GITHUB_RELEASE_URL,
    PLAYSTORE_URL,
} from '../pathMap';

jest.mock('expo-application', () => ({
    nativeApplicationVersion: '26.8.0',
}));
jest.mock('expo-device', () => ({
    brand: 'google',
    manufacturer: 'Google',
    modelName: 'Pixel 8',
}));
jest.mock('../browser', () => ({
    openLink: jest.fn(() => Promise.resolve()),
}));
jest.mock('../trigger', () => ({
    trigger: jest.fn(),
}));

const originalOS = Platform.OS;

afterEach(() => {
    Platform.OS = originalOS;
    jest.clearAllMocks();
});

describe('isHuaweiLikeDevice', () => {
    it('辨識華為／榮耀／Harmony', () => {
        expect(isHuaweiLikeDevice({brand: 'HUAWEI'})).toBe(true);
        expect(isHuaweiLikeDevice({manufacturer: 'Honor'})).toBe(true);
        expect(isHuaweiLikeDevice({modelName: 'HarmonyOS Next'})).toBe(true);
        expect(isHuaweiLikeDevice({brand: 'samsung'})).toBe(false);
    });
});

describe('getAppUpdateChannels', () => {
    it('iOS 只提供 App Store', () => {
        expect(getAppUpdateChannels({platform: 'ios'})).toEqual([
            expect.objectContaining({url: APPSTORE_URL}),
        ]);
    });

    it('一般 Android 以 Play Store 為先', () => {
        const urls = getAppUpdateChannels({
            platform: 'android',
            huaweiLike: false,
        }).map(item => item.url);
        expect(urls).toEqual([PLAYSTORE_URL, ARK_APP_LINK, GITHUB_RELEASE_URL]);
    });

    it('華為裝置隱藏 Play Store 並以官網為先', () => {
        const urls = getAppUpdateChannels({
            platform: 'android',
            huaweiLike: true,
        }).map(item => item.url);
        expect(urls).toEqual([ARK_APP_LINK, GITHUB_RELEASE_URL]);
    });
});

describe('getAppUpdateHint / title', () => {
    it('iOS 不顯示提示', () => {
        expect(getAppUpdateHint({platform: 'ios'})).toBeNull();
        expect(getAppUpdateSectionTitle({platform: 'ios'})).toBe(
            '前往 App Store 更新',
        );
    });

    it('華為裝置提示改用官網 APK', () => {
        expect(
            getAppUpdateHint({platform: 'android', huaweiLike: true}),
        ).toContain('沒有 Google Play');
        expect(getAppUpdateSectionTitle({platform: 'android'})).toBe(
            '選擇安裝方式',
        );
    });
});

describe('openAppUpdateUrl', () => {
    beforeEach(() => {
        Linking.openURL = jest.fn(() => Promise.resolve());
        Alert.alert = jest.fn();
    });

    it('商店連結優先使用系統 Intent', async () => {
        await openAppUpdateUrl(PLAYSTORE_URL);
        expect(Linking.openURL).toHaveBeenCalledWith(PLAYSTORE_URL);
        expect(openLink).not.toHaveBeenCalled();
    });

    it('商店 Intent 失敗時改開官網下載頁', async () => {
        Platform.OS = 'android';
        Linking.openURL.mockRejectedValueOnce(new Error('no play store'));
        await openAppUpdateUrl(PLAYSTORE_URL);
        expect(openLink).toHaveBeenCalledWith(ARK_APP_LINK);
    });

    it('官網與 GitHub 走 openLink', async () => {
        await openAppUpdateUrl(ARK_APP_LINK);
        expect(Linking.openURL).not.toHaveBeenCalled();
        expect(openLink).toHaveBeenCalledWith(ARK_APP_LINK);
    });

    it('openLink 也失敗時提示手動開啟', async () => {
        Platform.OS = 'android';
        openLink.mockRejectedValueOnce(new Error('no browser'));
        await openAppUpdateUrl(ARK_APP_LINK);
        expect(Alert.alert).toHaveBeenCalledWith(
            '無法開啟連結',
            expect.stringContaining(ARK_APP_LINK),
        );
    });
});

describe('showAppStoreUpdateAlert', () => {
    it('Android 按 Yes 開啟官網 APK 頁', async () => {
        Platform.OS = 'android';
        Alert.alert = jest.fn();
        showAppStoreUpdateAlert({
            app_version: '26.8.5',
            version_info: 'fix',
        });
        const buttons = Alert.alert.mock.calls[0][2];
        const yes = buttons.find(button => button.text === 'Yes');
        await yes.onPress();
        expect(openLink).toHaveBeenCalledWith(ARK_APP_LINK);
    });
});
