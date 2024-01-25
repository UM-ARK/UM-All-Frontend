import React, { Component } from 'react';
import {
    View,
    Text,
    VirtualizedList,
    Dimensions,
    ScrollView,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
    TouchableWithoutFeedback,
    ActivityIndicator,
} from 'react-native';

import NewsCard from './components/NewsCard';

import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import { UM_API_NEWS, UM_API_TOKEN } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';
import Loading from '../../../components/Loading';

import FastImage from 'react-native-fast-image';
import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { NavigationContext } from '@react-navigation/native';
import axios from 'axios';
import { scale } from 'react-native-size-matters';

// const { width: PAGE_WIDTH } = Dimensions.get('window');
// const { height: PAGE_HEIGHT } = Dimensions.get('window');

const { white, black, viewShadow, bg_color, themeColor } = COLOR_DIY;

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

// 頭條新聞數據Obj，不要刪掉，作為全局變量給另一個func調用
let topNews = {};

class NewsPage extends Component {
    static contextType = NavigationContext;

    virtualizedList = React.createRef(null);

    constructor() {
        super();
        this.state = {
            isLoading: true,
            isScrollViewLoading: false,
            newsList: [],
            topNews: {},
            imgLoading: true,
        };

        // 請求澳大新聞API
        this.getData();
    }

    componentWillUnmount() {
        FastImage.clearMemoryCache();
    }

