import React from 'react';
import {View, StyleSheet} from 'react-native';

import {Image} from 'expo-image';
import {scale} from 'react-native-size-matters';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {useTheme} from '../../../../../../components/ThemeContext';

const FeatureIcon = ({item, size = scale(20)}) => {
    const {theme} = useTheme();
    const {themeColor, tonal} = theme;

    const renderIcon = () => {
        if (item.icon_type === 'ionicons') {
            return (
                <Ionicons
                    name={item.icon_name}
                    size={size}
                    color={themeColor}
                />
            );
        }

        if (item.icon_type === 'MaterialCommunityIcons') {
            return (
                <MaterialCommunityIcons
                    name={item.icon_name}
                    size={size + scale(2)}
                    color={themeColor}
                />
            );
        }

        if (item.icon_type === 'img' && item.icon_name) {
            return (
                <Image
                    source={item.icon_name}
                    style={[styles.image, {width: size, height: size}]}
                    contentFit="contain"
                />
            );
        }

        return <Ionicons name="apps-outline" size={size} color={themeColor} />;
    };

    return (
        <View style={[styles.container, {backgroundColor: tonal.primary15}]}>
            {renderIcon()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        borderRadius: scale(6),
    },
});

export default FeatureIcon;
