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
 * 分段切換器與寬屏標題都將角標疊加在「課表」文字右上角，維持文字居中。
 */
export const TimetableTabBadge = () => {
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
 * 寬屏分屏的「課表」標題及角標。
 *
 * @param {{ color: string }} props 標題顏色
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
