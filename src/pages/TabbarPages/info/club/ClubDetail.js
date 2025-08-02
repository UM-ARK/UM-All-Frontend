import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StatusBar,
    Dimensions,
    FlatList,
    ScrollView,
    Alert,
    StyleSheet,
    RefreshControl,
    Linking,
} from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import { clubTagMap } from '../../../../utils/clubMap';
import { setAPPInfo } from '../../../../utils/storageKits';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { BASE_URI, BASE_HOST, GET, ARK_LETTER_IMG, POST, MAIL, } from '../../../../utils/pathMap';
import HyperlinkText from '../../../../components/HyperlinkText';
import { handleLogout } from '../../../../utils/storageKits';
import packageInfo from '../../../../../package.json';

import EventCard from '../components/EventCard';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import ModalBottom from '../../../../components/ModalBottom';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import { updateUserInfo } from '../../../../utils/storageKits';
import { versionStringCompare } from '../../../../utils/versionKits';
import { trigger } from '../../../../utils/trigger';

import Header from '../../../../components/Header';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { ImageHeaderScrollView } from 'react-native-image-header-scroll-view';
import FastImage from 'react-native-fast-image';
import { inject } from 'mobx-react';
import axios from 'axios';
import Toast from 'react-native-easy-toast';
import { scale, verticalScale } from 'react-native-size-matters';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('window');
const CLUB_LOGO_SIZE = scale(80);
const CLUB_IMAGE_WIDTH = scale(66);
const CLUB_IMAGE_HEIGHT = verticalScale(55);

