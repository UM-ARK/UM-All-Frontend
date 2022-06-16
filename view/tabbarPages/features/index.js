import React, { Component } from "react";
import {
    StyleSheet,
    Text,
    View,
} from "react-native";

// 本地頁面引用
import Map          from "../../Features/Map";
import Bus          from "../../Features/Bus";

// 第三方庫引用
import tw from "twrnc";
import Ionicons from "react-native-vector-icons/Ionicons";
import { createNativeStackNavigator } from "@react-navigation/native-stack";


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
        name: 'Map',
        icon:'map-outline'
    },
    {
        name: 'Bus',
        icon:'bus-outline'
    },
    {
        name: 'Repair',
        icon:'hammer-outline'
    },
    {
        name: 'WTF',
        icon:'cube-outline'
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

// TODO: 默認dp單位修改為pxToDp(長度)
const FeatureItem=({item_name,item_icon,item_navigation})=>{
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
        // let s = StyleSheet.create({
        //     borderColor: "#2F3A79",
        //     borderWidth: 4,
        //     borderRadius: 8,
        //     backgroundColor: "#fff",
        //     overlayColor: "#ffffff",
        //     marginBottom: 2,
        // });

        return (
            <View style={tw.style("w-full", "h-full", "bg-white")}>
                {/* Academic圖標分類 */}
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

                {/* Public圖標分類 */}
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

                {/* Life圖標分類 */}
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


const FeatureStack = createNativeStackNavigator();
// 所有功能展示頁
function AllFuncScreen() {
    return (
        <FeatureStack.Navigator >
            <FeatureStack.Screen name="HomeFunc" component={AllFuncScreenCompo} options={ {
                    title:'Features',
                    headerStyle:{ backgroundColor:'#2F3A79' },
                    headerTintColor:'#fff'
            } }/>

            {/* 跳轉頁面的路由 */}
            <FeatureStack.Screen name="Map" component={Map} options={{headerShown:false}} />
            <FeatureStack.Screen name="Bus" component={Bus} options={{headerShown:false}} />
        </FeatureStack.Navigator>
    );
}

export default AllFuncScreen;
