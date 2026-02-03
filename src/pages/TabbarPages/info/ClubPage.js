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
import TouchableScale from 'react-native-touchable-scale';
import { Image } from 'expo-image';
import { Feather } from '@expo/vector-icons';

const { width: screenWidth } = Dimensions.get('window');
const ITEM_WIDTH = (screenWidth - scale(40)) / 3;

// 社团列表项组件
const ClubItem = React.memo(({ data }) => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { themeColor, black, white, trueWhite } = theme;
    const { logo_url, name, tag } = data;

    const handleJumpToDetail = useCallback(() => {
        trigger();
        navigation.navigate('ClubDetail', { data });
    }, [navigation, data]);

    return (
        <TouchableScale
            style={[styles.itemContainer]}
            activeOpacity={0.8}
            onPress={handleJumpToDetail}
            activeScale={0.98}
        >
            <View style={styles.itemCard}>
                {/* 社团 Logo */}
                <View style={styles.logoContainer}>
                    <Image
                        source={{ uri: logo_url }}
                        style={styles.logo}
                        contentFit="contain"
                        transition={200}
                        placeholder={{
                            uri: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
                        }}
                    />
                </View>

                {/* 组织信息 */}
                <View style={styles.infoContainer}>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.main,
                            fontSize: moderateScale(12),
                            fontWeight: '600',
                            textAlign: 'center',
                        }}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                    >
                        {name}
                    </Text>
                </View>
            </View>
        </TouchableScale>
    );
}, (prev, next) => prev.data?._id === next.data?._id);

// 筛选标签组件
const FilterTag = ({ tag, active, onPress }) => {
    const { theme } = useTheme();
    const { themeColor, black, white, glass } = theme;

    return (
        <TouchableScale
            activeOpacity={0.7}
            onPress={onPress}
            activeScale={0.95}
        >
            <View
                style={[
                    styles.filterTag,
                    {
                        backgroundColor: active ? themeColor : glass,
                        borderColor: active ? themeColor : 'rgba(255,255,255,0.3)',
                    },
                ]}
            >
                <Text
                    style={[
                        styles.filterTagText,
                        {
                            color: active ? white : black.main,
                        },
                    ]}
                >
                    {clubTagMap(tag)}
                </Text>
            </View>
        </TouchableScale>
    );
};

