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
import DateTimePickerModal from 'react-native-modal-datetime-picker';

import { COLOR_DIY, uiStyle, TIME_TABLE_COLOR, } from '../../../utils/uiMap';
import coursePlanTimeFile from '../../../static/UMCourses/coursePlanTime';
import coursePlanFile from '../../../static/UMCourses/coursePlan';
import { openLink } from "../../../utils/browser";
import { UM_ISW, ARK_WIKI_SEARCH, } from "../../../utils/pathMap";

const { themeColor, black, white, viewShadow, bg_color, unread, } = COLOR_DIY;
const iconSize = scale(25);
const courseTimeList = coursePlanTimeFile.Courses;
const coursePlanList = coursePlanFile.Courses;

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

// 返回搜索候選所需的課程列表
handleSearchFilterCourse = (inputText) => {
    let filterCourseList = [];

    filterCourseList = coursePlanList.filter(itm => {
        return itm['Course Code'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title Chi'].indexOf(inputText) != -1
    });

    // 篩選課表時間Excel的數據
    // if (courseTimeList.length > 0) {
    //     let coursePlanSearchList = courseTimeList.filter(itm => {
    //         return itm['Course Code'].toUpperCase().indexOf(inputText) != -1
    //             || itm['Course Title'].toUpperCase().indexOf(inputText) != -1
    //             || itm['Teacher Information'].toUpperCase().indexOf(inputText) != -1
    //             || (itm['Day'] && itm['Day'].toUpperCase().indexOf(inputText) != -1)
    //             || (itm['Offering Department'] && itm['Offering Department'].toUpperCase().indexOf(inputText) != -1)
    //             || itm['Offering Unit'].toUpperCase().indexOf(inputText) != -1
    //             || itm['Course Title Chi'].indexOf(inputText) != -1
    //     });

    //     // 搜索合併
    //     filterCourseList = filterCourseList.concat(coursePlanSearchList)
    //     // 搜索去重
    //     filterCourseList = filterCourseList.filter((item, index) => filterCourseList.findIndex(i => i['Course Code'] === item['Course Code']) === index);
    // }

    // // 搜索結果排序
    // filterCourseList.sort((a, b) => a['Course Code'].substring(4, 8).localeCompare(b['Course Code'].substring(4, 8), 'es', { sensitivity: 'base' }));
    // filterCourseList.sort((a, b) => a['Course Code'].substring(0, 3).localeCompare(b['Course Code'].substring(0, 3), 'es', { sensitivity: 'base' }));

    return filterCourseList
}

// TODO: 目標
// * 查看某時間段可選的CourseCode、Section
// TODO: Press 震動
export default class courseSim extends Component {
    state = {
        // 導入課表功能
        importTimeTableText: null,
        // importTimeTableText: `
        // TimeDay	Mon	Tue	Wed	Thur	Fri	Sat	Sun
        // 9:00	09:00-10:45 ECEN3019(001)
        // E11-1018
        // (Lecture)	-	-	09:00-10:45 ECEN3019(001)
        // E11-1018
        // (Lab/Tutorial)	-	-	-
        // 9:30	-	-	-	-	-
        // 10:00	-	-	-	-	-
        // 10:30	-	-	-	-	-
        // 11:00	-	-	-	-	-	-	-
        // 11:30	-	-	-	-	-	-	-
        // 12:00	-	-	-	-	-	-	-
        // 12:30	-	-	-	-	-	-	-
        // 13:00	-	-	-	-	-	-	-
        // 13:30	-	-	-	-	-	-	-
        // 14:00	-	-	-	-	-	-	-
        // 14:30	-	14:30-15:45 COMM2003(002)
        // E22-4004
        // (Lecture)	-	-	14:30-15:45 COMM2003(002)
        // E22-4004
        // (Lecture)	-	-
        // 15:00	-	-	-	-	-
        // 15:30	-	-	-	-	-
        // 16:00	-	-	-	-	-	-	-
        // 16:30	-	-	-	-	-	-	-
        // 17:00	-	17:00-18:45 ECEN3025(001)
        // E11-1028
        // (Lecture)	-	-	17:00-18:45 ECEN3025(001)
        // E11-1028
        // (Lab/Tutorial)	-	-
        // 17:30	-	-	-	-	-
        // 18:00	-	-	-	-	-
        // 18:30	-	-	-	-	-`,

        courseCodeList: [],
        allCourseAllTime: [],

        addMode: false,
        searchText: '',
    }

    async componentDidMount() {
        const strCourseCodeList = await AsyncStorage.getItem('ARK_Timetable_Storage');
        const courseCodeList = strCourseCodeList ? JSON.parse(strCourseCodeList) : null;

        if (courseCodeList && courseCodeList.length > 0) {
            this.handleCourseList(courseCodeList);
        }
    }

    // 處理課表數據，分析出用於render的數據
    handleCourseList = (courseCodeList) => {
        let courseScheduleByCode = {};
        courseCodeList.map(i => {
            let tempArr = [];
            courseTimeList.map(itm => {
                if (itm['Course Code'] == i['Course Code'] && itm['Section'] == i['Section']) {
                    tempArr.push(itm);
                }
            })

            if (courseScheduleByCode[i['Course Code']]) {
                tempArr.push(...courseScheduleByCode[i['Course Code']]);
            }
            courseScheduleByCode[i['Course Code']] = tempArr;
        })

        let allCourseAllTime = [];
        // 上一步已將可能相同的Code的多個Section數據放到同一個對象中
        // 對courseCodeList去重
        let codeListTemp = JSON.parse(JSON.stringify(courseCodeList));
        codeListTemp = codeListTemp.filter((item, index) => codeListTemp.findIndex(i => i['Course Code'] === item['Course Code']) === index);
        codeListTemp.map((i, idx) => {
            // 某課程一星期所有的上課時間
            let singleCourseAllTime = courseScheduleByCode[i['Course Code']];
            // 插入自定義的課表顏色
            singleCourseAllTime.map(itm => {
                itm['color'] = TIME_TABLE_COLOR[idx];
            })
            // 一星期所有課程的上課時間
            allCourseAllTime.push(...singleCourseAllTime);
        })

        this.setState({ allCourseAllTime, courseCodeList });
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
                        // TODO: Firebase
                        Alert.alert("", `想知道關於${course['Course Code']}的...\n(長按可以刪除課程...)`,
                            [
                                {
                                    text: "可選Section/老師",
                                    onPress: () => {
                                        this.props.navigation.navigate('LocalCourse', course['Course Code']);
                                    },
                                },
                                {
                                    text: "課程Wiki",
                                    onPress: () => {
                                        const URL = ARK_WIKI_SEARCH + encodeURIComponent(course['Course Code']);
                                        this.props.navigation.navigate('Wiki', { url: URL });
                                    },
                                },
                                {
                                    text: "取消",
                                },
                            ],
                            { cancelable: true, }
                        );
                    }}
                    onLongPress={() => {
                        // TODO: Firebase
                        Alert.alert(``, `要在模擬課表中刪除${course['Course Code']}-${course['Section']}嗎？`,
                            [
                                {
                                    text: "Drop",
                                    onPress: () => {
                                        this.dropCourse(course);
                                    },
                                    style: 'destructive',
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
                        fontSize: scale(20),
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

    addCourse = (course) => {
        // TODO: Firebase
        let { courseCodeList } = this.state;
        let tempArr = [];
        courseCodeList.map(i => {
            if (i['Course Code'] != course['Course Code']) {
                tempArr.push(i);
            }
        })
        courseCodeList = tempArr;
        courseCodeList.push({
            'Course Code': course['Course Code'],
            'Section': course['Section'],
        })
        this.handleCourseList(courseCodeList);
    }

    addAllSectionCourse = (courseCode, sectionObj) => {
        let courseCodeList = this.state.courseCodeList;
        // 刪除原多餘的相同Code
        let tempArr = [];
        courseCodeList.map(itm => {
            if (itm['Course Code'] != courseCode) {
                tempArr.push(itm);
            }
        })
        courseCodeList = tempArr;
        // 插入所有Section
        Object.keys(sectionObj).map(key => {
            courseCodeList.push({
                'Course Code': courseCode,
                'Section': key,
            })
        })
        this.handleCourseList(courseCodeList);
    }

    changeCourse = (changeCourseInfo) => {
        // TODO: Firebase
        alert('Change課')
    }

    // 刪除所選課程
    dropCourse = (course) => {
        // TODO: Firebase
        const { courseCodeList } = this.state;
        let newList = [];
        courseCodeList.map(i => {
            if (!(i['Course Code'] == course['Course Code'] && i['Section'] == course['Section'])) {
                newList.push(i);
            }
        })
        this.handleCourseList(newList);
    }

    clearCourse = () => {
        Alert.alert(``, `確定要清空當前的模擬課表嗎？`, [
            {
                text: '確定清空',
                onPress: () => {
                    this.setState({
                        allCourseAllTime: [],
                        courseCodeList: [],
                    });
                    setLocalStorage([]);
                },
                style: 'destructive',
            },
            {
                text: 'No',
            },
        ], { cancelable: true })
    }

    render() {
        const { allCourseAllTime, } = this.state;
        const filterCourseList = handleSearchFilterCourse(this.state.searchText);
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
                    {allCourseAllTime && allCourseAllTime.length > 0 && (
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
                    )}

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
                        onPress={() => {
                            // 切換加課模式
                            this.setState({ addMode: !this.state.addMode })
                        }}
                    >
                        <Text style={{ color: white, }}>Add</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView>
                    <View style={{ flexDirection: 'row', width: '100%' }}>
                        <View style={{ width: this.state.addMode ? '65%' : '100%' }}>
                            {allCourseAllTime && allCourseAllTime.length > 0 ? (<View >
                                {/* 渲染已保存的課表數據 */}
                                <ScrollView
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    style={{ marginHorizontal: scale(5) }}>
                                    {dayList.map(day => {
                                        return this.renderDay(day);
                                    })}
                                </ScrollView>
                            </View>) : (
                                // 首次使用提示
                                <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: scale(10), marginHorizontal: scale(5), }}>
                                    <Text style={{ ...s.firstUseText, }}>{`如何開始使用模擬課表？\n`}</Text>

                                    {/* Add課按鈕提示 */}
                                    <Text style={{ ...s.firstUseText, }}>{`選項1：右上角“Add”按鈕，自己動手！\n`}</Text>

                                    <Text style={{ ...s.firstUseText, }}>{`選項2：全選、複製ISW真正課表，\n到下方框框粘貼，\n然後一鍵導入！`}</Text>

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
                                        placeholder={`Example：
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
                        </View>

                        {/* 渲染選課的篩選列表 */}
                        {this.state.addMode && (<View style={{ width: '35%' }}>
                            {/* TODO: 時間篩選 */}
                            {false && (
                                <View>
                                    <Text>時間篩選</Text>
                                    {/* <DateTimePickerModal
                                    isVisible={this.state.addMode}
                                    // date={startDate}
                                    mode="time"
                                    onConfirm={date => {
                                        
                                    }}
                                    onCancel={() => {
                                        
                                    }}
                                /> */}
                                </View>
                            )}

                            {/* 輸入框 */}
                            <View style={{
                                borderColor: themeColor,
                                borderWidth: scale(1), borderRadius: scale(10),
                                marginHorizontal: scale(3),
                            }}>
                                {/* <Text>Add課輸入框</Text> */}
                                <TextInput
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: black.main,
                                        fontSize: scale(12),
                                        paddingVertical: scale(2),
                                    }}
                                    onChangeText={(inputText) => {
                                        this.setState({ searchText: inputText.toUpperCase(), });
                                    }}
                                    value={this.state.searchText}
                                    selectTextOnFocus
                                    placeholder="ECE, 電氣, AIM..."
                                    placeholderTextColor={black.third}
                                    returnKeyType={'search'}
                                    selectionColor={themeColor}
                                />
                            </View>

                            {/* 渲染搜索課程的結果 */}
                            {this.state.searchText && filterCourseList.length > 0
                                ? (filterCourseList.map(i => {
                                    // 從courseTimeList篩選所有的課程的Section、時間、老師
                                    let sectionObj = {};
                                    if (filterCourseList.length == 1) {
                                        let codeRes = courseTimeList.filter(itm => {
                                            return itm['Course Code'].toUpperCase().indexOf(i['Course Code']) != -1
                                        });
                                        codeRes.map(itm => {
                                            let tempArr = sectionObj[itm['Section']] ? (sectionObj[itm['Section']]) : [];
                                            tempArr.push(itm);
                                            sectionObj[itm['Section']] = tempArr;
                                        })
                                    }

                                    return (<View>
                                        {/* 刪除該Code課程按鈕 */}
                                        {filterCourseList.length == 1 && sectionObj && (
                                            <TouchableOpacity
                                                style={{
                                                    ...s.buttonContainer,
                                                    backgroundColor: unread,
                                                    padding: scale(3),
                                                }}
                                                onPress={() => {
                                                    let { courseCodeList } = this.state;
                                                    let tempArr = [];
                                                    courseCodeList.map(itm => {
                                                        if (itm['Course Code'] != i['Course Code']) {
                                                            tempArr.push(itm);
                                                        }
                                                    })
                                                    courseCodeList = tempArr;
                                                    this.handleCourseList(courseCodeList);
                                                }}
                                            >
                                                <Text style={{
                                                    ...s.searchResultText,
                                                    color: COLOR_DIY.trueWhite,
                                                }} >{`刪除所有${i['Course Code']}`}</Text>
                                            </TouchableOpacity>
                                        )}

                                        {filterCourseList.length == 1 && sectionObj && (
                                            <Text style={{ ...s.searchResultText, }}>↓ 全部放入課表</Text>
                                        )}

                                        {/* 課程標題 */}
                                        <TouchableOpacity
                                            style={{
                                                marginBottom: scale(10),
                                                borderBottomWidth: scale(1),
                                                borderColor: themeColor,
                                            }}
                                            onPress={() => {
                                                this.addAllSectionCourse(i['Course Code'], sectionObj);
                                                // 切換searchText為點擊的Code
                                                this.setState({ searchText: i['Course Code'] });
                                            }}
                                        >
                                            <Text style={{
                                                ...s.searchResultText,
                                                fontSize: scale(15),
                                                color: filterCourseList.length == 1 ? themeColor : black.third,
                                                fontWeight: 'bold',
                                            }}>{i['Course Code']}</Text>
                                            <Text style={{ ...s.searchResultText, }}>{i['Course Title']}</Text>
                                            <Text style={{ ...s.searchResultText, }}>{i['Course Title Chi']}</Text>
                                        </TouchableOpacity>

                                        {/* 只剩一節候選課程時，展示可選Section */}
                                        {filterCourseList.length == 1 && sectionObj && (<>
                                            <Text style={{ ...s.searchResultText, }}>↓ 選取單節</Text>
                                            {Object.keys(sectionObj).map(key => {
                                                return <TouchableOpacity
                                                    style={{ marginBottom: scale(5), }}
                                                    onPress={() => {
                                                        this.addCourse(sectionObj[key][0]);
                                                    }}
                                                >
                                                    {/* Section號碼 */}
                                                    <Text style={{ ...s.searchResultText, color: themeColor, fontSize: scale(15), }}>{key}</Text>
                                                    {/* 老師名 */}
                                                    <Text style={{ ...s.searchResultText, }}>{sectionObj[key][0]['Teacher Information']}</Text>
                                                    {/* 該Section上課時間 */}
                                                    {sectionObj[key].map(itm => {
                                                        return <View>
                                                            <Text style={{ ...s.searchResultText, }}>{itm['Day'] + ' ' + itm['Time From'] + ' ~ ' + itm['Time To']}</Text>
                                                            {/* <Text>{itm['Time From'] + '~' + itm['Time To']}</Text> */}
                                                        </View>
                                                    })}
                                                </TouchableOpacity>
                                            })}
                                        </>)}
                                    </View>)
                                })
                                ) : null}
                        </View>)}
                    </View>
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
    searchResultText: {
        ...uiStyle.defaultText,
        color: black.third,
        textAlign: 'center',
    },
});