// 停車訊息，https://data.um.edu.mo/api-documents/facilities/car-park-availability/
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    StyleSheet,
    Image,
    ScrollView,
} from 'react-native';

// 引入本地工具
import {pxToDp} from '../../utils/stylesKits';
import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {UM_API_CAR_PARK} from '../../utils/pathMap';

import axios from 'axios';
import moment from 'moment-timezone';

const {black, white, themeColor, bg_color} = COLOR_DIY;

class CarPark extends Component {
    state = {
        data: [],
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
                    // 有時會請求過多的數據，只保留最新的10條，已足夠是最新的10棟建築數據
                    for (let i = 0; i < 10; i++) {
                        data.push(result[i]);
                    }
                    this.setState({data});
                    console.log('儲存的data為', this.state.data);
                }
            })
            .catch(err => {
                console.error(err);
            });
    }

    render() {
        const {data} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                <Header title={'車位訊息'} />

                <ScrollView
                    contentContainerStyle={{paddingHorizontal: pxToDp(10)}}>
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
                            <Text>
                                數據更新時間:
                                {moment
                                    .tz(data[0].recordDate, 'Asia/Macau')
                                    .format('YYYY-MM-DD, HH:mm:ss')}
                            </Text>

                            {data.map(item => {
                                return (
                                    <View
                                        style={{
                                            marginBottom: pxToDp(30),
                                        }}>
                                        <Text
                                            style={{
                                                color: COLOR_DIY.black.main,
                                            }}>
                                            {item.carParkCode}
                                        </Text>
                                        {item.records.map(itm => {
                                            console.log('itm', itm);
                                            return (
                                                <View
                                                    style={{
                                                        marginBottom:
                                                            pxToDp(10),
                                                    }}>
                                                    {/* TODO: 漢化 */}
                                                    <Text>
                                                        {'提供對象: ' +
                                                            itm.parkingType}
                                                    </Text>
                                                    <Text>
                                                        {'車類型: ' +
                                                            itm.vehicleType}
                                                    </Text>
                                                    <Text>
                                                        {'該車型可用車位: ' +
                                                            itm.noOfAvailableSpace}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>
                                );
                            })}
                        </View>
                    )}
                    <View style={{marginBottom: pxToDp(50)}}></View>
                </ScrollView>
            </View>
        );
    }
}

export default CarPark;
