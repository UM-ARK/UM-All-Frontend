import React, { useMemo } from 'react';
import { View } from 'react-native';
import { MaterialTopTabBar } from '@react-navigation/material-top-tabs';

import { useTheme } from '../../../../components/ThemeContext';
import { COURSE_TOP_BAR_HEIGHT } from '../constants';
import CourseMoreMenu from './CourseMoreMenu';

/**
 * 選課頁頂欄：段落 Tab（搵課／課表）+ 右側 ⋯。
 *
 * 與「資訊」頁一樣走正常文檔流 + 實色底，保證可讀性；
 * 不疊在內容上（全透明會讓 Tab／搜尋列與課表卡片搶在一起）。
 */
const CourseTabBar = ({
    courseVersion,
    onManualUpdate,
    onOpenSharePoint,
    canClear,
    onClearPress,
    ...tabBarProps
}) => {
    const { theme } = useTheme();
    const { bg_color } = theme;

    const styles = useMemo(
        () => ({
            wrapper: {
                height: COURSE_TOP_BAR_HEIGHT,
                backgroundColor: bg_color,
            },
            row: {
                flex: 1,
                flexDirection: 'row',
                alignItems: 'center',
            },
            tabs: {
                flex: 1,
            },
        }),
        [bg_color],
    );

    return (
        <View style={styles.wrapper}>
            <View style={styles.row}>
                <View style={styles.tabs}>
                    <MaterialTopTabBar {...tabBarProps} />
                </View>
                <CourseMoreMenu
                    courseVersion={courseVersion}
                    onManualUpdate={onManualUpdate}
                    onOpenSharePoint={onOpenSharePoint}
                    canClear={canClear}
                    onClearPress={onClearPress}
                />
            </View>
        </View>
    );
};

export default CourseTabBar;
