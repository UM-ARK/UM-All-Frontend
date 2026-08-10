export const BUS_STOPS = [
    {code: 'PGH', name: '研究生宿舍', shortName: '研究生宿舍', terminalLabel: '起', x: 275.5, y: 529, labelSide: 'left'},
    {code: 'E4', name: '劉少榮樓', shortName: '劉少榮樓', x: 275.5, y: 356, labelSide: 'left'},
    {code: 'N2', name: '大學會堂', shortName: '大學會堂', x: 275.5, y: 105, labelSide: 'left'},
    {code: 'N6', name: '行政樓', shortName: '行政樓', x: 147.5, y: 105, labelSide: 'left'},
    {code: 'E11', name: '工學院、信息學院、理學院', shortName: '工學院、信息學院、理學院', x: 77.5, y: 193, labelSide: 'right', labelLines: 2, labelMaxWidth: 172},
    {code: 'E21', name: '人文社科樓', shortName: '人文社科樓', x: 77.5, y: 314, labelSide: 'right'},
    {code: 'E32', name: '法學院', shortName: '法學院', x: 77.5, y: 461, labelSide: 'right'},
    {code: 'S4', name: '研究生宿舍南四座', shortName: '研究生宿舍南四座', terminalLabel: '終', x: 233.5, y: 607, labelSide: 'bottom'},
];

export const BUS_POSITIONS = [
    {code: 'PGH', x: 275.5, y: 529},
    {code: 'PGH_TO_E4', x: 275.5, y: 442.5},
    {code: 'E4', x: 275.5, y: 356},
    {code: 'E4_TO_N2', x: 275.5, y: 230.5},
    {code: 'N2', x: 275.5, y: 105},
    {code: 'N2_TO_N6', x: 211.5, y: 65},
    {code: 'N6', x: 147.5, y: 105},
    {code: 'N6_TO_E11', x: 108, y: 137},
    {code: 'E11', x: 77.5, y: 193},
    {code: 'E11_TO_E21', x: 77.5, y: 253.5},
    {code: 'E21', x: 77.5, y: 314},
    {code: 'E21_TO_E32', x: 77.5, y: 387.5},
    {code: 'E32', x: 77.5, y: 461},
    {code: 'E32_TO_S4', x: 77.5, y: 607},
    {code: 'S4', x: 233.5, y: 607},
    {code: 'S4_TO_PGH', x: 275.5, y: 590},
];

export const BUS_POSITION_CODES = BUS_POSITIONS.map(item => item.code);
export const BUS_STATS_LOOKBACK_DAYS = [1, 7, 30];
const BUS_STATS_MINIMUM_SAMPLES = 5;

const STOP_BY_CODE = BUS_STOPS.reduce((result, stop) => {
    result[stop.code] = stop;
    return result;
}, {});

const POSITION_BY_CODE = BUS_POSITIONS.reduce((result, position) => {
    result[position.code] = position;
    return result;
}, {});

export function extractVehiclePlates(value) {
    const matches = String(value || '').toUpperCase().matchAll(
        /(?:^|[^A-Z0-9])([A-Z]{1,3})[\s-]?(\d{2})[\s-]?(\d{2})(?=$|[^A-Z0-9])/g,
    );
    return [...matches].map(match => `${match[1]}-${match[2]}-${match[3]}`);
}

export function getBusStop(code) {
    return STOP_BY_CODE[code] || null;
}

export function getBusPosition(code) {
    return POSITION_BY_CODE[code] || null;
}

export function getPositionLabel(positionCode, translate = value => value) {
    const stop = getBusStop(positionCode);
    if (stop) {
        return `${stop.code} ${translate(stop.name)}`;
    }
    const [fromCode, toCode] = String(positionCode || '').split('_TO_');
    const from = getBusStop(fromCode);
    const to = getBusStop(toCode);
    if (!from || !to) {
        return translate('位置暫時不明');
    }
    return `${from.code} → ${to.code}`;
}

export function getOfficialNextDeparturePresentation(value) {
    const text = String(value || '');
    const times = text.match(/\b\d{1,2}:\d{2}\b/g) || [];
    const isLoopService = /循環行駛|loop|continuous/i.test(text);
    if (isLoopService && times.length >= 2) {
        return {kind: 'serviceWindow', startTime: times[0], endTime: times[1]};
    }
    if (isLoopService) {
        return {kind: 'loopService'};
    }
    if (times.length > 0) {
        return {kind: 'departure', time: times[0]};
    }
    return {kind: 'pending'};
}

