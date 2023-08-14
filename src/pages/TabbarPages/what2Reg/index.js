import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Button,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    FlatList,
    TouchableWithoutFeedback,
    KeyboardAvoidingView,
} from "react-native";

import { UMEH_URI, UMEH_API } from "../../../utils/pathMap";
import { COLOR_DIY } from '../../../utils/uiMap';
import offerCourse from '../../../static/UMCourses/offer courses.json';
import Loading from '../../../components/Loading';
import CourseCard from './component/CourseCard';

import axios from "axios";
import { scale } from "react-native-size-matters";
import { Header } from '@rneui/themed';
import { FlatGrid } from 'react-native-super-grid';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Interactable from 'react-native-interactable';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

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
    // 'CSG': '',
    'DPC': '物理及化學系',
    'ECE': '電機及電腦工程系',
    'EME': '機電工程系',
    'MAT': '數學系',
}

// 檢測輸入是否包含數字
function numContain(input) {
    let check = /\d/;
    return check.test(input);
}

export default class index extends Component {
    constructor() {
        super();
        this.state = {
            infoStatistics: undefined,

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
            scrollData: undefined,
        };
        this.textInputRef = React.createRef();
        this.scrollViewRef = React.createRef();
    }

    componentDidMount() {
        const { filterOptions } = this.state;
        const offerCourseList = offerCourse.Master;
        // 開設課程的學院名列表
        let offerFacultyList = [];
        // GE課程代號列表
        let offerGEList = [];

        offerCourseList.map((itm) => {
            const facultyName = itm['Offering Unit'];
            if (facultyName != undefined && !offerFacultyList.includes(facultyName)) {
                offerFacultyList.push(facultyName)
            }
            const courseCode = itm['Course Code'].substring(0, 4);
            if (courseCode != undefined && courseCode.substring(0, 2) == 'GE' && !offerGEList.includes(courseCode)) {
                offerGEList.push(courseCode)
            }
        })
        this.setState({
            offerFacultyList,
            offerGEList,
        })

        // 默認篩選FST可選學系
        this.handleFilterFaculty('FST');
        // 默認篩選ECE可選課程
        this.handleFilterCourse('ECE');
        filterOptions.facultyName = 'FST'; filterOptions.depaName = 'ECE';
        this.setState({ filterOptions });
    };

    // 按選擇的學院名，從可選學系中篩選可選課程
    handleFilterFaculty = (facultyName) => {
        const { filterOptions } = this.state;
        filterOptions.facultyName = facultyName;
        let depaList = this.handleFilterDepa(facultyName);
        if (depaList.length > 0) {
            // 有學系分類可選
            filterOptions.depaName = depaList[0];
            this.handleFilterCourse(depaList[0])
        } else {
            this.handleFilterCourse('')
        }
        this.setState({ filterOptions })
    }

    // 按選擇的學院名整理可供選擇的學系
    handleFilterDepa = (facultyName) => {
        const offerCourseList = offerCourse.Master;
        let classFaculty = offerCourseList.filter(itm => {
            return itm['Offering Unit'] == facultyName
        });

        let depaList = [];
        classFaculty.map((itm) => {
            const depaName = itm['Offering Department'];
            if (depaName != undefined && !depaList.includes(depaName)) {
                depaList.push(depaName)
            }
        })

        this.setState({ offerDepaList: depaList })
        return depaList
    }

    // 篩選出可選課程
    handleFilterCourse = (depaName) => {
        const offerCourseList = offerCourse.Master;
        const { filterOptions } = this.state;

        // 篩選所需課程
        let filterCourseList = offerCourseList.filter(itm => {
            // CM/RE課Mode
            if (filterOptions.option != 'GE') {
                if (depaName == '') {
                    // 無學系可選情況，篩選選擇學院的課程
                    return itm['Offering Unit'] == filterOptions.facultyName
                } else {
                    // 有學系可選，篩選選擇學系的課程
                    return itm['Offering Department'] == depaName
                }
            }
            // GE課Mode，此時depaName為GELH、GEST等
            else {
                return itm['Course Code'].substring(0, 4) == depaName
            }
        });
        // 按首字母排序
        filterCourseList.sort((a, b) => a['Course Code'].substring(0, 3).localeCompare(b['Course Code'].substring(0, 3), 'es', { sensitivity: 'base' }));
        this.setState({ filterCourseList, scrollData: {} })
        // console.log('篩選後數據', filterCourseList);
    }

