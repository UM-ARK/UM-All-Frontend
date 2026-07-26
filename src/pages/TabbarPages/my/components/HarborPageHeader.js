import React from 'react';
import {StyleSheet, Text, View} from 'react-native';

import {MenuView} from '@expo/ui/community/menu';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {trigger} from '../../../../utils/trigger';

const HarborPageHeader = ({onFeedbackAction, onSettingsPress}) => {
    const {theme} = useTheme();
    const {t} = useTranslation(['common', 'my']);
    const feedbackActions = [
        {
            id: 'harbor',
            title: 'Harbor ⭐️',
            image: 'star.fill',
            imageColor: theme.themeColor,
            titleColor: theme.themeColor,
        },
        {
            id: 'email',
            title: 'Email',
            image: 'envelope',
            imageColor: theme.themeColor,
            titleColor: theme.themeColor,
        },
    ];

    return (
        <View style={styles.container}>
            <View>
                <Text style={[styles.eyebrow, {color: theme.themeColor}]}>
                    ARK ALL · HARBOR
                </Text>
                <Text style={[styles.title, {color: theme.black.main}]}>
                    {t('個人中心', {ns: 'my'})}
                </Text>
            </View>
            <View style={styles.actions}>
                <MenuView
                    actions={feedbackActions}
                    onOpenMenu={() => trigger()}
                    onPressAction={onFeedbackAction}
                    shouldOpenOnLongPress={false}
                    style={styles.button}>
                    <TouchableScale
                        accessibilityRole="button"
                        accessibilityLabel={t('反饋')}
                        style={[
                            styles.button,
                            {backgroundColor: theme.tonal.primary15},
                        ]}>
                        <Ionicons
                            name="chatbubble-ellipses-outline"
                            size={verticalScale(18)}
                            color={theme.themeColor}
                        />
                    </TouchableScale>
                </MenuView>
                <TouchableScale
                    accessibilityRole="button"
                    accessibilityLabel={t('設置')}
                    style={[
                        styles.button,
                        {backgroundColor: theme.tonal.primary15},
                    ]}
                    onPress={() => {
                        trigger();
                        onSettingsPress();
                    }}>
                    <Ionicons
                        name="settings-outline"
                        size={verticalScale(18)}
                        color={theme.themeColor}
                    />
                </TouchableScale>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        minHeight: verticalScale(54),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: verticalScale(16),
    },
    eyebrow: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '750',
        letterSpacing: scale(1.25),
        marginBottom: verticalScale(2),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(27),
        fontWeight: '760',
        letterSpacing: scale(-0.5),
    },
    actions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
    },
    button: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(10),
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HarborPageHeader;
