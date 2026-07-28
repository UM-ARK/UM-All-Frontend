import React, {useEffect, useRef, useState} from 'react';
import {
    Alert,
    Dimensions,
    Pressable,
    Text,
    View,
} from 'react-native';
import {ScrollView} from 'react-native-gesture-handler';
import Modal from 'react-native-modal';
import {scale, verticalScale} from 'react-native-size-matters';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {t} from 'i18next';

import {useTheme, uiStyle} from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import {trigger} from '../../../../utils/trigger';
import {
    DEFAULT_TIME_FROM,
    DEFAULT_TIME_TO,
    TIME_RANGE_PRESETS,
} from '../constants';

const {height: PAGE_HEIGHT} = Dimensions.get('screen');

const HOURS = Array.from({length: 24}, (_, i) =>
    String(i).padStart(2, '0'),
);
const MINUTES = Array.from({length: 12}, (_, i) =>
    String(i * 5).padStart(2, '0'),
);

/** 固定整數高度，避免 snap 與 round 因小數互搶造成閃爍 */
const ITEM_HEIGHT = 40;
const VISIBLE_COUNT = 5;
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_COUNT;
const WHEEL_PADDING = ITEM_HEIGHT * Math.floor(VISIBLE_COUNT / 2);

/**
 * 將 HH:mm 對齊到 5 分鐘刻度（結束時間 23:59 視為 23:55）。
 *
 * @param {string} time HH:mm
 * @returns {{hour: string, minute: string}}
 */
const snapTimeParts = time => {
    const [rawHour = '0', rawMinute = '0'] = String(time || '00:00').split(':');
    const hourNum = Math.min(23, Math.max(0, parseInt(rawHour, 10) || 0));
    let minuteNum = parseInt(rawMinute, 10) || 0;
    if (minuteNum > 55) {
        minuteNum = 55;
    } else {
        minuteNum = Math.round(minuteNum / 5) * 5;
    }
    return {
        hour: String(hourNum).padStart(2, '0'),
        minute: String(minuteNum).padStart(2, '0'),
    };
};

/**
 * @param {string} hour
 * @param {string} minute
 * @param {{asEnd?: boolean}} [options]
 * @returns {string}
 */
const joinTime = (hour, minute, options = {}) => {
    // 結束時間滾輪最末為 23:55，對齊全天／晚上結束 23:59
    if (options.asEnd && hour === '23' && minute === '55') {
        return '23:59';
    }
    return `${hour}:${minute}`;
};

/**
 * 可滑動的時／分滾輪（僅在慣性結束時回寫，避免 scrollTo 迴圈）。
 */
const TimeWheelColumn = ({values, value, onChange, textColor, accentColor}) => {
    const scrollRef = useRef(null);
    const suppressEndRef = useRef(true);
    const valueRef = useRef(value);
    const selectedIndex = Math.max(0, values.indexOf(value));

    valueRef.current = value;

    useEffect(() => {
        suppressEndRef.current = true;
        const offset = selectedIndex * ITEM_HEIGHT;
        const frame = requestAnimationFrame(() => {
            scrollRef.current?.scrollTo({y: offset, animated: false});
            setTimeout(() => {
                suppressEndRef.current = false;
            }, 80);
        });
        return () => cancelAnimationFrame(frame);
    }, [selectedIndex]);

    const resolveIndex = y =>
        Math.min(
            values.length - 1,
            Math.max(0, Math.round(y / ITEM_HEIGHT)),
        );

    const handleMomentumScrollEnd = event => {
        if (suppressEndRef.current) {
            return;
        }
        const index = resolveIndex(event.nativeEvent.contentOffset.y);
        const next = values[index];
        if (next !== valueRef.current) {
            onChange(next);
        }
    };

    return (
        <View
            style={{
                height: WHEEL_HEIGHT,
                width: scale(56),
                overflow: 'hidden',
            }}>
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: WHEEL_PADDING,
                    left: 0,
                    right: 0,
                    height: ITEM_HEIGHT,
                    borderRadius: scale(8),
                    backgroundColor: accentColor,
                    zIndex: 1,
                }}
            />
            <ScrollView
                ref={scrollRef}
                showsVerticalScrollIndicator={false}
                nestedScrollEnabled
                snapToInterval={ITEM_HEIGHT}
                snapToAlignment="start"
                disableIntervalMomentum
                decelerationRate="fast"
                bounces={false}
                onMomentumScrollEnd={handleMomentumScrollEnd}
                contentContainerStyle={{paddingVertical: WHEEL_PADDING}}>
                {values.map(item => {
                    const isActive = item === value;
                    return (
                        <View
                            key={item}
                            style={{
                                height: ITEM_HEIGHT,
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: textColor,
                                    fontSize: scale(isActive ? 18 : 15),
                                    fontWeight: isActive ? '700' : '400',
                                    opacity: isActive ? 1 : 0.4,
                                }}>
                                {item}
                            </Text>
                        </View>
                    );
                })}
            </ScrollView>
        </View>
    );
};

