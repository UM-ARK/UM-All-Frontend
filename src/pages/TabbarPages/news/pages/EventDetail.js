import React, {Component, useState} from 'react';
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
} from 'react-native';

import {COLOR_DIY, ToastText} from '../../../../utils/uiMap';
import {BASE_URI, BASE_HOST, GET, POST, MAIL} from '../../../../utils/pathMap';
import ModalBottom from '../../../../components/ModalBottom';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import Header from '../../../../components/Header';
import HyperlinkText from '../../../../components/HyperlinkText';

import Ionicons from 'react-native-vector-icons/Ionicons';
import Feather from 'react-native-vector-icons/Feather';
import EvilIcons from 'react-native-vector-icons/EvilIcons';
import {
    ImageHeaderScrollView,
    TriggeringView,
} from 'react-native-image-header-scroll-view';
import FastImage from 'react-native-fast-image';
import {inject} from 'mobx-react';
import axios from 'axios';
import moment from 'moment-timezone';
import Toast, {DURATION} from 'react-native-easy-toast';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {scale} from 'react-native-size-matters';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');
const CLUB_LOGO_SIZE = 80;
const CLUB_IMAGE_WIDTH = PAGE_WIDTH * 0.19;
const CLUB_IMAGE_HEIGHT = PAGE_HEIGHT * 0.076;

// 解構uiMap的數據
const {bg_color, white, black, themeColor} = COLOR_DIY;

class EventDetail extends Component {
    state = {
        isLoading: true,
        isLogin: false,
        isClub: false,
        // 訪問該頁的用戶對該組織的Follow狀態
        isFollow: false,
        eventData: undefined,
        clubData: undefined,
        imageUrls: '',
        showDialog: false,
        reportChoice: false,
        toastColor: themeColor,
    };

    componentDidMount() {
        let globalData = this.props.RootStore;
        // 已登錄
        if (globalData.userInfo) {
            if (globalData.userInfo.stdData) {
                this.setState({isLogin: true});
            }
            if (globalData.userInfo.isClub) {
                this.setState({isClub: true});
            }
        }

        // 獲取上級路由傳遞的參數，展示活動詳情
        const eventData = this.props.route.params.data;
        this.getClubData(eventData.created_by);
        this.getEventData(eventData._id);
    }

    componentWillUnmount() {
        FastImage.clearMemoryCache();
    }

    // 按社團id獲取社團資訊，頭像
    async getClubData(club_num) {
        await axios
            .get(BASE_URI + GET.CLUB_INFO_NUM + club_num)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let clubData = json.content;
                    clubData.logo_url = BASE_HOST + clubData.logo_url;
                    this.setState({clubData});
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    // 按eventID獲取活動資訊，包含是否已follow
    async getEventData(eventID) {
        let URL = BASE_URI + GET.EVENT_INFO_EVENT_ID;
        await axios
            .get(URL + eventID)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let eventData = json.content;
                    eventData.cover_image_url =
                        BASE_HOST + eventData.cover_image_url;
                    if (
                        eventData.relate_image_url &&
                        eventData.relate_image_url.length > 0
                    ) {
                        let addHostArr = [];
                        eventData.relate_image_url.map(itm => {
                            addHostArr.push(BASE_HOST + itm);
                        });
                        eventData.relate_image_url = addHostArr;
                    }
                    this.setState({
                        coverImgUrl: eventData.cover_image_url,
                        title: eventData.title,
                        introduction: eventData.introduction,
                        startTimeStamp: eventData.startdatetime,
                        finishTimeStamp: eventData.enddatetime,
                        type: eventData.type,
                        imageUrls: eventData.cover_image_url,
                        relateImgUrl:
                            eventData.relate_image_url &&
                            eventData.relate_image_url.length > 0
                                ? eventData.relate_image_url
                                : [],
                        location: eventData.location,
                        eventData,
                        isFollow: eventData.isFollow,
                        isLoading: false,
                    });
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({isShowModal: !this.state.isShowModal});
    };

    // 點擊Follow按鈕響應事件
    handleFollow = () => {
        const {isFollow, isLogin, showDialog, eventData} = this.state;
        let eventID = eventData._id;
        // 如果沒有登錄，觸發登錄提示
        if (!isLogin) {
            this.setState({showDialog: true});
        } else {
            // 未follow，addFollow
            if (!isFollow) {
                this.postAddFollow(eventID);
            } else {
                this.postDelFollow(eventID);
            }
        }
        ReactNativeHapticFeedback.trigger('soft');
    };

    async postAddFollow(eventID) {
        let URL = BASE_URI + POST.ADD_FOLLOW_EVENT;
        let data = new FormData();
        data.append('activity_id', eventID);
        await axios
            .post(URL, data, {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    // 關注成功
                    this.setState({
                        toastColor: COLOR_DIY.success,
                        isFollow: true,
                    });
                    this.toast.show(
                        `感謝 Follow ！❥(^_-)\n有最新動態會提醒您！`,
                        2000,
                    );
                } else if (json.code == '400') {
                    // json.code=="400" 已經關注
                    this.setState({toastColor: COLOR_DIY.warning});
                    this.toast.show(`您已經關注過了~`, 2000);
                }
            })
            .catch(err => {
                console.log('err', err);
                alert('錯誤', err.message);
            });
    }

