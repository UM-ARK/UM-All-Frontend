/**
 * scheduleGrid／scheduleRanges／scheduleRecommendations／scheduleDraft 測試
 */
import moment from 'moment-timezone';
import {
    buildWeekPages,
    getDisabledGapsForDay,
    getWeekDateKeys,
    getWeekStartDate,
    isSlotInsideCandidateWindows,
} from '../utils/scheduleGrid';
import {
    expandCandidateWindowsToSlots,
    expandWindowToSlots,
    mergeSlotsToCandidateWindows,
    mergeSlotsToRanges,
} from '../utils/scheduleRanges';
import {
    buildHeatmap,
    computeAvailabilityStats,
    suggestBestSlots,
} from '../utils/scheduleRecommendations';
import {
    applyDraftGesture,
    commitAvailabilityDraft,
    createAvailabilityDraftFromServer,
    createCandidateDraftFromWindows,
    resolveGestureMode,
    toggleDraftSlot,
} from '../utils/scheduleDraft';

const TZ = 'Asia/Macau';

/** 澳門本地牆鐘時間 → ISO */
function macauIso(localWall) {
    return moment.tz(localWall, 'YYYY-MM-DD HH:mm', TZ).toISOString();
}

describe('scheduleGrid 週模型', () => {
    test('固定週一至週日七欄', () => {
        // 2026-03-09 為週一
        const keys = getWeekDateKeys('2026-03-09', TZ);
        expect(keys).toHaveLength(7);
        expect(keys[0]).toBe('2026-03-09');
        expect(keys[6]).toBe('2026-03-15');
        expect(getWeekStartDate('2026-03-11', TZ)).toBe('2026-03-09');
        expect(getWeekStartDate('2026-03-15', TZ)).toBe('2026-03-09');
    });

    test('跨月、跨年、跨週分頁', () => {
        const pages = buildWeekPages({
            timezone: TZ,
            slotMinutes: 30,
            candidateWindows: [
                {
                    date: '2025-12-31',
                    startAt: macauIso('2025-12-31 10:00'),
                    endAt: macauIso('2025-12-31 11:00'),
                },
                {
                    date: '2026-01-01',
                    startAt: macauIso('2026-01-01 10:00'),
                    endAt: macauIso('2026-01-01 11:00'),
                },
                {
                    date: '2026-01-06',
                    startAt: macauIso('2026-01-06 10:00'),
                    endAt: macauIso('2026-01-06 11:00'),
                },
            ],
        });
        // 2025-12-31=週三、2026-01-01=週四 → 同一週；2026-01-06=週二 → 下一週
        expect(pages).toHaveLength(2);
        expect(pages[0].days).toHaveLength(7);
        expect(pages[0].weekStartDate).toBe('2025-12-29');
        expect(pages[0].weekEndDate).toBe('2026-01-04');
        expect(pages[1].weekStartDate).toBe('2026-01-05');
        // 無候選日仍保留欄位但 disabled
        const sunday = pages[0].days.find(day => day.date === '2026-01-04');
        expect(sunday.enabled).toBe(false);
        const nye = pages[0].days.find(day => day.date === '2025-12-31');
        expect(nye.enabled).toBe(true);
    });

    test('Asia/Macau 分組不受 process TZ 影響', () => {
        const previous = process.env.TZ;
        process.env.TZ = 'America/New_York';
        try {
            // UTC 2026-03-09 16:00 = 澳門 2026-03-10 00:00
            const pages = buildWeekPages({
                timezone: TZ,
                slotMinutes: 60,
                candidateWindows: [
                    {
                        startAt: '2026-03-09T16:00:00.000Z',
                        endAt: '2026-03-09T17:00:00.000Z',
                    },
                ],
            });
            expect(pages).toHaveLength(1);
            const day = pages[0].days.find(item => item.enabled);
            expect(day.date).toBe('2026-03-10');
        } finally {
            if (previous == null) {
                delete process.env.TZ;
            } else {
                process.env.TZ = previous;
            }
        }
    });

    test('同日多 window：gap 禁用且 slot 不可跨 gap', () => {
        const morning = {
            date: '2026-03-09',
            startAt: macauIso('2026-03-09 09:00'),
            endAt: macauIso('2026-03-09 10:00'),
        };
        const afternoon = {
            date: '2026-03-09',
            startAt: macauIso('2026-03-09 14:00'),
            endAt: macauIso('2026-03-09 15:00'),
        };
        const gaps = getDisabledGapsForDay([morning, afternoon]);
        expect(gaps).toEqual([
            {
                startAt: morning.endAt,
                endAt: afternoon.startAt,
            },
        ]);
        const gapSlot = {
            startAt: macauIso('2026-03-09 10:00'),
            endAt: macauIso('2026-03-09 10:30'),
        };
        expect(isSlotInsideCandidateWindows(gapSlot, [morning, afternoon])).toBe(
            false,
        );
        const pages = buildWeekPages({
            timezone: TZ,
            slotMinutes: 30,
            candidateWindows: [morning, afternoon],
        });
        const day = pages[0].days.find(item => item.date === '2026-03-09');
        expect(day.windows).toHaveLength(2);
        expect(day.disabledGaps).toHaveLength(1);
        expect(pages[0].axisStartAt).toBe(morning.startAt);
        expect(pages[0].axisEndAt).toBe(afternoon.endAt);
    });
});

