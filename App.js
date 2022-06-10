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
    Image,
    ActivityIndicator, 
    FlatList, 
    Dimensions, 
} from "react-native";

// RN第三方庫
import { SafeAreaProvider } from "react-native-safe-area-context/src/SafeAreaContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import Swiper from "react-native-swiper";               // 輪播圖

// 第三方庫
import tw from "twrnc";

// 本地引用
import { Map }  from "./view/Home/Map";
import SwiperTest      from "./view/Home/SwiperTest";   // 首頁輪播圖測試
import Bus      from "./view/Home/Bus";
import { News, NewsComponent } from "./view/Home/News";
import MyPage from "./view/Home/MePage";


const HomeStack = createNativeStackNavigator();

function HomeScreen() {
    let styles = StyleSheet.create({
        swiper: {},
        img: {
            width: Dimensions.get('window').width,
            height: 200,
        }
    });
    return (
        <View style={tw.style("w-full", "h-full", "bg-white")}>

        </View>
    );
}

// 所有功能圖標頁
function AllFuncScreen() {
    return (
        <HomeStack.Navigator >
            <HomeStack.Screen name="HomeFunc" component={AllFuncScreenCompo} options={ {
                    title:'Features',
                    headerStyle:{
                        backgroundColor:'#2F3A79'
                    },
                    headerTintColor:'#fff'
            } }/>

            {/* 跳轉頁面的路由 */}
            <HomeStack.Screen name="Map" component={Map} options={{
                    headerShown:false
                }
            }/>
            <HomeStack.Screen name="Bus" component={Bus} options={{
                    headerShown:false
                }
            }/>
        </HomeStack.Navigator>
    );
}
const academic_features_list=[
    {
        name: 'SIW',
        icon:'briefcase-outline'
    },
    {
        name: 'Moodle',
        icon:'school-outline'
    },
    {
        name: 'Date',
        icon:'calendar-outline'
    },
    {
        name: 'WP',
        icon:'person-outline'
    },
    {
        name: 'AskReg',
        icon:'bookmarks-outline'
    },
]
const public_features_list=[
    {
        name: 'WTF',
        icon:'cube-outline'
    },
    {
        name: 'Bus',
        icon:'bus-outline'
    },
    {
        name: 'Repair',
        icon:'hammer-outline'
    },
]

const life_features_list=[
    {
        name: 'BBS',
        icon:'golf-outline'
    },
    {
        name: 'Menu',
        icon:'fast-food-outline'
    },
    {
        name: 'Bug',
        icon:'bug-outline'
    },
]
const FeatureItem=({item_name,item_icon})=>{
    let size = {
        fontSize:12
    };
    if  (item_name.length > 6) {
        size = {
            fontSize:12
        };
    }
    return (
        <View style={[tw.style('mx-4','py-3')]}>
            <Ionicons name={item_icon} size={35} color={'#2F3A79'}/>
            <View style={tw.style('w-full')}>
                <Text style={[tw.style('text-center','text-black'),size]}>{item_name}</Text>
            </View>
        </View>
    )
}
class AllFuncScreenCompo extends Component {
    constructor(props) {
        super(props);
        this.goToMapScreen=this.goToMapScreen.bind(this);
        this.goToBusScreen=this.goToBusScreen.bind(this);
    }

    // 跳轉map頁
    goToMapScreen(){
        const navigation = this.props.navigation;
        navigation.navigate ('Map')
    }
    goToBusScreen(){
        const navigation = this.props.navigation;
        navigation.navigate ('Bus')
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
            <View style={tw.style("w-full", "h-full", "bg-white")}>
                <View >
                    <Text style={tw.style('text-gray-500','text-sm','px-3','py-1')}>
                        ACADEMIC
                    </Text>
                    <View style={tw.style('border-t','border-slate-300','border-b')}>
                        <View style={tw.style('flex','flex-row','flex-wrap')}>
                            {academic_features_list.map(item=><FeatureItem item_name={item.name} item_icon={item.icon}/>)}
                        </View>
                    </View>
                </View>

                <View >
                    <Text style={tw.style('text-gray-500','text-sm','px-3','py-1')}>
                        PUBLIC
                    </Text>
                    <View style={tw.style('border-t','border-slate-300','border-b')}>
                        <View style={tw.style('flex','flex-row','flex-wrap')}>
                            {public_features_list.map(item=><FeatureItem item_name={item.name} item_icon={item.icon}/>)}
                        </View>
                    </View>
                </View>

                <View >
                    <Text style={tw.style('text-gray-500','text-sm','px-3','py-1')}>
                        LIFE
                    </Text>
                    <View style={tw.style('border-t','border-slate-300','border-b')}>
                        <View style={tw.style('flex','flex-row','flex-wrap')}>
                            {life_features_list.map(item=><FeatureItem item_name={item.name} item_icon={item.icon}/>)}
                        </View>
                    </View>
                </View>
            </View>
        );
    }
}

// 信息頁
function MesgScreen() {
    return (
        <View>
            <Text style={{ fontSize: 60, }}>Message Page</Text>
        </View>
    );
}

const NewsStack = createNativeStackNavigator();

