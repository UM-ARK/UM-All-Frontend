import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {Image, StyleSheet, useWindowDimensions, View} from 'react-native';
import Animated, {
    cancelAnimation,
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import Svg, {Circle, G, Path, Polygon, Rect, Text as SvgText} from 'react-native-svg';

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
const MOVING_VEHICLE_LENGTH = 58;
const MOVING_VEHICLE_HIT_WIDTH = 68;
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
    {code: 'N24', x: 196, y: 12, width: 49, height: 19, outline: WEST_WING},
    {code: 'N23', x: 250, y: 12, width: 52, height: 18},
    {code: 'N22', x: 155, y: 34, width: 61, height: 20, outline: COURTYARD},
    {code: 'N21', x: 248, y: 35, width: 56, height: 18},
    {code: 'N8', x: 113, y: 67, width: 46, height: 43, outline: EAST_WING},
    {code: 'N6', x: 185, y: 95, width: 47, height: 37, outline: WEST_WING, station: true},
    {code: 'N2', x: 238, y: 84, width: 50, height: 34, outline: EAST_WING, station: true},
    {code: 'N1', x: 238, y: 121, width: 50, height: 23},
    {code: 'E11', x: 134, y: 166, width: 56, height: 51, outline: 'M22 0 H100 V100 H0 V72 H22 V53 H37 V69 H72 V44 H57 V54 H22 Z', station: true},
    {code: 'E12', x: 132, y: 230, width: 59, height: 41, outline: 'M7 0 H95 V14 H100 V48 H84 V64 H100 V91 H90 V86 H30 V100 H15 V87 H12 V42 H24 V31 H12 V36 H0 V5 H7 Z'},
    {code: 'E1', x: 246, y: 226, width: 28, height: 22},
    {code: 'E2', x: 229, y: 258, width: 58, height: 58, outline: 'M27 0 H96 V25 H78 V42 H91 V62 H100 V78 H83 V100 H0 V23 H27 Z'},
    {code: 'E21A', x: 143, y: 293, width: 60, height: 23, outline: 'M0 10 H78 V0 H100 V100 H78 V88 H0 Z'},
    {code: 'E21B', x: 139, y: 324, width: 66, height: 25, outline: 'M78 0 H100 V100 H78 V88 H0 V19 H78 Z'},
    {code: 'E22', x: 136, y: 356, width: 62, height: 42, outline: 'M0 0 H78 V11 H92 V26 H100 V100 H77 V79 H10 V71 H3 V60 H11 V52 H0 Z'},
    {code: 'E7', x: 210, y: 329, width: 28, height: 20},
    {code: 'E3', x: 246, y: 328, width: 34, height: 17},
    {code: 'E6', x: 208, y: 355, width: 32, height: 25, outline: WEST_WING},
    {code: 'E4', x: 251, y: 350, width: 29, height: 21, station: true},
    {code: 'E5', x: 233, y: 384, width: 60, height: 24, outline: EAST_WING},
    {code: 'E31', x: 160, y: 419, width: 64, height: 33, labelY: 448, outline: 'M11 15 L24 0 L43 17 V64 H72 V25 H84 L88 39 V57 H95 V68 H100 V100 H10 V78 H0 V67 H11 Z'},
    {code: 'E32', x: 140, y: 454, width: 74, height: 32, outline: 'M8 12 H12 V0 H31 V13 H26 V22 H100 V53 H88 V67 H56 V79 H29 V100 H15 V88 H0 V32 H8 Z', station: true},
    {code: 'E33', x: 158, y: 479, width: 65, height: 41, labelY: 511, outline: 'M76 0 H96 V60 H100 V82 H90 V100 H31 V88 H23 V61 H0 V42 H17 V31 H76 Z'},
    {code: 'E34', x: 139, y: 514, width: 67, height: 24, labelY: 534, outline: 'M0 0 H35 V52 H82 V63 H100 V100 H12 V71 H21 V27 H0 Z'},
    {code: 'S1', x: 251, y: 525, width: 26, height: 20},
    {code: 'S2', x: 211, y: 548, width: 33, height: 14},
    {code: 'S8', x: 161, y: 565, width: 33, height: 23},
    {code: 'S4', x: 202, y: 566, width: 37, height: 22, outline: EAST_WING, station: true},
    {code: 'S3', x: 247, y: 565, width: 31, height: 23},
];
const BRIDGE_APPROACHES = 'M162 265 H168 Q171 265 173 267 M167 339 H171 Q173 339 173 341 V351 Q173 354 176 354';
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const SHUTTLE_IMAGE = require('../../../static/img/Bus/campus-shuttle-marker.png');
const SHUTTLE_MOVING_IMAGE = require('../../../static/img/Bus/campus-shuttle-moving-marker.png');
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

