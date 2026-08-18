import React, { useContext, memo } from 'react';
import { View, StyleSheet, Platform } from 'react-native';

import Text from '../../../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../../../components/ThemeContext';
import {
    OFFICIAL_COURSE_SEARCH,
} from '../../../../../../utils/pathMap';
import { useUmehHost } from '../../../../../../utils/umehHost';
import { logToFirebase } from '../../../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../../../utils/browser';
import { trigger } from '../../../../../../utils/trigger';
import { navigateToCourseTab } from '../../../../../../utils/courseNavigation';
import { navigateToWikiSearch } from '../../../../../../utils/wikiNavigation';
import { getCourseDisplayTitle } from '../utils/courseTitle';
import { splitCourseCode } from '../utils/courseCode';

import { scale } from 'react-native-size-matters';
import { NavigationContext } from '@react-navigation/native';
// 不可用 @expo/ui MenuView（SwiftUI Host matchContents 會在 Tab 切換／版面提交時
// 反寫 Fabric ShadowTree 並 abort）。改用 @react-native-menu/menu（原生 UIButton）。
import { MenuView } from '@react-native-menu/menu';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import lodash from 'lodash';
import { t } from 'i18next';
import { PROGRAMME_LEVELS } from '../../../../../../utils/courseProgramme';

/** 與 TouchableScale 預設相近的彈簧參數 */
const COURSE_CARD_SPRING = {
    damping: 18,
    stiffness: 280,
    mass: 0.4,
};

const styles = StyleSheet.create({
    menuView: {
        alignSelf: 'flex-start',
    },
});

