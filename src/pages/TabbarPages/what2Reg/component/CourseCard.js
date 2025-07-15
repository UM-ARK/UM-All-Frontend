import React, { useContext, memo } from 'react';
import { View, Text, FlatList } from 'react-native';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { WHAT_2_REG, ARK_WIKI_SEARCH, OFFICIAL_COURSE_SEARCH } from '../../../../utils/pathMap';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../utils/browser';
import { trigger } from '../../../../utils/trigger';

import { scale } from "react-native-size-matters";
import { NavigationContext } from '@react-navigation/native';
import { MenuView } from '@react-native-menu/menu';
import TouchableScale from "react-native-touchable-scale";
import lodash from 'lodash';

const CourseCard = memo(({ data, mode, prof_info, handleSetLetterData, courseMode = 'ad' }) => {
    // const { data, mode, prof_info, handleSetLetterData, courseMode = 'ad' } = props;
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { themeColor, black, secondThemeColor, white, what2reg_color, } = theme;

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
                    fontSize: scale(16)
                }}>
                    {code.substring(4, 8)}
                </Text>
            </>
        }
        // FLL MLS的課程代號有TLL123-A的格式
        else if (code.length === 8 && code.indexOf('-') !== -1) {
            renderItm = <>
                {code.substring(0, 3) + ' '}
                <Text style={{
                    ...uiStyle.defaultText,
                    color: themeColor,
                    fontWeight: '700',
                    fontSize: scale(16)
                }}>
                    {code.substring(3, 8)}
                </Text>
            </>
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
        )
    }

    return (
        <FlatList
            data={data}
            numColumns={data.length}
            columnWrapperStyle={data.length > 1 ? { flexWrap: 'wrap' } : null}
            style={{ marginHorizontal: scale(5) }}
            renderItem={({ item }) => {
                const courseCode = item[mode === "what2Reg" ? 'New_code' : 'Course Code'];
                const title = item[mode === "what2Reg" ? 'courseTitleEng' : 'Course Title'];
                const offerUnit = item[mode === "what2Reg" ? 'Offering_Unit' : 'Offering Unit'];
                const offerDepa = item[mode === "what2Reg" ? 'Offering_Department' : 'Offering Department'];
                const credit = item[mode === "what2Reg" ? 'Credits' : 'Credit Units']

                return (
                    <MenuView
                        onPressAction={({ nativeEvent }) => {
                            switch (nativeEvent.event) {
                                case 'wiki':
                                    trigger();
                                    let URL = ARK_WIKI_SEARCH + encodeURIComponent(courseCode);
                                    if (prof_info) {
                                        URL = ARK_WIKI_SEARCH + encodeURIComponent(prof_info.name);
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            profName: prof_info.name,
                                        });
                                    }
                                    else {
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            onLongPress: 0,
                                        });
                                    }
                                    // 跳轉ARK Wiki
                                    navigation.navigate('Wiki', { url: URL });
                                    break;

                                case 'what2reg':
                                    trigger();
                                    let webview_param = {
                                        url: '',
                                        title: '',
                                        text_color: white,
                                        bg_color_diy: what2reg_color,
                                        isBarStyleBlack: false,
                                    };
                                    if (prof_info) {
                                        // 進入搜索特定教授的課程模式，進入評論詳情頁
                                        const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(courseCode) + '/' + encodeURIComponent(prof_info.name)
                                        webview_param.url = URI;
                                        webview_param.title = courseCode;
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            profName: prof_info.name,
                                        });
                                    }
                                    else {
                                        // 進入搜索課程代號模式
                                        const URI = `${WHAT_2_REG}/course/${encodeURIComponent(courseCode)}`
                                        webview_param.url = URI;
                                        webview_param.title = courseCode;
                                        logToFirebase('checkCourse', {
                                            courseCode: courseCode,
                                            onLongPress: 0,
                                        });
                                    }
                                    openLink(webview_param.url);
                                    break;

                                case 'official':
                                    trigger();
                                    const URI = OFFICIAL_COURSE_SEARCH + courseCode;
                                    logToFirebase('checkCourse', {
                                        courseCode: 'Official ' + courseCode,
                                    });
                                    openLink(URI);
                                    break;

                                case 'section':
                                    trigger();
                                    logToFirebase('checkCourse', {
                                        courseCode: courseCode,
                                    });
                                    navigation.navigate('LocalCourse', courseCode)
                                    break;

                                default:
                                    break;
                            }
                        }}
                        actions={[
                            {
                                id: 'wiki',
                                title: '查 ARK Wiki !!!  ε٩(๑> ₃ <)۶з',
                                titleColor: themeColor,
                            },
                            {
                                id: 'what2reg',
                                title: '查 選咩課',
                                titleColor: black.third,
                            },
                            {
                                id: 'official',
                                title: '查 官方',
                                titleColor: black.third,
                            },
                            {
                                id: 'section',
                                title: '查 Section',
                                titleColor: black.third,
                            },
                        ]}
                        shouldOpenOnLongPress={false}
                        // 獲取當前位置距離屏幕頂端的高度
                        onLayout={event => {
                            const { layout } = event.nativeEvent;
                            // 記錄首個出現的首字母的高度
                            handleSetLetterData && handleSetLetterData({ [courseCode[0]]: layout.y + scale(10) }, data.length);
                        }}
                    >
                        <TouchableScale
                            style={{
                                backgroundColor: white,
                                borderRadius: scale(10),
                                margin: scale(5),
                                padding: scale(10), paddingVertical: scale(5),
                            }}
                            onPress={() => {
                                trigger('rigid');
                            }}
                            onLongPress={() => {
                                trigger('rigid');
                                logToFirebase('checkCourse', {
                                    courseCode: courseCode,
                                    onLongPress: 1,
                                });
                                navigation.navigate('LocalCourse', courseCode)
                            }}
                            // BUG: 此處小於300ms的長按事件容易被Menu誤認為點擊事件
                            delayLongPress={300}
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
                    </MenuView>
                )
            }}
            key={data.length}
            scrollEnabled={false}
            keyExtractor={(item, index) => index.toString()}
            initialNumToRender={10}
            windowSize={21}
        />
    );
}, (prevProps, nextProps) => {
    // 比較props，避免不必要的重渲染
    return lodash.isEqual(prevProps, nextProps)
});

export default CourseCard;