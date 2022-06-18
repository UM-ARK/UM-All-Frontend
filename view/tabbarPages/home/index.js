import React, {Component, Fragment} from 'react';
import {
    Button,
    View, 
    Text,
    Image,
    SafeAreaView,
    Dimensions,
    StyleSheet,
} from 'react-native';
import Ionicons from "react-native-vector-icons/Ionicons";
import SearchBar from 'react-native-search-bar';
// https://github.com/meliorence/react-native-snap-carousel
import Carousel, { ParallaxImage, Pagination, } from 'react-native-snap-carousel';

const { width: screenWidth } = Dimensions.get('window')
const { height: screenHeight } = Dimensions.get('window')

export default class HomeScreen extends Component {
    state = {
        entries:[
            {
                title:'1',
                thumbnail:'http://up.deskcity.org/pic_360/202203/sl/0h3tbuaaqak3413.jpg',
            },
            {
                title:'2',
                thumbnail:'http://up.deskcity.org/pic_360/202203/sl/rhufva2zhw43023.jpg',
            },
            {
                title:'3',
                thumbnail:'http://up.deskcity.org/pic_360/202010/sl/nbcfqns2b3n3440.jpg',
            },
        ],
        activeSlide:0
    }

    // 接收搜索框輸入文本
    handleSearchBarInput = (text) => {
		console.log("搜索框輸入的文本為",text);
	}

    // 輪播圖內容
    _renderItem ({item, index}, parallaxProps) {
        return (
            <View style={styles.item}>
                <ParallaxImage
                    source={{ uri: item.thumbnail }}
                    containerStyle={styles.imageContainer}
                    style={styles.image}
                    parallaxFactor={0.4}
                    {...parallaxProps}
                />
                {/* <Text style={styles.title} numberOfLines={2}>
                    { item.title }
                </Text> */}
            </View>
        );
    }

    render () {
        const { entries, activeSlide } = this.state;
        return (
            <View>
                {/* 搜索框組件 */}
                <View style={{marginTop:10}}>
                    <SearchBar
                    ref="searchBar"
                    placeholder="Search"
                    onChangeText={this.handleSearchBarInput}
                    onSearchButtonPress={()=>{
                        console.log('onSearchButtonPress')
                        this.refs.searchBar.unFocus;	// 點擊搜索的瞬間，把鍵盤收起
                    }}
                    onCancelButtonPress={()=>console.log('onCancelButtonPress')}
                    />
                </View>

                {/* 輪播圖組件 */}
                <View style={{marginTop:10}}>
                    <Carousel
                        sliderWidth={screenWidth}
                        sliderHeight={screenWidth}
                        itemWidth={screenWidth - 75}
                        hasParallaxImages={true}
                        data={this.state.entries}
                        renderItem={this._renderItem}
                        onSnapToItem={(index) => this.setState({ activeSlide:index }) }
                        loop={true} autoplay={true} autoplayDelay={200}
                    />
                    {/* 輪播圖圓點 */}
                    <Pagination
                        dotsLength={entries.length}
                        activeDotIndex={activeSlide}
                        containerStyle={{ backgroundColor:'transparent', marginTop:-20}}
                        dotStyle={{
                            width: 10, height: 10,
                            borderRadius: 5,
                            marginHorizontal: 8,
                            backgroundColor: '#000'
                        }}
                        inactiveDotStyle={{
                            // Define styles for inactive dots here
                            // backgroundColor: '#ccc'
                        }}
                        inactiveDotOpacity={0.4}
                        inactiveDotScale={0.6}
                    />
                </View>

                {/* 部分應用展示 */}
                <View style={{justifyContent:'center', alignItems:'center'}}>
                    <Text style={{paddingLeft:18}}>應用</Text>
                    <View style={{width:"80%", flexDirection:'row', justifyContent:"space-around"}}>
                        <View style={{justifyContent:'center', alignItems:'center'}}>
                            <Ionicons name='bonfire-sharp' size={30} color='#2F3A79' />
                            <Text>Moodle</Text>
                        </View>
                        <View style={{justifyContent:'center', alignItems:'center'}}>
                            <Ionicons name='bus' size={30} color='#2F3A79' />
                            <Text>校園巴士</Text>
                        </View>
                        <View style={{justifyContent:'center', alignItems:'center'}}>
                            <Ionicons name='build' size={30} color='#2F3A79' />
                            <Text>設置</Text>
                        </View>
                    </View>
                </View>
                <View><Text>{'\n\n'}</Text></View>
                
                {/* 到來中或已follow的活動展示 */}
                <View style={{justifyContent:'center', alignItems:'center'}}>
                    <Text>Activities</Text>
                    <Text>您Follow的: LCWC High Table Dinner.</Text>
                    <Text>Time: Tomorrow 17:00</Text>
                </View>
                <View><Text>{'\n\n'}</Text></View>

                {/* Deadline提醒 */}
                <View style={{justifyContent:'center', alignItems:'center'}}>
                    <Text>Deadline</Text>
                    <Text>MATH1003. Deadline: Tonight 00:00</Text>
                </View>

            </View>
        );
    }
}

const styles = StyleSheet.create({
    item: {
        width   : screenWidth - 60,
        height  : 150,
    },
    imageContainer: {
        flex: 1,
        marginBottom: Platform.select({ ios: 0, android: 1 }), // Prevent a random Android rendering issue
        backgroundColor: 'white',
        borderRadius: 8,
    },
    image: {
        ...StyleSheet.absoluteFillObject,
        resizeMode: 'cover',
    },
})