    // 渲染篩選總列表
    renderFilterView = () => {
        const {
            filterOptions,
            offerFacultyList,
            offerDepaList,
            offerGEList,
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
                <View style={{ flexDirection: 'row' }}>
                    {/* CE/RE選項 */}
                    {this.renderFirstFilter('CMRE')}
                    {this.renderFirstFilter('GE')}
                </View>

                {filterOptions.option != 'GE' ? (<>
                    <View
                        style={{
                            marginTop: scale(5),
                            width: '100%',
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                        }} >
                        {/* 學院分類選擇，例FST、FSS */}
                        {offerFacultyList.length > 0 ? (
                            <View style={{ width: '50%' }}>
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
                                                borderColor: itm === filterOptions.facultyName ? themeColor : black.third,
                                                backgroundColor: itm === filterOptions.facultyName ? themeColor : null,
                                                padding: scale(5), paddingVertical: scale(3),
                                                marginVertical: scale(3),
                                            }}
                                            onPress={() => {
                                                ReactNativeHapticFeedback.trigger('soft');
                                                this.handleFilterFaculty(itm);
                                            }}
                                        >
                                            <Text style={{
                                                color: itm === filterOptions.facultyName ? white : black.third,
                                                fontWeight: itm === filterOptions.facultyName ? 'bold' : 'normal',
                                                fontSize: scale(12)
                                            }}>{itm}</Text>
                                        </TouchableOpacity>
                                    )}
                                    ListFooterComponent={() =>
                                        <Text style={{ fontSize: scale(11), color: black.third, marginLeft: scale(3), }}>
                                            {unitMap[filterOptions.facultyName]}
                                        </Text>
                                    }
                                />
                            </View>
                        ) : null}

