import React, { Component } from "react";
import { ActivityIndicator, SafeAreaView, ScrollView, Text, View } from "react-native";
import tw from "twrnc";
import { Image } from "@rneui/themed";

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
    render() {
        return (
            <View>
                <Text>
                    News Detail
                </Text>
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
        }
    }


    render() {
        if (this.state.news.details.length > 0) {
            return (
                <SafeAreaView>
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
                        </View>
                        <View style={tw.style("flex-1", "max-w-xs")}>
                            <Image
                                placeholderStyle={{
                                    backgroundColor: "#2F3A79",
                                }}
                                PlaceholderContent={
                                    <View>
                                        <ActivityIndicator color={"#fff"} />
                                    </View>
                                }
                                transition={true}
                                source={{ uri: this.state.news.common.imageUrls[0].replace('http','https') }}
                                style={{
                                    aspectRatio: 1,
                                    width: "100%",
                                    borderRadius:5
                                }}

                            />
                        </View>
                    </View>
                </SafeAreaView>

            );

        } else {
            return (<View></View>);
        }
    }
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
            l.push(<NewsCard news={this.state.news[i]} isFirst={i == 0} />);
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
