import React, { useCallback, useEffect, useRef } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import { useTheme } from '../../../components/ThemeContext';
import { useAppReducedMotion } from '../../../contexts/ReducedMotionContext';
import { isLiquidGlassSupported } from '../../../utils/glassEffect';
import { useWindowSizeClass } from '../../../utils/windowSizeClass';
import HarborChatChannelPage from './HarborChatChannelPage';
import HarborChatListPage from './HarborChatListPage';
import HarborComposerPage from './HarborComposerPage';
import {
    HarborCategoryListPage,
    HarborExplorePage,
    HarborTagListPage,
} from './HarborDirectoryPage';
import HarborDraftsPage from './HarborDraftsPage';
import HarborPendingPostDetailPage from './HarborPendingPostDetailPage';
import HarborPendingPostsPage from './HarborPendingPostsPage';
import HarborSearchPage from './HarborSearchPage';
import HarborTopicDetail from './HarborTopicDetail';
import HarborTopicListPage from './HarborTopicListPage';
import HarborReviewQueuePage from './review/HarborReviewQueuePage';
import HarborProfilePage from '../my/pages/HarborProfilePage';

const Stack = createNativeStackNavigator();

/**
 * iOS 論壇分頁內建原生 Native Stack：
 * 讓首頁與所有 Harbor 子頁共用同一條原生 UINavigationBar，
 * 側滑返回時不再切換 navigationBarHidden，避免標題列偏移。
 */
export const createHarborNativeStack = HomeComponent => {
    const HarborNativeStack = ({ navigation: drawerNavigation }) => {
        const { theme } = useTheme();
        const reducedMotion = useAppReducedMotion();
        const { isExpanded } = useWindowSizeClass();
        const isNestedRef = useRef(false);

        const syncParentChrome = useCallback(
            isNested => {
                if (isNestedRef.current === isNested) {
                    return;
                }
                isNestedRef.current = isNested;
                // 進入二級頁時停用抽屜側滑，避免與 iOS 原生側滑返回衝突
                drawerNavigation.setOptions({
                    swipeEnabled: !isNested,
                });
                // 進入二級頁時平滑隱藏原生底部 TabBar，返回首頁後恢復
                const tabNavigation = drawerNavigation.getParent();
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
            [drawerNavigation, theme.bg_color],
        );

        useEffect(() => {
            return () => {
                if (isNestedRef.current) {
                    isNestedRef.current = false;
                    drawerNavigation.setOptions({ swipeEnabled: true });
                    drawerNavigation.getParent()?.setOptions({
                        tabBarStyle: undefined,
                    });
                }
            };
        }, [drawerNavigation]);

        return (
            <Stack.Navigator
                initialRouteName="HarborFeedHome"
                screenListeners={{
                    state: event => {
                        const stackIndex = event.data?.state?.index ?? 0;
                        syncParentChrome(stackIndex > 0);
                    },
                }}
                screenOptions={{
                    freezeOnBlur: true,
                    animation: reducedMotion ? 'fade' : undefined,
                    headerTransparent: isLiquidGlassSupported,
                    headerBlurEffect: isLiquidGlassSupported
                        ? null
                        : 'systemThinMaterial',
                    scrollEdgeEffects: isLiquidGlassSupported
                        ? { top: 'soft' }
                        : undefined,
                    headerStyle: {
                        backgroundColor: isLiquidGlassSupported
                            ? 'transparent'
                            : theme.bg_color,
                        elevation: 0,
                    },
                    contentStyle: { backgroundColor: theme.bg_color },
                    headerTitle: '',
                    headerTitleAlign: 'center',
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackButtonMenuEnabled: false,
                    gestureEnabled: true,
                    headerTintColor: theme.black.main,
                    statusBarStyle: theme.isLight ? 'dark' : 'light',
                }}>
                <Stack.Screen
                    name="HarborFeedHome"
                    component={HomeComponent}
                    options={{
                        headerShown: !isExpanded,
                    }}
                />
                <Stack.Screen
                    name="HarborTopicDetail"
                    component={HarborTopicDetail}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborComposer"
                    component={HarborComposerPage}
                    options={({ route }) =>
                        route.params?.mode === 'reply'
                            ? {
                                animation: 'fade',
                                contentStyle: {
                                    backgroundColor: 'transparent',
                                },
                                gestureEnabled: false,
                                headerShown: false,
                                presentation: 'transparentModal',
                            }
                            : {
                                presentation: 'card',
                            }
                    }
                />
                <Stack.Screen
                    name="HarborSearch"
                    component={HarborSearchPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborChatList"
                    component={HarborChatListPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborChatChannel"
                    component={HarborChatChannelPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborExplore"
                    component={HarborExplorePage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborCategoryList"
                    component={HarborCategoryListPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborCategoryTopics"
                    component={HarborTopicListPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborTagList"
                    component={HarborTagListPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborTagTopics"
                    component={HarborTopicListPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborDrafts"
                    component={HarborDraftsPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborPendingPosts"
                    component={HarborPendingPostsPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborPendingPostDetail"
                    component={HarborPendingPostDetailPage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborProfile"
                    component={HarborProfilePage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborReviewQueue"
                    component={HarborReviewQueuePage}
                    options={{ presentation: 'card' }}
                />
                <Stack.Screen
                    name="HarborReviewDetail"
                    component={HarborReviewQueuePage}
                    options={{ presentation: 'card' }}
                />
            </Stack.Navigator>
        );
    };

    return HarborNativeStack;
};
