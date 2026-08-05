import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons";
import { scale, verticalScale } from 'react-native-size-matters';
import {
    isLiquidGlassSupported,
    LiquidGlassView,
} from '@callstack/liquid-glass';
import { t } from 'i18next';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';
import { useCoursePlan } from '../context/CoursePlanContext';

/**
 * 搵課段落底部的排課摘要膠囊。
 *
 * 讓使用者在挑課時隨時看到「已排幾科、撞了幾節」，點擊切到課表段落。
 * 未排課時不渲染，避免空狀態下多一塊沒有資訊量的浮層。
 *
 * @param {number} bottom 距底部距離（呼叫端需扣掉 Tab Bar 高度）
 * @param {Function} onPress 點擊後的導覽行為
 */
const PlanCapsule = ({ bottom, onPress }) => {
    const { theme } = useTheme();
    const { themeColor, black, white, unread } = theme;

    const { planList, conflictCount } = useCoursePlan();

    if (planList.length === 0) {
        return null;
    }

    return (
        <View
            style={{
                position: 'absolute',
                bottom,
                alignSelf: 'center',
            }}>
            <TouchableScale
                onPress={() => {
                    trigger();
                    onPress?.();
                }}>
                <LiquidGlassView
                    interactive
                    hover={isLiquidGlassSupported ? { effect: 'highlight' } : null}
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scale(14),
                        paddingVertical: verticalScale(7),
                        borderRadius: scale(20),
                        overflow: 'hidden',
                        backgroundColor: isLiquidGlassSupported ? null : white,
                        ...(isLiquidGlassSupported
                            ? {}
                            : {
                                shadowColor: black.main,
                                shadowOffset: { width: 0, height: 2 },
                                shadowOpacity: 0.1,
                                shadowRadius: 4,
                                elevation: 3,
                            }),
                    }}>
                    <Ionicons
                        name="calendar-outline"
                        size={scale(15)}
                        color={themeColor}
                    />
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: themeColor,
                            fontWeight: 'bold',
                            fontSize: scale(12),
                            marginLeft: scale(5),
                        }}>
                        {t('已排課程數', {
                            ns: 'timetable',
                            num: planList.length,
                        })}
                    </Text>

                    {conflictCount > 0 ? (
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: unread,
                                fontWeight: 'bold',
                                fontSize: scale(12),
                                marginLeft: scale(6),
                            }}>
                            {`· ${t('衝突數', { ns: 'timetable', num: conflictCount })}`}
                        </Text>
                    ) : null}
                </LiquidGlassView>
            </TouchableScale>
        </View>
    );
};

export default PlanCapsule;
