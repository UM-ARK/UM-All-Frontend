import React from 'react';
import {
    Alert,
    Animated,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { trigger } from '../../../utils/trigger';
import HarborDashboard from './components/HarborDashboard';
import HarborGuestState from './components/HarborGuestState';
import HarborPageHeader from './components/HarborPageHeader';
import HarborRestoringState from './components/HarborRestoringState';

const MyScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation(['common', 'my']);
    const { status, user, login, error, refresh } = useHarborSession();
    const insets = useSafeAreaInsets();
    const { width } = useWindowDimensions();
    const contentWidth = Math.min(width - scale(20), scale(680));
    const signedInWidth = Math.min(width, scale(700));
    const contentTopInset = insets.top + verticalScale(8);
    const signedInTopInset = insets.top + verticalScale(2);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const dashboardScrollY = React.useRef(new Animated.Value(0)).current;

    const presentHarborError = React.useCallback(
        sessionError => {
            if (!sessionError) {
                return;
            }

            const message =
                sessionError.code === 'HARBOR_SESSION_EXPIRED'
                    ? t('Harbor 登入已失效，請重新登入。', { ns: 'my' })
                    : t('無法完成 Harbor 操作，請稍後再試。', { ns: 'my' });
            Alert.alert(
                t('Harbor 操作失敗', { ns: 'my' }),
                message,
                [
                    {
                        text: t('確定', { ns: 'my' }),
                        onPress: () => trigger(),
                    },
                ],
                { cancelable: false },
            );
        },
        [t],
    );

    const handleLogin = async () => {
        try {
            await login({
                routeName: 'Tabbar',
                params: { screen: 'MyTabbar' },
            });
        } catch (sessionError) {
            presentHarborError(sessionError);
        }
    };

    const handleBrowseForum = () => {
        navigation.navigate('ForumTabbar');
    };

    const handleRefresh = async () => {
        trigger();
        setIsRefreshing(true);
        try {
            await refresh();
        } catch (sessionError) {
            presentHarborError(sessionError);
        } finally {
            setIsRefreshing(false);
        }
    };

    const harborError = error ? (
        <View
            style={[
                styles.harborError,
                {
                    backgroundColor: theme.tonal.unread15,
                    borderColor: theme.tonal.unread30,
                },
            ]}>
            <Text
                style={[
                    styles.harborErrorText,
                    { color: theme.black.second },
                ]}>
                {error.code === 'HARBOR_SESSION_EXPIRED'
                    ? t('Harbor 登入已失效，請重新登入。', {
                        ns: 'my',
                    })
                    : t(
                        '無法完成 Harbor 操作，請稍後再試。',
                        { ns: 'my' },
                    )}
            </Text>
        </View>
    ) : null;

    if (status === 'signedIn' && user) {
        return (
            <View
                style={[
                    styles.container,
                    styles.signedInContainer,
                    { backgroundColor: theme.bg_color },
                ]}>
                <View
                    style={[
                        styles.signedInContent,
                        {
                            width: signedInWidth,
                            paddingTop: signedInTopInset,
                        },
                    ]}>
                    <View style={styles.signedInHeaderContent}>
                        <HarborPageHeader
                            compact
                            user={user}
                            scrollY={dashboardScrollY}
                            onSettingsPress={() =>
                                navigation.navigate('SettingPage')
                            }
                        />
                        {harborError}
                    </View>
                    <HarborDashboard
                        user={user}
                        navigation={navigation}
                        contentBottomInset={
                            insets.bottom + verticalScale(92)
                        }
                        isRefreshing={isRefreshing}
                        onProfileRefresh={handleRefresh}
                        scrollY={dashboardScrollY}
                    />
                </View>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: theme.bg_color }]}>
            <ScrollView
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: contentTopInset,
                        paddingBottom: insets.bottom + verticalScale(92),
                    },
                ]}
                refreshControl={
                    status === 'signedIn' ? (
                        <RefreshControl
                            refreshing={isRefreshing}
                            tintColor={theme.themeColor}
                            colors={[theme.themeColor]}
                            progressViewOffset={contentTopInset}
                            onRefresh={handleRefresh}
                        />
                    ) : undefined
                }>
                <View style={{ width: contentWidth }}>
                    <HarborPageHeader
                        onSettingsPress={() =>
                            navigation.navigate('SettingPage')
                        }
                    />
                    {harborError}
                    {status === 'restoring' ? (
                        <HarborRestoringState />
                    ) : (
                        <HarborGuestState
                            isAuthorizing={status === 'authorizing'}
                            onLogin={handleLogin}
                            onBrowse={handleBrowseForum}
                        />
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    signedInContainer: {
        alignItems: 'center',
    },
    signedInContent: {
        flex: 1,
        minHeight: 0,
    },
    signedInHeaderContent: {
        paddingHorizontal: scale(10),
        position: 'relative',
        zIndex: 2,
    },
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: scale(10),
    },
    harborError: {
        borderWidth: StyleSheet.hairlineWidth,
        borderRadius: scale(10),
        marginBottom: verticalScale(10),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(10),
    },
    harborErrorText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
    },
});

export default MyScreen;
