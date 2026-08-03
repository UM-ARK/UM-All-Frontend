/**
 * schedulingModels 純函式測試
 */
import {
    getCandidateDates,
    hasAvailabilityRanges,
    isAvailabilityFullyBusy,
    isAvailabilitySubmitted,
    normalizeAvailability,
    normalizeCandidateWindows,
    normalizeSlotMinutes,
    normalizeTimezone,
    rangeCoversSlot,
    summarizeCandidateDates,
    takeRecentTeamEvents,
} from '../schedulingModels';

describe('schedulingModels', () => {
    test('normalizeTimezone／slotMinutes 有合理預設', () => {
        expect(normalizeTimezone(null)).toBe('Asia/Macau');
        expect(normalizeTimezone('  Asia/Tokyo  ')).toBe('Asia/Tokyo');
        expect(normalizeSlotMinutes(30)).toBe(30);
        expect(normalizeSlotMinutes(7)).toBe(15);
    });

    test('normalizeCandidateWindows 依 startAt 排序並補 date', () => {
        const windows = normalizeCandidateWindows(
            [
                {
                    startAt: '2026-03-10T03:00:00.000Z',
                    endAt: '2026-03-10T04:00:00.000Z',
                },
                {
                    date: '2026-03-09',
                    startAt: '2026-03-09T02:00:00.000Z',
                    endAt: '2026-03-09T03:00:00.000Z',
                },
            ],
            'Asia/Macau',
        );
        expect(windows).toHaveLength(2);
        expect(windows[0].date).toBe('2026-03-09');
        expect(windows[1].date).toBe('2026-03-10');
    });

    test('availability 三種語意', () => {
        expect(isAvailabilitySubmitted(null)).toBe(false);
        expect(isAvailabilityFullyBusy(null)).toBe(false);
        expect(hasAvailabilityRanges(null)).toBe(false);

        const empty = normalizeAvailability({ranges: []}, 'Asia/Macau');
        expect(isAvailabilitySubmitted(empty)).toBe(true);
        expect(isAvailabilityFullyBusy(empty)).toBe(true);
        expect(hasAvailabilityRanges(empty)).toBe(false);

        const withRanges = normalizeAvailability(
            {
                ranges: [
                    {
                        startAt: '2026-03-09T02:00:00.000Z',
                        endAt: '2026-03-09T02:30:00.000Z',
                    },
                ],
            },
            'Asia/Macau',
        );
        expect(hasAvailabilityRanges(withRanges)).toBe(true);
        expect(isAvailabilityFullyBusy(withRanges)).toBe(false);
    });

    test('rangeCoversSlot 需完整覆蓋半開 slot', () => {
        const slot = {
            startAt: '2026-03-09T02:00:00.000Z',
            endAt: '2026-03-09T02:15:00.000Z',
        };
        expect(
            rangeCoversSlot(
                {
                    startAt: '2026-03-09T02:00:00.000Z',
                    endAt: '2026-03-09T02:15:00.000Z',
                },
                slot,
            ),
        ).toBe(true);
        expect(
            rangeCoversSlot(
                {
                    startAt: '2026-03-09T02:00:00.000Z',
                    endAt: '2026-03-09T02:14:00.000Z',
                },
                slot,
            ),
        ).toBe(false);
        expect(
            rangeCoversSlot(
                {
                    startAt: '2026-03-09T02:01:00.000Z',
                    endAt: '2026-03-09T02:30:00.000Z',
                },
                slot,
            ),
        ).toBe(false);
    });

    test('最近三個保留 API 順序且不重排', () => {
        const events = [
            {event: {eventId: 'a', createdAt: '2026-01-01'}},
            {event: {eventId: 'b', createdAt: '2026-06-01'}},
            {event: {eventId: 'c', createdAt: '2025-01-01'}},
            {event: {eventId: 'd', createdAt: '2026-12-01'}},
        ];
        expect(takeRecentTeamEvents(events).map(item => item.event.eventId)).toEqual([
            'a',
            'b',
            'c',
        ]);
    });

    test('候選日期摘要', () => {
        expect(summarizeCandidateDates([], 'Asia/Macau')).toEqual({kind: 'empty'});
        expect(
            summarizeCandidateDates(
                [
                    {
                        date: '2026-03-09',
                        startAt: '2026-03-09T02:00:00.000Z',
                        endAt: '2026-03-09T03:00:00.000Z',
                    },
                ],
                'Asia/Macau',
            ),
        ).toEqual({kind: 'single', date: '2026-03-09'});

        const multi = summarizeCandidateDates(
            [
                {
                    date: '2026-03-11',
                    startAt: '2026-03-11T02:00:00.000Z',
                    endAt: '2026-03-11T03:00:00.000Z',
                },
                {
                    date: '2026-03-09',
                    startAt: '2026-03-09T02:00:00.000Z',
                    endAt: '2026-03-09T03:00:00.000Z',
                },
            ],
            'Asia/Macau',
        );
        expect(multi).toEqual({
            kind: 'range',
            startDate: '2026-03-09',
            endDate: '2026-03-11',
            dayCount: 2,
        });
        expect(getCandidateDates(
            [
                {
                    date: '2026-03-09',
                    startAt: '2026-03-09T02:00:00.000Z',
                    endAt: '2026-03-09T03:00:00.000Z',
                },
                {
                    date: '2026-03-09',
                    startAt: '2026-03-09T05:00:00.000Z',
                    endAt: '2026-03-09T06:00:00.000Z',
                },
            ],
            'Asia/Macau',
        )).toEqual(['2026-03-09']);
    });
});
