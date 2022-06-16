import React, { Component } from "react";
import {
    Text,
    View,
} from "react-native";
import { News, NewsComponent } from "./components/NewsScreen";

import { createNativeStackNavigator } from "@react-navigation/native-stack";


// 創建News頁的路由導航
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
                <NewsStack.Screen name="NewsDetail" component={NewsComponent} options={{
                    headerShown:false
                } } />
            </NewsStack.Navigator>
        );
    }
}

export default NewsScreen;