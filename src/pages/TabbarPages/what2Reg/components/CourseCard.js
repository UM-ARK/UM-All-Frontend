import React, { useContext, memo } from 'react';
import { View, Text } from 'react-native';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { ARK_WIKI_SEARCH, OFFICIAL_COURSE_SEARCH } from '../../../../utils/pathMap';
import { useUmehHost } from '../../../../utils/umehHost';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../utils/browser';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';

import { scale } from 'react-native-size-matters';
import { NavigationContext } from '@react-navigation/native';
import * as DropdownMenu from 'zeego/dropdown-menu';
import lodash from 'lodash';
import { t } from 'i18next';

const CourseCard = memo(({ item, mode, prof_info, courseMode = 'ad' }) => {
    // const { item, mode, prof_info, courseMode = 'ad' } = props;
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { baseHost } = useUmehHost();
    const { themeColor, black, secondThemeColor, white, what2reg_color } = theme;

    // 從 item 中提取課程資訊
    const courseCode = item[mode === 'what2Reg' ? 'New_code' : 'Course Code'];
    const title = item[mode === 'what2Reg' ? 'courseTitleEng' : 'Course Title'];
    const offerUnit = item[mode === 'what2Reg' ? 'Offering_Unit' : 'Offering Unit'];
    const offerDepa = item[mode === 'what2Reg' ? 'Offering_Department' : 'Offering Department'];
    const credit = item[mode === 'what2Reg' ? 'Credits' : 'Credit Units'];

    // 渲染課程代號
    const renderCourseCode = (code) => {
        let renderItm = null;
        if (code.length === 8 && code.indexOf('-') === -1) {
            renderItm = <>
                {code.substring(0, 4) + ' '}
                <Text style={{
                    ...uiStyle.defaultText,
                    color: themeColor,
                    fontWeight: '700',
                    fontSize: scale(16),
                }}>
                    {code.substring(4, 8)}
                </Text>
            </>;
        }
        // FLL MLS的課程代號有TLL123-A的格式
        else if (code.length === 8 && code.indexOf('-') !== -1) {
            renderItm = <>
                {code.substring(0, 3) + ' '}
                <Text style={{
                    ...uiStyle.defaultText,
                    color: themeColor,
                    fontWeight: '700',
                    fontSize: scale(16),
                }}>
                    {code.substring(3, 8)}
                </Text>
            </>;
        }
        else {
            renderItm = code;
        }

        return (
            <Text style={{
                ...uiStyle.defaultText,
                fontSize: scale(13),
                fontWeight: '600',
                color: black.main,
            }}>
                {renderItm}
            </Text>
        );
    };

    return (
        <DropdownMenu.Root
            onOpenChange={(open) => {
                if (open) {
                    trigger();
                }
            }}
        >
            <DropdownMenu.Trigger>
                <TouchableScale
                    style={{
                        backgroundColor: white,
                        borderRadius: scale(10),
                        margin: scale(5),
                        padding: scale(10), paddingVertical: scale(5),
                    }}
                >
                    {/* 課程編號與開課標識 */}
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        {renderCourseCode(courseCode)}
                        {/* Pre Enroll標記 */}
                        {courseMode === 'preEnroll' ? (
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(10),
                                fontWeight: 'bold',
                                marginLeft: scale(5),
                                color: secondThemeColor,
                            }}>PreEnroll</Text>
                        ) : null}
                    </View>
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(11),
                        color: black.second,
                    }}>{title}</Text>
                    {'courseTitleChi' in item && item.courseTitleChi.length > 0 ? (
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(11),
                                color: black.second,
                            }}>{item.courseTitleChi}</Text>
                        ) : null}
                    {'Course Title Chi' in item && item['Course Title Chi'].length > 0 ? (
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(11),
                                color: black.second,
                            }}>{item['Course Title Chi']}</Text>
                        ) : null}
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(10),
                        color: black.third,
                    }}>
                        {offerUnit}
                        {offerDepa && (' - ' + offerDepa)}
                    </Text>
                    {credit ? (
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(10),
                            color: black.third,
                        }}>{credit} Credit</Text>
                    ) : null}
                </TouchableScale>
            </DropdownMenu.Trigger>
                        {/* Menu 選項列表 */}
                        <DropdownMenu.Content>
                            <DropdownMenu.Item
                                key="ark-wiki"
                                onSelect={() => {
                                    trigger();
                                    let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
                                    if (prof_info) {
                                        URL = ARK_WIKI_SEARCH + encodeURIComponent(prof_info.name);
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            profName: prof_info.name,
                                            action: 'ark-wiki',
                                        });
                                    }
                                    else {
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            action: 'ark-wiki',
                                        });
                                    }
                                    // 跳轉到ARK Wiki網頁
                                    openLink(URL);
                                }}
                            >
                                <DropdownMenu.ItemIcon
                                    ios={{
                                        name: 'book',
                                        pointSize: scale(18),
                                        hierarchicalColor: {
                                            dark: themeColor,
                                            light: themeColor,
                                        },
                                    }}
                                    androidIconName="ic_menu_book"
                                />
                                <DropdownMenu.ItemTitle style={{ color: themeColor }}>
                                    {t('寫', { ns: 'catalog' })} Wiki
                                </DropdownMenu.ItemTitle>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                                key="what2reg"
                                onSelect={() => {
                                    trigger();
                                    let webview_param = {
                                        url: '',
                                        title: '',
                                        text_color: white,
                                        bg_color_diy: what2reg_color,
                                        isBarStyleBlack: false,
                                    };
                                    if (prof_info) {
                                        const URI = baseHost + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(lodash.deburr(prof_info.name));
                                        webview_param.url = URI;
                                        webview_param.title = courseCode;
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            profName: prof_info.name,
                                            action: 'what2reg',
                                        });
                                    }
                                    else {
                                        const URI = `${baseHost}/course/${encodeURIComponent(courseCode)}`;
                                        webview_param.url = URI;
                                        webview_param.title = courseCode;
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            action: 'what2reg',
                                        });
                                    }
                                    openLink(webview_param.url);
                                }}
                            >
                                <DropdownMenu.ItemIcon
                                    ios={{
                                        name: 'star',
                                        pointSize: scale(18),
                                        hierarchicalColor: {
                                            dark: black.third,
                                            light: black.third,
                                        },
                                    }}
                                    androidIconName="ic_menu_star"
                                />
                                <DropdownMenu.ItemTitle style={{ color: black.third }}>
                                    {t('查', { ns: 'catalog' })} {t('選咩課', { ns: 'catalog' })}
                                </DropdownMenu.ItemTitle>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                                key="official"
                                onSelect={() => {
                                    trigger();
                                    const URI = OFFICIAL_COURSE_SEARCH + courseCode;
                                    logToFirebase('checkCourse', {
                                        courseCode: 'Official ' + courseCode,
                                        action: 'official',
                                    });
                                    openLink(URI);
                                }}
                            >
                                <DropdownMenu.ItemIcon
                                    ios={{
                                        name: 'graduationcap',
                                        pointSize: scale(18),
                                        hierarchicalColor: {
                                            dark: black.third,
                                            light: black.third,
                                        },
                                    }}
                                    androidIconName="ic_menu_myplaces"
                                />
                                <DropdownMenu.ItemTitle style={{ color: black.third }}>
                                    {t('查', { ns: 'catalog' })} {t('官方', { ns: 'catalog' })}
                                </DropdownMenu.ItemTitle>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                                key="coursesim"
                                onSelect={() => {
                                    trigger();
                                    navigation.navigate('Tabbar', {
                                        screen: 'CourseSimTab',
                                        params: { check: courseCode },
                                    });
                                    logToFirebase('checkCourse', {
                                        courseCode: courseCode,
                                        action: 'coursesim',
                                    });
                                }}
                            >
                                <DropdownMenu.ItemIcon
                                    ios={{
                                        name: 'calendar',
                                        pointSize: scale(18),
                                        hierarchicalColor: {
                                            dark: black.third,
                                            light: black.third,
                                        },
                                    }}
                                    androidIconName="ic_menu_my_calendar"
                                />
                                <DropdownMenu.ItemTitle style={{ color: black.third }}>
                                    {t('查', { ns: 'catalog' })} {t('模擬課表', { ns: 'catalog' })}
                                </DropdownMenu.ItemTitle>
                            </DropdownMenu.Item>
                            <DropdownMenu.Item
                                key="section"
                                onSelect={() => {
                                    trigger();
                                    logToFirebase('checkCourse', {
                                        courseCode: courseCode,
                                        action: 'section',
                                    });
                                    navigation.navigate('LocalCourse', courseCode);
                                }}
                            >
                                <DropdownMenu.ItemIcon
                                    ios={{
                                        name: 'list.bullet',
                                        pointSize: scale(18),
                                        hierarchicalColor: {
                                            dark: black.third,
                                            light: black.third,
                                        },
                                    }}
                                    androidIconName="ic_menu_agenda"
                                />
                                <DropdownMenu.ItemTitle style={{ color: black.third }}>
                                    {t('查', { ns: 'catalog' })} Section
                                </DropdownMenu.ItemTitle>
                            </DropdownMenu.Item>
                        </DropdownMenu.Content>
                    </DropdownMenu.Root>
    );
}, (prevProps, nextProps) => {
    // 比較props，避免不必要的重渲染
    return lodash.isEqual(prevProps, nextProps);
});

export default CourseCard;
