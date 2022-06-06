/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */
// RN直屬庫
import React, { Component, useEffect, useState } from "react";
import {
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableWithoutFeedback,
    TouchableOpacity,
    View,
    ImageBackground,
    ActivityIndicator,
} from "react-native";
// RN第三方庫
import { SafeAreaProvider } from "react-native-safe-area-context/src/SafeAreaContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

// 第三方庫
import tw from "twrnc";
import { Image } from "@rneui/themed";
var DomParser = require('react-native-html-parser').DOMParser   // 用於解析Campus Bus的HTML

// 本地引用
import { Map } from "./view/Home/Map";
import { News, NewsComponent } from "./view/Home/News";


// 所有功能圖標頁
class HomeFuncScreen extends Component {
    constructor(props) {
        super(props);
        this.goToMapScreen=this.goToMapScreen.bind(this)

    }

    goToMapScreen(){
        const navigation = this.props.navigation;
        navigation.navigate ('Map')
    }

    render() {
        let s = StyleSheet.create({
            borderColor: "#2F3A79",
            borderWidth: 4,
            borderRadius: 8,
            backgroundColor: "#fff",
            overlayColor: "#ffffff",
            marginBottom: 2,
        });
        return (
            <ScrollView style={tw.style("w-full", "h-full", "bg-white")}>
                <View style={tw.style("flex", "flex-row", "mb-2", "mx-5", "justify-around", "flex-wrap",'mt-4')}>
                    <View>
                        <TouchableWithoutFeedback onPress={this.goToMapScreen}>
                            <View style={s}>
                                <Image
                                    placeholderStyle={{
                                        backgroundColor: "#2F3A79",
                                    }}
                                    PlaceholderContent={
                                        <View>
                                            <ActivityIndicator color={"#fff"} />
                                        </View>
                                    }
                                    source={require("./static/img/Map.png")}
                                    style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                            </View>
                        </TouchableWithoutFeedback>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-1")}>Map</Text>
                    </View>

                    <View>
                        <View style={s}>
                            <Image
                                placeholderStyle={{
                                    backgroundColor: "#2F3A79",
                                }}
                                PlaceholderContent={
                                    <View>
                                        <ActivityIndicator color={"#fff"} />
                                    </View>
                                }
                                source={require("./static/img/UMNews.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-1")}>UM News</Text>
                    </View>
                    <View>
                        <View style={s}>
                            <Image
                                placeholderStyle={{
                                    backgroundColor: "#2F3A79",
                                }}
                                PlaceholderContent={
                                    <View>
                                        <ActivityIndicator color={"#fff"} />
                                    </View>
                                }
                                source={require("./static/img/Scholarship.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-xs", "mb-1")}>Whole Person</Text>
                    </View>

                    {/*<View>*/}
                    {/*    <View style={s}>*/}
                    {/*        <Image*/}
                    {/*            source={require("./static/img/Scholarship.png")}*/}
                    {/*            style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />*/}
                    {/*    </View>*/}
                    {/*    <Text style={tw.style("text-center", "text-black", "text-sm", "mb-1")}>Whole Person</Text>*/}
                    {/*</View>*/}

                </View>

                <View style={tw.style("flex", "flex-row", "my-2", "mx-5", "justify-around", "flex-wrap")}>
                    <View>
                        <View style={s}>
                            <Image
                                placeholderStyle={{
                                    backgroundColor: "#2F3A79",
                                }}
                                PlaceholderContent={
                                    <View>
                                        <ActivityIndicator color={"#fff"} />
                                    </View>
                                }
                                source={require("./static/img/Calendar.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-2")}>Calendar</Text>
                    </View>

                    <View>
                        <View style={s}>
                            <Image
                                placeholderStyle={{
                                    backgroundColor: "#2F3A79",
                                }}
                                PlaceholderContent={
                                    <View>
                                        <ActivityIndicator color={"#fff"} />
                                    </View>
                                }
                                source={require("./static/img/AddDrop.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm",'mb-2')}>Add/Drop</Text>
                    </View>

                    <View>
                        <View style={s}>
                            <Image
                                placeholderStyle={{
                                    backgroundColor: "#2F3A79",
                                }}
                                PlaceholderContent={
                                    <View>
                                        <ActivityIndicator color={"#fff"} />
                                    </View>
                                }
                                source={require("./static/img/SIW.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm",'mb-2')}>SIW</Text>
                    </View>
                </View>

                <View style={tw.style("flex", "flex-row", "my-2", "mx-5", "justify-around", "flex-wrap")}>
                    <View>
                        <View style={s}>
                            <Image
                                placeholderStyle={{
                                    backgroundColor: "#2F3A79",
                                }}
                                PlaceholderContent={
                                    <View>
                                        <ActivityIndicator color={"#fff"} />
                                    </View>
                                }
                                source={require("./static/img/What2Reg.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-2")}>What2Reg</Text>
                    </View>

                    <View>
                        <View style={{
                            borderColor: "#fff",
                            borderWidth: 4,
                            borderRadius: 8,
                            backgroundColor: "#fff",
                            overlayColor: "#ffffff",
                            marginBottom:5
                        }}>
                            <View
                                style={tw.style("w-17", "h-17")} />
                        </View>
                    </View>

                    <View>
                        <View style={{
                            borderColor: "#fff",
                            borderWidth: 4,
                            borderRadius: 8,
                            backgroundColor: "#fff",
                            overlayColor: "#ffffff",
                            marginBottom:5
                        }}>
                            <View
                                style={tw.style("w-17", "h-17")} />
                        </View>
                    </View>
                </View>
            <View style={tw.style('rounded-full','w-60','mx-auto','pt-40')}>
                <View style={{
                    backgroundColor: "#2F3A79",
                    borderRadius: 100,
                    paddingVertical:3
                }}>
                    <Text style={tw.style('text-white','text-center','text-xl')}>Login by UM ID 😍</Text>
                </View>
            </View>
            </ScrollView>
        );
    }
}

