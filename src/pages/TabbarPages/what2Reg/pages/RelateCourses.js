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

export default class RelateCourses extends Component {
    constructor(props) {
        super(props);
        this.state = {
            searchData: this.props.route.params,
            course_info: undefined,
            prof_info: undefined,
            isLoading: true,
        }
    }

    componentDidMount() {
        this.getData();
    }

    getData = async () => {
        const { inputText, type } = this.state.searchData;
        const GET_URI = UMEH_URI + UMEH_API.GET.FUZZY + inputText + '&type=' + type;

        try {
            const { data: res } = await axios.get(GET_URI);
            // 返回存在的課程
            if (type == 'course'
                && 'course_info' in res
                && typeof res.course_info == 'object'
            ) {
                this.setState({ course_info: res.course_info })
            }
            else if (type == 'prof'
                && 'prof_info' in res
                && typeof res.prof_info == 'object'
            ) {
                this.setState({ prof_info: res.prof_info })
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

    renderProfCard = (prof_info) => {
        return <FlatList
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
                            ReactNativeHapticFeedback.trigger('soft');
                            // 跳轉教授頁
                            this.props.navigation.navigate('What2RegProf', itm.name);
                        }}
                    >
                        <Text style={{
                            alignSelf: 'center',
                            color: black.main,
                            fontSize: scale(12),
                        }}>{itm.name}</Text>
                        {'courses' in itm && itm.courses.length > 0 && (
                            <View style={{ alignSelf: 'flex-end', flexDirection: 'row' }}>
                                <Text style={{ fontSize: scale(10), color: themeColor }}>{itm.courses.length}</Text>
                                <Text style={{ fontSize: scale(10), color: black.third }}> 節課</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                )
            }}
        />
    }

    renderContent = () => {
        const { course_info, prof_info } = this.state;
        const { type } = this.state.searchData;
        let renderItem = null;
        if (type == 'course') {
            if (course_info && course_info.length > 0) {
                let data = course_info;
                // 排序，開課的在前
                data = data.sort((a, b) => b.is_offered - a.is_offered);
                renderItem = <CourseCard data={data} mode={'what2Reg'} />
            } else {
                alert('找不到相關內容！換個關鍵字再試試吧~');
                this.props.navigation.goBack();
            }
        }
        else if (type == 'prof') {
            if (prof_info && prof_info.length > 0) {
                let data = prof_info;
                // 排序，課多的在前
                data = data.sort((a, b) => b.courses.length - a.courses.length);
                renderItem = this.renderProfCard(data);
            } else {
                alert('找不到相關內容！換個關鍵字再試試吧~');
                this.props.navigation.goBack();
            }
        }

        return renderItem;
    }

    render() {
        const { isLoading } = this.state;
        const { type } = this.state.searchData;
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={type === 'course' ? '相關課程' : '相關講師'} />

                {isLoading ? (
                    <View style={{ alignItems: 'center', justifyContent: 'center', flex: 1 }}>
                        <Loading />
                    </View>
                ) : (
                    <ScrollView>
                        {this.renderContent()}
                        <View style={{ marginBottom: scale(50) }} />
                    </ScrollView>
                )}
            </View>
        );
    }
}
