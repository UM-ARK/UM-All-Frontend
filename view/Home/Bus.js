import React, { Component, useEffect, useState } from "react";
import { Text, View, TouchableOpacity, StyleSheet, ImageBackground, Image } from "react-native";

import tw from "twrnc";
import Ionicons from "react-native-vector-icons/Ionicons";

// 用於解析Campus Bus的HTML
var DomParser = require('react-native-html-parser').DOMParser


// 解析campus Bus的HTML
function getBusData(busInfoHtml){
    // 使用第三方插件react-native-html-parser，以使用DomParser（為了懶寫代碼，複用Vue寫的解析邏輯）
    // https://bestofreactjs.com/repo/g6ling-react-native-html-parser-react-native-utilities
    let doc = new DomParser().parseFromString(busInfoHtml,'text/html')

    // 主要的巴士資訊都存放在span內
    var mainInfo    = doc.getElementsByTagName('span');
    var busInfoArr  = new Array();

    // 到站時車牌屬於span（13個span）。未到站時車牌屬於div（12個span）
    // 無車服務時只有0~2的下標為busInfo（11個span）。有車服務時，0~3的下標都是busInfo（至少12個span）
    let infoIndex = mainInfo.length>=12 ? 3 : 2;

    // 分隔車輛運行資訊
    for (let i = 0; i < mainInfo.length; i++) {
        let text = mainInfo[i].textContent;
        if (i<=infoIndex) {
            busInfoArr.push(text)
        } else {break}
    }
    // console.log("busInfoArr為:",    busInfoArr);

    // 車輛和站點都在class=main的div標籤內
    var arriveInfoBuffer    = doc.getElementsByClassName('left', false);
    // console.log("巴士到達資訊HTML節點形式:",arriveInfoBuffer);

    // 將節點文字數據存入Array，用於以車牌判斷巴士到達位置
    var arriveInfoArr = []
    // 解析巴士到站數據
    for (let i = 0; i<arriveInfoBuffer.length; i++){
        let item = arriveInfoBuffer[i].textContent
        // 刪除字符串內的\t \n
        arriveInfoArr.push(  item.replace(/[\t\n]/g,"")  )
    }
    // index 0：PGH 站點
    // 1：PGH ~ E4 路上
    // 2：E4 站點，以此類推
    // 15：S4 下方的虛無站
    // console.log("巴士到站狀態數組為:",arriveInfoArr);

    // 判斷目前有無巴士
    let busPositionArr = []
    for (let i = 0; i<arriveInfoArr.length; i++){
        let item = arriveInfoArr[i];
        if (item.length > 0){
            busPositionArr.push({
                number: item,
                index:  i
            })
        }
    }
    // console.log("Bus車牌、位置總數據：",busPositionArr);

    // console.log('\n\n\n');
    return ({
        busInfoArr,
        busPositionArr
    })
}

