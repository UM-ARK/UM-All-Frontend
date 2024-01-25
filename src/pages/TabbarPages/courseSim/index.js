import React, { Component } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Alert,
    StyleSheet,
    TextInput,
    Keyboard,
    FlatList,
} from 'react-native';

import { scale } from 'react-native-size-matters';
import FastImage from 'react-native-fast-image';
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import TouchableScale from "react-native-touchable-scale";
import { MenuView } from '@react-native-menu/menu';

import { COLOR_DIY, uiStyle, TIME_TABLE_COLOR, } from '../../../utils/uiMap';
import coursePlanTimeFile from '../../../static/UMCourses/coursePlanTime';
import coursePlanFile from '../../../static/UMCourses/coursePlan';
import { openLink } from "../../../utils/browser";
import { UM_ISW, ARK_WIKI_SEARCH, WHAT_2_REG, OFFICIAL_COURSE_SEARCH, } from "../../../utils/pathMap";
import { logToFirebase } from "../../../utils/firebaseAnalytics";
import Toast from 'react-native-simple-toast';

const { themeColor, themeColorUltraLight, black, white, bg_color, unread, } = COLOR_DIY;
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
    let matchRes = inputText.match(/[A-Z]{4}[0-9]{4}((\/[0-9]{4})+)?(\s)?(\([0-9]{3}\))/g);

    if (matchRes && matchRes.length > 0) {
        // 去重
        matchRes = matchRes.filter((item, index) => matchRes.findIndex(i => i === item) === index);

        // 構建數據格式 Array
        let courseCodeList = [];
        matchRes.map(text => {
            // Section部份左右括號的index
            let lbIdx = text.indexOf("(");
            let rbIdx = text.indexOf(")");
            // 對於特殊的 GESB1001/1002/1003，記錄 / 從左到右第一次出現的index，不存在 / 時返回 -1
            let slashIdx = text.indexOf("/");

            // 定位至CourseCode後一位的index
            // 例：GESB1001/1002，courseCodeBound = 8
            // 例：GEGA1000(001)，courseCodeBound = 8
            let courseCodeBound = slashIdx == -1 ? lbIdx : slashIdx;

            // 截取CourseCode的字符
            let courseCode = text.substring(0, courseCodeBound);
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
        return null
    }
}

// 返回搜索候選所需的課程列表
handleSearchFilterCourse = (inputText) => {
    let filterCourseList = [];

    filterCourseList = coursePlanList.filter(itm => {
        return itm['Course Code'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title Chi'].indexOf(inputText) != -1
            || itm['Teacher Information'].indexOf(inputText) != -1
            || (itm['Offering Department'] && itm['Offering Department'].indexOf(inputText) != -1)
    });

    return filterCourseList
}

// TODO: 查看某時間段可選的CourseCode、Section
export default class courseSim extends Component {
    constructor() {
        super();
        this.verScroll = React.createRef();
        this.textSearchRef = React.createRef();
    }

    state = {
        // 導入課表功能
        importTimeTableText: null,

        courseCodeList: [],
        allCourseAllTime: [],

        addMode: false,
        searchText: '',

        dayFilter: 'ALL',
        // timeFilter: 'ALL',
        // timeFilterFrom: '08:30',
        // timeFilterTo: '22:00',
        // showTimePickerFrom: false,
        // showTimePickerTo: false,
    }

    async componentDidMount() {
        logToFirebase('openPage', { page: 'courseSim' });

        const strCourseCodeList = await AsyncStorage.getItem('ARK_Timetable_Storage');
        const courseCodeList = strCourseCodeList ? JSON.parse(strCourseCodeList) : null;

        if (courseCodeList && courseCodeList.length > 0) {
            this.handleCourseList(courseCodeList);
        }

        this.keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            this._keyboardDidHide,
        );
    }

    componentWillUnmount() {
        this.keyboardDidHideListener.remove();
    }

    // 鍵盤收起，使輸入框失焦
    _keyboardDidHide = async () => {
        // 使输入框失去焦点
        try {
            this.textSearchRef.current.blur();
        } catch (error) {
            console.log('error', error);
        }
    };

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

            // 例如今天星期五，FRI
            // 用於高亮當天的Day文字
            let todayText = moment().format('dddd').substring(0, 3).toUpperCase();

            return (
                <View style={{ width: scale(135), marginBottom: dayCourseList.length < 4 ? ((4 - dayCourseList.length) * scale(140)) : null }}>
                    {/* 星期幾 */}
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: todayText == day ? themeColor : black.third,
                        fontSize: scale(25), fontWeight: 'bold',
                        alignSelf: 'center',
                    }}>{day}</Text>
                    {/* 渲染單一課程卡片 */}
                    <View style={{ flexDirection: 'column', }}>
                        {dayCourseList.map((course, idx) => this.renderCourse(course, dayCourseList, idx))}
                    </View>
                </View>
            )
        }
    }

    // 渲染課表卡片
    renderCourse = (course, dayCourseList, idx) => {
        let timeDiffReminder = null;
        let afternoonReminder = null;
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
                timeDiffReminder = <Text
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
                    {hourDiff >= 1 ? `小時` : `分鐘`}後
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

        // 判斷是否下午
        let timeHH = moment(course['Time From'], "HH").format("HH");
        let timeReminderText = null;
        // list只有一條數據，展示
        // list前方數據不是相同 下午/晚上，才展示
        timeReminderText = timeHH > 12 ? (timeHH >= 18 ? '🌜晚上🌛' : '☕️下午☕️') : null;

        if (timeHH > 12 && dayCourseList.length > 1 && idx > 0) {
            let preTimeHH = moment(dayCourseList[idx - 1]['Time From'], "HH").format("HH");
            // 下一節課和該節課同為晚上，只展示該節課
            if (preTimeHH >= 18 && timeHH >= 18) {
                timeReminderText = null;
            }
            if (preTimeHH > 12 && preTimeHH < 18 && timeHH < 18) {
                timeReminderText = null;
            }
        }

        afternoonReminder = timeReminderText ? <Text
            style={{
                ...uiStyle.defaultText,
                alignSelf: 'center', textAlign: 'center',
                color: black.third,
                fontWeight: 'bold',
                fontSize: scale(20),
            }}>
            {timeReminderText}
        </Text> : null;

        return (
            <View>
                {/* 渲染下午/晚上提醒 */}
                {afternoonReminder}

                {/* 渲染時間間隔提醒 */}
                {timeDiffReminder}

                <MenuView
                    onPressAction={({ nativeEvent }) => {
                        switch (nativeEvent.event) {
                            case 'wiki':
                                ReactNativeHapticFeedback.trigger('soft');
                                const URL = ARK_WIKI_SEARCH + encodeURIComponent(course['Course Code']);
                                this.props.navigation.navigate('Wiki', { url: URL });
                                break;

                            case 'what2reg':
                                ReactNativeHapticFeedback.trigger('soft');
                                const courseCode = course['Course Code'];
                                const profName = course['Teacher Information'];
                                // 進入搜索特定教授的課程模式，進入評論詳情頁
                                const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(profName);
                                openLink(URI);
                                break;

                            case 'official':
                                ReactNativeHapticFeedback.trigger('soft');
                                openLink(OFFICIAL_COURSE_SEARCH + course['Course Code']);
                                break;

                            case 'section':
                                ReactNativeHapticFeedback.trigger('soft');
                                this.props.navigation.navigate('LocalCourse', course['Course Code']);
                                break;

                            case 'drop':
                                ReactNativeHapticFeedback.trigger('soft');
                                Alert.alert(``, `要在模擬課表中刪除${course['Course Code']}-${course['Section']}嗎？`,
                                    [
                                        {
                                            text: "Drop",
                                            onPress: () => {
                                                ReactNativeHapticFeedback.trigger('soft');
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
                        {
                            id: 'official',
                            title: '查 官方',
                            titleColor: black.third,
                        },
                        {
                            id: 'section',
                            title: '查 Section / 老師',
                            titleColor: black.third,
                        },
                        {
                            id: 'drop',
                            title: `刪除 ${course['Course Code']}-${course['Section']}`,
                            attributes: {
                                destructive: true,
                            },
                            image: Platform.select({
                                ios: 'trash',
                                android: 'ic_menu_delete',
                            }),
                        },
                    ]}
                    shouldOpenOnLongPress={false}
                >
                    <TouchableScale
                        style={{
                            margin: scale(5),
                            backgroundColor: timeWarning ? unread : course['color'],
                            borderRadius: scale(10),
                            padding: scale(5),
                            alignItems: 'center', justifyContent: 'center',
                        }}
                        activeOpacity={0.8}
                        // onPress={() => {
                        //     ReactNativeHapticFeedback.trigger('soft');
                        //     Alert.alert("", `想知道關於${course['Course Code']}的...\n(長按可以刪除課程...)`,
                        //         [
                        //             {
                        //                 text: "可選Section/老師",
                        //                 onPress: () => {
                        //                     ReactNativeHapticFeedback.trigger('soft');
                        //                     this.props.navigation.navigate('LocalCourse', course['Course Code']);
                        //                 },
                        //             },
                        //             {
                        //                 text: "課程Wiki",
                        //                 onPress: () => {
                        //                     ReactNativeHapticFeedback.trigger('soft');
                        //                     const URL = ARK_WIKI_SEARCH + encodeURIComponent(course['Course Code']);
                        //                     this.props.navigation.navigate('Wiki', { url: URL });
                        //                 },
                        //             },
                        //             {
                        //                 text: "取消",
                        //             },
                        //         ],
                        //         { cancelable: true, }
                        //     );
                        // }}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('soft');
                        }}
                        delayLongPress={300}
                    >
                        {/* 課號 */}
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            opacity: 0.7,
                            fontSize: scale(20),
                            textAlign: 'center',
                            fontWeight: '700',
                        }}>
                            {course['Course Code'].substring(0, 4) + '\n'}<Text style={{ fontSize: scale(20), fontWeight: 'bold', }}>{course['Course Code'].substring(4, 8)}</Text>
                        </Text>

                        {/* Section */}
                        <Text style={{ ...uiStyle.defaultText, color: black.main, opacity: 0.8, }}>{course['Section']}</Text>

                        {/* 課程名稱 */}
                        <Text style={{ ...uiStyle.defaultText, color: black.main, textAlign: 'center', opacity: 0.4 }} numberOfLines={4}>{course['Course Title']}</Text>

                        {/* 教室 */}
                        <Text style={{ ...uiStyle.defaultText, color: black.main, fontWeight: 'bold', opacity: 0.5 }}>{course['Classroom']}</Text>

                        {/* 上課時間 */}
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignSelf: 'stretch' }}>
                            {/* 開始時間 */}
                            <Text style={{ ...uiStyle.defaultText, color: COLOR_DIY.black.main, fontWeight: '600', opacity: 0.8 }}>
                                {course['Time From']}
                            </Text>
                            {/* 引導用戶操作圖標 */}
                            <Ionicons
                                name="ellipsis-horizontal"
                                size={scale(20)}
                                color={black.main}
                                style={{ opacity: 0.4 }}
                            />
                            {/* 結束時間 */}
                            <Text style={{ ...uiStyle.defaultText, color: COLOR_DIY.black.main, fontWeight: '600', opacity: 0.8 }}>
                                {course['Time To']}
                            </Text>
                        </View>
                    </TouchableScale>
                </MenuView>
            </View>
        )
    }

    // 導入ISW課表數據
    importCourseData = () => {
        ReactNativeHapticFeedback.trigger('soft');
        const { importTimeTableText } = this.state;
        let parseRes = parseImportData(importTimeTableText);
        if (parseRes) {
            this.verScroll.current.scrollTo({ y: 0 });
            this.handleCourseList(parseRes);
        }
        else {
            Alert.alert(``, `您輸入的格式有誤，\n有正確全選複製Timetable嗎？`)
        }
    }

    addCourse = (course) => {
        ReactNativeHapticFeedback.trigger('soft');
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

    // 刪除所選課程
    dropCourse = (course) => {
        ReactNativeHapticFeedback.trigger('soft');
        const { courseCodeList } = this.state;
        let newList = [];
        courseCodeList.map(i => {
            if (!(i['Course Code'] == course['Course Code'] && i['Section'] == course['Section'])) {
                newList.push(i);
            }
        })
        this.handleCourseList(newList);
        Toast.show(`已刪除${course['Course Code'] + '-' + course['Section']}`)
    }

    clearCourse = () => {
        ReactNativeHapticFeedback.trigger('soft');
        Alert.alert(``, `確定要清空當前的模擬課表嗎？`, [
            {
                text: '確定清空',
                onPress: () => {
                    ReactNativeHapticFeedback.trigger('soft');
                    this.setState({
                        allCourseAllTime: [],
                        courseCodeList: [],

                        importTimeTableText: null,
                        searchText: null,
                    });
                    setLocalStorage([]);
                    this.verScroll.current.scrollTo({ y: 0 });
                },
                style: 'destructive',
            },
            {
                text: 'No',
            },
        ], { cancelable: true })
    }

    // 渲染首次使用文字提示
    renderFirstUse = () => {
        const { importTimeTableText } = this.state;
        return (
            <View style={{ alignItems: 'center', justifyContent: 'center', marginTop: scale(10), marginHorizontal: scale(5), }}>
                <Text style={{ ...s.firstUseText, }}>{`\n如何開始使用模擬課表？\n`}</Text>

                {/* Add課按鈕提示 */}
                <Text style={{ ...s.firstUseText, }}><Text style={{ color: themeColor }}>選項1：</Text>{`望向右上角自己動手“Add”！\n`}</Text>

                <Text style={{ ...s.firstUseText, }}><Text style={{ color: themeColor }}>選項2：</Text>{`全選、複製ISW真正課表，\n(ISW課表是文字不是圖片!)\n到下方框框中粘貼，\n然後一鍵導入！`}</Text>

                {/* 跳轉ISW按鈕 */}
                {importTimeTableText && importTimeTableText.length > 0 ? null : (
                    <TouchableOpacity style={{ ...s.buttonContainer, }}
                        onPress={() => { openLink(UM_ISW); }}
                    >
                        <Text style={{ ...s.firstUseText, color: white, }}>2.1 進入ISW複製</Text>
                    </TouchableOpacity>
                )}
                {/* 課表數據輸入框 */}
                <TextInput
                    ref={this.textSearchRef}
                    selectTextOnFocus
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
18:30	-	-	-	-	-`}
                    placeholderTextColor={black.third}
                    value={this.state.importTimeTableText}
                    style={{
                        backgroundColor: white,
                        padding: scale(10),
                        borderRadius: scale(10),
                        width: '90%',
                        color: themeColor,
                    }}
                    returnKeyType={'done'}
                    blurOnSubmit={true}
                    onSubmitEditing={() => Keyboard.dismiss()}
                    clearButtonMode='always'
                />
                <Text style={{ marginTop: scale(10), ...uiStyle.defaultText, color: black.third, }}>↑記得先粘貼課表數據，再點擊導入哦</Text>
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

                <Text style={{ ...s.firstUseText, fontSize: scale(12), marginTop: scale(25) }}>
                    {`如有問題，立即聯繫umacark@gmail.com`}
                </Text>
                {/* 靈感來源 */}
                <Text style={{ ...s.firstUseText, fontSize: scale(12) }}>
                    {`\n靈感源自kchomacau, Raywong前輩的\n“課表模擬”開源倉庫！`}
                </Text>
            </View>
        )
    }

    renderDayFilter = () => {
        const { dayFilter } = this.state;
        return (<View style={{ margin: scale(5), }}>
            <FlatList
                data={dayList}
                horizontal
                scrollEnabled
                showsHorizontalScrollIndicator={false}
                renderItem={({ item: itm }) => (
                    <TouchableOpacity style={{
                        ...s.filterButtonContainer,
                        backgroundColor: dayFilter == itm ? themeColor : white,
                    }}
                        onPress={() => {
                            this.setState({ dayFilter: itm })
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: dayFilter == itm ? white : black.third,
                        }}>{itm}</Text>
                    </TouchableOpacity>
                )}
                ListHeaderComponent={() => (
                    <TouchableOpacity style={{
                        ...s.filterButtonContainer,
                        backgroundColor: dayFilter == 'ALL' ? themeColor : white,
                    }}
                        onPress={() => {
                            this.setState({ dayFilter: 'ALL' })
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: dayFilter == 'ALL' ? white : black.third,
                        }}>ALL</Text>
                    </TouchableOpacity>
                )}
            />
        </View>)
    }

    renderTimeFilter = () => {
        const { timeFilter, timeFilterFrom, timeFilterTo, showTimePickerFrom, showTimePickerTo } = this.state;
        return (<View style={{ flexDirection: 'row', marginHorizontal: scale(5) }}>
            {/* ALL選項 */}
            <TouchableOpacity style={{
                ...s.filterButtonContainer,
                backgroundColor: timeFilter == 'ALL' ? themeColor : white,
            }}
                onPress={() => {
                    this.setState({ timeFilter: 'ALL' })
                }}
            >
                <Text style={{
                    ...uiStyle.defaultText,
                    color: timeFilter == 'ALL' ? white : black.third,
                }}>ALL</Text>
            </TouchableOpacity>

            {/* 時間選項 */}
            <TouchableOpacity style={{
                flexDirection: 'row',
                ...s.filterButtonContainer,
                backgroundColor: timeFilter == 'TIME' ? themeColor : white,
            }}
                onPress={() => {
                    this.setState({ timeFilter: 'TIME', showTimePickerFrom: true })
                }}
            >
                <Text style={{
                    ...uiStyle.defaultText,
                    color: timeFilter == 'TIME' ? white : black.third,
                }}>{timeFilterFrom + ' - ' + timeFilterTo}</Text>
            </TouchableOpacity>

            <DateTimePickerModal
                isVisible={showTimePickerFrom || showTimePickerTo}
                // date={Date(timeFilterFrom)}
                mode='time'
                // onConfirm={date => {
                //     if (showTimePickerFrom) {
                //         this.setState({
                //             timeFilterFrom: date,
                //             timeFilterTo: date,
                //             showTimePickerFrom: false,
                //         });
                //     }
                //     else if (showTimePickerTo) {
                //         this.setState({
                //             timeFilterTo: date,
                //             showTimePickerTo: false,
                //         });
                //     }
                // }}
                onCancel={() => {
                    this.setState({ showTimePickerFrom: false, showTimePickerTo: false });
                }}
            />
        </View>
        )
    }

    renderCourseSearch = () => {
        const filterCourseList = handleSearchFilterCourse(this.state.searchText);
        // 是否有搜索結果
        let haveSearchResult = this.state.searchText && filterCourseList.length > 0;
        return (
            <View style={{
                width: '34%',
                height: haveSearchResult ? '100%' : scale(50),
                marginRight: scale(5),
                marginTop: scale(5), marginBottom: scale(10),
                borderWidth: scale(1), borderColor: themeColor, borderRadius: scale(10),
                backgroundColor: white,
                ...COLOR_DIY.viewShadow,
            }}>
                {/* 星期篩選 */}
                {/* {this.renderDayFilter()} */}

                {/* 時間篩選 */}
                {/* {this.renderTimeFilter()} */}

                {/* 輸入框 */}
                <View style={{
                    borderColor: themeColor,
                    borderWidth: scale(1), borderRadius: scale(5),
                    margin: scale(5),
                }}>
                    {/* Add課搜索框 */}
                    <TextInput
                        ref={this.textSearchRef}
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontSize: scale(12),
                            padding: scale(5),
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
                        blurOnSubmit={true}
                        onSubmitEditing={() => Keyboard.dismiss()}
                        clearButtonMode='always'
                    />
                </View>

                {/* 渲染搜索課程的結果 */}
                {haveSearchResult ? filterCourseList.map(i => {
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
                                    borderRadius: scale(5),
                                    padding: scale(3),
                                }}
                                onPress={() => {
                                    ReactNativeHapticFeedback.trigger('soft');
                                    let { courseCodeList } = this.state;
                                    let tempArr = [];
                                    courseCodeList.map(itm => {
                                        if (itm['Course Code'] != i['Course Code']) {
                                            tempArr.push(itm);
                                        }
                                    })
                                    courseCodeList = tempArr;
                                    this.handleCourseList(courseCodeList);
                                    this.verScroll.current.scrollTo({ y: 0 });
                                }}
                            >
                                <Text style={{
                                    ...s.searchResultText,
                                    color: COLOR_DIY.trueWhite,
                                    fontWeight: 'bold',
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
                                ReactNativeHapticFeedback.trigger('soft');
                                this.addAllSectionCourse(i['Course Code'], sectionObj);
                                // 切換searchText為點擊的Code
                                this.setState({ searchText: i['Course Code'] });
                                this.verScroll.current.scrollTo({ y: 0 });
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
                                        this.verScroll.current.scrollTo({ y: 0 });
                                    }}
                                >
                                    {/* Section號碼 */}
                                    <Text style={{ ...s.searchResultText, color: themeColor, fontSize: scale(15), fontWeight: 'bold' }}>{key}</Text>
                                    {/* 老師名 */}
                                    <Text style={{ ...s.searchResultText, color: themeColor }}>{sectionObj[key][0]['Teacher Information']}</Text>
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
                }) : null}
            </View>
        )
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
                    {allCourseAllTime && allCourseAllTime.length > 0 && (
                        <TouchableOpacity style={{
                            position: 'absolute',
                            left: scale(10),
                            backgroundColor: themeColorUltraLight,
                            borderRadius: scale(5),
                            padding: scale(5),
                        }}
                            onPress={this.clearCourse}
                        >
                            <Text style={{ ...uiStyle.defaultText, color: themeColor, fontWeight: 'bold' }}>清空</Text>
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
                        backgroundColor: this.state.addMode ? themeColorUltraLight : themeColor,
                        borderRadius: scale(5),
                        padding: scale(5),
                    }}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('soft');
                            // 切換加課模式
                            this.setState({ addMode: !this.state.addMode });
                            this.verScroll.current.scrollTo({ y: 0 });
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: this.state.addMode ? themeColor : white,
                            fontWeight: 'bold'
                        }}>{this.state.addMode ? '關閉' : '添加'}</Text>
                    </TouchableOpacity>
                </View>

                <ScrollView
                    ref={this.verScroll}
                    contentContainerStyle={{ flexDirection: 'row', width: '100%' }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* 課表 / 首次使用提示 */}
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
                        </View>) : (this.renderFirstUse())}
                    </View>

                    {/* 渲染選課的篩選列表 */}
                    {this.state.addMode ? this.renderCourseSearch() : null}
                </ScrollView>
            </View >
        );
    }
}

const s = StyleSheet.create({
    firstUseText: {
        ...uiStyle.defaultText,
        color: black.third,
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
    filterButtonContainer: {
        paddingHorizontal: scale(5), paddingVertical: scale(2),
        borderRadius: scale(5),
    },
    searchResultText: {
        ...uiStyle.defaultText,
        color: black.third,
        textAlign: 'center',
    },
});