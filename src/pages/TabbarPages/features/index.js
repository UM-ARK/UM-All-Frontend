import React, {Component} from 'react';
import {ScrollView, Text, View, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import {FlatGrid} from 'react-native-super-grid';

const iconTypes = {
    ionicons: 'ionicons',
    materialCommunityIcons: 'MaterialCommunityIcons',
};

class Index extends Component {
    state = {
        functionArr: [
            {
                title: '校园服务',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bus-stop',
                        fn_name: '校园巴士',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'calendar-today',
                        fn_name: '校曆',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'map',
                        fn_name: '校園地圖',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'car-brake-parking',
                        fn_name: '車位',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.ionicons,
                        icon_name: 'logo-dropbox',
                        fn_name: '資源借用',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'console-network',
                        fn_name: '電腦預約',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'door-closed-lock',
                        fn_name: '儲物箱',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'hammer-wrench',
                        fn_name: '維修預約',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'printer-check',
                        fn_name: '打印',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'basketball',
                        fn_name: '體育預訂',
                        go_where: '', // a function
                    },
                ],
            },
            {
                title: '生活小幫手',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'coffee-outline',
                        fn_name: '澳大論壇',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'face-mask',
                        fn_name: '防疫要求',
                        go_where: '', // a function
                    },
                ],
            },
            {
                title: '課業 & 發展',
                fn: [
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'alpha-m-circle-outline',
                        fn_name: 'Moodle',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'database-search',
                        fn_name: '選咩課',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'eye-plus',
                        fn_name: '預選課',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'bank-plus',
                        fn_name: 'Add Drop',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        // icon_name:"account-star",
                        icon_name: 'cow',
                        fn_name: '全人發展',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'ab-testing',
                        fn_name: '成績',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'counter',
                        fn_name: '學分',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'dolphin',
                        fn_name: '交流',
                        go_where: '', // a function
                    },
                    {
                        icon_type: iconTypes.materialCommunityIcons,
                        icon_name: 'dice-multiple',
                        fn_name: '獎學金',
                        go_where: '', // a function
                    },
                ],
            },
        ],
    };

    GetFunctionCard(title, fn_list) {
        return (
            <View
                style={{
                    flex: 1,
                    backgroundColor: COLOR_DIY.bg_color,
                    borderRadius: pxToDp(10),
                    margin: pxToDp(15),
                    marginTop: pxToDp(5),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow,
                }}>
                {/* 服務分類標題 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: pxToDp(12),
                        paddingTop: pxToDp(12),
                    }}>
                    <Text
                        style={{
                            fontSize: pxToDp(12),
                            color: COLOR_DIY.black.main,
                            fontWeight: 'bold',
                        }}>
                        {title}
                    </Text>
                </View>
                <FlatGrid
                    itemDimension={pxToDp(50)}
                    data={fn_list}
                    spacing={pxToDp(10)}
                    renderItem={({item}) => {
                        // 索引出相關服務的icon
                        let icon = null;
                        if (item.icon_type == 'ionicons') {
                            icon = (
                                <Ionicons
                                    name={item.icon_name}
                                    size={pxToDp(30)}
                                    color={COLOR_DIY.themeColor}
                                />
                            );
                        }
                        if (item.icon_type == 'MaterialCommunityIcons') {
                            icon = (
                                <MaterialCommunityIcons
                                    name={item.icon_name}
                                    size={pxToDp(30)}
                                    color={COLOR_DIY.themeColor}
                                />
                            );
                        }

                        return (
                            <TouchableOpacity
                                style={{
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    flexDirection: 'column',
                                }}>
                                {icon}
                                <Text
                                    style={{
                                        fontSize: pxToDp(12),
                                        color: COLOR_DIY.black.second,
                                    }}>
                                    {item.fn_name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }}
                    showsVerticalScrollIndicator={false}
                />
            </View>
        );
    }

    render() {
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <ScrollView>
                    <Header
                        backgroundColor={COLOR_DIY.bg_color}
                        centerComponent={{
                            text: '服務',
                            style: {
                                color: COLOR_DIY.black.main,
                                fontSize: pxToDp(15),
                            },
                        }}
                        statusBarProps={{
                            backgroundColor: 'transparent',
                            barStyle: 'dark-content',
                        }}
                    />

                    {/* 1.0 吸頂分類標籤 開始 */}
                    {/* TODO: 吸頂分類選擇 */}
                    {/* 1.0 吸頂分類標籤 結束 */}

                    {this.state.functionArr.map(fn_card => {
                        return this.GetFunctionCard(fn_card.title, fn_card.fn);
                    })}

                    <Text>{'\n'}</Text>
                    <Text>{'\n'}</Text>
                    <Text>{'\n'}</Text>
                </ScrollView>
            </View>
        );
    }
}

export default Index;
