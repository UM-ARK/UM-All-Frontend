import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, ScrollView, FlatList, Alert } from 'react-native';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import Loading from '../../../../components/Loading';
import SegmentControl from '../../../../components/SegmentControl';
import { ARK_WIKI_SEARCH } from '../../../../utils/pathMap';
import { getCourseData } from '../../../../utils/checkCoursesKits';
import coursePlanTime from '../../../../static/UMCourses/coursePlanTime';

import { scale } from 'react-native-size-matters';
import groupBy from 'lodash/groupBy';
import lodash from 'lodash';

import LocalCourseOfferingMenuCard from '../components/LocalCourseOfferingMenuCard';

const daySorter = {
    'MON': 1,
    'TUE': 2,
    'WED': 3,
    'THU': 4,
    'FRI': 5,
    'SAT': 6,
    'SUN': 7,
};

// 按星期一到星期天排序
const daySort = (objArr) => {
    return lodash.sortBy(objArr, item => daySorter[item.Day]);
};

const LocalCourse = (props) => {
    const { theme } = useTheme();
    const { themeColor, black, bg_color } = theme;

    const { navigation } = props;

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
        };

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
        if (isLoading) {return;}
        // 預選有，但課表時間Excel沒有的課程，直接跳轉選咩課
        if (relateList.length === 0) {
            let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
            setIsLoading(true);
            if (navigation.canGoBack()) {
                navigation.goBack();
                navigation.navigate('Tabbar', {
                    screen: 'Wiki',
                    params: { url: URL },
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
    }, [relateList, isLoading, courseCode, navigation]);

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
                    const slots = daySort([...(schedulesObj[itm] ?? [])]);
                    return (
                        <LocalCourseOfferingMenuCard
                            navigation={navigation}
                            slots={slots}
                            variant="section"
                        />
                    );
                }}
                ListFooterComponent={<View style={{ marginBottom: scale(50) }} />}
                scrollEnabled={false}
            />
        );
    };

    // 按老師分組
    const renderTeacherSchedules = (schedulesObj) => {
        if (!relateTeacherObj) {return null;}
        const teacherArr = lodash.keys(relateTeacherObj);

        // 按老師分組的section, WANG DAWEN: ['001', '002', '003']
        const secByTeachObj = lodash.mapValues(relateTeacherObj, o => o.map(item => item.Section));
        let uniqSecByTeachObj = {};
        lodash.keys(secByTeachObj).forEach(key => {
            let objArr = lodash.uniq(secByTeachObj[key]);
            uniqSecByTeachObj[key] = objArr;
        });

        return teacherArr.length > 0 && teacherArr.map(teacherName => (
            <View style={{ margin: scale(5) }} key={teacherName}>
                <Text style={{ ...uiStyle.defaultText, fontSize: scale(15), color: themeColor, marginLeft: scale(5) }}>{teacherName}</Text>
                {uniqSecByTeachObj[teacherName] && uniqSecByTeachObj[teacherName].length > 0 ? (
                    <FlatList
                        data={uniqSecByTeachObj[teacherName]}
                        horizontal={true}
                        renderItem={({ item: itm }) => {
                            const slots = daySort([...(schedulesObj[itm] ?? [])]);
                            return (
                                <LocalCourseOfferingMenuCard
                                    navigation={navigation}
                                    slots={slots}
                                    variant="teacher"
                                />
                            );
                        }}
                        keyExtractor={(item, idx) => teacherName + item + idx}
                    />
                ) : (
                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third, textAlign: 'center' }}>
                        No section
                    </Text>
                )}
            </View>
        ));
    };

    const groupByOptions = useMemo(() => ([
        { key: 'section', label: 'Section' },
        { key: 'teacher', label: 'Teacher' },
    ]), []);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            {isLoading ? (
                <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                    <Loading />
                </View>
            ) : (
                <ScrollView contentContainerStyle={{ paddingHorizontal: scale(5) }} contentInsetAdjustmentBehavior="automatic">
                    {/* 課程基礎信息 */}
                    {courseInfo ? (
                        <View style={{ alignItems: 'center' }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.main, textAlign: 'center' }}>{courseInfo['Course Title']}</Text>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third, textAlign: 'center' }}>{courseInfo['Course Title Chi']}</Text>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>
                                {courseInfo['Offering Unit']}
                                {courseInfo['Offering Department'] ? <Text>{' - ' + courseInfo['Offering Department']}</Text> : null}
                            </Text>
                            {'"Class For / Class Not For" Information' in courseInfo && courseInfo['"Class For / Class Not For" Information'].length > 0 && (
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third, textAlign: 'center' }}>{courseInfo['"Class For / Class Not For" Information']}</Text>
                            )}
                            {'Course Type' in courseInfo && courseInfo['Course Type'].length > 0 && (
                                <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{courseInfo['Course Type']}</Text>
                            )}
                        </View>
                    ) : null}

                    {/* Group By Section / Teacher */}
                    <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', marginVertical: scale(8) }}>
                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>Group By:</Text>
                        <SegmentControl
                            style={{ marginLeft: scale(10) }}
                            options={groupByOptions}
                            selectedIndex={groupChoice === 'section' ? 0 : 1}
                            onChange={(index) => setGroupChoice(index === 0 ? 'section' : 'teacher')}
                        />
                    </View>

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
