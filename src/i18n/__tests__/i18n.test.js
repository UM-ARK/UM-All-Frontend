const mockGetLocalStorage = jest.fn().mockResolvedValue('tc');
const mockSetLocalStorageSilently = jest.fn().mockResolvedValue('ok');

jest.mock('../../utils/storageKits', () => ({
    getLocalStorage: mockGetLocalStorage,
    setLocalStorageSilently: mockSetLocalStorageSilently,
}));

jest.mock('react-native-localize', () => ({
    getLocales: () => [{languageCode: 'en'}],
}));

const waitForInitialization = i18n => {
    if (i18n.isInitialized) {
        return Promise.resolve();
    }

    return new Promise(resolve => {
        const handleInitialized = () => {
            i18n.off('initialized', handleInitialized);
            resolve();
        };
        i18n.on('initialized', handleInitialized);
    });
};

describe('i18n', () => {
    let i18n;

    beforeAll(async () => {
        i18n = require('../i18n').default;
        await waitForInitialization(i18n);
    });

    test('優先使用已儲存的語言偏好', () => {
        expect(mockGetLocalStorage).toHaveBeenCalledWith('language');
        expect(i18n.language).toBe('tc');
        expect(i18n.resolvedLanguage).toBe('tc');
        expect(i18n.options.supportedLngs).toEqual(expect.arrayContaining(['tc', 'en']));
    });

    test('支援 count 插值與含冒號的時間 key', async () => {
        await i18n.changeLanguage('en');

        expect(i18n.t('{{count}} 個話題', {ns: 'harbor', count: 2})).toBe('2 topics');
        expect(i18n.t('M月D日 HH:mm', {ns: 'my', nsSeparator: false})).toBe('MMM D HH:mm');
    });

    test('切換語言後由 detector 儲存偏好', async () => {
        mockSetLocalStorageSilently.mockClear();
        await i18n.changeLanguage('en');

        expect(i18n.language).toBe('en');
        expect(i18n.resolvedLanguage).toBe('en');
        expect(mockSetLocalStorageSilently).toHaveBeenCalledWith('language', 'en');
    });

    test('不支援的語言會回退至繁體中文', async () => {
        await i18n.changeLanguage('fr');

        expect(i18n.language).toBe('tc');
        expect(i18n.resolvedLanguage).toBe('tc');
        expect(i18n.t('common:ABOUT')).toBe('關於');
    });
});
