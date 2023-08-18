import React, { Component } from 'react';
import {
    ScrollView,
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
    RefreshControl,
    VirtualizedList,
    TouchableWithoutFeedback,
    Linking
} from 'react-native';

// 本地工具
import { COLOR_DIY } from '../../../utils/uiMap';
import {
    UM_WHOLE,
    WHAT_2_REG,
    NEW_SCZN,
    USUAL_Q,
    BASE_HOST,
    ARK_LETTER_IMG,
    UMALL_LOGO,
    BASE_URI,
    GET,
    addHost,
} from '../../../utils/pathMap';
import EventPage from '../news/EventPage.js';
import ModalBottom from '../../../components/ModalBottom';
import { setAPPInfo, handleLogout } from '../../../utils/storageKits';
import { versionStringCompare } from '../../../utils/versionKits';
import packageInfo from '../../../../package.json';
import { UMCalendar } from '../../../static/UMCalendar/UMCalendar';
import HomeCard from './components/HomeCard';

import { Header, Divider } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Interactable from 'react-native-interactable';
import { FlatGrid } from 'react-native-super-grid';
import { inject } from 'mobx-react';
import Toast from 'react-native-easy-toast';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { scale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import CookieManager from '@react-native-cookies/cookies';
import moment from 'moment';

const { white, bg_color, black, themeColor, themeColorLight } = COLOR_DIY;

const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};

// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

// 定義可使用icon，注意大小寫
const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
    img: 'img',
};

const cal = UMCalendar;

class HomeScreen extends Component {
    constructor(props) {
        super(props)

        this.state = {
            // 快捷功能入口
            functionArray: [
                {
                    icon_name: 'bus',
                    icon_type: iconTypes.ionicons,
                    function_name: '校園巴士',
                    func: () => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.props.navigation.navigate('Bus');
                    },
                },
                // {
                //     icon_name: 'database-search',
                //     icon_type: iconTypes.materialCommunityIcons,
                //     function_name: '選咩課',
                //     func: () => {
                //         ReactNativeHapticFeedback.trigger('soft');
                //         let webview_param = {
                //             url: WHAT_2_REG,
                //             title: '澳大選咩課',
                //             text_color: '#fff',
                //             bg_color_diy: '#1e558c',
                //             isBarStyleBlack: false,
                //         };
                //         this.props.navigation.navigate('Webviewer', webview_param);
                //         // this.props.navigation.jumpTo('NewsTabbar', {
                //         //     screen: 'EventPage',
                //         // });
                //     },
                // },
                // {
                //     icon_name: 'ghost',
                //     icon_type: iconTypes.materialCommunityIcons,
                //     function_name: '生存指南',
                //     func: () => {
                //         ReactNativeHapticFeedback.trigger('soft');
                //         let webview_param = {
                //             url: NEW_SCZN,
                //             title: '新鮮人要知道的億些Tips',
                //             text_color: COLOR_DIY.black.second,
                //             bg_color_diy: '#ededed',
                //         };
                //         this.props.navigation.navigate('Webviewer', webview_param);
                //     },
                // },
                {
                    icon_name: 'people',
                    icon_type: iconTypes.ionicons,
                    function_name: '組織登入',
                    func: () => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.props.navigation.navigate('MeScreen');

                    },
                },
            ],

            cal: undefined,
            selectDay: 0,

            isShowModal: false,

            isLoading: true,

            // 是否提示更新
            showUpdateInfo: false,

