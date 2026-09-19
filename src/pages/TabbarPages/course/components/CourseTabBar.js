import React, { useMemo } from 'react';
import { View } from 'react-native';
import { MaterialTopTabBar } from '@react-navigation/material-top-tabs';

import { useTheme } from '../../../../components/ThemeContext';
import { TOP_TAB_STRIP_MAX_WIDTH } from '../../../../utils/windowSizeClass';
import { COURSE_TOP_BAR_HEIGHT } from '../constants';
import CourseMoreMenu from './CourseMoreMenu';

/**
 * 選課頁頂欄：段落 Tab（搵課／課表）+ 右側 ⋯。
 *
 * 與「資訊」頁一樣走正常文檔流 + 實色底，保證可讀性；
 * 不疊在內容上（全透明會讓 Tab／搜尋列與課表卡片搶在一起）。
 */
const CourseTabBar = ({
    programmeLevel,
    catalogMetadata,
    onManualUpdate,
    onOpenSharePoint,
    onOpenWhat2RegSettings,
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
            tabStrip: {
                width: '100%',
                // 寬屏時兩個 Tab 不再被拉到左右兩端，手機寬度小於此值不受影響
                maxWidth: TOP_TAB_STRIP_MAX_WIDTH,
                alignSelf: 'center',
            },
        }),
        [bg_color],
    );

    return (
        <View style={styles.wrapper}>
            <View style={styles.row}>
                <View style={styles.tabs}>
                    <View style={styles.tabStrip}>
                        <MaterialTopTabBar {...tabBarProps} />
                    </View>
                </View>
                <CourseMoreMenu
                    programmeLevel={programmeLevel}
                    catalogMetadata={catalogMetadata}
                    onManualUpdate={onManualUpdate}
                    onOpenSharePoint={onOpenSharePoint}
                    onOpenWhat2RegSettings={onOpenWhat2RegSettings}
                    canClear={canClear}
                    onClearPress={onClearPress}
                />
            </View>
        </View>
    );
};

export default CourseTabBar;
