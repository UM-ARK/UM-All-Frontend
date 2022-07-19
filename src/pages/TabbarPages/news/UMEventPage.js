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
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import DropDownPicker from '../../../components/DropDownPicker';
import {UM_API_EVENT} from '../../../utils/pathMap';

import UMEventCard from './components/UMEventCard';

import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ContentLoader, {Rect, Circle, Path} from 'react-content-loader/native';
import axios from 'axios';
import moment from 'moment-timezone';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');

const {black, white, themeColor} = COLOR_DIY;

// 渲染幾次骨架屏
const renderLoader = new Array(parseInt(PAGE_HEIGHT / 150));
renderLoader.fill(0);
// Loading時的骨架屏
const EventsLoader = props => (
    <ContentLoader
        width={PAGE_WIDTH}
        height={150}
        viewBox="0 0 700 300"
        backgroundColor="#f5f5f5"
        foregroundColor="#ccc"
        {...props}>
        <Rect x="4" y="8" rx="3" ry="3" width="7" height="288" />
        <Rect x="6" y="289" rx="3" ry="3" width="669" height="8" />
        <Rect x="670" y="9" rx="3" ry="3" width="6" height="285" />
        <Rect x="55" y="42" rx="16" ry="16" width="274" height="216" />
        <Rect x="412" y="113" rx="3" ry="3" width="102" height="7" />
        <Rect x="402" y="91" rx="3" ry="3" width="178" height="6" />
        <Rect x="405" y="139" rx="3" ry="3" width="178" height="6" />
        <Rect x="416" y="162" rx="3" ry="3" width="102" height="7" />
        <Rect x="405" y="189" rx="3" ry="3" width="178" height="6" />
        <Rect x="5" y="8" rx="3" ry="3" width="669" height="7" />
        <Rect x="406" y="223" rx="14" ry="14" width="72" height="32" />
        <Rect x="505" y="224" rx="14" ry="14" width="72" height="32" />
        <Rect x="376" y="41" rx="3" ry="3" width="231" height="29" />
    </ContentLoader>
);

// 模擬數據庫data
dataList = [
    {
        // 該活動在數據庫中的id
        eventID: 8,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://www.um.edu.mo/wp-content/uploads/2022/06/270879-%E5%85%A8%E7%90%83%E8%A6%96%E9%87%8E%E8%AC%9B%E5%BA%A7%E7%B3%BB%E5%88%97-%E4%B8%AD%E8%97%A5%E5%92%8C%E5%A4%A9%E7%84%B6%E7%94%A2%E7%89%A9%E7%9A%84%E5%8D%93%E8%B6%8A%E7%A0%94%E7%A9%B6-%E2%80%93-%E9%9B%BB%E9%87%9D%E6%8A%97%E7%82%8E%E7%9A%84%E7%A5%9E%E7%B6%93%E8%A7%A3%E5%89%96%E5%AD%B8%E5%9F%BA%E7%A4%8E-poster.jpg',
        relateImgUrl: [
            'https://www.um.edu.mo/wp-content/uploads/2022/06/270879-%E5%85%A8%E7%90%83%E8%A6%96%E9%87%8E%E8%AC%9B%E5%BA%A7%E7%B3%BB%E5%88%97-%E4%B8%AD%E8%97%A5%E5%92%8C%E5%A4%A9%E7%84%B6%E7%94%A2%E7%89%A9%E7%9A%84%E5%8D%93%E8%B6%8A%E7%A0%94%E7%A9%B6-%E2%80%93-%E9%9B%BB%E9%87%9D%E6%8A%97%E7%82%8E%E7%9A%84%E7%A5%9E%E7%B6%93%E8%A7%A3%E5%89%96%E5%AD%B8%E5%9F%BA%E7%A4%8E-poster.jpg',
        ],
        // 活動標題
        title: '全球視野講座系列: 中藥和天然產物的卓越研究 – 電針抗炎的神經解剖學基礎',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1656482002000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 7,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://www.um.edu.mo/wp-content/uploads/2022/06/270706-%E6%99%BA%E6%85%A7%E5%9F%8E%E5%B8%82%E7%89%A9%E8%81%AF%E7%B6%B2%E5%82%91%E5%87%BA%E8%AC%9B%E5%BA%A7%E7%B3%BB%E5%88%97%EF%BC%9A%E6%99%BA%E8%83%BD%E5%82%B3%E6%84%9F%E8%88%87%E7%B6%B2%E8%B7%AF%E9%80%9A%E4%BF%A1%E5%B0%88%E9%A1%8C-poster-scaled.jpg',
        relateImgUrl: [],
        // 活動標題
        title: '講座：智能傳感與網絡通信',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1656136402000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 6,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://www.um.edu.mo/wp-content/uploads/2022/05/267367-%E5%A4%9A%E5%8A%9F%E8%83%BD%E9%9B%BB%E6%B1%A0%E5%A4%8F%E4%BB%A4%E7%87%9F-2022-poster.jpg',
        relateImgUrl: [],
        // 活動標題
        title: '多功能電池夏令營 2022',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1658210002000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 0,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://info.umsu.org.mo/storage/activity_covers/images/7332b858246993976a892b229e5942ab.jpg',
        relateImgUrl: [],
        // 活動標題
        title: '3月福利',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 1,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://info.umsu.org.mo/storage/activity_covers/images/13a5158b6a890818615af9bcff8bc81b.png',
        relateImgUrl: [],
        // 活動標題
        title: '校園Vlog大賽',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 2,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://info.umsu.org.mo/storage/activity_covers/images/c8049bf0ebd8ea081e75f1c1573631f2.png',
        relateImgUrl: [],
        // 活動標題
        title: '香水工作坊',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 3,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://www.cpsumsu.org/_announcement/CPSUMSU_Web_Crawler_Workshop2022/poster.jpg',
        relateImgUrl: [],
        // 活動標題
        title: '網絡爬蟲工作坊',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 4,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://www.cpsumsu.org/_announcement/CPSUMSU_UMEF2022_postpone/279037122_5018677904858794_5613582783794191615_n.jpg',
        relateImgUrl: [],
        // 活動標題
        title: '澳大電競節2022',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
    {
        // 該活動在數據庫中的id
        eventID: 5,
        type: 'activity',
        // 海報鏈接
        coverImgUrl:
            'https://www.cpsumsu.org/_announcement/Game_Design_Workshop2022/img/poster.jpg',
        relateImgUrl: [],
        // 活動標題
        title: '遊戲設計工作坊',
        // 13位毫秒級時間戳
        startTimeStamp: 1656482002000,
        finishTimeStamp: 1655018688000,
        link: '',
    },
];

class UMEventPage extends Component {
    constructor() {
        super();
        this.state = {
            data: undefined,
            isLoading: true,
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
        const {isLoading, data} = this.state;
        console.log(data);
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                {/* 懸浮可拖動按鈕 */}
                {this.renderGoTopButton()}

                <ScrollView>
                    {!isLoading &&
                        data.length > 0 &&
                        data.map(item => {
                            const {common, details, lastModified} = item;
                            // console.log('common', common);
                            // console.log('details', details);

                            // 開始時間
                            let dateFrom = moment
                                .tz(common.dateFrom, 'Asia/Macau')
                                .format('MM-DD');
                            // console.log('dateFrom', dateFrom);
                            return <UMEventCard data={item} />;
                        })}
                </ScrollView>
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
