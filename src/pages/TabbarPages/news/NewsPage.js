import React, {Component} from 'react';
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

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {UM_API_NEWS, UM_API_TOKEN} from '../../../utils/pathMap';

import FastImage from 'react-native-fast-image';
import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {NavigationContext} from '@react-navigation/native';
import ContentLoader, {Rect, Circle, Path} from 'react-content-loader/native';
import axios from 'axios';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

const {white, black, viewShadow, bg_color, themeColor} = COLOR_DIY;

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
// loading時的骨架屏
const NewsLoader = props => (
    <ContentLoader
        viewBox="0 0 400 200"
        width={PAGE_WIDTH}
        height={200}
        // title="Loading news..."
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
    async getData() {
        axios
            .get(UM_API_NEWS, {
                // 請求頭配置
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
            })
            .then(res => {
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
                for (let i = 0; i < result.length; i++) {
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
            .catch(err => {
                console.error(err);
            });
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
            <View style={{marginTop: pxToDp(5)}}>
                <Text style={{color: black.third, alignSelf: 'center'}}>
                    Data From: data.um.edu.mo
                </Text>
                <View style={styles.topNewsContainer}>
                    <View style={{width: '100%'}}>
                        {/* 圖片背景 */}
                        {this.state.topNews.imageUrls && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
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
                                    style={{width: '100%', height: '100%'}}
                                    onLoadStart={() => {
                                        this.setState({imgLoading: true});
                                    }}
                                    onLoad={() => {
                                        this.setState({imgLoading: false});
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
                                                    color: white,
                                                    fontWeight: 'bold',
                                                    fontSize: pxToDp(18),
                                                }}
                                                numberOfLines={3}>
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
                        ReactNativeHapticFeedback.trigger('soft');
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

    render() {
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
                    <ScrollView
                        contentContainerStyle={{backgroundColor: bg_color}}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isScrollViewLoading}
                                onRefresh={() => {
                                    this.setState({isScrollViewLoading: true});
                                    this.getData();
                                }}
                            />
                        }>
                        {renderLoader.map(() => NewsLoader())}
                    </ScrollView>
                ) : (
                    // 渲染新聞列表
                    <VirtualizedList
                        data={this.state.newsList}
                        ref={'virtualizedList'}
                        // 初始渲染的元素，設置為剛好覆蓋屏幕
                        initialNumToRender={3}
                        renderItem={({item}) => <NewsCard data={item} />}
                        keyExtractor={itm => itm._id}
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
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isLoading}
                                onRefresh={() => {
                                    // 展示Loading標識
                                    this.setState({isLoading: true});
                                    this.getData();
                                }}
                            />
                        }
                        directionalLockEnabled
                    />
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    topNewsContainer: {
        borderRadius: pxToDp(10),
        overflow: 'hidden',
        marginHorizontal: pxToDp(10),
        marginVertical: pxToDp(5),
        height: pxToDp(200),
        backgroundColor: white,
        ...viewShadow,
    },
    topNewsOverlay: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(0,0,0,0.5)',
        padding: pxToDp(15),
        justifyContent: 'flex-end',
    },
    topNewsPosition: {
        position: 'absolute',
        top: pxToDp(10),
        left: pxToDp(15),
    },
    topNewsText: {
        color: white,
        fontWeight: 'bold',
        fontSize: pxToDp(20),
    },
});

export default NewsPage;
