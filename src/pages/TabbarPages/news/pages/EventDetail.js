import React, {Component} from 'react';
import {
    View,
    Image,
    Text,
    ImageBackground,
    TouchableOpacity,
    Dimensions,
    StatusBar,
} from 'react-native';

import {COLOR_DIY} from '../../../../utils/uiMap';
import {pxToDp} from '../../../../utils/stylesKits';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import {
    ImageHeaderScrollView,
    TriggeringView,
} from 'react-native-image-header-scroll-view';

const {height: PAGE_HEIGHT} = Dimensions.get('window');

class ClubDetail extends Component {
    constructor(props) {
        super(props);

        // 獲取上級路由傳遞的參數
        // const detailRoute = this.props.route.params;
        // console.log(detailRoute);

        this.state = {
            eventData: this.props.route.params.data,
        };
    }
    render() {
        // 解耦uiMap的數據
        const {bg_color, black, white} = COLOR_DIY;
        // 結構eventData
        const {imgUrl, timeStamp, title} = this.state.eventData;

        console.log(this.state.eventData);

        // 渲染Header前景，社團LOGO，返回按鈕
        // TODO: 點擊查看大圖
        renderForeground = () => {
            return (
                <View style={{flex: 1, position: 'relative'}}>
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
                    <View
                        style={{
                            bottom: 0,
                            width: '100%',
                            height: pxToDp(20),
                            backgroundColor: white,
                            position: 'absolute',
                            borderTopLeftRadius: pxToDp(15),
                            borderTopRightRadius: pxToDp(15),
                        }}
                    />
                    {/* 社團LOGO */}
                    <View
                        style={{
                            position: 'absolute',
                            bottom: pxToDp(5),
                            alignSelf: 'center',
                            width: pxToDp(80),
                            height: pxToDp(80),
                            borderRadius: 50,
                            overflow: 'hidden',
                            ...COLOR_DIY.viewShadow,
                        }}>
                        <FastImage
                            source={{
                                uri: 'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
                            }}
                            style={{width: '100%', height: '100%'}}
                        />
                    </View>
                </View>
            );
        };

        return (
            <View style={{backgroundColor: bg_color, flex: 1}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '活動詳情',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{
                        backgroundColor: COLOR_DIY.bg_color,
                        barStyle: 'dark-content',
                    }}
                />

                <View style={{alignItems: 'center'}}>
                    <FastImage
                        source={{uri: imgUrl}}
                        style={{
                            width: '80%',
                            height: pxToDp(450),
                            marginTop: pxToDp(30),
                        }}
                    />

                    <Text style={{marginTop: pxToDp(10)}}>標題：{title}</Text>
                    <Text>地點：...</Text>
                    <Text>時間：...</Text>
                    <Text>內容：...</Text>
                </View>
            </View>
        );
    }
}

export default ClubDetail;
