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

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {MenuView} from '@react-native-menu/menu';
import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import {KeyboardAwareScrollView, KeyboardToolbar} from 'react-native-keyboard-controller';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {
    fetchHarborProfileMetadata,
    fetchHarborUserProfile,
    updateHarborProfile,
} from '../../../../utils/harbor/harborApi';
import {openLink} from '../../../../utils/browser';
import {ARK_HARBOR} from '../../../../utils/pathMap';
import {trigger} from '../../../../utils/trigger';

const AVATAR_SOURCE = require('../../../../static/img/logo_round.png');

const ProfileTextField = ({
    editable,
    label,
    multiline = false,
    onChangeText,
    placeholder,
    value,
    ...inputProps
}) => {
    const {theme} = useTheme();

    return (
        <View style={styles.field}>
            <Text style={[styles.fieldLabel, {color: theme.black.second}]}>
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

const HarborProfilePage = ({navigation, route}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const {user, refresh} = useHarborSession();
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

    React.useEffect(() => {
        navigation.setOptions({headerTitle: t('Harbor 個人資料')});
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
                    setMetadataError(!metadata.workStatusField);
                }
            })
            .catch(error => {
                if (isActive && error?.name !== 'CanceledError') {
                    setMetadataError(true);
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
            refresh().catch(() => {});
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
        isOwnProfile && profile.canEdit && hasChanges && !isSaving && username,
    );
    const workStatusActions = (workStatusField?.options || []).map(option => ({
        id: option,
        title: option,
        state: option === workStatus ? 'on' : 'off',
    }));

    const showOperationError = () => {
        Alert.alert(
            t('Harbor 操作失敗'),
            t('無法更新 Harbor 個人資料，請稍後再試。'),
            [{text: t('確定'), onPress: () => trigger()}],
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
                ...(profile.canChangeBio ? {bio} : {}),
                ...(profile.canChangeLocation ? {location} : {}),
                ...(profile.canChangeWebsite ? {website} : {}),
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
        <View style={[styles.container, {backgroundColor: theme.bg_color}]}>
            <KeyboardAwareScrollView
                bottomOffset={verticalScale(72)}
                contentInset={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }
                contentOffset={
                    isLiquidGlassSupported
                        ? {x: 0, y: -headerHeight}
                        : undefined
                }
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={styles.content}
                keyboardDismissMode="interactive"
                keyboardShouldPersistTaps="handled"
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }
                showsVerticalScrollIndicator={false}>
                {isLoadingProfile ? (
                    <View style={styles.loadingProfile}>
                        <ActivityIndicator color={theme.themeColor} />
                        <Text
                            style={[
                                styles.loadingText,
                                {color: theme.black.third},
                            ]}>
                            {t('正在載入個人資料…')}
                        </Text>
                    </View>
                ) : profileError ? (
                    <View
                        style={[
                            styles.notice,
                            {backgroundColor: theme.tonal.unread15},
                        ]}>
                        <Ionicons
                            name="information-circle-outline"
                            size={scale(18)}
                            color={theme.unread}
                        />
                        <Text
                            style={[
                                styles.noticeText,
                                {color: theme.black.second},
                            ]}>
                            {t('無法取得這個 Harbor 個人資料，請稍後再試。')}
                        </Text>
                    </View>
                ) : (
                    <>
                        <View
                            style={[
                                styles.identityCard,
                                {backgroundColor: theme.tonal.primary15},
                            ]}>
                            <View
                                style={[
                                    styles.avatarRing,
                                    {backgroundColor: theme.tonal.primary30},
                                ]}>
                                <Image
                                    source={
                                        viewedUser?.avatarUrl
                                            ? {uri: viewedUser.avatarUrl}
                                            : AVATAR_SOURCE
                                    }
                                    style={styles.avatar}
                                    contentFit="cover"
                                />
                            </View>
                            <View style={styles.nameRow}>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.identityName,
                                        {color: theme.black.main},
                                    ]}>
                                    {viewedUser?.displayName || username}
                                </Text>
                                {viewedUser?.isUMer ? (
                                    <View
                                        style={[
                                            styles.umerBadge,
                                            {
                                                backgroundColor:
                                                    theme.tonal.primary30,
                                            },
                                        ]}>
                                        <Ionicons
                                            name="school-outline"
                                            size={scale(12)}
                                            color={theme.themeColor}
                                        />
                                        <Text
                                            style={[
                                                styles.umerText,
                                                {color: theme.themeColor},
                                            ]}>
                                            UMer
                                        </Text>
                                    </View>
                                ) : null}
                            </View>
                            <Text
                                style={[
                                    styles.username,
                                    {color: theme.black.third},
                                ]}>
                                @{username}
                            </Text>
                            <Text
                                style={[
                                    styles.role,
                                    {color: theme.black.second},
                                ]}>
                                {profile.workStatus || viewedUser?.role}
                            </Text>
                        </View>

                        {isOwnProfile ? (
                            <View
                                style={[
                                    styles.modeControl,
                                    {backgroundColor: theme.tonal.primary08},
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
                            <View
                                style={[
                                    styles.profileCard,
                                    {backgroundColor: theme.white},
                                    theme.viewShadow,
                                ]}>
                                <Text
                                    style={[
                                        styles.bio,
                                        {color: theme.black.main},
                                    ]}>
                                    {profile.bio || t('這位用戶尚未填寫個人簡介。')}
                                </Text>
                                {profile.location ? (
                                    <View style={styles.detailRow}>
                                        <Ionicons
                                            name="location-outline"
                                            size={scale(17)}
                                            color={theme.black.third}
                                        />
                                        <Text
                                            style={[
                                                styles.detailText,
                                                {color: theme.black.second},
                                            ]}>
                                            {profile.location}
                                        </Text>
                                    </View>
                                ) : null}
                                {profile.website ? (
                                    <Pressable
                                        accessibilityRole="link"
                                        onPress={() => {
                                            trigger();
                                            openLink({
                                                URL: profile.website,
                                                mode: 'fullScreen',
                                            });
                                        }}
                                        style={styles.detailRow}>
                                        <Ionicons
                                            name="link-outline"
                                            size={scale(17)}
                                            color={theme.themeColor}
                                        />
                                        <Text
                                            numberOfLines={1}
                                            style={[
                                                styles.detailText,
                                                {color: theme.themeColor},
                                            ]}>
                                            {profile.website}
                                        </Text>
                                    </Pressable>
                                ) : null}
                            </View>
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
                                                {color: theme.black.second},
                                            ]}>
                                            {t('目前無法在 App 內編輯這個 Harbor 個人資料。')}
                                        </Text>
                                    </View>
                                ) : null}

                                <View
                                    style={[
                                        styles.formCard,
                                        {backgroundColor: theme.white},
                                        theme.viewShadow,
                                    ]}>
                                    <View style={styles.field}>
                                        <Text
                                            style={[
                                                styles.fieldLabel,
                                                {color: theme.black.second},
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
                                                    {color: theme.unread},
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
                                    style={({pressed}) => [
                                        styles.saveButton,
                                        {
                                            backgroundColor: canSave
                                                ? theme.themeColor
                                                : theme.disabled,
                                        },
                                        pressed && canSave && {opacity: 0.82},
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
                                            {color: theme.trueWhite},
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
                    style={({pressed}) => [
                        styles.webButton,
                        {borderColor: theme.themeColorUltraLight},
                        pressed && {backgroundColor: theme.tonal.primary08},
                    ]}>
                    <Ionicons
                        name="open-outline"
                        size={scale(17)}
                        color={theme.themeColor}
                    />
                    <Text
                        style={[
                            styles.webButtonText,
                            {color: theme.themeColor},
                        ]}>
                        {isEditing
                            ? t('在 Harbor Web 編輯更多資料')
                            : t('在 Harbor Web 查看個人資料')}
                    </Text>
                </Pressable>
            </KeyboardAwareScrollView>
            {isEditing ? <KeyboardToolbar /> : null}
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
        minHeight: verticalScale(210),
        borderRadius: scale(20),
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(15),
        paddingVertical: verticalScale(22),
    },
    avatarRing: {
        width: scale(94),
        height: scale(94),
        borderRadius: scale(47),
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: scale(84),
        height: scale(84),
        borderRadius: scale(42),
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
    umerBadge: {
        minHeight: verticalScale(22),
        borderRadius: scale(8),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(4),
        paddingHorizontal: scale(7),
    },
    umerText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        fontWeight: '700',
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
    profileCard: {
        borderRadius: scale(20),
        gap: verticalScale(14),
        paddingHorizontal: scale(17),
        paddingVertical: verticalScale(19),
    },
    bio: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: verticalScale(21),
    },
    detailRow: {
        minHeight: verticalScale(28),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(9),
    },
    detailText: {
        ...uiStyle.defaultText,
        flex: 1,
        fontSize: scale(11),
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
