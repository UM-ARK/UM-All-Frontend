/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 * @flow strict-local
 */

import React, { Component } from "react";
import { Text, View } from "react-native";
import tw from "twrnc";
import { SafeAreaProvider } from "react-native-safe-area-context/src/SafeAreaContext";
import { NavigationContainer } from "@react-navigation/native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Ionicons from "react-native-vector-icons/Ionicons";

class HomeScreen extends Component {
    render() {
        return (
            <View>
                <Text>
                    Home
                </Text>
            </View>
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

function tabBar(){
    return (
        <View style={tw.}>
            <Ionicons name={iconName} size={25} color={'#2F3A79'} />
            <Text>Home</Text>
        </View>
    )
}

function App() {
    return (
        <SafeAreaProvider>
            <NavigationContainer>
                <Tab.Navigator screenOptions={
                    (
                        { route },
                    ) => {
                        return {
                            tabBarIcon: (focused, color, size) => {
                                let iconName;

                                if (route.name === 'Home') {
                                    iconName = focused
                                        ? 'home'
                                        : 'home-outline';
                                } else if (route.name === 'BBS') {
                                    iconName = focused ? 'ios-list-box' : 'ios-list';
                                }

                                // You can return any component that you like here!
                                return <Ionicons name={iconName} size={25} color={'#2F3A79'} />;
                            },
                            tabBarActiveTintColor: '#2F3A79',
                            tabBarInactiveTintColor: 'black',
                        };
                    }
                }>
                    <Tab.Screen name="Home" component={HomeScreen} />
                    <Tab.Screen name="Bus" component={BusScreen} />
                    <Tab.Screen name="BBS" component={BBSScreen} />
                    <Tab.Screen name="Me" component={UserScreen} />
                </Tab.Navigator>
            </NavigationContainer>
        </SafeAreaProvider>
    );
}


export default App;
