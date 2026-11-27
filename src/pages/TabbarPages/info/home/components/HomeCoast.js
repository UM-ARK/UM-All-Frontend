import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useIsFocused } from '@react-navigation/native';
import Animated, { cancelAnimation, Easing, interpolate, useAnimatedStyle, useDerivedValue, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { moderateScale, scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../../components/AppText';
import ScalePressable from '../../../../../components/ScalePressable';
import { uiStyle, useTheme } from '../../../../../components/ThemeContext';
import { useAppReducedMotion } from '../../../../../contexts/ReducedMotionContext';
import { trigger } from '../../../../../utils/trigger';
import PhosphorFeatureIcon from '../search/components/PhosphorFeatureIcon';
import CalendarBar from './CalendarBar';
import { COAST_WAVE_EDGE, COAST_WAVE_VIEW_BOX } from './coastWave';

const TIDE_HEIGHT = verticalScale(15);
const TIDE_REACH = verticalScale(7);
const WATER_FILL = `${COAST_WAVE_EDGE} V0 H0 Z`;

const TidalShoreline = ({ phase, shallow, beach, wetSand, foam }) => {
    const water = useAnimatedStyle(() => {
        const reach = (1 - Math.cos(phase.get() * Math.PI * 2)) / 2;
        return { transform: [{ translateY: reach * TIDE_REACH }] };
    });
    const wet = useAnimatedStyle(() => {
        const progress = phase.get();
        // 退潮時先移走水面，讓沙灘保留一段較深的濕痕。
        const reach = interpolate(progress, [0, 0.5, 0.77, 0.98, 1], [0, 1, 1, 0, 0]);
        const opacity = interpolate(progress, [0, 0.16, 0.44, 0.74, 0.98, 1], [0, 0.2, 1, 1, 0, 0]);
        return { opacity, transform: [{ translateY: reach * TIDE_REACH + 2 }] };
    });

    return (
        <View pointerEvents="none" style={[styles.tidalShoreline, { backgroundColor: beach }]}>
            <Animated.View style={[styles.tideStrip, wet]}>
                <Svg width="100%" height="100%" viewBox={COAST_WAVE_VIEW_BOX} preserveAspectRatio="none">
                    <Path d={WATER_FILL} fill={wetSand} />
                </Svg>
            </Animated.View>
            <Animated.View style={[styles.tideStrip, water]}>
                <Svg width="100%" height="100%" viewBox={COAST_WAVE_VIEW_BOX} preserveAspectRatio="none">
                    <Path d={WATER_FILL} fill={shallow} />
                    <Path d={COAST_WAVE_EDGE} fill="none" stroke={foam} strokeOpacity={0.64} strokeWidth={1.1} />
                </Svg>
            </Animated.View>
        </View>
    );
};

const HomeCoast = ({ topInset, refreshTrigger, upcomingCourse, onOpenTimetable, onDateTouchChange, motionEnabled, onLayout, onDeepSeaLayout, children }) => {
    const { theme } = useTheme();
    const { homeCoast, black, accentForeground, trueWhite, themeColorLight } = theme;
    const { t } = useTranslation('timetable');
    const isFocused = useIsFocused();
    const reducedMotion = useAppReducedMotion();
    const phase = useSharedValue(0);
    const tide = useDerivedValue(() => Math.sin(phase.get() * Math.PI * 4));

    useEffect(() => {
        phase.set(0);
        if (motionEnabled && isFocused && !reducedMotion) {
            phase.set(withRepeat(withTiming(1, { duration: 8000, easing: Easing.linear }), -1));
        }
        return () => cancelAnimation(phase);
    }, [isFocused, motionEnabled, phase, reducedMotion]);

    const classroom = upcomingCourse?.Classroom?.trim?.();

    return (
        <View style={styles.coast} onLayout={onLayout}>
            <CalendarBar
                topInset={topInset}
                onDeepSeaLayout={onDeepSeaLayout}
                refreshTrigger={refreshTrigger}
                tide={tide}
                onDateTouchChange={onDateTouchChange}
            />
            {upcomingCourse ? (
                <ScalePressable
                    accessibilityRole="button"
                    onPress={() => {
                        trigger();
                        onOpenTimetable();
                    }}
                    style={[styles.course, { backgroundColor: homeCoast.shallow }]}>
                    <PhosphorFeatureIcon name="alarm-clock" size={scale(17)} color={accentForeground} />
                    <View style={styles.courseCopy}>
                        <Text style={[styles.courseLabel, { color: accentForeground }]}>{t('下節課')}</Text>
                        <Text style={[styles.courseCode, { color: black.main }]}>
                            {upcomingCourse['Course Code']}
                            {classroom ? <Text style={[styles.courseRoom, { color: black.second }]}>{` · ${classroom}`}</Text> : null}
                        </Text>
                    </View>
                    <Text style={[styles.courseTime, { color: black.main }]}>{upcomingCourse['Time From']}</Text>
                    <PhosphorFeatureIcon name="caret-right" size={scale(12)} weight="regular" color={black.second} />
                </ScalePressable>
            ) : null}
            <TidalShoreline
                phase={phase}
                shallow={homeCoast.shallow}
                beach={homeCoast.beach}
                wetSand={homeCoast.wetSand}
                foam={theme.isLight ? trueWhite : themeColorLight}
            />
            <View style={[styles.beach, { backgroundColor: homeCoast.beach }]}>{children}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    coast: { alignSelf: 'stretch' },
    tidalShoreline: { height: TIDE_HEIGHT, overflow: 'hidden' },
    tideStrip: { position: 'absolute', top: -verticalScale(11), height: verticalScale(26), left: 0, right: 0 },
    course: {
        minHeight: 48,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingVertical: verticalScale(2),
        gap: scale(6),
    },
    courseCopy: { flex: 1 },
    courseLabel: { ...uiStyle.defaultText, fontSize: moderateScale(10), fontWeight: '600' },
    courseCode: { ...uiStyle.defaultText, fontSize: moderateScale(12), fontWeight: '600' },
    courseRoom: { ...uiStyle.defaultText, fontSize: moderateScale(11) },
    courseTime: { ...uiStyle.defaultText, fontSize: moderateScale(16), fontWeight: '700', fontVariant: ['tabular-nums'] },
    beach: {
        flexDirection: 'row',
        alignItems: 'stretch',
        justifyContent: 'center',
        paddingHorizontal: scale(8),
        paddingBottom: verticalScale(3),
        gap: scale(5),
    },
});

export default HomeCoast;
