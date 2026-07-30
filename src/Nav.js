// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    NavigationContainer,
    useNavigationContainerRef,
    DefaultTheme,
    DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HeaderBackButton } from '@react-navigation/elements';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import * as QuickActions from 'expo-quick-actions';
import { trigger } from './utils/trigger';
import { useTranslation } from 'react-i18next';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';

import ClubDetail from './pages/TabbarPages/info/club/ClubDetail';
import EventDetail from './pages/TabbarPages/info/club/EventDetail';
import NewsDetail from './pages/TabbarPages/info/news/NewsDetail';
import UMEventDetail from './pages/TabbarPages/info/news/UMEventDetail';
import HarborTopicDetail from './pages/TabbarPages/arkHarbor/HarborTopicDetail';
import SearchScreen from './pages/TabbarPages/info/home/search/SearchScreen';
import {
    HarborCategoryListPage,
    HarborExplorePage,
    HarborTagListPage,
} from './pages/TabbarPages/arkHarbor/HarborDirectoryPage';
import HarborSearchPage from './pages/TabbarPages/arkHarbor/HarborSearchPage';
import HarborTopicListPage from './pages/TabbarPages/arkHarbor/HarborTopicListPage';
import HarborComposerPage from './pages/TabbarPages/arkHarbor/HarborComposerPage';
import HarborDraftsPage from './pages/TabbarPages/arkHarbor/HarborDraftsPage';
import HarborAccountSettingsPage from './pages/TabbarPages/my/pages/HarborAccountSettingsPage';
import HarborActivityPage from './pages/TabbarPages/my/pages/HarborActivityPage';
import HarborBadgesPage from './pages/TabbarPages/my/pages/HarborBadgesPage';
import HarborInboxPage from './pages/TabbarPages/my/pages/HarborInboxPage';

import LocalCourse from './pages/TabbarPages/course/pages/what2Reg/pages/LocalCourse';

import Webviewer from './components/Webviewer';
import AllEvents from './pages/TabbarPages/info/club/AllEvents';
import Bus from './pages/Features/Bus';
import CarPark from './pages/Features/CarPark';
import EatingSchedule from './pages/Features/EatingSchedule';
import UMOrg from './pages/Features/UMOrg';
import SettingPage from './pages/Features/SettingPage';
import { useTheme } from './components/ThemeContext';
import { useHarborSession } from './contexts/HarborSessionContext';

const Stack = createNativeStackNavigator();

