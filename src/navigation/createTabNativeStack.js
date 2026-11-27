import React, { useMemo } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '../components/ThemeContext';
import { useAppReducedMotion } from '../contexts/ReducedMotionContext';
import { useWindowSizeClass } from '../utils/windowSizeClass';
import { getNativeStackScreenOptions } from './nativeStackOptions';

/**
 * 為單一 iOS 底部 Tab 建立單頁 Native Stack：
 * 僅為 1 級首頁提供原生 UINavigationBar（液態玻璃頂欄與 scrollEdgeEffects）；
 * 所有 2 級子頁統一留在外層 Root Stack（src/Nav.js），自然覆蓋 Tab Bar 且無需手動隱藏。
 */
export const createTabNativeStack = ({
    homeRouteName,
    HomeComponent,
    getHomeOptions,
}) => {
    const Stack = createNativeStackNavigator();

    const TabNativeStack = () => {
        const { theme } = useTheme();
        const reducedMotion = useAppReducedMotion();
        const windowSizeClass = useWindowSizeClass();

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
                screenOptions={screenOptions}>
                <Stack.Screen
                    name={homeRouteName}
                    component={HomeComponent}
                    options={homeOptions}
                />
            </Stack.Navigator>
        );
    };

    return TabNativeStack;
};
