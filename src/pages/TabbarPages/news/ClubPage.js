import React, {Component} from 'react';
import {Text, View, StyleSheet, TouchableOpacity} from 'react-native';

import {COLOR_DIY} from '../../../utils/uiMap'
import {pxToDp} from '../../../utils/stylesKits'

import ClubCard from './components/ClubCard';

import {LargeList} from 'react-native-largelist'

// 模擬數據庫data
const dataList = [
    {
        imgUrl:'https://info.umsu.org.mo/storage/affiliate/images/d214b5a53f9854c1e698c2bb263402e9.png',
        name:'電機暨電子工程師學會',
        tag:'學會'
    },
    {
        imgUrl:'https://info.umsu.org.mo/storage/affiliate/images/49a5595ffd1938a3357b911b44f9d8d1.jpg',
        name:'工程及科技學會香港分會青年會員部澳門學生支部',
        tag:'學會'
    },
    {
        imgUrl:'https://info.umsu.org.mo/storage/affiliate/images/54435abf9d3b21a3e5f12abd31fba2cb.png',
        name:'澳門工程師學會學生分部',
        tag:'學會'
    },
    {
        imgUrl:'https://info.umsu.org.mo/storage/affiliate/images/da6f2ec4b5ec3216f9344453f796a97c.jpg',
        name:'電腦學會',
        tag:'學會'
    },
    {
        imgUrl:'https://info.umsu.org.mo/storage/affiliate/images/b102db05ad99f5ff98d09748a91253d8.png',
        name:'榮譽學院學生會',
        tag:'學生會'
    },
    {
        imgUrl:'https://info.umsu.org.mo/storage/affiliate/images/f85dbcd0a77281c42d4d086051f17e6e.jpg',
        name:'科技學院學生會',
        tag:'學生會'
    },
]

class ClubPage extends Component {
    state = {}

    render() {
        return (
            <View style={{flex:1}}>
                <View style={{backgroundColor:COLOR_DIY.bg_color, flexDirection:'row', justifyContent:'space-around', padding:pxToDp(10)}}>
                    <ClubCard data={dataList[0]}></ClubCard>
                    <ClubCard data={dataList[1]}></ClubCard>
                    <ClubCard data={dataList[2]}></ClubCard>
                </View>
                <View style={{backgroundColor:COLOR_DIY.bg_color, flexDirection:'row', justifyContent:'space-around', padding:pxToDp(10)}}>
                    <ClubCard data={dataList[4]}></ClubCard>
                    <ClubCard data={dataList[5]}></ClubCard>
                    <ClubCard data={dataList[2]}></ClubCard>
                </View>
            </View>
        );
    }
}

export default ClubPage;



// export default class HeightEqualExample extends Component {
//     _sectionCount = 10;
//     _rowCount = 10;

//     render() {
//     const data = [];
//     for (let section = 0; section < this._sectionCount; ++section) {
//       const sContent = { items: [] };
//       for (let row = 0; row < this._rowCount; ++row) {
//         sContent.items.push(row);
//       }
//       data.push(sContent);
//     }
//     return (
//         <LargeList
//             style={styles.container}
//             data={data}
//             heightForSection={() => 50}
//             renderSection={this._renderSection}
//             heightForIndexPath={() => 50}
//             renderIndexPath={this._renderIndexPath}
//         />
//     );
//     }

//     _renderSection = (section: number) => {
//         return (
//         <View style={styles.section}>
//             <Text>
//             Section {section}
//             </Text>
//         </View>
//         );
//     };

//     _renderIndexPath = ({ section: section, row: row }) => {
//         return (
//         <TouchableOpacity style={styles.row} onPress={()=>alert('點擊了')}>
//             <Text>
//             Section {section} Row {row}
//             </Text>
//             <View style={styles.line} />
//         </TouchableOpacity>
//         );
//     };
// }

// const styles = StyleSheet.create({
//     container: {
//         flex: 1
//     },
//     section: {
//         flex: 1,
//         backgroundColor: "gray",
//         justifyContent: "center",
//         alignItems: "center"
//     },
//     row: {
//         flex: 1,
//         justifyContent: "center",
//         alignItems: "center"
//     },
//     line: {
//         position: "absolute",
//         left: 0,
//         right: 0,
//         bottom: 0,
//         height: 1,
//         backgroundColor: "#EEE"
//     }
// });