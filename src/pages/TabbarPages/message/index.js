// 信息頁 - 2022.08.07臨時改為Follow頁
import React, {Component} from 'react';
import {
    Text,
    View,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Dimensions,
    StyleSheet,
    RefreshControl,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, BASE_HOST, GET} from '../../../utils/pathMap';
import ChatCard from './ChatCard';
import ClubCard from '../news/components/ClubCard';
import EventCard from '../news/components/EventCard';

import axios from 'axios';
import {Header} from '@rneui/themed';
// import {SpringScrollView} from 'react-native-spring-scrollview';
import {FlatGrid} from 'react-native-super-grid';
import FastImage from 'react-native-fast-image';

const {bg_color, themeColor, white, viewShadow, black} = COLOR_DIY;
const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.25;

class MesgScreen extends Component {
    state = {
        clubDataList: undefined,
        eventData: undefined,
        isLoading: true,
    };

    componentDidMount() {
        this.getFollowClubs();
        this.getFollowEvents();
    }

    async getFollowClubs() {
        const {clubDataList} = this.state;
        let URL = BASE_URI + GET.FOLLOW_CLUB;
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let clubDataList = json.content;
                    clubDataList.map(itm => {
                        itm.logo_url = BASE_HOST + itm.logo_url;
                    });
                    this.setState({clubDataList, isLoading: false});
                }
            })
            .catch(err => console.log('err', err));
    }

    async getFollowEvents() {
        const {eventData} = this.state;
        let URL = BASE_URI + GET.FOLLOW_EVENT;
        let num_of_item = 5;
        await axios
            .get(URL, {
                params: {
                    num_of_item,
                },
            })
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    let newDataArr = json.content;
                    newDataArr.map(itm => {
                        itm.cover_image_url = BASE_HOST + itm.cover_image_url;
                    });
                    this.setState({eventData: newDataArr});
                }
            })
            .catch(err => console.log('err', err));
    }

    renderGoToAll = type => {
        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => {
                    if (type == 'club') {
                        this.props.navigation.navigate('FollowClub');
                    } else if (type == 'event') {
                        this.props.navigation.navigate('FollowEvent');
                    }
                }}
                style={styles.seeMoreButton}>
                <Text style={{color: white, fontSize: 14}}>查看全部</Text>
            </TouchableOpacity>
        );
    };

    render() {
        const {clubDataList, eventData, isLoading} = this.state;
        return (
            <View style={{backgroundColor: bg_color, flex: 1}}>
                <Header
                    backgroundColor={bg_color}
                    centerComponent={{
                        text: '關注',
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

                <ScrollView
                    refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={isLoading}
                            onRefresh={() => {
                                this.setState({isLoading: true});
                                this.getFollowClubs();
                                this.getFollowEvents();
                            }}
                        />
                    }>
                    {/* 關注內容 */}
                    <View style={styles.infoContainer}>
                        <Text style={styles.title}>Follow的組織</Text>
                        {clubDataList && clubDataList.length > 0 ? (
                            <View>
                                <FlatList
                                    data={clubDataList}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    renderItem={({item}) => {
                                        return (
                                            <TouchableOpacity
                                                style={{
                                                    margin: pxToDp(5),
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    width: COMPONENT_WIDTH,
                                                    height: COMPONENT_WIDTH,
                                                }}
                                                activeOpacity={0.8}
                                                onPress={() => {
                                                    this.props.navigation.navigate(
                                                        'ClubDetail',
                                                        {
                                                            data: item,
                                                        },
                                                    );
                                                }}>
                                                <FastImage
                                                    source={{
                                                        uri: item.logo_url,
                                                        // cache: FastImage
                                                        //     .cacheControl.web,
                                                    }}
                                                    resizeMode={
                                                        FastImage.resizeMode
                                                            .contain
                                                    }
                                                    style={{
                                                        width: '60%',
                                                        height: '60%',
                                                        borderRadius: 50,
                                                        backgroundColor: white,
                                                        ...viewShadow,
                                                    }}
                                                />
                                                <View
                                                    style={{
                                                        alignItems: 'center',
                                                        width: '90%',
                                                        marginTop: pxToDp(5),
                                                    }}>
                                                    <Text
                                                        style={{
                                                            fontSize: 12,
                                                            color: black.third,
                                                        }}
                                                        numberOfLines={1}>
                                                        {item.name}
                                                    </Text>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    }}
                                    keyExtractor={(_, index) => index}
                                />
                                {this.renderGoToAll('club')}
                            </View>
                        ) : (
                            <View style={{alignItems: 'center'}}>
                                <Text style={{color: black.third}}>
                                    你還沒有follow的組織，快去follow一些吧~
                                </Text>
                                <Text style={{color: black.third}}>
                                    []~(￣▽￣)~*
                                </Text>
                            </View>
                        )}
                    </View>

                    <View
                        style={{
                            marginTop: pxToDp(10),
                            ...styles.infoContainer,
                        }}>
                        <Text style={styles.title}>Follow的活動</Text>
                        {eventData && eventData.length > 0 ? (
                            <View>
                                <FlatList
                                    data={eventData}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
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
                                    keyExtractor={(_, index) => index}
                                />
                                {this.renderGoToAll('event')}
                            </View>
                        ) : (
                            <View style={{alignItems: 'center'}}>
                                <Text style={{color: black.third}}>
                                    你還沒有follow的活動，快去follow一些吧~
                                </Text>
                                <Text style={{color: black.third}}>
                                    []~(￣▽￣)~*
                                </Text>
                            </View>
                        )}
                    </View>
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    infoContainer: {
        paddingHorizontal: pxToDp(10),
        paddingVertical: pxToDp(5),
        backgroundColor: white,
        borderRadius: pxToDp(10),
        margin: pxToDp(10),
        ...viewShadow,
    },
    title: {
        color: themeColor,
        alignSelf: 'center',
        fontSize: 16,
        fontWeight: 'bold',
    },
    seeMoreButton: {
        marginVertical: pxToDp(5),
        paddingHorizontal: pxToDp(20),
        paddingVertical: pxToDp(10),
        alignItems: 'center',
        alignSelf: 'center',
        borderRadius: pxToDp(10),
        backgroundColor: themeColor,
        ...viewShadow,
    },
});

export default MesgScreen;