const VehicleMarker = ({
    accentColor,
    headlightColor,
    isLight,
    motionEnabled,
    observedAt,
    onSelect,
    positionIndex,
    selected,
    statsDocument,
    styles,
    svgScale,
    xOrigin,
    xScale,
    vehicle,
}) => {
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
    const horizontalOffset = inTransit ? 0 : vehicle.offset;
    const routeOffset = inTransit ? vehicle.offset : 0;
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
        const point = getBusRoutePoint(location.get(), 0, routeOffset);
        return {
            transform: [
                {translateX: xOrigin + (point.x + horizontalOffset) * xScale},
                {translateY: point.y * svgScale},
            ],
        };
    });
    const animatedBody = useAnimatedStyle(() => {
        const progress = location.get();
        // 行駛中改用俯視車頂圖，並沿路線切線旋轉（圖檔預設車頭朝上）。
        if (inTransit) {
            const before = getBusRoutePoint(progress, -8, routeOffset);
            const after = getBusRoutePoint(progress, 8, routeOffset);
            const heading =
                Math.atan2(
                    (after.y - before.y) * svgScale,
                    (after.x - before.x) * xScale,
                ) *
                    (180 / Math.PI) +
                90;
            return {transform: [{rotate: `${heading}deg`}]};
        }
        // 停站沿用側視圖：左右翻轉對齊下一站，轉彎時微傾。
        const strength = roadAccent.get();
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
            const point = getBusRoutePoint(progress, distance, routeOffset);
            path += `${distance === -52 ? 'M' : 'L'}${xOrigin + point.x * xScale} ${point.y * svgScale} `;
        }
        return {d: path, opacity};
    });
    const animatedArrival = useAnimatedProps(() => {
        const progress = arrival.get();
        return {r: (6 + 7 * progress) * svgScale, opacity: (1 - progress) * 0.8};
    });
    const longHeadlight = inTransit && motionEnabled;
    const headlightStrength = inTransit ? 1 : 0.62;
    const headlightReach = longHeadlight ? 58 : 34;
    const headlightHalfSpread = longHeadlight ? 30 : 18;
    const headlightWidth = inTransit ? 2 * headlightHalfSpread : headlightReach;
    const headlightHeight = inTransit ? headlightReach : 2 * headlightHalfSpread;
    const headlightViewBox = inTransit
        ? `${-headlightHalfSpread} ${-headlightReach} ${headlightWidth} ${headlightHeight}`
        : `${-headlightReach} ${-headlightHalfSpread} ${headlightWidth} ${headlightHeight}`;
    const headlightPoints = (reach, halfSpread) => inTransit
        ? `0,0 ${-halfSpread},${-reach} ${halfSpread},${-reach}`
        : `0,0 ${-reach},${-halfSpread} ${-reach},${halfSpread}`;
    const vehicleImageStyle = [styles.vehicleImage, inTransit && styles.vehicleImageMoving];

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
            <Animated.View
                style={[
                    styles.vehicleAnchor,
                    inTransit && styles.vehicleAnchorMoving,
                    animatedPosition,
                ]}>
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
                    style={[styles.vehicle, inTransit && styles.vehicleMoving]}>
                    <Animated.View style={[vehicleImageStyle, animatedBody]}>
                        {!isLight ? (
                            <Svg
                                pointerEvents="none"
                                width={headlightWidth * svgScale}
                                height={headlightHeight * svgScale}
                                viewBox={headlightViewBox}
                                style={{
                                    position: 'absolute',
                                    // 俯視圖的車頭朝上，側視圖的車頭朝左。光束與車身共用旋轉和翻轉。
                                    left: inTransit ? '50%' : 3 - headlightWidth * svgScale,
                                    marginLeft: inTransit ? -headlightHalfSpread * svgScale : 0,
                                    top: (inTransit ? 2 : 22) - (inTransit ? headlightHeight : headlightHalfSpread) * svgScale,
                                }}>
                                <G fill={headlightColor}>
                                    <Polygon points={headlightPoints(headlightReach, headlightHalfSpread)} opacity={0.1 * headlightStrength} />
                                    <Polygon points={headlightPoints(longHeadlight ? 52 : 30, longHeadlight ? 18 : 11)} opacity={0.18 * headlightStrength} />
                                    <Polygon points={headlightPoints(longHeadlight ? 46 : 26, longHeadlight ? 8 : 5)} opacity={0.34 * headlightStrength} />
                                </G>
                            </Svg>
                        ) : null}
                        <Image
                            accessible={false}
                            resizeMode={inTransit ? 'stretch' : 'contain'}
                            source={inTransit ? SHUTTLE_MOVING_IMAGE : SHUTTLE_IMAGE}
                            style={vehicleImageStyle}
                        />
                        {inTransit && selected ? (
                            <View style={[styles.vehiclePin, styles.vehiclePinMoving, styles.vehiclePinSelected]} />
                        ) : null}
                    </Animated.View>
                    {!inTransit ? (
                        <View style={[styles.vehiclePin, selected && styles.vehiclePinSelected]} />
                    ) : null}
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
    const southCollegeX = routeX(116);
    const stadiumX = routeX(53);
    const routePath = getBusRoutePath(routeX);
    // 箭頭略放大，並在虛線之上用路面色底板抠洞，避免與中線虛線重疊難辨方向。
    const routeArrows = [
        `M${routeX(198)} 62.25 l-4.2 3.2 4.2 3.2`,
        ...[164, 268, 418].map(y => `M${routeX(77.5) - 3.2} ${y} l3.2 4.2 3.2 -4.2`),
        `M${routeX(163)} 604.25 l4.2 3.2 -4.2 3.2`,
        ...[476, 289, 152].map(y => `M${terminalX - 3.2} ${y} l3.2 -4.2 3.2 4.2`),
    ].join(' ');
    const {
        black,
        disabled,
        featuresScreen,
        floatingShadow,
        homeCoast,
        isLight,
        pressOverlay,
        sand,
        secondThemeColor,
        successForeground,
        themeColor,
        tonal,
        trueBlack,
        trueWhite,
        white,
    } = theme;
    // 深色樓宇只當背景脈絡；淺色略加深描邊並加極淡偏移陰影，仍不搶線路。
    const buildingFill = isLight ? featuresScreen.divider : disabled;
    const buildingStroke = black.third;
    const buildingStrokeOpacity = isLight ? 0.18 : 0.22;
    const westBuildingFill = isLight ? tonal.primary15 : disabled;
    const buildingShadowOpacity = isLight ? 0.06 : 0;
    const pavementWidth = isLight ? 9.5 : 10.5;
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
            // 高於站碼標籤，避免 S4 等 top 標籤蓋住車身
            zIndex: 4,
        },
        vehicleAnchorMoving: {
            marginLeft: -MOVING_VEHICLE_HIT_WIDTH / 2,
            marginTop: -MOVING_VEHICLE_LENGTH / 2,
        },
        vehicle: {
            width: 44,
            alignItems: 'center',
        },
        vehicleMoving: {
            width: MOVING_VEHICLE_HIT_WIDTH,
        },
        vehicleImage: {
            width: 44,
            height: 29,
        },
        vehicleImageMoving: {
            width: 24,
            height: MOVING_VEHICLE_LENGTH,
        },
        vehiclePin: {
            width: 10,
            height: 10,
            borderRadius: 5,
            borderWidth: 2,
            borderColor: white,
            backgroundColor: secondThemeColor,
        },
        vehiclePinMoving: {
            position: 'absolute',
            alignSelf: 'center',
            bottom: 3,
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
                    <SvgText x="332" y="17" fill={black.third} fontSize="10" textAnchor="end">
                        {translate('橫琴口岸')}
                    </SvgText>
                </G>
                <G transform={`translate(${routeX(0)} 0) scale(${horizontalScale} 1)`}>
                    {/* 北面湖區收窄成中央水道，南段繞過教育學院；西側支流從路線下穿過。 */}
                    <Path
                        d={`M185 154 C205 142 227 153 238 162 C250 171 261 161 260 184 C260 209 245 217 233 224 C220 233 206 228 201 247
                            C198 255 196 270 196 285 C196 300 201 305 199 321 C197 337 190 349 193 364 C194 383 196 401 213 411
                            C227 420 248 415 253 433 C258 449 245 468 242 482 C242 494 252 500 252 512 C248 523 236 532 220 540
                            C203 549 182 550 160 548 C139 547 125 551 103 551 C81 551 65 558 52 553 C43 550 44 544 54 544
                            C73 545 86 538 111 539 C145 541 177 541 194 533 C215 524 222 513 219 500 C216 486 218 474 220 462
                            C224 451 220 438 212 430 C204 422 194 418 183 417 C168 413 154 420 138 416
                            C107 410 76 428 51 420 C44 417 46 411 55 411
                            C82 415 106 399 140 402 C160 403 177 410 176 388 C173 374 174 357 177 344 C182 325 179 309 177 294
                            C173 285 155 284 141 283 C109 278 78 290 53 285 C43 282 44 276 55 276 C87 280 109 265 143 271
                            C165 274 178 275 176 256 C172 240 167 220 171 201 C175 183 173 169 173 164 C150 156 119 154 96 155
                            C80 156 61 152 49 149 C42 147 44 141 52 142 C72 145 82 148 99 147 C129 142 160 146 185 154 Z`}
                        fill={tonal.primary15}
                    />
                    <Path
                        d="M35 111 C44 102 56 104 62 108 C68 112 76 106 84 111 C92 117 88 127 79 129 C67 132 63 125 53 125 C44 126 29 123 35 111 Z M112 222 C121 215 139 217 148 221 C144 226 120 229 112 222 Z M193 479 C201 473 212 477 212 487 C211 498 218 508 211 517 C205 523 195 520 193 510 C191 499 192 489 193 479 Z"
                        fill={tonal.success15}
                    />
                    <Path
                        d="M192 167 C200 164 210 173 209 181 C206 186 198 181 194 177 C190 173 189 169 192 167 Z M223 194 C228 189 235 193 235 199 C235 207 225 217 219 215 C214 211 218 201 223 194 Z M235 437 C243 434 247 440 245 448 C243 456 238 464 233 461 C225 458 225 452 229 445 C230 441 232 438 235 437 Z M236 499 C241 500 243 507 240 511 C237 514 233 509 233 504 C232 501 233 499 236 499 Z"
                        fill={tonal.success30}
                    />
                    <G fill={tonal.success30}>
                        <Circle cx="47" cy="114" r="4" />
                        <Circle cx="54" cy="118" r="3" />
                        <Circle cx="76" cy="119" r="4" />
                        <Circle cx="125" cy="222" r="3.5" />
                        <Circle cx="137" cy="222" r="3" />
                    </G>
                    <Path
                        d="M212 182 Q222 178 232 182 T249 182 M180 209 Q189 206 199 209 T213 209 M224 469 Q231 466 239 469"
                        fill="none"
                        stroke={tonal.primary50}
                        strokeLinecap="round"
                        strokeWidth="1.5"
                    />
                    {/* E12 東南側與 E21B 東側的橋頭引道。 */}
                    <G fill="none" strokeLinecap="round">
                        <Path
                            d={BRIDGE_APPROACHES}
                            stroke={buildingStroke}
                            strokeOpacity={isLight ? 0.4 : 0.5}
                            strokeWidth="3.6"
                        />
                        <Path
                            d={BRIDGE_APPROACHES}
                            stroke={homeCoast.beach}
                            strokeWidth="2.1"
                        />
                    </G>
                    {/* 橋腹在拱頂收薄、兩岸落腳處加厚。 */}
                    {[
                        {x: 173, y: 267, span: 28, rise: 4, angle: 6}, // E12 東南側往圖書館北面
                        {x: 174, y: 315, span: 31, rise: 4.5, angle: 6}, // 圖書館南端接沿河廣場
                        {x: 176, y: 354, span: 32, rise: 4.5, angle: 5}, // E21B 東側轉向 E6
                        {x: 199, y: 520, span: 38, rise: 5.5, angle: 34}, // 南段往宿舍
                    ].map(({x, y, span, rise, angle = 0}) => (
                        <G key={`bridge-${x}-${y}`} transform={`translate(${x} ${y}) rotate(${angle})`}>
                            <Path
                                d={`M0 -1.5 Q${span / 2} ${-2 * rise - 1.5} ${span} -1.5 V4 Q${span / 2} ${-2 * rise} 0 4 Z`}
                                fill={homeCoast.beach}
                                stroke={buildingStroke}
                                strokeOpacity={isLight ? 0.42 : 0.55}
                                strokeWidth="0.9"
                                strokeLinejoin="round"
                            />
                            <Path
                                d={`M1 1 Q${span / 2} ${1 - 2 * rise} ${span - 1} 1`}
                                fill="none"
                                stroke={buildingStroke}
                                strokeOpacity={0.32}
                                strokeLinecap="round"
                                strokeWidth="0.8"
                            />
                        </G>
                    ))}
                </G>
                {/* N9 體育場：直道＋兩端半圓的膠囊形跑道（rx=半寬），非純橢圓 */}
                <Rect x={stadiumX - 22} y="26" width="44" height="66" rx="22" ry="22" fill={tonal.success15} />
                <G transform={`translate(${westBlockLeft} 0) scale(${westBlockWidth / 100} 1)`}>
                    <Path
                        d="M8 561 C18 551 29 553 43 556 C56 560 66 552 83 555 C97 558 100 574 92 583 C84 593 66 590 54 592 C39 595 26 590 14 587 C4 584 0 571 8 561 Z"
                        fill={tonal.success15}
                    />
                    <G fill={tonal.success30}>
                        <Circle cx="19" cy="572" r="4" />
                        <Circle cx="31" cy="577" r="5" />
                        <Circle cx="74" cy="566" r="4" />
                        <Circle cx="82" cy="572" r="3.5" />
                    </G>
                </G>
                <G fill="none" stroke={black.third} strokeWidth="1.3" opacity={0.45}>
                    <Rect x={stadiumX - 18} y="30" width="36" height="58" rx="18" ry="18" />
                    <Rect x={stadiumX - 11} y="40" width="22" height="38" rx="1.5" />
                    <Path d={`M${stadiumX - 11} 59 H${stadiumX + 11}`} />
                    <Circle cx={stadiumX} cy="59" r="3.5" />
                </G>
                {CAMPUS_BUILDINGS.map(({code, x, y, width, height, labelY, outline, station}) => {
                    const centerX = routeX(x);
                    const blockWidth = width * horizontalScale;
                    const left = centerX - blockWidth / 2;
                    return (
                        <G key={code}>
                            {buildingShadowOpacity > 0 ? (
                                outline ? (
                                    <Path
                                        d={outline}
                                        transform={`translate(${left + 0.8} ${y + 1.2}) scale(${blockWidth / 100} ${height / 100})`}
                                        fill={black.main}
                                        fillRule="evenodd"
                                        opacity={buildingShadowOpacity}
                                    />
                                ) : (
                                    <Rect x={left + 0.8} y={y + 1.2} width={blockWidth} height={height} rx="2" fill={black.main} opacity={buildingShadowOpacity} />
                                )
                            ) : null}
                            <G fill={buildingFill} stroke={buildingStroke} strokeOpacity={buildingStrokeOpacity}>
                                {outline ? (
                                    <Path d={outline} transform={`translate(${left} ${y}) scale(${blockWidth / 100} ${height / 100})`} fillRule="evenodd" strokeWidth="1.8" strokeLinejoin="round" />
                                ) : (
                                    <Rect x={left} y={y} width={blockWidth} height={height} rx="2" />
                                )}
                                {station ? null : (
                                    <SvgText x={centerX} y={labelY ?? y + height / 2 + 3.5} fill={black.third} opacity={0.65} stroke="none" fontSize="10" fontWeight="600" textAnchor="middle">
                                        {code}
                                    </SvgText>
                                )}
                            </G>
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
                            {buildingShadowOpacity > 0 ? (
                                <Path
                                    d={outline}
                                    transform={`translate(${left + 0.8} ${y + 1.2}) scale(${blockWidth / 100} ${height / 100})`}
                                    fill={black.main}
                                    opacity={buildingShadowOpacity}
                                />
                            ) : null}
                            <Path
                                d={outline}
                                transform={`translate(${left} ${y}) scale(${blockWidth / 100} ${height / 100})`}
                                fill={westBuildingFill}
                                stroke={buildingStroke}
                                strokeOpacity={buildingStrokeOpacity}
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
                <G transform={`translate(${southCollegeX} 10)`}>
                    {buildingShadowOpacity > 0 ? (
                        <Path d="M-18 542 H9 V549 H18 V584 H-18 V575 H-12 V556 H-18 Z" transform="translate(0.8 1.2)" fill={black.main} opacity={buildingShadowOpacity} />
                    ) : null}
                    <Path d="M-18 542 H9 V549 H18 V584 H-18 V575 H-12 V556 H-18 Z" fill={westBuildingFill} stroke={buildingStroke} strokeOpacity={buildingStrokeOpacity} />
                    <SvgText x="0" y="567" fill={black.third} opacity={0.75} fontSize="10" fontWeight="600" textAnchor="middle">
                        S9 SPC
                    </SvgText>
                </G>
                <G fill="none" strokeLinecap="round" strokeLinejoin="round">
                    {isLight ? (
                        <>
                            <Path d={routePath} stroke={black.main} strokeOpacity={0.16} strokeWidth="18" transform="translate(0 2.5)" />
                            <Path d={routePath} stroke={black.second} strokeOpacity={0.28} strokeWidth="14" />
                            <Path d={routePath} stroke={black.third} strokeOpacity={0.4} strokeWidth="12.5" />
                        </>
                    ) : (
                        <>
                            {/* 全路線冷色環境光（藍白），與站點暖色／車燈沙色區分 */}
                            <Path d={routePath} stroke={themeColor} strokeOpacity={0.14} strokeWidth="26" />
                            <Path d={routePath} stroke={trueWhite} strokeOpacity={0.12} strokeWidth="18" />
                            <Path d={routePath} stroke={trueBlack} strokeOpacity={0.5} strokeWidth="13.5" />
                        </>
                    )}
                    <Path d={routePath} stroke={disabled} strokeWidth="12" />
                    <Path d={routePath} stroke={white} strokeWidth={pavementWidth} />
                    {!isLight ? (
                        <Path d={routePath} stroke={trueWhite} strokeOpacity={0.1} strokeWidth={pavementWidth - 2.5} />
                    ) : null}
                    {activeRouteLegs.map(legIndex => (
                        <Path
                            key={legIndex}
                            d={getBusRouteLegPath(legIndex, routeX)}
                            stroke={secondThemeColor}
                            strokeOpacity={0.3}
                            strokeWidth={pavementWidth}
                        />
                    ))}
                    {/* 斑馬線式中線：butt 線帽＋加長間距，避免 round 把短劃收成圓點 */}
                    <Path
                        d={routePath}
                        stroke={isLight ? black.third : trueWhite}
                        strokeOpacity={isLight ? 0.55 : 0.32}
                        strokeWidth={isLight ? 1.7 : 1.4}
                        strokeDasharray={isLight ? '12 10' : '9 8'}
                        strokeLinecap="butt"
                    />
                    {/* 先以路面色寬描邊盖住虛線，再疊高對比箭頭 */}
                    <Path d={routeArrows} stroke={white} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
                    <Path
                        d={routeArrows}
                        stroke={isLight ? black.second : trueWhite}
                        strokeOpacity={isLight ? 0.9 : 0.85}
                        strokeWidth="2.1"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </G>
                {BUS_STOPS.map(stop => {
                    const selected = selectedStop === stop.code;
                    const arrived = arrivedStopCodes.has(stop.code);
                    const stopColor = arrived ? secondThemeColor : selected ? successForeground : black.second;
                    const stopRadius = selected || arrived ? 8.5 : 6.5;
                    const cx = routeX(stop.x);
                    // 站點暖色光暈，與路線冷色環境光分開
                    const glowColor = arrived ? secondThemeColor : selected ? successForeground : sand;
                    return (
                        <G key={stop.code}>
                            {!isLight ? (
                                <>
                                    <Circle cx={cx} cy={stop.y} r={stopRadius + 11} fill={glowColor} opacity={0.08} />
                                    <Circle cx={cx} cy={stop.y} r={stopRadius + 7} fill={glowColor} opacity={0.12} />
                                    <Circle cx={cx} cy={stop.y} r={stopRadius + 3.5} fill={glowColor} opacity={0.2} />
                                </>
                            ) : null}
                            <Circle
                                cx={cx}
                                cy={stop.y}
                                fill={selected || arrived ? stopColor : white}
                                r={stopRadius}
                                stroke={selected || arrived ? white : stopColor}
                                strokeWidth={selected || arrived ? 2.5 : 2}
                            />
                        </G>
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
                            ? {left: x - labelHalf, top: y - stopClearance - labelHeight}
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
                        headlightColor={sand}
                        isLight={isLight}
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
