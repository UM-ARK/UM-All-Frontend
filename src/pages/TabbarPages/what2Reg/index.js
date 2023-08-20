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
} from "react-native";

import { UMEH_URI, UMEH_API, WHAT_2_REG } from "../../../utils/pathMap";
import { COLOR_DIY } from '../../../utils/uiMap';
import offerCourses from '../../../static/UMCourses/offerCourses.json';
import Loading from '../../../components/Loading';
import CourseCard from './component/CourseCard';

import axios from "axios";
import { scale } from "react-native-size-matters";
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { themeColor, black, white, viewShadow } = COLOR_DIY;

const offerCourseList = offerCourses.Courses;
// 1. Excel開課數據按首字母排序，複製一份排序後的數據到offerCourses.json，節省安卓端性能
// offerCourseList.sort((a, b) => a['Course Code'].substring(4, 8).localeCompare(b['Course Code'].substring(4, 8), 'es', { sensitivity: 'base' }));
// offerCourseList.sort((a, b) => a['Course Code'].substring(0, 3).localeCompare(b['Course Code'].substring(0, 3), 'es', { sensitivity: 'base' }));

// 2. 複製替換原課程列表為排序後列表
// const courseListStr = JSON.stringify(offerCourseList);

// 3. 獲取英文課程標題
// let enList = offerCourseList.map((itm) => itm['Course Title']);
// const enListStr = JSON.stringify(enList);
// console.log('enListStr', enListStr);

// 4. 保存為docx翻譯為中文繁體，去除特殊符號 “” 《》 ，
// const cnListStr = ;

// 5. 插入原數組
// offerCourseList.map((itm,idx)=>{
//     itm['Course Title Chi'] = cnListStr[idx];
// })
// console.log(JSON.stringify(offerCourseList));

// 學院名中文參考
const unitMap = {
    'FAH': '人文學院',
    'FBA': '工商管理學院',
    'FED': '教育學院',
    'FST': '科技學院',
    'FHS': '健康科學學院',
    'FSS': '社會科學學院',
    'FLL': '法學院',
    'IAPME': '應用物理及材料工程研究院',
    'ICMS': '中華醫藥研究院',
    'IME': '微電子研究院',
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
    'CSG': ' - ',
    'DPC': '物理及化學系',
    'ECE': '電機及電腦工程系',
    'EME': '機電工程系',
    'MAT': '數學系',
}

// 判斷字符串是否包含中文
function hasChinese(str) {
    return /[\u4E00-\u9FA5]+/g.test(str)
}

