import React, { Component, useEffect } from 'react'
import { Text, View, Image, Dimensions, PixelRatio, StatusBar } from 'react-native'
import Swiper from 'react-native-swiper'    // 庫來源：https://github.com/leecade/react-native-swiper
// 在Swiper內添加removeClippedSubviews={false} 防閃屏

const { width } = Dimensions.get('window')
const { height } = Dimensions.get('window')
let pr = PixelRatio.get()


const styles = {
    container: {
        flex:1
    },
    wrapper: {},
    slide: {
        flex: 1,
        justifyContent: 'center',
        backgroundColor: 'transparent'
    },
    text: {
        color: '#fff',
        fontSize: 30,
        fontWeight: 'bold'
    },
    image: {
        width,
        flex: 1
    },
    paginationStyle: {
        position: 'absolute',
        bottom: 10,
        right: 10
    },
    paginationText: {
        color: 'white',
        fontSize: 20
    }
}

const renderPagination = (index, total, context) => {
    return (
        <View style={styles.paginationStyle}>
            <Text style={{ color: 'grey' }}>
                <Text style={styles.paginationText}>{index + 1}</Text>/{total}
            </Text>
        </View>
    )
}

function SwiperTest() {
    useEffect(()=>{
        console.log("當前默認單位1dp為",pr,"個px");
    }, [])
    return (
        <View style={styles.container}>
            <StatusBar backgroundColor={"transparent"} translucent={true}/>
            <Swiper
                style={styles.wrapper}
                // renderPagination={renderPagination}
                showsButtons = {true}
                paginationStyle={{
                    position: 'absolute',
                    // right: 5,
                    top: 150,
                    // marginTop: '10'
                }}
                autoplay={true}
                removeClippedSubviews={false}
            >
                <View style={styles.slide}>
                    <Image style={styles.image} source={require('./img/1.jpg')} />
                </View>
                <View style={styles.slide}>
                    <Image style={styles.image} source={require('./img/2.jpg')} />
                </View>
                <View style={styles.slide}>
                    <Image style={styles.image} source={require('./img/3.jpg')} />
                </View>
                <View style={styles.slide}>
                    <Image style={styles.image} source={require('./img/4.jpg')} />
                </View>
            </Swiper>

            {/* 臨時佔位，用於其他內容 */}
            <View style={{ flex:3 }}>
                <Text style={{paddingTop:100}}>Test String</Text>
            </View>

        </View>
    )
}


export default SwiperTest