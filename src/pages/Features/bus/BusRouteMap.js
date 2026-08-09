import React, {useMemo} from 'react';
import {Pressable, StyleSheet, Text, useWindowDimensions, View} from 'react-native';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import Svg, {Circle, Path} from 'react-native-svg';

import {uiStyle} from '../../../components/ThemeContext';
import TouchableScale from '../../../components/TouchableScale';
import {trigger} from '../../../utils/trigger';
import {BUS_STOPS, getBusPosition} from './busModel';

const MAP_WIDTH = 354;
const MAP_HEIGHT = 678;
const MAP_DISPLAY_WIDTH = 310;
const ROUTE_COLOR = '#005F95';

const percentX = value => `${value / MAP_WIDTH * 100}%`;
const percentY = value => `${value / MAP_HEIGHT * 100}%`;

const BusRouteMap = ({
    maxHeight,
    onOpenMap,
    onSelectStop,
    onSelectVehicle,
    selectedStop,
    selectedVehiclePlate,
    theme,
    translate,
    vehicles,
}) => {
    const {width: windowWidth} = useWindowDimensions();
    const heightConstrainedWidth = maxHeight === null
        ? MAP_DISPLAY_WIDTH
        : maxHeight * MAP_WIDTH / MAP_HEIGHT;
    const mapDisplayWidth = Math.min(MAP_DISPLAY_WIDTH, windowWidth - 24, heightConstrainedWidth);
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
        mapButton: {
            position: 'absolute',
            top: '58%',
            left: '50%',
            transform: [{translateX: -46}],
            minWidth: 92,
            minHeight: 34,
            paddingHorizontal: 12,
            borderRadius: 17,
            backgroundColor: white,
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'row',
            gap: 5,
            ...viewShadow,
        },
        mapButtonText: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontSize: 13,
            fontWeight: '600',
        },
        stopLabel: {
            minHeight: 30,
            paddingHorizontal: 8,
            borderRadius: 15,
            borderWidth: 2,
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
            fontSize: 12,
        },
        stopCode: {
            fontWeight: '700',
        },
        vehicle: {
            position: 'absolute',
            width: 34,
            height: 34,
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
    }), [themeColor, trueWhite, viewShadow, white]);

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
                        <Circle cx={stop.x} cy={stop.y} fill={ROUTE_COLOR} r="12" />
                        <Circle cx={stop.x} cy={stop.y} fill={white} r="7" />
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
                                    borderColor: themeColor,
                                    backgroundColor: selected ? themeColor : white,
                                    opacity: pressed ? 0.7 : 1,
                                    transform: stop.labelSide === 'bottom' ? [] : [{translateY: -15}],
                                },
                            ]}>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.stopLabelText,
                                    {color: selected ? trueWhite : themeColor},
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
                                transform: [{translateX: -17}, {translateY: -17}],
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

            <Pressable
                accessibilityRole="link"
                accessibilityLabel={translate('校園地圖')}
                onPress={() => {
                    trigger();
                    onOpenMap();
                }}
                style={({pressed}) => [styles.mapButton, pressed && {opacity: 0.7}]}>
                <MaterialCommunityIcons name="map-outline" color={themeColor} size={17} />
                <Text style={styles.mapButtonText}>{translate('校園地圖')}</Text>
            </Pressable>
        </View>
    );
};

export default BusRouteMap;
