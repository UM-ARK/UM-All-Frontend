import React from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    useWindowDimensions,
    View,
} from 'react-native';

import {useTranslation} from 'react-i18next';
import {scale, verticalScale} from 'react-native-size-matters';

import Text from './AppText';
import {uiStyle, useTheme} from './ThemeContext';
import {useHarborSession} from '../contexts/HarborSessionContext';

const HarborAuthorizationLoadingOverlay = () => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const {height} = useWindowDimensions();
    const {authorizationPhase, status} = useHarborSession();

    if (
        status !== 'authorizing' ||
        !authorizationPhase ||
        authorizationPhase === 'browser'
    ) {
        return null;
    }

    return (
        <View
            accessibilityLiveRegion="polite"
            accessibilityViewIsModal
            style={[styles.overlay, {height}]}>
            <View
                style={[
                    StyleSheet.absoluteFill,
                    styles.backdrop,
                    {backgroundColor: theme.trueBlack},
                ]}
            />
            <View
                style={[
                    styles.card,
                    {backgroundColor: theme.white},
                    theme.viewShadow,
                ]}>
                <ActivityIndicator
                    size="large"
                    color={theme.themeColor}
                />
                <Text
                    style={[
                        styles.title,
                        {color: theme.black.main},
                    ]}>
                    {t('正在準備 Harbor 安全登入…')}
                </Text>
                <Text
                    style={[
                        styles.description,
                        {color: theme.black.third},
                    ]}>
                    {t('請稍候，不要重複操作。')}
                </Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
        elevation: 1000,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    backdrop: {
        opacity: 0.36,
    },
    card: {
        width: '100%',
        maxWidth: scale(320),
        alignItems: 'center',
        borderRadius: scale(18),
        paddingHorizontal: scale(24),
        paddingVertical: verticalScale(24),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '700',
        textAlign: 'center',
        marginTop: verticalScale(14),
    },
    description: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        textAlign: 'center',
        marginTop: verticalScale(6),
    },
});

export default HarborAuthorizationLoadingOverlay;
