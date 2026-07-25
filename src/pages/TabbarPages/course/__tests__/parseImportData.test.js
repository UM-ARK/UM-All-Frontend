import parseImportData, {normalizeImportText} from '../utils/parseImportData';

describe('normalizeImportText', () => {
    const toUtf16EndianMojibake = text =>
        [...text].map(ch => String.fromCharCode(ch.charCodeAt(0) << 8)).join('');

    it('修復 UTF-16 位元組序錯亂的課表文字', () => {
        const garbled = toUtf16EndianMojibake(
            'TimeDay LAWS4002(101) PORT2013(004)',
        );
        expect(normalizeImportText(garbled)).toBe(
            'TimeDay LAWS4002(101) PORT2013(004)',
        );
    });

    it('正常文字不做改動', () => {
        const plain = 'LAWS4002(101) 中文說明';
        expect(normalizeImportText(plain)).toBe(plain);
    });

    it('去掉夾雜的空位元組', () => {
        const padded = [...'LAWS4002(101)'].join('\0');
        expect(normalizeImportText(padded)).toBe('LAWS4002(101)');
    });
});

describe('parseImportData', () => {
    it('非字串或無法匹配時回傳 null', () => {
        expect(parseImportData(null)).toBeNull();
        expect(parseImportData(undefined)).toBeNull();
        expect(parseImportData(123)).toBeNull();
        expect(parseImportData('')).toBeNull();
        expect(parseImportData('這裡沒有任何課號')).toBeNull();
    });

    it('解析一般課號與 Section', () => {
        expect(parseImportData('ECEN1000(001) CISC1000(002)')).toEqual([
            {'Course Code': 'ECEN1000', Section: '001'},
            {'Course Code': 'CISC1000', Section: '002'},
        ]);
    });

    it('課號與 Section 之間有空白時不留尾隨空白', () => {
        expect(parseImportData('GEGA1000 (001)')).toEqual([
            {'Course Code': 'GEGA1000', Section: '001'},
        ]);
    });

    it('解析 GESB1001/1002 這類合開課號，只取第一段', () => {
        expect(parseImportData('GESB1001/1002/1003(004)')).toEqual([
            {'Course Code': 'GESB1001', Section: '004'},
        ]);
    });

    it('同一節課的不同書寫形式視為重複', () => {
        expect(parseImportData('GEGA1000(001) GEGA1000 (001)')).toEqual([
            {'Course Code': 'GEGA1000', Section: '001'},
        ]);
    });

    it('同課號不同 Section 不去重', () => {
        expect(parseImportData('ECEN1000(001) ECEN1000(002)')).toEqual([
            {'Course Code': 'ECEN1000', Section: '001'},
            {'Course Code': 'ECEN1000', Section: '002'},
        ]);
    });

    it('可從夾雜其他文字的 ISW 課表中取出課號', () => {
        const isw = `
            Course Code Course Title Section
            ECEN1000 (001) Introduction 001 MON 09:00 - 10:50
            CISC2000(002) Data Structures 002 TUE 14:00 - 15:50
        `;
        expect(parseImportData(isw)).toEqual([
            {'Course Code': 'ECEN1000', Section: '001'},
            {'Course Code': 'CISC2000', Section: '002'},
        ]);
    });

    it('亂碼課表仍可解析出課號', () => {
        const toUtf16EndianMojibake = text =>
            [...text]
                .map(ch => String.fromCharCode(ch.charCodeAt(0) << 8))
                .join('');
        const garbled = toUtf16EndianMojibake(
            '09:00-11:45 LAWS4002(101)\n10:00-11:15 PORT2013(004)',
        );
        expect(parseImportData(garbled)).toEqual([
            {'Course Code': 'LAWS4002', Section: '101'},
            {'Course Code': 'PORT2013', Section: '004'},
        ]);
    });
});
