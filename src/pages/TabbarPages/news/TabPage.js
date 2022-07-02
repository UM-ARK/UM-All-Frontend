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
import {useToast} from 'native-base';

import NewsPage from './NewsPage';
import EventPage from './EventPage';
import ClubPage from './ClubPage';
import { pxToDp } from "../../../utils/stylesKits";
import { COLOR_DIY } from "../../../utils/uiMap";

// 已展示提醒的標識，展示過就不展示了。
let toastHaveShow = [false, false];

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
                        inputIndex === i ? 1 : 0.5,
                    ),
                });
                const color = props.position.interpolate({
                    inputRange,
                    outputRange: inputRange.map(inputIndex =>
                        inputIndex === i ? '#fff' : '#005F95',
                    ),
                });

                return (
                    <TouchableOpacity
                        style={{
                            alignItems: 'center',
                            borderRadius: 15,
                            borderWidth: 1,
                            borderColor: '#005F95',
                            backgroundColor:
                                currentTabIndex == i ? '#005F95' : COLOR_DIY.bg_color,
                            paddingHorizontal: 10,
                            paddingVertical: 2,
                            marginVertical: 5,
                            marginHorizontal:pxToDp(10),
                        }}
                        onPress={() => props.jumpTo(route.key)}>
                        {/* <Animated.Text
                            style={{
                                // opacity,
                                color:
                                    currentTabIndex == i ? '#fff' : '#005F95',
                                fontSize: 15,
                            }}>
                            {route.title}
                        </Animated.Text> */}
                        <Text
                            style={{
                                color:
                                    currentTabIndex == i ? '#fff' : '#005F95',
                                fontSize: 15,
                            }}>
                            {route.title}
                        </Text>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

export default function TabPage() {
    // Toast彈出提示組件
    const toast = useToast();

    const layout = useWindowDimensions();

    const [index, setIndex] = React.useState(0);
    const [routes] = React.useState([
        {key: 'first', title: '新聞'},
        {key: 'second', title: '社團活動'},
        {key: 'third', title: '社團大廳'},
    ]);

    return (
        <TabView
            navigationState={{index, routes}}
            renderScene={renderScene}
            onIndexChange={index => {
                // 滑到社團活動、社團大廳頁的時候觸發一次Toast提醒可進入詳情頁
                if (!toastHaveShow[0] && index == 1) {
                    toastHaveShow[0] = true;
                    toast.show({
                        description: '點擊卡片可以查看詳情！',
                        placement: 'top',
                    });
                } else if (!toastHaveShow[1] && index == 2) {
                    toastHaveShow[1] = true;
                    toast.show({
                        description: '社團LOGO，點擊直達！',
                        placement: 'top',
                    });
                }
                setIndex(index);
            }}
            initialLayout={{width: layout.width}}
            renderTabBar={props => _renderTabBar(props)}
        />
    );
}
