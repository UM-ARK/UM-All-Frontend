import React from 'react';
import { Text, View, Alert, useWindowDimensions } from 'react-native';
// @expo/ui MenuView 用 SwiftUI Host + matchContents 反向量測，無明確寬度會塌陷。
// Teacher 分類橫滑靠固定 cardWidth；時段每行最多兩天，避免多天撐破寬度。
import { Icon } from '@expo/ui';
import { MenuView } from '@expo/ui/community/menu';
import { scale } from 'react-native-size-matters';
import lodash from 'lodash';
import { t } from 'i18next';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import { ARK_WIKI_SEARCH } from '../../../../utils/pathMap';
import { useUmehHost } from '../../../../utils/umehHost';
import { openLink } from '../../../../utils/browser';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import TouchableScale from '../../../../components/TouchableScale';

/** 老師分組橫向列表中的卡片固定寬度 */
const TEACHER_CARD_WIDTH = scale(160);

// Menu 圖標：iOS 用 SF Symbol，Android 用 Material Symbols XML
const MENU_ICON_BOOK = Icon.select({
    ios: 'book',
    android: require('@expo/material-symbols/book.xml'),
});
const MENU_ICON_STAR = Icon.select({
    ios: 'star',
    android: require('@expo/material-symbols/star.xml'),
});
const MENU_ICON_CALENDAR = Icon.select({
    ios: 'calendar',
    android: require('@expo/material-symbols/calendar_month.xml'),
});
const MENU_ICON_ADD = Icon.select({
    ios: 'plus.circle',
    android: require('@expo/material-symbols/add_circle.xml'),
});

// 單一 offering（section）卡片與長按選單：Section／Teacher 分組共用。
const LocalCourseOfferingMenuCard = ({ navigation, slots, variant }) => {
    const { width: windowWidth } = useWindowDimensions();
    // Section 單卡置中：用螢幕寬扣除左右邊距；Teacher 橫滑：固定卡片寬
    const cardWidth =
        variant === 'section'
            ? windowWidth - scale(40)
            : TEACHER_CARD_WIDTH;
    const { theme } = useTheme();
    const { baseHost } = useUmehHost();
    const { themeColor, black, white } = theme;

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
    const offeringActions = [
        {
            id: `${keyPrefix}-wiki`,
            title: `${t('寫', { ns: 'catalog' })} Wiki`,
            image: MENU_ICON_BOOK,
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: `${keyPrefix}-what2reg`,
            title: `${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`,
            image: MENU_ICON_STAR,
            imageColor: black.third,
            titleColor: black.third,
        },
        {
            id: `${keyPrefix}-coursesim`,
            title: `${t('查', { ns: 'catalog' })} ${t('模擬課表', { ns: 'catalog' })}`,
            image: MENU_ICON_CALENDAR,
            imageColor: black.third,
            titleColor: black.third,
        },
        {
            id: `${keyPrefix}-add-coursesim`,
            title: `${t('添加至模擬課表', { ns: 'catalog' })}`,
            image: MENU_ICON_ADD,
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
                    navigation.navigate('Tabbar', {
                        screen: 'CourseSimTab',
                        params: { check: courseRow['Course Code'] },
                    });
                }
                break;
            }
            case `${keyPrefix}-add-coursesim`: {
                Alert.alert('ARK搵課提示', '確定添加此課程到模擬課表嗎？', [
                    {
                        text: 'Yes',
                        onPress: () => {
                            trigger();
                            if (navigation.canGoBack()) {
                                navigation.goBack();
                                navigation.navigate('Tabbar', {
                                    screen: 'CourseSimTab',
                                    params: { add: courseRow },
                                });
                            }
                        },
                    },
                    { text: 'No' },
                ]);
                break;
            }
            default:
                break;
        }
    };

    return (
        <MenuView
            actions={offeringActions}
            onOpenMenu={() => trigger()}
            onPressAction={handleMenuAction}
            shouldOpenOnLongPress={false}
            style={{
                width: cardWidth,
                margin: scale(5),
                alignSelf: variant === 'section' ? 'center' : 'flex-start',
            }}>
            <TouchableScale
                style={{
                    width: cardWidth,
                    backgroundColor: white,
                    borderRadius: scale(16),
                    paddingVertical: scale(5),
                    paddingHorizontal: scale(8),
                    alignItems: 'center',
                }}
                activeScale={0.96}
                onPress={() => {
                    trigger('rigid');
                }}>
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
                        </Text>
                    </View>
                )}
                {isPE && (
                    <View style={{ alignItems: 'center' }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(13),
                                color: black.third,
                            }}>
                            {courseRow['Course Title']}
                        </Text>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(13),
                                color: black.third,
                            }}>
                            {courseRow['Course Title Chi']}
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
                                        width: '50%',
                                        paddingVertical: scale(5),
                                        alignItems: 'center',
                                    }}>
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
                                </View>
                            ))}
                        </View>
                    )}
            </TouchableScale>
        </MenuView>
    );
};

export default LocalCourseOfferingMenuCard;
