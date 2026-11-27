// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Alert, Platform } from 'react-native';
import {
    NavigationContainer,
    useNavigationContainerRef,
    DefaultTheme,
    DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as QuickActions from 'expo-quick-actions';
import { trigger } from './utils/trigger';
import { useTranslation } from 'react-i18next';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';
import { getNativeStackScreenOptions } from './navigation/nativeStackOptions';
import { renderSharedStackScreens } from './navigation/sharedScreens';
import { useTheme } from './components/ThemeContext';
import { useHarborSession } from './contexts/HarborSessionContext';
import { usePushRegistration } from './contexts/PushRegistrationContext';
import { useAppReducedMotion } from './contexts/ReducedMotionContext';
import { APP_LINKING } from './utils/appLinks';
import { logPushEvent } from './utils/pushLogger';
import { getHarborPushNavigationTarget } from './utils/pushNavigation';

const Stack = createNativeStackNavigator();

const Nav = () => {
    const { theme } = useTheme();
    const reducedMotion = useAppReducedMotion();
    const { t } = useTranslation(['common', 'features', 'event', 'home', 'my']);
    const {
        consumeLoginIntent,
        pendingLoginIntent,
        refreshChatUnreadCount,
        refreshInboxUnreadCount,
        status: harborStatus,
        user: harborUser,
    } = useHarborSession();
    const {
        consumePendingNotificationResponse,
        pendingNotificationResponse,
    } = usePushRegistration();
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

    const flushPendingNotificationResponse = useCallback(() => {
        if (
            !pendingNotificationResponse ||
            !navigationRef.isReady() ||
            harborStatus === 'restoring' ||
            harborStatus === 'authorizing'
        ) {
            return;
        }

        const data = pendingNotificationResponse.notification?.request?.content
            ?.data;
        const notificationHarborUserId = Number(data?.harborUserId);
        const currentHarborUserId = Number(harborUser?.id);
        const hasNotificationHarborUserId =
            Number.isSafeInteger(notificationHarborUserId) &&
            notificationHarborUserId > 0;
        const hasCurrentHarborUserId =
            Number.isSafeInteger(currentHarborUserId) &&
            currentHarborUserId > 0;

        if (
            harborStatus === 'signedIn' &&
            hasNotificationHarborUserId &&
            !hasCurrentHarborUserId
        ) {
            return;
        }

        if (
            harborStatus !== 'signedIn' ||
            (hasNotificationHarborUserId &&
                notificationHarborUserId !== currentHarborUserId)
        ) {
            logPushEvent('notification.response.handled', {
                result:
                    harborStatus === 'signedIn'
                        ? 'account_mismatch'
                        : 'sign_in_required',
            });
            requestAnimationFrame(() => {
                navigationRef.navigate('Tabbar', {screen: 'MyTabbar'});
                Alert.alert(
                    t('需要 Harbor 登入'),
                    t('請登入接收此通知的 Harbor 帳號。'),
                    [{text: t('確定'), onPress: () => trigger()}],
                );
                consumePendingNotificationResponse();
            });
            return;
        }

        const target = hasNotificationHarborUserId
            ? getHarborPushNavigationTarget(data)
            : {
                routeName: 'HarborInbox',
                params: undefined,
            };
        if (!target) {
            consumePendingNotificationResponse();
            logPushEvent('notification.response.handled', {
                result: 'unsupported_source',
            });
            return;
        }
        logPushEvent('notification.response.handled', {
            result: target.kind || 'inbox_account_unverified',
        });
        Promise.allSettled([
            refreshInboxUnreadCount(),
            refreshChatUnreadCount(),
        ]);
        requestAnimationFrame(() => {
            navigationRef.navigate(target.routeName, target.params);
            consumePendingNotificationResponse();
        });
    }, [
        consumePendingNotificationResponse,
        harborStatus,
        harborUser?.id,
        navigationRef,
        pendingNotificationResponse,
        refreshChatUnreadCount,
        refreshInboxUnreadCount,
        t,
    ]);

    const handleNavigationReady = useCallback(() => {
        flushPendingQuickAction();
        flushPendingLoginIntent();
        flushPendingNotificationResponse();
    }, [
        flushPendingLoginIntent,
        flushPendingNotificationResponse,
        flushPendingQuickAction,
    ]);

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

    useEffect(() => {
        flushPendingNotificationResponse();
    }, [flushPendingNotificationResponse]);

    return (
        <NavigationContainer
            ref={navigationRef}
            theme={navigationTheme}
            linking={APP_LINKING}
            onReady={handleNavigationReady}>
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={getNativeStackScreenOptions({
                    theme,
                    reducedMotion,
                })}>
                <Stack.Screen
                    name="Tabbar"
                    component={Tabbar}
                    options={{ headerShown: false }}
                />

                {renderSharedStackScreens(Stack, { theme, t })}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Nav;