const ClubDetail = (props) => {
    const { theme } = useTheme();
    const { bg_color, white, black, themeColor, secondThemeColor, viewShadow, success, warning, trueWhite, } = theme;
    const styles = StyleSheet.create({
        cardContainer: {
            backgroundColor: white,
            borderRadius: scale(10),
            marginHorizontal: scale(15),
            marginBottom: verticalScale(8),
            marginTop: scale(10),
        },
        cardTitleContainer: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            paddingVertical: scale(10),
            paddingHorizontal: scale(10),
        },
        cardTitleText: {
            ...uiStyle.defaultText,
            fontSize: verticalScale(13),
            color: themeColor,
            fontWeight: 'bold',
        },
        clubLogoContainer: {
            // position: 'absolute',
            // bottom: scale(5),
            alignSelf: 'center',
            width: CLUB_LOGO_SIZE,
            height: CLUB_LOGO_SIZE,
            borderRadius: scale(50),
            overflow: 'hidden',
            ...viewShadow,
            backgroundColor: white,
        },
        clubLogoWhiteSpace: {
            bottom: 0,
            width: '100%',
            height: verticalScale(20),
            backgroundColor: bg_color,
            position: 'absolute',
            borderTopLeftRadius: scale(15),
            borderTopRightRadius: scale(15),
        },
        clubNameText: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: verticalScale(20),
            fontWeight: '500',
            marginTop: scale(5),
            alignSelf: 'center',
        },
        imageContainer: {
            width: CLUB_IMAGE_WIDTH,
            height: CLUB_IMAGE_HEIGHT,
            borderRadius: scale(5),
            overflow: 'hidden',
            ...viewShadow,
        },
        checkMoreButton: {
            marginTop: scale(5),
            alignSelf: 'center',
            padding: scale(10),
            borderRadius: scale(15),
            backgroundColor: themeColor,
        },
        followButton: {
            marginTop: scale(5),
            alignSelf: 'center',
            padding: scale(10),
            borderRadius: scale(12),
        },
    });

    const imageScrollViewer = useRef(null);
    const toastRef = useRef(null);

    const [clubData, setClubData] = useState(undefined);
    const [eventData, setEventData] = useState(undefined);
    const [isFollow, setIsFollow] = useState(false);
    const [isAdmin, setIsAdmin] = useState(false);
    const [isLogin, setIsLogin] = useState(false);
    const [imageUrls, setImageUrls] = useState(ARK_LETTER_IMG);
    const [showDialog, setShowDialog] = useState(false);
    const [reportChoice, setReportChoice] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [toastColor, setToastColor] = useState(themeColor);
    const [isShow, setIsShow] = useState(false);

    // 由ClubPage跳轉初始化
    useEffect(() => {
        const clubDataParam = props.route.params.data;
        getData(clubDataParam.club_num);
        // const globalData = props.RootStore;
        // if (!('userInfo' in globalData) || !globalData.userInfo.isClub) {
        //     const clubDataParam = props.route.params.data;
        //     getData(clubDataParam.club_num);
        // }
        // 管理員賬號登錄
        // if (globalData.userInfo && globalData.userInfo.isClub) {
        //     const clubDataAdmin = globalData.userInfo.clubData;
        //     setIsAdmin(true);
        //     getData(clubDataAdmin.club_num);
        //     getAppData();
        // }
        // 已登錄學生賬號
        // if (globalData.userInfo && globalData.userInfo.stdData) {
        //     setIsLogin(true);
        // }
        return () => {
            FastImage.clearMemoryCache();
        };
    }, []);

    // 獲取指定id的社團信息
    const getData = async (club_num) => {
        try {
            const res = await axios.get(BASE_URI + GET.CLUB_INFO_NUM + club_num);
            const json = res.data;
            if (json.message === 'success') {
                let clubData = json.content;
                clubData.logo_url = BASE_HOST + clubData.logo_url;
                if (clubData.club_photos_list && clubData.club_photos_list.length > 0) {
                    clubData.club_photos_list = clubData.club_photos_list.map(item => BASE_HOST + item);
                }
                setClubData(clubData);
                setIsLoading(false);
                setIsFollow(clubData.isFollow);
                getEventData(club_num);

                // if (isAdmin) {
                //     const clubDataUpdate = {
                //         isClub: true,
                //         clubData,
                //     };
                //     updateUserInfo(clubDataUpdate);
                //     props.RootStore.setUserInfo(clubDataUpdate);
                //     logToFirebase('clubLogin', { club: clubData.name });
                // }
            } else {
                alert('Warning:', json.message);
            }
        } catch (err) {
            console.error(err);
        }
    };

    // 按組織號碼獲取活動
    const getEventData = async (club_num) => {
        try {
            const URL = BASE_URI + GET.EVENT_INFO_CLUB_NUM_P;
            const res = await axios.get(URL, {
                params: {
                    club_num,
                    num_of_item: 5,
                },
            });
            const json = res.data;
            if (json.message === 'success') {
                let eventData = json.content;
                if (eventData.length > 0) {
                    eventData = eventData.map(itm => ({
                        ...itm,
                        cover_image_url: BASE_HOST + itm.cover_image_url,
                    }));
                }
                setEventData(eventData);
            }
        } catch (err) {
            console.log('err', err);
        }
    };

    // 追蹤社團
    const postAddFollow = async (club_num) => {
        try {
            const URL = BASE_URI + POST.ADD_FOLLOW_CLUB;
            const data = new FormData();
            data.append('club', club_num);
            const res = await axios.post(URL, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const json = res.data;
            if (json.message === 'success') {
                setToastColor(success);
                setIsFollow(true);
                toastRef.current.show(`感謝 Follow ！❥(^_-)\n有最新動態會提醒您！`, 2000);
            } else if (json.code === '400') {
                setToastColor(warning);
                toastRef.current.show(`您已經關注過了~`, 2000);
            }
        } catch (err) {
            console.log('err', err);
            alert('錯誤', err.message);
        }
    };

    // 取消追蹤社團
    const postDelFollow = async (club_num) => {
        try {
            const URL = BASE_URI + POST.DEL_FOLLOW_CLUB;
            const data = new FormData();
            data.append('club', club_num);
            const res = await axios.post(URL, data, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            const json = res.data;
            if (json.message === 'success') {
                setToastColor(themeColor);
                setIsFollow(false);
                toastRef.current.show(`有緣再見！o(╥﹏╥)o`, 2000);
            }
        } catch (err) {
            console.log('err', err);
            alert('錯誤', err.message);
        }
    };

    // 獲取APP數據
    const getAppData = async () => {
        try {
            const URL = BASE_URI + GET.APP_INFO;
            const res = await axios.get(URL);
            const json = res.data;
            if (json.message === 'success') {
                checkInfo(json.content);
            }
        } catch (err) {
            // console.log('err', err);
        }
    };

    // 檢查APP信息
    const checkInfo = async (serverInfo) => {
        try {
            const strAppInfo = await AsyncStorage.getItem('appInfo');
            if (strAppInfo == null) {
                setAPPInfo(serverInfo);
            } else {
                const appInfo = strAppInfo ? JSON.parse(strAppInfo) : {};
                if (appInfo.API_version && appInfo.API_version !== serverInfo.API_version) {
                    alert('服務器API更新，需要重新登錄');
                    handleLogout();
                } else {
                    setAPPInfo(serverInfo);
                }
            }
            if (versionStringCompare(packageInfo.version, serverInfo.app_version) === -1) {
                props.route.params.setLock(serverInfo.app_version);
            }
        } catch (e) {
            console.error(e);
        }
    };

    // 點擊Follow按鈕
    const handleFollow = () => {
        if (!isLogin) {
            setShowDialog(true);
        } else {
            if (!isFollow) {
                postAddFollow(clubData.club_num);
            } else {
                postDelFollow(clubData.club_num);
            }
        }
        trigger();
    };

    // 下拉刷新
    const onRefresh = () => {
        setIsLoading(true);
        getData(clubData.club_num);
    };

    // 渲染Follow按鈕
    const renderFollowButton = () => (
        <TouchableOpacity
            style={{
                ...styles.followButton,
                backgroundColor: isFollow ? black.third : themeColor,
            }}
            activeOpacity={0.8}
            onPress={handleFollow}
        >
            <Text style={{ ...uiStyle.defaultText, color: white }}>
                {isFollow ? 'Del Follow' : 'Follow'}
            </Text>
        </TouchableOpacity>
    );

    // 切換Modal顯示
    const tiggerModalBottom = () => setIsShow(!isShow);

    // 渲染卡片標題
    const renderCardTitle = (title) => (
        <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitleText}>{title}</Text>
        </View>
    );

    // 渲染Header前景
    const renderForeground = () => (
        <TouchableOpacity
            style={{ flex: 1, position: 'relative' }}
            onPress={() => {
                if (clubData?.club_photos_list?.length > 0) {
                    setImageUrls(clubData.club_photos_list);
                } else {
                    setImageUrls(ARK_LETTER_IMG);
                }
                imageScrollViewer.current.handleOpenImage(0);
            }}
            activeOpacity={1}
        >
            {/* isAdmin模式不顯示 */}
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    trigger();
                    props.navigation.goBack();
                }}
                style={{
                    position: 'absolute',
                    top: verticalScale(65),
                    left: scale(15),
                    zIndex: 999,
                }}
            >
                <Ionicons name="chevron-back-circle" size={verticalScale(35)} color={white} />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    // 渲染主要內容
    const renderMainContent = () => {
        let showContact = false;
        if (clubData?.contact?.length > 0) {
            showContact = clubData.contact.some(item => item.num.length > 0);
        }
        const intro = clubData?.intro;

        return (
            <View style={{ backgroundColor: bg_color }}>
                {/* 社團基本資料 */}
                <View style={{ alignItems: 'center', marginTop: verticalScale(10) }}>
                    {/* 社團LOGO */}
                    <TouchableWithoutFeedback
                        onPress={() => {
                            trigger();
                            setImageUrls(clubData.logo_url);
                            imageScrollViewer.current.tiggerModal();
                        }}
                    >
                        <View style={styles.clubLogoContainer}>
                            <FastImage
                                source={{ uri: clubData?.logo_url }}
                                style={{ backgroundColor: trueWhite, width: '100%', height: '100%' }}
                                resizeMode={FastImage.resizeMode.contain}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                    {/* 建議使用社團名的簡稱 */}
                    <Text style={styles.clubNameText}>{clubData?.name}</Text>
                    {/* 社團分類 */}
                    <Text style={{ ...uiStyle.defaultText, color: themeColor, fontSize: verticalScale(15) }}>
                        {'#' + clubTagMap(clubData?.tag)}
                    </Text>

                    {/* 編輯資料按鈕 只有管理員可見 */}
                    {isAdmin && (
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() =>
                                props.navigation.navigate('ClubSetting', {
                                    refresh: () => getData(clubData.club_num),
                                })
                            }
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                backgroundColor: secondThemeColor,
                                borderRadius: scale(15),
                                paddingHorizontal: scale(10),
                                paddingVertical: scale(5),
                                marginVertical: scale(10),
                            }}
                        >
                            <Ionicons name="settings-outline" size={scale(25)} color={white} />
                            <Text style={{ ...uiStyle.defaultText, color: white, fontSize: verticalScale(20), fontWeight: 'bold' }}>
                                新增活動 & 資料編輯
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Follow按鈕 */}
                {/* {!isAdmin && false ? renderFollowButton() : null} */}

                {/* 照片 */}
                {clubData?.club_photos_list?.length > 1 && (
                    <View style={styles.cardContainer}>
                        {renderCardTitle('照片')}
                        <View style={{ justifyContent: 'space-around', alignItems: 'flex-start', flexDirection: 'row', margin: scale(10), marginTop: scale(0) }}>
                            {clubData.club_photos_list.map((item, index) => {
                                if (index !== 0) {
                                    return (
                                        <TouchableOpacity
                                            key={index}
                                            style={styles.imageContainer}
                                            activeOpacity={0.7}
                                            onPress={() => {
                                                setImageUrls(clubData.club_photos_list);
                                                imageScrollViewer.current.handleOpenImage(index);
                                            }}
                                        >
                                            <FastImage
                                                source={{ uri: item }}
                                                style={{ backgroundColor: trueWhite, width: '100%', height: '100%' }}
                                            />
                                        </TouchableOpacity>
                                    );
                                }
                                return null;
                            })}
                        </View>
                    </View>
                )}

                {/* 聯繫方式 */}
                <View style={styles.cardContainer}>
                    {renderCardTitle('聯繫方式')}
                    {showContact ? (
                        <View style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'row', margin: scale(10), marginTop: scale(0) }}>
                            <View>
                                {clubData.contact.map((item, idx) => {
                                    if (item.num.length > 0) {
                                        return (
                                            <View key={idx} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(3) }}>
                                                <View style={{ width: scale(75) }}>
                                                    <Text style={{ ...uiStyle.defaultText, color: black.second, fontSize: verticalScale(13) }}>
                                                        {item.type + ': '}
                                                    </Text>
                                                </View>
                                                <View style={{ width: '78%' }}>
                                                    <HyperlinkText linkStyle={{ color: themeColor }} navigation={props.navigation}>
                                                        <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: verticalScale(12.5) }} selectable>
                                                            {item.num}
                                                        </Text>
                                                    </HyperlinkText>
                                                </View>
                                            </View>
                                        );
                                    }
                                    return null;
                                })}
                            </View>
                        </View>
                    ) : (
                        <View style={{ marginLeft: scale(10), marginBottom: verticalScale(10) }}>
                            <Text style={{ ...uiStyle.defaultText, color: black.third }}>
                                這個組織還未留下聯繫方式~
                            </Text>
                        </View>
                    )}
                </View>

                {/* 簡介 */}
                {intro && intro.length > 0 && (
                    <View style={styles.cardContainer}>
                        {renderCardTitle('簡介')}
                        <View style={{ justifyContent: 'space-between', alignItems: 'flex-start', flexDirection: 'row', margin: scale(10), marginTop: scale(0) }}>
                            <HyperlinkText linkStyle={{ color: themeColor }} navigation={props.navigation}>
                                <Text style={{ ...uiStyle.defaultText, color: black.second, fontSize: verticalScale(13) }} selectable>
                                    {intro}
                                </Text>
                            </HyperlinkText>
                        </View>
                    </View>
                )}

                {isAdmin && eventData && eventData.length > 0 && (
                    <Text style={{ ...uiStyle.defaultText, fontWeight: 'bold', fontSize: verticalScale(12), color: secondThemeColor, alignSelf: 'center' }}>
                        Update活動資料請進入具體活動頁內修改！↓
                    </Text>
                )}

                {/* 舉辦的活動 */}
                {eventData && eventData.length > 0 ? (
                    <FlatList
                        numColumns={2}
                        columnWrapperStyle={{ justifyContent: 'center' }}
                        data={eventData}
                        renderItem={({ item, index }) => (index !== 4 ? <EventCard data={item} /> : null)}
                        scrollEnabled={false}
                        ListFooterComponent={() =>
                            eventData.length > 4 && (
                                <TouchableOpacity
                                    style={styles.checkMoreButton}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        trigger();
                                        props.navigation.navigate('AllEvents', { clubData });
                                    }}
                                >
                                    <Text style={{ ...uiStyle.defaultText, color: white }}>查看全部</Text>
                                </TouchableOpacity>
                            )
                        }
                    />
                ) : null}

                {/* 舉報活動 */}
                <TouchableOpacity
                    style={{ alignSelf: 'center', marginTop: scale(20), flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}
                    activeOpacity={0.8}
                    onPress={() => setReportChoice(true)}
                >
                    <EvilIcons name="exclamation" size={scale(20)} color={black.third} />
                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: verticalScale(13) }}>
                        向管理員舉報該組織
                    </Text>
                </TouchableOpacity>

                <View style={{ height: verticalScale(200), backgroundColor: bg_color }} />
                <Text style={{ ...uiStyle.defaultText, color: black.third, alignSelf: 'center' }}>快催催這個組織多發活動｡:.ﾟヽ(*´∀`)ﾉﾟ.:｡</Text>
            </View>
        );
    };

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            {isLoading ? (
                <Header title={'組織詳情'} />
            ) : (
                <StatusBar barStyle="light-content" backgroundColor={'transparent'} translucent />
            )}

            {!isLoading && clubData ? (
                <ImageHeaderScrollView
                    maxOverlayOpacity={0.6}
                    minOverlayOpacity={0.3}
                    fadeOutForeground
                    minHeight={verticalScale(150)}
                    maxHeight={verticalScale(300)}
                    renderHeader={() => (
                        <FastImage
                            source={{ uri: clubData?.club_photos_list?.[0] || ARK_LETTER_IMG }}
                            style={{ backgroundColor: trueWhite, width: '100%', height: '100%' }}
                        />
                    )}
                    renderTouchableFixedForeground={renderForeground}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={isLoading}
                            progressViewOffset={scale(150)}
                            onRefresh={onRefresh}
                        />
                    }
                    alwaysBounceHorizontal={false}
                    scrollViewBackgroundColor={bg_color}
                >
                    {renderMainContent()}
                </ImageHeaderScrollView>
            ) : (
                <View style={{ flex: 1, backgroundColor: bg_color, alignItems: 'center', justifyContent: 'center' }}>
                    <Loading />
                </View>
            )}

            <ImageScrollViewer ref={imageScrollViewer} imageUrls={imageUrls} />

            <DialogDIY
                showDialog={showDialog}
                text={'登錄後能Follow社團和接收最新消息，現在去登錄嗎？'}
                handleConfirm={() => {
                    setShowDialog(false);
                    props.navigation.navigate('MeTabbar');
                }}
                handleCancel={() => setShowDialog(false)}
            />
            <DialogDIY
                showDialog={reportChoice}
                text={'請在郵件中說明需舉報組織、舉報的原因。'}
                handleConfirm={() => {
                    Linking.openURL('mailto:' + MAIL);
                    setReportChoice(false);
                }}
                handleCancel={() => setReportChoice(false)}
            />

            {isShow && (
                <ModalBottom cancel={tiggerModalBottom}>
                    <View style={{ padding: scale(20), height: PAGE_HEIGHT * 0.7 }}>
                        <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: verticalScale(13) }}>簡介</Text>
                        <ScrollView style={{ marginTop: scale(5) }}>
                            <HyperlinkText linkStyle={{ color: themeColor }} navigation={props.navigation} beforeJump={tiggerModalBottom}>
                                <Text style={{ ...uiStyle.defaultText, color: black.main, fontSize: verticalScale(16) }} selectable>
                                    {clubData?.intro}
                                </Text>
                            </HyperlinkText>
                        </ScrollView>
                    </View>
                </ModalBottom>
            )}

            <Toast
                ref={toastRef}
                position="top"
                positionValue={'10%'}
                textStyle={{ color: white }}
                style={{ backgroundColor: toastColor, borderRadius: scale(10) }}
            />
        </View>
    );
};

export default inject('RootStore')(ClubDetail);
