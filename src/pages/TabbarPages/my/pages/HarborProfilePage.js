import React from 'react';
import {
    ActivityIndicator,
    Alert,
    BackHandler,
    Platform,
    StyleSheet,
    View,
} from 'react-native';

import { isLiquidGlassSupported } from '../../../../utils/glassEffect';
import { HeaderBackButton, useHeaderHeight } from '@react-navigation/elements';
import { MenuView } from '@react-native-menu/menu';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import { KeyboardAwareScrollView, KeyboardToolbar } from 'react-native-keyboard-controller';
import PagerView from 'react-native-pager-view';
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

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import TextInput from '../../../../components/AppTextInput';
import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { useHarborSession } from '../../../../contexts/HarborSessionContext';
import { useAppReducedMotion } from '../../../../contexts/ReducedMotionContext';
import { useSchedulingSession } from '../../../../contexts/SchedulingSessionContext';
import HarborAvatarPickerModal from '../components/HarborAvatarPickerModal';
import HarborBadgeIcon from '../components/HarborBadgeIcon';
import HarborUsernameEditorModal from '../components/HarborUsernameEditorModal';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import {
    createHarborDirectMessageChannel,
    resolveCanUploadCustomAvatar,
    selectHarborAvatar,
    updateHarborAvatar,
    updateHarborProfile,
    updateHarborUsername,
} from '../../../../utils/harbor/harborApi';
import {getHarborChatStartFailureReason} from '../../../../utils/harbor/harborChat';
import {
    fetchHarborProfileMetadataQuery,
    fetchHarborProfileQuery,
    invalidateHarborProfileQuery,
    readHarborProfileMetadataQuery,
    readHarborProfileQuery,
} from '../../../../utils/harbor/harborPageQueries';
import { openLink } from '../../../../utils/browser';
import { ARK_HARBOR } from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';

const AVATAR_SOURCE = require('../../../../static/img/logo_round.png');
const UMER_DISPLAY_LABEL = '🎓 UMer';
const PROFILE_PAGER_SHADOW_SPACE = verticalScale(6);
const PROFILE_PAGER_INITIAL_HEIGHT = verticalScale(160);

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

const getHarborUsernameErrorMessage = error => {
    const data = error?.response?.data;
    const errors = data?.errors;
    if (Array.isArray(errors)) {
        return errors.filter(Boolean).join(' ');
    }
    if (typeof errors === 'string') {
        return errors;
    }
    return data?.error || data?.message || '';
};

