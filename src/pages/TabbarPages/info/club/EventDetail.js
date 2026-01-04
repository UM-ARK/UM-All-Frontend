import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    StatusBar,
    Dimensions,
    StyleSheet,
    ScrollView,
    RefreshControl,
    Linking,
    Platform,
} from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, POST, MAIL } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import ModalBottom from '../../../../components/ModalBottom';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import Header from '../../../../components/Header';
import HyperlinkText from '../../../../components/HyperlinkText';

import Ionicons from 'react-native-vector-icons/Ionicons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { ImageHeaderScrollView } from 'react-native-image-header-scroll-view';
import { Image } from 'expo-image';
import { inject } from 'mobx-react';
import axios from 'axios';
import moment from 'moment-timezone';
import Toast, { DURATION } from 'react-native-easy-toast';
import { scale, verticalScale } from 'react-native-size-matters';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('window');
const CLUB_LOGO_SIZE = verticalScale(60);
const CLUB_IMAGE_WIDTH = PAGE_WIDTH * 0.19;
const CLUB_IMAGE_HEIGHT = PAGE_HEIGHT * 0.076;

const EventDetail = (props) => {
    const { theme } = useTheme();
    const { bg_color, white, black, themeColor, secondThemeColor, viewShadow, success, warning, trueWhite, } = theme;

    const styles = StyleSheet.create({
        // 展示 from to，在哪裡舉辦的文字的樣式
        infoShowContainer: {
            borderColor: themeColor,
            borderWidth: scale(1),
            paddingHorizontal: scale(6),
            paddingVertical: scale(1),
            borderRadius: scale(10),
            justifyContent: 'center',
            alignItems: 'center',
        },
        clubLogoContainer: {
            width: CLUB_LOGO_SIZE,
            height: CLUB_LOGO_SIZE,
            borderRadius: scale(50),
            overflow: 'hidden',
            marginTop: verticalScale(5),
            marginHorizontal: scale(20),
            backgroundColor: white,
            ...viewShadow,
        },
        followButton: {
            marginTop: scale(5),
            position: 'absolute',
            right: scale(12),
            bottom: scale(12),
            padding: scale(10),
            borderRadius: scale(12),
        },
    });
    // state
    const [isLoading, setIsLoading] = useState(true);
    const [isLogin, setIsLogin] = useState(false);
    const [isClub, setIsClub] = useState(false);
    // 訪問該頁的用戶對該組織的Follow狀態
    const [isFollow, setIsFollow] = useState(false);
    const [eventData, setEventData] = useState(undefined);
    const [clubData, setClubData] = useState(undefined);
    const [imageUrls, setImageUrls] = useState('');
    const [showDialog, setShowDialog] = useState(false);
    const [reportChoice, setReportChoice] = useState(false);
    const [toastColor, setToastColor] = useState(themeColor);
    const [showUpInfo, setShowUpInfo] = useState(false);
    const [isShowModal, setIsShowModal] = useState(false);

    // 其他state拆分為單獨變量
    const [coverImgUrl, setCoverImgUrl] = useState('');
    const [title, setTitle] = useState('');
    const [introduction, setIntroduction] = useState('');
    const [startTimeStamp, setStartTimeStamp] = useState(null);
    const [finishTimeStamp, setFinishTimeStamp] = useState(null);
    const [type, setType] = useState('');
    const [relateImgUrl, setRelateImgUrl] = useState([]);
    const [location, setLocation] = useState('');

    // ref
    const imageScrollViewer = useRef(null);
    const toast = useRef(null);

    // 取得全局資料
    const globalData = props.RootStore;

    // componentDidMount & componentDidUpdate for route.params change
    useEffect(() => {
        // 已登錄判斷
        if (globalData?.userInfo) {
            if (globalData.userInfo.stdData) {
                setIsLogin(true);
            }
            if (globalData.userInfo.isClub) {
                setIsClub(true);
            }
        }

        getAllThings();
    }, []);

    // 監聽 route.params 變化，類似 componentDidUpdate(prevProps)
    useEffect(() => {
        const params = props.route.params;
        getAllThings();
    }, [props.route.params]);

    // 獲取所有資料
    const getAllThings = useCallback(() => {
        // 獲取上級路由傳遞的參數，展示活動詳情
        const eventDataParam = props.route.params.data;
        getClubData(eventDataParam.created_by);
        getEventData(eventDataParam._id);
    }, [props.route.params]);

    // 按社團id獲取社團資訊，頭像
    const getClubData = async (club_num) => {
        try {
            const res = await axios.get(BASE_URI + GET.CLUB_INFO_NUM + club_num);
            let json = res.data;
            if (json.message === 'success') {
                let clubData = json.content;
                clubData.logo_url = BASE_HOST + clubData.logo_url;
                setClubData(clubData);
            }
        } catch (err) {
            console.log('err', err);
        }
    };

    // 按eventID獲取活動資訊，包含是否已follow
    const getEventData = async (eventID) => {
        let URL = BASE_URI + GET.EVENT_INFO_EVENT_ID;
        try {
            const res = await axios.get(URL + eventID);
            let json = res.data;
            if (json.message === 'success') {
                let eventData = json.content;
                eventData.cover_image_url = BASE_HOST + eventData.cover_image_url;
                if (eventData.relate_image_url && eventData.relate_image_url.length > 0) {
                    let addHostArr = eventData.relate_image_url.map((itm) => BASE_HOST + itm);
                    eventData.relate_image_url = addHostArr;
                }
                setCoverImgUrl(eventData.cover_image_url);
                setTitle(eventData.title);
                setIntroduction(eventData.introduction);
                setStartTimeStamp(eventData.startdatetime);
                setFinishTimeStamp(eventData.enddatetime);
                setType(eventData.type);
                setImageUrls(eventData.cover_image_url);
                setRelateImgUrl(
                    eventData.relate_image_url && eventData.relate_image_url.length > 0
                        ? eventData.relate_image_url
                        : [],
                );
                setLocation(eventData.location);
                setEventData(eventData);
                setIsFollow(eventData.isFollow);
                setIsLoading(false);
            }
        } catch (err) {
            console.log('err', err);
        }
    };

    // 打開/關閉底部Modal
    const tiggerModalBottom = () => {
        setIsShowModal((prev) => !prev);
    };

    // 點擊Follow按鈕響應事件
    const handleFollow = () => {
        if (!isLogin) {
            setShowDialog(true);
        } else {
            if (!isFollow) {
                postAddFollow(eventData._id);
            } else {
                postDelFollow(eventData._id);
            }
        }
        trigger();
    };

    const postAddFollow = async (eventID) => {
        let URL = BASE_URI + POST.ADD_FOLLOW_EVENT;
        let data = new FormData();
        data.append('activity_id', eventID);
        try {
            const res = await axios.post(URL, data, {
                headers: { 'Content-Type': `multipart/form-data` },
            });
            let json = res.data;
            if (json.message === 'success') {
                // 關注成功
                setToastColor(success);
                setIsFollow(true);
                toast.current?.show(`感謝 Follow ！❥(^_-)\n有最新動態會提醒您！`, 2000);
            } else if (json.code === '400') {
                // 已經關注
                setToastColor(warning);
                toast.current?.show(`您已經關注過了~`, 2000);
            }
        } catch (err) {
            console.log('err', err);
            alert('錯誤', err.message);
        }
    };

    const postDelFollow = async (eventID) => {
        let URL = BASE_URI + POST.DEL_FOLLOW_EVENT;
        let data = new FormData();
        data.append('activity_id', eventID);
        try {
            const res = await axios.post(URL, data, {
                headers: { 'Content-Type': `multipart/form-data` },
            });
            let json = res.data;
            if (json.message === 'success') {
                // del follow成功
                setToastColor(themeColor);
                setIsFollow(false);
                toast.current?.show(`有緣再見！o(╥﹏╥)o`, 2000);
            }
        } catch (err) {
            console.log('err', err);
            alert('錯誤', err.message);
        }
    };

    // 下拉刷新組件
    const renderRefreshCompo = () => (
        <RefreshControl
            colors={[themeColor]}
            tintColor={themeColor}
            refreshing={isLoading}
            progressViewOffset={scale(220)}
            onRefresh={onRefresh}
        />
    );

    const onRefresh = () => {
        setIsLoading(true);
        getEventData(eventData._id);
    };

    // 活動基本信息
    const renderEventBasicInfo = () => {
        return (
            <View
                style={{
                    backgroundColor: white,
                    marginVertical: verticalScale(5),
                    marginHorizontal: scale(15),
                    borderRadius: scale(10),
                    paddingVertical: verticalScale(10),
                    paddingHorizontal: scale(15),
                }}
            >
                {/* 活動大標題 */}
                <View style={{ marginBottom: verticalScale(5) }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontWeight: 'bold',
                            fontSize: verticalScale(15),
                        }}
                    >
                        {title}
                    </Text>
                </View>

                {/* 活動地點 */}
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <View style={{ width: scale(25) }}>
                        <View style={{ ...styles.infoShowContainer }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(11),
                                    color: themeColor,
                                }}
                            >
                                @
                            </Text>
                        </View>
                    </View>
                    <View style={{ marginLeft: scale(5), width: '90%' }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.third,
                            }}
                        >
                            {location}
                        </Text>
                    </View>
                </View>

                {/* 活動時間 */}
                <View style={{ marginTop: verticalScale(5) }}>
                    <View style={{ flexDirection: 'row' }}>
                        <View style={{ ...styles.infoShowContainer }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(11),
                                    color: themeColor,
                                }}
                            >
                                from
                            </Text>
                        </View>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                marginHorizontal: scale(5),
                                color: black.third,
                            }}
                        >
                            {moment(startTimeStamp).format('YYYY/MM/DD, HH:mm')}
                        </Text>
                    </View>
                    <View style={{ flexDirection: 'row', marginTop: scale(5) }}>
                        <View style={{ ...styles.infoShowContainer }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(11),
                                    color: themeColor,
                                }}
                            >
                                to
                            </Text>
                        </View>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                marginLeft: scale(5),
                                color: black.third,
                            }}
                        >
                            {moment(finishTimeStamp).format('YYYY/MM/DD, HH:mm')}
                        </Text>
                    </View>
                </View>

                {/* 舉辦方頭像 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        trigger();
                        if (!isClub) {
                            props.navigation.navigate('ClubDetail', {
                                data: clubData,
                            });
                        }
                    }}
                >
                    <View style={{ alignSelf: 'center', flexDirection: 'row' }}>
                        {/* 社團名 */}
                        <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                            <View style={{ ...styles.infoShowContainer }}>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        fontSize: verticalScale(11),
                                        color: themeColor,
                                    }}
                                >
                                    Created By
                                </Text>
                            </View>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    alignSelf: 'center',
                                    marginTop: scale(5),
                                    color: black.third,
                                }}
                            >
                                {clubData == undefined ? '' : clubData.name}
                            </Text>
                        </View>
                        {/* 社團Logo */}
                        <Image
                            source={clubData == undefined ? '' : clubData.logo_url}
                            style={{ ...styles.clubLogoContainer, backgroundColor: trueWhite }}
                            contentFit='contain'
                        />
                    </View>
                </TouchableWithoutFeedback>
            </View>
        );
    };

    // 渲染Header前景，返回按鈕
    const renderForeground = () => {
        return (
            <TouchableOpacity
                style={{ flex: 1, position: 'relative' }}
                onPress={() => {
                    setImageUrls(coverImgUrl);
                    imageScrollViewer.current.handleOpenImage(0);
                }}
                activeOpacity={1}
            >
                {/* 返回按鈕 */}
                <View
                    style={{
                        position: 'absolute',
                        top: verticalScale(65),
                        left: scale(15),
                        zIndex: 999,
                    }}
                >
                    <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                            trigger();
                            props.navigation.goBack();
                        }}
                    >
                        <Ionicons name="chevron-back-circle" size={verticalScale(35)} color={white} />
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        );
    };

    // 渲染頁面主要內容
    const renderMainContent = () => {
        return (
            <View style={{ backgroundColor: bg_color, flex: 1, marginTop: verticalScale(5) }}>
                {renderEventBasicInfo()}

                {/* 設置按鈕 */}
                {isClub ? (
                    <>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                // 關閉iOS Modal視圖
                                Platform.OS === 'ios' && props.navigation.pop(2);
                                // 跳轉活動info編輯頁，並傳遞刷新函數
                                props.navigation.navigate('EventSetting', {
                                    mode: 'edit',
                                    eventData: { _id: eventData._id },
                                    refresh: onRefresh,
                                });
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                alignSelf: 'center',
                                backgroundColor: secondThemeColor,
                                borderRadius: scale(15),
                                paddingHorizontal: scale(10),
                                paddingVertical: scale(5),
                                margin: scale(70),
                                marginVertical: scale(5),
                            }}
                        >
                            <Ionicons name="settings-outline" size={scale(25)} color={white} />
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: white,
                                    fontSize: verticalScale(20),
                                    fontWeight: 'bold',
                                }}
                            >
                                {' '}
                                編輯活動
                            </Text>
                        </TouchableOpacity>
                        <View>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(12),
                                    color: secondThemeColor,
                                    fontWeight: 'bold',
                                    alignSelf: 'center',
                                }}
                            >
                                Update活動資訊請點我！↑
                            </Text>
                        </View>
                    </>
                ) : null}

                {/* 詳情介紹 */}
                {eventData != undefined && eventData.introduction && eventData.introduction.length > 0 && (
                    <View
                        style={{
                            backgroundColor: white,
                            borderRadius: scale(10),
                            marginHorizontal: scale(15),
                            marginTop: verticalScale(5),
                        }}
                    >
                        {/* 卡片標題 */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: scale(10),
                                paddingHorizontal: scale(10),
                            }}
                            activeOpacity={0.6}
                        >
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(12),
                                    color: themeColor,
                                    fontWeight: 'bold',
                                }}
                            >
                                詳情
                            </Text>
                        </View>
                        {/* 卡片內容 */}
                        <View
                            style={{
                                justifyContent: 'space-between',
                                alignItems: 'flex-start',
                                flexDirection: 'row',
                                margin: scale(10),
                                marginTop: scale(0),
                            }}
                        >
                            {/* 文字 */}
                            <HyperlinkText linkStyle={{ color: themeColor }} navigation={props.navigation}>
                                <Text style={{ ...uiStyle.defaultText, color: black.second }} selectable>
                                    {eventData.introduction}
                                </Text>
                            </HyperlinkText>
                        </View>
                    </View>
                )}

                {/* 相關照片 */}
                {relateImgUrl != undefined && relateImgUrl.length > 0 && (
                    <TouchableOpacity
                        style={{
                            backgroundColor: white,
                            borderRadius: scale(10),
                            marginHorizontal: scale(15),
                            marginBottom: scale(8),
                            marginTop: scale(10),
                        }}
                        activeOpacity={0.7}
                        onPress={() => {
                            setImageUrls(relateImgUrl);
                            imageScrollViewer.current.tiggerModal();
                        }}
                    >
                        {/* 卡片標題 */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingVertical: scale(10),
                                paddingHorizontal: scale(10),
                            }}
                            activeOpacity={0.6}
                        >
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: verticalScale(12),
                                    color: themeColor,
                                    fontWeight: 'bold',
                                }}
                            >
                                相關照片
                            </Text>
                        </View>

                        {/* 卡片內容 */}
                        <View
                            style={{
                                justifyContent: 'space-around',
                                alignItems: 'flex-start',
                                flexDirection: 'row',
                                margin: scale(10),
                                marginTop: scale(0),
                            }}
                        >
                            {/* 圖片相冊 最多4張 */}
                            {relateImgUrl.map((item, index) => (
                                <TouchableOpacity
                                    key={index}
                                    activeOpacity={0.8}
                                    onPress={() => {
                                        setImageUrls(relateImgUrl);
                                        imageScrollViewer.current.handleOpenImage(index);
                                    }}
                                >
                                    <Image
                                        source={item}
                                        style={{
                                            backgroundColor: trueWhite,
                                            width: CLUB_IMAGE_WIDTH,
                                            height: CLUB_IMAGE_HEIGHT,
                                            borderRadius: scale(5),
                                            ...viewShadow,
                                        }}
                                    />
                                </TouchableOpacity>
                            ))}
                        </View>
                    </TouchableOpacity>
                )}

                {/* 舉報活動 */}
                <TouchableOpacity
                    style={{
                        alignSelf: 'center',
                        marginTop: scale(20),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    activeOpacity={0.8}
                    onPress={() => {
                        setReportChoice(true);
                    }}
                >
                    <EvilIcons name="exclamation" size={scale(20)} color={black.third} />
                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: verticalScale(13) }}>
                        向管理員舉報該活動
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Follow 按鈕
    const renderFollowButton = () => {
        return (
            <TouchableOpacity
                style={{
                    ...styles.followButton,
                    backgroundColor: isFollow ? black.third : themeColor,
                }}
                activeOpacity={0.8}
                onPress={handleFollow}
            >
                <Text style={{ ...uiStyle.defaultText, color: white }}>{isFollow ? 'Del Follow' : 'Follow'}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {isLoading ? (
                <Header title={'Loading...'} />
            ) : (
                <StatusBar barStyle="light-content" backgroundColor={'transparent'} translucent={true} />
            )}

            {/* Modal展示需要的信息 */}
            {isShowModal && (
                <ModalBottom cancel={tiggerModalBottom}>
                    <View style={{ padding: scale(20), height: PAGE_HEIGHT * 0.7 }}>
                        <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: verticalScale(13) }}>詳情</Text>
                        <ScrollView style={{ marginTop: scale(5) }}>
                            <HyperlinkText
                                linkStyle={{ color: themeColor }}
                                navigation={props.navigation}
                                beforeJump={tiggerModalBottom}
                            >
                                <Text style={{ ...uiStyle.defaultText, color: black.main, fontSize: verticalScale(16) }} selectable>
                                    {introduction}
                                </Text>
                            </HyperlinkText>
                        </ScrollView>
                    </View>
                </ModalBottom>
            )}

            {/* 彈出層展示圖片查看器 */}
            <ImageScrollViewer ref={imageScrollViewer} imageUrls={imageUrls} />

            {/* Dialog提示登錄 */}
            <DialogDIY
                showDialog={showDialog}
                text={'登錄後能Follow活動和接收最新消息，現在去登錄嗎？'}
                handleConfirm={() => {
                    setShowDialog(false);
                    props.navigation.navigate('MeTabbar');
                }}
                handleCancel={() => setShowDialog(false)}
            />
            <DialogDIY
                showDialog={reportChoice}
                text={'請在郵件中說明需舉報活動的標題，和舉報的原因。'}
                handleConfirm={() => {
                    Linking.openURL('mailto:' + MAIL);
                    setReportChoice(false);
                }}
                handleCancel={() => setReportChoice(false)}
            />

            {/* Tost */}
            <Toast
                ref={toast}
                position="top"
                positionValue={PAGE_HEIGHT * 0.1}
                textStyle={{ color: white }}
                style={{
                    backgroundColor: toastColor,
                    borderRadius: scale(10),
                }}
            />

            {/* 渲染主要內容 */}
            {!isLoading && eventData ? (
                <ImageHeaderScrollView
                    maxOverlayOpacity={0.6}
                    minOverlayOpacity={0.3}
                    fadeOutForeground
                    minHeight={verticalScale(150)}
                    maxHeight={verticalScale(350)}
                    renderHeader={() => (
                        <Image
                            source={coverImgUrl.replace('http:', 'https:')}
                            style={{ backgroundColor: trueWhite, width: '100%', height: '100%' }}
                        />
                    )}
                    renderTouchableFixedForeground={renderForeground}
                    showsVerticalScrollIndicator={false}
                    refreshControl={renderRefreshCompo()}
                    alwaysBounceHorizontal={false}
                    scrollViewBackgroundColor={bg_color}
                >
                    {renderMainContent()}
                    <View style={{ height: verticalScale(50) }} />
                </ImageHeaderScrollView>
            ) : (
                // Loading屏幕
                <View style={{ flex: 1, backgroundColor: bg_color }}>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Loading />
                    </View>
                </View>
            )}
        </View>
    );
};

export default inject('RootStore')(EventDetail);
