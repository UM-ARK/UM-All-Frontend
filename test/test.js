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
    ScrollView,
} from 'react-native';

import {COLOR_DIY} from '../src/utils/uiMap';
import {pxToDp} from '../src/utils/stylesKits';

// 文檔：https://github.com/dohooo/react-native-reanimated-carousel/
import Carousel from 'react-native-reanimated-carousel';
import {Header} from '@rneui/themed';
import {NavigationContext} from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Modal from 'react-native-modal';
import ImageViewer from 'react-native-image-zoom-viewer';

const {width: PAGE_WIDTH} = Dimensions.get('window');
const {height: PAGE_HEIGHT} = Dimensions.get('screen');

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

import ImageScrollViewer from '../src/components/ImageScrollViewer';
import ModalBottom from '../src/components/ModalBottom';

class TestScreen extends Component {
    // static contextType = NavigationContext;
    // this.context === this.props.navigation

    state = {
        isModalVisible: false,
        imagesIndex: 0,
        isModalBottomVisible: true,
        isShow: false,
    };

    // 打開和關閉顯示照片的彈出層
    tiggerModal = () => {
        this.setState({
            isModalVisible: !this.state.isModalVisible,
        });
    };
    // 打開圖片數組內的某張圖片
    handleOpenImage = index => {
        this.setState({
            imagesIndex: index,
            isModalVisible: true,
        });
    };

    tiggerModalBottom = () => {
        this.setState({isShow: !this.state.isShow});
    };

    render() {
        const {isModalVisible, isModalBottomVisible, imagesIndex} = this.state;

        console.log(this.state.isShow);

        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    leftComponent={
                        <TouchableOpacity
                            onPress={() => this.props.navigation.goBack()}>
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
                    statusBarProps={{
                        backgroundColor: COLOR_DIY.bg_color,
                        barStyle: 'dark-content',
                    }}
                />

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={images}
                    // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                    // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                {/* 圖片展示 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                    }}>
                    {images.map(({url}, index) => (
                        <TouchableOpacity
                            onPress={() =>
                                this.refs.imageScrollViewer.handleOpenImage(
                                    index,
                                )
                            }>
                            <Image
                                source={{uri: url}}
                                style={{width: 100, height: 100}}></Image>
                        </TouchableOpacity>
                    ))}
                </View>

                <Button
                    title="打開圖片"
                    onPress={() => {
                        this.refs.imageScrollViewer.tiggerModal();
                    }}></Button>

                {/* 展示Modal */}
                {this.state.isShow && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                padding: pxToDp(20),
                                height: PAGE_HEIGHT * 0.7,
                            }}>
                            <ScrollView>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                                <Text>Test</Text>
                            </ScrollView>
                        </View>
                    </ModalBottom>
                )}

                <Button
                    title="打開ModalBottom"
                    onPress={() => this.tiggerModalBottom()}></Button>
            </View>
        );
    }
}

export default TestScreen;
