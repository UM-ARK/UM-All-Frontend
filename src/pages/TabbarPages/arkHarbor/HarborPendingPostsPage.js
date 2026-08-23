import React, {
    useCallback,
    useContext,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    StyleSheet,
    View,
} from 'react-native';

import {isLiquidGlassSupported} from '@callstack/liquid-glass';
import {HeaderHeightContext} from '@react-navigation/elements';
import {FlashList} from '@shopify/flash-list';
import {useFocusEffect} from '@react-navigation/native';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import {scale, verticalScale} from 'react-native-size-matters';
import {useTranslation} from 'react-i18next';

import Text from '../../../components/AppText';
import {uiStyle, useTheme} from '../../../components/ThemeContext';
import {useHarborSession} from '../../../contexts/HarborSessionContext';
import {fetchHarborPendingPosts} from '../../../utils/harbor/harborApi';
import {trigger} from '../../../utils/trigger';
import {HarborFullState} from './components/HarborListStates';

const getPendingExcerpt = raw =>
    String(raw || '')
        .replace(/!\[[^\]]*\]\([^)]+\)/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();

const HarborPendingPostsPage = ({navigation}) => {
    const {theme} = useTheme();
    const {t} = useTranslation('harbor');
    const {user} = useHarborSession();
    const headerHeight = useContext(HeaderHeightContext) || 0;
    const controllerRef = useRef(null);
    const [pendingPosts, setPendingPosts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [loadError, setLoadError] = useState('');
    const username = user?.username || '';

    const pageStyle = useMemo(
        () => [
            styles.container,
            {
                backgroundColor: theme.bg_color,
                paddingTop: isLiquidGlassSupported ? headerHeight : 0,
            },
        ],
        [headerHeight, theme.bg_color],
    );

    const loadPendingPosts = useCallback(async ({refreshing = false} = {}) => {
        if (!username) {
            setPendingPosts([]);
            setIsLoading(false);
            setIsRefreshing(false);
            return;
        }
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoadError('');
        if (refreshing) {
            setIsRefreshing(true);
        } else {
            setIsLoading(true);
        }

        try {
            const result = await fetchHarborPendingPosts(username, {
                signal: controller.signal,
            });
            if (!controller.signal.aborted) {
                setPendingPosts(result);
            }
        } catch {
            if (!controller.signal.aborted) {
                setLoadError(t('待審內容載入失敗，請稍後再試。'));
            }
        } finally {
            if (!controller.signal.aborted) {
                setIsLoading(false);
                setIsRefreshing(false);
                controllerRef.current = null;
            }
        }
    }, [t, username]);

    useFocusEffect(
        useCallback(() => {
            navigation.setOptions({headerTitle: t('我的待審內容')});
            loadPendingPosts();
            return () => controllerRef.current?.abort();
        }, [loadPendingPosts, navigation, t]),
    );

    const renderPendingPost = useCallback(
        ({item}) => {
            const createdAt = new Date(item.createdAt);
            const timeLabel = Number.isNaN(createdAt.getTime())
                ? ''
                : createdAt.toLocaleString();
            return (
                <View
                    style={[
                        styles.pendingCard,
                        {
                            backgroundColor: theme.white,
                            borderColor: theme.themeColorUltraLight,
                        },
                    ]}>
                    <View style={styles.cardHeader}>
                        <View
                            style={[
                                styles.pendingIcon,
                                {backgroundColor: theme.tonal.secondary15},
                            ]}>
                            <MaterialCommunityIcons
                                name="clock-outline"
                                size={scale(21)}
                                color={theme.secondThemeColor}
                            />
                        </View>
                        <View style={styles.cardHeading}>
                            <Text
                                numberOfLines={2}
                                style={[
                                    styles.pendingTitle,
                                    {color: theme.black.main},
                                ]}>
                                {item.title || t('待審回覆')}
                            </Text>
                            <Text
                                style={[
                                    styles.pendingStatus,
                                    {color: theme.secondThemeColor},
                                ]}>
                                {t('審核中')}
                            </Text>
                        </View>
                    </View>
                    <Text
                        numberOfLines={4}
                        style={[
                            styles.pendingExcerpt,
                            {color: theme.black.second},
                        ]}>
                        {getPendingExcerpt(item.raw) || t('只有圖片內容')}
                    </Text>
                    {timeLabel ? (
                        <Text
                            style={[
                                styles.pendingTime,
                                {color: theme.black.third},
                            ]}>
                            {timeLabel}
                        </Text>
                    ) : null}
                </View>
            );
        },
        [t, theme],
    );

    if (isLoading) {
        return (
            <View
                style={[
                    styles.centered,
                    {backgroundColor: theme.bg_color},
                ]}>
                <ActivityIndicator size="large" color={theme.themeColor} />
                <Text
                    style={[
                        styles.stateText,
                        {color: theme.black.third},
                    ]}>
                    {t('正在載入待審內容…')}
                </Text>
            </View>
        );
    }

    if (loadError && pendingPosts.length === 0) {
        return (
            <View style={[pageStyle, styles.stateContainer]}>
                <HarborFullState
                    actionLabel={t('重試')}
                    description={loadError}
                    icon="cloud-alert-outline"
                    onAction={loadPendingPosts}
                    title={t('無法載入待審內容')}
                />
            </View>
        );
    }

    return (
        <View style={pageStyle}>
            <FlashList
                contentContainerStyle={styles.listContent}
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? 'never' : 'automatic'
                }
                data={pendingPosts}
                keyExtractor={(item, index) =>
                    String(item.id ?? `pending-${index}`)
                }
                onRefresh={() => {
                    trigger();
                    loadPendingPosts({refreshing: true});
                }}
                refreshing={isRefreshing}
                renderItem={renderPendingPost}
                showsVerticalScrollIndicator={false}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons
                            name="check-circle-outline"
                            size={scale(44)}
                            color={theme.themeColor}
                        />
                        <Text
                            style={[
                                styles.stateTitle,
                                {color: theme.black.main},
                            ]}>
                            {t('目前沒有審核中的內容')}
                        </Text>
                        <Text
                            style={[
                                styles.stateText,
                                {color: theme.black.third},
                            ]}>
                            {t('送交審核的話題或回覆會顯示在這裡。')}
                        </Text>
                    </View>
                }
            />
        </View>
    );
};

