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

// 爬蟲campus Bus
function fetchBusInfo(){
    // 訪問campusloop網站
    fetch('https://campusloop.cmdo.um.edu.mo/zh_TW/busstopinfo')
    .then(response => response.text())
    .then(text => {
        // 拿到campusloop的HTML
        getBusData(text)
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
    var pathInfoArr = new Array();
    // 無車服務時只有0~2的下標為busInfo，有車服務時，0~3的下標都是busInfo
    let infoIndex = mainInfo.length==12 ? 3 : 2;

    for (let i = 0; i < mainInfo.length; i++) {
        let text = mainInfo[i].textContent;
        if (i<=infoIndex) {
            busInfoArr.push(text)
        } else{
            pathInfoArr.push(text)
        }
    }
    console.log("busInfoArr為:",    busInfoArr);
    console.log("pathInfoArr為:",   pathInfoArr);

    // 車輛和站點都在class=main的div標籤內
    var arriveInfoBuffer    = doc.getElementsByClassName('left', false);
    // console.log("巴士到達資訊HTML節點形式:",arriveInfoBuffer);

    // 將節點文字數據存入Array，後續直接以車牌判斷巴士到達位置
    var arriveInfoArr = []

    // 解析巴士到站數據
    for (let i = 0; i<arriveInfoBuffer.length; i++){
        let item = arriveInfoBuffer[i].textContent
        // 刪除字符串內的\t \n
        arriveInfoArr.push(  item.replace(/[\t\n]/g,"")  )
    }
    // 0：PGH 站點
    // 1：PGH ~ E4 路上
    // 2：E4 站點，以此類推
    // 15：S4 下方的虛無站
    console.log("巴士到站狀態數組為:",arriveInfoArr);

    // 存入data，給html調用
    // that.busInfoArr 	= busInfoArr;
    // that.pathInfoArr 	= pathInfoArr;
    // that.arriveInfoArr 	= arriveInfoArr;

    // 判斷目前有無巴士
    let haveBus = false
    for (let i = 0; i<arriveInfoArr.length; i++){
        let item = arriveInfoArr[i];
        // TODO:判斷車到哪
        if (item.length > 0){ haveBus = true;  break; }
    }
    console.log(haveBus?'有巴士':'無巴士');

    // 如果沒有Bus，則觸發彈窗提醒
    if (!haveBus) {
        console.log('現在沒有巴士喔~');
    }

}

// 巴士報站頁 - 畫面佈局與渲染
function BusScreen() {
    let busRouteImg = require('./static/img/Bus/bus_route.png')
    let arrowImg = require('./static/img/Bus/direction_left.png')
    let dotImg = require('./static/img/Bus/loc_dot.png')

    const [count, setCount] = useState(0);
    const onPress = () => setCount(prevCount => prevCount + 1);

    // 組件加到DOM前觸發
    // 函數式組件的生命週期觸發，參考：https://betterprogramming.pub/react-component-lifecycle-methods-with-react-hooks-efcd04987805
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
    });
    return (
        <View style={s.container}>
            <ImageBackground source={ busRouteImg } style={s.bgImg}>
                <Text>Count: {count}</Text>
                <TouchableOpacity
                    style={{
                        alignItems: "center",
                        backgroundColor: "#DDDDDD",
                        padding: 10
                    }}
                    onPress={onPress}
                >
                    <Text>Press Here</Text>
                </TouchableOpacity>


                {/* TODO:使用絕對位置在不同分辨率下的問題 */}
                {/* TODO:如果不止一輛巴士的情況 */}
                {/* 巴士圖標 */}
                <Ionicons name={"bus"} size={30} color={"#2F3A79"} style={{}}/>

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
