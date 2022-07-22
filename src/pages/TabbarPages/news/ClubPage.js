import React, {Component} from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    RefreshControl,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, GET} from '../../../utils/pathMap';

import ClubCard from './components/ClubCard';

import {FlatGrid} from 'react-native-super-grid';
import axios from 'axios';

const {themeColor} = COLOR_DIY;

const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.25;

// 防誤觸時間，理論越長越穩
const PREVENT_TOUCH_TIME = 500;

// 社團信息
let clubDataList = [];
// Return Example
// {
//     lub_num: 1,
//     logo_url: 'http://ark.boxz.dev/static/images/club/517b1d4f-1e8f-4215-8a46-2ba5ae80cd05//logo.jpg',
//     name: '電腦學會',
//     tag: 'CLUB',
// }

class ClubPage extends Component {
    constructor() {
        super();
        this.state = {
            clubDataList: undefined,
            isLoading: true,
        };
        // 獲取所有社團信息
        this.getData();
    }

    // 請求所有社團的info
    async getData() {
        await axios
            .get(BASE_URI + GET.CLUB_INFO_ALL)
            .then(res => {
                let result = res.data;
                let json = eval('(' + result + ')');
                if (json.message == 'success') {
                    clubDataList = json.content;
                    this.setState({clubDataList, isLoading: false});
                } else {
                    alert('Warning:', message);
                }
            })
            .catch(err => {
                console.error(err);
            });
    }

    render() {
        const {clubDataList} = this.state;
        return (
            <View style={{flex: 1}}>
                {clubDataList != undefined && (
                    <FlatGrid
                        style={{flex: 1}}
                        // 每个项目的最小宽度或高度（像素）
                        itemDimension={COMPONENT_WIDTH}
                        data={clubDataList}
                        // 每個項目的間距
                        spacing={pxToDp(12)}
                        renderItem={({item}) => (
                            <View style={{flex: 1}}>
                                <ClubCard data={item}></ClubCard>
                            </View>
                        )}
                        // 所有項目末尾渲染，防Tabbar遮擋
                        ListFooterComponent={() => (
                            <View style={{marginTop: pxToDp(50)}}></View>
                        )}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isLoading}
                                onRefresh={() => {
                                    // 展示Loading標識
                                    this.setState({isLoading: true});
                                    this.getData();
                                }}
                            />
                        }
                    />
                )}
            </View>
        );
    }
}

export default ClubPage;