describe('scheduleRanges 展開與合併', () => {
    test('15／30／60 分鐘 slot 展開', () => {
        const window = {
            date: '2026-03-09',
            startAt: macauIso('2026-03-09 10:00'),
            endAt: macauIso('2026-03-09 11:00'),
        };
        expect(expandWindowToSlots(window, 60, TZ)).toHaveLength(1);
        expect(expandWindowToSlots(window, 30, TZ)).toHaveLength(2);
        expect(expandWindowToSlots(window, 15, TZ)).toHaveLength(4);
    });

    test('同日 gap 不合併 ranges；相鄰則合併', () => {
        const morning = {
            date: '2026-03-09',
            startAt: macauIso('2026-03-09 09:00'),
            endAt: macauIso('2026-03-09 10:00'),
        };
        const afternoon = {
            date: '2026-03-09',
            startAt: macauIso('2026-03-09 14:00'),
            endAt: macauIso('2026-03-09 15:00'),
        };
        const slots = expandCandidateWindowsToSlots(
            [morning, afternoon],
            30,
            TZ,
        );
        // 選上午兩格＋下午第一格
        const selected = [slots[0], slots[1], slots[2]];
        const ranges = mergeSlotsToRanges(selected, {
            candidateWindows: [morning, afternoon],
            slotMinutes: 30,
            timezone: TZ,
        });
        expect(ranges).toHaveLength(2);
        expect(ranges[0]).toEqual({
            startAt: morning.startAt,
            endAt: morning.endAt,
        });
        expect(ranges[1]).toEqual({
            startAt: afternoon.startAt,
            endAt: macauIso('2026-03-09 14:30'),
        });
    });

    test('候選草稿合併：空檔產生兩段 window', () => {
        const slots = [
            {
                startAt: macauIso('2026-03-09 09:00'),
                endAt: macauIso('2026-03-09 09:30'),
            },
            {
                startAt: macauIso('2026-03-09 09:30'),
                endAt: macauIso('2026-03-09 10:00'),
            },
            {
                startAt: macauIso('2026-03-09 14:00'),
                endAt: macauIso('2026-03-09 14:30'),
            },
        ];
        const windows = mergeSlotsToCandidateWindows(slots, {
            timezone: TZ,
            slotMinutes: 30,
        });
        expect(windows).toHaveLength(2);
        expect(windows[0].date).toBe('2026-03-09');
        expect(windows[0].endAt).toBe(macauIso('2026-03-09 10:00'));
        expect(windows[1].startAt).toBe(macauIso('2026-03-09 14:00'));
    });
});

