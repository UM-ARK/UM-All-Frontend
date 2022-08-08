import React, {Component} from 'react';
import {
    ScrollView,
    View,
    Text,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {UM_WHOLE, WHAT_2_REG} from '../../../utils/pathMap';
import ScrollImage from './components/ScrollImage';
import ModalBottom from '../../../components/ModalBottom';

import {Header, Divider} from '@rneui/themed';
import {PageControl, Card} from 'react-native-ui-lib';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Carousel from 'react-native-reanimated-carousel';
import {FlatGrid} from 'react-native-super-grid';
import {inject} from 'mobx-react';
import Toast, {DURATION} from 'react-native-easy-toast';

const {width: PAGE_WIDTH} = Dimensions.get('window');
let carouselProgress = 0;

const {white, bg_color, black, themeColor} = COLOR_DIY;

class HomeScreen extends Component {
    state = {
        // 首頁輪播圖數據
        carouselImagesArr: [
            {
                title: '澳大對外暫時僅提供有限度服務',
                uri: 'https://www.um.edu.mo/wp-content/uploads/2022/07/271267-270507-1.jpeg',
            },
            {
                title: '校園Vlog大賽',
                uri: 'https://info.umsu.org.mo/storage/activity_covers/images/13a5158b6a890818615af9bcff8bc81b.png',
            },
            {
                title: '香水工作坊',
                uri: 'https://info.umsu.org.mo/storage/activity_covers/images/c8049bf0ebd8ea081e75f1c1573631f2.png',
            },
            {
                title: '網絡爬蟲工作坊',
                uri: 'https://www.cpsumsu.org/_announcement/CPSUMSU_Web_Crawler_Workshop2022/poster.jpg',
            },
            {
                title: '澳大電競節2022',
                uri: 'https://www.cpsumsu.org/_announcement/CPSUMSU_UMEF2022_postpone/279037122_5018677904858794_5613582783794191615_n.jpg',
            },
            {
                title: '遊戲設計工作坊',
                uri: 'https://www.cpsumsu.org/_announcement/Game_Design_Workshop2022/img/poster.jpg',
            },
        ],

        // 快捷功能入口
        functionArray: [
            {
                icon_name: 'bus',
                function_name: '校園巴士',
                func: () => this.props.navigation.navigate('Bus'),
            },
            {
                icon_name: 'aperture-sharp',
                function_name: '最近活動',
                func: () =>
                    this.props.navigation.jumpTo('NewsTabbar', {
                        screen: 'EventPage',
                    }),
            },
            {
                icon_name: 'color-wand',
                function_name: '澳大社團',
                func: () =>
                    this.props.navigation.jumpTo('NewsTabbar', {
                        screen: 'ClubPage',
                    }),
            },
            {
                icon_name: 'earth-sharp',
                function_name: '澳大新聞',
                func: () =>
                    this.props.navigation.jumpTo('NewsTabbar', {
                        screen: 'NewsPage',
                    }),
            },
            {
                icon_name: 'grid',
                function_name: '所有服務',
                func: () => this.props.navigation.jumpTo('FeaturesTabbar'),
            },
        ],

        isShowModal: false,
    };

    componentDidMount() {
        let globalData = this.props.RootStore;
        // 已登錄學生賬號
        if (globalData.userInfo && globalData.userInfo.stdData) {
            this.setState({isShowModal: false});
            this.toast.show(`Welcome Back~\n[]~(￣▽￣)~*`, 3000);
        } else {
            setTimeout(() => {
                this.setState({isShowModal: true});
            }, 1500);
        }
    }

    // 渲染快捷功能卡片的圖標
    GetFunctionIcon = ({icon_name, function_name, func}) => {
        return (
            <TouchableOpacity
                style={{
                    justifyContent: 'center',
                    alignItems: 'center',
                }}
                onPress={func}>
                <Ionicons
                    name={icon_name}
                    size={pxToDp(35)}
                    color={COLOR_DIY.themeColor}></Ionicons>
                <Text
                    style={{
                        fontSize: pxToDp(12),
                        color: COLOR_DIY.black.second,
                    }}>
                    {function_name}
                </Text>
            </TouchableOpacity>
        );
    };

    // 打開/關閉底部Modal
    tiggerModalBottom = () => {
        this.setState({isShowModal: !this.state.isShowModal});
    };

    render() {
        const {carouselImagesArr} = this.state;

        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                <Header
                    backgroundColor={white}
                    centerComponent={{
                        text: 'UM ALL',
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
                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* 輪播圖 */}
                    <View style={{backgroundColor: white}}>
                        <ScrollImage imageData={carouselImagesArr} />

                        {/* 快捷功能入口卡片 */}
                        <View style={{marginTop: pxToDp(10)}}>
                            {/* 快捷功能圖標 */}
                            <FlatGrid
                                maxItemsPerRow={5}
                                itemDimension={pxToDp(50)}
                                spacing={pxToDp(10)}
                                data={this.state.functionArray}
                                renderItem={({item}) => {
                                    return this.GetFunctionIcon(item);
                                }}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={false}
                            />
                        </View>
                    </View>

                    <View
                        style={{
                            alignItems: 'center',
                            marginTop: pxToDp(10),
                            backgroundColor: white,
                            paddingVertical: pxToDp(10),
                        }}>
                        <Text style={{color: black.second, fontSize: 15}}>
                            {`歡迎來到UM ALL~`}
                        </Text>

                        <Text
                            style={{color: black.third, marginTop: pxToDp(5)}}>
                            您可能想先了解：
                        </Text>
                        <TouchableOpacity
                            style={styles.buttonContainer}
                            activeOpacity={0.8}
                            onPress={() => {
                                this.props.navigation.navigate('AboutUs');
                            }}>
                            <Text style={{color: white}}>{`這個APP是?`}</Text>
                        </TouchableOpacity>

                        <Text
                            style={{color: black.third, marginTop: pxToDp(5)}}>
                            如果你是新同學...
                        </Text>
                        <TouchableOpacity
                            style={styles.buttonContainer}
                            activeOpacity={0.8}
                            onPress={() => {
                                alert('跳轉迎新欄目');
                            }}>
                            <Text style={{color: white}}>{`我是萌新`}</Text>
                        </TouchableOpacity>

                        <Text
                            style={{color: black.third, marginTop: pxToDp(5)}}>
                            您可能還有一肚子疑問...
                        </Text>
                        <TouchableOpacity
                            style={styles.buttonContainer}
                            activeOpacity={0.8}
                            onPress={() => {
                                this.props.navigation.navigate('UsualQuestion');
                            }}>
                            <Text style={{color: white}}>{`嗯嗯嗯???`}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* 快速填充功能提示 */}
                    <View
                        style={{
                            alignItems: 'center',
                            marginTop: pxToDp(10),
                            backgroundColor: white,
                            paddingVertical: pxToDp(10),
                        }}>
                        <Text style={{color: black.third}}>
                            {`UM Pass頁面需要重新輸入賬號？`}
                        </Text>
                        <TouchableOpacity
                            style={styles.buttonContainer}
                            activeOpacity={0.8}
                            onPress={() => {
                                this.props.navigation.navigate('LoginSetting');
                            }}>
                            <Text style={{color: white}}>
                                {`啟用自動填充功能`}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{marginBottom: pxToDp(50)}} />
                </ScrollView>

                {/* 彈出提示登錄的Modal */}
                {this.state.isShowModal && (
                    <ModalBottom cancel={this.tiggerModalBottom}>
                        <View
                            style={{
                                padding: pxToDp(20),
                                backgroundColor: COLOR_DIY.white,
                            }}>
                            <ScrollView
                                contentContainerStyle={{
                                    alignItems: 'center',
                                    marginBottom: pxToDp(30),
                                }}>
                                <Text
                                    style={{
                                        fontSize: pxToDp(18),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    歡迎來到UM ALL~
                                </Text>
                                <Text
                                    style={{
                                        fontSize: pxToDp(15),
                                        color: COLOR_DIY.black.third,
                                    }}>
                                    登錄後體驗完整功能，現在去嗎？
                                </Text>
                                {/* 登錄按鈕 */}
                                <TouchableOpacity
                                    activeOpacity={0.8}
                                    style={{
                                        marginTop: pxToDp(10),
                                        backgroundColor: COLOR_DIY.themeColor,
                                        padding: pxToDp(10),
                                        borderRadius: pxToDp(10),
                                        justifyContent: 'center',
                                        alignSelf: 'center',
                                    }}
                                    onPress={() => {
                                        this.setState({isShowModal: false});
                                        this.props.navigation.jumpTo(
                                            'MeTabbar',
                                        );
                                    }}>
                                    <Text
                                        style={{
                                            fontSize: pxToDp(15),
                                            color: 'white',
                                            fontWeight: '500',
                                        }}>
                                        現在登錄
                                    </Text>
                                </TouchableOpacity>
                            </ScrollView>
                        </View>
                    </ModalBottom>
                )}

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
    buttonContainer: {
        marginTop: pxToDp(5),
        backgroundColor: themeColor,
        padding: pxToDp(10),
        borderRadius: pxToDp(10),
    },
});

export default inject('RootStore')(HomeScreen);
