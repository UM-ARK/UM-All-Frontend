import React, {Component} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    FlatList,
    RefreshControl,
} from 'react-native';

import {
    BASE_URI,
    BASE_HOST,
    GET,
    POST,
    addHost,
} from '../../../../../utils/pathMap';
import {COLOR_DIY} from '../../../../../utils/uiMap';
import {pxToDp} from '../../../../../utils/stylesKits';
import Header from '../../../../../components/Header';
import EventCard from '../../../news/components/EventCard';
import Toast, {DURATION} from 'react-native-easy-toast';

import axios from 'axios';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {bg_color, white, black, viewShadow, themeColor} = COLOR_DIY;

// 返回數據的頁數
let dataPage = 1;
class FollowEvent extends Component {
    state = {
        eventData: undefined,
        noMoreData: false,
        isLoading: true,
    };

    componentDidMount() {
        this.getFollowEvents();
    }

    componentWillUnmount() {
        dataPage = 1;
    }

    async getFollowEvents() {
        const {eventData} = this.state;
        let URL = BASE_URI + GET.FOLLOW_EVENT;
        let num_of_item = 10;
        await axios
            .get(URL, {
                params: {
                    num_of_item,
                    page: dataPage,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let newDataArr = json.content;
                    newDataArr.map(itm => {
                        itm.cover_image_url = addHost(itm.cover_image_url);
                    });
                    if (newDataArr.length < num_of_item) {
                        this.setState({noMoreData: true});
                    } else {
                        this.setState({noMoreData: false});
                    }
                    if (dataPage == 1) {
                        this.setState({eventData: newDataArr});
                    } else if (eventData.length > 0) {
                        newDataArr = eventData.concat(newDataArr);
                        this.setState({eventData: newDataArr});
                    }
                } else if (json.code == '2') {
                    alert('已無更多數據');
                    this.setState({noMoreData: true});
                }
                this.setState({isLoading: false});
            })
            .catch(err => console.log('err', err));
    }

    loadMoreData = () => {
        this.toast.show(`Data is Loading...`, 2000);
        const {noMoreData} = this.state;
        dataPage++;
        if (!noMoreData) {
            this.getFollowEvents();
        }
    };
    renderLoadMoreView = () => {
        const {noMoreData} = this.state;
        return (
            <View
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: pxToDp(10),
                }}>
                {noMoreData ? (
                    <View style={{alignItems: 'center'}}>
                        <Text style={{color: black.third}}>
                            你只follow了這麼多活動了，要勞逸結合喔~
                        </Text>
                        <Text>[]~(￣▽￣)~*</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={styles.loadMore}
                        activeOpacity={0.8}
                        onPress={this.loadMoreData}>
                        <Text style={{color: white, fontSize: pxToDp(14)}}>
                            Load More
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };
    renderEvent = () => {
        const {eventData} = this.state;
        return eventData != undefined && eventData.length > 0 ? (
            <FlatList
                numColumns={2}
                columnWrapperStyle={{
                    justifyContent: 'center',
                }}
                data={eventData}
                renderItem={({item}) => {
                    return (
                        <EventCard
                            data={item}
                            style={{
                                marginVertical: pxToDp(8),
                                marginHorizontal: pxToDp(4),
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
                            this.setState({isLoading: true});
                            this.getFollowEvents();
                        }}
                    />
                }
            />
        ) : (
            <View style={{alignItems: 'center'}}>
                <Text style={{color: black.third}}>
                    你還沒有follow的活動，快去follow一些吧~
                </Text>
                <Text style={{color: black.third}}>[]~(￣▽￣)~*</Text>
            </View>
        );
    };

    render() {
        const {eventData} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'Follow的活動'} />

                {/* 渲染所有活動 */}
                {this.renderEvent()}

                {/* Tost */}
                <Toast
                    ref={toast => (this.toast = toast)}
                    position="top"
                    positionValue={'10%'}
                    textStyle={{color: white}}
                    style={{
                        backgroundColor: COLOR_DIY.themeColor,
                        borderRadius: pxToDp(10),
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
        paddingHorizontal: pxToDp(10),
        paddingVertical: pxToDp(10),
        borderRadius: pxToDp(15),
        marginBottom: pxToDp(5),
        ...viewShadow,
    },
});

export default FollowEvent;
