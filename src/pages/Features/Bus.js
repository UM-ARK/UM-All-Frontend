import React, { Component } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageBackground,
    ScrollView,
    Dimensions,
    RefreshControl,
    NativeModules,
    Button,
} from 'react-native';

// 引入本地工具
import { pxToDp, pcHeightToNumHeight, rpx } from '../../utils/stylesKits';
import { COLOR_DIY } from '../../utils/uiMap';
import { UM_BUS_LOOP } from '../../utils/pathMap';
import Header from '../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';
import Modal from 'react-native-modal';
var DomParser = require('react-native-html-parser').DOMParser;
import { scale, verticalScale } from 'react-native-size-matters';
import Toast, { DURATION } from 'react-native-easy-toast';

const { bg_color, white, black, themeColor, secondThemeColor, viewShadow } =
    COLOR_DIY;
const { width: PAGE_WIDTH } = Dimensions.get('window'); // screen 包括navi bar
const { height: PAGE_HEIGHT } = Dimensions.get('window');
const { DynamicIslandModule } = NativeModules;

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
    let doc = new DomParser().parseFromString(busInfoHtml, 'text/html');

    // 主要的巴士資訊都存放在span內
    var mainInfo = doc.getElementsByTagName('span');
    var busInfoArr = new Array();

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
    var arriveInfoBuffer = doc.getElementsByClassName('left', false);
    // console.log("巴士到達資訊HTML節點形式:",arriveInfoBuffer);

    // 將節點文字數據存入Array，用於以車牌判斷巴士到達位置
    var arriveInfoArr = [];
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
            DynamicIslandModule.updateBusReminder(busPositionArr[0].index);
        }
    }
    if (busPositionArr[0].index < 0 || busPositionArr[0].index > 15) {
        DynamicIslandModule.updateBusReminder(16);
    }
    //console.log("Bus車牌、位置總數據：",busPositionArr);

    // console.log('\n\n\n');
    return {
        busInfoArr,
        busPositionArr,
    };
}

let timer = null;
let timerForiOS = null;

// 巴士報站頁 - 畫面佈局與渲染
class BusScreen extends Component {
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

    constructor() {
        super();
        // 打開Bus頁時直接請求巴士報站的數據
        this.fetchBusInfo();
    }

    componentDidMount() {
        timer = setInterval(() => {
            this.onRefresh();
        }, 7000);
    }

    componentWillUnmount() {
        clearInterval(timer);
    }

