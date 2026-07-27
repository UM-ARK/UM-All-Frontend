import React, {
    memo,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
    Text,
    View,
} from 'react-native';

import moment from 'moment-timezone';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import HarborCategoryIcon from '../components/HarborCategoryIcon';
import { MetaItem } from './HarborPostCard';
import {
    getNotificationLevelLabel,
    getTagLabel,
} from './harborTopicModels';
import styles from './styles';

const HarborTopicHeader = memo(
    ({
        topic,
        onCopy,
        onMarkUnread,
        onOpenNotifications,
        onOpenOriginal,
        onPressCategory,
        onPressTag,
        pendingMarkUnread,
        pendingNotification,
    }) => {
        const { theme } = useTheme();
        const { t } = useTranslation('harbor');
        const {
            black,
            themeColor,
            themeColorUltraLight,
            tonal,
            white,
        } = theme;
        const tags = Array.isArray(topic.tags)
            ? topic.tags.map(getTagLabel).filter(Boolean)
            : [];
        const categoryId = Number(topic.category_id);
        const categorySlug = topic.category_slug || topic.category?.slug;
        const categoryName = topic.category_name || topic.category?.name;

        return (
            <View
                style={[
                    styles.topicHeader,
                    { backgroundColor: white, borderColor: themeColorUltraLight },
                ]}>
                <Text
                    selectable
                    style={[styles.topicTitle, { color: black.main }]}>
                    {topic.title}
                </Text>

                {(Number.isInteger(categoryId) && categoryId > 0) ||
                tags.length > 0 ? (
                    <View style={styles.tagRow}>
                        {Number.isInteger(categoryId) && categoryId > 0 ? (
                            <Pressable
                                accessibilityRole="link"
                                onPress={() => {
                                    trigger();
                                    onPressCategory({
                                        categoryId,
                                        categorySlug,
                                        categoryName,
                                    });
                                }}
                                style={({ pressed }) => [
                                    styles.category,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <HarborCategoryIcon
                                    category={
                                        topic.category || {
                                            id: categoryId,
                                            name: categoryName,
                                            slug: categorySlug,
                                        }
                                    }
                                    color={themeColor}
                                    size={scale(13)}
                                />
                                <Text
                                    style={[
                                        styles.categoryText,
                                        { color: themeColor },
                                    ]}>
                                    {categoryName || `分類 #${categoryId}`}
                                </Text>
                            </Pressable>
                        ) : null}
                        {tags.map(tag => (
                            <Pressable
                                key={tag}
                                accessibilityRole="link"
                                onPress={() => {
                                    trigger();
                                    onPressTag(tag);
                                }}
                                style={({ pressed }) => [
                                    styles.tag,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.tagText,
                                        { color: themeColor },
                                    ]}>
                                    #{tag}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                ) : null}

                <View style={styles.topicMetaRow}>
                    <MetaItem
                        icon="eye-outline"
                        value={`${topic.views || 0} ${t('瀏覽')}`}
                        color={black.third}
                    />
                    <MetaItem
                        icon="comment-outline"
                        value={`${topic.posts_count || 0} ${t('帖子')}`}
                        color={black.third}
                    />
                    <MetaItem
                        icon="heart-outline"
                        value={`${topic.like_count || 0} ${t('讚')}`}
                        color={themeColor}
                    />
                </View>

                {topic.last_posted_at ? (
                    <Text style={[styles.lastUpdated, { color: black.third }]}>
                        {t('最後更新')} ·{' '}
                        {moment
                            .tz(topic.last_posted_at, 'Asia/Macau')
                            .format('YYYY/MM/DD HH:mm')}
                    </Text>
                ) : null}

                <View style={styles.webActionRow}>
                    <Pressable
                        onPress={onOpenOriginal}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="web"
                            size={scale(16)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t('查看 Web 原文')}
                        </Text>
                        <MaterialCommunityIcons
                            name="open-in-new"
                            size={scale(14)}
                            color={themeColor}
                        />
                    </Pressable>
                    <Pressable
                        onPress={() => {
                            trigger();
                            onCopy();
                        }}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name="link-variant"
                            size={scale(16)}
                            color={themeColor}
                        />
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t('複製連結')}
                        </Text>
                    </Pressable>
                    <Pressable
                        disabled={pendingNotification}
                        onPress={() => {
                            trigger();
                            onOpenNotifications();
                        }}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        {pendingNotification ? (
                            <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                            <MaterialCommunityIcons
                                name="bell-outline"
                                size={scale(16)}
                                color={themeColor}
                            />
                        )}
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t(
                                getNotificationLevelLabel(
                                    topic.details?.notification_level,
                                ),
                            )}
                        </Text>
                    </Pressable>
                    <Pressable
                        disabled={pendingMarkUnread}
                        onPress={() => {
                            trigger();
                            onMarkUnread();
                        }}
                        style={({ pressed }) => [
                            styles.webOriginalButton,
                            {
                                backgroundColor: pressed
                                    ? tonal.primary30
                                    : tonal.primary15,
                            },
                        ]}>
                        {pendingMarkUnread ? (
                            <ActivityIndicator size="small" color={themeColor} />
                        ) : (
                            <MaterialCommunityIcons
                                name="email-mark-as-unread"
                                size={scale(16)}
                                color={themeColor}
                            />
                        )}
                        <Text
                            style={[
                                styles.webOriginalText,
                                { color: themeColor },
                            ]}>
                            {t('標為未讀')}
                        </Text>
                    </Pressable>
                </View>
            </View>
        );
    },
);


export default HarborTopicHeader;