const HARBOR_CHAT_START_ERROR_COPY = {
    self: '你的帳號目前還不能使用 Chat。可能尚未開啟此功能，或暫時沒有發起聊天的權限。',
    peer: '對方可能未開啟 Chat，或目前不接受新的聊天。',
    generic: '暫時無法開始 Chat，請檢查網絡後再試。',
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
                theme.floatingShadow,
                {
                    backgroundColor: theme.themeColor,
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
            <Text style={[styles.fieldLabel, { color: theme.black.third }]}>
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

const ProfileTabPager = ({ pagerRef, activePage, onPageSelected, children }) => {
    const initialPage = React.useRef(activePage).current;
    const [pageHeights, setPageHeights] = React.useState({});
    // 兩頁共用同一高度，選中頁改變時不重排原生分頁容器。
    const pagerHeight = Math.max(...Object.values(pageHeights), 0) || PROFILE_PAGER_INITIAL_HEIGHT;

    const recordPageHeight = (index, event) => {
        const height = Math.ceil(event.nativeEvent.layout.height);
        setPageHeights(previous => (
            previous[index] === height ? previous : { ...previous, [index]: height }
        ));
    };

    return (
        <PagerView
            ref={pagerRef}
            style={[styles.profilePager, { height: pagerHeight }]}
            initialPage={initialPage}
            offscreenPageLimit={1}
            onPageSelected={onPageSelected}>
            {React.Children.map(children, (page, index) => (
                <View
                    collapsable={false}
                    accessibilityElementsHidden={index !== activePage}
                    importantForAccessibility={index === activePage ? 'auto' : 'no-hide-descendants'}>
                    {/* 各頁以內容高度獨立量測，外層仍可上下捲動。 */}
                    <View style={styles.profilePagerPageContent} onLayout={event => recordPageHeight(index, event)}>
                        {page}
                    </View>
                </View>
            ))}
        </PagerView>
    );
};

const HarborProfilePage = ({ navigation, route }) => {
    const { theme } = useTheme();
    const reducedMotion = useAppReducedMotion();
    const {syncIdentity} = useSchedulingSession();
    const { t } = useTranslation('my');
    const { user, refresh } = useHarborSession();
    const headerHeight = useHeaderHeight();
    const sessionUsername = user?.username || '';
    const [renamedUsername, setRenamedUsername] = React.useState('');
    const requestedUsername = String(
        renamedUsername || route?.params?.username || sessionUsername,
    );
    const isOwnProfile = Boolean(
        sessionUsername &&
        requestedUsername.toLowerCase() === sessionUsername.toLowerCase(),
    );
    const [viewedUser, setViewedUser] = React.useState(() =>
        isOwnProfile ? user : readHarborProfileQuery(requestedUsername),
    );
    const [isLoadingProfile, setIsLoadingProfile] = React.useState(
        !isOwnProfile && !readHarborProfileQuery(requestedUsername),
    );
    const [profileError, setProfileError] = React.useState(false);
    const [mode, setMode] = React.useState(
        isOwnProfile && route?.params?.mode === 'edit' ? 'edit' : 'preview',
    );
    const profilePagerRef = React.useRef(null);
    const activeProfilePageRef = React.useRef(0);
    const [activeProfilePage, setActiveProfilePage] = React.useState(0);
    const selectProfileTab = index => {
        if (reducedMotion) {
            profilePagerRef.current?.setPageWithoutAnimation(index);
        } else {
            profilePagerRef.current?.setPage(index);
        }
    };
    const handleProfilePageSelected = ({ nativeEvent: { position } }) => {
        if (activeProfilePageRef.current !== position) {
            activeProfilePageRef.current = position;
            setActiveProfilePage(position);
            trigger('selection');
        }
    };
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
    const initialMetadata = React.useMemo(
        () => readHarborProfileMetadataQuery(),
        [],
    );
    const [workStatusField, setWorkStatusField] = React.useState(
        initialMetadata?.workStatusField || null,
    );
    const [isLoadingMetadata, setIsLoadingMetadata] = React.useState(
        !initialMetadata,
    );
    const [metadataError, setMetadataError] = React.useState(false);
    const [isSaving, setIsSaving] = React.useState(false);
    const [isUpdatingUsername, setIsUpdatingUsername] = React.useState(false);
    const [isUsernameEditorVisible, setIsUsernameEditorVisible] =
        React.useState(false);
    const [minUsernameLength, setMinUsernameLength] = React.useState(
        initialMetadata?.minUsernameLength || 3,
    );
    const [maxUsernameLength, setMaxUsernameLength] = React.useState(
        initialMetadata?.maxUsernameLength || 20,
    );
    const [isOpeningChat, setIsOpeningChat] = React.useState(false);
    const [isUpdatingAvatar, setIsUpdatingAvatar] = React.useState(false);
    const [isAvatarPickerVisible, setIsAvatarPickerVisible] =
        React.useState(false);
    const [pendingAvatar, setPendingAvatar] = React.useState(null);
    const [selectableAvatars, setSelectableAvatars] = React.useState(
        initialMetadata?.selectableAvatars || [],
    );
    const [selectableAvatarsMode, setSelectableAvatarsMode] =
        React.useState(initialMetadata?.selectableAvatarsMode || 'disabled');
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

        let isActive = true;
        const cachedProfile = readHarborProfileQuery(requestedUsername);
        if (cachedProfile) {
            setViewedUser(cachedProfile);
        } else {
            setViewedUser(null);
            setIsLoadingProfile(true);
        }
        setProfileError(false);

        fetchHarborProfileQuery(requestedUsername)
            .then(nextUser => {
                if (isActive) {
                    setViewedUser(nextUser);
                }
            })
            .catch(error => {
                if (isActive && error?.name !== 'CanceledError') {
                    setProfileError(!cachedProfile);
                }
            })
            .finally(() => {
                if (isActive) {
                    setIsLoadingProfile(false);
                }
            });

        return () => {
            isActive = false;
        };
    }, [isOwnProfile, requestedUsername, user]);

    React.useEffect(() => {
        setBio(profile.bio || '');
        setLocation(profile.location || '');
        setWebsite(profile.website || '');
        setWorkStatus(profile.workStatus || '');
    }, [profile]);

    React.useEffect(() => {
        let isActive = true;

        if (!isOwnProfile) {
            setIsLoadingMetadata(false);
            return undefined;
        }

        const cachedMetadata = readHarborProfileMetadataQuery();
        if (cachedMetadata) {
            setWorkStatusField(cachedMetadata.workStatusField);
            setSelectableAvatars(cachedMetadata.selectableAvatars);
            setSelectableAvatarsMode(
                cachedMetadata.selectableAvatarsMode || 'disabled',
            );
            setMinUsernameLength(cachedMetadata.minUsernameLength || 3);
            setMaxUsernameLength(cachedMetadata.maxUsernameLength || 20);
            setIsLoadingMetadata(false);
        }

        fetchHarborProfileMetadataQuery()
            .then(metadata => {
                if (isActive) {
                    setWorkStatusField(metadata.workStatusField);
                    setSelectableAvatars(metadata.selectableAvatars);
                    setSelectableAvatarsMode(
                        metadata.selectableAvatarsMode || 'disabled',
                    );
                    setMinUsernameLength(metadata.minUsernameLength || 3);
                    setMaxUsernameLength(metadata.maxUsernameLength || 20);
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

    const handleEditBack = () => {
        if (isSaving) {
            return;
        }
        const finishExit = () => {
            setBio(initialValues.bio);
            setLocation(initialValues.location);
            setWebsite(initialValues.website);
            setWorkStatus(initialValues.workStatus);
            if (route?.params?.mode !== 'edit') {
                setMode('preview');
            } else {
                navigation.goBack();
            }
        };
        if (!hasChanges) {
            trigger();
            finishExit();
            return;
        }
        trigger('warning');
        Alert.alert(
            t('放棄編輯？'),
            t('目前的修改尚未儲存，確定要離開嗎？'),
            [
                {
                    text: t('繼續編輯'),
                    style: 'cancel',
                    onPress: () => trigger(),
                },
                {
                    text: t('放棄'),
                    style: 'destructive',
                    onPress: () => {
                        trigger();
                        finishExit();
                    },
                },
            ],
        );
    };

    React.useEffect(() => {
        if (Platform.OS !== 'android' || !isEditing) {
            return undefined;
        }
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            handleEditBackRef.current?.();
            return true;
        });
        return () => sub.remove();
    }, [isEditing]);
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
        !isUpdatingUsername &&
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
            icon: 'user-circle',
            tone: 'blue',
            label: t('個人簡介'),
            value: profile.bio || t('未填寫'),
        },
        {
            key: 'workStatus',
            icon: 'briefcase',
            tone: 'green',
            label: t('工作狀態'),
            value: profile.workStatus || t('未填寫'),
        },
        {
            key: 'role',
            icon: 'award',
            tone: 'orange',
            label: t('身份'),
            value: viewedUser?.role || t('Harbor 會員'),
        },
        {
            key: 'location',
            icon: 'map-pin',
            tone: 'coral',
            label: t('地點'),
            value: profile.location || t('未填寫'),
        },
        {
            key: 'website',
            icon: 'link',
            tone: 'blue',
            label: t('個人網站'),
            value: profile.website || t('未填寫'),
            link: profile.website,
        },
        {
            key: 'joinedAt',
            icon: 'calendar',
            tone: 'green',
            label: t('加入時間'),
            value: viewedUser?.joinedAt || t('暫不可見'),
        },
        {
            key: 'trustLevel',
            icon: 'shield',
            tone: 'orange',
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
            invalidateHarborProfileQuery(username);
            await refresh();
            setMode('preview');
            Alert.alert(t('已儲存'), t('Harbor 個人資料已更新。'));
        } catch (error) {
            showOperationError();
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRef = React.useRef(null);
    handleSaveRef.current = handleSave;
    const handleEditBackRef = React.useRef(null);
    handleEditBackRef.current = handleEditBack;

    React.useEffect(() => {
        const showHeaderAction =
            isOwnProfile && !isLoadingProfile && !profileError;
        const canPressHeaderSave = isEditing ? canSave : true;

        navigation.setOptions({
            headerTitle: isEditing
                ? t('編輯個人資料')
                : t('Harbor 個人資料'),
            gestureEnabled: !isEditing,
            headerBackVisible: !isEditing,
            headerLeft: isEditing
                ? props => (
                      <HeaderBackButton
                          {...props}
                          label=""
                          onPress={() => handleEditBackRef.current?.()}
                      />
                  )
                : undefined,
            headerRight:
                showHeaderAction && Platform.OS !== 'ios'
                    ? () => (
                          <ScalePressable
                              accessibilityRole="button"
                              disabled={!canPressHeaderSave}
                              onPress={() => {
                                  if (isEditing) {
                                      handleSaveRef.current?.();
                                  } else {
                                      trigger();
                                      setMode('edit');
                                  }
                              }}
                              style={[
                                  styles.headerActionButton,
                                  {
                                      backgroundColor: isEditing
                                          ? canSave
                                              ? theme.themeColor
                                              : theme.disabled
                                          : theme.tonal.primary15,
                                  },
                              ]}>
                              <Text
                                  style={[
                                      styles.headerActionText,
                                      {
                                          color: isEditing
                                              ? theme.trueWhite
                                              : theme.accentForeground,
                                      },
                                  ]}>
                                  {isEditing
                                      ? isSaving
                                          ? t('正在儲存…')
                                          : t('儲存')
                                      : t('編輯')}
                              </Text>
                          </ScalePressable>
                      )
                    : undefined,
            unstable_headerRightItems:
                showHeaderAction && Platform.OS === 'ios'
                    ? () =>
                          isEditing
                              ? [
                                    {
                                        type: 'button',
                                        label: isSaving
                                            ? t('正在儲存…')
                                            : t('儲存'),
                                        accessibilityLabel: t('儲存'),
                                        disabled: !canSave,
                                        icon: {
                                            type: 'sfSymbol',
                                            name: 'checkmark',
                                        },
                                        tintColor: canSave
                                            ? theme.themeColor
                                            : theme.disabled,
                                        onPress: () => {
                                            handleSaveRef.current?.();
                                        },
                                    },
                                ]
                              : [
                                    {
                                        type: 'button',
                                        label: t('編輯'),
                                        accessibilityLabel: t('編輯個人資料'),
                                        icon: {
                                            type: 'sfSymbol',
                                            name: 'pencil',
                                        },
                                        tintColor: theme.themeColor,
                                        onPress: () => {
                                            trigger();
                                            setMode('edit');
                                        },
                                    },
                                ]
                    : undefined,
        });
    }, [
        canSave,
        isEditing,
        isLoadingProfile,
        isOwnProfile,
        isSaving,
        navigation,
        profileError,
        t,
        theme.accentForeground,
        theme.disabled,
        theme.themeColor,
        theme.tonal.primary15,
        theme.trueWhite,
    ]);

    const handleUsernameSubmit = async newUsername => {
        if (isUpdatingUsername) {
            return;
        }

        setIsUpdatingUsername(true);
        try {
            const result = await updateHarborUsername(username, newUsername);
            invalidateHarborProfileQuery(username);
            invalidateHarborProfileQuery(newUsername);
            const nextUser = await refresh();
            const resolvedUsername =
                result?.username || nextUser?.username || newUsername;
            setRenamedUsername(resolvedUsername);
            if (nextUser) {
                setViewedUser(nextUser);
            }
            syncIdentity().catch(() => null);
            setIsUsernameEditorVisible(false);
            Alert.alert(
                t('使用者名稱已更新'),
                t('你在 Harbor 的使用者名稱已改為 @{{username}}。', {
                    username: resolvedUsername,
                }),
            );
        } catch (error) {
            Alert.alert(
                t('無法修改使用者名稱'),
                getHarborUsernameErrorMessage(error) ||
                    t('Harbor 暫時無法修改使用者名稱，請稍後再試。'),
                [{ text: t('確定'), onPress: () => trigger() }],
            );
        } finally {
            setIsUpdatingUsername(false);
        }
    };

    const handleAvatarPress = () => {
        trigger();
        if (isSaving || isUpdatingAvatar || isUpdatingUsername) {
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
            invalidateHarborProfileQuery(username);
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

    const openHarborChat = async () => {
        if (!username || isOpeningChat) {
            return;
        }
        trigger();
        const knownReason = getHarborChatStartFailureReason(null, user);
        if (knownReason === 'self') {
            Alert.alert(
                t('無法開始 Chat'),
                t(HARBOR_CHAT_START_ERROR_COPY.self),
                [{text: t('確定'), onPress: () => trigger()}],
            );
            return;
        }
        setIsOpeningChat(true);
        try {
            const channel = await createHarborDirectMessageChannel(username);
            if (!channel) {
                throw new Error('Invalid Harbor Chat channel');
            }
            navigation.navigate('HarborChatChannel', {
                channelId: channel.id,
                channelTitle:
                    channel.title || viewedUser?.displayName || username,
                channelAvatarUrl: channel.avatarUrl,
                channelUsers: channel.users,
                isGroup: channel.isGroup,
            });
        } catch (error) {
            const reason =
                getHarborChatStartFailureReason(error, user) || 'generic';
            Alert.alert(
                t('無法開始 Chat'),
                t(
                    HARBOR_CHAT_START_ERROR_COPY[reason] ||
                        HARBOR_CHAT_START_ERROR_COPY.generic,
                ),
                [{text: t('確定'), onPress: () => trigger()}],
            );
        } finally {
            setIsOpeningChat(false);
        }
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
                directionalLockEnabled={!isEditing}
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
                        {!isEditing ? (
                            <>
                                <View style={styles.identityCard}>
                                    <View style={styles.avatarRing}>
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
                                        {profile.workStatus || viewedUser?.role
                                            ? `@${username} · ${
                                                  profile.workStatus ||
                                                  viewedUser?.role
                                              }`
                                            : `@${username}`}
                                    </Text>
                                    <View style={styles.inlineStatsRow}>
                                        {communityStatsItems.map((item, idx) => {
                                            const statContent = (
                                                <Text
                                                    style={[
                                                        styles.inlineStatText,
                                                        { color: theme.black.second },
                                                    ]}>
                                                    <Text
                                                        style={[
                                                            styles.inlineStatValue,
                                                            { color: theme.black.main },
                                                        ]}>
                                                        {isSummaryVisible
                                                            ? item.value
                                                            : '—'}
                                                    </Text>
                                                    {` ${t(item.label)}`}
                                                </Text>
                                            );
                                            return (
                                                <React.Fragment key={item.key}>
                                                    {idx > 0 ? (
                                                        <Text
                                                            style={[
                                                                styles.inlineStatDot,
                                                                {
                                                                    color: theme.black
                                                                        .third,
                                                                },
                                                            ]}>
                                                            ·
                                                        </Text>
                                                    ) : null}
                                                    {item.onPress ? (
                                                        <ScalePressable
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
                                                            style={styles.inlineStatItem}>
                                                            {statContent}
                                                        </ScalePressable>
                                                    ) : (
                                                        <View style={styles.inlineStatItem}>
                                                            {statContent}
                                                        </View>
                                                    )}
                                                </React.Fragment>
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
                                    {sessionUsername &&
                                    !isOwnProfile &&
                                    viewedUser?.canChat !== false ? (
                                        <ScalePressable
                                            accessibilityRole="button"
                                            disabled={isOpeningChat}
                                            onPress={openHarborChat}
                                            style={[
                                                styles.chatButton,
                                                {
                                                    backgroundColor:
                                                        theme.tonal.primary15,
                                                    borderColor:
                                                        theme.themeColorUltraLight,
                                                },
                                                isOpeningChat && { opacity: 0.72 },
                                            ]}>
                                            {isOpeningChat ? (
                                                <ActivityIndicator
                                                    color={theme.themeColor}
                                                    size="small"
                                                />
                                            ) : (
                                                <Ionicons
                                                    color={theme.themeColor}
                                                    name="chatbubble-outline"
                                                    size={scale(15)}
                                                />
                                            )}
                                            <Text
                                                style={[
                                                    styles.chatButtonText,
                                                    { color: theme.themeColor },
                                                ]}>
                                                {isOpeningChat
                                                    ? t('正在開啟…')
                                                    : t('開始 Chat')}
                                            </Text>
                                        </ScalePressable>
                                    ) : null}
                                </View>

                                {profileTags.length ? (
                                    <View style={styles.tags}>
                                        {profileTags.map(tag => (
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
                                                            color:
                                                                theme.accentForeground ||
                                                                theme.themeColor,
                                                        },
                                                    ]}>
                                                    {tag}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : null}

                                <View
                                    style={[
                                        styles.underlineTabs,
                                        {
                                            borderBottomColor:
                                                theme.featuresScreen?.divider ||
                                                theme.themeColorUltraLight,
                                        },
                                    ]}>
                                    {[
                                        { key: 'info', label: t('公開資料') },
                                        {
                                            key: 'badges',
                                            label: viewedUser?.badges?.length
                                                ? `${t('論壇成就')} (${viewedUser.badges.length})`
                                                : t('論壇成就'),
                                        },
                                    ].map((tab, index) => {
                                        const isActive = activeProfilePage === index;
                                        return (
                                            <ScalePressable
                                                accessibilityRole="tab"
                                                accessibilityState={{ selected: isActive }}
                                                key={tab.key}
                                                onPress={() => selectProfileTab(index)}
                                                style={styles.underlineTabButton}>
                                                <Text
                                                    style={[
                                                        styles.underlineTabText,
                                                        {
                                                            color: isActive
                                                                ? theme.themeColor
                                                                : theme.black.third,
                                                        },
                                                    ]}>
                                                    {tab.label}
                                                </Text>
                                                {isActive ? (
                                                    <View
                                                        style={[
                                                            styles.underlineTabIndicator,
                                                            {
                                                                backgroundColor:
                                                                    theme.themeColor,
                                                            },
                                                        ]}
                                                    />
                                                ) : null}
                                            </ScalePressable>
                                        );
                                    })}
                                </View>

                                <ProfileTabPager
                                    pagerRef={profilePagerRef}
                                    activePage={activeProfilePage}
                                    onPageSelected={handleProfilePageSelected}>
                                    <View
                                        key="info"
                                        style={[
                                            styles.list,
                                            theme.viewShadow,
                                            { backgroundColor: theme.white },
                                        ]}>
                                        {publicInfoItems.map((item, index) => {
                                            const iconToneColor =
                                                theme.featureIconTones?.[item.tone]
                                                    ?.foreground ||
                                                theme.themeColor;
                                            const content = (
                                                <>
                                                    <View style={styles.rowIconWrap}>
                                                        <PhosphorFeatureIcon
                                                            color={iconToneColor}
                                                            name={item.icon}
                                                            size={scale(20)}
                                                            weight="duotone"
                                                        />
                                                    </View>
                                                    <View style={styles.listText}>
                                                        <Text
                                                            style={[
                                                                styles.listLabel,
                                                                {
                                                                    color: theme.black
                                                                        .third,
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
                                                                        : theme.black
                                                                              .main,
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
                                                        <ScalePressable
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
                                                        </ScalePressable>
                                                    ) : (
                                                        <View style={styles.listRow}>
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
                                                                        theme.featuresScreen
                                                                            ?.divider ||
                                                                        theme.themeColorUltraLight,
                                                                },
                                                            ]}
                                                        />
                                                    ) : null}
                                                </React.Fragment>
                                            );
                                        })}
                                    </View>
                                    <View
                                        key="badges"
                                        style={[
                                            styles.list,
                                            theme.viewShadow,
                                            { backgroundColor: theme.white },
                                        ]}>
                                        {viewedUser?.badges?.length ? (
                                            viewedUser.badges.map(
                                                (badge, index) => (
                                                    <React.Fragment key={badge.id}>
                                                        <View style={styles.badgeRow}>
                                                            <HarborBadgeIcon
                                                                badge={badge}
                                                                compact
                                                            />
                                                            <View
                                                                style={styles.listText}>
                                                                <Text
                                                                    style={[
                                                                        styles.badgeName,
                                                                        {
                                                                            color: theme
                                                                                .black
                                                                                .main,
                                                                        },
                                                                    ]}>
                                                                    {badge.name}
                                                                </Text>
                                                                <Text
                                                                    style={[
                                                                        styles.badgeDescription,
                                                                        {
                                                                            color: theme
                                                                                .black
                                                                                .third,
                                                                        },
                                                                    ]}>
                                                                    {badge.description ||
                                                                        t(
                                                                            'Harbor 社群徽章',
                                                                        )}
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
                                                                            theme
                                                                                .featuresScreen
                                                                                ?.divider ||
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
                                                    : t(
                                                          '這位用戶的成就目前不可見。',
                                                      )}
                                            </Text>
                                        )}
                                    </View>
                                </ProfileTabPager>
                            </>
                        ) : (
                            <>
                                <View style={styles.editIdentityRow}>
                                    <View style={styles.editAvatarWrap}>
                                        <Image
                                            source={
                                                viewedUser?.avatarUrl
                                                    ? { uri: viewedUser.avatarUrl }
                                                    : AVATAR_SOURCE
                                            }
                                            style={styles.editAvatar}
                                            contentFit="cover"
                                        />
                                    </View>
                                    <View style={styles.editIdentityText}>
                                        <Text
                                            numberOfLines={1}
                                            style={[
                                                styles.editIdentityName,
                                                { color: theme.black.main },
                                            ]}>
                                            {viewedUser?.displayName || username}
                                        </Text>
                                        {profile.canEdit ? (
                                            <ScalePressable
                                                accessibilityLabel={t('更換頭像')}
                                                accessibilityRole="button"
                                                disabled={
                                                    isSaving ||
                                                    isUpdatingAvatar ||
                                                    isUpdatingUsername
                                                }
                                                onPress={handleAvatarPress}
                                                style={styles.editAvatarAction}>
                                                {isUpdatingAvatar ? (
                                                    <ActivityIndicator
                                                        color={theme.themeColor}
                                                        size="small"
                                                    />
                                                ) : (
                                                    <Text
                                                        style={[
                                                            styles.editAvatarActionText,
                                                            {
                                                                color: theme.themeColor,
                                                            },
                                                        ]}>
                                                        {t('更換頭像')}
                                                    </Text>
                                                )}
                                            </ScalePressable>
                                        ) : null}
                                    </View>
                                </View>

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
                                        theme.viewShadow,
                                        { backgroundColor: theme.white },
                                    ]}>
                                    <View style={styles.field}>
                                        <Text
                                            style={[
                                                styles.fieldLabel,
                                                { color: theme.black.third },
                                            ]}>
                                            {t('使用者名稱')}
                                        </Text>
                                        <View style={styles.usernameField}>
                                            <Text
                                                numberOfLines={1}
                                                style={[
                                                    styles.usernameFieldText,
                                                    { color: theme.black.main },
                                                ]}>
                                                @{username}
                                            </Text>
                                            {profile.canEditUsername ? (
                                                <ScalePressable
                                                    accessibilityLabel={t('修改使用者名稱')}
                                                    accessibilityRole="button"
                                                    disabled={
                                                        isSaving ||
                                                        isUpdatingAvatar ||
                                                        isUpdatingUsername
                                                    }
                                                    hitSlop={scale(6)}
                                                    onPress={() => {
                                                        trigger();
                                                        setIsUsernameEditorVisible(true);
                                                    }}
                                                    style={styles.usernameEditButton}>
                                                    <Ionicons
                                                        color={theme.themeColor}
                                                        name="pencil"
                                                        size={scale(16)}
                                                    />
                                                </ScalePressable>
                                            ) : null}
                                        </View>
                                        <Text
                                            style={[
                                                styles.fieldHint,
                                                { color: theme.black.third },
                                            ]}>
                                            {profile.canEditUsername
                                                ? t('目前可以修改；儲存前會檢查名稱是否可用。')
                                                : t('目前無法修改；是否可以更改由 Harbor 的站點時限與登入設定決定。')}
                                        </Text>
                                    </View>

                                    <View
                                        style={[
                                            styles.formDivider,
                                            {
                                                backgroundColor:
                                                    theme.featuresScreen?.divider ||
                                                    theme.themeColorUltraLight,
                                            },
                                        ]}
                                    />

                                    <View style={styles.field}>
                                        <Text
                                            style={[
                                                styles.fieldLabel,
                                                { color: theme.black.third },
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
                                                    style={styles.select}>
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
                                            <View style={styles.select}>
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

                                    <View
                                        style={[
                                            styles.formDivider,
                                            {
                                                backgroundColor:
                                                    theme.featuresScreen?.divider ||
                                                    theme.themeColorUltraLight,
                                            },
                                        ]}
                                    />

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

                                    <View
                                        style={[
                                            styles.formDivider,
                                            {
                                                backgroundColor:
                                                    theme.featuresScreen?.divider ||
                                                    theme.themeColorUltraLight,
                                            },
                                        ]}
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

                                    <View
                                        style={[
                                            styles.formDivider,
                                            {
                                                backgroundColor:
                                                    theme.featuresScreen?.divider ||
                                                    theme.themeColorUltraLight,
                                            },
                                        ]}
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
                            </>
                        )}
                    </>
                )}

                <ScalePressable
                    accessibilityRole="link"
                    disabled={isLoadingProfile || profileError}
                    onPress={
                        isEditing
                            ? openHarborProfileSettings
                            : openHarborProfile
                    }
                    style={[
                        styles.webButton,
                        { borderColor: theme.themeColorUltraLight },
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
                </ScalePressable>
            </KeyboardAwareScrollView>
            {isEditing ? <KeyboardToolbar /> : null}
            <HarborUsernameEditorModal
                currentUsername={username}
                isSubmitting={isUpdatingUsername}
                maxLength={maxUsernameLength}
                minLength={minUsernameLength}
                onClose={() => setIsUsernameEditorVisible(false)}
                onSubmit={handleUsernameSubmit}
                userId={viewedUser?.id}
                visible={isUsernameEditorVisible}
            />
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
    headerBackButton: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(17),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActionButton: {
        minHeight: verticalScale(30),
        borderRadius: scale(999),
        paddingHorizontal: scale(12),
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerActionText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '650',
    },
    container: {
        flex: 1,
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(36),
        gap: verticalScale(14),
    },
    profilePager: {
        marginHorizontal: scale(-14),
        marginVertical: -PROFILE_PAGER_SHADOW_SPACE,
    },
    profilePagerPageContent: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: scale(14),
        paddingVertical: PROFILE_PAGER_SHADOW_SPACE,
    },
    identityCard: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(15),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(2),
        overflow: 'visible',
    },
    avatarRing: {
        width: scale(76),
        height: scale(76),
        borderRadius: scale(38),
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'visible',
    },
    avatar: {
        width: scale(76),
        height: scale(76),
        borderRadius: scale(38),
    },
    umerBadge: {
        position: 'absolute',
        top: scale(-4),
        right: scale(-18),
        borderRadius: scale(6),
        paddingHorizontal: scale(7),
        paddingVertical: verticalScale(3),
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
        marginTop: verticalScale(10),
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
        fontSize: scale(11.5),
        marginTop: verticalScale(3),
    },
    inlineStatsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        marginTop: verticalScale(8),
    },
    inlineStatItem: {
        paddingVertical: verticalScale(2),
        paddingHorizontal: scale(2),
    },
    inlineStatText: {
        ...uiStyle.defaultText,
        fontSize: scale(11.5),
    },
    inlineStatValue: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '720',
    },
    inlineStatDot: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    chatButton: {
        minHeight: verticalScale(34),
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(999),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
        gap: scale(6),
        marginTop: verticalScale(10),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(7),
    },
    chatButtonText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '650',
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
    tags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'center',
        gap: scale(6),
        paddingHorizontal: scale(4),
    },
    tag: {
        minHeight: verticalScale(25),
        borderRadius: scale(8),
        justifyContent: 'center',
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(4),
    },
    tagText: {
        ...uiStyle.defaultText,
        fontSize: scale(10.5),
        fontWeight: '650',
    },
    underlineTabs: {
        flexDirection: 'row',
        borderBottomWidth: StyleSheet.hairlineWidth,
        marginHorizontal: scale(-14),
        paddingHorizontal: scale(14),
    },
    underlineTabButton: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: verticalScale(11),
        position: 'relative',
    },
    underlineTabText: {
        ...uiStyle.defaultText,
        fontSize: scale(12.5),
        fontWeight: '680',
    },
    underlineTabIndicator: {
        position: 'absolute',
        bottom: 0,
        width: '48%',
        height: verticalScale(2.5),
        borderRadius: scale(999),
    },
    list: {
        borderRadius: scale(16),
        overflow: 'hidden',
    },
    listRow: {
        minHeight: verticalScale(56),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
    },
    rowIconWrap: {
        width: scale(24),
        height: scale(24),
        alignItems: 'center',
        justifyContent: 'center',
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
    editIdentityRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
        paddingHorizontal: scale(4),
        paddingVertical: verticalScale(4),
    },
    editAvatarWrap: {
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
        overflow: 'hidden',
    },
    editAvatar: {
        width: scale(56),
        height: scale(56),
        borderRadius: scale(28),
    },
    editIdentityText: {
        flex: 1,
        minWidth: 0,
        gap: verticalScale(3),
    },
    editIdentityName: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '720',
    },
    editAvatarAction: {
        alignSelf: 'flex-start',
        paddingVertical: verticalScale(2),
    },
    editAvatarActionText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '620',
    },
    formCard: {
        borderRadius: scale(16),
        overflow: 'hidden',
    },
    formDivider: {
        height: StyleSheet.hairlineWidth,
        marginLeft: scale(14),
    },
    field: {
        gap: verticalScale(4),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(11),
    },
    fieldLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(10.5),
        fontWeight: '600',
    },
    input: {
        ...uiStyle.defaultText,
        minHeight: verticalScale(28),
        fontSize: scale(13),
        paddingHorizontal: 0,
        paddingVertical: verticalScale(2),
    },
    usernameField: {
        minHeight: verticalScale(28),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
        paddingVertical: verticalScale(2),
    },
    usernameFieldText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
        fontWeight: '500',
    },
    usernameEditButton: {
        width: scale(28),
        height: scale(28),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    multilineInput: {
        minHeight: verticalScale(72),
    },
    select: {
        minHeight: verticalScale(28),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: verticalScale(2),
    },
    selectText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(13),
        fontWeight: '500',
    },
    fieldHint: {
        ...uiStyle.defaultText,
        fontSize: scale(9.5),
        lineHeight: verticalScale(13),
        marginTop: verticalScale(2),
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