    // 爬蟲campus Bus
    fetchBusInfo = () => {
        // 訪問campusloop網站
        fetch(UM_BUS_LOOP, {
            method: 'GET',
        })
            .then(res => res.text())
            .then(text => getBusData(text))
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
                    this.toast.show(`當前沒有巴士~\n[]~(￣▽￣)~*`, 3000);
                } else {
                    this.setState({ toastColor: themeColor });
                    this.toast.show(
                        `不要著急~\nData is Loading~\n[]~(￣▽￣)~*`,
                        1500,
                    );
                }
            })
            .catch(error => {
                this.setState({ toastColor: COLOR_DIY.warning });
                this.toast.show(`網絡錯誤`, 2000);
            });
    };

    // 巴士站點文字渲染
    renderBusStopText = (left, top, text, index) => {
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
            <TouchableOpacity
                onPress={this.toggleModal.bind(this, index)}
                style={{
                    position: 'absolute',
                    left: scale(left),
                    top: scale(top),
                    paddingHorizontal: pxToDp(5),
                    paddingVertical: pxToDp(2),
                    alignItems: 'center',
                    borderColor,
                    borderRadius: pxToDp(20),
                    borderWidth: pxToDp(2),
                }}>
                <Text style={{ color: borderColor, fontSize: 12.5 }}>{text}</Text>
            </TouchableOpacity>
        );
    };

    // 控制彈出層打開 or 關閉
    toggleModal = index => {
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

        const { busPositionArr, busInfoArr, toastColor } = this.state;

        const startReminder = () => {
            if (busPositionArr.length > 0) {
                DynamicIslandModule.startBusReminder('Start Reminder', busPositionArr[0].index);
            }
            if (busPositionArr.length == 0) {
                DynamicIslandModule.startBusReminder('Start Reminder', 16)
            }
        }

        const stopReminder = () => {
            DynamicIslandModule.endBusReminder()
        }

        return (
            <View style={{ flex: 1, backgroundColor: bg_color }}>
                <Header title={'校園巴士'} />
                <Button title="开启灵动报站"
                    onPress={startReminder}
                />
                <Button title="关闭灵动报站"
                    onPress={stopReminder}
                />
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={this.onRefresh}
                        />
                    }>
                    <ScrollView horizontal>
                        <ImageBackground
                            style={{
                                width: scale(310),
                                height: scale(600),
                                marginLeft: scale(25),
                                marginBottom: scale(25),
                            }}
                            source={busRouteImg}
                            resizeMode={'contain'}>
                            {/* Data From */}
                            <View
                                style={{
                                    ...s.infoContainer,
                                    left: scale(60),
                                    top: scale(575),
                                }}>
                                <Text
                                    style={{ fontSize: 12, color: black.third }}>
                                    Data From: cmdo.um.edu.mo
                                </Text>
                            </View>
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
                                                color: black.second,
                                                fontSize: scale(10.5),
                                            }}>
                                            {item}
                                        </Text>
                                    ))
                                    : null}
                            </View>

                            {/* 巴士圖標 */}
                            {busPositionArr.length > 0
                                ? busPositionArr.map(item => (
                                    <View style={busStyleArr[item.index]}>
                                        <Image
                                            source={busIcon}
                                            style={{
                                                width: pxToDp(30),
                                                height: pxToDp(30),
                                            }}
                                        />
                                    </View>
                                ))
                                : null}

                            {/* 巴士站點文字 */}
                            {this.renderBusStopText(
                                110,
                                455,
                                'PGH 研究生宿舍(起)',
                                0,
                            )}
                            {this.renderBusStopText(153, 305, 'E4 劉少榮樓', 1)}
                            {this.renderBusStopText(153, 83, 'N2 大學會堂', 2)}
                            {this.renderBusStopText(52, 90, 'N6 行政樓', 3)}
                            {this.renderBusStopText(79, 160, 'E11 科技學院', 4)}
                            {this.renderBusStopText(
                                79,
                                265,
                                'E21 人文社科樓',
                                5,
                            )}
                            {this.renderBusStopText(79, 395, 'E32 法學院', 6)}
                            {this.renderBusStopText(
                                79,
                                547,
                                'S4 研究生宿舍南四座(終)',
                                7,
                            )}
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
                                paddingBottom: pxToDp(10),
                                paddingLeft: pxToDp(280),
                            }}
                            onPress={this.toggleModal.bind(
                                this,
                                this.state.clickStopIndex,
                            )}>
                            <Ionicons
                                name={'close-circle'}
                                size={pxToDp(50)}
                                color={themeColor}
                            />
                        </TouchableOpacity>
                        <Image
                            source={stopImgArr[this.state.clickStopIndex]}
                            style={{ height: '60%' }}
                            resizeMode="contain"
                        />
                    </View>
                </Modal>

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{ color: white }}
                    style={{
                        backgroundColor: toastColor,
                        borderRadius: pxToDp(10),
                    }}
                />
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
        width: pxToDp(35),
        height: pxToDp(35),
        resizeMode: 'contain',
    },
    dotSize: {
        width: pxToDp(21),
        height: pxToDp(21),
        resizeMode: 'contain',
    },
    infoContainer: {
        position: 'absolute',
        marginHorizontal: pxToDp(10),
        backgroundColor: white,
        borderRadius: pxToDp(10),
        ...viewShadow,
        paddingHorizontal: pxToDp(10),
        paddingVertical: pxToDp(3),
    },
});

export default BusScreen;