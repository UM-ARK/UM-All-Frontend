// 信息頁 - 聊天詳情
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    FlatList,
    Dimensions,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, BASE_HOST, GET} from '../../../utils/pathMap';
import BlurViewWrapper from '../../../components/BlurViewWrapper';
import HyperlinkText from '../../../components/HyperlinkText';
import ImageScrollViewer from '../../../components/ImageScrollViewer';

import {SpeedDial, Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {inject} from 'mobx-react';
import axios from 'axios';
import moment from 'moment-timezone';
import Toast, {DURATION} from 'react-native-easy-toast';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('screen');

// 定義圖片類型的消息寬高
const IMAGE_CARD_WIDTH = PAGE_WIDTH * 0.92;
const IMAGE_CARD_HEIGHT = PAGE_HEIGHT * 0.3;

// 解構全局UI樣式
const {bg_color, black, white, themeColor, viewShadow} = COLOR_DIY;

// 返回數據的頁數
let dataPage = 1;
class ChatDetail extends Component {
    state = {
        noticeData: undefined,
        imageUrls: '',
        noMoreData: false,

        clubData: undefined,
        isLoading: true,
        isAdmin: false,
        // 打開右下角新建消息類型按鈕
        openOption: false,
    };

    componentDidMount() {
        let globalData = this.props.RootStore;
        if (globalData.userInfo.isClub) {
            let clubData = globalData.userInfo.clubData;
            this.setState({clubData, isLoading: false, isAdmin: true});
            this.getNotice(true);
        } else {
            this.getNotice(false);
        }
    }

    componentWillUnmount() {
        dataPage = 1;
    }

    getNotice = async isClub => {
        const params = this.props.route.params;
        let URL = '';
        let num_of_item = 5;
        if (isClub) {
            if (params.sendTo == 'all') {
                URL = BASE_URI + GET.NOTICE + GET.NOTICE_MODE.club;
            } else if (params.sendTo != undefined) {
                URL =
                    BASE_URI +
                    GET.NOTICE +
                    GET.NOTICE_MODE.event +
                    '?activity_id=' +
                    params.sendTo;
            }
        } else {
            // 用戶點擊
            if (params.get == 'club') {
                URL =
                    BASE_URI +
                    GET.NOTICE +
                    GET.NOTICE_MODE.club +
                    '?club_num=' +
                    params.id;
            } else {
                URL =
                    BASE_URI +
                    GET.NOTICE +
                    GET.NOTICE_MODE.event +
                    '?activity_id=' +
                    params.id;
            }
        }

        await axios
            .get(URL, {
                params: {
                    num_of_item,
                    page: dataPage,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    const {noticeData} = this.state;
                    let newDataArr = json.content;
                    if (newDataArr.length < num_of_item) {
                        this.setState({noMoreData: true});
                    } else {
                        this.setState({noMoreData: false});
                    }

                    newDataArr.map(itm => {
                        if (itm.notice_type != 'TEXT') {
                            itm.image_url = BASE_HOST + itm.image_url;
                        }
                    });

                    if (dataPage == 1) {
                        this.setState({noticeData: newDataArr});
                    } else if (noticeData && noticeData.length > 0) {
                        newDataArr = JSON.parse(
                            JSON.stringify(noticeData),
                        ).concat(newDataArr);
                        this.setState({noticeData: newDataArr});
                    }
                } else if (json.code == '2') {
                    alert('已無更多數據');
                    this.setState({noMoreData: true});
                } else {
                    alert('數據出錯，請聯繫開發者');
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    };

    // 渲染該條信息的時間
    renderMessageTime = timeStamp => {
        return (
            <View style={styles.timeStampWrap}>
                <Text style={{color: black.third}}>
                    {moment(timeStamp).format('YYYY/MM/DD, HH:mm')}
                </Text>
            </View>
        );
    };

    // 消息內容卡片
    renderMessageCard = item => {
        return (
            <View style={styles.message.container}>
                {/* 卡片內容 */}
                <HyperlinkText
                    linkStyle={{color: themeColor}}
                    navigation={this.props.navigation}>
                    <Text style={{color: black.second}}>{item.title}</Text>
                </HyperlinkText>
            </View>
        );
    };

    renderImageCard = item => {
        return (
            // 活動卡外框
            <View style={styles.event.container}>
                {/* 包裝相片與相片模糊部件 */}
                <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => {
                        if (item.notice_type == 'WEBSITE') {
                            let webview_param = {
                                url: item.link,
                                title: 'UM ALL內置瀏覽器',
                                text_color: '#FFF',
                                bg_color_diy: themeColor,
                                isBarStyleBlack: false,
                            };
                            this.props.navigation.navigate(
                                'Webviewer',
                                webview_param,
                            );
                        } else if (item.notice_type == 'IMAGE') {
                            // 打開圖片查看器
                            this.setState({imageUrls: item.image_url});
                            this.refs.imageScrollViewer.tiggerModal();
                        }
                    }}>
                    <Image
                        source={{uri: item.image_url}}
                        style={{
                            resizeMode: 'cover',
                            width: IMAGE_CARD_WIDTH,
                            height: IMAGE_CARD_HEIGHT,
                        }}
                    />
                    <BlurViewWrapper
                        // 需要虛化圖片的URL
                        url={item.image_url}
                        // 需要虛化的原圖寬高
                        width={IMAGE_CARD_WIDTH}
                        height={IMAGE_CARD_HEIGHT}
                        blurHeight={'35%'}
                        blurRadius={15}
                        // 模糊層顏色
                        bgColor={'rgba(200,200,200,0.5)'}>
                        <View
                            style={{
                                paddingHorizontal: pxToDp(10),
                                paddingVertical: pxToDp(5),
                            }}>
                            <Text style={{color: white}}>{item.title}</Text>
                        </View>
                    </BlurViewWrapper>
                </TouchableOpacity>
            </View>
        );
    };

    // 渲染推送的訊息，時間+內容
    renderMessageItem = item => {
        return (
            <View
                style={{
                    marginVertical: pxToDp(10),
                }}>
                {/* 渲染該條信息的發送時間 */}
                {this.renderMessageTime(item.post_datetime)}

                {/* 渲染信息卡片 */}
                {item.notice_type == 'TEXT'
                    ? this.renderMessageCard(item)
                    : this.renderImageCard(item)}
            </View>
        );
    };

    // 渲染右下角按鈕
    renderFixButton = () => {
        const {openOption} = this.state;
        let params = this.props.route.params;
        return (
            <SpeedDial
                isOpen={openOption}
                icon={{name: 'add', color: white}}
                openIcon={{name: 'close', color: white}}
                onOpen={() => this.setState({openOption: true})}
                onClose={() => this.setState({openOption: false})}
                style={{zIndex: 9}}
                buttonStyle={{backgroundColor: themeColor}}>
                <SpeedDial.Action
                    title="新增公告"
                    buttonStyle={{backgroundColor: themeColor}}
                    icon={{name: 'alternate-email', color: white}}
                    onPress={() => {
                        this.setState({openOption: false});
                        this.props.navigation.navigate('MessageSetting', {
                            sendTo: params.sendTo,
                        });
                    }}
                />
            </SpeedDial>
        );
    };

    renderHeader = headerTitle => {
        return (
            <Header
                backgroundColor={bg_color}
                leftComponent={
                    <TouchableOpacity
                        onPress={() => this.props.navigation.goBack()}>
                        <Ionicons
                            name="chevron-back-outline"
                            size={pxToDp(25)}
                            color={black.main}
                        />
                    </TouchableOpacity>
                }
                centerComponent={{
                    text: headerTitle,
                    style: {
                        color: black.main,
                        fontSize: pxToDp(15),
                    },
                }}
                rightComponent={
                    <TouchableOpacity
                        onPress={() => {
                            if (dataPage > 1) {
                                dataPage = 1;
                            }
                            this.toast.show(`Data is Loading...`, 2000);
                            this.getNotice(this.state.isAdmin);
                        }}>
                        <Ionicons
                            name="refresh"
                            size={pxToDp(25)}
                            color={black.main}
                        />
                    </TouchableOpacity>
                }
                statusBarProps={{
                    backgroundColor: 'transparent',
                    barStyle: 'dark-content',
                }}
            />
        );
    };

    loadMoreData = () => {
        const {noMoreData} = this.state;
        dataPage++;
        if (!noMoreData) {
            this.toast.show(`Data is Loading...`, 2000);
            this.getNotice();
        }
    };

    renderLoadMoreView = () => {
        const {noMoreData} = this.state;
        return (
            <View
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginVertical: pxToDp(10),
                }}>
                {noMoreData ? (
                    <View style={{alignItems: 'center'}}>
                        <Text style={{color: black.third}}>
                            沒有更多公告，過一段時間再來吧~
                        </Text>
                        <Text style={{color: black.third}}>[]~(￣▽￣)~*</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.loadMore}
                        activeOpacity={0.8}
                        onPress={this.loadMoreData}>
                        <Text style={{color: white, fontSize: pxToDp(14)}}>
                            Load More
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    render() {
        const params = this.props.route.params;
        const {noticeData, imageUrls, isAdmin} = this.state;
        let headerTitle = '@ 該活動的Followers';
        if ('sendTo' in params && params.sendTo == 'all') {
            headerTitle = '@ All Followers';
        }
        if (!isAdmin) {
            headerTitle = '歷史公告';
        }

        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                {this.renderHeader(headerTitle)}

                {this.state.isAdmin && this.renderFixButton()}

                {/* 通知信息的渲染 */}
                {noticeData && noticeData.length > 0 ? (
                    <FlatList
                        data={noticeData}
                        renderItem={({item}) => {
                            return this.renderMessageItem(item);
                        }}
                        ListHeaderComponent={() => (
                            <View style={{marginTop: pxToDp(50)}} />
                        )}
                        ListFooterComponent={this.renderLoadMoreView}
                        // 翻轉渲染順序，從下往上
                        inverted={true}
                    />
                ) : (
                    <View
                        style={{alignSelf: 'center', justifyContent: 'center'}}>
                        <Text style={{color: black.second}}>尚未發佈公告</Text>
                    </View>
                )}

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={imageUrls}
                />

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{color: white}}
                    style={{
                        backgroundColor: themeColor,
                        borderRadius: pxToDp(10),
                    }}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    timeStampWrap: {
        alignSelf: 'center',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#eaeaea',
        borderRadius: pxToDp(10),
        paddingHorizontal: pxToDp(8),
        paddingVertical: pxToDp(2),
    },
    message: {
        container: {
            backgroundColor: white,
            borderRadius: pxToDp(10),
            marginHorizontal: pxToDp(15),
            marginTop: pxToDp(10),
            padding: pxToDp(10),
            paddingVertical: pxToDp(5),
            justifyContent: 'center',
            alignItems: 'flex-start',
            ...viewShadow,
        },
        title: {
            fontSize: pxToDp(12),
            fontWeight: 'bold',
            width: '90%',
        },
    },
    event: {
        container: {
            backgroundColor: bg_color,
            borderRadius: pxToDp(10),
            marginHorizontal: pxToDp(15),
            marginTop: pxToDp(10),
            borderRadius: pxToDp(10),
            overflow: 'hidden',
            ...viewShadow,
        },
    },
    replyReminder: {
        marginVertical: pxToDp(10),
        borderRadius: pxToDp(20),
        marginHorizontal: pxToDp(20),
        backgroundColor: white,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: pxToDp(10),
        ...viewShadow,
    },
    loadMore: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themeColor,
        paddingHorizontal: pxToDp(10),
        paddingVertical: pxToDp(10),
        borderRadius: pxToDp(15),
        marginBottom: pxToDp(5),
        ...viewShadow,
    },
});

export default inject('RootStore')(ChatDetail);