    async postDelFollow(eventID) {
        let URL = BASE_URI + POST.DEL_FOLLOW_EVENT;
        let data = new FormData();
        data.append('activity_id', eventID);
        await axios
            .post(URL, data, {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    // del follow成功
                    this.setState({
                        toastColor: themeColor,
                        isFollow: false,
                    });
                    this.toast.show(`有緣再見！o(╥﹏╥)o`, 2000);
                }
            })
            .catch(err => {
                console.log('err', err);
                alert('錯誤', err.message);
            });
    }

    renderFollowButton = () => {
        const {isFollow} = this.state;
        return (
            <TouchableOpacity
                style={{
                    ...styles.followButton,
                    backgroundColor: isFollow ? black.third : themeColor,
                }}
                activeOpacity={0.8}
                onPress={this.handleFollow}>
                <Text style={{color: white}}>
                    {isFollow ? 'Del Follow' : 'Follow'}
                </Text>
            </TouchableOpacity>
        );
    };

    // 下拉刷新組件
    renderRefreshCompo = () => (
        <RefreshControl
            colors={[themeColor]}
            tintColor={themeColor}
            refreshing={this.state.isLoading}
            progressViewOffset={scale(220)}
            onRefresh={this.onRefresh}
        />
    );

    onRefresh = () => {
        this.setState({isLoading: true});
        this.getEventData(this.state.eventData._id);
    };

    render() {
        // 解構state數據
        const {
            coverImgUrl,
            title,
            startTimeStamp,
            finishTimeStamp,
            type,
            relateImgUrl,
            introduction,
            location,
            isLoading,
            eventData,
            imageUrls,
            isClub,
            isLogin,
            isFollow,
        } = this.state;

        // 活動基本信息
        renderEventBasicInfo = () => {
            return (
                <View
                    style={{
                        backgroundColor: white,
                        margin: scale(10),
                        marginHorizontal: scale(40),
                        paddingVertical: scale(20),
                        paddingHorizontal: scale(15),
                        borderRadius: scale(10),
                        overflow: 'hidden',
                        ...COLOR_DIY.viewShadow,
                    }}>
                    {/* 活動名 */}
                    <View style={{marginBottom: scale(15)}}>
                        <Text
                            style={{
                                color: black.main,
                                fontWeight: 'bold',
                                fontSize: scale(15),
                            }}>
                            {title}
                        </Text>
                    </View>

                    {/* 活動地點 */}
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <View style={{width: scale(25)}}>
                            <View style={{...styles.infoShowContainer}}>
                                <Text
                                    style={{
                                        fontSize: scale(11),
                                        color: COLOR_DIY.themeColor,
                                    }}>
                                    @
                                </Text>
                            </View>
                        </View>
                        <View style={{marginLeft: scale(5), width: '90%'}}>
                            <Text
                                style={{
                                    color: COLOR_DIY.black.third,
                                }}>
                                {location}
                            </Text>
                        </View>
                    </View>

                    {/* 活動時間 */}
                    <View style={{marginTop: scale(5)}}>
                        <View style={{flexDirection: 'row'}}>
                            <View style={{...styles.infoShowContainer}}>
                                <Text
                                    style={{
                                        fontSize: scale(11),
                                        color: COLOR_DIY.themeColor,
                                    }}>
                                    from
                                </Text>
                            </View>
                            <Text
                                style={{
                                    marginHorizontal: scale(5),
                                    color: COLOR_DIY.black.third,
                                }}>
                                {moment(startTimeStamp).format(
                                    'YYYY/MM/DD, HH:mm',
                                )}
                            </Text>
                        </View>
                        <View
                            style={{
                                flexDirection: 'row',
                                marginTop: scale(5),
                            }}>
                            <View style={{...styles.infoShowContainer}}>
                                <Text
                                    style={{
                                        fontSize: scale(11),
                                        color: COLOR_DIY.themeColor,
                                    }}>
                                    to
                                </Text>
                            </View>
                            <Text
                                style={{
                                    marginLeft: scale(5),
                                    color: COLOR_DIY.black.third,
                                }}>
                                {moment(finishTimeStamp).format(
                                    'YYYY/MM/DD, HH:mm',
                                )}
                            </Text>
                        </View>
                    </View>

                    {/* Follow按鈕 帶Toast */}
                    {eventData != undefined &&
                    eventData.can_follow &&
                    !isClub &&
                    false
                        ? this.renderFollowButton()
                        : null}
                </View>
            );
        };

        // 渲染Header前景，返回按鈕
        renderForeground = () => {
            return (
                <TouchableOpacity
                    style={{flex: 1, position: 'relative'}}
                    onPress={() => {
                        this.setState({imageUrls: coverImgUrl});
                        this.refs.imageScrollViewer.handleOpenImage(0);
                    }}
                    activeOpacity={1}>
                    {/* 返回按鈕 */}
                    <View
                        style={{
                            position: 'absolute',
                            top: scale(65),
                            left: scale(15),
                            zIndex: 999
                        }}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                this.props.navigation.goBack()
                            }}>
                            <Ionicons
                                name="chevron-back-circle"
                                size={scale(35)}
                                color={white}
                            />
                        </TouchableOpacity>
                    </View>
                    {/* 設置按鈕 */}
                    {
                        false && isClub ? (
                            <View
                                style={{
                                    position: 'absolute',
                                    top: scale(65),
                                    right: scale(15),
                                }}>
                                <TouchableOpacity
                                    activeOpacity={0.7}
                                    onPress={() => {
                                        this.props.navigation.navigate(
                                            'ClubSetting',
                                            {
                                                eventID: eventData._id,
                                                refresh:
                                                    this.onRefresh.bind(this),
                                            },
                                        );
                                    }}>
                                    <Ionicons
                                        name="settings-outline"
                                        size={scale(25)}
                                        color={white}
                                    />
                                </TouchableOpacity>
                            </View>
                        ) : null
                        // <View
                        //     style={{
                        //         position: 'absolute',
                        //         top: scale(65),
                        //         right: scale(15),
                        //     }}>
                        //     <TouchableOpacity
                        //         activeOpacity={0.7}
                        //         onPress={() => {
                        //             this.props.navigation.navigate(
                        //                 'ChatDetail',
                        //                 {get: 'event', id: eventData._id},
                        //             );
                        //         }}>
                        //         <Feather
                        //             name="message-circle"
                        //             size={scale(25)}
                        //             color={white}
                        //         />
                        //     </TouchableOpacity>
                        // </View>
                    }

                    {/* 白邊，凸顯立體感 */}
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{
                            bottom: 0,
                            width: '100%',
                            height: scale(100),
                            backgroundColor: bg_color,
                            position: 'absolute',
                            borderTopLeftRadius: scale(15),
                            borderTopRightRadius: scale(15),
                        }}
                    />
                    {/* 活動基本信息 */}
                    <TouchableWithoutFeedback>
                        <View
                            style={{
                                bottom: scale(5),
                                position: 'absolute',
                                width: '100%',
                            }}>
                            {renderEventBasicInfo()}
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            );
        };

        // 渲染頁面主要內容
        renderMainContent = () => {
            const {relateImgUrl, clubData, eventData} = this.state;
            return (
                <View style={{backgroundColor: bg_color, flex: 1}}>
                    {/* 舉辦方頭像 */}
                    <TouchableWithoutFeedback
                        onPress={() => {
                            if (!isClub) {
                                this.props.navigation.navigate('ClubDetail', {
                                    data: clubData,
                                });
                            }
                        }}>
                        <View
                            style={{
                                alignSelf: 'center',
                                flexDirection: 'row',
                            }}>
                            {/* 社團名 */}
                            <View
                                style={{
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: scale(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        Created By
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        alignSelf: 'center',
                                        marginTop: scale(5),
                                        color: black.third,
                                    }}>
                                    {clubData == undefined ? '' : clubData.name}
                                </Text>
                            </View>
                            {/* 社團Logo */}
                            <View style={styles.clubLogoContainer}>
                                <FastImage
                                    source={{
                                        uri:
                                            clubData == undefined
                                                ? ''
                                                : clubData.logo_url,
                                        // cache: FastImage.cacheControl.web,
                                    }}
                                    style={{width: '100%', height: '100%'}}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>

                    {/* 設置按鈕 */}
                    { isClub ? (
                        <>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() => {
                                    // this.props.navigation.navigate(
                                    //     'ClubSetting',
                                    //     {
                                    //         eventID: eventData._id,
                                    //         refresh:
                                    //             this.onRefresh.bind(this),
                                    //     },
                                    // );

                                    // 跳轉活動info編輯頁，並傳遞刷新函數
                                    this.props.navigation.navigate(
                                        'EventSetting', {
                                            mode: 'edit',
                                            eventData: {_id: eventData._id},
                                            refresh: this.onRefresh.bind(this)
                                        },
                                    );
                                }}
                                style={{flexDirection:'row',alignItems:'center', justifyContent:'center',
                                    backgroundColor:themeColor, borderRadius:scale(15), padding:scale(10), width:'auto',
                                    margin:scale(70), marginVertical:scale(5)
                                }}>
                                <Text style={{color:white, fontSize:scale(20)}}>活動設置 </Text>
                                <Ionicons
                                    name="settings-outline"
                                    size={scale(25)}
                                    color={white}
                                />
                            </TouchableOpacity>
                            <View>
                                <Text style={{fontSize:scale(12),color:black.main,alignSelf:'center'}}>Update活動資訊請點我！↑</Text>
                            </View>
                        </>
                    ) : null }

                    {/* 詳情介紹 */}
                    {eventData != undefined &&
                        eventData.introduction.length > 0 && (
                            <View
                                style={{
                                    backgroundColor: COLOR_DIY.white,
                                    borderRadius: scale(10),
                                    marginHorizontal: scale(15),
                                    // 增加陰影
                                    marginBottom: scale(8),
                                    marginTop: scale(10),
                                    ...COLOR_DIY.viewShadow,
                                }}>
                                {/* 卡片標題 */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingVertical: scale(10),
                                        paddingHorizontal: scale(10),
                                    }}
                                    activeOpacity={0.6}>
                                    <Text
                                        style={{
                                            fontSize: scale(12),
                                            color: themeColor,
                                            fontWeight: 'bold',
                                        }}>
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
                                    }}>
                                    {/* 文字 */}
                                    <HyperlinkText
                                        linkStyle={{color: themeColor}}
                                        navigation={this.props.navigation}>
                                        <Text
                                            style={{color: black.second}}
                                            selectable>
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
                                backgroundColor: COLOR_DIY.white,
                                borderRadius: scale(10),
                                marginHorizontal: scale(15),
                                // 增加陰影
                                marginBottom: scale(8),
                                marginTop: scale(10),
                                ...COLOR_DIY.viewShadow,
                            }}
                            activeOpacity={0.7}
                            onPress={() => {
                                this.setState({imageUrls: relateImgUrl});
                                this.refs.imageScrollViewer.tiggerModal();
                            }}>
                            {/* 卡片標題 */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    paddingVertical: scale(10),
                                    paddingHorizontal: scale(10),
                                }}
                                activeOpacity={0.6}>
                                <Text
                                    style={{
                                        fontSize: scale(12),
                                        color: themeColor,
                                        fontWeight: 'bold',
                                    }}>
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
                                }}>
                                {/* 圖片相冊 最多4張 */}
                                {relateImgUrl.map((item, index) => {
                                    return (
                                        <TouchableOpacity
                                            activeOpacity={0.8}
                                            onPress={() => {
                                                this.setState({
                                                    imageUrls: relateImgUrl,
                                                });
                                                this.refs.imageScrollViewer.handleOpenImage(
                                                    index,
                                                );
                                            }}>
                                            <FastImage
                                                source={{
                                                    uri: item,
                                                    // cache: FastImage
                                                    //     .cacheControl.web,
                                                }}
                                                style={{
                                                    width: scale(
                                                        CLUB_IMAGE_WIDTH,
                                                    ),
                                                    height: scale(
                                                        CLUB_IMAGE_HEIGHT,
                                                    ),
                                                    borderRadius: scale(5),
                                                    ...COLOR_DIY.viewShadow,
                                                }}
                                            />
                                        </TouchableOpacity>
                                    );
                                })}
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
                            this.setState({reportChoice: true});
                        }}>
                        <EvilIcons
                            name="exclamation"
                            size={scale(20)}
                            color={black.third}
                        />
                        <Text style={{color: black.third, fontSize: scale(13)}}>
                            向管理員舉報該活動
                        </Text>
                    </TouchableOpacity>
                </View>
            );
        };

        return (
            <View style={{flex: 1}}>
                <StatusBar
                    barStyle="light-content"
                    backgroundColor={'transparent'}
                    translucent={true}
                />

                {/* Modal展示需要的信息 */}
                {this.state.isShowModal && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                padding: scale(20),
                                height: PAGE_HEIGHT * 0.7,
                            }}>
                            <Text
                                style={{
                                    color: black.third,
                                    fontSize: scale(13),
                                }}>
                                詳情
                            </Text>
                            <ScrollView style={{marginTop: scale(5)}}>
                                <HyperlinkText
                                    linkStyle={{color: themeColor}}
                                    navigation={this.props.navigation}
                                    beforeJump={this.tiggerModalBottom}>
                                    <Text
                                        style={{
                                            color: black.main,
                                            fontSize: scale(16),
                                        }}
                                        selectable>
                                        {introduction}
                                    </Text>
                                </HyperlinkText>
                            </ScrollView>
                        </View>
                    </ModalBottom>
                )}

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={imageUrls}
                    // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                    // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                {/* Dialog提示登錄 */}
                <DialogDIY
                    showDialog={this.state.showDialog}
                    text={'登錄後能Follow活動和接收最新消息，現在去登錄嗎？'}
                    handleConfirm={() => {
                        this.setState({showDialog: false});
                        this.props.navigation.navigate('MeTabbar');
                    }}
                    handleCancel={() => this.setState({showDialog: false})}
                />
                <DialogDIY
                    showDialog={this.state.reportChoice}
                    text={'請在郵件中說明需舉報活動的標題，和舉報的原因。'}
                    handleConfirm={() => {
                        Linking.openURL('mailto:' + MAIL);
                        this.setState({reportChoice: false});
                    }}
                    handleCancel={() => this.setState({reportChoice: false})}
                />

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{color: white}}
                    style={{
                        backgroundColor: this.state.toastColor,
                        borderRadius: scale(10),
                    }}
                />

                {/* 渲染主要內容 */}
                {!isLoading && eventData ? (
                    <ImageHeaderScrollView
                        // 設定透明度
                        maxOverlayOpacity={0.6}
                        minOverlayOpacity={0.3}
                        // 向上滾動的淡出效果
                        fadeOutForeground
                        // 收起時的高度
                        minHeight={scale(220)}
                        // 打開時的高度
                        maxHeight={scale(445)}
                        // 背景內容 - 圖片 - 建議使用橫圖
                        renderHeader={() => (
                            <FastImage
                                source={{
                                    uri: coverImgUrl.replace('http:', 'https:'),
                                    // cache: FastImage.cacheControl.web,
                                }}
                                style={{width: '100%', height: '100%'}}
                            />
                        )}
                        // 前景固定內容
                        renderTouchableFixedForeground={renderForeground}
                        showsVerticalScrollIndicator={false}
                        refreshControl={this.renderRefreshCompo()}
                        alwaysBounceHorizontal={false}
                        // bounces={false}
                    >
                        {/* 主要頁面內容 */}
                        {renderMainContent()}
                        <View
                            style={{
                                height: scale(200),
                                backgroundColor: bg_color,
                            }}
                        />
                    </ImageHeaderScrollView>
                ) : (
                    // Loading屏幕
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: bg_color,
                        }}>
                        <Header title={'Loading...'} />
                        <View
                            style={{
                                flex: 1,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                            <Loading />
                        </View>
                    </View>
                )}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    // 展示 from to，在哪裡舉辦的文字的樣式
    infoShowContainer: {
        borderColor: COLOR_DIY.themeColor,
        borderWidth: scale(1),
        paddingHorizontal: scale(6),
        paddingVertical: scale(1),
        borderRadius: scale(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    clubLogoContainer: {
        width: scale(CLUB_LOGO_SIZE),
        height: scale(CLUB_LOGO_SIZE),
        borderRadius: 50,
        overflow: 'hidden',
        marginVertical: scale(5),
        marginHorizontal: scale(20),
        backgroundColor: white,
        ...COLOR_DIY.viewShadow,
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

export default inject('RootStore')(EventDetail);