// 主页面组件
const ClubPage = () => {
    const { theme } = useTheme();
    const { themeColor, black, bg_color } = theme;
    const navigation = useNavigation();

    const [clubDataList, setClubDataList] = useState([]);
    const [filteredClubDataList, setFilteredClubDataList] = useState([]);
    const [selectedTag, setSelectedTag] = useState('ALL');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchText, setSearchText] = useState('');

    // 配置原生搜索框
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerSearchBarOptions: {
                placeholder: '搜索社團...',
                onChange: (event) => {
                    const text = event.nativeEvent.text;
                    handleSearch(text);
                },
                onClose: () => {
                    handleSearch('');
                },
            },
        });
    }, [navigation]);

    // 获取所有社团信息
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
                setFilteredClubDataList(data);
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

    // 组件挂载时获取数据
    useEffect(() => {
        getData();
    }, [getData]);

    // 筛选社团数据
    const filterClubs = useCallback((tag) => {
        setSelectedTag(tag);

        let filteredData = [];
        if (tag === 'ALL') {
            filteredData = clubDataList;
        } else if (tag === 'ARK') {
            filteredData = clubDataList.filter(club => club.tag === 'ARK');
        } else {
            filteredData = clubDataList.filter(club => club.tag === tag);
        }

        // 应用搜索筛选
        if (searchText.trim()) {
            const lowerCaseSearch = searchText.toLowerCase().trim();
            filteredData = filteredData.filter(club =>
                club.name.toLowerCase().includes(lowerCaseSearch)
            );
        }

        setFilteredClubDataList(filteredData);
    }, [clubDataList, searchText]);

    // 搜索功能
    const handleSearch = useCallback((text) => {
        setSearchText(text);

        let filteredData = [];
        if (selectedTag === 'ALL') {
            filteredData = clubDataList;
        } else if (selectedTag === 'ARK') {
            filteredData = clubDataList.filter(club => club.tag === 'ARK');
        } else {
            filteredData = clubDataList.filter(club => club.tag === selectedTag);
        }

        if (text.trim()) {
            const lowerCaseSearch = text.toLowerCase().trim();
            filteredData = filteredData.filter(club =>
                club.name.toLowerCase().includes(lowerCaseSearch)
            );
        }

        setFilteredClubDataList(filteredData);
    }, [clubDataList, selectedTag]);

    // 刷新数据
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

    // 渲染筛选标签
    const renderFilterTags = () => {
        const tags = ['ALL', 'ARK', ...clubTagList];
        return (
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.filterContainer}
                contentContainerStyle={styles.filterContent}
            >
                {tags.map(tag => (
                    <FilterTag
                        key={tag}
                        tag={tag}
                        active={selectedTag === tag}
                        onPress={() => filterClubs(tag)}
                    />
                ))}
            </ScrollView>
        );
    };

    // 渲染搜索栏
    const renderSearchBar = () => {
        return (
            <View style={styles.searchContainer}>
                <View style={styles.searchBar}>
                    <Feather
                        name="search"
                        size={moderateScale(16)}
                        color={black.third}
                        style={styles.searchIcon}
                    />
                    <TextInput
                        style={[
                            styles.searchInput,
                            {
                                ...uiStyle.defaultText,
                                color: black.main,
                            },
                        ]}
                        placeholder="搜索社團..."
                        placeholderTextColor={black.third}
                        value={searchText}
                        onChangeText={handleSearch}
                        autoCapitalize="none"
                        autoCorrect={false}
                    />
                    {searchText.trim() > 0 && (
                        <TouchableOpacity onPress={() => handleSearch('')}>
                            <Feather
                                name="x"
                                size={moderateScale(16)}
                                color={black.third}
                            />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    // 网格布局渲染
    const renderGridItem = ({ item }) => {
        return <ClubItem data={item} />;
    };

    if (isLoading) {
        return (
            <View style={{ flex: 1, backgroundColor: bg_color, alignItems: 'center', justifyContent: 'center' }}>
                <Loading />
            </View>
        );
    }

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            {/* 搜索栏 */}
            {renderSearchBar()}

            {/* 筛选标签 */}
            {renderFilterTags()}

            {/* 社团列表 - 网格布局 */}
            <FlatList
                data={filteredClubDataList}
                keyExtractor={(item) => item._id}
                renderItem={renderGridItem}
                numColumns={3}
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
        </View>
    );
};

const styles = StyleSheet.create({
    searchContainer: {
        paddingHorizontal: scale(16),
        paddingVertical: scale(8),
        backgroundColor: 'transparent',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        borderRadius: scale(10),
        paddingHorizontal: scale(16),
        height: scale(44),
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    searchIcon: {
        marginRight: scale(8),
    },
    searchInput: {
        flex: 1,
        fontSize: moderateScale(14),
        height: '100%',
    },
    filterContainer: {
        backgroundColor: 'transparent',
        paddingHorizontal: scale(12),
        paddingVertical: scale(12),
    },
    filterContent: {
        gap: scale(8),
    },
    filterTag: {
        paddingHorizontal: scale(16),
        paddingVertical: scale(10),
        borderRadius: scale(16),
        borderWidth: 1,
        minHeight: scale(36),
        justifyContent: 'center',
        alignItems: 'center',
    },
    filterTagText: {
        fontSize: moderateScale(13),
        fontWeight: '500',
        lineHeight: moderateScale(16),
    },
    listContent: {
        paddingHorizontal: scale(16),
        paddingBottom: scale(20),
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    itemContainer: {
        width: ITEM_WIDTH,
        marginBottom: scale(16),
    },
    itemCard: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: scale(12),
        padding: scale(12),
        alignItems: 'center',
    },
    logoContainer: {
        marginBottom: scale(8),
    },
    logo: {
        width: scale(50),
        height: scale(50),
        borderRadius: scale(25),
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
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