import React, {Component} from 'react';
import {
    View,
    useWindowDimensions,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
} from 'react-native';
import {TabView, SceneMap} from 'react-native-tab-view';

import NewsPage from './NewsPage';
import EventPage from './EventPage';
import ClubPage from './ClubPage';
import {pxToDp} from '../../../utils/stylesKits';
import {COLOR_DIY} from '../../../utils/uiMap';

// 第一個Tab渲染的組件
const FirstRoute = () => <NewsPage />;
// 第二個Tab渲染的組件
const SecondRoute = () => <EventPage />;
// 第三個Tab渲染的組件
const ThirdRoute = () => <ClubPage />;

// 渲染不同Tab場景的路由
const renderScene = SceneMap({
    first: FirstRoute,
    second: SecondRoute,
    third: ThirdRoute,
});

// 自定義頂部Tabbar樣式
// TODO: Text或者BackgroundColor的切換動畫，讓其更跟手，opacity動畫是組件提供的example可以直接使用到Animated.Text中
const _renderTabBar = props => {
    const currentTabIndex = props.navigationState.index;
    const inputRange = props.navigationState.routes.map((x, i) => i);
    return (
        <View
            style={{
                flexDirection: 'row',
                justifyContent: 'center',
            }}>
            {props.navigationState.routes.map((route, i) => {
                // 定義Tab轉換的動畫 - 半透明未選中文字 - 未使用
                const opacity = props.position.interpolate({
                    inputRange,
                    outputRange: inputRange.map(inputIndex =>
                        inputIndex === i ? 1 : 0.6,
                    ),
                });

                return (
                    <TouchableOpacity
                        style={{
                            alignItems: 'center',
                            borderRadius: pxToDp(15),
                            borderWidth: pxToDp(1),
                            borderColor: COLOR_DIY.themeColor,
                            // backgroundColor:
                            //     currentTabIndex == i
                            //         ? COLOR_DIY.themeColor
                            //         : COLOR_DIY.bg_color,
                            paddingHorizontal: pxToDp(10),
                            paddingVertical: pxToDp(2),
                            marginVertical: pxToDp(5),
                            marginHorizontal: pxToDp(10),
                        }}
                        onPress={() => props.jumpTo(route.key)}>
                        <Animated.Text
                            style={{
                                opacity,
                                // TODO: 使用判斷將會很卡，為了優化，必須使用Animated的方式
                                color: COLOR_DIY.themeColor,
                                fontSize: pxToDp(15),
                            }}>
                            {route.title}
                        </Animated.Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default function TabPage() {
    const layout = useWindowDimensions();
    // 默認選項卡
    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
        {key: 'first', title: '新聞'},
        {key: 'second', title: '活動大廳'},
        {key: 'third', title: '社團大廳'},
    ]);

    return (
        <TabView
            navigationState={{index, routes}}
            renderScene={renderScene}
            onIndexChange={index => setIndex(index)}
            initialLayout={{width: layout.width}}
            renderTabBar={props => _renderTabBar(props)}
        />
    );
}
