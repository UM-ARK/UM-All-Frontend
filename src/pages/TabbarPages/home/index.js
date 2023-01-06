import React, {Component} from 'react';
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
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
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
import ScrollImage from './components/ScrollImage';
import ModalBottom from '../../../components/ModalBottom';
import {setAPPInfo, handleLogout} from '../../../utils/storageKits';
import {versionStringCompare} from '../../../utils/versionKits';
import packageInfo from '../../../../package.json';
import UMCalendar from '../../../static/UMCalendar/UMCalendar.json';
import HomeCard from './components/HomeCard';

import {Header, Divider} from '@rneui/themed';
import {PageControl, Card} from 'react-native-ui-lib';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import Carousel from 'react-native-reanimated-carousel';
import Interactable from 'react-native-interactable';
import {FlatGrid} from 'react-native-super-grid';
import {inject} from 'mobx-react';
import Toast, {DURATION} from 'react-native-easy-toast';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import {scale} from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import CookieManager from '@react-native-cookies/cookies';
import moment from 'moment';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {white, bg_color, black, themeColor} = COLOR_DIY;

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

class HomeScreen extends Component {
    state = {
        // 首頁輪播圖數據
        carouselImagesArr: [
            {
                url: UMALL_LOGO,
            },
        ],

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
            {
                icon_name: 'database-search',
                icon_type: iconTypes.materialCommunityIcons,
                function_name: '選咩課',
                func: () => {
                    ReactNativeHapticFeedback.trigger('soft');
                    let webview_param = {
                        url: WHAT_2_REG,
                        title: '澳大選咩課',
                        text_color: '#fff',
                        bg_color_diy: '#1e558c',
                        isBarStyleBlack: false,
                    };
                    this.props.navigation.navigate('Webviewer', webview_param);
                    // this.props.navigation.jumpTo('NewsTabbar', {
                    //     screen: 'EventPage',
                    // });
                },
            },
            {
                icon_name: 'coffee-outline',
                icon_type: iconTypes.materialCommunityIcons,
                function_name: '論壇',
                func: () => {
                    ReactNativeHapticFeedback.trigger('soft');
                    let webview_param = {
                        url: UM_WHOLE,
                        title: '討論區',
                    };
                    this.props.navigation.navigate('Webviewer', webview_param);
                },
            },
            {
                icon_name: 'ghost',
                icon_type: iconTypes.materialCommunityIcons,
                function_name: '生存指南',
                func: () => {
                    ReactNativeHapticFeedback.trigger('soft');
                    let webview_param = {
                        url: NEW_SCZN,
                        title: '新鮮人要知道的億些Tips',
                        text_color: COLOR_DIY.black.second,
                        bg_color_diy: '#ededed',
                    };
                    this.props.navigation.navigate('Webviewer', webview_param);
                },
            },
        ],

        cal: undefined,
        selectDay: 0,

        isShowModal: false,

