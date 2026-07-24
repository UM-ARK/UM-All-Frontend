import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {trigger} from '../../../../utils/trigger';
import {formatJoinedAt} from '../utils/harborUi';

const AVATAR_SOURCE = require('../../../../static/img/logo_round.png');

const HarborProfileCard = ({user, onPress}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const joinedAt = formatJoinedAt(user.joinedAt, i18n.language);

    return (
        <TouchableScale
            accessibilityRole="button"
            accessibilityLabel={t('管理 Harbor 帳號')}
            activeScale={0.98}
            style={[
                styles.container,
                {backgroundColor: theme.white},
                theme.viewShadow,
            ]}
            onPress={() => {
                trigger();
                onPress();
            }}>
            <View
                style={[
                    styles.avatarRing,
                    {backgroundColor: theme.tonal.primary30},
                ]}>
                <Image
                    source={
                        user.avatarUrl ? {uri: user.avatarUrl} : AVATAR_SOURCE
                    }
                    style={styles.avatar}
                    contentFit="cover"
                />
                <View
                    style={[
                        styles.connectedDot,
                        {
                            backgroundColor: theme.success,
                            borderColor: theme.white,
                        },
                    ]}>
                    <Ionicons
                        name="checkmark"
                        size={scale(8)}
                        color={theme.trueWhite}
                    />
                </View>
            </View>

            <View style={styles.identity}>
                <View style={styles.nameRow}>
                    <Text
                        numberOfLines={1}
                        style={[styles.name, {color: theme.black.main}]}>
                        {user.displayName || user.username}
                    </Text>
                    <View
                        style={[
                            styles.connectedPill,
                            {backgroundColor: theme.tonal.success15},
                        ]}>
                        <Ionicons
                            name="checkmark-circle"
                            size={scale(12)}
                            color={theme.success}
                        />
                        <Text
                            style={[
                                styles.connectedText,
                                {color: theme.success},
                            ]}>
                            {t('已連接')}
                        </Text>
                    </View>
                </View>
                <Text style={[styles.handle, {color: theme.black.third}]}>
                    @{user.username}
                </Text>
                <View style={styles.metaRow}>
                    <MaterialCommunityIcons
                        name="forum-outline"
                        size={scale(13)}
                        color={theme.themeColor}
                    />
                    <Text style={[styles.role, {color: theme.black.second}]}>
                        {t(user.role || 'Harbor 會員')}
                    </Text>
                    <View
                        style={[
                            styles.metaDivider,
                            {backgroundColor: theme.themeColorUltraLight},
                        ]}
                    />
                    <Text style={[styles.trust, {color: theme.black.third}]}>
                        TL{user.trustLevel ?? 0}
                    </Text>
                </View>
                {joinedAt ? (
                    <Text style={[styles.joinedAt, {color: theme.black.third}]}>
                        {t('於 {{date}} 加入', {date: joinedAt})}
                    </Text>
                ) : null}
            </View>

            <Ionicons
                name="settings-outline"
                size={scale(21)}
                color={theme.themeColor}
            />
        </TouchableScale>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(112),
        borderRadius: scale(22),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(17),
        paddingVertical: verticalScale(15),
    },
    avatarRing: {
        width: scale(66),
        height: scale(66),
        borderRadius: scale(22),
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: scale(13),
    },
    avatar: {
        width: scale(58),
        height: scale(58),
        borderRadius: scale(19),
    },
    connectedDot: {
        position: 'absolute',
        right: scale(1),
        bottom: scale(1),
        width: scale(16),
        height: scale(16),
        borderRadius: scale(8),
        borderWidth: scale(2),
        alignItems: 'center',
        justifyContent: 'center',
    },
    identity: {
        flex: 1,
        minWidth: 0,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(7),
    },
    name: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(18),
        fontWeight: '760',
    },
    connectedPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(3),
        borderRadius: scale(20),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(3),
    },
    connectedText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '750',
    },
    handle: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(2),
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(5),
        marginTop: verticalScale(7),
    },
    role: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '600',
    },
    metaDivider: {
        width: StyleSheet.hairlineWidth,
        height: verticalScale(10),
        marginHorizontal: scale(2),
    },
    trust: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '650',
    },
    joinedAt: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        marginTop: verticalScale(4),
    },
});

export default HarborProfileCard;
