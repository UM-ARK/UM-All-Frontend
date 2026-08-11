/**
 * 組隊約時間功能介紹 Sheet：向首次使用者說明約時間、共享課表與使用情境
 */
import React, {memo, useEffect, useRef} from 'react';
import {Pressable, StyleSheet, View} from 'react-native';

import {useTranslation} from 'react-i18next';
import Ionicons from '@react-native-vector-icons/ionicons';
import ActionSheet from 'react-native-actions-sheet';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';

import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {trigger} from '../../../utils/trigger';

const TeamScheduleIntroSheet = ({visible, onClose}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('my');
    const insets = useSafeAreaInsets();
    const sheetRef = useRef(null);

    useEffect(() => {
        if (visible) {
            sheetRef.current?.show();
        } else {
            sheetRef.current?.hide();
        }
    }, [visible]);

    return (
        <ActionSheet
            ref={sheetRef}
            gestureEnabled
            containerStyle={{
                backgroundColor: theme.bg_color,
                borderTopLeftRadius: scale(16),
                borderTopRightRadius: scale(16),
            }}
            onClose={() => onClose?.()}>
            <View
                style={[
                    styles.sheet,
                    {
                        paddingBottom:
                            verticalScale(16) +
                            Math.max(insets.bottom, verticalScale(8)),
                    },
                ]}>
                <Text style={[styles.title, {color: theme.black.main}]}>
                    {t('組隊約時間是甚麼？')}
                </Text>
                <Text style={[styles.summary, {color: theme.black.third}]}>
                    {t('把大家有空的時間放在一起，不用在群組裡逐個問。')}
                </Text>

                <View style={styles.section}>
                    <Ionicons
                        name="time-outline"
                        size={scale(20)}
                        color={theme.themeColor}
                    />
                    <View style={styles.sectionContent}>
                        <Text
                            style={[
                                styles.sectionTitle,
                                {color: theme.black.main},
                            ]}>
                            {t('一起約時間')}
                        </Text>
                        <Text
                            style={[
                                styles.sectionText,
                                {color: theme.black.second},
                            ]}>
                            {t(
                                '建立組隊後，先選幾個候選時段，再邀請隊友填上自己有空的時間。大家填完後，就能看到最多人都可以的時間。',
                            )}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Ionicons
                        name="calendar-outline"
                        size={scale(20)}
                        color={theme.themeColor}
                    />
                    <View style={styles.sectionContent}>
                        <Text
                            style={[
                                styles.sectionTitle,
                                {color: theme.black.main},
                            ]}>
                            {t('共享課表')}
                        </Text>
                        <Text
                            style={[
                                styles.sectionText,
                                {color: theme.black.second},
                            ]}>
                            {t(
                                '你也可以選擇共享課表，讓組員直接看見你的上課時間，找空檔會更快。課表只會分享給這個組隊的成員，也可以隨時停止共享。',
                            )}
                        </Text>
                    </View>
                </View>

                <View
                    style={[
                        styles.example,
                        {backgroundColor: theme.tonal.primary08},
                    ]}>
                    <Text
                        style={[
                            styles.exampleTitle,
                            {color: theme.themeColor},
                        ]}>
                        {t('例如')}
                    </Text>
                    <Text
                        style={[
                            styles.exampleText,
                            {color: theme.black.second},
                        ]}>
                        {t(
                            '小組要約時間做報告。你建立「CPED1000 小組」並分享邀請連結；大家填好時間或共享課表後，就能一起找出星期三下午都有空。',
                        )}
                    </Text>
                </View>

                <Pressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        sheetRef.current?.hide();
                    }}
                    style={({pressed}) => [
                        styles.action,
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
                        {t('知道了')}
                    </Text>
                </Pressable>
            </View>
        </ActionSheet>
    );
};

const styles = StyleSheet.create({
    sheet: {
        paddingHorizontal: scale(18),
        paddingTop: verticalScale(12),
    },
    title: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
    },
    summary: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginTop: verticalScale(6),
    },
    section: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginTop: verticalScale(16),
    },
    sectionContent: {
        flex: 1,
        marginLeft: scale(10),
    },
    sectionTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        fontWeight: '700',
    },
    sectionText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginTop: verticalScale(3),
    },
    example: {
        borderRadius: scale(8),
        marginTop: verticalScale(16),
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(10),
    },
    exampleTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '700',
    },
    exampleText: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        lineHeight: verticalScale(18),
        marginTop: verticalScale(3),
    },
    action: {
        alignItems: 'center',
        borderRadius: scale(10),
        marginTop: verticalScale(16),
        paddingVertical: verticalScale(11),
    },
    actionText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
});

export default memo(TeamScheduleIntroSheet);
