import { balanceColumns } from '../balanceColumns';

const weightOf = item => item.weight;

describe('balanceColumns', () => {
    it('單欄時保持原順序', () => {
        const items = [{ id: 'a', weight: 3 }, { id: 'b', weight: 1 }];
        expect(balanceColumns(items, 1, weightOf)).toEqual([items]);
    });

    it('每個區塊放進當前最矮的一欄，相同時取最左', () => {
        const items = [
            { id: 'a', weight: 4 },
            { id: 'b', weight: 3 },
            { id: 'c', weight: 3 },
            { id: 'd', weight: 2 },
        ];
        const columns = balanceColumns(items, 3, weightOf);
        expect(columns.map(column => column.map(item => item.id))).toEqual([
            ['a'],
            ['b', 'd'],
            ['c'],
        ]);
    });

    it('兩欄時前後區塊交錯補齊', () => {
        const items = [
            { id: 'a', weight: 5 },
            { id: 'b', weight: 2 },
            { id: 'c', weight: 2 },
            { id: 'd', weight: 2 },
        ];
        const columns = balanceColumns(items, 2, weightOf);
        expect(columns.map(column => column.map(item => item.id))).toEqual([
            ['a'],
            ['b', 'c', 'd'],
        ]);
    });

    it('欄數與空輸入的邊界', () => {
        expect(balanceColumns([], 3, weightOf)).toEqual([[], [], []]);
        expect(balanceColumns([{ id: 'a', weight: 1 }], 0, weightOf)).toEqual([[{ id: 'a', weight: 1 }]]);
    });
});
