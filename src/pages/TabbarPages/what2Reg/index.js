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
        };
        this.textInputRef = React.createRef();
        this.scrollViewRef = React.createRef();
    }

    componentDidMount() {
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
    };

    // 按選擇的學院名，從可選學系中篩選可選課程
    handleFilterFaculty = (facultyName) => {
        const { filterOptions } = this.state;
        filterOptions.facultyName = facultyName;
        this.setState({ filterOptions })
        let depaList = this.handleFilterDepa(facultyName);
        if (depaList.length > 0) {
            // 有學系分類可選
            this.handleFilterCourse(depaList[0])
        } else {
            this.handleFilterCourse('')
        }
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
        filterCourseList = filterCourseList.sort((a, b) => a['Course Code'].substring(4, 8) - b['Course Code'].substring(4, 8));
        this.setState({ filterCourseList })
        // console.log('篩選後數據', filterCourseList);
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
        let inputOK = false;
        // TODO: 例如FLL MLS的課不止有8位Code
        // if (numContain(inputText) && inputText.length == 8) {
        //     const codeBegin = inputText.substring(0, 4);
        //     const codeEnd = inputText.substring(4, 8);
        //     if (!numContain(codeBegin) && !!Number(codeEnd)) {
        //         inputOK = true;
        //     } else {
        //         inputOK = false;
        //     }
        // }
        if (inputText.length > 0) {
            inputOK = true;
        }
        // TODO: 教授姓名查詢
        // else if (!numContain(inputText) && inputText.length >= 3) {
        //     inputOK = true;
        // }
        this.setState({ inputOK })
    };

    // 搜索框
    renderSearch = () => {
        const { inputText, isLoading, inputOK, } = this.state;
        return (
            <KeyboardAvoidingView
                style={{
                    alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'row',
                    marginTop: scale(5)
                }}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                {/* 搜索框 */}
                <View
                    style={{
                        borderWidth: scale(1),
                        borderColor: themeColor,
                        borderRadius: scale(10),
                        flexDirection: 'row',
                        justifyContent: 'center', alignItems: 'center',
                        marginHorizontal: scale(5),
                        paddingHorizontal: scale(5),
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
                            fontSize: scale(12)
                        }}
                        onChangeText={(inputText) => {
                            inputText = inputText.toUpperCase()
                            this.setState({ inputText });
                            this.checkInput(inputText);
                        }}
                        value={inputText}
                        selectTextOnFocus
                        placeholder="e.g. ECEN1234"
                        placeholderTextColor={black.third}
                        ref={this.textInputRef}
                        onFocus={() => ReactNativeHapticFeedback.trigger('soft')}
                    />
                    {/* 清空搜索框按鈕 */}
                    {inputText.length > 0 ? (
                        <TouchableOpacity
                            onPress={() => {
                                this.setState({ inputText: '' })
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
                {/* TODO: 搜索候選 */}
                {/* 搜索按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: (isLoading || !inputOK) ? 'gray' : themeColor,
                        borderRadius: scale(10),
                        padding: scale(5), paddingHorizontal: scale(10),
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
                <TouchableOpacity
                    style={{
                        backgroundColor: (isLoading || !inputOK) ? 'gray' : themeColor,
                        borderRadius: scale(10),
                        padding: scale(5), paddingHorizontal: scale(10),
                        alignItems: 'center',
                        marginLeft: scale(5)
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

    render() {
        const { isLoading,
            filterOptions,
            offerFacultyList,
            offerDepaList,
            offerGEList,
            filterCourseList
        } = this.state;
        const {
            updateTime,
            academicYear,
            sem,
        } = offerCourse;

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
                    <ScrollView ref={this.scrollViewRef} >
                        {/* 標題 */}
                        <View style={{
                            alignSelf: 'center',
                            borderRadius: scale(10),
                            borderWidth: scale(2),
                            borderColor: themeColor,
                            paddingVertical: scale(5), paddingHorizontal: scale(10)
                        }}>
                            <Text style={{ fontSize: scale(18), color: themeColor, fontWeight: '600' }}>選咩課ARK版</Text>
                        </View>

                        {/* 篩選課程功能 更新時間展示 */}
                        <View style={{ marginTop: scale(5), alignItems: 'center' }}>
                            <Text style={{ fontSize: scale(12), color: black.main }}>
                                {academicYear}學年, Sem {sem} 開設課程
                            </Text>
                            <Text style={{ fontSize: scale(11), color: black.third }}>
                                更新日期: {updateTime}
                            </Text>
                        </View>

                        {/* 篩選列表 */}
                        <View style={{ alignItems: 'center' }}>
                            {/* 課程類型選擇 CMRE or GE */}
                            <View
                                style={{
                                    flexDirection: 'row',
                                    backgroundColor: white,
                                    padding: scale(5), paddingHorizontal: scale(10),
                                    margin: scale(5),
                                    borderRadius: scale(10)
                                }}>
                                <Text style={{ fontSize: scale(12), color: black.second }}>課程類型: </Text>

                                {/* CE/RE選項 */}
                                <TouchableOpacity
                                    style={{ paddingHorizontal: scale(5) }}
                                    onPress={() => {
                                        ReactNativeHapticFeedback.trigger('soft');
                                        filterOptions.option = 'CMRE';
                                        this.setState({ filterOptions })
                                        this.handleFilterCourse(filterOptions.depaName)
                                    }}
                                >
                                    <Text style={{ color: filterOptions.option === 'CMRE' ? secondThemeColor : black.third, fontSize: scale(12) }}>CM/RE</Text>
                                </TouchableOpacity>

                                {/* GE選項 */}
                                <TouchableOpacity
                                    style={{ paddingHorizontal: scale(5) }}
                                    onPress={() => {
                                        ReactNativeHapticFeedback.trigger('soft');
                                        filterOptions.option = 'GE';
                                        this.setState({ filterOptions })
                                        this.handleFilterCourse(filterOptions.GE)
                                    }}
                                >
                                    <Text style={{ color: filterOptions.option === 'GE' ? secondThemeColor : black.third, fontSize: scale(12) }}>GE</Text>
                                </TouchableOpacity>
                            </View>

                            {filterOptions.option != 'GE' ? (<>
                                {/* 學院分類選擇，例FST、FSS */}
                                {offerFacultyList.length > 0 ? (
                                    <FlatList
                                        data={offerFacultyList}
                                        keyExtractor={(item, index) => index}
                                        numColumns={offerFacultyList.length}
                                        columnWrapperStyle={offerFacultyList.length > 1 ? { flexWrap: 'wrap' } : null}
                                        contentContainerStyle={{
                                            flexDirection: 'row',
                                            backgroundColor: white,
                                            padding: scale(5), margin: scale(5), marginHorizontal: scale(10),
                                            borderRadius: scale(10),
                                        }}
                                        renderItem={({ item: itm }) => (
                                            <TouchableOpacity
                                                style={{ paddingHorizontal: scale(5), marginVertical: scale(3) }}
                                                onPress={() => {
                                                    ReactNativeHapticFeedback.trigger('soft');
                                                    this.handleFilterFaculty(itm);
                                                }}
                                            >
                                                <Text style={{ color: itm === filterOptions.facultyName ? secondThemeColor : black.third, fontSize: scale(12) }}>{itm}</Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                ) : null}

                                {/* 部門分類選擇，例ECE、EME */}
                                {offerDepaList.length > 0 ? (
                                    <View
                                        style={{
                                            flexDirection: 'row',
                                            backgroundColor: white,
                                            padding: scale(5), margin: scale(5),
                                            borderRadius: scale(10)
                                        }}>
                                        {offerDepaList.map((itm) => {
                                            return (
                                                <TouchableOpacity style={{ paddingHorizontal: scale(5) }}
                                                    onPress={() => {
                                                        ReactNativeHapticFeedback.trigger('soft');
                                                        filterOptions.depaName = itm;
                                                        this.setState({ filterOptions })
                                                        this.handleFilterCourse(itm);
                                                    }}
                                                >
                                                    <Text style={{ color: filterOptions.depaName === itm ? secondThemeColor : black.third, fontSize: scale(12) }}>{itm}</Text>
                                                </TouchableOpacity>
                                            )
                                        })}
                                    </View>
                                ) : null}
                            </>) : (
                                <View style={{
                                    flexDirection: 'row',
                                    backgroundColor: white,
                                    padding: scale(5), margin: scale(5),
                                    borderRadius: scale(10)
                                }}>
                                    {offerGEList.length > 0 && offerGEList.map(itm => {
                                        return (
                                            <TouchableOpacity style={{ paddingHorizontal: scale(5) }}
                                                onPress={() => {
                                                    ReactNativeHapticFeedback.trigger('soft');
                                                    filterOptions.GE = itm;
                                                    this.setState({ filterOptions })
                                                    this.handleFilterCourse(itm);
                                                }}
                                            >
                                                <Text style={{ color: filterOptions.GE === itm ? secondThemeColor : black.third, fontSize: scale(12) }}>{itm}</Text>
                                            </TouchableOpacity>
                                        )
                                    })}
                                </View>
                            )}
                        </View>

                        {/* 渲染篩選出的課程 */}
                        {filterCourseList.length > 0 ? <CourseCard data={filterCourseList} mode={'json'} /> : null}

                        {/* 官網引流 */}
                        <View style={{
                            margin: scale(10), marginBottom: scale(50),
                            padding: scale(10),
                            alignItems: 'center'
                        }}>
                            <Text style={{ color: black.third, fontSize: scale(12) }}>知識無價，評論只供參考~</Text>
                            <Text style={{ color: black.third, fontSize: scale(12) }}>Power by UMHelper</Text>
                            <Text style={{ color: black.third, fontSize: scale(12) }}>Redesign by ARK</Text>
                        </View>

                    </ScrollView>
                    {this.renderSearch()}
                </>)}
            </View>
        );
    }
}