/**
 * 課程時段選擇 Modal：預設上午／下午／晚上 + 自訂開始／結束時分。
 *
 * @param {boolean} visible 是否顯示
 * @param {string} from 開始時間 HH:mm
 * @param {string} to 結束時間 HH:mm
 * @param {Function} onConfirm 確認回調 ({from, to}) => void
 * @param {Function} onCancel 取消回調
 */
const CourseTimeRangePicker = ({
    visible,
    from = '00:00',
    to = '23:59',
    onConfirm,
    onCancel,
}) => {
    const {theme} = useTheme();
    const {themeColor, black, white, bg_color, trueBlack, tonal} = theme;
    const insets = useSafeAreaInsets();

    const [fromHour, setFromHour] = useState(() => snapTimeParts(from).hour);
    const [fromMinute, setFromMinute] = useState(
        () => snapTimeParts(from).minute,
    );
    const [toHour, setToHour] = useState(() => snapTimeParts(to).hour);
    const [toMinute, setToMinute] = useState(() => snapTimeParts(to).minute);

    useEffect(() => {
        if (!visible) {
            return;
        }
        const nextFrom = snapTimeParts(from);
        const nextTo = snapTimeParts(to);
        setFromHour(nextFrom.hour);
        setFromMinute(nextFrom.minute);
        setToHour(nextTo.hour);
        setToMinute(nextTo.minute);
    }, [visible, from, to]);

    const currentFrom = joinTime(fromHour, fromMinute);
    const currentTo = joinTime(toHour, toMinute, {asEnd: true});

    const applyPreset = preset => {
        trigger();
        const isActive =
            currentFrom === preset.from && currentTo === preset.to;
        // 再次點擊已選預設 → 取消，還原全天
        onConfirm?.({
            from: isActive ? DEFAULT_TIME_FROM : preset.from,
            to: isActive ? DEFAULT_TIME_TO : preset.to,
        });
    };

    const handleConfirm = () => {
        trigger();
        if (currentFrom >= currentTo) {
            Alert.alert(
                t('開始時間不能晚於結束時間！', {ns: 'timetable'}),
            );
            return;
        }
        onConfirm?.({from: currentFrom, to: currentTo});
    };

    const handleCancel = () => {
        trigger();
        onCancel?.();
    };

    const renderHmPair = (hour, minute, setHour, setMinute) => (
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
            <TimeWheelColumn
                values={HOURS}
                value={hour}
                onChange={setHour}
                textColor={themeColor}
                accentColor={tonal.primary15}
            />
            <Text
                style={{
                    ...uiStyle.defaultText,
                    color: black.second,
                    fontSize: scale(18),
                    fontWeight: '700',
                    marginHorizontal: scale(2),
                }}>
                :
            </Text>
            <TimeWheelColumn
                values={MINUTES}
                value={minute}
                onChange={setMinute}
                textColor={themeColor}
                accentColor={tonal.primary15}
            />
        </View>
    );

    return (
        <Modal
            isVisible={visible}
            statusBarTranslucent
            deviceHeight={PAGE_HEIGHT}
            backdropColor={trueBlack}
            backdropOpacity={0.45}
            onBackButtonPress={handleCancel}
            onBackdropPress={handleCancel}
            useNativeDriver
            hideModalContentWhileAnimating
            style={{
                margin: 0,
                justifyContent: 'flex-end',
                alignItems: 'center',
            }}>
            <View
                style={{
                    width: '100%',
                    backgroundColor: bg_color,
                    borderTopLeftRadius: scale(16),
                    borderTopRightRadius: scale(16),
                    paddingHorizontal: scale(16),
                    paddingTop: verticalScale(14),
                    paddingBottom: Math.max(insets.bottom, verticalScale(16)),
                }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: black.main,
                        fontSize: scale(16),
                        fontWeight: '700',
                        textAlign: 'center',
                        marginBottom: verticalScale(12),
                    }}>
                    {t('選擇時段', {ns: 'timetable'})}
                </Text>

                {/* 預設上午／下午／晚上 */}
                <View
                    style={{
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                        marginBottom: verticalScale(12),
                    }}>
                    {TIME_RANGE_PRESETS.map(preset => {
                        const isActive =
                            currentFrom === preset.from &&
                            currentTo === preset.to;
                        return (
                            <TouchableScale
                                key={preset.id}
                                activeScale={0.96}
                                style={{
                                    paddingHorizontal: scale(12),
                                    paddingVertical: verticalScale(8),
                                    borderRadius: scale(10),
                                    marginHorizontal: scale(4),
                                    marginBottom: verticalScale(6),
                                    backgroundColor: isActive
                                        ? tonal.primary30
                                        : tonal.primary15,
                                }}
                                onPress={() => applyPreset(preset)}
                                accessibilityRole="button"
                                accessibilityLabel={`${t(preset.labelKey, {
                                    ns: 'timetable',
                                })} ${preset.from}-${preset.to}`}>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: themeColor,
                                        fontSize: scale(13),
                                        fontWeight: isActive ? '800' : '600',
                                        textAlign: 'center',
                                    }}>
                                    {t(preset.labelKey, {ns: 'timetable'})}
                                </Text>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        color: black.third,
                                        fontSize: scale(11),
                                        textAlign: 'center',
                                        marginTop: verticalScale(2),
                                    }}>
                                    {`${preset.from} - ${preset.to}`}
                                </Text>
                            </TouchableScale>
                        );
                    })}
                </View>

                {/* 自訂開始／結束 */}
                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-evenly',
                        alignItems: 'flex-start',
                        marginBottom: verticalScale(16),
                    }}>
                    <View style={{alignItems: 'center'}}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.third,
                                fontSize: scale(12),
                                marginBottom: verticalScale(4),
                            }}>
                            {t('開始', {ns: 'timetable'})}
                        </Text>
                        {renderHmPair(
                            fromHour,
                            fromMinute,
                            setFromHour,
                            setFromMinute,
                        )}
                    </View>
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.third,
                            fontSize: scale(16),
                            marginTop: verticalScale(88),
                        }}>
                        –
                    </Text>
                    <View style={{alignItems: 'center'}}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.third,
                                fontSize: scale(12),
                                marginBottom: verticalScale(4),
                            }}>
                            {t('結束', {ns: 'timetable'})}
                        </Text>
                        {renderHmPair(toHour, toMinute, setToHour, setToMinute)}
                    </View>
                </View>

                <View
                    style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        gap: scale(10),
                    }}>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('取消', {ns: 'timetable'})}
                        onPress={handleCancel}
                        style={({pressed}) => ({
                            flex: 1,
                            alignItems: 'center',
                            paddingVertical: verticalScale(12),
                            borderRadius: scale(12),
                            backgroundColor: pressed
                                ? tonal.primary30
                                : tonal.primary15,
                        })}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: black.second,
                                fontSize: scale(15),
                                fontWeight: '600',
                            }}>
                            {t('取消', {ns: 'timetable'})}
                        </Text>
                    </Pressable>
                    <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t('確認', {ns: 'timetable'})}
                        onPress={handleConfirm}
                        style={({pressed}) => ({
                            flex: 1,
                            alignItems: 'center',
                            paddingVertical: verticalScale(12),
                            borderRadius: scale(12),
                            backgroundColor: themeColor,
                            opacity: pressed ? 0.85 : 1,
                        })}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: white,
                                fontSize: scale(15),
                                fontWeight: '700',
                            }}>
                            {t('確認', {ns: 'timetable'})}
                        </Text>
                    </Pressable>
                </View>
            </View>
        </Modal>
    );
};

export default CourseTimeRangePicker;
