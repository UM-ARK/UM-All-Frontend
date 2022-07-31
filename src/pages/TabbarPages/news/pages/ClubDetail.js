import React, {Component, useState} from 'react';
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
} from 'react-native';

import {COLOR_DIY, ToastText} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';
import {clubTagMap} from '../../../../utils/clubMap';
import {BASE_URI, GET, ARK_LETTER_IMG, POST} from '../../../../utils/pathMap';
import HyperlinkText from '../../../../components/HyperlinkText';

import EventCard from '../components/EventCard';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import ModalBottom from '../../../../components/ModalBottom';
import DialogDIY from '../../../../components/DialogDIY';
import Loading from '../../../../components/Loading';
import {updateUserInfo} from '../../../../utils/storageKits';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {
    ImageHeaderScrollView,
    TriggeringView,
} from 'react-native-image-header-scroll-view';
import FastImage from 'react-native-fast-image';
import {useToast} from 'native-base';
import {inject} from 'mobx-react';
import axios from 'axios';
import Toast, {DURATION} from 'react-native-easy-toast';

// 解構uiMap的數據
const {bg_color, white, black, themeColor, viewShadow} = COLOR_DIY;

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('window');
const CLUB_LOGO_SIZE = pxToDp(80);
const CLUB_IMAGE_WIDTH = pxToDp(75);
const CLUB_IMAGE_HEIGHT = pxToDp(55);

class ClubDetail extends Component {
    state = {
        clubData: undefined,
        eventData: undefined,
        // 訪問該頁的用戶對該組織的Follow狀態
        isFollow: false,
        // 該用戶是否管理員。社團、APP管理員賬號。
        isAdmin: false,
        isLogin: false,
        // 默認背景大圖，默認查看大圖
        imageUrls: ARK_LETTER_IMG,
        showDialog: false,
        isLoading: true,
        toastColor: themeColor,
    };

    // 由ClubPage跳轉
    constructor(props) {
        super(props);
        let clubData = undefined;
        if (
            !('userInfo' in this.props.RootStore) ||
            !this.props.RootStore.userInfo.isClub
        ) {
            // 獲取上級路由傳遞的參數，得知點擊的club_num
            clubData = this.props.route.params.data;
            // 請求對應社團的info
            this.getData(clubData.club_num);
        }
    }

