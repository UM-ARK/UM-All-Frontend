import React, { Component } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageBackground,
    ScrollView,
    RefreshControl,
} from 'react-native';

// 引入本地工具
import { COLOR_DIY, uiStyle, } from '../../utils/uiMap';
import { UM_BUS_LOOP_ZH, UM_BUS_LOOP_EN, UM_MAP, } from '../../utils/pathMap';
import { openLink } from '../../utils/browser';
import { logToFirebase } from '../../utils/firebaseAnalytics';
import Header from '../../components/Header';
import LoadingDotsDIY from '../../components/LoadingDots';
import { trigger } from '../../utils/trigger';

import Ionicons from 'react-native-vector-icons/Ionicons';
import Modal from 'react-native-modal';
import { DOMParser } from "react-native-html-parser";
import { scale, verticalScale } from 'react-native-size-matters';
import axios from 'axios';
import Toast from 'react-native-toast-message';
import TouchableScale from "react-native-touchable-scale";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from 'i18next';

const { bg_color, white, black, themeColor, secondThemeColor, viewShadow } =
    COLOR_DIY;
// const { width: PAGE_WIDTH } = Dimensions.get('window'); // screen 包括navi bar
// const { height: PAGE_HEIGHT } = Dimensions.get('window');

let busIcon = require('../../static/img/Bus/bus.png');
let busRouteImg = require('../../static/img/Bus/bus_route.png');
let stopImgArr = [
    require('../../static/img/Bus/stopImg/PGH.jpg'),
    require('../../static/img/Bus/stopImg/E4.jpg'),
    require('../../static/img/Bus/stopImg/N2.jpg'),
    require('../../static/img/Bus/stopImg/N6.jpg'),
    require('../../static/img/Bus/stopImg/E11.jpg'),
    require('../../static/img/Bus/stopImg/E21.jpg'),
    require('../../static/img/Bus/stopImg/E32.jpg'),
    require('../../static/img/Bus/stopImg/S4.jpg'),
];

// 解析campus Bus的HTML
function getBusData(busInfoHtml) {
    // 使用第三方插件react-native-html-parser，以使用DomParser（為了懶寫代碼，複用Vue寫的解析邏輯）
    // https://bestofreactjs.com/repo/g6ling-react-native-html-parser-react-native-utilities
    let doc = new DOMParser().parseFromString(busInfoHtml, 'text/html');

    // 主要的巴士資訊都存放在span內
    let mainInfo = doc.getElementsByTagName('span');
    let busInfoArr = new Array();

    // 到站時車牌屬於span（13個span）。未到站時車牌屬於div（12個span）
    // 無車服務時只有0~2的下標為busInfo（11個span）。有車服務時，0~3的下標都是busInfo（至少12個span）
    let infoIndex = mainInfo.length >= 12 ? 3 : 2;

    // 分隔車輛運行資訊
    for (let i = 0; i < mainInfo.length; i++) {
        let text = mainInfo[i].textContent;
        if (i <= infoIndex) {
            busInfoArr.push(text);
        } else {
            break;
        }
    }
    // console.log("busInfoArr為:",    busInfoArr);

    // 車輛和站點都在class=main的div標籤內
    let arriveInfoBuffer = doc.getElementsByClassName('left', false);
    // console.log("巴士到達資訊HTML節點形式:",arriveInfoBuffer);

    // 將節點文字數據存入Array，用於以車牌判斷巴士到達位置
    let arriveInfoArr = [];
    // 解析巴士到站數據
    for (let i = 0; i < arriveInfoBuffer.length; i++) {
        let item = arriveInfoBuffer[i].textContent;
        // 刪除字符串內的\t \n
        arriveInfoArr.push(item.replace(/[\t\n]/g, ''));
    }
    // index 0：PGH 站點
    // 1：PGH ~ E4 路上
    // 2：E4 站點，以此類推
    // 15：S4 下方的虛無站
    // console.log("巴士到站狀態數組為:",arriveInfoArr);

    // 判斷目前有無巴士
    let busPositionArr = [];
    for (let i = 0; i < arriveInfoArr.length; i++) {
        let item = arriveInfoArr[i];
        if (item.length > 0) {
            busPositionArr.push({
                number: item,
                index: i,
            });
        }
    }
    // console.log("Bus車牌、位置總數據：",busPositionArr);

    return {
        busInfoArr,
        busPositionArr,
    };
}

