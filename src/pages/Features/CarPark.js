// 車位訊息
import React, { Component } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    RefreshControl,
} from 'react-native';

// 引入本地工具
import { COLOR_DIY } from '../../utils/uiMap';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { UM_API_CAR_PARK, UM_API_TOKEN } from '../../utils/pathMap';

import axios from 'axios';
import moment from 'moment-timezone';
import { color } from 'react-native-reanimated';
import { scale } from 'react-native-size-matters';

const { black, white, themeColor, bg_color } = COLOR_DIY;

class CarPark extends Component {
    state = {
        data: [],
        Sort: 'All',
        Type: 'All',
        isLoading: true,
    };

    constructor() {
        super();
        // 獲取數據
        this.getData();
    }

    // 從澳大API獲取車位信息
    async getData() {
        // 澳門時間，10分鐘前
        let macauTime = moment
            .tz(new Date(), 'Asia/Macau')
            .subtract(30, 'm')
            .format('YYYY-MM-DDTHH:mm:ss');
        axios
            .get(UM_API_CAR_PARK, {
                // 請求頭配置
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
                params: { date_from: macauTime },
            })
            .then(res => {
                let result = res.data._embedded;
                if (result.length >= 10) {
                    let data = [];
                    // 有時會請求過多的數據，只保留最新的5條，已足夠是最新的5棟建築數據
                    for (let i = 0; i < 5; i++) {
                        data.push(result[i]);
                    }
                    this.setState({ data, isLoading: false });
                    // console.log('儲存的data為', this.state.data);
                }
            })
            .catch(err => {
                console.error(err);
            });
    }

