import React, { Component } from 'react';
import { View, Text, FlatList, TouchableOpacity, Linking, Alert } from 'react-native';

import { COLOR_DIY } from '../../../../utils/uiMap';
import { WHAT_2_REG, ARK_WIKI_SEARCH } from '../../../../utils/pathMap';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';

import { scale } from "react-native-size-matters";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { NavigationContext } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { themeColor, black, secondThemeColor } = COLOR_DIY;

export default class CourseCard extends Component {
    static contextType = NavigationContext;

    // 渲染課程代號
    renderCourseCode = (code) => {
        let renderItm = null;
        if (code.length == 8 && code.indexOf('-') == -1) {
            renderItm = <>
                {code.substring(0, 4) + ' '}
                <Text style={{
                    color: themeColor,
                    fontWeight: '700',
                    fontSize: scale(16)
                }}>
                    {code.substring(4, 8)}
                </Text>
            </>
        }
        // FLL MLS的課程代號有TLL123-A的格式
        else if (code.length == 8 && code.indexOf('-') != -1) {
            renderItm = <>
                {code.substring(0, 3) + ' '}
                <Text style={{
                    color: themeColor,
                    fontWeight: '700',
                    fontSize: scale(16)
                }}>
                    {code.substring(3, 8)}
                </Text>
            </>
        }
        else {
            renderItm = code;
        }

        return (
            <Text style={{
                fontSize: scale(13),
                fontWeight: '600',
                color: black.main,
            }}>
                {renderItm}
            </Text>
        )
    }

    render() {
        const { data, mode, preEnroll } = this.props;

        return (
            <FlatList
                data={data}
                numColumns={data.length}
                columnWrapperStyle={data.length > 1 ? { flexWrap: 'wrap' } : null}
                style={{ marginHorizontal: scale(5) }}
                renderItem={({ item }) => {
                    const courseCode = item[mode === "what2Reg" ? 'New_code' : 'Course Code'];
                    const title = item[mode === "what2Reg" ? 'courseTitleEng' : 'Course Title'];
                    const offerUnit = item[mode === "what2Reg" ? 'Offering_Unit' : 'Offering Unit'];
                    const offerDepa = item[mode === "what2Reg" ? 'Offering_Department' : 'Offering Department'];
                    const credit = item[mode === "what2Reg" ? 'Credits' : 'Credit Units']
                    return (
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLOR_DIY.white,
                                borderRadius: scale(10),
                                margin: scale(5),
                                padding: scale(10), paddingVertical: scale(5),
                            }}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                Alert.alert(null,
                                    `想打開哪個平台查課？\n來為澳大人建設Wiki！\n現在就到Wiki留下你的足跡~\nヽ(ﾟ∀ﾟ)ﾒ(ﾟ∀ﾟ)ﾉ `,
                                    [
                                        {
                                            text: "Close",
                                        },
                                        {
                                            text: "打開ARK Wiki",
                                            onPress: () => {
                                                ReactNativeHapticFeedback.trigger('soft');
                                                let webview_param = {
                                                    url: ARK_WIKI_SEARCH + encodeURIComponent(courseCode),
                                                    title: 'ARK Wiki',
                                                    text_color: COLOR_DIY.black.main,
                                                    bg_color_diy: COLOR_DIY.wiki_bg_color,
                                                    isBarStyleBlack: true,
                                                };
                                                if (this.props.prof_info) {
                                                    webview_param.url = ARK_WIKI_SEARCH + encodeURIComponent(this.props.prof_info.name);
                                                    logToFirebase('checkCourse', {
                                                        courseCode: courseCode,
                                                        profName: this.props.prof_info.name,
                                                    });
                                                }
                                                else {
                                                    logToFirebase('checkCourse', {
                                                        courseCode: courseCode,
                                                        onLongPress: 0,
                                                    });
                                                }
                                                this.context.navigate('Webviewer', webview_param);
                                            },
                                        },
                                        {
                                            text: "打開選咩課",
                                            onPress: () => {
                                                ReactNativeHapticFeedback.trigger('soft');
                                                let webview_param = {
                                                    url: '',
                                                    title: '',
                                                    text_color: COLOR_DIY.white,
                                                    bg_color_diy: COLOR_DIY.what2reg_color,
                                                    isBarStyleBlack: false,
                                                };
                                                if (this.props.prof_info) {
                                                    // 進入搜索特定教授的課程模式，進入評論詳情頁
                                                    const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(this.props.prof_info.name)
                                                    webview_param.url = URI;
                                                    webview_param.title = courseCode;
                                                    logToFirebase('checkCourse', {
                                                        courseCode: courseCode,
                                                        profName: this.props.prof_info.name,
                                                    });
                                                }
                                                else {
                                                    // 進入搜索課程代號模式
                                                    const URI = `${WHAT_2_REG}/search.html?keyword=${encodeURIComponent(courseCode)}&instructor=${false}`
                                                    webview_param.url = URI;
                                                    webview_param.title = courseCode;
                                                    logToFirebase('checkCourse', {
                                                        courseCode: courseCode,
                                                        onLongPress: 0,
                                                    });
                                                }
                                                this.context.navigate('Webviewer', webview_param);
                                            },
                                        },
                                    ])
                            }}
                            onLongPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                logToFirebase('checkCourse', {
                                    courseCode: courseCode,
                                    onLongPress: 1,
                                });
                                this.context.navigate('LocalCourse', courseCode)
                            }}
                            // 獲取當前位置距離屏幕頂端的高度
                            onLayout={event => {
                                const { layout } = event.nativeEvent;
                                // 記錄首個出現的首字母的高度
                                'handleSetLetterData' in this.props && this.props.handleSetLetterData({ [courseCode[0]]: layout.y })
                            }}
                        >
                            {/* 課程編號與開課標識 */}
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                {this.renderCourseCode(courseCode)}
                                {/* Pre Enroll標記 */}
                                {preEnroll ? (
                                    <Text style={{
                                        fontSize: scale(10),
                                        fontWeight: 'bold',
                                        marginLeft: scale(5),
                                        color: secondThemeColor,
                                    }}>PreEnroll</Text>
                                ) : null}
                            </View>
                            <Text style={{
                                fontSize: scale(11),
                                color: black.second,
                            }}>{title}</Text>
                            {'courseTitleChi' in item && item.courseTitleChi.length > 0 ? (
                                <Text style={{
                                    fontSize: scale(11),
                                    color: black.second,
                                }}>{item.courseTitleChi}</Text>
                            ) : null}
                            {'Course Title Chi' in item && item['Course Title Chi'].length > 0 ? (
                                <Text style={{
                                    fontSize: scale(11),
                                    color: black.second,
                                }}>{item['Course Title Chi']}</Text>
                            ) : null}
                            <Text style={{
                                fontSize: scale(10),
                                color: black.third,
                            }}>
                                {offerUnit}
                                {offerDepa && (' - ' + offerDepa)}
                            </Text>
                            {credit ? (
                                <Text style={{
                                    fontSize: scale(10),
                                    color: black.third,
                                }}>{credit} Credit</Text>
                            ) : null}
                        </TouchableOpacity>
                    )
                }}
                key={data.length}
                keyExtractor={(item, index) => index}
                initialNumToRender={10}
                windowSize={21}
            />
        );
    }
}
