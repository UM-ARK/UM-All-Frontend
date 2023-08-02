import React, { Component } from 'react'
import {
    Text,
    View,
    TouchableOpacity,
    TextInput,
    ScrollView,
    StyleSheet
} from 'react-native'

import { UMEH_URI, UMEH_API } from "../../../../utils/pathMap";
import { COLOR_DIY } from '../../../../utils/uiMap';
import Header from '../../../../components/Header';

import axios from "axios";
import { scale } from 'react-native-size-matters';
import { AirbnbRating } from '@rneui/themed';
import qs from "qs";

const { themeColor, secondThemeColor, black, white, viewShadow } = COLOR_DIY;

export default class NewComment extends Component {
    state = {
        New_code: this.props.route.params.New_code,
        prof_name: this.props.route.params.prof_name,
        contentInput: '',
        // 5分制評分
        scoreInput: {
            grade: 3,
            attendance: 3,
            hard: 3,
            reward: 3,
            pre: 3,
            assignment: 3,
            recommend: 3,
        },

        scoreDescribe: {
            grade: [
                '亂比分',
                '比分差',
                '比分一般',
                '比分還好',
                '比分很好',
            ],
            attendance: [
                '每次簽到，主打一個陪伴',
                '較頻繁簽到',
                '有時簽到',
                '基本不簽到',
                '不需簽到',
            ],
            hard: [
                '過於困難，學不懂',
                '較有挑戰',
                '不難不簡單',
                '難度適合',
                '很簡單，Easy Pass',
            ],
            reward: [
                '浪費時間',
                '收穫較少',
                '收穫一般',
                '收穫較多',
                '收穫豐富',
            ],
            pre: [
                '非常多Present！！',
                '3次Present',
                '2次Present',
                '1次Present',
                '從不Present',
            ],
            assignment: [
                '每天/周都有功課！！',
                '常有功課',
                '功課一般多',
                '功課合理',
                '沒有功課',
            ],
            recommend: [
                '快跑！推薦勇者嘗試',
                '不太推薦',
                '中立推薦',
                '較推薦',
                '強烈推薦！！',
            ],
        },

        isLoading: false,
    }

    postData = async () => {
        this.setState({ isLoading: true })
        const { New_code, prof_name, contentInput, scoreInput } = this.state;
        let data = {};
        let URI = UMEH_URI + UMEH_API.POST.SUBMIT_COMMENT;
        data.New_code = New_code;
        data.prof_name = prof_name;
        data.content = contentInput;
        Object.assign(data, scoreInput);
        data = qs.stringify(data);

        if (true) {
            try {
                let res = await axios.post(URI, data,
                    {
                        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' }
                    }
                )
                if ('data' in res && res.data.code == '1') {
                    alert('新增評論成功！')
                    this.props.navigation.goBack();
                } else {
                    alert('評論失敗！發生未知錯誤！')
                }
            }
            catch (error) {
                if (error.code == 'ERR_NETWORK') {
                    alert('請檢查您當前的網絡環境是否正確');
                    this.props.navigation.goBack();
                } else {
                    console.log(error);
                    alert('新增評論失敗，請聯繫開發者')
                }
            }
            finally {
                this.setState({ isLoading: false })
            }
        }
        this.setState({ isLoading: false })

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
                size={scale(15)}
                selectedColor={color}
                showRating={false}
            />
        )
    }

    renderScore = () => {
        return (
            <>
                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>勇者挑戰</Text>
                    {this.renderScoreStar()}
                    <Text style={s.scoreTitle}>強烈推薦</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>比分差</Text>
                    {this.renderScoreStar()}
                    <Text style={s.scoreTitle}>比分好</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>簽到多</Text>
                    {this.renderScoreStar()}
                    <Text style={s.scoreTitle}>簽到少</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>困難</Text>
                    {this.renderScoreStar()}
                    <Text style={s.scoreTitle}>簡單</Text>
                </View>

                <View style={s.scoreContainer}>
                    <Text style={s.scoreTitle}>難以入腦</Text>
                    {this.renderScoreStar()}
                    <Text style={s.scoreTitle}>收穫很多</Text>
                </View>
            </>
        )
    }

    render() {
        const { New_code, prof_name, scoreInput, scoreDescribe, isLoading, contentInput } = this.state;
        let canSubmit = !isLoading && contentInput.length > 0;

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'新增評論'} />

                <ScrollView>
                    {/* 教授名和課程代號 */}
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ fontSize: scale(15), color: black.main, textAlign: 'center' }}>{prof_name}</Text>
                        <Text style={{ fontSize: scale(12), color: black.third, textAlign: 'center' }}>{New_code}</Text>
                    </View>

                    {/* 渲染評分星星選擇器 */}
                    {Object.keys(scoreInput).map(itm => {
                        let color = COLOR_DIY.unread;
                        const score = scoreInput[itm];
                        if (score > 4) {
                            color = COLOR_DIY.success;
                        } else if (score > 2) {
                            color = COLOR_DIY.warning;
                        }
                        return (
                            <AirbnbRating
                                size={scale(25)}
                                selectedColor={color}
                                reviewColor={color}
                                defaultRating={score}
                                reviews={scoreDescribe[itm]}
                                onFinishRating={(e) => {
                                    scoreInput[itm] = e;
                                    this.setState({ scoreInput })
                                }}
                                ratingContainerStyle={{
                                    marginBottom: scale(15),
                                    // backgroundColor: 'red'
                                }}
                                starContainerStyle={{
                                    // backgroundColor: 'blue',
                                    marginTop: scale(-10)
                                }}
                            />
                        )
                    })}

                    {/* 長文本評論 */}
                    <View style={{ marginBottom: scale(10) }}>
                        <TextInput
                            multiline
                            style={{
                                margin: scale(10), padding: scale(10),
                                borderWidth: scale(1), borderRadius: scale(10),
                                borderColor: themeColor,
                            }}
                            placeholder='留下您的評價：e.g. 非常不錯强烈推薦！'
                            placeholderTextColor={COLOR_DIY.unread}
                            value={this.state.contentInput}
                            onChangeText={text => {
                                this.setState({ contentInput: text })
                            }}
                        />
                    </View>

                    {/* 提交按鈕 */}
                    <TouchableOpacity
                        style={{
                            alignSelf: 'center',
                            backgroundColor: canSubmit ? themeColor : black.third,
                            padding: scale(10),
                            borderRadius: scale(10),
                        }}
                        onPress={this.postData}
                        disabled={!canSubmit}
                    >
                        <Text style={{ color: white, fontSize: scale(15) }}>提交</Text>
                    </TouchableOpacity>

                    <View style={{ marginBottom: scale(50) }} />
                </ScrollView>
            </View>
        )
    }
}

const s = StyleSheet.create({
    scoreTitle: {
        fontSize: scale(15),
        color: black.third,
        marginHorizontal: scale(3)
    },
    scoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: scale(5)
    }
})