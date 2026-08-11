// 車位訊息
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {
    Alert,
    RefreshControl,
    ScrollView,
    StyleSheet,
    View,
} from 'react-native';
import MaterialCommunityIcons from "@react-native-vector-icons/material-design-icons";
import axios from 'axios';
import moment from 'moment-timezone';
import {
    moderateScale,
    scale,
    verticalScale,
} from 'react-native-size-matters';

import Text from '../../components/AppText';
import SegmentControl from '../../components/SegmentControl';
import {uiStyle, useTheme} from '../../components/ThemeContext';
import {UM_API_CAR_PARK, UM_API_TOKEN} from '../../utils/pathMap';
import {trigger} from '../../utils/trigger';

const CAR_PARK_SORT_VALUES = ['All', 'Staff', 'Monthly Pass', 'Visitor'];
const CAR_PARK_TYPE_VALUES = ['All', 'Light Vehicle', 'Motorcycle'];
const TIGHT_SPACE_THRESHOLD = 10;
const SKELETON_RECORD_COUNTS = [3, 2];

const CAR_PARK_LOCATIONS = {
    P6: 'S1–S2 研究生宿舍及 S8 薈萃坊',
    P5: 'E2 伍宜孫圖書館及 E3–E7 中央教學樓',
    P3: 'N1 聚賢樓及 N2 大學會堂',
    P2: 'N6 行政樓',
    P1: 'N8 澳大綜合體育館',
};

const getVehicleIcon = vehicleType =>
    vehicleType === 'Motorcycle' ? 'motorbike' : 'car-outline';

