import React, {useCallback, useEffect, useMemo} from 'react';
import {ScrollView, StyleSheet, View} from 'react-native';
import {Gesture, GestureDetector} from 'react-native-gesture-handler';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import PhosphorFeatureIcon from '../../TabbarPages/info/home/search/components/PhosphorFeatureIcon';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
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

// 面板高度（不含底部安全區；收合態預留摘要次行，例如 PGH 出發 ETA）
const BUS_PANEL_COLLAPSED_EMPTY = 112;
const BUS_PANEL_COLLAPSED = 138;
const BUS_PANEL_DESTINATION_HEIGHT = 32;
export const BUS_PANEL_EXPANDED = 440;

export const getBusPanelCollapsedHeight = (hasVehicles, hasDestination) => (
    (hasVehicles ? BUS_PANEL_COLLAPSED : BUS_PANEL_COLLAPSED_EMPTY)
    + (hasDestination ? BUS_PANEL_DESTINATION_HEIGHT : 0)
);

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
    onOpenStats,
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
        featureIconTones,
        featuresScreen,
        pressOverlay,
        secondThemeColor,
        successForeground,
        warning,
        white,
        floatingShadow,
    } = theme;
    const hasVehicles = (snapshot?.vehicles || []).length > 0;
    const selectedStopInfo = getBusStop(selectedStop);
    const bottomInset = 10 + insets.bottom;
    const collapsedHeight = getBusPanelCollapsedHeight(hasVehicles, Boolean(selectedStopInfo)) + insets.bottom;
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
            ...floatingShadow,
        },
        handleHit: {
            alignItems: 'center',
            paddingBottom: 4,
        },
        handle: {
            width: 38,
            height: 4,
            borderRadius: 2,
            backgroundColor: pressOverlay,
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
            width: 44,
            height: 44,
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
            color: black.second,
            fontSize: 12,
            fontWeight: '700',
        },
        destinationText: {
            ...uiStyle.defaultText,
            flex: 1,
            color: successForeground,
            fontSize: 12,
            lineHeight: 15,
            fontWeight: '600',
        },
        departureSecondaryText: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 12,
            fontWeight: '400',
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
            maxWidth: '100%',
            paddingHorizontal: 10,
            borderRadius: 17,
            borderWidth: 1,
            borderColor: pressOverlay,
            flexDirection: 'row',
            alignItems: 'center',
        },
        selectedStopChip: {
            borderColor: featureIconTones.green.foreground,
            borderWidth: 1.5,
        },
        stopChipText: {
            ...uiStyle.defaultText,
            color: black.second,
            flexShrink: 1,
            fontSize: 12,
        },
        selectedStopChipText: {
            color: successForeground,
            fontWeight: '700',
        },
        statsButton: {
            minHeight: 46,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderColor: featuresScreen.divider,
            paddingHorizontal: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 9,
            marginTop: 3,
        },
        statsButtonContent: {
            flex: 1,
        },
        statsButtonTitle: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: 12,
            fontWeight: '700',
        },
        statsButtonText: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 10,
            marginTop: 1,
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
            paddingHorizontal: 8,
            paddingVertical: 9,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
        },
        vehicleIcon: {
            width: 24,
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
            color: black.main,
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
    }), [black.main, black.second, black.third, bottomInset, featureIconTones.green.foreground, featuresScreen.divider, floatingShadow, pressOverlay, successForeground, warning, white]);

    const vehicles = useMemo(
        () => sortVehiclesByDestinationEta(snapshot?.vehicles || [], selectedStop),
        [selectedStop, snapshot?.vehicles],
    );
    const headingVehicle = vehicles.find(
        vehicle => vehicle.vehiclePlateNumber === selectedVehiclePlate,
    ) || vehicles[0];
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

    const summaryEtaPresentation = selectedStop && headingVehicle
        ? renderVehicleEta(headingVehicle)
        : null;

    return (
        <Animated.View style={[styles.container, animatedContainerStyle]}>
            <GestureDetector gesture={panGesture}>
                <Animated.View>
                    <ScalePressable
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
                    </ScalePressable>
                    <View style={styles.headingButton}>
                        <ScalePressable
                            accessibilityRole="button"
                            accessibilityLabel={expanded ? translate('收起到站資訊') : translate('展開到站資訊')}
                            accessibilityState={{expanded}}
                            onPress={() => {
                                trigger();
                                onToggleExpanded();
                            }}
                            style={styles.headingContent}>
                            <View style={styles.statusRow}>
                                <PhosphorFeatureIcon
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
                                {headingVehicle
                                    ? getPositionLabel(headingVehicle.positionCode, translate)
                                    : snapshot
                                        ? snapshot.serviceStatus === 'running'
                                            ? translate('服務時段內，暫未有巴士出現')
                                            : translate('暫時沒有巴士位置')
                                        : translate('正在載入巴士資料')}
                            </Text>
                        </ScalePressable>
                        <View style={styles.headingActions}>
                            {selectedStopInfo ? (
                                <ScalePressable
                                    accessibilityRole="button"
                                    accessibilityLabel={translate('查看車站圖片')}
                                    onPress={() => {
                                        trigger();
                                        onViewStop();
                                    }}
                                    style={styles.headingAction}>
                                    <PhosphorFeatureIcon
                                        name="image"
                                        color={featureIconTones.orange.foreground}
                                        size={20}
                                    />
                                </ScalePressable>
                            ) : null}
                            <ScalePressable
                                accessibilityRole="button"
                                accessibilityLabel={translate('校園地圖')}
                                onPress={() => {
                                    trigger();
                                    onOpenMap();
                                }}
                                style={styles.headingAction}>
                                <PhosphorFeatureIcon
                                    name="map"
                                    color={featureIconTones.green.foreground}
                                    size={20}
                                />
                            </ScalePressable>
                            <ScalePressable
                                accessibilityRole="button"
                                accessibilityLabel={translate('更新巴士資料')}
                                disabled={refreshing}
                                onPress={onRefresh}
                                style={styles.headingAction}>
                                <PhosphorFeatureIcon
                                    name={refreshing ? 'hourglass-medium' : 'arrow-clockwise'}
                                    color={featureIconTones.blue.foreground}
                                    size={20}
                                />
                            </ScalePressable>
                            <ScalePressable
                                accessibilityRole="button"
                                accessibilityLabel={expanded ? translate('收起到站資訊') : translate('展開到站資訊')}
                                accessibilityState={{expanded}}
                                onPress={() => {
                                    trigger();
                                    onToggleExpanded();
                                }}
                                style={styles.headingAction}>
                                <PhosphorFeatureIcon
                                    name={expanded ? 'caret-down' : 'caret-up'}
                                    color={black.second}
                                    size={20}
                                    weight="regular"
                                />
                            </ScalePressable>
                        </View>
                    </View>
                    {selectedStopInfo ? (
                        <View style={styles.departureRow}>
                            <PhosphorFeatureIcon name="map-pin" color={successForeground} size={14} />
                            <Text style={styles.destinationText} numberOfLines={2}>
                                {translate('目的站 {{station}}', {
                                    station: `${selectedStopInfo.code} ${translate(selectedStopInfo.name)}${selectedStopInfo.terminalLabel ? ` (${translate(selectedStopInfo.terminalLabel)})` : ''}`,
                                })}
                            </Text>
                        </View>
                    ) : null}
                    {summaryEtaPresentation ? (
                        <View style={styles.departureRow}>
                            <PhosphorFeatureIcon
                                name="path"
                                color={featureIconTones.green.foreground}
                                size={14}
                            />
                            <Text style={styles.departureText} numberOfLines={1}>
                                {summaryEtaPresentation.primary}
                            </Text>
                        </View>
                    ) : null}
                    {summaryEtaPresentation?.secondary ? (
                        <View style={styles.departureRow}>
                            <PhosphorFeatureIcon
                                name="bus"
                                color={featureIconTones.orange.foreground}
                                size={14}
                            />
                            <Text style={styles.departureSecondaryText} numberOfLines={1}>
                                {summaryEtaPresentation.secondary}
                            </Text>
                        </View>
                    ) : null}
                    <View style={styles.departureRow}>
                        <PhosphorFeatureIcon
                            name="clock"
                            color={featureIconTones.blue.foreground}
                            size={14}
                        />
                        <Text style={styles.departureSecondaryText} numberOfLines={1}>
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
                            <ScalePressable
                                key={stop.code}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                onPress={() => {
                                    trigger();
                                    onSelectStop(stop.code);
                                }}
                                style={[
                                    styles.stopChip,
                                    selected && styles.selectedStopChip,
                                ]}>
                                <Text style={[
                                    styles.stopChipText,
                                    selected && styles.selectedStopChipText,
                                ]}>
                                    {stop.code} {translate(stop.shortName)}
                                </Text>
                            </ScalePressable>
                        );
                    })}
                </View>
            ) : !selectedStop ? (
                <Text style={styles.hint}>{translate('點選路線上的車站查看預計到站時間')}</Text>
            ) : null}

            {expanded && selectedStopInfo ? (
                <ScalePressable
                    accessibilityRole="button"
                    accessibilityLabel={translate('查看到站時間統計')}
                    onPress={() => {
                        trigger();
                        onOpenStats();
                    }}
                    style={styles.statsButton}>
                    <PhosphorFeatureIcon name="chart-line-up" color={featureIconTones.blue.foreground} size={20} />
                    <View style={styles.statsButtonContent}>
                        <Text style={styles.statsButtonTitle}>{translate('到站時間統計')}</Text>
                        <Text style={styles.statsButtonText}>{translate('查看近1天、7天及30天行車參考')}</Text>
                    </View>
                    <PhosphorFeatureIcon name="caret-right" color={black.third} size={18} weight="regular" />
                </ScalePressable>
            ) : null}

            {expanded ? (
                <ScrollView
                    style={styles.list}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.listContent}>
                    {vehicles.length > 0 ? vehicles.map(vehicle => {
                        const selected = selectedVehiclePlate === vehicle.vehiclePlateNumber;
                        const etaPresentation = renderVehicleEta(vehicle);
                        return (
                            <ScalePressable
                                key={vehicle.vehiclePlateNumber}
                                accessibilityRole="button"
                                accessibilityState={{selected}}
                                onPress={() => {
                                    trigger();
                                    onSelectVehicle(vehicle.vehiclePlateNumber);
                                }}
                                style={[styles.vehicleRow, selected && {backgroundColor: featuresScreen.divider}]}>
                                <View style={styles.vehicleIcon}>
                                    <PhosphorFeatureIcon name="bus" color={secondThemeColor} size={22} />
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
                            </ScalePressable>
                        );
                    }) : (
                        <View style={styles.empty}>
                            <Text style={styles.emptyText}>
                                {snapshot?.serviceStatus === 'stopped'
                                    ? translate('目前沒有巴士服務')
                                    : snapshot?.serviceStatus === 'running'
                                        ? translate('服務時段內，暫未有巴士出現')
                                        : translate('暫未偵測到行駛中的巴士')}
                            </Text>
                        </View>
                    )}
                </ScrollView>
            ) : null}
        </Animated.View>
    );
};

export default BusArrivalPanel;
