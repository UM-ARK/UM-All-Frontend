import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, RefreshControl } from 'react-native';

import Header from '../../../../components/Header';
import EventCard from '../components/EventCard';
import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import { BASE_URI, BASE_HOST, GET } from '../../../../utils/pathMap';

import Toast from 'react-native-easy-toast';
import axios from 'axios';
import { scale } from 'react-native-size-matters';

const AllEvents = (props) => {
    const { theme } = useTheme();
    const { bg_color, white, black, viewShadow, themeColor } = theme;
    const styles = StyleSheet.create({
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

    const [dataPage, setDataPage] = useState(1);
    const toastRef = useRef(null);

    // 狀態管理
    const [eventData, setEventData] = useState(undefined);
    const [noMoreData, setNoMoreData] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [clubNum, setClubNum] = useState(undefined);

    // componentDidMount
    useEffect(() => {
        let params = props.route.params;
        // 由社團詳情頁跳轉
        if (params.clubData) {
            let clubData = params.clubData;
            setClubNum(clubData.club_num);
            getEventData(clubData.club_num);
        }
        // componentWillUnmount
        return () => {
            setDataPage(1);
        };
    }, []);

    useEffect(() => {
        if (dataPage === 1) return;
        if (isLoading) return;
        if (noMoreData) return;
        getEventData(clubNum);
    }, [dataPage]);


    const getEventData = async (club_num) => {
        let URL = BASE_URI + GET.EVENT_INFO_CLUB_NUM_P;
        let num_of_item = 10;
        try {
            const res = await axios.get(URL, {
                params: {
                    club_num,
                    num_of_item,
                    page: dataPage,
                },
            });
            let json = res.data;
            if (json.message === 'success') {
                let newDataArr = json.content;
                newDataArr.forEach(itm => {
                    itm.cover_image_url = BASE_HOST + itm.cover_image_url;
                });
                if (newDataArr.length < num_of_item) {
                    setNoMoreData(true);
                } else {
                    setNoMoreData(false);
                }
                if (dataPage === 1) {
                    setEventData(newDataArr);
                } else if (eventData && eventData.length > 0) {
                    const tempArr = eventData.concat(newDataArr);
                    setEventData(tempArr);
                }
            } else if (json.code === '2') {
                alert('已無更多數據');
                setNoMoreData(true);
            }
        } catch (err) {
            console.log('err', err);
        } finally {
            setIsLoading(false);
        }
    };

    // 載入更多
    const loadMoreData = () => {
        toastRef.current && toastRef.current.show(`Data is Loading...`, 2000);
        setDataPage(prev => prev + 1);
    };

    // 載入更多View
    const renderLoadMoreView = useCallback(() => (
        <View style={{
            justifyContent: 'center',
            alignItems: 'center',
            marginTop: scale(10),
            marginBottom: scale(50),
        }}>
            {noMoreData ? (
                <View style={{ alignItems: 'center' }}>
                    <Text style={{ ...uiStyle.defaultText, color: black.third }}>
                        沒有更多活動了，過一段時間再來吧~
                    </Text>
                    <Text style={{ ...uiStyle.defaultText, }}>[]~(￣▽￣)~*</Text>
                </View>
            ) : (
                <TouchableOpacity
                    style={styles.loadMore}
                    activeOpacity={0.8}
                    onPress={loadMoreData}>
                    <Text style={{ ...uiStyle.defaultText, color: white, fontSize: scale(14) }}>
                        Load More
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    ), [noMoreData]);

    // 活動列表渲染
    const renderEvent = useCallback(() => (
        eventData !== undefined && eventData.length > 0 && (
            <FlatList
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'center' }}
                data={eventData}
                renderItem={({ item }) => (
                    <EventCard
                        data={item}
                        style={{
                            marginVertical: scale(8),
                            marginHorizontal: scale(4),
                        }}
                    />
                )}
                keyExtractor={item => item.event_id?.toString() || Math.random().toString()}
                ListFooterComponent={renderLoadMoreView}
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isLoading}
                        onRefresh={() => {
                            toastRef.current && toastRef.current.show(`Data is Loading...`, 2000);
                            setIsLoading(true);
                            if (dataPage > 1) setDataPage(1);
                            setTimeout(() => {
                                getEventData(clubNum);
                            }, 100);
                        }}
                    />
                }
            />
        )
    ), [eventData, isLoading, clubNum, getEventData, renderLoadMoreView]);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            <Header title={'所有活動查看'} />
            {/* 渲染所有活動 */}
            {renderEvent()}

            {/* Toast */}
            <Toast
                ref={toastRef}
                position="top"
                positionValue={'10%'}
                textStyle={{ color: white }}
                style={{
                    backgroundColor: themeColor,
                    borderRadius: scale(10),
                }}
            />
        </View>
    );
};

export default AllEvents;
