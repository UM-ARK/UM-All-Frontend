import React, {Component} from 'react';
import {Text, View, Dimensions, RefreshControl} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, GET} from '../../../utils/pathMap';
import Loading from '../../../components/Loading';
import DropDownPicker from '../../../components/DropDownPicker';

import ClubCard from './components/ClubCard';

import {FlatGrid} from 'react-native-super-grid';
import axios from 'axios';

const {themeColor} = COLOR_DIY;

const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.25;

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
                let json = res.data;
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
        const {clubDataList, isLoading} = this.state;
        return (
            <View style={{flex: 1}}>
                {clubDataList != undefined && !isLoading ? (
                    <View style={{flex: 1}}>
                        {/* TODO: 排序、篩選 */}
                        <DropDownPicker />
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
                    </View>
                ) : (
                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}>
                        <Loading />
                    </View>
                )}
            </View>
        );
    }
}

export default ClubPage;
