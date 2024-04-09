import React, { Component, useState } from 'react';
import {
    Text,
    View,
    ScrollView,
    TouchableWithoutFeedback,
    RefreshControl,
    VirtualizedList,
} from 'react-native';

import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import { UM_API_EVENT, UM_API_TOKEN } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';

import NewsCard from './components/NewsCard';
import Loading from '../../../components/Loading';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';

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

    state = {
        data: undefined,
        isLoading: true,
        isLogin: false,
    };

    componentDidMount() {
        this.getData();
    }

    // 獲取澳大舉辦活動的資訊
    async getData() {
        try {
            axios.get(UM_API_EVENT, {
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
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
            if (error.code == 'ERR_NETWORK' || error.code == 'ECONNABORTED') {
                this.setState({ data: undefined, isLoading: false });
            } else {
                alert('未知錯誤，請聯繫開發者！')
            }
        } finally {
            this.setState({ isLoading: false });
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
                    { x: -scale(140), y: -verticalScale(220) },
                    { x: scale(140), y: -verticalScale(220) },
                    { x: -scale(140), y: -verticalScale(120) },
                    { x: scale(140), y: -verticalScale(120) },
                    { x: -scale(140), y: verticalScale(0) },
                    { x: scale(140), y: verticalScale(0) },
                    { x: -scale(140), y: verticalScale(120) },
                    { x: scale(140), y: verticalScale(120) },
                    { x: -scale(140), y: verticalScale(220) },
                    { x: scale(140), y: verticalScale(220) },
                ]}
                // 設定初始吸附位置
                initialPosition={{ x: scale(140), y: verticalScale(220) }}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        trigger();
                        this.virtualizedList.current.scrollTo && this.virtualizedList.current.scrollTo({
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
                            margin: scale(5),
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={scale(40)}
                            color={COLOR_DIY.themeColor}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    // 渲染主要內容
    renderPage = () => {
        const { data, isLoading } = this.state;
        return (
            <VirtualizedList
                data={data}
                // 初始渲染的元素，設置為剛好覆蓋屏幕
                initialNumToRender={6}
                windowSize={3}
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
                // refreshControl={
                //     <RefreshControl
                //         colors={[themeColor]}
                //         tintColor={themeColor}
                //         refreshing={isLoading}
                //         onRefresh={() => {
                //             // 展示Loading標識
                //             this.setState({ isLoading: true });
                //             this.getData();
                //         }}
                //     />
                // }
                directionalLockEnabled
                alwaysBounceHorizontal={false}
            />
        );
    };

    render() {
        const { isLoading } = this.state;

        return (
            <View style={{
                flex: 1,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: COLOR_DIY.bg_color,
            }}>
                {/* 懸浮可拖動按鈕 */}
                {isLoading ? null : this.renderGoTopButton()}
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    ref={this.virtualizedList}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={() => {
                                // 展示Loading標識
                                this.setState({ isLoading: true });
                                this.getData();
                            }}
                        />
                    }
                >
                    {isLoading ? (<Loading />) : (this.state.data != undefined ? this.renderPage() : <Loading />)}
                </ScrollView>
            </View>
        );
    }
}

export default UMEventPage;
