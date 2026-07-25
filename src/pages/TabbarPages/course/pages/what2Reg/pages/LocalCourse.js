import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, ScrollView, FlatList, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, uiStyle } from '../../../../../../components/ThemeContext';
import Loading from '../../../../../../components/Loading';
import SegmentControl from '../../../../../../components/SegmentControl';
import { ARK_WIKI_SEARCH } from '../../../../../../utils/pathMap';
import { openLink } from '../../../../../../utils/browser';
import { getCourseData } from '../../../../../../utils/checkCoursesKits';
import coursePlanTime from '../../../../../../static/UMCourses/coursePlanTime';

import { scale, verticalScale } from 'react-native-size-matters';
import groupBy from 'lodash/groupBy';
import lodash from 'lodash';

import LocalCourseOfferingMenuCard from '../components/LocalCourseOfferingMenuCard';

/** 與 ClubPage Section 標題列對齊的左右內距 */
const LOCAL_SECTION_HORIZONTAL_PADDING = scale(10);

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
    const insets = useSafeAreaInsets();

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
                openLink(URL);
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

    // ClubPage 風格區塊標題（左側主題色豎條 + 粗體標題）
    const renderClubStyleSectionHeader = (title, isFirstSection) => (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: 0,
                paddingTop: isFirstSection ? scale(6) : scale(18),
                paddingBottom: scale(8),
                backgroundColor: bg_color,
            }}>
            <View
                style={{
                    width: scale(3),
                    height: verticalScale(15),
                    borderRadius: scale(2),
                    backgroundColor: themeColor,
                    marginRight: scale(10),
                }}
            />
            <Text
                style={{
                    ...uiStyle.defaultText,
                    flex: 1,
                    color: black.second,
                    fontSize: verticalScale(16),
                    fontWeight: '700',
                    letterSpacing: -0.25,
                }}
                numberOfLines={1}>
                {title}
            </Text>
        </View>
    );

    // 渲染可選 section（每個班別一組標題 + 卡片，視覺對齊 ClubPage SectionList）
    const renderSchedules = (schedulesObj) => {
        const schedulesArr = Object.keys(schedulesObj);
        return (
            <>
                {schedulesArr.map((itm, index) => {
                    const slots = daySort([...(schedulesObj[itm] ?? [])]);
                    const medium = slots[0]?.['Medium of Instruction'];
                    const sectionHeaderTitle = medium
                        ? `Section ${itm} - ${medium}`
                        : `Section ${itm}`;
                    return (
                        <View key={itm}>
                            {renderClubStyleSectionHeader(sectionHeaderTitle, index === 0)}
                            <View style={{ alignItems: 'center' }}>
                                <LocalCourseOfferingMenuCard
                                    navigation={navigation}
                                    slots={slots}
                                    variant="section"
                                />
                            </View>
                        </View>
                    );
                })}
                <View style={{ marginBottom: scale(50) }} />
            </>
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

        if (teacherArr.length === 0) {
            return null;
        }

        return (
            <>
                <View
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: scale(8),
                    }}>
                    <Ionicons name="swap-horizontal-outline" size={scale(16)} color={black.third} />
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            marginLeft: scale(6),
                            fontSize: scale(11),
                            color: black.third,
                        }}>
                        班別列可左右滑動瀏覽
                    </Text>
                </View>
                {teacherArr.map((teacherName, index) => (
                    <View key={teacherName}>
                        {renderClubStyleSectionHeader(teacherName, index === 0)}
                        {uniqSecByTeachObj[teacherName] && uniqSecByTeachObj[teacherName].length > 0 ? (
                            <FlatList
                                data={uniqSecByTeachObj[teacherName]}
                                horizontal={true}
                                showsHorizontalScrollIndicator={true}
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
                                暫無班別
                            </Text>
                        )}
                    </View>
                ))}
            </>
        );
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
                <ScrollView
                    contentContainerStyle={{
                        paddingHorizontal: LOCAL_SECTION_HORIZONTAL_PADDING,
                        // 避開 Android 系統導航列 / iOS Home Indicator
                        paddingBottom: insets.bottom + scale(16),
                    }}
                    contentInsetAdjustmentBehavior="automatic">
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