describe('scheduleRecommendations 熱力與建議', () => {
    const windows = [
        {
            date: '2026-03-09',
            startAt: macauIso('2026-03-09 09:00'),
            endAt: macauIso('2026-03-09 10:00'),
        },
        {
            date: '2026-03-09',
            startAt: macauIso('2026-03-09 14:00'),
            endAt: macauIso('2026-03-09 15:00'),
        },
        {
            date: '2026-03-10',
            startAt: macauIso('2026-03-10 09:00'),
            endAt: macauIso('2026-03-10 10:00'),
        },
    ];

    test('availability null／空 ranges／有 ranges 統計', () => {
        const members = [
            {harborUserId: 1, status: 'active', availability: null},
            {harborUserId: 2, status: 'active', availability: {ranges: []}},
            {
                harborUserId: 3,
                status: 'active',
                availability: {
                    ranges: [
                        {
                            startAt: macauIso('2026-03-09 09:00'),
                            endAt: macauIso('2026-03-09 09:30'),
                        },
                    ],
                },
            },
        ];
        const stats = computeAvailabilityStats(members, TZ);
        expect(stats).toEqual({
            memberCount: 3,
            submittedCount: 2,
            fullyBusyCount: 1,
            withRangesCount: 1,
            unsubmittedCount: 1,
        });
    });

    test('熱力分母使用 memberCount，未提交不從分母排除', () => {
        const members = [
            {harborUserId: 1, status: 'active', availability: null},
            {
                harborUserId: 2,
                status: 'active',
                availability: {
                    ranges: [
                        {
                            startAt: macauIso('2026-03-09 09:00'),
                            endAt: macauIso('2026-03-09 10:00'),
                        },
                    ],
                },
            },
        ];
        const {slots} = buildHeatmap({
            candidateWindows: [windows[0]],
            slotMinutes: 60,
            timezone: TZ,
            members,
        });
        expect(slots).toHaveLength(1);
        expect(slots[0].availableCount).toBe(1);
        expect(slots[0].memberCount).toBe(2);
        expect(slots[0].heat).toBe(0.5);
        expect(slots[0].submittedCount).toBe(1);
    });

    test('最佳時段不跨日、不跨 gap，且 availableCount===0 不顯示', () => {
        const members = [
            {
                harborUserId: 1,
                status: 'active',
                availability: {
                    ranges: [
                        {
                            startAt: macauIso('2026-03-09 09:00'),
                            endAt: macauIso('2026-03-09 10:00'),
                        },
                        {
                            startAt: macauIso('2026-03-09 14:00'),
                            endAt: macauIso('2026-03-09 15:00'),
                        },
                        {
                            startAt: macauIso('2026-03-10 09:00'),
                            endAt: macauIso('2026-03-10 10:00'),
                        },
                    ],
                },
            },
            {
                harborUserId: 2,
                status: 'active',
                availability: {
                    ranges: [
                        {
                            startAt: macauIso('2026-03-09 09:00'),
                            endAt: macauIso('2026-03-09 10:00'),
                        },
                        {
                            startAt: macauIso('2026-03-10 09:00'),
                            endAt: macauIso('2026-03-10 10:00'),
                        },
                    ],
                },
            },
        ];
        const {slots} = buildHeatmap({
            candidateWindows: windows,
            slotMinutes: 60,
            timezone: TZ,
            members,
        });
        const suggestions = suggestBestSlots(slots);
        expect(suggestions.length).toBeGreaterThan(0);
        expect(suggestions.length).toBeLessThanOrEqual(3);
        // 最高為 2 人：週一上午與週二上午各一段，不可併成一段
        const top = suggestions.filter(item => item.availableCount === 2);
        expect(top).toHaveLength(2);
        expect(top.every(item => item.availableCount > 0)).toBe(true);
        // 確認沒有跨 gap 把上午與下午黏在一起
        expect(
            suggestions.some(
                item =>
                    item.startAt === macauIso('2026-03-09 09:00') &&
                    item.endAt === macauIso('2026-03-09 15:00'),
            ),
        ).toBe(false);

        const emptyHeat = buildHeatmap({
            candidateWindows: [windows[0]],
            slotMinutes: 60,
            timezone: TZ,
            members: [
                {harborUserId: 1, status: 'active', availability: null},
                {harborUserId: 2, status: 'active', availability: {ranges: []}},
            ],
        });
        expect(suggestBestSlots(emptyHeat.slots)).toEqual([]);
    });
});

describe('scheduleDraft 草稿', () => {
    test('availability null 以空草稿開始；提交合併不跨 gap', () => {
        const windows = [
            {
                date: '2026-03-09',
                startAt: macauIso('2026-03-09 09:00'),
                endAt: macauIso('2026-03-09 10:00'),
            },
            {
                date: '2026-03-09',
                startAt: macauIso('2026-03-09 14:00'),
                endAt: macauIso('2026-03-09 15:00'),
            },
        ];
        let draft = createAvailabilityDraftFromServer({
            availability: null,
            candidateWindows: windows,
            slotMinutes: 30,
            timezone: TZ,
        });
        expect(draft.selectedKeys).toEqual([]);
        expect(draft.revision).toBe(0);

        const allSlots = expandCandidateWindowsToSlots(windows, 30, TZ);
        draft = toggleDraftSlot(draft, allSlots[0]);
        draft = toggleDraftSlot(draft, allSlots[1]);
        draft = toggleDraftSlot(draft, allSlots[2]);
        const committed = commitAvailabilityDraft(draft, windows);
        expect(committed.ranges).toHaveLength(2);

        const mode = resolveGestureMode(draft, allSlots[0]);
        expect(mode).toBe('erase');
        draft = applyDraftGesture(draft, [allSlots[0]], 'erase');
        expect(commitAvailabilityDraft(draft, windows).ranges).toHaveLength(2);
    });

    test('候選草稿可來回展開／合併', () => {
        const windows = [
            {
                date: '2026-03-09',
                startAt: macauIso('2026-03-09 09:00'),
                endAt: macauIso('2026-03-09 10:00'),
            },
        ];
        const draft = createCandidateDraftFromWindows({
            candidateWindows: windows,
            slotMinutes: 30,
            timezone: TZ,
        });
        expect(draft.selectedKeys).toHaveLength(2);
    });
});