const styles = StyleSheet.create({
    cardHeader: {
        alignItems: 'center',
        flexDirection: 'row',
        gap: scale(10),
    },
    cardHeading: {
        flex: 1,
        gap: verticalScale(3),
    },
    centered: {
        alignItems: 'center',
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: scale(28),
    },
    container: {
        flex: 1,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: verticalScale(360),
        paddingHorizontal: scale(28),
    },
    listContent: {
        paddingBottom: verticalScale(40),
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(12),
    },
    pendingCard: {
        borderRadius: scale(16),
        borderWidth: StyleSheet.hairlineWidth,
        gap: verticalScale(10),
        marginBottom: verticalScale(10),
        padding: scale(14),
    },
    pendingExcerpt: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: scale(19),
    },
    pendingIcon: {
        alignItems: 'center',
        borderRadius: scale(13),
        height: scale(42),
        justifyContent: 'center',
        width: scale(42),
    },
    pendingStatus: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
    pendingTime: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
    },
    pendingTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(15),
        fontWeight: '700',
    },
    stateContainer: {
        justifyContent: 'center',
    },
    stateText: {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        lineHeight: scale(20),
        marginTop: verticalScale(10),
        textAlign: 'center',
    },
    stateTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(18),
        fontWeight: '700',
        marginTop: verticalScale(14),
        textAlign: 'center',
    },
});

export default HarborPendingPostsPage;
