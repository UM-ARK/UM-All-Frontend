import React, { useState, useEffect, useContext, useCallback, useMemo } from 'react';
import { Text, View, ScrollView, TouchableOpacity, FlatList, Alert, StyleSheet, } from 'react-native'

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import Header from '../../../../components/Header';
import Loading from '../../../../components/Loading';
import { WHAT_2_REG, ARK_WIKI_SEARCH } from "../../../../utils/pathMap";
import { openLink } from "../../../../utils/browser";
import { logToFirebase } from "../../../../utils/firebaseAnalytics";
import { getCourseData } from "../../../../utils/checkCoursesKits";
import coursePlanTime from "../../../../static/UMCourses/coursePlanTime";

import { scale } from "react-native-size-matters";
import { NavigationContext } from '@react-navigation/native';
import { MenuView } from '@react-native-menu/menu';
import groupBy from 'lodash/groupBy';
import lodash from 'lodash';
import { t } from "i18next";

const daySorter = {
    'MON': 1,
    'TUE': 2,
    'WED': 3,
    'THU': 4,
    'FRI': 5,
    'SAT': 6,
    'SUN': 7,
}

// 按星期一到星期天排序
const daySort = (objArr) => {
    return lodash.sortBy(objArr, item => daySorter[item.Day]);
};

