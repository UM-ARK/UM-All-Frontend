import React from 'react';
import { View } from 'react-native';
import { scale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';

import Text from '../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { useCoursePlan } from '../context/CoursePlanContext';
import { TAB_LABEL_FONT_SIZE } from '../constants';

/**
 * 課表段落 Tab 角標：
 * - 有衝突 → 顯示衝突數
 * - 尚未選課 → 小紅點提示去排課
 *
 * 必須嵌在 tabBarLabel 上並用 absolute 疊加，不可用 tabBarBadge（會貼到 ⋯），
 * 也不可佔 flex 寬度（會擠開「課表」與底線）。
 */
const TimetableTabBadge = () => {
    const { theme } = useTheme();
    const { unread, trueWhite } = theme;
    const { conflictCount, planList } = useCoursePlan();

    if (conflictCount > 0) {
        return (
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: scale(-4),
                    right: scale(-10),
                    minWidth: scale(13),
                    paddingHorizontal: scale(3),
                    borderRadius: scale(7),
                    backgroundColor: unread,
                    alignItems: 'center',
                    justifyContent: 'center',
                }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        color: trueWhite,
                        fontSize: scale(8),
                        fontWeight: 'bold',
                    }}>
                    {conflictCount}
                </Text>
            </View>
        );
    }

    if (planList.length === 0) {
        return (
            <View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    top: scale(-2),
                    right: scale(-6),
                    width: scale(7),
                    height: scale(7),
                    borderRadius: scale(4),
                    backgroundColor: unread,
                }}
            />
        );
    }

    return null;
};

/**
 * 「課表」標籤 + 角標（衝突數／空課表紅點）。
 *
 * 手機由 material top tabs 當 tabBarLabel 使用；寬屏分屏時由 CoursePaneHeader 直接渲染。
 *
 * @param {{ color: string }} props React Navigation 傳入的標籤色
 * @returns {React.ReactElement}
 */
const TimetableTabLabel = ({ color }) => {
    const { t } = useTranslation('common');

    return (
        <View>
            <Text
                style={{
                    ...uiStyle.defaultText,
                    color,
                    fontSize: TAB_LABEL_FONT_SIZE,
                    fontWeight: 'bold',
                }}>
                {t('課表')}
            </Text>
            <TimetableTabBadge />
        </View>
    );
};

export default TimetableTabLabel;
