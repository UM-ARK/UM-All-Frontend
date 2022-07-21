import React, {Component} from 'react';
import {
    View,
    useWindowDimensions,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    Dimensions,
} from 'react-native';

import NewsPage from './NewsPage';
import EventPage from './EventPage';
import ClubPage from './ClubPage';
import UMEventPage from './UMEventPage';
import {pxToDp} from '../../../utils/stylesKits';
import {COLOR_DIY} from '../../../utils/uiMap';
import ScrollAnimation, {
    getTranslateX,
} from '../../../components/ScrollAnimation';

import {TabView, SceneMap} from 'react-native-tab-view';

// 第一個Tab渲染的組件
const FirstRoute = () => <NewsPage />;
// 第二個Tab渲染的組件
const SecondRoute = () => <UMEventPage />;
// 第三個Tab渲染的組件
const ThirdRoute = () => <EventPage />;
// 第四個Tab渲染的組件
const FourthRoute = () => <ClubPage />;

// 渲染不同Tab場景的路由
const renderScene = SceneMap({
    first: FirstRoute,
    second: SecondRoute,
    third: ThirdRoute,
    fourth: FourthRoute,
});

// 自定義頂部Tabbar樣式
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
                // const opacity = props.position.interpolate({
                //     inputRange,
                //     outputRange: inputRange.map(inputIndex =>
                //         inputIndex === i ? 1 : 0.6,
                //     ),
                // });

                // 定義Tab滑動動畫
                const translateX = getTranslateX(
                    props.navigationState.index,
                    i,
                    props,
                    inputRange
                );

                return (
                    <>
                        <TouchableOpacity
                            style={{
                                alignItems: 'center',
                                borderRadius: pxToDp(15),
                                borderWidth: pxToDp(1),
                                borderColor: COLOR_DIY.themeColor,
                                paddingHorizontal: pxToDp(10),
                                paddingVertical: pxToDp(2),
                                marginVertical: pxToDp(5),
                                marginHorizontal: pxToDp(10),
                                overflow: 'hidden',
                            }}
                            onPress={() => props.jumpTo(route.key)}>
                            {/* 透明度改變的Text，需配合上方opacity使用 */}
                            {/* <Animated.Text
                                style={{
                                    // 透明動畫
                                    // opacity,
                                    color: COLOR_DIY.themeColor,
                                    fontSize: pxToDp(15),
                                }}>
                                {route.title}
                            </Animated.Text> */}

                            {/* Tab文本的樣式 */}
                            <Text
                                style={{
                                    color: COLOR_DIY.themeColor,
                                    fontSize: pxToDp(15),
                                }}>
                                {route.title}
                            </Text>

                            {/* 切換Tab的動畫 */}
                            <ScrollAnimation translateX={translateX} />
                        </TouchableOpacity>
                    </>
                );
            })}
        </View>
    );
};

export default function TabPage() {
    const layout = useWindowDimensions();
    const {width, height} = Dimensions.get('screen');

    // 切換動畫
    const scrollX = React.useRef(new Animated.Value(0)).current;

    // 默認選項卡
    const [index, setIndex] = React.useState(2);
    const [routes] = React.useState([
        {key: 'first', title: '新聞'},
        {key: 'second', title: '澳大活動'},
        {key: 'third', title: '組織活動'},
        {key: 'fourth', title: '進駐組織'},
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
