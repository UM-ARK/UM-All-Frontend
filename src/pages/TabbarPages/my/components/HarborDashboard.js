import React from 'react';
import {
    ActivityIndicator,
    Animated,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';

import { useTranslation } from 'react-i18next';
import PagerView from 'react-native-pager-view';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';

import { uiStyle, useTheme } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import HarborDraftsPage from '../../arkHarbor/HarborDraftsPage';
import HarborActivityPage from '../pages/HarborActivityPage';
import HarborInboxPage from '../pages/HarborInboxPage';
import HarborProfileCard from './HarborProfileCard';
import HarborStatsPane from './HarborStatsPane';

const PAGE_CONFIG = [
    { key: 'unread', label: '未讀' },
    { key: 'topics', label: '發佈', kind: 'topics' },
    { key: 'replies', label: '評論', kind: 'replies' },
    { key: 'bookmarks', label: '收藏', kind: 'bookmarks' },
    { key: 'likes', label: '贊過', kind: 'likes' },
    { key: 'drafts', label: '草稿' },
    { key: 'stats', label: '統計' },
];
const TAB_INDICATOR_WIDTH = moderateScale(24, 0.1);
const AnimatedPagerView = Animated.createAnimatedComponent(PagerView);

const HarborDashboard = ({
    user,
    navigation,
    contentBottomInset,
    isRefreshing,
    onProfileRefresh,
}) => {
    const { theme } = useTheme();
    const { t } = useTranslation('my');
    const pagerRef = React.useRef(null);
    const tabsRef = React.useRef(null);
    const pageScrollOffset = React.useRef(new Animated.Value(0)).current;
    const pageScrollPosition = React.useRef(new Animated.Value(0)).current;
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [mountedPages, setMountedPages] = React.useState({ unread: true });
    const [tabLayouts, setTabLayouts] = React.useState({});
    const [tabsViewportWidth, setTabsViewportWidth] = React.useState(0);
    const [tabsContentWidth, setTabsContentWidth] = React.useState(0);
    const unreadCount =
        (Number(user.unreadNotifications) || 0) +
        (Number(user.unreadMessages) || 0);
    const pagePosition = React.useMemo(
        () => Animated.add(pageScrollPosition, pageScrollOffset),
        [pageScrollOffset, pageScrollPosition],
    );
    const indicatorInputRange = PAGE_CONFIG.map((page, index) => index);
    const indicatorOutputRange = PAGE_CONFIG.map(page => {
        const layout = tabLayouts[page.key];
        return layout
            ? layout.x + (layout.width - TAB_INDICATOR_WIDTH) / 2
            : 0;
    });
    const hasMeasuredTabs = PAGE_CONFIG.every(
        page => tabLayouts[page.key] !== undefined,
    );
    const indicatorTranslateX = pagePosition.interpolate({
        inputRange: indicatorInputRange,
        outputRange: indicatorOutputRange,
        extrapolate: 'clamp',
    });
    const handlePageScroll = React.useMemo(
        () =>
            Animated.event(
                [
                    {
                        nativeEvent: {
                            offset: pageScrollOffset,
                            position: pageScrollPosition,
                        },
                    },
                ],
                { useNativeDriver: true },
            ),
        [pageScrollOffset, pageScrollPosition],
    );

    const ensureMounted = React.useCallback(pageKey => {
        setMountedPages(current =>
            current[pageKey] ? current : { ...current, [pageKey]: true },
        );
    }, []);

    const selectPage = React.useCallback(
        index => {
            const page = PAGE_CONFIG[index];
            if (!page) {
                return;
            }
            ensureMounted(page.key);
            setCurrentIndex(index);
            pagerRef.current?.setPage(index);
        },
        [ensureMounted],
    );

    const handlePageSelected = React.useCallback(
        event => {
            const index = event.nativeEvent.position;
            const page = PAGE_CONFIG[index];
            if (!page) {
                return;
            }
            ensureMounted(page.key);
            setCurrentIndex(index);
        },
        [ensureMounted],
    );

    React.useEffect(() => {
        const page = PAGE_CONFIG[currentIndex];
        const layout = page ? tabLayouts[page.key] : null;
        if (!layout || !tabsViewportWidth) {
            return;
        }
        const nextOffset = Math.max(
            0,
            Math.min(
                layout.x + layout.width / 2 - tabsViewportWidth / 2,
                Math.max(0, tabsContentWidth - tabsViewportWidth),
            ),
        );
        tabsRef.current?.scrollTo({ x: nextOffset, animated: true });
    }, [
        currentIndex,
        tabLayouts,
        tabsContentWidth,
        tabsViewportWidth,
    ]);

    const renderPage = page => {
        if (!mountedPages[page.key]) {
            return (
                <View style={styles.pageLoading}>
                    <ActivityIndicator color={theme.themeColor} />
                </View>
            );
        }

        if (page.key === 'unread') {
            return (
                <HarborInboxPage
                    navigation={navigation}
                    embedded
                    combined
                    contentBottomInset={contentBottomInset}
                    onProfileRefresh={onProfileRefresh}
                />
            );
        }
        if (page.kind) {
            return (
                <HarborActivityPage
                    navigation={navigation}
                    kind={page.kind}
                    title={t(page.label)}
                    embedded
                    contentBottomInset={contentBottomInset}
                    onProfileRefresh={onProfileRefresh}
                />
            );
        }
        if (page.key === 'drafts') {
            return (
                <HarborDraftsPage
                    navigation={navigation}
                    embedded
                    contentBottomInset={contentBottomInset}
                    onProfileRefresh={onProfileRefresh}
                />
            );
        }
        return (
            <HarborStatsPane
                user={user}
                navigation={navigation}
                contentBottomInset={contentBottomInset}
                isRefreshing={isRefreshing}
                onRefresh={onProfileRefresh}
            />
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.profileContent}>
                <HarborProfileCard
                    user={user}
                    onPress={() => navigation.navigate('HarborAccountSettings')}
                />
            </View>
            {user.partialProfile ? (
                <View
                    style={[
                        styles.partialProfile,
                        { backgroundColor: theme.tonal.secondary15 },
                    ]}>
                    <Text
                        style={[
                            styles.partialProfileText,
                            { color: theme.black.second },
                        ]}>
                        {user.usedPreviousProfileData
                            ? t('部分資料暫時無法更新，已保留上次成功資料。')
                            : t('部分資料暫時無法更新，未知統計暫不顯示。')}
                    </Text>
                </View>
            ) : null}

            <View
                style={[
                    styles.tabsCard,
                    { backgroundColor: theme.white },
                ]}>
                <Animated.ScrollView
                    ref={tabsRef}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    bounces={false}
                    onLayout={event =>
                        setTabsViewportWidth(event.nativeEvent.layout.width)
                    }
                    onContentSizeChange={width => setTabsContentWidth(width)}
                    contentContainerStyle={styles.tabsScrollContent}>
                    <View style={styles.tabsContent}>
                        {PAGE_CONFIG.map((page, index) => {
                            const isSelected = currentIndex === index;
                            const badge =
                                page.key === 'unread' ? unreadCount : 0;
                            return (
                                <Pressable
                                    key={page.key}
                                    accessibilityRole="tab"
                                    accessibilityState={{
                                        selected: isSelected,
                                    }}
                                    accessibilityLabel={
                                        badge
                                            ? `${badge} ${t(page.label)}`
                                            : t(page.label)
                                    }
                                    onLayout={event => {
                                        const { x, width } =
                                            event.nativeEvent.layout;
                                        setTabLayouts(current =>
                                            current[page.key]?.x === x &&
                                            current[page.key]?.width === width
                                                ? current
                                                : {
                                                    ...current,
                                                    [page.key]: { x, width },
                                                },
                                        );
                                    }}
                                    onPress={() => {
                                        trigger();
                                        selectPage(index);
                                    }}
                                    style={({ pressed }) => [
                                        styles.tab,
                                        pressed && {
                                            backgroundColor:
                                                theme.tonal.primary15,
                                        },
                                    ]}>
                                    <Text
                                        numberOfLines={1}
                                        style={[
                                            styles.tabLabel,
                                            {
                                                color: isSelected
                                                    ? theme.black.main
                                                    : theme.black.third,
                                            },
                                            isSelected &&
                                            styles.tabLabelSelected,
                                        ]}>
                                        {t(page.label)}
                                    </Text>
                                    {badge ? (
                                        <View
                                            style={[
                                                styles.tabBadge,
                                                {
                                                    backgroundColor:
                                                        theme.unread,
                                                },
                                            ]}>
                                            <Text
                                                style={[
                                                    styles.tabBadgeText,
                                                    {
                                                        color:
                                                            theme.trueWhite,
                                                    },
                                                ]}>
                                                {badge > 99 ? '99+' : badge}
                                            </Text>
                                        </View>
                                    ) : null}
                                </Pressable>
                            );
                        })}
                        <Animated.View
                            pointerEvents="none"
                            style={[
                                styles.tabIndicator,
                                hasMeasuredTabs
                                    ? styles.tabIndicatorVisible
                                    : styles.tabIndicatorHidden,
                                {
                                    backgroundColor: theme.themeColor,
                                    transform: [
                                        {
                                            translateX: indicatorTranslateX,
                                        },
                                    ],
                                },
                            ]}
                        />
                    </View>
                </Animated.ScrollView>
            </View>

            <AnimatedPagerView
                ref={pagerRef}
                style={[
                    styles.pager,
                    { backgroundColor: theme.white },
                ]}
                initialPage={0}
                onPageScroll={handlePageScroll}
                onPageSelected={handlePageSelected}>
                {PAGE_CONFIG.map(page => (
                    <View
                        key={page.key}
                        style={styles.page}
                        collapsable={false}>
                        {renderPage(page)}
                    </View>
                ))}
            </AnimatedPagerView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 0,
    },
    partialProfile: {
        borderRadius: scale(10),
        marginHorizontal: scale(10),
        marginTop: verticalScale(8),
        paddingHorizontal: scale(14),
        paddingVertical: verticalScale(9),
    },
    partialProfileText: {
        ...uiStyle.defaultText,
        fontSize: scale(10),
        lineHeight: verticalScale(14),
        textAlign: 'center',
    },
    tabsCard: {
        overflow: 'hidden',
    },
    profileContent: {
        paddingHorizontal: scale(10),
    },
    tabsScrollContent: {
        minWidth: '100%',
    },
    tabsContent: {
        height: verticalScale(39),
        flexDirection: 'row',
        position: 'relative',
    },
    tab: {
        minWidth: scale(48),
        height: verticalScale(39),
        borderRadius: scale(8),
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: scale(12),
    },
    tabLabel: {
        ...uiStyle.defaultText,
        fontSize: scale(12),
        fontWeight: '500',
    },
    tabLabelSelected: {
        fontWeight: '760',
    },
    tabBadge: {
        minWidth: scale(16),
        height: scale(16),
        borderRadius: scale(8),
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: scale(4),
        paddingHorizontal: scale(3),
    },
    tabBadgeText: {
        ...uiStyle.defaultText,
        fontSize: scale(8),
        fontWeight: '800',
    },
    tabIndicator: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        width: TAB_INDICATOR_WIDTH,
        height: verticalScale(2),
        borderRadius: scale(1),
    },
    tabIndicatorVisible: {
        opacity: 1,
    },
    tabIndicatorHidden: {
        opacity: 0,
    },
    pager: {
        flex: 1,
        minHeight: 0,
    },
    page: {
        flex: 1,
    },
    pageLoading: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default HarborDashboard;
