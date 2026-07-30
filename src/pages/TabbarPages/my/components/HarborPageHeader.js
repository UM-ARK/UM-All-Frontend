import React from 'react';
import {Animated, StyleSheet, Text, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {trigger} from '../../../../utils/trigger';

const AVATAR_SOURCE = require('../../../../static/img/logo_round.png');

const HarborPageHeader = ({
    compact = false,
    user,
    scrollY,
    onSettingsPress,
}) => {
    const {theme} = useTheme();
    const {t} = useTranslation(['common', 'my']);
    const avatarOpacity = scrollY
        ? scrollY.interpolate({
            inputRange: [verticalScale(28), verticalScale(72)],
            outputRange: [0, 1],
            extrapolate: 'clamp',
        })
        : 0;

    return (
        <View style={[styles.container, compact && styles.compactContainer]}>
            {compact ? null : (
                <View>
                    <Text style={[styles.eyebrow, {color: theme.themeColor}]}>
                        ARK ALL · HARBOR
                    </Text>
                    <Text style={[styles.title, {color: theme.black.main}]}>
                        {t('個人中心', {ns: 'my'})}
                    </Text>
                </View>
            )}
            {compact && user ? (
                <Animated.View
                    pointerEvents="none"
                    style={[
                        styles.compactAvatarWrap,
                        {opacity: avatarOpacity},
                    ]}>
                    <Image
                        source={
                            user.avatarUrl
                                ? {uri: user.avatarUrl}
                                : AVATAR_SOURCE
                        }
                        style={styles.compactAvatar}
                        contentFit="cover"
                    />
                </Animated.View>
            ) : null}
            <View style={styles.actions}>
                <TouchableScale
                    accessibilityRole="button"
                    accessibilityLabel={t('設置')}
                    style={[
                        styles.button,
                        {backgroundColor: theme.tonal.primary15},
                    ]}
                    onPress={() => {
                        trigger();
                        onSettingsPress();
                    }}>
                    <Ionicons
                        name="settings-outline"
                        size={verticalScale(18)}
                        color={theme.themeColor}
                    />
                </TouchableScale>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(54),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(12),
    },
    compactContainer: {
        justifyContent: 'flex-end',
        minHeight: scale(42),
        marginBottom: 0,
    },
    compactAvatarWrap: {
        position: 'absolute',
        left: '50%',
        top: '50%',
        width: scale(30),
        height: scale(30),
        borderRadius: scale(15),
        marginLeft: scale(-15),
        marginTop: scale(-15),
        overflow: 'hidden',
    },
    compactAvatar: {
        width: '100%',
        height: '100%',
        borderRadius: scale(15),
    },
    eyebrow: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '750',
        letterSpacing: scale(1.25),
        marginBottom: verticalScale(2),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(27),
        fontWeight: '760',
        letterSpacing: scale(-0.5),
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    button: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HarborPageHeader;
