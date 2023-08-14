import React, { Component } from 'react'
import {
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    FlatList,
} from 'react-native'

import { COLOR_DIY } from '../../../../utils/uiMap';
import Header from '../../../../components/Header';
import Loading from '../../../../components/Loading';
import { UMEH_URI, UMEH_API } from "../../../../utils/pathMap";
import CourseCard from "../component/CourseCard";

import { scale } from "react-native-size-matters";
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import axios from 'axios';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

export default class Prof extends Component {
    constructor(props) {
        super(props);
        this.state = {
            isLoading: true,
            prof_name: this.props.route.params,
            prof_info: null,
            course_info: null,
        };
    }

    componentDidMount() {
        this.getData(this.state.prof_name);
    }

    getData = async (name) => {
        const GET_URI = UMEH_URI + UMEH_API.GET.PROF + name;
        try {
            const { data: res } = await axios.get(GET_URI);
            // 返回該講師負責的課程
            let course_info = res.course.map((itm) => itm.course_info)
            // 排序，開課的在前
            course_info = course_info.sort((a, b) => b.is_offered - a.is_offered);
            this.setState({ course_info, prof_info: res.course[0].prof_info })
        } catch (error) {
            if (error.code == 'ERR_NETWORK') {
                alert('請檢查您當前的網絡環境是否正確');
                this.props.navigation.goBack();
            }
        } finally {
            this.setState({ isLoading: false })
        }
    }

    render() {
        const { isLoading, prof_name, course_info } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'講師'} />

                {isLoading ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                        <Loading />
                    </View>
                ) : (
                    <ScrollView>
                        {/* 教授姓名 */}
                        <View style={{ alignItems: 'center', justifyContent: 'center', marginHorizontal: scale(5) }}>
                            <Text style={{ fontSize: scale(18), color: black.main, textAlign: 'center' }}>{prof_name}</Text>
                        </View>
                        {/* 渲染負責授課課程 */}
                        {course_info
                            && course_info.length > 0
                            && <CourseCard data={course_info} mode={'what2Reg'} prof_info={this.state.prof_info} />
                        }

                        <View style={{ marginBottom: scale(50) }} />
                    </ScrollView>
                )}
            </View>
        );
    }
}
