import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    FlatList,
    KeyboardAvoidingView,
    Keyboard,
} from "react-native";

import { UMEH_URI, UMEH_API, WHAT_2_REG, USER_AGREE } from "../../../utils/pathMap";
import { COLOR_DIY, uiStyle, } from '../../../utils/uiMap';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import offerCourses from '../../../static/UMCourses/offerCourses';
import coursePlan from '../../../static/UMCourses/coursePlan';
import coursePlanTime from '../../../static/UMCourses/coursePlanTime';
import Loading from '../../../components/Loading';
import CourseCard from './component/CourseCard';

import axios from "axios";
import { scale } from "react-native-size-matters";
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import FastImage from 'react-native-fast-image';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { themeColor, black, white, viewShadow } = COLOR_DIY;
const iconSize = scale(25);

// preEnroll
let COURSE_MODE = 'ad';

const coursePlanList = coursePlanTime.Courses;
// const offerCourseList = COURSE_MODE == 'ad' ? coursePlan.Courses : offerCourses.Courses;

// ***** 需到getClassifyCourse函數處運行 *****
// Excel開課數據按首字母排序，複製一份排序後的數據到offerCourses.json，節省安卓端性能
// offerCourseList.sort((a, b) => a['Course Code'].substring(4, 8).localeCompare(b['Course Code'].substring(4, 8), 'es', { sensitivity: 'base' }));
// offerCourseList.sort((a, b) => a['Course Code'].substring(0, 3).localeCompare(b['Course Code'].substring(0, 3), 'es', { sensitivity: 'base' }));

// 複製替換原課程列表為排序後列表
// const courseListStr = JSON.stringify(offerCourseList);
// console.log(courseListStr);

// 預選課程加入Pre 鍵值
// offerCourseList.map((itm,idx)=>{
//     itm['Pre'] = 'true';
// })
// console.log(JSON.stringify(offerCourseList));

// 加入課表時間Excel數據，去重
// offerCourseList = offerCourseList.concat(xxxList);
// offerCourseList = offerCourseList.filter((item, index) => offerCourseList.findIndex(i => i['Course Code'] === item['Course Code']) === index);
// console.log(JSON.stringify(offerCourseList));

// 學院名中文參考
const unitMap = {
    'FAH': '人文學院 - Arts and Humanities',
    'FBA': '工商管理學院 - Business Administration',
    'FED': '教育學院 - Education',
    'FST': '科技學院 - Science and Technology',
    'FHS': '健康科學學院 - Health Sciences',
    'FSS': '社會科學學院 - Social Sciences',
    'FLL': '法學院 - Law',
    'IAPME': '應用物理及材料工程研究院 - Institute of Applied Physics and Materials Engineering',
    'ICMS': '中華醫藥研究院 - Institute of Chinese Medical Sciences',
    'IME': '微電子研究院 - Institute of Microelectronics',
    'MSC': ' - ',
    'RC': '書院 - Residential College',
    'HC': '榮譽學院 - Honours College',
}

// 部門/學系名中文參考
const depaMap = {
    // FAH
    'CJS': '日本研究中心',
    'DCH': '中國語言文學系',
    'DENG': '英文系',
    'DHIST': '歷史系',
    'DPHIL': '哲學及宗教學系',
    'DPT': '葡文系',
    'ELC': '英語中心',

    // FBA
    'AIM': '會計及資訊管理學系',
    'DRTM': '綜合度假村及旅遊管理學系',
    'FBE': '金融及商業經濟學系',
    'MMI': '管理及市場學系',

    // FHS
    'DBS': '生物醫學系',
    'DPS': '藥物科學系',
    'DPM': '藥學系',

    // FLL
    'GLS': '環球法律學系',
    'MLS': '澳門法學系',

    // FSS
    'DCOM': '傳播系',
    'DECO': '經濟學系',
    'DGPA': '政府與行政學系',
    'DPSY': '心理學系',
    'DSOC': '社會學系',

    // FST
    'CEE': '土木及環境工程系',
    'CIS': '電腦及資訊科學系',
    'CSG': '化學支持小組',
    'DPC': '物理及化學系',
    'ECE': '電機及電腦工程系',
    'EME': '機電工程系',
    'MAT': '數學系',
}

