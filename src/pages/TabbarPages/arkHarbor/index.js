import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import PagerView from 'react-native-pager-view';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { scale, verticalScale } from 'react-native-size-matters';
import { SafeAreaView } from 'react-native-screens/experimental';
import { useTranslation } from 'react-i18next';

import SegmentControl from '../../../components/SegmentControl';
import { uiStyle, useTheme } from '../../../components/ThemeContext';
import { useHarborSession } from '../../../contexts/HarborSessionContext';
import { logToFirebase } from '../../../utils/firebaseAnalytics';
import { fetchHarborSiteCapabilities } from '../../../utils/harbor/harborApi';
import { trigger } from '../../../utils/trigger';
import HarborTopicList from './components/HarborTopicList';

const VIEW_CONFIG = {
    latest: { label: '最新', analytics: 'latest' },
    top: { label: '熱門', analytics: 'top' },
    new: { label: '新話題', analytics: 'new' },
    unread: { label: '未讀', analytics: 'unread' },
};

const ExploreButton = ({ icon, title, description, onPress }) => {
    const { theme } = useTheme();

    return (
        <Pressable
            accessibilityRole="button"
            onPress={() => {
                trigger();
                onPress();
            }}
            style={({ pressed }) => [
                styles.exploreButton,
                {
                    backgroundColor: pressed
                        ? theme.tonal.primary30
                        : theme.tonal.primary15,
                },
            ]}>
            <View
                style={[
                    styles.exploreIcon,
                    { backgroundColor: theme.tonal.primary30 },
                ]}>
                <MaterialCommunityIcons
                    name={icon}
                    size={scale(19)}
                    color={theme.themeColor}
                />
            </View>
            <View style={styles.exploreText}>
                <Text
                    numberOfLines={1}
                    style={[styles.exploreTitle, { color: theme.black.main }]}>
                    {title}
                </Text>
                <Text
                    numberOfLines={1}
                    style={[
                        styles.exploreDescription,
                        { color: theme.black.third },
                    ]}>
                    {description}
                </Text>
            </View>
            <MaterialCommunityIcons
                name="chevron-right"
                size={scale(18)}
                color={theme.themeColor}
            />
        </Pressable>
    );
};

const HarborFeedPane = ({ view, navigation, onCapabilities }) => {
    const source = useMemo(() => ({ view }), [view]);

    return (
        <View style={styles.feedPage}>
            <HarborTopicList
                source={source}
                navigation={navigation}
                onCapabilities={onCapabilities}
            />
        </View>
    );
};

/**
 * Harbor 原生首頁：論壇探索入口與多視圖話題列表。
 */
