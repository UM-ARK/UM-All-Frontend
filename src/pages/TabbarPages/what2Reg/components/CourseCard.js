import React, { useContext, memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import {
    ARK_WIKI_SEARCH,
    OFFICIAL_COURSE_SEARCH,
} from '../../../../utils/pathMap';
import { useUmehHost } from '../../../../utils/umehHost';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../utils/browser';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';

import { scale } from 'react-native-size-matters';
import { NavigationContext } from '@react-navigation/native';
import { Icon } from '@expo/ui';
import { MenuView } from '@expo/ui/community/menu';
import lodash from 'lodash';
import { t } from 'i18next';

// Menu 圖標：iOS 用 SF Symbol，Android 用 Material Symbols XML
const MENU_ICON_BOOK = Icon.select({
    ios: 'book',
    android: require('@expo/material-symbols/book.xml'),
});
const MENU_ICON_STAR = Icon.select({
    ios: 'star',
    android: require('@expo/material-symbols/star.xml'),
});
const MENU_ICON_SCHOOL = Icon.select({
    ios: 'graduationcap',
    android: require('@expo/material-symbols/school.xml'),
});
const MENU_ICON_CALENDAR = Icon.select({
    ios: 'calendar',
    android: require('@expo/material-symbols/calendar_month.xml'),
});
const MENU_ICON_LIST = Icon.select({
    ios: 'list.bullet',
    android: require('@expo/material-symbols/format_list_bulleted.xml'),
});

const styles = StyleSheet.create({
    menuView: {
        alignSelf: 'flex-start',
    },
});

const CourseCard = memo(
    ({ item, mode, prof_info, courseMode = 'ad', cardWidth, cardHeight, onMeasureHeight }) => {
        // const { item, mode, prof_info, courseMode = 'ad' } = props;
        const navigation = useContext(NavigationContext);
        const { theme } = useTheme();
        const { baseHost } = useUmehHost();
        const { themeColor, black, secondThemeColor, white } = theme;
        const isPreEnroll = courseMode === 'preEnroll';

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
            let renderItm = null;
            if (code.length === 8 && code.indexOf('-') === -1) {
                renderItm = (
                    <>
                        {code.substring(0, 4) + ' '}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: themeColor,
                                fontWeight: '700',
                                fontSize: scale(16),
                            }}>
                            {code.substring(4, 8)}
                        </Text>
                    </>
                );
            }
            // FLL MLS的課程代號有TLL123-A的格式
            else if (code.length === 8 && code.indexOf('-') !== -1) {
                renderItm = (
                    <>
                        {code.substring(0, 3) + ' '}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: themeColor,
                                fontWeight: '700',
                                fontSize: scale(16),
                            }}>
                            {code.substring(3, 8)}
                        </Text>
                    </>
                );
            } else {
                renderItm = code;
            }

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

        const courseActions = [
            {
                id: 'ark-wiki',
                title: `${t('寫', { ns: 'catalog' })} Wiki`,
                image: MENU_ICON_BOOK,
                imageColor: themeColor,
                titleColor: themeColor,
            },
            {
                id: 'what2reg',
                title: `${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`,
                image: MENU_ICON_STAR,
                imageColor: black.third,
                titleColor: black.third,
            },
            {
                id: 'official',
                title: `${t('查', { ns: 'catalog' })} ${t('官方', { ns: 'catalog' })}`,
                image: MENU_ICON_SCHOOL,
                imageColor: black.third,
                titleColor: black.third,
            },
            ...(!isPreEnroll
                ? [
                    {
                        id: 'coursesim',
                        title: `${t('查', { ns: 'catalog' })} ${t('模擬課表', { ns: 'catalog' })}`,
                        image: MENU_ICON_CALENDAR,
                        imageColor: black.third,
                        titleColor: black.third,
                    },
                    {
                        id: 'section',
                        title: `${t('查', { ns: 'catalog' })} Section`,
                        image: MENU_ICON_LIST,
                        imageColor: black.third,
                        titleColor: black.third,
                    },
                ]
                : []),
        ];

        const handleMenuAction = event => {
            trigger();
            switch (event.nativeEvent.event) {
                case 'ark-wiki': {
                    let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
                    if (prof_info) {
                        URL =
                            ARK_WIKI_SEARCH +
                            encodeURIComponent(prof_info.name);
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
                    openLink(URL);
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
                    navigation.navigate('Tabbar', {
                        screen: 'CourseSimTab',
                        params: { check: courseCode },
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
                    navigation.navigate('LocalCourse', courseCode);
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
                style={[
                    styles.menuView,
                    cardWidth ? { width: cardWidth } : null,
                    cardHeight ? { height: cardHeight } : null,
                ]}>
                <TouchableScale
                    activeScale={0.96}
                    style={{
                        backgroundColor: white,
                        borderRadius: scale(10),
                        padding: scale(10),
                        paddingVertical: scale(5),
                        width: cardWidth,
                        height: cardHeight,
                        justifyContent: 'space-between',
                    }}
                    onLayout={cardHeight ? undefined : ({ nativeEvent }) => {
                        onMeasureHeight?.(nativeEvent.layout.height);
                    }}
                    onPress={() => {
                        trigger();
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
                            {title}
                        </Text>
                        {'courseTitleChi' in item &&
                            item.courseTitleChi.length > 0 ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(11),
                                    color: black.second,
                                }}>
                                {item.courseTitleChi}
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
                                {item['Course Title Chi']}
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
                </TouchableScale>
            </MenuView>
        );
    },
    (prevProps, nextProps) => {
        // 比較props，避免不必要的重渲染
        return lodash.isEqual(prevProps, nextProps);
    },
);

export default CourseCard;
