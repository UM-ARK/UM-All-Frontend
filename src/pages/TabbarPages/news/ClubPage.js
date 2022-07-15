import React, {Component} from 'react';
import {
    Text,
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

import ClubCard from './components/ClubCard';

import {FlatGrid} from 'react-native-super-grid';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.25;

// 防誤觸時間，理論越長越穩
const PREVENT_TOUCH_TIME = 500;

// 模擬數據庫data
const dataList = [
    // 學生會
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/b102db05ad99f5ff98d09748a91253d8.png',
        name: '榮譽學院學生會',
        enName: 'Honours College Student Association',
        shortName: 'HCSA',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/f85dbcd0a77281c42d4d086051f17e6e.jpg',
        name: '科技學院學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/f9002220e643e42bdc03e9db73cd93df.jpg',
        name: '宿生交流學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/04b9ef947c7e7b66a6f36d7b8b1f5f8e.jpg',
        name: '人文學院學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/1581d6b877ad11ee55dabcbd73737203.png',
        name: '工商管理學院學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/64ea05b4a753a588c658f7baefc56629.jpg',
        name: '教育學院學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/89fedd00ef48ac6df13f29b5e94c5e66.png',
        name: '健康科學學院學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/41ff94f23b19494f6f0ff27d031904cb.gif',
        name: '法學院學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/50bd112bbd5cc6bc5a7b0d08ffa673a8.png',
        name: '社會科學學院學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/956baf9ef9e5565468d28b81813d7d16.jpg',
        name: '內地學生會',
        tag: '學生會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/0034c98c66f62c4c4677db651dc75e10.jpg',
        name: '國際學生會',
        tag: '學生會',
    },

    // 學會
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/d214b5a53f9854c1e698c2bb263402e9.png',
        name: '電機暨電子工程師學會',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/49a5595ffd1938a3357b911b44f9d8d1.jpg',
        name: '工程及科技學會香港分會青年會員部澳門學生支部',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/54435abf9d3b21a3e5f12abd31fba2cb.png',
        name: '澳門工程師學會學生分部',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
        name: '電腦學會',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/47b7f10875c695e57cd489b08277c4f3.png',
        name: '會計學會',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/5ee2e4d93bd96a9f81341884cea2f287.jpg',
        name: '澳門大學學生會美國土木工程師學會國際學生會澳門大學土木及環境工程學系學生支部',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/781773791780b358180999fbd55d572a.png',
        name: '傳播學會',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/a69c815ad5d5631d29aac5a5636f7a20.png',
        name: '數學及交叉學科建模學會',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/052f987aadf028c529523cc8f6e7e572.jpg',
        name: '金融學會',
        tag: '學會',
    },
    {
        imgUrl: 'https://info.umsu.org.mo/storage/affiliate/images/78fd59b6c9edbe60612c57a3336cf801.jpg',
        name: '歷史學學會',
        tag: '學會',
    },
];

class ClubPage extends Component {
    componentWillUnmount() {
        // 如果存在this.timer，则使用clearTimeout清空。
        // 如果你使用多个timer，那么用多个变量，或者用个数组来保存引用，然后逐个clear
        this.timer && clearTimeout(this.timer);
    }

    render() {
        return (
            <View style={{flex: 1}}>
                <FlatGrid
                    style={{flex: 1}}
                    // 每个项目的最小宽度或高度（像素）
                    itemDimension={COMPONENT_WIDTH}
                    data={dataList}
                    // 每個項目的間距
                    spacing={pxToDp(12)}
                    renderItem={({item, index}) => {
                        // item是每一項數組的數據
                        // index是每一項的數組下標
                        return (
                            <View style={{flex: 1}}>
                                <ClubCard data={item} index={index}></ClubCard>
                            </View>
                        );
                    }}
                    // 所有項目末尾渲染，防Tabbar遮擋
                    ListFooterComponent={() => (
                        <View style={{marginTop: pxToDp(50)}}></View>
                    )}
                />
            </View>
        );
    }
}

export default ClubPage;
