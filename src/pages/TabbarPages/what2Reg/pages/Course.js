import React, { Component } from 'react'
import {
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    FlatList,
    Linking,
} from 'react-native'

import { COLOR_DIY } from '../../../../utils/uiMap';
import Header from '../../../../components/Header';
import Loading from '../../../../components/Loading';
import { UMEH_URI, UMEH_API, WHAT_2_REG } from "../../../../utils/pathMap";

import axios from 'axios';
import { scale } from "react-native-size-matters";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

export default class Course extends Component {
    state = {
        courseCode: this.props.route.params,
        course_info: undefined,
        prof_info: undefined,
        isLoading: true,
    }

    componentDidMount() {
        this.getData();
    }

    getData = async () => {
        const { courseCode } = this.state;
        const GET_URI = UMEH_URI + UMEH_API.GET.COURSE_INFO + courseCode;

        try {
            const { data: res } = await axios.get(GET_URI);
            // 返回存在的課程
            if ('course_info' in res && typeof res.course_info == 'object'
            ) {
                this.setState({
                    course_info: res.course_info,
                    prof_info: res.prof_info,
                })
            }
        } catch (error) {
            if (error.code == 'ERR_NETWORK') {
                alert('請檢查您當前的網絡環境是否正確');
                this.props.navigation.goBack();
            }
        } finally {
            this.setState({ isLoading: false })
        }
    }

    jumpToProf = (data) => {
        ReactNativeHapticFeedback.trigger('soft');
        const URI = WHAT_2_REG + '/reviews/' + encodeURIComponent(data.New_code) + '/' + encodeURIComponent(data.prof_name)
        Linking.openURL(URI);
    }

    // 渲染可選section
    renderSchedules = (schedulesArr) => {
        return (
            <FlatList
                data={schedulesArr}
                numColumns={schedulesArr.length}
                columnWrapperStyle={schedulesArr.length > 1 ? { flexWrap: 'wrap' } : null}
                contentContainerStyle={{ alignItems: 'center' }}
                style={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => {
                    return (
                        <View style={{
                            margin: scale(3),
                        }}>
                            <Text style={{
                                alignSelf: 'center',
                                fontSize: scale(9),
                                color: black.third
                            }}>
                                {itm.section}
                            </Text>
                        </View>
                    )
                }}
            />
        )
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
                                backgroundColor: white,
                                padding: scale(10),
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
                            {itm.offer_info.is_offer && 'schedules' in itm.offer_info ? (
                                <View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: scale(9), color: black.third }}>Section:</Text>
                                    {this.renderSchedules(itm.offer_info.schedules)}
                                </View>
                            ) : null}
                            {itm.num > 0 && (
                                <Text style={{
                                    fontSize: scale(10),
                                    color: itm.result >= 3.34 ? COLOR_DIY.success : COLOR_DIY.warning,
                                    alignSelf: 'center'
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
        const { course_info, prof_info, isLoading, courseCode } = this.state;

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={courseCode} />

                {isLoading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Loading />
                    </View>
                ) : (
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
                        <View style={{ marginTop: scale(10), paddingHorizontal: scale(5) }}>
                            {prof_info.length > 0
                                ? this.renderProfList()
                                : <View style={{
                                    margin: scale(10),
                                    alignSelf: 'center'
                                }}>
                                    <Text style={{ fontSize: scale(12), color: black.third }}>暫無授課教授</Text>
                                </View>
                            }
                        </View>

                        <View style={{ marginBottom: scale(50) }} />
                    </ScrollView>
                )}
            </View>
        )
    }
}