                        {/* 部門分類選擇，例ECE、EME */}
                        {offerDepaList.length > 0 ? (
                            <View style={{ width: '50%' }}>
                                <FlatList
                                    data={offerDepaList}
                                    key={offerDepaList.length}
                                    keyExtractor={(item, index) => index}
                                    numColumns={offerDepaList.length}
                                    columnWrapperStyle={offerDepaList.length > 1 ? { flexWrap: 'wrap' } : null}
                                    renderItem={({ item: itm }) => (
                                        <TouchableOpacity style={{
                                            padding: scale(5), paddingVertical: scale(3), marginHorizontal: scale(5), marginVertical: scale(2.5),
                                            ...s.classItm,
                                            borderColor: filterOptions.depaName === itm ? themeColor : black.third,
                                            backgroundColor: filterOptions.depaName === itm ? themeColor : null,
                                        }}
                                            onPress={() => {
                                                ReactNativeHapticFeedback.trigger('soft');
                                                filterOptions.depaName = itm;
                                                this.setState({ filterOptions })
                                                this.handleFilterCourse(itm);
                                            }}
                                        >
                                            <Text style={{
                                                color: filterOptions.depaName === itm ? white : black.third,
                                                fontWeight: filterOptions.depaName === itm ? 'bold' : 'normal',
                                                fontSize: scale(12)
                                            }}>{itm}</Text>
                                        </TouchableOpacity>
                                    )}
                                    // 展示學系中文名稱
                                    ListFooterComponent={() => offerDepaList
                                        && offerDepaList.length > 0
                                        && filterOptions.depaName in depaMap ?
                                        <Text style={{ fontSize: scale(11), color: black.third, marginLeft: scale(3), }}>
                                            {depaMap[filterOptions.depaName]}
                                        </Text> : null
                                    }
                                />
                            </View>
                        ) : null}
                    </View>
                </>) : (
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
                                        this.setState({ filterOptions })
                                        this.handleFilterCourse(itm);
                                    }}
                                >
                                    <Text style={{
                                        color: filterOptions.GE === itm ? white : black.third,
                                        fontWeight: filterOptions.GE === itm ? 'bold' : 'normal',
                                        fontSize: scale(12)
                                    }}>{itm}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}
            </View>
        )
    }

    // 渲染第一級的filter
    renderFirstFilter = (filterName) => {
        const { filterOptions } = this.state;
        return <TouchableOpacity
            style={{
                ...s.classItm,
                padding: scale(8),
                borderColor: filterOptions.option === filterName ? themeColor : black.third,
                backgroundColor: filterOptions.option === filterName ? themeColor : null,
            }}
            onPress={() => {
                ReactNativeHapticFeedback.trigger('soft');
                filterOptions.option = filterName;
                this.setState({ filterOptions })
                if (filterName == 'CMRE') {
                    const depaList = this.handleFilterDepa(filterOptions.facultyName);
                    if (depaList.length > 0) {
                        // 有學系分類可選
                        this.handleFilterCourse(filterOptions.depaName)
                    } else {
                        this.handleFilterCourse('')
                    }
                } else if (filterName == 'GE') {
                    this.setState({ filterOptions })
                    this.handleFilterCourse(filterOptions.GE)
                }
            }}
        >
            <Text style={{
                color: filterOptions.option === filterName ? white : black.third,
                fontWeight: filterOptions.option === filterName ? 'bold' : 'normal',
                fontSize: scale(12),
            }}>{filterName === 'CMRE' ? 'CM/RE' : 'GE'}</Text>
        </TouchableOpacity>
    }

    // 搜索候選
    handleSearchFilterCourse = (inputText) => {
        const offerCourseList = offerCourse.Master;
        // 篩選所需課程
        let filterCourseList = offerCourseList.filter(itm => {
            return itm['Course Code'].toUpperCase().includes(inputText)
                || itm['Course Title'].toUpperCase().includes(inputText)
        });
        filterCourseList.sort((a, b) => a['Course Code'].substring(0, 3).localeCompare(b['Course Code'].substring(0, 3), 'es', { sensitivity: 'base' }));
        return filterCourseList
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

    // 校驗輸入的code是否符合規則
    checkInput = (inputText) => {
        this.setState({ inputOK: inputText.length > 0 })
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
                            inputText = inputText.toUpperCase()
                            this.setState({ inputText });
                            this.checkInput(inputText);
                        }}
                        value={inputText}
                        selectTextOnFocus
                        placeholder="e.g. ECEN1234 or Electrical"
                        placeholderTextColor={black.third}
                        ref={this.textInputRef}
                        onFocus={() => ReactNativeHapticFeedback.trigger('soft')}
                    />
                    {/* 清空搜索框按鈕 */}
                    {inputText.length > 0 ? (
                        <TouchableOpacity
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                this.setState({ inputText: '', scrollData: {} })
                                this.checkInput('');
                                this.textInputRef.current.focus();
                            }}>
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
                        backgroundColor: (isLoading || !inputOK) ? 'gray' : themeColor,
                        borderRadius: scale(10),
                        padding: scale(5), paddingHorizontal: scale(8),
                        alignItems: 'center'
                    }}
                    disabled={isLoading || !inputOK}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.jumpToRelateCoursePage({ inputText, type: 'course' })
                    }}
                >
                    <Text style={{ fontSize: scale(12), color: white }}>查課</Text>
                </TouchableOpacity>
                {/* 教授搜索按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: (isLoading || !inputOK) ? 'gray' : themeColor,
                        borderRadius: scale(10),
                        padding: scale(5), paddingHorizontal: scale(8),
                        alignItems: 'center',
                        marginHorizontal: scale(5)
                    }}
                    disabled={isLoading || !inputOK}
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.jumpToRelateCoursePage({ inputText, type: 'prof' })
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

    // 渲染懸浮可拖動按鈕
    renderGoTopButton = () => {
        const buttonSize = scale(50);
        return (
            <Interactable.View
                style={{
                    zIndex: 999,
                    position: 'absolute',
                }}
                ref="headInstance"
                // 設定所有可吸附的屏幕位置 0,0為屏幕中心
                snapPoints={[
                    { x: -scale(140), y: -scale(220) },
                    { x: scale(140), y: -scale(220) },
                    { x: -scale(140), y: -scale(120) },
                    { x: scale(140), y: -scale(120) },
                    { x: -scale(140), y: scale(0) },
                    { x: scale(140), y: scale(0) },
                    { x: -scale(140), y: scale(120) },
                    { x: scale(140), y: scale(120) },
                    { x: -scale(140), y: scale(220) },
                    { x: scale(140), y: scale(220) },
                ]}
                // 設定初始吸附位置
                initialPosition={{ x: scale(140), y: scale(220) }}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.scrollViewRef.current.scrollTo({
                            x: 0,
                            y: 0,
                            duration: 500, // 回頂時間
                        });
                    }}>
                    <View
                        style={{
                            width: buttonSize, height: buttonSize,
                            backgroundColor: white,
                            borderRadius: scale(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...viewShadow,
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={scale(40)}
                            color={themeColor}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    // 渲染首字母側邊導航
    renderFirstLetterNav = (filterCourseList) => {
        const { scrollData } = this.state;
        let firstLetterList = [];
        filterCourseList.map((itm) => {
            const firstLetter = itm['Course Code'][0];
            if (firstLetter != undefined && !firstLetterList.includes(firstLetter)) {
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
        const { scrollData } = this.state;
        const letter = Object.keys(letterData)[0];
        if (!(letter in scrollData) || letterData[letter] < scrollData[letter]) {
            scrollData[letter] = letterData[letter];
        }
    }

    render() {
        const { isLoading,
            filterOptions,
            offerFacultyList,
            offerDepaList,
            offerGEList,
            filterCourseList,
            inputText,
        } = this.state;
        const {
            updateTime,
            academicYear,
            sem,
        } = offerCourse;

        const searchFilterCourseList = this.handleSearchFilterCourse(inputText);

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

                {isLoading ? null : this.renderGoTopButton()}

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
                        {/* 標題，選咩課ARK版 */}
                        <View style={{
                            alignSelf: 'center',
                            // borderRadius: scale(10),
                            // borderWidth: scale(2),
                            // borderColor: themeColor,
                            paddingVertical: scale(5), paddingHorizontal: scale(10)
                        }}>
                            <Text style={{ fontSize: scale(18), color: themeColor, fontWeight: '600' }}>選咩課ARK版</Text>
                        </View>

                        <>
                            {this.renderSearch()}
                        </>

                        {/* 搜索候選課程 */}
                        {inputText.length > 2 && searchFilterCourseList.length > 0 ? (
                            <CourseCard data={searchFilterCourseList} mode={'json'} handleSetLetterData={this.handleSetLetterData} />
                        ) : (<>
                            {/* 篩選列表 */}
                            {this.renderFilterView()}

                            {/* 渲染篩選出的課程 */}
                            {filterCourseList.length > 0 ? (
                                <View style={{ alignItems: 'center' }}>
                                    <CourseCard data={filterCourseList} mode={'json'} handleSetLetterData={this.handleSetLetterData} />
                                </View>
                            ) : null}
                        </>)}

                        {/* 篩選課程功能 更新時間 */}
                        <View style={{ marginTop: scale(10), alignItems: 'center' }}>
                            <Text style={{ fontSize: scale(10), color: black.third }}>
                                {academicYear}學年, Sem {sem} 可供預選/開設課程
                            </Text>
                            <Text style={{ fontSize: scale(9), color: black.third }}>
                                更新日期: {updateTime}
                            </Text>
                        </View>

                        {/* 官網引流 */}
                        <View style={{
                            margin: scale(10), marginBottom: scale(50),
                            padding: scale(10),
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: black.third, fontSize: scale(12) }}>知識無價，評論只供參考~</Text>
                            <Text style={{ color: black.third, fontSize: scale(12) }} selectable>Power by UMHelper <Text style={{ color: themeColor }}>umeh.top</Text></Text>
                            <Text style={{ color: black.third, fontSize: scale(12) }}>Redesign by ARK</Text>
                        </View>

                    </ScrollView>
                    {inputText.length > 2 && searchFilterCourseList.length > 0 ? (
                        this.renderFirstLetterNav(searchFilterCourseList)
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
        borderRadius: scale(5), borderWidth: scale(0.6),
        borderColor: black.third,
        marginHorizontal: scale(2),
    }
})