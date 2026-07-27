import React from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {trigger} from '../../../../utils/trigger';
import HarborSectionHeader from './HarborSectionHeader';

const HarborGuestState = ({isAuthorizing, onLogin, onBrowse}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const features = [
        {
            key: 'identity',
            icon: 'person-circle-outline',
            title: t('同步論壇身份'),
            description: t('查看等級、徽章與個人統計'),
        },
        {
            key: 'activity',
            icon: 'pulse-outline',
            title: t('集中管理互動'),
            description: t('快速找到話題、回覆與收藏'),
        },
        {
            key: 'message',
            icon: 'notifications-outline',
            title: t('不錯過新消息'),
            description: t('集中查看站內訊息與通知'),
        },
    ];

    return (
        <View style={styles.container}>
            <View
                style={[
                    styles.hero,
                    {backgroundColor: theme.white},
                ]}>
                <View
                    style={[
                        styles.heroIcon,
                        {backgroundColor: theme.tonal.primary15},
                    ]}>
                    <MaterialCommunityIcons
                        name="account-lock-outline"
                        size={scale(44)}
                        color={theme.themeColor}
                    />
                </View>
                <View
                    style={[
                        styles.harborPill,
                        {backgroundColor: theme.tonal.secondary15},
                    ]}>
                    <MaterialCommunityIcons
                        name="forum-outline"
                        size={scale(14)}
                        color={theme.secondThemeColor}
                    />
                    <Text
                        style={[
                            styles.harborPillText,
                            {color: theme.secondThemeColor},
                        ]}>
                        ARK Harbor
                    </Text>
                </View>
                <Text style={[styles.title, {color: theme.black.main}]}>
                    {t('登入你的論壇帳號')}
                </Text>
                <Text style={[styles.description, {color: theme.black.third}]}>
                    {t('在一個地方查看你的 Harbor 身份、互動記錄與消息。')}
                </Text>
                <TouchableScale
                    accessibilityRole="button"
                    accessibilityState={{
                        busy: isAuthorizing,
                        disabled: isAuthorizing,
                    }}
                    activeScale={0.97}
                    disabled={isAuthorizing}
                    style={[
                        styles.primaryButton,
                        {backgroundColor: theme.themeColor},
                        isAuthorizing && styles.disabled,
                    ]}
                    onPress={() => {
                        trigger();
                        onLogin();
                    }}>
                    {isAuthorizing ? (
                        <ActivityIndicator color={theme.trueWhite} />
                    ) : (
                        <Ionicons
                            name="log-in-outline"
                            size={scale(20)}
                            color={theme.trueWhite}
                        />
                    )}
                    <Text
                        style={[
                            styles.primaryButtonText,
                            {color: theme.trueWhite},
                        ]}>
                        {t(isAuthorizing ? '處理中…' : '登入 Harbor')}
                    </Text>
                </TouchableScale>
                <Pressable
                    accessibilityRole="button"
                    style={({pressed}) => [
                        styles.secondaryButton,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary30
                                : theme.tonal.primary15,
                        },
                    ]}
                    onPress={() => {
                        trigger();
                        onBrowse();
                    }}>
                    <Text
                        style={[
                            styles.secondaryButtonText,
                            {color: theme.themeColor},
                        ]}>
                        {t('先逛逛論壇')}
                    </Text>
                    <Ionicons
                        name="arrow-forward"
                        size={scale(16)}
                        color={theme.themeColor}
                    />
                </Pressable>
                <View style={styles.securityNote}>
                    <Ionicons
                        name="shield-checkmark-outline"
                        size={scale(15)}
                        color={theme.black.third}
                    />
                    <Text
                        style={[
                            styles.securityText,
                            {color: theme.black.third},
                        ]}>
                        {t('將前往 Harbor 官方頁面安全登入')}
                    </Text>
                </View>
            </View>

            <View
                style={[
                    styles.featureCard,
                    {backgroundColor: theme.white},
                ]}>
                <HarborSectionHeader title={t('登入後可使用')} />
                {features.map((feature, index) => (
                    <View key={feature.key}>
                        <View style={styles.featureRow}>
                            <View
                                style={[
                                    styles.featureIcon,
                                    {
                                        backgroundColor: theme.tonal.primary15,
                                    },
                                ]}>
                                <Ionicons
                                    name={feature.icon}
                                    size={scale(21)}
                                    color={theme.themeColor}
                                />
                            </View>
                            <View style={styles.featureText}>
                                <Text
                                    style={[
                                        styles.featureTitle,
                                        {color: theme.black.main},
                                    ]}>
                                    {feature.title}
                                </Text>
                                <Text
                                    style={[
                                        styles.featureDescription,
                                        {color: theme.black.third},
                                    ]}>
                                    {feature.description}
                                </Text>
                            </View>
                        </View>
                        {index < features.length - 1 ? (
                            <View
                                style={[
                                    styles.divider,
                                    {
                                        backgroundColor:
                                            theme.themeColorUltraLight,
                                    },
                                ]}
                            />
                        ) : null}
                    </View>
                ))}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        gap: verticalScale(8),
    },
    hero: {
        alignItems: 'center',
        borderRadius: scale(10),
        paddingHorizontal: scale(22),
        paddingTop: verticalScale(27),
        paddingBottom: verticalScale(21),
    },
    heroIcon: {
        width: scale(82),
        height: scale(82),
        borderRadius: scale(16),
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: verticalScale(14),
    },
    harborPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        borderRadius: scale(20),
        paddingHorizontal: scale(10),
        paddingVertical: verticalScale(5),
        marginBottom: verticalScale(12),
    },
    harborPillText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '650',
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(23),
        fontWeight: '750',
        textAlign: 'center',
    },
    description: {
        ...uiStyle.defaultText,
        maxWidth: scale(310),
        fontSize: scale(14),
        lineHeight: verticalScale(21),
        textAlign: 'center',
        marginTop: verticalScale(8),
        marginBottom: verticalScale(20),
    },
    primaryButton: {
        width: '100%',
        minHeight: verticalScale(48),
        borderRadius: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(8),
        paddingHorizontal: scale(18),
    },
    primaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
    },
    disabled: {
        opacity: 0.65,
    },
    secondaryButton: {
        width: '100%',
        minHeight: verticalScale(44),
        borderRadius: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        marginTop: verticalScale(9),
        paddingHorizontal: scale(18),
    },
    secondaryButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '650',
    },
    securityNote: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(5),
        marginTop: verticalScale(14),
    },
    securityText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    featureCard: {
        borderRadius: scale(10),
        paddingBottom: verticalScale(4),
    },
    featureRow: {
        minHeight: verticalScale(72),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(16),
    },
    featureIcon: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    featureText: {
        flex: 1,
    },
    featureTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '650',
        marginBottom: verticalScale(3),
    },
    featureDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(17),
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: scale(70),
        marginRight: scale(16),
    },
});

export default HarborGuestState;
