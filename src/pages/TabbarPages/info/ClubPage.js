import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    RefreshControl,
    TouchableOpacity,
    Alert,
    FlatList,
    Dimensions,
    StyleSheet,
    ScrollView,
    TextInput,
} from 'react-native';
import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import Loading from '../../../components/Loading';
import axios from 'axios';
import { scale, moderateScale } from 'react-native-size-matters';
import { BlurView } from 'expo-blur';
import { Feather } from '@expo/vector-icons';
import { LiquidGlassContainerView } from '@callstack/liquid-glass';

// 提取的組件
import ClubItem from './components/ClubItem';
import FilterTag from './components/FilterTag';

const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = (screenWidth - scale(48)) / 3;

// 定義標籤順序
const tagOrder = ['ALL', 'ARK', ...clubTagList];

// 標籤排序索引映射（組件外定義，避免重複創建）
const tagOrderIndex = {};
tagOrder.forEach((t, index) => {
    tagOrderIndex[t] = index;
});

// 列表項高度（用於 getItemLayout）
const ITEM_HEIGHT = scale(140);

/**
 * 組織頁面主組件
 */
const ClubPage = () => {
    const { theme, isLight } = useTheme();
    const { themeColor, black, bg_color, white } = theme;

    const [clubDataList, setClubDataList] = useState([]);
    const [selectedTag, setSelectedTag] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');

    // 計算各分類數量
    const categoryCounts = useMemo(() => {
        const counts = {};
        tagOrder.forEach(tag => {
            counts[tag] = 0;
        });
        counts['ALL'] = clubDataList.length;
        clubDataList.forEach(club => {
            if (counts.hasOwnProperty(club.tag)) {
                counts[club.tag]++;
            }
        });
        return counts;
    }, [clubDataList]);

    // 使用 useMemo 自動計算篩選和排序後的數據
    const filteredClubDataList = useMemo(() => {
        let filteredData = [];

        // 按標籤篩選
        if (selectedTag === 'ALL') {
            filteredData = [...clubDataList];
        } else {
            filteredData = clubDataList.filter(club => club.tag === selectedTag);
        }

        // 應用搜索篩選
        if (searchText.trim()) {
            const lowerCaseSearch = searchText.toLowerCase().trim();
            filteredData = filteredData.filter(club =>
                club.name.toLowerCase().includes(lowerCaseSearch),
            );
        }

        // 按照 ARK → clubTagList 順序排序
        filteredData.sort((a, b) => {
            const indexA = tagOrderIndex[a.tag] ?? Infinity;
            const indexB = tagOrderIndex[b.tag] ?? Infinity;
            return indexA - indexB;
        });

        return filteredData;
    }, [clubDataList, selectedTag, searchText]);

    // 獲取所有社團信息
    const getData = useCallback(async () => {
        try {
            const URL = BASE_URI + GET.CLUB_INFO_ALL;
            const response = await axios.get(URL);
            const json = response.data;

            if (json.message === 'success') {
                let data = json.content;
                data.forEach(itm => {
                    itm.logo_url = BASE_HOST + itm.logo_url;
                });

                setClubDataList(data);
            } else {
                Alert.alert('警告', '獲取社團數據失敗');
            }
        } catch (error) {
            if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
                Alert.alert('網絡錯誤', '請檢查網絡連接後重試');
            } else {
                Alert.alert('錯誤', '組織頁面出現未知錯誤，請聯繫開發者！');
            }
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    // 組件掛載時獲取數據
    useEffect(() => {
        getData();
    }, [getData]);

    // 篩選社團數據（簡化版本，僅設置狀態）
    const filterClubs = useCallback((tag) => {
        trigger();
        setSelectedTag(tag);
    }, []);

    // 搜索功能（簡化版本，僅設置狀態）
    const handleSearch = useCallback((text) => {
        setSearchText(text);
    }, []);

    // 刷新數據
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        getData();
    }, [getData]);

    // FlatList getItemLayout 優化
    const getItemLayout = useCallback((data, index) => ({
        length: ITEM_HEIGHT,
        offset: ITEM_HEIGHT * Math.floor(index / 3),
        index,
    }), []);

    // 渲染底部信息
    const renderBottomInfo = () => {
        return (
            <View style={styles.bottomInfoContainer}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        textAlign: 'center',
                        fontSize: scale(12),
                    }}
                >
                    {'已有 ' + clubDataList.length + ' 個組織進駐~~\n'}
                </Text>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.third,
                        textAlign: 'center',
                        fontSize: scale(12),
                    }}
                >
                    {'下拉可刷新頁面~\n'}
                </Text>

                {/* 進駐提示 */}
                <TouchableOpacity
                    onPress={() => openLink(USUAL_Q)}
                    style={styles.joinButton}
                >
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: themeColor,
                            fontSize: scale(12),
                            textAlign: 'center',
                        }}
                    >
                        {'沒有賬號? 進駐ARK ALL!\n'}
                    </Text>
                </TouchableOpacity>
            </View>
        );
    };

    // 渲染篩選標籤
    const renderFilterTags = () => {
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                {tagOrder.map(tag => (
                    <FilterTag
                        key={tag}
                        tag={tag}
                        active={selectedTag === tag}
                        onPress={() => filterClubs(tag)}
                        count={categoryCounts[tag] || 0}
                    />
                ))}
            </ScrollView>
        );
    };

    // 渲染搜索欄
    const renderSearchBar = () => {
        // 根據主題動態計算樣式
        const blurTint = isLight ? 'light' : 'dark';
        const borderColor = isLight ? 'rgba(255, 255, 255, 0.5)' : 'rgba(255, 255, 255, 0.2)';
        const backgroundColor = isLight ? `${white}50` : 'rgba(30, 30, 30, 0.6)';

        return (
            <View style={styles.searchContainer}>
                <BlurView
                    intensity={70}
                    tint={blurTint}
                    style={[
                        styles.searchBlurContainer,
                        {
                            borderColor,
                            backgroundColor,
                        },
                    ]}
                >
                    <View style={styles.searchInputContainer}>
                        <Feather
                            name="search"
                            size={moderateScale(20)}
                            color={black.third}
                        />
                        <TextInput
                            placeholder="搜索社團..."
                            placeholderTextColor={black.third}
                            value={searchText}
                            onChangeText={handleSearch}
                            style={[
                                styles.searchInput,
                                {
                                    color: black.main,
                                    ...uiStyle.defaultText,
                                },
                            ]}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        {searchText.trim().length > 0 && (
                            <TouchableOpacity onPress={() => handleSearch('')}>
                                <Feather
                                    name="x"
                                    size={moderateScale(18)}
                                    color={black.third}
                                />
                            </TouchableOpacity>
                        )}
                    </View>
                </BlurView>
            </View>
        );
    };

    // 網格佈局渲染
    const renderGridItem = ({ item, index }) => {
        return <ClubItem data={item} index={index} />;
    };

    if (isLoading) {
        return (
            <View
                style={[
                    styles.loadingContainer,
                    { backgroundColor: bg_color },
                ]}
            >
                <Loading />
            </View>
        );
    }

    return (
        <LiquidGlassContainerView style={{ flex: 1, backgroundColor: bg_color }}>
            <FlatList
                data={filteredClubDataList}
                keyExtractor={item => item._id}
                renderItem={renderGridItem}
                numColumns={3}
                ListHeaderComponent={
                    <View style={{ paddingTop: scale(60) }}>
                        {/* 液態玻璃搜索欄 */}
                        {renderSearchBar()}

                        {/* 液態玻璃分類標籤 */}
                        {renderFilterTags()}
                    </View>
                }
                ListFooterComponent={renderBottomInfo}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                    />
                }
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                columnWrapperStyle={styles.columnWrapper}
                getItemLayout={getItemLayout}
                initialNumToRender={9}
                maxToRenderPerBatch={9}
                windowSize={5}
                removeClippedSubviews={true}
            />
        </LiquidGlassContainerView>
    );
};

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    searchContainer: {
        paddingHorizontal: scale(16),
        paddingBottom: scale(16),
    },
    searchBlurContainer: {
        borderRadius: scale(16),
        overflow: 'hidden',
        borderWidth: 1,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(16),
        paddingVertical: scale(12),
        gap: scale(10),
    },
    searchInput: {
        flex: 1,
        fontSize: moderateScale(15),
        fontWeight: '500',
    },
    filterContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: scale(12),
        paddingBottom: scale(16),
    },
    filterContent: {
        gap: scale(8),
    },
    listContent: {
        paddingHorizontal: scale(16),
        paddingBottom: scale(20),
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    bottomInfoContainer: {
        marginHorizontal: scale(12),
        marginBottom: scale(20),
        alignItems: 'center',
    },
    joinButton: {
        marginTop: scale(8),
    },
});

export default ClubPage;
