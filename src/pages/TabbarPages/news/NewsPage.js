import React, { Component } from "react";
import {
    ActivityIndicator,
    ImageBackground,
    SafeAreaView,
    ScrollView,
    Text,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import tw from "twrnc";
import { COLOR_DIY } from "../../../utils/uiMap";
import { Image } from "@rneui/themed";
import { pxToDp } from "../../../utils/stylesKits";

import FastImage from 'react-native-fast-image'

class NewsCard extends Component {
    constructor(props) {
        super(props);
        let pic = null;
        let bg=null
        if (props.news.common.hasOwnProperty("imageUrls")) {
            pic = (
                <Image
                    placeholderStyle={{
                        backgroundColor: COLOR_DIY.themeColor,
                    }}
                    PlaceholderContent={
                        <View>
                            <ActivityIndicator color='#fff' />
                            <Text style={tw.style("text-white")}>Loading...</Text>
                        </View>
                    }
                    transition={true}
                    source={{ uri: props.news.common.imageUrls[0].replace("http", "https") }}
                    style={{
                        aspectRatio: 1,
                        width: "100%",
                        borderRadius: pxToDp(5),
                    }}
                />
            );
            bg=(
                <SafeAreaView>
                    <TouchableWithoutFeedback onPress={this.goToDetails} >
                        <View style={[tw.style("my-1","mx-3"),{
                            // width:'100%',
                            height:pxToDp(200),
                            // backgroundColor: COLOR_DIY.bg_color,
                            borderRadius: pxToDp(10),
                            ...COLOR_DIY.viewShadow,
                            overflow:'hidden',
                        }]}>
                            <View style={{ width:"100%", height:"100%",borderRadius: pxToDp(1000),}}>
                                <FastImage
                                    resizeMode='cover'
                                    style={{ width:"100%", height:"100%",position:'relative'}}
                                    source={{uri:props.news.common.imageUrls[0].replace("http", "https")}}
                                >
                                    <View style={{
                                        width:'100%',
                                        height:'100%'
                                    }}>
                                        <FastImage
                                            resizeMode='cover'
                                            style={{ width:"100%", height:"100%",position:'relative'}}
                                            source={require('./img/bg.png')}
                                        >
                                            <FastImage
                                                resizeMode='cover'
                                                style={{ width:"100%", height:"100%",position:'relative'}}
                                                source={require('./img/bg.png')}
                                            >
                                                <View style={{
                                                    position:'absolute',
                                                    top:pxToDp(10),
                                                    left:pxToDp(10)

                                                }}>
                                                    <Text style={{
                                                        color:'#fff',
                                                        fontSize:16,
                                                        fontWeight:"bold",
                                                        ...COLOR_DIY.viewShadow
                                                    }}>
                                                        Top Story @ UM
                                                    </Text>
                                                </View>
                                                <View style={{
                                                    position:'absolute',
                                                    top:'30%',
                                                    left:pxToDp(10)

                                                }
                                                }>
                                                    <Text style={{color:"#fff",
                                                        fontWeight:'bold',
                                                        fontSize:18,
                                                        marginVertical:pxToDp(3),
                                                        ...COLOR_DIY.viewShadow}}>
                                                        {props.news.details[0].title}
                                                    </Text>
                                                    <Text style={{color:"#fff",
                                                        fontWeight:'bold',
                                                        fontSize:14,
                                                        ...COLOR_DIY.viewShadow}}>
                                                        {props.news.details[1].title}
                                                    </Text>
                                                </View>
                                            </FastImage >
                                        </FastImage >
                                    </View>
                                </FastImage >

                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                    <View style={[tw.style('mx-3','flex','flex-row','my-1'),{
                        paddingHorizontal:pxToDp(10),

                    }]}>
                        <Text style={{
                            color:COLOR_DIY.themeColor,
                            fontSize:15,
                            fontWeight:"bold",
                            ...COLOR_DIY.viewShadow
                        }}>
                            News @ UM
                        </Text>
                    </View>
                </SafeAreaView>
            )
        }


        this.state = {
            news: props.news,
            isFirst: props.isFirst,
            date: new Date(props.news.common.publishDate),
            pic: pic,
            bg:bg,
        };
        this.goToDetails = this.goToDetails.bind(this);
        // console.log(props.news.common.imageUrls)
    }

    goToDetails = () => {
        // const navigation=this.props.navigation
        // navigation.navigate ('NewsDetail',{
        //     news:this.state.news
        // })
        return 0;
    };

    render() {
        if (this.state.news.details.length > 0) {
            if (!this.state.isFirst) {
                return (
                    <SafeAreaView>
                        <TouchableWithoutFeedback onPress={this.goToDetails}>
                            <View
                                style={[tw.style( "pl-3", "flex", "flex-row", "justify-between", "items-center", "mx-3"), {
                                    backgroundColor: COLOR_DIY.bg_color,
                                    borderRadius: pxToDp(10),
                                    // ...COLOR_DIY.viewShadow,
                                    marginVertical:pxToDp(1)
                                }]}>
                                <View style={{
                                    width: "70%",
                                    position:'relative',
                                    paddingRight:pxToDp(3)
                                    // marginRight: 8,
                                }}>
                                    <Text style={{ color: COLOR_DIY.black.main, fontSize: pxToDp(15), fontWeight:"bold" }} numberOfLines={2}>
                                        {this.state.news.details[0].title}
                                    </Text>
                                    <Text style={{ color: COLOR_DIY.black.second, fontSize: pxToDp(14) }} numberOfLines={1}>
                                        {this.state.news.details[1].title}
                                    </Text>
                                    <View style={[tw.style('flex','flex-row'),{
                                        paddingTop:pxToDp(10)
                                    }]}>
                                        <View style={{
                                            borderColor:COLOR_DIY.black.third,
                                            // borderWidth:pxToDp(1),
                                            // backgroundColor:COLOR_DIY.themeColor,
                                            paddingHorizontal:pxToDp(2),
                                            marginRight:pxToDp(2),
                                            borderRadius:pxToDp(6),
                                            // paddingVertical:pxToDp(0)
                                        }}>
                                            <Text style={{
                                                fontSize:pxToDp(10),
                                                color:COLOR_DIY.black.third,
                                            }}>
                                                @
                                            </Text>
                                        </View>
                                        <Text style={{
                                            color: COLOR_DIY.black.third,
                                            fontSize: pxToDp(10),
                                        }}>{this.state.date.getMonth() + "-" + this.state.date.getDate()}</Text>
                                    </View>
                                </View>
                                <View style={{
                                    width: "30%",
                                    height: "100%",
                                    borderRadius: pxToDp(10),
                                }}>
                                    {this.state.pic}
                                </View>
                            </View>
                        </TouchableWithoutFeedback>
                        <View style={[tw.style( "ml-5")]}>
                            <View style={{
                                width:'60%',
                                backgroundColor:COLOR_DIY.themeColor,
                                height:pxToDp(2)
                            }}>

                            </View>
                        </View>
                    </SafeAreaView>

                );
            } else {
                return (
                    this.state.bg
                );
            }

        } else {
            return (<View></View>);
        }
    }
}

function GetNewsCard(props) {
    // const route = useRoute();
    // const navigation = useNavigation();
    // return <NewsCard {...props} route={route} navigation={navigation}/>;
    return <NewsCard {...props} />;

}

export default class NewsPage extends Component {
    constructor(props) {
        super(props);
        this.state = {
            news: [],
            isLoading: true,
            newsList: [],
        };
    }

    async getData() {
        try {
            const response = await fetch("https://api.data.um.edu.mo/service/media/news/v1.0.0/all", {
                method: "GET",
                headers: {
                    Accept: "application/json",
                    Authorization: "Bearer 3edfffda-97ce-326a-a0a5-5e876adbf89f",
                },
            });
            const json = await response.json();
            this.setState({ news: json._embedded });
        } catch (error) {
            console.log(error);
        } finally {
            this.setState({ isLoading: false });
        }
        let l = [];
        for (let i = 0; i < 50; i++) {
            if (this.state.news[i].details.length > 0) {
                l.push(<GetNewsCard news={this.state.news[i]} isFirst={i == 0} />);
            }
        }
        this.setState({
            newsList: l,
        });
    }

    componentDidMount() {
        this.getData();

    }

    render() {
        return (
            <ScrollView style={[tw.style("w-full"), {
                backgroundColor: COLOR_DIY.bg_color,
                // paddingTop:pxToDp(10)
            }]}>
                {this.state.isLoading ?
                    <ActivityIndicator style={tw.style("mt-30")} color={COLOR_DIY.themeColor} size="large" />
                    :
                    (this.state.newsList)
                }
            </ScrollView>
        );
    }
}
