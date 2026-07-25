import lodash from 'lodash';

/**
 * 修復剪貼簿常見的 UTF-16 位元組序錯亂。
 *
 * ISW／部分瀏覽器複製時會得到 UTF-16LE，若被當成 UTF-16BE 解讀，
 * 「Time」會變成「吀椀洀攀」（每個字元的高位元組才是真正的 ASCII）。
 *
 * @param {string} text 可能含亂碼的原始文字
 * @returns {string} 嘗試修復後的文字；不像亂碼則原樣返回
 */
const fixUtf16EndianMojibake = text => {
    const sampleLen = Math.min(text.length, 60);
    if (sampleLen === 0) {
        return text;
    }

    let swappedAsciiCount = 0;
    for (let i = 0; i < sampleLen; i++) {
        const code = text.charCodeAt(i);
        const hi = code >> 8;
        const lo = code & 0xff;
        // 低位元組為 0、高位元組為可列印 ASCII → 典型位元組序錯亂
        if (lo === 0 && hi >= 0x20 && hi < 0x7f) {
            swappedAsciiCount++;
        }
    }

    // 抽樣超過 40% 才動手，避免誤傷正常中文課表說明
    if (swappedAsciiCount < sampleLen * 0.4) {
        return text;
    }

    let result = '';
    for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i);
        const hi = code >> 8;
        const lo = code & 0xff;

        if (lo === 0 && hi !== 0) {
            result += String.fromCharCode(hi);
        } else if (hi === 0) {
            result += String.fromCharCode(lo);
        } else {
            // 其餘 BMP 字元一併對調位元組
            result += String.fromCharCode((lo << 8) | hi);
        }
    }
    return result;
};

/**
 * 去掉 UTF-16LE 被當成 Latin-1 時夾雜的空位元組（T\\0i\\0m\\0e）。
 *
 * @param {string} text 原始文字
 * @returns {string} 去掉空位元組後的文字
 */
const stripInterleavedNullBytes = text => {
    if (text.length < 4 || text.indexOf('\0') === -1) {
        return text;
    }

    const sampleLen = Math.min(text.length, 40);
    let nullOnOdd = 0;
    for (let i = 1; i < sampleLen; i += 2) {
        if (text.charCodeAt(i) === 0) {
            nullOnOdd++;
        }
    }

    // 奇數位大量為 \\0 → 視為 UTF-16LE 被逐位元組讀入
    if (nullOnOdd < sampleLen / 4) {
        return text.replace(/\0/g, '');
    }

    let result = '';
    for (let i = 0; i < text.length; i += 2) {
        result += text.charAt(i);
    }
    return result;
};

/**
 * 正規化貼上／剪貼簿課表文字，修復常見編碼亂碼後再交給解析。
 *
 * @param {string} inputText 用戶貼上或剪貼簿讀取的文字
 * @returns {string} 正規化後的文字
 */
export const normalizeImportText = inputText => {
    if (typeof inputText !== 'string' || inputText.length === 0) {
        return typeof inputText === 'string' ? inputText : '';
    }

    let text = fixUtf16EndianMojibake(inputText);
    text = stripInterleavedNullBytes(text);
    return text;
};

/**
 * 解析從 UM ISW 複製的課表文字，取出 Course Code 與 Section。
 *
 * @param {string} inputText ISW 課表原始文字
 * @returns {Array<{'Course Code': string, Section: string}>|null} 解析結果；無法解析時回傳 null
 */
const parseImportData = inputText => {
    if (typeof inputText !== 'string') {
        return null;
    }

    const normalized = normalizeImportText(inputText);

    const matchRes = normalized.match(
        /[A-Z]{4}[0-9]{4}((\/[0-9]{4})+)?(\s)?(\([0-9]{3}\))/g,
    );

    if (!matchRes || matchRes.length === 0) {
        return null;
    }

    const parsed = matchRes.map(text => {
        // Section 部份左右括號的 index
        const lbIdx = text.indexOf('(');
        const rbIdx = text.indexOf(')');
        // 對於特殊的 GESB1001/1002/1003，記錄 / 從左到右第一次出現的 index，不存在 / 時返回 -1
        const slashIdx = text.indexOf('/');

        // 定位至 Course Code 後一位的 index
        // 例：GESB1001/1002，courseCodeBound = 8
        // 例：GEGA1000(001)，courseCodeBound = 8
        const courseCodeBound = slashIdx === -1 ? lbIdx : slashIdx;

        return {
            // 正則允許課號與 Section 之間有一個空白（ISW 實際輸出就有這種形式），
            // 不去掉尾隨空白會得到 'GEGA1000 '，永遠對不上課表資料而被靜默丟棄
            'Course Code': text.substring(0, courseCodeBound).trim(),
            Section: text.substring(lbIdx + 1, rbIdx),
        };
    });

    // 去重放在正規化之後：'GEGA1000(001)' 與 'GEGA1000 (001)' 原文不同但實為同一節
    return lodash.uniqBy(
        parsed,
        item => `${item['Course Code']}-${item.Section}`,
    );
};

export default parseImportData;
