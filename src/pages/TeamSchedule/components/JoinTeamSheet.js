/**
 * 加入隊伍 Sheet：貼上／輸入邀請連結後導向詳情頁加入流程
 */
import React, {memo, useEffect, useRef, useState} from 'react';
import {
    Alert,
    StyleSheet,
    View,
} from 'react-native';

import * as Clipboard from 'expo-clipboard';
import {useTranslation} from 'react-i18next';
import ActionSheet from 'react-native-actions-sheet';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {KeyboardAwareScrollView} from 'react-native-keyboard-controller';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import TextInput from '../../../components/AppTextInput';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import PhosphorFeatureIcon from '../../TabbarPages/info/home/search/components/PhosphorFeatureIcon';
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
                    const clip = (await Clipboard.getStringAsync()) || '';
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
            const clip = (await Clipboard.getStringAsync()) || '';
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
                    <View style={styles.titleRow}>
                        <PhosphorFeatureIcon
                            name="user-plus"
                            size={scale(22)}
                            color={theme.themeColor}
                        />
                        <Text style={[styles.title, {color: theme.black.main}]}>
                            {t('加入隊伍')}
                        </Text>
                    </View>
                    <Text style={[styles.hint, {color: theme.black.third}]}>
                        {t(
                            '貼上朋友分享的邀請連結，即可加入組隊約時間。',
                        )}
                    </Text>

                    <View
                        style={[
                            styles.inputBox,
                            {
                                backgroundColor: theme.white,
                                borderColor: theme.disabled,
                            },
                        ]}>
                        <View style={styles.inputIcon}>
                            <PhosphorFeatureIcon
                                name="link"
                                size={scale(18)}
                                color={theme.black.third}
                            />
                        </View>
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
                                {color: theme.black.main},
                            ]}
                        />
                    </View>

                    <ScalePressable
                        accessibilityRole="button"
                        onPress={handlePaste}
                        style={[
                            styles.secondary,
                            {
                                backgroundColor: theme.white,
                                borderColor: theme.disabled,
                            },
                        ]}>
                        <PhosphorFeatureIcon
                            name="clipboard-check"
                            size={scale(18)}
                            color={theme.themeColor}
                        />
                        <Text
                            style={[
                                styles.actionText,
                                {color: theme.accentForeground},
                            ]}>
                            {t('從剪貼板貼上')}
                        </Text>
                    </ScalePressable>

                    <ScalePressable
                        accessibilityRole="button"
                        onPress={handleJoin}
                        style={[
                            styles.primary,
                            {
                                backgroundColor: theme.tonal.primary15,
                            },
                        ]}>
                        <PhosphorFeatureIcon
                            name="sign-in"
                            size={scale(18)}
                            color={theme.themeColor}
                        />
                        <Text
                            style={[
                                styles.actionText,
                                {color: theme.accentForeground},
                            ]}>
                            {t('加入')}
                        </Text>
                    </ScalePressable>

                    <ScalePressable
                        accessibilityRole="button"
                        onPress={() => {
                            trigger();
                            sheetRef.current?.hide();
                        }}
                        style={styles.cancel}>
                        <Text
                            style={[
                                styles.cancelText,
                                {color: theme.black.third},
                            ]}>
                            {t('取消')}
                        </Text>
                    </ScalePressable>
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
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(8),
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
    inputBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        minHeight: verticalScale(88),
        borderRadius: scale(12),
        borderCurve: 'continuous',
        borderWidth: StyleSheet.hairlineWidth,
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
        gap: scale(8),
    },
    inputIcon: {
        paddingTop: verticalScale(2),
    },
    input: {
        ...uiStyle.defaultText,
        flex: 1,
        minHeight: verticalScale(68),
        fontSize: scale(13),
        padding: 0,
        textAlignVertical: 'top',
    },
    primary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(12),
        borderCurve: 'continuous',
        marginTop: verticalScale(8),
        paddingVertical: verticalScale(12),
        gap: scale(6),
    },
    secondary: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: scale(12),
        borderCurve: 'continuous',
        borderWidth: StyleSheet.hairlineWidth,
        marginTop: verticalScale(10),
        paddingVertical: verticalScale(12),
        gap: scale(6),
    },
    cancel: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 44,
        marginTop: verticalScale(6),
        paddingVertical: verticalScale(10),
    },
    cancelText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '600',
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
});

export default memo(JoinTeamSheet);
