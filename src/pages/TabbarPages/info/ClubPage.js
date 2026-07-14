import React, { memo, useCallback, useContext, useEffect, useMemo, useRef, useState, } from 'react';
import { Text, View, RefreshControl, TouchableOpacity, Alert, SectionList, Dimensions, FlatList, Platform, } from 'react-native';

import { uiStyle, ThemeContext, } from '../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import Loading from '../../../components/Loading';
import ClubCard from './components/ClubCard';
import ClubSearchBar from './components/ClubSearchBar';
import { filterClubsBySearchQuery } from './utils/clubSearchFilter';
import axios from 'axios';
import { scale, verticalScale } from 'react-native-size-matters';

const ITEMS_PER_ROW = 3;
/** 與網格對齊的左右內距 */
const CLUB_GRID_HORIZONTAL_PADDING = scale(10);
const CLUB_COLUMN_GAP = scale(6);
/** 單欄上限：寬螢幕／橫屏時避免卡片被拉滿，維持約手機三欄視覺並靠左排列 */
const CLUB_CELL_MAX_WIDTH = scale(122);

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

function ClubPage() {
    const { theme } = useContext(ThemeContext);
    const { themeColor, black, white } = theme;
    const [allClubs, setAllClubs] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isOtherViewVisible, setIsOtherViewVisible] = useState(true);
    const sectionListRef = useRef(null);

    const filteredClubs = useMemo(
        () => filterClubsBySearchQuery(allClubs, searchQuery),
        [allClubs, searchQuery],
    );

    const sections = useMemo(() => buildSections(filteredClubs), [filteredClubs]);

    const handleScrollStart = useCallback(() => {
        setIsOtherViewVisible(false);
    }, []);

    const handleScrollEnd = useCallback(() => {
        setIsOtherViewVisible(true);
    }, []);

    const getData = useCallback(async () => {
        handleScrollStart();
        setIsLoading(true);
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
                    setIsLoading(false);
                    handleScrollEnd();
                } else {
                    Alert.alert('Warning:', String(json.message ?? ''));
                }
            });
        } catch (error) {
            if (error.code == 'ERR_NETWORK' || error.code == 'ECONNABORTED') {
                setIsLoading(false);
            } else {
                Alert.alert('組織頁，未知錯誤，請聯繫開發者！\n也可能是國內網絡屏蔽所導致！');
            }
        }
    }, [handleScrollStart, handleScrollEnd]);

    useEffect(() => {
        getData();
    }, [getData]);

    const handleSearchFocus = useCallback(() => {
        trigger();
    }, []);

    const renderBottomInfo = useCallback(() => (
        <View style={{ marginBottom: scale(20) }}>
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
    ), [allClubs.length, black.third, themeColor]);

    const windowWidth = Dimensions.get('window').width;
    const rawCellWidth =
        (windowWidth -
            CLUB_GRID_HORIZONTAL_PADDING * 2 -
            CLUB_COLUMN_GAP * (ITEMS_PER_ROW - 1)) /
        ITEMS_PER_ROW;
    const cellWidth = Math.min(rawCellWidth, CLUB_CELL_MAX_WIDTH);

    return (
        <View style={{ flex: 1, backgroundColor: theme.bg_color }}>
            <ClubSearchBar
                value={searchQuery}
                onChangeText={setSearchQuery}
                loading={isLoading}
                onFocus={handleSearchFocus}
                onCancel={() => setSearchQuery('')}
                containerStyle={{
                    backgroundColor: theme.bg_color,
                    borderTopWidth: 0,
                    borderBottomWidth: 0,
                }}
            />

            {sections.length > 0 && isOtherViewVisible && !isLoading ? (
                <View style={{
                    position: 'absolute',
                    zIndex: 2,
                    right: scale(10),
                    bottom: verticalScale(70),
                    opacity: 0.9,
                    backgroundColor: white,
                    borderRadius: scale(10),
                    ...theme.viewShadow,
                }}>
                    <FlatList
                        data={sections.map(sec => sec.title)}
                        contentContainerStyle={{
                            paddingHorizontal: scale(3),
                        }}
                        renderItem={(itm) => {
                            return (
                                <TouchableOpacity
                                    onPress={() => {
                                        trigger();
                                        const sectionIndex = sections.findIndex(sec => sec.title === itm.item);
                                        if (sectionIndex !== -1) {
                                            sectionListRef.current?.scrollToLocation({ sectionIndex, itemIndex: 0, viewOffset: 0, animated: true });
                                        }
                                    }}
                                    style={{
                                        padding: scale(5),
                                        width: '100%',
                                    }}
                                >
                                    <Text style={{
                                        ...uiStyle.defaultText,
                                        color: black.third,
                                        fontSize: verticalScale(11),
                                        fontWeight: 'bold'
                                    }}>
                                        {clubTagMap(itm.item)}
                                    </Text>
                                </TouchableOpacity>
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
                contentInsetAdjustmentBehavior="automatic"
                sections={sections}
                keyExtractor={(item, index) => {
                    const firstId = item[0]?._id;
                    return firstId ? `${firstId}-row-${index}` : `row-${index}`;
                }}
                renderSectionHeader={({ section }) => {
                    const sectionIndex = sections.findIndex((s) => s.title === section.title);
                    const isFirstSection = sectionIndex <= 0;
                    return (
                        <View
                            style={{
                                flexDirection: 'row',
                                alignItems: 'center',
                                paddingHorizontal: CLUB_GRID_HORIZONTAL_PADDING,
                                paddingTop: isFirstSection ? scale(6) : scale(18),
                                paddingBottom: scale(8),
                                backgroundColor: theme.bg_color,
                            }}>
                            <View
                                style={{
                                    width: scale(3),
                                    height: verticalScale(15),
                                    borderRadius: scale(2),
                                    backgroundColor: theme.themeColor,
                                    marginRight: scale(10),
                                }}
                            />
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    flex: 1,
                                    color: black.second,
                                    fontSize: verticalScale(16),
                                    fontWeight: '700',
                                    letterSpacing: -0.25,
                                }}
                                numberOfLines={1}>
                                {clubTagMap(section.title) || section.title}
                            </Text>
                        </View>
                    );
                }}
                renderItem={({ item }) => (
                    <View style={{
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
                        refreshing={isLoading}
                        onRefresh={() => {
                            getData();
                            handleScrollStart();
                        }}
                    />
                }
                onScrollBeginDrag={handleScrollStart}
                onMomentumScrollEnd={handleScrollEnd}
                ListEmptyComponent={isLoading ? <Loading /> : null}
                ListFooterComponent={!isLoading ? renderBottomInfo : null}
                showsVerticalScrollIndicator={false}
                stickySectionHeadersEnabled
                initialNumToRender={10}
                maxToRenderPerBatch={10}
                windowSize={7}
                // Android + Fabric：removeClippedSubviews 與 sticky 區段標題會導致掛載索引錯亂而閃退（addViewAt / IndexOutOfBounds）
                removeClippedSubviews={Platform.OS === 'ios'}
            />
        </View>
    );
}

export default memo(ClubPage);
