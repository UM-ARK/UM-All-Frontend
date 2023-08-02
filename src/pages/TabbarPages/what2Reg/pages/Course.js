import React, { Component } from 'react'
import {
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    FlatList
} from 'react-native'

import { COLOR_DIY } from '../../../../utils/uiMap';
import Header from '../../../../components/Header';
import Loading from '../../../../components/Loading';

import { scale } from "react-native-size-matters";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

export default class Course extends Component {
    state = {
        isLoading: false,
        course_info: this.props.route.params.course_info,
        prof_info: this.props.route.params.prof_info,
    }

    jumpToProf = async (data) => {
        ReactNativeHapticFeedback.trigger('soft');
        this.setState({ isLoading: true })

        const res = data;
        this.props.navigation.navigate('What2RegComment', res)
        this.setState({ isLoading: false })
    }

    renderProfList = () => {
        const { course_info, prof_info } = this.state;
        let profArr = prof_info;
        profArr = profArr.sort((a, b) => b.num - a.num);
        profArr = profArr.sort((a, b) => b.offer_info.is_offer - a.offer_info.is_offer);

        return (
            <FlatList
                data={prof_info}
                numColumns={prof_info.length}
                columnWrapperStyle={prof_info.length > 1 ? { flexWrap: 'wrap' } : null}
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => {
                    return (
                        <TouchableOpacity
                            style={{
                                marginHorizontal: scale(5), marginVertical: scale(5),
                                borderRadius: scale(10),
                                backgroundColor: COLOR_DIY.bg_color,
                                padding: scale(10),
                                ...viewShadow
                            }}
                            onPress={() => {
                                this.jumpToProf({
                                    New_code: course_info.New_code,
                                    prof_name: itm.name,
                                    prof_info: itm,
                                })
                            }}
                        >
                            <Text style={{
                                alignSelf: 'center',
                                color: black.main,
                                fontSize: scale(12),
                            }}>{itm.name}</Text>
                            {/* <Text>總評: {itm.result}</Text> */}
                            {/* <Text>比分: {itm.grade}</Text> */}
                            {/* <Text>簽到: {itm.attendance}</Text> */}
                            {/* <Text>難易: {itm.hard}</Text> */}
                            {/* <Text>收穫: {itm.reward}</Text> */}
                            {itm.offer_info.is_offer ? (
                                <Text style={{
                                    color: COLOR_DIY.success,
                                    fontSize: scale(10),
                                    alignSelf: 'center', marginVertical: scale(3)
                                }}>開課</Text>
                            ) : null}
                            {itm.num > 0 && (
                                <Text style={{
                                    fontSize: scale(10),
                                    color: itm.result >= 3.34 ? COLOR_DIY.success : COLOR_DIY.warning,
                                    alignSelf: 'flex-end'
                                }}>
                                    {itm.num} 條評價
                                </Text>
                            )}
                        </TouchableOpacity>
                    )
                }}
            />
        )
    }

    render() {
        const { course_info, prof_info, isLoading } = this.state;

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={course_info.New_code} />

                <ScrollView>
                    {/* 課程信息介紹 */}
                    <View style={{ alignItems: 'center', marginHorizontal: scale(5) }}>
                        <Text style={{
                            color: black.main,
                            fontSize: scale(15),
                            textAlign: 'center',
                        }} selectable>{course_info.courseTitleEng}</Text>
                        {course_info.courseTitleChi.length > 0 && (
                            <Text style={{
                                color: black.second,
                                fontSize: scale(12),
                                textAlign: 'center',
                            }} selectable>
                                {course_info.courseTitleChi}
                            </Text>
                        )}
                        <Text style={{
                            color: black.second,
                            fontSize: scale(10),
                        }}>
                            {course_info.Offering_Unit}
                            {course_info.Offering_Department.length > 0 && (
                                ' - ' + course_info.Offering_Department
                            )}
                        </Text>
                        <Text style={{
                            color: black.third,
                            fontSize: scale(10),
                        }}>{course_info.Medium_of_Instruction}</Text>
                        {course_info.Credits != 0 && (
                            <Text style={{
                                color: black.third,
                                fontSize: scale(10),
                            }}>{course_info.Credits} Credit</Text>
                        )
                        }
                    </View>

                    {/* 授課教授選擇 */}
                    {isLoading ? (
                        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <Loading />
                        </View>
                    ) : (<View style={{ marginTop: scale(10), paddingHorizontal: scale(5) }}>
                        {prof_info.length > 0
                            ? this.renderProfList()
                            : <View style={{
                                margin: scale(10),
                                alignSelf: 'center'
                            }}>
                                <Text style={{ fontSize: scale(12), color: black.third }}>暫無授課教授</Text>
                            </View>
                        }
                    </View>)}

                    <View style={{ marginBottom: scale(50) }} />
                </ScrollView>
            </View>
        )
    }
}
