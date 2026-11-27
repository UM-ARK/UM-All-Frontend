import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import SegmentedControl from '@expo/ui/community/segmented-control';

import SegmentedTopTabBar, {
    SEGMENTED_TOP_TAB_BAR_HEIGHT,
} from '../../../../components/SegmentedTopTabBar';
import { useTheme } from '../../../../components/ThemeContext';
import { isLiquidGlassSupported } from '../../../../utils/glassEffect';
import { trigger } from '../../../../utils/trigger';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../../../../utils/windowSizeClass';
import CourseMoreMenu from './CourseMoreMenu';

/**
 * 選課頁頂欄：置中的分段切換器（搵課／課表）與右側 ⋯ 選單。
 *
 * 支援液態玻璃時用原生 `@expo/ui` SegmentedControl；
 * 否則回退到自訂 SegmentedTopTabBar（含 Android／Web／舊 iOS）。
 */
const CourseTabBar = ({
    programmeLevel,
    catalogMetadata,
    onManualUpdate,
    onOpenSharePoint,
    canClear,
    onClearPress,
    topInset = 0,
    floating = false,
    onBarLayout,
    state,
    descriptors,
    navigation,
    position,
}) => {
    const { theme } = useTheme();
    const { bg_color, isLight } = theme;
    const isFloating = floating || topInset > 0;
    const segmentBackground = isFloating ? 'transparent' : bg_color;

    const values = useMemo(
        () =>
            state.routes.map(route => {
                const { title } = descriptors[route.key].options;
                return title ?? route.name;
            }),
        [descriptors, state.routes],
    );

    const timetableBadge = useMemo(() => {
        if (!isLiquidGlassSupported) {
            return null;
        }
        const timetableRoute = state.routes[1];
        if (!timetableRoute) {
            return null;
        }
        return descriptors[timetableRoute.key]?.options?.tabBarBadge?.() ?? null;
    }, [descriptors, state.routes]);

    const handleNativeChange = event => {
        const index = event.nativeEvent.selectedSegmentIndex;
        const route = state.routes[index];
        if (!route) {
            return;
        }
        const isFocused = state.index === index;
        const tabPressEvent = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
        });
        if (!isFocused && !tabPressEvent.defaultPrevented) {
            trigger('selection');
            navigation.navigate(route.name, route.params);
        } else if (isFocused) {
            trigger();
        }
    };

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.wrapper,
                {
                    paddingTop: topInset,
                    backgroundColor: segmentBackground,
                },
                isFloating && styles.floatingWrapper,
            ]}>
            <View
                pointerEvents="box-none"
                onLayout={onBarLayout}
                style={styles.barRow}>
                {isLiquidGlassSupported ? (
                    <View
                        pointerEvents="box-none"
                        style={[
                            styles.segmentWrap,
                            { backgroundColor: segmentBackground },
                        ]}>
                        <View style={styles.segmentInner}>
                            <SegmentedControl
                                values={values}
                                selectedIndex={state.index}
                                onChange={handleNativeChange}
                                appearance={isLight ? 'light' : 'dark'}
                                style={styles.segmentControl}
                            />
                            {timetableBadge ? (
                                <View pointerEvents="none" style={styles.badgeAnchor}>
                                    {timetableBadge}
                                </View>
                            ) : null}
                        </View>
                    </View>
                ) : (
                    <SegmentedTopTabBar
                        state={state}
                        descriptors={descriptors}
                        navigation={navigation}
                        position={position}
                        backgroundColor={segmentBackground}
                    />
                )}
                <View pointerEvents="box-none" style={styles.menu}>
                    <CourseMoreMenu
                        programmeLevel={programmeLevel}
                        catalogMetadata={catalogMetadata}
                        onManualUpdate={onManualUpdate}
                        onOpenSharePoint={onOpenSharePoint}
                        canClear={canClear}
                        onClearPress={onClearPress}
                    />
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    floatingWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
    },
    wrapper: {
        width: '100%',
    },
    barRow: {
        minHeight: SEGMENTED_TOP_TAB_BAR_HEIGHT,
        paddingHorizontal: verticalScale(42),
        justifyContent: 'center',
    },
    segmentWrap: {
        width: '100%',
        maxWidth: TOP_TAB_STRIP_MAX_WIDTH,
        alignSelf: 'center',
        alignItems: 'center',
        paddingHorizontal: scale(12),
        paddingTop: verticalScale(4),
        paddingBottom: verticalScale(2),
    },
    segmentInner: {
        width: scale(180),
        maxWidth: '100%',
        justifyContent: 'center',
    },
    segmentControl: {
        width: '100%',
        height: scale(32),
    },
    badgeAnchor: {
        position: 'absolute',
        top: scale(2),
        right: scale(18),
    },
    menu: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        justifyContent: 'center',
    },
});

export default CourseTabBar;
