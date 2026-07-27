import React, {
    useState,
    useEffect,
    forwardRef,
    useImperativeHandle,
    useRef,
    useCallback,
    useMemo,
    memo,
} from 'react';
import {
    Text,
    View,
    StyleSheet,
    FlatList,
    Pressable,
    ActivityIndicator,
    useWindowDimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Image } from 'expo-image';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import {
    BASE_URI,
    BASE_HOST,
    GET,
    ARK_HARBOR_LATEST,
    ARK_HARBOR_AVATAR,
} from '../../../../utils/pathMap';
import { trigger } from '../../../../utils/trigger';
import EventCard from '../components/EventCard';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';

import axios from 'axios';
import Toast from 'react-native-simple-toast';
import moment from 'moment-timezone';
import { scale, verticalScale } from 'react-native-size-matters';
import TouchableScale from '../../../../components/TouchableScale';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import lodash from 'lodash';

const PAGE_SIZE = 10;
const REQUEST_TIMEOUT = 8000;
const RETRY_DELAY = 600;
const MIN_LOADING_DURATION = 500;
const SKELETON_BORDER_RADIUS = scale(8);

// 各欄骨架卡配置，模擬活動卡與 Harbor 卡交錯的瀑布流高度
const SKELETON_COLUMN_VARIANTS = [
    [
        { kind: 'event', imageRatio: 1, titleWidth: '88%' },
        { kind: 'harbor', excerptHeight: verticalScale(72) },
        { kind: 'event', imageRatio: 0.78, titleWidth: '72%' },
    ],
    [
        { kind: 'harbor', excerptHeight: verticalScale(56) },
        { kind: 'event', imageRatio: 1, titleWidth: '84%' },
        { kind: 'event', imageRatio: 0.9, titleWidth: '64%' },
    ],
    [
        { kind: 'event', imageRatio: 0.86, titleWidth: '80%' },
        { kind: 'harbor', excerptHeight: verticalScale(84) },
        { kind: 'event', imageRatio: 1, titleWidth: '70%' },
    ],
];

const EventSkeletonCard = ({ cardWidth, imageRatio, titleWidth }) => {
    const { theme } = useTheme();
    const { white, tonal } = theme;
    const imageHeight = cardWidth * imageRatio;

    return (
        <View
            style={{
                backgroundColor: white,
                borderRadius: SKELETON_BORDER_RADIUS,
                margin: scale(5),
                width: cardWidth,
                overflow: 'hidden',
            }}>
            <View
                style={{
                    width: cardWidth,
                    height: imageHeight,
                    backgroundColor: tonal.primary15,
                }}
            />
            <View style={{ padding: scale(8) }}>
                <View
                    style={{
                        height: verticalScale(11),
                        width: titleWidth,
                        borderRadius: scale(4),
                        backgroundColor: tonal.primary15,
                    }}
                />
                <View
                    style={{
                        marginTop: verticalScale(6),
                        height: verticalScale(11),
                        width: '62%',
                        borderRadius: scale(4),
                        backgroundColor: tonal.primary08,
                    }}
                />
                <View
                    style={{
                        marginTop: verticalScale(10),
                        height: verticalScale(9),
                        width: '38%',
                        borderRadius: scale(4),
                        backgroundColor: tonal.primary08,
                    }}
                />
            </View>
        </View>
    );
};

