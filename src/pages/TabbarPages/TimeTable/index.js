import React, { Component } from 'react';
import {
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    FlatList,
} from "react-native";

import { UMEH_URI, UMEH_API, WHAT_2_REG } from "../../../utils/pathMap";
import { COLOR_DIY } from '../../../utils/uiMap';
import offerCourses from '../../../static/UMCourses/offerCourses.json';
import coursePlan from '../../../static/UMCourses/coursePlan.json';
import Loading from '../../../components/Loading';

import { scale } from "react-native-size-matters";
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import moment from 'moment-timezone';

const { themeColor, bg_color, black, white, viewShadow } = COLOR_DIY;

const coursePlanList = coursePlan.Courses;

// 每30分鐘的高度
const sideTimeItmHeight = scale(28);

let timeTableDataObj = {
    'MON': [],
    'TUE': [],
    'WED': [],
    'THU': [],
    'FRI': [],
    'SAT': [],
    'SUN': [],
}

const siwTimeTableStr = `TimeDay	Mon	Tue	Wed	Thur	Fri	Sat	Sun
11:30	11:30-12:45 ECEN2008(001)
E12-G003
(Lecture)	11:30-12:45 ECEN2008(001)
E11-G015
(Lab/Tutorial)	-	11:30-12:45 ECEN2008(001)
E12-G003
(Lecture)	11:30-12:45 ECEN2008(001)
E11-G015
(Lab/Tutorial)	-	-
12:00	-	-	-
12:30	-	-	-
13:00	-	-	-	-	-	-	-
13:30	-	-	-	-	-	-	-
14:00	-	14:00-15:45 ECEN3011(001)
E11-1028
(Lecture)	-	-	14:00-15:45 ECEN3011(001)
E11-1028
(Lab/Tutorial)	-	-
14:30	14:30-15:45 GESB2000(001)
E6-1113A
(Lecture)	-	14:30-15:45 GESB2000(001)
E6-1113A
(Lecture)	-	-
15:00	-	-	-
15:30	-	-	-
16:00	-	-	-	16:00-18:45 GELH2001(001)
E6-1102D
(Lecture)	-	-	-
16:30	-	-	-	-	-	-
17:00	-	-	-	-	-	-
17:30	-	-	-	-	-	-
18:00	-	-	-	-	-	-
18:30	-	-	-	-	-	-`

export default class index extends Component {
    constructor(props) {
        super(props);
        this.state = {
            timeTableDataArr: [],
        };

    }

    componentDidMount() {
        this.matchSIWTimetableStr(siwTimeTableStr);
    }

    matchSIWTimetableStr = (siwTimeTableStr) => {
        // 從文字中提取課程編號(可能包括Section Number)
        let courseCodeArr = siwTimeTableStr.match(/[A-Za-z]{4}[0-9]{3,4}((\/[0-9]{3})*)?( )?(\([0-9]{3}\))?/g);

        if (courseCodeArr.length === 0) {
            alert("您複製的文字中並未包含任何課程編號 / No course code is included in the copied text.");
        }
        else {
            let uniqeCourseCodeArr = courseCodeArr.map(itm => {
                // 前8位為Course Code，後3位為Section
                return itm.replace(/[\(\)]/g, "")
            })
            uniqeCourseCodeArr = uniqeCourseCodeArr.filter((item, index) => uniqeCourseCodeArr.findIndex(i => i === item) === index);

            let timeTableDataArr = [];
            uniqeCourseCodeArr.map(itm => {
                const courseCode = itm.substring(0, 8);
                const sectionNum = itm.substring(8, 12);
                let timeTableData = coursePlanList.filter(itm => {
                    return itm['Course Code'].toUpperCase().indexOf(courseCode) != -1
                        && itm['Section'].toUpperCase().indexOf(sectionNum) != -1
                });
                timeTableData.map(courseInfo => {
                    timeTableDataObj[courseInfo.Day].push(courseInfo);
                    timeTableDataArr.push(courseInfo['Time From'], courseInfo['Time To']);
                })
            })

            // 所有開課與結束課的時間
            timeTableDataArr = timeTableDataArr.filter((item, index) => timeTableDataArr.findIndex(i => i === item) === index);
            // 從早到晚排序
            timeTableDataArr.sort((a, b) => a.localeCompare(b));
            this.setState({ timeTableDataArr })
        }
    }

