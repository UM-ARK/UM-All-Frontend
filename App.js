/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { Component } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableWithoutFeedback, View } from "react-native";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context/src/SafeAreaContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";
import { Image } from "@rneui/themed";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { Map } from "./view/Home/Map";


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
                                    source={require("./static/img/Map.png")}
                                    style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                            </View>
                        </TouchableWithoutFeedback>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-1")}>Map</Text>
                    </View>

                    <View>
                        <View style={s}>
                            <Image
                                source={require("./static/img/UMNews.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-1")}>UM News</Text>
                    </View>
                    <View>
                        <View style={s}>
                            <Image
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
                                source={require("./static/img/Calendar.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm", "mb-2")}>Calendar</Text>
                    </View>

                    <View>
                        <View style={s}>
                            <Image
                                source={require("./static/img/AddDrop.png")}
                                style={tw.style("w-17", "h-17")} imageStyle={{ borderRadius: 50 }} />
                        </View>
                        <Text style={tw.style("text-center", "text-black", "text-sm",'mb-2')}>Add/Drop</Text>
                    </View>

                    <View>
                        <View style={s}>
                            <Image
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
function getBusData(){
    return 
}
class BusScreen extends Component {
    render() {
        return (
            <View>
                <Text>
                    Bus
                </Text>
            </View>
        );
    }
}

class NewsScreen extends Component {
    render() {
        return (
            <View>
                <Text>
                    News
                </Text>
            </View>
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
                    }} />
                    <Tab.Screen name="News" component={NewsScreen} options={{
                        headerStyle: {
                            backgroundColor: "#2F3A79",
                        },
                        headerTintColor: "#fff",
                        headerTitleStyle: {
                            fontWeight: "bold",
                        },
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