let BUS_URL = UM_BUS_LOOP_ZH;

// 巴士報站頁 - 畫面佈局與渲染
class BusScreen extends Component {
    timer = null;

    state = {
        busPositionArr: [],
        // Example: busPositionArr: [{index: 0}],
        busInfoArr: [],
        // 彈出層默認關閉
        isModalVisible: false,
        // 彈出層內容
        modalContent: ['text', 'stopImage', 'busName'],
        // 點擊站點的數組索引
        clickStopIndex: 0,
        isLoading: true,
        toastColor: themeColor,
    };

    async componentDidMount() {
        BUS_URL = await AsyncStorage.getItem('language').then(res => {
            const lng = JSON.parse(res);
            // 當為中文設置
            if (lng != 'tc') {
                return UM_BUS_LOOP_EN;
            } else {
                return UM_BUS_LOOP_ZH;
            }
        })

        logToFirebase('openPage', { page: 'bus' });
        // 打開Bus頁時直接請求巴士報站的數據
        this.fetchBusInfo();

        // 定時自動刷新巴士數據
        this.timer = setInterval(() => {
            // this.onRefresh();
            this.fetchBusInfo();
        }, 7000);
    }

    componentWillUnmount() {
        clearInterval(this.timer);
    }

    // 爬蟲campus Bus
    fetchBusInfo = async () => {
        await axios.get(BUS_URL)
            .then(res => getBusData(res.data))
            .then(result => {
                // TODO: busInfoArr服務正常時，有時length為3，有時為4。為4時缺失“下一班車時間”資訊。
                result.busInfoArr.shift(); // 移除數組第一位的 “澳大環校穿梭巴士報站資訊” 字符串

                this.setState({
                    busInfoArr: result.busInfoArr,
                    busPositionArr: result.busPositionArr,
                    haveBus: result.busPositionArr.length > 0 ? true : false,
                    isLoading: false,
                });
                if (this.state.busPositionArr.length == 0) {
                    this.setState({ toastColor: COLOR_DIY.warning });
                    Toast.show({
                        type: 'warning',
                        text1: '當前沒有巴士~',
                        text2: '[]~(￣▽￣)~* 👋',
                        topOffset: scale(100),
                        onPress: () => Toast.hide(),
                    });
                } else {
                    this.setState({ toastColor: themeColor });
                    Toast.show({
                        type: 'arkToast',
                        text1: 'Data is Loading~',
                        text2: '幫你刷新了一下~ []~(￣▽￣)~* 👋',
                        topOffset: scale(100),
                        onPress: () => Toast.hide(),
                    });
                }
            })
            .catch(error => {
                this.setState({ toastColor: COLOR_DIY.warning });
                Toast.show({
                    type: 'error',
                    text1: '網絡錯誤！',
                    topOffset: scale(100),
                    onPress: () => Toast.hide(),
                });
            });
    };

    // 巴士站點文字渲染
    renderBusStopText = (left, top, buildingCode, text, index) => {
        const { busPositionArr } = this.state;
        let borderColor = themeColor;
        if (busPositionArr.length > 0) {
            busPositionArr.map(item => {
                if (item.index / 2 == index) {
                    borderColor = secondThemeColor;
                }
            });
        }

        return (
            <TouchableScale
                onPress={this.toggleModal.bind(this, index)}
                style={{
                    position: 'absolute', left: scale(left), top: scale(top),
                    paddingHorizontal: scale(5), paddingVertical: scale(2),
                    alignItems: 'center', justifyContent: 'center',
                    borderColor, borderRadius: scale(20), borderWidth: scale(2),
                }}>
                <Text style={{ ...uiStyle.defaultText, color: borderColor, fontSize: scale(11), fontWeight: 'bold' }}>
                    {buildingCode}
                    <Text style={{ ...uiStyle.defaultText, fontWeight: 'normal' }}>{' ' + text}</Text>
                </Text>
            </TouchableScale>
        );
    };

