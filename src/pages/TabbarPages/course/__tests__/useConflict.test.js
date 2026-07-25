import {
    findConflictPairs,
    getSectionConflicts,
    getSlotKey,
    isSlotOverlap,
    parseTimeToMinutes,
} from '../hooks/useConflict';

/**
 * 建立測試用課節
 *
 * @param {string} courseCode 課程代碼
 * @param {string} section Section
 * @param {string} day 星期
 * @param {string} timeFrom 開始時間
 * @param {string} timeTo 結束時間
 * @returns {Object} 課節物件
 */
const makeSlot = (courseCode, section, day, timeFrom, timeTo) => ({
    'Course Code': courseCode,
    Section: section,
    Day: day,
    'Time From': timeFrom,
    'Time To': timeTo,
});

describe('parseTimeToMinutes', () => {
    it('解析 HH:mm 與 HH:mm:ss', () => {
        expect(parseTimeToMinutes('09:00')).toBe(540);
        expect(parseTimeToMinutes('11:30:00')).toBe(690);
        expect(parseTimeToMinutes('00:00')).toBe(0);
        expect(parseTimeToMinutes('23:59')).toBe(1439);
    });

    it('非法輸入回傳 null', () => {
        expect(parseTimeToMinutes('')).toBeNull();
        expect(parseTimeToMinutes('abc')).toBeNull();
        expect(parseTimeToMinutes('25:00')).toBeNull();
        expect(parseTimeToMinutes('09:60')).toBeNull();
        expect(parseTimeToMinutes('0900')).toBeNull();
        expect(parseTimeToMinutes(null)).toBeNull();
        expect(parseTimeToMinutes(undefined)).toBeNull();
        expect(parseTimeToMinutes(900)).toBeNull();
    });
});

describe('isSlotOverlap', () => {
    it('不同天永不重疊', () => {
        const monSlot = makeSlot('ACCT1000', '001', 'MON', '09:00', '12:00');
        const tueSlot = makeSlot('CISC1000', '001', 'TUE', '10:00', '11:00');

        expect(isSlotOverlap(monSlot, tueSlot)).toBe(false);
    });

    it('前後相接不算重疊', () => {
        const first = makeSlot('ACCT1000', '001', 'MON', '09:00', '10:00');
        const second = makeSlot('CISC1000', '001', 'MON', '10:00', '11:00');

        expect(isSlotOverlap(first, second)).toBe(false);
        expect(isSlotOverlap(second, first)).toBe(false);
    });

    it('部分重疊算衝突', () => {
        const first = makeSlot('ACCT1000', '001', 'MON', '09:00', '10:30');
        const second = makeSlot('CISC1000', '001', 'MON', '10:00', '11:00');

        expect(isSlotOverlap(first, second)).toBe(true);
        expect(isSlotOverlap(second, first)).toBe(true);
    });

    it('完全包含算衝突', () => {
        const outer = makeSlot('ACCT1000', '001', 'MON', '09:00', '12:00');
        const inner = makeSlot('CISC1000', '001', 'MON', '10:00', '11:00');

        expect(isSlotOverlap(outer, inner)).toBe(true);
        expect(isSlotOverlap(inner, outer)).toBe(true);
    });

    it('時間非法或缺少 Day 時視為不衝突', () => {
        const valid = makeSlot('ACCT1000', '001', 'MON', '09:00', '12:00');

        expect(isSlotOverlap(valid, makeSlot('X', '001', 'MON', '?', '?'))).toBe(
            false,
        );
        expect(isSlotOverlap(valid, makeSlot('X', '001', null, '10:00', '11:00'))).toBe(
            false,
        );
        expect(
            isSlotOverlap(
                makeSlot('X', '001', undefined, '10:00', '11:00'),
                makeSlot('Y', '001', undefined, '10:30', '11:30'),
            ),
        ).toBe(false);
        expect(isSlotOverlap(valid, null)).toBe(false);
    });
});