const HomeStack = createNativeStackNavigator();

function HomeScreen() {
    return (
        <HomeStack.Navigator >
            <HomeStack.Screen name="HomeFunc" component={HomeFuncScreen} options={
                {
                    title:'UM ALL',
                    headerStyle:{
                        backgroundColor:'#2F3A79'
                    },
                    headerTintColor:'#fff'
                }
            }/>
            <HomeStack.Screen name="Map" component={Map} options={{
                headerShown:false
            }
            }/>
        </HomeStack.Navigator>
    );

}

// TODO:有兩輛車的情況，不急做
// 爬蟲campus Bus
function fetchBusInfo(){
    // 訪問campusloop網站
    fetch('https://campusloop.cmdo.um.edu.mo/zh_TW/busstopinfo')
    .then(response => response.text())
    .then(text => {
        // text為campusloop的HTML
        // busInfo為解析後的object類型數據，包含運行資訊和Bus到站資訊
        // TODO:如果沒有Bus，則觸發提醒
        let busInfo = getBusData(text)
        console.log( busInfo );
    })
    .catch((error) => console.error(error))
}

// 解析campus Bus的HTML
function getBusData(busInfoHtml){
    // 使用第三方插件react-native-html-parser，以使用DomParser（為了懶寫代碼，複用Vue寫的解析邏輯）
    // https://bestofreactjs.com/repo/g6ling-react-native-html-parser-react-native-utilities
    let doc = new DomParser().parseFromString(busInfoHtml,'text/html')

    // 主要的巴士資訊都存放在span內
    var mainInfo    = doc.getElementsByTagName('span');
    var busInfoArr  = new Array();

    // 到站時車牌屬於span（13個span）。未到站時車牌屬於div（12個span）
    // 無車服務時只有0~2的下標為busInfo（11個span）。有車服務時，0~3的下標都是busInfo（至少12個span）
    let infoIndex = mainInfo.length>=12 ? 3 : 2;

    // 分隔車輛運行資訊
    for (let i = 0; i < mainInfo.length; i++) {
        let text = mainInfo[i].textContent;
        if (i<=infoIndex) {
            busInfoArr.push(text)
        } else {break}
    }
    // console.log("busInfoArr為:",    busInfoArr);

    // 車輛和站點都在class=main的div標籤內
    var arriveInfoBuffer    = doc.getElementsByClassName('left', false);
    // console.log("巴士到達資訊HTML節點形式:",arriveInfoBuffer);

    // 將節點文字數據存入Array，用於以車牌判斷巴士到達位置
    var arriveInfoArr = []
    // 解析巴士到站數據
    for (let i = 0; i<arriveInfoBuffer.length; i++){
        let item = arriveInfoBuffer[i].textContent
        // 刪除字符串內的\t \n
        arriveInfoArr.push(  item.replace(/[\t\n]/g,"")  )
    }
    // index 0：PGH 站點
    // 1：PGH ~ E4 路上
    // 2：E4 站點，以此類推
    // 15：S4 下方的虛無站
    // console.log("巴士到站狀態數組為:",arriveInfoArr);

    // 判斷目前有無巴士
    let busPositionArr = []
    for (let i = 0; i<arriveInfoArr.length; i++){
        let item = arriveInfoArr[i];
        if (item.length > 0){
            busPositionArr.push({
                number: item,
                index:  i
            })
        }
    }
    // console.log("Bus車牌、位置總數據：",busPositionArr);

    // console.log('\n\n\n');
    return ({
        busInfoArr,
        busPositionArr
    })
}

