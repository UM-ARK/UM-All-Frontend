import React, { useEffect, useMemo, useState } from 'react';
import {
    Modal,
    Pressable,
    ScrollView,
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

const stripHarborHtml = value => {
    if (typeof value !== 'string' || !value) {
        return '';
    }
    return value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
};

const HarborTopicDetailOverlays = ({
    bookmarkEditor,
    changeNotificationLevel,
    flagEditor,
    imageUrls,
    imageViewerRef,
    isBookmarkReminderVisible,
    isNotificationVisible,
    notificationOptions: TOPIC_NOTIFICATION_OPTIONS,
    pendingFlag,
    removePostBookmark,
    savePostBookmark,
    setBookmarkEditor,
    setFlagEditor,
    setIsBookmarkReminderVisible,
    setIsNotificationVisible,
    submitPostFlag,
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
        unread,
    } = theme;
    const [selectedFlagTypeId, setSelectedFlagTypeId] = useState(null);
    const [flagMessage, setFlagMessage] = useState('');

    useEffect(() => {
        if (!flagEditor) {
            setSelectedFlagTypeId(null);
            setFlagMessage('');
            return;
        }
        const flagTypes = flagEditor.flagTypes || [];
        const offTopic = flagTypes.find(
            type => type?.nameKey === 'off_topic',
        );
        const defaultTypeId =
            Number(offTopic?.id) || Number(flagTypes[0]?.id) || null;
        setSelectedFlagTypeId(defaultTypeId);
        setFlagMessage('');
    }, [flagEditor]);

    const flagTypesForDisplay = useMemo(() => {
        const flagTypes = flagEditor?.flagTypes || [];
        if (flagTypes.length === 0) {
            return [];
        }
        const offTopicIndex = flagTypes.findIndex(
            type => type?.nameKey === 'off_topic',
        );
        if (offTopicIndex <= 0) {
            return flagTypes;
        }
        const next = flagTypes.slice();
        const [offTopic] = next.splice(offTopicIndex, 1);
        next.unshift(offTopic);
        return next;
    }, [flagEditor]);

    const selectedFlagType = (flagEditor?.flagTypes || []).find(
        type => Number(type?.id) === Number(selectedFlagTypeId),
    );
    const flagRequiresMessage = Boolean(selectedFlagType?.requiresMessage);
    const canSubmitFlag =
        Boolean(selectedFlagType) &&
        (!flagRequiresMessage || flagMessage.trim().length > 0) &&
        !pendingFlag;

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
                visible={Boolean(flagEditor)}
                animationType="fade"
                onRequestClose={() => setFlagEditor(null)}>
                <View style={styles.modalPage}>
                    <Pressable
                        style={[
                            StyleSheet.absoluteFill,
                            styles.modalBackdrop,
                            { backgroundColor: theme.trueBlack },
                        ]}
                        onPress={() => {
                            trigger();
                            if (!pendingFlag) {
                                setFlagEditor(null);
                            }
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
                            {t('舉報帖子')}
                        </Text>
                        <Text
                            style={[
                                styles.actionDialogLabel,
                                { color: black.second },
                            ]}>
                            {t('選擇原因')}
                        </Text>
                        <ScrollView
                            style={styles.flagReasonList}
                            keyboardShouldPersistTaps="handled">
                            {(flagTypesForDisplay || []).map(type => {
                                const selected =
                                    Number(selectedFlagTypeId) ===
                                    Number(type.id);
                                const description = stripHarborHtml(
                                    type.description,
                                );
                                return (
                                    <Pressable
                                        key={type.id}
                                        disabled={Boolean(pendingFlag)}
                                        onPress={() => {
                                            trigger();
                                            setSelectedFlagTypeId(type.id);
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
                                            name="flag-outline"
                                            size={scale(19)}
                                            color={
                                                selected ? unread : themeColor
                                            }
                                        />
                                        <View style={styles.notificationContent}>
                                            <Text
                                                style={[
                                                    styles.notificationLabel,
                                                    { color: black.main },
                                                ]}>
                                                {type.name}
                                            </Text>
                                            {description ? (
                                                <Text
                                                    style={[
                                                        styles.notificationDescription,
                                                        { color: black.third },
                                                    ]}>
                                                    {description}
                                                </Text>
                                            ) : null}
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
                        </ScrollView>
                        {flagRequiresMessage ? (
                            <>
                                <Text
                                    style={[
                                        styles.actionDialogLabel,
                                        {
                                            color: black.second,
                                            marginTop: scale(10),
                                        },
                                    ]}>
                                    {t('補充說明')}
                                </Text>
                                <TextInput
                                    value={flagMessage}
                                    onChangeText={setFlagMessage}
                                    editable={!pendingFlag}
                                    multiline
                                    maxLength={1000}
                                    placeholder={t('請說明舉報原因')}
                                    placeholderTextColor={black.third}
                                    style={[
                                        styles.flagMessageInput,
                                        {
                                            color: black.main,
                                            backgroundColor: tonal.primary08,
                                            borderColor: themeColor,
                                        },
                                    ]}
                                />
                            </>
                        ) : null}
                        <View style={styles.actionDialogActions}>
                            <Pressable
                                disabled={Boolean(pendingFlag)}
                                onPress={() => {
                                    trigger();
                                    setFlagEditor(null);
                                }}
                                style={({ pressed }) => [
                                    styles.actionDialogButton,
                                    {
                                        backgroundColor: pressed
                                            ? tonal.primary15
                                            : tonal.primary08,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.actionDialogButtonText,
                                        { color: black.second },
                                    ]}>
                                    {t('取消')}
                                </Text>
                            </Pressable>
                            <Pressable
                                disabled={!canSubmitFlag}
                                onPress={() => {
                                    trigger();
                                    submitPostFlag({
                                        postActionTypeId: selectedFlagTypeId,
                                        message: flagMessage,
                                    });
                                }}
                                style={({ pressed }) => [
                                    styles.actionDialogButton,
                                    {
                                        backgroundColor: !canSubmitFlag
                                            ? disabled
                                            : pressed
                                                ? tonal.primary50
                                                : unread,
                                    },
                                ]}>
                                <Text
                                    style={[
                                        styles.actionDialogButtonText,
                                        { color: trueWhite },
                                    ]}>
                                    {pendingFlag ? t('送出中…') : t('發送')}
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
