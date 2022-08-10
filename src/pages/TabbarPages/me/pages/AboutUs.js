import React, {Component} from 'react';
import {
    ScrollView,
    View,
    Text,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from 'react-native';

import Header from '../../../../components/Header';
import {pxToDp} from '../../../../utils/stylesKits';
import {COLOR_DIY} from '../../../../utils/uiMap';
import {BASE_HOST} from '../../../../utils/pathMap';

import FastImage from 'react-native-fast-image';
import Timeline from 'react-native-timeline-flatlist';

const {black, bg_color, white, themeColor, secondThemeColor} = COLOR_DIY;

class About extends Component {
    state = {
        timeLineData: [
            {
                time: '2021-03-15',
                title: 'ARK分享活動首次出現',
            },
            {
                time: '2021-09-20',
                title: 'UM ARK小程序發佈',
                description: '巴士報站功能、ARK學術分享活動、FST各學會社團進駐',
            },
            {
                time: '2022-04-03',
                title: 'UM ARK小程序結束運營',
                description: '遭無端舉報，申訴無效，小程序永久封禁',
            },
            {
                time: '2022-05-24',
                title: '新UM ARK開發團隊成立',
                description: 'UM ALL項目立項',
            },
            {
                time: '2022-08-11',
                title: 'UM ALL 1.0.0正式開放下載',
            },
        ],
    };

    render() {
        const {timeLineData} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                <Header title={'關於我們'} />

                <ScrollView
                    contentContainerStyle={{paddingHorizontal: pxToDp(10)}}>
                    {/* LOGO */}
                    <View style={{...s.logoContainer}}>
                        <FastImage
                            source={require('../../../../static/img/umallLogo.png')}
                            style={{width: 100, height: 100}}
                        />
                    </View>

                    {/* APP標語 */}
                    <View
                        style={{
                            marginTop: pxToDp(20),
                            alignSelf: 'center',
                            alignItems: 'center',
                        }}>
                        <Text
                            style={{fontSize: pxToDp(15), color: black.second}}>
                            致力成為 UMer 人手一個的校園資訊APP！
                        </Text>
                        <Text
                            style={{
                                fontSize: pxToDp(13),
                                color: black.third,
                                marginTop: pxToDp(5),
                            }}>
                            UM ALL
                            是由幾位不知名的澳大FST同學，在2022年暑假自主開發的校園資訊平台。UM
                            ALL 有UM All In
                            One的含義，目的是為了一次整合澳大所有的功能、資訊。讓新生不再苦惱各種UM部門，讓社團不再苦惱籌劃的活動沒有曝光，讓澳大師生都可以更便捷地閱覽澳大活動，使用校園服務。
                        </Text>
                    </View>

                    {/* 發展時間軸 */}
                    <Timeline
                        data={timeLineData}
                        style={{
                            marginHorizontal: pxToDp(10),
                            marginTop: pxToDp(10),
                        }}
                        circleColor={themeColor}
                        lineColor={themeColor}
                    />

                    <TouchableOpacity
                        style={{
                            alignSelf: 'center',
                            marginTop: pxToDp(20),
                            marginBottom: pxToDp(50),
                        }}
                        activeOpacity={0.8}
                        onPress={() => {
                            Linking.openURL(BASE_HOST);
                        }}>
                        <Text style={{color: themeColor, fontSize: 15}}>
                            Website Page
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }
}

const s = StyleSheet.create({
    logoContainer: {
        marginTop: pxToDp(5),
        alignSelf: 'center',
        borderRadius: pxToDp(15),
        overflow: 'hidden',
        ...COLOR_DIY.viewShadow,
    },
});

export default About;
