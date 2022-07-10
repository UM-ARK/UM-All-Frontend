import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

import Ionicons from 'react-native-vector-icons/Ionicons';

import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';

const EventDescription = ({item, style}) => {
    return (
        /* 活動卡的介紹部件容器 */
        <View style={{...styles.container, ...style}}>
            {/* 文字內容 */}
            <View style={{...styles.textContainer}}>
                {/* 標題 */}
                <View style={styles.titleContainer}>
                    <Text style={styles.title} numberOfLines={1}>
                        {item.title}
                    </Text>
                </View>
                {/* 活動內容 */}
                <Text style={styles.body} numberOfLines={2}>
                    {item.text}
                </Text>
            </View>

            {/* 點擊進入引導Icon */}
            <View style={styles.iconContainer}>
                <Ionicons
                    name="chevron-forward-outline"
                    size={pxToDp(18)}
                    color={COLOR_DIY.black.main}
                />
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    textContainer: {
        width: '95%',
        flexDirection: 'column',
    },
    titleContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconContainer: {
        justifyContent: 'center',
    },
    title: {
        fontSize: pxToDp(16),
        color: COLOR_DIY.black.main,
        fontWeight: 'bold',
        width: '90%',
    },
    body: {
        fontSize: pxToDp(12),
        color: COLOR_DIY.black.second,
        fontWeight: '500',
        width: '90%',
    },
    eventDate: {
        width: '100%',
        fontSize: pxToDp(10),
        color: COLOR_DIY.black.second,
        fontWeight: '500',
        textAlign: 'left',
        paddingTop: pxToDp(2),
    },
});

export default EventDescription;
