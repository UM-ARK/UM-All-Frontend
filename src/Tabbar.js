import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, useWindowDimensions, View } from 'react-native';

import { useTheme } from './components/ThemeContext';

import { scale, verticalScale } from 'react-native-size-matters';

import { useTranslation } from 'react-i18next';

// 原生 Tab Bar 元件，iOS 使用下方實作，Android 使用上方實作
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeBottomTabNavigator } from '@react-navigation/bottom-tabs/unstable';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
import ForumPage from './pages/TabbarPages/arkHarbor';
import CourseTab from './pages/TabbarPages/course';
import MyScreen from './pages/TabbarPages/my';

import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { trigger } from './utils/trigger';
import { uiStyle } from './components/ThemeContext';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHarborSession } from './contexts/HarborSessionContext';
import { fetchHarborForumBadgeSnapshot } from './utils/harbor/harborApi';
import {
    acknowledgeHarborForumBadgeState,
    createHarborForumBadgeState,
    formatHarborTabBadge,
    getHarborForumBadgeCount,
    loadHarborForumBadgeState,
    saveHarborForumBadgeState,
    updateHarborForumBadgeState,
} from './utils/harbor/harborBadge';

// 圖示說明
const tabIconDescription = {
    NewsTabbar: '資訊',
    ForumTabbar: '論壇',
    CourseTab: '選課',
    FeaturesTabbar: '服務',
    MyTabbar: '我的',
};

// 頁面元件映射（插入順序決定底部 Tab 由左至右排列）
const tabScreen = {
    NewsTabbar: NewsScreen,
    ForumTabbar: ForumPage,
    // 搵課與課表模擬已合併為 CourseTab 內的兩個段落
    CourseTab: CourseTab,
    FeaturesTabbar: FeaturesScreen,
    MyTabbar: MyScreen,
};

// iOS SF Symbols 設定
const iosTabIconConfig = {
    NewsTabbar: 'newspaper',
    ForumTabbar: 'ellipsis.bubble',
    CourseTab: 'text.book.closed',
    FeaturesTabbar: 'square.grid.2x2',
    MyTabbar: 'person.crop.circle',
};

// Android MaterialCommunityIcons 名稱映射
const androidTabIconConfig = {
    NewsTabbar: 'newspaper-variant',
    ForumTabbar: 'message',
    CourseTab: 'book-open-page-variant',
    FeaturesTabbar: 'view-grid',
    MyTabbar: 'account-circle',
};

// 論壇更新角標一般刷新間隔
const FORUM_BADGE_STALE_MS = 5 * 60 * 1000;

// 保持 Navigator 元件穩定，避免視窗縮放時重設目前分頁
const IOSNativeTabs = createNativeBottomTabNavigator();
const AndroidBottomTabs = createBottomTabNavigator();

/**
 * 取得 Tab Bar 樣式（iOS 勿硬編碼純白，深色模式下會與主題脫節）
 */
const getTabBarStyle = theme => {
    if (Platform.OS === 'ios') {
        return {
            // 液態玻璃 + translucent 時由系統材質呈現；否則與頁面背景一致
            backgroundColor: isLiquidGlassSupported
                ? 'transparent'
                : theme.bg_color,
            borderTopWidth: 0,
        };
    }
    return {
        backgroundColor: theme.bg_color,
        borderTopColor: theme.isLight
            ? 'rgba(0,0,0,0.1)'
            : 'rgba(255,255,255,0.1)',
        borderTopWidth: 0.5,
        elevation: 8,
    };
};

