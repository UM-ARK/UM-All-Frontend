import React, {Component} from 'react';
import {
    ScrollView,
    View,
    Text,
    Dimensions,
    TouchableOpacity,
} from 'react-native';

import ScrollImage from './components/ScrollImage';

import tw from 'twrnc';
import {Header, Divider} from '@rneui/themed';
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
        // 首頁輪播圖數據
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

        // 快捷功能入口
        functionArray:[
            {
                icon_name:'calendar',
                function_name:'校曆',
                // 路由跳轉的名字，要在Nav.js先聲明
                routeName:'',
            },
            {
                icon_name:'compass',
                function_name:'澳大論壇',
                routeName:'UMWhole',
            },
            {
                icon_name:'file-tray-full',
                function_name:'選咩課',
                routeName:'What2Reg',
            },
            {
                icon_name:'book',
                function_name:'Moodle',
                routeName:'',
            },
            {
                icon_name:'bus',
                function_name:'校園巴士',
                routeName:'',
            },
        ],

        // 我的追蹤 資訊
        activityInfo:[
            {
                title:"MATH1003(002)",
                info:[
                    [
                        {
                            type:0,  //tag
                            content:"@"
                        },
                        {
                            type:1,  //tag
                            content:"E22-4012"
                        }
                    ],
                    [
                        {
                            type:0,  //tag
                            content:"from"
                        },
                        {
                            type:1,  //tag
                            content:"8:30"
                        },
                        {
                            type:0,  //tag
                            content:"to"
                        },
                        {
                            type:1,  //tag
                            content:"9:30"
                        },
                    ],
                    [
                        {
                            type:0,  //tag
                            content:"by"
                        },
                        {
                            type:1,  //tag
                            content:"Michael"
                        }
                    ]
                ]
            },
            {
                title:"爬虫工作坊",
                info:[
                    [
                        {
                            type:0,  //tag
                            content:"@"
                        },
                        {
                            type:1,  //tag
                            content:"E6-G007"
                        }
                    ],
                    [
                        {
                            type:0,  //tag
                            content:"from"
                        },
                        {
                            type:1,  //tag
                            content:"10:30"
                        },
                        {
                            type:0,  //tag
                            content:"to"
                        },
                        {
                            type:1,  //tag
                            content:"11:30"
                        },
                    ],
                ]
            }
        ],

        // 新聞卡片 資訊
        newsArr:[
            {
                en:"Temporarily Closure of the UM Campus",
                zh_cn:'澳大校園暫停對外開放'
            },
            {
                en:"UM study imrpoves performance of formalde...",
                zh_cn:'澳大最新研究提高甲醛檢測靈敏度'
            },
        ],
    };

    // 渲染快捷功能卡片的圖標
    GetFunctionIcon=(icon_name,function_name,route_name)=>{
        return(
            <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}
            onPress={()=>this.props.navigation.navigate(route_name)}>
                <Ionicons name={icon_name} size={pxToDp(35)} color={COLOR_DIY.themeColor}></Ionicons>
                <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>{function_name}</Text>
            </TouchableOpacity>
        )
    }

    GetSubActivityInfoTag(content){
        return(
          <View style={{
              borderColor:COLOR_DIY.themeColor,
              borderWidth:pxToDp(1),
              // backgroundColor:COLOR_DIY.themeColor,
              paddingHorizontal:pxToDp(3),
              borderRadius:pxToDp(6),
              paddingVertical:pxToDp(0)
          }}>
              <Text style={{
                  fontSize:pxToDp(11),
                  color:COLOR_DIY.themeColor,
              }}>
                  {content}
              </Text>
          </View>
        )
    }

    GetSubActivityInfoContent(content){
        return(
            <Text style={{
                marginHorizontal:pxToDp(4),
                fontSize:pxToDp(12),
                paddingVertical:pxToDp(0),
                color:COLOR_DIY.black.second
            }}>
                {content}
            </Text>
        )
    }


    GetActivityInfoCard(content){
        return(
            <TouchableOpacity style={{ marginVertical:pxToDp(5)}}>
                <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.main}}>{content.title}</Text>
                {content.info.map((line)=>{
                    return(
                        <View style={[{marginVertical:pxToDp(1)},tw.style('flex','flex-row')]}>
                            {line.map((subcontent)=>{
                                if (subcontent.type==0){
                                    return(
                                        this.GetSubActivityInfoTag(subcontent.content)
                                    )
                                }
                                else {
                                    return (
                                        this.GetSubActivityInfoContent(subcontent.content)
                                    )
                                }
                            })}
                        </View>
                    )
                })}
            </TouchableOpacity>
        )
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
                    marginHorizontal:pxToDp(15),
                    // marginVertical:pxToDp(5),
                    // 增加陰影
                    marginBottom:pxToDp(8),
                    marginTop:pxToDp(10),
                    ...COLOR_DIY.viewShadow
                }}>
                    {/* 2.1 卡片標題 */}
                    <TouchableOpacity style={{
                        flexDirection:'row', justifyContent:'space-between', alignItems:'center',
                        paddingVertical:pxToDp(10), paddingHorizontal:pxToDp(10)}} activeOpacity={0.6}
                        onPress={()=>this.props.navigation.jumpTo('FeaturesTabbar')}
                    >
                        <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.main,fontWeight:'bold'}} >查看更多</Text>
                        <Ionicons name='chevron-forward-outline' size={pxToDp(14)} color={COLOR_DIY.black.main}></Ionicons>
                    </TouchableOpacity>
                    {/* 2.2 卡片內容 */}
                    <View style={{
                        justifyContent:'space-between', alignItems:'flex-start', flexDirection:'row',
                        margin:pxToDp(10), marginTop:pxToDp(0), }}>
                        {/* 服務圖標與文字 */}
                        {this.state.functionArray.map( (fn)=>
                            this.GetFunctionIcon(fn.icon_name,fn.function_name,fn.routeName)
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
                    marginHorizontal:pxToDp(15),
                    marginVertical:pxToDp(8),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow
                }}>
                    {/* 3.1 卡片標題 */}
                    <TouchableOpacity
                    style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center',paddingTop:pxToDp(10),
                        paddingHorizontal:pxToDp(10)}}
                    activeOpacity={0.6}
                    onPress={()=>alert('未綁定跳轉路由')}
                    >
                        <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.main,fontWeight:'bold'}}>我的追蹤</Text>
                        <Ionicons name='chevron-forward-outline' size={pxToDp(14)} color={COLOR_DIY.black.main}></Ionicons>
                    </TouchableOpacity>
                    {/* 3.2 卡片內容 */}
                    <View style={{marginHorizontal:pxToDp(10), marginBottom:pxToDp(10)}}>
                        {/* 服務圖標與文字 */}
                        {
                            this.state.activityInfo.map((activity)=>{
                                return(
                                    this.GetActivityInfoCard(activity)
                                )
                            })
                        }
                    </View>
                </View>
                {/* 3.0 我的追蹤卡片 結束 */}

                {/* 4.0 新聞資訊卡片 開始 */}
                <View
                style={{
                    flex:1,
                    backgroundColor:COLOR_DIY.bg_color,
                    borderRadius:pxToDp(10),
                    marginHorizontal:pxToDp(15),
                    marginVertical:pxToDp(8),
                    // 增加陰影
                    ...COLOR_DIY.viewShadow
                }}>
                    {/* 4.1 卡片標題 */}
                    <TouchableOpacity
                    style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:pxToDp(10),paddingVertical:pxToDp(10)}}
                    activeOpacity={0.6}
                    onPress={()=>this.props.navigation.jumpTo('NewsTabbar')}
                    >
                        <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.main,fontWeight:'bold'}}>UM 資訊</Text>
                        <Ionicons name='chevron-forward-outline' size={pxToDp(14)} color={COLOR_DIY.black.main}></Ionicons>
                    </TouchableOpacity>
                    {/* 4.2 卡片內容 */}
                    <View style={{justifyContent:'space-around', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(0), flexDirection:'column'}}>
                        {/* 文字 */}
                        {this.state.newsArr.map((news)=>{
                            if (this.state.newsArr.indexOf(news)!=this.state.newsArr.length-1){
                                return (
                                        [<TouchableOpacity style={{justifyContent:'flex-start', flexDirection:'column'}}>
                                            <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.main}}>{news.en}</Text>
                                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>{news.zh_cn}</Text>
                                        </TouchableOpacity>,
                                        <View style={{justifyContent:'center', alignItems:'center', width:'100%', marginTop:pxToDp(5), marginBottom:pxToDp(5)}}>
                                            <Divider style={{width:"100%"}} color={COLOR_DIY.black.second} />
                                        </View>]
                                )
                            }
                            else {
                                return (
                                    <TouchableOpacity style={{justifyContent:'flex-start', flexDirection:'column'}}>
                                        <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.main}}>{news.en}</Text>
                                        <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>{news.zh_cn}</Text>
                                    </TouchableOpacity>

                                )
                            }

                        })}

                        {/* 分割線 */}

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
