import {
    LANE_COLUMN_COUNT,
    getCourseCardWidth,
    getLaneCount,
    groupCourseCardsByRow,
} from '../utils/courseGrid';

// 課名長度決定初始欄數：短（≤20）→ 2、中（≤36）→ 3、長 → 6
const short = code => ({ 'Course Code': code, 'Course Title': 'Short Title' });
const medium = code => ({ 'Course Code': code, 'Course Title': 'A Medium Length Course Title' });
const long = code => ({ 'Course Code': code, 'Course Title': 'A Very Long Course Title That Needs Full Width' });

const spansOf = rows => rows.map(row => row.map(entry => entry.span));

describe('課程卡片網格打包', () => {
    describe('單車道（手機）保持原有規則', () => {
        it('三張短課名各佔 1/3', () => {
            expect(spansOf(groupCourseCardsByRow([short('A1'), short('A2'), short('A3')]))).toEqual([[2, 2, 2]]);
        });

        it('單張升為全寬', () => {
            expect(spansOf(groupCourseCardsByRow([short('A1')]))).toEqual([[6]]);
            expect(spansOf(groupCourseCardsByRow([medium('A1')]))).toEqual([[6]]);
        });

        it('兩張升為各 1/2，不論原本是短或中', () => {
            expect(spansOf(groupCourseCardsByRow([short('A1'), short('A2')]))).toEqual([[3, 3]]);
            expect(spansOf(groupCourseCardsByRow([medium('A1'), short('A2')]))).toEqual([[3, 3]]);
            expect(spansOf(groupCourseCardsByRow([short('A1'), medium('A2')]))).toEqual([[3, 3]]);
        });

        it('放不下時換行，長課名獨佔一行', () => {
            expect(spansOf(groupCourseCardsByRow([short('A1'), short('A2'), medium('A3'), long('A4')]))).toEqual([
                [3, 3],
                [6],
                [6],
            ]);
        });
    });

    describe('多車道（寬屏）', () => {
        it('欄數隨車道倍增，一行可放更多卡片', () => {
            const list = Array.from({ length: 7 }, (_, index) => short(`A${index}`));
            const rows = groupCourseCardsByRow(list, LANE_COLUMN_COUNT * 2);
            expect(spansOf(rows)).toEqual([
                [2, 2, 2, 2, 2, 2],
                [6],
            ]);
        });

        it('剩餘欄位補給最窄的卡片，單張最多撐到一條車道寬', () => {
            const rows = groupCourseCardsByRow([short('A1'), long('A2')], LANE_COLUMN_COUNT * 3);
            expect(spansOf(rows)).toEqual([[6, 6]]);
        });

        it('補欄不會縮小長課名卡片', () => {
            const rows = groupCourseCardsByRow(
                [long('A1'), medium('A2'), medium('A3'), medium('A4'), short('A5')],
                LANE_COLUMN_COUNT * 3,
            );
            expect(spansOf(rows)).toEqual([[6, 3, 3, 3, 3]]);
        });
    });

    describe('車道數', () => {
        it('每 440px 一條，最少 1 條、最多 4 條', () => {
            expect(getLaneCount(320)).toBe(1);
            expect(getLaneCount(879)).toBe(1);
            expect(getLaneCount(880)).toBe(2);
            expect(getLaneCount(1650)).toBe(3);
            expect(getLaneCount(4000)).toBe(4);
        });
    });

    describe('像素寬度', () => {
        it('單車道等價於原本的三段式公式', () => {
            const width = 360;
            const gap = 10;
            expect(getCourseCardWidth(2, width, gap)).toBe(Math.floor((width - gap * 2) / 3));
            expect(getCourseCardWidth(3, width, gap)).toBe(Math.floor((width - gap) / 2));
            expect(getCourseCardWidth(6, width, gap)).toBe(width);
        });

        it('多車道時一整行卡片加間距剛好填滿可用寬度', () => {
            const width = 1000;
            const gap = 10;
            const columnCount = LANE_COLUMN_COUNT * 2;
            const cellsPerRow = columnCount / 2;
            const rowWidth = getCourseCardWidth(2, width, gap, columnCount) * cellsPerRow + gap * (cellsPerRow - 1);
            expect(rowWidth).toBeLessThanOrEqual(width);
            expect(rowWidth).toBeGreaterThan(width - cellsPerRow);
        });
    });
});
