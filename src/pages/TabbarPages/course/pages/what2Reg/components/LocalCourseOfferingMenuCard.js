import React from 'react';
import { Text, View, Platform, useWindowDimensions } from 'react-native';
// 不可用 @expo/ui MenuView（SwiftUI Host matchContents 會在 Tab 切換／版面提交時
// 反寫 Fabric ShadowTree 並 abort）。改用 @react-native-menu/menu（原生 UIButton）。
// Teacher 分類橫滑靠固定 cardWidth；時段每行最多兩天，避免多天撐破寬度。
import { MenuView } from '@react-native-menu/menu';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import { scale } from 'react-native-size-matters';
import lodash from 'lodash';
import { t } from 'i18next';

import { useTheme, uiStyle } from '../../../../../../components/ThemeContext';
import { trigger } from '../../../../../../utils/trigger';
import { ARK_WIKI_SEARCH } from '../../../../../../utils/pathMap';
import { useUmehHost } from '../../../../../../utils/umehHost';
import { openLink } from '../../../../../../utils/browser';
import { logToFirebase } from '../../../../../../utils/firebaseAnalytics';
import { navigateToCourseTab } from '../../../../../../utils/courseNavigation';
import { getCourseSectionDisplayTitle } from '../utils/courseTitle';

/** 與 LocalCourse 列表左右內距一致 */
const TEACHER_LIST_SIDE_INSET = scale(10);
/** MenuView / 卡片外圍 margin（左右各一份） */
const TEACHER_CARD_MARGIN = scale(5);
/** 橫滑時露出下一張卡的寬度，提示還有更多班別 */
const TEACHER_NEXT_CARD_PEEK = scale(36);

/** 與 TouchableScale 預設相近的彈簧參數 */
const COURSE_CARD_SPRING = {
    damping: 18,
    stiffness: 280,
    mass: 0.4,
};

