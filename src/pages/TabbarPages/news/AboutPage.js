import React, { Component } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Linking,
} from 'react-native';

import { COLOR_DIY } from '../../../utils/uiMap';
import HomeCard from '../home/components/HomeCard';
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

import { scale } from 'react-native-size-matters';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import FastImage from 'react-native-fast-image';
import CookieManager from '@react-native-cookies/cookies';

const { black, themeColor, secondThemeColor, white } = COLOR_DIY;

export default class AboutPage extends Component {

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <ScrollView>
                    {/* 提示資訊 */}
                    <HomeCard>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: scale(5),
                            }}>
                            {`ARK ALL源自FST同學為愛發電，`}
                            <Text style={{ fontWeight: 'bold' }}>
                                並非官方應用程式！
                            </Text>
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: scale(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`本軟件並非澳大官方應用‼️ x1`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: scale(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`本軟件並非澳大官方應用‼️ x2`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: scale(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`本軟件並非澳大官方應用‼️ x3`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: scale(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`This APP is not an official APP of UM‼️`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: scale(5),
                                fontWeight: 'bold',
                                // alignSelf: 'center',
                            }}>
                            {`如您仍然信任本軟件，感謝您的認可 ♪(･ω･)ﾉ`}
                        </Text>
                        <Text
                            style={{
                                color: black.third,
                                marginTop: scale(5),
                                fontWeight: 'bold',
                            }}>
                            {`本軟件代碼在Github開源，歡迎✨✨`}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                Linking.openURL('https://github.com/UM-ARK/');
                            }}>
                            <Text
                                style={{
                                    color: themeColor,
                                    fontWeight: '600',
                                }}>{`點我前往`}</Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 其他提示 */}
                    <HomeCard>
                        <Text
                            style={{ color: black.third, marginTop: scale(5) }}>
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
                                    color: themeColor,
                                    fontWeight: '600',
                                }}>{`這個APP是?`}</Text>
                        </TouchableOpacity>

                        <Text
                            style={{ color: black.third, marginTop: scale(5) }}>
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
                                    color: themeColor,
                                    fontWeight: '600',
                                }}>{`我是萌新`}</Text>
                        </TouchableOpacity>

                        <Text
                            style={{ color: black.third, marginTop: scale(5) }}>
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
                                    color: themeColor,
                                    fontWeight: '600',
                                }}>{`我要怎麼...`}</Text>
                        </TouchableOpacity>
                    </HomeCard>

                    {/* 清除緩存 */}
                    <HomeCard>
                        <Text style={{ color: black.third }}>
                            {`圖片更新不及時？網站響應出錯？`}
                        </Text>
                        <Text style={{ color: black.third }}>
                            {`‼️:您已登錄的界面可能會退出登錄`}
                        </Text>
                        <Text style={{ color: black.third }}>
                            {`‼️:您可能需要重新加載圖片，會消耗流量`}
                        </Text>
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                FastImage.clearDiskCache();
                                FastImage.clearMemoryCache();
                                CookieManager.clearAll();
                                alert('已清除所有緩存');
                            }}>
                            <Text
                                style={{
                                    color: themeColor,
                                    fontWeight: '600',
                                }}>
                                {`清除圖片和Web緩存`}
                            </Text>
                        </TouchableOpacity>
                    </HomeCard>
                </ScrollView>
            </View>
        );
    }
}
