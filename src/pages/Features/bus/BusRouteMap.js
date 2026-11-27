import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {StyleSheet, useWindowDimensions, View} from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, G, Path, Rect, Text as SvgText} from 'react-native-svg';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import {uiStyle} from '../../../components/ThemeContext';
import {useAppReducedMotion} from '../../../contexts/ReducedMotionContext';
import {trigger} from '../../../utils/trigger';
import {
    BUS_POSITION_CODES,
    BUS_STOPS,
    getBusStop,
    getVehicleDestinationEta,
    getVehicleDestinationProgress,
    getVehicleTransitMotionPlan,
    sortVehiclesByDestinationEta,
} from './busModel';
import {getBusRouteLegPath, getBusRoutePath, getBusRoutePoint} from './busRouteGeometry';

const MAP_WIDTH = 354;
const MAP_HEIGHT = 654;
const MAP_DISPLAY_WIDTH = 310;
const MAP_MAX_DISPLAY_WIDTH = 420;
const MAP_MAX_CANVAS_WIDTH = 520;
const WEST_WING = 'M0 0 H91 V18 H100 V78 H77 V100 H0 V67 H9 V28 H0 Z';
const EAST_WING = 'M9 0 H100 V28 H91 V67 H100 V100 H23 V78 H0 V18 H9 Z';
const COURTYARD = 'M0 0 H100 V100 H0 Z M32 30 H68 V70 H32 Z';
const WEST_CAMPUS_BLOCKS = [
    {labels: [['W12', 'CKYC']], x: 0.02, y: 150, width: 0.45, height: 54, outline: WEST_WING},
    {labels: [['W11', 'MCMC']], x: 0.53, y: 150, width: 0.45, height: 54, outline: EAST_WING},
    {labels: [['W14', 'FPJC']], x: 0.02, y: 212, width: 0.45, height: 55, outline: EAST_WING},
    {labels: [['W13', 'SEAC']], x: 0.53, y: 212, width: 0.45, height: 55, outline: WEST_WING},
    {
        labels: [['W22', 'LCWC'], ['W21', 'CKPC']],
        x: 0.02, y: 292, width: 0.96, height: 57,
        outline: 'M0 0 H100 V33 H89 V49 H97 V87 H63 V100 H2 V62 H12 V47 H0 Z',
    },
    {
        labels: [['W23', 'CYTC']],
        x: 0.02, y: 357, width: 0.88, height: 54,
        outline: 'M0 0 H88 V17 H100 V80 H70 V100 H5 V63 H15 V32 H0 Z',
    },
    {labels: [['W32']], x: 0.02, y: 436, width: 0.45, height: 44, outline: WEST_WING},
    {labels: [['W31']], x: 0.53, y: 436, width: 0.45, height: 44, outline: EAST_WING},
    {labels: [['W34', 'CKLC']], x: 0.02, y: 488, width: 0.45, height: 55, outline: EAST_WING},
    {labels: [['W33', 'MLC']], x: 0.53, y: 488, width: 0.45, height: 55, outline: WEST_WING},
];
const CAMPUS_BUILDINGS = [
    {code: 'N25', x: 156, y: 12, width: 26, height: 19},
    {code: 'N24', x: 197, y: 12, width: 44, height: 22, outline: WEST_WING},
    {code: 'N23', x: 247, y: 12, width: 42, height: 18},
    {code: 'N22', x: 121, y: 31, width: 34, height: 24, outline: COURTYARD},
    {code: 'N21', x: 247, y: 35, width: 42, height: 17},
    {code: 'N8', x: 114, y: 64, width: 39, height: 37, outline: EAST_WING},
    {code: 'N6', x: 174, y: 110, width: 39, height: 27, outline: WEST_WING, station: true},
    {code: 'N2', x: 232, y: 87, width: 53, height: 35, outline: EAST_WING, station: true},
    {code: 'N1', x: 232, y: 130, width: 48, height: 20},
    {code: 'E11', x: 122, y: 174, width: 48, height: 42, outline: COURTYARD, station: true},
    {code: 'E12', x: 114, y: 228, width: 42, height: 43, outline: WEST_WING},
    {code: 'E1', x: 240, y: 258, width: 26, height: 22},
    {code: 'E21A', x: 124, y: 287, width: 36, height: 27, outline: EAST_WING},
    {code: 'E21B', x: 121, y: 321, width: 36, height: 25, outline: EAST_WING},
    {code: 'E22', x: 122, y: 355, width: 49, height: 38, outline: WEST_WING},
    {code: 'E7', x: 198, y: 321, width: 38, height: 19},
    {code: 'E3', x: 242, y: 321, width: 38, height: 19},
    {code: 'E6', x: 198, y: 347, width: 36, height: 24, outline: WEST_WING},
    {code: 'E4', x: 242, y: 347, width: 34, height: 19, station: true},
    {code: 'E5', x: 222, y: 375, width: 60, height: 26, outline: EAST_WING},
    {code: 'E31', x: 150, y: 417, width: 61, height: 23, outline: EAST_WING},
    {code: 'E32', x: 126, y: 448, width: 50, height: 25, station: true},
    {code: 'E33', x: 162, y: 477, width: 47, height: 34, outline: WEST_WING},
    {code: 'E34', x: 113, y: 487, width: 35, height: 39, outline: EAST_WING},
    {code: 'S1', x: 245, y: 518, width: 29, height: 26},
    {code: 'S2', x: 202, y: 528, width: 32, height: 24},
    {code: 'S8', x: 158, y: 558, width: 33, height: 24},
    {code: 'S4', x: 202, y: 558, width: 37, height: 27, outline: EAST_WING, station: true},
    {code: 'S3', x: 245, y: 558, width: 31, height: 26},
];
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SHUTTLE_IMAGE = require('../../../static/img/Bus/campus-shuttle-marker.png');
const VEHICLE_GLIDE_EASING = Easing.linear;