    // 控制彈出層打開 or 關閉
    toggleModal = index => {
        trigger();
        this.setState({
            isModalVisible: !this.state.isModalVisible,
            clickStopIndex: index,
        });
    };

    onRefresh = () => {
        this.setState({ isLoading: true });
        this.fetchBusInfo();
    };

    render() {
        let busStyleArr = [
            // 巴士到達位置，0為PGH，1為PGH~E4路上，2為E4
            { position: 'absolute', left: scale(255), top: scale(450) }, // PGH
            { position: 'absolute', left: scale(255), top: scale(380) }, // PGH ~ E4
            { position: 'absolute', left: scale(255), top: scale(300) }, // E4
            { position: 'absolute', left: scale(255), top: scale(200) }, // E4 ~ N2
            { position: 'absolute', left: scale(255), top: scale(80) }, // N2
            { position: 'absolute', left: scale(160), top: scale(30) }, // N2 ~ N6
            { position: 'absolute', left: scale(75), top: scale(58) }, // N6
            { position: 'absolute', left: scale(30), top: scale(120) }, // N6 ~ E11
            { position: 'absolute', left: scale(30), top: scale(155) }, // E11
            { position: 'absolute', left: scale(30), top: scale(210) }, // E11 ~ E21
            { position: 'absolute', left: scale(30), top: scale(265) }, // N21
            { position: 'absolute', left: scale(30), top: scale(330) }, // N21 ~ E32
            { position: 'absolute', left: scale(30), top: scale(390) }, // E32
            { position: 'absolute', left: scale(30), top: scale(500) }, // E32 ~ S4
            { position: 'absolute', left: scale(190), top: scale(493) }, // s4
            { position: 'absolute', left: scale(255), top: scale(500) }, // s4 ~ PGH
        ];

        const { busPositionArr, busInfoArr, toastColor, isLoading } = this.state;

        return (
            <View style={{ flex: 1, backgroundColor: bg_color }}>
                <Header title={t('校園巴士', { ns: 'features' })} />

                <ScrollView
                    bounces={false}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={isLoading}
                            onRefresh={this.onRefresh}
                        />
                    }>
                    <ScrollView horizontal={false}>
                        <ImageBackground
                            style={{
                                width: scale(310),
                                height: scale(600),
                                marginLeft: scale(25),
                                marginBottom: scale(40),
                            }}
                            source={busRouteImg}
                            resizeMode={'contain'}>
                            {/* Data From */}
                            <View
                                style={{
                                    ...s.infoContainer,
                                    left: scale(60),
                                    top: scale(575),
                                    marginTop: scale(10),
                                }}>
                                <Text
                                    style={{ ...uiStyle.defaultText, fontSize: scale(12), color: black.third }}>
                                    Data From: cmdo.um.edu.mo
                                </Text>
                            </View>
                            {/* 澳大地圖 */}
                            <TouchableOpacity
                                style={{
                                    ...s.infoContainer,
                                    left: scale(110),
                                    top: scale(350),
                                }}
                                onPress={() => {
                                    trigger();
                                    // Linking.openURL(UM_MAP);
                                    // const webview_param = {
                                    //     url: UM_MAP,
                                    //     title: '校園地圖',
                                    //     text_color: black.main,
                                    //     bg_color_diy: '#ffffff',
                                    //     isBarStyleBlack: true,
                                    // };
                                    // this.props.navigation.navigate('Webviewer', webview_param);
                                    openLink(UM_MAP);
                                }}
                            >
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(11), color: themeColor, fontWeight: 'bold' }}>{t('校園地圖', { ns: 'features' })}</Text>
                            </TouchableOpacity>
                            {/* Bus運行信息的渲染 */}
                            <View
                                style={{
                                    ...s.infoContainer,
                                    left: scale(65),
                                    top: scale(185),
                                    width: scale(160),
                                }}>
                                {busInfoArr.length > 0
                                    ? this.state.busInfoArr.map(item => (
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                color: black.third,
                                                fontSize: scale(10),
                                            }}>
                                            {item}
                                        </Text>
                                    ))
                                    : null}
                            </View>

                            {/* 巴士圖標 */}
                            {busPositionArr.length > 0
                                ? busPositionArr.map(item => (
                                    <TouchableScale style={busStyleArr[item.index]} activeScale={0.6}
                                        onPress={() => {
                                            trigger();
                                            this.fetchBusInfo();
                                        }}>
                                        <Image
                                            source={busIcon}
                                            style={{
                                                width: scale(30),
                                                height: scale(30),
                                            }}
                                        />
                                    </TouchableScale>
                                ))
                                : null}

                            {/* 巴士站點文字 */}
                            {this.renderBusStopText(100, 455, 'PGH', '研究生宿舍(起)', 0)}
                            {this.renderBusStopText(145, 302, 'E4', '劉少榮樓', 1)}
                            {this.renderBusStopText(145, 82, 'N2', '大學會堂', 2)}
                            {this.renderBusStopText(45, 90, 'N6', '行政樓', 3)}
                            {this.renderBusStopText(79, 160, 'E11', '科技學院', 4)}
                            {this.renderBusStopText(79, 267, 'E21', '人文社科樓', 5)}
                            {this.renderBusStopText(79, 395, 'E32', '法學院', 6)}
                            {this.renderBusStopText(80, 547, 'S4', '研究生宿舍南四座(終)', 7)}

                            <View style={{
                                position: 'absolute',
                                top: scale(5),
                                left: scale(130),
                                width: scale(35),
                            }}>
                                <LoadingDotsDIY />
                            </View>
                        </ImageBackground>
                    </ScrollView>
                </ScrollView>

                {/* 彈出層 - 展示站點圖片 */}
                <Modal
                    isVisible={this.state.isModalVisible}
                    onBackdropPress={this.toggleModal.bind(
                        this,
                        this.state.clickStopIndex,
                    )}
                    animationIn="zoomIn"
                    animationOut="zoomOut"
                    animationInTiming={500}
                    animationOutTiming={500}
                    backdropOpacity={0.4}
                    backdropTransitionOutTiming={500}>
                    <View
                        style={{
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}>
                        {/* 關閉圖標 - 引導用戶點擊背景關閉彈出層 */}
                        <TouchableOpacity
                            style={{
                                position: 'absolute',
                                right: scale(5),
                                top: scale(45)
                            }}
                            onPress={this.toggleModal.bind(
                                this,
                                this.state.clickStopIndex,
                            )}>
                            <Ionicons
                                name={'close-circle'}
                                size={scale(35)}
                                color={white}
                            />
                        </TouchableOpacity>
                        <Image
                            source={stopImgArr[this.state.clickStopIndex]}
                            style={{ height: '60%' }}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>
            </View>
        );
    }
}

const s = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'column',
    },
    arrowSize: {
        width: scale(35),
        height: scale(35),
        resizeMode: 'contain',
    },
    dotSize: {
        width: scale(21),
        height: scale(21),
        resizeMode: 'contain',
    },
    infoContainer: {
        position: 'absolute',
        marginHorizontal: scale(10),
        backgroundColor: white,
        borderRadius: scale(10),
        ...viewShadow,
        paddingHorizontal: scale(10),
        paddingVertical: scale(3),
    },
});

export default BusScreen;
