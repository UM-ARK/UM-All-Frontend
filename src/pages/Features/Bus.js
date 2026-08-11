import React, {useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect} from 'react';
import {AppState, Image, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View} from 'react-native';
import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {useIsFocused} from '@react-navigation/native';
import {useTranslation} from 'react-i18next';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

// 引入本地工具
import {useTheme} from '../../components/ThemeContext';
import ARKImageView from '../../components/ARKImageView';
import {UM_BUS_LIVE, UM_BUS_LOOP_ZH, UM_BUS_LOOP_EN, UM_BUS_LOOP_SERVICE, UM_MAP} from '../../utils/pathMap';
import {openLink} from '../../utils/browser';
import {logToFirebase} from '../../utils/firebaseAnalytics';
import {getLocalStorage, setLocalStorageSilently} from '../../utils/storageKits';
import {trigger} from '../../utils/trigger';
import {DOMParser} from 'react-native-html-parser';
import {scale} from 'react-native-size-matters';
import axios from 'axios';
import Toast from 'react-native-simple-toast';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import BusArrivalPanel, {
    BUS_PANEL_COLLAPSED,
    BUS_PANEL_COLLAPSED_EMPTY,
    BUS_PANEL_EXPANDED,
} from './bus/BusArrivalPanel';
import BusEtaStatsSheet from './bus/BusEtaStatsSheet';
import BusRouteMap from './bus/BusRouteMap';
import {
    BUS_STOPS,
    createFallbackBusLive,
    extractVehiclePlates,
    isBusLiveSnapshotFresh,
    isCachedBusLiveUsable,
    normalizeBusLive,
} from './bus/busModel';

const stopImgArr = [
    require('../../static/img/Bus/stopImg/PGH.jpg'),
    require('../../static/img/Bus/stopImg/E4.jpg'),
    require('../../static/img/Bus/stopImg/N2.jpg'),
    require('../../static/img/Bus/stopImg/N6.jpg'),
    require('../../static/img/Bus/stopImg/E11.jpg'),
    require('../../static/img/Bus/stopImg/E21.jpg'),
    require('../../static/img/Bus/stopImg/E32.jpg'),
    require('../../static/img/Bus/stopImg/S4.jpg'),
];

// 解析campus Bus的HTML
function getBusData(busInfoHtml) {
    // 使用第三方插件react-native-html-parser，以使用DomParser（為了懶寫代碼，複用Vue寫的解析邏輯）
    // https://bestofreactjs.com/repo/g6ling-react-native-html-parser-react-native-utilities
    let doc = new DOMParser().parseFromString(busInfoHtml, 'text/html');

    // 主要的巴士資訊都存放在span內
    let mainInfo = doc.getElementsByTagName('span');
    let busInfoArr = [];

    // 到站時車牌屬於span（13個span）。未到站時車牌屬於div（12個span）
    // 無車服務時只有0~2的下標為busInfo（11個span）。有車服務時，0~3的下標都是busInfo（至少12個span）
    let infoIndex = mainInfo.length >= 12 ? 3 : 2;

    // 分隔車輛運行資訊
    for (let i = 0; i < mainInfo.length; i++) {
        let text = mainInfo[i].textContent;
        if (i <= infoIndex) {
            busInfoArr.push(text);
        } else {
            break;
        }
    }
    // console.log("busInfoArr為:",    busInfoArr);

    // 車輛和站點都在class=main的div標籤內
    let arriveInfoBuffer = doc.getElementsByClassName('left', false);
    // console.log("巴士到達資訊HTML節點形式:",arriveInfoBuffer);

    // 將節點文字數據存入Array，用於以車牌判斷巴士到達位置
    let arriveInfoArr = [];
    // 解析巴士到站數據
    for (let i = 0; i < arriveInfoBuffer.length; i++) {
        let item = arriveInfoBuffer[i].textContent;
        // 刪除字符串內的\t \n
        arriveInfoArr.push(item.replace(/[\t\n]/g, ''));
    }
    // index 0：PGH 站點
    // 1：PGH ~ E4 路上
    // 2：E4 站點，以此類推
    // 15：S4 下方的虛無站
    // console.log("巴士到站狀態數組為:",arriveInfoArr);

    // 判斷目前有無巴士
    let busPositionArr = [];
    for (let i = 0; i < arriveInfoArr.length; i++) {
        let item = arriveInfoArr[i];
        extractVehiclePlates(item).forEach(number => {
            busPositionArr.push({number, index: i});
        });
    }
    // console.log("Bus車牌、位置總數據：",busPositionArr);

    return {
        busInfoArr,
        busPositionArr,
    };
}