const CountdownBorder = ({arrived, color, countdownKey, deadlineAt, initialProgress, radius, visible}) => {
    const [layout, setLayout] = useState({width: 0, height: 0});
    const countdownKeyRef = useRef(null);
    const progress = useSharedValue(initialProgress);
    const inset = 1.5;
    const width = Math.max(0, layout.width - inset * 2);
    const height = Math.max(0, layout.height - inset * 2);
    const cornerRadius = Math.max(0, Math.min(radius - inset, width / 2, height / 2));
    const perimeter = Math.max(
        1,
        2 * (width + height - 4 * cornerRadius) + 2 * Math.PI * cornerRadius,
    );
    const path = [
        `M ${inset + width} ${inset + height / 2}`,
        `L ${inset + width} ${inset + height - cornerRadius}`,
        `Q ${inset + width} ${inset + height} ${inset + width - cornerRadius} ${inset + height}`,
        `L ${inset + cornerRadius} ${inset + height}`,
        `Q ${inset} ${inset + height} ${inset} ${inset + height - cornerRadius}`,
        `L ${inset} ${inset + cornerRadius}`,
        `Q ${inset} ${inset} ${inset + cornerRadius} ${inset}`,
        `L ${inset + width - cornerRadius} ${inset}`,
        `Q ${inset + width} ${inset} ${inset + width} ${inset + cornerRadius}`,
        'Z',
    ].join(' ');
    const animatedProps = useAnimatedProps(() => ({
        strokeDashoffset: perimeter * (1 - progress.value),
    }));

    useEffect(() => {
        cancelAnimation(progress);
        if (!visible) {
            countdownKeyRef.current = null;
            progress.value = 0;
            return;
        }
        const isNewCountdown = countdownKeyRef.current !== countdownKey;
        countdownKeyRef.current = countdownKey;
        if (isNewCountdown) {
            progress.value = initialProgress;
        }
        if (arrived) {
            progress.value = 1;
            return;
        }
        const currentTime = Date.now();
        const remainingMs = Math.max(0, deadlineAt - currentTime);
        const currentProgress = progress.value;
        const correctionDuration = !isNewCountdown && currentProgress < initialProgress
            ? Math.min(2000, remainingMs)
            : 0;
        progress.value = correctionDuration > 0
            ? withSequence(
                withTiming(initialProgress, {duration: correctionDuration}),
                withTiming(0.98, {duration: Math.max(0, remainingMs - correctionDuration)}),
            )
            : withTiming(0.98, {duration: remainingMs});
    }, [arrived, countdownKey, deadlineAt, initialProgress, progress, visible]);

    return (
        <View
            pointerEvents="none"
            onLayout={event => setLayout(event.nativeEvent.layout)}
            style={StyleSheet.absoluteFill}>
            {visible && width > 0 && height > 0 ? (
                <Svg width="100%" height="100%">
                    <AnimatedPath
                        animatedProps={animatedProps}
                        d={path}
                        fill="none"
                        stroke={color}
                        strokeDasharray={`${perimeter} ${perimeter}`}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                    />
                </Svg>
            ) : null}
        </View>
    );
};

