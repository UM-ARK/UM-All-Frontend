import React from 'react';
import {
    ActivityIndicator,
    Alert,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';

import { isLiquidGlassSupported } from '@callstack/liquid-glass';
import { useHeaderHeight } from '@react-navigation/elements';
import { MenuView } from '@react-native-menu/menu';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';
import { scale, verticalScale } from 'react-native-size-matters';

import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { useHarborSession } from '../../../../contexts/HarborSessionContext';
import { useSchedulingSession } from '../../../../contexts/SchedulingSessionContext';
import HarborAvatarPickerModal from '../components/HarborAvatarPickerModal';
import HarborBadgeIcon from '../components/HarborBadgeIcon';
import {
    fetchHarborProfileMetadata,
    fetchHarborUserProfile,
    resolveCanUploadCustomAvatar,
    selectHarborAvatar,
    updateHarborAvatar,
    updateHarborProfile,
} from '../../../../utils/harbor/harborApi';
import { openLink } from '../../../../utils/browser';
import { ARK_HARBOR } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';

const AVATAR_SOURCE = require('../../../../static/img/logo_round.png');
const UMER_DISPLAY_LABEL = '🎓 UMer';

const isUmerGroupLabel = label => {
    const key = String(label || '')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase();
    return key === 'umer';
};

const resolveUmerBadgeLabel = (groups, isUMer) => {
    const hasUmerGroup =
        Array.isArray(groups) && groups.some(isUmerGroupLabel);
    return isUMer || hasUmerGroup ? UMER_DISPLAY_LABEL : null;
};

// 頭像右上角 UMer 角標：45° 傾斜並輕微浮動
const UmerAvatarBadge = ({ label }) => {
    const { theme } = useTheme();
    const pulse = useSharedValue(0);

    React.useEffect(() => {
        pulse.value = withRepeat(
            withSequence(
                withTiming(1, {
                    duration: 1100,
                    easing: Easing.inOut(Easing.sin),
                }),
                withTiming(0, {
                    duration: 1100,
                    easing: Easing.inOut(Easing.sin),
                }),
            ),
            -1,
            false,
        );
    }, [pulse]);

    const animatedStyle = useAnimatedStyle(() => {
        const wobble = interpolate(pulse.value, [0, 1], [-3, 3]);
        return {
            transform: [
                { rotate: `${45 + wobble}deg` },
                {
                    translateY: interpolate(pulse.value, [0, 1], [0, -2.5]),
                },
                { scale: interpolate(pulse.value, [0, 1], [1, 1.08]) },
            ],
        };
    });

    return (
        <Animated.View
            pointerEvents="none"
            style={[
                styles.umerBadge,
                {
                    backgroundColor: theme.themeColor,
                    shadowColor: theme.themeColor,
                },
                animatedStyle,
            ]}>
            <Text
                style={[styles.umerBadgeText, { color: theme.trueWhite }]}>
                {label}
            </Text>
        </Animated.View>
    );
};

const ProfileTextField = ({
    editable,
    label,
    multiline = false,
    onChangeText,
    placeholder,
    value,
    ...inputProps
}) => {
    const { theme } = useTheme();

    return (
        <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.black.second }]}>
                {label}
            </Text>
            <TextInput
                {...inputProps}
                editable={editable}
                multiline={multiline}
                onChangeText={onChangeText}
                onFocus={() => trigger()}
                placeholder={placeholder}
                placeholderTextColor={theme.black.third}
                selectionColor={theme.themeColor}
                style={[
                    styles.input,
                    multiline && styles.multilineInput,
                    {
                        backgroundColor: theme.tonal.primary08,
                        borderColor: theme.themeColorUltraLight,
                        color: editable
                            ? theme.black.main
                            : theme.black.third,
                    },
                ]}
                value={value}
            />
        </View>
    );
};