// 返回搜索候選所需的課程列表
handleSearchFilterCourse = (inputText) => {
    inputText = inputText.toUpperCase();
    // 篩選所需課程
    let filterCourseList = offerCourseList.filter(itm => {
        return itm['Course Code'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title Chi'].indexOf(inputText) != -1
    });
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
                option: 'CMRE',
                facultyName: 'FST',
                depaName: 'ECE',
                GE: 'GEST'
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

    componentDidMount() {
        this.getClassifyCourse();
    };

    // 對開課數據進行分類
    getClassifyCourse = () => {
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

        let filterCourseList = offerCourseByDepa['ECE'];

        this.setState({
            offerFacultyList,
            offerGEList,

            offerCourseByFaculty,
            offerCourseByDepa,
            offerFacultyDepaListObj,
            offerCourseByGE,

            filterCourseList,
        })
    }

    renderClassifySwitch = () => {
        const {
            filterOptions,
            offerFacultyDepaListObj,
            offerCourseByDepa,
            offerCourseByFaculty,
        } = this.state;
        const offerFacultyList = Object.keys(offerFacultyDepaListObj);

        return (
            <View>
                {/* 學院分類選擇，例FST、FSS */}
                <FlatList
                    data={offerFacultyList}
                    key={offerFacultyList.length}
                    keyExtractor={(item, index) => index}
                    numColumns={offerFacultyList.length}
                    columnWrapperStyle={offerFacultyList.length > 1 ? { flexWrap: 'wrap' } : null}
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
                            }}
                        >
                            <Text style={{
                                color: itm === filterOptions.facultyName ? white : black.third,
                                fontWeight: itm === filterOptions.facultyName ? '900' : 'normal',
                                fontSize: scale(12)
                            }}>{itm}</Text>
                        </TouchableOpacity>
                    )}
                    ListHeaderComponent={() =>
                        <Text style={{
                            fontSize: scale(13),
                            color: black.third,
                            marginLeft: scale(5),
                        }}>
                            {unitMap[filterOptions.facultyName]}
                        </Text>
                    }
                    // 學系分類選擇，例如 ECE、EME
                    ListFooterComponent={() => this.renderDepaFilter()}
                />
            </View>
        )
    }

    renderDepaFilter = () => {
        const {
            filterOptions,
            offerFacultyDepaListObj,
            offerCourseByDepa,
        } = this.state;

        const offerDepaList = offerFacultyDepaListObj[filterOptions.facultyName];

        return offerDepaList.length > 0 &&
            <FlatList
                data={offerDepaList}
                key={offerDepaList.length}
                keyExtractor={(item, index) => index}
                numColumns={offerDepaList.length}
                columnWrapperStyle={offerDepaList.length > 1 ? { flexWrap: 'wrap' } : null}
                renderItem={({ item: itm }) => (
                    <TouchableOpacity style={{
                        paddingHorizontal: scale(5), paddingVertical: scale(2),
                        ...s.classItm,
                        backgroundColor: filterOptions.depaName === itm ? themeColor : null,
                    }}
                        onPress={() => {
                            ReactNativeHapticFeedback.trigger('soft');
                            const depaName = itm;
                            let filterCourseList = [];
                            filterCourseList = offerCourseByDepa[depaName]
                            filterOptions.depaName = depaName;
                            this.setState({ filterOptions, filterCourseList, scrollData: {} })
                        }}
                    >
                        <Text style={{
                            color: filterOptions.depaName === itm ? white : black.third,
                            fontWeight: filterOptions.depaName === itm ? '900' : 'normal',
                            fontSize: scale(12)
                        }}>{itm}</Text>
                    </TouchableOpacity>
                )}
                // 展示學系中文名稱
                ListHeaderComponent={() =>
                    offerDepaList
                        && offerDepaList.length > 0
                        && filterOptions.depaName in depaMap ?
                        <Text style={{
                            fontSize: scale(13), color: black.third,
                            marginLeft: scale(5),
                            marginTop: scale(5),
                        }}>
                            {depaMap[filterOptions.depaName]}
                        </Text> : null
                }
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

        return (
            <View
                style={{
                    alignItems: 'center', backgroundColor: white,
                    borderRadius: scale(10),
                    padding: scale(5),
                    margin: scale(5), marginHorizontal: scale(10),
                }}>
                {/* 課程類型選擇 CMRE or GE */}
                <Text style={{
                    fontSize: scale(13),
                    color: black.third,
                }}>
                    {filterOptions.option == 'GE' ? '通識課' : '必修課 / 選修課'}
                </Text>
                <View style={{ flexDirection: 'row', marginTop: scale(3) }}>
                    {/* CE/RE選項 */}
                    {this.renderFirstFilter('CMRE')}
                    {this.renderFirstFilter('GE')}
                </View>

                {/* 渲染分類課程選擇按鈕 */}
                {filterOptions.option == 'GE' ? (
                    <View style={{ flexDirection: 'row', marginTop: scale(5), }}>
                        {offerGEList.length > 0 && offerGEList.map(itm => {
                            return (
                                <TouchableOpacity style={{
                                    paddingHorizontal: scale(5), paddingVertical: scale(3),
                                    ...s.classItm,
                                    borderColor: filterOptions.GE === itm ? themeColor : black.third,
                                    backgroundColor: filterOptions.GE === itm ? themeColor : null,
                                }}
                                    onPress={() => {
                                        ReactNativeHapticFeedback.trigger('soft');
                                        filterOptions.GE = itm;
                                        let filterCourseList = offerCourseByGE[itm];
                                        this.setState({ filterOptions, filterCourseList, scrollData: {} })
                                    }}
                                >
                                    <Text style={{
                                        color: filterOptions.GE === itm ? white : black.third,
                                        fontWeight: filterOptions.GE === itm ? '900' : 'normal',
                                        fontSize: scale(12)
                                    }}>{itm}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                ) : (
                    <View style={{
                        marginTop: scale(5),
                        width: '100%',
                    }} >
                        {offerFacultyDepaListObj ? this.renderClassifySwitch() : null}
                    </View>
                )}
            </View>
        )
    }

    // 渲染第一級的filter
    renderFirstFilter = (filterName) => {
        const {
            filterOptions,
            offerFacultyDepaListObj,
            offerCourseByDepa,
            offerCourseByGE,
            offerCourseByFaculty,
        } = this.state;

        return <TouchableOpacity
            style={{
                ...s.classItm,
                padding: scale(8),
                backgroundColor: filterOptions.option === filterName ? themeColor : null,
            }}
            onPress={() => {
                ReactNativeHapticFeedback.trigger('soft');
                let filterCourseList = [];
                if (filterName == 'CMRE') {
                    const facultyName = filterOptions.facultyName;
                    if (offerFacultyDepaListObj[facultyName].length > 0) {
                        filterCourseList = offerCourseByDepa[filterOptions.depaName];
                    } else {
                        filterCourseList = offerCourseByFaculty[facultyName];
                    }
                } else if (filterName == 'GE') {
                    filterCourseList = offerCourseByGE[filterOptions.GE]
                }
                filterOptions.option = filterName;
                this.setState({ filterOptions, filterCourseList, scrollData: {} })
            }}
        >
            <Text style={{
                color: filterOptions.option === filterName ? white : black.third,
                fontWeight: filterOptions.option === filterName ? '900' : 'normal',
                fontSize: scale(12),
            }}>{filterName === 'CMRE' ? 'CM/RE' : 'GE'}</Text>
        </TouchableOpacity>
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
                            paddingVertical: scale(3),
                            color: black.main,
                            fontSize: scale(12),
                            width: scale(180),
                        }}
                        onChangeText={(inputText) => {
                            this.setState({
                                inputText,
                                inputOK: inputText.length > 0,
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
                                this.setState({
                                    inputText: '',
                                    inputOK: false,
                                    scrollData: {},
                                })
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
                    <Text style={{ fontSize: scale(12), color: white }}>查課</Text>
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
                    <Text style={{ fontSize: scale(12), color: white }}>搵講師</Text>
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
        const URI = `${WHAT_2_REG}/search.html?keyword=${encodeURIComponent(inputText)}&instructor=${type == 'prof' ? true : false}`
        // Linking.openURL(URI)
        const webview_param = {
            url: URI,
            title: inputText,
            text_color: '#FFF',
            bg_color_diy: '#30548b',
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
                        <Text style={{ fontSize: scale(15), color: themeColor }}>{itm}</Text>
                    </TouchableOpacity>
                })}
            </View>
        ) : null
    }

    handleSetLetterData = (letterData) => {
        let { scrollData } = this.state;
        const letter = Object.keys(letterData)[0];
        if (!(letter in scrollData)
            || letterData[letter] < scrollData[letter]) {
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
                        // stickyHeaderHiddenOnScroll
                        showsVerticalScrollIndicator={false}
                    >
                        {/* 標題 */}
                        <View style={{ alignSelf: 'center', paddingVertical: scale(5), paddingHorizontal: scale(10) }}>
                            <Text style={{ fontSize: scale(18), color: themeColor, fontWeight: '600' }}>ARK搵課</Text>
                        </View>

                        <>
                            {this.renderSearch()}
                        </>

                        {/* 搜索候選課程 */}
                        {searchFilterCourse && searchFilterCourse.length > 0 ? (
                            <>
                                <View style={{ alignSelf: 'center' }}>
                                    <Text style={{ fontSize: scale(12), color: black.third }}>ヾ(ｏ･ω･)ﾉ 拿走不謝~</Text>
                                </View>
                                <CourseCard data={searchFilterCourse} mode={'json'}
                                    handleSetLetterData={this.handleSetLetterData}
                                />
                            </>
                        ) : (<>
                            {/* 篩選列表 */}
                            {this.renderFilterView()}

                            {/* 渲染篩選出的課程 */}
                            {filterCourseList.length > 0 ? (
                                <View style={{ alignItems: 'center' }}>
                                    <CourseCard data={filterCourseList} mode={'json'}
                                        handleSetLetterData={this.handleSetLetterData}
                                    />
                                </View>
                            ) : null}
                        </>)}

                        {/* 篩選課程功能 更新時間 */}
                        <View style={{ marginTop: scale(10), alignItems: 'center' }}>
                            <Text style={{ fontSize: scale(10), color: black.third }}>
                                {offerCourses.academicYear}學年, Sem {offerCourses.sem} 可供預選/開設課程
                            </Text>
                            <Text style={{ fontSize: scale(9), color: black.third }}>
                                更新日期: {offerCourses.updateTime}
                            </Text>
                            <Text style={{ fontSize: scale(9), color: themeColor }}>
                                記得更新APP以獲得最新數據~
                            </Text>
                        </View>

                        <View style={{
                            margin: scale(10), marginBottom: scale(50),
                            padding: scale(10),
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: black.third, fontSize: scale(12) }}>知識無價，評論只供參考~</Text>
                        </View>
                    </ScrollView>

                    {/* 渲染側邊首字母導航 */}
                    {searchFilterCourse && searchFilterCourse.length > 0 ? (
                        this.renderFirstLetterNav(searchFilterCourse)
                    ) : (
                        this.renderFirstLetterNav(filterCourseList)
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
    }
})