// iOS Tab Bar 類別
class IOSTabbar {
    constructor(
        t,
        insets,
        theme,
        isLandscape,
        labelFontSize,
        useSidebar,
        badges,
        badgeListeners,
    ) {
        this.Tabs = IOSNativeTabs;
        this.theme = theme;
        this.badges = badges || {};
        this.badgeListeners = badgeListeners || {};
        this.getTabbarIcon = (routeName, focused) => {
            let baseName = iosTabIconConfig[routeName] || 'questionmark.circle';
            if (focused) {
                baseName += '.fill';
            }
            return {
                type: 'sfSymbol',
                name: baseName,
            };
        };
        this.createTabScreen = name => {
            const tabBarBadge = this.badges[name];
            const listeners = this.badgeListeners[name];
            return (
                <this.Tabs.Screen
                    name={name}
                    component={tabScreen[name]}
                    options={{
                        title: t(tabIconDescription[name]),
                        tabBarBadge,
                        tabBarBadgeStyle: {
                            backgroundColor: this.theme.unread,
                        },
                    }}
                    listeners={
                        listeners ? () => listeners : undefined
                    }
                />
            );
        };
        this.createTabbar = () => {
            return (
                <this.Tabs.Navigator
                    screenOptions={({ route }) => ({
                        tabBarLabelStyle: {
                            ...uiStyle.defaultText,
                            fontSize: labelFontSize,
                            fontWeight: '600',
                        },
                        tabBarActiveTintColor: theme.themeColor,
                        tabBarInactiveTintColor: theme.black.main,
                        tabBarStyle: getTabBarStyle(theme),
                        translucent: isLiquidGlassSupported ? true : false,
                        tabBarIcon: ({ focused }) =>
                            this.getTabbarIcon(route.name, focused),
                        tabBarShowLabel: useSidebar || !isLandscape,
                        tabBarControllerMode: useSidebar
                            ? 'tabSidebar'
                            : 'tabBar',
                        tabBarMinimizeBehavior: useSidebar
                            ? undefined
                            : 'onScrollDown',
                    })}
                    hapticFeedbackEnabled={true}>
                    {Object.keys(tabScreen).map(name =>
                        this.createTabScreen(name),
                    )}
                </this.Tabs.Navigator>
            );
        };
    }
}

// Android Tab Bar 類別
class AndroidTabbar {
    constructor(
        t,
        insets,
        theme,
        isLandscape,
        labelFontSize,
        useSidebar,
        badges,
        badgeListeners,
    ) {
        this.Tabs = AndroidBottomTabs;
        this.theme = theme;
        this.badges = badges || {};
        this.badgeListeners = badgeListeners || {};

        this.getTabbarIcon = (routeName, focused, color) => {
            let baseName = androidTabIconConfig[routeName] || 'help-circle';
            if (!focused) {
                baseName += '-outline';
            }
            return (
                <MaterialCommunityIcons
                    name={baseName}
                    size={24}
                    color={focused ? color : '#222'}
                />
            );
        };

        this.createTabScreen = name => {
            const tabBarBadge = this.badges[name];
            const listeners = this.badgeListeners[name];
            return (
                <this.Tabs.Screen
                    name={name}
                    component={tabScreen[name]}
                    options={{
                        tabBarIcon: ({ focused, color }) =>
                            this.getTabbarIcon(name, focused, color),
                        title: t(tabIconDescription[name]),
                        tabBarBadge,
                        tabBarBadgeStyle: {
                            backgroundColor: this.theme.unread,
                        },
                    }}
                    listeners={() => ({
                        tabPress: event => {
                            trigger();
                            listeners?.tabPress?.(event);
                        },
                        ...(listeners?.focus ? { focus: listeners.focus } : {}),
                    })}
                />
            );
        };

        this.createTabbar = () => {
            // 勿在此包 SafeAreaView（edges top）：各分頁已自行處理頂部 insets，否則與
            // NewsScreen / CourseSim 等重疊會導致 Android 頂部留白過大或佈局異常
            return (
                <View style={{ flex: 1, backgroundColor: theme.bg_color }}>
                    <this.Tabs.Navigator
                        screenOptions={{
                            headerShown: false,
                            tabBarLabelStyle: {
                                ...uiStyle.defaultText,
                                fontSize: labelFontSize,
                                fontWeight: '600',
                            },
                            tabBarActiveTintColor: theme.themeColor,
                            tabBarInactiveTintColor: theme.black.main,
                            tabBarStyle: getTabBarStyle(theme),
                        }}
                        initialRouteName={'NewsTabbar'}>
                        {Object.keys(tabScreen).map(name =>
                            this.createTabScreen(name),
                        )}
                    </this.Tabs.Navigator>
                </View>
            );
        };
    }
}

