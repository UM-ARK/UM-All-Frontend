import { Platform } from 'react-native';

import FeaturesScreen from '../pages/TabbarPages/features';
import NewsScreen from '../pages/TabbarPages/info';
import ClubDetail from '../pages/TabbarPages/info/club/ClubDetail';
import What2RegTabIndex from '../pages/TabbarPages/what2Reg';
import ARKWiki from '../pages/TabbarPages/arkwiki';
import CourseSim from '../pages/TabbarPages/courseSim';

import { COLOR_DIY } from '../utils/uiMap';
import { trigger } from '../utils/trigger';
import { scale, verticalScale } from 'react-native-size-matters';

import Icon from 'react-native-vector-icons/Feather';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { t } from "i18next";
import { BlurView } from '@sbaiahmed1/react-native-blur';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

// TODO: 使用了BlurView後，約等於Tabbar懸浮，需要在有Tabbar的頁面增加paddingBottom，https://reactnavigation.org/docs/bottom-tab-navigator/?config=dynamic#usebottomtabbarheight
const Tab = createBottomTabNavigator();

export default function MyTabs() {

    return (
        <Tab.Navigator
            tabBarOptions={{
                inactiveTintColor: COLOR_DIY.black.main,
            }}
            appearance={{
                activeTabBackgrounds: COLOR_DIY.themeColor,
                activeColors: COLOR_DIY.white,
                tabBarBackground: COLOR_DIY.bg_color,
                whenInactiveShow: 'both',
                tabButtonLayout: 'vertical',
            }}
            initialRouteName={'NewsTabbar'}
            screenOptions={{
                headerShown: false,
                // animation: 'shift',
                tabBarLabelStyle: {
                    fontSize: scale(12),
                    fontWeight: 'bold',
                },
                tabBarStyle: {
                    position: 'absolute',
                },
                tabBarBackground: () => Platform.OS === 'ios' ? (
                    <BlurView
                        blurType="systemMaterial"
                        blurAmount={30}
                        reducedTransparencyFallbackColor="#FFFFFF80"
                        style={{
                            position: 'absolute',
                            left: 0, right: 0,
                            bottom: 0, top: verticalScale(-1),  // 修復深色模式導致的頂部白邊問題
                        }}
                    />) : null,
            }}
        >
            <Tab.Screen name="NewsTabbar"
                component={NewsScreen}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <Icon
                            name="pie-chart"
                            size={scale(16)}
                            color={
                                focused ? color : COLOR_DIY.black.main
                            }
                            focused={focused}
                        />
                    ),
                    title: t('資訊'),
                }}
                listeners={() => ({
                    tabPress: () => trigger()
                })} />


            <Tab.Screen
                name="Wiki"
                component={ARKWiki}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons
                            name="file-document-edit-outline"
                            size={scale(16)}
                            color={
                                focused ? color : COLOR_DIY.black.main
                            }
                            focused={focused}
                        />
                    ),
                    title: t('百科'),
                }}
                listeners={() => ({
                    tabPress: () => trigger()
                })}
            />

            <Tab.Screen
                name="What2RegTab"
                component={What2RegTabIndex}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons
                            name="database-search-outline"
                            size={scale(16)}
                            color={
                                focused ? color : COLOR_DIY.black.main
                            }
                            focused={focused}
                        />
                    ),
                    title: t('搵課'),
                }}
                listeners={() => ({
                    tabPress: () => trigger()
                })}
            />

            <Tab.Screen
                name="CourseSimTab"
                component={CourseSim}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <MaterialCommunityIcons
                            name="table-clock"
                            size={scale(16)}
                            color={
                                focused ? color : COLOR_DIY.black.main
                            }
                            focused={focused}
                        />
                    ),
                    title: t('課表'),
                }}
                listeners={() => ({
                    tabPress: () => trigger()
                })}
            />

            <Tab.Screen name="FeaturesTabbar"
                component={FeaturesScreen}
                options={{
                    tabBarIcon: ({ focused, color, size }) => (
                        <Icon
                            name="grid"
                            size={scale(16)}
                            color={
                                focused ? color : COLOR_DIY.black.main
                            }
                            focused={focused}
                        />
                    ),
                    title: t('服務'),
                }}
                listeners={() => ({
                    tabPress: () => trigger()
                })} />
        </Tab.Navigator>
    );
}