// GE課中文參考
const geClassMap = {
    'GEGA': '全球意識 - Global Awareness',
    'GELH': '文學與人文 - Literature and Humanities',
    'GESB': '社會與行為 - Society and Behaviour',
    'GEST': '科學和技術 - Science and Technology',
}

// add drop, pre enroll 中文參考
const adpeMap = {
    'ad': '增退選',
    'preEnroll': '預選課',
}

// 判斷字符串是否包含中文
function hasChinese(str) {
    return /[\u4E00-\u9FA5]+/g.test(str)
}

// 設置本地緩存
async function setLocalOpitons(filterOptions) {
    try {
        const strFilterOptions = JSON.stringify(filterOptions);
        await AsyncStorage.setItem('ARK_Courses_filterOptions', strFilterOptions)
            .catch(e => console.log('AsyncStorage Error', e));
    } catch (e) {
        alert(e);
    }
}

// 返回搜索候選所需的課程列表
handleSearchFilterCourse = (inputText) => {
    const offerCourseList = COURSE_MODE == 'ad' ? coursePlan.Courses : offerCourses.Courses;

    inputText = inputText.toUpperCase();
    // 篩選所需課程
    let filterCourseList = offerCourseList.filter(itm => {
        return itm['Course Code'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title Chi'].indexOf(inputText) != -1
    });

    // 篩選課表時間Excel的數據
    if (coursePlanList.length > 0) {
        let coursePlanSearchList = coursePlanList.filter(itm => {
            return itm['Course Code'].toUpperCase().indexOf(inputText) != -1
                || itm['Course Title'].toUpperCase().indexOf(inputText) != -1
                || itm['Teacher Information'].toUpperCase().indexOf(inputText) != -1
                || (itm['Day'] && itm['Day'].toUpperCase().indexOf(inputText) != -1)
                || (itm['Offering Department'] && itm['Offering Department'].toUpperCase().indexOf(inputText) != -1)
                || itm['Offering Unit'].toUpperCase().indexOf(inputText) != -1
                || itm['Course Title Chi'].indexOf(inputText) != -1
        });

        // 搜索合併
        filterCourseList = filterCourseList.concat(coursePlanSearchList)
        // 搜索去重
        filterCourseList = filterCourseList.filter((item, index) => filterCourseList.findIndex(i => i['Course Code'] === item['Course Code']) === index);
    }

    // 搜索結果排序
    filterCourseList.sort((a, b) => a['Course Code'].substring(4, 8).localeCompare(b['Course Code'].substring(4, 8), 'es', { sensitivity: 'base' }));
    filterCourseList.sort((a, b) => a['Course Code'].substring(0, 3).localeCompare(b['Course Code'].substring(0, 3), 'es', { sensitivity: 'base' }));

    return filterCourseList
}

export default class index extends Component {
    constructor() {
        super();
        this.state = {
            inputText: "",

            inputOK: false,

            isLoading: false,

            filterOptions: {
                mode: 'ad', // preEnroll
                option: 'CMRE',
                facultyName: 'FST',
                depaName: 'ECE',
                GE: 'GEST',
            },

            offerFacultyList: [],
            offerDepaList: [],
            offerGEList: [],
            filterCourseList: [],
            scrollData: {},
        };

        this.textInputRef = React.createRef();
        this.scrollViewRef = React.createRef();
    }

    async componentDidMount() {
        logToFirebase('openPage', { page: 'chooseCourses' });

        try {
            const strFilterOptions = await AsyncStorage.getItem('ARK_Courses_filterOptions');
            const filterOptions = strFilterOptions ? JSON.parse(strFilterOptions) : undefined;
            if (filterOptions) {
                this.setState({ filterOptions });
                COURSE_MODE = filterOptions.mode;
            } else {
                setLocalOpitons(this.state.filterOptions);
            }
        } catch (e) {
            alert('ARK Courses error, 請聯繫開發者！', e)
        } finally {
            this.getClassifyCourse();
        }

        // 軟鍵盤監聽是否隱藏，隱藏時使輸入框失焦
        this.keyboardDidHideListener = Keyboard.addListener(
            'keyboardDidHide',
            this._keyboardDidHide,
        );
    };

    componentWillUnmount() {
        this.keyboardDidHideListener.remove();
    }

    // 鍵盤收起，使輸入框失焦
    _keyboardDidHide = () => {
        // 使输入框失去焦点
        this.textInputRef.current.blur();
    };

    // 對開課數據進行分類
    getClassifyCourse = () => {
        const offerCourseList = COURSE_MODE == 'ad' ? coursePlan.Courses : offerCourses.Courses;
        let { filterOptions } = this.state;

        // 開設課程的學院名列表
        let offerFacultyList = [];
        // GE課程代號列表
        let offerGEList = [];
        // 學系/部門名列表
        let offerDepaList = [];
        // 根據學院名，篩選各自部門/學系
        let offerFacultyDepaListObj = [];

        offerCourseList.map(itm => {
            const facultyName = itm['Offering Unit'];
            const depaName = itm['Offering Department'];
            const courseCode = itm['Course Code'].substring(0, 4);
            if (facultyName != undefined && (offerFacultyList.indexOf(facultyName) == -1)) {
                offerFacultyList.push(facultyName)
            }
            if (courseCode != undefined && courseCode.substring(0, 2) == 'GE' && (offerGEList.indexOf(courseCode) == -1)) {
                offerGEList.push(courseCode)
            }
            if (depaName != undefined && (offerDepaList.indexOf(depaName) == -1)) {
                offerDepaList.push(depaName)
                let arr = facultyName in offerFacultyDepaListObj ? offerFacultyDepaListObj[facultyName] : [];
                arr.push(depaName)
                offerFacultyDepaListObj[facultyName] = arr;
            }
        })

        // 根據學院/機構名，篩選各自開課
        let offerCourseByFaculty = {};
        offerFacultyList.map(facultyName => {
            offerCourseByFaculty[facultyName] = offerCourseList.filter(itm => {
                return itm['Offering Unit'] == facultyName
            });
            if (!(facultyName in offerFacultyDepaListObj)) {
                offerFacultyDepaListObj[facultyName] = [];
            }
        })

        // 根據部門篩選各自開課
        let offerCourseByDepa = {};
        offerDepaList.map(depaName => {
            offerCourseByDepa[depaName] = offerCourseList.filter(itm => {
                return itm['Offering Department'] == depaName
            });
        })

        // 根據GE門類篩選各自開課
        let offerCourseByGE = {};
        offerGEList.map(GEName => {
            offerCourseByGE[GEName] = offerCourseList.filter(itm => {
                return itm['Course Code'].substring(0, 4) == GEName
            });
        })

        // 還原/初始化需要渲染的課程列表
        let filterCourseList = [];
        if (filterOptions.option == 'CMRE') {
            const facultyName = filterOptions.facultyName;
            if (facultyName in offerFacultyDepaListObj && offerFacultyDepaListObj[facultyName].length > 0) {
                filterCourseList = offerCourseByDepa[filterOptions.depaName];
            } else {
                if (facultyName in offerCourseByFaculty) {
                    // 學院下無具體學係分類的情況
                    filterCourseList = offerCourseByFaculty[facultyName];
                } else {
                    filterCourseList = offerCourseByFaculty[offerFacultyList[0]];
                    filterOptions.facultyName = offerFacultyList[0];
                    filterOptions.depaName = offerFacultyDepaListObj[offerFacultyList[0]][0];
                }
            }
        } else if (filterOptions.option == 'GE') {
            filterCourseList = offerCourseByGE[filterOptions.GE]
        }

        this.setState({
            offerFacultyList,
            offerGEList,

            offerCourseByFaculty,
            offerCourseByDepa,
            offerFacultyDepaListObj,
            offerCourseByGE,

            filterCourseList,
            scrollData: {},

            filterOptions,
        })
        setLocalOpitons(filterOptions);
    }

    // Add Drop / Pre Enroll 模式選擇
    renderADPESwitch = () => {
        const { filterOptions, } = this.state;
        const modeList = Object.keys(adpeMap);
        const modeENStr = {
            'ad': 'Add Drop',
            'preEnroll': 'Pre Enroll',
        }

        return (
            <FlatList
                data={modeList}
                key={modeList.length}
                keyExtractor={(item, index) => index}
                numColumns={modeList.length}
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => (
                    <TouchableOpacity
                        style={{
                            ...s.classItm,
                            paddingHorizontal: scale(5), paddingVertical: scale(2),
                            backgroundColor: filterOptions.mode === itm ? themeColor : null,
                        }}
                        onPress={async () => {
                            ReactNativeHapticFeedback.trigger('soft');
                            try {
                                filterOptions.mode = itm;
                                COURSE_MODE = itm;
                                this.getClassifyCourse();
                                this.setState({ filterOptions });
                                setLocalOpitons(filterOptions);
                            } catch (error) {
                                alert(error)
                            }
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: filterOptions.mode === itm ? white : black.third,
                            fontWeight: filterOptions.mode === itm ? '900' : 'normal',
                            fontSize: scale(12),
                        }}>{modeENStr[itm]}</Text>
                    </TouchableOpacity>
                )}
                // 展示CM GE中文名稱
                ListHeaderComponent={() =>
                    <Text style={{ ...s.classItmTitleText }}>
                        {adpeMap[filterOptions.mode]}
                    </Text>
                }
            />
        )
    }

    // CERE / GE 模式選擇
    renderCMGESwitch = () => {
        const {
            filterOptions,
            offerFacultyDepaListObj,
            offerCourseByDepa,
            offerCourseByGE,
            offerCourseByFaculty,
            offerFacultyList,
        } = this.state;
        const CMGEList = [
            'CMRE',
            'GE'
        ];

        return (
            <FlatList
                data={CMGEList}
                key={CMGEList.length}
                keyExtractor={(item, index) => index}
                numColumns={CMGEList.length}
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => (
                    <TouchableOpacity
                        style={{
                            ...s.classItm,
                            paddingHorizontal: scale(5), paddingVertical: scale(2),
                            backgroundColor: filterOptions.option === itm ? themeColor : null,
                        }}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('soft');
                            let filterCourseList = [];
                            try {
                                if (itm == 'CMRE') {
                                    const facultyName = filterOptions.facultyName;
                                    if (facultyName in offerFacultyDepaListObj && offerFacultyDepaListObj[facultyName].length > 0) {
                                        filterCourseList = offerCourseByDepa[filterOptions.depaName];
                                    } else {
                                        if (facultyName in offerCourseByFaculty) {
                                            filterCourseList = offerCourseByFaculty[facultyName];
                                        } else {
                                            filterCourseList = offerCourseByFaculty[offerFacultyList[0]];
                                            filterOptions.facultyName = offerFacultyList[0];
                                            filterOptions.depaName = offerFacultyDepaListObj[offerFacultyList[0]][0];
                                        }
                                    }
                                } else if (itm == 'GE') {
                                    filterCourseList = offerCourseByGE[filterOptions.GE]
                                }
                            } catch (error) { alert(error) } finally {
                                filterOptions.option = itm;
                                this.setState({ filterOptions, filterCourseList, scrollData: {} })
                                setLocalOpitons(filterOptions);
                            }
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: filterOptions.option === itm ? white : black.third,
                            fontWeight: filterOptions.option === itm ? '900' : 'normal',
                            fontSize: scale(12),
                        }}>{itm}</Text>
                    </TouchableOpacity>
                )}
                // 展示CM GE中文名稱
                ListHeaderComponent={() =>
                    <Text style={{ ...s.classItmTitleText }}>
                        {filterOptions.option == 'GE' ? '通識課' : '必修課 與 選修課'}
                    </Text>
                }
            />
        )
    }

    // 學院分類選擇，例FST、FSS
    renderFacultySwitch = () => {
        const {
            filterOptions,
            offerFacultyDepaListObj,
            offerCourseByDepa,
            offerCourseByFaculty,
        } = this.state;
        const offerFacultyList = Object.keys(offerFacultyDepaListObj);

        return (
            <FlatList
                data={offerFacultyList}
                key={offerFacultyList.length}
                keyExtractor={(item, index) => index}
                numColumns={offerFacultyList.length}
                columnWrapperStyle={
                    offerFacultyList.length > 1 ? {
                        flexWrap: 'wrap', justifyContent: 'center'
                    } : null
                }
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => (
                    <TouchableOpacity
                        style={{
                            ...s.classItm,
                            backgroundColor: itm === filterOptions.facultyName ? themeColor : null,
                            paddingHorizontal: scale(5), paddingVertical: scale(2),
                        }}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('soft');
                            const facultyName = itm;
                            let filterCourseList = [];
                            if (offerFacultyDepaListObj[facultyName].length > 0) {
                                const depaName = offerFacultyDepaListObj[facultyName][0];
                                filterOptions.depaName = depaName;
                                filterCourseList = offerCourseByDepa[depaName];
                            } else {
                                filterCourseList = offerCourseByFaculty[facultyName];
                            }
                            filterOptions.facultyName = facultyName;
                            this.setState({ filterOptions, filterCourseList, scrollData: {} });
                            setLocalOpitons(filterOptions);
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: itm === filterOptions.facultyName ? white : black.third,
                            fontWeight: itm === filterOptions.facultyName ? '900' : 'normal',
                            fontSize: scale(12)
                        }}>{itm}</Text>
                    </TouchableOpacity>
                )}
                // 展示學院中文名稱
                ListHeaderComponent={() =>
                    <Text style={{ ...s.classItmTitleText }}>
                        {unitMap[filterOptions.facultyName]}
                    </Text>
                }
            />
        )
    }

    // 學系分類選擇，例ECE、CIS
    renderDepaSwitch = (offerDepaList) => {
        const {
            filterOptions,
            offerCourseByDepa,
        } = this.state;

        return <FlatList
            data={offerDepaList}
            key={offerDepaList.length}
            keyExtractor={(item, index) => index}
            horizontal
            scrollEnabled
            // BUG: columnWrapperStyle會引發部分機型無法顯示最後一個元素，原因未知
            // BUG: 機型有:三星S22,iPhone 14 Pro Max等
            style={{ marginTop: scale(5) }}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item: itm }) => (
                <TouchableOpacity style={{
                    ...s.classItm,
                    paddingHorizontal: scale(5), paddingVertical: scale(2),
                    backgroundColor: filterOptions.depaName === itm ? themeColor : null,
                }}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        const depaName = itm;
                        let filterCourseList = [];
                        filterCourseList = offerCourseByDepa[depaName]
                        filterOptions.depaName = depaName;
                        this.setState({ filterOptions, filterCourseList, scrollData: {} })
                        setLocalOpitons(filterOptions);
                    }}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        alignSelf: 'center',
                        color: filterOptions.depaName === itm ? white : black.third,
                        fontWeight: filterOptions.depaName === itm ? '900' : 'normal',
                        fontSize: scale(12)
                    }}>{itm}</Text>
                </TouchableOpacity>
            )}
        />
    }

    // 渲染篩選總列表
    renderFilterView = () => {
        const {
            filterOptions,
            offerGEList,
            offerFacultyDepaListObj,
            offerCourseByGE,
        } = this.state;

        let offerDepaList = [];
        if (filterOptions.option != 'GE' && offerFacultyDepaListObj && filterOptions.facultyName in offerFacultyDepaListObj) {
            offerDepaList = offerFacultyDepaListObj[filterOptions.facultyName];
        }

        return (
            <View
                style={{
                    backgroundColor: white,
                    borderRadius: scale(10),
                    padding: scale(5),
                    margin: scale(5), marginHorizontal: scale(10),
                }}>
                {/* 渲染Add Drop，Pre Enroll選擇 */}
                {this.renderADPESwitch()}

                {/* 渲染CMRE GE選擇 */}
                <View style={{ width: '100%', marginTop: scale(5), }}>
                    {this.renderCMGESwitch()}
                </View>

                {/* 渲染分類課程選擇按鈕 */}
                {filterOptions.option == 'GE' ? (
                    <View style={{ marginTop: scale(5), alignItems: 'center' }}>
                        {/* GE課描述 */}
                        <Text style={{ ...s.classItmTitleText }}>
                            {geClassMap[filterOptions.GE]}
                        </Text>
                        {/* 具體GE課程分類按鈕 */}
                        <View style={{ flexDirection: 'row', }}>
                            {offerGEList.length > 0 && offerGEList.map(itm => {
                                return (
                                    <TouchableOpacity style={{
                                        ...s.classItm,
                                        paddingHorizontal: scale(5), paddingVertical: scale(3),
                                        borderColor: filterOptions.GE === itm ? themeColor : black.third,
                                        backgroundColor: filterOptions.GE === itm ? themeColor : null,
                                    }}
                                        onPress={() => {
                                            ReactNativeHapticFeedback.trigger('soft');
                                            filterOptions.GE = itm;
                                            let filterCourseList = offerCourseByGE[itm];
                                            this.setState({ filterOptions, filterCourseList, scrollData: {} })
                                            setLocalOpitons(filterOptions);
                                        }}
                                    >
                                        <Text style={{
                                            ...uiStyle.defaultText,
                                            color: filterOptions.GE === itm ? white : black.third,
                                            fontWeight: filterOptions.GE === itm ? '900' : 'normal',
                                            fontSize: scale(12)
                                        }}>{itm}</Text>
                                    </TouchableOpacity>
                                )
                            })}
                        </View>
                    </View>
                ) : (
                    <View style={{ marginTop: scale(5), width: '100%' }}>
                        {offerFacultyDepaListObj ? this.renderFacultySwitch() : null}
                        {offerDepaList.length > 0 ? <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                            {/* 展示學系中文名稱 */}
                            {filterOptions.depaName in depaMap ?
                                <Text style={{ ...s.classItmTitleText, marginBottom: scale(-5) }}>
                                    {depaMap[filterOptions.depaName]}
                                </Text> : null}
                            {/* 渲染學系選項 */}
                            {this.renderDepaSwitch(offerFacultyDepaListObj[filterOptions.facultyName])}
                        </View> : null}
                    </View>
                )}
            </View>
        )
    }

    getCourseData = async (courseCode) => {
        const URI = UMEH_URI + UMEH_API.GET.COURSE_INFO + courseCode.toString();
        try {
            let res = await axios.get(URI)
            return res.data
        } catch (error) {
            alert('服務器錯誤', error)
        }
    };

    jumpToCoursePage = async (courseCode) => {
        ReactNativeHapticFeedback.trigger('soft');
        this.setState({ isLoading: true })
        if (courseCode.length > 0) {
            let res = await this.getCourseData(courseCode)
            // 返回存在的課程
            if ('course_info' in res && typeof res.course_info == 'object') {
                this.props.navigation.navigate('What2RegCourse', res);
            }
            else {
                alert('課程不存在')
            }
            this.setState({ isLoading: false })
        }
    };

    // 搜索框
    renderSearch = () => {
        const { inputText, isLoading, inputOK, } = this.state;
        return (
            <KeyboardAvoidingView
                style={{
                    alignItems: 'center', flexDirection: 'row',
                    width: '100%',
                    marginTop: scale(5), marginHorizontal: scale(5),
                    backgroundColor: 'transparent',
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* 搜索框 */}
                <View
                    style={{
                        backgroundColor: white,
                        borderWidth: scale(2), borderColor: themeColor, borderRadius: scale(10),
                        flexDirection: 'row', alignItems: 'center',
                        marginHorizontal: scale(5),
                        paddingHorizontal: scale(5), paddingVertical: scale(3),
                        width: '65%',
                    }}>
                    {/* 搜索圖標，引導用戶 */}
                    <Ionicons
                        name={'search'}
                        size={scale(15)}
                        color={black.third}
                    />
                    <TextInput
                        style={{
                            ...uiStyle.defaultText,
                            paddingVertical: scale(3),
                            color: black.main,
                            fontSize: scale(12),
                            width: scale(180),
                        }}
                        onChangeText={(inputText) => {
                            this.setState({
                                inputText,
                                inputOK: inputText.length > 0,
                                scrollData: {},
                            });
                        }}
                        value={inputText}
                        selectTextOnFocus
                        placeholder="試試ECE or Electrical or 電氣"
                        placeholderTextColor={black.third}
                        ref={this.textInputRef}
                        onFocus={() => ReactNativeHapticFeedback.trigger('soft')}
                        returnKeyType={'search'}
                        selectionColor={themeColor}
                    />
                    {/* 清空搜索框按鈕 */}
                    {inputText.length > 0 ? (
                        <TouchableOpacity
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                this.setState({ inputText: '', inputOK: false, scrollData: {}, })
                                this.textInputRef.current.focus();
                            }}
                            style={{ padding: scale(3) }}
                        >
                            <Ionicons
                                name={'close-circle'}
                                size={scale(15)}
                                color={inputText.length > 0 ? themeColor : black.third}
                            />
                        </TouchableOpacity>
                    ) : null}
                </View>
                {/* 課程搜索按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: inputOK ? themeColor : 'gray',
                        borderRadius: scale(10),
                        padding: scale(5), paddingHorizontal: scale(8),
                        alignItems: 'center'
                    }}
                    disabled={isLoading || !inputOK}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.jumpToWebRelateCoursePage({ inputText, type: 'course' })
                    }}
                >
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: white }}>查課</Text>
                </TouchableOpacity>
                {/* 教授搜索按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: inputOK ? themeColor : 'gray',
                        borderRadius: scale(10),
                        padding: scale(5), paddingHorizontal: scale(8),
                        alignItems: 'center',
                        marginHorizontal: scale(5)
                    }}
                    disabled={isLoading || !inputOK}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.jumpToWebRelateCoursePage({ inputText, type: 'prof' })
                    }}
                >
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: white }}>搵講師</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
        )
    }

    // 模糊搜索跳轉到相關課程或教授頁
    jumpToRelateCoursePage = (searchData) => {
        this.props.navigation.navigate('What2RegRelateCourses', searchData);
    }

    // 模糊搜索跳轉到網頁版選咩課
    jumpToWebRelateCoursePage = (searchData) => {
        const { inputText, type } = searchData;
        const URI = `${WHAT_2_REG}/search/` + (type == 'prof' ? 'instructor' : 'course') + `/${encodeURIComponent(inputText)}`;
        logToFirebase('checkCourse', { searchText: inputText });

        // Linking.openURL(URI)
        const webview_param = {
            url: URI,
            title: inputText,
            text_color: white,
            bg_color_diy: COLOR_DIY.what2reg_color,
            isBarStyleBlack: false,
        };
        this.props.navigation.navigate('Webviewer', webview_param);
    }

    // 渲染首字母側邊導航
    renderFirstLetterNav = (filterCourseList) => {
        const { scrollData } = this.state;
        let firstLetterList = [];
        filterCourseList.map((itm) => {
            const firstLetter = itm['Course Code'][0];
            if (firstLetter != undefined && firstLetterList.indexOf(firstLetter) == -1) {
                firstLetterList.push(firstLetter)
            }
        })
        return firstLetterList.length > 1 ? (
            <View style={{
                position: 'absolute', right: scale(8),
                justifyContent: 'center', alignItems: 'center',
                backgroundColor: white,
                borderRadius: scale(8),
                padding: scale(3),
                ...viewShadow,
            }}>
                {firstLetterList.map(itm => {
                    return <TouchableOpacity
                        style={{ padding: scale(3), }}
                        onPress={() => {
                            // 滑動到對應的首字母課程
                            ReactNativeHapticFeedback.trigger('soft');
                            this.scrollViewRef.current.scrollTo({
                                y: scrollData[itm],
                            });
                        }}
                    >
                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(15), color: themeColor }}>{itm}</Text>
                    </TouchableOpacity>
                })}
            </View>
        ) : null
    }

    handleSetLetterData = (letterData) => {
        let { scrollData } = this.state;
        const letter = Object.keys(letterData)[0];
        if (
            !(letter in scrollData)
            || letterData[letter] < scrollData[letter]
        ) {
            scrollData[letter] = letterData[letter];
        }
    }

    render() {
        const {
            isLoading,
            filterCourseList,
            inputText,
        } = this.state;
        const searchFilterCourse = hasChinese(inputText) ?
            (inputText.length > 0 ? handleSearchFilterCourse(inputText) : null) :
            inputText.length > 2 ? handleSearchFilterCourse(inputText) : null;

        return (
            <View style={{
                flex: 1,
                backgroundColor: COLOR_DIY.bg_color,
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
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

                {isLoading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Loading />
                    </View>
                ) : (<>
                    <ScrollView
                        ref={this.scrollViewRef}
                        style={{ width: '100%' }}
                        stickyHeaderIndices={[1]}
                        showsVerticalScrollIndicator={false}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', }}>
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
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(18), color: themeColor, fontWeight: '600' }}>ARK搵課</Text>
                            </View>
                        </View>

                        <>
                            {this.renderSearch()}
                        </>

                        {/* 搜索候選課程 */}
                        {searchFilterCourse && searchFilterCourse.length > 0 ? (
                            <>
                                <View style={{ alignSelf: 'center' }}>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(12), color: black.third }}>ヾ(ｏ･ω･)ﾉ 拿走不謝~</Text>
                                </View>
                                <CourseCard data={searchFilterCourse} mode={'json'} preEnroll={COURSE_MODE == 'preEnroll'}
                                    handleSetLetterData={this.handleSetLetterData}
                                />
                            </>
                        ) : (<>
                            {/* 篩選列表 */}
                            {this.renderFilterView()}

                            <Text style={{
                                ...uiStyle.defaultText,
                                alignSelf: 'center',
                                fontSize: scale(10),
                                color: black.third,
                            }}>
                                短按看評論，長按看Section o(*￣3￣)o
                            </Text>

                            {/* 渲染篩選出的課程 */}
                            {filterCourseList && filterCourseList.length > 0 ? (
                                <View style={{ alignItems: 'center' }}>
                                    <CourseCard data={filterCourseList} mode={'json'} preEnroll={COURSE_MODE == 'preEnroll'}
                                        handleSetLetterData={this.handleSetLetterData}
                                    />
                                </View>
                            ) : null}
                        </>)}

                        {/* 篩選課程功能 更新時間 */}
                        <View style={{ marginTop: scale(10), alignItems: 'center' }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>
                                可供預選/開設課程
                            </Text>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: black.third }}>
                                數據更新日期: {offerCourses.updateTime}
                            </Text>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: themeColor }}>
                                記得更新APP以獲得最新數據~
                            </Text>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(9), color: themeColor }} selectable>
                                遇到BUG可聯繫umacark@gmail.com
                            </Text>
                        </View>

                        <View style={{
                            margin: scale(10),
                            padding: scale(10),
                            alignItems: 'center'
                        }}>
                            <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>知識無價，評論只供參考~</Text>
                        </View>

                        <TouchableOpacity style={{
                            marginTop: scale(10),
                            alignItems: 'center'
                        }}
                            onPress={() => {
                                let webview_param = {
                                    url: USER_AGREE,
                                    title: 'ARK ALL 隱私政策 & 用戶協議',
                                };
                                this.props.navigation.navigate(
                                    'Webviewer',
                                    webview_param,
                                );
                            }}
                        >
                            <Text style={{ ...uiStyle.defaultText, color: themeColor, fontSize: scale(10) }}>ARK ALL 隱私政策 & 用戶協議</Text>
                        </TouchableOpacity>
                    </ScrollView>

                    {/* 渲染側邊首字母導航 */}
                    {searchFilterCourse && searchFilterCourse.length > 0 ? (
                        this.renderFirstLetterNav(searchFilterCourse)
                    ) : (
                        filterCourseList && filterCourseList.length > 0 ?
                            this.renderFirstLetterNav(filterCourseList) : null
                    )}
                </>)}
            </View>
        );
    }
}

const s = StyleSheet.create({
    classItm: {
        borderRadius: scale(10),
        borderColor: black.third,
        marginHorizontal: scale(2),
    },
    classItmTitleText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        color: themeColor,
        fontWeight: '600',
        alignSelf: 'center',
        marginLeft: scale(5),
        textAlign: 'center',
    }
})