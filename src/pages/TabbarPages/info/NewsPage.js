import React, {
    forwardRef,
    useState,
    useEffect,
    useRef,
    useContext,
    useCallback,
    useImperativeHandle,
    useMemo,
} from 'react';
import {
    View,
    Text,
    VirtualizedList,
    RefreshControl,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import NewsCard from './components/NewsCard';
import NewsListSkeleton from './components/NewsListSkeleton';

import { uiStyle, ThemeContext } from '../../../components/ThemeContext';
import { UM_API_NEWS, UM_API_TOKEN } from '../../../utils/pathMap';
import { trigger } from '../../../utils/trigger';

import { Image } from 'expo-image';
import { NavigationContext } from '@react-navigation/native';
import axios from 'axios';
import { useTranslation } from 'react-i18next';
import { scale, verticalScale } from 'react-native-size-matters';
import lodash from 'lodash';

// 整理需要返回的數據給renderItem
// 此處返回的數據會成為renderItem({item})獲取到的數據。。。
// 所以data數組需要在這裡引用一下
const getItem = (data, index) => {
    // data為VirtualizedList設置的data，index為當前渲染到的下標
    return data[index];
};

// 返回數據數組的長度
const getItemCount = data => {
    return data.length;
};

/**
 * 澳大新聞列表
 * @param {boolean} [hideSourceLabel=false] - 嵌入校園頁時隱藏列表內來源標註
 * @param {number} [contentTopInset=0] - 懸浮頁頭所需的列表頂部間距
 * @param {(offsetY: number) => void} [onScrollOffsetChange] - 列表滾動位置回調
 */
const NewsPage = forwardRef(function NewsPage(
    { hideSourceLabel = false, contentTopInset = 0, onScrollOffsetChange },
    ref,
) {
    const { theme } = useContext(ThemeContext);
    const { t, i18n } = useTranslation('common');
    const currentLanguage = i18n.resolvedLanguage || i18n.language;
    const { white, black, viewShadow, bg_color, themeColor, trueWhite, imagePlaceholder } = theme;
    const styles = StyleSheet.create({
        topNewsContainer: {
            borderRadius: scale(10),
            overflow: 'hidden',
            marginHorizontal: scale(8),
            marginVertical: verticalScale(5),
            height: verticalScale(200),
            backgroundColor: white,
            ...viewShadow,
        },
        topNewsOverlay: {
            position: 'absolute', // 【核心】脫離文檔流，覆蓋在 Image 上
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', // 50% 透明度的黑
            padding: verticalScale(15),
            justifyContent: 'flex-end',
        },
        topNewsPosition: {
            position: 'absolute',
            top: verticalScale(10),
            left: scale(15),
        },
        topNewsText: {
            ...uiStyle.defaultText,
            color: trueWhite,
            fontWeight: 'bold',
            fontSize: verticalScale(20),
        },
    });

    const navigation = useContext(NavigationContext);
    const virtualizedList = useRef(null);

    const [isLoading, setIsLoading] = useState(true);
    const [newsList, setNewsList] = useState([]);
    const [topNews, setTopNews] = useState({});

    useImperativeHandle(
        ref,
        () => ({
            scrollToTop: () => {
                if (virtualizedList.current?.scrollToOffset) {
                    virtualizedList.current.scrollToOffset({
                        offset: 0,
                        animated: true,
                    });
                } else {
                    virtualizedList.current?.scrollTo({
                        x: 0,
                        y: 0,
                        animated: true,
                    });
                }
            },
        }),
        [],
    );

    // VirtualizedList 列寬有時不撐滿，外層需固定寬度 NewsCard 內層才能正確留白
    const renderNewsItem = useCallback(
        ({ item }) => (
            <View style={{ width: '100%' }}>
                <NewsCard data={item} language={currentLanguage} />
            </View>
        ),
        [currentLanguage],
    );

    const handleScroll = useCallback(
        e => {
            onScrollOffsetChange?.(e.nativeEvent.contentOffset.y);
        },
        [onScrollOffsetChange],
    );

    // 請求澳大新聞API
    useEffect(() => {
        getData();
    }, []);

    // 請求澳大api返回新聞數據
    const getData = async () => {
        try {
            const res = await axios.get(UM_API_NEWS, {
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
            });
            const result = res.data._embedded;

            // 有時會沒有圖片imageUrls數組，所以只選擇有圖的新聞作為頭條
            let chooseTopNewsIndex = 0;
            while (true) {
                if ('imageUrls' in result[chooseTopNewsIndex].common) {
                    // 有圖
                    break;
                } else {
                    // 沒圖
                    chooseTopNewsIndex++;
                }
            }

            // 頭條指定為當天最新的、有圖的新聞
            const topNewsData = result[chooseTopNewsIndex];
            result.splice(chooseTopNewsIndex, 1); // 刪除數組中頭條新聞的數據，剩下的全部渲染到新聞列表

            // 非頭條的新聞渲染進新聞列表，過濾某些沒有detail的數據
            const filteredNewsList = result.filter(item => item.details.length > 0);

            setTopNews(topNewsData);
            setNewsList(filteredNewsList);
            setTimeout(() => {
                setIsLoading(false);
            }, 100);
        } catch (error) {
            if (error.code == 'ERR_NETWORK' || error.code == 'ECONNABORTED') {
                setIsLoading(true);
            } else {
                alert('澳大新聞頁，未知錯誤，請聯繫開發者！');
            }
        }
    };

    const topNewsContent = useMemo(() => {
        const titleLocale = currentLanguage === 'tc' ? 'zh_TW' : 'en_US';
        const title =
            topNews.details?.find(item => item.locale === titleLocale)?.title ||
            '';

        return { title };
    }, [currentLanguage, topNews]);

    // 多圖時隨機取一張；依頭條 id 固定，避免語言切換或重渲染時換圖
    const topNewsImage = useMemo(() => {
        const imageUrls = topNews.common?.imageUrls || [];
        if (imageUrls.length === 0) {
            return null;
        }
        const picked =
            imageUrls.length > 1 ? lodash.sample(imageUrls) : imageUrls[0];
        return typeof picked === 'string'
            ? picked.replace('http:', 'https:')
            : null;
    }, [topNews?._id, topNews.common?.imageUrls]);

    // 頭條新聞的渲染
    const renderTopNews = useMemo(() => {
        const { title } = topNewsContent;

        return (
            <View style={{ marginTop: verticalScale(5) }}>
                {hideSourceLabel ? null : (
                    <Text style={{ ...uiStyle.defaultText, color: black.third, alignSelf: 'center' }}>
                        Data From: data.um.edu.mo
                    </Text>
                )}
                <View style={styles.topNewsContainer}>
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={{ width: '100%', height: '100%' }}
                        onPress={() => {
                            trigger();
                            navigation.navigate('NewsDetail', { data: topNews });
                        }}>
                        <Image
                            source={topNewsImage ? { uri: topNewsImage } : null}
                            style={{ width: '100%', height: '100%' }}
                            contentFit="cover"
                            cachePolicy="memory-disk"
                            recyclingKey={topNews?._id || 'top-news'}
                            placeholder={imagePlaceholder}
                            placeholderContentFit="cover"
                            transition={200}
                            priority="high"
                        />
                        {/* 塗上50%透明度的黑，讓白色字體能看清 */}
                        <View style={styles.topNewsOverlay}>
                            {/* Top Story字樣 */}
                            <View style={styles.topNewsPosition}>
                                <Text style={styles.topNewsText}>
                                    {t('澳大焦點')}
                                </Text>
                            </View>

                            {/* 標題 */}
                            <View style={{
                                alignSelf: 'center',
                                justifyContent: 'center',
                                width: '100%',
                            }}>
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: trueWhite,
                                    fontWeight: 'bold',
                                    fontSize: verticalScale(18),
                                }}
                                    numberOfLines={3}>
                                    {title}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>
                </View>
            </View >
        );
    }, [topNews, hideSourceLabel, topNewsContent, topNewsImage, imagePlaceholder, black.third, navigation, styles.topNewsContainer, styles.topNewsOverlay, styles.topNewsPosition, styles.topNewsText, t, trueWhite]);

    return (
        <View style={{
            flex: 1,
            justifyContent: 'center',
            // 勿用 alignItems: 'center'：橫向不拉伸會讓 VirtualizedList 列寬塌縮，
            // NewsCard 內 row 的 flex:1 文字欄變成極窄直排
            alignItems: 'stretch',
            backgroundColor: bg_color,
        }}>
            {/* 懸浮可拖動按鈕 */}
            {/* {isLoading ? null : renderGoTopButton()} */}

            {isLoading ? (
                <NewsListSkeleton
                    showTopNews
                    contentTopInset={contentTopInset}
                />
            ) : (
                <View style={{ flex: 1, width: '100%' }}>
                    <VirtualizedList
                        data={newsList}
                        ref={virtualizedList}
                        style={{ flex: 1, width: '100%' }}
                        contentInsetAdjustmentBehavior="automatic"
                        onScroll={handleScroll}
                        scrollEventThrottle={16}
                        // 初始渲染的元素，設置為剛好覆蓋屏幕
                        initialNumToRender={4}
                        windowSize={8}
                        maxToRenderPerBatch={8}
                        updateCellsBatchingPeriod={50}
                        renderItem={renderNewsItem}
                        contentContainerStyle={{
                            width: '100%',
                            paddingTop: contentTopInset,
                        }}
                        keyExtractor={item => item._id}
                        // 整理item數據
                        getItem={getItem}
                        // 渲染項目數量
                        getItemCount={getItemCount}
                        // 列表頭部渲染的組件 - 頭條新聞
                        ListHeaderComponent={renderTopNews}
                        refreshControl={
                            <RefreshControl
                                colors={[themeColor]}
                                tintColor={themeColor}
                                refreshing={isLoading}
                                onRefresh={() => {
                                    // 展示Loading標識
                                    setIsLoading(true);
                                    // setImgLoading(true);
                                    getData();
                                }}
                            />
                        }
                        directionalLockEnabled
                        alwaysBounceHorizontal={false}
                        removeClippedSubviews
                    />
                </View>
            )}
        </View>
    );
});

export default NewsPage;
