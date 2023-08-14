import React, { Component, createRef } from 'react'
import {
    Text, View,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    FlatList,
    TouchableWithoutFeedback,
} from 'react-native'

import { UMEH_URI, UMEH_API } from "../../../../utils/pathMap";
import { COLOR_DIY } from '../../../../utils/uiMap';
import Header from '../../../../components/Header';
import Loading from '../../../../components/Loading';

import axios from "axios";
import { scale } from 'react-native-size-matters';
import Interactable from 'react-native-interactable';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AirbnbRating } from '@rneui/themed';

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

export default class Comment extends Component {
    constructor(props) {
        super(props);
        this.state = {
            res: this.props.route.params,
            isLoading: true
        }

        this.scrollViewRef = createRef(null);
    }

    componentDidMount() {
        const { res } = this.state;
        // this.getData(res);

        // 監聽畫面聚焦，第一次加載時也會執行
        this.focusSubscription = this.props.navigation.addListener('focus', () => {
            // console.log('刷新Comment.js');
            this.getData(res);
        });
    }

    componentWillUnmount() {
        this.focusSubscription();
    }

    getData = async (data) => {
        this.setState({ isLoading: true })
        const URI = UMEH_API.GET.COURSE_COMMENT;
        const GET_URI = UMEH_URI + URI.CODE + data.New_code + URI.PROF + data.prof_name;
        try {
            const { data: res } = await axios.get(GET_URI);
            // 返回存在的課程
            if ('course_info' in res && typeof res.course_info == 'object') {
                this.setState({ res })
            } else {
                alert('頁面不存在或出現錯誤')
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

    jumpToSearchProf = async (name) => {
        ReactNativeHapticFeedback.trigger('soft');
        this.props.navigation.navigate('What2RegRelateCourses', { inputText: name, type: 'prof' });
    }

    renderSchedules = (schedulesArr) => {
        return (
            <FlatList
                data={schedulesArr}
                numColumns={schedulesArr.length}
                columnWrapperStyle={schedulesArr.length > 1 ? { flexWrap: 'wrap' } : null}
                contentContainerStyle={{ alignItems: 'center' }}
                // style={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => {
                    return (
                        <View style={{
                            backgroundColor: white,
                            borderRadius: scale(10),
                            margin: scale(5),
                            padding: scale(5)
                        }}>
                            <Text style={{
                                alignSelf: 'center',
                                fontSize: scale(11),
                                color: black.third
                            }}>
                                {itm.section}
                            </Text>
                            {itm.schedules.map((sectionInfo) => {
                                if (sectionInfo.date != '') {
                                    return <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                        <Text style={{
                                            marginRight: scale(3),
                                            fontSize: scale(10),
                                            color: black.third
                                        }}>{sectionInfo.date}</Text>
                                        <Text style={{
                                            fontSize: scale(10),
                                            color: black.third
                                        }}>{sectionInfo.time}</Text>
                                    </View>
                                }
                            })}
                        </View>
                    )
                }}
            />
        )
    }

    renderComments = (commentsArr) => {
        return (
            <FlatList
                data={commentsArr}
                numColumns={commentsArr.length}
                columnWrapperStyle={commentsArr.length > 1 ? { flexWrap: 'wrap' } : null}
                contentContainerStyle={{ alignItems: 'center' }}
                renderItem={({ item: itm }) => {
                    const {
                        // 具體評價
                        content,
                        // 評分項
                        grade,
                        attendance,
                        hard,
                        reward,
                        assignment,
                        pre,
                        recommend,
                        // 發佈時間
                        pub_time,

                        // 點贊
                        upvote,
                        downvote,

                        // id:25403為選咩課小程序特供評論
                        id,
                    } = itm;
                    if (id != 25403 && id != 27062) {
                        return (
                            <View style={{
                                margin: scale(5),
                                padding: scale(10),
                                borderRadius: scale(10),
                                backgroundColor: white,
                            }}
                            >
                                {content.length > 0 ? (
                                    <Text style={{
                                        fontSize: scale(12),
                                        color: black.second
                                    }}>{content}</Text>
                                ) : (
                                    <Text style={{ color: COLOR_DIY.unread, fontSize: scale(12) }}>沒有評價</Text>
                                )}

                                {/* 評論時間 */}
                                <View style={{ alignSelf: 'flex-end' }}>
                                    <Text style={{
                                        fontSize: scale(10),
                                        color: black.third
                                    }}>{pub_time}</Text>
                                </View>
                            </View>
                        )
                    }
                }}
            />
        )
    }

    renderScoreStar = (score) => {
        let color = themeColor;
        if (score >= 3.5) {
            color = COLOR_DIY.success;
        } else if (score >= 1.67) {
            color = COLOR_DIY.warning;
        } else {
            color = COLOR_DIY.unread;
        }
        return (
            <AirbnbRating
                defaultRating={score}
                size={scale(10)}
                isDisabled={true}
                selectedColor={color}
                showRating={false}
            />
        )
    }

    renderScore = () => {
        const {
            name,
            result,
            grade,
            attendance,
            hard,
            reward,
            num,
            offer_info
        } = this.state.res.prof_info;
        return (
            <>
                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>勇者挑戰</Text>
                    {this.renderScoreStar(result)}
                    <Text style={s.scoreTitle}>強烈推薦</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>比分差</Text>
                    {this.renderScoreStar(grade)}
                    <Text style={s.scoreTitle}>比分好</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>簽到多</Text>
                    {this.renderScoreStar(attendance)}
                    <Text style={s.scoreTitle}>簽到少</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>困難</Text>
                    {this.renderScoreStar(hard)}
                    <Text style={s.scoreTitle}>簡單</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>難以入腦</Text>
                    {this.renderScoreStar(reward)}
                    <Text style={s.scoreTitle}>收穫很多</Text>
                </View>

                <Text style={{
                    fontSize: scale(10),
                    color: black.third
                }}>評價總數: {num}</Text>
            </>
        )
    }

    // 渲染懸浮可拖動按鈕
    renderGoTopButton = () => {
        const buttonSize = scale(50);
        return (
            <Interactable.View
                style={{
                    zIndex: 999,
                    position: 'absolute',
                }}
                ref="headInstance"
                // 設定所有可吸附的屏幕位置 0,0為屏幕中心
                snapPoints={[
                    { x: -scale(140), y: -scale(220) },
                    { x: scale(140), y: -scale(220) },
                    { x: -scale(140), y: -scale(120) },
                    { x: scale(140), y: -scale(120) },
                    { x: -scale(140), y: scale(0) },
                    { x: scale(140), y: scale(0) },
                    { x: -scale(140), y: scale(120) },
                    { x: scale(140), y: scale(120) },
                    { x: -scale(140), y: scale(220) },
                    { x: scale(140), y: scale(220) },
                ]}
                // 設定初始吸附位置
                initialPosition={{ x: scale(140), y: scale(220) }}>
                {/* 懸浮吸附按鈕，回頂箭頭 */}
                <TouchableWithoutFeedback
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.scrollViewRef.current.scrollTo({
                            x: 0,
                            y: 0,
                            duration: 500, // 回頂時間
                        });
                    }}>
                    <View
                        style={{
                            width: buttonSize, height: buttonSize,
                            backgroundColor: white,
                            borderRadius: scale(50),
                            justifyContent: 'center',
                            alignItems: 'center',
                            ...viewShadow,
                        }}>
                        <Ionicons
                            name={'chevron-up'}
                            size={scale(40)}
                            color={themeColor}
                        />
                    </View>
                </TouchableWithoutFeedback>
            </Interactable.View>
        );
    };

    render() {
        const { res, isLoading } = this.state;
        const {
            name,
            num,
            offer_info
        } = res.prof_info;

        let comments = [];
        if ('comments' in res) {
            comments = res.comments;
            // 排序，最多赞排前面
            comments = comments.sort((a, b) => b.pub_time - a.pub_time);
        }

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color, alignItems: 'center', justifyContent: 'center' }}>
                <Header title={'評論詳情'} />

                {isLoading ? null : this.renderGoTopButton()}

                {isLoading ? (
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <Loading />
                    </View>
                ) : (
                    <ScrollView ref={this.scrollViewRef} >
                        {/* 教授基本信息 */}
                        <View style={{
                            marginHorizontal: scale(5),
                            borderRadius: scale(10),
                            alignItems: 'center'
                        }}>
                            <Text style={{
                                fontSize: scale(15),
                                color: black.main,
                                textAlign: 'center',
                            }} selectable >
                                {'course_info' in res ? res.course_info.New_code : res.New_code}
                            </Text>
                            <Text style={{
                                fontSize: scale(15),
                                color: black.main,
                                textAlign: 'center',
                            }} selectable >
                                {name}
                            </Text>
                            {/* 搵講師按鈕 */}
                            <TouchableOpacity
                                style={{
                                    borderWidth: scale(1), borderColor: themeColor, borderRadius: scale(10),
                                    paddingHorizontal: scale(5), paddingVertical: scale(2),
                                }}
                                onPress={() => this.jumpToSearchProf(name)}
                            >
                                <Text style={{ fontSize: scale(11), color: themeColor }}>☝️搵講師</Text>
                            </TouchableOpacity>
                            {/* 評價數不等於0，渲染評分 */}
                            {num != 0 && (
                                <View style={{ marginTop: scale(5), alignItems: 'center' }}>
                                    {this.renderScore()}
                                </View>
                            )}
                        </View>

                        {/* 教授開課則有可選日期 */}
                        {offer_info.is_offer && 'schedules' in offer_info ? (
                            <View style={{ marginTop: scale(5), marginHorizontal: scale(5) }}>
                                {this.renderSchedules(offer_info.schedules)}
                            </View>
                        ) : null}

                        {/* 新增評論按鈕 */}
                        <TouchableOpacity
                            style={{
                                marginTop: scale(5),
                                marginHorizontal: scale(100),
                                backgroundColor: themeColor,
                                borderRadius: scale(10),
                                padding: scale(10),
                                alignItems: 'center'
                            }}
                            onPress={() => {
                                let data = {
                                    New_code: 'course_info' in res ? res.course_info.New_code : res.New_code,
                                    prof_name: res.prof_info.name,
                                }
                                this.props.navigation.navigate('What2RegNewComment', data)
                                ReactNativeHapticFeedback.trigger('soft');
                            }}
                        >
                            <Text style={{ color: white }}>新增評論</Text>
                        </TouchableOpacity>

                        {/* 評論列表 */}
                        <View style={{
                            marginTop: scale(5),
                            marginHorizontal: scale(5)
                        }}>
                            {comments.length > 0 ?
                                (this.renderComments(comments)) :
                                (<View style={{ alignItems: 'center' }}>
                                    <Text style={{ fontSize: scale(12), color: black.third }}>
                                        等你寫下第一條評論~
                                    </Text>
                                </View>)}
                        </View>

                        <View style={{ marginBottom: scale(50) }} />
                    </ScrollView>
                )}
            </View>
        )
    }
}

const s = StyleSheet.create({
    scoreTitle: {
        fontSize: scale(10),
        color: black.third
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    }
})