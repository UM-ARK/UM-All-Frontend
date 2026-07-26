import React from 'react';
import {
    Alert,
    Linking,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
    useWindowDimensions,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { openLink } from '../../../utils/browser';
import { ARK_HARBOR_FEEDBACK, MAIL } from '../../../utils/pathMap';
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
    const contentWidth = Math.min(width - scale(28), scale(680));
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const lastPresentedError = React.useRef(null);

    const presentHarborError = React.useCallback(
        sessionError => {
            if (!sessionError || lastPresentedError.current === sessionError) {
                return;
            }

            lastPresentedError.current = sessionError;
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

    React.useEffect(() => {
        if (error) {
            presentHarborError(error);
        } else {
            lastPresentedError.current = null;
        }
    }, [error, presentHarborError]);

    const handleFeedbackAction = event => {
        trigger();
        switch (event.nativeEvent.event) {
            case 'harbor':
                openLink(ARK_HARBOR_FEEDBACK);
                break;
            case 'email':
                Clipboard.setString(MAIL);
                Toast.show(t('已複製Mail到剪貼板！'));
                Linking.openURL(`mailto:${MAIL}?subject=ARK功能反饋`);
                break;
            default:
                break;
        }
    };

    const handleLogin = async () => {
        lastPresentedError.current = null;
        try {
            await login();
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
        lastPresentedError.current = null;
        try {
            await refresh();
        } catch (sessionError) {
            presentHarborError(sessionError);
        } finally {
            setIsRefreshing(false);
        }
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.bg_color }]}>
            <ScrollView
                contentInsetAdjustmentBehavior="never"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: insets.top + verticalScale(8),
                        paddingBottom: insets.bottom + verticalScale(92),
                    },
                ]}
                refreshControl={
                    status === 'signedIn' ? (
                        <RefreshControl
                            refreshing={isRefreshing}
                            tintColor={theme.themeColor}
                            colors={[theme.themeColor]}
                            onRefresh={handleRefresh}
                        />
                    ) : undefined
                }>
                <View style={{ width: contentWidth }}>
                    <HarborPageHeader
                        onFeedbackAction={handleFeedbackAction}
                        onSettingsPress={() =>
                            navigation.navigate('SettingPage')
                        }
                    />
                    {status === 'restoring' ? (
                        <HarborRestoringState />
                    ) : status === 'signedIn' && user ? (
                        <HarborDashboard user={user} navigation={navigation} />
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
    scrollContent: {
        alignItems: 'center',
        paddingHorizontal: scale(14),
    },
});

export default MyScreen;