const BUS_LIVE_SNAPSHOT_KEY = 'busLiveSnapshot';
const BUS_SELECTED_STOP_KEY = 'busSelectedStop';
const BUS_REFRESH_INTERVAL_MS = 10000;
const staticStyles = StyleSheet.create({
    headerRightRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerButton: {
        width: scale(36),
        height: scale(36),
        borderRadius: scale(18),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

// 巴士報站頁 - 畫面佈局與渲染
const BusScreen = ({navigation}) => {
    const {t, i18n} = useTranslation('features');
    const isFocused = useIsFocused();
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    const {theme} = useTheme();
    const {
        bg_color,
        black,
        success,
        themeColor,
        warning,
    } = theme;
    const s = useMemo(() => StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: bg_color,
        },
        routeScroll: {
            flex: 1,
        },
        routeContent: {
            paddingHorizontal: 12,
            paddingTop: 4,
            paddingBottom: 8,
        },
        panelOverlay: {
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
        },
    }), [bg_color]);

    const [snapshot, setSnapshot] = useState(null);
    const [selectedStop, setSelectedStop] = useState(null);
    const [selectedVehiclePlate, setSelectedVehiclePlate] = useState(null);
    const [panelExpanded, setPanelExpanded] = useState(false);
    const [statsVisible, setStatsVisible] = useState(false);
    const [routeViewportHeight, setRouteViewportHeight] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
    const [now, setNow] = useState(Date.now());
    const imageViewerRef = useRef(null);
    const routeScrollRef = useRef(null);
    const controllerRef = useRef(null);
    const requestInFlightRef = useRef(false);
    const snapshotRef = useRef(null);
    const panelBottomInset = insets.bottom;
    const collapsedPanelReservedHeight = (snapshot?.vehicles?.length > 0
        ? BUS_PANEL_COLLAPSED
        : BUS_PANEL_COLLAPSED_EMPTY)
        + panelBottomInset;
    const panelReservedHeight = (panelExpanded
        ? BUS_PANEL_EXPANDED
        : collapsedPanelReservedHeight);
    const contentTopStyle = useMemo(
        () => isLiquidGlassSupported ? {paddingTop: headerHeight} : null,
        [headerHeight],
    );
    const routePanelInsetStyle = useMemo(
        () => ({paddingBottom: panelReservedHeight + 8}),
        [panelReservedHeight],
    );
    const routeMapMaxHeight = routeViewportHeight === null
        ? null
        : Math.max(0, routeViewportHeight - collapsedPanelReservedHeight - 12);

    const busUrl = i18n.resolvedLanguage === 'en' ? UM_BUS_LOOP_EN : UM_BUS_LOOP_ZH;

    // 右上角：官方網站 / 服務說明（參考 LocalCourse / DeepLinkShareButton header 模式）
    const openBusOfficialPage = useCallback(() => {
        openLink(busUrl);
    }, [busUrl]);

    const openBusServiceInfo = useCallback(() => {
        openLink(UM_BUS_LOOP_SERVICE);
    }, []);

    useLayoutEffect(() => {
        navigation.setOptions({
            headerRight:
                Platform.OS === 'ios'
                    ? undefined
                    : () => (
                        <View style={staticStyles.headerRightRow}>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('官方網站')}
                                onPress={() => {
                                    trigger();
                                    openBusOfficialPage();
                                }}
                                style={staticStyles.headerButton}>
                                <MaterialCommunityIcons
                                    name="earth"
                                    size={scale(20)}
                                    color={themeColor}
                                />
                            </Pressable>
                            <Pressable
                                accessibilityRole="button"
                                accessibilityLabel={t('官方資訊')}
                                onPress={() => {
                                    trigger();
                                    openBusServiceInfo();
                                }}
                                style={staticStyles.headerButton}>
                                <MaterialCommunityIcons
                                    name="information-outline"
                                    size={scale(20)}
                                    color={themeColor}
                                />
                            </Pressable>
                        </View>
                    ),
            unstable_headerRightItems:
                Platform.OS === 'ios'
                    ? () => [
                        {
                            type: 'button',
                            label: t('官方資訊'),
                            accessibilityLabel: t('官方資訊'),
                            icon: {
                                type: 'sfSymbol',
                                name: 'info.circle',
                            },
                            tintColor: themeColor,
                            onPress: () => {
                                trigger();
                                openBusServiceInfo();
                            },
                        },
                        {
                            type: 'button',
                            label: t('官方網站'),
                            accessibilityLabel: t('官方網站'),
                            icon: {
                                type: 'sfSymbol',
                                name: 'globe',
                            },
                            tintColor: themeColor,
                            onPress: () => {
                                trigger();
                                openBusOfficialPage();
                            },
                        },
                    ]
                    : undefined,
        });
    }, [navigation, openBusOfficialPage, openBusServiceInfo, t, themeColor]);

    // 將 stopImgArr 轉換為 ARKImageView 可用的格式
    const processedStopImages = useMemo(() => {
        return stopImgArr.map(img => {
            if (typeof img === 'number') {
                // 本地 require 的圖片
                return { uri: Image.resolveAssetSource(img).uri };
            }
            return { uri: img };
        });
    }, []);

    useEffect(() => {
        snapshotRef.current = snapshot;
    }, [snapshot]);

    useEffect(() => {
        logToFirebase('openPage', {page: 'bus'});
        getLocalStorage(BUS_SELECTED_STOP_KEY).then(value => {
            if (typeof value === 'string') {
                setSelectedStop(value);
            }
        });
    }, []);

    const fetchBusInfo = useCallback(async ({manual = false} = {}) => {
        if (requestInFlightRef.current) {
            return;
        }
        requestInFlightRef.current = true;
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        if (manual) {
            setIsRefreshing(true);
        } else if (!snapshotRef.current) {
            setIsLoading(true);
        }

        let staleLive = null;
        try {
            const response = await axios.get(UM_BUS_LIVE, {
                signal: controller.signal,
                timeout: 8000,
            });
            const live = normalizeBusLive(response.data);
            if (!isBusLiveSnapshotFresh(live)) {
                staleLive = live;
                throw new Error('Bus live response is stale or expired');
            }
            setSnapshot(live);
            setLocalStorageSilently(BUS_LIVE_SNAPSHOT_KEY, live);
        } catch (error) {
            if (controller.signal.aborted) {
                return;
            }
            let cached = snapshotRef.current;
            if (!isCachedBusLiveUsable(cached)) {
                try {
                    cached = await getLocalStorage(BUS_LIVE_SNAPSHOT_KEY);
                } catch (_storageError) {
                    cached = null;
                }
            }
            if (isCachedBusLiveUsable(cached)) {
                try {
                    setSnapshot(normalizeBusLive(cached, 'cache'));
                    return;
                } catch (_cacheError) {
                    cached = null;
                }
            }
            try {
                const response = await axios.get(busUrl, {
                    signal: controller.signal,
                    timeout: 8000,
                });
                setSnapshot(createFallbackBusLive(getBusData(response.data)));
            } catch (_fallbackError) {
                if (controller.signal.aborted) {
                    return;
                }
                const lastSnapshot = staleLive || cached || snapshotRef.current;
                if (lastSnapshot) {
                    setSnapshot({
                        ...lastSnapshot,
                        stale: true,
                        deliverySource: 'stale',
                    });
                }
                if (manual) {
                    Toast.show(t('暫時無法更新巴士資料'));
                }
            }
        } finally {
            if (controllerRef.current === controller) {
                controllerRef.current = null;
                requestInFlightRef.current = false;
                setIsLoading(false);
                setIsRefreshing(false);
            }
        }
    }, [busUrl, t]);

    useEffect(() => {
        const subscription = AppState.addEventListener('change', nextState => {
            setIsAppActive(nextState === 'active');
        });
        return () => subscription.remove();
    }, []);

    useEffect(() => {
        if (!isFocused || !isAppActive) {
            return undefined;
        }
        fetchBusInfo();
        const timer = setInterval(fetchBusInfo, BUS_REFRESH_INTERVAL_MS);
        return () => {
            clearInterval(timer);
            const controller = controllerRef.current;
            controllerRef.current = null;
            requestInFlightRef.current = false;
            controller?.abort();
        };
    }, [fetchBusInfo, isAppActive, isFocused]);

    useEffect(() => {
        if (!isFocused || !isAppActive) {
            return undefined;
        }
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [isAppActive, isFocused]);

    useEffect(() => {
        routeScrollRef.current?.scrollTo({y: 0, animated: false});
    }, [headerHeight, panelExpanded]);

    // 控制彈出層打開 or 關閉
    const toggleModal = useCallback(index => {
        // 使用 ARKImageView 打開圖片
        imageViewerRef.current?.handleOpenImage(index);
    }, []);

    const openSelectedStopImage = useCallback(() => {
        const index = BUS_STOPS.findIndex(stop => stop.code === selectedStop);
        if (index >= 0) {
            toggleModal(index);
        }
    }, [selectedStop, toggleModal]);

    const handleRefresh = () => {
        trigger();
        fetchBusInfo({manual: true});
    };

    const handleSelectStop = useCallback(code => {
        setSelectedStop(code);
        setLocalStorageSilently(BUS_SELECTED_STOP_KEY, code);
    }, []);

    const statusPresentation = useMemo(() => {
        if (!snapshot) {
            return {
                color: themeColor,
                icon: 'bus-clock',
                text: isLoading ? t('正在載入巴士資料') : t('暫時無法取得巴士資料'),
            };
        }
        if (snapshot.stale || snapshot.deliverySource === 'stale') {
            return {
                color: warning,
                icon: 'alert-circle-outline',
                text: t('資料更新較慢，顯示最後位置'),
            };
        }
        if (snapshot.deliverySource === 'fallback') {
            return {
                color: warning,
                icon: 'cloud-alert-outline',
                text: snapshot.vehicles?.length > 0
                    ? t('即時位置可用，預計時間暫不可用')
                    : t('暫未偵測到行駛中的巴士'),
            };
        }
        if (snapshot.deliverySource === 'cache') {
            return {
                color: warning,
                icon: 'history',
                text: t('暫時使用最近更新的資料'),
            };
        }
        if (snapshot.serviceStatus === 'stopped') {
            return {
                color: black.third,
                icon: 'bus-stop-covered',
                text: snapshot.observerMode === 'scheduled_idle'
                    ? t('目前停駛')
                    : t('巴士服務暫停'),
            };
        }
        if (snapshot.serviceStatus === 'running' && snapshot.vehicles?.length === 0) {
            return {
                color: black.third,
                icon: 'bus-clock',
                text: t('服務時段內，暫未有巴士出現'),
            };
        }
        const observedAt = Date.parse(snapshot.observedAt || '');
        const elapsedMinutes = Number.isFinite(observedAt)
            ? Math.max(0, Math.floor((now - observedAt) / 60000))
            : 0;
        return {
            color: success,
            icon: 'bus-marker',
            text: elapsedMinutes < 1
                ? t('服務中 · 剛剛更新')
                : t('服務中 · 約 {{minutes}} 分鐘前更新', {minutes: elapsedMinutes}),
        };
    }, [black.third, isLoading, now, snapshot, success, t, themeColor, warning]);

    return (
        <View style={[s.container, contentTopStyle]}>
            <ScrollView
                ref={routeScrollRef}
                style={s.routeScroll}
                onLayout={event => setRouteViewportHeight(event.nativeEvent.layout.height)}
                contentContainerStyle={[s.routeContent, routePanelInsetStyle]}
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                        tintColor={themeColor}
                        colors={[themeColor]}
                    />
                }>
                <BusRouteMap
                    countdownEnabled={Boolean(
                        isFocused
                        && isAppActive
                        && snapshot
                        && !snapshot.stale
                        && snapshot.deliverySource !== 'fallback'
                        && snapshot.deliverySource !== 'stale'
                    )}
                    maxHeight={routeMapMaxHeight}
                    observedAt={snapshot?.observedAt}
                    onSelectStop={handleSelectStop}
                    onSelectVehicle={plate => {
                        setSelectedVehiclePlate(plate);
                        setPanelExpanded(true);
                    }}
                    selectedStop={selectedStop}
                    selectedVehiclePlate={selectedVehiclePlate}
                    theme={theme}
                    translate={t}
                    vehicles={snapshot?.vehicles || []}
                />
            </ScrollView>

            <View style={s.panelOverlay}>
                <BusArrivalPanel
                    expanded={panelExpanded}
                    now={now}
                    onOpenMap={() => openLink({URL: UM_MAP, mode: 'fullScreen'})}
                    onOpenStats={() => setStatsVisible(true)}
                    onRefresh={handleRefresh}
                    onSelectStop={handleSelectStop}
                    onSelectVehicle={setSelectedVehiclePlate}
                    onToggleExpanded={() => setPanelExpanded(value => !value)}
                    onViewStop={openSelectedStopImage}
                    refreshing={isRefreshing}
                    selectedStop={selectedStop}
                    selectedVehiclePlate={selectedVehiclePlate}
                    snapshot={snapshot}
                    statusPresentation={statusPresentation}
                    theme={theme}
                    translate={t}
                />
            </View>

            <BusEtaStatsSheet
                visible={statsVisible}
                onClose={() => setStatsVisible(false)}
                selectedStop={selectedStop}
                selectedVehiclePlate={selectedVehiclePlate}
                snapshot={snapshot}
            />

            {/* ARKImageView 圖片查看器 */}
            <ARKImageView
                ref={imageViewerRef}
                imageUrls={processedStopImages}
            />
        </View>
    );
};

export default BusScreen;