const LocalCourse = (props) => {
    const { theme } = useTheme();
    const { themeColor, secondThemeColor, black, white, viewShadow, bg_color } = theme;

    const navigation = useContext(NavigationContext);

    // 狀態管理
    const [courseCode] = useState(props.route.params);
    const [isLoading, setIsLoading] = useState(true);
    const [s_coursePlanTime, setSCoursePlanTime] = useState(coursePlanTime);
    const [groupChoice, setGroupChoice] = useState('section');
    const [relateSectionObj, setRelateSectionObj] = useState(null);
    const [relateTeacherObj, setRelateTeacherObj] = useState(null);
    const [courseInfo, setCourseInfo] = useState(null);

    useEffect(() => {
        const init = async () => {
            try {
                const storageCoursePlanList = await getCourseData('adddrop');
                setSCoursePlanTime(storageCoursePlanList.timetable);
            } catch (error) {
                Alert.alert(JSON.stringify(error));
            } finally {
                setIsLoading(false);
            }
        }

        init();
    }, []);

    const coursePlanList = useMemo(() => {
        return s_coursePlanTime.Courses || [];
    }, [s_coursePlanTime]);

    const relateList = useMemo(() => {
        return coursePlanList.filter(itm =>
            itm['Course Code'].toUpperCase().includes(courseCode)
        );
    }, [coursePlanList, courseCode]);

    useEffect(() => {
        if (isLoading) return;
        // 預選有，但課表時間Excel沒有的課程，直接跳轉選咩課
        if (relateList.length === 0) {
            let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
            setIsLoading(true);
            if (navigation.canGoBack()) {
                navigation.popToTop();
                navigation.navigate('Tabbar', {
                    screen: 'Wiki',
                    params: { url: URL }
                });
            }
        } else {
            // 按section分離課程數據
            const relateSectionObj_ = groupBy(relateList, 'Section');
            const relateTeacherObj_ = groupBy(relateList, 'Teacher Information');
            setRelateSectionObj(relateSectionObj_);
            setRelateTeacherObj(relateTeacherObj_);
            setCourseInfo(relateList[0]);
            setIsLoading(false);
        }
    }, [relateList, isLoading]);

    // 渲染可選section
    const renderSchedules = (schedulesObj) => {
        const schedulesArr = Object.keys(schedulesObj);
        return (
            <FlatList
                key={schedulesArr.length}   // 綁定key用於強制渲染
                data={schedulesArr}
                numColumns={schedulesArr.length}
                columnWrapperStyle={schedulesArr.length > 1 ? { flexWrap: 'wrap' } : null}
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => {
                    schedulesObj[itm] = daySort(schedulesObj[itm]);
                    const courseInfo = schedulesObj[itm][0];
                    let isPE = courseInfo['Course Code'] === 'CPED1001' || courseInfo['Course Code'] === 'CPED1002';

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
                                        if (navigation.canGoBack()) {
                                            navigation.popToTop();
                                            navigation.navigate('Tabbar', {
                                                screen: 'Wiki',
                                                params: { url: URL }
                                            });
                                        }
                                        break;
                                    case 'what2reg':
                                        trigger();
                                        const courseCode_ = courseInfo['Course Code'];
                                        const profName = courseInfo['Teacher Information'];
                                        const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode_) + '/' + encodeURIComponent(lodash.deburr(profName));
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode_,
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
                                                    if (navigation.canGoBack()) {
                                                        navigation.popToTop();
                                                        navigation.navigate('Tabbar', {
                                                            screen: 'CourseSimTab',
                                                            params: { add: courseInfo }
                                                        });
                                                    }
                                                }
                                            },
                                            { text: 'No', },
                                        ]);
                                        break;
                                    case 'coursesim':
                                        trigger();
                                        if (navigation.canGoBack()) {
                                            navigation.popToTop();
                                            navigation.navigate('Tabbar', {
                                                screen: 'CourseSimTab',
                                                params: { check: courseInfo['Course Code'] }
                                            });
                                        }
                                        break;
                                    default:
                                        break;
                                }
                            }}
                            actions={[
                                {
                                    id: 'wiki',
                                    title: `${t("查", { ns: 'catalog' })} ARK Wiki !!!`,
                                    titleColor: themeColor,
                                },
                                {
                                    id: 'what2reg',
                                    title: `${t("查", { ns: 'catalog' })} ${t("選咩課", { ns: 'catalog' })}`,
                                    titleColor: black.third,
                                },
                                {
                                    id: 'coursesim',
                                    title: `${t("查", { ns: 'catalog' })} ${t("模擬課表", { ns: 'catalog' })}`,
                                    titleColor: black.third,
                                },
                                {
                                    id: 'add',
                                    title: `${t("添加至模擬課表", { ns: 'catalog' })}`,
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
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', }}>
                                    <Text style={{
                                        ...uiStyle.defaultText, fontSize: scale(12), color: black.third,
                                    }}>{courseInfo.Section + ' - ' + courseInfo['Medium of Instruction']}</Text>
                                </View>
                                {isPE && (<View style={{ alignItems: 'center', }}>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseInfo['Course Title']}</Text>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseInfo['Course Title Chi']}</Text>
                                </View>)}
                                {courseInfo['Teacher Information'] && (
                                    <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: themeColor }}>{courseInfo['Teacher Information']}</Text>
                                    </View>
                                )}
                                {/* schedulesObj[itm]內都存在Time From字段，才展示Section */}
                                {schedulesObj[itm].length >= 1 && schedulesObj[itm].every(item => 'Time From' in item && item['Time From']) && (
                                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', }}>
                                        {schedulesObj[itm].map(sameSection => (
                                            <View key={sameSection['Day'] + sameSection['Classroom']}
                                                style={{
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
                                        ))}
                                    </View>
                                )}
                            </TouchableOpacity>
                        </MenuView>
                    )
                }}
                ListFooterComponent={() => <View style={{ marginBottom: scale(50) }} />}
                scrollEnabled={false}
            />
        );
    };

    // 按老師分組
    const renderTeacherSchedules = (schedulesObj) => {
        if (!relateTeacherObj) return null;
        const teacherArr = lodash.keys(relateTeacherObj);

        // 按老師分組的section, WANG DAWEN: ['001', '002', '003']
        const secByTeachObj = lodash.mapValues(relateTeacherObj, o => o.map(item => item.Section));
        let uniqSecByTeachObj = {};
        lodash.keys(secByTeachObj).forEach(key => {
            let objArr = lodash.uniq(secByTeachObj[key]);
            uniqSecByTeachObj[key] = objArr;
        });

        // 渲染每個section，輸入section號
        const renderSection = (itm) => {
            schedulesObj[itm] = daySort(schedulesObj[itm]);
            const courseInfo = schedulesObj[itm][0];
            let isPE = courseInfo['Course Code'] === 'CPED1001' || courseInfo['Course Code'] === 'CPED1002';

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
                                if (navigation.canGoBack()) {
                                    navigation.popToTop();
                                    navigation.navigate('Tabbar', {
                                        screen: 'Wiki',
                                        params: { url: URL }
                                    });
                                }
                                break;
                            case 'what2reg':
                                trigger();
                                const courseCode_ = courseInfo['Course Code'];
                                const profName = courseInfo['Teacher Information'];
                                const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode_) + '/' + encodeURIComponent(profName);
                                logToFirebase('checkCourse', {
                                    courseCode: courseCode_,
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
                                            if (navigation.canGoBack()) {
                                                navigation.popToTop();
                                                navigation.navigate('Tabbar', {
                                                    screen: 'CourseSimTab',
                                                    params: { add: courseInfo }
                                                });
                                            }
                                        }
                                    },
                                    { text: 'No', },
                                ]);
                                break;
                            case 'coursesim':
                                trigger();
                                if (navigation.canGoBack()) {
                                    navigation.popToTop();
                                    navigation.navigate('Tabbar', {
                                        screen: 'CourseSimTab',
                                        params: { check: courseInfo['Course Code'] }
                                    });
                                }
                                break;
                            default:
                                break;
                        }
                    }}
                    actions={[
                        {
                            id: 'wiki',
                            title: `${t("查", { ns: 'catalog' })} ARK Wiki !!!`,
                            titleColor: themeColor,
                        },
                        {
                            id: 'what2reg',
                            title: `${t("查", { ns: 'catalog' })} ${t("選咩課", { ns: 'catalog' })}`,
                            titleColor: black.third,
                        },
                        {
                            id: 'coursesim',
                            title: `${t("查", { ns: 'catalog' })} ${t("模擬課表", { ns: 'catalog' })}`,
                            titleColor: black.third,
                        },
                        {
                            id: 'add',
                            title: `${t("添加至模擬課表", { ns: 'catalog' })}`,
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
                        {schedulesObj[itm].length >= 1 && schedulesObj[itm].every(item => 'Time From' in item && item['Time From']) && (
                            <View style={{ flexDirection: 'row' }}>
                                {schedulesObj[itm].map((sameSection, idx) => (
                                    <View key={sameSection['Day'] + sameSection['Classroom'] + idx}
                                        style={{
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
                                ))}
                            </View>
                        )}
                    </TouchableOpacity>
                </MenuView>
            );
        };

        return teacherArr.length > 0 && teacherArr.map(teacherName => (
            <View style={{ margin: scale(5), }} key={teacherName}>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(15), color: themeColor, marginLeft: scale(5) }}>{teacherName}</Text>
                {uniqSecByTeachObj[teacherName] && uniqSecByTeachObj[teacherName].length > 0 ? (
                    <FlatList
                        data={uniqSecByTeachObj[teacherName]}
                        horizontal={true}
                        renderItem={({ item: itm }) => renderSection(itm)}
                        keyExtractor={(item, idx) => teacherName + item + idx}
                    />
                ) : (
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third, textAlign: 'center', }}>
                        No section
                    </Text>
                )}
            </View>
        ));
    };

    // Group By 切換
    const renderGroupChoice = useCallback(() => {
        const s = StyleSheet.create({
            button: {
                backgroundColor: themeColor,
                padding: scale(3),
                borderRadius: scale(5),
                marginLeft: scale(10),
            }
        });
        return (
            <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>Group By:</Text>
                <TouchableOpacity style={{
                    ...s.button,
                    backgroundColor: groupChoice === 'section' ? themeColor : null,
                }}
                    onPress={() => setGroupChoice('section')}>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: groupChoice === 'section' ? white : black.third }}>Section</Text>
                </TouchableOpacity>
                <TouchableOpacity style={{
                    ...s.button,
                    backgroundColor: groupChoice === 'teacher' ? themeColor : null,
                }}
                    onPress={() => setGroupChoice('teacher')}>
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: groupChoice === 'teacher' ? white : black.third }}>Teacher</Text>
                </TouchableOpacity>
            </View>
        );
    }, [black, groupChoice]);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <Header title={courseCode} iOSDIY={true} />
            {isLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Loading />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingHorizontal: scale(5), }}>
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
                    {renderGroupChoice()}

                    {/* 可選教授和Section */}
                    {groupChoice === 'section' && relateSectionObj
                        ? renderSchedules(relateSectionObj)
                        : renderTeacherSchedules(relateSectionObj)}
                </ScrollView>
            )}
        </View>
    );
};

export default LocalCourse;
