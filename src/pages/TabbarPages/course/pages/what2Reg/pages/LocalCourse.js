import React, { useState, useEffect, useMemo } from 'react';
import { Text, View, ScrollView, FlatList, Alert } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme, uiStyle } from '../../../../../../components/ThemeContext';
import SegmentControl from '../../../../../../components/SegmentControl';
import { ARK_WIKI_SEARCH } from '../../../../../../utils/pathMap';
import { openLink } from '../../../../../../utils/browser';
import { getCourseData } from '../../../../../../utils/checkCoursesKits';
import coursePlanTime from '../../../../../../static/UMCourses/coursePlanTime';

import { scale, verticalScale } from 'react-native-size-matters';
import groupBy from 'lodash/groupBy';
import lodash from 'lodash';

import LocalCourseOfferingMenuCard from '../components/LocalCourseOfferingMenuCard';
import { getCourseDisplayTitle } from '../utils/courseTitle';

/** 與 ClubPage Section 標題列對齊的左右內距 */
const LOCAL_SECTION_HORIZONTAL_PADDING = scale(10);

/** 載入骨架重複班別卡數量，填滿首屏 */
const LOCAL_COURSE_SKELETON_SECTION_COUNT = 3;

/** 單條課表時段佔位（日／教室／時間） */
const LocalCourseSkeletonScheduleCol = ({ tonal }) => (
    <View style={{ width: '50%', paddingVertical: scale(5), alignItems: 'center' }}>
        <View
            style={{
                height: verticalScale(10),
                width: '42%',
                borderRadius: scale(4),
                backgroundColor: tonal.primary08,
                marginBottom: verticalScale(4),
            }}
        />
        <View
            style={{
                height: verticalScale(10),
                width: '58%',
                borderRadius: scale(4),
                backgroundColor: tonal.primary08,
                marginBottom: verticalScale(4),
            }}
        />
        <View
            style={{
                height: verticalScale(10),
                width: '72%',
                borderRadius: scale(4),
                backgroundColor: tonal.primary08,
            }}
        />
    </View>
);

/** 單一班別：Section 標題列 + offering 卡片骨架 */
const LocalCourseSkeletonSection = ({ themeColor, white, tonal, isFirst }) => (
    <View>
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                paddingTop: isFirst ? scale(6) : scale(18),
                paddingBottom: scale(8),
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
            <View
                style={{
                    height: verticalScale(14),
                    width: '48%',
                    borderRadius: scale(4),
                    backgroundColor: tonal.primary15,
                }}
            />
        </View>
        <View style={{ alignItems: 'center' }}>
            <View
                style={{
                    width: '100%',
                    backgroundColor: white,
                    borderRadius: scale(16),
                    paddingVertical: scale(8),
                    paddingHorizontal: scale(8),
                    alignItems: 'center',
                    marginVertical: scale(5),
                }}>
                <View
                    style={{
                        height: verticalScale(13),
                        width: '36%',
                        borderRadius: scale(4),
                        backgroundColor: tonal.primary15,
                        marginBottom: scale(4),
                    }}
                />
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        width: '100%',
                    }}>
                    <LocalCourseSkeletonScheduleCol tonal={tonal} />
                    <LocalCourseSkeletonScheduleCol tonal={tonal} />
                </View>
            </View>
        </View>
    </View>
);

/** 本地課程頁載入骨架：標題、Group By、班別列表 */
const LocalCourseSkeleton = ({ bg_color, white, tonal, themeColor, insets }) => (
    <ScrollView
        style={{ flex: 1, backgroundColor: bg_color }}
        contentContainerStyle={{
            paddingHorizontal: LOCAL_SECTION_HORIZONTAL_PADDING,
            paddingBottom: insets.bottom + scale(16),
        }}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}>
        {/* 課程標題與 metadata */}
        <View style={{ alignItems: 'center', paddingTop: scale(4) }}>
            <View
                style={{
                    height: verticalScale(13),
                    width: '78%',
                    borderRadius: scale(4),
                    backgroundColor: tonal.primary15,
                    marginBottom: verticalScale(6),
                }}
            />
            <View
                style={{
                    height: verticalScale(13),
                    width: '62%',
                    borderRadius: scale(4),
                    backgroundColor: tonal.primary08,
                    marginBottom: verticalScale(6),
                }}
            />
            <View
                style={{
                    height: verticalScale(10),
                    width: '28%',
                    borderRadius: scale(4),
                    backgroundColor: tonal.primary08,
                    marginBottom: verticalScale(4),
                }}
            />
            <View
                style={{
                    height: verticalScale(10),
                    width: '22%',
                    borderRadius: scale(4),
                    backgroundColor: tonal.primary08,
                }}
            />
        </View>

        {/* Group By 分段控制 */}
        <View
            style={{
                alignSelf: 'center',
                flexDirection: 'row',
                alignItems: 'center',
                marginVertical: scale(12),
            }}>
            <View
                style={{
                    height: verticalScale(12),
                    width: scale(56),
                    borderRadius: scale(4),
                    backgroundColor: tonal.primary08,
                    marginRight: scale(10),
                }}
            />
            <View
                style={{
                    height: verticalScale(28),
                    width: scale(160),
                    borderRadius: scale(20),
                    backgroundColor: tonal.primary08,
                }}
            />
        </View>

        {Array.from({ length: LOCAL_COURSE_SKELETON_SECTION_COUNT }).map((_, index) => (
            <LocalCourseSkeletonSection
                key={`local-course-skel-${index}`}
                themeColor={themeColor}
                white={white}
                tonal={tonal}
                isFirst={index === 0}
            />
        ))}
    </ScrollView>
);

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
    const { themeColor, black, bg_color, white, tonal } = theme;
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
                <LocalCourseSkeleton
                    bg_color={bg_color}
                    white={white}
                    tonal={tonal}
                    themeColor={themeColor}
                    insets={insets}
                />
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
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.main, textAlign: 'center' }}>{getCourseDisplayTitle(courseCode, courseInfo['Course Title'])}</Text>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third, textAlign: 'center' }}>{getCourseDisplayTitle(courseCode, courseInfo['Course Title Chi'])}</Text>
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
