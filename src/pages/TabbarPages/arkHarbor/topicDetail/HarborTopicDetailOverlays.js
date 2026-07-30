import React from 'react';
import {
    Modal,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

// TODO: 暫時關閉收藏提醒日期選擇，待收藏提醒通知完整後再開啟
// import moment from 'moment-timezone';
// import DateTimePickerModal from 'react-native-modal-datetime-picker';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import ARKImageView from '../../../../components/ARKImageView';
import { useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import styles from './styles';

const HarborTopicDetailOverlays = ({
    bookmarkEditor,
    changeNotificationLevel,
    imageUrls,
    imageViewerRef,
    isBookmarkReminderVisible,
    isNotificationVisible,
    notificationOptions: TOPIC_NOTIFICATION_OPTIONS,
    removePostBookmark,
    savePostBookmark,
    setBookmarkEditor,
    setIsBookmarkReminderVisible,
    setIsNotificationVisible,
    topic,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const {
        black,
        disabled,
        themeColor,
        tonal,
        trueWhite,
    } = theme;

    return (
        <>
            <Modal
                transparent
                visible={Boolean(bookmarkEditor)}
                animationType="fade"
                onRequestClose={() => setBookmarkEditor(null)}>
                <View style={styles.modalPage}>
                    <Pressable
                        style={[
                            StyleSheet.absoluteFill,
                            styles.modalBackdrop,
                            { backgroundColor: theme.trueBlack },
                        ]}
                        onPress={() => {
                            trigger();
                            setBookmarkEditor(null);
                        }}
                    />
                    <View
                        style={[
                            styles.actionDialog,
                            { backgroundColor: theme.white },
                        ]}>
                        <Text
                            style={[
                                styles.actionDialogTitle,
                                { color: black.main },
                            ]}>
                            {bookmarkEditor?.bookmarkId
                                ? t('編輯收藏')
                                : t('收藏帖子')}
                        </Text>
                        <Text
                            style={[
                                styles.actionDialogLabel,
                                { color: black.second },
                            ]}>
                            {t('收藏名稱')}
                        </Text>
                        <TextInput
                            value={bookmarkEditor?.name || ''}
                            onChangeText={name =>
                                setBookmarkEditor(current =>
                                    current ? { ...current, name } : current,
                                )
                            }
                            maxLength={100}
                            placeholder={t('選填，方便日後尋找')}
                            placeholderTextColor={black.third}
                            style={[
                                styles.bookmarkNameInput,
                                {
                                    color: black.main,
                                    backgroundColor: tonal.primary08,
                                    borderColor: themeColor,
                                },
                            ]}
                        />
                        {/* TODO: 暫時關閉收藏提醒日期選擇，待收藏提醒通知完整後再開啟
                        <Text
                            style={[
                                styles.actionDialogLabel,
                                { color: black.second },
                            ]}>
                            {t('提醒日期')}
                        </Text>
                        <View style={styles.bookmarkReminderRow}>
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setBookmarkEditor(current =>
                                        current
                                            ? { ...current, reminderAt: null }
                                            : current,
                                    );
                                }}
                                style={({ pressed }) => [
                                    styles.reminderButton,
                                    {
                                        backgroundColor:
                                            !bookmarkEditor?.reminderAt || pressed
                                                ? tonal.primary30
                                                : tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.reminderButtonText,
                                        { color: themeColor },
                                    ]}>
                                    {t('無提醒')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setIsBookmarkReminderVisible(true);
                                }}
                                style={({ pressed }) => [
                                    styles.reminderButton,
                                    styles.reminderDateButton,
                                    {
                                        backgroundColor:
                                            bookmarkEditor?.reminderAt || pressed
                                                ? tonal.primary30
                                                : tonal.primary15,
                                    },
                                ]}>
                                <MaterialCommunityIcons
                                    name="calendar-clock-outline"
                                    size={scale(15)}
                                    color={themeColor}
                                />
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.reminderButtonText,
                                        { color: themeColor },
                                    ]}>
                                    {bookmarkEditor?.reminderAt
                                        ? moment(bookmarkEditor.reminderAt).format(
                                            'YYYY/MM/DD HH:mm',
                                        )
                                        : t('選擇日期')}
                                </Text>
                            </Pressable>
                        </View>
                        */}
                        <View style={styles.actionDialogActions}>
                            {bookmarkEditor?.bookmarkId ? (
                                <Pressable
                                    onPress={() => {
                                        trigger();
                                        removePostBookmark();
                                    }}
                                    style={({ pressed }) => [
                                        styles.actionDialogButton,
                                        {
                                            backgroundColor: pressed
                                                ? tonal.primary30
                                                : tonal.primary15,
                                        },
                                    ]}>
                                    <Text
                                        style={[
                                            styles.actionDialogButtonText,
                                            { color: themeColor },
                                        ]}>
                                        {t('取消收藏')}
                                    </Text>
                                </Pressable>
                            ) : null}
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    setBookmarkEditor(null);
                                }}
                                style={({ pressed }) => [
                                    styles.actionDialogButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary30
                                            : tonal.primary15,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.actionDialogButtonText,
                                        { color: themeColor },
                                    ]}>
                                    {t('取消')}
                                </Text>
                            </Pressable>
                            <Pressable
                                onPress={() => {
                                    trigger();
                                    savePostBookmark();
                                }}
                                style={({ pressed }) => [
                                    styles.actionDialogButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary50
                                            : themeColor,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.actionDialogButtonText,
                                        { color: trueWhite },
                                    ]}>
                                    {t('儲存')}
                                </Text>
                            </Pressable>
                        </View>
                    </View>
                </View>
            </Modal>

            <Modal
                transparent
                visible={isNotificationVisible}
                animationType="fade"
                onRequestClose={() => setIsNotificationVisible(false)}>
                <View style={styles.modalPage}>
                    <Pressable
                        style={[
                            StyleSheet.absoluteFill,
                            styles.modalBackdrop,
                            { backgroundColor: theme.trueBlack },
                        ]}
                        onPress={() => {
                            trigger();
                            setIsNotificationVisible(false);
                        }}
                    />
                    <View
                        style={[
                            styles.actionDialog,
                            { backgroundColor: theme.white },
                        ]}>
                        <Text
                            style={[
                                styles.actionDialogTitle,
                                { color: black.main },
                            ]}>
                            {t('話題通知')}
                        </Text>
                        {TOPIC_NOTIFICATION_OPTIONS.map(option => {
                            const selected =
                                Number(topic.details?.notification_level) ===
                                option.level;
                            return (
                                <Pressable
                                    key={option.level}
                                    onPress={() => {
                                        trigger();
                                        changeNotificationLevel(option.level);
                                    }}
                                    style={({ pressed }) => [
                                        styles.notificationOption,
                                        {
                                            backgroundColor:
                                                selected || pressed
                                                    ? tonal.primary15
                                                    : theme.white,
                                            borderTopColor: disabled,
                                        },
                                    ]}>
                                    <MaterialCommunityIcons
                                        name={option.icon}
                                        size={scale(19)}
                                        color={themeColor}
                                    />
                                    <View style={styles.notificationContent}>
                                        <Text
                                            style={[
                                                styles.notificationLabel,
                                                { color: black.main },
                                            ]}>
                                            {t(option.label)}
                                        </Text>
                                        <Text
                                            style={[
                                                styles.notificationDescription,
                                                { color: black.third },
                                            ]}>
                                            {t(option.description)}
                                        </Text>
                                    </View>
                                    {selected ? (
                                        <MaterialCommunityIcons
                                            name="check"
                                            size={scale(18)}
                                            color={themeColor}
                                        />
                                    ) : null}
                                </Pressable>
                            );
                        })}
                    </View>
                </View>
            </Modal>

            {/* TODO: 暫時關閉收藏提醒日期選擇，待收藏提醒通知完整後再開啟
            <DateTimePickerModal
                isVisible={isBookmarkReminderVisible}
                mode="datetime"
                date={
                    bookmarkEditor?.reminderAt
                        ? new Date(bookmarkEditor.reminderAt)
                        : new Date(Date.now() + 60 * 60 * 1000)
                }
                minimumDate={new Date()}
                onConfirm={date => {
                    trigger();
                    setIsBookmarkReminderVisible(false);
                    setBookmarkEditor(current =>
                        current
                            ? { ...current, reminderAt: date.toISOString() }
                            : current,
                    );
                }}
                onCancel={() => {
                    trigger();
                    setIsBookmarkReminderVisible(false);
                }}
            />
            */}

            <ARKImageView ref={imageViewerRef} imageUrls={imageUrls} />
        </>
    );
};

export default HarborTopicDetailOverlays;
