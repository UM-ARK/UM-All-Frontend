jest.mock('expo/virtual/env', () => ({env: {}}));

import {Linking} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {getUmehOpenPref, UMEH_PRIMARY_HOST} from '../umehHost';
import {openLink} from '../browser';

jest.mock('expo-web-browser', () => ({
    openBrowserAsync: jest.fn(() => Promise.resolve()),
    WebBrowserPresentationStyle: {
        FULL_SCREEN: 'FULL_SCREEN',
        PAGE_SHEET: 'PAGE_SHEET',
    },
}));

jest.mock('../umehHost', () => ({
    UMEH_PRIMARY_HOST: 'https://umeh.top',
    UMEH_BACKUP_HOST: 'https://cf.umeh.top',
    isUmehUrl: url =>
        typeof url === 'string' &&
        (url.startsWith('https://umeh.top') ||
            url.startsWith('https://cf.umeh.top')),
    getUmehOpenPref: jest.fn(),
}));

jest.mock('../browserPackage', () => ({
    getBestBrowserPackage: jest.fn(),
}));

jest.mock('../../components/ThemeContext', () => ({
    themes: {
        light: {white: '#fff', themeColor: '#4796d6'},
        dark: {white: '#000', themeColor: '#4a9cde'},
    },
}));

describe('選咩課跳轉方式', () => {
    const url = `${UMEH_PRIMARY_HOST}/course/CISG1001`;

    beforeEach(() => {
        jest.clearAllMocks();
        Linking.openURL = jest.fn(() => Promise.resolve());
    });

    it('系統瀏覽器使用 Linking', async () => {
        getUmehOpenPref.mockResolvedValue('system');

        await openLink(url);

        expect(Linking.openURL).toHaveBeenCalledWith(url);
        expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
    });

    it('內頁瀏覽使用 WebBrowser', async () => {
        getUmehOpenPref.mockResolvedValue('inApp');

        await openLink(url);

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalled();
        expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('非選咩課連結不受此偏好影響', async () => {
        getUmehOpenPref.mockResolvedValue('system');

        await openLink('https://um.edu.mo');

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalled();
        expect(Linking.openURL).not.toHaveBeenCalled();
    });
});
