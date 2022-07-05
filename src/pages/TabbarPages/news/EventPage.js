import React, {Component} from 'react';
import {
    Text,
    View,
    StyleSheet,
    Dimensions,
    FlatList,
    ScrollView,
    TouchableWithoutFeedback,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import EventCard from './components/EventCard';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {width: PAGE_WIDTH} = Dimensions.get('window');

// 防誤觸時間，理論越長越穩
const PREVENT_TOUCH_TIME = 500;

// 模擬數據庫data
dataList = [
    {
        // 該活動在數據庫中的id
        eventID: 8,
        // 海報鏈接
        imgUrl: 'https://www.um.edu.mo/wp-content/uploads/2022/06/270879-%E5%85%A8%E7%90%83%E8%A6%96%E9%87%8E%E8%AC%9B%E5%BA%A7%E7%B3%BB%E5%88%97-%E4%B8%AD%E8%97%A5%E5%92%8C%E5%A4%A9%E7%84%B6%E7%94%A2%E7%89%A9%E7%9A%84%E5%8D%93%E8%B6%8A%E7%A0%94%E7%A9%B6-%E2%80%93-%E9%9B%BB%E9%87%9D%E6%8A%97%E7%82%8E%E7%9A%84%E7%A5%9E%E7%B6%93%E8%A7%A3%E5%89%96%E5%AD%B8%E5%9F%BA%E7%A4%8E-poster.jpg',
        // 活動標題
        title: '全球視野講座系列: 中藥和天然產物的卓越研究 – 電針抗炎的神經解剖學基礎',
        // 13位毫秒級時間戳
        timeStamp: 1656482002000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 7,
        // 海報鏈接
        imgUrl: 'https://www.um.edu.mo/wp-content/uploads/2022/06/270706-%E6%99%BA%E6%85%A7%E5%9F%8E%E5%B8%82%E7%89%A9%E8%81%AF%E7%B6%B2%E5%82%91%E5%87%BA%E8%AC%9B%E5%BA%A7%E7%B3%BB%E5%88%97%EF%BC%9A%E6%99%BA%E8%83%BD%E5%82%B3%E6%84%9F%E8%88%87%E7%B6%B2%E8%B7%AF%E9%80%9A%E4%BF%A1%E5%B0%88%E9%A1%8C-poster-scaled.jpg',
        // 活動標題
        title: '講座：智能傳感與網絡通信',
        // 13位毫秒級時間戳
        timeStamp: 1656136402000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 6,
        // 海報鏈接
        imgUrl: 'https://www.um.edu.mo/wp-content/uploads/2022/05/267367-%E5%A4%9A%E5%8A%9F%E8%83%BD%E9%9B%BB%E6%B1%A0%E5%A4%8F%E4%BB%A4%E7%87%9F-2022-poster.jpg',
        // 活動標題
        title: '多功能電池夏令營 2022',
        // 13位毫秒級時間戳
        timeStamp: 1658210002000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 0,
        // 海報鏈接
        imgUrl: 'https://info.umsu.org.mo/storage/activity_covers/images/7332b858246993976a892b229e5942ab.jpg',
        // 活動標題
        title: '3月福利',
        // 13位毫秒級時間戳
        timeStamp: 1655018688000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 1,
        // 海報鏈接
        imgUrl: 'https://info.umsu.org.mo/storage/activity_covers/images/13a5158b6a890818615af9bcff8bc81b.png',
        // 活動標題
        title: '校園Vlog大賽',
        // 13位毫秒級時間戳
        timeStamp: 1655018688000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 2,
        // 海報鏈接
        imgUrl: 'https://info.umsu.org.mo/storage/activity_covers/images/c8049bf0ebd8ea081e75f1c1573631f2.png',
        // 活動標題
        title: '香水工作坊',
        // 13位毫秒級時間戳
        timeStamp: 1655018688000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 3,
        // 海報鏈接
        imgUrl: 'https://www.cpsumsu.org/_announcement/CPSUMSU_Web_Crawler_Workshop2022/poster.jpg',
        // 活動標題
        title: '網絡爬蟲工作坊',
        // 13位毫秒級時間戳
        timeStamp: 1655018688000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 4,
        // 海報鏈接
        imgUrl: 'https://www.cpsumsu.org/_announcement/CPSUMSU_UMEF2022_postpone/279037122_5018677904858794_5613582783794191615_n.jpg',
        // 活動標題
        title: '澳大電競節2022',
        // 13位毫秒級時間戳
        timeStamp: 1655018688000,
    },
    {
        // 該活動在數據庫中的id
        eventID: 5,
        // 海報鏈接
        imgUrl: 'https://www.cpsumsu.org/_announcement/Game_Design_Workshop2022/img/poster.jpg',
        // 活動標題
        title: '遊戲設計工作坊',
        // 13位毫秒級時間戳
        timeStamp: 1655018688000,
    },
];

class EventPage extends Component {
    constructor() {
        super();
        // 將dataList的數據分成單數和偶數列，用於模擬瀑布屏展示佈局
        let leftDataList = [];
        let rightDataList = [];
        dataList.map((itm, idx) => {
            if (idx % 2 == 0) {
                leftDataList.push(itm);
            } else {
                rightDataList.push(itm);
            }
        });
        this.state = {
            leftDataList,
            rightDataList,
        };
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
                        this.refs.scrollView.scrollTo({
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
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                {/* 懸浮可拖動按鈕 */}
                {this.renderGoTopButton()}

                {/* 仿瀑布屏展示 */}
                <ScrollView ref={'scrollView'}>
                    <View
                        style={{
                            flex: 1,
                            flexDirection: 'row',
                            backgroundColor: COLOR_DIY.bg_color,
                            justifyContent: 'space-around',
                        }}>
                        {/* 左側的列 放置雙數下標的圖片 從0開始 */}
                        <View>
                            <FlatList
                                data={this.state.leftDataList}
                                renderItem={({item}) => {
                                    return (
                                        <EventCard
                                            data={item}
                                            style={s.cardContainer}></EventCard>
                                    );
                                }}
                                scrollEnabled={false}
                            />
                        </View>

                        {/* 右側的列 放置單數下標的圖片 */}
                        <View>
                            <FlatList
                                data={this.state.rightDataList}
                                renderItem={({item}) => {
                                    return (
                                        <EventCard
                                            data={item}
                                            style={s.cardContainer}></EventCard>
                                    );
                                }}
                                scrollEnabled={false}
                            />
                        </View>
                    </View>
                    {/* 防止底部遮擋 */}
                    <View style={{marginBottom: pxToDp(50)}} />
                </ScrollView>
            </View>
        );
    }
}

const s = StyleSheet.create({
    // 活動卡片間距
    cardContainer: {
        marginVertical: pxToDp(6),
        marginHorizontal: pxToDp(6),
    },
});

export default EventPage;
