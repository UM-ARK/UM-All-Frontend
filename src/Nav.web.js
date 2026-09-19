// Web / 桌面版路由：只掛四個功能區（組織活動、服務功能大全、課程查詢、模擬選課）
// Metro 在 web 平台自動優先選用 .web.js，手機端仍走 Nav.js；
// 論壇、Wiki、推送、快捷操作等純手機能力不進 web 包
import React, { useMemo } from 'react';
import { TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import {
    NavigationContainer,
    DefaultTheme,
    DarkTheme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';

import Tabbar from './Tabbar';
import ClubDetail from './pages/TabbarPages/info/club/ClubDetail';
import EventDetail from './pages/TabbarPages/info/club/EventDetail';
import AllEvents from './pages/TabbarPages/info/club/AllEvents';
import LocalCourse from './pages/TabbarPages/course/pages/what2Reg/pages/LocalCourse';
import UMOrg from './pages/Features/UMOrg';
import { useTheme } from './components/ThemeContext';
import { APP_LINKING } from './utils/appLinks';

const Stack = createNativeStackNavigator();

// 只保留 web 端存在的路由，避免瀏覽器地址欄解析到未掛載的頁面
const WEB_LINKING = {
    prefixes: APP_LINKING.prefixes,
    config: {
        initialRouteName: 'Tabbar',
        screens: {
            Tabbar: {
                path: '',
                screens: {
                    ClubTabbar: 'club',
                    CourseTab: 'course',
                    FeaturesTabbar: 'features',
                },
            },
            LocalCourse: APP_LINKING.config.screens.LocalCourse,
            ClubDetail: APP_LINKING.config.screens.ClubDetail,
            EventDetail: APP_LINKING.config.screens.EventDetail,
            AllEvents: 'events',
            UMOrg: 'org',
        },
    },
};

const Nav = () => {
    const { theme } = useTheme();
    const { black } = theme;
    const { t } = useTranslation(['common', 'features', 'event', 'home', 'my']);

    // 與 ThemeContext 對齊，避免透出 Navigation 預設底色
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
        <NavigationContainer theme={navigationTheme} linking={WEB_LINKING}>
            <Stack.Navigator
                initialRouteName="Tabbar"
                screenOptions={({ navigation }) => ({
                    freezeOnBlur: true,
                    headerTitle: '',
                    headerStyle: {
                        backgroundColor: theme.bg_color,
                    },
                    headerShadowVisible: false,
                    contentStyle: { backgroundColor: theme.bg_color },
                    headerTitleAlign: 'center',
                    headerTintColor: black.main,
                    // 桌面端統一用圓形返回鈕（與 Android 樣式一致）
                    headerLeft: () => (
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={{
                                width: 36,
                                height: 36,
                                borderRadius: 18,
                                backgroundColor: theme.black.main + '14',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                            <Ionicons
                                name="chevron-back"
                                size={22}
                                color={black.main}
                            />
                        </TouchableOpacity>
                    ),
                })}>
                <Stack.Screen
                    name="Tabbar"
                    component={Tabbar}
                    options={{ headerShown: false }}
                />

                {/* 服務頁 */}
                <Stack.Screen
                    name="UMOrg"
                    component={UMOrg}
                    options={{ headerTitle: t('澳大部門') }}
                />

                {/* 組織活動 */}
                <Stack.Screen name="ClubDetail" component={ClubDetail} />
                <Stack.Screen name="EventDetail" component={EventDetail} />
                <Stack.Screen name="AllEvents" component={AllEvents} />

                {/* 課程詳情 */}
                <Stack.Screen name="LocalCourse" component={LocalCourse} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default Nav;
