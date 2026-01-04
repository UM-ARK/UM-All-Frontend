import React, { useState, useContext } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';

import { NavigationContext } from '@react-navigation/native';
import { Image } from 'expo-image';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from "react-native-touchable-scale";

const IMG_SIZE = verticalScale(45);

const ClubCard = ({ data }) => {
    // NavigationContext组件可以在非基页面拿到路由信息
    const navigation = useContext(NavigationContext);
    const { theme } = useTheme();
    const { themeColor, black, white, trueWhite } = theme;

    const [imgLoading, setImgLoading] = useState(true);
    const { logo_url, name } = data;

    // 处理点击跳转逻辑
    const handleJumpToDetail = () => {
        trigger();
        setTimeout(() => {
            navigation.navigate('ClubDetail', {
                data: data,
            });
        }, 50);
    };

    return (
        <TouchableScale
            style={{
                backgroundColor: white,
                borderRadius: scale(10),
                justifyContent: 'space-around',
                alignItems: 'center',
                paddingVertical: scale(8),
                margin: scale(3),
            }}
            activeOpacity={0.8}
            onPress={handleJumpToDetail}>
            {/* 社团 / 组织 Logo */}
            <Image
                source={logo_url}
                style={{
                    backgroundColor: trueWhite,
                    width: IMG_SIZE,
                    height: IMG_SIZE,
                    borderRadius: scale(50),
                }}
                contentFit='contain'
                onLoadStart={() => setImgLoading(true)}
                onLoad={() => setImgLoading(false)}>
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
                            color={themeColor}
                        />
                    </View>
                )}
            </Image>

            {/* 组织名 */}
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                    alignItems: 'center',
                    marginTop: scale(5),
                    width: '80%'
                }}>
                <Text
                    style={{ ...uiStyle.defaultText, color: black.main, fontSize: verticalScale(10) }}
                    numberOfLines={1}>
                    {name}
                </Text>
            </View>
        </TouchableScale>
    );
};

export default ClubCard;
