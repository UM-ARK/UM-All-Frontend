import React from 'react';
import {
    ActivityIndicator,
    Alert,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {useHeaderHeight} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {Image} from 'expo-image';
import {useTranslation} from 'react-i18next';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {scale, verticalScale} from 'react-native-size-matters';

import {uiStyle, useTheme} from '../../../../components/ThemeContext';
import {useHarborSession} from '../../../../contexts/HarborSessionContext';
import {fetchHarborBadges} from '../../../../utils/harbor/harborApi';
import {trigger} from '../../../../utils/trigger';
import HarborEmptyState from '../components/HarborEmptyState';

const ListSeparator = () => <View style={styles.separator} />;

const HarborBadgesPage = ({navigation}) => {
    const {theme} = useTheme();
    const {t, i18n} = useTranslation('my');
    const {user} = useHarborSession();
    const headerHeight = useHeaderHeight();
    const username = user?.username || '';
    const [badges, setBadges] = React.useState(user?.badges || []);
    const [isLoading, setIsLoading] = React.useState(!user?.badges?.length);
    const [isRefreshing, setIsRefreshing] = React.useState(false);
    const controllerRef = React.useRef(null);

    React.useEffect(() => {
        navigation.setOptions({headerTitle: t('社群成就')});
    }, [navigation, t]);

    const loadBadges = React.useCallback(
        async ({refresh = false} = {}) => {
            controllerRef.current?.abort();
            const controller = new AbortController();
            controllerRef.current = controller;
            if (refresh) {
                setIsRefreshing(true);
            } else {
                setIsLoading(true);
            }

            try {
                const nextBadges = await fetchHarborBadges(username, {
                    signal: controller.signal,
                });
                if (!controller.signal.aborted) {
                    setBadges(nextBadges);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    Alert.alert(
                        t('徽章載入失敗'),
                        t('無法取得 Harbor 徽章，請檢查網絡後再試。'),
                        [{text: t('確定'), onPress: () => trigger()}],
                    );
                }
            } finally {
                if (!controller.signal.aborted) {
                    setIsLoading(false);
                    setIsRefreshing(false);
                    controllerRef.current = null;
                }
            }
        },
        [t, username],
    );

    React.useEffect(() => {
        if (!username) {
            navigation.goBack();
            return undefined;
        }
        loadBadges();
        return () => controllerRef.current?.abort();
    }, [loadBadges, navigation, username]);

    if (isLoading) {
        return (
            <View style={[styles.loading, {backgroundColor: theme.bg_color}]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
            </View>
        );
    }

    return (
        <View style={[styles.container, {backgroundColor: theme.bg_color}]}>
            <FlashList
                data={badges}
                keyExtractor={item => item.id}
                scrollIndicatorInsets={
                    isLiquidGlassSupported ? {top: headerHeight} : undefined
                }
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                contentContainerStyle={[
                    styles.content,
                    isLiquidGlassSupported && {
                        paddingTop: headerHeight + verticalScale(12),
                    },
                ]}
                showsVerticalScrollIndicator={false}
                renderItem={({item}) => (
                    <View
                        style={[
                            styles.badgeCard,
                            {backgroundColor: theme.white},
                            theme.viewShadow,
                        ]}>
                        <View
                            style={[
                                styles.badgeIcon,
                                {
                                    backgroundColor:
                                        item.badgeTypeId === 1
                                            ? theme.tonal.secondary30
                                            : theme.tonal.primary15,
                                },
                            ]}>
                            {item.imageUrl ? (
                                <Image
                                    source={{uri: item.imageUrl}}
                                    style={styles.badgeImage}
                                    contentFit="contain"
                                />
                            ) : (
                                <MaterialCommunityIcons
                                    name="medal-outline"
                                    size={scale(27)}
                                    color={
                                        item.badgeTypeId === 1
                                            ? theme.secondThemeColor
                                            : theme.themeColor
                                    }
                                />
                            )}
                        </View>
                        <View style={styles.badgeContent}>
                            <View style={styles.badgeTitleRow}>
                                <Text
                                    numberOfLines={1}
                                    style={[
                                        styles.badgeName,
                                        {color: theme.black.main},
                                    ]}>
                                    {item.name}
                                </Text>
                                {item.isFavorite ? (
                                    <Ionicons
                                        name="star"
                                        size={scale(14)}
                                        color={theme.secondThemeColor}
                                    />
                                ) : null}
                            </View>
                            <Text
                                numberOfLines={3}
                                style={[
                                    styles.badgeDescription,
                                    {color: theme.black.third},
                                ]}>
                                {item.description || t('Harbor 社群徽章')}
                            </Text>
                            {item.grantedAt ? (
                                <Text
                                    style={[
                                        styles.grantedAt,
                                        {color: theme.themeColor},
                                    ]}>
                                    {t('獲得於 {{date}}', {
                                        date: new Intl.DateTimeFormat(
                                            i18n.language === 'en'
                                                ? 'en'
                                                : 'zh-HK',
                                            {
                                                year: 'numeric',
                                                month: 'short',
                                                day: 'numeric',
                                            },
                                        ).format(new Date(item.grantedAt)),
                                    })}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                )}
                ItemSeparatorComponent={ListSeparator}
                ListEmptyComponent={
                    <HarborEmptyState
                        icon="ribbon-outline"
                        title={t('還沒有獲得徽章')}
                        description={t('繼續分享、回覆與參與 Harbor 社群吧。')}
                    />
                }
                refreshControl={
                    <RefreshControl
                        refreshing={isRefreshing}
                        tintColor={theme.themeColor}
                        colors={[theme.themeColor]}
                        onRefresh={() => {
                            trigger();
                            loadBadges({refresh: true});
                        }}
                    />
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    loading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    content: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
        paddingBottom: verticalScale(32),
    },
    badgeCard: {
        minHeight: verticalScale(104),
        borderRadius: scale(20),
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(13),
        paddingHorizontal: scale(16),
        paddingVertical: verticalScale(14),
    },
    badgeIcon: {
        width: scale(58),
        height: scale(58),
        borderRadius: scale(19),
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeImage: {
        width: scale(39),
        height: scale(39),
    },
    badgeContent: {
        flex: 1,
        minWidth: 0,
    },
    badgeTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(6),
    },
    badgeName: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(15),
        fontWeight: '730',
    },
    badgeDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        lineHeight: verticalScale(16),
        marginTop: verticalScale(5),
    },
    grantedAt: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        fontWeight: '600',
        marginTop: verticalScale(6),
    },
    separator: {
        height: verticalScale(10),
    },
});

export default HarborBadgesPage;
