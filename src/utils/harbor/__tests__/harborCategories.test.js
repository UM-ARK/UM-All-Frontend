import {
    buildHarborCategoryRows,
    getHarborCategoryKey,
} from '../harborCategories';

const categories = [
    {id: 4, name: '吹水台', parentCategoryId: null},
    {id: 5, name: '搵工賺錢', parentCategoryId: null},
    {id: 6, name: '正職', parentCategoryId: 5},
    {id: 7, name: '實習/兼職', parentCategoryId: 5},
];

describe('Harbor 分類樹', () => {
    it('預設展開所有子分類', () => {
        const rows = buildHarborCategoryRows(categories);

        expect(rows.map(item => item.id)).toEqual([4, 5, 6, 7]);
        expect(rows[1]).toEqual(
            expect.objectContaining({
                hasChildren: true,
                isExpanded: true,
                depth: 0,
            }),
        );
        expect(rows[2]).toEqual(
            expect.objectContaining({
                hasChildren: false,
                isExpanded: false,
                depth: 1,
            }),
        );
    });

    it('收起父分類時隱藏其子分類', () => {
        const rows = buildHarborCategoryRows(categories, new Set(['5']));

        expect(rows.map(item => item.id)).toEqual([4, 5]);
        expect(rows[1]).toEqual(
            expect.objectContaining({
                hasChildren: true,
                isExpanded: false,
            }),
        );
    });

    it('支援多層子分類並保留正確深度', () => {
        const rows = buildHarborCategoryRows([
            ...categories,
            {id: 8, name: '校內實習', parentCategoryId: 7},
        ]);

        expect(rows.map(item => item.id)).toEqual([4, 5, 6, 7, 8]);
        expect(rows[4]).toEqual(
            expect.objectContaining({
                depth: 2,
                parentLineStates: [false, false],
            }),
        );
    });

    it('父分類不在清單時將分類視為根分類', () => {
        const rows = buildHarborCategoryRows([
            {id: 9, name: '孤立分類', parentCategoryId: 99},
        ]);

        expect(rows).toEqual([
            expect.objectContaining({
                id: 9,
                depth: 0,
            }),
        ]);
    });

    it('以分類 id 或 slug 產生穩定 key', () => {
        expect(getHarborCategoryKey({id: 5, slug: 'job'})).toBe('5');
        expect(getHarborCategoryKey({slug: 'job'})).toBe('slug:job');
    });
});
