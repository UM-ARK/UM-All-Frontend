import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Image } from 'expo-image';
import FontAwesome6 from "@react-native-vector-icons/fontawesome6";
import FA6_META from '@react-native-vector-icons/fontawesome6/glyphmaps/FontAwesome6_meta.json';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import { scale, verticalScale } from 'react-native-size-matters';

import { useTheme } from '../../../../components/ThemeContext';

// 紀念日／慶典型徽章：Discourse 常標為銀級，視覺改用金色更喜慶
const FESTIVE_BADGE_ICONS = new Set([
    'cake-candles',
    'cake',
    'birthday-cake',
    'gift',
    'party-horn',
    'champagne-glasses',
]);

// Discourse icon → FA6 iconStyle；meta 鍵名 brand 對應 props brands
const FA6_STYLE_CANDIDATES = [
    { metaKey: 'solid', iconStyle: 'solid' },
    { metaKey: 'regular', iconStyle: 'regular' },
    { metaKey: 'brand', iconStyle: 'brands' },
];

/**
 * 解析 Discourse 徽章 icon（如 far-eye / fas-heart / fab-github / eye）
 * 回傳 FA6 可用的 {name, iconStyle}；無法對應時回 null
 */
const resolveDiscourseFaIcon = rawIcon => {
    if (typeof rawIcon !== 'string') {
        return null;
    }

    const trimmed = rawIcon.trim().toLowerCase();
    if (!trimmed || trimmed.startsWith('discourse-')) {
        return null;
    }

    let preferredStyle = 'solid';
    let name = trimmed;

    if (trimmed.startsWith('far-')) {
        preferredStyle = 'regular';
        name = trimmed.slice(4);
    } else if (trimmed.startsWith('fab-')) {
        preferredStyle = 'brands';
        name = trimmed.slice(4);
    } else if (trimmed.startsWith('fas-')) {
        preferredStyle = 'solid';
        name = trimmed.slice(4);
    } else if (trimmed.startsWith('fa-')) {
        preferredStyle = 'solid';
        name = trimmed.slice(3);
    }

    if (!name) {
        return null;
    }

    const preferred = FA6_STYLE_CANDIDATES.find(
        item => item.iconStyle === preferredStyle,
    );
    if (preferred && FA6_META[preferred.metaKey]?.includes(name)) {
        return { name, iconStyle: preferred.iconStyle };
    }

    // 指定 style 沒有時，改試其他 FA6 style，避免問號 glyph
    for (const candidate of FA6_STYLE_CANDIDATES) {
        if (
            candidate.iconStyle !== preferredStyle &&
            FA6_META[candidate.metaKey]?.includes(name)
        ) {
            return { name, iconStyle: candidate.iconStyle };
        }
    }

    return null;
};

const getNormalizedIconName = rawIcon =>
    resolveDiscourseFaIcon(rawIcon)?.name ||
    (typeof rawIcon === 'string' ? rawIcon.trim().toLowerCase() : '');

const isFestiveBadge = badge =>
    FESTIVE_BADGE_ICONS.has(getNormalizedIconName(badge?.icon)) ||
    /anniversary|紀念日|生日/i.test(badge?.name || '');

const getBadgeColors = (theme, badge) => {
    if (badge.badgeTypeId === 1 || isFestiveBadge(badge)) {
        return {
            backgroundColor: theme.achievement.goldTonal,
            color: theme.achievement.gold,
        };
    }
    if (badge.badgeTypeId === 2) {
        return {
            backgroundColor: theme.achievement.silverTonal,
            color: theme.achievement.silver,
        };
    }
    return {
        backgroundColor: theme.achievement.bronzeTonal,
        color: theme.achievement.bronze,
    };
};

const HarborBadgeIcon = ({ badge, compact = false }) => {
    const { theme } = useTheme();
    const colors = getBadgeColors(theme, badge);
    const resolvedIcon = resolveDiscourseFaIcon(badge.icon);
    const iconSize = scale(compact ? 21 : 26);
    const fallbackSize = scale(compact ? 23 : 27);

    return (
        <View
            style={[
                compact ? styles.compactContainer : styles.container,
                { backgroundColor: colors.backgroundColor },
            ]}>
            {badge.imageUrl ? (
                <Image
                    source={{ uri: badge.imageUrl }}
                    style={compact ? styles.compactImage : styles.image}
                    contentFit="contain"
                />
            ) : resolvedIcon ? (
                <FontAwesome6
                    name={resolvedIcon.name}
                    iconStyle={resolvedIcon.iconStyle}
                    size={iconSize}
                    color={colors.color}
                />
            ) : (
                <MaterialCommunityIcons
                    name="medal-outline"
                    size={fallbackSize}
                    color={colors.color}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: scale(58),
        height: scale(58),
        borderRadius: scale(19),
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactContainer: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(5),
    },
    image: {
        width: scale(39),
        height: scale(39),
    },
    compactImage: {
        width: scale(28),
        height: scale(28),
    },
});

export default HarborBadgeIcon;
