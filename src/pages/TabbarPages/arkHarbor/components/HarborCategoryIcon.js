import React, {memo, useMemo} from 'react';
import {StyleSheet, View} from 'react-native';

import {Image} from 'expo-image';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale} from 'react-native-size-matters';

import {useTheme} from '../../../../components/ThemeContext';
import {
    ARK_HARBOR_ABSOLUTE_URL,
    ARK_HARBOR_EMOJI_URL,
} from '../../../../utils/pathMap';

function resolveCategoryImageUrl(category) {
    if (!category || typeof category !== 'object') {
        return '';
    }

    if (category.emoji) {
        return ARK_HARBOR_EMOJI_URL(category.emoji);
    }

    const logoUrl = category.logoUrl;
    if (typeof logoUrl === 'string' && logoUrl.trim()) {
        return ARK_HARBOR_ABSOLUTE_URL(logoUrl.trim());
    }

    return '';
}

const HarborCategoryIcon = memo(({
    category,
    size = scale(18),
    color,
    fallbackIcon = 'folder-outline',
    style,
}) => {
    const {theme} = useTheme();
    const imageUrl = useMemo(
        () => resolveCategoryImageUrl(category),
        [category],
    );
    const iconColor = color || theme.themeColor;

    if (imageUrl) {
        return (
            <View style={[styles.imageWrap, {width: size, height: size}, style]}>
                <Image
                    accessibilityIgnoresInvertColors
                    contentFit="contain"
                    source={{uri: imageUrl}}
                    style={{width: size, height: size}}
                />
            </View>
        );
    }

    return (
        <MaterialCommunityIcons
            color={iconColor}
            name={fallbackIcon}
            size={size}
            style={style}
        />
    );
});

const styles = StyleSheet.create({
    imageWrap: {
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
});

export default HarborCategoryIcon;
