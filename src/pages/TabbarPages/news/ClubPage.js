import React, { Component } from 'react';
import {
    Text,
    View,
    RefreshControl,
    TouchableOpacity,
    Linking,
    ScrollView
} from 'react-native';

import { COLOR_DIY } from '../../../utils/uiMap';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import Loading from '../../../components/Loading';
import ClubCard from './components/ClubCard';

import { FlatGrid } from 'react-native-super-grid';
import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ActionSheet from 'react-native-actionsheet';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { scale } from 'react-native-size-matters';
import { FlatList } from 'react-native';

const { themeColor, black, white } = COLOR_DIY;
const COMPONENT_WIDTH = scale(105);
// 65 寬度，一行3個
let originClubDataList = [];

clubFilter = (clubDataList, tag) => {
    // this.setState({ isLoading: true });
    // const {clubDataList} = this.state;

    let filter = [tag];
    let result = clubDataList.filter(a => {
        return filter.some(f => f === a.tag);
    });
    // this.setState({ clubDataList: result, isLoading: false });
    return result
};

class ClubPage extends Component {
    constructor() {
        super();
        this.scrollViewRef = React.createRef();

        this.state = {
            clubDataList: undefined,
            isLoading: true,
            scrollPosition: 0,
            clubClassLayout: {},
            scrollMaxItm: 'ARK',
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
                    this.setState({
                        clubDataList: this.separateDataList(clubDataList),
                        isLoading: false
                    });
                } else {
                    alert('Warning:', message);
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    renderClub = (clubDataList, tag) => {
        return (
            <FlatGrid
                // 每个项目的最小宽度或高度（像素）
                itemDimension={COMPONENT_WIDTH}
                data={clubDataList}
                // 每個項目的間距
                // spacing={scale(12)}
                renderItem={({ item }) => <ClubCard data={item} />}
                keyExtractor={item => item._id}
                directionalLockEnabled
                alwaysBounceHorizontal={false}
                ListHeaderComponent={
                    <View style={{
                        marginLeft: scale(12),
                        marginBottom: scale(5)
                    }}>
                        <Text style={{
                            color: black.main,
                            fontSize: scale(15)
                        }}>
                            {clubTagMap(tag)}
                        </Text>
                    </View>
                }
                // 獲取當前距離屏幕頂端的高度
                onLayout={event => {
                    const { layout } = event.nativeEvent;
                    // console.log('height:', layout.height);
                    // console.log('y:', layout.y);
                    let clubClassLayout = this.state.clubClassLayout;
                    clubClassLayout[tag] = layout.y;
                    this.setState({ clubClassLayout })
                }}
            />
        );
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
                        justifyContent: 'center',
                        marginTop: scale(8),
                        width: '100%',
                    }}>
                    <Text style={{ color: black.third }}>篩選</Text>
                    <Ionicons
                        name={
                            this.state.applyFilter
                                ? 'md-funnel'
                                : 'md-funnel-outline'
                        }
                        size={scale(10)}
                        color={black.third}
                        style={{ marginLeft: scale(5) }}
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
                            this.setState({ clubDataList: originClubDataList });
                        }
                    }}
                />
            </View>
        );
    };

    separateDataList = (clubDataList) => {
        let newClubData = {};
        if (clubDataList && clubDataList.length > 0) {
            clubTagList.map((itm) => {
                // console.log('過濾' + itm, clubFilter(clubDataList, itm));
                newClubData[itm] = clubFilter(clubDataList, itm);
            })
        }
        newClubData.ARK = clubFilter(clubDataList, 'ARK');
        return newClubData
        // console.log('newClubData', newClubData);
    }

    renderBottomInfo = () => {
        return (
            <View style={{ marginBottom: scale(60) }}>
                <Text
                    style={{
                        color: black.third,
                        alignSelf: 'center',
                        fontSize: scale(12),
                    }}>
                    {'已有 ' +
                        originClubDataList.length +
                        ' 個組織進駐~~'}
                </Text>
                <Text
                    style={{
                        color: black.third,
                        alignSelf: 'center',
                        fontSize: scale(12),
                    }}>
                    下拉可刷新頁面~
                </Text>
                {/* 進駐提示 */}
                <TouchableOpacity
                    onPress={() => Linking.openURL(USUAL_Q)}
                    style={{
                        // marginTop: scale(20),
                        alignSelf: 'center',
                    }}>
                    <Text
                        style={{
                            color: themeColor,
                            fontSize: scale(12),
                        }}>
                        沒有賬號? 進駐ARK ALL!
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    render() {
        const { clubDataList, isLoading, scrollMaxItm } = this.state;

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                {clubDataList != undefined && !isLoading ? (
                    <View style={{ flexDirection: 'row' }}>
                        {/* 側邊分類導航 */}
                        <View style={{ width: scale(60) }}>
                            <FlatList
                                data={clubTagList}
                                contentContainerStyle={{
                                    height: '100%',
                                    justifyContent: 'center', alignItems: 'flex-start',
                                    paddingLeft: scale(10)
                                }}
                                ListHeaderComponent={() => {
                                    return (
                                        <TouchableOpacity
                                            onPress={() => {
                                                this.scrollViewRef.current.scrollTo({ y: 0 });
                                                this.setState({ scrollMaxItm: 'ARK' })
                                            }}
                                            style={{ marginBottom: scale(20) }}
                                        >
                                            <Text style={{
                                                color: scrollMaxItm == 'ARK' ? black.main : black.third,
                                                fontSize: scale(11)
                                            }}
                                            >
                                                ARK
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                }}
                                renderItem={(itm) => {
                                    return (
                                        <TouchableOpacity
                                            onPress={() => {
                                                // 點擊自動滑動到對應分類的社團
                                                const tag = itm.item;
                                                this.scrollViewRef.current.scrollTo({
                                                    y: this.state.clubClassLayout[tag]
                                                })
                                                this.setState({ scrollMaxItm: tag })
                                            }}
                                            style={{ marginBottom: scale(20) }}
                                        >
                                            <Text style={{
                                                color: scrollMaxItm == itm.item ? black.main : black.third,
                                                fontSize: scale(11)
                                            }}>
                                                {clubTagMap(itm.item)}
                                            </Text>
                                        </TouchableOpacity>
                                    )
                                }}
                                keyExtractor={item => item.id}
                                showsHorizontalScrollIndicator={false}
                            />
                        </View>
                        {/* 組織展示 */}
                        <View style={{ width: scale(290) }}>
                            <ScrollView
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
                                }
                                ref={this.scrollViewRef}
                                // onMomentumScrollEnd 拖到至鬆手才執行
                                onScroll={({ nativeEvent }) => {
                                    const { clubClassLayout } = this.state;
                                    // the current offset, {x: number, y: number} 
                                    const position = nativeEvent.contentOffset;

                                    // 記錄已滑過的最大項
                                    let scrollMaxIndex = 0;
                                    Object.values(clubClassLayout).map((itm, idx) => {
                                        if (itm <= position.y + 20) {
                                            scrollMaxIndex = idx;
                                        }
                                    })
                                    this.setState({
                                        scrollMaxItm: Object.keys(clubClassLayout)[scrollMaxIndex]
                                    })
                                }}
                            >
                                {/* {this.renderFilter()} */}
                                {'ARK' in clubDataList && (
                                    <View>
                                        {this.renderClub(clubDataList.ARK, 'ARK')}
                                        {clubTagList.map((tag) => {
                                            if (tag in clubDataList && clubDataList[tag].length > 0) {
                                                return this.renderClub(clubDataList[tag], tag)
                                            }
                                        })}
                                    </View>
                                )}
                                {this.renderBottomInfo()}
                            </ScrollView>
                        </View>
                    </View>
                ) : (
                    <ScrollView
                        contentContainerStyle={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                        }}
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
                        }
                    >
                        <Loading />
                    </ScrollView>
                )}
            </View>
        );
    }
}

export default ClubPage;
