import 'intl-pluralrules';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';

import EN_US from './en-us';
import ZH_HK from './zh-hk';
import { getLocalStorage, setLocalStorageSilently } from '../utils/storageKits';

// 參考 IETF 語言標籤
// https://en.wikipedia.org/wiki/IETF_language_tag
// 目前沿用 tc，以保持舊版儲存值與現有語言判斷相容
const resources = {
    en: EN_US,
    tc: ZH_HK,
};
const SUPPORTED_LANGUAGES = ['tc', 'en'];


// 簡單的語言映射邏輯
// 1. 獲取手機系統語言
const locales = RNLocalize.getLocales();
const systemLanguageCode = locales[0]?.languageCode; // e.g., 'en', 'zh', 'ja', 'pt'

// 2. 定義默認語言邏輯
let defaultLanguage = 'en'; // 默認兜底為英文

if (systemLanguageCode === 'zh') {
    // 只有當系統語言是中文時，才進一步判斷
    // 您目前的 resources 只有 'tc' (繁體) 和 'en'，
    // 所以無論是用戶是簡體還是繁體，如果想默認顯示中文，就設為 'tc'
    // (如果未來加了簡體 'sc'，可以在這裡細分)
    defaultLanguage = 'tc';
}


// 語言檢測插件，用於存入緩存
const languageDetector = {
    type: 'languageDetector',
    async: true,
    detect: async (callback) => {
        try {
            const storedLanguage = await getLocalStorage('language');
            // 如果有用戶設置，用設置的；否則用系統的
            const selectLanguage = SUPPORTED_LANGUAGES.includes(storedLanguage) ? storedLanguage : defaultLanguage;
            callback(selectLanguage);
        } catch (error) {
            console.log('Error reading language', error);
            callback(defaultLanguage);
        }
    },
    init: () => { },
    cacheUserLanguage: (language) => {
        if (SUPPORTED_LANGUAGES.includes(language)) {
            setLocalStorageSilently('language', language);
        }
    },
};

i18n
    .use(languageDetector) // 使用自定義的檢測器
    .use(initReactI18next)
    .init({
        resources,
        fallbackLng: 'tc',
        supportedLngs: SUPPORTED_LANGUAGES,
        interpolation: {
            escapeValue: false, // React 已經默認防 XSS
        },
        react: {
            useSuspense: false, // 避免在加載時白屏
        },
        defaultNS: 'common',
        fallbackNS: ['home', 'about', 'wiki', 'harbor', 'my', 'catalog', 'timetable', 'features', 'club', 'setting'],
        nsSeparator: ':',
        keySeparator: false,
    });

// 用法：
// import { useTranslation } from 'react-i18next';
// 組件內 const { t, i18n } = useTranslation(['common', 'about']);  // 第一個 namespace 為預設，其他 namespace 需明確指定
// 需要翻譯的地方使用 t('key')
// 這裡的 key 需要對應 resources 內多語言的 key，t函數會返回該key的value

// 修改語言
// i18n.changeLanguage('tc');

export default i18n;
