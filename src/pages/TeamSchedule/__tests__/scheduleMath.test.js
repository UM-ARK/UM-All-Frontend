/**
 * weekly schedule 純函式測試
 */
import {
    buildTimeAxisLabels,
    buildWeeklyGrid,
    getDisabledGapsForDay,
    isSlotInsideCandidateWindows,
} from '../utils/scheduleGrid';
import {
    expandCandidateWindowsToSlots,
    expandRangesToSlots,
    expandWindowToSlots,
    mergeSlotsToCandidateWindows,
    mergeSlotsToRanges,
    slotKey,
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

const WINDOWS = [
    {weekday: 1, startMinute: 540, endMinute: 600},
    {weekday: 1, startMinute: 840, endMinute: 900},
    {weekday: 2, startMinute: 540, endMinute: 600},
];

describe('scheduleGrid weekly 模型', () => {
    test('固定週一至週日七欄，沒有日期或週頁', () => {
        const grid = buildWeeklyGrid({
            candidateWindows: WINDOWS,
            slotMinutes: 30,
        });
        expect(grid.days).toHaveLength(7);
        expect(grid.days.map(day => day.weekday)).toEqual([1, 2, 3, 4, 5, 6, 7]);
        expect(grid.axisStartMinute).toBe(540);
        expect(grid.axisEndMinute).toBe(900);
        expect(grid.days[0].windows).toHaveLength(2);
        expect(grid.days[2].enabled).toBe(false);
        expect(buildTimeAxisLabels(540, 600, 30)).toEqual([540, 570]);
    });

    test('同一 weekday 的空檔禁用，slot 不可跨 gap', () => {
        const monday = WINDOWS.slice(0, 2);
        expect(getDisabledGapsForDay(monday)).toEqual([
            {weekday: 1, startMinute: 600, endMinute: 840},
        ]);
        expect(
            isSlotInsideCandidateWindows(
                {weekday: 1, startMinute: 600, endMinute: 630},
                monday,
            ),
        ).toBe(false);
        expect(
            isSlotInsideCandidateWindows(
                {weekday: 2, startMinute: 540, endMinute: 570},
                monday,
            ),
        ).toBe(false);
    });
});

describe('scheduleRanges 展開與合併', () => {
    test('15／30／60 分鐘 slot 展開及 weekly key', () => {
        const window = {weekday: 1, startMinute: 600, endMinute: 660};
        expect(expandWindowToSlots(window, 60)).toHaveLength(1);
        expect(expandWindowToSlots(window, 30)).toHaveLength(2);
        expect(expandWindowToSlots(window, 15)).toHaveLength(4);
        expect(slotKey({weekday: 1, startMinute: 540})).toBe('1:540');
    });

    test('同一 weekday gap 不合併 ranges；相鄰格才合併', () => {
        const slots = expandCandidateWindowsToSlots(WINDOWS, 30);
        const ranges = mergeSlotsToRanges([slots[0], slots[1], slots[2]], {
            candidateWindows: WINDOWS,
            slotMinutes: 30,
        });
        expect(ranges).toEqual([
            {weekday: 1, startMinute: 540, endMinute: 600},
            {weekday: 1, startMinute: 840, endMinute: 870},
        ]);
    });

    test('候選草稿合併會按 weekday 切分 window', () => {
        const windows = mergeSlotsToCandidateWindows(
            [
                {weekday: 1, startMinute: 540, endMinute: 570},
                {weekday: 1, startMinute: 570, endMinute: 600},
                {weekday: 2, startMinute: 540, endMinute: 570},
            ],
            {slotMinutes: 30},
        );
        expect(windows).toEqual([
            {weekday: 1, startMinute: 540, endMinute: 600},
            {weekday: 2, startMinute: 540, endMinute: 570},
        ]);
    });

    test('ranges 只展開落在 candidate windows 內的 slots', () => {
        const slots = expandRangesToSlots(
            [{weekday: 1, startMinute: 540, endMinute: 900}],
            WINDOWS,
            30,
        );
        expect(slots.map(slotKey)).toEqual(['1:540', '1:570', '1:840', '1:870']);
    });
});

describe('scheduleRecommendations 熱力與建議', () => {
    test('availability null／空 ranges／有 ranges 統計', () => {
        const members = [
            {harborUserId: 1, status: 'active', availability: null},
            {harborUserId: 2, status: 'active', availability: {ranges: []}},
            {
                harborUserId: 3,
                status: 'active',
                availability: {
                    ranges: [{weekday: 1, startMinute: 540, endMinute: 570}],
                },
            },
        ];
        expect(computeAvailabilityStats(members)).toEqual({
            memberCount: 3,
            submittedCount: 2,
            fullyBusyCount: 1,
            withRangesCount: 1,
            unsubmittedCount: 1,
        });
    });

    test('熱力分母使用 memberCount，未提交不從分母排除', () => {
        const {slots} = buildHeatmap({
            candidateWindows: [WINDOWS[0]],
            slotMinutes: 60,
            members: [
                {harborUserId: 1, availability: null},
                {
                    harborUserId: 2,
                    availability: {
                        ranges: [{weekday: 1, startMinute: 540, endMinute: 600}],
                    },
                },
            ],
        });
        expect(slots[0]).toMatchObject({
            weekday: 1,
            startMinute: 540,
            availableCount: 1,
            memberCount: 2,
            heat: 0.5,
        });
    });

    test('最佳時段不跨 weekday 或 gap，且不顯示零人時段', () => {
        const {slots} = buildHeatmap({
            candidateWindows: WINDOWS,
            slotMinutes: 60,
            members: [
                {
                    harborUserId: 1,
                    availability: {ranges: WINDOWS},
                },
                {
                    harborUserId: 2,
                    availability: {
                        ranges: [
                            {weekday: 1, startMinute: 540, endMinute: 600},
                            {weekday: 2, startMinute: 540, endMinute: 600},
                        ],
                    },
                },
            ],
        });
        expect(suggestBestSlots(slots)).toEqual([
            {
                weekday: 1,
                startMinute: 540,
                endMinute: 600,
                availableCount: 2,
                memberCount: 2,
                heat: 1,
            },
            {
                weekday: 2,
                startMinute: 540,
                endMinute: 600,
                availableCount: 2,
                memberCount: 2,
                heat: 1,
            },
            {
                weekday: 1,
                startMinute: 840,
                endMinute: 900,
                availableCount: 1,
                memberCount: 2,
                heat: 0.5,
            },
        ]);
    });
});

describe('scheduleDraft 草稿', () => {
    test('availability null 以空草稿開始，提交不跨 gap', () => {
        let draft = createAvailabilityDraftFromServer({
            availability: null,
            candidateWindows: WINDOWS,
            slotMinutes: 30,
        });
        expect(draft.selectedKeys).toEqual([]);
        expect(draft.revision).toBe(0);

        const allSlots = expandCandidateWindowsToSlots(WINDOWS, 30);
        draft = toggleDraftSlot(draft, allSlots[0]);
        draft = toggleDraftSlot(draft, allSlots[1]);
        draft = toggleDraftSlot(draft, allSlots[2]);
        expect(commitAvailabilityDraft(draft, WINDOWS).ranges).toEqual([
            {weekday: 1, startMinute: 540, endMinute: 600},
            {weekday: 1, startMinute: 840, endMinute: 870},
        ]);
        expect(resolveGestureMode(draft, allSlots[0])).toBe('erase');
        draft = applyDraftGesture(draft, [allSlots[0]], 'erase');
        expect(draft.selectedKeys).not.toContain('1:540');
    });

    test('候選草稿可來回展開／合併', () => {
        const draft = createCandidateDraftFromWindows({
            candidateWindows: [WINDOWS[0]],
            slotMinutes: 30,
        });
        expect(draft.selectedKeys).toEqual(['1:540', '1:570']);
    });
});
