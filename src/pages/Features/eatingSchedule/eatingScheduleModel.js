export const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
export const SAMPLE_MINUTES = 5;
export const HALF_WINDOW_MINUTES = 15;
export const DAY_END = 24 * 60;

const DEFAULT_DAY_START = 8 * 60;
const TIME_FIELDS = { end: 'Time To', start: 'Time From' };
const buildingOrder = new Intl.Collator('en', { numeric: true });

const parseTime = time => {
    const match = String(time ?? '').trim().match(/^(\d{1,2}):([0-5]\d)$/);
    if (!match) return null;

    const minute = Number(match[1]) * 60 + Number(match[2]);
    return minute <= DAY_END ? minute : null;
};

export const formatTime = minute => {
    const hours = String(Math.floor(minute / 60)).padStart(2, '0');
    const minutes = String(minute % 60).padStart(2, '0');
    return `${hours}:${minutes}`;
};

export const formatWindow = minute => {
    const start = (minute - HALF_WINDOW_MINUTES + DAY_END) % DAY_END;
    const end = (minute + HALF_WINDOW_MINUTES) % DAY_END;
    return `${formatTime(start)}–${formatTime(end)}`;
};

export const getTimeSample = (events, minute, previous) => {
    let start = previous?.start ?? 0;
    let end = previous?.end ?? 0;
    while (end < events.length && events[end].minute < minute + HALF_WINDOW_MINUTES) {
        end += 1;
    }
    while (start < end && events[start].minute < minute - HALF_WINDOW_MINUTES) {
        start += 1;
    }
    return { minute, count: end - start, start, end };
};

export const buildSchedule = courses => {
    let startMinute = DEFAULT_DAY_START;
    const days = { end: {}, start: {} };

    for (const course of courses) {
        if (!WEEKDAYS.includes(course.Day)) continue;

        const building = String(course.Classroom ?? '').trim().toUpperCase()
            .match(/^([A-Z]+\d+[A-Z]?)(?:[-\s]|$)/)?.[1] ?? '';
        for (const [mode, field] of Object.entries(TIME_FIELDS)) {
            const minute = parseTime(course[field]);
            if (minute === null) continue;

            startMinute = Math.min(startMinute, Math.floor(minute / 60) * 60);
            const day = days[mode][course.Day] ??= { events: [], samples: [] };
            day.events.push({ minute, building });
        }
    }

    for (const modeDays of Object.values(days)) {
        for (const day of Object.values(modeDays)) {
            const { events, samples } = day;
            events.sort((first, second) => first.minute - second.minute);
            let sample;
            let peak = 0;

            for (let minute = startMinute; minute <= DAY_END; minute += SAMPLE_MINUTES) {
                sample = getTimeSample(events, minute, sample);
                samples.push(sample);
                peak = Math.max(peak, sample.count);
            }
            day.peak = peak;
        }
    }

    return { days, startMinute };
};

export const getBuildingCounts = (events, sample) => {
    const counts = new Map();
    let unassigned = 0;
    for (let index = sample.start; index < sample.end; index += 1) {
        const { building } = events[index];
        if (building) {
            counts.set(building, (counts.get(building) ?? 0) + 1);
        } else {
            unassigned += 1;
        }
    }

    const buildings = [...counts].sort(([first, firstCount], [second, secondCount]) =>
        secondCount - firstCount || buildingOrder.compare(first, second),
    );
    return { buildings, unassigned };
};
