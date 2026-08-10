import {
    createFallbackBusLive,
    extractVehiclePlates,
    getBusPosition,
    getBusStatsRoutePresentation,
    getBusStop,
    getEtaDisplay,
    getOfficialNextDeparturePresentation,
    getPositionLabel,
    getVehicleDestinationEta,
    getVehicleDestinationProgress,
    isBusLiveSnapshotFresh,
    isCachedBusLiveUsable,
    normalizeBusLive,
    sortVehiclesByDestinationEta,
} from '../busModel';

describe('busModel', () => {
    test('validates and keeps supported live vehicles', () => {
        const result = normalizeBusLive({
            schemaVersion: 1,
            observedAt: '2026-08-10T08:00:00+08:00',
            vehicles: [
                {vehiclePlateNumber: 'MW-81-74', positionCode: 'PGH_TO_E4'},
                {vehiclePlateNumber: 'UNKNOWN', positionCode: 'UNKNOWN'},
            ],
        });
        expect(result.vehicles).toHaveLength(1);
        expect(result.deliverySource).toBe('live');
    });

    test('rejects an unsupported response', () => {
        expect(() => normalizeBusLive({schemaVersion: 2, vehicles: []})).toThrow();
    });

    test('builds position-only fallback vehicles', () => {
        const result = createFallbackBusLive({
            busPositionArr: [{number: 'MW-81-74', index: 1}],
        }, new Date('2026-08-10T00:00:00.000Z'));
        expect(result.vehicles[0].positionCode).toBe('PGH_TO_E4');
        expect(result.vehicles[0].departureEta).toBeNull();
        expect(result.deliverySource).toBe('fallback');
    });

    test('extracts multiple vehicle plates from one fallback position', () => {
        expect(extractVehiclePlates('MW-81-74 / AB 12 34')).toEqual([
            'MW-81-74',
            'AB-12-34',
        ]);
    });

    test('uses a longer cache window during scheduled idle', () => {
        const now = Date.parse('2026-08-10T00:09:00.000Z');
        expect(isCachedBusLiveUsable({
            observedAt: '2026-08-10T00:00:00.000Z',
            observerMode: 'scheduled_idle',
        }, now)).toBe(true);
        expect(isCachedBusLiveUsable({
            observedAt: '2026-08-10T00:00:00.000Z',
            observerMode: 'active',
        }, now)).toBe(false);
        expect(isCachedBusLiveUsable({
            observedAt: '2026-08-10T00:08:50.000Z',
            deliverySource: 'fallback',
        }, now)).toBe(false);
    });

    test('rejects expired successful live responses so the page can fall back', () => {
        const now = Date.parse('2026-08-10T00:02:10.000Z');
        expect(isBusLiveSnapshotFresh({
            observedAt: '2026-08-10T00:01:30.000Z',
            nextPollAt: '2026-08-10T00:01:35.000Z',
            observerMode: 'active',
            stale: false,
        }, now)).toBe(false);
        expect(isBusLiveSnapshotFresh({
            observedAt: '2026-08-10T00:00:00.000Z',
            nextPollAt: '2026-08-10T00:05:00.000Z',
            observerMode: 'scheduled_idle',
            stale: false,
        }, now)).toBe(true);
        expect(isBusLiveSnapshotFresh({
            observedAt: '2026-08-10T00:01:50.000Z',
            observerMode: 'active',
            stale: true,
        }, now)).toBe(false);
    });

    test('counts ETA down locally without claiming second precision', () => {
        const observedAt = '2026-08-10T00:00:00.000Z';
        expect(getEtaDisplay(
            {p50Seconds: 185, p75Seconds: 220},
            observedAt,
            Date.parse('2026-08-10T00:00:30.000Z'),
        )).toEqual({kind: 'minutes', minimumMinutes: 3, maximumMinutes: 4});
        expect(getEtaDisplay(
            {p50Seconds: 40, p75Seconds: 44},
            observedAt,
            Date.parse(observedAt),
        )).toEqual({kind: 'soon'});
    });

    test('distinguishes an official departure from a loop-service window', () => {
        expect(getOfficialNextDeparturePresentation('下一班：08:45')).toEqual({
            kind: 'departure',
            time: '08:45',
        });
        expect(getOfficialNextDeparturePresentation(
            '下一班：循環行駛 (09:00 - 15:00)',
        )).toEqual({
            kind: 'serviceWindow',
            startTime: '09:00',
            endTime: '15:00',
        });
        expect(getOfficialNextDeparturePresentation(null)).toEqual({kind: 'pending'});
    });

    test('sorts known destination ETAs before unavailable vehicles', () => {
        const vehicles = [
            {vehiclePlateNumber: 'B', destinationEtas: {}},
            {vehiclePlateNumber: 'A', destinationEtas: {E21: {p50Seconds: 120}}},
        ];
        expect(sortVehiclesByDestinationEta(vehicles, 'E21')[0].vehiclePlateNumber).toBe('A');
    });

    test('uses the next-loop ETA when the selected stop is the current position', () => {
        const vehicle = {
            positionCode: 'PGH',
            destinationEtas: {PGH: {p50Seconds: 900, p75Seconds: 960}},
        };
        expect(getVehicleDestinationEta(vehicle, 'PGH')).toEqual({
            p50Seconds: 900,
            p75Seconds: 960,
        });
    });

    test('anchors countdown progress to the destination position within the loop', () => {
        const observedAt = '2026-08-10T00:00:00.000Z';
        const vehicle = {
            destinationEtas: {
                N6: {p50Seconds: 40},
                E11: {p50Seconds: 140},
                N2: {p50Seconds: 900},
            },
        };
        expect(getVehicleDestinationProgress(
            vehicle,
            'N6',
            observedAt,
            Date.parse(observedAt),
        )).toBeCloseTo(1 - 40 / 900);
        expect(getVehicleDestinationProgress(
            vehicle,
            'N6',
            observedAt,
            Date.parse(observedAt) + 30000,
        )).toBeCloseTo(0.98);
    });

    test('formats stop and between-stop positions', () => {
        expect(getPositionLabel('E11')).toBe('E11 工學院、信息學院、理學院');
        expect(getPositionLabel('E11_TO_E21')).toBe('E11 → E21');
    });

    test('anchors every at-stop vehicle position to the station circle', () => {
        ['PGH', 'E4', 'N2', 'N6', 'E11', 'E21', 'E32', 'S4'].forEach(code => {
            expect(getBusPosition(code)).toMatchObject({
                x: getBusStop(code).x,
                y: getBusStop(code).y,
            });
        });
    });

    test('builds a selected-stop reference from matching time-bucket statistics', () => {
        const positionDurations = ['PGH', 'PGH_TO_E4'].map(positionCode => ({
            positionCode,
            sampleCount: 20,
            p50Seconds: 120,
            p75Seconds: 180,
            p90Seconds: 240,
            breakdowns: [{
                dayType: 'weekday',
                timeBucket: 'morning',
                sampleCount: 8,
                p50Seconds: 60,
                p75Seconds: 90,
                p90Seconds: 120,
            }],
        }));
        expect(getBusStatsRoutePresentation(
            {positionDurations},
            'PGH',
            'E4',
            '2026-08-10T23:30:00.000Z',
        )).toMatchObject({
            kind: 'ready',
            minimumMinutes: 2,
            maximumMinutes: 3,
            p90Minutes: 4,
            sampleCount: 8,
            confidence: 'high',
        });
    });

    test('reports insufficient statistics when any route position has too few samples', () => {
        expect(getBusStatsRoutePresentation({
            positionDurations: [{
                positionCode: 'PGH',
                sampleCount: 4,
                p50Seconds: 60,
                p75Seconds: 90,
                p90Seconds: 120,
                breakdowns: [],
            }],
        }, 'PGH', 'E4')).toMatchObject({
            kind: 'insufficient',
            missingPositionCodes: ['PGH', 'PGH_TO_E4'],
        });
    });
});