const HarborSkeletonCard = ({ cardWidth, excerptHeight }) => {
    const { theme } = useTheme();
    const { white, tonal } = theme;

    return (
        <View
            style={{
                backgroundColor: tonal.primary15,
                borderRadius: SKELETON_BORDER_RADIUS,
                margin: scale(5),
                width: cardWidth,
                overflow: 'hidden',
            }}>
            <View
                style={{
                    marginTop: verticalScale(13),
                    marginHorizontal: scale(8),
                    marginBottom: verticalScale(8),
                }}>
                <View
                    style={{
                        height: excerptHeight,
                        borderRadius: scale(4),
                        backgroundColor: tonal.primary08,
                    }}
                />
            </View>
            <View
                style={{
                    backgroundColor: white,
                    paddingTop: verticalScale(8),
                    paddingBottom: verticalScale(10),
                    paddingHorizontal: scale(8),
                    borderBottomStartRadius: SKELETON_BORDER_RADIUS,
                    borderBottomEndRadius: SKELETON_BORDER_RADIUS,
                }}>
                <View
                    style={{
                        height: verticalScale(11),
                        width: '86%',
                        borderRadius: scale(4),
                        backgroundColor: tonal.primary15,
                    }}
                />
                <View
                    style={{
                        marginTop: verticalScale(6),
                        height: verticalScale(11),
                        width: '58%',
                        borderRadius: scale(4),
                        backgroundColor: tonal.primary08,
                    }}
                />
                <View
                    style={{
                        marginTop: verticalScale(10),
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                    <View
                        style={{
                            width: verticalScale(12),
                            height: verticalScale(12),
                            borderRadius: scale(50),
                            backgroundColor: tonal.primary15,
                        }}
                    />
                    <View
                        style={{
                            height: verticalScale(8),
                            width: '28%',
                            borderRadius: scale(4),
                            backgroundColor: tonal.primary08,
                        }}
                    />
                </View>
            </View>
        </View>
    );
};

const wait = duration => new Promise(resolve => setTimeout(resolve, duration));

const isCanceledRequest = (error, signal) => {
    return signal?.aborted || error?.code === 'ERR_CANCELED' || axios.isCancel(error);
};

const requestWithRetry = async (request, signal, retries = 1) => {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
        if (signal?.aborted) {
            const canceledError = new Error('Request canceled');
            canceledError.code = 'ERR_CANCELED';
            throw canceledError;
        }

        try {
            return await request();
        } catch (error) {
            if (isCanceledRequest(error, signal)) {
                throw error;
            }

            lastError = error;
            if (attempt < retries) {
                await wait(RETRY_DELAY);
            }
        }
    }

    throw lastError;
};

const normalizeEvent = item => {
    if (!item || typeof item.cover_image_url !== 'string') {
        return item;
    }

    const isAbsoluteUrl = /^https?:\/\//i.test(item.cover_image_url);
    return {
        ...item,
        cover_image_url: isAbsoluteUrl
            ? item.cover_image_url
            : BASE_HOST + item.cover_image_url,
    };
};

const getEventKey = item => {
    return item?._id || item?.id || `${item?.title}-${item?.startdatetime}`;
};

const orderEventList = eventList => {
    const uniqueEvents = lodash.uniqBy(
        eventList.filter(Boolean).map(normalizeEvent),
        getEventKey,
    );
    const now = moment();
    const activeEvents = [];
    const finishedEvents = [];

    uniqueEvents.forEach(item => {
        if (item?.enddatetime && now.isBefore(moment(item.enddatetime))) {
            activeEvents.push(item);
        } else {
            finishedEvents.push(item);
        }
    });

    return activeEvents.concat(finishedEvents);
};

const interleaveColumn = (events, harborTopics, harborFirst) => {
    const result = [];
    const itemCount = Math.max(events.length, harborTopics.length);

    for (let index = 0; index < itemCount; index++) {
        if (harborFirst && harborTopics[index]) {
            result.push(harborTopics[index]);
        }
        if (events[index]) {
            result.push(events[index]);
        }
        if (!harborFirst && harborTopics[index]) {
            result.push(harborTopics[index]);
        }
    }

    return result;
};

const buildColumns = (eventList, harborList, numColumns) => {
    const eventColumns = Array.from({ length: numColumns }, () => []);
    const harborColumns = Array.from({ length: numColumns }, () => []);

    eventList.forEach((item, index) => {
        eventColumns[index % numColumns].push(item);
    });
    harborList.forEach((item, index) => {
        harborColumns[index % numColumns].push(item);
    });

    return eventColumns.map((events, index) => {
        return interleaveColumn(events, harborColumns[index], index % 2 === 0);
    });
};

const fetchEventPage = async (page, signal) => {
    const response = await requestWithRetry(
        () => axios.get(BASE_URI + GET.EVENT_INFO_ALL, {
            params: {
                num_of_item: PAGE_SIZE,
                page,
            },
            signal,
            timeout: REQUEST_TIMEOUT,
        }),
        signal,
    );
    const json = response.data;

    if (json?.message === 'success') {
        const items = Array.isArray(json.content) ? json.content : [];
        return {
            items,
            hasMore: items.length >= PAGE_SIZE,
        };
    }
    if (String(json?.code) === '2') {
        return { items: [], hasMore: false };
    }

    throw new Error('Invalid event response');
};

const fetchHarborTopics = async signal => {
    const response = await requestWithRetry(
        () => axios.get(ARK_HARBOR_LATEST, {
            signal,
            timeout: REQUEST_TIMEOUT,
        }),
        signal,
    );
    const topics = response.data?.topic_list?.topics;

    if (!Array.isArray(topics)) {
        throw new Error('Invalid Harbor response');
    }

    const visibleTopics = topics.filter(item => item?.pinned === false);
    const sampledTopics = lodash.sampleSize(visibleTopics, 12);
    return lodash.uniqBy(
        lodash.shuffle(sampledTopics).map(item => ({ ...item, type: 'harbor' })),
        'id',
    );
};

const EventPage = forwardRef((props, ref) => {
    const navigation = useNavigation();
    const { theme } = useTheme();
    const { black, white, themeColor, viewShadow, bg_color } = theme;
    const s = StyleSheet.create({
        waterFlowContainer: {
            flexDirection: 'row',
            width: '100%',
            backgroundColor: bg_color,
            alignItems: 'flex-start',
            // 以內容寬度置中，避免 flex:1 把多餘空白擠到兩欄中間
            justifyContent: 'center',
        },
        loadMore: {
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: themeColor,
            paddingHorizontal: scale(10),
            paddingVertical: scale(10),
            borderRadius: scale(15),
            marginBottom: scale(5),
            ...viewShadow,
        },
    });

    const [eventRawList, setEventRawList] = useState([]);
    const [harborData, setHarborData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [noMoreData, setNoMoreData] = useState(true);
    const [numColumns, setNumColumns] = useState(2);
    const [cardWidth, setCardWidth] = useState(scale(160));
    const windowLayout = useWindowDimensions();
    const pageRef = useRef(1);
    const requestGenerationRef = useRef(0);
    const firstPageControllerRef = useRef(null);
    const loadMoreControllerRef = useRef(null);
    const loadingMoreRef = useRef(false);

    const columnsData = useMemo(
        () => buildColumns(eventRawList, harborData, numColumns),
        [eventRawList, harborData, numColumns],
    );

    // 監聽螢幕尺寸，依據橫豎屏調整瀑布列數與卡片寬度
    useEffect(() => {
        const isLandscape = windowLayout.width > windowLayout.height;
        const targetColumns = isLandscape ? 3 : 2; // 橫屏擴充三列，豎屏維持兩列
        const gap = scale(10); // 欄間距，留白避免擁擠
        const safeWidth = Math.max(windowLayout.width, 320);
        const computedWidth = (safeWidth - gap * (targetColumns + 1)) / targetColumns;
        setNumColumns(targetColumns);
        // 卡片寬度加上上下限，避免極端螢幕尺寸過窄/過寬
        setCardWidth(Math.min(Math.max(computedWidth, scale(140)), scale(220)));
    }, [windowLayout.height, windowLayout.width]);

    const loadFirstPage = useCallback(async () => {
        const requestGeneration = ++requestGenerationRef.current;
        firstPageControllerRef.current?.abort();
        loadMoreControllerRef.current?.abort();

        const controller = new AbortController();
        firstPageControllerRef.current = controller;
        loadingMoreRef.current = false;
        setIsLoadingMore(false);
        setIsLoading(true);

        try {
            const [eventResult, harborResult] = await Promise.allSettled([
                fetchEventPage(1, controller.signal),
                fetchHarborTopics(controller.signal),
                wait(MIN_LOADING_DURATION),
            ]);

            if (
                controller.signal.aborted ||
                requestGeneration !== requestGenerationRef.current
            ) {
                return;
            }

            if (eventResult.status === 'fulfilled') {
                pageRef.current = 1;
                setEventRawList(orderEventList(eventResult.value.items));
                setNoMoreData(!eventResult.value.hasMore);
            }
            if (harborResult.status === 'fulfilled') {
                setHarborData(harborResult.value);
            }

            const failedCount = [eventResult, harborResult]
                .filter(result => result.status === 'rejected')
                .length;
            if (failedCount === 2) {
                Toast.show('活動資料載入失敗，請檢查網絡後再試');
            } else if (failedCount === 1) {
                Toast.show('部分活動資料載入失敗，請稍後下拉刷新');
            }
        } finally {
            if (requestGeneration === requestGenerationRef.current) {
                setIsLoading(false);
                firstPageControllerRef.current = null;
            }
        }
    }, []);

    const loadMoreData = useCallback(async () => {
        trigger();
        if (isLoading || noMoreData || loadingMoreRef.current) {
            return;
        }

        loadingMoreRef.current = true;
        setIsLoadingMore(true);
        const requestGeneration = requestGenerationRef.current;
        const nextPage = pageRef.current + 1;
        const controller = new AbortController();
        loadMoreControllerRef.current = controller;

        try {
            const result = await fetchEventPage(nextPage, controller.signal);
            if (
                controller.signal.aborted ||
                requestGeneration !== requestGenerationRef.current
            ) {
                return;
            }

            pageRef.current = nextPage;
            setEventRawList(previous => {
                return orderEventList(previous.concat(result.items));
            });
            setNoMoreData(!result.hasMore);
        } catch (error) {
            if (!isCanceledRequest(error, controller.signal)) {
                Toast.show('更多活動載入失敗，請稍後再試');
            }
        } finally {
            if (requestGeneration === requestGenerationRef.current) {
                loadingMoreRef.current = false;
                setIsLoadingMore(false);
                loadMoreControllerRef.current = null;
            }
        }
    }, [isLoading, noMoreData]);

    const onRefresh = useCallback(async () => {
        trigger();
        await loadFirstPage();
    }, [loadFirstPage]);

    const handleHarborTopicPress = useCallback(item => {
        trigger();
        logToFirebase('clickHarbor', {
            title: item.title,
            mode: 'app',
        });

        // TODO: 日後在此擴充其他 Harbor Card 類型的 App 內跳轉邏輯。
        navigation.navigate('HarborTopicDetail', {
            topicId: item.id,
            topicTitle: item.unicode_title || item.title,
        });
    }, [navigation]);

    useImperativeHandle(ref, () => ({
        getNoMoreData: () => noMoreData,
        loadMoreData,
        onRefresh,
    }), [loadMoreData, noMoreData, onRefresh]);

    // 首次載入時同步等待兩個資料來源，避免只提交其中一份資料
    useEffect(() => {
        loadFirstPage();

        return () => {
            requestGenerationRef.current += 1;
            firstPageControllerRef.current?.abort();
            loadMoreControllerRef.current?.abort();
        };
    }, [loadFirstPage]);

    const renderLoadMoreView = () => {
        if (eventRawList.length === 0) {
            return null;
        }

        return (
            <View
                style={{
                    justifyContent: 'center', alignItems: 'center',
                    marginTop: scale(10), marginBottom: scale(20),
                }}>
                {isLoadingMore ? (
                    <ActivityIndicator size="small" color={themeColor} />
                ) : noMoreData ? (
                    <View style={{ alignItems: 'center' }}>
                        <Text style={{ ...uiStyle.defaultText, color: black.third, textAlign: 'center', fontSize: scale(12) }}>
                            恭喜你，達成『刨根問底』成就~
                        </Text>
                        <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>[]~(￣▽￣)~*</Text>
                    </View>
                ) : (
                    <Pressable
                        style={({ pressed }) => [s.loadMore, pressed && { opacity: 0.8 }]}
                        onPress={loadMoreData}>
                        <Text style={{ ...uiStyle.defaultText, color: white, fontSize: scale(14) }}>
                            Load More
                        </Text>
                    </Pressable>
                )}
            </View>
        );
    };

    const renderOneList = (dataList) => {
        return (<View>
            <FlatList
                data={dataList}
                renderItem={({ item }) => {
                    if (item.type === 'harbor') {
                        if (item.pinned === false) {
                            return renderHarborMessage(item);
                        }
                    } else {
                        return <EventCard data={item} cardWidth={cardWidth} />;
                    }
                }}
                scrollEnabled={false}
                keyExtractor={(item, index) => {
                    const prefix = item.type === 'harbor' ? 'harbor' : 'event';
                    return `${prefix}-${item.id || item._id || index}-${index}`;
                }}
            />
        </View>);
    };

    // 渲染主要內容
    const renderPage = () => {
        const columnsToRender = columnsData.length > 0 ? columnsData : Array.from({ length: numColumns }, () => []);
        return (
            <View style={s.waterFlowContainer}>
                {columnsToRender.map((col, idx) => (
                    <View key={`water-col-${idx}`} style={{ alignItems: 'center' }}>
                        {col.length > 0 ? (
                            renderOneList(col)
                        ) : null}
                    </View>
                ))}
            </View>
        );
    };

    // 首頁載入骨架：模擬活動卡與 Harbor 卡交錯的瀑布流
    const renderSkeletonPage = () => (
        <View style={s.waterFlowContainer}>
            {Array.from({ length: numColumns }, (_, columnIndex) => {
                const variants =
                    SKELETON_COLUMN_VARIANTS[columnIndex] ||
                    SKELETON_COLUMN_VARIANTS[0];
                return (
                    <View
                        key={`skeleton-col-${columnIndex}`}
                        style={{ alignItems: 'center' }}>
                        {variants.map((item, itemIndex) =>
                            item.kind === 'harbor' ? (
                                <HarborSkeletonCard
                                    key={`skeleton-harbor-${columnIndex}-${itemIndex}`}
                                    cardWidth={cardWidth}
                                    excerptHeight={item.excerptHeight}
                                />
                            ) : (
                                <EventSkeletonCard
                                    key={`skeleton-event-${columnIndex}-${itemIndex}`}
                                    cardWidth={cardWidth}
                                    imageRatio={item.imageRatio}
                                    titleWidth={item.titleWidth}
                                />
                            ),
                        )}
                    </View>
                );
            })}
        </View>
    );

    // 渲染harbor的消息
    const renderHarborMessage = (item) => {
        // unicode_title    直接返回對應的Emoji
        // title            例如:heart_eyes:以字符串形式返回
        // excerpt          主題內容
        // id               主題ID
        // like_count       點讚數
        // highest_post_number 回復數
        // views            瀏覽數
        // pinned           是否置頂
        const pinColor = black.third;
        const cleanExcerpt = item.excerpt ? item.excerpt.replace(/:[a-zA-Z0-9_+-]+:/g, '') : '';
        const borderRadius = scale(8);
        const borderTopRadiusStyle = item.excerpt ? null : {
            borderTopStartRadius: borderRadius, borderTopEndRadius: borderRadius,
        };

        return (
            <TouchableScale style={{
                backgroundColor: `${themeColor}15`,
                borderRadius,
                margin: scale(5),
                width: cardWidth,
                alignItems: 'flex-start', justifyContent: 'center',
            }}
                onPress={() => handleHarborTopicPress(item)}
            >
                {/* 帖子內容 */}
                {item.excerpt && (
                    <View style={{
                        marginTop: verticalScale(13), marginHorizontal: scale(8),
                        paddingHorizontal: verticalScale(5), paddingBottom: verticalScale(5),
                    }}>
                        <Text style={{
                            ...uiStyle.defaultText, fontSize: verticalScale(10), color: themeColor,
                            lineHeight: verticalScale(16),
                        }} numberOfLines={5}>
                            {cleanExcerpt}
                        </Text>
                    </View>
                )}

                <View style={{
                    marginTop: item.excerpt ? verticalScale(5) : null,
                    paddingTop: verticalScale(5),
                    backgroundColor: white,
                    paddingBottom: verticalScale(10), paddingHorizontal: scale(8),
                    borderBottomEndRadius: borderRadius, borderBottomStartRadius: borderRadius,
                    ...borderTopRadiusStyle,
                }}>
                    {/* 帖子標題 */}
                    <Text style={{
                        ...uiStyle.defaultText, fontWeight: '500', fontSize: verticalScale(11), color: black.second,
                        textAlign: 'left',
                        lineHeight: verticalScale(16),
                    }} numberOfLines={4}>
                        {item.unicode_title ? item.unicode_title : item.title}
                    </Text>

                    {/* 底部Pin */}
                    <View style={{
                        marginTop: verticalScale(5),
                        flexDirection: 'row', width: '100%',
                        alignItems: 'center', justifyContent: 'space-between',
                    }}>
                        {/* 用戶頭像 */}
                        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start' }}>
                            <Image
                                source={{ uri: ARK_HARBOR_AVATAR(item.last_poster_username) }}
                                style={{
                                    width: verticalScale(12), height: verticalScale(12),
                                    borderRadius: scale(50),
                                    backgroundColor: white,
                                }}
                                contentFit="cover"
                            />
                            <Text style={{
                                marginLeft: scale(2), ...uiStyle.defaultText, color: black.third,
                                fontSize: verticalScale(8), fontStyle: 'italic',
                                flexShrink: 1, textAlign: 'left',
                            }} numberOfLines={1}>
                                {item.last_poster_username}
                            </Text>
                        </View>

                        {/* 點讚等資訊 */}
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' }}>
                            {/* 點讚數 回復數 瀏覽數 */}
                            <View style={{ flexDirection: 'row' }}>
                                {item?.like_count > 0 && (
                                    <View style={{
                                        marginLeft: scale(5),
                                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
                                    }}>
                                        <MaterialCommunityIcons name="thumb-up-outline" size={verticalScale(10)} color={pinColor} style={{ marginRight: scale(1) }} />
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(8), color: pinColor }}>
                                            {item.like_count}
                                        </Text>
                                    </View>
                                )}

                                {item?.highest_post_number > 1 && (
                                    <View style={{
                                        marginLeft: scale(5),
                                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
                                    }}>
                                        <MaterialCommunityIcons name="comment-outline" size={verticalScale(10)} color={pinColor} style={{ marginRight: scale(1) }} />
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(8), color: pinColor }}>
                                            {item.highest_post_number}
                                        </Text>
                                    </View>
                                )}

                                {item?.views > 0 && (
                                    <View style={{
                                        marginLeft: scale(5),
                                        alignItems: 'center', justifyContent: 'center', flexDirection: 'row',
                                    }}>
                                        <MaterialCommunityIcons name="eye-outline" size={verticalScale(10)} color={pinColor} style={{ marginRight: scale(1) }} />
                                        <Text style={{ ...uiStyle.defaultText, fontSize: verticalScale(8), color: pinColor }}>
                                            {item.views}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    </View>
                </View>

            </TouchableScale>
        );
    };

    return (
        <View style={{ ...props.style }}>
            {isLoading ? (
                renderSkeletonPage()
            ) : columnsData.some(col => col.length > 0) ? (
                <View>
                    {renderPage()}
                    {renderLoadMoreView()}
                </View>
            ) : (
                <Text style={{
                    ...uiStyle.defaultText,
                    color: black.third,
                    marginVertical: verticalScale(20),
                }}>
                    活動資料暫時無法載入，請下拉刷新
                </Text>
            )}
        </View>
    );
});

export default memo(EventPage);
