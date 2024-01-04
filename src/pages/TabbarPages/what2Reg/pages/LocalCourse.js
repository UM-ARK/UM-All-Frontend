import React, { Component } from 'react'
import {
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    FlatList,
} from 'react-native'

import { COLOR_DIY, uiStyle, } from '../../../../utils/uiMap';
import Header from '../../../../components/Header';
import Loading from '../../../../components/Loading';
import { WHAT_2_REG, ARK_WIKI_SEARCH } from "../../../../utils/pathMap";
import { openLink } from "../../../../utils/browser";
import { logToFirebase } from "../../../../utils/firebaseAnalytics";
import coursePlanTime from "../../../../static/UMCourses/coursePlanTime";

import { scale } from "react-native-size-matters";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { NavigationContext } from '@react-navigation/native';
import { MenuView } from '@react-native-menu/menu';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;
const coursePlanList = coursePlanTime.Courses;

const daySorter = {
    'MON': 1,
    'THE': 2,
    'WED': 3,
    'THU': 4,
    'FRI': 5,
    'SAT': 6,
    'SUN': 7,
}

// 按星期一到星期天排序
function daySort(objArr) {
    return objArr.sort((a, b) => {
        let day1 = a.Day;
        let day2 = b.Day;
        return daySorter[day1] - daySorter[day2];
    })
}

export default class LocalCourse extends Component {
    static contextType = NavigationContext;
    state = {
        courseCode: this.props.route.params,
        isLoading: true,
    }

    componentDidMount() {
        const { courseCode } = this.state;

        let relateCourseList = coursePlanList.filter(itm => {
            return itm['Course Code'].toUpperCase().indexOf(courseCode) != -1
        });

        // 預選有，但課表時間Excel沒有的課程，直接跳轉選咩課
        if (relateCourseList.length == 0) {
            let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
            this.props.navigation.goBack();
            this.context.navigate('Wiki', { url: URL });
            // const URI = WHAT_2_REG + '/course/' + encodeURIComponent(courseCode);
            // const webview_param = {
            //     url: URI,
            //     title: courseCode,
            //     text_color: white,
            //     bg_color_diy: COLOR_DIY.what2reg_color,
            //     isBarStyleBlack: false,
            // };
            // this.props.navigation.navigate('Webviewer', webview_param);
        }
        else {
            // 按section分離課程數據
            let relateSectionObj = {};
            relateCourseList.map(itm => {
                let tempItm = relateSectionObj[itm.Section] ? relateSectionObj[itm.Section] : [];
                tempItm.push(itm);
                relateSectionObj[itm.Section] = tempItm;
            })
            this.setState({ relateSectionObj, courseInfo: relateCourseList[0], isLoading: false, })
        }
    }

    // 渲染可選section
    renderSchedules = (schedulesObj) => {
        const schedulesArr = Object.keys(schedulesObj);
        return (
            <FlatList
                data={schedulesArr}
                numColumns={schedulesArr.length}
                columnWrapperStyle={schedulesArr.length > 1 ? { flexWrap: 'wrap' } : null}
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => {
                    schedulesObj[itm] = daySort(schedulesObj[itm])
                    const courseInfo = schedulesObj[itm][0];
                    return (
                        <MenuView
                            onPressAction={({ nativeEvent }) => {
                                switch (nativeEvent.event) {
                                    case 'wiki':
                                        ReactNativeHapticFeedback.trigger('soft');
                                        let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseInfo['Teacher Information']);
                                        logToFirebase('checkCourse', {
                                            courseCode: courseInfo['Course Code'],
                                            profName: courseInfo['Teacher Information'],
                                        });
                                        this.context.navigate('Wiki', { url: URL });
                                        break;

                                    case 'what2reg':
                                        ReactNativeHapticFeedback.trigger('soft');
                                        const courseCode = courseInfo['Course Code'];
                                        const profName = courseInfo['Teacher Information'];
                                        const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(profName);
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            profName: profName,
                                        });
                                        openLink(URI);
                                        break;

                                    default:
                                        break;
                                }
                            }}
                            actions={[
                                {
                                    id: 'wiki',
                                    title: '查 ARK Wiki !!!  ε٩(๑> ₃ <)۶з',
                                    titleColor: themeColor,
                                },
                                {
                                    id: 'what2reg',
                                    title: '查 選咩課',
                                    titleColor: black.third,
                                },
                            ]}
                            shouldOpenOnLongPress={false}
                        >
                            <TouchableOpacity
                                style={{
                                    margin: scale(5),
                                    backgroundColor: white,
                                    borderRadius: scale(10),
                                    paddingVertical: scale(5), paddingHorizontal: scale(8),
                                    alignItems: 'center',
                                }}
                            // onPress={() => {
                            //     ReactNativeHapticFeedback.trigger('soft');
                            //     let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseInfo['Teacher Information']);
                            //     logToFirebase('checkCourse', {
                            //         courseCode: courseInfo['Course Code'],
                            //         profName: courseInfo['Teacher Information'],
                            //     });
                            //     this.context.navigate('Wiki', { url: URL });
                            // }}
                            >
                                <View style={{ alignItems: 'center', }}>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: themeColor }}>{courseInfo['Teacher Information']}</Text>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: black.third }}>{courseInfo.Section}</Text>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{courseInfo['Medium of Instruction']}</Text>
                                </View>

                                <View style={{ flexDirection: 'row', }}>
                                    {schedulesObj[itm].map(sameSection => {
                                        return (
                                            <View style={{
                                                margin: scale(5),
                                                alignItems: 'center',
                                            }}>
                                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{sameSection['Day']}</Text>
                                                {'Classroom' in sameSection && sameSection['Classroom'] ? (
                                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{sameSection['Classroom']}</Text>
                                                ) : null}
                                                {'Time From' in sameSection && sameSection['Time From'] ? (
                                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{sameSection['Time From']} ~ {sameSection['Time To']}</Text>
                                                ) : null}
                                            </View>
                                        )
                                    })}
                                </View>
                            </TouchableOpacity>
                        </MenuView>
                    )
                }}
                ListFooterComponent={() => <View style={{ marginBottom: scale(50) }} />}
            />
        )
    }

    render() {
        const { isLoading, courseCode, relateSectionObj, courseInfo } = this.state;

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={courseCode} />

                {isLoading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Loading />
                    </View>
                ) : (
                    <ScrollView contentContainerStyle={{ marginHorizontal: scale(5), }}>
                        {/* 課程基礎信息 */}
                        {courseInfo ? (
                            <View style={{ alignItems: 'center' }}>
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.main, textAlign: 'center', }}>{courseInfo['Course Title']}</Text>
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third, textAlign: 'center', }}>{courseInfo['Course Title Chi']}</Text>
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>
                                    {courseInfo['Offering Unit']}
                                    {courseInfo['Offering Department'] ? <Text>{' - ' + courseInfo['Offering Department']}</Text> : null}
                                </Text>
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{courseInfo['Course Type']}</Text>
                            </View>
                        ) : null}

                        {/* 可選教授和Section */}
                        {relateSectionObj ? (
                            this.renderSchedules(relateSectionObj)
                        ) : null}
                    </ScrollView>
                )}
            </View>
        )
    }
}
