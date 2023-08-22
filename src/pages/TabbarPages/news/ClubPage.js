import React, { Component } from 'react';
import {
    Text,
    View,
    RefreshControl,
    TouchableOpacity,
    Linking,
    ScrollView,
} from 'react-native';

import { COLOR_DIY } from '../../../utils/uiMap';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import Loading from '../../../components/Loading';
import ClubCard from './components/ClubCard';

import { FlatGrid } from 'react-native-super-grid';
import axios from 'axios';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { scale } from 'react-native-size-matters';
import { FlatList } from 'react-native';

const { themeColor, black, white } = COLOR_DIY;
const COMPONENT_WIDTH = scale(90);
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
        };
        // 獲取所有社團信息
        this.getData();
    }

    // 請求所有社團的info
    getData = async () => {
        this.setState({ isLoading: true });
        let URL = BASE_URI + GET.CLUB_INFO_ALL;
        try {
            await axios.get(URL).then(res => {
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
        } catch (error) {
            if (error.code == 'ERR_NETWORK') {
                // 網絡錯誤，自動重載
                this.getData();
            } else {
                alert('未知錯誤，請聯繫開發者！')
            }
        }
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
                showsVerticalScrollIndicator={false}
            />
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
            <View style={{ marginBottom: scale(20) }}>
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
        const { clubDataList, isLoading, } = this.state;

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color, alignItems: 'center', justifyContent: 'center' }}>
                {/* 側邊分類導航 */}
                {clubDataList != undefined && 'ARK' in clubDataList ? (
                    <View style={{
                        position: 'absolute', zIndex: 99999, right: scale(10), top: scale(150),
                        backgroundColor: white,
                        borderRadius: scale(10),
                        ...COLOR_DIY.viewShadow,
                    }}>
                        <FlatList
                            data={clubTagList}
                            contentContainerStyle={{
                                paddingHorizontal: scale(3),
                            }}
                            ListHeaderComponent={() => {
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            ReactNativeHapticFeedback.trigger('soft');
                                            this.scrollViewRef.current.scrollTo({ y: 0 });
                                        }}
                                        style={{
                                            padding: scale(5),
                                            width: '100%'
                                        }}
                                    >
                                        <Text style={{
                                            color: black.third,
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
                                            ReactNativeHapticFeedback.trigger('soft');
                                            // 點擊自動滑動到對應分類的社團
                                            const tag = itm.item;
                                            this.scrollViewRef.current.scrollTo({
                                                y: this.state.clubClassLayout[tag]
                                            })
                                        }}
                                        style={{
                                            padding: scale(5),
                                            width: '100%',
                                        }}
                                    >
                                        <Text style={{
                                            color: black.third,
                                            fontSize: scale(11)
                                        }}>
                                            {clubTagMap(itm.item)}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }}
                            keyExtractor={item => item.id}
                            showsHorizontalScrollIndicator={false}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>
                ) : null}

                {/* 組織展示 */}
                {clubDataList != undefined && !isLoading ? (
                    'ARK' in clubDataList ?
                        <ScrollView
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    colors={[themeColor]}
                                    tintColor={themeColor}
                                    refreshing={this.state.isLoading}
                                    onRefresh={() => {
                                        this.getData();
                                    }}
                                />
                            }
                            ref={this.scrollViewRef}
                        >
                            <View>
                                {this.renderClub(clubDataList.ARK, 'ARK')}
                                {clubTagList.map((tag) => {
                                    if (tag in clubDataList && clubDataList[tag].length > 0) {
                                        return this.renderClub(clubDataList[tag], tag)
                                    }
                                })}
                            </View>
                            {this.renderBottomInfo()}
                        </ScrollView> : null
                ) : (
                    <Loading />
                )}
            </View>
        );
    }
}

export default ClubPage;
