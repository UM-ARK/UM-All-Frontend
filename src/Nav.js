// 專門存放路由，其他頁面可使用this.props.navigation.navigate("對應下方創建棧的路由名")進行跳轉
import React, { useMemo } from 'react';
import { Platform, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContainer, useNavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { HeaderBackButton } from '@react-navigation/elements';
import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { trigger } from './utils/trigger';
import { useTranslation } from 'react-i18next';

// 本地頁面，首字母需大寫
import Tabbar from './Tabbar';

import ClubDetail from './pages/TabbarPages/info/club/ClubDetail';
import EventDetail from './pages/TabbarPages/info/club/EventDetail';
import NewsDetail from './pages/TabbarPages/info/news/NewsDetail';
import UMEventDetail from './pages/TabbarPages/info/news/UMEventDetail';
import HarborTopicDetail from './pages/TabbarPages/info/home/HarborTopicDetail';
import HarborAccountSettingsPage from './pages/TabbarPages/my/pages/HarborAccountSettingsPage';
import HarborActivityPage from './pages/TabbarPages/my/pages/HarborActivityPage';
import HarborBadgesPage from './pages/TabbarPages/my/pages/HarborBadgesPage';
import HarborInboxPage from './pages/TabbarPages/my/pages/HarborInboxPage';

import LocalCourse from './pages/TabbarPages/what2Reg/pages/LocalCourse';

import Webviewer from './components/Webviewer';
import AllEvents from './pages/TabbarPages/info/club/AllEvents';
import Bus from './pages/Features/Bus';
import CarPark from './pages/Features/CarPark';
import UMOrg from './pages/Features/UMOrg';
import SettingPage from './pages/Features/SettingPage';
import { useTheme } from './components/ThemeContext';

const Stack = createNativeStackNavigator();

const Nav = () => {
    const { theme } = useTheme();
    const { black } = theme;
    const { t } = useTranslation(['common', 'features', 'event']);
    const navigationRef = useNavigationContainerRef();

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

    return (
        <NavigationContainer ref={navigationRef} theme={navigationTheme}>
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={{
                    freezeOnBlur: true,
                    headerTransparent: isLiquidGlassSupported,
                    headerBlurEffect: isLiquidGlassSupported ? null : 'systemThinMaterial',
                    headerStyle: {
                        backgroundColor: isLiquidGlassSupported ? 'transparent' : theme.bg_color,
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
                }}
            >
                <Stack.Screen name="Tabbar" component={Tabbar} options={{ headerShown: false }} />

                {/* 服務頁保持原有 Modal 配置 */}
                <Stack.Group
                    screenOptions={({ navigation }) => ({
                        headerTitle: '',
                        presentation: Platform.select({
                            android: 'card',
                            ios: Platform.isPad ? 'card' : 'modal',
                        }),
                        headerLeft: (props) => Platform.OS === 'android' ? (
                            <TouchableOpacity
                                onPress={() => { trigger(); navigation.goBack(); }}
                                style={{
                                    width: 36,
                                    height: 36,
                                    borderRadius: 18,
                                    backgroundColor: theme.black.main + '14',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <Ionicons name="chevron-back" size={22} color={black.main} />
                            </TouchableOpacity>
                        ) : (
                            <HeaderBackButton
                                {...props}
                                onPress={() => { trigger(); navigation.goBack(); }}
                                label=''
                            />
                        ),
                    })}
                >
                    {/* 服務頁 */}
                    <Stack.Screen name="Bus" component={Bus} options={{ headerTitle: t('校園巴士') }} />
                    <Stack.Screen name="CarPark" component={CarPark} options={{ headerTitle: t('車位') }} />
                    <Stack.Screen name="UMOrg" component={UMOrg} options={{ headerTitle: t('澳大部門') }} />


                    {/* 資訊頁 */}
                    {/* 圖片大標題頁：強制 light 讓狀態列圖示在深色封面圖上可見 */}
                    <Stack.Screen name="ClubDetail" component={ClubDetail} options={{ statusBarStyle: 'light' }} />
                    <Stack.Screen name="EventDetail" component={EventDetail} />
                    <Stack.Screen name="NewsDetail" component={NewsDetail} />
                    <Stack.Screen name="UMEventDetail" component={UMEventDetail} />
                    <Stack.Screen name="HarborTopicDetail" component={HarborTopicDetail} />
                    <Stack.Screen name="AllEvents" component={AllEvents} />

                    {/* ARK選課 */}
                    <Stack.Screen name="LocalCourse" component={LocalCourse} />
                </Stack.Group>

                {/* 普通左右壓動畫組 */}
                <Stack.Group
                    screenOptions={{
                        headerTitle: '',
                    }}
                >
                    <Stack.Screen name="Webviewer" component={Webviewer} />
                    <Stack.Screen name="SettingPage" component={SettingPage} options={{ headerTitle: t('設置') }} />
                    <Stack.Screen name="HarborActivity" component={HarborActivityPage} />
                    <Stack.Screen name="HarborInbox" component={HarborInboxPage} />
                    <Stack.Screen name="HarborBadges" component={HarborBadgesPage} />
                    <Stack.Screen name="HarborAccountSettings" component={HarborAccountSettingsPage} />
                </Stack.Group>
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Nav;
