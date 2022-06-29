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
import {Header} from '@rneui/themed';
import {NavigationContext} from '@react-navigation/native'
import Ionicons from 'react-native-vector-icons/Ionicons';

import Modal from 'react-native-modal';
import ImageViewer from 'react-native-image-zoom-viewer';
import ModalBottom from './modalTest'

const { width: PAGE_WIDTH} = Dimensions.get('window');
const { height:PAGE_HEIGHT } = Dimensions.get('screen');


const images = [
    {
        url: 'https://info.umsu.org.mo/storage/activity_covers/images/13a5158b6a890818615af9bcff8bc81b.png',
    },
    {
        url: 'https://info.umsu.org.mo/storage/activity_covers/images/c8049bf0ebd8ea081e75f1c1573631f2.png',
    },
    {
        url: 'https://www.cpsumsu.org/_announcement/CPSUMSU_Web_Crawler_Workshop2022/poster.jpg',
    },
];


class TestScreen extends Component {
    // static contextType = NavigationContext;
    // this.context === this.props.navigation

    state = {
        isModalVisible       : false,
        imagesIndex          : 0,
        isModalBottomVisible : true,
    }

    // 打開和關閉顯示照片的彈出層
    tiggerModal = () => {
        this.setState({
            isModalVisible:!this.state.isModalVisible,
        });
    }
    // 打開圖片數組內的某張圖片
    handleOpenImage = (index) => {
        this.setState({
            imagesIndex:index,
            isModalVisible:true
        });
    }
    
    render() {
        const {isModalVisible, isModalBottomVisible, imagesIndex} = this.state;

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

                {/* 彈出層展示圖片查看器 */}
                <Modal 
                    isVisible={isModalVisible} 
                    statusBarTranslucent
                    style={{margin:0, paddingLeft:pxToDp(16), paddingRight:pxToDp(16)}}
                    deviceHeight={PAGE_HEIGHT}
                    backdropColor={'black'}
                    backdropOpacity={0.85}
                    onBackButtonPress={this.tiggerModal}
                    onBackdropPress={this.tiggerModal}
                >
                    <ImageViewer 
                        backgroundColor={'transparent'}
                        useNativeDriver={true}
                        imageUrls={images}
                        // 打開的imageUrls的索引
                        index={imagesIndex}
                        // 注釋掉renderIndicator屬性則 默認會有頁數顯示
                        renderIndicator={()=>null}
                        onClick={this.tiggerModal}
                        doubleClickInterval={300}
                        enableSwipeDown={true}
                        onSwipeDown={this.tiggerModal}
                        // 自定義長按菜單
                        menus={({cancel,_}) => <ModalBottom cancel={cancel}></ModalBottom> }
                    />
                </Modal>


                {/* 圖片展示 */}
                <View style={{flexDirection:'row', justifyContent:'space-between'}}>
                    {
                        images.map(({url}, index)=> 
                            <TouchableOpacity onPress={()=>this.handleOpenImage(index)}>
                                <Image source={{uri:url}} style={{width:100, height:100}} ></Image>
                            </TouchableOpacity>
                        )
                    }
                </View>

                <Button title='打開圖片' onPress={this.tiggerModal}></Button>
            </View>
        );
    }
}

export default TestScreen;