class NewsScreen extends Component {
    render() {
        return (
            <NewsStack.Navigator>
                <NewsStack.Screen name="NewsHome" component={News} options={
                    {
                        title:'UM News',
                        headerStyle:{
                            backgroundColor:'#2F3A79'
                        },
                        headerTintColor:'#fff'
                    }
                }/>
                <HomeStack.Screen name="NewsDetail" component={NewsComponent} options={{
                    headerShown:false
                } } />
            </NewsStack.Navigator>
        );
    }
}

//个人信息页
function MePage() {
    return (
        <View style={{
            height: '100%',
            alignItems: 'center',
            backgroundColor: '#BFD0DA',
        }}>
            <View style={{
            height: '18%',
            width: '95%',
            backgroundColor: 'white',
            marginTop: '5%',
            padding: 12,
            elevation: 5,
            borderRadius: 10,
            shadowColor: '#303133',
            }}>
                <View style={{
                       height: '65%',
                       width: '70%',
                       marginLeft: '6%',
                       marginTop: '7%',
                       flexDirection: 'row',
                       justifyContent: 'center',
                       //alignItems: 'center',
                   }}>
                    <Image source={require("./UMARK_Assets/testphoto.png")} style={{
                           height: 80,
                           width: 80,
                           marginTop: '-6%',
                           borderRadius: 120,
                           flexDirection: 'row',
                           justifyContent: 'center',
                       }}/>
                    <View style={{                                           
                           justifyContent: 'center',
                           //alignItems: 'center',
                           marginTop: '0%',
                           marginLeft: '5%',
                       }}>
                    <Text style={{
                               color: '#909399',
                               fontSize: 20,
                           }}>{'TestName'}</Text>
                    <Text style={{
                               color: '#909399',
                               fontSize: 20,
                           }}>{'Student ID: DC038281'}</Text>
                    </View>
                    </View>
            </View>
            <View style={{
                   height: '10%',
                   width: '95%',
                   padding: 10,
                   marginTop: '5%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
               }}>
                <ScrollView style={{
                       height: 100,
                       overflow: 'scroll',
                   }}>
                    <View style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black'}}>{'UMPass Settings'}</Text>
                    </View>
                   </ScrollView>
            </View>
            <View style={{
                   height: '30%',
                   width: '95%',
                   padding: 10,
                   marginTop: '5%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
               }}>
                <ScrollView style={{
                       height: 100,
                       overflow: 'scroll',
                   }}>
                    <View style={{
                        height: 60,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black'}}>{'Favorites'}</Text>
                    </View>
                       <View style={{
                           width: '90%',
                           height: 1,
                           alignSelf:'center',
                           opacity: 0.5,
                           backgroundColor: '#606266',
                       }} />
                         <View style={{
                        height: 60,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{color:'black',fontSize:22,alignItems: 'center',}}>{'General'}</Text>
                    </View>
                       <View style={{
                           width: '90%',
                           height: 1,
                           alignSelf:'center',
                           opacity: 0.5,
                           backgroundColor: '#606266',
                       }} />
                        <View style={{
                        height: 60,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black'}}>{'General Settings'}</Text>
                    </View>
                   </ScrollView>
            </View>
            <View style={{
                   height: '10%',
                   width: '95%',
                   padding: 10,
                   marginTop: '5%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
               }}>
                <ScrollView style={{
                       height: 100,
                       overflow: 'scroll',
                   }}>
                    <View style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black'}}>{'About us'}</Text>
                    </View>
                   </ScrollView>
            </View>
        </View>
    );
}

const Tab = createBottomTabNavigator();

function App() {
    return (
        <SafeAreaProvider style={{ backgroundColor: "#2F3A79" }}>
            <StatusBar barStyle="light-content" backgroundColor="#2F3A79" />
            <NavigationContainer>
                <Tab.Navigator screenOptions={
                    (  { route },  ) => {
                        return {
                            tabBarIcon: ({ focused, color, size }) => {
                                let iconName;

                                if (route.name === 'Home') {
                                    iconName = focused ? 'home'     : 'home-outline';
                                } else if (route.name === "News") {
                                    iconName = focused ? "boat"     : "boat-outline";
                                } else if (route.name === "Me") {
                                    iconName = focused ? "person"   : "person-outline";
                                } else if (route.name === "AllFunc") {
                                    iconName = focused ? "albums"   : "albums-outline";
                                } else if (route.name === "Message") {
                                    iconName = focused ? "pulse"    : "pulse-outline";
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
                }
                               initialRouteName={'Home'}
                >
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
                    {/* 所有功能頁 */}
                    <Tab.Screen name="AllFunc" component={AllFuncScreen} options={{
                        headerShown: false,
                        headerStyle: {
                            backgroundColor: '#2F3A79',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                        title:'Features',
                    }}/>
                    {/* TODO:主頁，6.11改為輪播圖測試 */}
                    <Tab.Screen name="Home" component={SwiperTest} options={{
                        headerShown: false,
                        headerStyle: {
                            backgroundColor: '#2F3A79',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}/>
                    {/* TODO:信息頁 */}
                    <Tab.Screen name="Message" component={MesgScreen} options={{
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
                    <Tab.Screen name="Me" component={MePage} options={{
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
