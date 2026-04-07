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

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, POST, MAIL } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import ModalBottom from '../../../../components/ModalBottom';
import ARKImageView from '../../../../components/ARKImageView';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import HyperlinkText from '../../../../components/HyperlinkText';

import Ionicons from 'react-native-vector-icons/Ionicons';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import { ImageHeaderScrollView } from 'react-native-image-header-scroll-view';
import { Image } from 'expo-image';
import axios from 'axios';
import moment from 'moment-timezone';
import Toast from 'react-native-easy-toast';
import { scale, verticalScale } from 'react-native-size-matters';

const { width: PAGE_WIDTH } = Dimensions.get('window');
const { height: PAGE_HEIGHT } = Dimensions.get('window');
const CLUB_IMAGE_WIDTH = PAGE_WIDTH * 0.19;
const CLUB_IMAGE_HEIGHT = PAGE_HEIGHT * 0.076;

const EventDetail = (props) => {
    const { theme } = useTheme();
    const { bg_color, white, black, themeColor, secondThemeColor, viewShadow, success, warning, trueWhite } = theme;

    // 統一化卡片樣式（與 ClubDetail 保持一致）
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
        followButton: {
            marginTop: scale(5),
            position: 'absolute',
            right: scale(12),
            bottom: scale(12),
            padding: scale(10),
            borderRadius: scale(12),
        },
    });

    // 合併狀態管理
    const [state, setState] = useState({
        isLoading: true,
        isLogin: false,
        isClub: false,
        isFollow: false,
        eventData: undefined,
        clubData: undefined,
        imageUrls: '',
        showDialog: false,
        reportChoice: false,
        toastColor: themeColor,
        showUpInfo: false,
        isShowModal: false,
        coverImgUrl: '',
        title: '',
        introduction: '',
        startTimeStamp: null,
        finishTimeStamp: null,
        type: '',
        relateImgUrl: [],
        location: '',
    });

    const updateState = (newState) => {
        setState(prev => ({ ...prev, ...newState }));
    };

    // ref
    const imageScrollViewer = useRef(null);
    const toast = useRef(null);

    // componentDidMount & componentDidUpdate for route.params change
    useEffect(() => {
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
                updateState({ clubData });
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
                updateState({
                    coverImgUrl: eventData.cover_image_url,
                    title: eventData.title,
                    introduction: eventData.introduction,
                    startTimeStamp: eventData.startdatetime,
                    finishTimeStamp: eventData.enddatetime,
                    type: eventData.type,
                    imageUrls: eventData.cover_image_url,
                    relateImgUrl: eventData.relate_image_url && eventData.relate_image_url.length > 0 ? eventData.relate_image_url : [],
                    location: eventData.location,
                    eventData,
                    isFollow: eventData.isFollow,
                    isLoading: false,
                });
            }
        } catch (err) {
            console.log('err', err);
        }
    };

    // 打開/關閉底部Modal
    const tiggerModalBottom = () => {
        updateState({ isShowModal: !state.isShowModal });
    };

    // 點擊Follow按鈕響應事件
    const handleFollow = () => {
        if (!state.isLogin) {
            updateState({ showDialog: true });
        } else {
            if (!state.isFollow) {
                postAddFollow(state.eventData._id);
            } else {
                postDelFollow(state.eventData._id);
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
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            let json = res.data;
            if (json.message === 'success') {
                // 關注成功
                updateState({ toastColor: success, isFollow: true });
                toast.current?.show('感謝 Follow ！❥(^_-)\\n有最新動態會提醒您！', 2000);
            } else if (json.code === '400') {
                // 已經關注
                updateState({ toastColor: warning });
                toast.current?.show('您已經關注過了~', 2000);
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
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            let json = res.data;
            if (json.message === 'success') {
                // del follow成功
                updateState({ toastColor: themeColor, isFollow: false });
                toast.current?.show('有緣再見！o(╥﹏╥)o', 2000);
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
            refreshing={state.isLoading}
            progressViewOffset={scale(220)}
            onRefresh={onRefresh}
        />
    );

    const onRefresh = () => {
        updateState({ isLoading: true });
        getEventData(state.eventData._id);
    };

    // 統一的卡片標題渲染方法（與 ClubDetail 一致）
    const renderCardTitle = (title) => (
        <View style={styles.cardTitleContainer}>
            <Text style={styles.cardTitleText}>{title}</Text>
        </View>
    );

    // 活動基本信息組件
    const renderEventBasicInfo = () => (
        <View style={styles.cardContainer}>
            {renderCardTitle('活動資訊')}
            <View style={{ margin: scale(10), marginTop: scale(0) }}>
                {/* 活動標題 */}
                <Text style={{
                    ...uiStyle.defaultText,
                    color: black.main,
                    fontSize: verticalScale(18),
                    fontWeight: 'bold',
                    marginBottom: verticalScale(8),
                }}>
                    {state.title}
                </Text>

                {/* 活動地點 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(5) }}>
                    <Ionicons name="location-outline" size={scale(16)} color={themeColor} style={{ marginRight: scale(5) }} />
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                    }}>
                        {state.location}
                    </Text>
                </View>

                {/* 活動時間 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: verticalScale(5) }}>
                    <Ionicons name="calendar-outline" size={scale(16)} color={themeColor} style={{ marginRight: scale(5) }} />
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                    }}>
                        {moment(state.startTimeStamp).format('YYYY/MM/DD, HH:mm')} - {moment(state.finishTimeStamp).format('HH:mm')}
                    </Text>
                </View>

                {/* 舉辦方信息 */}
                {state.clubData && (
                    <TouchableWithoutFeedback
                        onPress={() => {
                            trigger();
                            props.navigation.navigate('ClubDetail', { data: state.clubData });
                        }}
                    >
                        <View style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginTop: verticalScale(8),
                            paddingVertical: scale(8),
                            paddingHorizontal: scale(10),
                            backgroundColor: theme.bg_color,
                            borderRadius: scale(8),
                        }}>
                            <Image
                                source={state.clubData.logo_url}
                                style={{
                                    width: scale(40),
                                    height: scale(40),
                                    borderRadius: scale(20),
                                    backgroundColor: trueWhite,
                                    marginRight: scale(10),
                                }}
                                contentFit="contain"
                            />
                            <View>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: black.second,
                                    fontSize: verticalScale(12),
                                }}>
                                    主辦方
                                </Text>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: black.main,
                                    fontSize: verticalScale(14),
                                    fontWeight: '500',
                                }}>
                                    {state.clubData.name}
                                </Text>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                )}
            </View>
        </View>
    );

    // 重構活動詳情展示
    const renderEventIntroduction = () => {
        if (!state.eventData?.introduction) {return null;}

        return (
            <View style={styles.cardContainer}>
                {renderCardTitle('活動詳情')}
                <View style={{ margin: scale(10), marginTop: scale(0) }}>
                    <HyperlinkText linkStyle={{ color: themeColor }} navigation={props.navigation}>
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: black.second,
                            fontSize: verticalScale(13),
                            lineHeight: verticalScale(20),
                        }} selectable>
                            {state.eventData.introduction}
                        </Text>
                    </HyperlinkText>
                </View>
            </View>
        );
    };

    // 重構相關照片展示
    const renderRelatedPhotos = () => {
        if (!state.relateImgUrl?.length) {return null;}

        return (
            <View style={styles.cardContainer}>
                {renderCardTitle('相關照片')}
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    margin: scale(10),
                    marginTop: scale(0),
                }}>
                    {state.relateImgUrl.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={{
                                width: CLUB_IMAGE_WIDTH,
                                height: CLUB_IMAGE_HEIGHT,
                                borderRadius: scale(5),
                                overflow: 'hidden',
                                margin: scale(5),
                                ...viewShadow,
                            }}
                            activeOpacity={0.8}
                            onPress={() => {
                                updateState({ imageUrls: state.relateImgUrl });
                                imageScrollViewer.current.handleOpenImage(index);
                            }}
                        >
                            <Image
                                source={item}
                                style={{
                                    backgroundColor: trueWhite,
                                    width: '100%',
                                    height: '100%',
                                }}
                                contentFit="cover"
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    // 重構編輯按鈕（管理員可見）
    // 社團管理功能已移除
    const renderEditButton = () => null;

    // 重構 renderMainContent 方法
    const renderMainContent = () => {
        return (
            <View style={{ backgroundColor: bg_color }}>
                {renderEventBasicInfo()}

                {renderEditButton()}

                {renderEventIntroduction()}

                {renderRelatedPhotos()}

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
                    onPress={() => updateState({ reportChoice: true })}
                >
                    <EvilIcons name="exclamation" size={scale(20)} color={black.third} />
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        fontSize: verticalScale(13),
                    }}>
                        向管理員舉報該活動
                    </Text>
                </TouchableOpacity>

                {/* 底部留白 */}
                <View style={{ height: verticalScale(100), backgroundColor: bg_color }} />
            </View>
        );
    };

    // 渲染Header前景，返回按鈕
    const renderForeground = () => {
        return (
            <TouchableOpacity
                style={{ flex: 1, position: 'relative' }}
                onPress={() => {
                    trigger();
                    updateState({ imageUrls: state.coverImgUrl });
                    imageScrollViewer.current?.handleOpenImage(0);
                }}
                activeOpacity={1}
            >
            </TouchableOpacity>
        );
    };

    // Follow 按鈕
    const renderFollowButton = () => {
        return (
            <TouchableOpacity
                style={{
                    ...styles.followButton,
                    backgroundColor: state.isFollow ? black.third : themeColor,
                }}
                activeOpacity={0.8}
                onPress={handleFollow}
            >
                <Text style={{ ...uiStyle.defaultText, color: white }}>{state.isFollow ? 'Del Follow' : 'Follow'}</Text>
            </TouchableOpacity>
        );
    };

    return (
        <View style={{ flex: 1 }}>
            {/* Modal展示需要的信息 */}
            {state.isShowModal && (
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
                                    {state.introduction}
                                </Text>
                            </HyperlinkText>
                        </ScrollView>
                    </View>
                </ModalBottom>
            )}

            {/* 彈出層展示圖片查看器 */}
            <ARKImageView ref={imageScrollViewer} imageUrls={state.imageUrls} />

            {/* Dialog提示登錄 */}
            <DialogDIY
                showDialog={state.showDialog}
                text={'登錄後能Follow活動和接收最新消息，現在去登錄嗎？'}
                handleConfirm={() => {
                    updateState({ showDialog: false });
                    props.navigation.navigate('MeTabbar');
                }}
                handleCancel={() => updateState({ showDialog: false })}
            />
            <DialogDIY
                showDialog={state.reportChoice}
                text={'請在郵件中說明需舉報活動的標題，和舉報的原因。'}
                handleConfirm={() => {
                    Linking.openURL('mailto:' + MAIL);
                    updateState({ reportChoice: false });
                }}
                handleCancel={() => updateState({ reportChoice: false })}
            />

            {/* Tost */}
            <Toast
                ref={toast}
                position="top"
                positionValue={PAGE_HEIGHT * 0.1}
                textStyle={{ color: white }}
                style={{
                    backgroundColor: state.toastColor,
                    borderRadius: scale(10),
                }}
            />

            {/* 渲染主要內容 */}
            {!state.isLoading && state.eventData ? (
                <ImageHeaderScrollView
                    maxOverlayOpacity={0.6}
                    minOverlayOpacity={0.3}
                    fadeOutForeground
                    minHeight={verticalScale(150)}
                    maxHeight={verticalScale(350)}
                    renderForeground={renderForeground}
                    renderHeader={() => (
                        <Image
                            source={state.coverImgUrl.replace('http:', 'https:')}
                            style={{ backgroundColor: trueWhite, width: '100%', height: '100%' }}
                        />
                    )}
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

export default EventDetail;