        isLoading: true,
    };

    componentDidMount() {
        let globalData = this.props.RootStore;
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({isShowModal: false});
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
                this.toast.show(`請求錯誤 TAT ...`, 2000);
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
                this.props.route.params.setLock(serverInfo.app_version);
            }
        } catch (e) {
            // console.error(e);
        } finally {
            if (
                serverInfo.index_head_carousel &&
                serverInfo.index_head_carousel.length > 0
            ) {
                let imgUrlArr = serverInfo.index_head_carousel;
                imgUrlArr.map(itm => {
                    itm.url = addHost(itm.url);
                });
                this.setState({carouselImagesArr: imgUrlArr});
            }
            this.setState({isLoading: false});
        }
    };

    // 獲取日曆數據
    getCal = () => {
        // 先到網站獲取ics link，https://reg.um.edu.mo/university-almanac/?lang=zh-hant
        // 使用工具轉為json格式，https://ical-to-json.herokuapp.com/
        // 放入static/UMCalendar中覆蓋
        // ***務必注意key、value的大小寫！！**
        let cal = UMCalendar.vcalendar[0].vevent;
        if (cal) {
            // console.log('日曆事件有', cal);
            let showCal = [];
            let nowTimeStamp = moment(new Date());
            showCal = cal;
            // 篩選出未來的重要日期
            for (let i = 0; i < cal.length; i++) {
                if (moment(cal[i].dtstart[0]).isSameOrAfter(nowTimeStamp)) {
                    this.setState({selectDay: i});
                    break;
                }
            }
            this.setState({cal: showCal});
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

    renderCal = (item, index) => {
        const {selectDay} = this.state;
        return (
            <TouchableOpacity
                style={{
                    // #a2d2e2
                    backgroundColor: '#4994c4',
                    borderRadius: scale(20),
                    borderColor: selectDay == index ? '#94c449' : null,
                    borderWidth: selectDay == index ? scale(3) : null,
                    width: scale(95),
                    height: scale(95),
                    margin: scale(5),
                    paddingVertical: scale(3),
                    ...COLOR_DIY.viewShadow,
                }}
                activeOpacity={0.8}
                onPress={() => {
                    this.setState({selectDay: index});
                }}>
                <View style={{alignItems: 'center', justifyContent: 'center'}}>
                    {/* 年份 */}
                    <Text style={{color: white, fontSize: scale(10)}}>
                        {item.dtstart[0].substring(0, 4)}
                    </Text>
                    {/* 月份 */}
                    <Text
                        style={{
                            color: white,
                            fontSize: scale(22),
                            fontWeight: 'bold',
                        }}>
                        {item.dtstart[0].substring(4, 6)}
                    </Text>
                    {/* 日期 */}
                    <Text
                        style={{
                            color: white,
                            fontSize: scale(22),
                            fontWeight: 'bold',
                        }}>
                        {item.dtstart[0].substring(6, 8)}
                    </Text>
                    {/* 星期幾 */}
                    <Text style={{color: white, fontSize: scale(10)}}>
                        {this.getWeek(item.dtstart[0])}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    // 渲染快捷功能卡片的圖標
    GetFunctionIcon = ({icon_type, icon_name, function_name, func}) => {
        let icon = null;
        if (icon_type == 'ionicons') {
            icon = (
                <Ionicons
                    name={icon_name}
                    size={scale(30)}
                    color={COLOR_DIY.themeColor}
                />
            );
        } else if (icon_type == 'MaterialCommunityIcons') {
            icon = (
                <MaterialCommunityIcons
                    name={icon_name}
                    size={scale(35)}
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
                        height: scale(60),
                        width: scale(60),
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
                        fontSize: pxToDp(12),
                        color: COLOR_DIY.black.second,
                    }}>
                    {function_name}
                </Text>
            </TouchableOpacity>
        );
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({isShowModal: !this.state.isShowModal});
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
                    {x: -scale(140), y: -scale(220)},
                    {x: scale(140), y: -scale(220)},
                    {x: -scale(140), y: -scale(120)},
                    {x: scale(140), y: -scale(120)},
                    {x: -scale(140), y: scale(0)},
                    {x: scale(140), y: scale(0)},
                    {x: -scale(140), y: scale(120)},
                    {x: scale(140), y: scale(120)},
                    {x: -scale(140), y: scale(220)},
                    {x: scale(140), y: scale(220)},
                ]}
                // 設定初始吸附位置
                initialPosition={{x: scale(140), y: scale(220)}}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        // 回頂，需先創建ref，可以在this.refs直接找到方法引用
                        this.refs.scrollView.scrollTo({
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
                            color={black.main}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    render() {
        const {carouselImagesArr, selectDay} = this.state;
        return (
            <View
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: bg_color,
                }}>
                {/* <Header
                    backgroundColor={white}
                    centerComponent={{
                        text: 'ARK ALL',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                /> */}

                {/* 懸浮可拖動按鈕 */}
                {this.state.isLoading ? null : this.renderGoTopButton()}

                <ScrollView
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={() => {
                                this.setState({isLoading: true});
                                this.getAppData();
                                // 刷新重新請求活動頁數據
                                this.refs.eventPage.onRefresh();
                            }}
                        />
                    }
                    alwaysBounceHorizontal={false}
                    ref={'scrollView'}>
                    <View style={{backgroundColor: bg_color}}>
                        {/* 輪播圖 */}
                        {/* <ScrollImage imageData={carouselImagesArr} /> */}

                        {/* 校曆 */}
                        {this.state.cal && this.state.cal.length > 0 ? (
                            <View style={{marginTop: scale(10)}}>
                                <VirtualizedList
                                    data={this.state.cal}
                                    initialNumToRender={4}
                                    initialScrollIndex={selectDay}
                                    getItemLayout={(data, index) => {
                                        return {
                                            length: scale(100),
                                            offset: scale(100) * index,
                                            index,
                                        };
                                    }}
                                    renderItem={({item, index}) => {
                                        return this.renderCal(item, index);
                                    }}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    getItem={getItem}
                                    // 渲染項目數量
                                    getItemCount={getItemCount}
                                    keyExtractor={item => item.uid}
                                    ListHeaderComponent={
                                        <View style={{marginLeft: scale(10)}} />
                                    }
                                    ListFooterComponent={
                                        <View
                                            style={{marginRight: scale(10)}}
                                        />
                                    }
                                />
                                {/* 該天描述 */}
                                <View
                                    style={{
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        marginTop: scale(5),
                                    }}>
                                    <Text
                                        style={{color: black.third}}
                                        selectable>
                                        {'Important date: ' +
                                            this.state.cal[selectDay].summary}
                                    </Text>
                                </View>
                            </View>
                        ) : null}

                        {/* 快捷功能圖標 */}
                        <FlatGrid
                            style={{alignSelf: 'center'}}
                            maxItemsPerRow={6}
                            itemDimension={scale(50)}
                            spacing={scale(10)}
                            data={this.state.functionArray}
                            renderItem={({item}) => {
                                return this.GetFunctionIcon(item);
                            }}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>

                    {/* 活動頁 */}
                    <EventPage ref="eventPage"></EventPage>

                    {/* 提示資訊 */}
                    <HomeCard>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: pxToDp(5),
                            }}>
                            {`ARK ALL源自FST同學為愛發電，`}
                            <Text style={{fontWeight: 'bold'}}>
                                並非官方應用程式！
                            </Text>
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: pxToDp(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`本軟件並非澳大官方應用‼️ x1`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: pxToDp(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`本軟件並非澳大官方應用‼️ x2`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: pxToDp(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`本軟件並非澳大官方應用‼️ x3`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: pxToDp(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`This APP is not an official APP of UM‼️`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: pxToDp(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`如您仍然信任本軟件，感謝您的認可 ♪(･ω･)ﾉ`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: pxToDp(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`本軟件代碼在Github開源，歡迎✨✨`}
                        </Text>
                    </HomeCard>

                    {/* 其他提示 */}
                    <HomeCard>
                        <Text
                            style={{color: black.third, marginTop: pxToDp(5)}}>
                            您可能想先了解：
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                this.props.navigation.navigate('AboutUs');
                            }}>
                            <Text
                                style={{
                                    color: black.second,
                                    fontWeight: '600',
                                }}>{`這個APP是?`}</Text>
                        </TouchableOpacity>

                        <Text
                            style={{color: black.third, marginTop: pxToDp(5)}}>
                            如果你是新同學... (詳見服務頁新生推薦)
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                let webview_param = {
                                    url: NEW_SCZN,
                                    title: '新鮮人要知道的億些Tips',
                                    text_color: COLOR_DIY.black.second,
                                    bg_color_diy: '#ededed',
                                };
                                this.props.navigation.navigate(
                                    'Webviewer',
                                    webview_param,
                                );
                            }}>
                            <Text
                                style={{
                                    color: black.second,
                                    fontWeight: '600',
                                }}>{`我是萌新`}</Text>
                        </TouchableOpacity>

                        <Text
                            style={{color: black.third, marginTop: pxToDp(5)}}>
                            您可能還有很多疑問...
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                let webview_param = {
                                    url: USUAL_Q,
                                    title: '常見問題',
                                };
                                this.props.navigation.navigate(
                                    'Webviewer',
                                    webview_param,
                                );
                            }}>
                            <Text
                                style={{
                                    color: black.second,
                                    fontWeight: '600',
                                }}>{`我要怎麼...`}</Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 清除緩存 */}
                    <HomeCard>
                        <Text style={{color: black.third}}>
                            {`圖片更新不及時？網站響應出錯？`}
                        </Text>
                        <Text style={{color: black.third}}>
                            {`‼️:您已登錄的界面可能會退出登錄`}
                        </Text>
                        <Text style={{color: black.third}}>
                            {`‼️:您可能需要重新加載圖片，會消耗流量`}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                FastImage.clearDiskCache();
                                FastImage.clearMemoryCache();
                                CookieManager.clearAll();
                                this.toast.show(`已清除所有緩存`, 2000);
                            }}>
                            <Text
                                style={{
                                    color: black.second,
                                    fontWeight: '600',
                                }}>
                                {`清除圖片和Web緩存`}
                            </Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 快速填充功能提示 */}
                    {/* <View
                        style={{
                            alignItems: 'center',
                            marginTop: pxToDp(10),
                            backgroundColor: white,
                            paddingVertical: pxToDp(10),
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

                    <View style={{marginBottom: scale(50)}} />
                </ScrollView>

                {/* 彈出提示登錄的Modal */}
                {this.state.isShowModal && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                padding: pxToDp(20),
                                backgroundColor: COLOR_DIY.white,
                            }}>
                            <ScrollView
                                contentContainerStyle={{
                                    alignItems: 'center',
                                    marginBottom: pxToDp(30),
                                }}>
                                <Text
                                    style={{
                                        fontSize: pxToDp(18),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    歡迎來到ARK ALL~
                                </Text>
                                <Text
                                    style={{
                                        fontSize: pxToDp(15),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    登錄後體驗完整功能，現在去嗎？
                                </Text>
                                {/* 登錄按鈕 */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={{
                                        marginTop: pxToDp(10),
                                        backgroundColor: COLOR_DIY.themeColor,
                                        padding: pxToDp(10),
                                        borderRadius: pxToDp(10),
                                        justifyContent: 'center',
                                        alignSelf: 'center',
                                    }}
                                    onPress={() => {
                                        ReactNativeHapticFeedback.trigger(
                                            'soft',
                                        );
                                        this.setState({isShowModal: false});
                                        this.props.navigation.jumpTo(
                                            'MeTabbar',
                                        );
                                    }}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(15),
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
                    textStyle={{color: white}}
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        borderRadius: pxToDp(10),
                    }}
                />
            </View>
        );
    }
}

export default inject('RootStore')(HomeScreen);
