import React, { useState, useEffect, useContext, useMemo, memo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';

import { useTheme, themes, uiStyle } from '../../../../components/ThemeContext';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { openLink } from '../../../../utils/browser';
import { trigger } from '../../../../utils/trigger';

import { NavigationContext } from '@react-navigation/native';
import { Image } from 'expo-image';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';
import Ionicons from "react-native-vector-icons/Ionicons";
import TouchableScale from "react-native-touchable-scale";
import { inject } from 'mobx-react';

const DEFAULT_IMAGE_SIZE = scale(160);
const BORDER_RADIUS = scale(8);

const EventCard = ({ data, cardWidth, RootStore }) => {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    const navigation = useContext(NavigationContext);

    const { theme } = useTheme();
    const { white, black, viewShadow, bg_color } = theme;

    const imageSize = cardWidth || DEFAULT_IMAGE_SIZE;

    const styles = StyleSheet.create({
        // 右上角紅點提示位置
        rightTopIconPosition: {
            position: 'absolute',
            right: 0,
            top: 0,
        },
        // 紅點標籤樣式
        unFinish: {
            paddingHorizontal: scale(2),
            paddingVertical: scale(1),
            borderColor: theme.secondThemeColor,
            borderRadius: scale(20),
            borderWidth: scale(1),
            zIndex: 9,
        },
        stateNoticeText: {
            ...uiStyle.defaultText,
            fontSize: verticalScale(7),
        },
        title: {
            container: {
                backgroundColor: white,
                width: imageSize,
                padding: scale(8),
            },
            text: {
                ...uiStyle.defaultText,
                color: black.main,
                fontWeight: '500',
                fontSize: verticalScale(11),
            },
            disabledText: {
                ...uiStyle.defaultText,
                color: black.third,
                fontWeight: '500',
                fontSize: verticalScale(11),
            }
        },
    });

    const [state, setState] = useState({
        coverImgUrl: undefined,
        title: undefined,
        clubName: undefined,
        startTimeStamp: undefined,
        finishTimeStamp: undefined,
        link: undefined,
        relateImgUrl: undefined,
        type: undefined,
        imgLoading: true,
        isAdmin: false,
        eventData: undefined,
    });

    useEffect(() => {
        const eventData = data;
        setState(prevState => ({
            ...prevState,
            coverImgUrl: eventData.cover_image_url.replace('http:', 'https:'),
            title: eventData.title,
            clubName: eventData.club_name,
            startTimeStamp: eventData.startdatetime,
            finishTimeStamp: eventData.enddatetime,
            type: eventData.type,
            link: eventData.link,
            eventData,
            // 社團賬號登錄
            isAdmin: RootStore.userInfo && RootStore.userInfo.clubData ? true : false,
        }));
    }, [data, RootStore]);

    const handleJumpToDetail = () => {
        const { type, link, title, isAdmin, eventData } = state;
        trigger();
        setTimeout(() => {
            if (type === 'WEBSITE') {
                if (isAdmin) {
                    // 跳轉活動info編輯頁，並傳遞刷新函數
                    navigation.navigate('EventSetting', {
                        mode: 'edit',
                        eventData: { _id: eventData._id },
                    });
                } else {
                    openLink(link);
                }
            } else {
                navigation.navigate('EventDetail', {
                    data: eventData,
                });
            }
        }, 50);
        logToFirebase('clickEvent', {
            title: title,
            clubName: state.clubName,
        });
    };

    const {
        coverImgUrl,
        title,
        clubName,
        finishTimeStamp,
        startTimeStamp,
        type,
        imgLoading,
    } = state;

    // 當前時刻時間戳
    const nowTimeStamp = moment(new Date()).valueOf();
    // 活動進行中標誌
    const isFinish = nowTimeStamp > moment(finishTimeStamp).valueOf();
    // 活動即將結束標誌
    const isAlmost =
        moment(finishTimeStamp).diff(moment(nowTimeStamp), 'days') <= 3 &&
        moment(finishTimeStamp).isSameOrAfter(nowTimeStamp);

    return (
        <TouchableScale
            style={{
                backgroundColor: white,
                borderRadius: BORDER_RADIUS,
                margin: scale(5), 
            }}
            activeOpacity={0.9}
            onPress={handleJumpToDetail}>
            {coverImgUrl ? (
                <View
                    style={{
                        borderRadius: BORDER_RADIUS,
                        overflow: 'hidden',
                    }}>
                    <Image
                        source={coverImgUrl}
                        style={{
                            width: imageSize,
                            height: imageSize,
                            backgroundColor: white,
                            opacity: isFinish ? 0.5 : 1,
                        }}
                        contentFit='cover'
                        onLoadStart={() => setState(prevState => ({ ...prevState, imgLoading: true }))}
                        onLoad={() => setState(prevState => ({ ...prevState, imgLoading: false }))}>
                        {imgLoading && (
                            <View
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'absolute',
                                }}>
                                <ActivityIndicator
                                    size={'large'}
                                    color={theme.themeColor}
                                />
                            </View>
                        )}
                    </Image>

                    {/* website類型活動展示link圖標 */}
                    {type === 'WEBSITE' && (
                        <View style={{
                            position: 'absolute', zIndex: 2,
                            top: 10, right: 10,
                            transform: [{ rotate: '-45deg' }],
                        }}>
                            <Ionicons
                                name={'link'}
                                size={verticalScale(20)}
                                color={white}
                                style={{ ...viewShadow }}
                            />
                        </View>
                    )}

                    {/* 活動簡單描述 */}
                    <View style={styles.title.container}>
                        <View style={{ width: '100%' }}>
                            {/* 活動標題 */}
                            <Text
                                style={isFinish ? styles.title.disabledText : styles.title.text}
                                numberOfLines={3}>
                                {title}
                            </Text>
                            {/* 標識 & 組織名 */}
                            <View style={{
                                marginTop: scale(5),
                                flexDirection: 'row',
                                alignItems: 'center',
                                width: '100%'
                            }}>
                                {/* 即將結束標識 */}
                                {isAlmost ? (
                                    <View
                                        style={{
                                            ...styles.unFinish,
                                            borderColor: theme.unread,
                                        }}>
                                        <Text style={{
                                            ...styles.stateNoticeText,
                                            color: theme.unread
                                        }}>
                                            將結束
                                        </Text>
                                    </View>
                                ) : (
                                    isFinish ? (
                                        <View style={{
                                            paddingHorizontal: scale(1),
                                            borderColor: black.third, borderWidth: scale(1), borderRadius: scale(4)
                                        }}>
                                            <Text style={{
                                                ...styles.stateNoticeText,
                                                color: black.third
                                            }}>
                                                UP
                                            </Text>
                                        </View>
                                    ) : (
                                        <View style={{ ...styles.unFinish }}>
                                            <Text style={{
                                                ...styles.stateNoticeText,
                                                color: theme.secondThemeColor
                                            }}>
                                                進行中
                                            </Text>
                                        </View>
                                    )
                                )}
                                {/* 組織名 */}
                                <View style={{
                                    marginLeft: scale(3),
                                    width: isFinish ? '100%' : '80%',
                                }}>
                                    <Text
                                        numberOfLines={1}
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: black.third,
                                            fontSize: verticalScale(9),
                                        }}>
                                        {clubName}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            ) : null
            }
        </TouchableScale >
    );
};

export default inject('RootStore')(memo(EventCard));
