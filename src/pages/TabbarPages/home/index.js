import React, {Component} from 'react';
import {
    ScrollView,
    Button,
    View,
    Text,
    Image,
    ImageBackground,
    SafeAreaView,
    Dimensions,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import ScrollImage from './components/ScrollImage';

import {Header, Divider} from 'react-native-elements'; // 4.0 Beta版
import {PageControl, Card} from 'react-native-ui-lib';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Carousel from 'react-native-reanimated-carousel';

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap';
import { pxToDp } from '../../../utils/stylesKits';

const {width: PAGE_WIDTH} = Dimensions.get('window');
let carouselProgress = 0;

export default class HomeScreen extends Component {
    state = {
        carouselImagesArr: [
            {
                title: '三月福利',
                uri: 'https://info.umsu.org.mo/storage/activity_covers/images/7332b858246993976a892b229e5942ab.jpg',
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

        functionArray:[
            {
                icon_name:'calendar-outline',
                onPress:"",// a function
                function_name:'校曆'
            },
            {
                icon_name:'paw-outline',
                function_name:'澳大論壇'
            },
            {
                icon_name:'file-tray-full-outline',
                function_name:'選咩課'
            },
            {
                icon_name:'book-outline',
                function_name:'UMMoodle'
            },
            {
                icon_name:'md-bus-outline',
                function_name:'校園巴士'
            },
      ]
    };

    GetFunctionIcon(icon_name,function_name){
        return(
          <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
              <Ionicons name={icon_name} size={pxToDp(30)} color={COLOR_DIY.themeColor}></Ionicons>
              <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>{function_name}</Text>
          </TouchableOpacity>
        )
    }

    constructor(props){
        super(props);
    }

    render() {
        const {carouselImagesArr} = this.state;

        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
            <Header
                backgroundColor={COLOR_DIY.bg_color}
                centerComponent={{
                    text: '澳大 UM ALL',
                    style: {
                        color: COLOR_DIY.black.main,
                        fontSize: pxToDp(15),
                    },
                }}
                statusBarProps={{backgroundColor:'transparent', barStyle:'dark-content'}}
            />
            <ScrollView>
                {/* 1.0 輪播圖組件 */}
                <ScrollImage imageData={carouselImagesArr}></ScrollImage>

                {/* 2.0 快捷功能入口卡片 開始 */}
                <View
                style={{
                    flex:1,
                    backgroundColor:COLOR_DIY.bg_color,
                    borderRadius:pxToDp(10),
                    margin:pxToDp(15),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow
                }}>
                    {/* 2.1 卡片標題 */}
                    <TouchableOpacity style={{
                        flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                        padding:pxToDp(12), }} activeOpacity={0.6}
                        onPress={()=>this.props.navigation.jumpTo('FeaturesTabbar')}
                    >
                        <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>查看更多</Text>
                        <Ionicons name='chevron-forward-outline' size={pxToDp(20)} color={COLOR_DIY.black.second}></Ionicons>
                    </TouchableOpacity>
                    {/* 2.2 卡片內容 */}
                    <View style={{
                        justifyContent:'space-between', alignItems:'flex-start', flexDirection:'row',
                        margin:pxToDp(10), marginTop:pxToDp(0), }}>
                        {/* 服務圖標與文字 */}
                        {/*<TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>*/}
                        {/*    <Ionicons name='calendar-outline' size={pxToDp(30)} color={COLOR_DIY.themeColor}></Ionicons>*/}
                        {/*    <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>校曆</Text>*/}
                        {/*</TouchableOpacity>*/}
                        {/*<TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>*/}
                        {/*    <Ionicons name='paw-outline' size={pxToDp(30)} color={COLOR_DIY.themeColor}></Ionicons>*/}
                        {/*    <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>澳大論壇</Text>*/}
                        {/*</TouchableOpacity>*/}
                        {/*<TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>*/}
                        {/*    <Ionicons name='file-tray-full-outline' size={pxToDp(30)} color={COLOR_DIY.themeColor}></Ionicons>*/}
                        {/*    <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>選咩課</Text>*/}
                        {/*</TouchableOpacity>*/}
                        {/*<TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>*/}
                        {/*    <Ionicons name='book-outline' size={pxToDp(30)} color={COLOR_DIY.themeColor}></Ionicons>*/}
                        {/*    <Text style={{fontSize:pxToDp(14), color:COLOR_DIY.black.second}}>UMMoodle</Text>*/}
                        {/*</TouchableOpacity>*/}
                        {/*<TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>*/}
                        {/*    <Ionicons name='md-bus-outline' size={pxToDp(30)} color={COLOR_DIY.themeColor}></Ionicons>*/}
                        {/*    <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>校園巴士</Text>*/}
                        {/*</TouchableOpacity>*/}
                        {this.state.functionArray.map(
                          (fn)=>
                            this.GetFunctionIcon(fn.icon_name,fn.function_name)
                        )}

                    </View>
                </View>
                {/* 2.0 快捷功能入口卡片 結束 */}

                {/* 3.0 我的追蹤卡片 開始 */}
                <View
                style={{
                    flex:1,
                    backgroundColor:COLOR_DIY.bg_color,
                    borderRadius:pxToDp(10),
                    margin:pxToDp(15),
                    marginTop:pxToDp(5),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow
                }}>
                    {/* 3.1 卡片標題 */}
                    <TouchableOpacity
                    style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:pxToDp(12)}}
                    activeOpacity={0.6}
                    onPress={()=>alert('未綁定跳轉路由')}
                    >
                        <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>我的追蹤</Text>
                        <Ionicons name='chevron-forward-outline' size={pxToDp(20)} color={COLOR_DIY.black.second}></Ionicons>
                    </TouchableOpacity>
                    {/* 3.2 卡片內容 */}
                    <View style={{justifyContent:'space-around', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(0), flexDirection:'row'}}>
                        {/* 服務圖標與文字 */}
                        <TouchableOpacity style={{justifyContent:'flex-start', flexDirection:'column'}}>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>MATH1003 (002)</Text>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.third}}>地點：E22-4012</Text>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.third}}>時間：8:30 - 9:15</Text>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.third}}>講者：Michael</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{justifyContent:'flex-start', flexDirection:'column'}}>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>爬蟲工作坊</Text>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.third}}>地點：E6-G007</Text>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.third}}>時間：10:30 - 11:30</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* 3.0 我的追蹤卡片 結束 */}

                {/* 4.0 新聞資訊卡片 開始 */}
                <View
                style={{
                    flex:1,
                    backgroundColor:COLOR_DIY.bg_color,
                    borderRadius:pxToDp(10),
                    margin:pxToDp(15),
                    marginTop:pxToDp(5),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow
                }}>
                    {/* 4.1 卡片標題 */}
                    <TouchableOpacity
                    style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:pxToDp(12)}}
                    activeOpacity={0.6}
                    onPress={()=>this.props.navigation.jumpTo('NewsTabbar')}
                    >
                        <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>UM 資訊</Text>
                        <Ionicons name='chevron-forward-outline' size={pxToDp(20)} color={COLOR_DIY.black.second}></Ionicons>
                    </TouchableOpacity>
                    {/* 4.2 卡片內容 */}
                    <View style={{justifyContent:'space-around', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(0), flexDirection:'column'}}>
                        {/* 文字 */}
                        <TouchableOpacity style={{justifyContent:'flex-start', flexDirection:'column'}}>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>Temporarily Closure of the UM Campus</Text>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>澳大校園暫停對外開放</Text>
                        </TouchableOpacity>
                        {/* 分割線 */}
                        <View style={{justifyContent:'center', alignItems:'center', width:'100%', marginTop:pxToDp(5), marginBottom:pxToDp(5)}}>
                            <Divider style={{width:"90%"}} color={COLOR_DIY.black.second} />
                        </View>
                        <TouchableOpacity style={{justifyContent:'flex-start', flexDirection:'column'}}>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>UM study imrpoves performance of formalde...</Text>
                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.second}}>澳大最新研究提高甲醛檢測靈敏度</Text>
                        </TouchableOpacity>
                    </View>
                </View>
                {/* 4.0 新聞資訊卡片 結束 */}

                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
            </ScrollView>
            </View>
        );
    }
}
