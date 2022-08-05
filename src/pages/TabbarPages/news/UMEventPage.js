import React, {Component, useState} from 'react';
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

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {UM_API_EVENT} from '../../../utils/pathMap';

import NewsCard from './components/NewsCard';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import moment from 'moment-timezone';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

const {black, white, themeColor} = COLOR_DIY;

const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};
// // 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

class UMEventPage extends Component {
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
        // 澳門時間，3個月前
        // let macauTime = moment
        //     .tz(new Date(), 'Asia/Macau')
        //     .subtract(3, 'month')
        //     .format('YYYY-MM-DD');
        axios
            .get(UM_API_EVENT, {
                // 請求頭配置
                headers: {
                    Accept: 'application/json',
                    Authorization:
                        'Bearer c9b17308-8579-3672-8a0d-beb483b794bf',
                },
                // params: {
                // date_from: macauTime,
                // TODO: 篩選是否有smart_point
                // },
            })
            .then(res => {
                let result = res.data._embedded;
                this.setState({data: result, isLoading: false});
            })
            .catch(err => {
                console.error(err);
            });
    }

    // 渲染懸浮可拖動按鈕
    renderGoTopButton = () => {
        const {white, black, viewShadow} = COLOR_DIY;
        return (
            <Interactable.View
                style={{
                    zIndex: 999,
                    position: 'absolute',
                }}
                ref="headInstance"
                // 設定所有可吸附的屏幕位置 0,0為屏幕中心
                snapPoints={[
                    {x: -pxToDp(140), y: -pxToDp(220)},
                    {x: pxToDp(140), y: -pxToDp(220)},
                    {x: -pxToDp(140), y: -pxToDp(120)},
                    {x: pxToDp(140), y: -pxToDp(120)},
                    {x: -pxToDp(140), y: pxToDp(0)},
                    {x: pxToDp(140), y: pxToDp(0)},
                    {x: -pxToDp(140), y: pxToDp(120)},
                    {x: pxToDp(140), y: pxToDp(120)},
                    {x: -pxToDp(140), y: pxToDp(220)},
                    {x: pxToDp(140), y: pxToDp(220)},
                ]}
                // 設定初始吸附位置
                initialPosition={{x: pxToDp(140), y: pxToDp(220)}}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        // 回頂，需先創建ref，可以在this.refs直接找到方法引用
                        this.refs.virtualizedList.scrollToOffset({
                            x: 0,
                            y: 0,
                            duration: 500, // 回頂時間
                        });
                    }}>
                    <View
                        style={{
                            width: pxToDp(50),
                            height: pxToDp(50),
                            backgroundColor: COLOR_DIY.white,
                            borderRadius: pxToDp(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...viewShadow,
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={pxToDp(40)}
                            color={black.main}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    // 渲染主要內容
    renderPage = () => {
        const {data, isLoading} = this.state;
        return (
            <VirtualizedList
                data={data}
                ref={'virtualizedList'}
                // 初始渲染的元素，設置為剛好覆蓋屏幕
                initialNumToRender={4}
                renderItem={({item}) => <NewsCard data={item} type={'event'} />}
                keyExtractor={itm => itm._id}
                // 整理item數據
                getItem={getItem}
                // 渲染項目數量
                getItemCount={getItemCount}
                // 列表頭部渲染的組件 - Data From說明
                ListHeaderComponent={() => (
                    <Text
                        style={{
                            color: black.third,
                            alignSelf: 'center',
                            marginTop: pxToDp(5),
                        }}>
                        Data From: data.um.edu.mo
                    </Text>
                )}
                // 列表底部渲染，防止Tabbar遮擋
                ListFooterComponent={() => (
                    <View style={{marginBottom: pxToDp(50)}}></View>
                )}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isLoading}
                        onRefresh={() => {
                            // 展示Loading標識
                            this.setState({isLoading: true});
                            this.getData();
                        }}
                    />
                }
            />
        );
    };

    render() {
        const {isLoading} = this.state;

        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                {/* 懸浮可拖動按鈕 */}
                {this.renderGoTopButton()}

                {!isLoading && this.renderPage()}
            </View>
        );
    }
}

const s = StyleSheet.create({
    // 活動卡片間距
    cardContainer: {
        marginVertical: pxToDp(6),
        marginHorizontal: pxToDp(5),
    },
});

export default UMEventPage;
