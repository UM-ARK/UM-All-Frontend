import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { StyleSheet, View, VirtualizedList } from 'react-native';
import Animated, { Easing, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import moment from 'moment';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import { SailboatIcon } from 'phosphor-react-native/src/icons/Sailboat';

import Text from '../../../../../components/AppText';
import ScalePressable from '../../../../../components/ScalePressable';
import { uiStyle, useTheme } from '../../../../../components/ThemeContext';
import { useAppReducedMotion } from '../../../../../contexts/ReducedMotionContext';
import { getWeek } from '../../../../../static/UMCalendar/CalendarConst';
import { UMCalendar } from '../../../../../static/UMCalendar/UMCalendar';
import { trigger } from '../../../../../utils/trigger';

const AnimatedCalendarList = Animated.createAnimatedComponent(VirtualizedList);
const CALENDAR_INSET = scale(12);
const BOAT_SIZE = scale(19);
const WAKE_WIDTH = scale(84);
const MAX_WAKE_STEP = scale(44);
const WATER_DRIFT = scale(21);
const WATER_HEIGHT = BOAT_SIZE + verticalScale(8);
const SAIL_EASING = Easing.inOut(Easing.sin);
const SUMMARY_EASING = Easing.bezier(0.23, 1, 0.32, 1);

const calItemWidth = Math.max(scale(54), 48);
const calRangeItemWidth = Math.max(scale(83), 83);

const calendarTextProps = {
    adjustsFontSizeToFit: true,
    maxFontSizeMultiplier: 1.2,
    minimumFontScale: 0.75,
    numberOfLines: 1,
};

const getItem = (data, index) => data[index];
const getItemCount = data => data.length;
const getCalItemWidth = item => moment(item.endDate).diff(item.startDate, 'day') > 1 ? calRangeItemWidth : calItemWidth;
const getCalItemCenter = layout => layout ? CALENDAR_INSET + layout.offset + layout.length / 2 : 0;

// 延續校曆原有規則，優先顯示當前或下一個日程。
const getCurrentSelection = cal => {
    const now = moment();
    const lastIndex = cal.length - 1;
    if (lastIndex < 0 || now.isBefore(cal[0].startDate)) {return 0;}
    if (now.isSameOrAfter(cal[lastIndex].startDate)) {return lastIndex;}
    return Math.max(0, cal.findIndex(item => now.isBefore(item.endDate)));
};

const CalendarBar = ({ refreshTrigger = 0, tide, onDateTouchChange }) => {
    const { theme } = useTheme();
    const { black, accentForeground, themeColor, trueWhite, warning, sand } = theme;
    const { t, i18n } = useTranslation('features');
    const reducedMotion = useAppReducedMotion();
    const calScrollRef = useRef(null);
    const cal = useMemo(() => {
        const seenEvents = new Set();

        return UMCalendar.filter(item => {
            const eventKey = `${item.endDate}\u0000${item.summary}\u0000${item.summary_cn || ''}`;

            if (seenEvents.has(eventKey)) {return false;}

            seenEvents.add(eventKey);
            return true;
        });
    }, []);
    const calItemLayouts = useMemo(() => {
        let offset = 0;

        return cal.map((item, index) => {
            const length = getCalItemWidth(item);
            const layout = { length, offset, index };

            offset += length;
            return layout;
        });
    }, [cal]);

    const [selectDay, setSelectDay] = useState(() => getCurrentSelection(cal));
    const initialIndex = useRef(selectDay).current;
    const lastRefresh = useRef(refreshTrigger);
    const boatCenter = useSharedValue(getCalItemCenter(calItemLayouts[initialIndex]));
    const scrollX = useSharedValue(calItemLayouts[initialIndex]?.offset ?? 0);
    const summaryProgress = useSharedValue(1);
    const wakeStrength = useSharedValue(0);
    const wakeDirection = useSharedValue(1);
    const isTc = i18n.language === 'tc';
    const monthFormatter = useMemo(() => new Intl.DateTimeFormat(isTc ? 'zh-HK' : 'en', {
        timeZone: 'Asia/Macau',
        year: 'numeric',
        month: 'short',
    }), [isTc]);

    const handleDateScroll = useAnimatedScrollHandler(event => {
        scrollX.set(event.contentOffset.x);
    });
    useAnimatedReaction(
        () => boatCenter.get() - scrollX.get(),
        (position, previous) => {
            if (reducedMotion || previous === null) {return;}
            const distance = position - previous;
            // 刷新或初始定位可跳過多個日期，水痕只回應連續位移。
            if (Math.abs(distance) < 0.4 || Math.abs(distance) > MAX_WAKE_STEP) {return;}
            wakeDirection.set(distance > 0 ? 1 : -1);
            wakeStrength.set(Math.max(wakeStrength.get(), Math.min(1, 0.52 + Math.abs(distance) / 16)));
            wakeStrength.set(withTiming(0, { duration: 540 }));
        },
    );
    const waterStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: tide.get() * WATER_DRIFT },
            { translateY: tide.get() * 2.2 },
        ],
    }));
    const boatStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: boatCenter.get() - scrollX.get() - WAKE_WIDTH / 2 },
            { translateY: tide.get() * 2 },
        ],
    }));
    const sailStyle = useAnimatedStyle(() => ({
        transform: [{ rotate: `${tide.get() * 5}deg` }],
    }));
    const wakeStyle = useAnimatedStyle(() => ({
        opacity: reducedMotion ? 0 : wakeStrength.get(),
        transform: [{ scaleX: wakeDirection.get() }],
    }));
    const summaryStyle = useAnimatedStyle(() => ({
        opacity: reducedMotion ? 1 : summaryProgress.get(),
        transform: [{ translateY: reducedMotion ? 0 : (1 - summaryProgress.get()) * 4 }],
    }));

    useEffect(() => {
        if (lastRefresh.current === refreshTrigger) {return;}
        lastRefresh.current = refreshTrigger;
        const index = getCurrentSelection(cal);
        const layout = calItemLayouts[index];
        if (!layout) {return;}

        setSelectDay(index);
        boatCenter.set(getCalItemCenter(layout));
        summaryProgress.set(1);
        calScrollRef.current?.scrollToOffset({ offset: layout.offset, animated: false });
    }, [boatCenter, cal, calItemLayouts, refreshTrigger, summaryProgress]);

    useEffect(() => {
        if (reducedMotion) {boatCenter.set(getCalItemCenter(calItemLayouts[selectDay]));}
    }, [boatCenter, calItemLayouts, reducedMotion, selectDay]);

    const handleDateTouchStart = useCallback(() => onDateTouchChange?.(true), [onDateTouchChange]);
    const handleDateTouchEnd = useCallback(() => onDateTouchChange?.(false), [onDateTouchChange]);
    useEffect(() => handleDateTouchEnd, [handleDateTouchEnd]);

    const selectDate = index => {
        if (index === selectDay) {return;}
        trigger('selection');
        setSelectDay(index);
        const center = getCalItemCenter(calItemLayouts[index]);
        boatCenter.set(reducedMotion ? center : withTiming(center, { duration: 290, easing: SAIL_EASING }));
        if (!reducedMotion) {
            summaryProgress.set(0.45);
            summaryProgress.set(withTiming(1, { duration: 150, easing: SUMMARY_EASING }));
        }
    };

    const renderCal = (item, index) => {
        const startDate = moment.parseZone(item.startDate);
        const lastDate = moment.parseZone(item.endDate).subtract(1, 'days');
        const isDateRange = lastDate.isAfter(startDate, 'day');
        const endFormat = startDate.isSame(lastDate, 'month') ? 'D' : 'M/D';
        const displayDate = isDateRange ? `${startDate.format('M/D')}–${lastDate.format(endFormat)}` : startDate.format('M/D');
        const displayWeek = isDateRange ? `${getWeek(startDate)}–${getWeek(lastDate)}` : getWeek(startDate);
        const isThisDateSelected = selectDay === index;
        const summaryUpper = item.summary.toUpperCase();
        const isImportant = summaryUpper.includes('EXAM') || (summaryUpper.includes('SEMESTER') && !summaryUpper.includes('BREAK'));
        const accessibleDate = isDateRange ? `${startDate.format('YYYY-MM-DD')} – ${lastDate.format('YYYY-MM-DD')}` : startDate.format('YYYY-MM-DD');
        const eventName = isTc ? item.summary_cn || item.summary : item.summary;
        const textColor = isThisDateSelected ? accentForeground : black.second;

        return (
            <ScalePressable
                style={[styles.dateButton, { width: getCalItemWidth(item) }]}
                accessibilityRole="button"
                accessibilityState={{ selected: isThisDateSelected }}
                accessibilityLabel={[accessibleDate, eventName, isImportant ? t('重要日期') : null].filter(Boolean).join(' · ')}
                onPress={() => selectDate(index)}>
                <Text {...calendarTextProps} style={[styles.date, { color: textColor, fontWeight: isThisDateSelected ? '700' : '500' }]}>
                    {displayDate}
                </Text>
                <Text {...calendarTextProps} style={[styles.week, { color: textColor }]}>
                    {displayWeek}
                </Text>
                {isImportant ? (
                    <View style={[styles.importantDot, { backgroundColor: warning }]} />
                ) : null}
            </ScalePressable>
        );
    };

    const selected = cal[selectDay];
    if (!selected) {return null;}
    const title = isTc ? selected.summary_cn || selected.summary : selected.summary;
    const translation = isTc ? selected.summary : selected.summary_cn;

    return (
        <View style={styles.calendar}>
            <View onTouchStart={handleDateTouchStart} onTouchEnd={handleDateTouchEnd} onTouchCancel={handleDateTouchEnd}>
                <AnimatedCalendarList
                    data={cal}
                    ref={calScrollRef}
                    style={styles.dateList}
                    contentContainerStyle={styles.dateListContent}
                    initialNumToRender={12}
                    windowSize={4}
                    initialScrollIndex={initialIndex}
                    getItemLayout={(_, index) => calItemLayouts[index]}
                    renderItem={({ item, index }) => renderCal(item, index)}
                    horizontal
                    nestedScrollEnabled
                    directionalLockEnabled
                    showsHorizontalScrollIndicator={false}
                    onScroll={handleDateScroll}
                    scrollEventThrottle={16}
                    getItem={getItem}
                    getItemCount={getItemCount}
                    keyExtractor={(item, index) => item.startDate + index}
                />
            </View>
            <View pointerEvents="none" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden style={styles.water}>
                <Animated.View style={[styles.swell, waterStyle]}>
                    <Svg width="100%" height="100%" viewBox="0 0 340 36" preserveAspectRatio="none">
                        <Defs>
                            <LinearGradient id="calendar-swell" x1="0%" y1="0%" x2="0%" y2="100%">
                                <Stop offset="0%" stopColor={themeColor} stopOpacity={0.34} />
                                <Stop offset="100%" stopColor={themeColor} stopOpacity={0} />
                            </LinearGradient>
                        </Defs>
                        <Path d="M0 20 C28 13 54 12 85 19 S140 25 171 17 S225 11 256 18 S311 25 340 17 V36 H0 Z" fill="url(#calendar-swell)" />
                        <Path d="M0 25 C31 29 51 19 83 22 S139 31 170 24 S225 18 254 23 S309 29 340 21 V36 H0 Z" fill="url(#calendar-swell)" />
                    </Svg>
                </Animated.View>
                <Animated.View style={[styles.boat, boatStyle]}>
                    <Animated.View style={[styles.wake, wakeStyle]}>
                        <Svg width={WAKE_WIDTH} height={verticalScale(10)} viewBox="0 0 84 12" preserveAspectRatio="none">
                            <Path d="M6 5 C16 9 25 2 33 3 Q40 3 44 5 M17 9 C26 12 31 7 36 8 Q41 8 45 7" fill="none" stroke={trueWhite} strokeOpacity={0.9} strokeLinecap="round" strokeWidth={1.5} />
                            <Path d="M3 8 Q8 11 13 9 M24 5 Q28 4 32 5" fill="none" stroke={accentForeground} strokeOpacity={0.48} strokeLinecap="round" strokeWidth={1} />
                        </Svg>
                    </Animated.View>
                    <View style={styles.ripple}>
                        <Svg width={scale(42)} height={verticalScale(7)} viewBox="0 0 42 9" preserveAspectRatio="none">
                            <Path d="M4 5 C10 7 16 2 23 3 S33 5 38 3 M12 8 Q19 5 29 7" fill="none" stroke={trueWhite} strokeOpacity={0.8} strokeLinecap="round" strokeWidth={1.4} />
                        </Svg>
                    </View>
                    <Animated.View style={[styles.sail, sailStyle]}>
                        <SailboatIcon size={BOAT_SIZE} weight="fill" color={sand} />
                        <SailboatIcon size={BOAT_SIZE} weight="regular" color={accentForeground} style={StyleSheet.absoluteFill} />
                    </Animated.View>
                </Animated.View>
            </View>
            <Animated.View style={[styles.summary, summaryStyle]}>
                <View style={styles.summaryRow}>
                    <Text selectable style={[styles.summaryTitle, { color: black.main }]}>{title}</Text>
                    <Text style={[styles.month, { color: black.second }]}>{monthFormatter.format(new Date(selected.startDate))}</Text>
                </View>
                {translation && translation !== title ? (
                    <Text selectable style={[styles.summaryTranslation, { color: black.second }]}>{translation}</Text>
                ) : null}
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    calendar: { paddingTop: verticalScale(4), paddingBottom: verticalScale(3) },
    dateList: { flexGrow: 0 },
    dateListContent: { paddingHorizontal: CALENDAR_INSET },
    dateButton: { minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(4) },
    date: { ...uiStyle.defaultText, fontSize: moderateScale(13), fontVariant: ['tabular-nums'] },
    week: { ...uiStyle.defaultText, fontSize: moderateScale(9), marginTop: verticalScale(1) },
    importantDot: { position: 'absolute', top: scale(6), right: scale(5), width: scale(4), height: scale(4), borderRadius: scale(2) },
    water: { height: WATER_HEIGHT, marginTop: -verticalScale(4), overflow: 'hidden' },
    swell: { position: 'absolute', left: -WATER_DRIFT, right: -WATER_DRIFT, top: 0, bottom: 0 },
    boat: { position: 'absolute', left: 0, top: verticalScale(2.5), width: WAKE_WIDTH },
    wake: { position: 'absolute', top: BOAT_SIZE - verticalScale(4) },
    ripple: { position: 'absolute', left: (WAKE_WIDTH - scale(42)) / 2, top: BOAT_SIZE - verticalScale(3) },
    sail: { alignSelf: 'center' },
    summary: { marginHorizontal: CALENDAR_INSET, marginTop: verticalScale(1), gap: verticalScale(1) },
    summaryRow: { flexDirection: 'row', alignItems: 'baseline', gap: scale(8) },
    summaryTitle: { ...uiStyle.defaultText, fontSize: moderateScale(14), fontWeight: '600', flex: 1 },
    month: { ...uiStyle.defaultText, fontSize: moderateScale(10), textAlign: 'right' },
    summaryTranslation: { ...uiStyle.defaultText, fontSize: moderateScale(11) },
});

export default CalendarBar;
