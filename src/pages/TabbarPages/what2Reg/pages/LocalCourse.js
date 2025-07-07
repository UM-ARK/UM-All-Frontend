import React, { Component } from 'react'
import {
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Alert,
    StyleSheet,
} from 'react-native'

import { COLOR_DIY, uiStyle, } from '../../../../utils/uiMap';
import { trigger } from '../../../../utils/trigger';
import Header from '../../../../components/Header';
import Loading from '../../../../components/Loading';
import { WHAT_2_REG, ARK_WIKI_SEARCH } from "../../../../utils/pathMap";
import { openLink } from "../../../../utils/browser";
import { logToFirebase } from "../../../../utils/firebaseAnalytics";
import { getLocalStorage } from "../../../../utils/storageKits";
import coursePlanTime from "../../../../static/UMCourses/coursePlanTime";

import { scale } from "react-native-size-matters";
import { NavigationContext } from '@react-navigation/native';
import { MenuView } from '@react-native-menu/menu';
import groupBy from 'lodash/groupBy';
import lodash from 'lodash';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

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
        s_coursePlanTime: coursePlanTime,
        relateCourseList: null,
        groupChoice: 'section', // 預設按section分組
    }

    async componentDidMount() {
        try {
            const storageCoursePlanList = await getLocalStorage('course_plan_time');
            if (storageCoursePlanList) {
                this.setState({ s_coursePlanTime: storageCoursePlanList });
            }
        } catch (error) {
            Alert.alert(JSON.stringify(error))
        } finally {
            this.searchCourse();
        }
    }

    searchCourse = () => {
        const { courseCode, s_coursePlanTime } = this.state;
        const coursePlanList = s_coursePlanTime.Courses;

        const relateCourseList = coursePlanList.filter(itm =>
            itm['Course Code'].toUpperCase().includes(courseCode)
        );
        this.setState({ relateCourseList });

        // 預選有，但課表時間Excel沒有的課程，直接跳轉選咩課
        if (relateCourseList.length == 0) {
            let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
            this.props.navigation.goBack();
            this.context.navigate('Wiki', { url: URL });
        }
        else {
            // 按section分離課程數據
            const relateSectionObj = groupBy(relateCourseList, 'Section');
            const relateTeacherObj = groupBy(relateCourseList, 'Teacher Information');
            this.setState({
                relateSectionObj, relateTeacherObj,
                courseInfo: relateCourseList[0], isLoading: false,
            })
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
                    let isPE = courseInfo['Course Code'] == 'CPED1001' || courseInfo['Course Code'] == 'CPED1002';

                    return (
                        <MenuView
                            onPressAction={({ nativeEvent }) => {
                                switch (nativeEvent.event) {
                                    case 'wiki':
                                        trigger();
                                        let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseInfo['Teacher Information']);
                                        logToFirebase('checkCourse', {
                                            courseCode: courseInfo['Course Code'],
                                            profName: courseInfo['Teacher Information'],
                                        });
                                        this.context.navigate('Wiki', { url: URL });
                                        break;

                                    case 'what2reg':
                                        trigger();
                                        const courseCode = courseInfo['Course Code'];
                                        const profName = courseInfo['Teacher Information'];
                                        const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(profName);
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            profName: profName,
                                        });
                                        openLink(URI);
                                        break;

                                    case 'add':
                                        trigger();
                                        Alert.alert(`ARK搵課提示`, `確定添加此課程到模擬課表嗎？`, [
                                            {
                                                text: 'Yes', onPress: () => {
                                                    trigger();
                                                    this.props.navigation.navigate('CourseSimTab', {
                                                        add: courseInfo
                                                    });
                                                }
                                            },
                                            { text: 'No', },
                                        ]);

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
                                    id: 'add',
                                    title: '添加至模擬課表',
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
                                onPress={() => { trigger('rigid'); }}
                            >
                                <View style={{ flexDirection: 'row', }}>
                                    <Text style={{
                                        ...uiStyle.defaultText, fontSize: scale(12), color: black.third,
                                    }}>{courseInfo.Section + ' - ' + courseInfo['Medium of Instruction']}</Text>
                                </View>

                                {isPE && (<View style={{ alignItems: 'center', }}>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseInfo['Course Title']}</Text>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseInfo['Course Title Chi']}</Text>
                                </View>)}
                                <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: themeColor }}>{courseInfo['Teacher Information']}</Text>
                                </View>

                                <View style={{ flexDirection: 'row', }}>
                                    {schedulesObj[itm].map(sameSection => {
                                        return <View style={{
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

    // 按老師分組
    renderTeacherSchedules = (schedulesObj) => {
        const { relateTeacherObj } = this.state;
        const teacherArr = lodash.keys(relateTeacherObj);

        // 按老師分組的section, WANG DAWEN: ['001', '002', '003']
        const secByTeachObj = lodash.mapValues(relateTeacherObj, o => o.map(item => item.Section));
        let uniqSecByTeachObj = {};
        lodash.keys(secByTeachObj).forEach(key => {
            objArr = lodash.uniq(secByTeachObj[key]);
            uniqSecByTeachObj[key] = objArr;
        });

        // 渲染每個section，輸入section號
        const renderSection = (itm) => {
            schedulesObj[itm] = daySort(schedulesObj[itm])
            const courseInfo = schedulesObj[itm][0];
            let isPE = courseInfo['Course Code'] == 'CPED1001' || courseInfo['Course Code'] == 'CPED1002';

            return (
                <MenuView
                    onPressAction={({ nativeEvent }) => {
                        switch (nativeEvent.event) {
                            case 'wiki':
                                trigger();
                                let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseInfo['Teacher Information']);
                                logToFirebase('checkCourse', {
                                    courseCode: courseInfo['Course Code'],
                                    profName: courseInfo['Teacher Information'],
                                });
                                this.context.navigate('Wiki', { url: URL });
                                break;

                            case 'what2reg':
                                trigger();
                                const courseCode = courseInfo['Course Code'];
                                const profName = courseInfo['Teacher Information'];
                                const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(profName);
                                logToFirebase('checkCourse', {
                                    courseCode: courseCode,
                                    profName: profName,
                                });
                                openLink(URI);
                                break;

                            case 'add':
                                trigger();
                                Alert.alert(`ARK搵課提示`, `確定添加此課程到模擬課表嗎？`, [
                                    {
                                        text: 'Yes', onPress: () => {
                                            trigger();
                                            this.props.navigation.navigate('CourseSimTab', {
                                                add: courseInfo
                                            });
                                        }
                                    },
                                    { text: 'No', },
                                ]);

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
                            id: 'add',
                            title: '添加至模擬課表',
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
                            // ...viewShadow,
                        }}
                        onPress={() => { trigger('rigid'); }}
                    >
                        <View style={{ flexDirection: 'row', }}>
                            <Text style={{
                                ...uiStyle.defaultText, fontSize: scale(12), color: black.third,
                            }}>{courseInfo.Section + ' - ' + courseInfo['Medium of Instruction']}</Text>
                        </View>

                        {isPE && (<View style={{ alignItems: 'center', }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseInfo['Course Title']}</Text>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseInfo['Course Title Chi']}</Text>
                        </View>)}

                        <View style={{ flexDirection: 'row', }}>
                            {schedulesObj[itm].map(sameSection => {
                                return <View style={{
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
                            })}
                        </View>
                    </TouchableOpacity>
                </MenuView>
            )
        }

        return teacherArr.length > 0 && teacherArr.map(teacherName => {
            return <View
                style={{ margin: scale(5), }}
                key={teacherName}
            >
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(15), color: themeColor, marginLeft: scale(5) }}>{teacherName}</Text>

                {uniqSecByTeachObj[teacherName] && uniqSecByTeachObj[teacherName].length > 0 ? (
                    <FlatList
                        data={uniqSecByTeachObj[teacherName]}
                        horizontal={true}
                        renderItem={({ item: itm }) => {
                            return renderSection(itm);
                        }}
                    />
                ) : (
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third, textAlign: 'center', }}>
                        No section
                    </Text>
                )}

                {lodash.keys(schedulesObj).forEach(section => {
                    schedulesObj[section].map(sameSection => {
                        return <View style={{
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
                    })
                })}
            </View>
        })
    }

    renderGroupChoice = () => {
        const s = StyleSheet.create({
            button: {
                backgroundColor: themeColor,
                padding: scale(3),
                borderRadius: scale(5),
                marginLeft: scale(10),
            }
        });
        const { groupChoice } = this.state;

        return <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>Group By:</Text>
            <TouchableOpacity style={{
                ...s.button,
                backgroundColor: groupChoice === 'section' ? themeColor : null,
            }}
                onPress={() => {
                    this.setState({ groupChoice: 'section' });
                }}>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: groupChoice === 'section' ? white : black.third }}>Section</Text>
            </TouchableOpacity>

            <TouchableOpacity style={{
                ...s.button,
                backgroundColor: groupChoice === 'teacher' ? themeColor : null,
            }}
                onPress={() => {
                    this.setState({ groupChoice: 'teacher' });
                }}>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: groupChoice === 'teacher' ? white : black.third }}>Teacher</Text>
            </TouchableOpacity>
        </View>
    }

    render() {
        const { isLoading, courseCode, relateSectionObj, courseInfo, groupChoice } = this.state;

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={courseCode} iOSDIY={true} />

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
                                {"\"Class For / Class Not For\" Information" in courseInfo && (
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third, textAlign: 'center', }}>{courseInfo["\"Class For / Class Not For\" Information"]}</Text>
                                )}
                                {'Course Type' in courseInfo && (
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{courseInfo['Course Type']}</Text>
                                )}
                            </View>
                        ) : null}

                        {/* Group By Section / Teacher */}
                        {this.renderGroupChoice()}

                        {/* 可選教授和Section */}
                        {relateSectionObj && groupChoice === 'section' ? (
                            this.renderSchedules(relateSectionObj)
                        ) : this.renderTeacherSchedules(relateSectionObj)}

                        {/* 可選Section */}
                        {/* {relateSectionObj ? (
                            this.renderSchedules(relateSectionObj)
                        ) : null} */}
                    </ScrollView>
                )}
            </View>
        )
    }
}
