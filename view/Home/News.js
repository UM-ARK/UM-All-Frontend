import React, { Component } from "react";
import { Text, View } from "react-native";

class NewsComponent extends Component{
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
    render() {
        return(
            <View>
                <Text>
                    News Card
                </Text>
            </View>
        )
    }
}

export class News extends Component{
    render() {
        return(
            <View>
                <Text>
                    News Screen
                </Text>
            </View>
        )
    }
}