export function normalizeBusLive(payload, deliverySource = 'live') {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.vehicles)) {
        throw new Error('Unsupported bus live response');
    }
    const vehicles = payload.vehicles.filter(vehicle =>
        vehicle &&
        typeof vehicle.vehiclePlateNumber === 'string' &&
        getBusPosition(vehicle.positionCode),
    );
    return {
        ...payload,
        vehicles,
        deliverySource,
        receivedAt: new Date().toISOString(),
    };
}

export function createFallbackBusLive(busData, observedAt = new Date()) {
    const vehicles = (busData?.busPositionArr || []).map((item, index) => ({
        vehiclePlateNumber: item.number || `BUS-${index + 1}`,
        positionIndex: item.index,
        positionCode: BUS_POSITION_CODES[item.index],
        nextStop: null,
        departureEta: null,
        nextStopEta: null,
        destinationEtas: {},
    })).filter(vehicle => getBusPosition(vehicle.positionCode));
    return {
        schemaVersion: 1,
        modelVersion: null,
        observedAt: observedAt.toISOString(),
        sourceUpdatedAt: observedAt.toISOString(),
        serviceStatus: vehicles.length > 0 ? 'running' : 'stopped',
        officialNextDeparture: null,
        observerMode: 'fallback',
        stale: false,
        staleReason: null,
        degradedReason: 'live_api_unavailable',
        vehicles,
        deliverySource: 'fallback',
        receivedAt: observedAt.toISOString(),
    };
}

export function isBusLiveSnapshotFresh(snapshot, now = Date.now()) {
    if (snapshot?.stale) {
        return false;
    }
    const observedAt = Date.parse(snapshot?.observedAt || '');
    if (!Number.isFinite(observedAt)) {
        return false;
    }
    const isScheduledIdle = snapshot?.observerMode === 'scheduled_idle';
    const maxAge = isScheduledIdle ? 10 * 60 * 1000 : 60 * 1000;
    const nextPollAt = Date.parse(snapshot?.nextPollAt || '');
    if (Number.isFinite(nextPollAt)) {
        const overdueGrace = isScheduledIdle ? 5 * 60 * 1000 : 30 * 1000;
        if (now > nextPollAt + overdueGrace) {
            return false;
        }
    }
    return now - observedAt <= maxAge;
}

export function isCachedBusLiveUsable(snapshot, now = Date.now()) {
    if (snapshot?.deliverySource === 'fallback' || snapshot?.deliverySource === 'stale') {
        return false;
    }
    return isBusLiveSnapshotFresh(snapshot, now);
}

export function getEtaDisplay(eta, observedAt, now = Date.now()) {
    if (!eta || !Number.isFinite(eta.p50Seconds) || !Number.isFinite(eta.p75Seconds)) {
        return {kind: 'unavailable'};
    }
    const observedTime = Date.parse(observedAt || '');
    const elapsedSeconds = Number.isFinite(observedTime)
        ? Math.max(0, Math.floor((now - observedTime) / 1000))
        : 0;
    const p50Seconds = Math.max(0, eta.p50Seconds - elapsedSeconds);
    const p75Seconds = Math.max(0, eta.p75Seconds - elapsedSeconds);
    if (p75Seconds <= 0) {
        return {kind: 'arrived'};
    }
    if (p75Seconds < 45) {
        return {kind: 'soon'};
    }
    const minimumMinutes = Math.max(1, Math.ceil(p50Seconds / 60));
    const maximumMinutes = Math.max(minimumMinutes, Math.ceil(p75Seconds / 60));
    return {
        kind: 'minutes',
        minimumMinutes,
        maximumMinutes,
    };
}

export function getVehicleDestinationEta(vehicle, destinationCode) {
    if (!destinationCode) {
        return vehicle.nextStopEta || null;
    }
    return vehicle.destinationEtas?.[destinationCode] || null;
}

