import React from 'react';
import { StyleSheet, View } from 'react-native';
import { verticalScale } from 'react-native-size-matters';

import SegmentedTopTabBar from '../../../../components/SegmentedTopTabBar';
import { useTheme } from '../../../../components/ThemeContext';
import CourseMoreMenu from './CourseMoreMenu';

/**
 * 選課頁頂欄：置中的分段切換器（搵課／課表）與右側 ⋯ 選單。
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
    ...tabBarProps
}) => {
    const { theme } = useTheme();
    const { bg_color } = theme;
    const isFloating = floating || topInset > 0;

    return (
        <View
            pointerEvents="box-none"
            style={[
                styles.wrapper,
                {
                    paddingTop: topInset,
                    backgroundColor: isFloating ? 'transparent' : bg_color,
                },
                isFloating && styles.floatingWrapper,
            ]}>
            <View
                pointerEvents="box-none"
                onLayout={onBarLayout}
                style={styles.barRow}>
                <SegmentedTopTabBar
                    {...tabBarProps}
                    backgroundColor={isFloating ? 'transparent' : bg_color}
                />
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
        paddingHorizontal: verticalScale(42),
        justifyContent: 'center',
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
