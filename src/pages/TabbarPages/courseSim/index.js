import React, { Component } from 'react';
import {
    View,
    Text,
    ScrollView,
    Button,
    TouchableOpacity,
    Alert,
    StyleSheet,
    TextInput,
} from 'react-native';

import { scale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';

import { COLOR_DIY, uiStyle, TIME_TABLE_COLOR, } from '../../../utils/uiMap';
import coursePlanFile from '../../../static/UMCourses/coursePlanTime';
import { openLink } from "../../../utils/browser";
import { UM_ISW, } from "../../../utils/pathMap";

const { themeColor, black, white, viewShadow, bg_color, unread, } = COLOR_DIY;
const iconSize = scale(25);
const courseTimeList = coursePlanFile.Courses;

const dayList = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

// 設置本地緩存
async function setLocalStorage(courseCodeList) {
    try {
        const strCourseCodeList = JSON.stringify(courseCodeList);
        await AsyncStorage.setItem('ARK_Timetable_Storage', strCourseCodeList)
            .catch(e => console.log('AsyncStorage Error', e));
    } catch (e) {
        alert(e);
    }
}

function parseImportData(inputText) {
    let matchRes = inputText.match(/[A-Za-z]{4}[0-9]{3,4}((\/[0-9]{3})*)?( )?(\([0-9]{3}\))?/g);

    if (matchRes && matchRes.length > 0) {
        // 去重
        matchRes = matchRes.filter((item, index) => matchRes.findIndex(i => i === item) === index);

        // 構建數據格式 Array
        let courseCodeList = [];
        matchRes.map(text => {
            let lbIdx = text.indexOf("(");
            let rbIdx = text.indexOf(")");
            let courseCode = text.substring(0, lbIdx);
            let section = text.substring(lbIdx + 1, rbIdx);
            let obj = {
                'Course Code': courseCode,
                'Section': section
            }
            courseCodeList.push(obj);
        })

        return courseCodeList;
    }
    else {
        alert('輸入的數據有誤！\n請再嘗試！')
    }
}

// TODO: 目標
// * 查看某CourseCode的可選Section、老師
// * 查看某時間段可選的CourseCode、Section
export default class courseSim extends Component {
    state = {
        // 導入課表功能
        // importTimeTableText: null,
        importTimeTableText: `
        TimeDay	Mon	Tue	Wed	Thur	Fri	Sat	Sun
        9:00	09:00-10:45 ECEN3019(001)
        E11-1018
        (Lecture)	-	-	09:00-10:45 ECEN3019(001)
        E11-1018
        (Lab/Tutorial)	-	-	-
        9:30	-	-	-	-	-
        10:00	-	-	-	-	-
        10:30	-	-	-	-	-
        11:00	-	-	-	-	-	-	-
        11:30	-	-	-	-	-	-	-
        12:00	-	-	-	-	-	-	-
        12:30	-	-	-	-	-	-	-
        13:00	-	-	-	-	-	-	-
        13:30	-	-	-	-	-	-	-
        14:00	-	-	-	-	-	-	-
        14:30	-	14:30-15:45 COMM2003(002)
        E22-4004
        (Lecture)	-	-	14:30-15:45 COMM2003(002)
        E22-4004
        (Lecture)	-	-
        15:00	-	-	-	-	-
        15:30	-	-	-	-	-
        16:00	-	-	-	-	-	-	-
        16:30	-	-	-	-	-	-	-
        17:00	-	17:00-18:45 ECEN3025(001)
        E11-1028
        (Lecture)	-	-	17:00-18:45 ECEN3025(001)
        E11-1028
        (Lab/Tutorial)	-	-
        17:30	-	-	-	-	-
        18:00	-	-	-	-	-
        18:30	-	-	-	-	-`,

        allCourseAllTime: [],
    }

    async componentDidMount() {
        const strCourseCodeList = await AsyncStorage.getItem('ARK_Timetable_Storage');
        const courseCodeList = strCourseCodeList ? JSON.parse(strCourseCodeList) : null;

        // const courseCodeList = [
        //     {
        //         'Course Code': 'JAPN1002',
        //         'Section': '001',
        //     },
        //     {
        //         'Course Code': 'MATH2008',
        //         'Section': '001',
        //     },
        //     {
        //         'Course Code': 'MATH2007',
        //         'Section': '001',
        //     },
        //     {
        //         'Course Code': 'MATH3008',
        //         'Section': '001',
        //     },
        //     {
        //         'Course Code': 'MATH3018',
        //         'Section': '001',
        //     },
        //     {
        //         'Course Code': 'CPED1001',
        //         'Section': '003',
        //     },
        // ];

        if (courseCodeList && courseCodeList.length > 0) {
            this.handleCourseList(courseCodeList);
        }
    }

    // 處理課表數據，分析出用於render的數據
    handleCourseList = (courseCodeList) => {
        let courseScheduleByCode = {};
        courseCodeList.map(i => {
            courseScheduleByCode[i['Course Code']] = courseTimeList.filter(itm => {
                return itm['Course Code'] == i['Course Code'] && itm['Section'] == i['Section']
            });
        })

        let allCourseAllTime = [];
        courseCodeList.map((i, idx) => {
            // 某課程一星期所有的上課時間
            let singleCourseAllTime = courseScheduleByCode[i['Course Code']];
            // 插入自定義的課表顏色
            singleCourseAllTime.map(itm => {
                itm['color'] = TIME_TABLE_COLOR[idx];
            })
            // 一星期所有課程的上課時間
            allCourseAllTime.push(...singleCourseAllTime);
        })

        this.setState({ allCourseAllTime })
        setLocalStorage(courseCodeList);
    }

    // 渲染一列（一天）的課表
    renderDay = (day) => {
        const { allCourseAllTime } = this.state;
        // 獲取該天所有的課程數據
        let dayCourseList = allCourseAllTime.filter(course => course['Day'] == day)

        if (dayCourseList.length > 0) {
            // 按上課時間Time From排序
            dayCourseList = dayCourseList.sort((a, b) => {
                return a['Time From'].localeCompare(b['Time From'])
            });

            return (
                <View style={{ width: scale(135), }}>
                    {/* 星期幾 */}
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        fontSize: scale(25), fontWeight: 'bold',
                        alignSelf: 'center',
                    }}>{day}</Text>
                    <View style={{ flexDirection: 'column', }}>
                        {dayCourseList.map((course, idx) => this.renderCourse(course, dayCourseList, idx))}
                    </View>
                </View>
            )
        }
    }

    // 渲染課表卡片
    renderCourse = (course, dayCourseList, idx) => {
        let timeReminder = null;
        let timeWarning = false;
        if (idx > 0) {
            let lastEnd = moment(dayCourseList[idx - 1]['Time To'], "HH:mm:ss");
            let courseBegin = moment(course['Time From'], "HH:mm:ss");
            let secDiff = courseBegin.diff(lastEnd, 'seconds');
            let minuteDiff = secDiff / 60;
            let hourDiff = (minuteDiff / 60).toFixed(2);

            if (secDiff < 0) {
                timeWarning = true;
            }

            if (idx < dayCourseList.length) {
                timeReminder = <Text
                    style={{
                        ...uiStyle.defaultText,
                        alignSelf: 'center',
                        color: timeWarning ? unread : black.third,
                        fontWeight: timeWarning ? 'bold' : null,
                        textAlign: 'center',
                    }}
                >
                    休息
                    <Text style={{ fontWeight: 'bold', color: timeWarning ? unread : themeColor, }}>
                        {hourDiff >= 1 ? `${hourDiff}` : `${minuteDiff}`}
                    </Text>
                    {hourDiff >= 1 ? `小時` : `分鐘`}
                    {timeWarning ? <Text>{'\n🆘課程衝突🆘'}</Text> : null}
                </Text>
            }
        }

        if (idx == 0 && dayCourseList.length > 1) {
            let firstEnd = moment(course['Time To'], "HH:mm:ss");
            let secondBegin = moment(dayCourseList[idx + 1]['Time From'], "HH:mm:ss");
            let secDiff = secondBegin.diff(firstEnd, 'seconds');
            if (secDiff < 0) {
                timeWarning = true;
            }
        }

        return (
            <View>
                {timeReminder}

                <TouchableOpacity
                    style={{
                        margin: scale(5),
                        backgroundColor: timeWarning ? unread : course['color'],
                        borderRadius: scale(10),
                        padding: scale(5),
                        alignItems: 'center', justifyContent: 'center',
                    }}
                    activeOpacity={0.8}
                    onPress={() => {
                        Alert.alert("",
                            `想做些什麼`,
                            [
                                {
                                    text: "Drop",
                                    onPress: () => {
                                        Alert.alert("",
                                            `要在模擬課表中Drop掉這節課嗎`,
                                            [
                                                {
                                                    text: "Yes",
                                                    onPress: () => {
                                                    },
                                                },
                                                {
                                                    text: "No",
                                                },
                                            ],
                                            { cancelable: true, }
                                        );
                                    },
                                    style: 'destructive',
                                },
                                {
                                    text: "Change",
                                    onPress: () => {
                                    },
                                },
                                {
                                    text: "取消",
                                    style: 'cancel',
                                },
                            ],
                            { cancelable: true, }
                        );
                    }}
                    onLongPress={() => {
                        Alert.alert("",
                            `想看什麼信息`,
                            [
                                {
                                    text: "教授",
                                    onPress: () => {
                                    },
                                },
                                {
                                    text: "課程",
                                    onPress: () => {
                                    },
                                },
                                {
                                    text: "取消",
                                },
                            ],
                            { cancelable: true, }
                        );
                    }}
                    delayLongPress={300}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: white,
                        fontSize: scale(15),
                        textAlign: 'center',
                        fontWeight: '700',
                    }}>
                        {course['Course Code'].substring(0, 4) + '\n'}<Text style={{ fontSize: scale(20), fontWeight: 'bold', }}>{course['Course Code'].substring(4, 8)}</Text>
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, color: white, }}>{course['Section']}</Text>

                    <Text style={{ ...uiStyle.defaultText, color: white, textAlign: 'center', }} numberOfLines={4}>{course['Course Title']}</Text>
                    <Text style={{ ...uiStyle.defaultText, color: white, }}>{course['Classroom']}</Text>

                    {/* 上課時間 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
                        {/* 開始時間 */}
                        <Text style={{ ...uiStyle.defaultText, color: COLOR_DIY.trueBlack, }}>
                            {course['Time From']}
                        </Text>
                        {/* 引導用戶操作圖標 */}
                        <Ionicons
                            name="ellipsis-horizontal"
                            size={scale(20)}
                            color={white}
                        />
                        {/* 結束時間 */}
                        <Text style={{ ...uiStyle.defaultText, color: COLOR_DIY.trueBlack, }}>
                            {course['Time To']}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>
        )
    }

    // 導入ISW課表數據
    importCourseData = () => {
        const { importTimeTableText } = this.state;
        let parseRes = parseImportData(importTimeTableText);
        this.handleCourseList(parseRes);
    }

    addCourse = () => {
        alert('手動Add課')
    }

    changeCourse = () => {

    }

    dropCourse = () => {

    }

    clearCourse = () => {
        Alert.alert(``, `確定要清空當前的模擬課表嗎？`, [
            {
                text: '確定清空',
                onPress: () => {
                    this.setState({ allCourseAllTime: [] });
                    setLocalStorage([]);
                }
            },
            {
                text: 'No',
            },
        ], { cancelable: true })
    }

    render() {
        const { allCourseAllTime, } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: bg_color, }}>
                <Header
                    backgroundColor={bg_color}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: COLOR_DIY.barStyle,
                    }}
                    containerStyle={{
                        // 修復頂部空白過多問題
                        height: Platform.select({
                            android: scale(38),
                            default: scale(35),
                        }),
                        paddingTop: 0,
                        // 修復深色模式頂部小白條問題
                        borderBottomWidth: 0,
                    }}
                />

                {/* 頁面標題 */}
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', }}>
                    {/* 清空所有課表功能按鈕 */}
                    <TouchableOpacity style={{
                        position: 'absolute',
                        left: scale(10),
                        backgroundColor: unread,
                        borderRadius: scale(10),
                        padding: scale(5),
                    }}
                        onPress={this.clearCourse}
                    >
                        <Text style={{ color: white, }}>Clear</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', alignSelf: 'center' }}>
                        {/* ARK Logo */}
                        <FastImage
                            source={require('../../../static/img/logo.png')}
                            style={{
                                height: iconSize, width: iconSize,
                                borderRadius: scale(5),
                            }}
                        />
                        {/* 標題 */}
                        <View style={{ marginLeft: scale(5) }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(18), color: themeColor, fontWeight: '600' }}>課表模擬</Text>
                        </View>
                    </View>

                    {/* Add課功能按鈕 */}
                    <TouchableOpacity style={{
                        position: 'absolute',
                        right: scale(10),
                        backgroundColor: themeColor,
                        borderRadius: scale(10),
                        padding: scale(5),
                    }}
                        onPress={this.addCourse}
                    >
                        <Text style={{ color: white, }}>Add</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    {allCourseAllTime && allCourseAllTime.length > 0 ? (
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={{ marginHorizontal: scale(5) }}>
                            {dayList.map(day => {
                                return this.renderDay(day);
                            })}
                        </ScrollView>
                    ) : (
                        // 首次使用提示
                        <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: scale(10), marginHorizontal: scale(5), }}>
                            <Text style={{ ...s.firstUseText, }}>{`🎊快來使用課表模擬功能🎊\n(ﾉ>ω<)ﾉ (ﾉ>ω<)ﾉ (ﾉ>ω<)ﾉ\n\n我可以：`}</Text>

                            {/* TODO: Add課按鈕 */}
                            <Text style={{ ...s.firstUseText, }}>{`1. 右上角“Add”按鈕，自己動手！\n\n或者\n`}</Text>

                            <Text style={{ ...s.firstUseText, }}>{`2. 點擊下方按鈕進入ISW Timetable，\n複製真正的課表到下方輸入框粘貼，\n然後一鍵導入！`}</Text>

                            {/* 跳轉ISW按鈕 */}
                            <TouchableOpacity style={{ ...s.buttonContainer, }}
                                onPress={() => { openLink(UM_ISW); }}
                            >
                                <Text style={{ ...s.firstUseText, color: white, }}>2.1 進入ISW複製</Text>
                            </TouchableOpacity>
                            {/* 粘貼課表數據 */}
                            <TextInput
                                editable
                                multiline
                                numberOfLines={6}
                                onChangeText={text => {
                                    this.setState({ importTimeTableText: text });
                                }}
                                placeholder={`全選、複製、粘貼真實課表到這裡，例如：
TimeDay	Mon	Tue	Wed	Thur	Fri	Sat	Sun
9:00	09:00-10:45 ECEN0000(001)
E11-0000
(Lecture)	-	-	09:00-10:45 ECEN0000(001)
E11-0000
(Lab/Tutorial)	-	-	-
9:30	-	-	-	-	-
18:30	-	-	-	-	-
                                `}
                                placeholderTextColor={black.third}
                                value={this.state.importTimeTableText}
                                style={{
                                    backgroundColor: white,
                                    padding: 10,
                                    borderRadius: scale(10),
                                    width: '90%',
                                    color: black.main,
                                }}
                            />
                            {/* 導入課表按鈕 */}
                            <TouchableOpacity
                                style={{
                                    ...s.buttonContainer,
                                    backgroundColor: this.state.importTimeTableText ? COLOR_DIY.success : 'gray',
                                }}
                                onPress={this.importCourseData}
                                disabled={!this.state.importTimeTableText}
                            >
                                <Text style={{ ...s.firstUseText, color: white, }}>2.2 一鍵導入到模擬課表</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            </View >
        );
    }
}

const s = StyleSheet.create({
    firstUseText: {
        ...uiStyle.defaultText,
        color: themeColor,
        fontWeight: 'bold',
        fontSize: scale(20),
        textAlign: 'center',
    },
    buttonContainer: {
        backgroundColor: themeColor,
        borderRadius: scale(10),
        padding: scale(10),
        margin: scale(10),
    },
});