export function getVehicleDestinationProgress(
    vehicle,
    destinationCode,
    observedAt,
    now = Date.now(),
) {
    const eta = getVehicleDestinationEta(vehicle, destinationCode);
    const loopEtaSeconds = Math.max(
        ...Object.values(vehicle?.destinationEtas || {})
            .map(item => item?.p50Seconds)
            .filter(Number.isFinite),
    );
    if (!Number.isFinite(eta?.p50Seconds) || !Number.isFinite(loopEtaSeconds) || loopEtaSeconds <= 0) {
        return 0;
    }
    const observedTime = Date.parse(observedAt || '');
    const elapsedSeconds = Number.isFinite(observedTime)
        ? Math.max(0, (now - observedTime) / 1000)
        : 0;
    const remainingSeconds = Math.max(0, eta.p50Seconds - elapsedSeconds);
    return Math.max(0, Math.min(0.98, 1 - remainingSeconds / loopEtaSeconds));
}

function getStatsTimeContext(value) {
    const parsed = Date.parse(value || '');
    const timestamp = Number.isFinite(parsed) ? parsed : Date.now();
    const date = new Date(timestamp + 8 * 60 * 60 * 1000);
    const weekday = date.getUTCDay();
    const hour = date.getUTCHours();
    return {
        dayType: weekday === 0 ? 'closed' : weekday === 6 ? 'saturday' : 'weekday',
        timeBucket: hour >= 7 && hour < 12
            ? 'morning'
            : hour >= 12 && hour < 19
                ? 'afternoon'
                : 'evening',
    };
}

export function getBusStatsRoutePresentation(document, fromPositionCode, destinationCode, at) {
    const startIndex = BUS_POSITION_CODES.indexOf(fromPositionCode);
    if (startIndex < 0 || !getBusStop(destinationCode)) {
        return {kind: 'unavailable'};
    }
    const routeCodes = [];
    for (let offset = 0; offset < BUS_POSITION_CODES.length; offset++) {
        const code = BUS_POSITION_CODES[(startIndex + offset) % BUS_POSITION_CODES.length];
        if (offset > 0 && code === destinationCode) {
            break;
        }
        routeCodes.push(code);
    }
    const positions = Array.isArray(document?.positionDurations)
        ? document.positionDurations
        : [];
    const {dayType, timeBucket} = getStatsTimeContext(at || document?.generatedAt);
    let usedFallback = false;
    const routeStats = routeCodes.map(code => {
        const position = positions.find(item => item.positionCode === code);
        const exact = position?.breakdowns?.find(item =>
            item.dayType === dayType && item.timeBucket === timeBucket,
        );
        if (
            exact?.sampleCount >= BUS_STATS_MINIMUM_SAMPLES
            && Number.isFinite(exact.p50Seconds)
            && Number.isFinite(exact.p75Seconds)
            && Number.isFinite(exact.p90Seconds)
        ) {
            return exact;
        }
        if (
            position?.sampleCount >= BUS_STATS_MINIMUM_SAMPLES
            && Number.isFinite(position.p50Seconds)
            && Number.isFinite(position.p75Seconds)
            && Number.isFinite(position.p90Seconds)
        ) {
            usedFallback = true;
            return position;
        }
        return null;
    });
    if (routeStats.some(item => item === null)) {
        return {
            kind: 'insufficient',
            missingPositionCodes: routeCodes.filter((_code, index) => routeStats[index] === null),
        };
    }
    const total = key => routeStats.reduce((sum, item) => sum + item[key], 0);
    const minimumMinutes = Math.max(1, Math.ceil(total('p50Seconds') / 60));
    const maximumMinutes = Math.max(minimumMinutes, Math.ceil(total('p75Seconds') / 60));
    return {
        kind: 'ready',
        minimumMinutes,
        maximumMinutes,
        p90Minutes: Math.max(maximumMinutes, Math.ceil(total('p90Seconds') / 60)),
        sampleCount: Math.min(...routeStats.map(item => item.sampleCount)),
        confidence: usedFallback ? 'low' : 'high',
        routeCodes,
    };
}

export function sortVehiclesByDestinationEta(vehicles, destinationCode) {
    return [...vehicles].sort((first, second) => {
        const firstEta = getVehicleDestinationEta(first, destinationCode)?.p50Seconds;
        const secondEta = getVehicleDestinationEta(second, destinationCode)?.p50Seconds;
        if (Number.isFinite(firstEta) && Number.isFinite(secondEta)) {
            return firstEta - secondEta;
        }
        if (Number.isFinite(firstEta)) {
            return -1;
        }
        if (Number.isFinite(secondEta)) {
            return 1;
        }
        return first.vehiclePlateNumber.localeCompare(second.vehiclePlateNumber);
    });
}
