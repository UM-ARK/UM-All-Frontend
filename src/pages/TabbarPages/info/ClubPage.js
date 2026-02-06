import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET, USUAL_Q } from '../../../utils/pathMap';
import { clubTagList, clubTagMap } from '../../../utils/clubMap';
import { openLink } from '../../../utils/browser';
import { trigger } from '../../../utils/trigger';
import Loading from '../../../components/Loading';
import axios from 'axios';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { BlurView } from 'expo-blur';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';
import { LiquidGlassContainerView } from '@callstack/liquid-glass';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const ITEM_WIDTH = (screenWidth - scale(48)) / 3;

// 社團列表項組件 - 液態玻璃卡片
const ClubItem = React.memo(({ data, index }) => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { white, black } = theme;
    const { logo_url, name, tag } = data;

    const scaleAnim = useSharedValue(1);
    const opacity = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(scaleAnim.value, { damping: 15 }) }],
        opacity: withTiming(opacity.value, { duration: 200 }),
    }));

    const handleJumpToDetail = useCallback(() => {
        trigger();
        navigation.navigate('ClubDetail', { data });
    }, [navigation, data]);

    return (
        <TouchableOpacity
            activeOpacity={0.9}
            onPress={handleJumpToDetail}
            onPressIn={() => {
                scaleAnim.value = 0.92;
                opacity.value = 0.8;
            }}
            onPressOut={() => {
                scaleAnim.value = 1;
                opacity.value = 1;
            }}
            style={{ width: ITEM_WIDTH, marginBottom: scale(16) }}
        >
            <Animated.View style={animatedStyle}>
                <BlurView
                    intensity={50}
                    tint="light"
                    style={{
                        borderRadius: scale(16),
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.4)',
                        backgroundColor: 'rgba(255, 255, 255, 0.25)',
                    }}
                >
                    <View
                        style={{
                            padding: scale(12),
                            alignItems: 'center',
                            gap: scale(8),
                            paddingRight: scale(12),
                        }}
                    >
                        {/* 社團 Logo */}
                        <View
                            style={{
                                width: scale(56),
                                height: scale(56),
                                borderRadius: scale(28),
                                backgroundColor: white.main,
                                alignItems: 'center',
                                justifyContent: 'center',
                                shadowColor: black.main,
                                shadowOffset: { width: 0, height: scale(4) },
                                shadowOpacity: 0.1,
                                shadowRadius: scale(8),
                                elevation: 4,
                            }}
                        >
                            <Image
                                source={{ uri: logo_url }}
                                style={{
                                    width: scale(44),
                                    height: scale(44),
                                    borderRadius: scale(22),
                                }}
                                contentFit="contain"
                                transition={200}
                                placeholder={{
                                    uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                                }}
                            />
                        </View>

                        {/* 社團名稱 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.main,
                                fontSize: moderateScale(11),
                                fontWeight: '600',
                                textAlign: 'center',
                                lineHeight: moderateScale(14),
                            }}
                            numberOfLines={2}
                            ellipsizeMode="tail"
                        >
                            {name}
                        </Text>

                        {/* 分類標籤 */}
                        <View
                            style={{
                                paddingHorizontal: scale(8),
                                paddingVertical: scale(3),
                                borderRadius: scale(8),
                                backgroundColor: 'rgba(148, 163, 184, 0.2)',
                            }}
                        >
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: moderateScale(9),
                                    color: '#64748b',
                                    fontWeight: '600',
                                }}
                            >
                                {clubTagMap(tag)}
                            </Text>
                        </View>
                    </View>
                </BlurView>
            </Animated.View>
        </TouchableOpacity>
    );
}, (prev, next) => prev.data?._id === next.data?._id);

// 篩選標籤組件 - 液態玻璃效果
const FilterTag = ({ tag, active, onPress, count }) => {
    const { theme } = useTheme();
    const { themeColor, black, white } = theme;

    const scaleAnim = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: withSpring(scaleAnim.value) }],
    }));

    return (
        <TouchableOpacity
            activeOpacity={0.8}
            onPressIn={() => {
                scaleAnim.value = 0.95;
            }}
            onPressOut={() => {
                scaleAnim.value = 1;
            }}
            onPress={onPress}
        >
            <Animated.View style={animatedStyle}>
                <BlurView
                    intensity={active ? 60 : 40}
                    tint="light"
                    style={{
                        paddingHorizontal: scale(16),
                        paddingVertical: scale(10),
                        borderRadius: scale(20),
                        overflow: 'hidden',
                        borderWidth: active ? 2 : 1,
                        borderColor: active
                            ? `${themeColor}99`
                            : 'rgba(255, 255, 255, 0.3)',
                        backgroundColor: active
                            ? `${themeColor}33`
                            : 'rgba(255, 255, 255, 0.15)',
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: scale(6),
                        }}
                    >
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: moderateScale(14),
                                fontWeight: active ? '700' : '600',
                                color: active ? themeColor : '#64748b',
                            }}
                        >
                            {tag === 'ALL' || tag === 'ARK' ? tag : clubTagMap(tag)}
                        </Text>
                        <View
                            style={{
                                backgroundColor: active ? themeColor : '#94a3b8',
                                paddingHorizontal: scale(6),
                                paddingVertical: scale(2),
                                borderRadius: scale(10),
                            }}
                        >
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: moderateScale(10),
                                    color: white,
                                    fontWeight: '700',
                                }}
                            >
                                {count}
                            </Text>
                        </View>
                    </View>
                </BlurView>
            </Animated.View>
        </TouchableOpacity>
    );
};