// 巴士報站頁 - 畫面佈局與渲染
function BusScreen() {
    let busRouteImg = require('./static/img/Bus/bus_route.png')
    let arrowImg    = require('./static/img/Bus/direction_left.png')
    let dotImg      = require('./static/img/Bus/loc_dot.png')

    // TODO:點按刷新時重新訪問campus bus網站獲取數據
    // BUG: useEffect會在每一次頁面渲染（刷新）時再次調用，嘗試使用其他生命週期函數
    // 函數式組件的生命週期觸發，參考：https://betterprogramming.pub/react-component-lifecycle-methods-with-react-hooks-efcd04987805
    // 組件加到DOM前觸發
    useEffect(() => {
        fetchBusInfo();
    });

    // 樣式代碼
    let s = StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: "column"
        },
        bgImg: {
            flex: 1,
            resizeMode: "cover",
            justifyContent: "center"
        },
        arrowSize: {
            width:35,
            height:35,
            resizeMode:"contain",
        },
        dotSize: {
            width:21,
            height:21,
            resizeMode:"contain"
        },
        // 巴士到達位置，0為PGH，1為PGH~E4路上，2為E4
        s0: {  position: 'absolute', left: 335, top: 565  },    // PGH
        s1: {  position: 'absolute', left: 335, top: 450  },    // PGH ~ E4
        s2: {  position: 'absolute', left: 335, top: 353  },    // E4
        s3: {  position: 'absolute', left: 335, top: 200  },    // E4 ~ N2
        s4: {  position: 'absolute', left: 335, top: 75  },     // N2
        s5: {  position: 'absolute', left: 160, top: 15  },     // N2 ~ N6
        s6: {  position: 'absolute', left: 115, top: 115  },    // N6
        s7: {  position: 'absolute', left: 35, top: 180  },     // N6 ~ E11
        s8: {  position: 'absolute', left: 35, top: 243  },     // E11
        s9: {  position: 'absolute', left: 35, top: 290  },     // E11 ~ E21
        s10: {  position: 'absolute', left: 35, top: 325  },    // N21
        s11: {  position: 'absolute', left: 35, top: 420  },    // N21 ~ E32
        s12: {  position: 'absolute', left: 35, top: 500  },    // E32
        s13: {  position: 'absolute', left: 80, top: 575  },    // E32 ~ S4
        s14: {  position: 'absolute', left: 245, top: 575  },   // s4
        s15: {  position: 'absolute', left: 275, top: 575  },   // s4 ~ PGH
    });

    return (
        <View style={s.container}>
            <ImageBackground source={ busRouteImg } style={s.bgImg}>
                <TouchableOpacity
                    style={{
                        position: 'absolute', top: 20,
                        alignItems: "center",
                        backgroundColor: "#DDDDDD",
                        padding: 10
                    }}
                    onPress={fetchBusInfo}
                >
                    <Text>Refresh</Text>
                </TouchableOpacity>

                {/* TODO:使用絕對位置在不同分辨率下的問題 */}
                {/* TODO:如果不止一輛巴士的情況 */}
                {/* 巴士圖標 */}
                <View style={s.s2}>
                    <Ionicons name={"bus"} size={30} color={"#2F3A79"} />
                </View>

                {/* 右上箭頭 */}
                <View style={ {position: 'absolute', left: 310, top: 25,} }>
                    <Image source={arrowImg} style={s.arrowSize} />
                </View>
                {/* 左上箭頭 */}
                <View style={ {position: 'absolute', left: 45, top: 140,} }>
                    <Image source={arrowImg} style={[s.arrowSize, {transform: [{rotate:'-90deg'}]} ]} />
                </View>
                {/* 左下箭頭 */}
                <View style={ {position: 'absolute', left: 45, top: 610,} }>
                    <Image source={arrowImg} style={[s.arrowSize, {transform: [{rotate:'180deg'}]} ]} />
                </View>
                {/* 右下箭頭 */}
                <View style={ {position: 'absolute', left: 315, top: 610,} }>
                    <Image source={arrowImg} style={[s.arrowSize, {transform: [{rotate:'90deg'}]} ]} />
                </View>

                {/* 站點圓點標誌 */}
                {/* PGH */}
                <View style={ {position: 'absolute', left: 310, top: 570,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 310, top: 360,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 310, top: 80,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 145, top: 120,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 62, top: 250,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 62, top: 330,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 62, top: 510,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                {/* S4 */}
                <View style={ {position: 'absolute', left: 250, top: 602,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                
                {/* 巴士站點文字 */}
                <View style={[tw.style("border-2", "border-blue-900", "w-38"), {position: 'absolute', left: 155, top: 565,}]}>
                    <Text style={tw.style("text-base")}>PGH 研究生宿舍(起)</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-23.5"), {position: 'absolute', left: 210, top: 355,}]}>
                    <Text style={tw.style("text-base")}>E4 劉少榮樓</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-23.5"), {position: 'absolute', left: 210, top: 75,}]}>
                    <Text style={tw.style("text-base")}>N2 大學會堂</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-20"), {position: 'absolute', left: 170, top: 115,}]}>
                    <Text style={tw.style("text-base")}>N6 行政樓</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-25.5"), {position: 'absolute', left: 85, top: 245,}]}>
                    <Text style={tw.style("text-base")}>E11 科技學院</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-30"), {position: 'absolute', left: 85, top: 325,}]}>
                    <Text style={tw.style("text-base")}>E21 人文社科樓</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-22"), {position: 'absolute', left: 85, top: 505,}]}>
                    <Text style={tw.style("text-base")}>E32 法學院</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-46.5"), {position: 'absolute', left: 120, top: 620,}]}>
                    <Text style={tw.style("text-base")}>S4 研究生宿舍南四座(終)</Text>
                </View>

            </ImageBackground>
        </View>
    )
}


const NewsStack = createNativeStackNavigator();

class NewsScreen extends Component {
    render() {
        return (
            <NewsStack.Navigator >
                <NewsStack.Screen name="NewsHome" component={News} options={
                    {
                        title:'UM News',
                        headerStyle:{
                            backgroundColor:'#2F3A79'
                        },
                        headerTintColor:'#fff'
                    }
                }/>
                <HomeStack.Screen name="Detail" component={NewsComponent} options={{
                    headerShown:false
                }
                }/>
            </NewsStack.Navigator>
        );
    }
}

class UserScreen extends Component {
    render() {
        return (
            <View>
                <Text>
                    Me
                </Text>
            </View>
        );
    }
}

const Tab = createBottomTabNavigator();

function App() {
    return (
        <SafeAreaProvider style={{ backgroundColor: "#2F3A79" }}>
            <StatusBar barStyle="light-content" backgroundColor="#2F3A79" />
            <NavigationContainer>
                <Tab.Navigator screenOptions={
                    (
                        { route },
                    ) => {
                        return {
                            tabBarIcon: ({ focused, color, size }) => {
                                let iconName;

                                if (route.name === 'Home') {
                                    iconName = focused
                                        ? 'home'
                                        : 'home-outline';
                                } else if (route.name === "Bus") {
                                    iconName = focused ? "bus" : "bus-outline";
                                } else if (route.name === "News") {
                                    iconName = focused ? "boat" : "boat-outline";
                                } else if (route.name === "Me") {
                                    iconName = focused ? "person" : "person-outline";
                                }

                                // You can return any component that you like here!
                                return <Ionicons name={iconName} size={size} color={color} />;
                            },
                            tabBarActiveTintColor: '#2F3A79',
                            tabBarInactiveTintColor: 'black',
                            tabBarLabelStyle:{
                                marginBottom:1,
                                marginTop:-1,
                                fontWeight:'bold'
                            },
                            tabBarIconStyle:{
                                marginTop:1,
                                marginBottom:-1
                            },
                            sceneContainerStyle:{
                                border:0
                            }
                        };
                    }
                }>
                    <Tab.Screen name="Home" component={HomeScreen} options={{
                        headerShown: false,
                        headerStyle: {
                            backgroundColor: '#2F3A79',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}/>
                    <Tab.Screen name="Bus" component={BusScreen} options={{
                        headerStyle: {
                            backgroundColor: "#2F3A79",
                        },
                        headerTintColor: "#fff",
                        headerTitleStyle: {
                            fontWeight: "bold",
                        },
                        // headerShown設置是否顯示頂部欄
                        headerShown:false
                    }} />
                    <Tab.Screen name="News" component={NewsScreen} options={{
                        headerStyle: {
                            backgroundColor: "#2F3A79",
                        },
                        headerTintColor: "#fff",
                        headerTitleStyle: {
                            fontWeight: "bold",
                        },
                        headerShown:false
                    }} />
                    <Tab.Screen name="Me" component={UserScreen} options={{
                        headerStyle: {
                            backgroundColor: '#2F3A79',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}/>
                </Tab.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}


export default App;
