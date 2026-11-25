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
    ...tabBarProps
}) => {
    const { theme } = useTheme();
    const { bg_color } = theme;

    return (
        <View style={[styles.wrapper, { backgroundColor: bg_color }]}>
            <SegmentedTopTabBar {...tabBarProps} backgroundColor={bg_color} />
            <View style={styles.menu}>
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
    );
};

const styles = StyleSheet.create({
    wrapper: {
        paddingHorizontal: verticalScale(42),
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