            app_version: {
                lastest: '',
                local: '',
            }
        };

        this.eventPage = React.createRef();
        this.scrollView = React.createRef();
    }

    componentDidMount() {
        let globalData = this.props.RootStore;
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({ isShowModal: false });
            this.getAppData(true);
        } else {
            // setTimeout(() => {
            //     this.setState({isShowModal: true});
            // }, 1500);
            this.getAppData(false);
        }
        this.getCal();
    }

    getAppData = async isLogin => {
        this.toast.show(`ARK ALL全力加載中...`, 2000);
        let URL = BASE_URI + GET.APP_INFO;
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    this.checkInfo(json.content, isLogin);
                }
            })
            .catch(err => {
                this.toast.show(`網絡請求錯誤 TAT ...`, 2000);
                // console.log('err', err);
            });
    };

    checkInfo = async (serverInfo, isLogin) => {
        try {
            const strAppInfo = await AsyncStorage.getItem('appInfo');
            if (strAppInfo == null) {
                setAPPInfo(serverInfo);
            } else {
                const appInfo = strAppInfo ? JSON.parse(strAppInfo) : {};
                // 服務器API更新，需要重新登錄
                if (
                    appInfo.API_version &&
                    appInfo.API_version != serverInfo.API_version
                ) {
                    if (isLogin) {
                        alert('服務器API更新，需要重新登錄');
                        handleLogout();
                    } else {
                        setAPPInfo(serverInfo);
                    }
                } else {
                    setAPPInfo(serverInfo);
                }
            }
            // APP版本滯後，提示下載新版本
            if (
                versionStringCompare(
                    packageInfo.version,
                    serverInfo.app_version,
                ) == -1
            ) {
                this.setState({
                    showUpdateInfo: true,
                    app_version: {
                        lastest: serverInfo.app_version,
                        local: packageInfo.version,
                    }
                })
            }
        } catch (e) {
            // console.error(e);
        }
        finally {
            this.setState({ isLoading: false });
        }
    };

    // 獲取日曆數據
    getCal = () => {
        // 先到網站獲取ics link，https://reg.um.edu.mo/university-almanac/?lang=zh-hant
        // 使用ical-to-json工具轉為json格式，https://github.com/cwlsn/ics-to-json/
        // 放入static/UMCalendar中覆蓋
        // ***務必注意key、value的大小寫！！**
        if (cal) {
            this.setState({ cal })
            let nowTimeStamp = moment(new Date());
            // 同日或未來的重要時間設為選中日
            if (nowTimeStamp.isSameOrAfter(cal[cal.length - 1].startDate)) {
                this.setState({ selectDay: cal.length });
            }
            else if (nowTimeStamp.isSameOrAfter(cal[0].startDate)) {
                for (let i = 0; i < cal.length; i++) {
                    if (moment(cal[i].startDate).isSameOrAfter(nowTimeStamp)) {
                        this.setState({ selectDay: i });
                        break;
                    }
                }
            }
        }
    };

    getWeek(date) {
        // 参数时间戳
        let week = moment(date).day();
        switch (week) {
            case 1:
                return '周一';
            case 2:
                return '周二';
            case 3:
                return '周三';
            case 4:
                return '周四';
            case 5:
                return '周五';
            case 6:
                return '周六';
            case 0:
                return '周日';
        }
    }

    // 渲染顶部校历图标
    renderCal = (item, index) => {
        const { selectDay } = this.state;
        let momentItm = moment(item.startDate).format("YYYYMMDD");
        return (
            <TouchableOpacity
                style={{
                    backgroundColor: selectDay == index ? themeColor : themeColorLight,
                    borderRadius: scale(8),
                    //borderColor: selectDay == index ? COLOR_DIY.secondThemeColor : null,
                    //borderWidth: selectDay == index ? scale(2) : null,
                    paddingHorizontal: scale(5), paddingVertical: scale(3),
                    margin: scale(3),
                    ...COLOR_DIY.viewShadow,
                }}
                activeOpacity={0.8}
                onPress={() => {
                    ReactNativeHapticFeedback.trigger('soft');
                    this.setState({ selectDay: index });
                }}>
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>

                    {/* 年份 */}
                    <Text style={{
                        color: white,
                        fontSize: scale(10),
                        fontWeight: selectDay == index ? 'bold' : null,
                    }}>
                        {momentItm.substring(0, 4)}
                    </Text>

                    {/* 月份 */}
                    <Text
                        style={{
                            color: white,
                            fontSize: scale(22),
                            fontWeight: selectDay == index ? 'bold' : null,
                        }}>
                        {momentItm.substring(4, 6)}
                    </Text>

                    {/* 日期 */}
                    <Text
                        style={{
                            color: white,
                            fontSize: scale(22),
                            fontWeight: selectDay == index ? 'bold' : null,
                        }}>
                        {momentItm.substring(6, 8)}
                    </Text>

                    {/* 星期幾 */}
                    <Text style={{
                        color: white,
                        fontSize: scale(10),
                        fontWeight: selectDay == index ? 'bold' : null,
                    }}>
                        {this.getWeek(item.startDate)}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // 渲染快捷功能卡片的圖標
    GetFunctionIcon = ({ icon_type, icon_name, function_name, func }) => {
        let icon = null;
        let imageSize = scale(60);
        let iconSize = scale(30);
        if (icon_type == 'ionicons') {
            icon = (
                <Ionicons
                    name={icon_name}
                    size={iconSize - 5}
                    color={COLOR_DIY.themeColor}
                />
            );
        } else if (icon_type == 'MaterialCommunityIcons') {
            icon = (
                <MaterialCommunityIcons
                    name={icon_name}
                    size={iconSize}
                    color={COLOR_DIY.themeColor}
                />
            );
        } else if (icon_type == 'img') {
            icon = (
                <FastImage
                    source={{
                        uri: icon_name,
                        // cache: FastImage.cacheControl.web,
                    }}
                    style={{
                        height: imageSize,
                        width: imageSize,
                    }}
                />
            );
        }

        return (
            <TouchableOpacity
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onPress={func}>
                {icon}
                <Text
                    style={{
                        fontSize: scale(11),
                        color: COLOR_DIY.black.second,
                    }}>
                    {function_name}
                </Text>
            </TouchableOpacity>
        );
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({ isShowModal: !this.state.isShowModal });
    };

    // 渲染懸浮可拖動按鈕
    renderGoTopButton = () => {
        const { viewShadow } = COLOR_DIY;
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
                        ReactNativeHapticFeedback.trigger('soft');
                        // 回頂，需先創建ref，可以在this.refs直接找到方法引用
                        this.scrollView.current.scrollTo({
                            x: 0,
                            y: 0,
                            duration: 500, // 回頂時間
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
        const { selectDay, cal } = this.state;
        return (
            <View
                style={{
                    flex: 1, backgroundColor: bg_color,
                    alignItems: 'center', justifyContent: 'center',
                }}>

                {/* 懸浮可拖動按鈕 */}
                {this.state.isLoading ? null : this.renderGoTopButton()}

                {/* 主页本体 */}
                <ScrollView
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={() => {
                                this.setState({ isLoading: true });
                                this.getAppData();
                                // 刷新重新請求活動頁數據
                                this.eventPage.current.onRefresh()
                            }}
                        />
                    }
                    alwaysBounceHorizontal={false}
                    ref={this.scrollView}>

                    {/* 校曆列表 */}
                    {cal && cal.length > 0 ? (
                        <View style={{ backgroundColor: bg_color, width: '100%', marginTop: scale(8) }}>
                            <VirtualizedList
                                data={cal}
                                initialNumToRender={9}
                                initialScrollIndex={selectDay}
                                getItemLayout={(data, index) => {
                                    let layoutSize = scale(40);
                                    return {
                                        length: layoutSize,
                                        offset: layoutSize * index,
                                        index,
                                    };
                                }}
                                // 渲染每个列表项的方法
                                renderItem={({ item, index }) => this.renderCal(item, index)}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                getItem={getItem}
                                // 渲染項目數量
                                getItemCount={getItemCount}
                                // 列表primary key
                                keyExtractor={item => item.startDate}
                                ListHeaderComponent={
                                    <View style={{ marginLeft: scale(10) }} />
                                }
                                ListFooterComponent={
                                    <View style={{ marginRight: scale(10) }} />
                                }
                            />

                            {/* 校曆日期描述 */}
                            <View
                                style={{
                                    alignItems: 'center', justifyContent: 'center',
                                    flexDirection: 'row',
                                    marginTop: scale(5), marginHorizontal: scale(20),
                                }}>

                                {/*左衬线*/}
                                <Text style={{ marginHorizontal: scale(5), color: COLOR_DIY.themeColor, textAlign: 'center' }}
                                >
                                    {'\\' + '\\'}
                                </Text>

                                {/*日历内容描述*/}
                                <View style={{
                                    backgroundColor: themeColor,
                                    borderRadius: scale(5),
                                    paddingVertical: scale(2),
                                    paddingHorizontal: scale(5),
                                }}>
                                    <Text
                                        selectable
                                        style={{ color: white, textAlign: 'center', fontSize: scale(12) }}
                                    >
                                        {this.state.cal[selectDay].summary}
                                    </Text>
                                </View>

                                {/*右衬线*/}
                                <Text style={{ marginHorizontal: scale(5), color: COLOR_DIY.themeColor, textAlign: 'center' }}
                                >
                                    {'//'}
                                </Text>

                            </View>
                        </View>
                    ) : null}

                    {/* 快捷功能圖標 */}
                    <FlatGrid
                        style={{ alignSelf: 'center' }}
                        maxItemsPerRow={6}
                        itemDimension={scale(50)}
                        spacing={scale(5)}
                        data={this.state.functionArray}
                        renderItem={({ item }) => this.GetFunctionIcon(item)}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                    />

                    {/* 更新提示 */}
                    {this.state.showUpdateInfo ?
                        <HomeCard>
                            <Text
                                style={{
                                    color: themeColor,
                                    marginTop: scale(2),
                                    alignSelf: 'center',
                                    textAlign: 'center',
                                }}>
                                {`🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥🔥`}
                            </Text>
                            <Text
                                style={{
                                    color: themeColor,
                                    marginTop: scale(5),
                                    fontWeight: 'bold',
                                }}>
                                {`Lastest Version: ${this.state.app_version.lastest}`}
                            </Text>
                            <Text
                                style={{
                                    color: black.third,
                                    marginTop: scale(5),
                                    fontWeight: 'bold',
                                }}>
                                {`Your App Version: ${this.state.app_version.local}`}
                            </Text>
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    Linking.openURL(BASE_HOST);
                                }}>
                                <Text
                                    style={{
                                        color: themeColor,
                                        marginTop: scale(5),
                                        fontWeight: 'bold',
                                    }}>
                                    {`Click me to update App 😉~`}
                                </Text>
                            </TouchableOpacity>
                        </HomeCard>
                        : null}

                    {/* 活動頁 */}
                    <EventPage ref={this.eventPage} />

                    {/* 快速填充功能提示 */}
                    {/* <View
                        style={{
                            alignItems: 'center',
                            marginTop: scale(10),
                            backgroundColor: white,
                            paddingVertical: scale(10),
                        }}>
                        <Text style={{color: black.third}}>
                            {`UM Pass頁面需要重新輸入賬號？`}
                        </Text>
                        <TouchableOpacity
                            style={styles.buttonContainer}
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                this.props.navigation.navigate('LoginSetting');
                            }}>
                            <Text style={{color: white}}>
                                {`啟用自動填充功能`}
                            </Text>
                        </TouchableOpacity>
                    </View> */}

                    <View style={{ marginBottom: scale(50) }} />
                </ScrollView>

                {/* 彈出提示登錄的Modal */}
                {this.state.isShowModal && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                padding: scale(20),
                                backgroundColor: COLOR_DIY.white,
                            }}>
                            <ScrollView
                                contentContainerStyle={{
                                    alignItems: 'center',
                                    marginBottom: scale(30),
                                }}>
                                <Text
                                    style={{
                                        fontSize: scale(18),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    歡迎來到ARK ALL~
                                </Text>
                                <Text
                                    style={{
                                        fontSize: scale(15),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    登錄後體驗完整功能，現在去嗎？
                                </Text>
                                {/* 登錄按鈕 */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={{
                                        marginTop: scale(10),
                                        backgroundColor: COLOR_DIY.themeColor,
                                        padding: scale(10),
                                        borderRadius: scale(10),
                                        justifyContent: 'center',
                                        alignSelf: 'center',
                                    }}
                                    onPress={() => {
                                        ReactNativeHapticFeedback.trigger(
                                            'soft',
                                        );
                                        this.setState({ isShowModal: false });
                                        this.props.navigation.jumpTo(
                                            'MeTabbar',
                                        );
                                    }}>
                                    <Text
                                        style={{
                                            fontSize: scale(15),
                                            color: 'white',
                                            fontWeight: '500',
                                        }}>
                                        現在登錄
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </ModalBottom>
                )}

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{ color: white }}
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        borderRadius: scale(10),
                    }}
                />
            </View>
        );
    }
}

export default inject('RootStore')(HomeScreen);
