import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Image,
} from 'react-native';

import { COLOR_DIY } from '../src/utils/uiMap';
import { pxToDp } from '../src/utils/stylesKits';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import { scale } from 'react-native-size-matters';

// 解構全局ui設計顏色
const { white, black, viewShadow } = COLOR_DIY;

class HomeCard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            imgLoading: true,
            // 发布日期
            publishDate: '08-15',
            // 内容
            content: 'ARK ALL源自FST同學為愛發電TAT，並非官方應用程式！\n本軟件代碼在Github開源，歡迎✨✨\n本軟件並非澳大官方應用‼️ x1\n本軟件並非澳大官方應用‼️ x2\n本軟件並非澳大官方應用‼️ x3\nThis APP is not an official APP of UM‼️\n如您仍然信任本軟件，感謝您的認可 ♪(･ω･)',
            // 配圖
            haveImage: undefined,
            imageUrls: undefined,
            haveImage: false,
            imageUrls: '',
            // 发布用户
            userName: 'ARK ALL',
            userType: '管理員',
            userImage: {
                profilePhoto: require('../src/static/img/logo.png')
            },
            //是否關注
            ifFollowed: false,
        }
    }
    render() {
        const { imgLoading, publishDate, content, haveImage, imageUrls, userName, userType, userImage, ifFollowed } = this.state;
        return (
            <View style={styles.homeCard}>
                {/* 用户信息 */}
                <View style={styles.userInformation}>
                    {/*用户头像*/}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { }}>
                        {/* 這裡點擊跳轉組織頁面,但還沒做 */}
                        <Image
                            style={{
                                width: pxToDp(45),
                                height: pxToDp(45),
                                borderRadius: pxToDp(45),
                            }}
                            source={userImage['profilePhoto']} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => { }}>
                        <View style={{
                            marginHorizontal: pxToDp(10),
                        }}>
                            {/*用户名*/}
                            <Text style={{
                                fontWeight: 'bold',
                                fontSize: pxToDp(17),
                            }}>
                                {userName}
                            </Text>
                            {/* 組織身分/发帖日期 */}
                            <Text style={{
                                fontSize: pxToDp(12),
                                color: 'grey',
                            }}>
                                {userType} · {publishDate}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    {/* 關注按鈕 */}
                    {ifFollowed ? (
                        <TouchableOpacity style={{
                            position: 'absolute',
                            marginLeft: pxToDp(250),
                            width: pxToDp(75),
                            height: pxToDp(25),
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: COLOR_DIY.secondThemeColor,
                            borderRadius: pxToDp(10),
                        }}
                            activeOpacity={0.8}
                            onPress={() => this.setState({ ifFollowed: false })}>
                            <Text style={{
                                color: 'white',
                                fontWeight: 'bold',
                            }}>
                                Followed
                            </Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity style={{
                            position: 'absolute',
                            marginLeft: pxToDp(250),
                            width: pxToDp(60),
                            height: pxToDp(25),
                            alignItems: 'center',
                            justifyContent: 'center',
                            backgroundColor: COLOR_DIY.themeColor,
                            borderRadius: pxToDp(10),
                        }}
                            activeOpacity={0.8}
                            onPress={() => this.setState({ ifFollowed: true })}>
                            <Text style={{
                                color: 'white',
                                fontWeight: 'bold',
                            }}>
                                Follow
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.Container}
                    activeOpacity={0.8}>
                    <View style={styles.ContentContainer}>
                        {/* 點擊正文跳轉詳情頁 */}
                        {/* 正文内容 */}
                        <Text>
                            {content}
                        </Text>
                        {/* 配圖 然而不大会做 */}
                        {haveImage && (
                            <View style={{ alignSelf: 'center' }}>
                                <View
                                    style={{
                                        borderRadius: pxToDp(10),
                                        overflow: 'hidden',
                                        ...viewShadow,
                                        backgroundColor: white,
                                    }}>
                                    <FastImage
                                        source={{
                                            uri:
                                                imageUrls[0].replace(
                                                    'http:',
                                                    'https:',
                                                ),
                                            // cache: FastImage.cacheControl.web,
                                        }}
                                        onLoadStart={() => {
                                            this.setState({ imgLoading: true });
                                        }}
                                        onLoad={() => {
                                            this.setState({ imgLoading: false });
                                        }}
                                        style={styles.newsCardImg}
                                        resizeMode={FastImage.resizeMode.cover}
                                    />
                                    {this.state.imgLoading ? (
                                        <View
                                            style={{
                                                ...styles.newsCardImg,
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                position: 'absolute',
                                            }}>
                                            <ActivityIndicator
                                                size={'large'}
                                                color={COLOR_DIY.themeColor}
                                            />
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    homeCard: {
        backgroundColor: white,
        marginVertical: pxToDp(10),
        marginHorizontal: pxToDp(10),
        borderRadius: pxToDp(10),
        ...viewShadow,
    },
    userInformation: {
        flexDirection: 'row',
        marginTop: pxToDp(10),
        marginHorizontal: pxToDp(15),
        alignItems: 'center',
    },
    Container: {
        backgroundColor: white,
        marginBottom: pxToDp(7),
        marginHorizontal: pxToDp(10),
        borderRadius: pxToDp(10),
    },
    ContentContainer: {
        justifyContent: 'space-between',
        paddingHorizontal: pxToDp(8),
        paddingVertical: pxToDp(8),
    },
    newsCardImg: {
        width: scale(125),
        height: scale(100),
    },
});

export default HomeCard;