    // 請求澳大api返回新聞數據
    getData = async () => {
        try {
            axios.get(UM_API_NEWS, {
                // 請求頭配置
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
            }).then(res => {
                let result = res.data._embedded;
                // 有時會沒有圖片imageUrls數組，所以只選擇有圖的新聞作為頭條
                let chooseTopNewsIndex = 0;
                while (true) {
                    if ('imageUrls' in result[chooseTopNewsIndex].common) {
                        // 有圖
                        break;
                    } else {
                        // 沒圖
                        chooseTopNewsIndex++;
                    }
                }

                // 頭條指定為當天最新的、有圖的新聞
                topNews = result[chooseTopNewsIndex];
                result.splice(chooseTopNewsIndex, 1); // 刪除數組中頭條新聞的數據，剩下的全部渲染到新聞列表

                // 非頭條的新聞渲染進新聞列表，過濾某些沒有detail的數據
                let newsList = [];
                const newsNum = 25;
                for (let i = 0; i < (result.length >= newsNum ? newsNum : result.length); i++) {
                    if (result[i].details.length > 0) {
                        newsList.push(result[i]);
                    }
                }

                // 匹配對應語言的標題，經測試：有時只有1 or 2 or 3種文字的標題
                // 中文標題
                let title_cn = '';
                // 英文標題
                let title_en = '';
                // 葡文標題
                let title_pt = '';
                topNews.details.map(item => {
                    if (item.locale == 'en_US') {
                        title_en = item.title;
                    } else if (item.locale == 'pt_PT') {
                        title_pt = item.title;
                    } else if (item.locale == 'zh_TW') {
                        title_cn = item.title;
                    }
                });

                this.setState({
                    newsList,
                    topNews: {
                        // 發佈日期
                        publishDate: topNews.common.publishDate,
                        // 中文標題
                        title_cn,
                        // 英文標題
                        title_en,
                        // 葡文標題
                        title_pt,
                        // 相片數組
                        imageUrls: topNews.common.imageUrls,
                    },
                    isLoading: false,
                });
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

    // 頭條新聞的渲染
    renderTopNews = () => {
        const {
            // 發佈日期
            publishDate,
            // 中文標題
            title_cn,
            // 英文標題
            title_en,
            // 葡文標題
            title_pt,
            // 相片數組
            imageUrls,
        } = this.state.topNews;

        return (
            <View style={{ marginTop: scale(5) }}>
                <Text style={{ ...uiStyle.defaultText, color: black.third, alignSelf: 'center' }}>
                    Data From: data.um.edu.mo
                </Text>
                <View style={styles.topNewsContainer}>
                    <View style={{ width: '100%' }}>
                        {/* 圖片背景 */}
                        {this.state.topNews.imageUrls && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    trigger();
                                    this.context.navigate('NewsDetail', {
                                        data: topNews,
                                    });
                                }}>
                                <FastImage
                                    source={{
                                        uri: imageUrls[0].replace(
                                            'http:',
                                            'https:',
                                        ),
                                        // cache: FastImage.cacheControl.web,
                                    }}
                                    style={{ width: '100%', height: '100%' }}
                                    onLoadStart={() => {
                                        this.setState({ imgLoading: true });
                                    }}
                                    onLoad={() => {
                                        this.setState({ imgLoading: false });
                                    }}>
                                    {/* 塗上50%透明度的黑，讓白色字體能看清 */}
                                    <View style={styles.topNewsOverlay}>
                                        {/* Top Story字樣 */}
                                        <View style={styles.topNewsPosition}>
                                            <Text style={styles.topNewsText}>
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
                                                    ...uiStyle.defaultText,
                                                    color: COLOR_DIY.trueWhite,
                                                    fontWeight: 'bold',
                                                    fontSize: scale(18),
                                                }}
                                                numberOfLines={3}>
                                                {title_en}
                                            </Text>
                                            <Text
                                                style={{
                                                    ...uiStyle.defaultText,
                                                    color: COLOR_DIY.trueWhite,
                                                    fontWeight: 'bold',
                                                    fontSize: scale(13),
                                                }}>
                                                {title_cn}
                                            </Text>
                                        </View>
                                    </View>

                                    {this.state.imgLoading ? (
                                        <View
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'absolute',
                                            }}>
                                            <ActivityIndicator
                                                size={'large'}
                                                color={COLOR_DIY.white}
                                            />
                                        </View>
                                    ) : null}
                                </FastImage>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </View>
        );
    };

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
                <TouchableWithoutFeedback
                    onPress={() => {
                        trigger();
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

    render() {
        return (
            <View
                style={{
                    flex: 1,
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: COLOR_DIY.bg_color,
                }}>
                {/* 懸浮可拖動按鈕 */}
                {this.state.isLoading ? null : this.renderGoTopButton()}

                {/* 新聞列表 */}
                {/* 判斷是否加載中 */}
                {this.state.isLoading ? (
                    // 渲染Loading時的骨架屏
                    <ScrollView
                        contentContainerStyle={{
                            flex: 1,
                            justifyContent: 'center',
                            backgroundColor: bg_color,
                        }}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isScrollViewLoading}
                                onRefresh={() => {
                                    this.setState({ isScrollViewLoading: true });
                                    this.getData();
                                }}
                            />
                        }>
                        <Loading />
                    </ScrollView>
                ) : (
                    // 渲染新聞列表
                    <VirtualizedList
                        data={this.state.newsList}
                        ref={this.virtualizedList}
                        // 初始渲染的元素，設置為剛好覆蓋屏幕
                        initialNumToRender={4}
                        windowSize={3}
                        renderItem={({ item }) => <NewsCard data={item} />}
                        contentContainerStyle={{ width: '100%' }}
                        keyExtractor={itm => itm._id}
                        // 整理item數據
                        getItem={getItem}
                        // 渲染項目數量
                        getItemCount={getItemCount}
                        // 列表頭部渲染的組件 - 頭條新聞
                        ListHeaderComponent={this.renderTopNews}
                        // 列表底部渲染，防止Tabbar遮擋
                        ListFooterComponent={() => (
                            <View style={{ marginTop: scale(100) }}></View>
                        )}
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
                        directionalLockEnabled
                        alwaysBounceHorizontal={false}
                    />
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    topNewsContainer: {
        borderRadius: scale(10),
        overflow: 'hidden',
        marginHorizontal: scale(10),
        marginVertical: scale(5),
        height: scale(200),
        backgroundColor: white,
        ...viewShadow,
    },
    topNewsOverlay: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: scale(15),
        justifyContent: 'flex-end',
    },
    topNewsPosition: {
        position: 'absolute',
        top: scale(10),
        left: scale(15),
    },
    topNewsText: {
        ...uiStyle.defaultText,
        color: COLOR_DIY.trueWhite,
        fontWeight: 'bold',
        fontSize: scale(20),
    },
});

export default NewsPage;
