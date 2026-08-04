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
    aggregateHeatmapSlots,
    buildHeatmap,
    computeAvailabilityStats,
    suggestBestSlots,
} from '../utils/scheduleRecommendations';
import {
    applyDraftGesture,
    commitAvailabilityDraft,
    createAvailabilityDraftFromServer,
    createCandidateDraftFromWindows,
    insertDraftRange,
    resolveGestureMode,
    toggleDraftSlot,
} from '../utils/scheduleDraft';
import {
    createCourseSchedulePrefill,
    normalizeCourseScheduleSlot,
} from '../utils/courseSchedulePrefill';

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

describe('課表預填可用時間', () => {
    test('候選時間預設可用，課堂重疊格取消選取', () => {
        const result = createCourseSchedulePrefill({
            candidateWindows: [
                {weekday: 1, startMinute: 540, endMinute: 720},
            ],
            courseSlots: [
                {Day: 'MON', 'Time From': '10:00', 'Time To': '11:15'},
            ],
            slotMinutes: 15,
            revision: 3,
        });

        expect(result.courseConflictKeys).toEqual([
            '1:600',
            '1:615',
            '1:630',
            '1:645',
            '1:660',
        ]);
        expect(result.draft.revision).toBe(3);
        expect(result.draft.selectedKeys).toEqual([
            '1:540',
            '1:555',
            '1:570',
            '1:585',
            '1:675',
            '1:690',
            '1:705',
        ]);
    });

    test('課堂只要部分重疊仍標記，使用者可手動改回可用', () => {
        const result = createCourseSchedulePrefill({
            candidateWindows: [
                {weekday: 2, startMinute: 660, endMinute: 720},
            ],
            courseSlots: [
                {Day: 'TUE', 'Time From': '11:07', 'Time To': '11:22'},
            ],
            slotMinutes: 15,
        });
        const overridden = toggleDraftSlot(result.draft, {
            weekday: 2,
            startMinute: 660,
            endMinute: 675,
        });

        expect(result.courseConflictKeys).toEqual(['2:660', '2:675']);
        expect(overridden.selectedKeys).toContain('2:660');
        expect(result.courseConflictKeys).toContain('2:660');
    });

    test('預填只自動選取 09:00 至 20:00', () => {
        const result = createCourseSchedulePrefill({
            candidateWindows: [
                {weekday: 3, startMinute: 510, endMinute: 1230},
            ],
            courseSlots: [],
            slotMinutes: 15,
        });

        expect(result.draft.selectedKeys).toHaveLength(44);
        expect(result.draft.selectedKeys[0]).toBe('3:540');
        expect(result.draft.selectedKeys.at(-1)).toBe('3:1185');
        expect(result.draft.selectedKeys).not.toContain('3:525');
        expect(result.draft.selectedKeys).not.toContain('3:1200');
    });

    test('忽略無效星期與時間', () => {
        expect(
            normalizeCourseScheduleSlot({
                Day: 'HOLIDAY',
                'Time From': '10:00',
                'Time To': '11:00',
            }),
        ).toBeNull();
        expect(
            normalizeCourseScheduleSlot({
                Day: 'FRI',
                'Time From': '12:00',
                'Time To': '11:00',
            }),
        ).toBeNull();
    });
});

