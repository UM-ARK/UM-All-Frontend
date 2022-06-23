import React, { Component } from "react";
import {
    ScrollView,
    Text,
    View,
    TouchableOpacity,
} from "react-native";

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'

import {Header} from 'react-native-elements'; // 4.0 Beta版
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import FontAwesome from 'react-native-vector-icons/FontAwesome';

class Index extends Component {
    state = {  } 
    render() { 
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
            <ScrollView>
                <Header
                    backgroundColor={COLOR_DIY.bg_color}
                    centerComponent={{
                        text: '服務',
                        style: {
                            color: COLOR_DIY.black.main,
                            fontSize: pxToDp(15),
                        },
                    }}
                    statusBarProps={{backgroundColor:'transparent', barStyle:'dark-content'}}
                />

                {/* 1.0 吸頂分類標籤 開始 */}
                {/* TODO: 吸頂分類選擇 */}
                {/* 1.0 吸頂分類標籤 結束 */}

                {/* 2.0 分類 - 校園服務 */}
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
                    {/* 2.1 卡片標題 */}
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:pxToDp(12)}}>
                        <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.main, fontWeight:'bold'}}>校園服務</Text>
                    </View>
                    {/* 2.2 卡片內容 - 第1行 */}
                    <View style={{justifyContent:'space-between', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(5), flexDirection:'row'}}>
                        {/* 服務圖標與文字 */}
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='md-bus-sharp' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>校園巴士</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='md-calendar' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>校曆</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='map' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>校園地圖</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialIcons name='local-parking' size={pxToDp(33)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>車位</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='md-logo-dropbox' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>資源借用</Text>
                        </TouchableOpacity>
                    </View>
                    {/* 2.2 卡片內容 - 第2行 */}
                    <View style={{justifyContent:'space-between', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(5), flexDirection:'row'}}>
                        {/* 服務圖標與文字 */}
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialIcons name='monitor' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>電腦預約</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialCommunityIcons name='file-cabinet' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>儲物箱租借</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialCommunityIcons name='hammer-wrench' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>維修預約</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='print' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>打印</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialIcons name='sports-handball' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>體育預訂</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 3.0 分類 - 生活小幫手 */}
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
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:pxToDp(12)}}>
                        <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.main, fontWeight:'bold'}}>生活小幫手</Text>
                    </View>
                    {/* 3.2 卡片內容 - 第1行 */}
                    <View style={{justifyContent:'flex-start', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(5), flexDirection:'row'}}>
                        {/* 服務圖標與文字 */}
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='paw-outline' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>澳大論壇</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={{marginLeft:pxToDp(15), justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialCommunityIcons name='face-mask' size={pxToDp(31)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>防疫要求</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* 4.0 分類 - 課業與發展 */}
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
                    <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center', padding:pxToDp(12)}}>
                        <Text style={{fontSize:pxToDp(15), color:COLOR_DIY.black.main, fontWeight:'bold'}}>課業 & 發展</Text>
                    </View>
                    {/* 4.2 卡片內容 - 第1行 */}
                    <View style={{justifyContent:'space-between', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(5), flexDirection:'row'}}>
                        {/* 服務圖標與文字 */}
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='book-outline' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>UMMoodle</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='file-tray-full' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>選咩課</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialCommunityIcons name='google-classroom' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>預選課</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialCommunityIcons name='plus-minus-variant' size={pxToDp(31)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>Add/Drop</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <MaterialCommunityIcons name='human-male-board-poll' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>全人發展</Text>
                        </TouchableOpacity>
                    </View>
                    {/* 4.2 卡片內容 - 第2行 */}
                    <View style={{justifyContent:'space-around', alignItems:'flex-start', margin:pxToDp(10), marginTop:pxToDp(5), flexDirection:'row'}}>
                        {/* 服務圖標與文字 */}
                        <TouchableOpacity style={{justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <Ionicons name='newspaper-sharp' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>成績</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{marginLeft:pxToDp(15), justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <FontAwesome name='graduation-cap' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>學分</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{marginLeft:pxToDp(15), justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <FontAwesome name='send' size={pxToDp(30)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>交流</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={{marginLeft:pxToDp(15), justifyContent:'center', alignItems:'center', flexDirection:'column'}}>
                            <FontAwesome name='dollar' size={pxToDp(31)} color={COLOR_DIY.themeColor} />
                            <Text style={{fontSize:pxToDp(12), color:COLOR_DIY.black.second}}>獎學金</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
                <Text>{'\n'}</Text>
            </ScrollView>
            </View>
        );
    }
}

export default Index;