import React, {memo} from 'react';
import {
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {Image} from 'expo-image';
import moment from 'moment-timezone';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {trigger} from '../../../../utils/trigger';
import HarborCategoryIcon from '../components/HarborCategoryIcon';

const HarborSearchResultCard = memo(
    ({item, onPress, onAuthorPress, onCategoryPress, onTagPress}) => {
        const {theme} = useTheme();
        const {t} = useTranslation('harbor');

        if (item.kind === 'user') {
            const user = item.user;
            return (
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={user.name || user.username}
                    onPress={() => {
                        trigger();
                        onAuthorPress(user);
                    }}
                    style={({pressed}) => [
                        styles.resultCard,
                        styles.userResultCard,
                        {
                            backgroundColor: pressed
                                ? theme.tonal.primary08
                                : theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                        theme.viewShadow,
                    ]}>
                    {user.avatarUrl ? (
                        <Image
                            source={{uri: user.avatarUrl}}
                            style={[
                                styles.resultAvatar,
                                {backgroundColor: theme.tonal.primary15},
                            ]}
                            contentFit="cover"
                            placeholder={theme.imagePlaceholder}
                            transition={180}
                        />
                    ) : (
                        <View
                            style={[
                                styles.resultAvatarFallback,
                                {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <MaterialCommunityIcons
                                name="account-outline"
                                size={scale(20)}
                                color={theme.themeColor}
                            />
                        </View>
                    )}
                    <View style={styles.userResultText}>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.resultTitle,
                                {color: theme.black.main},
                            ]}>
                            {user.name || user.username}
                        </Text>
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.resultMetaText,
                                {color: theme.black.third},
                            ]}>
                            @{user.username} · {t('查看此作者的貼文')}
                        </Text>
                    </View>
                    <MaterialCommunityIcons
                        name="chevron-right"
                        size={scale(20)}
                        color={theme.black.third}
                    />
                </Pressable>
            );
        }

        const author = item.author;
        const tags = Array.isArray(item.tags) ? item.tags.slice(0, 3) : [];
        return (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={item.title}
                onPress={() => {
                    trigger();
                    onPress(item);
                }}
                style={({pressed}) => [
                    styles.resultCard,
                    {
                        backgroundColor: pressed
                            ? theme.tonal.primary08
                            : theme.white,
                        borderColor: theme.themeColorUltraLight,
                    },
                    theme.viewShadow,
                ]}>
                <Text
                    selectable
                    numberOfLines={3}
                    style={[
                        styles.resultTitle,
                        {color: theme.black.main},
                    ]}>
                    {item.title}
                </Text>
                {item.excerpt ? (
                    <Text
                        numberOfLines={3}
                        style={[
                            styles.resultExcerpt,
                            {color: theme.black.third},
                        ]}>
                        {item.excerpt}
                    </Text>
                ) : null}
                <View style={styles.resultMetadata}>
                    {author?.username ? (
                        <Pressable
                            accessibilityRole="button"
                            onPress={event => {
                                event.stopPropagation?.();
                                trigger();
                                onAuthorPress(author);
                            }}
                            style={({pressed}) => [
                                styles.inlineMeta,
                                pressed && {
                                    backgroundColor:
                                        theme.tonal.primary15,
                                },
                            ]}>
                            <MaterialCommunityIcons
                                name="account-outline"
                                size={scale(13)}
                                color={theme.black.third}
                            />
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.inlineMetaText,
                                    {color: theme.black.third},
                                ]}>
                                {author.name || author.username}
                            </Text>
                        </Pressable>
                    ) : null}
                    {item.createdAt ? (
                        <View style={styles.inlineMeta}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={scale(13)}
                                color={theme.black.third}
                            />
                            <Text
                                style={[
                                    styles.inlineMetaText,
                                    {color: theme.black.third},
                                ]}>
                                {moment
                                    .tz(item.createdAt, 'Asia/Macau')
                                    .format('YYYY/MM/DD')}
                            </Text>
                        </View>
                    ) : null}
                    {item.likeCount > 0 ? (
                        <View style={styles.inlineMeta}>
                            <MaterialCommunityIcons
                                name={
                                    item.topic?.liked
                                        ? 'heart'
                                        : 'heart-outline'
                                }
                                size={scale(13)}
                                color={
                                    item.topic?.liked
                                        ? theme.themeColor
                                        : theme.black.third
                                }
                            />
                            <Text
                                style={[
                                    styles.inlineMetaText,
                                    {
                                        color: item.topic?.liked
                                            ? theme.themeColor
                                            : theme.black.third,
                                    },
                                ]}>
                                {item.likeCount}
                            </Text>
                        </View>
                    ) : null}
                </View>
                {item.category?.name || tags.length > 0 ? (
                    <View style={styles.taxonomyRow}>
                        {item.category?.name ? (
                            <Pressable
                                accessibilityRole="button"
                                onPress={event => {
                                    event.stopPropagation?.();
                                    trigger();
                                    onCategoryPress(item.category);
                                }}
                                style={({pressed}) => [
                                    styles.taxonomyChip,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.secondary30
                                            : theme.tonal.secondary15,
                                    },
                                ]}>
                                <HarborCategoryIcon
                                    category={item.category}
                                    color={theme.secondThemeColor}
                                    size={scale(13)}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.taxonomyText,
                                        {color: theme.secondThemeColor},
                                    ]}>
                                    {item.category.name}
                                </Text>
                            </Pressable>
                        ) : null}
                        {tags.map(tag => (
                            <Pressable
                                key={tag.slug || tag.name}
                                accessibilityRole="button"
                                onPress={event => {
                                    event.stopPropagation?.();
                                    trigger();
                                    onTagPress(tag);
                                }}
                                style={({pressed}) => [
                                    styles.taxonomyChip,
                                    {
                                        backgroundColor: pressed
                                            ? theme.tonal.primary30
                                            : theme.tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.taxonomyText,
                                        {color: theme.themeColor},
                                    ]}>
                                    #{tag.name}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}
            </Pressable>
        );
    },
);

const styles = StyleSheet.create({
    resultCard: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(15),
        marginHorizontal: scale(14),
        marginBottom: verticalScale(10),
        padding: scale(13),
    },
    userResultCard: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    resultAvatar: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
    },
    resultAvatarFallback: {
        width: scale(38),
        height: scale(38),
        borderRadius: scale(19),
        alignItems: 'center',
        justifyContent: 'center',
    },
    userResultText: {
        flex: 1,
        minWidth: 0,
        marginHorizontal: scale(10),
    },
    resultTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        lineHeight: scale(21),
        fontWeight: '700',
    },
    resultExcerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: scale(17),
        marginTop: verticalScale(6),
    },
    resultMetaText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
    },
    resultMetadata: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        marginTop: verticalScale(8),
    },
    inlineMeta: {
        minHeight: verticalScale(24),
        borderRadius: scale(7),
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: scale(9),
        paddingHorizontal: scale(3),
    },
    inlineMetaText: {
        ...uiStyle.defaultText,
        maxWidth: scale(120),
        fontSize: scale(9),
        marginLeft: scale(3),
    },
    taxonomyRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginTop: verticalScale(5),
    },
    taxonomyChip: {
        maxWidth: scale(130),
        borderRadius: scale(7),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        marginRight: scale(6),
        marginTop: verticalScale(4),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(4),
    },
    taxonomyText: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '600',
    },
});

export default HarborSearchResultCard;
