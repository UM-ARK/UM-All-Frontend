import React, {Component} from 'react';
import {View, Text, FlatList, RefreshControl} from 'react-native';

import Header from '../../../components/Header';
import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {BASE_URI, GET} from '../../../utils/pathMap';

import axios from 'axios';

// 解構全局UI樣式
const {bg_color, black, white, themeColor, viewShadow} = COLOR_DIY;

class FollowersPage extends Component {
    state = {
        FollowerList: undefined,
        isLoading: true,
    };

    componentDidMount() {
        this.getFollow();
    }

    async getFollow() {
        let URL = '';
        let param = this.props.route.params;
        if (param.from == 'club') {
            URL = BASE_URI + GET.FOLLOW_CLUB;
        } else if (param.from == 'event') {
            URL = BASE_URI + GET.FOLLOW_EVENT + '?activity_id=' + param.eventID;
        }
        await axios
            .get(URL)
            .then(res => {
                let result = res.data;
                if (result.message == 'success') {
                    this.setState({
                        FollowerList: result.content,
                        isLoading: false,
                    });
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    }

    renderFollower = data => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    margin: pxToDp(10),
                    padding: pxToDp(10),
                    backgroundColor: white,
                    borderRadius: pxToDp(10),
                }}>
                <Text style={{color: black.second}}>{data.name + ', '}</Text>
                <Text style={{color: black.second}}>{data._id}</Text>
            </View>
        );
    };

    render() {
        const {FollowerList, isLoading} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'Follower'} />
                {FollowerList && FollowerList.length > 0 ? (
                    <FlatList
                        data={FollowerList}
                        renderItem={({item}) => this.renderFollower(item)}
                        keyExtractor={item => item.id}
                        refreshing={isLoading}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={this.state.isLoading}
                                onRefresh={() => {
                                    this.setState({isLoading: true});
                                    this.getFollow();
                                }}
                            />
                        }
                    />
                ) : (
                    <View
                        style={{alignSelf: 'center', justifyContent: 'center'}}>
                        <Text style={{color: black.third}}>
                            還沒有人follow喔
                        </Text>
                    </View>
                )}
            </View>
        );
    }
}

export default FollowersPage;
