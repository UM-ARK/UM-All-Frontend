import React, {Component} from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Dimensions,
} from 'react-native';

import {BASE_URI, GET, POST} from '../../../../../utils/pathMap';
import {COLOR_DIY} from '../../../../../utils/uiMap';
import {pxToDp} from '../../../../../utils/stylesKits';
import Header from '../../../../../components/Header';
import ClubCard from '../../../news/components/ClubCard';

import Ionicons from 'react-native-vector-icons/Ionicons';
import {FlatGrid} from 'react-native-super-grid';
import axios from 'axios';

const {bg_color, white, black, viewShadow, themeColor} = COLOR_DIY;
const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.25;

// 返回數據的頁數
class FollowEvent extends Component {
    state = {
        clubDataList: undefined,
        noMoreData: false,
    };

    componentDidMount() {
        this.getFollowClubs();
    }

    async getFollowClubs() {
        const {clubDataList} = this.state;
        let URL = BASE_URI + GET.FOLLOW_CLUB;
        await axios
            .get(URL)
            .then(res => {
                let json = res.data;
                if (json.message == 'success') {
                    this.setState({clubDataList: json.content});
                }
            })
            .catch(err => console.log('err', err));
    }

    renderClub = () => {
        const {clubDataList} = this.state;
        console.log('clubDataList', clubDataList);
        return clubDataList != undefined && clubDataList.length > 0 ? (
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
            />
        ) : (
            <View style={{alignItems: 'center'}}>
                <Text style={{color: black.third}}>
                    你還沒有follow的組織，快去follow一些吧~
                </Text>
                <Text>[]~(￣▽￣)~*</Text>
            </View>
        );
    };

    render() {
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'Follow的組織'} />

                {/* 渲染所有組織 */}
                {this.renderClub()}
            </View>
        );
    }
}

export default FollowEvent;
