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

const offerCourseList = offerCourse.Master;

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

// 返回搜索候選所需的課程列表
handleSearchFilterCourse = (inputText) => {
    // 篩選所需課程
    let filterCourseList = offerCourseList.filter(itm => {
        return itm['Course Code'].toUpperCase().indexOf(inputText) != -1
            || itm['Course Title'].toUpperCase().indexOf(inputText) != -1
    });
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
            scrollData: undefined,
        };

        this.textInputRef = React.createRef();
        this.scrollViewRef = React.createRef();
    }

    componentDidMount() {
        const { filterOptions } = this.state;

        // 默認篩選FST可選學系
        this.handleFilterFaculty(filterOptions.facultyName, filterOptions.depaName);
        // 默認篩選ECE可選課程
        this.handleFilterCourse(filterOptions.depaName);

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

        this.setState({
            offerFacultyList,
            offerGEList,

            offerCourseByFaculty,
            offerCourseByDepa,
            offerFacultyDepaListObj,
            offerCourseByGE,
        })

        // console.log('offerCourseByFaculty', offerCourseByFaculty);
        // console.log('offerCourseByDepa', offerCourseByDepa);
        // console.log('offerFacultyDepaListObj', offerFacultyDepaListObj);
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
                                this.setState({ filterOptions, filterCourseList });
                            }}
                        >
                            <Text style={{
                                color: itm === filterOptions.facultyName ? white : black.third,
                                fontWeight: itm === filterOptions.facultyName ? 'bold' : 'normal',
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

                {/* 部門分類選擇，例ECE、EME */}
                {false && offerDepaList.length > 0 ? (
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
                ) : null}
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
                            this.setState({ filterOptions, filterCourseList })
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
        let classFaculty = offerCourseList.filter(itm => {
            return itm['Offering Unit'] == facultyName
        });

        let depaList = [];
        classFaculty.map((itm) => {
            const depaName = itm['Offering Department'];
            if (depaName != undefined && depaList.indexOf(depaName) == -1) {
                depaList.push(depaName)
            }
        })

        this.setState({ offerDepaList: depaList })
        return depaList
    }

    // 篩選出可選課程
    handleFilterCourse = (depaName) => {
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
                                        const offerCourseList = offerCourseByGE[itm];
                                        this.setState({ filterOptions, offerCourseList })
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
                this.setState({ filterOptions, filterCourseList, })
            }}
        >
            <Text style={{
                color: filterOptions.option === filterName ? white : black.third,
                fontWeight: filterOptions.option === filterName ? 'bold' : 'normal',
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
                            inputText = inputText.toUpperCase()
                            this.setState({
                                inputText,
                                inputOK: inputText.length > 0,
                            });
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
                                this.setState({
                                    inputText: '',
                                    inputOK: false,
                                    scrollData: {},
                                })
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
                        backgroundColor: inputOK ? themeColor : 'gray',
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
                        backgroundColor: inputOK ? themeColor : 'gray',
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
        const { scrollData } = this.state;
        const letter = Object.keys(letterData)[0];
        if (!(letter in scrollData) || letterData[letter] < scrollData[letter]) {
            scrollData[letter] = letterData[letter];
        }
    }

    render() {
        const {
            isLoading,
            filterCourseList,
            inputText,
            offerFacultyDepaListObj,
        } = this.state;

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
                        {inputText.length > 2 && handleSearchFilterCourse(inputText).length > 0 ? (
                            <CourseCard data={handleSearchFilterCourse(inputText)} mode={'json'} handleSetLetterData={this.handleSetLetterData} />
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
                                {offerCourse.academicYear}學年, Sem {offerCourse.sem} 可供預選/開設課程
                            </Text>
                            <Text style={{ fontSize: scale(9), color: black.third }}>
                                更新日期: {offerCourse.updateTime}
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

                    {/* 渲染側邊首字母導航 */}
                    {inputText.length > 2 && handleSearchFilterCourse(inputText).length > 0 ? (
                        this.renderFirstLetterNav(handleSearchFilterCourse(inputText))
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