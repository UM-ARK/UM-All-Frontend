import React, {useEffect, useMemo, useRef, useState} from 'react';
import {Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import Animated, {
    cancelAnimation,
    useAnimatedProps,
    useSharedValue,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import Svg, {Circle, Path} from 'react-native-svg';

import {uiStyle} from '../../../components/ThemeContext';
import TouchableScale from '../../../components/TouchableScale';
import {trigger} from '../../../utils/trigger';
import {
    BUS_STOPS,
    getBusPosition,
    getBusStop,
    getVehicleDestinationEta,
    getVehicleDestinationProgress,
    sortVehiclesByDestinationEta,
} from './busModel';

const MAP_WIDTH = 354;
const MAP_HEIGHT = 678;
const MAP_DISPLAY_WIDTH = 310;
const MAP_MAX_DISPLAY_WIDTH = 420;
const ROUTE_COLOR = '#005F95';
const AnimatedPath = Animated.createAnimatedComponent(Path);

const percentX = value => `${value / MAP_WIDTH * 100}%`;
const percentY = value => `${value / MAP_HEIGHT * 100}%`;

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
            progress.value = withTiming(1, {duration: 300});
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
                withTiming(1, {duration: Math.max(0, remainingMs - correctionDuration)}),
            )
            : withTiming(1, {duration: remainingMs});
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

const BusRouteMap = ({
    countdownEnabled,
    maxHeight,
    observedAt,
    onSelectStop,
    onSelectVehicle,
    selectedStop,
    selectedVehiclePlate,
    theme,
    translate,
    vehicles,
}) => {
    const {height: windowHeight, width: windowWidth} = useWindowDimensions();
    const availableWidth = windowWidth - 24;
    const minimumReadableWidth = Math.min(
        Math.min(windowHeight, windowWidth) >= 600 ? MAP_MAX_DISPLAY_WIDTH : MAP_DISPLAY_WIDTH,
        availableWidth,
    );
    const heightConstrainedWidth = maxHeight === null
        ? MAP_MAX_DISPLAY_WIDTH
        : maxHeight * MAP_WIDTH / MAP_HEIGHT;
    const mapDisplayWidth = Math.min(
        MAP_MAX_DISPLAY_WIDTH,
        availableWidth,
        Math.max(minimumReadableWidth, heightConstrainedWidth),
    );
    const mapScale = mapDisplayWidth / MAP_DISPLAY_WIDTH;
    const {
        black,
        secondThemeColor,
        themeColor,
        trueWhite,
        white,
        viewShadow,
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
        stopLabel: {
            maxWidth: '100%',
            minHeight: 22 * mapScale,
            paddingHorizontal: 5 * mapScale,
            paddingVertical: 2 * mapScale,
            borderRadius: 11 * mapScale,
            borderWidth: Math.max(1.5, 2 * mapScale),
            backgroundColor: white,
            alignItems: 'center',
            justifyContent: 'center',
        },
        stopLabelAnchor: {
            position: 'absolute',
            justifyContent: 'center',
        },
        stopLabelText: {
            ...uiStyle.defaultText,
            flexShrink: 1,
            fontSize: 12 * mapScale,
        },
        stopCode: {
            fontWeight: '700',
        },
        vehicle: {
            position: 'absolute',
            width: 34,
            height: 34,
            marginLeft: -17,
            marginTop: -17,
            borderRadius: 17,
            borderWidth: 3,
            alignItems: 'center',
            justifyContent: 'center',
            ...viewShadow,
        },
        vehicleCount: {
            position: 'absolute',
            right: -5,
            top: -6,
            minWidth: 17,
            height: 17,
            paddingHorizontal: 3,
            borderRadius: 9,
            backgroundColor: themeColor,
            alignItems: 'center',
            justifyContent: 'center',
        },
        vehicleCountText: {
            ...uiStyle.defaultText,
            color: trueWhite,
            fontSize: 9,
            fontWeight: '700',
        },
    }), [mapScale, themeColor, trueWhite, viewShadow, white]);

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
                countAtPosition: group.length,
                groupIndex,
                offset,
            };
        });
    }, [vehicles]);

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
                    height: mapDisplayWidth * MAP_HEIGHT / MAP_WIDTH,
                },
            ]}>
            <Svg
                pointerEvents="none"
                preserveAspectRatio="xMidYMid meet"
                style={styles.route}
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}>
                <Path
                    d="M147.5 105 L147.5 78 Q147.5 65 160.5 65 L262.5 65 Q275.5 65 275.5 78 L275.5 594 Q275.5 607 262.5 607 L90.5 607 Q77.5 607 77.5 594 L77.5 153 Q77.5 137 93.5 137 L134.5 137 Q147.5 137 147.5 124 Z"
                    fill="none"
                    stroke={ROUTE_COLOR}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="9.5"
                />
                {BUS_STOPS.map(stop => (
                    <React.Fragment key={stop.code}>
                        <Circle cx={stop.x} cy={stop.y} fill={ROUTE_COLOR} r="9" />
                        <Circle cx={stop.x} cy={stop.y} fill={white} r="5" />
                    </React.Fragment>
                ))}
                <Path
                    d="M324 70 L324 53 Q324 31 302 31 L283 31 M301 17 L280 31 L301 45"
                    fill="none"
                    stroke={ROUTE_COLOR}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="7"
                />
                <Path
                    d="M67 81 L51 81 Q31 81 31 101 L31 127 M17 106 L31 130 L45 106"
                    fill="none"
                    stroke={ROUTE_COLOR}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="7"
                />
                <Path
                    d="M25 630 L25 646 Q25 665 44 665 L66 665 M49 651 L69 665 L49 679"
                    fill="none"
                    stroke={ROUTE_COLOR}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="7"
                />
                <Path
                    d="M289 665 L306 665 Q327 665 327 644 L327 623 M313 645 L327 620 L341 645"
                    fill="none"
                    stroke={ROUTE_COLOR}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="7"
                />
            </Svg>

            {BUS_STOPS.map(stop => {
                const selected = selectedStop === stop.code;
                const arrived = arrivedStopCodes.has(stop.code);
                // 到站用副主題色（與巴士圖示一致）；選中用主題色；一般為白底
                const labelBackground = selected
                    ? themeColor
                    : arrived
                        ? secondThemeColor
                        : white;
                const labelForeground = selected || arrived ? trueWhite : themeColor;
                const labelBorder = selected ? themeColor : arrived ? secondThemeColor : themeColor;
                const anchorStyle = stop.labelSide === 'right'
                    ? {left: percentX(stop.x + 13), right: 0, top: percentY(stop.y), alignItems: 'flex-start'}
                    : stop.labelSide === 'bottom'
                        ? {left: 0, right: 0, top: percentY(stop.y + 13), alignItems: 'center'}
                        : {left: 0, right: percentX(MAP_WIDTH - stop.x + 13), top: percentY(stop.y), alignItems: 'flex-end'};
                return (
                    <View key={stop.code} style={[styles.stopLabelAnchor, anchorStyle]}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={translate('選擇車站 {{station}}', {
                                station: `${stop.code} ${translate(stop.name)}`,
                            })}
                            accessibilityState={{selected}}
                            onPress={() => {
                                trigger();
                                onSelectStop(stop.code);
                            }}
                            style={({pressed}) => [
                                styles.stopLabel,
                                {
                                    borderColor: labelBorder,
                                    backgroundColor: labelBackground,
                                    maxWidth: stop.labelMaxWidth
                                        ? stop.labelMaxWidth * mapDisplayWidth / MAP_WIDTH
                                        : undefined,
                                    opacity: pressed ? 0.7 : 1,
                                    transform: stop.labelSide === 'bottom' ? [] : [{translateY: -11 * mapScale}],
                                },
                            ]}>
                            {selected ? (
                                <CountdownBorder
                                    arrived={Boolean(selectedStopCountdown?.arrived)}
                                    color={trueWhite}
                                    countdownKey={selectedStopCountdown?.countdownKey}
                                    deadlineAt={selectedStopCountdown?.deadlineAt || 0}
                                    initialProgress={selectedStopCountdown?.initialProgress || 0}
                                    radius={11 * mapScale}
                                    visible={Boolean(selectedStopCountdown)}
                                />
                            ) : null}
                            <Text
                                adjustsFontSizeToFit
                                ellipsizeMode="tail"
                                minimumFontScale={0.72}
                                numberOfLines={stop.labelLines || 1}
                                style={[
                                    styles.stopLabelText,
                                    {color: labelForeground},
                                ]}>
                                <Text style={styles.stopCode}>{stop.code}</Text>
                                {' ' + translate(stop.shortName)}
                                {stop.terminalLabel ? ` (${translate(stop.terminalLabel)})` : ''}
                            </Text>
                        </Pressable>
                    </View>
                );
            })}

            {vehicleItems.map(vehicle => {
                const position = getBusPosition(vehicle.positionCode);
                if (!position) {
                    return null;
                }
                const selected = selectedVehiclePlate === vehicle.vehiclePlateNumber;
                return (
                    <TouchableScale
                        key={vehicle.vehiclePlateNumber}
                        accessibilityRole="button"
                        accessibilityLabel={translate('查看巴士 {{plate}}', {
                            plate: vehicle.vehiclePlateNumber,
                        })}
                        accessibilityState={{selected}}
                        onPress={() => {
                            trigger();
                            onSelectVehicle(vehicle.vehiclePlateNumber);
                        }}
                        style={[
                            styles.vehicle,
                            {
                                left: percentX(position.x + vehicle.offset),
                                top: percentY(position.y),
                                backgroundColor: secondThemeColor,
                                borderColor: selected ? black.main : trueWhite,
                            },
                        ]}>
                        <MaterialCommunityIcons name="bus" color={trueWhite} size={19} />
                        {vehicle.countAtPosition > 1 && vehicle.groupIndex === 0 ? (
                            <View style={styles.vehicleCount}>
                                <Text style={styles.vehicleCountText}>
                                    {vehicle.countAtPosition}
                                </Text>
                            </View>
                        ) : null}
                    </TouchableScale>
                );
            })}
        </View>
    );
};

export default BusRouteMap;
