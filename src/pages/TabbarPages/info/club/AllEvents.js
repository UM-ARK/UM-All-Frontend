import React, { Component } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    RefreshControl,
} from 'react-native';

import Header from '../../../../components/Header';
import EventCard from '../components/EventCard';
import { COLOR_DIY, uiStyle, } from '../../../../utils/uiMap';
import { BASE_URI, BASE_HOST, GET } from '../../../../utils/pathMap';
import Toast from 'react-native-easy-toast';

import ModalDropdown from 'react-native-modal-dropdown';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';
import { scale } from 'react-native-size-matters';

const { bg_color, white, black, viewShadow, themeColor } = COLOR_DIY;

// 返回數據的頁數
let dataPage = 1;
class AllEvents extends Component {
    state = {
        openSort: false,
        selectSort: 'default',
        applyFilter: false,
        eventData: undefined,
        noMoreData: false,
        isLoading: true,
    };
    componentDidMount() {
        let params = this.props.route.params;
        // 由社團詳情頁跳轉
        if (params.clubData) {
            let clubData = params.clubData;
            this.setState({ club_num: clubData.club_num });
            this.getEventData(clubData.club_num);
        }
    }

    componentWillUnmount() {
        dataPage = 1;
    }

    async getEventData(club_num, sort, filter) {
        const { eventData } = this.state;
        let URL = BASE_URI + GET.EVENT_INFO_CLUB_NUM_P;
        let num_of_item = 10;
        await axios
            .get(URL, {
                params: {
                    club_num,
                    num_of_item,
                    page: dataPage,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let newDataArr = json.content;
                    newDataArr.map(itm => {
                        itm.cover_image_url = BASE_HOST + itm.cover_image_url;
                    });
                    if (newDataArr.length < num_of_item) {
                        this.setState({ noMoreData: true });
                    } else {
                        this.setState({ noMoreData: false });
                    }
                    if (dataPage == 1) {
                        this.setState({ eventData: newDataArr });
                    } else if (eventData.length > 0) {
                        newDataArr = eventData.concat(newDataArr);
                        this.setState({ eventData: newDataArr });
                    }
                } else if (json.code == '2') {
                    alert('已無更多數據');
                    this.setState({ noMoreData: true });
                }
                this.setState({ isLoading: false });
            })
            .catch(err => console.log('err', err));
    }

    triggerSort = () => {
        this.setState({ openSort: !this.state.openSort });
    };
    renderDropDown = () => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-around',
                    marginVertical: scale(5),
                }}>
                {/* 排序選擇 */}
                <ModalDropdown
                    options={['option 1', 'option 2']}
                    dropdownStyle={{
                        borderRadius: scale(10),
                        overflow: 'hidden',
                        padding: scale(10),
                    }}
                    dropdownTextStyle={{ color: themeColor }}
                    // 調整下拉菜單展開的位置
                    adjustFrame={() => {
                        let s = {
                            top: scale(75),
                            left: 0,
                            height: scale(90),
                            width: '100%',
                        };
                        return s;
                    }}
                    showsVerticalScrollIndicator={false}
                    onDropdownWillShow={this.triggerSort}
                    onDropdownWillHide={this.triggerSort}>
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            paddingHorizontal: scale(20),
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: this.state.openSort
                                    ? themeColor
                                    : black.third,
                                fontSize: scale(15),
                            }}>
                            排序
                        </Text>
                        <Ionicons
                            name={
                                this.state.openSort
                                    ? 'caret-up-outline'
                                    : 'caret-down-outline'
                            }
                            size={scale(12)}
                            style={{ marginLeft: scale(5) }}
                            color={
                                this.state.openSort ? themeColor : black.third
                            }
                        />
                    </View>
                </ModalDropdown>
                {/* 篩選選擇 */}
                <TouchableOpacity
                    onPress={() => alert('打開篩選')}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ ...uiStyle.defaultText, color: black.third }}>篩選</Text>
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
            </View>
        );
    };

    loadMoreData = () => {
        this.toast.show(`Data is Loading...`, 2000);
        const { club_num, noMoreData } = this.state;
        dataPage++;
        if (!noMoreData) {
            this.getEventData(club_num);
        }
    };
    renderLoadMoreView = () => {
        const { noMoreData } = this.state;
        return (
            <View
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: scale(10),
                    marginBottom: scale(50),
                }}>
                {noMoreData ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ ...uiStyle.defaultText, color: black.third }}>
                            沒有更多活動了，過一段時間再來吧~
                        </Text>
                        <Text style={{ ...uiStyle.defaultText, }}>[]~(￣▽￣)~*</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.loadMore}
                        activeOpacity={0.8}
                        onPress={this.loadMoreData}>
                        <Text style={{ ...uiStyle.defaultText, color: white, fontSize: scale(14) }}>
                            Load More
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };
    renderEvent = () => {
        const { eventData, club_num } = this.state;
        return (
            eventData != undefined &&
            eventData.length > 0 && (
                <FlatList
                    numColumns={2}
                    columnWrapperStyle={{
                        justifyContent: 'center',
                    }}
                    data={eventData}
                    renderItem={({ item }) => {
                        return (
                            <EventCard
                                data={item}
                                style={{
                                    marginVertical: scale(8),
                                    marginHorizontal: scale(4),
                                }}
                            />
                        );
                    }}
                    ListFooterComponent={this.renderLoadMoreView}
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={this.state.isLoading}
                            onRefresh={() => {
                                this.toast.show(`Data is Loading...`, 2000);
                                if (dataPage > 1) {
                                    dataPage = 1;
                                }
                                this.setState({ isLoading: true });
                                this.getEventData(club_num);
                            }}
                        />
                    }
                />
            )
        );
    };

    render() {
        return (
            <View style={{ flex: 1, backgroundColor: bg_color, }}>
                <Header title={'所有活動查看'} />
                {/* TODO: 排序與篩選 選擇器 */}
                {/* {this.renderDropDown()} */}

                {/* 渲染所有活動 */}
                {this.renderEvent()}

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{ color: white }}
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        borderRadius: scale(10),
                    }}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    loadMore: {
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: themeColor,
        paddingHorizontal: scale(10),
        paddingVertical: scale(10),
        borderRadius: scale(15),
        marginBottom: scale(5),
        ...viewShadow,
    },
});

export default AllEvents;
