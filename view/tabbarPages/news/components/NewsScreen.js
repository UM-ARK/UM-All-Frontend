import React, { Component } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, TouchableWithoutFeedback, View } from "react-native";
import tw from "twrnc";
import { Image } from "@rneui/themed";
import { useNavigation, useRoute } from "@react-navigation/native";
import WebView from "react-native-webview";
import { Tab, TabView } from '@rneui/themed';

function getNewsData(){
    return fetch('https://api.data.um.edu.mo/service/media/news/v1.0.0/all',{
        method: 'GET',
        headers: {
            Accept: 'application/json',
            Authorization: 'Bearer 3edfffda-97ce-326a-a0a5-5e876adbf89f'
        },
    }).then((response) => response.json()).then((json)=>{
        return json._embedded
    }).catch((error) => {
        console.error(error);
    })
}

export class NewsComponent extends Component{
    constructor(props) {
        super(props);
        const { route } = props;
        this.state={
            news:route.params.news,
            langLocation:0
        }
        let a=1
    }
    setIndex=(e)=>{
        this.setState({
            langLocation:e
        })
    }
    render() {
        return (
            <View style={{
                flex: 1,
                paddingHorizontal:5,
                backgroundColor:'#fff'
            }}>
                <SafeAreaView>
                    <View  style={tw.style( "bg-white",'pb-3')}>
                        <View style={tw.style('mt-5','mx-2')}>
                            <Text style={tw.style("text-black", "text-xl")}>
                                {this.state.news.details[1].title}
                            </Text>
                            <Text style={tw.style( "text-base")}>
                                {this.state.news.details[0].title}
                            </Text>
                        </View>

                    </View>
                </SafeAreaView>
                <View style={tw.style('mx-2','flex','flex-row')}>
                    <TouchableWithoutFeedback>
                        <View>
                            <Text>
                                {this.state.news.details[0].locale}
                            </Text>
                        </View>
                    </TouchableWithoutFeedback>

                    <TouchableWithoutFeedback>
                        <View>
                            <Text>
                                {this.state.news.details[1].locale}
                            </Text>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
                <WebView
                    source={{
                        html:'<meta name="viewport" content="width=device-width, initial-scale=1">'+this.state.news.details[this.state.langLocation].content
                    }}
                    style={{flex: 1}}
                />

            </View>

        )
    }
}



class NewsCard extends Component{
    constructor(props) {
        super(props);
        this.state= {
            news: props.news,
            isFirst: props.isFirst,
            date:new Date(props.news.common.publishDate)
        }
        this.goToDetails=this.goToDetails.bind(this)
    }

    goToDetails=()=>{
        const navigation=this.props.navigation
        navigation.navigate ('NewsDetail',{
            news:this.state.news
        })
    }
    render() {
        if (this.state.news.details.length > 0) {
            return (
                <SafeAreaView>
                    <TouchableWithoutFeedback onPress={this.goToDetails}>
                        <View style={tw.style("my-2", "mx-5", "flex", "flex-row", "justify-between", "items-center")}>
                            <View style={{
                                width: "70%",
                                marginRight: 8,
                            }}>
                                <Text style={tw.style("text-black", "text-sm")}>
                                    {this.state.news.details[1].title}
                                </Text>
                                <Text>
                                    {this.state.news.details[0].title}
                                </Text>
                                <Text style={tw.style('mt-1','text-xs')}>{this.state.date.getFullYear()+'/'+this.state.date.getMonth()+'/'+this.state.date.getDate()}</Text>
                            </View>
                            <View style={tw.style("flex-1", "max-w-xs")}>
                                <Image
                                    placeholderStyle={{
                                        backgroundColor: "#2F3A79",
                                    }}
                                    PlaceholderContent={
                                        <View>
                                            <ActivityIndicator color={"#fff"} />
                                            <Text style={tw.style('text-white')}>Loading...</Text>
                                        </View>
                                    }
                                    transition={true}
                                    source={{ uri: this.state.news.common.imageUrls[0].replace('http','https') }}
                                    style={{
                                        aspectRatio: 1,
                                        width: "100%",
                                        borderRadius:2
                                    }}

                                />
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </SafeAreaView>

            );

        } else {
            return (<View></View>);
        }
    }
}
function GetNewsCard(props){
    const route = useRoute();
    const navigation = useNavigation();
    return <NewsCard {...props} route={route} navigation={navigation}/>;
}

export class News extends Component{
    constructor(props) {
        super(props);
        this.state= {
            news: [],
            isLoading: true,
            newsList: [],
        }


    }

    async getData(){
        try {
            const response = await fetch('https://api.data.um.edu.mo/service/media/news/v1.0.0/all',{
                method: 'GET',
                headers: {
                    Accept: 'application/json',
                    Authorization: 'Bearer 3edfffda-97ce-326a-a0a5-5e876adbf89f'
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
            if (this.state.news[i].details.length > 0){
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
        return(
            <ScrollView style={tw.style("w-full", "h-full", "bg-white")}>
                {this.state.isLoading ?
                    <ActivityIndicator style={tw.style("mt-30")} color={"#2F3A79"} size="large" />
                    :
                    (this.state.newsList)

                }
            </ScrollView>
        )
    }
}