import React, {useCallback, useEffect, useMemo} from 'react';
import {Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';

import {uiStyle} from '../../../components/ThemeContext';
import {trigger} from '../../../utils/trigger';
import {
    BUS_STOPS,
    getBusStop,
    getEtaDisplay,
    getOfficialNextDeparturePresentation,
    getPositionLabel,
    getVehicleDestinationEta,
    sortVehiclesByDestinationEta,
} from './busModel';

// 面板高度（不含底部安全區）
export const BUS_PANEL_COLLAPSED_EMPTY = 112;
export const BUS_PANEL_COLLAPSED = 178;
export const BUS_PANEL_EXPANDED = 350;

const PANEL_SPRING = {
    damping: 28,
    stiffness: 280,
    mass: 0.8,
    overshootClamping: true,
};

const etaText = (display, translate) => {
    if (display.kind === 'arrived' || display.kind === 'soon') {
        return translate('即將');
    }
    if (display.kind === 'minutes') {
        if (display.minimumMinutes === display.maximumMinutes) {
            return translate('約 {{minutes}} 分鐘', {minutes: display.minimumMinutes});
        }
        return translate('約 {{minimum}}–{{maximum}} 分鐘', {
            minimum: display.minimumMinutes,
            maximum: display.maximumMinutes,
        });
    }
    return null;
};

const departureText = (display, translate) => {
    if (display.kind === 'arrived' || display.kind === 'soon') {
        return translate('即將開出');
    }
    if (display.kind === 'minutes') {
        if (display.minimumMinutes === display.maximumMinutes) {
            return translate('約 {{minutes}} 分鐘後開出', {minutes: display.minimumMinutes});
        }
        return translate('約 {{minimum}}–{{maximum}} 分鐘後開出', {
            minimum: display.minimumMinutes,
            maximum: display.maximumMinutes,
        });
    }
    return null;
};

const BusArrivalPanel = ({
    expanded,
    now,
    onOpenMap,
    onRefresh,
    onSelectStop,
    onSelectVehicle,
    onToggleExpanded,
    onViewStop,
    refreshing,
    selectedStop,
    selectedVehiclePlate,
    snapshot,
    statusPresentation,
    theme,
    translate,
}) => {
    const insets = useSafeAreaInsets();
    const {
        black,
        disabled,
        secondThemeColor,
        themeColor,
        tonal,
        trueWhite,
        warning,
        white,
        viewShadow,
    } = theme;
    const hasVehicles = (snapshot?.vehicles || []).length > 0;
    const bottomInset = 10 + insets.bottom;
    const collapsedHeight = (hasVehicles ? BUS_PANEL_COLLAPSED : BUS_PANEL_COLLAPSED_EMPTY) + insets.bottom;
    const expandedHeight = BUS_PANEL_EXPANDED + insets.bottom;
    const panelHeight = useSharedValue(expanded ? expandedHeight : collapsedHeight);
    const dragStartHeight = useSharedValue(0);

    const styles = useMemo(() => StyleSheet.create({
        container: {
            backgroundColor: white,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            paddingTop: 7,
            paddingHorizontal: 16,
            paddingBottom: bottomInset,
            overflow: 'hidden',
            ...viewShadow,
        },
        handleHit: {
            alignItems: 'center',
            paddingBottom: 4,
        },
        handle: {
            width: 38,
            height: 4,
            borderRadius: 2,
            backgroundColor: disabled,
        },
        headingButton: {
            minHeight: 45,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        headingContent: {
            flex: 1,
            minHeight: 45,
            justifyContent: 'center',
        },
        headingActions: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        headingAction: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
        },
        statusRow: {
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 2,
        },
        statusText: {
            ...uiStyle.defaultText,
            flex: 1,
            fontSize: 10,
            fontWeight: '600',
        },
        heading: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: 18,
            fontWeight: '700',
        },
        departureRow: {
            minHeight: 20,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            marginBottom: 2,
        },
        departureText: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontSize: 12,
            fontWeight: '700',
        },
        hint: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 12,
            marginTop: 4,
            marginBottom: 8,
        },
        stopGrid: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 7,
            paddingVertical: 6,
        },
        stopChip: {
            minHeight: 34,
            paddingHorizontal: 10,
            borderRadius: 17,
            borderWidth: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        stopChipText: {
            ...uiStyle.defaultText,
            fontSize: 12,
        },
        list: {
            marginTop: 3,
            flex: 1,
        },
        listContent: {
            paddingBottom: 2,
        },
        vehicleRow: {
            minHeight: 70,
            borderRadius: 14,
            paddingHorizontal: 12,
            paddingVertical: 9,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        vehicleIcon: {
            width: 38,
            height: 38,
            borderRadius: 19,
            alignItems: 'center',
            justifyContent: 'center',
        },
        vehicleContent: {
            flex: 1,
        },
        vehicleTitle: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: 14,
            fontWeight: '700',
        },
        vehiclePosition: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 11,
            marginTop: 2,
        },
        eta: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontSize: 13,
            fontWeight: '700',
            marginTop: 3,
        },
        etaSecondary: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 10,
            fontWeight: '600',
            marginTop: 2,
        },
        warning: {
            ...uiStyle.defaultText,
            color: warning,
            fontSize: 10,
            marginTop: 2,
        },
        empty: {
            minHeight: 42,
            borderRadius: 14,
            backgroundColor: tonal.primary08,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 18,
            marginBottom: 6,
        },
        emptyText: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 12,
            textAlign: 'center',
        },
    }), [black.main, black.third, bottomInset, disabled, themeColor, tonal.primary08, viewShadow, warning, white]);

    const selectedStopInfo = getBusStop(selectedStop);
    const vehicles = useMemo(
        () => sortVehiclesByDestinationEta(snapshot?.vehicles || [], selectedStop),
        [selectedStop, snapshot?.vehicles],
    );
    const visibleVehicles = expanded ? vehicles : vehicles.slice(0, 1);
    const officialNextDeparture = getOfficialNextDeparturePresentation(
        snapshot?.officialNextDeparture,
    );
    const officialNextDepartureText = (() => {
        if (officialNextDeparture.kind === 'serviceWindow') {
            return translate('官方班次 {{start}}–{{end}} 循環行駛', {
                start: officialNextDeparture.startTime,
                end: officialNextDeparture.endTime,
            });
        }
        if (officialNextDeparture.kind === 'loopService') {
            return translate('官方班次循環行駛');
        }
        if (officialNextDeparture.kind === 'departure') {
            return translate('官方下一班預計 {{time}} 開出', {
                time: officialNextDeparture.time,
            });
        }
        return translate('官方下一班時間待公布');
    })();

    useEffect(() => {
        panelHeight.value = withSpring(
            expanded ? expandedHeight : collapsedHeight,
            PANEL_SPRING,
        );
    }, [collapsedHeight, expanded, expandedHeight, panelHeight]);

    const commitExpanded = useCallback(nextExpanded => {
        if (nextExpanded === expanded) {
            panelHeight.value = withSpring(
                nextExpanded ? expandedHeight : collapsedHeight,
                PANEL_SPRING,
            );
            return;
        }
        trigger();
        onToggleExpanded();
    }, [collapsedHeight, expanded, expandedHeight, onToggleExpanded, panelHeight]);

    const panGesture = useMemo(() => Gesture.Pan()
        .activeOffsetY([-8, 8])
        .failOffsetX([-24, 24])
        .onStart(() => {
            dragStartHeight.value = panelHeight.value;
        })
        .onUpdate(event => {
            const next = dragStartHeight.value - event.translationY;
            panelHeight.value = Math.min(
                expandedHeight,
                Math.max(collapsedHeight, next),
            );
        })
        .onEnd(event => {
            const mid = (collapsedHeight + expandedHeight) / 2;
            const shouldExpand = event.velocityY < -500
                || (event.velocityY <= 500 && panelHeight.value > mid);
            runOnJS(commitExpanded)(shouldExpand);
        }), [
        collapsedHeight,
        commitExpanded,
        dragStartHeight,
        expandedHeight,
        panelHeight,
    ]);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        height: panelHeight.value,
    }));

    const renderVehicleEta = vehicle => {
        const eta = getVehicleDestinationEta(vehicle, selectedStop);
        const display = getEtaDisplay(eta, snapshot?.observedAt, now);
        const value = etaText(display, translate);
        const etaLowConfidence = eta?.confidence === 'low';
        const pghDeparture = vehicle.positionCode === 'PGH'
            ? departureText(
                getEtaDisplay(vehicle.departureEta, snapshot?.observedAt, now),
                translate,
            )
            : null;
        if (selectedStop && vehicle.positionCode === selectedStop) {
            const departure = departureText(
                getEtaDisplay(vehicle.departureEta, snapshot?.observedAt, now),
                translate,
            );
            const nextStop = etaText(
                getEtaDisplay(vehicle.nextStopEta, snapshot?.observedAt, now),
                translate,
            );
            const primary = value
                ? translate('下一圈 {{eta}}到達 {{station}}', {
                    eta: value,
                    station: selectedStop,
                })
                : snapshot?.deliverySource === 'fallback'
                    ? translate('下一圈預計時間暫時無法使用')
                    : translate('下一圈預計時間仍在累積');
            if (departure && nextStop && vehicle.nextStop) {
                return {
                    primary,
                    secondary: translate('{{departure}} · {{eta}}到達下一站 {{station}}', {
                        departure,
                        eta: nextStop,
                        station: vehicle.nextStop,
                    }),
                    lowConfidence: etaLowConfidence
                        || vehicle.departureEta?.confidence === 'low'
                        || vehicle.nextStopEta?.confidence === 'low',
                };
            }
            if (departure) {
                return {
                    primary,
                    secondary: departure,
                    lowConfidence: etaLowConfidence
                        || vehicle.departureEta?.confidence === 'low',
                };
            }
            if (nextStop && vehicle.nextStop) {
                return {
                    primary,
                    secondary: translate('{{eta}}到達下一站 {{station}}', {
                        eta: nextStop,
                        station: vehicle.nextStop,
                    }),
                    lowConfidence: etaLowConfidence
                        || vehicle.nextStopEta?.confidence === 'low',
                };
            }
            return {primary, secondary: null, lowConfidence: etaLowConfidence};
        }
        if (value) {
            const primary = selectedStop
                ? translate('{{eta}}到達 {{station}}', {
                    eta: value,
                    station: selectedStop,
                })
                : translate('{{eta}}到達下一站 {{station}}', {
                    eta: value,
                    station: vehicle.nextStop || '—',
                });
            return {
                primary,
                secondary: pghDeparture,
                lowConfidence: etaLowConfidence
                    || Boolean(
                        pghDeparture && vehicle.departureEta?.confidence === 'low',
                    ),
            };
        }
        if (selectedStop && vehicle.nextStopEta && vehicle.nextStop) {
            const nextStopDisplay = getEtaDisplay(
                vehicle.nextStopEta,
                snapshot?.observedAt,
                now,
            );
            const nextStopValue = etaText(nextStopDisplay, translate);
            if (nextStopValue) {
                return {
                    primary: translate('所選站暫無預計時間'),
                    secondary: translate('{{eta}}到達下一站 {{station}}', {
                        eta: nextStopValue,
                        station: vehicle.nextStop,
                    }),
                    lowConfidence: vehicle.nextStopEta?.confidence === 'low',
                };
            }
        }
        return {
            primary: snapshot?.deliverySource === 'fallback'
                ? translate('預計時間暫時無法使用')
                : translate('正在累積行車數據'),
            secondary: null,
            lowConfidence: false,
        };
    };

    return (
        <Animated.View style={[styles.container, animatedContainerStyle]}>
            <GestureDetector gesture={panGesture}>
                <Animated.View>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={expanded ? translate('收起到站資訊') : translate('展開到站資訊')}
                        accessibilityState={{expanded}}
                        hitSlop={8}
                        onPress={() => {
                            trigger();
                            onToggleExpanded();
                        }}
                        style={styles.handleHit}>
                        <View style={styles.handle} />
                    </Pressable>
                    <View style={styles.headingButton}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={expanded ? translate('收起到站資訊') : translate('展開到站資訊')}
                            accessibilityState={{expanded}}
                            onPress={() => {
                                trigger();
                                onToggleExpanded();
                            }}
                            style={({pressed}) => [styles.headingContent, pressed && {opacity: 0.7}]}>
                            <View style={styles.statusRow}>
                                <MaterialCommunityIcons
                                    name={statusPresentation.icon}
                                    color={statusPresentation.color}
                                    size={13}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[styles.statusText, {color: statusPresentation.color}]}>
                                    {statusPresentation.text}
                                </Text>
                            </View>
                            <Text style={styles.heading} numberOfLines={1}>
                                {selectedStopInfo
                                    ? `${selectedStopInfo.code} ${translate(selectedStopInfo.name)}`
                                    : translate('選擇目的站')}
                            </Text>
                        </Pressable>
                        <View style={styles.headingActions}>
                            {selectedStopInfo ? (
                                <Pressable
                                    accessibilityRole="button"
                                    accessibilityLabel={translate('查看車站圖片')}
                                    onPress={() => {
                                        trigger();
                                        onViewStop();
                                    }}
                                    style={({pressed}) => [
                                        styles.headingAction,
                                        pressed && {opacity: 0.7},
                                    ]}>
                                    <MaterialCommunityIcons
                                        name="image-outline"
                                        color={themeColor}
                                        size={20}
                                    />
                                </Pressable>
                            ) : null}
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={translate('校園地圖')}
                                onPress={() => {
                                    trigger();
                                    onOpenMap();
                                }}
                                style={({pressed}) => [
                                    styles.headingAction,
                                    pressed && {opacity: 0.7},
                                ]}>
                                <MaterialCommunityIcons
                                    name="map-outline"
                                    color={themeColor}
                                    size={20}
                                />
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={translate('更新巴士資料')}
                                disabled={refreshing}
                                onPress={onRefresh}
                                style={({pressed}) => [
                                    styles.headingAction,
                                    pressed && {opacity: 0.7},
                                ]}>
                                <MaterialCommunityIcons
                                    name={refreshing ? 'timer-sand' : 'refresh'}
                                    color={statusPresentation.color}
                                    size={20}
                                />
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={expanded ? translate('收起到站資訊') : translate('展開到站資訊')}
                                accessibilityState={{expanded}}
                                onPress={() => {
                                    trigger();
                                    onToggleExpanded();
                                }}
                                style={({pressed}) => [
                                    styles.headingAction,
                                    pressed && {opacity: 0.7},
                                ]}>
                                <MaterialCommunityIcons
                                    name={expanded ? 'chevron-down' : 'chevron-up'}
                                    color={themeColor}
                                    size={26}
                                />
                            </Pressable>
                        </View>
                    </View>
                    <View style={styles.departureRow}>
                        <MaterialCommunityIcons
                            name="clock-outline"
                            color={themeColor}
                            size={14}
                        />
                        <Text style={styles.departureText} numberOfLines={1}>
                            {officialNextDepartureText}
                        </Text>
                    </View>
                </Animated.View>
            </GestureDetector>

            {expanded ? (
                <View style={styles.stopGrid}>
                    {BUS_STOPS.map(stop => {
                        const selected = selectedStop === stop.code;
                        return (
                            <Pressable
                                key={stop.code}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                onPress={() => {
                                    trigger();
                                    onSelectStop(stop.code);
                                }}
                                style={({pressed}) => [
                                    styles.stopChip,
                                    {
                                        borderColor: selected ? themeColor : tonal.primary50,
                                        backgroundColor: selected ? themeColor : tonal.primary08,
                                        opacity: pressed ? 0.7 : 1,
                                    },
                                ]}>
                                <Text style={[
                                    styles.stopChipText,
                                    {color: selected ? trueWhite : themeColor},
                                ]}>
                                    {stop.code} {translate(stop.shortName)}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            ) : !selectedStop ? (
                <Text style={styles.hint}>{translate('點選路線上的車站查看預計到站時間')}</Text>
            ) : null}

            {hasVehicles || expanded ? (
                <ScrollView
                    style={styles.list}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}>
                    {visibleVehicles.length > 0 ? visibleVehicles.map(vehicle => {
                        const selected = selectedVehiclePlate === vehicle.vehiclePlateNumber;
                        const etaPresentation = renderVehicleEta(vehicle);
                        return (
                            <Pressable
                                key={vehicle.vehiclePlateNumber}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                onPress={() => {
                                    trigger();
                                    onSelectVehicle(vehicle.vehiclePlateNumber);
                                }}
                                style={({pressed}) => [
                                    styles.vehicleRow,
                                    {
                                        backgroundColor: selected ? tonal.secondary15 : tonal.primary08,
                                        opacity: pressed ? 0.7 : 1,
                                    },
                                ]}>
                                <View style={[styles.vehicleIcon, {backgroundColor: secondThemeColor}]}>
                                    <MaterialCommunityIcons name="bus" color={trueWhite} size={21} />
                                </View>
                                <View style={styles.vehicleContent}>
                                    <Text style={styles.vehicleTitle}>{vehicle.vehiclePlateNumber}</Text>
                                    <Text style={styles.vehiclePosition}>
                                        {getPositionLabel(vehicle.positionCode, translate)}
                                    </Text>
                                    <Text style={styles.eta}>{etaPresentation.primary}</Text>
                                    {etaPresentation.secondary ? (
                                        <Text style={styles.etaSecondary}>
                                            {etaPresentation.secondary}
                                        </Text>
                                    ) : null}
                                    {etaPresentation.lowConfidence
                                    || vehicle.stateConfidence === 'low'
                                    || vehicle.positionOverdue ? (
                                        <Text style={styles.warning}>{translate('預測信心較低')}</Text>
                                    ) : null}
                                </View>
                            </Pressable>
                        );
                    }) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>
                                {snapshot?.serviceStatus === 'stopped'
                                    ? translate('目前沒有巴士服務')
                                    : translate('暫時沒有巴士位置')}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            ) : null}
        </Animated.View>
    );
};

export default BusArrivalPanel;
