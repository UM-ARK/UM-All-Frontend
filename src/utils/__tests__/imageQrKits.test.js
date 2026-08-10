import {
    getImageQrDisplayHost,
    getImageQrHttpUrl,
    normalizeImageQrResults,
} from '../imageQrKits';

describe('imageQrKits', () => {
    test('清理、去重並按圖片位置排列掃碼結果', () => {
        const results = normalizeImageQrResults([
            {
                data: 'https://bottom.example/path',
                cornerPoints: [{x: 20, y: 80}, {x: 50, y: 80}],
            },
            {
                data: ' https://top-right.example ',
                cornerPoints: [{x: 120, y: 10}, {x: 150, y: 10}],
            },
            {
                data: 'https://top-left.example',
                bounds: {origin: {x: 10, y: 10}},
            },
            {data: 'https://bottom.example/path'},
            {data: '   '},
        ]);

        expect(results.map(result => result.data)).toEqual([
            'https://top-left.example',
            'https://top-right.example',
            'https://bottom.example/path',
        ]);
    });

    test('只允許 HTTP(S) 連結', () => {
        expect(getImageQrHttpUrl(' https://um.edu.mo/path ')).toBe(
            'https://um.edu.mo/path',
        );
        expect(getImageQrHttpUrl('http://um.edu.mo')).toBe('http://um.edu.mo');
        expect(getImageQrHttpUrl('one.umall://app/test')).toBeNull();
        expect(getImageQrHttpUrl('java' + 'script:alert(1)')).toBeNull();
        expect(getImageQrHttpUrl('普通文字')).toBeNull();
    });

    test('只為安全網頁連結提供顯示域名', () => {
        expect(getImageQrDisplayHost('https://www.um.edu.mo/path')).toBe(
            'www.um.edu.mo',
        );
        expect(getImageQrDisplayHost('WIFI:S:UM;P:12345678;;')).toBeNull();
    });
});