const HarborProfilePage = ({ navigation, route }) => {
    const { theme } = useTheme();
    const {syncIdentity} = useSchedulingSession();
    const { t } = useTranslation('my');
    const { user, refresh } = useHarborSession();
    const headerHeight = useHeaderHeight();
    const sessionUsername = user?.username || '';
    const requestedUsername = String(
        route?.params?.username || sessionUsername,
    );
    const isOwnProfile = Boolean(
        sessionUsername &&
        requestedUsername.toLowerCase() === sessionUsername.toLowerCase(),
    );
    const [viewedUser, setViewedUser] = React.useState(
        isOwnProfile ? user : null,
    );
    const [isLoadingProfile, setIsLoadingProfile] = React.useState(
        !isOwnProfile,
    );
    const [profileError, setProfileError] = React.useState(false);
    const [mode, setMode] = React.useState(
        isOwnProfile && route?.params?.mode === 'edit' ? 'edit' : 'preview',
    );
    const isEditing = isOwnProfile && mode === 'edit';
    const username = viewedUser?.username || requestedUsername;
    const profile = React.useMemo(
        () => viewedUser?.profile || {},
        [viewedUser?.profile],
    );
    const [bio, setBio] = React.useState(profile.bio || '');
    const [location, setLocation] = React.useState(profile.location || '');
    const [website, setWebsite] = React.useState(profile.website || '');
    const [workStatus, setWorkStatus] = React.useState(
        profile.workStatus || '',
    );
    const [workStatusField, setWorkStatusField] = React.useState(null);
    const [isLoadingMetadata, setIsLoadingMetadata] = React.useState(true);
    const [metadataError, setMetadataError] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = React.useState(false);
    const [isAvatarPickerVisible, setIsAvatarPickerVisible] =
        React.useState(false);
    const [pendingAvatar, setPendingAvatar] = React.useState(null);
    const [selectableAvatars, setSelectableAvatars] = React.useState([]);
    const [selectableAvatarsMode, setSelectableAvatarsMode] =
        React.useState('disabled');
    const canUploadCustomAvatar = React.useMemo(
        () =>
            resolveCanUploadCustomAvatar(
                {selectable_avatars_mode: selectableAvatarsMode},
                user,
            ),
        [
            selectableAvatarsMode,
            user,
            user?.canUploadAvatar,
            user?.isAdmin,
            user?.isModerator,
            user?.trustLevel,
        ],
    );

    React.useEffect(() => {
        navigation.setOptions({ headerTitle: t('Harbor 個人資料') });
    }, [navigation, t]);

    React.useEffect(() => {
        setMode(
            isOwnProfile && route?.params?.mode === 'edit'
                ? 'edit'
                : 'preview',
        );
    }, [isOwnProfile, requestedUsername, route?.params?.mode]);

    React.useEffect(() => {
        if (isOwnProfile) {
            setViewedUser(user);
            setIsLoadingProfile(false);
            setProfileError(false);
            return;
        }

        const controller = new AbortController();
        let isActive = true;
        setIsLoadingProfile(true);
        setProfileError(false);

        fetchHarborUserProfile(requestedUsername, {
            signal: controller.signal,
        })
            .then(nextUser => {
                if (isActive) {
                    setViewedUser(nextUser);
                }
            })
            .catch(error => {
                if (isActive && error?.name !== 'CanceledError') {
                    setProfileError(true);
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingProfile(false);
                }
            });

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [isOwnProfile, requestedUsername, user]);

    React.useEffect(() => {
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setWebsite(profile.website || '');
        setWorkStatus(profile.workStatus || '');
    }, [profile]);

    React.useEffect(() => {
        const controller = new AbortController();
        let isActive = true;

        if (!isOwnProfile) {
            setIsLoadingMetadata(false);
            return undefined;
        }

        fetchHarborProfileMetadata({signal: controller.signal})
            .then(metadata => {
                if (isActive) {
                    setWorkStatusField(metadata.workStatusField);
                    setSelectableAvatars(metadata.selectableAvatars);
                    setSelectableAvatarsMode(
                        metadata.selectableAvatarsMode || 'disabled',
                    );
                    setMetadataError(!metadata.workStatusField);
                    if (__DEV__) {
                        console.log('[HarborProfile] avatar.metadata.loaded', {
                            count: metadata.selectableAvatars.length,
                            selectableAvatarsMode:
                                metadata.selectableAvatarsMode,
                        });
                    }
                }
            })
            .catch(error => {
                if (isActive && error?.name !== 'CanceledError') {
                    setMetadataError(true);
                    if (__DEV__) {
                        console.warn('[HarborProfile] avatar.metadata.failed', {
                            errorCode: error?.code || null,
                            httpStatus: error?.response?.status || null,
                            message: error?.message || String(error),
                        });
                    }
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingMetadata(false);
                }
            });

        return () => {
            isActive = false;
            controller.abort();
        };
    }, [isOwnProfile]);

    React.useEffect(() => {
        if (isOwnProfile && !user?.profile) {
            refresh().catch(() => { });
        }
    }, [isOwnProfile, refresh, user?.profile]);

    const initialValues = {
        bio: profile.bio || '',
        location: profile.location || '',
        website: profile.website || '',
        workStatus: profile.workStatus || '',
    };
    const hasChanges =
        bio !== initialValues.bio ||
        location !== initialValues.location ||
        website !== initialValues.website ||
        workStatus !== initialValues.workStatus;
    const canEditWorkStatus = Boolean(
        profile.canEdit &&
        workStatusField?.editable &&
        workStatusField.options.length,
    );
    const canSave = Boolean(
        isOwnProfile &&
        profile.canEdit &&
        hasChanges &&
        !isSaving &&
        !isUpdatingAvatar &&
        username,
    );
    const umerLabel = React.useMemo(
        () =>
            resolveUmerBadgeLabel(
                viewedUser?.groups,
                viewedUser?.isUMer,
            ),
        [viewedUser?.groups, viewedUser?.isUMer],
    );
    const profileTags = React.useMemo(
        () =>
            [
                profile.workStatus,
                viewedUser?.role,
                ...(viewedUser?.groups || []).filter(
                    item => !isUmerGroupLabel(item),
                ),
                `TL${viewedUser?.trustLevel ?? 0}`,
            ].filter(
                (tag, index, tags) =>
                    tag && tags.findIndex(item => item === tag) === index,
            ),
        [profile.workStatus, viewedUser],
    );
    const unavailableSections = viewedUser?.unavailableProfileSections || [];
    const isSummaryVisible = !unavailableSections.includes('summary');
    const areBadgesVisible = !unavailableSections.includes('badges');
    const communityStatsItems = React.useMemo(() => {
        const activityUsername = viewedUser?.username || username;
        return [
            ...(viewedUser?.contributions || []),
            ...(viewedUser?.stats || []),
        ]
            .filter(
                item =>
                    item.key !== 'topicsRead' &&
                    // 預覽模式對應他人視角，評論數僅本人可看
                    (isEditing || item.key !== 'postsCreated'),
            )
            .map(item => {
                if (item.key === 'postsCreated') {
                    return {
                        ...item,
                        label: '評論',
                        onPress:
                            isSummaryVisible && activityUsername
                                ? () =>
                                      navigation.navigate('HarborActivity', {
                                          kind: 'replies',
                                          title: t('評論'),
                                          username: activityUsername,
                                      })
                                : undefined,
                    };
                }
                if (item.key === 'topicsCreated') {
                    return {
                        ...item,
                        onPress:
                            isSummaryVisible && activityUsername
                                ? () =>
                                      navigation.navigate('HarborActivity', {
                                          kind: 'topics',
                                          title: t('建立話題'),
                                          username: activityUsername,
                                      })
                                : undefined,
                    };
                }
                if (item.key === 'likesReceived') {
                    return {
                        ...item,
                        // 預覽模式對應他人視角，收到的讚僅本人可進入
                        onPress:
                            isEditing &&
                            isSummaryVisible &&
                            activityUsername
                                ? () =>
                                      navigation.navigate('HarborActivity', {
                                          kind: 'likesReceived',
                                          title: t('收到的讚'),
                                          username: activityUsername,
                                      })
                                : undefined,
                    };
                }
                if (item.key === 'badges') {
                    return {
                        ...item,
                        onPress:
                            areBadgesVisible && isOwnProfile
                                ? () => navigation.navigate('HarborBadges')
                                : undefined,
                    };
                }
                return item;
            });
    }, [
        areBadgesVisible,
        isEditing,
        isOwnProfile,
        isSummaryVisible,
        navigation,
        t,
        username,
        viewedUser?.contributions,
        viewedUser?.stats,
        viewedUser?.username,
    ]);
    const publicInfoItems = [
        {
            key: 'bio',
            icon: 'person-outline',
            label: t('個人簡介'),
            value: profile.bio || t('未填寫'),
        },
        {
            key: 'workStatus',
            icon: 'briefcase-outline',
            label: t('工作狀態'),
            value: profile.workStatus || t('未填寫'),
        },
        {
            key: 'role',
            icon: 'ribbon-outline',
            label: t('身份'),
            value: viewedUser?.role || t('Harbor 會員'),
        },
        {
            key: 'location',
            icon: 'location-outline',
            label: t('地點'),
            value: profile.location || t('未填寫'),
        },
        {
            key: 'website',
            icon: 'link-outline',
            label: t('個人網站'),
            value: profile.website || t('未填寫'),
            link: profile.website,
        },
        {
            key: 'joinedAt',
            icon: 'calendar-outline',
            label: t('加入時間'),
            value: viewedUser?.joinedAt || t('暫不可見'),
        },
        {
            key: 'trustLevel',
            icon: 'shield-checkmark-outline',
            label: t('信任等級'),
            value: `TL${viewedUser?.trustLevel ?? 0}`,
        },
    ];
    const workStatusActions = (workStatusField?.options || []).map(option => ({
        id: option,
        title: option,
        state: option === workStatus ? 'on' : 'off',
    }));

    const showOperationError = () => {
        Alert.alert(
            t('Harbor 操作失敗'),
            t('無法更新 Harbor 個人資料，請稍後再試。'),
            [{ text: t('確定'), onPress: () => trigger() }],
        );
    };

    const handleSave = async () => {
        trigger();
        if (
            workStatusField?.required &&
            canEditWorkStatus &&
            !workStatus.trim()
        ) {
            Alert.alert(t('請選擇工作狀態'));
            return;
        }

        setIsSaving(true);
        try {
            await updateHarborProfile(username, {
                ...(profile.canChangeBio ? { bio } : {}),
                ...(profile.canChangeLocation ? { location } : {}),
                ...(profile.canChangeWebsite ? { website } : {}),
                ...(canEditWorkStatus
                    ? {
                        workStatus,
                        workStatusFieldId: workStatusField.id,
                    }
                    : {}),
            });
            await refresh();
            Alert.alert(t('已儲存'), t('Harbor 個人資料已更新。'));
        } catch (error) {
            showOperationError();
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarPress = () => {
        trigger();
        if (isSaving || isUpdatingAvatar) {
            return;
        }

        setPendingAvatar(null);
        setIsAvatarPickerVisible(true);
    };

    const handleUploadAvatar = async () => {
        if (isSaving || isUpdatingAvatar || !canUploadCustomAvatar) {
            return;
        }

        try {
            const permission =
                await ImagePicker.getMediaLibraryPermissionsAsync();
            let permissionStatus = permission.status;
            if (permissionStatus !== 'granted') {
                const result =
                    await ImagePicker.requestMediaLibraryPermissionsAsync();
                permissionStatus = result.status;
            }
            if (permissionStatus !== 'granted') {
                Alert.alert(
                    t('無法選擇圖片'),
                    t('請允許相片權限後再更換頭像。'),
                );
                return;
            }

            const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ['images'],
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.9,
            });
            if (result.canceled || !result.assets?.[0]) {
                return;
            }

            const asset = result.assets[0];
            setPendingAvatar({
                type: 'upload',
                url: asset.uri,
                image: {
                    uri: asset.uri,
                    fileName: asset.fileName,
                    mimeType: asset.mimeType,
                },
            });
        } catch (error) {
            Alert.alert(
                t('Harbor 操作失敗'),
                t('無法更新 Harbor 頭像，請稍後再試。'),
                [{ text: t('確定'), onPress: () => trigger() }],
            );
        }
    };

    const handleSelectAvatar = avatar => {
        setPendingAvatar({
            type: 'selectable',
            ...avatar,
        });
    };

    const handleCloseAvatarPicker = () => {
        setPendingAvatar(null);
        setIsAvatarPickerVisible(false);
    };

    const handleConfirmAvatar = async () => {
        if (isUpdatingAvatar || !pendingAvatar) {
            return;
        }

        setIsUpdatingAvatar(true);
        try {
            if (pendingAvatar.type === 'upload') {
                await updateHarborAvatar(
                    username,
                    pendingAvatar.image,
                    {userId: viewedUser?.id},
                );
            } else {
                await selectHarborAvatar(username, pendingAvatar.value);
            }
            syncIdentity().catch(() => null);
            await refresh();
            handleCloseAvatarPicker();
        } catch (error) {
            Alert.alert(
                t('Harbor 操作失敗'),
                t('無法更新 Harbor 頭像，請稍後再試。'),
                [{ text: t('確定'), onPress: () => trigger() }],
            );
        } finally {
            setIsUpdatingAvatar(false);
        }
    };

    const openHarborProfileSettings = () => {
        trigger();
        openLink({
            URL: `${ARK_HARBOR}/u/${encodeURIComponent(
                username,
            )}/preferences/profile`,
            mode: 'fullScreen',
        });
    };

    const openHarborProfile = () => {
        trigger();
        openLink({
            URL: `${ARK_HARBOR}/u/${encodeURIComponent(username)}/summary`,
            mode: 'fullScreen',
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg_color }]}>
            <KeyboardAwareScrollView
                bottomOffset={verticalScale(72)}
                contentInset={
                    isLiquidGlassSupported ? { top: headerHeight } : undefined
                }
                contentOffset={
                    isLiquidGlassSupported
                        ? { x: 0, y: -headerHeight }
                        : undefined
                }
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={styles.content}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? { top: headerHeight } : undefined
                }
                showsVerticalScrollIndicator={false}>
                {isLoadingProfile ? (
                    <View style={styles.loadingProfile}>
                        <ActivityIndicator color={theme.themeColor} />
                        <Text
                            style={[
                                styles.loadingText,
                                { color: theme.black.third },
                            ]}>
                            {t('正在載入個人資料…')}
                        </Text>
                    </View>
                ) : profileError ? (
                    <View
                        style={[
                            styles.notice,
                            { backgroundColor: theme.tonal.unread15 },
                        ]}>
                        <Ionicons
                            name="information-circle-outline"
                            size={scale(18)}
                            color={theme.unread}
                        />
                        <Text
                            style={[
                                styles.noticeText,
                                { color: theme.black.second },
                            ]}>
                            {t('無法取得這個 Harbor 個人資料，請稍後再試。')}
                        </Text>
                    </View>
                ) : (
                    <>
                        <View style={styles.identityCard}>
                            <View
                                style={[
                                    styles.avatarRing,
                                    { backgroundColor: theme.tonal.primary30 },
                                ]}>
                                <Image
                                    source={
                                        viewedUser?.avatarUrl
                                            ? { uri: viewedUser.avatarUrl }
                                            : AVATAR_SOURCE
                                    }
                                    style={styles.avatar}
                                    contentFit="cover"
                                />
                                {umerLabel ? (
                                    <UmerAvatarBadge label={umerLabel} />
                                ) : null}
                                {isEditing && profile.canEdit ? (
                                    <Pressable
                                        accessibilityLabel={t('更換頭像')}
                                        accessibilityRole="button"
                                        disabled={isSaving || isUpdatingAvatar}
                                        onPress={handleAvatarPress}
                                        style={({ pressed }) => [
                                            styles.avatarEditButton,
                                            {
                                                backgroundColor: theme.themeColor,
                                                borderColor: theme.bg_color,
                                            },
                                            pressed && { opacity: 0.82 },
                                        ]}>
                                        {isUpdatingAvatar ? (
                                            <ActivityIndicator
                                                color={theme.trueWhite}
                                                size="small"
                                            />
                                        ) : (
                                            <Ionicons
                                                color={theme.trueWhite}
                                                name="pencil"
                                                size={scale(15)}
                                            />
                                        )}
                                    </Pressable>
                                ) : null}
                            </View>
                            <View style={styles.nameRow}>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.identityName,
                                        { color: theme.black.main },
                                    ]}>
                                    {viewedUser?.displayName || username}
                                </Text>
                            </View>
                            <Text
                                style={[
                                    styles.username,
                                    { color: theme.black.third },
                                ]}>
                                @{username}
                            </Text>
                            <Text
                                style={[
                                    styles.role,
                                    { color: theme.black.second },
                                ]}>
                                {profile.workStatus || viewedUser?.role}
                            </Text>
                        </View>

                        {isOwnProfile ? (
                            <View
                                style={[
                                    styles.modeControl,
                                    { backgroundColor: theme.tonal.primary08 },
                                ]}>
                                {['preview', 'edit'].map(nextMode => (
                                    <Pressable
                                        accessibilityRole="button"
                                        key={nextMode}
                                        onPress={() => {
                                            trigger();
                                            setMode(nextMode);
                                        }}
                                        style={[
                                            styles.modeButton,
                                            mode === nextMode && {
                                                backgroundColor: theme.white,
                                            },
                                        ]}>
                                        <Text
                                            style={[
                                                styles.modeText,
                                                {
                                                    color:
                                                        mode === nextMode
                                                            ? theme.themeColor
                                                            : theme.black.third,
                                                },
                                            ]}>
                                            {nextMode === 'preview'
                                                ? t('預覽')
                                                : t('編輯')}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        ) : null}

                        {!isEditing ? (
                            <>
                                <View style={styles.section}>
                                    <Text
                                        style={[
                                            styles.sectionTitle,
                                            { color: theme.black.main },
                                        ]}>
                                        {t('身份標籤')}
                                    </Text>
                                    <View style={styles.tags}>
                                        {profileTags.length ? (
                                            profileTags.map(tag => (
                                                <View
                                                    key={tag}
                                                    style={[
                                                        styles.tag,
                                                        {
                                                            backgroundColor:
                                                                theme.tonal.primary15,
                                                        },
                                                    ]}>
                                                    <Text
                                                        style={[
                                                            styles.tagText,
                                                            {
                                                                color: theme.themeColor,
                                                            },
                                                        ]}>
                                                        {tag}
                                                    </Text>
                                                </View>
                                            ))
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.emptyText,
                                                    { color: theme.black.third },
                                                ]}>
                                                {t('沒有可顯示的標籤')}
                                            </Text>
                                        )}
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text
                                        style={[
                                            styles.sectionTitle,
                                            { color: theme.black.main },
                                        ]}>
                                        {t('公開資料')}
                                    </Text>
                                    <View
                                        style={[
                                            styles.list,
                                            { backgroundColor: theme.white },
                                        ]}>
                                        {publicInfoItems.map((item, index) => {
                                            const content = (
                                                <>
                                                    <Ionicons
                                                        name={item.icon}
                                                        size={scale(18)}
                                                        color={
                                                            item.link
                                                                ? theme.themeColor
                                                                : theme.black.third
                                                        }
                                                    />
                                                    <View
                                                        style={styles.listText}>
                                                        <Text
                                                            style={[
                                                                styles.listLabel,
                                                                {
                                                                    color: theme.black.third,
                                                                },
                                                            ]}>
                                                            {item.label}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.listValue,
                                                                {
                                                                    color: item.link
                                                                        ? theme.themeColor
                                                                        : theme.black.main,
                                                                },
                                                            ]}>
                                                            {item.value}
                                                        </Text>
                                                    </View>
                                                </>
                                            );

                                            return (
                                                <React.Fragment key={item.key}>
                                                    {item.link ? (
                                                        <Pressable
                                                            accessibilityRole="link"
                                                            onPress={() => {
                                                                trigger();
                                                                openLink({
                                                                    URL: item.link,
                                                                    mode: 'fullScreen',
                                                                });
                                                            }}
                                                            style={styles.listRow}>
                                                            {content}
                                                        </Pressable>
                                                    ) : (
                                                        <View
                                                            style={styles.listRow}>
                                                            {content}
                                                        </View>
                                                    )}
                                                    {index <
                                                        publicInfoItems.length - 1 ? (
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
                                                </React.Fragment>
                                            );
                                        })}
                                    </View>
                                </View>

                                <View style={styles.section}>
                                    <Text
                                        style={[
                                            styles.sectionTitle,
                                            { color: theme.black.main },
                                        ]}>
                                        {t('社群統計')}
                                    </Text>
                                    <View
                                        style={[
                                            styles.metrics,
                                            { backgroundColor: theme.white },
                                        ]}>
                                        {communityStatsItems.map(item => {
                                            const content = (
                                                <>
                                                    <Text
                                                        style={[
                                                            styles.metricValue,
                                                            {
                                                                color: theme
                                                                    .black.main,
                                                            },
                                                        ]}>
                                                        {isSummaryVisible
                                                            ? item.value
                                                            : '—'}
                                                    </Text>
                                                    <Text
                                                        style={[
                                                            styles.metricLabel,
                                                            {
                                                                color: theme
                                                                    .black
                                                                    .third,
                                                            },
                                                        ]}>
                                                        {t(item.label)}
                                                    </Text>
                                                </>
                                            );
                                            if (item.onPress) {
                                                return (
                                                    <Pressable
                                                        key={item.key}
                                                        accessibilityRole="button"
                                                        accessibilityLabel={`${
                                                            isSummaryVisible
                                                                ? item.value
                                                                : '—'
                                                        } ${t(item.label)}`}
                                                        onPress={() => {
                                                            trigger();
                                                            item.onPress();
                                                        }}
                                                        style={({
                                                            pressed,
                                                        }) => [
                                                            styles.metric,
                                                            pressed && {
                                                                backgroundColor:
                                                                    theme.tonal
                                                                        .primary08,
                                                            },
                                                        ]}>
                                                        {content}
                                                    </Pressable>
                                                );
                                            }
                                            return (
                                                <View
                                                    key={item.key}
                                                    style={styles.metric}>
                                                    {content}
                                                </View>
                                            );
                                        })}
                                    </View>
                                    {!isSummaryVisible ? (
                                        <Text
                                            style={[
                                                styles.sectionHint,
                                                { color: theme.black.third },
                                            ]}>
                                            {t('這位用戶的統計目前不可見。')}
                                        </Text>
                                    ) : null}
                                </View>

                                <View style={styles.section}>
                                    <Text
                                        style={[
                                            styles.sectionTitle,
                                            { color: theme.black.main },
                                        ]}>
                                        {t('論壇成就')}
                                    </Text>
                                    <View
                                        style={[
                                            styles.list,
                                            { backgroundColor: theme.white },
                                        ]}>
                                        {viewedUser?.badges?.length ? (
                                            viewedUser.badges.map(
                                                (badge, index) => (
                                                    <React.Fragment
                                                        key={badge.id}>
                                                        <View
                                                            style={
                                                                styles.badgeRow
                                                            }>
                                                            <HarborBadgeIcon
                                                                badge={badge}
                                                                compact
                                                            />
                                                            <View
                                                                style={
                                                                    styles.listText
                                                                }>
                                                                <Text
                                                                    style={[
                                                                        styles.badgeName,
                                                                        {
                                                                            color: theme.black.main,
                                                                        },
                                                                    ]}>
                                                                    {badge.name}
                                                                </Text>
                                                                <Text
                                                                    style={[
                                                                        styles.badgeDescription,
                                                                        {
                                                                            color: theme.black.third,
                                                                        },
                                                                    ]}>
                                                                    {badge.description ||
                                                                        t('Harbor 社群徽章')}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                        {index <
                                                            viewedUser.badges.length -
                                                            1 ? (
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
                                                    </React.Fragment>
                                                ),
                                            )
                                        ) : (
                                            <Text
                                                style={[
                                                    styles.emptyListText,
                                                    { color: theme.black.third },
                                                ]}>
                                                {areBadgesVisible
                                                    ? t('沒有公開成就')
                                                    : t('這位用戶的成就目前不可見。')}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </>
                        ) : (
                            <>
                                {!profile.canEdit ? (
                                    <View
                                        style={[
                                            styles.notice,
                                            {
                                                backgroundColor:
                                                    theme.tonal.unread15,
                                            },
                                        ]}>
                                        <Ionicons
                                            name="information-circle-outline"
                                            size={scale(18)}
                                            color={theme.unread}
                                        />
                                        <Text
                                            style={[
                                                styles.noticeText,
                                                { color: theme.black.second },
                                            ]}>
                                            {t('目前無法在 App 內編輯這個 Harbor 個人資料。')}
                                        </Text>
                                    </View>
                                ) : null}

                                <View
                                    style={[
                                        styles.formCard,
                                        { backgroundColor: theme.white },
                                    ]}>
                                    <View style={styles.field}>
                                        <Text
                                            style={[
                                                styles.fieldLabel,
                                                { color: theme.black.second },
                                            ]}>
                                            {t('工作狀態')}
                                        </Text>
                                        {canEditWorkStatus && !isSaving ? (
                                            <MenuView
                                                actions={workStatusActions}
                                                onOpenMenu={() => trigger()}
                                                onPressAction={event => {
                                                    trigger();
                                                    setWorkStatus(
                                                        event.nativeEvent.event,
                                                    );
                                                }}
                                                shouldOpenOnLongPress={false}>
                                                <View
                                                    accessible
                                                    accessibilityRole="button"
                                                    style={[
                                                        styles.select,
                                                        {
                                                            backgroundColor:
                                                                theme.tonal.primary08,
                                                            borderColor:
                                                                theme.themeColorUltraLight,
                                                        },
                                                    ]}>
                                                    <Text
                                                        style={[
                                                            styles.selectText,
                                                            {
                                                                color: workStatus
                                                                    ? theme.black.main
                                                                    : theme.black.third,
                                                            },
                                                        ]}>
                                                        {workStatus ||
                                                            t('請選擇工作狀態')}
                                                    </Text>
                                                    <Ionicons
                                                        name="chevron-down"
                                                        size={scale(17)}
                                                        color={theme.black.third}
                                                    />
                                                </View>
                                            </MenuView>
                                        ) : (
                                            <View
                                                style={[
                                                    styles.select,
                                                    {
                                                        backgroundColor:
                                                            theme.tonal.primary08,
                                                        borderColor:
                                                            theme.themeColorUltraLight,
                                                    },
                                                ]}>
                                                {isLoadingMetadata ? (
                                                    <ActivityIndicator
                                                        size="small"
                                                        color={theme.themeColor}
                                                    />
                                                ) : (
                                                    <Text
                                                        style={[
                                                            styles.selectText,
                                                            {
                                                                color: theme.black.third,
                                                            },
                                                        ]}>
                                                        {workStatus ||
                                                            t('暫時無法取得')}
                                                    </Text>
                                                )}
                                            </View>
                                        )}
                                        {metadataError ? (
                                            <Text
                                                style={[
                                                    styles.fieldHint,
                                                    { color: theme.unread },
                                                ]}>
                                                {t('工作狀態選項載入失敗，可稍後重試或使用 Harbor Web。')}
                                            </Text>
                                        ) : null}
                                    </View>

                                    <ProfileTextField
                                        editable={
                                            Boolean(profile.canChangeBio) &&
                                            !isSaving
                                        }
                                        label={t('個人簡介')}
                                        multiline
                                        onChangeText={setBio}
                                        placeholder={t('介紹一下自己')}
                                        textAlignVertical="top"
                                        value={bio}
                                    />
                                    <ProfileTextField
                                        editable={
                                            Boolean(
                                                profile.canChangeLocation,
                                            ) && !isSaving
                                        }
                                        label={t('地點')}
                                        onChangeText={setLocation}
                                        placeholder={t('你所在的城市或地區')}
                                        returnKeyType="next"
                                        value={location}
                                    />
                                    <ProfileTextField
                                        autoCapitalize="none"
                                        autoCorrect={false}
                                        editable={
                                            Boolean(
                                                profile.canChangeWebsite,
                                            ) && !isSaving
                                        }
                                        keyboardType="url"
                                        label={t('個人網站')}
                                        onChangeText={setWebsite}
                                        placeholder="https://"
                                        returnKeyType="done"
                                        value={website}
                                    />
                                </View>

                                <Pressable
                                    accessibilityRole="button"
                                    disabled={!canSave}
                                    onPress={handleSave}
                                    style={({ pressed }) => [
                                        styles.saveButton,
                                        {
                                            backgroundColor: canSave
                                                ? theme.themeColor
                                                : theme.disabled,
                                        },
                                        pressed && canSave && { opacity: 0.82 },
                                    ]}>
                                    {isSaving ? (
                                        <ActivityIndicator
                                            size="small"
                                            color={theme.trueWhite}
                                        />
                                    ) : (
                                        <Ionicons
                                            name="checkmark-circle-outline"
                                            size={scale(19)}
                                            color={theme.trueWhite}
                                        />
                                    )}
                                    <Text
                                        style={[
                                            styles.saveText,
                                            { color: theme.trueWhite },
                                        ]}>
                                        {isSaving ? t('正在儲存…') : t('儲存')}
                                    </Text>
                                </Pressable>
                            </>
                        )}
                    </>
                )}

                <Pressable
                    accessibilityRole="link"
                    disabled={isLoadingProfile || profileError}
                    onPress={
                        isEditing
                            ? openHarborProfileSettings
                            : openHarborProfile
                    }
                    style={({ pressed }) => [
                        styles.webButton,
                        { borderColor: theme.themeColorUltraLight },
                        pressed && { backgroundColor: theme.tonal.primary08 },
                    ]}>
                    <Ionicons
                        name="open-outline"
                        size={scale(17)}
                        color={theme.themeColor}
                    />
                    <Text
                        style={[
                            styles.webButtonText,
                            { color: theme.themeColor },
                        ]}>
                        {isEditing
                            ? t('在 Harbor Web 編輯更多資料')
                            : t('在 Harbor Web 查看個人資料')}
                    </Text>
                </Pressable>
            </KeyboardAwareScrollView>
            {isEditing ? <KeyboardToolbar /> : null}
            <HarborAvatarPickerModal
                avatars={selectableAvatars}
                canUpload={canUploadCustomAvatar}
                isLoading={isLoadingMetadata}
                isSubmitting={isUpdatingAvatar}
                onClose={handleCloseAvatarPicker}
                onConfirm={handleConfirmAvatar}
                onSelect={handleSelectAvatar}
                onUpload={handleUploadAvatar}
                selectedAvatar={pendingAvatar}
                visible={isAvatarPickerVisible}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(36),
        gap: verticalScale(14),
    },
    identityCard: {
        minHeight: verticalScale(180),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(16),
        overflow: 'visible',
    },
    avatarRing: {
        width: scale(94),
        height: scale(94),
        borderRadius: scale(47),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    avatar: {
        width: scale(84),
        height: scale(84),
        borderRadius: scale(42),
    },
    avatarEditButton: {
        position: 'absolute',
        right: scale(-2),
        bottom: scale(-2),
        width: scale(30),
        height: scale(30),
        borderRadius: scale(15),
        borderWidth: scale(2),
        alignItems: 'center',
        justifyContent: 'center',
    },
    umerBadge: {
        position: 'absolute',
        top: scale(-4),
        right: scale(-18),
        borderRadius: scale(6),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(3),
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
        elevation: 4,
    },
    umerBadgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '800',
        letterSpacing: 0.2,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(7),
        marginTop: verticalScale(12),
    },
    identityName: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(19),
        fontWeight: '760',
        textAlign: 'center',
    },
    username: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        marginTop: verticalScale(3),
    },
    role: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '600',
        marginTop: verticalScale(7),
    },
    loadingProfile: {
        minHeight: verticalScale(180),
        alignItems: 'center',
        justifyContent: 'center',
        gap: verticalScale(10),
    },
    loadingText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    modeControl: {
        minHeight: verticalScale(42),
        borderRadius: scale(13),
        flexDirection: 'row',
        padding: scale(3),
    },
    modeButton: {
        flex: 1,
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
    section: {
        gap: verticalScale(8),
    },
    sectionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '720',
        paddingHorizontal: scale(3),
    },
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: scale(7),
        paddingHorizontal: scale(3),
    },
    tag: {
        minHeight: verticalScale(26),
        borderRadius: scale(9),
        justifyContent: 'center',
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(4),
    },
    tagText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '650',
    },
    emptyText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        paddingVertical: verticalScale(5),
    },
    list: {
        borderRadius: scale(14),
        overflow: 'hidden',
    },
    listRow: {
        minHeight: verticalScale(58),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
    },
    listText: {
        flex: 1,
        minWidth: 0,
    },
    listLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        marginBottom: verticalScale(3),
    },
    listValue: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(17),
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: scale(44),
    },
    metrics: {
        borderRadius: scale(14),
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: scale(6),
        paddingVertical: verticalScale(8),
    },
    metric: {
        width: '33.333%',
        minHeight: verticalScale(68),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(8),
        paddingHorizontal: scale(3),
        paddingVertical: verticalScale(7),
    },
    metricValue: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '760',
        textAlign: 'center',
    },
    metricLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        lineHeight: verticalScale(13),
        textAlign: 'center',
        marginTop: verticalScale(4),
    },
    sectionHint: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        paddingHorizontal: scale(4),
    },
    badgeRow: {
        minHeight: verticalScale(68),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(9),
    },
    badgeName: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '680',
    },
    badgeDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        lineHeight: verticalScale(13),
        marginTop: verticalScale(3),
    },
    emptyListText: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        textAlign: 'center',
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(22),
    },
    notice: {
        borderRadius: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        paddingHorizontal: scale(13),
        paddingVertical: verticalScale(11),
    },
    noticeText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
    },
    formCard: {
        borderRadius: scale(20),
        gap: verticalScale(15),
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(17),
    },
    field: {
        gap: verticalScale(7),
    },
    fieldLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '650',
    },
    input: {
        ...uiStyle.defaultText,
        minHeight: verticalScale(44),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        fontSize: scale(12),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    multilineInput: {
        minHeight: verticalScale(108),
    },
    select: {
        minHeight: verticalScale(44),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(12),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    selectText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(12),
    },
    fieldHint: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        lineHeight: verticalScale(13),
    },
    saveButton: {
        minHeight: verticalScale(50),
        borderRadius: scale(15),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(7),
        paddingHorizontal: scale(18),
    },
    saveText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
    webButton: {
        minHeight: verticalScale(46),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(14),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(7),
        paddingHorizontal: scale(16),
    },
    webButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '650',
    },
});

export default HarborProfilePage;
