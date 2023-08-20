import React, { Component } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TextInput,
    TouchableOpacity,
    Platform,
    FlatList,
    KeyboardAvoidingView,
} from "react-native";

import { UMEH_URI, UMEH_API, WHAT_2_REG } from "../../../utils/pathMap";
import { COLOR_DIY } from '../../../utils/uiMap';
import offerCourses from '../../../static/UMCourses/offerCourses.json';
import coursePlan from '../../../static/UMCourses/coursePlan.json';
import Loading from '../../../components/Loading';

import { scale } from "react-native-size-matters";
import { Header } from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const { themeColor, black, white, viewShadow } = COLOR_DIY;

const coursePlanList = coursePlan.Courses;

export default class index extends Component {
    constructor(props) {
        super(props);
        this.state = {
        };
    }

    render() {
        return (
            <View style={{
                flex: 1,
                backgroundColor: COLOR_DIY.bg_color,
                alignItems: 'center',
                justifyContent: 'center'
            }}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    statusBarProps={{
                        backgroundColor: 'transparent',
                        barStyle: 'dark-content',
                    }}
                    containerStyle={{
                        // 修復頂部空白過多問題
                        height: Platform.select({
                            android: scale(38),
                            default: scale(35),
                        }),
                        paddingTop: 0,
                    }}
                />

                <ScrollView>
                    {/* 標題 */}
                    <View style={{ alignSelf: 'center', paddingVertical: scale(5), paddingHorizontal: scale(10) }}>
                        <Text style={{ fontSize: scale(18), color: themeColor, fontWeight: '600' }}>ARK課表模擬</Text>
                    </View>

                    

                </ScrollView>
            </View>
        );
    }
}
