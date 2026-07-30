import React from 'react';
import {StyleSheet, View} from 'react-native';

import {Image} from 'expo-image';
import FontAwesome6 from 'react-native-vector-icons/FontAwesome6';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';

import {useTheme} from '../../../../components/ThemeContext';

const getBadgeColors = (theme, badgeTypeId) => {
    if (badgeTypeId === 1) {
        return {
            backgroundColor: theme.achievement.goldTonal,
            color: theme.achievement.gold,
        };
    }
    if (badgeTypeId === 2) {
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

const HarborBadgeIcon = ({badge, compact = false}) => {
    const {theme} = useTheme();
    const colors = getBadgeColors(theme, badge.badgeTypeId);
    const hasApiIcon =
        badge.icon && FontAwesome6.hasIcon(badge.icon, 'solid');

    return (
        <View
            style={[
                compact ? styles.compactContainer : styles.container,
                {backgroundColor: colors.backgroundColor},
            ]}>
            {badge.imageUrl ? (
                <Image
                    source={{uri: badge.imageUrl}}
                    style={compact ? styles.compactImage : styles.image}
                    contentFit="contain"
                />
            ) : hasApiIcon ? (
                <FontAwesome6
                    name={badge.icon}
                    solid
                    size={scale(compact ? 21 : 26)}
                    color={colors.color}
                />
            ) : (
                <MaterialCommunityIcons
                    name="medal-outline"
                    size={scale(compact ? 23 : 27)}
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