// 工廠函式
export const tabbarFactory = (
    platform,
    t,
    insets,
    theme,
    isLandscape,
    labelFontSize,
    useSidebar,
    badges,
    badgeListeners,
) => {
    let tabbarClass = null;
    if (platform === 'ios') {
        tabbarClass = IOSTabbar;
    } else {
        tabbarClass = AndroidTabbar;
    }

    return new tabbarClass(
        t,
        insets,
        theme,
        isLandscape,
        labelFontSize,
        useSidebar,
        badges,
        badgeListeners,
    ).createTabbar();
};

const Tabbar = () => {
    const { theme } = useTheme();
    const { t } = useTranslation(['common', 'home']);
    const { width, height } = useWindowDimensions();
    const {
        status,
        user,
        inboxUnreadCount,
        refresh,
        refreshInboxUnreadCount,
    } = useHarborSession();
    const [forumBadgeState, setForumBadgeState] = useState(() =>
        createHarborForumBadgeState(),
    );
    const forumBadgeRequestRef = useRef(0);
    const forumBadgeLastRefreshAtRef = useRef(0);
    const forumBadgeStateRef = useRef(forumBadgeState);
    const forumBadgeStorageReadyRef = useRef(false);
    const forumBadgeAcknowledgePendingRef = useRef(false);
    const forumBadgeAcknowledgeUsernameRef = useRef('');
    const [forumBadgeStorageReady, setForumBadgeStorageReady] =
        useState(false);
    const isSignedIn = status === 'signedIn' && !!user;
    const signedInUsername = isSignedIn ? user.username : '';

    // 跟隨 iPad Stage Manager 與 Mac 視窗大小即時切換導覽模式
    const isLandscape = width > height;
    const interfaceIdiom = Platform.constants?.interfaceIdiom;
    const useSidebar =
        Platform.OS === 'ios' &&
        width >= 768 &&
        (Platform.isPad || Platform.isMacCatalyst || interfaceIdiom === 'mac');

    // 字體大小
    const labelFontSize = isLandscape ? verticalScale(10) : scale(10);

    const myUnreadTotal = isSignedIn
        ? inboxUnreadCount
        : 0;

    const refreshForumBadge = useCallback(
        async ({ acknowledge = false } = {}) => {
            if (!signedInUsername || !forumBadgeStorageReadyRef.current) {
                if (acknowledge) {
                    forumBadgeAcknowledgePendingRef.current = true;
                    forumBadgeAcknowledgeUsernameRef.current =
                        signedInUsername;
                }
                return;
            }

            const shouldAcknowledge =
                acknowledge ||
                (forumBadgeAcknowledgePendingRef.current &&
                    forumBadgeAcknowledgeUsernameRef.current ===
                        signedInUsername);
            if (
                !shouldAcknowledge &&
                Date.now() - forumBadgeLastRefreshAtRef.current <
                    FORUM_BADGE_STALE_MS
            ) {
                return;
            }
            const currentState = forumBadgeStateRef.current;
            const requestId = forumBadgeRequestRef.current + 1;
            forumBadgeRequestRef.current = requestId;
            try {
                const snapshot = await fetchHarborForumBadgeSnapshot({
                    since: shouldAcknowledge
                        ? undefined
                        : currentState.acknowledgedAt,
                });
                if (forumBadgeRequestRef.current === requestId) {
                    forumBadgeLastRefreshAtRef.current = Date.now();
                    setForumBadgeState(previousState => {
                        const nextState = updateHarborForumBadgeState(
                            previousState,
                            signedInUsername,
                            snapshot,
                            { acknowledge: shouldAcknowledge },
                        );
                        forumBadgeStateRef.current = nextState;
                        return nextState;
                    });
                    forumBadgeAcknowledgePendingRef.current = false;
                    forumBadgeAcknowledgeUsernameRef.current = '';
                }
            } catch {
                // 角標失敗時保留上次數值，避免閃爍消失
            }
        },
        [signedInUsername],
    );

    useEffect(() => {
        let active = true;
        forumBadgeRequestRef.current += 1;
        forumBadgeLastRefreshAtRef.current = 0;
        forumBadgeStorageReadyRef.current = false;
        if (
            forumBadgeAcknowledgeUsernameRef.current !==
            signedInUsername
        ) {
            forumBadgeAcknowledgePendingRef.current = false;
            forumBadgeAcknowledgeUsernameRef.current = '';
        }
        setForumBadgeStorageReady(false);

        if (!signedInUsername) {
            const nextState = createHarborForumBadgeState();
            forumBadgeStateRef.current = nextState;
            setForumBadgeState(nextState);
            return () => {
                active = false;
            };
        }

        loadHarborForumBadgeState(signedInUsername).then(restoredState => {
            if (!active) {
                return;
            }
            const nextState =
                forumBadgeAcknowledgePendingRef.current &&
                forumBadgeAcknowledgeUsernameRef.current ===
                    signedInUsername
                ? acknowledgeHarborForumBadgeState(
                      restoredState,
                      signedInUsername,
                  )
                : restoredState;
            forumBadgeStateRef.current = nextState;
            setForumBadgeState(nextState);
            forumBadgeStorageReadyRef.current = true;
            setForumBadgeStorageReady(true);
        });

        return () => {
            active = false;
        };
    }, [signedInUsername]);

    useEffect(() => {
        if (!forumBadgeStorageReady || !signedInUsername) {
            return undefined;
        }

        refreshForumBadge();
        const subscription = AppState.addEventListener('change', nextState => {
            if (nextState === 'active') {
                refreshForumBadge();
            }
        });

        return () => {
            forumBadgeRequestRef.current += 1;
            subscription.remove();
        };
    }, [
        forumBadgeStorageReady,
        refreshForumBadge,
        signedInUsername,
    ]);

    useEffect(() => {
        forumBadgeStateRef.current = forumBadgeState;
        if (
            forumBadgeStorageReady &&
            forumBadgeState.username === signedInUsername
        ) {
            saveHarborForumBadgeState(forumBadgeState).catch(() => {});
        }
    }, [
        forumBadgeState,
        forumBadgeStorageReady,
        signedInUsername,
    ]);

    const acknowledgeForumBadge = useCallback(() => {
        if (!signedInUsername) {
            return;
        }
        forumBadgeRequestRef.current += 1;
        forumBadgeAcknowledgePendingRef.current = true;
        forumBadgeAcknowledgeUsernameRef.current = signedInUsername;
        setForumBadgeState(currentState => {
            const nextState = acknowledgeHarborForumBadgeState(
                currentState,
                signedInUsername,
            );
            forumBadgeStateRef.current = nextState;
            return nextState;
        });
    }, [signedInUsername]);

    const forumNewTopicsSinceEntry = getHarborForumBadgeCount(
        forumBadgeState,
        signedInUsername,
    );

    const badges = useMemo(
        () => ({
            ForumTabbar: formatHarborTabBadge(
                isSignedIn ? forumNewTopicsSinceEntry : 0,
            ),
            MyTabbar: formatHarborTabBadge(myUnreadTotal),
        }),
        [forumNewTopicsSinceEntry, isSignedIn, myUnreadTotal],
    );

    const badgeListeners = useMemo(
        () => ({
            ForumTabbar: {
                tabPress: acknowledgeForumBadge,
                focus: () => {
                    acknowledgeForumBadge();
                    refreshForumBadge({ acknowledge: true });
                },
            },
            MyTabbar: {
                focus: () => {
                    if (isSignedIn) {
                        Promise.allSettled([
                            refresh(),
                            refreshInboxUnreadCount(),
                        ]);
                    }
                },
            },
        }),
        [
            acknowledgeForumBadge,
            isSignedIn,
            refresh,
            refreshInboxUnreadCount,
            refreshForumBadge,
        ],
    );

    const TabbarComponent = tabbarFactory(
        Platform.OS,
        t,
        null,
        theme,
        isLandscape,
        labelFontSize,
        useSidebar,
        badges,
        badgeListeners,
    );

    return TabbarComponent;
};

export default Tabbar;