const CarParkSkeleton = ({styles}) => (
    <View style={styles.container}>
        <ScrollView
            contentContainerStyle={styles.contentContainer}
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
            scrollEnabled={false}>
            <View style={styles.updateCard}>
                <View style={styles.updateIcon} />
                <View style={styles.updateContent}>
                    <View style={[styles.skeletonUpdateBlock, styles.skeletonUpdateTitle]} />
                    <View style={[styles.skeletonUpdateBlock, styles.skeletonUpdateTime]} />
                    <View style={[styles.skeletonUpdateBlock, styles.skeletonUpdateSource]} />
                </View>
            </View>

            <View style={styles.filterCard}>
                <View style={styles.filterHeading}>
                    <View style={[styles.skeletonBlock, styles.skeletonFilterIcon]} />
                    <View style={[styles.skeletonBlock, styles.skeletonFilterTitle]} />
                </View>
                <View style={[styles.skeletonBlock, styles.skeletonFilterLabel]} />
                <View style={styles.skeletonSegmentControl}>
                    <View style={styles.skeletonSegmentSelected} />
                    <View style={styles.skeletonSegmentItem} />
                    <View style={styles.skeletonSegmentItemWide} />
                    <View style={styles.skeletonSegmentItem} />
                </View>
                <View style={[styles.skeletonBlock, styles.skeletonFilterLabel]} />
                <View style={styles.skeletonSegmentControl}>
                    <View style={styles.skeletonSegmentSelectedSecondary} />
                    <View style={styles.skeletonSegmentItemWide} />
                    <View style={styles.skeletonSegmentItemWide} />
                </View>
            </View>

            {SKELETON_RECORD_COUNTS.map((recordCount, cardIndex) => (
                <View
                    key={`car-park-skeleton-${cardIndex}`}
                    style={styles.carParkCard}>
                    <View style={styles.carParkHeader}>
                        <View style={styles.carParkCodeBadge}>
                            <View style={[styles.skeletonUpdateBlock, styles.skeletonParkIcon]} />
                            <View style={[styles.skeletonUpdateBlock, styles.skeletonParkCode]} />
                        </View>
                        <View style={styles.locationContent}>
                            <View style={[styles.skeletonBlock, styles.skeletonLocationLabel]} />
                            <View style={[styles.skeletonBlock, styles.skeletonLocationTitle]} />
                            <View style={[styles.skeletonBlock, styles.skeletonLocationTitleShort]} />
                        </View>
                    </View>
                    <View style={styles.recordsContainer}>
                        {Array.from({length: recordCount}, (_, recordIndex) => (
                            <View
                                key={`car-park-skeleton-${cardIndex}-record-${recordIndex}`}
                                style={[
                                    styles.recordRow,
                                    recordIndex < recordCount - 1 &&
                                        styles.recordDivider,
                                ]}>
                                <View style={styles.recordIdentity}>
                                    <View style={styles.vehicleIcon} />
                                    <View style={styles.recordLabels}>
                                        <View style={[styles.skeletonBlock, styles.skeletonRecordTitle]} />
                                        <View style={[styles.skeletonBlock, styles.skeletonRecordSubtitle]} />
                                    </View>
                                </View>
                                <View style={styles.availability}>
                                    <View style={[styles.skeletonBlock, styles.skeletonAvailableCount]} />
                                    <View style={[styles.skeletonBlock, styles.skeletonStatusBadge]} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            ))}
        </ScrollView>
    </View>
);

const CarPark = () => {
    const {theme} = useTheme();
    const styles = useMemo(() => getStyles(theme), [theme]);
    const {black, themeColor, secondThemeColor, bg_color} = theme;

    const [data, setData] = useState([]);
    const [sort, setSort] = useState('All');
    const [type, setType] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const sortOptions = useMemo(
        () => CAR_PARK_SORT_VALUES.map(value => ({
            key: value,
            label: value,
        })),
        [],
    );
    const typeOptions = useMemo(
        () => CAR_PARK_TYPE_VALUES.map(value => ({
            key: value,
            label: value,
        })),
        [],
    );

    const getData = useCallback(async () => {
        const macauTime = moment
            .tz(new Date(), 'Asia/Macau')
            .subtract(30, 'minutes')
            .format('YYYY-MM-DDTHH:mm:ss');

        try {
            const response = await axios.get(UM_API_CAR_PARK, {
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
                params: {date_from: macauTime},
            });
            const result = response.data?._embedded;

            setData(Array.isArray(result) ? result.slice(0, 5) : []);
        } catch (error) {
            console.error(error);
            Alert.alert(
                '未能更新車位資料',
                '請檢查網絡連線後下拉重新整理。',
                null,
                {cancelable: true},
            );
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        getData();
    }, [getData]);

    const filteredData = useMemo(
        () =>
            data
                .map(item => ({
                    ...item,
                    records: (item.records ?? []).filter(record => {
                        const matchesSort =
                            sort === 'All' || record.parkingType === sort;
                        const matchesType =
                            type === 'All' || record.vehicleType === type;

                        return matchesSort && matchesType;
                    }),
                }))
                .filter(item => item.records.length > 0),
        [data, sort, type],
    );

    const latestUpdateTime = data[0]?.recordDate
        ? moment
            .tz(data[0].recordDate, 'Asia/Macau')
            .format('YYYY/MM/DD HH:mm:ss')
        : null;

    const handleRefresh = useCallback(() => {
        trigger();
        setIsRefreshing(true);
        getData();
    }, [getData]);

    const renderParkingRecord = (record, index, recordCount) => {
        const availableSpaces = Number(record.noOfAvailableSpace) || 0;
        const isTight = availableSpaces <= TIGHT_SPACE_THRESHOLD;
        const statusColor = isTight ? theme.unread : theme.success;
        const statusBackground = isTight
            ? theme.tonal.unread15
            : theme.tonal.success15;

        return (
            <View
                key={`${record.parkingType}-${record.vehicleType}-${index}`}
                style={[
                    styles.recordRow,
                    index < recordCount - 1 && styles.recordDivider,
                ]}>
                <View style={styles.recordIdentity}>
                    <View style={styles.vehicleIcon}>
                        <MaterialCommunityIcons
                            name={getVehicleIcon(record.vehicleType)}
                            size={scale(20)}
                            color={secondThemeColor}
                        />
                    </View>
                    <View style={styles.recordLabels}>
                        <Text style={styles.parkingType} numberOfLines={1}>
                            {record.parkingType}
                        </Text>
                        <Text style={styles.vehicleType} numberOfLines={1}>
                            {record.vehicleType}
                        </Text>
                    </View>
                </View>

                <View style={styles.availability}>
                    <View style={styles.availableCountRow}>
                        <Text style={[styles.availableCount, {color: statusColor}]}>
                            {availableSpaces}
                        </Text>
                        <Text style={styles.availableUnit}>個</Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            {backgroundColor: statusBackground},
                        ]}>
                        <MaterialCommunityIcons
                            name={
                                isTight
                                    ? 'alert-circle-outline'
                                    : 'check-circle-outline'
                            }
                            size={scale(12)}
                            color={statusColor}
                        />
                        <Text style={[styles.statusText, {color: statusColor}]}>
                            {isTight ? '餘位緊張' : '尚有車位'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    if (isLoading) {
        return <CarParkSkeleton styles={styles} />;
    }

    return (
        <View style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                contentInsetAdjustmentBehavior="automatic"
                refreshControl={
                    <RefreshControl
                        colors={[themeColor]}
                        tintColor={themeColor}
                        refreshing={isRefreshing}
                        onRefresh={handleRefresh}
                    />
                }>
                <View style={styles.updateCard}>
                    <View style={styles.updateIcon}>
                        <MaterialCommunityIcons
                            name="database-clock-outline"
                            size={scale(22)}
                            color={themeColor}
                        />
                    </View>
                    <View style={styles.updateContent}>
                        <Text style={styles.updateTitle}>即時車位資料</Text>
                        <Text style={styles.updateTime}>
                            {latestUpdateTime
                                ? `更新於 ${latestUpdateTime}`
                                : '暫時沒有更新時間'}
                        </Text>
                        <Text style={styles.updateSource}>
                            資料來源：data.um.edu.mo
                        </Text>
                    </View>
                </View>

                <View style={styles.filterCard}>
                    <View style={styles.filterHeading}>
                        <MaterialCommunityIcons
                            name="filter-variant"
                            size={scale(19)}
                            color={black.second}
                        />
                        <Text style={styles.filterTitle}>篩選車位</Text>
                    </View>

                    <Text style={styles.filterLabel}>泊車身份</Text>
                    <SegmentControl
                        wrap
                        style={styles.segmentControl}
                        options={sortOptions}
                        selectedIndex={Math.max(
                            0,
                            CAR_PARK_SORT_VALUES.indexOf(sort),
                        )}
                        onChange={index =>
                            setSort(CAR_PARK_SORT_VALUES[index])
                        }
                        accentColor={themeColor}
                        trackBackgroundColor={bg_color}
                        fontSize={moderateScale(11)}
                    />

                    <Text style={styles.filterLabel}>車輛類型</Text>
                    <SegmentControl
                        wrap
                        style={styles.segmentControl}
                        options={typeOptions}
                        selectedIndex={Math.max(
                            0,
                            CAR_PARK_TYPE_VALUES.indexOf(type),
                        )}
                        onChange={index =>
                            setType(CAR_PARK_TYPE_VALUES[index])
                        }
                        accentColor={secondThemeColor}
                        trackBackgroundColor={bg_color}
                        fontSize={moderateScale(11)}
                    />
                </View>

                {filteredData.length > 0 ? (
                    filteredData.map((item, index) => (
                        <View
                            key={`${item.carParkCode}-${index}`}
                            style={styles.carParkCard}>
                            <View style={styles.carParkHeader}>
                                <View style={styles.carParkCodeBadge}>
                                    <MaterialCommunityIcons
                                        name="car-brake-parking"
                                        size={scale(20)}
                                        color={themeColor}
                                    />
                                    <Text style={styles.carParkCode}>
                                        {item.carParkCode}
                                    </Text>
                                </View>
                                <View style={styles.locationContent}>
                                    <View style={styles.locationTitleRow}>
                                        <MaterialCommunityIcons
                                            name="map-marker-outline"
                                            size={scale(15)}
                                            color={black.third}
                                        />
                                        <Text style={styles.locationTitle}>
                                            停車場位置
                                        </Text>
                                    </View>
                                    <Text style={styles.locationText}>
                                        {CAR_PARK_LOCATIONS[item.carParkCode] ??
                                            '澳門大學校園'}
                                    </Text>
                                </View>
                            </View>

                            <View style={styles.recordsContainer}>
                                {item.records.map((record, recordIndex) =>
                                    renderParkingRecord(
                                        record,
                                        recordIndex,
                                        item.records.length,
                                    ),
                                )}
                            </View>
                        </View>
                    ))
                ) : (
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyIcon}>
                            <MaterialCommunityIcons
                                name="car-off"
                                size={scale(30)}
                                color={themeColor}
                            />
                        </View>
                        <Text style={styles.emptyTitle}>沒有符合條件的車位</Text>
                        <Text style={styles.emptyDescription}>
                            請嘗試調整泊車身份或車輛類型篩選。
                        </Text>
                    </View>
                )}
            </ScrollView>
        </View>
    );
};

const getStyles = theme =>
    StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: theme.bg_color,
        },
        contentContainer: {
            paddingHorizontal: scale(14),
            paddingTop: verticalScale(10),
            paddingBottom: verticalScale(42),
        },
        updateCard: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: theme.tonal.primary15,
            borderRadius: scale(16),
            paddingHorizontal: scale(14),
            paddingVertical: verticalScale(13),
            marginBottom: verticalScale(12),
        },
        updateIcon: {
            width: scale(42),
            height: scale(42),
            borderRadius: scale(13),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.tonal.primary30,
            marginRight: scale(12),
        },
        updateContent: {
            flex: 1,
        },
        updateTitle: {
            ...uiStyle.defaultText,
            color: theme.black.main,
            fontSize: moderateScale(14),
            fontWeight: '700',
            marginBottom: verticalScale(2),
        },
        updateTime: {
            ...uiStyle.defaultText,
            color: theme.black.second,
            fontSize: moderateScale(11),
            fontWeight: '500',
        },
        updateSource: {
            ...uiStyle.defaultText,
            color: theme.black.third,
            fontSize: moderateScale(9.5),
            marginTop: verticalScale(2),
        },
        filterCard: {
            backgroundColor: theme.white,
            borderRadius: scale(16),
            paddingHorizontal: scale(14),
            paddingTop: verticalScale(13),
            paddingBottom: verticalScale(10),
            marginBottom: verticalScale(14),
            ...theme.viewShadow,
        },
        filterHeading: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: verticalScale(10),
        },
        filterTitle: {
            ...uiStyle.defaultText,
            color: theme.black.main,
            fontSize: moderateScale(14),
            fontWeight: '700',
            marginLeft: scale(6),
        },
        filterLabel: {
            ...uiStyle.defaultText,
            color: theme.black.third,
            fontSize: moderateScale(10),
            fontWeight: '600',
            marginBottom: verticalScale(5),
            marginLeft: scale(3),
        },
        segmentControl: {
            alignSelf: 'stretch',
            marginBottom: verticalScale(9),
        },
        carParkCard: {
            backgroundColor: theme.white,
            borderRadius: scale(16),
            marginBottom: verticalScale(14),
            overflow: 'hidden',
            ...theme.viewShadow,
        },
        carParkHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: scale(14),
            paddingVertical: verticalScale(14),
        },
        carParkCodeBadge: {
            width: scale(68),
            minHeight: scale(66),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.tonal.primary15,
            borderRadius: scale(14),
            marginRight: scale(12),
        },
        carParkCode: {
            ...uiStyle.defaultText,
            color: theme.themeColor,
            fontSize: moderateScale(21),
            fontWeight: '800',
            marginTop: verticalScale(2),
        },
        locationContent: {
            flex: 1,
        },
        locationTitleRow: {
            flexDirection: 'row',
            alignItems: 'center',
            marginBottom: verticalScale(3),
        },
        locationTitle: {
            ...uiStyle.defaultText,
            color: theme.black.third,
            fontSize: moderateScale(9.5),
            fontWeight: '600',
            marginLeft: scale(2),
        },
        locationText: {
            ...uiStyle.defaultText,
            color: theme.black.second,
            fontSize: moderateScale(12),
            lineHeight: moderateScale(18),
            fontWeight: '600',
        },
        recordsContainer: {
            backgroundColor: theme.tonal.primary08,
            paddingHorizontal: scale(14),
        },
        recordRow: {
            minHeight: verticalScale(68),
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingVertical: verticalScale(10),
        },
        recordDivider: {
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.themeColorUltraLight,
        },
        recordIdentity: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            paddingRight: scale(8),
        },
        vehicleIcon: {
            width: scale(36),
            height: scale(36),
            borderRadius: scale(11),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.tonal.secondary15,
            marginRight: scale(10),
        },
        recordLabels: {
            flex: 1,
        },
        parkingType: {
            ...uiStyle.defaultText,
            color: theme.black.main,
            fontSize: moderateScale(12),
            fontWeight: '700',
        },
        vehicleType: {
            ...uiStyle.defaultText,
            color: theme.black.third,
            fontSize: moderateScale(10),
            marginTop: verticalScale(2),
        },
        availability: {
            alignItems: 'flex-end',
        },
        availableCountRow: {
            flexDirection: 'row',
            alignItems: 'baseline',
        },
        availableCount: {
            ...uiStyle.defaultText,
            fontSize: moderateScale(23),
            fontWeight: '800',
            fontVariant: ['tabular-nums'],
        },
        availableUnit: {
            ...uiStyle.defaultText,
            color: theme.black.third,
            fontSize: moderateScale(9.5),
            marginLeft: scale(3),
        },
        statusBadge: {
            flexDirection: 'row',
            alignItems: 'center',
            borderRadius: scale(999),
            paddingHorizontal: scale(7),
            paddingVertical: verticalScale(2),
            marginTop: verticalScale(2),
        },
        statusText: {
            ...uiStyle.defaultText,
            fontSize: moderateScale(8.5),
            fontWeight: '600',
            marginLeft: scale(3),
        },
        emptyCard: {
            alignItems: 'center',
            backgroundColor: theme.white,
            borderRadius: scale(16),
            paddingHorizontal: scale(24),
            paddingVertical: verticalScale(34),
            ...theme.viewShadow,
        },
        emptyIcon: {
            width: scale(58),
            height: scale(58),
            borderRadius: scale(20),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: theme.tonal.primary15,
            marginBottom: verticalScale(12),
        },
        emptyTitle: {
            ...uiStyle.defaultText,
            color: theme.black.main,
            fontSize: moderateScale(14),
            fontWeight: '700',
        },
        emptyDescription: {
            ...uiStyle.defaultText,
            color: theme.black.third,
            fontSize: moderateScale(10.5),
            lineHeight: moderateScale(16),
            textAlign: 'center',
            marginTop: verticalScale(5),
        },
        skeletonBlock: {
            backgroundColor: theme.tonal.primary15,
            borderRadius: scale(4),
        },
        skeletonUpdateBlock: {
            backgroundColor: theme.tonal.primary30,
            borderRadius: scale(4),
        },
        skeletonUpdateTitle: {
            width: '46%',
            height: verticalScale(13),
            marginBottom: verticalScale(5),
        },
        skeletonUpdateTime: {
            width: '68%',
            height: verticalScale(10),
            marginBottom: verticalScale(5),
        },
        skeletonUpdateSource: {
            width: '52%',
            height: verticalScale(8),
        },
        skeletonFilterIcon: {
            width: scale(19),
            height: scale(13),
        },
        skeletonFilterTitle: {
            width: '28%',
            height: verticalScale(13),
            marginLeft: scale(6),
        },
        skeletonFilterLabel: {
            width: '18%',
            height: verticalScale(9),
            marginBottom: verticalScale(6),
            marginLeft: scale(3),
        },
        skeletonSegmentControl: {
            flexDirection: 'row',
            alignItems: 'center',
            height: verticalScale(34),
            borderRadius: scale(18),
            backgroundColor: theme.bg_color,
            paddingHorizontal: scale(5),
            marginBottom: verticalScale(9),
        },
        skeletonSegmentSelected: {
            flex: 1,
            height: verticalScale(26),
            borderRadius: scale(14),
            backgroundColor: theme.tonal.primary15,
            marginHorizontal: scale(3),
        },
        skeletonSegmentSelectedSecondary: {
            flex: 1,
            height: verticalScale(26),
            borderRadius: scale(14),
            backgroundColor: theme.tonal.secondary15,
            marginHorizontal: scale(3),
        },
        skeletonSegmentItem: {
            flex: 1,
            height: verticalScale(9),
            borderRadius: scale(4),
            backgroundColor: theme.tonal.primary08,
            marginHorizontal: scale(8),
        },
        skeletonSegmentItemWide: {
            flex: 1.5,
            height: verticalScale(9),
            borderRadius: scale(4),
            backgroundColor: theme.tonal.primary08,
            marginHorizontal: scale(8),
        },
        skeletonParkIcon: {
            width: scale(22),
            height: scale(22),
            borderRadius: scale(11),
        },
        skeletonParkCode: {
            width: '48%',
            height: verticalScale(18),
            marginTop: verticalScale(6),
        },
        skeletonLocationLabel: {
            width: '34%',
            height: verticalScale(9),
            marginBottom: verticalScale(7),
        },
        skeletonLocationTitle: {
            width: '88%',
            height: verticalScale(11),
            marginBottom: verticalScale(5),
        },
        skeletonLocationTitleShort: {
            width: '62%',
            height: verticalScale(11),
        },
        skeletonRecordTitle: {
            width: '62%',
            height: verticalScale(11),
        },
        skeletonRecordSubtitle: {
            width: '46%',
            height: verticalScale(9),
            marginTop: verticalScale(5),
        },
        skeletonAvailableCount: {
            width: scale(38),
            height: verticalScale(20),
        },
        skeletonStatusBadge: {
            width: scale(58),
            height: verticalScale(14),
            borderRadius: scale(999),
            marginTop: verticalScale(5),
        },
    });

export default CarPark;
