import {
    buildTitleHighlightParts,
    filterUMOpenDataItemsBySearchQuery,
    pickDisplayedTitles,
} from '../umOpenDataSearch';

const items = [
    {
        id: 'traditional',
        details: [
            { locale: 'zh_TW', title: '澳門大學舉辦開學典禮' },
            { locale: 'en_US', title: 'UM Holds Convocation' },
        ],
    },
    {
        id: 'simplified',
        details: [
            { locale: 'zh_CN', title: '校园新闻发布会' },
            { locale: 'en_US', title: 'Campus News Conference' },
        ],
    },
];

describe('filterUMOpenDataItemsBySearchQuery', () => {
    it('以簡體關鍵字搜尋繁體標題', () => {
        expect(filterUMOpenDataItemsBySearchQuery(items, '澳门大学')).toEqual([
            items[0],
        ]);
    });

    it('以繁體關鍵字搜尋簡體標題', () => {
        expect(filterUMOpenDataItemsBySearchQuery(items, '校園新聞')).toEqual([
            items[1],
        ]);
    });

    it('搜尋英文時不分大小寫', () => {
        expect(filterUMOpenDataItemsBySearchQuery(items, 'cOnVoCaTiOn')).toEqual([
            items[0],
        ]);
    });

    it('搜尋所有 locale 的標題', () => {
        expect(filterUMOpenDataItemsBySearchQuery(items, 'conference')).toEqual([
            items[1],
        ]);
        expect(filterUMOpenDataItemsBySearchQuery(items, '典禮')).toEqual([
            items[0],
        ]);
    });

    it('無關鍵字時原樣回傳資料', () => {
        expect(filterUMOpenDataItemsBySearchQuery(items, '   ')).toBe(items);
        expect(filterUMOpenDataItemsBySearchQuery(null, '')).toEqual([]);
    });

    it('忽略沒有 details 的項目', () => {
        expect(filterUMOpenDataItemsBySearchQuery([
            null,
            { id: 'missing' },
            { id: 'null', details: null },
            items[0],
        ], '澳門')).toEqual([items[0]]);
    });

    it('同時比對中文、英文與葡文標題', () => {
        const multilingual = {
            id: 'multilingual',
            details: [
                { locale: 'zh_TW', title: '澳門大學開放日' },
                { locale: 'en_US', title: 'UM Open Day' },
                { locale: 'pt_PT', title: 'Dia Aberto da Universidade de Macau' },
            ],
        };

        expect(filterUMOpenDataItemsBySearchQuery(
            [items[0], multilingual],
            'Aberto',
        )).toEqual([multilingual]);
        expect(filterUMOpenDataItemsBySearchQuery(
            [items[0], multilingual],
            'Open Day',
        )).toEqual([multilingual]);
        expect(filterUMOpenDataItemsBySearchQuery(
            [items[0], multilingual],
            '開放日',
        )).toEqual([multilingual]);
    });
});

describe('buildTitleHighlightParts', () => {
    it('高亮標題中的連續關鍵字', () => {
        expect(buildTitleHighlightParts('廣州學院參觀澳大', '澳大')).toEqual([
            { text: '廣州學院參觀', highlight: false },
            { text: '澳大', highlight: true },
        ]);
    });

    it('簡體關鍵字高亮繁體標題，並保留英文大小寫', () => {
        expect(buildTitleHighlightParts('澳門大學', '澳门')).toEqual([
            { text: '澳門', highlight: true },
            { text: '大學', highlight: false },
        ]);
        expect(buildTitleHighlightParts('UM Holds Convocation', 'convocation')).toEqual([
            { text: 'UM Holds ', highlight: false },
            { text: 'Convocation', highlight: true },
        ]);
    });
});

describe('pickDisplayedTitles', () => {
    const details = [
        { locale: 'zh_TW', title: '澳門大學開放日' },
        { locale: 'en_US', title: 'UM Open Day' },
        { locale: 'pt_PT', title: 'Dia Aberto da Universidade de Macau' },
    ];

    it('介面語言標題已命中時不再附上其他語言', () => {
        expect(pickDisplayedTitles(details, 'tc', '開放日')).toEqual({
            title: '澳門大學開放日',
            alternateTitle: '',
        });
    });

    it('介面語言未命中時附上命中的英文或葡文標題', () => {
        expect(pickDisplayedTitles(details, 'tc', 'Aberto')).toEqual({
            title: '澳門大學開放日',
            alternateTitle: 'Dia Aberto da Universidade de Macau',
        });
        expect(pickDisplayedTitles(details, 'en', '開放日')).toEqual({
            title: 'UM Open Day',
            alternateTitle: '澳門大學開放日',
        });
    });
});
