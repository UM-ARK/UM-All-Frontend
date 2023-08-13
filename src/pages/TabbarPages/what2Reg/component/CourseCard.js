import React, { Component } from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';

import { COLOR_DIY } from '../../../../utils/uiMap';

import { scale } from "react-native-size-matters";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { NavigationContext } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

export default class CourseCard extends Component {
    static contextType = NavigationContext;

    // 渲染課程代號
    renderCourseCode = (code) => {
        let renderItm = null;
        if (code.length == 8 && !code.includes('-')) {
            renderItm = <>
                {code.substring(0, 4) + ' '}
                <Text style={{
                    color: themeColor,
                    fontWeight: '700',
                    fontSize: scale(16)
                }}>
                    {code.substring(4, 8)}
                </Text>
            </>
        }
        // FLL MLS的課程代號有TLL123-A的格式
        else if (code.length == 8 && code.includes('-')) {
            renderItm = <>
                {code.substring(0, 3) + ' '}
                <Text style={{
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
                fontSize: scale(13),
                fontWeight: '600',
                color: black.main,
            }}>
                {renderItm}
            </Text>
        )
    }

    render() {
        const { data, mode } = this.props;
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
                        <TouchableOpacity
                            style={{
                                backgroundColor: COLOR_DIY.bg_color,
                                borderRadius: scale(10),
                                margin: scale(5),
                                padding: scale(10), paddingVertical: scale(5),
                                ...viewShadow,
                            }}
                            onPress={() => {
                                ReactNativeHapticFeedback.trigger('soft');
                                this.context.navigate('What2RegCourse', courseCode)
                            }}
                        >
                            {this.renderCourseCode(courseCode)}
                            <Text style={{
                                fontSize: scale(11),
                                color: black.second,
                            }}>{title}</Text>
                            <Text style={{
                                fontSize: scale(10),
                                color: black.third,
                            }}>
                                {offerUnit}
                                {offerDepa && (' - ' + offerDepa)}
                            </Text>
                            {credit ? (
                                <Text style={{
                                    fontSize: scale(10),
                                    color: black.third,
                                }}>{credit} Credit</Text>
                            ) : null}

                            {/* 開課標識 */}
                            {mode == 'what2Reg' && item['is_offered'] && (
                                <MaterialCommunityIcons
                                    style={{ position: 'absolute', right: scale(5), top: scale(5), }}
                                    name="account-check"
                                    size={scale(18)}
                                    color={themeColor}
                                />
                            )}
                        </TouchableOpacity>
                    )
                }}
                key={data.length}
                keyExtractor={(item, index) => index}
            />
        );
    }
}
