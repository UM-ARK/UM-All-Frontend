import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform, useWindowDimensions, View } from 'react-native';

import { useTheme } from './components/ThemeContext';

import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
import { usePushRegistration } from './contexts/PushRegistrationContext';
import { fetchHarborForumBadgeSnapshot } from './utils/harbor/harborApi';
import {
    acknowledgeHarborForumBadgeState,
    calculateHarborMyTabBadgeTotal,
    createHarborForumBadgeState,
    formatHarborTabBadge,
    getHarborForumBadgeCount,
    HARBOR_FORUM_BADGE_GUEST_SCOPE,
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

// Android 內容區沿用 React Navigation 預設高度；底部為系統 inset（保底避免貼手勢條）
const ANDROID_TAB_BAR_CONTENT_HEIGHT = 49;
const ANDROID_TAB_BAR_MIN_BOTTOM_INSET = 8;
const ANDROID_TAB_ICON_SIZE = 24;

/**
 * 取得 Tab Bar 樣式（iOS 勿硬編碼純白，深色模式下會與主題脫節）
 */
const getTabBarStyle = (theme, insets) => {
    if (Platform.OS === 'ios') {
        return {
            // 液態玻璃 + translucent 時由系統材質呈現；否則與頁面背景一致
            backgroundColor: isLiquidGlassSupported
                ? 'transparent'
                : theme.bg_color,
            borderTopWidth: 0,
        };
    }
    // 部分機型 insets.bottom 偏小甚至為 0，但仍有手勢白條，需保底
    const bottomInset = Math.max(
        insets?.bottom ?? 0,
        verticalScale(ANDROID_TAB_BAR_MIN_BOTTOM_INSET),
    );
    return {
        backgroundColor: theme.bg_color,
        borderTopColor: theme.isLight
            ? 'rgba(0,0,0,0.1)'
            : 'rgba(255,255,255,0.1)',
        borderTopWidth: 0.5,
        elevation: 8,
        // 高度只加一次 bottomInset；icon/文字緊湊靠 item 樣式，不靠加高內容區
        height: ANDROID_TAB_BAR_CONTENT_HEIGHT + bottomInset,
        paddingBottom: bottomInset,
        paddingTop: 0,
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
                        tabBarStyle: getTabBarStyle(theme, insets),
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
                    size={ANDROID_TAB_ICON_SIZE}
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
                            // 對齊 iOS：icon 與文字貼緊；底部空隙只留給系統手勢條
                            tabBarLabelStyle: {
                                ...uiStyle.defaultText,
                                fontSize: labelFontSize,
                                fontWeight: '600',
                                lineHeight: labelFontSize + 2,
                                includeFontPadding: false,
                                // 略為上拉，對齊 iOS icon/文字貼緊感
                                marginTop: -2,
                                paddingTop: 0,
                                paddingBottom: 0,
                            },
                            tabBarIconStyle: {
                                // 覆寫 uikit 預設 28 高容器，避免 icon 下方留白把文字撐開
                                width: ANDROID_TAB_ICON_SIZE,
                                height: ANDROID_TAB_ICON_SIZE,
                                marginTop: 0,
                                marginBottom: 0,
                            },
                            tabBarActiveTintColor: theme.themeColor,
                            tabBarInactiveTintColor: theme.black.main,
                            tabBarStyle: getTabBarStyle(theme, insets),
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
    const insets = useSafeAreaInsets();
    const {
        status,
        user,
        inboxUnreadCount,
        chatUnreadCount,
        reviewCount,
        refresh,
        refreshInboxUnreadCount,
        refreshChatUnreadCount,
    } = useHarborSession();
    const { shouldShowHarborPrompt } = usePushRegistration();
    const [forumBadgeState, setForumBadgeState] = useState(() =>
        createHarborForumBadgeState(),
    );
    const forumBadgeRequestRef = useRef(0);
    const forumBadgeLastRefreshAtRef = useRef(0);
    const forumBadgeStateRef = useRef(forumBadgeState);
    const forumBadgeStorageReadyRef = useRef(false);
    const forumBadgeAcknowledgePendingRef = useRef(false);
    const forumBadgeAcknowledgeScopeRef = useRef('');
    const [forumBadgeStorageReady, setForumBadgeStorageReady] =
        useState(false);
    const isSignedIn = status === 'signedIn' && !!user;
    const signedInUsername = isSignedIn ? user.username : '';
    const forumBadgeScope = signedInUsername ||
        (status === 'signedOut' || status === 'expired'
            ? HARBOR_FORUM_BADGE_GUEST_SCOPE
            : '');
    const isGuestForumBadge =
        forumBadgeScope === HARBOR_FORUM_BADGE_GUEST_SCOPE;

    // 跟隨 iPad Stage Manager 與 Mac 視窗大小即時切換導覽模式
    const isLandscape = width > height;
    const interfaceIdiom = Platform.constants?.interfaceIdiom;
    const useSidebar =
        Platform.OS === 'ios' &&
        width >= 768 &&
        (Platform.isPad || Platform.isMacCatalyst || interfaceIdiom === 'mac');

    // 字體大小
    const labelFontSize = isLandscape ? verticalScale(10) : scale(10);

    const myTabBadgeTotal = isSignedIn
        ? calculateHarborMyTabBadgeTotal(
            inboxUnreadCount,
            chatUnreadCount,
            reviewCount,
            shouldShowHarborPrompt,
        )
        : 0;

    const refreshForumBadge = useCallback(
        async ({ acknowledge = false } = {}) => {
            if (!forumBadgeScope || !forumBadgeStorageReadyRef.current) {
                if (acknowledge) {
                    forumBadgeAcknowledgePendingRef.current = true;
                    forumBadgeAcknowledgeScopeRef.current = forumBadgeScope;
                }
                return;
            }

            const shouldAcknowledge =
                acknowledge ||
                (forumBadgeAcknowledgePendingRef.current &&
                    forumBadgeAcknowledgeScopeRef.current ===
                        forumBadgeScope);
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
                    publicOnly: isGuestForumBadge,
                    since: shouldAcknowledge
                        ? undefined
                        : currentState.acknowledgedAt,
                });
                if (forumBadgeRequestRef.current === requestId) {
                    forumBadgeLastRefreshAtRef.current = Date.now();
                    setForumBadgeState(previousState => {
                        const nextState = updateHarborForumBadgeState(
                            previousState,
                            forumBadgeScope,
                            snapshot,
                            { acknowledge: shouldAcknowledge },
                        );
                        forumBadgeStateRef.current = nextState;
                        return nextState;
                    });
                    forumBadgeAcknowledgePendingRef.current = false;
                    forumBadgeAcknowledgeScopeRef.current = '';
                }
            } catch {
                // 角標失敗時保留上次數值，避免閃爍消失
            }
        },
        [forumBadgeScope, isGuestForumBadge],
    );

    useEffect(() => {
        let active = true;
        forumBadgeRequestRef.current += 1;
        forumBadgeLastRefreshAtRef.current = 0;
        forumBadgeStorageReadyRef.current = false;
        if (
            forumBadgeAcknowledgeScopeRef.current !== forumBadgeScope
        ) {
            forumBadgeAcknowledgePendingRef.current = false;
            forumBadgeAcknowledgeScopeRef.current = '';
        }
        setForumBadgeStorageReady(false);

        if (!forumBadgeScope) {
            const nextState = createHarborForumBadgeState();
            forumBadgeStateRef.current = nextState;
            setForumBadgeState(nextState);
            return () => {
                active = false;
            };
        }

        loadHarborForumBadgeState(forumBadgeScope).then(restoredState => {
            if (!active) {
                return;
            }
            const nextState =
                forumBadgeAcknowledgePendingRef.current &&
                forumBadgeAcknowledgeScopeRef.current === forumBadgeScope
                ? acknowledgeHarborForumBadgeState(
                      restoredState,
                      forumBadgeScope,
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
    }, [forumBadgeScope]);

    useEffect(() => {
        if (!forumBadgeStorageReady || !forumBadgeScope) {
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
        forumBadgeScope,
        refreshForumBadge,
    ]);

    useEffect(() => {
        forumBadgeStateRef.current = forumBadgeState;
        if (
            forumBadgeStorageReady &&
            forumBadgeState.username === forumBadgeScope
        ) {
            saveHarborForumBadgeState(forumBadgeState).catch(() => {});
        }
    }, [
        forumBadgeState,
        forumBadgeStorageReady,
        forumBadgeScope,
    ]);

    const acknowledgeForumBadge = useCallback(() => {
        if (!forumBadgeScope) {
            return;
        }
        forumBadgeRequestRef.current += 1;
        forumBadgeAcknowledgePendingRef.current = true;
        forumBadgeAcknowledgeScopeRef.current = forumBadgeScope;
        setForumBadgeState(currentState => {
            const nextState = acknowledgeHarborForumBadgeState(
                currentState,
                forumBadgeScope,
            );
            forumBadgeStateRef.current = nextState;
            return nextState;
        });
    }, [forumBadgeScope]);

    const forumNewTopicsSinceEntry = getHarborForumBadgeCount(
        forumBadgeState,
        forumBadgeScope,
    );

    const badges = useMemo(
        () => ({
            ForumTabbar: formatHarborTabBadge(
                forumNewTopicsSinceEntry,
            ),
            MyTabbar: formatHarborTabBadge(myTabBadgeTotal),
        }),
        [
            forumNewTopicsSinceEntry,
            myTabBadgeTotal,
        ],
    );

    const badgeListeners = useMemo(
        () => ({
            NewsTabbar: {
                focus: refreshForumBadge,
            },
            ForumTabbar: {
                tabPress: acknowledgeForumBadge,
                focus: () => {
                    acknowledgeForumBadge();
                    refreshForumBadge({ acknowledge: true });
                },
            },
            CourseTab: {
                focus: refreshForumBadge,
            },
            FeaturesTabbar: {
                focus: refreshForumBadge,
            },
            MyTabbar: {
                focus: () => {
                    refreshForumBadge();
                    if (isSignedIn) {
                        Promise.allSettled([
                            refresh(),
                            refreshInboxUnreadCount(),
                            refreshChatUnreadCount(),
                        ]);
                    }
                },
            },
        }),
        [
            acknowledgeForumBadge,
            isSignedIn,
            refresh,
            refreshChatUnreadCount,
            refreshInboxUnreadCount,
            refreshForumBadge,
        ],
    );

    const TabbarComponent = tabbarFactory(
        Platform.OS,
        t,
        insets,
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