const VehicleMarker = ({accentColor, motionEnabled, observedAt, onSelect, positionIndex, selected, statsDocument, styles, svgScale, xOrigin, xScale, vehicle}) => {
    const legIndex = Math.floor(positionIndex / 2);
    const inTransit = positionIndex % 2 === 1;
    const reportedLocation = positionIndex / 2;
    const location = useSharedValue(reportedLocation);
    const roadAccent = useSharedValue(0);
    const arrival = useSharedValue(1);
    const lastPositionIndex = useRef(null);
    const latestVehicleRef = useRef(vehicle);
    const latestObservedAtRef = useRef(observedAt);
    const latestStatsRef = useRef(statsDocument);
    latestVehicleRef.current = vehicle;
    latestObservedAtRef.current = observedAt;
    latestStatsRef.current = statsDocument;
    const offset = vehicle.offset;
    const stop = BUS_STOPS[legIndex];
    const facingRight = BUS_STOPS[(legIndex + 1) % BUS_STOPS.length].x > stop.x;

    useLayoutEffect(() => {
        const previous = lastPositionIndex.current;
        lastPositionIndex.current = positionIndex;
        arrival.set(1);
        roadAccent.set(0);
        if (!inTransit || !motionEnabled) {
            location.set(reportedLocation);
            if (motionEnabled && previous !== null && previous !== positionIndex) {
                arrival.set(0);
                arrival.set(withTiming(1, {duration: 300}));
            }
            return;
        }

        // 依據路段平均統計與即時 ETA 勻速推進；到達站前緩衝點後持續緩慢移動並保留尾跡，直到確認到站。
        const plan = getVehicleTransitMotionPlan({
            vehicle: latestVehicleRef.current,
            positionIndex,
            previousPositionIndex: previous,
            statsDocument: latestStatsRef.current,
            observedAt: latestObservedAtRef.current,
        });
        location.set(plan.startLocation);
        roadAccent.set(withTiming(1, {duration: 180}));
        location.set(withSequence(
            withTiming(plan.targetLocation, {
                duration: plan.durationMs,
                easing: VEHICLE_GLIDE_EASING,
            }),
            withTiming(plan.creepTargetLocation, {
                duration: plan.creepDurationMs,
                easing: VEHICLE_GLIDE_EASING,
            }),
        ));
        return () => {
            cancelAnimation(location);
            cancelAnimation(roadAccent);
        };
    }, [arrival, inTransit, location, motionEnabled, positionIndex, reportedLocation, roadAccent]);

    const animatedPosition = useAnimatedStyle(() => {
        const point = getBusRoutePoint(location.get());
        return {
            transform: [
                {translateX: xOrigin + (point.x + offset) * xScale},
                {translateY: point.y * svgScale},
            ],
        };
    });
    const animatedBody = useAnimatedStyle(() => {
        const strength = roadAccent.get();
        const progress = location.get();
        let tilt = 0;
        if (strength > 0 && progress % 1 > 0) {
            const point = getBusRoutePoint(progress);
            const before = getBusRoutePoint(progress, -8);
            const after = getBusRoutePoint(progress, 8);
            const incoming = Math.atan2((point.y - before.y) * svgScale, (point.x - before.x) * xScale);
            const outgoing = Math.atan2((after.y - point.y) * svgScale, (after.x - point.x) * xScale);
            const turn = outgoing - incoming;
            tilt = Math.atan2(Math.sin(turn), Math.cos(turn)) * 12 * strength;
        }
        return {transform: [{rotate: `${tilt}deg`}, {scaleX: facingRight ? -1 : 1}]};
    });
    const animatedRoadAccent = useAnimatedProps(() => {
        const opacity = roadAccent.get() * 0.9;
        if (opacity === 0) {
            return {d: 'M0 0', opacity};
        }
        const progress = location.get();
        let path = '';
        for (let distance = -52; distance <= 0; distance += 4) {
            const point = getBusRoutePoint(progress, distance);
            path += `${distance === -52 ? 'M' : 'L'}${xOrigin + point.x * xScale} ${point.y * svgScale} `;
        }
        return {d: path, opacity};
    });
    const animatedArrival = useAnimatedProps(() => {
        const progress = arrival.get();
        return {r: (6 + 7 * progress) * svgScale, opacity: (1 - progress) * 0.8};
    });

    return (
        <>
            {motionEnabled ? (
                <Svg pointerEvents="none" style={StyleSheet.absoluteFill} width="100%" height="100%">
                    {inTransit ? (
                        <AnimatedPath
                            animatedProps={animatedRoadAccent}
                            d="M0 0"
                            fill="none"
                            stroke={accentColor}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={6.5 * svgScale}
                        />
                    ) : (
                        <AnimatedCircle
                            animatedProps={animatedArrival}
                            cx={xOrigin + stop.x * xScale}
                            cy={stop.y * svgScale}
                            fill="none"
                            stroke={accentColor}
                            strokeWidth={2 * svgScale}
                        />
                    )}
                </Svg>
            ) : null}
            <Animated.View style={[styles.vehicleAnchor, animatedPosition]}>
                <ScalePressable
                    accessibilityRole="button"
                    accessibilityLabel={vehicle.accessibilityLabel}
                    accessibilityState={{selected}}
                    onPressIn={() => {
                        trigger();
                    }}
                    onPress={() => {
                        onSelect(vehicle.vehiclePlateNumber);
                    }}
                    style={styles.vehicle}>
                    <Animated.Image
                        accessible={false}
                        resizeMode="contain"
                        source={SHUTTLE_IMAGE}
                        style={[styles.vehicleImage, animatedBody]}
                    />
                    <View style={[styles.vehiclePin, selected && styles.vehiclePinSelected]} />
                    {vehicle.countAtPosition > 1 && vehicle.groupIndex === 0 ? (
                        <View style={styles.vehicleCount}>
                            <Text style={styles.vehicleCountText}>
                                {vehicle.countAtPosition}
                            </Text>
                        </View>
                    ) : null}
                </ScalePressable>
            </Animated.View>
        </>
    );
};

