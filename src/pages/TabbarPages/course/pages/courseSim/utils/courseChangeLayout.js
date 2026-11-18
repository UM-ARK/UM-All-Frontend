import { getSlotKey, parseTimeToMinutes } from '../../../hooks/useConflict';

const MAX_HANDOFF_MINUTES = 90;

export function isSectionChange(from, to) {
    return from['Course Code'] === to['Course Code'] && from.Section !== to.Section;
}

export function getCourseChanges(previousSlots, nextSlots) {
    const previousByKey = new Map(previousSlots.map(slot => [getSlotKey(slot), slot]));
    const nextByKey = new Map(nextSlots.map(slot => [getSlotKey(slot), slot]));
    const departures = [...previousByKey].filter(([key]) => !nextByKey.has(key));
    const arrivals = new Map(
        [...nextByKey].filter(([key]) => !previousByKey.has(key)),
    );
    const sweeps = new Map();
    const handoffs = new Map();
    const pairedArrivals = new Set();
    const pairs = [];

    departures.forEach(([fromKey, from]) => {
        arrivals.forEach((to, toKey) => {
            if (from.Day !== to.Day) {
                return;
            }
            const fromStart = parseTimeToMinutes(from['Time From']);
            const toStart = parseTimeToMinutes(to['Time From']);
            if (fromStart === null || toStart === null) {
                return;
            }
            const distance = Math.abs(fromStart - toStart);
            const fromEnd = parseTimeToMinutes(from['Time To']);
            const sectionChange = isSectionChange(from, to);
            const sweep = sectionChange && distance === 0 && fromEnd !== null &&
                fromEnd === parseTimeToMinutes(to['Time To']);

            if (sectionChange || distance <= MAX_HANDOFF_MINUTES) {
                pairs.push({ fromKey, from, toKey, distance, sweep });
            }
        });
    });

    // 先保留原位換 Section，再依開始時間差一對一配對。
    pairs.sort((a, b) => Number(b.sweep) - Number(a.sweep) || a.distance - b.distance);
    pairs.forEach(({ fromKey, from, toKey, sweep }) => {
        if (handoffs.has(fromKey) || pairedArrivals.has(toKey)) {
            return;
        }
        handoffs.set(fromKey, toKey);
        pairedArrivals.add(toKey);
        if (sweep) {
            sweeps.set(toKey, from);
        }
    });

    return {
        arrivals,
        departures,
        handoffs,
        sweeps,
    };
}