    renderDay = (dayName) => {
        const timeTablePlanDay = timeTableDataObj[dayName];

        return <View
            style={{
                alignItems: 'center',
                backgroundColor: white,
                width: timeTablePlanDay.length > 0 ? scale(90) : scale(30),
            }}
        // TODO: 啟動時快速導航到今天對應的課表
        // onLayout={(event) => {
        //     const { layout } = event.nativeEvent;
        //     console.log(layout);
        // }}
        >
            {/* 星期幾 */}
            <Text style={{ fontSize: scale(12), color: black.third }}>{dayName}</Text>
            {/* 星期與課表的分隔線 */}
            <View style={{
                height: scale(2),
                width: timeTablePlanDay.length > 0 ? scale(90) : scale(30),
                backgroundColor: COLOR_DIY.bg_color,
            }} />
            {/* 該天存在的課程 */}
            {timeTablePlanDay.length > 0 ? (
                timeTablePlanDay.map(itm =>
                    this.renderCourseBlock(itm)
                )
            ) : null}
        </View>
    }

    renderCourseBlock = (courseInfo) => {
        const { timeTableDataArr } = this.state;

        const begin_time = moment(timeTableDataArr[0], "HH:mm:ss");
        const start_time = moment(courseInfo['Time From'], "HH:mm:ss");
        const end_time = moment(courseInfo['Time To'], "HH:mm:ss");

        const diffHeight = end_time.diff(start_time, 'seconds') / 60
            / 30 * sideTimeItmHeight;
        const diffToTopHeight = start_time.diff(begin_time, 'seconds') / 60
            / 30 * sideTimeItmHeight
            + scale(20);

        return <View style={{
            alignItems: 'center', justifyContent: 'center',
            paddingHorizontal: scale(3),
            // TODO: 不同課程不同顏色，定義8種顏色
            backgroundColor: themeColor,
            borderRadius: scale(10),
            height: diffHeight,
            position: 'absolute',
            top: diffToTopHeight + scale(2),
        }}
            onLayout={(event) => {
                const { layout } = event.nativeEvent;
                console.log(layout.y);
            }}
        >
            <Text style={{ fontSize: scale(12), color: white }}>{courseInfo['Course Code']}</Text>
            <Text style={{ fontSize: scale(12), color: white }}>{courseInfo['Classroom']}</Text>
            <Text style={{ fontSize: scale(12), color: white }}>{courseInfo['Time From']} ~ {courseInfo['Time To']}</Text>
            <Text style={{ fontSize: scale(10), color: white }}>{courseInfo['Lecture / Lab']}</Text>
        </View>
    }

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: white, }}>
                <Header
                    backgroundColor={white}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                    containerStyle={{
                        // 修復頂部空白過多問題
                        height: Platform.select({
                            android: scale(38),
                            default: scale(35),
                        }),
                        paddingTop: 0,
                    }}
                />

                {/* 標題 */}
                <View style={{ alignSelf: 'center', paddingVertical: scale(5), paddingHorizontal: scale(10), }}>
                    <Text style={{ fontSize: scale(18), color: themeColor, fontWeight: '600' }}>ARK課表模擬</Text>
                </View>

                <ScrollView horizontal>
                    <View style={{ flexDirection: 'row', marginHorizontal: scale(3), }}>
                        {Object.keys(timeTableDataObj).map(itm => <>
                            {this.renderDay(itm)}
                            {/* 天與天之間的分隔線 */}
                            <View style={{ width: scale(2), backgroundColor: COLOR_DIY.bg_color }}></View>
                        </>)}
                    </View>
                </ScrollView>

            </View>
        );
    }
}
