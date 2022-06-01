/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { Component } from "react";
import { ScrollView, StatusBar, Text, View } from "react-native";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context/src/SafeAreaContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";

class HomeScreen extends Component {
    render() {
        return (
            <ScrollView style={tw.style('w-full','h-full','bg-white')}>
                <View style={tw.style('flex','flex-row')}>
                    <View>

                    </View>
                </View>
            </ScrollView>
        );
    }
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

class BBSScreen extends Component {
    render() {
        return (
            <View>
                <Text>
                    BBS
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

// function tabBar(){
//     return (
//         <View style={tw.style('flex','flex-col')}>
//             <Ionicons name={'home'} size={25} color={'#2F3A79'} />
//             <Text>Home</Text>
//         </View>
//     )
// }

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
                                } else if (route.name === 'Bus') {
                                    iconName = focused ? 'bus' : 'bus-outline';
                                } else if (route.name === 'BBS') {
                                    iconName = focused ? 'boat' : 'boat-outline';
                                } else if (route.name === 'Me') {
                                    iconName = focused ? 'person' : 'person-outline';
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
                            backgroundColor: '#2F3A79',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}/>
                    <Tab.Screen name="BBS" component={BBSScreen} options={{
                        headerStyle: {
                            backgroundColor: '#2F3A79',
                        },
                        headerTintColor: '#fff',
                        headerTitleStyle: {
                            fontWeight: 'bold',
                        },
                    }}/>
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
