import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../components/ThemeContext';
import { useAppReducedMotion } from '../contexts/ReducedMotionContext';
import { isLiquidGlassSupported } from '../utils/glassEffect';
import { useWindowSizeClass } from '../utils/windowSizeClass';
import { getNativeStackScreenOptions } from './nativeStackOptions';
import { renderSharedStackScreens } from './sharedScreens';

/**
 * 為單一 iOS 底部 Tab 建立內建 Native Stack：
 * 1. 讓 1 級首頁與所有 2 級子頁共用同一條原生 UINavigationBar，
 *    側滑返回時不再切換 navigationBarHidden，避免標題列偏移。
 * 2. 進入 2 級頁時自動隱藏原生底部 TabBar，返回首頁後恢復。
 */
export const createTabNativeStack = ({
    homeRouteName,
    HomeComponent,
    getHomeOptions,
    inDrawer = false,
}) => {
    const Stack = createNativeStackNavigator();

    const TabNativeStack = ({ navigation }) => {
        const { theme } = useTheme();
        const reducedMotion = useAppReducedMotion();
        const windowSizeClass = useWindowSizeClass();
        const { t } = useTranslation(['common', 'features', 'event', 'home', 'my']);
        const isNestedRef = useRef(false);

        const syncParentChrome = useCallback(
            isNested => {
                if (isNestedRef.current === isNested) {
                    return;
                }
                isNestedRef.current = isNested;
                if (inDrawer) {
                    // 進入二級頁時停用抽屜側滑，避免與 iOS 原生側滑返回衝突
                    navigation.setOptions({
                        swipeEnabled: !isNested,
                    });
                }
                // 進入二級頁時隱藏原生底部 TabBar，返回首頁後恢復
                const tabNavigation = inDrawer
                    ? navigation.getParent()
                    : navigation;
                tabNavigation?.setOptions({
                    tabBarStyle: isNested
                        ? {
                            backgroundColor: isLiquidGlassSupported
                                ? 'transparent'
                                : theme.bg_color,
                            borderTopWidth: 0,
                            display: 'none',
                        }
                        : undefined,
                });
            },
            [navigation, theme.bg_color],
        );

        useEffect(() => {
            return () => {
                if (isNestedRef.current) {
                    isNestedRef.current = false;
                    if (inDrawer) {
                        navigation.setOptions({ swipeEnabled: true });
                        navigation.getParent()?.setOptions({
                            tabBarStyle: undefined,
                        });
                    } else {
                        navigation.setOptions({
                            tabBarStyle: undefined,
                        });
                    }
                }
            };
        }, [navigation]);

        const screenOptions = useMemo(
            () =>
                getNativeStackScreenOptions({
                    theme,
                    reducedMotion,
                    headerTitle: '',
                }),
            [reducedMotion, theme],
        );

        const homeOptions = useMemo(
            () =>
                getHomeOptions
                    ? getHomeOptions({ theme, ...windowSizeClass })
                    : { headerShown: true },
            [theme, windowSizeClass],
        );

        return (
            <Stack.Navigator
                initialRouteName={homeRouteName}
                screenListeners={{
                    state: event => {
                        const stackIndex = event.data?.state?.index ?? 0;
                        syncParentChrome(stackIndex > 0);
                    },
                }}
                screenOptions={screenOptions}>
                <Stack.Screen
                    name={homeRouteName}
                    component={HomeComponent}
                    options={homeOptions}
                />
                {renderSharedStackScreens(Stack, { theme, t })}
            </Stack.Navigator>
        );
    };

    return TabNativeStack;
};