    // 檢查本地緩存
    componentDidMount() {
        let globalData = this.props.RootStore;
        if (globalData.userInfo && globalData.userInfo.isClub) {
            let clubData = globalData.userInfo.clubData;
            this.setState({isAdmin: true});
            this.getData(clubData.club_num);
        }
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({isLogin: true});
        }
    }

    // 獲取指定id的社團信息
    async getData(club_num) {
        await axios
            .get(BASE_URI + GET.CLUB_INFO_NUM + club_num)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let clubData = json.content;
                    this.getEventData(club_num);
                    this.setState({
                        clubData,
                        isLoading: false,
                        isFollow: clubData.isFollow,
                    });

                    // 如果是社團賬號登錄，則刷新mobx和緩存的數據
                    if (this.state.isAdmin) {
                        let clubDataUpdate = {
                            isClub: true,
                            clubData,
                        };
                        updateUserInfo(clubDataUpdate);
                        this.props.RootStore.setUserInfo(clubDataUpdate);
                    }
                } else {
                    alert('Warning:', json.message);
                }
            })
            .catch(err => {
                console.error(err);
            });
    }

    // 按組織號碼獲取活動
    async getEventData(club_num) {
        let URL = BASE_URI + GET.EVENT_INFO_CLUB_NUM_P;
        await axios
            .get(URL, {
                params: {
                    club_num,
                    // 獲取最多5條數據
                    num_of_item: 5,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    this.setState({eventData: json.content});
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    async postAddFollow(club_num) {
        let URL = BASE_URI + POST.ADD_FOLLOW_CLUB;
        let data = new FormData();
        data.append('club', club_num);
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

    async postDelFollow(club_num) {
        let URL = BASE_URI + POST.DEL_FOLLOW_CLUB;
        let data = new FormData();
        data.append('club', club_num);
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

    // 點擊Follow按鈕響應事件
    handleFollow = () => {
        const {isFollow, isLogin, showDialog, clubData} = this.state;
        let club_num = clubData.club_num;
        // 如果沒有登錄，觸發登錄提示
        if (!isLogin) {
            this.setState({showDialog: true});
        } else {
            // 未follow，addFollow
            if (!isFollow) {
                this.postAddFollow(club_num);
            } else {
                this.postDelFollow(club_num);
            }
        }
    };

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

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({isShow: !this.state.isShow});
    };

    // 下拉刷新組件
    renderRefreshCompo = () => (
        <RefreshControl
            colors={[themeColor]}
            tintColor={themeColor}
            refreshing={this.state.isLoading}
            progressViewOffset={pxToDp(150)}
            onRefresh={() => {
                this.setState({isLoading: true});
                this.getData(this.state.clubData.club_num);
            }}
        />
    );

    render() {
        // 解構state數據
        const {clubData, isFollow, isAdmin, isLoading} = this.state;
        let logo_url,
            name,
            tag,
            club_num,
            intro,
            contact = undefined;
        let bgImgUrl = ARK_LETTER_IMG;

        // 已接收clubData
        if (clubData != undefined) {
            if (
                'club_photos_list' in clubData &&
                clubData.club_photos_list.length > 0
            ) {
                // 背景圖選擇數組第一張
                bgImgUrl = clubData.club_photos_list[0].replace(
                    'http:',
                    'https:',
                );
            }
            logo_url = clubData.logo_url;
            name = clubData.name;
            tag = clubData.tag;
            club_num = clubData.club_num;
            intro = clubData.intro;
            contact = clubData.contact;
        }

        // 渲染Header前景，社團LOGO，返回按鈕
        renderForeground = () => {
            return (
                <TouchableOpacity
                    style={{flex: 1, position: 'relative'}}
                    onPress={() => {
                        // 查看背景圖片大圖
                        if (
                            'club_photos_list' in clubData &&
                            clubData.club_photos_list.length > 0
                        ) {
                            this.setState({
                                imageUrls: clubData.club_photos_list,
                            });
                        } else {
                            this.setState({imageUrls: bgImgUrl});
                        }
                        this.refs.imageScrollViewer.handleOpenImage(0);
                    }}
                    activeOpacity={1}>
                    {/* 返回按鈕 */}
                    {!isAdmin && (
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => this.props.navigation.goBack()}
                            style={{
                                position: 'absolute',
                                top: pxToDp(65),
                                left: pxToDp(10),
                            }}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={white}
                            />
                        </TouchableOpacity>
                    )}
                    {/* 編輯資料按鈕 只有管理員可見 */}
                    {isAdmin && (
                        <View
                            style={{
                                position: 'absolute',
                                top: pxToDp(65),
                                right: pxToDp(10),
                            }}>
                            <TouchableOpacity
                                activeOpacity={0.7}
                                onPress={() =>
                                    this.props.navigation.navigate(
                                        'ClubSetting',
                                        {
                                            refresh: this.getData.bind(
                                                this,
                                                clubData.club_num,
                                            ), // 傳遞回調函數
                                            test: true,
                                        },
                                    )
                                }>
                                <Ionicons
                                    name="settings-outline"
                                    size={pxToDp(25)}
                                    color={white}
                                />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* 白邊，凸顯立體感 */}
                    <TouchableOpacity
                        activeOpacity={1}
                        style={styles.clubLogoWhiteSpace}
                    />
                    {/* 社團LOGO */}
                    <TouchableWithoutFeedback
                        onPress={() => {
                            this.setState({imageUrls: logo_url});
                            this.refs.imageScrollViewer.tiggerModal();
                        }}>
                        <View style={styles.clubLogoContainer}>
                            <FastImage
                                source={{
                                    uri: logo_url.replace('http:', 'https:'),
                                    cache: FastImage.cacheControl.web,
                                }}
                                style={{width: '100%', height: '100%'}}
                                resizeMode={FastImage.resizeMode.contain}
                            />
                        </View>
                    </TouchableWithoutFeedback>
                </TouchableOpacity>
            );
        };

        // 渲染頁面主要內容
        renderMainContent = () => {
            const {eventData, clubData} = this.state;
            return (
                <View style={{backgroundColor: bg_color}}>
                    {/* 1.0 社團基本資料 */}
                    <View style={{alignItems: 'center'}}>
                        {/* 建議使用社團名的簡稱 */}
                        <Text
                            style={{
                                color: black.main,
                                fontSize: pxToDp(20),
                                fontWeight: '500',
                                marginTop: pxToDp(5),
                            }}
                            numberOfLines={1}>
                            {name}
                        </Text>
                        {/* 社團ID */}
                        <Text
                            style={{
                                color: black.third,
                                fontSize: pxToDp(13),
                                marginVertical: pxToDp(2),
                            }}>
                            @
                            {'000'.substr(club_num.toString().length) +
                                club_num}
                        </Text>
                        {/* 社團分類 */}
                        <Text
                            style={{
                                color: themeColor,
                                fontSize: pxToDp(15),
                            }}>
                            #{clubTagMap(tag)}
                        </Text>
                    </View>

                    {/* Follow按鈕 */}
                    {!isAdmin && this.renderFollowButton()}

                    {/* 2.0 照片 */}
                    <View style={styles.cardContainer}>
                        {/* 卡片標題 */}
                        <TouchableOpacity
                            style={styles.cardTitleContainer}
                            activeOpacity={0.8}
                            onPress={() => {
                                if (
                                    'club_photos_list' in clubData &&
                                    clubData.club_photos_list.length > 0
                                ) {
                                    this.setState({
                                        imageUrls: clubData.club_photos_list,
                                    });
                                    this.refs.imageScrollViewer.tiggerModal();
                                }
                            }}>
                            <Text style={styles.cardTitleText}>照片</Text>
                            <Ionicons
                                name="chevron-forward-outline"
                                size={pxToDp(14)}
                                color={COLOR_DIY.black.main}></Ionicons>
                        </TouchableOpacity>
                        {/* 卡片內容 */}
                        {'club_photos_list' in clubData &&
                            clubData.club_photos_list.length > 0 && (
                                <View
                                    style={{
                                        justifyContent: 'space-around',
                                        alignItems: 'flex-start',
                                        flexDirection: 'row',
                                        margin: pxToDp(10),
                                        marginTop: pxToDp(0),
                                    }}>
                                    {/* 圖片相冊 最多4張 */}
                                    {clubData.club_photos_list.map(
                                        (item, index) => {
                                            if (index != 0) {
                                                return (
                                                    <TouchableOpacity
                                                        style={
                                                            styles.imageContainer
                                                        }
                                                        activeOpacity={0.7}
                                                        onPress={() => {
                                                            this.setState({
                                                                imageUrls:
                                                                    clubData.club_photos_list,
                                                            });
                                                            this.refs.imageScrollViewer.handleOpenImage(
                                                                index,
                                                            );
                                                        }}>
                                                        <FastImage
                                                            source={{
                                                                uri: item.replace(
                                                                    'http:',
                                                                    'https:',
                                                                ),
                                                                cache: FastImage
                                                                    .cacheControl
                                                                    .web,
                                                            }}
                                                            style={{
                                                                width: '100%',
                                                                height: '100%',
                                                            }}
                                                        />
                                                    </TouchableOpacity>
                                                );
                                            }
                                        },
                                    )}
                                </View>
                            )}
                    </View>

                    {/* 3.0 簡介 */}
                    <TouchableOpacity
                        style={styles.cardContainer}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (intro != undefined && intro.length > 0) {
                                this.tiggerModalBottom();
                            }
                        }}>
                        {/* 卡片標題 */}
                        <View style={{...styles.cardTitleContainer}}>
                            <Text style={styles.cardTitleText}>簡介</Text>
                            <Ionicons
                                name="chevron-forward-outline"
                                size={pxToDp(14)}
                                color={COLOR_DIY.black.main}></Ionicons>
                        </View>
                        {/* 卡片內容 */}
                        {intro != undefined && intro.length > 0 && (
                            <View
                                style={{
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: pxToDp(10),
                                    marginTop: pxToDp(0),
                                }}>
                                {/* 服務圖標與文字 */}
                                <Text
                                    numberOfLines={5}
                                    style={{color: black.second}}>
                                    {intro}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* 4.0 聯繫方式 */}
                    <View style={styles.cardContainer}>
                        {/* 卡片標題 */}
                        <TouchableOpacity
                            style={styles.cardTitleContainer}
                            activeOpacity={0.7}
                            onPress={() =>
                                Alert.alert('聯繫方式可以自行複製~')
                            }>
                            <Text style={styles.cardTitleText}>聯繫方式</Text>
                            <Ionicons
                                name="chevron-forward-outline"
                                size={pxToDp(14)}
                                color={COLOR_DIY.black.main}></Ionicons>
                        </TouchableOpacity>
                        {/* 卡片內容 */}
                        {contact != undefined && contact.length > 0 && (
                            <View
                                style={{
                                    justifyContent: 'space-between',
                                    alignItems: 'flex-start',
                                    flexDirection: 'row',
                                    margin: pxToDp(10),
                                    marginTop: pxToDp(0),
                                }}>
                                {/* 聯繫方式 */}
                                <View>
                                    {contact.map(item => {
                                        if (item.num.length > 0) {
                                            return (
                                                <View
                                                    style={{
                                                        flexDirection: 'row',
                                                    }}>
                                                    {/* 聯繫Type */}
                                                    <Text
                                                        style={{
                                                            color: black.second,
                                                        }}>
                                                        {item.type}:{' '}
                                                    </Text>
                                                    {/* 相關號碼、id */}
                                                    <HyperlinkText
                                                        linkStyle={{
                                                            color: COLOR_DIY.themeColor,
                                                        }}
                                                        navigation={
                                                            this.props
                                                                .navigation
                                                        }>
                                                        <Text
                                                            style={{
                                                                color: black.third,
                                                            }}
                                                            // 允許用戶複製
                                                            selectable={true}>
                                                            {item.num}
                                                        </Text>
                                                    </HyperlinkText>
                                                </View>
                                            );
                                        }
                                    })}
                                </View>
                            </View>
                        )}
                    </View>

                    {/* 5.0 舉辦的活動 */}
                    {eventData != undefined && eventData.length > 0 && (
                        <FlatList
                            numColumns={2}
                            columnWrapperStyle={{
                                justifyContent: 'center',
                            }}
                            data={eventData}
                            renderItem={({item, index}) => {
                                console.log(index);
                                if (index != 4) {
                                    return (
                                        <EventCard
                                            data={item}
                                            style={{
                                                marginVertical: pxToDp(8),
                                                marginHorizontal: pxToDp(10),
                                            }}
                                            isLogin={this.state.isLogin}
                                        />
                                    );
                                }
                            }}
                            scrollEnabled={false}
                            // 在所有項目的末尾渲染
                            ListFooterComponent={() =>
                                eventData.length > 4 && (
                                    <TouchableOpacity
                                        style={styles.checkMoreButton}
                                        activeOpacity={0.8}
                                        onPress={() =>
                                            this.props.navigation.navigate(
                                                'AllEvents',
                                                {clubData},
                                            )
                                        }>
                                        <Text style={{color: white}}>
                                            查看全部
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }
                        />
                    )}

                    <View
                        style={{height: pxToDp(50), backgroundColor: bg_color}}
                    />
                </View>
            );
        };

        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                <StatusBar
                    barStyle="light-content"
                    backgroundColor={'transparent'}
                    translucent={true}
                />

                {/* 渲染主要內容 */}
                {!isLoading && clubData ? (
                    <ImageHeaderScrollView
                        // 設定透明度
                        maxOverlayOpacity={0.6}
                        minOverlayOpacity={0.3}
                        // 向上滾動的淡出效果
                        fadeOutForeground
                        // 收起時的高度
                        minHeight={pxToDp(140)}
                        // 打開時的高度
                        maxHeight={pxToDp(230)}
                        // 背景內容 - 圖片 - 建議使用橫圖
                        renderHeader={() => (
                            <FastImage
                                source={{
                                    uri: bgImgUrl.replace('http:', 'https:'),
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
                    </ImageHeaderScrollView>
                ) : (
                    // Loading屏幕
                    <View
                        style={{
                            flex: 1,
                            backgroundColor: bg_color,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                        <Loading />
                    </View>
                )}

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={this.state.imageUrls}
                    // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                    // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                {/* 彈出層提示 */}
                <DialogDIY
                    showDialog={this.state.showDialog}
                    text={'登錄後能Follow社團和接收最新消息，現在去登錄嗎？'}
                    handleConfirm={() => {
                        this.setState({showDialog: false});
                        this.props.navigation.navigate('MeTabbar');
                    }}
                    handleCancel={() => this.setState({showDialog: false})}
                />

                {/* 展示簡介的Modal */}
                {this.state.isShow && (
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
                                簡介
                            </Text>
                            <ScrollView style={{marginTop: pxToDp(5)}}>
                                <Text
                                    style={{
                                        color: black.main,
                                        fontSize: pxToDp(16),
                                    }}>
                                    {intro}
                                </Text>
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
                        backgroundColor: this.state.toastColor,
                        borderRadius: pxToDp(10),
                    }}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    cardContainer: {
        backgroundColor: COLOR_DIY.white,
        borderRadius: pxToDp(10),
        marginHorizontal: pxToDp(15),
        // 增加陰影
        marginBottom: pxToDp(8),
        marginTop: pxToDp(10),
        ...COLOR_DIY.viewShadow,
    },
    cardTitleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: pxToDp(10),
        paddingHorizontal: pxToDp(10),
    },
    cardTitleText: {
        fontSize: pxToDp(12),
        color: black.main,
        fontWeight: 'bold',
    },
    clubLogoContainer: {
        position: 'absolute',
        bottom: pxToDp(5),
        alignSelf: 'center',
        width: pxToDp(CLUB_LOGO_SIZE),
        height: pxToDp(CLUB_LOGO_SIZE),
        borderRadius: 50,
        overflow: 'hidden',
        ...COLOR_DIY.viewShadow,
        backgroundColor: bg_color,
    },
    clubLogoWhiteSpace: {
        bottom: 0,
        width: '100%',
        height: pxToDp(20),
        backgroundColor: bg_color,
        position: 'absolute',
        borderTopLeftRadius: pxToDp(15),
        borderTopRightRadius: pxToDp(15),
    },
    imageContainer: {
        width: pxToDp(CLUB_IMAGE_WIDTH),
        height: pxToDp(CLUB_IMAGE_HEIGHT),
        borderRadius: pxToDp(5),
        overflow: 'hidden',
        ...viewShadow,
    },
    checkMoreButton: {
        marginTop: pxToDp(5),
        alignSelf: 'center',
        padding: pxToDp(10),
        borderRadius: pxToDp(15),
        backgroundColor: themeColor,
    },
    followButton: {
        marginTop: pxToDp(5),
        alignSelf: 'center',
        padding: pxToDp(10),
        borderRadius: pxToDp(12),
    },
});

export default inject('RootStore')(ClubDetail);
