import React from 'react';
import { Text, View, Alert } from 'react-native';
import * as DropdownMenu from 'zeego/dropdown-menu';
import { scale } from 'react-native-size-matters';
import lodash from 'lodash';
import { t } from 'i18next';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import { WHAT_2_REG, ARK_WIKI_SEARCH } from '../../../../utils/pathMap';
import { openLink } from '../../../../utils/browser';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import TouchableScale from '../../../../components/TouchableScale';

// 單一 offering（section）卡片與長按選單：Section／Teacher 分組共用。
const LocalCourseOfferingMenuCard = ({ navigation, slots, variant }) => {
    const { theme } = useTheme();
    const { themeColor, black, white } = theme;

    const courseRow = slots?.[0];
    if (!courseRow) {
        return null;
    }

    const isPE = courseRow['Course Code'] === 'CPED1001' || courseRow['Course Code'] === 'CPED1002';
    const firstRowWrap = variant === 'section' ? { flexWrap: 'wrap' } : {};
    const timeRowWrap = variant === 'section' ? { flexWrap: 'wrap' } : {};
    const showTeacherInCard = variant === 'section' && courseRow['Teacher Information'];

    const keyPrefix = variant;

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
                        margin: scale(5),
                        backgroundColor: white,
                        borderRadius: scale(16),
                        paddingVertical: scale(5), paddingHorizontal: scale(8),
                        alignItems: 'center',
                    }}
                    activeOpacity={0.8}
                    onPress={() => { trigger('rigid'); }}
                >
                    <View style={{ flexDirection: 'row', ...firstRowWrap }}>
                        <Text style={{
                            ...uiStyle.defaultText, fontSize: scale(12), color: black.third,
                        }}>{courseRow.Section + ' - ' + courseRow['Medium of Instruction']}</Text>
                    </View>
                    {isPE && (<View style={{ alignItems: 'center' }}>
                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseRow['Course Title']}</Text>
                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: black.third }}>{courseRow['Course Title Chi']}</Text>
                    </View>)}
                    {showTeacherInCard && (
                        <View style={{ alignItems: 'center', flexDirection: 'row' }}>
                            <Text style={{ ...uiStyle.defaultText, fontSize: scale(13), color: themeColor }}>{courseRow['Teacher Information']}</Text>
                        </View>
                    )}
                    {slots.length >= 1 && slots.every(item => 'Time From' in item && item['Time From']) && (
                        <View style={{ flexDirection: 'row', ...timeRowWrap }}>
                            {slots.map((sameSection, idx) => (
                                <View
                                    key={variant === 'teacher' ? sameSection.Day + sameSection.Classroom + idx : sameSection.Day + sameSection.Classroom}
                                    style={{
                                        margin: scale(5),
                                        alignItems: 'center',
                                    }}>
                                    <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{sameSection.Day}</Text>
                                    {'Classroom' in sameSection && sameSection.Classroom ? (
                                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{sameSection.Classroom}</Text>
                                    ) : null}
                                    {'Time From' in sameSection && sameSection['Time From'] ? (
                                        <Text style={{ ...uiStyle.defaultText, fontSize: scale(10), color: black.third }}>{sameSection['Time From']} ~ {sameSection['Time To']}</Text>
                                    ) : null}
                                </View>
                            ))}
                        </View>
                    )}
                </TouchableScale>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <DropdownMenu.Item
                    key={`${keyPrefix}-wiki`}
                    onSelect={() => {
                        trigger();
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
                        }
                        else {
                            logToFirebase('checkCourse', {
                                courseCode: cc,
                                action: 'ark-wiki',
                            });
                        }
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
                        {`${t('寫', { ns: 'catalog' })} Wiki`}
                    </DropdownMenu.ItemTitle>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    key={`${keyPrefix}-what2reg`}
                    onSelect={() => {
                        trigger();
                        const courseCode_ = courseRow['Course Code'];
                        const profName = courseRow['Teacher Information'];
                        if (profName) {
                            const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode_) + '/' + encodeURIComponent(lodash.deburr(profName));
                            logToFirebase('checkCourse', {
                                courseCode: courseCode_,
                                profName,
                                action: 'what2reg',
                            });
                            openLink(URI);
                        }
                        else {
                            const URI = `${WHAT_2_REG}/course/${encodeURIComponent(courseCode_)}`;
                            logToFirebase('checkCourse', {
                                courseCode: courseCode_,
                                action: 'what2reg',
                            });
                            openLink(URI);
                        }
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
                        {`${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`}
                    </DropdownMenu.ItemTitle>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    key={`${keyPrefix}-coursesim`}
                    onSelect={() => {
                        trigger();
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
                        {`${t('查', { ns: 'catalog' })} ${t('模擬課表', { ns: 'catalog' })}`}
                    </DropdownMenu.ItemTitle>
                </DropdownMenu.Item>
                <DropdownMenu.Item
                    key={`${keyPrefix}-add-coursesim`}
                    onSelect={() => {
                        trigger();
                        Alert.alert('ARK搵課提示', '確定添加此課程到模擬課表嗎？', [
                            {
                                text: 'Yes', onPress: () => {
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
                    }}
                >
                    <DropdownMenu.ItemIcon
                        ios={{
                            name: 'plus.circle',
                            pointSize: scale(18),
                            hierarchicalColor: {
                                dark: black.third,
                                light: black.third,
                            },
                        }}
                        androidIconName="ic_menu_add"
                    />
                    <DropdownMenu.ItemTitle style={{ color: black.third }}>
                        {`${t('添加至模擬課表', { ns: 'catalog' })}`}
                    </DropdownMenu.ItemTitle>
                </DropdownMenu.Item>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};

export default LocalCourseOfferingMenuCard;
