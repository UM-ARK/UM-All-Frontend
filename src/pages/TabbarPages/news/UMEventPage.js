import React, { Component, useState } from 'react';
import {
    Text,
    View,
    StyleSheet,
    Dimensions,
    FlatList,
    ScrollView,
    TouchableWithoutFeedback,
    RefreshControl,
    VirtualizedList,
} from 'react-native';

import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import { UM_API_EVENT, UM_API_TOKEN } from '../../../utils/pathMap';

import NewsCard from './components/NewsCard';
import Loading from '../../../components/Loading';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import moment from 'moment-timezone';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { scale } from 'react-native-size-matters';
import TouchableScale from "react-native-touchable-scale";

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('window');

const { black, white, themeColor } = COLOR_DIY;

const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};
// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

class UMEventPage extends Component {
    virtualizedList = React.createRef(null);

    constructor() {
        super();
        this.state = {
            data: undefined,
            isLoading: true,
            isLogin: false,
        };
        this.getData();
    }

    // 獲取澳大舉辦活動的資訊
    async getData() {
        try {
            axios.get(UM_API_EVENT, {
                // 請求頭配置
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
                // params: {
                // date_from: macauTime,
                // TODO: 篩選是否有smart_point
                // },
            }).then(res => {
                let result = res.data._embedded;
                let nowTimeStamp = new Date().getTime();
                let nowMomentDate = moment(nowTimeStamp);

                // 分隔今天/未來的活動 和 過往的活動
                let resultList = [];
                let outdatedList = [];
                result.map((itm) => {
                    let beginMomentDate = moment(itm.common.dateFrom);
                    if (nowMomentDate.isSame(beginMomentDate, 'day') || beginMomentDate.isSameOrAfter(nowMomentDate)) {
                        resultList.push(itm);
                    }
                    else {
                        outdatedList.push(itm);
                    }
                })
                // 排序：距離今天最近
                resultList.sort((a, b) => {
                    return Math.abs(
                        nowTimeStamp - new Date(a.common.dateFrom).getTime(),
                    ) >
                        Math.abs(
                            nowTimeStamp -
                            new Date(b.common.dateFrom).getTime(),
                        )
                        ? 1
                        : -1;
                });
                outdatedList.sort((a, b) => {
                    return Math.abs(
                        nowTimeStamp - new Date(a.common.dateFrom).getTime(),
                    ) >
                        Math.abs(
                            nowTimeStamp -
                            new Date(b.common.dateFrom).getTime(),
                        )
                        ? 1
                        : -1;
                });

                resultList = resultList.concat(outdatedList);
                this.setState({ data: resultList, isLoading: false });
            })
        } catch (error) {
            if (error.code == 'ERR_NETWORK') {
                this.setState({ isLoading: true });
                // 網絡錯誤，自動重載
                this.getData();
            } else {
                alert('未知錯誤，請聯繫開發者！')
            }
        }
    }

    // 渲染懸浮可拖動按鈕
    renderGoTopButton = () => {
        const { white, black, viewShadow } = COLOR_DIY;
        return (
            <Interactable.View
                style={{
                    zIndex: 999,
                    position: 'absolute',
                }}
                ref="headInstance"
                // 設定所有可吸附的屏幕位置 0,0為屏幕中心
                snapPoints={[
                    { x: -scale(140), y: -scale(220) },
                    { x: scale(140), y: -scale(220) },
                    { x: -scale(140), y: -scale(120) },
                    { x: scale(140), y: -scale(120) },
                    { x: -scale(140), y: scale(0) },
                    { x: scale(140), y: scale(0) },
                    { x: -scale(140), y: scale(120) },
                    { x: scale(140), y: scale(120) },
                    { x: -scale(140), y: scale(220) },
                    { x: scale(140), y: scale(220) },
                ]}
                // 設定初始吸附位置
                initialPosition={{ x: scale(140), y: scale(220) }}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableScale
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.virtualizedList.current.scrollToOffset({
                            x: 0,
                            y: 0,
                        });
                    }}>
                    <View
                        style={{
                            width: scale(50),
                            height: scale(50),
                            backgroundColor: COLOR_DIY.white,
                            borderRadius: scale(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...viewShadow,
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={scale(40)}
                            color={COLOR_DIY.themeColor}
                        />
                    </View>
                </TouchableScale>
            </Interactable.View>
        );
    };

    // 渲染主要內容
    renderPage = () => {
        const { data, isLoading } = this.state;
        return (
            <VirtualizedList
                data={data}
                ref={this.virtualizedList}
                // 初始渲染的元素，設置為剛好覆蓋屏幕
                initialNumToRender={6}
                renderItem={({ item }) => <NewsCard data={item} type={'event'} />}
                contentContainerStyle={{ width: '100%' }}
                keyExtractor={itm => itm._id}
                // 整理item數據
                getItem={getItem}
                // 渲染項目數量
                getItemCount={getItemCount}
                // 列表頭部渲染的組件 - Data From說明
                ListHeaderComponent={() => (
                    <View>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.third,
                                alignSelf: 'center',
                                marginTop: scale(5),
                            }}>
                            Data From: data.um.edu.mo
                        </Text>
                    </View>
                )}
                // 列表底部渲染，防止Tabbar遮擋
                ListFooterComponent={() => (
                    <View style={{ marginBottom: scale(50) }}></View>
                )}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isLoading}
                        onRefresh={() => {
                            // 展示Loading標識
                            this.setState({ isLoading: true });
                            this.getData();
                        }}
                    />
                }
                directionalLockEnabled
                alwaysBounceHorizontal={false}
            />
        );
    };

    render() {
        const { isLoading } = this.state;

        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: COLOR_DIY.bg_color,
                }}>
                {/* 懸浮可拖動按鈕 */}
                {isLoading ? null : this.renderGoTopButton()}

                {isLoading ? (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        <Loading />
                    </View>
                ) : (this.renderPage())}
            </View>
        );
    }
}

export default UMEventPage;