    render() {
        const { data, Sort, Type, isLoading } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: bg_color }}>
                <Header title={'車位訊息'} />

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: scale(10) }}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={() => {
                                // 展示Loading標識
                                this.setState({ isLoading: true });
                                this.getData();
                            }}
                        />
                    }>
                    {!isLoading ? (
                        <View>
                            {/* Data From */}
                            <Text
                                style={{
                                    alignSelf: 'center',
                                    marginBottom: scale(10),
                                    color: black.third,
                                }}>
                                Data from: data.um.edu.mo
                            </Text>

                            {/* 渲染車位數據 */}
                            {data.length > 0 && (
                                <View>
                                    {/* 更新時間 */}
                                    <Text
                                        style={{
                                            alignSelf: 'center',
                                            marginBottom: scale(10),
                                            color: black.third,
                                            marginTop: scale(-5),
                                        }}>
                                        數據更新時間:
                                        {moment
                                            .tz(
                                                data[0].recordDate,
                                                'Asia/Macau',
                                            )
                                            .format('YYYY-MM-DD, HH:mm:ss')}
                                    </Text>

                                    {/* 提供对象筛选器 */}
                                    <View
                                        style={{
                                            width: '100%',
                                            height: scale(30),
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: scale(-10),
                                            paddingHorizontal: scale(10),
                                            justifyContent: 'space-between',
                                            zIndex: 9,
                                        }}>
                                        <TouchableOpacity
                                            onPress={() =>
                                                this.setState({ Sort: 'All' })
                                            }>
                                            {Sort == 'All' ? (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: '#FF8627',
                                                    }}>
                                                    All
                                                </Text>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: COLOR_DIY.themeColor,
                                                    }}>
                                                    All
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                this.setState({ Sort: 'Staff' })
                                            }>
                                            {Sort == 'Staff' ? (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: '#FF8627',
                                                    }}>
                                                    Staff
                                                </Text>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: COLOR_DIY.themeColor,
                                                    }}>
                                                    Staff
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                this.setState({
                                                    Sort: 'Monthly Pass',
                                                })
                                            }>
                                            {Sort == 'Monthly Pass' ? (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: '#FF8627',
                                                    }}>
                                                    Monthly Pass
                                                </Text>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: COLOR_DIY.themeColor,
                                                    }}>
                                                    Monthly Pass
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                this.setState({ Sort: 'Visitor' })
                                            }>
                                            {Sort == 'Visitor' ? (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: '#FF8627',
                                                    }}>
                                                    Visitor
                                                </Text>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: COLOR_DIY.themeColor,
                                                    }}>
                                                    Visitor
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                    {/* 车辆类型筛选器 */}
                                    <View
                                        style={{
                                            width: '100%',
                                            height: scale(30),
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            marginTop: scale(-10),
                                            justifyContent: 'space-around',
                                            zIndex: 9,
                                        }}>
                                        <TouchableOpacity
                                            onPress={() =>
                                                this.setState({ Type: 'All' })
                                            }>
                                            {Type == 'All' ? (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: '#FF8627',
                                                    }}>
                                                    All
                                                </Text>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: COLOR_DIY.themeColor,
                                                    }}>
                                                    All
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                this.setState({
                                                    Type: 'Light Vehicle',
                                                })
                                            }>
                                            {Type == 'Light Vehicle' ? (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: '#FF8627',
                                                    }}>
                                                    Light Vehicle
                                                </Text>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: COLOR_DIY.themeColor,
                                                    }}>
                                                    Light Vehicle
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() =>
                                                this.setState({
                                                    Type: 'Motorcycle',
                                                })
                                            }>
                                            {Type == 'Motorcycle' ? (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: '#FF8627',
                                                    }}>
                                                    Motorcycle
                                                </Text>
                                            ) : (
                                                <Text
                                                    style={{
                                                        fontWeight: 'bold',
                                                        fontSize: scale(13),
                                                        color: COLOR_DIY.themeColor,
                                                    }}>
                                                    Motorcycle
                                                </Text>
                                            )}
                                        </TouchableOpacity>
                                    </View>

                                    {data.map(item => {
                                        var place;
                                        if (item.carParkCode == 'P6') {
                                            place =
                                                '地點：S1-S2 研究生宿舍 及 S8 薈萃坊';
                                        }
                                        if (item.carParkCode == 'P5') {
                                            place =
                                                '地點：E2 澳門大學伍宜孫圖書館 及 E3-E7中央教學樓';
                                        }
                                        if (item.carParkCode == 'P3') {
                                            place =
                                                '地點：N1 聚賢樓 及 N2 大學會堂';
                                        }
                                        if (item.carParkCode == 'P2') {
                                            place = '地點：N6 行政樓';
                                        }
                                        if (item.carParkCode == 'P1') {
                                            place = '地點：N8 澳大綜合體育館';
                                        }
                                        return (
                                            <View
                                                style={{
                                                    marginBottom: scale(30),
                                                    backgroundColor: 'white',
                                                    paddingBottom: scale(5),
                                                    paddingTop: scale(10),
                                                    borderRadius: scale(10),
                                                    paddingLeft: scale(10),
                                                    ...COLOR_DIY.viewShadow,
                                                }}>
                                                <Text
                                                    style={{
                                                        color: black.third,
                                                        marginLeft: scale(15),
                                                        fontSize: 35,
                                                        fontWeight: '900',
                                                    }}>
                                                    {item.carParkCode}
                                                </Text>
                                                <Text
                                                    style={{
                                                        marginHorizontal: scale(12),
                                                        fontSize: 19,
                                                        marginVertical: scale(5),
                                                        fontWeight: '600',
                                                        color: black.third,
                                                    }}>
                                                    {place}
                                                </Text>
                                                {item.records.map(itm => {
                                                    // console.log('itm', itm);
                                                    var people =
                                                        itm.parkingType;
                                                    var cartype =
                                                        itm.vehicleType;
                                                    var rest =
                                                        itm.noOfAvailableSpace;
                                                    if (
                                                        Sort == 'All' ||
                                                        people == Sort
                                                    ) {
                                                        if (
                                                            Type == 'All' ||
                                                            cartype == Type
                                                        )
                                                            if (rest >= 10) {
                                                                return (
                                                                    <View>
                                                                        <Text
                                                                            style={{
                                                                                paddingLeft:
                                                                                    scale(
                                                                                        13,
                                                                                    ),
                                                                                color: COLOR_DIY.themeColor,
                                                                                fontWeight:
                                                                                    '900',
                                                                                fontSize: 20,
                                                                            }}>
                                                                            For{' '}
                                                                            {
                                                                                people
                                                                            }
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                paddingLeft:
                                                                                    scale(
                                                                                        13,
                                                                                    ),
                                                                                color: '#FF8627',
                                                                                fontWeight:
                                                                                    '500',
                                                                                fontSize: 18,
                                                                            }}>
                                                                            {
                                                                                cartype
                                                                            }
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                paddingLeft:
                                                                                    scale(
                                                                                        13,
                                                                                    ),
                                                                                color: 'black',
                                                                                fontWeight:
                                                                                    '400',
                                                                                fontSize: 18,
                                                                                paddingTop:
                                                                                    scale(
                                                                                        5,
                                                                                    ),
                                                                                paddingBottom:
                                                                                    scale(
                                                                                        15,
                                                                                    ),
                                                                            }}>
                                                                            剩餘車位：
                                                                            {
                                                                                rest
                                                                            }
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            } else {
                                                                return (
                                                                    <View>
                                                                        <Text
                                                                            style={{
                                                                                paddingLeft:
                                                                                    scale(
                                                                                        13,
                                                                                    ),
                                                                                color: COLOR_DIY.themeColor,
                                                                                fontWeight:
                                                                                    '900',
                                                                                fontSize: 20,
                                                                            }}>
                                                                            For{' '}
                                                                            {
                                                                                people
                                                                            }
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                paddingLeft:
                                                                                    scale(
                                                                                        13,
                                                                                    ),
                                                                                color: '#FF8627',
                                                                                fontWeight:
                                                                                    '500',
                                                                                fontSize: 18,
                                                                            }}>
                                                                            {
                                                                                cartype
                                                                            }
                                                                        </Text>
                                                                        <Text
                                                                            style={{
                                                                                paddingLeft:
                                                                                    scale(
                                                                                        13,
                                                                                    ),
                                                                                color: 'red',
                                                                                fontWeight:
                                                                                    '400',
                                                                                fontSize: 18,
                                                                                marginTop:
                                                                                    scale(
                                                                                        5,
                                                                                    ),
                                                                                paddingBottom:
                                                                                    scale(
                                                                                        15,
                                                                                    ),
                                                                            }}>
                                                                            剩餘車位：
                                                                            {
                                                                                rest
                                                                            }{' '}
                                                                            餘位緊張
                                                                        </Text>
                                                                    </View>
                                                                );
                                                            }
                                                    }
                                                })}
                                            </View>
                                        );
                                    })}
                                </View>
                            )}
                        </View>
                    ) : (
                        <View
                            style={{
                                flex: 1,
                                backgroundColor: bg_color,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                            <Loading />
                        </View>
                    )}
                    <View style={{ marginBottom: scale(50) }}></View>
                </ScrollView>
            </View>
        );
    }
}

export default CarPark;
