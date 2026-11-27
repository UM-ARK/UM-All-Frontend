import React, {
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useSyncExternalStore,
} from 'react';
import { Platform, useWindowDimensions, View } from 'react-native';

import { trigger } from '../../../utils/trigger';
import { isLiquidGlassSupported } from '../../../utils/glassEffect';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../../../utils/windowSizeClass';
import { useTheme } from '../../../components/ThemeContext';
import TopTabLabel from '../../../components/TopTabLabel';
import HomePage from './home/index';
import ClubPage from './ClubPage';
import CampusPage from './CampusPage';

import { createMaterialTopTabNavigator, MaterialTopTabBar } from '@react-navigation/material-top-tabs';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useNavigation } from '@react-navigation/native';
import { moderateScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

const Tab = createMaterialTopTabNavigator();

// 平板只需要輕微放大，避免依短邊線性縮放後令頂部 Tab 過高
const TOP_TAB_SCALE_FACTOR = 0.1;
const TAB_INDICATOR_WIDTH = moderateScale(25, TOP_TAB_SCALE_FACTOR);
const TAB_BAR_HEIGHT = moderateScale(30, TOP_TAB_SCALE_FACTOR);

const createTabBarPropsStore = () => {
    let current = null;
    const listeners = new Set();
    return {
        getSnapshot: () => current,
        set: next => {
            current = next;
            listeners.forEach(listener => listener());
        },
        subscribe: listener => {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
    };
};

const TopTabBarPortalSource = ({ store, tabBarProps }) => {
    useEffect(() => {
        store.set(tabBarProps);
    });
    return null;
};

const TopTabBarPortalTarget = ({ store, width }) => {
    const tabBarProps = useSyncExternalStore(
        store.subscribe,
        store.getSnapshot,
    );
    if (!tabBarProps) {
        return null;
    }
    return (
        <View pointerEvents="box-none" style={{ width, height: TAB_BAR_HEIGHT }}>
            <MaterialTopTabBar
                {...tabBarProps}
                layout={{ ...tabBarProps.layout, width }}
            />
        </View>
    );
};

export default function NewsScreen() {
    const { theme } = useTheme();
    const { bg_color, black, themeColor } = theme;
    const { t } = useTranslation(['common', 'home']);
    const navigation = useNavigation();
    const { width: windowWidth } = useWindowDimensions();
    const { top } = useSafeAreaInsets();
    const useNativeHeader = Platform.OS === 'ios';
    const useNativeLiquidGlassHeader =
        useNativeHeader && isLiquidGlassSupported;
    const nativeHeaderHeight = useContext(HeaderHeightContext) ?? 0;
    const tabBarStoreRef = useRef(null);
    if (!tabBarStoreRef.current) {
        tabBarStoreRef.current = createTabBarPropsStore();
    }
    const headerTitleWidth = Math.min(
        Math.max(windowWidth - 40, 180),
        TOP_TAB_STRIP_MAX_WIDTH,
    );
    const topChromeHeight = useNativeHeader
        ? nativeHeaderHeight || top + TAB_BAR_HEIGHT
        : top + TAB_BAR_HEIGHT;

    useLayoutEffect(() => {
        if (!useNativeHeader) {
            return;
        }
        const store = tabBarStoreRef.current;
        navigation.setOptions({
            headerShown: true,
            contentStyle: { backgroundColor: bg_color },
            headerTitle: () => (
                <TopTabBarPortalTarget
                    store={store}
                    width={headerTitleWidth}
                />
            ),
        });
    }, [bg_color, headerTitleWidth, navigation, useNativeHeader]);

    const renderTopTabBar = useCallback(props => {
        if (useNativeHeader) {
            return (
                <TopTabBarPortalSource
                    store={tabBarStoreRef.current}
                    tabBarProps={props}
                />
            );
        }
        return (
            <View
                pointerEvents="box-none"
                style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 2, paddingTop: top }}>
                <View
                    pointerEvents="box-none"
                    style={{ width: '100%', maxWidth: TOP_TAB_STRIP_MAX_WIDTH, alignSelf: 'center' }}>
                    <MaterialTopTabBar {...props} />
                </View>
            </View>
        );
    }, [top, useNativeHeader]);

    return (
        <View style={{ backgroundColor: bg_color, flex: 1 }}>
            <Tab.Navigator
                tabBar={renderTopTabBar}
                screenOptions={{
                    sceneStyle: { backgroundColor: bg_color },
                    tabBarLabel: TopTabLabel,
                    tabBarStyle: {
                        backgroundColor: 'transparent',
                        height: TAB_BAR_HEIGHT,
                        overflow: 'hidden',
                        elevation: 0,
                        shadowOpacity: 0,
                    },
                    tabBarItemStyle: {
                        minHeight: TAB_BAR_HEIGHT,
                        paddingVertical: 0,
                    },
                    tabBarContentContainerStyle: {
                        alignItems: 'center',
                        justifyContent: 'center',
                    },
                    tabBarBounces: false,
                    tabBarActiveTintColor: black.second,
                    tabBarInactiveTintColor: black.third,
                    tabBarPressColor: bg_color,
                    tabBarIndicatorStyle: {
                        backgroundColor: themeColor,
                        width: TAB_INDICATOR_WIDTH,
                        marginHorizontal: 'auto',
                    },
                    lazy: true,
                }}
                initialRouteName="HomePage">
                <Tab.Screen
                    name="ClubPage"
                    options={{ title: t('TOPTAB_CLUB') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}>
                    {props => (
                        <ClubPage
                            {...props}
                            topChromeHeight={topChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                        />
                    )}
                </Tab.Screen>
                <Tab.Screen
                    name="HomePage"
                    options={{ title: t('TOPTAB_MAIN') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}>
                    {props => (
                        <HomePage
                            {...props}
                            topChromeHeight={topChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                        />
                    )}
                </Tab.Screen>
                <Tab.Screen
                    name="CampusPage"
                    options={{ title: t('TOPTAB_CAMPUS') }}
                    listeners={() => ({
                        tabPress: () => trigger(),
                    })}>
                    {props => (
                        <CampusPage
                            {...props}
                            topChromeHeight={topChromeHeight}
                            useNativeLiquidGlassHeader={useNativeLiquidGlassHeader}
                        />
                    )}
                </Tab.Screen>
            </Tab.Navigator>
        </View>
    );
}
