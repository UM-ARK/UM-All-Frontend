// 停車訊息，https://data.um.edu.mo/api-documents/facilities/car-park-availability/
import React, { Component } from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
    RefreshControl
} from 'react-native';

// 引入本地工具
import { pxToDp } from '../../utils/stylesKits';
import { COLOR_DIY } from '../../utils/uiMap';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import {UM_API_CAR_PARK} from '../../utils/pathMap';

import axios from 'axios';
import moment from 'moment-timezone';
import { color } from 'react-native-reanimated';

const { black, white, themeColor, bg_color } = COLOR_DIY;

class CarPark extends Component {
    state = {
        data: [],
        Sort: "All",
        Type: "All",
        isLoading: true,
    };

    constructor() {
        super();
        // 獲取數據
        this.getData();
    }

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
                    Authorization:
                        'Bearer c9b17308-8579-3672-8a0d-beb483b794bf',
                },
                params: {
                    date_from: macauTime,
                    // TODO: 篩選特定車類型、停車場
                    // car_park_code: '',
                    // vehicle_type: '',
                    // parking_type: '',
                },
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
                    console.log('儲存的data為', this.state.data);
                }
            })
            .catch(err => {
                console.error(err);
            });
    }

    onRefresh = () => {
        this.setState({ refreshing: true });
        this.props.pageFreshen()
            .then(() => {
                this.setState({ refreshing: false });
            });
    }

    render() {
        const { data, Sort, Type, isLoading } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: bg_color }}>
                <Header title={'車位訊息'} />

                <ScrollView
                    contentContainerStyle={{ paddingHorizontal: pxToDp(10) }}
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
                    <Text
                        style={{
                            alignSelf: 'center',
                            marginBottom: pxToDp(10),
                            color: black.third,
                        }}>
                        Data from: data.um.edu.mo
                    </Text>
                    {data.length > 0 && (
                        <View>
                            {/* TODO: 根據API的返回，展示相關數據 */}
                            <Text style={{
                                alignSelf: 'center',
                                marginBottom: pxToDp(10),
                                color: black.third,
                                marginTop: pxToDp(-5),
                            }}>
                                數據更新時間:
                                {moment
                                    .tz(data[0].recordDate, 'Asia/Macau')
                                    .format('YYYY-MM-DD, HH:mm:ss')}
                            </Text>
                            {/* 提供对象筛选器 */}
                            <View
                                style={{
                                    width: '100%',
                                    height: pxToDp(30),
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginTop: pxToDp(-10),
                                    justifyContent: 'space-around',
                                    zIndex: 9,
                                }}>
                                <TouchableOpacity
                                    onPress={() => this.setState({ Sort: "All" })
                                    }>
                                    {Sort == "All" ? (
                                        <Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: '#FF8627',
                                            }}>
                                            All
                                        </Text>) : (<Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: COLOR_DIY.themeColor,
                                            }}>
                                            All
                                        </Text>)}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => this.setState({ Sort: "Staff" })
                                    }>
                                    {Sort == "Staff" ? (
                                        <Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: '#FF8627',
                                            }}>
                                            Staff
                                        </Text>) : (<Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: COLOR_DIY.themeColor,
                                            }}>
                                            Staff
                                        </Text>)}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => this.setState({ Sort: "Monthly Pass" })
                                    }>
                                    {Sort == "Monthly Pass" ? (
                                        <Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: '#FF8627',
                                            }}>
                                            Monthly Pass
                                        </Text>) : (<Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: COLOR_DIY.themeColor,
                                            }}>
                                            Monthly Pass
                                        </Text>)}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => this.setState({ Sort: "Visitor" })
                                    }>
                                    {Sort == "Visitor" ? (
                                        <Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: '#FF8627',
                                            }}>
                                            Visitor
                                        </Text>) : (<Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: COLOR_DIY.themeColor,
                                            }}>
                                            Visitor
                                        </Text>)}
                                </TouchableOpacity>
                            </View>
                            {/* 车辆类型筛选器 */}
                            <View
                                style={{
                                    width: '100%',
                                    height: pxToDp(30),
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginTop: pxToDp(-10),
                                    justifyContent: 'space-around',
                                    zIndex: 9,
                                }}>
                                <TouchableOpacity
                                    onPress={() => this.setState({ Type: "All" })
                                    }>
                                    {Type == "All" ? (
                                        <Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: '#FF8627',
                                            }}>
                                            All
                                        </Text>) : (<Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: COLOR_DIY.themeColor,
                                            }}>
                                            All
                                        </Text>)}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => this.setState({ Type: "Light Vehicle" })
                                    }>
                                    {Type == "Light Vehicle" ? (
                                        <Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: '#FF8627',
                                            }}>
                                            Light Vehicle
                                        </Text>) : (<Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: COLOR_DIY.themeColor,
                                            }}>
                                            Light Vehicle
                                        </Text>)}
                                </TouchableOpacity>
                                <TouchableOpacity
                                    onPress={() => this.setState({ Type: "Motorcycle" })
                                    }>
                                    {Type == "Motorcycle" ? (
                                        <Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: '#FF8627',
                                            }}>
                                            Motorcycle
                                        </Text>) : (<Text
                                            style={{
                                                fontWeight: 'bold',
                                                fontSize: pxToDp(13),
                                                color: COLOR_DIY.themeColor,
                                            }}>
                                            Motorcycle
                                        </Text>)}
                                </TouchableOpacity>
                            </View>
                            {data.map(item => {
                                var place;
                                if (item.carParkCode == "P6") {
                                    place = "地點：S1-S2 研究生宿舍 及 S8 薈萃坊"
                                }
                                if (item.carParkCode == "P5") {
                                    place = "地點：E2 澳門大學伍宜孫圖書館 及 E3-E7中央教學樓"
                                }
                                if (item.carParkCode == "P3") {
                                    place = "地點：N1 聚賢樓 及 N2 大學會堂"
                                }
                                if (item.carParkCode == "P2") {
                                    place = "地點：N6 行政樓"
                                }
                                if (item.carParkCode == "P1") {
                                    place = "地點：N8 澳大綜合體育館"
                                }
                                return (
                                    <View
                                        style={{
                                            marginBottom: pxToDp(30),
                                            backgroundColor: 'white',
                                            paddingBottom: pxToDp(5),
                                            paddingTop: pxToDp(10),
                                            borderRadius: pxToDp(10),
                                            paddingLeft: pxToDp(10),
                                            ...COLOR_DIY.viewShadow,
                                        }}>
                                        <Text
                                            style={{
                                                color: black.third,
                                                paddingLeft: pxToDp(23),
                                                fontSize: 35,
                                                fontWeight: '900',
                                            }}>
                                            {item.carParkCode}
                                        </Text>
                                        <Text style={{
                                            paddingHorizontal: pxToDp(13),
                                            fontSize:19,
                                            paddingVertical:pxToDp(5),
                                            fontWeight:'600',
                                            color: black.third,
                                        }}>
                                            {place}
                                        </Text>
                                        {item.records.map(itm => {
                                            console.log('itm', itm);
                                            var people = itm.parkingType;
                                            var cartype = itm.vehicleType;
                                            var rest = itm.noOfAvailableSpace;
                                            if (Sort == "All" || people == Sort) {
                                                if (Type == "All" || cartype == Type)
                                                    if (rest >= 10) {
                                                        return (
                                                            <View>
                                                                <Text style={{
                                                                    paddingLeft: pxToDp(13),
                                                                    color: COLOR_DIY.themeColor,
                                                                    fontWeight: '900',
                                                                    fontSize: 20
                                                                }}>For {people}</Text>
                                                                <Text style={{
                                                                    paddingLeft: pxToDp(13),
                                                                    color: '#FF8627',
                                                                    fontWeight: '500',
                                                                    fontSize: 18,
                                                                }}>{cartype}</Text>
                                                                <Text style={{
                                                                    paddingLeft: pxToDp(13),
                                                                    color: 'black',
                                                                    fontWeight: '400',
                                                                    fontSize: 18,
                                                                    paddingTop: pxToDp(5),
                                                                    paddingBottom: pxToDp(15),
                                                                }}>剩餘車位：{rest}</Text>
                                                            </View>
                                                        );
                                                    }
                                                    else {
                                                        return (
                                                            <View>
                                                                <Text style={{
                                                                    paddingLeft: pxToDp(13),
                                                                    color: COLOR_DIY.themeColor,
                                                                    fontWeight: '900',
                                                                    fontSize: 20
                                                                }}>For {people}</Text>
                                                                <Text style={{
                                                                    paddingLeft: pxToDp(13),
                                                                    color: '#FF8627',
                                                                    fontWeight: '500',
                                                                    fontSize: 18,
                                                                }}>{cartype}</Text>
                                                                <Text style={{
                                                                    paddingLeft: pxToDp(13),
                                                                    color: 'red',
                                                                    fontWeight: '400',
                                                                    fontSize: 18,
                                                                    marginTop: pxToDp(5),
                                                                    paddingBottom: pxToDp(15),
                                                                }}>剩餘車位：{rest}  餘位緊張</Text>
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
                    <View style={{ marginBottom: pxToDp(50) }}></View>
                </ScrollView>
            </View>
        );
    }
}

export default CarPark;
