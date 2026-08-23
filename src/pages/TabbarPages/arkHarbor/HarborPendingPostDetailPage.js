import React, {
    useContext,
    useEffect,
    useMemo,
} from 'react';
import {
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {HeaderHeightContext} from '@react-navigation/elements';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';

const HarborPendingPostDetailPage = ({navigation, route}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const headerHeight = useContext(HeaderHeightContext) || 0;
    const pendingPost = route.params?.pendingPost;
    const createdAt = useMemo(
        () => new Date(pendingPost?.createdAt),
        [pendingPost?.createdAt],
    );
    const timeLabel = Number.isNaN(createdAt.getTime())
        ? ''
        : createdAt.toLocaleString();

    useEffect(() => {
        navigation.setOptions({headerTitle: t('待審內容詳情')});
    }, [navigation, t]);

    return (
        <ScrollView
            contentContainerStyle={[
                styles.content,
                {
                    paddingTop: isLiquidGlassSupported
                        ? headerHeight + verticalScale(12)
                        : verticalScale(12),
                },
            ]}
            contentInsetAdjustmentBehavior={
                isLiquidGlassSupported ? 'never' : 'automatic'
            }
            style={{backgroundColor: theme.bg_color}}>
            <View
                style={[
                    styles.statusCard,
                    {backgroundColor: theme.tonal.secondary15},
                ]}>
                <MaterialCommunityIcons
                    name="clock-outline"
                    size={scale(20)}
                    color={theme.secondThemeColor}
                />
                <View style={styles.statusContent}>
                    <Text
                        style={[
                            styles.statusTitle,
                            {color: theme.secondThemeColor},
                        ]}>
                        {t('審核中')}
                    </Text>
                    {timeLabel ? (
                        <Text
                            style={[
                                styles.statusTime,
                                {color: theme.black.third},
                            ]}>
                            {t('提交時間：{{time}}', {time: timeLabel})}
                        </Text>
                    ) : null}
                </View>
            </View>

            <View
                style={[
                    styles.contentCard,
                    {
                        backgroundColor: theme.white,
                        borderColor: theme.themeColorUltraLight,
                    },
                ]}>
                <Text
                    style={[
                        styles.topicTitle,
                        {color: theme.black.main},
                    ]}>
                    {pendingPost?.title || t('待審回覆')}
                </Text>
                <View
                    style={[
                        styles.divider,
                        {backgroundColor: theme.disabled},
                    ]}
                />
                <Text
                    selectable
                    style={[
                        styles.rawContent,
                        {color: theme.black.second},
                    ]}>
                    {pendingPost?.raw || t('只有圖片內容')}
                </Text>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    content: {
        gap: verticalScale(12),
        paddingBottom: verticalScale(40),
        paddingHorizontal: scale(14),
    },
    contentCard: {
        borderRadius: scale(16),
        borderWidth: StyleSheet.hairlineWidth,
        padding: scale(16),
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        marginVertical: verticalScale(14),
    },
    rawContent: {
        ...uiStyle.defaultText,
        fontSize: scale(14),
        lineHeight: scale(22),
    },
    statusCard: {
        alignItems: 'center',
        borderRadius: scale(12),
        flexDirection: 'row',
        gap: scale(10),
        paddingHorizontal: scale(13),
        paddingVertical: verticalScale(11),
    },
    statusContent: {
        flex: 1,
        gap: verticalScale(2),
    },
    statusTime: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
    },
    statusTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        fontWeight: '700',
    },
    topicTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
        lineHeight: scale(25),
    },
});

export default HarborPendingPostDetailPage;
