import React, {Component} from 'react';
import {View, Text, VirtualizedList, Dimensions} from 'react-native';

import NewsCard from './components/NewsCard';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import FastImage from 'react-native-fast-image';
import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';
import ContentLoader, {Rect, Circle, Path} from 'react-content-loader/native';
import {
    TouchableOpacity,
    TouchableWithoutFeedback,
} from 'react-native-gesture-handler';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

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

// 渲染幾個骨架屏
const renderLoader = new Array(parseInt(PAGE_HEIGHT / 200));
renderLoader.fill(0);
console.log(renderLoader);
// loading時的骨架屏
const NewsLoader = props => (
    <ContentLoader
        viewBox="0 0 400 200"
        width={PAGE_WIDTH}
        height={200}
        title="Loading news..."
        {...props}>
        <Rect x="42.84" y="9.93" rx="5" ry="5" width="143.55" height="86.59" />
        <Rect x="192.84" y="9.67" rx="0" ry="0" width="148.72" height="12.12" />
        <Rect x="192.84" y="25.67" rx="0" ry="0" width="89" height="9" />
        <Rect x="42.84" y="107" rx="5" ry="5" width="143.55" height="86.59" />
        <Rect x="192.84" y="107" rx="0" ry="0" width="148.72" height="12.12" />
        <Rect x="192.84" y="123" rx="0" ry="0" width="89" height="9" />
    </ContentLoader>
);

// 頭條新聞數據Obj，不要刪掉，作為全局變量給另一個func調用
let topNews = {};

class NewsPage extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

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
            // 有時會沒有圖片imageUrls數組，所以只選擇有圖的新聞作為頭條
            let chooseTopNewsIndex = 0;
            while (true) {
                if ('imageUrls' in res[chooseTopNewsIndex].common) {
                    // 有圖
                    break;
                } else {
                    // 沒圖
                    chooseTopNewsIndex++;
                }
            }

            // 頭條指定為當天最新的、有圖的新聞
            topNews = res[chooseTopNewsIndex];
            res.splice(chooseTopNewsIndex, 1); // 刪除頭條新聞的數據，剩下的全部渲染到新聞列表
            // 非頭條的新聞渲染進新聞列表，過濾某些沒有detail的數據
            let newsList = [];
            for (let i = 0; i < res.length; i++) {
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
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                this.context.navigate('NewsDetail', {
                                    data: topNews,
                                });
                            }}>
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
                        </TouchableOpacity>
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
                        console.log('回頂！！');
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
                            backgroundColor: COLOR_DIY.white,
                            borderRadius: pxToDp(50),
                            justifyContent: 'center',
                            alignItems: 'center',
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

    // 下拉刷新事件
    _onRefresh = () => {
        // 請求澳大新聞API
        this.setState({isLoading: true});
        this.getData();
        console.log('觸發刷新');
        // 停止更新動畫
        this._scrollView.endRefresh();
    };

    render() {
        // 解構全局ui設計顏色
        const {white, black, viewShadow, bg_color} = COLOR_DIY;
        // TODO: 增加 下拉刷新
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
                {/* 判斷是否加載中 */}
                {this.state.isLoading ? (
                    // 渲染Loading時的骨架屏
                    <View style={{backgroundColor: bg_color, flex: 1}}>
                        {renderLoader.map(() => NewsLoader())}
                    </View>
                ) : (
                    // 渲染新聞列表
                    <VirtualizedList
                        data={this.state.newsList}
                        ref={'virtualizedList'}
                        // 初始渲染的元素，設置為剛好覆蓋屏幕
                        initialNumToRender={3}
                        renderItem={({item}) => {
                            return <NewsCard data={item}></NewsCard>;
                        }}
                        // 整理item數據
                        getItem={getItem}
                        // 渲染項目數量
                        getItemCount={getItemCount}
                        // 列表頭部渲染的組件 - 頭條新聞
                        ListHeaderComponent={this.renderTopNews}
                        // 列表底部渲染，防止Tabbar遮擋
                        ListFooterComponent={() => (
                            <View style={{marginTop: pxToDp(200)}}></View>
                        )}
                        onRefresh={() => {
                            // 展示Loading標識
                            this.setState({isLoading: true});
                            this.getData();
                        }}
                        refreshing={this.state.isLoading}
                    />
                )}
            </View>
        );
    }
}
export default NewsPage;
