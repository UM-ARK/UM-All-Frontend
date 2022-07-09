import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

const EventDescription = ({item}) => {
    return (
        /* 活動卡的介紹部件容器 */
        <View style={{paddingVertical: 10, paddingHorizontal: 10}}>
            {/* 第一行 （） */} 
            <View style={styles.container}>
                {/* 標題 */} 
                <Text style={styles.title} numberOfLines={1}>
                    {item.title}
                </Text>
                {/* 點擊進入 */} 
                <Ionicons
                    name="chevron-forward-outline"
                    size={pxToDp(14)}
                    color={COLOR_DIY.black.main}
                ></Ionicons>
            </View>
            {/* 活動內容 */} 
            <Text style={styles.body} numberOfLines={2}>
                {item.text}
            </Text>
            {/* 活動日期 */} 
            <Text style={styles.eventDate}>
                {'活動日期: ' + item.eventDate}
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: pxToDp(16),
        color: '#212121',
        fontWeight: 'bold',
        width: '90%',
    },
    body: {
        fontSize: pxToDp(12),
        color: '#383838',
        fontWeight: 'bold',
        width: '90%',
    },
    eventDate: {
        width: '100%',
        fontSize: pxToDp(10),
        color: '#536162',
        fontWeight: '700',
        textAlign: 'left',
        paddingTop: pxToDp(2),
    }
});

export default EventDescription;