describe('findConflictPairs', () => {
    it('偵測跨越式重疊（舊版只比相鄰課節會漏掉）', () => {
        const a = makeSlot('AAAA1000', '001', 'MON', '09:00', '12:00');
        const b = makeSlot('BBBB1000', '001', 'MON', '10:00', '11:00');
        const c = makeSlot('CCCC1000', '001', 'MON', '11:30', '12:30');

        const pairs = findConflictPairs([a, b, c]);

        expect(pairs).toHaveLength(2);
        expect(pairs).toEqual(
            expect.arrayContaining([
                { a, b },
                { a, b: c },
            ]),
        );
        // B 與 C 相隔 30 分鐘，不算衝突
        expect(
            pairs.some(
                pair =>
                    (pair.a === b && pair.b === c) ||
                    (pair.a === c && pair.b === b),
            ),
        ).toBe(false);
    });

    it('完全包含也會被找出', () => {
        const outer = makeSlot('AAAA1000', '001', 'TUE', '09:00', '12:00');
        const inner = makeSlot('BBBB1000', '001', 'TUE', '10:00', '11:00');

        expect(findConflictPairs([outer, inner])).toEqual([
            { a: outer, b: inner },
        ]);
    });

    it('不同天與相接課節不算衝突', () => {
        const slots = [
            makeSlot('AAAA1000', '001', 'MON', '09:00', '10:00'),
            makeSlot('BBBB1000', '001', 'MON', '10:00', '11:00'),
            makeSlot('CCCC1000', '001', 'TUE', '09:30', '10:30'),
        ];

        expect(findConflictPairs(slots)).toEqual([]);
    });

    it('輸入不足兩筆或非陣列時回傳空陣列', () => {
        expect(findConflictPairs([])).toEqual([]);
        expect(
            findConflictPairs([makeSlot('AAAA1000', '001', 'MON', '09:00', '10:00')]),
        ).toEqual([]);
        expect(findConflictPairs(null)).toEqual([]);
    });
});

describe('getSlotKey', () => {
    it('相同課節產生相同鍵，不同課節產生不同鍵', () => {
        const slot = makeSlot('ACCT1000', '001', 'TUE', '11:30', '12:45');

        expect(getSlotKey(slot)).toBe('TUE-ACCT1000-001-11:30-12:45');
        expect(getSlotKey({ ...slot })).toBe(getSlotKey(slot));
        expect(getSlotKey(makeSlot('ACCT1000', '002', 'TUE', '11:30', '12:45'))).not.toBe(
            getSlotKey(slot),
        );
        expect(getSlotKey(null)).toBe('');
    });
});

describe('getSectionConflicts', () => {
    const planSlots = [
        makeSlot('AAAA1000', '001', 'MON', '09:00', '12:00'),
        makeSlot('BBBB1000', '002', 'TUE', '14:00', '15:00'),
    ];

    it('回報撞到的既有課節', () => {
        const candidateSlots = [
            makeSlot('CCCC1000', '001', 'MON', '11:00', '13:00'),
        ];

        expect(getSectionConflicts(candidateSlots, planSlots)).toEqual([
            {
                day: 'MON',
                courseCode: 'AAAA1000',
                section: '001',
                timeFrom: '09:00',
                timeTo: '12:00',
            },
        ]);
    });

    it('排除自我比對（同 Course Code + Section）', () => {
        const candidateSlots = [
            makeSlot('AAAA1000', '001', 'MON', '09:00', '12:00'),
        ];

        expect(getSectionConflicts(candidateSlots, planSlots)).toEqual([]);
    });

    it('同一課程不同 Section 仍視為衝突', () => {
        const candidateSlots = [
            makeSlot('AAAA1000', '002', 'MON', '10:00', '11:00'),
        ];

        expect(getSectionConflicts(candidateSlots, planSlots)).toHaveLength(1);
    });

    it('多個候選課節撞到同一既有課節時只回報一次', () => {
        const candidateSlots = [
            makeSlot('CCCC1000', '001', 'MON', '09:30', '10:00'),
            makeSlot('CCCC1000', '001', 'MON', '11:00', '11:30'),
        ];

        expect(getSectionConflicts(candidateSlots, planSlots)).toHaveLength(1);
    });

    it('沒有碰撞或輸入非陣列時回傳空陣列', () => {
        expect(
            getSectionConflicts(
                [makeSlot('CCCC1000', '001', 'WED', '09:00', '10:00')],
                planSlots,
            ),
        ).toEqual([]);
        expect(getSectionConflicts(null, planSlots)).toEqual([]);
        expect(getSectionConflicts([], null)).toEqual([]);
    });
});
