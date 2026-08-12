import React, { useState, useEffect, useLayoutEffect, useMemo, useCallback } from 'react';
import { View, ScrollView, FlatList, Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { t } from 'i18next';

import Text from '../../../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../../../components/ThemeContext';
import { getDeepLinkShareHeaderOptions } from '../../../../../../components/DeepLinkShareButton';
import { useAppShare } from '../../../../../../contexts/AppShareContext';
import SegmentControl from '../../../../../../components/SegmentControl';
import { ARK_COURSE_SHARE_URL, ARK_WIKI_SEARCH } from '../../../../../../utils/pathMap';
import { openLink } from '../../../../../../utils/browser';
import { getCourseCatalog } from '../../../../../../utils/checkCoursesKits';
import { getLocalStorage } from '../../../../../../utils/storageKits';
import { adddropCatalog } from '../../../../../../static/UMCourses/courseCatalogs';

import { scale, verticalScale } from 'react-native-size-matters';
import groupBy from 'lodash/groupBy';
import lodash from 'lodash';

import LocalCourseOfferingMenuCard from '../components/LocalCourseOfferingMenuCard';
import { getCourseDisplayTitle } from '../utils/courseTitle';

/** 與 ClubPage Section 標題列對齊的左右內距 */
const LOCAL_SECTION_HORIZONTAL_PADDING = scale(10);

/** 載入骨架重複班別卡數量，填滿首屏 */
const LOCAL_COURSE_SKELETON_SECTION_COUNT = 3;

/** 使用者模擬課表的選課清單 */
const PLAN_STORAGE_KEY = 'ARK_Timetable_Storage';

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
    const { openShare } = useAppShare();
    const { themeColor, black, bg_color, white, tonal } = theme;
    const insets = useSafeAreaInsets();

    const { navigation } = props;

    // 狀態管理
    const routeParams = props.route.params;
    const [courseCode] = useState(
        typeof routeParams === 'string'
            ? routeParams
            : routeParams?.courseCode,
    );
    const sectionStatuses = useMemo(
        () => routeParams?.sectionStatuses &&
            typeof routeParams.sectionStatuses === 'object'
            ? routeParams.sectionStatuses
            : {},
        [routeParams],
    );
    const [isLoading, setIsLoading] = useState(true);
    const [localAdddropCatalog, setLocalAdddropCatalog] = useState(adddropCatalog);
    const [groupChoice, setGroupChoice] = useState('section');
    const [relateSectionObj, setRelateSectionObj] = useState(null);
    const [relateTeacherObj, setRelateTeacherObj] = useState(null);
    const [courseInfo, setCourseInfo] = useState(null);
    const [selectedSections, setSelectedSections] = useState([]);

    useFocusEffect(
        useCallback(() => {
            let cancelled = false;

            getLocalStorage(PLAN_STORAGE_KEY).then(planList => {
                if (cancelled) {return;}
                setSelectedSections(
                    Array.isArray(planList)
                        ? lodash
                            .chain(planList)
                            .filter(item => item['Course Code'] === courseCode)
                            .map('Section')
                            .uniq()
                            .sortBy()
                            .value()
                        : [],
                );
            });

            return () => {
                cancelled = true;
            };
        }, [courseCode]),
    );

    const selectedSectionSummary = useMemo(
        () => selectedSections.map(section => {
            const teachers = lodash
                .chain(relateSectionObj?.[section] || [])
                .map('Teacher Information')
                .filter(Boolean)
                .uniq()
                .value();
            return `Section ${section}${teachers.length > 0
                ? ` · ${teachers.join('／')}`
                : ''}`;
        }).join('、'),
        [relateSectionObj, selectedSections],
    );

    const shareCourse = useCallback(() => {
        const url = ARK_COURSE_SHARE_URL(courseCode);
        openShare({
            title: courseCode,
            url,
        });
    }, [courseCode, openShare]);

    useLayoutEffect(() => {
        if (!courseCode) {return;}
        navigation.setOptions({
            headerTitle: courseCode,
            ...getDeepLinkShareHeaderOptions({
                accessibilityLabel: t('分享'),
                onPress: shareCourse,
                themeColor,
            }),
        });
    }, [courseCode, navigation, shareCourse, themeColor]);

    useEffect(() => {
        const init = async () => {
            try {
                const storageCoursePlanList = await getCourseCatalog('adddrop');
                setLocalAdddropCatalog(storageCoursePlanList);
            } catch (error) {
                Alert.alert(JSON.stringify(error));
            } finally {
                setIsLoading(false);
            }
        };

        init();
    }, []);

    const adddropSlots = useMemo(() => {
        return localAdddropCatalog.Courses || [];
    }, [localAdddropCatalog]);

    const relateList = useMemo(() => {
        return adddropSlots.filter(itm =>
            itm['Course Code'].toUpperCase().includes(courseCode)
        );
    }, [adddropSlots, courseCode]);

    useEffect(() => {
        if (isLoading) {return;}
        // 預選有，但課表時間Excel沒有的課程，直接跳轉選咩課
        if (relateList.length === 0) {
            let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
            setIsLoading(true);
            if (navigation.canGoBack()) {
                navigation.goBack();
            }
            openLink(URL);
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
                paddingTop: isFirstSection ? scale(4) : scale(10),
                paddingBottom: scale(4),
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
                    fontSize: scale(15),
                    fontWeight: '700',
                    letterSpacing: -0.25,
                }}
                numberOfLines={1}>
                {title}
            </Text>
        </View>
    );

    // 渲染可選 section；班別與授課語言收進卡片，減少重複區塊的垂直留白
    const renderSchedules = (schedulesObj) => {
        const schedulesArr = Object.keys(schedulesObj);
        return (
            <>
                {schedulesArr.map(itm => {
                    const slots = daySort([...(schedulesObj[itm] ?? [])]);
                    return (
                        <View key={itm}>
                            <View style={{ alignItems: 'center' }}>
                                <LocalCourseOfferingMenuCard
                                    navigation={navigation}
                                    slots={slots}
                                    variant="section"
                                    highlightStatus={sectionStatuses[itm]}
                                    isSelected={selectedSections.includes(itm)}
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
                {teacherArr.map((teacherName, index) => (
                    <View key={teacherName}>
                        {renderClubStyleSectionHeader(teacherName, index === 0)}
                        {uniqSecByTeachObj[teacherName] && uniqSecByTeachObj[teacherName].length > 0 ? (
                            <FlatList
                                data={uniqSecByTeachObj[teacherName]}
                                horizontal={true}
                                showsHorizontalScrollIndicator={false}
                                renderItem={({ item: itm }) => {
                                    const slots = daySort([...(schedulesObj[itm] ?? [])]);
                                    return (
                                        <LocalCourseOfferingMenuCard
                                            navigation={navigation}
                                            slots={slots}
                                            variant="teacher"
                                            highlightStatus={sectionStatuses[itm]}
                                            isSelected={selectedSections.includes(itm)}
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
        { key: 'section', label: t('班別', { ns: 'catalog' }) },
        { key: 'teacher', label: t('教師', { ns: 'catalog' }) },
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
                        <View style={{ alignItems: 'center', paddingTop: scale(4) }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(15), fontWeight: '600', color: black.main, textAlign: 'center' }}>{getCourseDisplayTitle(courseCode, courseInfo['Course Title'])}</Text>
                            <Text style={{ ...uiStyle.defaultText, marginTop: scale(2), fontSize: scale(12), color: black.third, textAlign: 'center' }}>{getCourseDisplayTitle(courseCode, courseInfo['Course Title Chi'])}</Text>
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

                    <View
                        style={{
                            alignSelf: 'center',
                            marginTop: scale(8),
                            borderRadius: scale(999),
                            backgroundColor: tonal.primary08,
                            paddingHorizontal: scale(10),
                            paddingVertical: scale(4),
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(11),
                                fontWeight: '600',
                                color: selectedSections.length > 0
                                    ? themeColor
                                    : black.third,
                            }}>
                            {selectedSections.length > 0
                                ? `目前模擬課表：${selectedSectionSummary}`
                                : '目前模擬課表尚未選擇此課程的 Section'}
                        </Text>
                    </View>

                    {/* 按班別／教師切換 */}
                    <View style={{ alignSelf: 'center', marginVertical: scale(10) }}>
                        <SegmentControl
                            options={groupByOptions}
                            selectedIndex={groupChoice === 'section' ? 0 : 1}
                            onChange={(index) => setGroupChoice(index === 0 ? 'section' : 'teacher')}
                            trackBackgroundColor={tonal.primary08}
                            selectedBackgroundColor={white}
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
