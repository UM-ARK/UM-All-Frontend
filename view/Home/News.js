import React, { Component } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import tw from "twrnc";

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
        this.state={
            news:props.news
        }
    }


    render() {
        if (this.state.news.details[0].title!=undefined){
            return(
                <View>
                    <Text>
                        {this.state.news.details[0].title}
                    </Text>
                </View>
            )
        }
        else {
            return (<View></View>)
        }
    }
}

export class News extends Component{
    constructor(props) {
        super(props);
        this.state={
            news:[],
            isLoading:true,
            newsList:[]
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
        let l=[]
        for (let i = 0; i < 15; i++) {
            l.push(<NewsCard news={this.state.news[i]}></NewsCard>)
        }
        this.setState({
            newsList:l
        })
    }
    componentDidMount() {
        this.getData();

    }


    render() {
        return(
            <ScrollView style={tw.style("w-full", "h-full", "bg-white")}>
                {this.state.isLoading ?
                    <ActivityIndicator></ActivityIndicator>
                    :
                    (this.state.newsList)

                }
            </ScrollView>
        )
    }
}
