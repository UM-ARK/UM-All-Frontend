import {Dimensions, Platform} from 'react-native';

import {useTheme} from './components/ThemeContext';

import {scale, verticalScale} from 'react-native-size-matters';

import {useTranslation} from 'react-i18next';

// 原生 tab bar组件，iOS用下面的，Android用上面的
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeBottomTabNavigator} from '@react-navigation/bottom-tabs/unstable';

import FeaturesScreen from './pages/TabbarPages/features';
import NewsScreen from './pages/TabbarPages/info';
import What2RegTabIndex from './pages/TabbarPages/what2Reg';
import ARKHarbor from './pages/TabbarPages/arkHarbor';
import CourseSim from './pages/TabbarPages/courseSim';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {trigger} from './utils/trigger';
import {uiStyle} from './components/ThemeContext';
import {isLiquidGlassSupported} from '@callstack/liquid-glass';

// 图标描述
const tabIconDescription = {
    NewsTabbar: '資訊',
    Harbor: '職涯港',
    What2RegTab: '揾課',
    CourseSimTab: '課表',
    FeaturesTabbar: '服務',
};

// 页面组件映射
const tabScreen = {
    NewsTabbar: NewsScreen,
    Harbor: ARKHarbor,
    What2RegTab: What2RegTabIndex,
    CourseSimTab: CourseSim,
    FeaturesTabbar: FeaturesScreen,
};

// iOS SF Symbols 配置
const iosTabIconConfig = {
    NewsTabbar: 'newspaper',
    Harbor: 'heart',
    What2RegTab: 'magnifyingglass.circle',
    CourseSimTab: 'calendar',
    FeaturesTabbar: 'square.grid.2x2',
};

// Android MaterialCommunityIcons 名称映射
const androidTabIconConfig = {
    NewsTabbar: 'newspaper-variant',
    Harbor: 'chat-processing',
    What2RegTab: 'database-search',
    CourseSimTab: 'calendar-clock',
    FeaturesTabbar: 'view-grid',
};

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

// iOS TabBar 类
class IOSTabbar {
    constructor(t, insets, theme, isLandscape, labelFontSize) {
        this.Tabs = createNativeBottomTabNavigator();
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
            return (
                <this.Tabs.Screen
                    name={name}
                    component={tabScreen[name]}
                    options={{title: t(tabIconDescription[name])}}
                />
            );
        };
        this.createTabbar = () => {
            return (
                <this.Tabs.Navigator
                    screenOptions={({route}) => ({
                        tabBarLabelStyle: {
                            ...uiStyle.defaultText,
                            fontSize: labelFontSize,
                            fontWeight: '600',
                        },
                        tabBarActiveTintColor: theme.themeColor,
                        tabBarInactiveTintColor: theme.black.main,
                        tabBarStyle: getTabBarStyle(theme),
                        translucent: isLiquidGlassSupported ? true : false,
                        tabBarIcon: ({focused}) =>
                            this.getTabbarIcon(route.name, focused),
                        tabBarShowLabel: !isLandscape,
                        tabBarMinimizeBehavior: 'onScrollDown',
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

// Android TabBar 类
class AndroidTabbar {
    constructor(t, insets, theme, isLandscape, labelFontSize) {
        this.Tabs = createBottomTabNavigator();

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
            return (
                <this.Tabs.Screen
                    name={name}
                    component={tabScreen[name]}
                    options={{
                        tabBarIcon: ({focused, color}) =>
                            this.getTabbarIcon(name, focused, color),
                        title: t(tabIconDescription[name]),
                    }}
                    listeners={() => ({tabPress: () => trigger()})}
                />
            );
        };

        this.createTabbar = () => {
            return (
                <this.Tabs.Navigator
                    screenOptions={{
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
            );
        };
    }
}

// 工厂函数
export const tabbarFactory = (
    platform,
    t,
    insets,
    theme,
    isLandscape,
    labelFontSize,
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
    ).createTabbar();
};

const Tabbar = () => {
    const {theme} = useTheme();
    const {t} = useTranslation(['common', 'home']);

    // 判斷是否為橫屏
    const isLandscape = () => {
        const {width, height} = Dimensions.get('window');
        return width > height;
    };

    // 字體大小
    const labelFontSize = isLandscape() ? verticalScale(10) : scale(10);

    const TabbarComponent = tabbarFactory(
        Platform.OS,
        t,
        null,
        theme,
        isLandscape,
        labelFontSize,
    );

    return TabbarComponent;
};

export default Tabbar;
