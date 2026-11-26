import React from 'react';
import { View } from 'react-native';
import PhosphorFeatureIcon from '../../info/home/search/components/PhosphorFeatureIcon';
import { scale, verticalScale } from 'react-native-size-matters';
import {
    GlassView,
    isLiquidGlassSupported,
} from '../../../../utils/glassEffect';
import { t } from 'i18next';

import Text from '../../../../components/AppText';
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
    const { black, white, unread, viewShadow, floatingShadow } = theme;
    const borderRadius = scale(20);

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
                style={isLiquidGlassSupported ? { borderRadius, ...viewShadow } : undefined}
                onPress={() => {
                    trigger();
                    onPress?.();
                }}>
                <GlassView
                    isInteractive
                    style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: scale(14),
                        paddingVertical: verticalScale(7),
                        borderRadius,
                        overflow: 'hidden',
                        backgroundColor: isLiquidGlassSupported ? null : white,
                        ...(isLiquidGlassSupported ? {} : floatingShadow),
                    }}>
                    <PhosphorFeatureIcon
                        name="calendar"
                        size={scale(15)}
                        color={black.third}
                    />
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            color: black.third,
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
                </GlassView>
            </TouchableScale>
        </View>
    );
};

export default PlanCapsule;
