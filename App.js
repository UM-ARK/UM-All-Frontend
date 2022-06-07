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

// 本地引用
import { Map }  from "./view/Home/Map";
import Bus      from "./view/Home/Bus";
import { News, NewsComponent } from "./view/Home/News";


const HomeStack = createNativeStackNavigator();

function HomeScreen() {
    return (
        <View>
            <Text style={{ fontSize: 60, }}> Home Page </Text>
        </View>
    );
}

// 所有功能圖標頁
function AllFuncScreen() {
    return (
        <HomeStack.Navigator >
            <HomeStack.Screen name="HomeFunc" component={AllFuncScreenCompo} options={ {
                    title:'UM ALL',
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
            <ScrollView style={tw.style("w-full", "h-full", "bg-white")}>
                {/* 第一行圖標 */}
                <View style={tw.style("flex", "flex-row", "mb-2", "mx-5", "justify-around", "flex-wrap",'mt-4')}>
                    {/* Map圖標渲染 */}
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

                    {/* UM News圖標渲染 */}
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

                    {/* Whole圖標渲染 */}
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

                {/* 第二行圖標 */}
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

                {/* 第三行圖標 */}
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

                    {/* Bus圖標渲染 */}
                    {/* TODO: Bug對齊問題 */}
                    <View>
                        <TouchableWithoutFeedback onPress={this.goToBusScreen}>
                            <View style={s}>
                                <Image
                                    placeholderStyle={{  backgroundColor: "#2F3A79",  }}
                                    PlaceholderContent={
                                        <View>
                                            <ActivityIndicator color={"#fff"} />
                                        </View>
                                    }
                                    source={require("./static/img/Bus/bus-outline.png")}
                                    style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                            </View>
                        </TouchableWithoutFeedback>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-1")}>Bus報站</Text>
                    </View>

                </View>

                {/* Login By UMID 提示 */}
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
                }>
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
                    }}/>
                    {/* TODO:主頁 */}
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
