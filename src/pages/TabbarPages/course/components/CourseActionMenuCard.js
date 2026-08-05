import React from 'react';

import {MenuView} from '@react-native-menu/menu';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';

/** 與 TouchableScale 預設相近的彈簧參數 */
const COURSE_CARD_SPRING = {
    damping: 18,
    stiffness: 280,
    mass: 0.4,
};

/**
 * 共用課程卡片選單（@react-native-menu/menu）。
 * 原生 UIButton 會吃掉子層 Pressable 的 pressIn，故改以選單開合驅動縮放回饋。
 */
function CourseActionMenuCard({
    actions,
    onPressAction,
    onOpen,
    menuStyle,
    cardStyle,
    accessibilityLabel,
    children,
}) {
    const cardScale = useSharedValue(1);
    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{scale: cardScale.value}],
    }));

    return (
        <MenuView
            actions={actions}
            onPressAction={onPressAction}
            accessibilityLabel={accessibilityLabel}
            shouldOpenOnLongPress={false}
            onOpenMenu={() => {
                cardScale.value = withSpring(0.96, COURSE_CARD_SPRING);
                onOpen?.();
            }}
            onCloseMenu={() => {
                cardScale.value = withSpring(1, COURSE_CARD_SPRING);
            }}
            style={menuStyle}>
            <Animated.View style={[cardStyle, animatedStyle]}>
                {children}
            </Animated.View>
        </MenuView>
    );
}

export default CourseActionMenuCard;
