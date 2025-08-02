// 車位訊息
import React, { useState, useEffect, useCallback } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, ScrollView, RefreshControl, } from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../components/ThemeContext';
import Header from '../../components/Header';
import Loading from '../../components/Loading';
import { UM_API_CAR_PARK, UM_API_TOKEN } from '../../utils/pathMap';

import axios from 'axios';
import moment from 'moment-timezone';
import { scale } from 'react-native-size-matters';

const CarPark = () => {
    const { theme } = useTheme();
    const { black, white, themeColor, secondThemeColor, bg_color, viewShadow } = theme;
    const s = StyleSheet.create({
        UMText: {
            ...uiStyle.defaultText,
            alignSelf: 'center',
            color: black.third,
        },
        choiceText: {
            ...uiStyle.defaultText,
            fontWeight: 'bold',
            fontSize: scale(13),
        },
    });
    // 狀態管理
    const [data, setData] = useState([]);
    const [Sort, setSort] = useState('All');
    const [Type, setType] = useState('All');
    const [isLoading, setIsLoading] = useState(true);

    // 獲取數據
    const getData = useCallback(async () => {
        // 澳門時間，30分鐘前
        let macauTime = moment
            .tz(new Date(), 'Asia/Macau')
            .subtract(30, 'm')
            .format('YYYY-MM-DDTHH:mm:ss');
        try {
            const res = await axios.get(UM_API_CAR_PARK, {
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
                params: { date_from: macauTime },
            });
            let result = res.data._embedded;
            if (result.length >= 10) {
                let limitedData = [];
                // 只保留最新的5條
                for (let i = 0; i < 5; i++) {
                    limitedData.push(result[i]);
                }
                setData(limitedData);
                setIsLoading(false);
            }
        } catch (err) {
            console.error(err);
            setIsLoading(false);
        }
    }, []);

    // componentDidMount
    useEffect(() => {
        getData();
    }, [getData]);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <Header title={'車位訊息'} iOSDIY={true} />

            <ScrollView
                contentContainerStyle={{ paddingHorizontal: scale(10) }}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isLoading}
                        onRefresh={() => {
                            setIsLoading(true);
                            getData();
                        }}
                    />
                }>
                {!isLoading ? (
                    <View>
                        {/* Data From */}
                        <Text style={{ ...s.UMText, }}>Data from: data.um.edu.mo</Text>

                        {/* 渲染車位數據 */}
                        {data.length > 0 && (
                            <View>
                                {/* 更新時間 */}
                                <Text style={{
                                    ...s.UMText,
                                    marginBottom: scale(10),
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
                                    <TouchableOpacity onPress={() => setSort('All')}>
                                        <Text style={{
                                            ...s.choiceText,
                                            color: Sort === 'All' ? secondThemeColor : themeColor,
                                        }}>
                                            All
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setSort('Staff')}>
                                        <Text style={{
                                            ...s.choiceText,
                                            color: Sort === 'Staff' ? secondThemeColor : themeColor,
                                        }}>
                                            Staff
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setSort('Monthly Pass')}>
                                        <Text style={{
                                            ...s.choiceText,
                                            color: Sort === 'Monthly Pass' ? secondThemeColor : themeColor,
                                        }}>
                                            Monthly Pass
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setSort('Visitor')}>
                                        <Text style={{
                                            ...s.choiceText,
                                            color: Sort === 'Visitor' ? secondThemeColor : themeColor,
                                        }}>
                                            Visitor
                                        </Text>
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
                                    <TouchableOpacity onPress={() => setType('All')}>
                                        <Text style={{
                                            ...s.choiceText,
                                            color: Type === 'All' ? secondThemeColor : themeColor,
                                        }}>
                                            All
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setType('Light Vehicle')}>
                                        <Text style={{
                                            ...s.choiceText,
                                            color: Type === 'Light Vehicle' ? secondThemeColor : themeColor,
                                        }}>
                                            Light Vehicle
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => setType('Motorcycle')}>
                                        <Text style={{
                                            ...s.choiceText,
                                            color: Type === 'Motorcycle' ? secondThemeColor : themeColor,
                                        }}>
                                            Motorcycle
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {data.map((item, idx) => {
                                    let place;
                                    if (item.carParkCode === 'P6') {
                                        place = '地點：S1-S2 研究生宿舍 及 S8 薈萃坊';
                                    }
                                    if (item.carParkCode === 'P5') {
                                        place = '地點：E2 澳門大學伍宜孫圖書館 及 E3-E7中央教學樓';
                                    }
                                    if (item.carParkCode === 'P3') {
                                        place = '地點：N1 聚賢樓 及 N2 大學會堂';
                                    }
                                    if (item.carParkCode === 'P2') {
                                        place = '地點：N6 行政樓';
                                    }
                                    if (item.carParkCode === 'P1') {
                                        place = '地點：N8 澳大綜合體育館';
                                    }
                                    return (
                                        <View
                                            key={item.carParkCode + idx}
                                            style={{
                                                marginBottom: scale(30),
                                                backgroundColor: white,
                                                paddingBottom: scale(5),
                                                paddingTop: scale(10),
                                                borderRadius: scale(10),
                                                paddingLeft: scale(10),
                                                ...viewShadow,
                                            }}>
                                            <Text
                                                style={{
                                                    ...uiStyle.defaultText,
                                                    color: black.third,
                                                    marginLeft: scale(15),
                                                    fontSize: 35,
                                                    fontWeight: '900',
                                                }}>
                                                {item.carParkCode}
                                            </Text>
                                            <Text
                                                style={{
                                                    ...uiStyle.defaultText,
                                                    marginHorizontal: scale(12),
                                                    fontSize: 19,
                                                    marginVertical: scale(5),
                                                    fontWeight: '600',
                                                    color: black.third,
                                                }}>
                                                {place}
                                            </Text>
                                            {item.records.map((itm, i) => {
                                                var people = itm.parkingType;
                                                var cartype = itm.vehicleType;
                                                var rest = itm.noOfAvailableSpace;
                                                if (Sort === 'All' || people === Sort) {
                                                    if (Type === 'All' || cartype === Type)
                                                        return (
                                                            <View key={people + cartype + i}>
                                                                <Text
                                                                    style={{
                                                                        ...uiStyle.defaultText,
                                                                        paddingLeft: scale(13),
                                                                        color: themeColor,
                                                                        fontWeight: '900',
                                                                        fontSize: 20,
                                                                    }}>
                                                                    For {people}
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        ...uiStyle.defaultText,
                                                                        paddingLeft: scale(13),
                                                                        color: secondThemeColor,
                                                                        fontWeight: '500',
                                                                        fontSize: 18,
                                                                    }}>
                                                                    {cartype}
                                                                </Text>
                                                                <Text
                                                                    style={{
                                                                        ...uiStyle.defaultText,
                                                                        paddingLeft: scale(13),
                                                                        color: black.main,
                                                                        fontWeight: '400',
                                                                        fontSize: 18,
                                                                        paddingTop: scale(5),
                                                                        paddingBottom: scale(15),
                                                                    }}>
                                                                    剩餘車位：{rest} {rest <= 10 ? '  餘位緊張' : null}
                                                                </Text>
                                                            </View>
                                                        )
                                                }
                                                return null;
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
};

export default CarPark;