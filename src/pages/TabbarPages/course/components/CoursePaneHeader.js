import React, { useMemo } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { COURSE_TOP_BAR_HEIGHT, TAB_LABEL_FONT_SIZE } from '../constants';
import CourseMoreMenu from './CourseMoreMenu';
import TimetableTabLabel from './TimetableTabLabel';

/**
 * 寬屏分屏時每一欄自己的頂欄：段落 Tab 退化成靜態標題，隨所在欄的寬度居中；
 * 給了 menuProps 的那一欄在右側放 ⋯ 選單。
 *
 * 高度、底色與 CourseTabBar 一致，讓瀏覽器拖窗口跨過斷點時頂欄不跳動。
 *
 * @param {'search'|'timetable'} segment 標題對應的段落；課表會帶衝突數／空課表角標
 * @param {object} [menuProps] 有值時渲染 CourseMoreMenu，透傳其全部 props
 */
const CoursePaneHeader = ({ segment, menuProps }) => {
    const { theme } = useTheme();
    const { bg_color, themeColor } = theme;
    const { t } = useTranslation('common');

    const styles = useMemo(
        () => ({
            wrapper: {
                height: COURSE_TOP_BAR_HEIGHT,
                backgroundColor: bg_color,
                flexDirection: 'row',
                alignItems: 'center',
            },
            labelCell: {
                flex: 1,
                alignItems: 'center',
            },
            label: {
                ...uiStyle.defaultText,
                color: themeColor,
                fontSize: TAB_LABEL_FONT_SIZE,
                fontWeight: 'bold',
            },
        }),
        [bg_color, themeColor],
    );

    return (
        <View style={styles.wrapper}>
            <View style={styles.labelCell}>
                {segment === 'timetable' ? (
                    <TimetableTabLabel color={themeColor} />
                ) : (
                    <Text style={styles.label}>{t('搵課')}</Text>
                )}
            </View>
            {menuProps ? <CourseMoreMenu {...menuProps} /> : null}
        </View>
    );
};

export default CoursePaneHeader;
