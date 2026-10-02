jest.mock('expo/virtual/env', () => ({env: {}}));

import {Linking} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import {openLink} from '../browser';
import {WHAT_2_REG} from '../pathMap';

jest.mock('expo-web-browser', () => ({
    openBrowserAsync: jest.fn(() => Promise.resolve()),
    WebBrowserPresentationStyle: {
        FULL_SCREEN: 'FULL_SCREEN',
        PAGE_SHEET: 'PAGE_SHEET',
    },
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

// 選咩課連結統一補上的來源標記
const UMEH_UTM = 'utm_source=umall&utm_medium=app&utm_campaign=inapp_browser';

describe('選咩課連結內頁瀏覽與 UTM', () => {
    const url = `${WHAT_2_REG}/course/CISG1001`;

    beforeEach(() => {
        jest.clearAllMocks();
        Linking.openURL = jest.fn(() => Promise.resolve());
    });

    it('選咩課連結一律用內頁瀏覽，不經系統瀏覽器', async () => {
        await openLink(url);

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalled();
        expect(Linking.openURL).not.toHaveBeenCalled();
    });

    it('選咩課連結補上 UTM', async () => {
        await openLink(url);

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
            `${url}?${UMEH_UTM}`,
            expect.anything(),
        );
    });

    it('已有查詢參數時以 & 接上 UTM', async () => {
        await openLink(`${WHAT_2_REG}/search/course/MATH?lang=tc`);

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
            `${WHAT_2_REG}/search/course/MATH?lang=tc&${UMEH_UTM}`,
            expect.anything(),
        );
    });

    it('UTM 插在 hash 之前', async () => {
        await openLink(`${WHAT_2_REG}/reviews/CISG1001/CHAN#comment`);

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
            `${WHAT_2_REG}/reviews/CISG1001/CHAN?${UMEH_UTM}#comment`,
            expect.anything(),
        );
    });

    it('已帶 utm_source 時不重複補上', async () => {
        const withUtm = `${WHAT_2_REG}/course/CISG1001?utm_source=share`;

        await openLink(withUtm);

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
            withUtm,
            expect.anything(),
        );
    });

    it('物件形式的選咩課連結也補上 UTM', async () => {
        await openLink({URL: WHAT_2_REG, mode: undefined});

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
            `${WHAT_2_REG}?${UMEH_UTM}`,
            expect.anything(),
        );
    });

    it('選咩課連結預設全螢幕', async () => {
        await openLink(url);

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
            expect.any(String),
            expect.objectContaining({presentationStyle: 'FULL_SCREEN'}),
        );
    });

    it('非選咩課連結不加 UTM', async () => {
        await openLink('https://um.edu.mo');

        expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
            'https://um.edu.mo',
            expect.anything(),
        );
    });
});