describe('scheduleRecommendations 熱力與建議', () => {
    test('15 分鐘 heatmap 以午夜倍數聚合顯示格，不跨 weekday', () => {
        const a = {harborUserId: 1};
        const b = {harborUserId: 2};
        const c = {harborUserId: 3};
        const slots = [
            {
                weekday: 1,
                startMinute: 585,
                endMinute: 600,
                availableCount: 1,
                memberCount: 3,
                heat: 1 / 3,
                freeMembers: [a],
                hasData: true,
            },
            {
                weekday: 1,
                startMinute: 600,
                endMinute: 615,
                availableCount: 1,
                memberCount: 3,
                heat: 1 / 3,
                freeMembers: [b],
                hasData: false,
            },
            {
                weekday: 1,
                startMinute: 615,
                endMinute: 630,
                availableCount: 2,
                memberCount: 3,
                heat: 2 / 3,
                freeMembers: [b, c],
                isSelfSelected: true,
            },
            {
                weekday: 1,
                startMinute: 630,
                endMinute: 645,
                availableCount: 2,
                memberCount: 3,
                heat: 2 / 3,
                freeMembers: [a, c],
            },
            {
                weekday: 2,
                startMinute: 600,
                endMinute: 615,
                availableCount: 3,
                memberCount: 3,
                heat: 1,
                freeMembers: [a, b, c],
            },
        ];

        const fifteenMinuteSlots = aggregateHeatmapSlots(slots, 15);
        expect(fifteenMinuteSlots).toHaveLength(5);
        expect(fifteenMinuteSlots[1]).toMatchObject({
            weekday: 1,
            startMinute: 600,
            endMinute: 615,
            availableCount: 1,
            freeMembers: [b],
            hasData: false,
        });
        expect(fifteenMinuteSlots[1].childSlots).toEqual([slots[1]]);

        expect(aggregateHeatmapSlots(slots, 30, ['1:600'])).toEqual([
            {
                weekday: 1,
                startMinute: 570,
                endMinute: 600,
                childSlots: [slots[0]],
                hasData: true,
                isSelfSelected: false,
                representativeSlot: slots[0],
                availableCount: 1,
                memberCount: 3,
                heat: 1 / 3,
                freeMembers: [a],
            },
            {
                weekday: 1,
                startMinute: 600,
                endMinute: 630,
                childSlots: [slots[1], slots[2]],
                hasData: true,
                isSelfSelected: true,
                representativeSlot: slots[2],
                availableCount: 2,
                memberCount: 3,
                heat: 2 / 3,
                freeMembers: [b, c],
            },
            {
                weekday: 1,
                startMinute: 630,
                endMinute: 660,
                childSlots: [slots[3]],
                hasData: true,
                isSelfSelected: false,
                representativeSlot: slots[3],
                availableCount: 2,
                memberCount: 3,
                heat: 2 / 3,
                freeMembers: [a, c],
            },
            {
                weekday: 2,
                startMinute: 600,
                endMinute: 630,
                childSlots: [slots[4]],
                hasData: true,
                isSelfSelected: false,
                representativeSlot: slots[4],
                availableCount: 3,
                memberCount: 3,
                heat: 1,
                freeMembers: [a, b, c],
            },
        ]);
    });

    test('60 分鐘格同分取最早 child，且不合併不同時段成員', () => {
        const firstMembers = [{harborUserId: 1}, {harborUserId: 2}];
        const laterMembers = [{harborUserId: 3}, {harborUserId: 4}];
        const slots = [
            {
                weekday: 1,
                startMinute: 660,
                endMinute: 675,
                availableCount: 2,
                memberCount: 4,
                heat: 0.5,
                freeMembers: firstMembers,
            },
            {
                weekday: 1,
                startMinute: 675,
                endMinute: 690,
                availableCount: 1,
                memberCount: 4,
                heat: 0.25,
                freeMembers: [{harborUserId: 5}],
            },
            {
                weekday: 1,
                startMinute: 690,
                endMinute: 705,
                availableCount: 2,
                memberCount: 4,
                heat: 0.5,
                freeMembers: laterMembers,
            },
        ];

        const [bucket] = aggregateHeatmapSlots(slots, 60);
        expect(bucket).toMatchObject({
            weekday: 1,
            startMinute: 660,
            endMinute: 720,
            availableCount: 2,
            heat: 0.5,
            freeMembers: firstMembers,
            hasData: true,
            isSelfSelected: false,
            representativeSlot: slots[0],
        });
        expect(bucket.childSlots).toEqual(slots);
    });

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
            slotMinutes: 15,
        });
        expect(draft.selectedKeys).toEqual([]);
        expect(draft.revision).toBe(0);

        const allSlots = expandCandidateWindowsToSlots(WINDOWS, 15);
        draft = toggleDraftSlot(draft, allSlots[0]);
        draft = toggleDraftSlot(draft, allSlots[1]);
        draft = toggleDraftSlot(draft, allSlots[4]);
        expect(commitAvailabilityDraft(draft, WINDOWS).ranges).toEqual([
            {weekday: 1, startMinute: 540, endMinute: 570},
            {weekday: 1, startMinute: 840, endMinute: 855},
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

    test('快速插入長時段只加入候選範圍內的連續格', () => {
        const draft = createAvailabilityDraftFromServer({
            availability: null,
            candidateWindows: WINDOWS,
            slotMinutes: 15,
        });
        const allSlots = expandCandidateWindowsToSlots(WINDOWS, 15);
        const inserted = insertDraftRange(
            draft,
            {weekday: 1, startMinute: 540, endMinute: 900},
            allSlots,
        );
        expect(inserted.selectedKeys).toEqual([
            '1:540',
            '1:555',
            '1:570',
            '1:585',
            '1:840',
            '1:855',
            '1:870',
            '1:885',
        ]);
        expect(
            insertDraftRange(
                inserted,
                {weekday: 7, startMinute: 540, endMinute: 600},
                allSlots,
            ),
        ).toBe(inserted);
    });
});
