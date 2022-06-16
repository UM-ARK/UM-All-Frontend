import React  from "react";
import {
    StatusBar,
} from "react-native";

import { SafeAreaProvider } from "react-native-safe-area-context/src/SafeAreaContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";

import HomeScreen       from "./view/tabbarPages/home";
import MesgScreen       from "./view/tabbarPages/message";
import MePage           from "./view/tabbarPages/me";
import NewsScreen       from "./view/tabbarPages/news";
import AllFuncScreen    from "./view/tabbarPages/features";

const Tab = createBottomTabNavigator();
function App() {
    return (
        <SafeAreaProvider style={{ backgroundColor: "#2F3A79" }}>
            <StatusBar barStyle="light-content" backgroundColor="#2F3A79" />
            <NavigationContainer>
                <Tab.Navigator
                screenOptions={
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
                // 設定默認打開的Tabbar
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
