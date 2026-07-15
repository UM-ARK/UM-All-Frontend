import React from 'react';
import { Linking, StyleSheet, View } from 'react-native';

import { useTheme } from '../../../components/ThemeContext';
import TouchableScale from '../../../components/TouchableScale';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import { ARK_HARBOR_FEEDBACK, MAIL } from '../../../utils/pathMap';

import Clipboard from '@react-native-clipboard/clipboard';
import { MenuView } from '@expo/ui/community/menu';
import { useTranslation } from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import Toast from 'react-native-simple-toast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MyScreen = ({ navigation }) => {
    const { theme } = useTheme();
    const { black, bg_color, themeColor } = theme;
    const { t } = useTranslation(['common']);
    const insets = useSafeAreaInsets();

    const feedbackActions = [
        {
            id: 'harbor',
            title: 'Harbor ⭐️',
            image: 'star.fill',
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: 'email',
            title: 'Email',
            image: 'envelope',
            imageColor: themeColor,
            titleColor: themeColor,
        },
    ];

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

    const handleSettingsPress = () => {
        trigger();
        navigation.navigate('SettingPage');
    };

    return (
        <View style={[styles.container, { backgroundColor: bg_color, paddingTop: insets.top },]}>
            <View style={styles.headerActions}>
                <MenuView
                    actions={feedbackActions}
                    onOpenMenu={() => trigger()}
                    onPressAction={handleFeedbackAction}
                    shouldOpenOnLongPress={false}
                    style={styles.headerActionButton}>
                    <TouchableScale
                        accessibilityLabel={t('反饋')}
                        style={styles.headerActionButton}>
                        <MaterialIcons
                            name="feedback"
                            size={verticalScale(24)}
                            color={black.third}
                        />
                    </TouchableScale>
                </MenuView>

                <TouchableScale
                    accessibilityLabel={t('設置')}
                    style={styles.headerActionButton}
                    onPress={handleSettingsPress}>
                    <Ionicons
                        name="settings-outline"
                        size={verticalScale(25)}
                        color={black.third}
                    />
                </TouchableScale>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(4),
    },
    headerActionButton: {
        width: scale(44),
        height: scale(44),
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(22),
    },
});

export default MyScreen;
