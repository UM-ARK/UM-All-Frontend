import React, {Component} from 'react';
import {
    Dimensions,
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    Button,
    Image,
} from 'react-native';

import {COLOR_DIY} from '../src/utils/uiMap';
import { pxToDp } from '../src/utils/stylesKits';

// 文檔：https://github.com/dohooo/react-native-reanimated-carousel/
import Carousel from 'react-native-reanimated-carousel';
import {Header} from 'react-native-elements'; // 4.0 Beta版
import {NavigationContext} from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons';

import Modal from 'react-native-modal';
import ImageViewer from 'react-native-image-zoom-viewer';

const {width: PAGE_WIDTH} = Dimensions.get('window');


const images = [
    {
        url: 'https://avatars2.githubusercontent.com/u/7970947?v=3&s=460',
    },
    {
        url: 'http://img.netbian.com/file/2021/0615/small7afca70a01630451d1c474fd318df5c01623728557.jpg',
    },
    {
        url: 'http://img.netbian.com/file/2021/0527/small2998966e25f9370d55e4672ade1013dc1622123475.jpg',
    },
];


class TestScreen extends Component {
    // static contextType = NavigationContext;
    // this.context === this.props.navigation

    state = {
        isModalVisible : false,
        imagesIndex : 0,
    }

    tiggerModal = (index) => {
        this.setState({
            isModalVisible:!this.state.isModalVisible,
            imagesIndex:index,
        });
    }
    
    render() {
        const {isModalVisible, imagesIndex} = this.state;

        return (
            <View style={{flex: 1, backgroundColor:COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    leftComponent={
                        <TouchableOpacity onPress={()=>this.props.navigation.goBack()}>
                            <Ionicons
                                name="chevron-back-outline"
                                size={pxToDp(25)}
                                color={COLOR_DIY.black.main}
                            />
                        </TouchableOpacity>
                    }
                    centerComponent={{
                        text: '測試頁',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(22),
                        },
                    }}
                    statusBarProps={{backgroundColor:COLOR_DIY.bg_color, barStyle:'dark-content'}}
                />

                <Modal isVisible={isModalVisible} statusBarTranslucent={true} style={{margin:0}} >
                    <ImageViewer 
                        imageUrls={images}
                        // 打開的imageUrls的索引
                        index={imagesIndex}
                        onClick={this.tiggerModal}
                        enableSwipeDown={true}
                        onSwipeDown={this.tiggerModal}
                        menuContext={{ saveToLocal: '保存圖片', cancel: '取消' }} 
                        onSave={() => alert("點擊了保存圖片")}
                    />
                </Modal>

                {/* 圖片展示 */}
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    {
                        images.map(({url}, index)=> 
                            <TouchableOpacity onPress={this.tiggerModal.bind(this,index)}>
                                <Image source={{uri:url}} style={{width:100, height:100}} ></Image>
                            </TouchableOpacity>
                        )
                    }
                </View>

                <Button title='打開圖片' onPress={this.tiggerModal.bind(this,0)}></Button>
            </View>
        );
    }
}

export default TestScreen;
