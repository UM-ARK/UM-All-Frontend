import { filterUMOpenDataItemsBySearchQuery } from '../umOpenDataSearch';

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
});