const Nav = () => {
    const { theme } = useTheme();
    const { black } = theme;
    const { t } = useTranslation(['common', 'features', 'event', 'home']);
    const {
        consumeLoginIntent,
        pendingLoginIntent,
    } = useHarborSession();
    const navigationRef = useNavigationContainerRef();
    // 冷啟動：首 render 就暫存 initial，避免 onReady 早於 useEffect 而漏導航
    const pendingQuickActionRef = useRef(QuickActions.initial ?? null);
    const handledLoginIntentRef = useRef(null);

    // 與 ThemeContext 對齊，否則透明標題列下會透出 Navigation 預設淺色底（深色模式頂部出現白條）
    const navigationTheme = useMemo(() => {
        const base = theme.isLight ? DefaultTheme : DarkTheme;
        return {
            ...base,
            colors: {
                ...base.colors,
                primary: theme.themeColor,
                background: theme.bg_color,
                card: theme.white,
                text: theme.black.main,
                notification: theme.unread,
            },
        };
    }, [theme]);

    const handleQuickAction = useCallback(
        action => {
            if (!action) {
                return;
            }

            if (!navigationRef.isReady()) {
                pendingQuickActionRef.current = action;
                return;
            }

            switch (action.id) {
                case 'bus':
                    navigationRef.navigate('Bus');
                    break;
                case 'search':
                    navigationRef.navigate('Search');
                    break;
                default:
                    break;
            }
        },
        [navigationRef],
    );

    // 消費暫存的快捷操作（onReady / useEffect 雙邊兜底）
    const flushPendingQuickAction = useCallback(() => {
        const pendingAction = pendingQuickActionRef.current;
        if (!pendingAction || !navigationRef.isReady()) {
            return;
        }
        pendingQuickActionRef.current = null;
        // 延一幀，確保 Stack 子導覽已掛載
        requestAnimationFrame(() => {
            handleQuickAction(pendingAction);
        });
    }, [handleQuickAction, navigationRef]);

    const flushPendingLoginIntent = useCallback(() => {
        if (!pendingLoginIntent || !navigationRef.isReady()) {
            return;
        }

        const intentId = `${pendingLoginIntent.createdAt}:${pendingLoginIntent.routeName}`;
        if (handledLoginIntentRef.current === intentId) {
            return;
        }
        handledLoginIntentRef.current = intentId;
        requestAnimationFrame(() => {
            navigationRef.navigate(
                pendingLoginIntent.routeName,
                pendingLoginIntent.params,
            );
            consumeLoginIntent().catch(() => { });
        });
    }, [consumeLoginIntent, navigationRef, pendingLoginIntent]);

    const handleNavigationReady = useCallback(() => {
        flushPendingQuickAction();
        flushPendingLoginIntent();
    }, [flushPendingLoginIntent, flushPendingQuickAction]);

    useEffect(() => {
        const configureQuickActions = async () => {
            const supported = await QuickActions.isSupported();
            if (!supported) {
                return;
            }

            // 僅配置巴士、搜索；Android 不設 icon（系統會用 App 圖示）
            await QuickActions.setItems([
                {
                    id: 'bus',
                    title: t('校園巴士'),
                    subtitle: t('查看校巴到站情況'),
                    ...(Platform.OS === 'ios' ? { icon: 'symbol:bus' } : {}),
                },
                {
                    id: 'search',
                    title: t('搜索'),
                    subtitle: t('搜索關於澳大的一切'),
                    ...(Platform.OS === 'ios' ? { icon: 'search' } : {}),
                },
            ]);
        };

        configureQuickActions().catch(error => {
            console.warn('Quick Actions setup failed:', error);
        });

        // App 已開啟或位於背景時觸發
        const subscription = QuickActions.addListener(handleQuickAction);

        // 若 onReady 已先執行，這裡補導一次
        flushPendingQuickAction();

        return () => {
            subscription.remove();
        };
    }, [flushPendingQuickAction, handleQuickAction, t]);

    useEffect(() => {
        flushPendingLoginIntent();
    }, [flushPendingLoginIntent]);

    return (
        <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            onReady={handleNavigationReady}>
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={{
                    freezeOnBlur: true,
                    headerTransparent: isLiquidGlassSupported,
                    headerBlurEffect: isLiquidGlassSupported
                        ? null
                        : 'systemThinMaterial',
                    headerStyle: {
                        backgroundColor: isLiquidGlassSupported
                            ? 'transparent'
                            : theme.bg_color,
                        elevation: 0,
                    },
                    contentStyle: { backgroundColor: theme.bg_color },
                    headerTitleAlign: 'center',
                    headerBackButtonDisplayMode: 'minimal',
                    headerBackButtonMenuEnabled: false,
                    gestureEnabled: true,
                    headerTintColor: black.main,
                    // 與 ThemeContext 一致（自訂淺/深色時勿跟隨系統預設 auto）
                    statusBarStyle: theme.isLight ? 'dark' : 'light',
                }}>
                <Stack.Screen
                    name="Tabbar"
                    component={Tabbar}
                    options={{ headerShown: false }}
                />

                {/* 服務頁保持原有 Modal 配置 */}
                <Stack.Group
                    screenOptions={({ navigation }) => ({
                        headerTitle: '',
                        presentation: Platform.select({
                            android: 'card',
                            ios: Platform.isPad ? 'card' : 'modal',
                        }),
                        headerLeft: props =>
                            Platform.OS === 'android' ? (
                                <TouchableOpacity
                                    onPress={() => {
                                        trigger();
                                        navigation.goBack();
                                    }}
                                    style={{
                                        width: 36,
                                        height: 36,
                                        borderRadius: 18,
                                        backgroundColor:
                                            theme.black.main + '14',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                    <Ionicons
                                        name="chevron-back"
                                        size={22}
                                        color={black.main}
                                    />
                                </TouchableOpacity>
                            ) : (
                                <HeaderBackButton
                                    {...props}
                                    onPress={() => {
                                        trigger();
                                        navigation.goBack();
                                    }}
                                    label=""
                                />
                            ),
                    })}>
                    {/* 服務頁 */}
                    <Stack.Screen
                        name="Bus"
                        component={Bus}
                        options={{ headerTitle: t('校園巴士') }}
                    />
                    <Stack.Screen
                        name="CarPark"
                        component={CarPark}
                        options={{ headerTitle: t('車位') }}
                    />
                    <Stack.Screen
                        name="EatingSchedule"
                        component={EatingSchedule}
                        options={{ headerTitle: t('幹飯時間') }}
                    />
                    <Stack.Screen
                        name="UMOrg"
                        component={UMOrg}
                        options={{ headerTitle: t('澳大部門') }}
                    />

                    {/* 資訊頁 */}
                    {/* 圖片大標題頁：強制 light 讓狀態列圖示在深色封面圖上可見 */}
                    <Stack.Screen
                        name="ClubDetail"
                        component={ClubDetail}
                        options={{ statusBarStyle: 'light' }}
                    />
                    <Stack.Screen name="EventDetail" component={EventDetail} />
                    <Stack.Screen name="NewsDetail" component={NewsDetail} />
                    <Stack.Screen
                        name="UMEventDetail"
                        component={UMEventDetail}
                    />
                    <Stack.Screen
                        name="HarborExplore"
                        component={HarborExplorePage}
                    />
                    <Stack.Screen
                        name="HarborCategoryList"
                        component={HarborCategoryListPage}
                    />
                    <Stack.Screen
                        name="HarborCategoryTopics"
                        component={HarborTopicListPage}
                    />
                    <Stack.Screen
                        name="HarborTagList"
                        component={HarborTagListPage}
                    />
                    <Stack.Screen
                        name="HarborTagTopics"
                        component={HarborTopicListPage}
                    />
                    <Stack.Screen
                        name="HarborSearch"
                        component={HarborSearchPage}
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
                                    // 發佈／編輯話題使用一般堆疊頁，避免 iOS Modal 半屏上推
                                    presentation: 'card',
                                }
                        }
                    />
                    <Stack.Screen
                        name="HarborDrafts"
                        component={HarborDraftsPage}
                    />
                    <Stack.Screen name="AllEvents" component={AllEvents} />

                    {/* ARK選課 */}
                    <Stack.Screen name="LocalCourse" component={LocalCourse} />
                </Stack.Group>

                {/* 普通左右壓動畫組 */}
                <Stack.Group
                    screenOptions={{
                        headerTitle: '',
                    }}>
                    <Stack.Screen
                        name="HarborTopicDetail"
                        component={HarborTopicDetail}
                    />
                    <Stack.Screen
                        name="Search"
                        component={SearchScreen}
                        options={{ headerTitle: t('搜索') }}
                    />
                    <Stack.Screen name="Webviewer" component={Webviewer} />
                    <Stack.Screen
                        name="SettingPage"
                        component={SettingPage}
                        options={{ headerTitle: t('設置') }}
                    />
                    <Stack.Screen
                        name="HarborActivity"
                        component={HarborActivityPage}
                    />
                    <Stack.Screen
                        name="HarborInbox"
                        component={HarborInboxPage}
                    />
                    <Stack.Screen
                        name="HarborBadges"
                        component={HarborBadgesPage}
                    />
                    <Stack.Screen
                        name="HarborAccountSettings"
                        component={HarborAccountSettingsPage}
                    />
                </Stack.Group>
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Nav;
