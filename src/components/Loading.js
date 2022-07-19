import React, { Component } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import {COLOR_DIY} from '../utils/uiMap'

class Loading extends Component {
    render() {
        return (
            <View style={[styles.container, styles.horizontal]}>
                <ActivityIndicator size='large'
                color='#52b2e8'/>
                {/*
        <ActivityIndicator size="large" />
        <ActivityIndicator size="small" color="#0000ff" />
    <ActivityIndicator size="large" color="#00ff00" />*/}
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: "center"
    },
    horizontal: {
        flexDirection: "row",
        justifyContent: "space-around",
        padding: 10
    }
});

export default Loading;