const ForumPage = ({ navigation }) => {
    const { theme } = useTheme();
    const { t } = useTranslation('harbor');
    const { status, user, login } = useHarborSession();
    const pagerRef = useRef(null);
    const currentViewRef = useRef('latest');
    const [currentIndex, setCurrentIndex] = useState(0);
    const [capabilities, setCapabilities] = useState(null);
    const [mountedViews, setMountedViews] = useState({
        latest: true,
        top: false,
    });

    useEffect(() => {
        logToFirebase('openPage', { page: 'HarborNativeHome' });
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        fetchHarborSiteCapabilities({ signal: controller.signal })
            .then(setCapabilities)
            .catch(() => { });
        return () => controller.abort();
    }, []);

    const enabledViews = useMemo(() => {
        const fallbackViews = ['latest', 'top'];
        if (!capabilities) {
            return fallbackViews;
        }

        const available =
            status === 'signedIn'
                ? capabilities.topicViews
                : capabilities.anonymousTopicViews;
        const supportedViews = Array.isArray(available)
            ? available.filter(view => VIEW_CONFIG[view])
            : fallbackViews;
        return supportedViews.length > 0 ? supportedViews : fallbackViews;
    }, [capabilities, status]);

    const segmentOptions = useMemo(
        () =>
            enabledViews.map(view => ({
                key: view,
                label: t(VIEW_CONFIG[view].label),
            })),
        [enabledViews, t],
    );

    const ensureMounted = useCallback(view => {
        setMountedViews(current =>
            current[view] ? current : { ...current, [view]: true },
        );
    }, []);

    const handleCapabilities = useCallback(nextCapabilities => {
        setCapabilities(nextCapabilities);
    }, []);

    const selectView = useCallback(
        index => {
            const view = enabledViews[index];
            if (!view) {
                return;
            }
            ensureMounted(view);
            currentViewRef.current = view;
            setCurrentIndex(index);
            pagerRef.current?.setPage(index);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted],
    );

    const handlePageSelected = useCallback(
        event => {
            const index = event.nativeEvent.position;
            const view = enabledViews[index];
            if (!view) {
                return;
            }
            ensureMounted(view);
            currentViewRef.current = view;
            setCurrentIndex(index);
            logToFirebase('harbor_feed_view', {
                view: VIEW_CONFIG[view].analytics,
            });
        },
        [enabledViews, ensureMounted],
    );

    useEffect(() => {
        const nextIndex = enabledViews.indexOf(currentViewRef.current);
        if (nextIndex >= 0) {
            if (nextIndex !== currentIndex) {
                setCurrentIndex(nextIndex);
                pagerRef.current?.setPageWithoutAnimation(nextIndex);
            }
            return;
        }

        currentViewRef.current = enabledViews[0] || 'latest';
        setCurrentIndex(0);
        pagerRef.current?.setPageWithoutAnimation(0);
    }, [currentIndex, enabledViews]);

    const handleSessionPress = useCallback(async () => {
        if (status === 'signedIn') {
            navigation.navigate('MyTabbar');
            return;
        }
        if (status === 'restoring' || status === 'authorizing') {
            return;
        }
        try {
            await login();
        } catch (error) {
            Alert.alert(
                t('Harbor 登入失敗'),
                t('暫時無法登入 Harbor，請稍後再試。'),
                [{ text: t('確定'), onPress: () => trigger() }],
            );
        }
    }, [login, navigation, status, t]);

    const sessionLabel =
        status === 'signedIn'
            ? user?.username || t('已登入')
            : status === 'restoring'
                ? t('正在同步…')
                : status === 'authorizing'
                    ? t('登入中…')
                    : t('登入');

    return (
        <SafeAreaView
            style={[styles.page, { backgroundColor: theme.bg_color }]}
            edges={{ top: true }}>
            <View style={styles.header}>
                <View style={styles.titleRow}>
                    <View style={styles.brandArea}>
                        <View
                            style={[
                                styles.brandIcon,
                                { backgroundColor: theme.tonal.primary15 },
                            ]}>
                            <MaterialCommunityIcons
                                name="anchor"
                                size={scale(24)}
                                color={theme.themeColor}
                            />
                        </View>
                        <View style={styles.brandText}>
                            <Text
                                style={[
                                    styles.pageTitle,
                                    { color: theme.black.main },
                                ]}>
                                Harbor
                            </Text>
                            <Text
                                numberOfLines={1}
                                style={[
                                    styles.pageSubtitle,
                                    { color: theme.black.third },
                                ]}>
                                {t('發現校園話題，與 UM 社群一起交流')}
                            </Text>
                        </View>
                    </View>
                    <Pressable
                        accessibilityRole="button"
                        disabled={
                            status === 'restoring' || status === 'authorizing'
                        }
                        onPress={() => {
                            trigger();
                            handleSessionPress();
                        }}
                        style={({ pressed }) => [
                            styles.sessionButton,
                            {
                                backgroundColor: pressed
                                    ? theme.tonal.primary30
                                    : theme.tonal.primary15,
                            },
                        ]}>
                        <MaterialCommunityIcons
                            name={
                                status === 'signedIn'
                                    ? 'account-check-outline'
                                    : 'login'
                            }
                            size={scale(14)}
                            color={theme.themeColor}
                        />
                        <Text
                            numberOfLines={1}
                            style={[
                                styles.sessionText,
                                { color: theme.themeColor },
                            ]}>
                            {sessionLabel}
                        </Text>
                    </Pressable>
                </View>

                <View style={styles.exploreRow}>
                    <ExploreButton
                        icon="folder-multiple-outline"
                        title={t('探索分類')}
                        description={t('瀏覽主題與子分類')}
                        onPress={() =>
                            navigation.navigate('HarborCategoryList')
                        }
                    />
                    <View style={styles.exploreGap} />
                    <ExploreButton
                        icon="tag-multiple-outline"
                        title={t('熱門標籤')}
                        description={t('按興趣探索話題')}
                        onPress={() => navigation.navigate('HarborTagList')}
                    />
                </View>

                <SegmentControl
                    options={segmentOptions}
                    selectedIndex={currentIndex}
                    onChange={selectView}
                    trackBackgroundColor={theme.white}
                    style={styles.segment}
                />
            </View>

            <PagerView
                ref={pagerRef}
                style={styles.pager}
                initialPage={0}
                onPageSelected={handlePageSelected}>
                {enabledViews.map(view => (
                    <View key={view} style={styles.feedPage}>
                        {mountedViews[view] ? (
                            <HarborFeedPane
                                view={view}
                                navigation={navigation}
                                onCapabilities={handleCapabilities}
                            />
                        ) : null}
                    </View>
                ))}
            </PagerView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    page: {
        flex: 1,
    },
    header: {
        paddingHorizontal: scale(14),
        paddingTop: verticalScale(5),
        paddingBottom: verticalScale(7),
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandArea: {
        flex: 1,
        minWidth: 0,
        flexDirection: 'row',
        alignItems: 'center',
    },
    brandIcon: {
        width: scale(42),
        height: scale(42),
        borderRadius: scale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandText: {
        flex: 1,
        minWidth: 0,
        marginLeft: scale(9),
    },
    pageTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(21),
        lineHeight: scale(25),
        fontWeight: '800',
    },
    pageSubtitle: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        marginTop: verticalScale(2),
    },
    sessionButton: {
        maxWidth: scale(108),
        borderRadius: scale(10),
        flexDirection: 'row',
        alignItems: 'center',
        marginLeft: scale(8),
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(7),
    },
    sessionText: {
        ...uiStyle.defaultText,
        flexShrink: 1,
        fontSize: scale(10),
        fontWeight: '700',
        marginLeft: scale(4),
    },
    exploreRow: {
        flexDirection: 'row',
        marginTop: verticalScale(9),
    },
    exploreButton: {
        flex: 1,
        minWidth: 0,
        borderRadius: scale(13),
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(9),
        paddingVertical: verticalScale(8),
    },
    exploreGap: {
        width: scale(8),
    },
    exploreIcon: {
        width: scale(34),
        height: scale(34),
        borderRadius: scale(11),
        alignItems: 'center',
        justifyContent: 'center',
    },
    exploreText: {
        flex: 1,
        minWidth: 0,
        marginLeft: scale(7),
    },
    exploreTitle: {
        ...uiStyle.defaultText,
        fontSize: scale(11),
        fontWeight: '700',
    },
    exploreDescription: {
        ...uiStyle.defaultText,
        fontSize: scale(9),
        marginTop: verticalScale(2),
    },
    segment: {
        alignSelf: 'center',
        marginTop: verticalScale(8),
    },
    pager: {
        flex: 1,
    },
    feedPage: {
        flex: 1,
    },
});

export default ForumPage;
