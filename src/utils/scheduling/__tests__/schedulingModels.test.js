/**
 * schedulingModels 純函式測試
 */
import {
    DEFAULT_WEEKLY_SCROLL_MINUTE,
    FULL_WEEK_CANDIDATE_WINDOWS,
    getEarliestAvailabilityStartMinute,
    hasAvailabilityRanges,
    isAvailabilityFullyBusy,
    isAvailabilitySubmitted,
    normalizeAvailability,
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeTimezone,
    rangeCoversSlot,
    rangesAreAdjacent,
    rangesOverlap,
    takeRecentTeamEvents,
} from '../schedulingModels';

describe('schedulingModels', () => {
    test('normalizeTimezone／slotMinutes 有合理預設', () => {
        expect(normalizeTimezone(null)).toBe('Asia/Macau');
        expect(normalizeTimezone('  Asia/Tokyo  ')).toBe('Asia/Tokyo');
        expect(normalizeSlotMinutes(30)).toBe(30);
        expect(normalizeSlotMinutes(7)).toBe(15);
    });

    test('全週候選範圍覆蓋七天 24 小時', () => {
        expect(FULL_WEEK_CANDIDATE_WINDOWS).toHaveLength(7);
        expect(FULL_WEEK_CANDIDATE_WINDOWS[0]).toEqual({
            weekday: 1,
            startMinute: 0,
            endMinute: 1440,
        });
        expect(FULL_WEEK_CANDIDATE_WINDOWS[6].weekday).toBe(7);
    });

    test('normalizeCandidateWindows 只接受 weekly 座標並排序', () => {
        const windows = normalizeCandidateWindows([
            {weekday: 3, startMinute: 600, endMinute: 660},
            {weekday: 1, startMinute: 840, endMinute: 900},
            {weekday: 1, startMinute: 540, endMinute: 600},
            {weekday: 8, startMinute: 540, endMinute: 600},
            {weekday: 2, startMinute: 600, endMinute: 600},
        ]);
        expect(windows).toEqual([
            {weekday: 1, startMinute: 540, endMinute: 600},
            {weekday: 1, startMinute: 840, endMinute: 900},
            {weekday: 3, startMinute: 600, endMinute: 660},
        ]);
    });

    test('availability 三種語意', () => {
        expect(isAvailabilitySubmitted(null)).toBe(false);
        expect(isAvailabilityFullyBusy(null)).toBe(false);
        expect(hasAvailabilityRanges(null)).toBe(false);

        const empty = normalizeAvailability({ranges: []});
        expect(isAvailabilitySubmitted(empty)).toBe(true);
        expect(isAvailabilityFullyBusy(empty)).toBe(true);
        expect(hasAvailabilityRanges(empty)).toBe(false);

        const withRanges = normalizeAvailability({
            ranges: [{weekday: 1, startMinute: 540, endMinute: 570}],
        });
        expect(withRanges.ranges).toEqual([
            {weekday: 1, startMinute: 540, endMinute: 570},
        ]);
        expect(hasAvailabilityRanges(withRanges)).toBe(true);
        expect(isAvailabilityFullyBusy(withRanges)).toBe(false);
    });

    test('展示時間預設 08:00，有 availability 時使用最早開始分鐘', () => {
        expect(getEarliestAvailabilityStartMinute([])).toBe(
            DEFAULT_WEEKLY_SCROLL_MINUTE,
        );
        expect(
            getEarliestAvailabilityStartMinute([
                {availability: null},
                {
                    availability: {
                        ranges: [
                            {weekday: 1, startMinute: 600, endMinute: 660},
                            {weekday: 4, startMinute: 420, endMinute: 480},
                        ],
                    },
                },
                {
                    availability: {
                        ranges: [
                            {weekday: 2, startMinute: 540, endMinute: 600},
                        ],
                    },
                },
            ]),
        ).toBe(420);
    });

    test('rangeCoversSlot 和 ranges 語意使用同一 weekday', () => {
        const slot = {weekday: 1, startMinute: 540, endMinute: 555};
        expect(
            rangeCoversSlot(
                {weekday: 1, startMinute: 540, endMinute: 555},
                slot,
            ),
        ).toBe(true);
        expect(
            rangeCoversSlot(
                {weekday: 2, startMinute: 540, endMinute: 600},
                slot,
            ),
        ).toBe(false);
        expect(
            rangesOverlap(
                {weekday: 1, startMinute: 540, endMinute: 600},
                {weekday: 1, startMinute: 570, endMinute: 630},
            ),
        ).toBe(true);
        expect(
            rangesAreAdjacent(
                {weekday: 1, startMinute: 540, endMinute: 600},
                {weekday: 1, startMinute: 600, endMinute: 630},
            ),
        ).toBe(true);
        expect(
            rangesAreAdjacent(
                {weekday: 1, startMinute: 540, endMinute: 600},
                {weekday: 2, startMinute: 600, endMinute: 630},
            ),
        ).toBe(false);
    });

    test('最近三個保留 API 順序且不重排', () => {
        const events = [
            {event: {eventId: 'a'}},
            {event: {eventId: 'b'}},
            {event: {eventId: 'c'}},
            {event: {eventId: 'd'}},
        ];
        expect(takeRecentTeamEvents(events).map(item => item.event.eventId)).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

});