// 巴士報站頁 - 畫面佈局與渲染
function BusScreen() {
    // useState用法, https://blog.csdn.net/wu_xianqiang/article/details/105181044
    // 鉤子用法useEffect，https://www.ruanyifeng.com/blog/2020/09/react-hooks-useeffect-tutorial.html
    let busRouteImg = require('../../static/img/Bus/bus_route.png')
    let arrowImg    = require('../../static/img/Bus/direction_left.png')
    let dotImg      = require('../../static/img/Bus/loc_dot.png')
    let [data, setData] = useState( {    busPositionArr:[{index:0}]    } )  // 設定初始化數據
    // BUG: useEffect會在每一次頁面渲染（刷新）時再次調用，嘗試使用其他生命週期函數
    // 函數式組件的生命週期觸發，參考：https://betterprogramming.pub/react-component-lifecycle-methods-with-react-hooks-efcd04987805
    // 組件渲染後 再次渲染時觸發
    useEffect(() => {
        fetchBusInfo();
    }, []);             // 尾部數組為空，則只在初次渲染時執行一次

    // TODO:有兩輛車的情況，不急做
    // 爬蟲campus Bus
    function fetchBusInfo(){
        // 訪問campusloop網站
        fetch('https://campusloop.cmdo.um.edu.mo/zh_TW/busstopinfo', {method: "GET"})
        .then(res  => res.text())
        .then(text => getBusData(text) )
        .then(result  => {
            console.log("爬蟲後的result為", result);
            // TODO: busInfoArr服務正常時，有時length為3，有時為4。為4時缺失“下一班車時間”資訊。
            result.busInfoArr.shift()       // 移除數組第一位的 “澳大環校穿梭巴士報站資訊” 字符串
            console.log("busInfoArr為", result.busInfoArr);

            {/* TODO:不止一輛巴士的情況 */}
            console.log("busPositionArr為", result.busPositionArr[0]);
            // TODO:如果沒有Bus，則觸發提醒
            setData( result )
        })

        .catch((error) => console.error(error))
    }

    // 樣式代碼
    let s = StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: "column"
        },
        bgImg: {
            flex: 1,
            resizeMode: "cover",
            justifyContent: "center"
        },
        arrowSize: {
            width:35,
            height:35,
            resizeMode:"contain",
        },
        dotSize: {
            width:21,
            height:21,
            resizeMode:"contain"
        },
    });
    let busStyleArr = [
        // 巴士到達位置，0為PGH，1為PGH~E4路上，2為E4
        {  position: 'absolute', left: 335, top: 565  },    // PGH
        {  position: 'absolute', left: 335, top: 450  },    // PGH ~ E4
        {  position: 'absolute', left: 335, top: 353  },    // E4
        {  position: 'absolute', left: 335, top: 200  },    // E4 ~ N2
        {  position: 'absolute', left: 335, top: 75  },     // N2
        {  position: 'absolute', left: 160, top: 15  },     // N2 ~ N6
        {  position: 'absolute', left: 115, top: 115  },    // N6
        {  position: 'absolute', left: 35, top: 180  },     // N6 ~ E11
        {  position: 'absolute', left: 35, top: 243  },     // E11
        {  position: 'absolute', left: 35, top: 290  },     // E11 ~ E21
        {  position: 'absolute', left: 35, top: 325  },     // N21
        {  position: 'absolute', left: 35, top: 420  },     // N21 ~ E32
        {  position: 'absolute', left: 35, top: 500  },     // E32
        {  position: 'absolute', left: 80, top: 575  },     // E32 ~ S4
        {  position: 'absolute', left: 245, top: 575  },    // s4
        {  position: 'absolute', left: 275, top: 575  },    // s4 ~ PGH
    ]

    return (
        <View style={s.container}>
            <ImageBackground source={ busRouteImg } style={s.bgImg}>
                {/* 刷新按鈕 */}
                <TouchableOpacity
                    style={{
                        position: 'absolute', top:400, right:150,
                        alignItems: "center",
                        backgroundColor: "#DDDDDD",
                        padding: 10
                    }}
                    onPress={fetchBusInfo}
                >
                    <Text>Refresh</Text>
                </TouchableOpacity>

                {/* TODO: 要檢視到站和未到站數組文字是否有變化 */}
                {/* TODO: 要檢視工作日和非工作日數組文字是否有變化 */}
                {/* Bus運行信息的渲染 */}
                <View style={{
                    position:"absolute",  top:5,  left:5,
                    backgroundColor:"#d1d1d1",
                    borderRadius:20,
                    paddingLeft:20,
                    paddingRight:20,
                }}>
                    {/* 渲染數組，並換行 */}
                    {
                        data.busInfoArr.map((item)=>{
                            return <Text>{item}</Text>
                        })
                    }
                </View>

                {/* TODO:在Sketch中修改文字邊框為圓角，使用整張作背景 */}
                {/* TODO:使用絕對位置在不同分辨率下的問題，尋找適配方法，像素單位等 */}
                {/* TODO:無Bus的情況，連busPositionArr都為空(undefined)，應隱藏Bus圖標 */}
                {/* TODO:不止一輛巴士的情況 */}
                {/* 巴士圖標 */}
                <View style={  busStyleArr[  (data.busPositionArr.length>0) ? (data.busPositionArr[0].index) : 0 ]  }>
                    <Ionicons name={"bus"} size={30} color={"#2F3A79"} />
                </View>

                {/* 右上箭頭 */}
                <View style={ {position: 'absolute', left: 310, top: 25,} }>
                    <Image source={arrowImg} style={s.arrowSize} />
                </View>
                {/* 左上箭頭 */}
                <View style={ {position: 'absolute', left: 45, top: 140,} }>
                    <Image source={arrowImg} style={[s.arrowSize, {transform: [{rotate:'-90deg'}]} ]} />
                </View>
                {/* 左下箭頭 */}
                <View style={ {position: 'absolute', left: 45, top: 610,} }>
                    <Image source={arrowImg} style={[s.arrowSize, {transform: [{rotate:'180deg'}]} ]} />
                </View>
                {/* 右下箭頭 */}
                <View style={ {position: 'absolute', left: 315, top: 610,} }>
                    <Image source={arrowImg} style={[s.arrowSize, {transform: [{rotate:'90deg'}]} ]} />
                </View>

                {/* 站點圓點標誌 */}
                {/* PGH */}
                <View style={ {position: 'absolute', left: 310, top: 570,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 310, top: 360,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 310, top: 80,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 145, top: 120,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 62, top: 250,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 62, top: 330,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                <View style={ {position: 'absolute', left: 62, top: 510,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>
                {/* S4 */}
                <View style={ {position: 'absolute', left: 250, top: 602,} }>
                    <Image source={dotImg} style={s.dotSize} />
                </View>

                {/* 巴士站點文字 */}
                <View style={[tw.style("border-2", "border-blue-900", "w-38"), {position: 'absolute', left: 155, top: 565,}]}>
                    <Text style={tw.style("text-base")}>PGH 研究生宿舍(起)</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-23.5"), {position: 'absolute', left: 210, top: 355,}]}>
                    <Text style={tw.style("text-base")}>E4 劉少榮樓</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-23.5"), {position: 'absolute', left: 210, top: 75,}]}>
                    <Text style={tw.style("text-base")}>N2 大學會堂</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-20"), {position: 'absolute', left: 170, top: 115,}]}>
                    <Text style={tw.style("text-base")}>N6 行政樓</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-25.5"), {position: 'absolute', left: 85, top: 245,}]}>
                    <Text style={tw.style("text-base")}>E11 科技學院</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-30"), {position: 'absolute', left: 85, top: 325,}]}>
                    <Text style={tw.style("text-base")}>E21 人文社科樓</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-22"), {position: 'absolute', left: 85, top: 505,}]}>
                    <Text style={tw.style("text-base")}>E32 法學院</Text>
                </View>
                <View style={[tw.style("border-2", "border-blue-900", "w-46.5"), {position: 'absolute', left: 120, top: 620,}]}>
                    <Text style={tw.style("text-base")}>S4 研究生宿舍南四座(終)</Text>
                </View>

            </ImageBackground>
        </View>
    )
}


export default BusScreen;