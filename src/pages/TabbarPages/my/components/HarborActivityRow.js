import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';

import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {ARK_HARBOR_AVATAR} from '../../../../utils/pathMap';
import {trigger} from '../../../../utils/trigger';
import {
    activityMeta,
    formatRelativeTime,
    getHarborReactionEmoji,
} from '../utils/harborUi';

const HarborActivityLeading = ({
    avatarUrl,
    fallbackIcon,
    theme,
}) => {
    const [failed, setFailed] = React.useState(false);
    React.useEffect(() => {
        setFailed(false);
    }, [avatarUrl]);
    if (avatarUrl && !failed) {
        return (
            <Image
                source={{uri: avatarUrl}}
                style={[
                    styles.avatar,
                    {backgroundColor: theme.trueWhite},
                ]}
                contentFit="cover"
                placeholder={theme.imagePlaceholder}
                placeholderContentFit="cover"
                transition={200}
                onError={() => setFailed(true)}
            />
        );
    }
    return (
        <View
            style={[
                styles.iconWrap,
                {backgroundColor: theme.tonal.primary15},
            ]}>
            <Ionicons
                name={fallbackIcon}
                size={scale(20)}
                color={theme.themeColor}
            />
        </View>
    );
};

const HarborActivityRow = ({item, onPress, showDivider = false}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const meta = activityMeta[item.kind] || activityMeta.activity;
    const reactionEmoji = getHarborReactionEmoji(item.reactionValue);
    const avatarUrl =
        item.avatarUrl ||
        (item.actingUsername
            ? ARK_HARBOR_AVATAR(item.actingUsername, 72)
            : '');
    const metaLabel = item.actingUsername
        ? [item.actingUsername, reactionEmoji || t(meta.label)]
              .filter(Boolean)
              .join(' · ')
        : t(meta.label);

    return (
        <Pressable
            accessibilityRole="button"
            style={({pressed}) => [
                styles.container,
                pressed && {backgroundColor: theme.tonal.primary08},
            ]}
            onPress={() => {
                trigger();
                onPress(item);
            }}>
            <HarborActivityLeading
                avatarUrl={avatarUrl}
                fallbackIcon={meta.icon}
                theme={theme}
            />
            <View style={styles.content}>
                <View style={styles.metaRow}>
                    <Text
                        numberOfLines={1}
                        style={[styles.meta, {color: theme.themeColor}]}>
                        {metaLabel}
                    </Text>
                    <Text style={[styles.time, {color: theme.black.third}]}>
                        {formatRelativeTime(item.createdAt, i18n.language)}
                    </Text>
                </View>
                <Text
                    numberOfLines={2}
                    style={[styles.title, {color: theme.black.main}]}>
                    {item.title || t('未命名內容')}
                </Text>
                {item.excerpt ? (
                    <Text
                        numberOfLines={2}
                        style={[styles.excerpt, {color: theme.black.third}]}>
                        {item.excerpt}
                    </Text>
                ) : null}
                {item.kind === 'bookmark' && item.reminderAt ? (
                    <View style={styles.reminderRow}>
                        <Ionicons
                            name="alarm-outline"
                            size={scale(12)}
                            color={theme.themeColor}
                        />
                        <Text
                            style={[
                                styles.reminderText,
                                {color: theme.themeColor},
                            ]}>
                            {t('提醒於 {{time}}', {
                                time: formatRelativeTime(
                                    item.reminderAt,
                                    i18n.language,
                                ),
                            })}
                        </Text>
                    </View>
                ) : null}
            </View>
            <Ionicons
                name="chevron-forward"
                size={scale(17)}
                color={theme.black.third}
            />
            {showDivider ? (
                <View
                    style={[
                        styles.divider,
                        {backgroundColor: theme.themeColorUltraLight},
                    ]}
                />
            ) : null}
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(78),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(11),
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(11),
    },
    iconWrap: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
    },
    content: {
        flex: 1,
        minWidth: 0,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: scale(8),
        marginBottom: verticalScale(3),
    },
    meta: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '700',
    },
    time: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '650',
        lineHeight: verticalScale(18),
    },
    excerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginTop: verticalScale(3),
    },
    reminderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(4),
    },
    reminderText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
        marginLeft: scale(4),
    },
    divider: {
        position: 'absolute',
        right: scale(15),
        bottom: 0,
        left: scale(68),
        height: StyleSheet.hairlineWidth,
    },
});

export default HarborActivityRow;
