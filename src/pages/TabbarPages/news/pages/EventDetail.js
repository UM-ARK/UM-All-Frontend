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
} from 'react-native';

import {pxToDp} from '../../../../utils/stylesKits';
import {COLOR_DIY, ToastText} from '../../../../utils/uiMap';
import {BASE_URI, BASE_HOST, GET, POST} from '../../../../utils/pathMap';
import EventCard from '../components/EventCard';
import ModalBottom from '../../../../components/ModalBottom';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import Header from '../../../../components/Header';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    ImageHeaderScrollView,
    TriggeringView,
} from 'react-native-image-header-scroll-view';
import FastImage from 'react-native-fast-image';
import {inject} from 'mobx-react';
import axios from 'axios';
import moment from 'moment-timezone';
import Toast, {DURATION} from 'react-native-easy-toast';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');
const CLUB_LOGO_SIZE = 80;
const CLUB_IMAGE_WIDTH = 75;
const CLUB_IMAGE_HEIGHT = 55;

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
                    console.log('eventData', eventData);
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
            progressViewOffset={pxToDp(300)}
            onRefresh={() => {
                this.setState({isLoading: true});
                this.getEventData(this.state.eventData._id);
            }}
        />
    );

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
        } = this.state;

        // 活動基本信息
        renderEventBasicInfo = () => {
            return (
                <View
                    style={{
                        backgroundColor: white,
                        margin: pxToDp(10),
                        marginHorizontal: pxToDp(40),
                        paddingVertical: pxToDp(20),
                        paddingHorizontal: pxToDp(15),
                        borderRadius: pxToDp(10),
                        overflow: 'hidden',
                        ...COLOR_DIY.viewShadow,
                    }}>
                    {/* 文字描述 */}
                    <View>
                        {/* 活動名 */}
                        <View style={{marginBottom: pxToDp(15)}}>
                            <Text
                                style={{
                                    color: black.main,
                                    fontWeight: 'bold',
                                    fontSize: pxToDp(15),
                                }}>
                                {title}
                            </Text>
                        </View>

                        {/* 活動地點 */}
                        <View style={{flexDirection: 'row'}}>
                            <View style={{...styles.infoShowContainer}}>
                                <Text
                                    style={{
                                        fontSize: pxToDp(11),
                                        color: COLOR_DIY.themeColor,
                                    }}>
                                    @
                                </Text>
                            </View>
                            <Text
                                style={{
                                    marginLeft: pxToDp(5),
                                    color: COLOR_DIY.black.third,
                                }}>
                                {location}
                            </Text>
                        </View>

                        {/* 活動時間 */}
                        <View style={{marginTop: pxToDp(5)}}>
                            <View style={{flexDirection: 'row'}}>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        from
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        marginHorizontal: pxToDp(5),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    {moment(startTimeStamp).format(
                                        'MM/DD, HH:mm',
                                    )}
                                </Text>
                            </View>
                            <View
                                style={{
                                    flexDirection: 'row',
                                    marginTop: pxToDp(5),
                                }}>
                                <View style={{...styles.infoShowContainer}}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        to
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        marginLeft: pxToDp(5),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    {moment(finishTimeStamp).format(
                                        'MM/DD, HH:mm',
                                    )}
                                </Text>
                            </View>
                        </View>
                    </View>
                    {/* Follow按鈕 帶Toast */}
                    <View style={{alignItems: 'flex-end'}}></View>
                    {eventData != undefined &&
                        eventData.can_follow &&
                        !isClub &&
                        this.renderFollowButton()}
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
                        this.refs.imageScrollViewer.tiggerModal();
                    }}
                    activeOpacity={1}>
                    {/* 返回按鈕 */}
                    <View
                        style={{
                            position: 'absolute',
                            top: pxToDp(65),
                            left: pxToDp(10),
                        }}>
                        <TouchableOpacity
                            activeOpacity={0.7}
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={white}
                            />
                        </TouchableOpacity>
                    </View>

                    {/* 白邊，凸顯立體感 */}
                    <TouchableOpacity
                        activeOpacity={1}
                        style={{
                            bottom: 0,
                            width: '100%',
                            height: pxToDp(100),
                            backgroundColor: bg_color,
                            position: 'absolute',
                            borderTopLeftRadius: pxToDp(15),
                            borderTopRightRadius: pxToDp(15),
                        }}
                    />
                    {/* 活動基本信息 */}
                    <TouchableWithoutFeedback>
                        <View
                            style={{
                                bottom: pxToDp(5),
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
                        onPress={() =>
                            this.props.navigation.navigate('ClubDetail', {
                                data: clubData,
                            })
                        }>
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
                                            fontSize: pxToDp(11),
                                            color: COLOR_DIY.themeColor,
                                        }}>
                                        Created By
                                    </Text>
                                </View>
                                <Text
                                    style={{
                                        alignSelf: 'center',
                                        marginTop: pxToDp(5),
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
                                                : clubData.logo_url.replace(
                                                      'http:',
                                                      'https:',
                                                  ),
                                        cache: FastImage.cacheControl.web,
                                    }}
                                    style={{width: '100%', height: '100%'}}
                                    resizeMode={FastImage.resizeMode.contain}
                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>

                    {/* 詳情介紹 */}
                    {eventData != undefined &&
                        eventData.introduction.length > 0 && (
                            <TouchableOpacity
                                style={{
                                    backgroundColor: COLOR_DIY.white,
                                    borderRadius: pxToDp(10),
                                    marginHorizontal: pxToDp(15),
                                    // 增加陰影
                                    marginBottom: pxToDp(8),
                                    marginTop: pxToDp(10),
                                    ...COLOR_DIY.viewShadow,
                                }}
                                activeOpacity={0.7}
                                onPress={() => this.tiggerModalBottom()}>
                                {/* 卡片標題 */}
                                <View
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        paddingVertical: pxToDp(10),
                                        paddingHorizontal: pxToDp(10),
                                    }}
                                    activeOpacity={0.6}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(12),
                                            color: COLOR_DIY.black.main,
                                            fontWeight: 'bold',
                                        }}>
                                        詳情
                                    </Text>
                                    <Ionicons
                                        name="chevron-forward-outline"
                                        size={pxToDp(14)}
                                        color={COLOR_DIY.black.main}></Ionicons>
                                </View>
                                {/* 卡片內容 */}
                                <View
                                    style={{
                                        justifyContent: 'space-between',
                                        alignItems: 'flex-start',
                                        flexDirection: 'row',
                                        margin: pxToDp(10),
                                        marginTop: pxToDp(0),
                                    }}>
                                    {/* 文字 */}
                                    <Text
                                        numberOfLines={4}
                                        style={{color: black.second}}>
                                        {eventData.introduction}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                    {/* 相關照片 */}
                    {relateImgUrl != undefined && relateImgUrl.length > 0 && (
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLOR_DIY.white,
                                borderRadius: pxToDp(10),
                                marginHorizontal: pxToDp(15),
                                // 增加陰影
                                marginBottom: pxToDp(8),
                                marginTop: pxToDp(10),
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
                                    paddingVertical: pxToDp(10),
                                    paddingHorizontal: pxToDp(10),
                                }}
                                activeOpacity={0.6}>
                                <Text
                                    style={{
                                        fontSize: pxToDp(12),
                                        color: COLOR_DIY.black.main,
                                        fontWeight: 'bold',
                                    }}>
                                    相關照片
                                </Text>
                                <Ionicons
                                    name="chevron-forward-outline"
                                    size={pxToDp(14)}
                                    color={COLOR_DIY.black.main}></Ionicons>
                            </View>

                            {/* 卡片內容 */}
                            <View
                                style={{
                                    justifyContent: 'space-around',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: pxToDp(10),
                                    marginTop: pxToDp(0),
                                }}>
                                {/* 圖片相冊 最多4張 */}
                                {relateImgUrl.map(item => {
                                    return (
                                        <FastImage
                                            source={{
                                                uri: item.replace(
                                                    'http:',
                                                    'https:',
                                                ),
                                                cache: FastImage.cacheControl
                                                    .web,
                                            }}
                                            style={{
                                                width: pxToDp(CLUB_IMAGE_WIDTH),
                                                height: pxToDp(
                                                    CLUB_IMAGE_HEIGHT,
                                                ),
                                                borderRadius: pxToDp(5),
                                                ...COLOR_DIY.viewShadow,
                                            }}
                                        />
                                    );
                                })}
                            </View>
                        </TouchableOpacity>
                    )}
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
                                padding: pxToDp(20),
                                height: PAGE_HEIGHT * 0.7,
                            }}>
                            <Text
                                style={{
                                    color: black.third,
                                    fontSize: pxToDp(13),
                                }}>
                                詳情
                            </Text>
                            <ScrollView style={{marginTop: pxToDp(5)}}>
                                <Text
                                    style={{
                                        color: black.main,
                                        fontSize: pxToDp(16),
                                    }}>
                                    {introduction}
                                </Text>
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

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{color: white}}
                    style={{
                        backgroundColor: this.state.toastColor,
                        borderRadius: pxToDp(10),
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
                        minHeight={pxToDp(220)}
                        // 打開時的高度
                        maxHeight={pxToDp(PAGE_HEIGHT * 0.65)}
                        // 背景內容 - 圖片 - 建議使用橫圖
                        renderHeader={() => (
                            <FastImage
                                source={{
                                    uri: coverImgUrl.replace('http:', 'https:'),
                                    cache: FastImage.cacheControl.web,
                                }}
                                style={{width: '100%', height: '100%'}}
                            />
                        )}
                        // 前景固定內容
                        renderTouchableFixedForeground={renderForeground}
                        showsVerticalScrollIndicator={false}
                        refreshControl={this.renderRefreshCompo()}>
                        {/* 主要頁面內容 */}
                        {renderMainContent()}
                        <View
                            style={{
                                height: pxToDp(200),
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
        borderWidth: pxToDp(1),
        paddingHorizontal: pxToDp(8),
        paddingVertical: pxToDp(1),
        borderRadius: pxToDp(10),
        justifyContent: 'center',
        alignItems: 'center',
    },
    clubLogoContainer: {
        width: pxToDp(CLUB_LOGO_SIZE),
        height: pxToDp(CLUB_LOGO_SIZE),
        borderRadius: 50,
        overflow: 'hidden',
        marginVertical: pxToDp(5),
        marginHorizontal: pxToDp(20),
        backgroundColor: white,
        ...COLOR_DIY.viewShadow,
    },
    followButton: {
        marginTop: pxToDp(5),
        position: 'absolute',
        right: pxToDp(12),
        bottom: pxToDp(12),
        padding: pxToDp(10),
        borderRadius: pxToDp(12),
    },
});

export default inject('RootStore')(EventDetail);
