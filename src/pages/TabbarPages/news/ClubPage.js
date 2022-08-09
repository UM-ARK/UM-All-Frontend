import React, {Component} from 'react';
import {
    Text,
    View,
    Dimensions,
    RefreshControl,
    TouchableOpacity,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, BASE_HOST, GET} from '../../../utils/pathMap';
import {clubTagList, clubTagMap} from '../../../utils/clubMap';
import Loading from '../../../components/Loading';
import ClubCard from './components/ClubCard';

import {FlatGrid} from 'react-native-super-grid';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ActionSheet from 'react-native-actionsheet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

const {themeColor, black, white} = COLOR_DIY;

const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.25;

originClubDataList = [];
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
        let URL = BASE_URI + GET.CLUB_INFO_ALL;
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    clubDataList = json.content;
                    clubDataList.map(itm => {
                        itm.logo_url = BASE_HOST + itm.logo_url;
                    });
                    originClubDataList = clubDataList;
                    this.setState({clubDataList, isLoading: false});
                } else {
                    alert('Warning:', message);
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    renderClub = () => {
        const {clubDataList} = this.state;
        return (
            <FlatGrid
                // 每个项目的最小宽度或高度（像素）
                itemDimension={COMPONENT_WIDTH}
                data={clubDataList}
                // 每個項目的間距
                spacing={pxToDp(12)}
                renderItem={({item}) => <ClubCard data={item} />}
                // 所有項目末尾渲染，防Tabbar遮擋
                ListFooterComponent={() => (
                    <View>
                        <Text
                            style={{
                                color: black.third,
                                alignSelf: 'center',
                                fontSize: pxToDp(12),
                            }}>
                            下拉可刷新頁面~
                        </Text>
                        <View style={{marginTop: pxToDp(50)}}></View>
                    </View>
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
                keyExtractor={item => item._id}
            />
        );
    };

    clubFilter = tag => {
        this.setState({isLoading: true});
        // const {clubDataList} = this.state;

        var filter = [tag];
        var result = originClubDataList.filter(a => {
            return filter.some(f => f === a.tag);
        });
        this.setState({clubDataList: result, isLoading: false});
    };

    renderFilter = () => {
        let optionsList = [];
        clubTagList.map(itm => {
            optionsList.push(clubTagMap(itm));
        });
        optionsList.push('默認');
        optionsList.push('取消');
        return (
            <View>
                <TouchableOpacity
                    onPress={() => {
                        ReactNativeHapticFeedback.trigger('soft');
                        this.ActionSheet.show();
                    }}
                    activeOpacity={0.8}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        alignSelf: 'center',
                        marginTop: pxToDp(8),
                    }}>
                    <Text style={{color: black.third}}>篩選</Text>
                    <Ionicons
                        name={
                            this.state.applyFilter
                                ? 'md-funnel'
                                : 'md-funnel-outline'
                        }
                        size={pxToDp(10)}
                        color={black.third}
                        style={{marginLeft: pxToDp(5)}}
                    />
                </TouchableOpacity>

                {/* 選擇彈窗 */}
                <ActionSheet
                    ref={o => (this.ActionSheet = o)}
                    options={optionsList}
                    cancelButtonIndex={optionsList.length - 1}
                    destructiveButtonIndex={optionsList.length - 1}
                    onPress={index => {
                        if (clubTagList[index]) {
                            this.clubFilter(clubTagList[index]);
                        } else if (index == optionsList.length - 2) {
                            this.setState({clubDataList: originClubDataList});
                        }
                    }}
                />
            </View>
        );
    };

    render() {
        const {clubDataList, isLoading} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                {clubDataList != undefined && !isLoading ? (
                    <View>
                        {this.renderFilter()}
                        {this.renderClub()}
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
