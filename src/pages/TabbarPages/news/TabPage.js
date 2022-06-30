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
                justifyContent: 'space-around',
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
                                currentTabIndex == i ? '#005F95' : '#fff',
                            paddingHorizontal: 10,
                            paddingVertical: 2,
                            marginVertical: 5,
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
            onIndexChange={setIndex}
            initialLayout={{width: layout.width}}
            renderTabBar={props => _renderTabBar(props)}
        />
    );
}