// 主頁面組件
const ClubPage = () => {
    const { theme } = useTheme();
    const { themeColor, black, bg_color, white } = theme;
    const navigation = useNavigation();

    const [clubDataList, setClubDataList] = useState([]);
    const [filteredClubDataList, setFilteredClubDataList] = useState([]);
    const [selectedTag, setSelectedTag] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');

    // 定義標籤順序：ALL -> ARK -> clubTagList 順序
    const tagOrder = ['ALL', 'ARK', ...clubTagList];

    // 計算各分類數量 - 按照 tagOrder 順序構建對象
    const categoryCounts = useMemo(() => {
        // 初始化所有標籤計數為0
        const counts = {};
        tagOrder.forEach(tag => {
            counts[tag] = 0;
        });

        // 計算總數
        counts['ALL'] = clubDataList.length;

        // 計算各標籤數量
        clubDataList.forEach(club => {
            if (counts.hasOwnProperty(club.tag)) {
                counts[club.tag]++;
            }
        });

        return counts;
    }, [clubDataList, tagOrder]);

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

                // 按照 ARK → clubTagList 順序排序
                const tagOrderIndex = {};
                tagOrder.forEach((t, index) => {
                    tagOrderIndex[t] = index;
                });
                data.sort((a, b) => {
                    const indexA = tagOrderIndex[a.tag] ?? Infinity;
                    const indexB = tagOrderIndex[b.tag] ?? Infinity;
                    return indexA - indexB;
                });

                setClubDataList(data);

                // 根據當前選中的標籤設置篩選後的數據
                let filteredData = [];
                if (selectedTag === 'ALL') {
                    filteredData = [...data];
                } else {
                    filteredData = data.filter(club => club.tag === selectedTag);
                }

                // 應用搜索篩選
                if (searchText.trim()) {
                    const lowerCaseSearch = searchText.toLowerCase().trim();
                    filteredData = filteredData.filter(club =>
                        club.name.toLowerCase().includes(lowerCaseSearch),
                    );
                }

                setFilteredClubDataList(filteredData);
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
    }, [tagOrder, selectedTag, searchText]);

    // 組件掛載時獲取數據
    useEffect(() => {
        getData();
    }, [getData]);

    // 篩選社團數據
    const filterClubs = useCallback(
        tag => {
            setSelectedTag(tag);

            let filteredData = [];
            if (tag === 'ALL') {
                filteredData = [...clubDataList];
            } else {
                filteredData = clubDataList.filter(club => club.tag === tag);
            }

            // 應用搜索篩選
            if (searchText.trim()) {
                const lowerCaseSearch = searchText.toLowerCase().trim();
                filteredData = filteredData.filter(club =>
                    club.name.toLowerCase().includes(lowerCaseSearch),
                );
            }

            // 按照 ARK → clubTagList 順序排序（所有標籤情況下都應用）
            const tagOrderIndex = {};
            tagOrder.forEach((t, index) => {
                tagOrderIndex[t] = index;
            });
            filteredData.sort((a, b) => {
                const indexA = tagOrderIndex[a.tag] ?? Infinity;
                const indexB = tagOrderIndex[b.tag] ?? Infinity;
                return indexA - indexB;
            });

            setFilteredClubDataList(filteredData);
        },
        [clubDataList, searchText, tagOrder],
    );

    // 搜索功能
    const handleSearch = useCallback(
        text => {
            setSearchText(text);

            let filteredData = [];
            if (selectedTag === 'ALL') {
                filteredData = [...clubDataList];
            } else {
                filteredData = clubDataList.filter(
                    club => club.tag === selectedTag,
                );
            }

            if (text.trim()) {
                const lowerCaseSearch = text.toLowerCase().trim();
                filteredData = filteredData.filter(club =>
                    club.name.toLowerCase().includes(lowerCaseSearch),
                );
            }

            // 按照 ARK → clubTagList 順序排序（所有標籤情況下都應用）
            const tagOrderIndex = {};
            tagOrder.forEach((t, index) => {
                tagOrderIndex[t] = index;
            });
            filteredData.sort((a, b) => {
                const indexA = tagOrderIndex[a.tag] ?? Infinity;
                const indexB = tagOrderIndex[b.tag] ?? Infinity;
                return indexA - indexB;
            });

            setFilteredClubDataList(filteredData);
        },
        [clubDataList, selectedTag, tagOrder],
    );

    // 刷新數據
    const handleRefresh = useCallback(() => {
        setIsRefreshing(true);
        getData();
    }, [getData]);

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

    // 渲染篩選標籤 - 液態玻璃效果
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

    // 渲染搜索欄 - 液態玻璃效果
    const renderSearchBar = () => {
        return (
            <View style={styles.searchContainer}>
                <BlurView
                    intensity={70}
                    tint="light"
                    style={{
                        borderRadius: scale(16),
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 255, 255, 0.5)',
                        backgroundColor: `${white}50`,
                    }}
                >
                    <View
                        style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            paddingHorizontal: scale(16),
                            paddingVertical: scale(12),
                            gap: scale(10),
                        }}
                    >
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
                            style={{
                                flex: 1,
                                fontSize: moderateScale(15),
                                color: black.main,
                                fontWeight: '500',
                                ...uiStyle.defaultText,
                            }}
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
                style={{
                    flex: 1,
                    backgroundColor: bg_color,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
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
            />
        </LiquidGlassContainerView>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        paddingHorizontal: scale(16),
        paddingBottom: scale(16),
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
