import {BUS_STOPS} from './busModel';

// 每個轉角點可附上二次貝茲曲線的控制點，讓路面與車標共用同一條中心線。
const ROUTE_CORNERS = {
    N2: [[275.5, 78], [262.5, 65, 275.5, 65], [160.5, 65], [147.5, 78, 147.5, 65]],
    N6: [[134.5, 137, 147.5, 137], [93.5, 137], [77.5, 153, 77.5, 137]],
    E32: [[77.5, 594], [90.5, 607, 77.5, 607]],
    S4: [[262.5, 607], [275.5, 594, 275.5, 607]],
};

const routeLegs = BUS_STOPS.map((stop, index) => {
    const next = BUS_STOPS[(index + 1) % BUS_STOPS.length];
    const points = [...(ROUTE_CORNERS[stop.code] || []), [next.x, next.y]];
    const samples = [{x: stop.x, y: stop.y, distance: 0}];
    let startX = stop.x;
    let startY = stop.y;

    for (const [x, y, controlX, controlY] of points) {
        const steps = controlX === undefined ? 1 : 8;
        for (let step = 1; step <= steps; step++) {
            const t = step / steps;
            const u = 1 - t;
            const sampleX = steps === 1 ? x : u * u * startX + 2 * u * t * controlX + t * t * x;
            const sampleY = steps === 1 ? y : u * u * startY + 2 * u * t * controlY + t * t * y;
            const previous = samples[samples.length - 1];
            samples.push({
                x: sampleX,
                y: sampleY,
                distance: previous.distance + Math.hypot(sampleX - previous.x, sampleY - previous.y),
            });
        }
        startX = x;
        startY = y;
    }

    return {points, samples};
});

const routeSamples = routeLegs.map(leg => leg.samples);

function getLegCommands(points, routeX) {
    return points.map(([x, y, controlX, controlY]) => (
        controlX === undefined
            ? `L${routeX(x)} ${y}`
            : `Q${routeX(controlX)} ${controlY} ${routeX(x)} ${y}`
    ));
}

export function getBusRoutePath(routeX) {
    const firstStop = BUS_STOPS[0];
    const commands = routeLegs.flatMap(leg => getLegCommands(leg.points, routeX));
    return `M${routeX(firstStop.x)} ${firstStop.y} ${commands.join(' ')} Z`;
}

export function getBusRouteLegPath(legIndex, routeX) {
    const stop = BUS_STOPS[legIndex];
    const commands = getLegCommands(routeLegs[legIndex].points, routeX);
    return `M${routeX(stop.x)} ${stop.y} ${commands.join(' ')}`;
}

// 整數代表站點，小數是由這一站出發的路段進度。
export function getBusRoutePoint(location, distanceOffset = 0, anchorOffset = 0) {
    'worklet';
    const legIndex = Math.floor(location);
    const samples = routeSamples[legIndex];
    const length = samples[samples.length - 1].distance;
    const anchorDistance = Math.max(0, Math.min(length, (location - legIndex) * length + anchorOffset));
    const distance = Math.max(0, Math.min(length, anchorDistance + distanceOffset));
    let index = 1;
    while (samples[index].distance < distance) {
        index++;
    }
    const from = samples[index - 1];
    const to = samples[index];
    const t = (distance - from.distance) / (to.distance - from.distance);
    return {x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t};
}
