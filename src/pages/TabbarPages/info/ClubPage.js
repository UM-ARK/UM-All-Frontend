import React, { Component } from 'react';
import {
    Text,
    View,
    RefreshControl,
    TouchableOpacity,
    Linking,
    ScrollView,
    Alert,
} from 'react-native';

import { COLOR_DIY, uiStyle } from '../../../utils/uiMap';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import Loading from '../../../components/Loading';
import ClubCard from './components/ClubCard';

import { FlatGrid } from 'react-native-super-grid';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';
import { FlatList } from 'react-native';

const { themeColor, black, white } = COLOR_DIY;
const COMPONENT_WIDTH = scale(90);
// 65 寬度，一行3個
let originClubDataList = [];

clubFilter = (clubDataList, tag) => {
    let filter = [tag];
    let result = clubDataList.filter(a => {
        return filter.some(f => f === a.tag);
    });
    return result
};

class ClubPage extends Component {
    scrollViewRef = React.createRef(null);

    state = {
        clubDataList: undefined,
        isLoading: true,
        scrollPosition: 0,
        clubClassLayout: {},
        isOtherViewVisible: true,
    }

    componentDidMount() {
        // 獲取所有社團信息
        this.getData();
    }

    // 請求所有社團的info
    getData = async () => {
        this.handleScrollStart();
        this.setState({ isLoading: true });
        let URL = BASE_URI + GET.CLUB_INFO_ALL;
        try {
            await axios.get(URL).then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let clubDataList = json.content;
                    clubDataList.map(itm => {
                        itm.logo_url = BASE_HOST + itm.logo_url;
                    });
                    originClubDataList = clubDataList;
                    this.setState({
                        clubDataList: this.separateDataList(clubDataList),
                        isLoading: false
                    });
                    this.handleScrollEnd();
                } else {
                    Alert.alert('Warning:', message);
                }
            })
        } catch (error) {
            if (error.code == 'ERR_NETWORK') {
                // 網絡錯誤，自動重載
                this.getData();
            } else {
                Alert.alert('未知錯誤，請聯繫開發者！\n也可能是國內網絡屏蔽所導致！')
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
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontSize: verticalScale(15)
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
                scrollEnabled={false}
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
                        ...uiStyle.defaultText,
                        color: black.third,
                        alignSelf: 'center',
                        fontSize: scale(12),
                    }}>
                    {'\n\n\n\n' + '已有 ' +
                        originClubDataList.length +
                        ' 個組織進駐~~\n'}
                </Text>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        alignSelf: 'center',
                        fontSize: scale(12),
                    }}>
                    {'下拉可刷新頁面~\n'}

                </Text>
                {/* 進駐提示 */}
                <TouchableOpacity
                    onPress={() => openLink(USUAL_Q)}
                    style={{
                        // marginTop: scale(20),
                        alignSelf: 'center',
                    }}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: themeColor,
                            fontSize: scale(12),
                            marginBottom: 10
                        }}
                    >
                        {'沒有賬號? 進駐ARK ALL!\n'}
                    </Text>
                </TouchableOpacity>
            </View>
        )
    }

    handleScrollStart = () => {
        this.setState({ isOtherViewVisible: false });
    };

    handleScrollEnd = () => {
        this.setState({ isOtherViewVisible: true });
    };

    render() {
        const { clubDataList, isLoading, isOtherViewVisible } = this.state;
        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color, alignItems: 'center', justifyContent: 'center' }}>
                {/* 側邊分類導航 */}
                {clubDataList != undefined && 'ARK' in clubDataList && isOtherViewVisible ? (
                    <View style={{
                        position: 'absolute',
                        zIndex: 2,
                        right: scale(10),
                        bottom: scale(20),
                        opacity: 0.9,
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
                                            trigger();
                                            this.scrollViewRef.current.scrollTo({ y: 0 });
                                        }}
                                        style={{
                                            padding: scale(5),
                                            width: '100%'
                                        }}
                                    >
                                        <Text style={{
                                            ...uiStyle.defaultText,
                                            color: black.third,
                                            fontSize: verticalScale(11),
                                            fontWeight: 'bold'
                                        }}>
                                            ARK
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }}
                            renderItem={(itm) => {
                                return (
                                    <TouchableOpacity
                                        onPress={() => {
                                            trigger();
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
                                            ...uiStyle.defaultText,
                                            color: black.third,
                                            fontSize: verticalScale(11),
                                            fontWeight: 'bold'
                                        }}>
                                            {clubTagMap(itm.item)}
                                        </Text>
                                    </TouchableOpacity>
                                )
                            }}
                            keyExtractor={item => item}
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
                                        this.handleScrollStart();
                                    }}
                                />
                            }
                            ref={this.scrollViewRef}
                            onScrollBeginDrag={this.handleScrollStart}
                            onMomentumScrollEnd={this.handleScrollEnd}
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
