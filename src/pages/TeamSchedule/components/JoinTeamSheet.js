/**
 * 加入隊伍 Sheet：貼上／輸入邀請連結後導向詳情頁加入流程
 */
import React, {memo, useEffect, useRef, useState} from 'react';
import {
    Alert,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';

import Clipboard from '@react-native-clipboard/clipboard';
import {useTranslation} from 'react-i18next';
import ActionSheet from 'react-native-actions-sheet';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';

import Text from '../../../components/AppText';
import TextInput from '../../../components/AppTextInput';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {parseTeamInviteLink} from '../../../utils/scheduling/teamInviteLink';
import {trigger} from '../../../utils/trigger';

/**
 * @param {object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onClose
 * @param {(params: {eventId: string, invite: string}) => void} props.onSubmit
 */
const JoinTeamSheet = ({visible, onClose, onSubmit}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);
    const [linkText, setLinkText] = useState('');

    useEffect(() => {
        if (visible) {
            sheetRef.current?.show();
            // 開啟時嘗試帶入剪貼板中的邀請連結
            (async () => {
                try {
                    const clip = (await Clipboard.getString()) || '';
                    const parsed = parseTeamInviteLink(clip);
                    if (parsed) {
                        setLinkText(clip.trim());
                    }
                } catch (_error) {
                    // 忽略剪貼板讀取失敗
                }
            })();
        } else {
            sheetRef.current?.hide();
            setLinkText('');
        }
    }, [visible]);

    const handlePaste = async () => {
        trigger();
        try {
            const clip = (await Clipboard.getString()) || '';
            if (!clip.trim()) {
                Alert.alert(t('加入隊伍'), t('剪貼板是空的。'));
                return;
            }
            setLinkText(clip.trim());
        } catch (_error) {
            Alert.alert(
                t('加入隊伍'),
                t('暫時無法讀取剪貼板，請手動貼上。'),
            );
        }
    };

    const handleJoin = () => {
        trigger();
        const parsed = parseTeamInviteLink(linkText);
        if (!parsed) {
            Alert.alert(
                t('無法加入'),
                t('請貼上有效的組隊邀請連結。'),
            );
            return;
        }
        onSubmit?.({
            eventId: parsed.eventId,
            invite: parsed.invite,
        });
        sheetRef.current?.hide();
    };

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            keyboardHandlerEnabled
            containerStyle={{
                backgroundColor: theme.bg_color,
                borderTopLeftRadius: scale(16),
                borderTopRightRadius: scale(16),
            }}
            onClose={() => onClose?.()}>
            <KeyboardAwareScrollView
                bottomOffset={verticalScale(24)}
                keyboardDismissMode="on-drag"
                bounces={false}>
                <View
                    style={[
                        styles.sheet,
                        {
                            paddingBottom:
                                verticalScale(24) +
                                Math.max(insets.bottom, verticalScale(8)),
                        },
                    ]}>
                    <Text style={[styles.title, {color: theme.black.main}]}>
                        {t('加入隊伍')}
                    </Text>
                    <Text style={[styles.hint, {color: theme.black.third}]}>
                        {t(
                            '貼上朋友分享的邀請連結，即可加入組隊約時間。',
                        )}
                    </Text>

                    <TextInput
                        value={linkText}
                        onChangeText={setLinkText}
                        placeholder={t('貼上邀請連結')}
                        placeholderTextColor={theme.black.third}
                        autoCapitalize="none"
                        autoCorrect={false}
                        multiline
                        style={[
                            styles.input,
                            {
                                backgroundColor: theme.tonal.primary08,
                                borderColor: theme.themeColorUltraLight,
                                color: theme.black.main,
                            },
                        ]}
                    />

                    <Pressable
                        accessibilityRole="button"
                        onPress={handlePaste}
                        style={({pressed}) => [
                            styles.secondary,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.actionText,
                                {color: theme.themeColor},
                            ]}>
                            {t('從剪貼板貼上')}
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        onPress={handleJoin}
                        style={({pressed}) => [
                            styles.primary,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary50
                                    : theme.themeColor,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.actionText,
                                {color: theme.trueWhite},
                            ]}>
                            {t('加入')}
                        </Text>
                    </Pressable>

                    <Pressable
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            sheetRef.current?.hide();
                        }}
                        style={({pressed}) => [
                            styles.cancel,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary15
                                    : theme.white,
                                borderColor: theme.themeColorUltraLight,
                            },
                        ]}>
                        <Text
                            style={[
                                styles.actionText,
                                {color: theme.black.second},
                            ]}>
                            {t('取消')}
                        </Text>
                    </Pressable>
                </View>
            </KeyboardAwareScrollView>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    sheet: {
        paddingHorizontal: scale(16),
        paddingTop: verticalScale(12),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(16),
        fontWeight: '700',
    },
    hint: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginTop: verticalScale(6),
        marginBottom: verticalScale(12),
    },
    input: {
        ...uiStyle.defaultText,
        minHeight: verticalScale(88),
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        fontSize: scale(13),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
        textAlignVertical: 'top',
    },
    primary: {
        alignItems: 'center',
        borderRadius: scale(12),
        marginTop: verticalScale(8),
        paddingVertical: verticalScale(12),
    },
    secondary: {
        alignItems: 'center',
        borderRadius: scale(12),
        marginTop: verticalScale(10),
        paddingVertical: verticalScale(12),
    },
    cancel: {
        alignItems: 'center',
        borderRadius: scale(12),
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: verticalScale(8),
        paddingVertical: verticalScale(12),
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
});

export default memo(JoinTeamSheet);