const BusRouteMap = ({
    countdownEnabled,
    maxHeight,
    motionEnabled,
    observedAt,
    onSelectStop,
    onSelectVehicle,
    selectedStop,
    selectedVehiclePlate,
    statsDocument,
    theme,
    translate,
    vehicles,
}) => {
    const {height: windowHeight, width: windowWidth} = useWindowDimensions();
    const reducedMotion = useAppReducedMotion();
    const availableWidth = windowWidth - 24;
    const minimumReadableWidth = Math.min(
        Math.min(windowHeight, windowWidth) >= 600 ? MAP_MAX_DISPLAY_WIDTH : MAP_DISPLAY_WIDTH,
        availableWidth,
    );
    const heightConstrainedWidth = maxHeight === null
        ? MAP_MAX_DISPLAY_WIDTH
        : maxHeight * MAP_WIDTH / MAP_HEIGHT;
    const routeDisplayWidth = Math.min(
        MAP_MAX_DISPLAY_WIDTH,
        availableWidth,
        Math.max(minimumReadableWidth, heightConstrainedWidth),
    );
    const mapDisplayWidth = Math.min(windowWidth, MAP_MAX_CANVAS_WIDTH);
    const mapScale = routeDisplayWidth / MAP_DISPLAY_WIDTH;
    const svgScale = routeDisplayWidth / MAP_WIDTH;
    const viewBoxWidth = mapDisplayWidth / svgScale;
    const sideInset = (viewBoxWidth - MAP_WIDTH) / 2;
    // 按兩側多出的寬度展開路線，並用同一套座標放置站點和車標。
    const horizontalScale = 1 + Math.min(sideInset / 165, 0.36);
    const routeX = value => 132 + (value - 132) * horizontalScale;
    const mapX = value => (routeX(value) + sideInset) * svgScale;
    const westBlockLeft = 9 - sideInset;
    const westBlockWidth = Math.min(104, routeX(77.5) - westBlockLeft - 16);
    const westLabelSize = Math.min(11, westBlockWidth / 6.5);
    const terminalX = routeX(275.5);
    const libraryX = routeX(193);
    const southCollegeX = routeX(116);
    const stadiumX = routeX(53);
    const routePath = getBusRoutePath(routeX);
    const routeArrows = [
        `M${routeX(198)} 62.25 l-3.5 2.75 3.5 2.75`,
        ...[164, 268, 418].map(y => `M${routeX(77.5) - 2.75} ${y} l2.75 3.5 2.75 -3.5`),
        `M${routeX(163)} 604.25 l3.5 2.75 -3.5 2.75`,
        ...[476, 289, 152].map(y => `M${terminalX - 2.75} ${y} l2.75 -3.5 2.75 3.5`),
    ].join(' ');
    const {
        black,
        disabled,
        featuresScreen,
        floatingShadow,
        pressOverlay,
        secondThemeColor,
        successForeground,
        tonal,
        white,
    } = theme;
    const styles = useMemo(() => StyleSheet.create({
        container: {
            alignSelf: 'center',
            position: 'relative',
        },
        route: {
            position: 'absolute',
            width: '100%',
            height: '100%',
        },
        // 標籤槽與偏移一律跟 mapScale，避免固定像素在矮屏／Android 上相對變大而遮建築。
        stopLabel: {
            width: 44 * mapScale,
            height: 36 * mapScale,
            alignItems: 'center',
            justifyContent: 'center',
        },
        stopBadge: {
            width: 34 * mapScale,
            height: 22 * mapScale,
            borderRadius: 8 * mapScale,
            backgroundColor: white,
            borderWidth: 1,
            borderColor: pressOverlay,
            alignItems: 'center',
            justifyContent: 'center',
            ...floatingShadow,
        },
        stopLabelAnchor: {
            position: 'absolute',
        },
        stopLabelText: {
            ...uiStyle.defaultText,
            fontSize: 11 * mapScale,
            fontWeight: '700',
            textAlign: 'center',
            includeFontPadding: false,
        },
        vehicleAnchor: {
            position: 'absolute',
            left: 0,
            top: 0,
            marginLeft: -22,
            marginTop: -34,
        },
        vehicle: {
            width: 44,
            height: 44,
            alignItems: 'center',
        },
        vehicleImage: {
            width: 44,
            height: 29,
        },
        vehiclePin: {
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: white,
            backgroundColor: secondThemeColor,
        },
        vehiclePinSelected: {
            borderColor: black.main,
        },
        vehicleCount: {
            position: 'absolute',
            right: -5,
            top: -3,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 3,
            borderRadius: 9,
            backgroundColor: black.main,
            alignItems: 'center',
            justifyContent: 'center',
        },
        vehicleCountText: {
            ...uiStyle.defaultText,
            color: white,
            fontSize: 9,
            fontWeight: '700',
        },
    }), [black.main, floatingShadow, mapScale, pressOverlay, secondThemeColor, white]);

    // 巴士目前停在站點上的站碼集合（positionCode 等於站點碼）
    const arrivedStopCodes = useMemo(() => {
        const codes = new Set();
        vehicles.forEach(vehicle => {
            if (getBusStop(vehicle.positionCode)) {
                codes.add(vehicle.positionCode);
            }
        });
        return codes;
    }, [vehicles]);

    const vehicleItems = useMemo(() => {
        const groups = vehicles.reduce((result, vehicle) => {
            const current = result[vehicle.positionCode] || [];
            current.push(vehicle);
            result[vehicle.positionCode] = current;
            return result;
        }, {});
        return vehicles.map(vehicle => {
            const group = groups[vehicle.positionCode];
            const groupIndex = group.indexOf(vehicle);
            const offset = (groupIndex - (group.length - 1) / 2) * 16;
            return {
                ...vehicle,
                accessibilityLabel: translate('查看巴士 {{plate}}', {plate: vehicle.vehiclePlateNumber}),
                countAtPosition: group.length,
                groupIndex,
                offset,
                positionIndex: BUS_POSITION_CODES.indexOf(vehicle.positionCode),
            };
        });
    }, [translate, vehicles]);
    const activeRouteLegs = useMemo(() => {
        const legs = new Set();
        if (motionEnabled) {
            vehicleItems.forEach(({positionIndex}) => {
                if (positionIndex % 2 === 1) {
                    legs.add(Math.floor(positionIndex / 2));
                }
            });
        }
        return [...legs];
    }, [motionEnabled, vehicleItems]);

    const selectedStopCountdown = useMemo(() => {
        if (!countdownEnabled || !selectedStop) {
            return null;
        }
        if (vehicles.some(vehicle => vehicle.positionCode === selectedStop)) {
            return {arrived: true, deadlineAt: 0, initialProgress: 1};
        }
        const observedTime = Date.parse(observedAt || '');
        if (!Number.isFinite(observedTime)) {
            return null;
        }
        const headingVehicle = sortVehiclesByDestinationEta(vehicles, selectedStop).find(vehicle => {
            const eta = getVehicleDestinationEta(vehicle, selectedStop);
            return Number.isFinite(eta?.p50Seconds);
        });
        const eta = headingVehicle
            ? getVehicleDestinationEta(headingVehicle, selectedStop)
            : null;
        return eta
            ? {
                arrived: false,
                countdownKey: `${selectedStop}:${headingVehicle.vehiclePlateNumber}`,
                deadlineAt: observedTime + eta.p50Seconds * 1000,
                initialProgress: getVehicleDestinationProgress(
                    headingVehicle,
                    selectedStop,
                    observedAt,
                ),
            }
            : null;
    }, [countdownEnabled, observedAt, selectedStop, vehicles]);

    return (
        <View
            style={[
                styles.container,
                {
                    width: mapDisplayWidth,
                    height: svgScale * MAP_HEIGHT,
                },
            ]}>
            <Svg
                pointerEvents="none"
                preserveAspectRatio="xMidYMid meet"
                style={styles.route}
                viewBox={`${-sideInset} 0 ${viewBoxWidth} ${MAP_HEIGHT}`}>
                {/* 校園地標與水岸以示意方式疊在同一組路線座標上 */}
                <G transform={`translate(${sideInset} 0)`}>
                    <Path
                        d="M304 142 C309 136 317 143 317 155 C316 171 309 187 308 203 C307 216 298 216 296 204 C293 188 298 161 304 142 Z M307 285 C311 277 320 284 319 295 C317 312 319 327 315 340 C312 350 303 350 302 338 C301 325 302 299 307 285 Z M308 436 C313 426 321 434 320 446 C318 466 323 484 318 500 C313 511 305 505 305 492 C306 472 301 452 308 436 Z"
                        fill={tonal.success15}
                    />
                    <G fill={tonal.success30}>
                        <Circle cx="307" cy="157" r="3.5" />
                        <Circle cx="302" cy="178" r="4" />
                        <Circle cx="311" cy="302" r="3.5" />
                        <Circle cx="309" cy="329" r="3" />
                        <Circle cx="313" cy="452" r="4" />
                        <Circle cx="312" cy="479" r="3.5" />
                    </G>
                    <Path
                        d="M338 0 H354 V654 H323 C331 601 316 565 324 510 C334 435 316 409 322 332 C327 259 306 230 318 162 C326 111 339 64 338 0 Z"
                        fill={tonal.primary15}
                    />
                    <Path
                        d="M337 82 C331 154 316 181 322 231 M331 373 C324 413 340 458 331 506"
                        fill="none"
                        stroke={tonal.primary50}
                        strokeLinecap="round"
                        strokeWidth="1.5"
                    />
                    <Path
                        d="M325 19 V8 M321 12 L325 8 L329 12"
                        fill="none"
                        stroke={black.third}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.4"
                    />
                    {/* 巴士圖示與「往橫琴口岸」同一行 */}
                    <G
                        fill="none"
                        stroke={black.third}
                        strokeWidth="1.4"
                        strokeLinecap="round"
                        strokeLinejoin="round">
                        <Rect x="248" y="6" width="14" height="13" rx="2.5" />
                        <Path d="M248.5 12 H261.5 M251.5 19 V21 M259.5 19 V21" />
                    </G>
                    <SvgText x="316" y="17" fill={black.third} fontSize="10" textAnchor="end">
                        {translate('往橫琴口岸')}
                    </SvgText>
                </G>
                <G transform={`translate(${routeX(0)} 0) scale(${horizontalScale} 1)`}>
                    <Path
                        d="M35 111 C44 102 56 104 62 108 C68 112 76 106 84 111 C92 117 88 127 79 129 C67 132 63 125 53 125 C44 126 29 123 35 111 Z M153 181 C161 168 183 166 189 177 C192 189 178 194 164 196 C154 198 148 190 153 181 Z M211 171 C221 158 241 157 253 167 C261 176 253 183 257 196 C261 207 248 220 237 214 C227 209 225 197 216 193 C207 189 205 180 211 171 Z M247 451 C255 443 265 454 266 467 C266 480 262 500 251 503 C240 506 245 492 249 478 C252 467 241 458 247 451 Z"
                        fill={tonal.success15}
                    />
                    <G fill={tonal.success30}>
                        <Circle cx="47" cy="114" r="4" />
                        <Circle cx="54" cy="118" r="3" />
                        <Circle cx="76" cy="119" r="4" />
                        <Circle cx="165" cy="181" r="3.5" />
                        <Circle cx="225" cy="173" r="4" />
                        <Circle cx="233" cy="176" r="3.5" />
                        <Circle cx="245" cy="198" r="4.5" />
                        <Circle cx="257" cy="465" r="4" />
                        <Circle cx="255" cy="487" r="3.5" />
                    </G>
                    <Path
                        d="M163 203 C179 191 197 198 207 217 C213 227 224 225 228 242 C232 263 215 270 197 269 C183 268 169 269 165 287 C163 302 171 319 168 337 C166 356 169 376 185 394 C203 414 206 427 206 446 C207 460 236 449 243 466 C254 492 231 512 212 507 C193 501 201 481 190 462 C178 444 190 419 177 401 C161 385 154 366 157 344 C160 322 150 307 151 282 C151 261 141 246 147 230 C152 220 158 216 163 203 Z"
                        fill={tonal.primary15}
                    />
                    <Path
                        d="M164 231 Q174 227 186 231 T207 231 M180 248 Q190 244 201 248 T219 248 M210 475 Q220 471 231 475"
                        fill="none"
                        stroke={tonal.primary50}
                        strokeLinecap="round"
                        strokeWidth="1.5"
                    />
                </G>
                <G fill={tonal.success15}>
                    {/* N9 體育場：直道＋兩端半圓的膠囊形跑道（rx=半寬），非純橢圓 */}
                    <Rect x={stadiumX - 22} y="26" width="44" height="66" rx="22" ry="22" />
                    <Rect x={westBlockLeft + westBlockWidth * 0.09} y="276" width={westBlockWidth * 0.8} height="9" rx="3" />
                    <Rect x={westBlockLeft + westBlockWidth * 0.05} y="417" width={westBlockWidth * 0.85} height="8" rx="3" />
                </G>
                <G transform={`translate(${westBlockLeft} 0) scale(${westBlockWidth / 100} 1)`}>
                    <Path
                        d="M8 561 C18 551 29 553 43 556 C56 560 66 552 83 555 C97 558 100 574 92 583 C84 593 66 590 54 592 C39 595 26 590 14 587 C4 584 0 571 8 561 Z"
                        fill={tonal.success15}
                    />
                    <G fill={tonal.success30}>
                        <Circle cx="24" cy="281" r="3.5" />
                        <Circle cx="70" cy="280" r="4" />
                        <Circle cx="28" cy="421" r="3" />
                        <Circle cx="78" cy="421" r="3.5" />
                        <Circle cx="19" cy="572" r="4" />
                        <Circle cx="31" cy="577" r="5" />
                        <Circle cx="74" cy="566" r="4" />
                        <Circle cx="82" cy="572" r="3.5" />
                    </G>
                </G>
                <Rect x={libraryX - 25} y="282" width="50" height="32" rx="5" fill={featuresScreen.divider} stroke={pressOverlay} />
                <G fill="none" stroke={black.third} strokeWidth="1.3" opacity={0.45}>
                    <Rect x={stadiumX - 18} y="30" width="36" height="58" rx="18" ry="18" />
                    <Rect x={stadiumX - 11} y="40" width="22" height="38" rx="1.5" />
                    <Path d={`M${stadiumX - 11} 59 H${stadiumX + 11}`} />
                    <Circle cx={stadiumX} cy="59" r="3.5" />
                    <Circle cx={libraryX + 12} cy="293" r="6" />
                </G>
                {CAMPUS_BUILDINGS.map(({code, x, y, width, height, outline, station}) => {
                    const centerX = routeX(x);
                    const blockWidth = width * horizontalScale;
                    const left = centerX - blockWidth / 2;
                    return (
                        <G key={code} fill={featuresScreen.divider} stroke={pressOverlay}>
                            {outline ? (
                                <Path d={outline} transform={`translate(${left} ${y}) scale(${blockWidth / 100} ${height / 100})`} fillRule="evenodd" strokeWidth="1.8" strokeLinejoin="round" />
                            ) : (
                                <Rect x={left} y={y} width={blockWidth} height={height} rx="2" />
                            )}
                            {station ? null : (
                                <SvgText x={centerX} y={y + height / 2 + 3.5} fill={black.third} opacity={0.65} stroke="none" fontSize="10" fontWeight="600" textAnchor="middle">
                                    {code}
                                </SvgText>
                            )}
                        </G>
                    );
                })}
                <SvgText x={stadiumX} y="72" fill={black.third} opacity={0.65} fontSize="10" fontWeight="600" textAnchor="middle">
                    N9
                </SvgText>
                {WEST_CAMPUS_BLOCKS.map(({labels, x, y, width, height, outline}) => {
                    const left = westBlockLeft + x * westBlockWidth;
                    const blockWidth = width * westBlockWidth;
                    const centerY = y + height / 2;
                    return (
                        <G key={labels[0][0]}>
                            <Path
                                d={outline}
                                transform={`translate(${left} ${y}) scale(${blockWidth / 100} ${height / 100})`}
                                fill={tonal.primary15}
                                stroke={pressOverlay}
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                            />
                            {labels.map(([code, abbreviation], index) => {
                                const labelX = left + blockWidth * (index + 0.5) / labels.length;
                                return (
                                    <React.Fragment key={code}>
                                        <SvgText
                                            x={labelX}
                                            y={abbreviation ? centerY - 1 : centerY + westLabelSize / 3}
                                            fill={black.third}
                                            opacity={0.75}
                                            fontSize={westLabelSize}
                                            fontWeight="600"
                                            textAnchor="middle">
                                            {code}
                                        </SvgText>
                                        {abbreviation ? (
                                            <SvgText x={labelX} y={centerY + westLabelSize + 1} fill={black.third} opacity={0.55} fontSize={westLabelSize - 1} textAnchor="middle">
                                                {abbreviation}
                                            </SvgText>
                                        ) : null}
                                    </React.Fragment>
                                );
                            })}
                        </G>
                    );
                })}
                <G transform={`translate(${southCollegeX} 0)`}>
                    <Path d="M-18 542 H9 V549 H18 V584 H-18 V575 H-12 V556 H-18 Z" fill={tonal.primary15} stroke={pressOverlay} />
                    <SvgText x="0" y="567" fill={black.third} opacity={0.75} fontSize="10" fontWeight="600" textAnchor="middle">
                        S9 SPC
                    </SvgText>
                </G>
                <SvgText x={libraryX - 3} y="305" fill={black.third} opacity={0.65} fontSize="10" fontWeight="600" textAnchor="middle">
                    E2
                </SvgText>
                <G fill="none" strokeLinecap="round" strokeLinejoin="round">
                    <Path d={routePath} stroke={black.main} strokeOpacity={0.08} strokeWidth="15" transform="translate(0 1.5)" />
                    <Path d={routePath} stroke={disabled} strokeWidth="12" />
                    <Path d={routePath} stroke={white} strokeWidth="9.5" />
                    {activeRouteLegs.map(legIndex => (
                        <Path
                            key={legIndex}
                            d={getBusRouteLegPath(legIndex, routeX)}
                            stroke={secondThemeColor}
                            strokeOpacity={0.3}
                            strokeWidth="9.5"
                        />
                    ))}
                    <Path d={routePath} stroke={disabled} strokeWidth="1.25" strokeDasharray="4 5" />
                    <Path d={routeArrows} stroke={white} strokeWidth="3.5" />
                    <Path d={routeArrows} stroke={black.third} strokeWidth="1.35" opacity={0.75} />
                </G>
                {BUS_STOPS.map(stop => {
                    const selected = selectedStop === stop.code;
                    const arrived = arrivedStopCodes.has(stop.code);
                    const stopColor = arrived ? secondThemeColor : selected ? successForeground : black.second;
                    return (
                        <Circle
                            key={stop.code}
                            cx={routeX(stop.x)}
                            cy={stop.y}
                            fill={selected || arrived ? stopColor : white}
                            r={selected || arrived ? 8.5 : 6.5}
                            stroke={selected || arrived ? white : stopColor}
                            strokeWidth={selected || arrived ? 2.5 : 2}
                        />
                    );
                })}
            </Svg>

            {BUS_STOPS.map(stop => {
                const selected = selectedStop === stop.code;
                const arrived = arrivedStopCodes.has(stop.code);
                const labelOverlay = selected ? tonal.success15 : arrived ? tonal.secondary15 : undefined;
                const labelBorder = selected
                    ? (selectedStopCountdown ? 'transparent' : successForeground)
                    : arrived
                        ? secondThemeColor
                        : pressOverlay;
                const labelForeground = selected ? successForeground : black.main;
                const x = mapX(stop.x);
                const y = stop.y * svgScale;
                const labelSlot = 44 * mapScale;
                const labelHalf = labelSlot / 2;
                const labelHeight = 36 * mapScale;
                // 選中圓半徑 8.5 map 單位，螢幕上再留 2px，避免白底站碼壓住點位。
                const stopClearance = 8.5 * svgScale + 2;
                const verticalGap = labelHeight / 2;
                const anchorStyle = stop.labelSide === 'right'
                    ? {left: x + stopClearance, top: y - verticalGap}
                    : stop.labelSide === 'bottom'
                        ? {left: x - labelHalf, top: y + stopClearance}
                        : stop.labelSide === 'top'
                            ? {left: x - labelHalf, top: y - stopClearance - labelHeight, zIndex: 2}
                            : {right: mapDisplayWidth - x + stopClearance, top: y - verticalGap};
                const labelAlignment = stop.labelSide === 'right'
                    ? {alignItems: 'flex-start'}
                    : stop.labelSide === 'bottom'
                        ? {justifyContent: 'flex-start'}
                        : stop.labelSide === 'top'
                            ? {justifyContent: 'flex-end'}
                            : {alignItems: 'flex-end'};
                return (
                    <View key={stop.code} style={[styles.stopLabelAnchor, anchorStyle]}>
                        <ScalePressable
                            accessibilityRole="button"
                            accessibilityLabel={translate('選擇車站 {{station}}', {
                                station: `${stop.code} ${translate(stop.name)}`,
                            })}
                            accessibilityState={{selected}}
                            onPressIn={() => {
                                trigger();
                            }}
                            onPress={() => {
                                onSelectStop(stop.code);
                            }}
                            style={[styles.stopLabel, labelAlignment]}>
                            <View style={[styles.stopBadge, {borderColor: labelBorder}]}>
                                {labelOverlay ? (
                                    <View
                                        pointerEvents="none"
                                        style={[
                                            StyleSheet.absoluteFill,
                                            {backgroundColor: labelOverlay, borderRadius: 8 * mapScale},
                                        ]}
                                    />
                                ) : null}
                                {selected ? (
                                    <CountdownBorder
                                        arrived={Boolean(selectedStopCountdown?.arrived)}
                                        color={successForeground}
                                        countdownKey={selectedStopCountdown?.countdownKey}
                                        deadlineAt={selectedStopCountdown?.deadlineAt || 0}
                                        initialProgress={selectedStopCountdown?.initialProgress || 0}
                                        radius={8 * mapScale}
                                        visible={Boolean(selectedStopCountdown)}
                                    />
                                ) : null}
                                <Text numberOfLines={1} style={[styles.stopLabelText, {color: labelForeground}]}>
                                    {stop.code}
                                </Text>
                            </View>
                        </ScalePressable>
                    </View>
                );
            })}

            {vehicleItems.map(vehicle => {
                if (vehicle.positionIndex < 0) {
                    return null;
                }
                return (
                    <VehicleMarker
                        key={vehicle.vehiclePlateNumber}
                        accentColor={secondThemeColor}
                        motionEnabled={motionEnabled && !reducedMotion}
                        observedAt={observedAt}
                        onSelect={onSelectVehicle}
                        positionIndex={vehicle.positionIndex}
                        selected={selectedVehiclePlate === vehicle.vehiclePlateNumber}
                        statsDocument={statsDocument}
                        styles={styles}
                        svgScale={svgScale}
                        vehicle={vehicle}
                        xOrigin={mapX(0)}
                        xScale={horizontalScale * svgScale}
                    />
                );
            })}
        </View>
    );
};

export default BusRouteMap;