const CourseCard = memo(
    ({ item, mode, prof_info, programmeLevel = PROGRAMME_LEVELS.undergraduate, courseMode = 'ad', isHistoricalPeriod = false, cardWidth, cardHeight, onMeasureHeight, sectionStatuses }) => {
        // const { item, mode, prof_info, courseMode = 'ad' } = props;
        const navigation = useContext(NavigationContext);
        const { theme } = useTheme();
        const { baseHost } = useUmehHost();
        const { themeColor, black, secondThemeColor, white } = theme;
        const isPostgraduate = programmeLevel === PROGRAMME_LEVELS.postgraduate;
        const isPreEnroll = !isPostgraduate && courseMode === 'preEnroll';

        // 原生 UIButton 會吃掉子層 pressIn，故縮放回饋改由選單開合驅動
        const cardScale = useSharedValue(1);
        const animatedStyle = useAnimatedStyle(() => ({
            transform: [{ scale: cardScale.value }],
        }));

        // 從 item 中提取課程資訊
        const courseCode =
            item[mode === 'what2Reg' ? 'New_code' : 'Course Code'];
        const title =
            item[mode === 'what2Reg' ? 'courseTitleEng' : 'Course Title'];
        const offerUnit =
            item[mode === 'what2Reg' ? 'Offering_Unit' : 'Offering Unit'];
        const offerDepa =
            item[
            mode === 'what2Reg'
                ? 'Offering_Department'
                : 'Offering Department'
            ];
        const credit = item[mode === 'what2Reg' ? 'Credits' : 'Credit Units'];

        // 渲染課程代號
        const renderCourseCode = code => {
            const { prefix, suffix } = splitCourseCode(code);
            const renderItm = prefix ? (
                <>
                    {prefix + ' '}
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: themeColor,
                            fontWeight: '700',
                            fontSize: scale(16),
                        }}>
                        {suffix}
                    </Text>
                </>
            ) : code;

            return (
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(13),
                        fontWeight: '600',
                        color: black.main,
                    }}>
                    {renderItm}
                </Text>
            );
        };

        // @react-native-menu/menu：iOS 用 SF Symbol；Android 用系統 drawable 名稱
        const courseActions = [
            {
                id: 'ark-wiki',
                title: 'Wiki',
                image: Platform.select({
                    ios: 'book',
                    android: 'ic_menu_agenda',
                }),
                imageColor: themeColor,
                titleColor: themeColor,
            },
            {
                id: 'harbor-discuss',
                title: t('討論', { ns: 'catalog' }),
                image: Platform.select({
                    ios: 'bubble.left.and.bubble.right',
                    android: 'ic_btn_speak_now',
                }),
                imageColor: black.third,
                titleColor: black.third,
            },
            {
                id: 'what2reg',
                title: t('選咩課', { ns: 'catalog' }),
                image: Platform.select({
                    ios: 'star',
                    android: 'btn_star_big_on',
                }),
                imageColor: black.third,
                titleColor: black.third,
            },
            ...(!isPostgraduate
                ? [
                    {
                        id: 'official',
                        title: t('官方', { ns: 'catalog' }),
                        image: Platform.select({
                            ios: 'graduationcap',
                            android: 'ic_menu_info_details',
                        }),
                        imageColor: black.third,
                        titleColor: black.third,
                    },
                ]
                : []),
            ...(!isPreEnroll
                ? [
                    {
                        id: 'coursesim',
                        title: t('模擬課表', { ns: 'catalog' }),
                        image: Platform.select({
                            ios: 'calendar',
                            android: 'ic_menu_my_calendar',
                        }),
                        imageColor: black.third,
                        titleColor: black.third,
                    },
                    ...(!isHistoricalPeriod
                        ? [
                            {
                                id: 'section',
                                title: 'Section',
                                image: Platform.select({
                                    ios: 'list.bullet',
                                    android: 'ic_menu_sort_by_size',
                                }),
                                imageColor: black.third,
                                titleColor: black.third,
                            },
                        ]
                        : []),
                ]
                : []),
        ];

        const handleMenuAction = event => {
            trigger();
            switch (event.nativeEvent.event) {
                case 'ark-wiki': {
                    let wikiQuery = courseCode;
                    if (prof_info) {
                        wikiQuery = prof_info.name;
                        logToFirebase('checkCourse', {
                            courseCode: courseCode,
                            profName: prof_info.name,
                            action: 'ark-wiki',
                        });
                    } else {
                        logToFirebase('checkCourse', {
                            courseCode: courseCode,
                            action: 'ark-wiki',
                        });
                    }
                    navigateToWikiSearch(navigation, wikiQuery, {autoOpenUnique: true});
                    break;
                }
                case 'harbor-discuss': {
                    logToFirebase('checkCourse', {
                        courseCode: courseCode,
                        action: 'harbor-discuss',
                    });
                    navigation.navigate('HarborSearch', {query: courseCode});
                    break;
                }
                case 'what2reg': {
                    if (prof_info) {
                        const URI =
                            baseHost +
                            '/reviews/' +
                            encodeURIComponent(courseCode) +
                            '/' +
                            encodeURIComponent(lodash.deburr(prof_info.name));
                        logToFirebase('checkCourse', {
                            courseCode: courseCode,
                            profName: prof_info.name,
                            action: 'what2reg',
                        });
                        openLink(URI);
                    } else {
                        const URI = `${baseHost}/course/${encodeURIComponent(courseCode)}`;
                        logToFirebase('checkCourse', {
                            courseCode: courseCode,
                            action: 'what2reg',
                        });
                        openLink(URI);
                    }
                    break;
                }
                case 'official': {
                    const URI = OFFICIAL_COURSE_SEARCH + courseCode;
                    logToFirebase('checkCourse', {
                        courseCode: 'Official ' + courseCode,
                        action: 'official',
                    });
                    openLink(URI);
                    break;
                }
                case 'coursesim': {
                    navigateToCourseTab(navigation, {
                        segment: 'timetable',
                        courseCode,
                    });
                    logToFirebase('checkCourse', {
                        courseCode: courseCode,
                        action: 'coursesim',
                    });
                    break;
                }
                case 'section': {
                    logToFirebase('checkCourse', {
                        courseCode: courseCode,
                        action: 'section',
                    });
                    navigation.navigate('LocalCourse', {
                        courseCode,
                        programmeLevel,
                        ...(sectionStatuses ? {sectionStatuses} : {}),
                    });
                    break;
                }
                default:
                    break;
            }
        };

        return (
            <MenuView
                actions={courseActions}
                onPressAction={handleMenuAction}
                shouldOpenOnLongPress={false}
                onOpenMenu={() => {
                    trigger('rigid');
                    cardScale.value = withSpring(0.96, COURSE_CARD_SPRING);
                }}
                onCloseMenu={() => {
                    cardScale.value = withSpring(1, COURSE_CARD_SPRING);
                }}
                style={[
                    styles.menuView,
                    cardWidth ? { width: cardWidth } : null,
                    cardHeight ? { height: cardHeight } : null,
                ]}>
                <Animated.View
                    style={[
                        {
                            backgroundColor: white,
                            borderRadius: scale(10),
                            padding: scale(10),
                            paddingVertical: scale(5),
                            width: cardWidth,
                            height: cardHeight,
                            justifyContent: 'space-between',
                        },
                        animatedStyle,
                    ]}
                    onLayout={cardHeight ? undefined : ({ nativeEvent }) => {
                        onMeasureHeight?.(nativeEvent.layout.height);
                    }}>
                    <View>
                        {/* 課程編號與開課標識 */}
                        <View
                            style={{
                                flexDirection: 'row',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                            }}>
                            {renderCourseCode(courseCode)}
                            {/* Pre Enroll標記 */}
                            {isPreEnroll ? (
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        fontSize: scale(10),
                                        fontWeight: 'bold',
                                        marginLeft: scale(5),
                                        color: secondThemeColor,
                                    }}>
                                    PreEnroll
                                </Text>
                            ) : null}
                        </View>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(11),
                                color: black.second,
                            }}>
                            {getCourseDisplayTitle(courseCode, title)}
                        </Text>
                        {'courseTitleChi' in item &&
                            item.courseTitleChi.length > 0 ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(11),
                                    color: black.second,
                                }}>
                                {getCourseDisplayTitle(courseCode, item.courseTitleChi)}
                            </Text>
                        ) : null}
                        {'Course Title Chi' in item &&
                            item['Course Title Chi'].length > 0 ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(11),
                                    color: black.second,
                                }}>
                                {getCourseDisplayTitle(courseCode, item['Course Title Chi'])}
                            </Text>
                        ) : null}
                    </View>
                    <View>
                        {credit ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(10),
                                    color: black.third,
                                }}>
                                {credit} Credit
                            </Text>
                        ) : null}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(10),
                                color: black.third,
                            }}>
                            {offerUnit}
                            {offerDepa && ' - ' + offerDepa}
                        </Text>
                    </View>
                </Animated.View>
            </MenuView>
        );
    },
    (prevProps, nextProps) => {
        // 比較props，避免不必要的重渲染
        return lodash.isEqual(prevProps, nextProps);
    },
);

export default CourseCard;