// 單一 offering（section）卡片與長按選單：Section／Teacher 分組共用。
const LocalCourseOfferingMenuCard = ({
    navigation,
    slots,
    variant,
    isRecommended = false,
}) => {
    const { width: windowWidth } = useWindowDimensions();
    // Section 單卡置中：用螢幕寬扣除左右邊距
    // Teacher 橫滑：約兩卡寬 + peek，讓下一張露出一截
    const teacherCardWidth =
        (windowWidth -
            TEACHER_LIST_SIDE_INSET * 2 -
            TEACHER_NEXT_CARD_PEEK) /
            2 -
        TEACHER_CARD_MARGIN * 2;
    const cardWidth =
        variant === 'section'
            ? windowWidth - scale(40)
            : Math.max(scale(130), teacherCardWidth);
    const { theme } = useTheme();
    const { baseHost } = useUmehHost();
    const { themeColor, black, white, tonal } = theme;

    // 原生 UIButton 會吃掉子層 pressIn，故縮放回饋改由選單開合驅動
    // hook 必須在 courseRow 提前 return 之前呼叫
    const cardScale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: cardScale.value }],
    }));

    const courseRow = slots?.[0];
    if (!courseRow) {
        return null;
    }

    const isPE =
        courseRow['Course Code'] === 'CPED1001' ||
        courseRow['Course Code'] === 'CPED1002';
    const showTeacherInCard =
        variant === 'section' && courseRow['Teacher Information'];

    const keyPrefix = variant;
    // @react-native-menu/menu：iOS 用 SF Symbol；Android 用系統 drawable 名稱
    const offeringActions = [
        {
            id: `${keyPrefix}-wiki`,
            title: `${t('寫', { ns: 'catalog' })} Wiki`,
            image: Platform.select({
                ios: 'book',
                android: 'ic_menu_agenda',
            }),
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: `${keyPrefix}-what2reg`,
            title: `${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'star',
                android: 'btn_star_big_on',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
        {
            id: `${keyPrefix}-coursesim`,
            title: `${t('查', { ns: 'catalog' })} ${t('模擬課表', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'calendar',
                android: 'ic_menu_my_calendar',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
        {
            id: `${keyPrefix}-add-coursesim`,
            title: `${t('添加至模擬課表', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'plus.circle',
                android: 'ic_menu_add',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
    ];

    const handleMenuAction = event => {
        trigger();
        switch (event.nativeEvent.event) {
            case `${keyPrefix}-wiki`: {
                const cc = courseRow['Course Code'];
                const prof = courseRow['Teacher Information'];
                let URL = ARK_WIKI_SEARCH + encodeURIComponent(cc);
                if (prof) {
                    URL = ARK_WIKI_SEARCH + encodeURIComponent(prof);
                    logToFirebase('checkCourse', {
                        courseCode: cc,
                        profName: prof,
                        action: 'ark-wiki',
                    });
                } else {
                    logToFirebase('checkCourse', {
                        courseCode: cc,
                        action: 'ark-wiki',
                    });
                }
                openLink(URL);
                break;
            }
            case `${keyPrefix}-what2reg`: {
                const courseCode_ = courseRow['Course Code'];
                const profName = courseRow['Teacher Information'];
                if (profName) {
                    const URI =
                        baseHost +
                        '/reviews/' +
                        encodeURIComponent(courseCode_) +
                        '/' +
                        encodeURIComponent(lodash.deburr(profName));
                    logToFirebase('checkCourse', {
                        courseCode: courseCode_,
                        profName,
                        action: 'what2reg',
                    });
                    openLink(URI);
                } else {
                    const URI = `${baseHost}/course/${encodeURIComponent(courseCode_)}`;
                    logToFirebase('checkCourse', {
                        courseCode: courseCode_,
                        action: 'what2reg',
                    });
                    openLink(URI);
                }
                break;
            }
            case `${keyPrefix}-coursesim`: {
                logToFirebase('checkCourse', {
                    courseCode: courseRow['Course Code'],
                    action: 'coursesim',
                });
                if (navigation.canGoBack()) {
                    navigation.goBack();
                }
                navigateToCourseTab(navigation, {
                    segment: 'timetable',
                    courseCode: courseRow['Course Code'],
                });
                break;
            }
            case `${keyPrefix}-add-coursesim`: {
                // 加課後直接落在課表段落即為可見回饋，故不再多一層 Alert 確認
                if (navigation.canGoBack()) {
                    navigation.goBack();
                }
                navigateToCourseTab(navigation, {
                    segment: 'timetable',
                    add: courseRow,
                });
                break;
            }
            default:
                break;
        }
    };

    return (
        <MenuView
            actions={offeringActions}
            onPressAction={handleMenuAction}
            shouldOpenOnLongPress={false}
            onOpenMenu={() => {
                trigger('rigid');
                cardScale.value = withSpring(0.96, COURSE_CARD_SPRING);
            }}
            onCloseMenu={() => {
                cardScale.value = withSpring(1, COURSE_CARD_SPRING);
            }}
            style={{
                width: cardWidth,
                margin: scale(5),
                alignSelf: variant === 'section' ? 'center' : 'flex-start',
            }}>
            <Animated.View
                style={[
                    {
                        width: cardWidth,
                        backgroundColor: isRecommended
                            ? tonal.primary08
                            : white,
                        borderRadius: scale(16),
                        borderWidth: isRecommended ? scale(1) : 0,
                        borderColor: themeColor,
                        paddingVertical: scale(5),
                        paddingHorizontal: scale(8),
                        alignItems: 'center',
                    },
                    animatedStyle,
                ]}>
                {variant === 'section' && (
                    <View
                        style={{
                            width: '100%',
                            flexDirection: 'row',
                            alignItems: 'center',
                            marginBottom: scale(4),
                        }}>
                        <View
                            style={{
                                width: scale(3),
                                height: scale(14),
                                borderRadius: scale(2),
                                backgroundColor: themeColor,
                                marginRight: scale(8),
                            }}
                        />
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                flex: 1,
                                fontSize: scale(13),
                                fontWeight: '700',
                                color: black.second,
                            }}>
                            Section {courseRow.Section}
                        </Text>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(10),
                                color: black.third,
                            }}>
                            {courseRow['Medium of Instruction']}
                        </Text>
                        {isRecommended ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    marginLeft: scale(8),
                                    fontSize: scale(10),
                                    fontWeight: '700',
                                    color: themeColor,
                                }}>
                                {t('不衝突', { ns: 'catalog' })}
                            </Text>
                        ) : null}
                    </View>
                )}
                {variant !== 'section' && (
                    <View style={{ flexDirection: 'row' }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(12),
                                color: black.third,
                            }}>
                            {courseRow.Section +
                                ' - ' +
                                courseRow['Medium of Instruction']}
                            {isRecommended ? (
                                <Text
                                    style={{
                                        color: themeColor,
                                        fontWeight: '700',
                                    }}>
                                    {` · ${t('不衝突', { ns: 'catalog' })}`}
                                </Text>
                            ) : null}
                        </Text>
                    </View>
                )}
                {isPE && (
                    <View
                        style={{
                            alignItems: 'center',
                            flexDirection:
                                variant === 'section' ? 'row' : 'column',
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(13),
                                color: black.third,
                            }}>
                            {getCourseSectionDisplayTitle(
                                courseRow['Course Code'],
                                courseRow['Course Title'],
                            )}
                        </Text>
                        {variant === 'section' ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(13),
                                    color: black.third,
                                }}>
                                {' · '}
                            </Text>
                        ) : null}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(13),
                                color: black.third,
                            }}>
                            {getCourseSectionDisplayTitle(
                                courseRow['Course Code'],
                                courseRow['Course Title Chi'],
                            )}
                        </Text>
                    </View>
                )}
                {showTeacherInCard && (
                    <View
                        style={{ alignItems: 'center', flexDirection: 'row' }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(13),
                                color: themeColor,
                            }}>
                            {courseRow['Teacher Information']}
                        </Text>
                    </View>
                )}
                {slots.length >= 1 &&
                    slots.every(
                        item => 'Time From' in item && item['Time From'],
                    ) && (
                        <View
                            style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                justifyContent: 'center',
                                width: '100%',
                            }}>
                            {slots.map((sameSection, idx) => (
                                <View
                                    key={
                                        variant === 'teacher'
                                            ? sameSection.Day +
                                              sameSection.Classroom +
                                              idx
                                            : sameSection.Day +
                                              sameSection.Classroom
                                    }
                                    style={{
                                        width:
                                            variant === 'section'
                                                ? '100%'
                                                : '50%',
                                        paddingVertical:
                                            variant === 'section'
                                                ? scale(2)
                                                : scale(5),
                                        alignItems: 'center',
                                    }}>
                                    {variant === 'section' ? (
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                fontSize: scale(10),
                                                color: black.third,
                                            }}
                                            numberOfLines={1}
                                            adjustsFontSizeToFit>
                                            {sameSection.Day}
                                            {sameSection.Classroom
                                                ? ` · ${sameSection.Classroom}`
                                                : ''}
                                            {sameSection['Time From']
                                                ? ` · ${sameSection['Time From']} ~ ${sameSection['Time To']}`
                                                : ''}
                                        </Text>
                                    ) : (
                                        <>
                                            <Text
                                                style={{
                                                    ...uiStyle.defaultText,
                                                    fontSize: scale(10),
                                                    color: black.third,
                                                }}>
                                                {sameSection.Day}
                                            </Text>
                                            {'Classroom' in sameSection &&
                                            sameSection.Classroom ? (
                                                <Text
                                                    style={{
                                                        ...uiStyle.defaultText,
                                                        fontSize: scale(10),
                                                        color: black.third,
                                                    }}>
                                                    {sameSection.Classroom}
                                                </Text>
                                            ) : null}
                                            {'Time From' in sameSection &&
                                            sameSection['Time From'] ? (
                                                <Text
                                                    style={{
                                                        ...uiStyle.defaultText,
                                                        fontSize: scale(10),
                                                        color: black.third,
                                                    }}
                                                    numberOfLines={1}
                                                    adjustsFontSizeToFit>
                                                    {sameSection['Time From']} ~{' '}
                                                    {sameSection['Time To']}
                                                </Text>
                                            ) : null}
                                        </>
                                    )}
                                </View>
                            ))}
                        </View>
                    )}
            </Animated.View>
        </MenuView>
    );
};

export default LocalCourseOfferingMenuCard;
