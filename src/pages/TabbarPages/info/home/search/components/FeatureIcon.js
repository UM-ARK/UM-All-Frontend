import React from 'react';
import {View, StyleSheet} from 'react-native';

import {Image} from 'expo-image';
import {scale} from 'react-native-size-matters';
import Ionicons from "@react-native-vector-icons/ionicons";
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";

import {useTheme} from '../../../../../../components/ThemeContext';
import PhosphorFeatureIcon, {phosphorFeatureIcons} from './PhosphorFeatureIcon';

const ICON_TONE_MAP = {
    // 四組功能性質語義色（與服務卡片場景分組正交）
    core: 'blue',
    live: 'green',
    life: 'orange',
    alert: 'pink',
    // 兼容既有分類鍵名
    transport: 'green',
    facility: 'green',
    dining: 'orange',
    guide: 'orange',
    studySpaces: 'green',
    academic: 'blue',
    campus: 'pink',
};

const FeatureIcon = ({item, size = scale(20), muted = false, showBackground = true}) => {
    const {theme} = useTheme();
    const {bg_color, black, featureIconTones} = theme;
    const toneKey = ICON_TONE_MAP[item.iconTone] || item.iconTone || 'blue';
    const tone = featureIconTones[toneKey] || featureIconTones.blue;
    const iconColor = muted ? black.third : tone.foreground;
    const phosphorKey = item.phosphorIcon;
    const hasPhosphorIcon = Boolean(phosphorKey && phosphorFeatureIcons[phosphorKey]);
    const iconBackground = tone.background;

    const renderIcon = () => {
        if (hasPhosphorIcon) {
            return (
                <PhosphorFeatureIcon
                    name={phosphorKey}
                    size={size}
                    color={iconColor}
                />
            );
        }

        if (item.icon_type === 'ionicons') {
            return (
                <Ionicons
                    name={item.icon_name}
                    size={size}
                    color={iconColor}
                />
            );
        }

        if (item.icon_type === 'MaterialCommunityIcons') {
            return (
                <MaterialCommunityIcons
                    name={item.icon_name}
                    size={size + scale(2)}
                    color={iconColor}
                />
            );
        }

        if (item.icon_type === 'img' && item.icon_name) {
            return (
                <Image
                    source={item.icon_name}
                    style={[styles.image, {width: size, height: size}]}
                    tintColor={muted ? iconColor : undefined}
                    contentFit="contain"
                />
            );
        }

        return <Ionicons name="apps-outline" size={size} color={iconColor} />;
    };

    if (!showBackground) {
        return <View style={styles.bareContainer}>{renderIcon()}</View>;
    }

    return (
        <View style={[styles.container, {backgroundColor: muted ? bg_color : iconBackground}]}>
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
    bareContainer: {
        width: scale(36),
        height: scale(34),
        alignItems: 'center',
        justifyContent: 'center',
    },
    image: {
        borderRadius: scale(6),
    },
});

export default FeatureIcon;
