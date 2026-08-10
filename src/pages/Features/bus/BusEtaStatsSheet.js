import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {ActivityIndicator, Pressable, StyleSheet, Text, View} from 'react-native';
import ActionSheet from 'react-native-actions-sheet';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import axios from 'axios';

import SegmentControl from '../../../components/SegmentControl';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {UM_BUS_STATS} from '../../../utils/pathMap';
import {getLocalStorage, setLocalStorageSilently} from '../../../utils/storageKits';
import {trigger} from '../../../utils/trigger';
import {
    BUS_STATS_LOOKBACK_DAYS,
    getBusStatsRoutePresentation,
    getBusStop,
    getPositionLabel,
    sortVehiclesByDestinationEta,
} from './busModel';

const BUS_STATS_DAYS_KEY = 'busEtaStatsDays';
const BUS_STATS_CACHE_PREFIX = 'busEtaStatsSnapshot';
const BUS_STATS_CACHE_MS = 5 * 60 * 1000;

const BusEtaStatsSheet = ({visible, onClose, selectedStop, selectedVehiclePlate, snapshot}) => {
    const {t} = useTranslation('features');
    const {theme} = useTheme();
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);
    const controllerRef = useRef(null);
    const requestIdRef = useRef(0);
    const [selectedDays, setSelectedDays] = useState(30);
    const [preferenceLoaded, setPreferenceLoaded] = useState(false);
    const [document, setDocument] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [usingStaleCache, setUsingStaleCache] = useState(false);
    const {
        bg_color,
        black,
        themeColor,
        tonal,
        warning,
    } = theme;
    const styles = useMemo(() => StyleSheet.create({
        sheet: {
            paddingHorizontal: 18,
            paddingTop: 12,
            paddingBottom: 14 + Math.max(insets.bottom, 8),
        },
        header: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
        },
        title: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: 18,
            fontWeight: '700',
        },
        headerActions: {
            flexDirection: 'row',
            alignItems: 'center',
        },
        iconButton: {
            width: 36,
            height: 36,
            borderRadius: 18,
            alignItems: 'center',
            justifyContent: 'center',
        },
        route: {
            ...uiStyle.defaultText,
            color: black.second,
            fontSize: 13,
            marginTop: 2,
        },
        segment: {
            alignSelf: 'flex-start',
            marginTop: 14,
        },
        explanation: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 11,
            lineHeight: 17,
            marginTop: 10,
        },
        stateCard: {
            minHeight: 132,
            borderRadius: 16,
            backgroundColor: tonal.primary08,
            marginTop: 12,
            paddingHorizontal: 16,
            paddingVertical: 14,
            justifyContent: 'center',
        },
        loading: {
            alignItems: 'center',
            gap: 10,
        },
        value: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontSize: 25,
            fontWeight: '700',
        },
        p90: {
            ...uiStyle.defaultText,
            color: black.second,
            fontSize: 13,
            fontWeight: '600',
            marginTop: 4,
        },
        meta: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 11,
            marginTop: 8,
        },
        warning: {
            ...uiStyle.defaultText,
            color: warning,
            fontSize: 11,
            marginTop: 6,
        },
        stateTitle: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: 14,
            fontWeight: '700',
            textAlign: 'center',
        },
        stateText: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 12,
            lineHeight: 18,
            marginTop: 5,
            textAlign: 'center',
        },
        cacheNotice: {
            ...uiStyle.defaultText,
            color: warning,
            fontSize: 11,
            marginTop: 8,
        },
        window: {
            ...uiStyle.defaultText,
            color: black.third,
            fontSize: 10,
            marginTop: 10,
            textAlign: 'center',
        },
    }), [black.main, black.second, black.third, insets.bottom, themeColor, tonal.primary08, warning]);

    useEffect(() => {
        let active = true;
        getLocalStorage(BUS_STATS_DAYS_KEY).then(value => {
            if (!active) {
                return;
            }
            if (BUS_STATS_LOOKBACK_DAYS.includes(value)) {
                setSelectedDays(value);
            }
            setPreferenceLoaded(true);
        });
        return () => {
            active = false;
        };
    }, []);

    useEffect(() => {
        if (visible) {
            sheetRef.current?.show();
        } else {
            sheetRef.current?.hide();
        }
    }, [visible]);

    const fetchStats = useCallback(async ({force = false} = {}) => {
        if (!preferenceLoaded) {
            return;
        }
        controllerRef.current?.abort();
        const controller = new AbortController();
        const requestId = requestIdRef.current + 1;
        requestIdRef.current = requestId;
        controllerRef.current = controller;
        setLoading(true);
        setError(false);
        setUsingStaleCache(false);
        const cacheKey = `${BUS_STATS_CACHE_PREFIX}:${selectedDays}`;
        let cached = null;
        try {
            cached = await getLocalStorage(cacheKey);
        } catch (_storageError) {
            cached = null;
        }
        if (controller.signal.aborted || requestId !== requestIdRef.current) {
            return;
        }
        const cachedAt = Date.parse(cached?.receivedAt || '');
        const cachedDocument = cached?.document?.lookbackDays === selectedDays
            ? cached.document
            : null;
        if (cachedDocument) {
            setDocument(cachedDocument);
            if (!force && Number.isFinite(cachedAt) && Date.now() - cachedAt < BUS_STATS_CACHE_MS) {
                setLoading(false);
                return;
            }
        } else {
            setDocument(null);
        }
        try {
            const response = await axios.get(UM_BUS_STATS, {
                params: {days: selectedDays},
                signal: controller.signal,
                timeout: 8000,
            });
            if (response.data?.lookbackDays !== selectedDays) {
                throw new Error('Unsupported bus statistics response');
            }
            if (requestId !== requestIdRef.current) {
                return;
            }
            setDocument(response.data);
            setLocalStorageSilently(cacheKey, {
                receivedAt: new Date().toISOString(),
                document: response.data,
            });
        } catch (_requestError) {
            if (controller.signal.aborted || requestId !== requestIdRef.current) {
                return;
            }
            if (cachedDocument) {
                setUsingStaleCache(true);
            } else {
                setError(true);
            }
        } finally {
            if (!controller.signal.aborted && requestId === requestIdRef.current) {
                setLoading(false);
            }
        }
    }, [preferenceLoaded, selectedDays]);

    useEffect(() => {
        if (!visible || !preferenceLoaded) {
            return undefined;
        }
        fetchStats();
        return () => controllerRef.current?.abort();
    }, [fetchStats, preferenceLoaded, visible]);

    const options = useMemo(() => BUS_STATS_LOOKBACK_DAYS.map(days => ({
        key: String(days),
        label: t('近{{days}}天', {days}),
    })), [t]);
    const vehicles = useMemo(
        () => sortVehiclesByDestinationEta(snapshot?.vehicles || [], selectedStop),
        [selectedStop, snapshot?.vehicles],
    );
    const vehicle = vehicles.find(
        item => item.vehiclePlateNumber === selectedVehiclePlate,
    ) || vehicles[0];
    const destination = getBusStop(selectedStop);
    const presentation = useMemo(() => getBusStatsRoutePresentation(
        document,
        vehicle?.positionCode,
        selectedStop,
        snapshot?.observedAt,
    ), [document, selectedStop, snapshot?.observedAt, vehicle?.positionCode]);
    const windowText = document?.sampleWindow?.from && document?.sampleWindow?.to
        ? `${String(document.sampleWindow.from).slice(0, 10)} – ${String(document.sampleWindow.to).slice(0, 10)}`
        : null;

    const selectDays = index => {
        const nextDays = BUS_STATS_LOOKBACK_DAYS[index];
        setDocument(null);
        setError(false);
        setUsingStaleCache(false);
        setSelectedDays(nextDays);
        setLocalStorageSilently(BUS_STATS_DAYS_KEY, nextDays);
    };

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            containerStyle={{backgroundColor: bg_color}}
            onClose={onClose}>
            <View style={styles.sheet}>
                <View style={styles.header}>
                    <Text style={styles.title}>{t('到站時間統計')}</Text>
                    <View style={styles.headerActions}>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('更新到站時間統計')}
                            disabled={loading}
                            onPress={() => {
                                trigger();
                                fetchStats({force: true});
                            }}
                            style={({pressed}) => [styles.iconButton, pressed && {opacity: 0.7}]}>
                            <MaterialCommunityIcons
                                name={loading ? 'timer-sand' : 'refresh'}
                                color={themeColor}
                                size={21}
                            />
                        </Pressable>
                        <Pressable
                            accessibilityRole="button"
                            accessibilityLabel={t('關閉')}
                            onPress={() => {
                                trigger();
                                sheetRef.current?.hide();
                            }}
                            style={({pressed}) => [styles.iconButton, pressed && {opacity: 0.7}]}>
                            <MaterialCommunityIcons name="close" color={black.main} size={22} />
                        </Pressable>
                    </View>
                </View>
                <Text style={styles.route} numberOfLines={2}>
                    {vehicle && destination
                        ? `${getPositionLabel(vehicle.positionCode, t)} → ${destination.code} ${t(destination.name)}`
                        : t('暫時沒有巴士位置')}
                </Text>
                <SegmentControl
                    compact
                    style={styles.segment}
                    options={options}
                    selectedIndex={BUS_STATS_LOOKBACK_DAYS.indexOf(selectedDays)}
                    onChange={selectDays}
                />
                <Text style={styles.explanation}>
                    {t('以下為近{{days}}天各路段歷史行車時間的合計參考，不會改變上方正式預計到站時間。', {days: selectedDays})}
                </Text>
                <View style={styles.stateCard}>
                    {loading && !document ? (
                        <View style={styles.loading}>
                            <ActivityIndicator color={themeColor} />
                            <Text style={styles.stateText}>{t('正在載入到站時間統計')}</Text>
                        </View>
                    ) : error ? (
                        <View>
                            <Text style={styles.stateTitle}>{t('暫時無法取得到站時間統計')}</Text>
                            <Text style={styles.stateText}>{t('即時巴士位置及正式預計時間不受影響')}</Text>
                        </View>
                    ) : presentation.kind === 'ready' ? (
                        <View>
                            <Text style={styles.value}>
                                {t('約 {{minimum}}–{{maximum}} 分鐘', {
                                    minimum: presentation.minimumMinutes,
                                    maximum: presentation.maximumMinutes,
                                })}
                            </Text>
                            <Text style={styles.p90}>
                                {t('多數情況約 {{minutes}} 分鐘內', {minutes: presentation.p90Minutes})}
                            </Text>
                            <Text style={styles.meta}>
                                {t('每個相關路段至少 {{count}} 個有效樣本', {count: presentation.sampleCount})}
                            </Text>
                            {presentation.confidence === 'low' ? (
                                <Text style={styles.warning}>{t('部分路段使用跨時段統計')}</Text>
                            ) : null}
                        </View>
                    ) : presentation.kind === 'insufficient' ? (
                        <View>
                            <Text style={styles.stateTitle}>
                                {t('近{{days}}天樣本仍不足', {days: selectedDays})}
                            </Text>
                            <Text style={styles.stateText}>{t('可切換較長時間範圍再查看')}</Text>
                        </View>
                    ) : (
                        <View>
                            <Text style={styles.stateTitle}>{t('暫時未能計算這段路線')}</Text>
                            <Text style={styles.stateText}>{t('請先選擇目的站並等待巴士位置更新')}</Text>
                        </View>
                    )}
                </View>
                {usingStaleCache ? (
                    <Text style={styles.cacheNotice}>{t('目前顯示上次保存的統計資料')}</Text>
                ) : null}
                {windowText ? (
                    <Text style={styles.window}>{t('樣本日期：{{window}}', {window: windowText})}</Text>
                ) : null}
            </View>
        </ActionSheet>
    );
};

export default BusEtaStatsSheet;
