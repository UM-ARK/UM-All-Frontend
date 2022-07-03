import React, {Component} from 'react';
import {
    View,
    Text,
    VirtualizedList,
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native';

import NewsCard from './components/NewsCard';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import FastImage from 'react-native-fast-image';
import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';

// 整理需要返回的數據給renderItem
// 此處返回的數據會成為renderItem({item})獲取到的數據。。。
// 所以data數組需要在這裡引用一下
const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};

// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

class Test extends Component {
    constructor() {
        super();
        this.state = {
            isLoading: true,
            newsList: [],
            topNews: {},
        };

        // 請求澳大新聞API
        this.getData();
    }

    // 請求澳大api返回新聞數據
    async getData() {
        let res = [];
        try {
            const response = await fetch(
                'https://api.data.um.edu.mo/service/media/news/v1.0.0/all',
                {
                    method: 'GET',
                    headers: {
                        Accept: 'application/json',
                        Authorization:
                            'Bearer 3edfffda-97ce-326a-a0a5-5e876adbf89f',
                    },
                },
            );
            const json = await response.json();
            res = json._embedded;
        } catch (error) {
            console.log(error);
        } finally {
            // 頭條指定為當天最新的新聞
            let topNews = res[0];
            // 非頭條的新聞渲染進新聞列表
            let newsList = [];
            // 指定截取多少條數據，最多100條
            let numOfNews = 100;
            for (let i = 1; i < numOfNews; i++) {
                if (res[i].details.length > 0) {
                    newsList.push(res[i]);
                }
            }

            this.setState({
                newsList,
                topNews: {
                    // 發佈日期
                    publishDate: topNews.common.publishDate,
                    // 中文標題
                    title_cn: topNews.details[1].title,
                    // 英文標題
                    title_en: topNews.details[0].title,
                    // 相片數組
                    imageUrls: topNews.common.imageUrls,
                },
                isLoading: false,
            });
        }
    }

    // 頭條新聞的渲染
    renderTopNews = () => {
        // 解構全局ui設計顏色
        const {white, black, viewShadow} = COLOR_DIY;
        const {
            // 發佈日期
            publishDate,
            // 最後更新時間
            // lastModified,
            // 中文標題
            title_cn,
            // 中文內容
            content_cn,
            // 英文標題
            title_en,
            // 英文內容
            content_en,
            // 相片數組
            imageUrls,
        } = this.state.topNews;

        return (
            <View
                style={{
                    borderRadius: pxToDp(10),
                    overflow: 'hidden',
                    marginHorizontal: pxToDp(10),
                    marginVertical: pxToDp(5),
                    height: pxToDp(200),
                    backgroundColor: white,
                    ...viewShadow,
                }}>
                <View style={{width: '100%'}}>
                    {/* 圖片背景 */}
                    {this.state.topNews.imageUrls && (
                        <FastImage
                            source={{uri: imageUrls[0]}}
                            style={{
                                width: '100%',
                                height: '100%',
                            }}>
                            {/* 塗上50%透明度的黑，讓白色字體能看清 */}
                            <View
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    backgroundColor: 'rgba(0,0,0,0.5)',
                                    padding: pxToDp(15),
                                    justifyContent: 'flex-end',
                                }}>
                                {/* Top Story字樣 */}
                                <View
                                    style={{
                                        position: 'absolute',
                                        top: pxToDp(10),
                                        left: pxToDp(15),
                                    }}>
                                    <Text
                                        style={{
                                            color: white,
                                            fontWeight: 'bold',
                                            fontSize: pxToDp(20),
                                        }}>
                                        Top Story @ UM
                                    </Text>
                                </View>

                                {/* 標題 */}
                                <View
                                    style={{
                                        alignSelf: 'center',
                                        justifyContent: 'center',
                                        width: '100%',
                                    }}>
                                    <Text
                                        style={{
                                            color: white,
                                            fontWeight: 'bold',
                                            fontSize: pxToDp(18),
                                        }}>
                                        {title_en}
                                    </Text>
                                    <Text
                                        style={{
                                            color: white,
                                            fontWeight: 'bold',
                                            fontSize: pxToDp(13),
                                        }}>
                                        {title_cn}
                                    </Text>
                                </View>
                            </View>
                        </FastImage>
                    )}
                </View>
            </View>
        );
    };

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
                    {x: -140, y: -250},
                    {x: 140, y: -250},
                    {x: -140, y: -120},
                    {x: 140, y: -120},
                    {x: -140, y: 0},
                    {x: 140, y: 0},
                    {x: -140, y: 120},
                    {x: 140, y: 120},
                    {x: -140, y: 250},
                    {x: 140, y: 250},
                ]}
                // 設定初始吸附位置
                initialPosition={{x: 140, y: 250}}>
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

    render() {
        // 解構全局ui設計顏色
        const {white, black, viewShadow} = COLOR_DIY;

        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                }}>
                {/* 懸浮可拖動按鈕 */}
                {this.renderGoTopButton()}

                {/* 新聞列表 */}
                {!this.state.isLoading && (
                    <VirtualizedList
                        data={this.state.newsList}
                        ref={'virtualizedList'}
                        // 初始渲染的元素，設置為剛好覆蓋屏幕
                        initialNumToRender={4}
                        renderItem={({item}) => {
                            return <NewsCard data={item}></NewsCard>;
                        }}
                        // 整理item數據
                        getItem={getItem}
                        // 渲染項目數量
                        getItemCount={getItemCount}
                        // 列表頭部渲染的組件 - 頭條新聞
                        ListHeaderComponent={this.renderTopNews}
                    />
                )}
            </View>
        );
    }
}
export default Test;
