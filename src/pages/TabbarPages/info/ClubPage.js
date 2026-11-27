import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { View, RefreshControl, TouchableOpacity, Alert, SectionList, Dimensions, FlatList, Platform, Animated, } from 'react-native';

import Text from '../../../components/AppText';
import ScalePressable from '../../../components/ScalePressable';
import TopScrollEdgeBackdrop from '../../../components/TopScrollEdgeBackdrop';
import { uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import ClubCard from './components/ClubCard';
import { filterClubsBySearchQuery } from './utils/clubSearchFilter';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const ITEMS_PER_ROW = 3;
/** 與網格對齊的左右內距 */
const CLUB_GRID_HORIZONTAL_PADDING = scale(10);
const CLUB_COLUMN_GAP = scale(6);
/** 單欄上限：寬螢幕／橫屏時避免卡片被拉滿，維持約手機三欄視覺並靠左排列 */
const CLUB_CELL_MAX_WIDTH = scale(122);
/** 非首個區段標題比首個區段多出的頂部內距 */
const SECTION_HEADER_EXTRA_TOP_PADDING = scale(12);
const CLUB_SKELETON_LOGO_SIZE = verticalScale(45);
/** 各區段列數，模擬 ARK／學生會／學會等分組 */
const SKELETON_SECTION_ROWS = [2, 2, 3];
const SKELETON_TITLE_WIDTHS = ['22%', '34%', '28%'];

const ClubSkeletonCard = ({ cellWidth, white, tonal }) => (
    <View style={{ width: cellWidth }}>
        <View
            style={{
                borderRadius: scale(10),
                backgroundColor: white,
                justifyContent: 'space-around',
                alignItems: 'center',
                paddingVertical: scale(8),
                margin: scale(3),
                width: '100%',
            }}>
            <View
                style={{
                    width: CLUB_SKELETON_LOGO_SIZE,
                    height: CLUB_SKELETON_LOGO_SIZE,
                    borderRadius: scale(50),
                    backgroundColor: tonal.primary15,
                }}
            />
            <View
                style={{
                    marginTop: scale(5),
                    height: verticalScale(10),
                    width: '70%',
                    borderRadius: scale(4),
                    backgroundColor: tonal.primary08,
                }}
            />
        </View>
    </View>
);

const clubFilter = (clubDataList, tag) => clubDataList.filter(a => a.tag === tag);

const chunkIntoRows = (list, size) => {
    const rows = [];
    for (let i = 0; i < list.length; i += size) {
        rows.push(list.slice(i, i + size));
    }
    return rows;
};

const buildSections = (clubDataList) => {
    if (!clubDataList || clubDataList.length === 0) { return []; }
    const sections = [];
    const arkList = clubFilter(clubDataList, 'ARK');
    if (arkList.length) {
        sections.push({
            title: 'ARK',
            data: chunkIntoRows(arkList, ITEMS_PER_ROW),
        });
    }

    clubTagList.forEach((tag) => {
        const list = clubFilter(clubDataList, tag);
        if (list.length) {
            sections.push({
                title: tag,
                data: chunkIntoRows(list, ITEMS_PER_ROW),
            });
        }
    });

    return sections;
};

function ClubPage({ topChromeHeight, useNativeLiquidGlassHeader = false, searchQuery = '' }) {
    const { theme } = useContext(ThemeContext);
    const { themeColor, black, white } = theme;
    const insets = useSafeAreaInsets();
    // 優先讀 Tab Bar 實際高度，避免底部文案被浮動底欄遮擋
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    const [allClubs, setAllClubs] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isOtherViewVisible, setIsOtherViewVisible] = useState(true);
    const [activeSectionIndex, setActiveSectionIndex] = useState(0);
    const [scrollY] = useState(() => new Animated.Value(0));
    const headerHeight = topChromeHeight;
    const nativeTopInset = Platform.OS === 'ios' ? headerHeight : 0;
    const sectionListRef = useRef(null);
    const firstSectionHeaderHeightRef = useRef(0);
    const clubRowHeightRef = useRef(0);
    const activeSectionIndexRef = useRef(0);
    // 側欄點選觸發的程式捲動期間鎖定 scroll-spy，避免高亮被中間區段來回覆寫
    const isProgrammaticScrollRef = useRef(false);
    const programmaticScrollTimerRef = useRef(null);

    const filteredClubs = useMemo(
        () => filterClubsBySearchQuery(allClubs, searchQuery),
        [allClubs, searchQuery],
    );

    const sections = useMemo(() => buildSections(filteredClubs), [filteredClubs]);

    useEffect(() => {
        activeSectionIndexRef.current = 0;
        setActiveSectionIndex(0);
    }, [sections]);

    const finishProgrammaticScroll = useCallback(() => {
        if (programmaticScrollTimerRef.current) {
            clearTimeout(programmaticScrollTimerRef.current);
            programmaticScrollTimerRef.current = null;
        }
        isProgrammaticScrollRef.current = false;
    }, []);

    useEffect(() => () => {
        if (programmaticScrollTimerRef.current) {
            clearTimeout(programmaticScrollTimerRef.current);
        }
    }, []);

    const armProgrammaticScroll = useCallback(() => {
        isProgrammaticScrollRef.current = true;
        if (programmaticScrollTimerRef.current) {
            clearTimeout(programmaticScrollTimerRef.current);
        }
        // 部分平台 animated scrollTo 未必觸發 momentum end；長距離跳轉也較久，逾時後再恢復 scroll-spy
        programmaticScrollTimerRef.current = setTimeout(finishProgrammaticScroll, 700);
    }, [finishProgrammaticScroll]);

    const handleScrollStart = useCallback(() => {
        // 用戶手勢接管時立刻解鎖，讓高亮重新跟隨手指捲動
        finishProgrammaticScroll();
        setIsOtherViewVisible(false);
    }, [finishProgrammaticScroll]);

    const handleScrollEndDrag = useCallback((event) => {
        finishProgrammaticScroll();
        // 仍有慣性時等 momentum end 再顯示側欄，避免滑動中途閃現
        const velocityY = event?.nativeEvent?.velocity?.y ?? 0;
        if (Math.abs(velocityY) < 0.01) {
            setIsOtherViewVisible(true);
        }
    }, [finishProgrammaticScroll]);

    const handleScrollEnd = useCallback(() => {
        finishProgrammaticScroll();
        setIsOtherViewVisible(true);
    }, [finishProgrammaticScroll]);

    const handleScroll = useCallback(event => {
        const scrollOffset = event.nativeEvent.contentOffset.y + nativeTopInset;
        scrollY.setValue(scrollOffset);

        // 程式捲動中略過區段同步，只保留頂部 backdrop 的 scrollY
        if (isProgrammaticScrollRef.current) {
            return;
        }

        const firstHeaderHeight = firstSectionHeaderHeightRef.current;
        const rowHeight = clubRowHeightRef.current;
        if (!firstHeaderHeight || !rowHeight || sections.length <= 1) {
            return;
        }

        const sectionHeaderHeight = firstHeaderHeight + SECTION_HEADER_EXTRA_TOP_PADDING;
        const probeOffset = scrollOffset + scale(24);
        let accumulated = 0;
        let nextIndex = 0;
        for (let i = 0; i < sections.length; i += 1) {
            if (probeOffset >= accumulated) {
                nextIndex = i;
            } else {
                break;
            }
            accumulated +=
                (i === 0 ? firstHeaderHeight : sectionHeaderHeight) +
                sections[i].data.length * rowHeight;
        }

        if (nextIndex !== activeSectionIndexRef.current) {
            activeSectionIndexRef.current = nextIndex;
            setActiveSectionIndex(nextIndex);
        }
    }, [nativeTopInset, scrollY, sections]);

    const scrollToSection = useCallback((sectionIndex) => {
        activeSectionIndexRef.current = sectionIndex;
        setActiveSectionIndex(sectionIndex);
        armProgrammaticScroll();
        if (sectionIndex === 0) {
            sectionListRef.current?.getScrollResponder()?.scrollTo({ y: -nativeTopInset, animated: true });
            return;
        }

        const firstHeaderHeight = firstSectionHeaderHeightRef.current;
        const rowHeight = clubRowHeightRef.current;
        if (!firstHeaderHeight || !rowHeight) {
            finishProgrammaticScroll();
            return;
        }

        const sectionHeaderHeight = firstHeaderHeight + SECTION_HEADER_EXTRA_TOP_PADDING;
        const offset = sections
            .slice(0, sectionIndex)
            .reduce((total, section, index) => (
                total +
                (index === 0 ? firstHeaderHeight : sectionHeaderHeight) +
                section.data.length * rowHeight
            ), 0);

        sectionListRef.current?.getScrollResponder()?.scrollTo({
            y: offset - nativeTopInset,
            animated: true,
        });
    }, [armProgrammaticScroll, finishProgrammaticScroll, nativeTopInset, sections]);

    const getData = useCallback(async ({ refreshing = false } = {}) => {
        handleScrollStart();
        setIsLoading(true);
        setIsRefreshing(refreshing);
        const URL = BASE_URI + GET.CLUB_INFO_ALL;
        try {
            await axios.get(URL).then(res => {
                const json = res.data;
                if (json.message == 'success') {
                    const clubDataList = json.content;
                    clubDataList.forEach(itm => {
                        itm.logo_url = BASE_HOST + itm.logo_url;
                    });
                    setAllClubs(clubDataList);
                } else {
                    Alert.alert('Warning:', String(json.message ?? ''));
                }
            });
        } catch (error) {
            if (error.code !== 'ERR_NETWORK' && error.code !== 'ECONNABORTED') {
                Alert.alert('組織頁，未知錯誤，請聯繫開發者！\n也可能是國內網絡屏蔽所導致！');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
            handleScrollEnd();
        }
    }, [handleScrollStart, handleScrollEnd]);

    useEffect(() => {
        getData();
    }, [getData]);

    const renderBottomInfo = useCallback(() => (
        <View style={{ marginBottom: tabBarHeight + scale(20) }}>
            <Text
                style={{
                    ...uiStyle.defaultText,
                    color: black.third,
                    alignSelf: 'center',
                    fontSize: scale(12),
                }}>
                {'\n\n\n\n' + '已有 ' +
                    allClubs.length +
                    ' 個組織進駐~~\n'}
            </Text>
            <Text
                style={{
                    ...uiStyle.defaultText,
                    color: black.third,
                    alignSelf: 'center',
                    fontSize: scale(12),
                }}>
                {'下拉可刷新頁面~\n'}
            </Text>
            <TouchableOpacity
                onPress={() => openLink(USUAL_Q)}
                style={{
                    alignSelf: 'center',
                }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: themeColor,
                        fontSize: scale(12),
                        marginBottom: 10
                    }}
                >
                    {'沒有賬號? 進駐ARK ALL!\n'}
                </Text>
            </TouchableOpacity>
        </View>
    ), [allClubs.length, black.third, tabBarHeight, themeColor]);

    const windowWidth = Dimensions.get('window').width - insets.left - insets.right;
    const rawCellWidth =
        (windowWidth -
            CLUB_GRID_HORIZONTAL_PADDING * 2 -
            CLUB_COLUMN_GAP * (ITEMS_PER_ROW - 1)) /
        ITEMS_PER_ROW;
    const cellWidth = Math.min(rawCellWidth, CLUB_CELL_MAX_WIDTH);

    // 組織列表骨架：區段標題 + 三欄圓形 Logo 卡
    const renderClubSkeleton = useCallback(() => {
        const { white, tonal } = theme;
        return (
            <View style={{ paddingBottom: scale(40) }}>
                {SKELETON_SECTION_ROWS.map((rowCount, sectionIndex) => (
                    <View key={`club-skeleton-section-${sectionIndex}`}>
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: CLUB_GRID_HORIZONTAL_PADDING + scale(4),
                                paddingTop: sectionIndex === 0 ? scale(8) : scale(20),
                                paddingBottom: scale(8),
                            }}>
                            <View
                                style={{
                                    height: verticalScale(15),
                                    width: SKELETON_TITLE_WIDTHS[sectionIndex],
                                    borderRadius: scale(4),
                                    backgroundColor: tonal.primary15,
                                }}
                            />
                        </View>
                        {Array.from({ length: rowCount }, (_, rowIndex) => (
                            <View
                                key={`club-skeleton-row-${sectionIndex}-${rowIndex}`}
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'flex-start',
                                    paddingHorizontal: CLUB_GRID_HORIZONTAL_PADDING,
                                    columnGap: CLUB_COLUMN_GAP,
                                }}>
                                {Array.from({ length: ITEMS_PER_ROW }, (_, itemIndex) => (
                                    <ClubSkeletonCard
                                        key={`club-skeleton-card-${sectionIndex}-${rowIndex}-${itemIndex}`}
                                        cellWidth={cellWidth}
                                        white={white}
                                        tonal={tonal}
                                    />
                                ))}
                            </View>
                        ))}
                    </View>
                ))}
            </View>
        );
    }, [cellWidth, theme]);

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg_color }}>
            {sections.length > 0 && isOtherViewVisible && !isLoading ? (
                <View style={{
                    position: 'absolute',
                    zIndex: 2,
                    right: scale(10),
                    bottom: tabBarHeight + verticalScale(16),
                    opacity: 0.9,
                    backgroundColor: white,
                    borderRadius: scale(10),
                    ...theme.viewShadow,
                }}>
                    <FlatList
                        data={sections.map(sec => sec.title)}
                        extraData={activeSectionIndex}
                        contentContainerStyle={{
                            padding: scale(3),
                        }}
                        renderItem={(itm) => {
                            const isActive = itm.index === activeSectionIndex;
                            return (
                                <ScalePressable
                                    onPress={() => {
                                        trigger('selection');
                                        scrollToSection(itm.index);
                                    }}
                                    style={{
                                        paddingVertical: scale(4),
                                        paddingHorizontal: scale(6),
                                        borderRadius: scale(6),
                                        backgroundColor: isActive ? theme.tonal.primary15 : 'transparent',
                                        width: '100%',
                                    }}
                                >
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: isActive ? themeColor : black.third,
                                        fontSize: verticalScale(11),
                                        fontWeight: isActive ? '700' : '600',
                                    }}>
                                        {clubTagMap(itm.item)}
                                    </Text>
                                </ScalePressable>
                            );
                        }}
                        keyExtractor={item => item}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        scrollEnabled={false}
                    />
                </View>
            ) : null}

            <SectionList
                ref={sectionListRef}
                style={{ flex: 1, width: '100%' }}
                contentInsetAdjustmentBehavior="never"
                // ScrollView 依 contentInset 計算置頂分類位置。Android 另用 padding 預留頂部空間。
                contentInset={{ top: headerHeight }}
                contentOffset={{ x: 0, y: -nativeTopInset }}
                contentContainerStyle={{ paddingTop: headerHeight - nativeTopInset }}
                sections={sections}
                keyExtractor={(item, index) => {
                    const firstId = item[0]?._id;
                    return firstId ? `${firstId}-row-${index}` : `row-${index}`;
                }}
                renderSectionHeader={({ section }) => {
                    const isFirstSection = section.title === sections[0]?.title;
                    return (
                        <View
                            onLayout={({ nativeEvent }) => {
                                if (isFirstSection) {
                                    firstSectionHeaderHeightRef.current = nativeEvent.layout.height;
                                }
                            }}
                            style={{
                                flexDirection: 'row',
                                alignItems: 'baseline',
                                paddingHorizontal: CLUB_GRID_HORIZONTAL_PADDING + scale(4),
                                paddingTop: isFirstSection ? scale(8) : scale(20),
                                paddingBottom: scale(8),
                            }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.main,
                                    fontSize: verticalScale(16),
                                    fontWeight: '700',
                                    letterSpacing: -0.3,
                                }}
                                numberOfLines={1}>
                                {clubTagMap(section.title) || section.title}
                            </Text>
                        </View>
                    );
                }}
                renderItem={({ item }) => (
                    <View
                        onLayout={({ nativeEvent }) => {
                            clubRowHeightRef.current = nativeEvent.layout.height;
                        }}
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'flex-start',
                            paddingHorizontal: CLUB_GRID_HORIZONTAL_PADDING,
                            columnGap: CLUB_COLUMN_GAP,
                        }}>
                        {item.map((club) => (
                            <View key={club._id} style={{ width: cellWidth }}>
                                <ClubCard data={club} />
                            </View>
                        ))}
                    </View>
                )}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isRefreshing}
                        progressViewOffset={headerHeight - nativeTopInset}
                        onRefresh={() => {
                            if (!isLoading) {
                                getData({ refreshing: true });
                            }
                        }}
                    />
                }
                onScroll={handleScroll}
                scrollEventThrottle={16}
                onScrollBeginDrag={handleScrollStart}
                onScrollEndDrag={handleScrollEndDrag}
                onMomentumScrollEnd={handleScrollEnd}
                ListEmptyComponent={isLoading ? renderClubSkeleton() : null}
                ListFooterComponent={!isLoading ? renderBottomInfo : null}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled={false}
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
                // Android + Fabric：removeClippedSubviews 與 sticky 區段標題會導致掛載索引錯亂而閃退（addViewAt / IndexOutOfBounds）
                removeClippedSubviews={Platform.OS === 'ios'}
            />
            {useNativeLiquidGlassHeader ? null : (
                <TopScrollEdgeBackdrop headerHeight={headerHeight} scrollY={scrollY} />
            )}
        </View>
    );
}

export default memo(ClubPage);
