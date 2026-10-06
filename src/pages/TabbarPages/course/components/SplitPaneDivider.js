import React, { useMemo, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { scale } from 'react-native-size-matters';

import { useTheme } from '../../../../components/ThemeContext';

/** 可拖動區域寬度：分隔線本身只有一根髮絲線，命中區要留寬一點才好抓 */
const HIT_WIDTH = scale(12);
const GRIP_HEIGHT = scale(36);
const GRIP_WIDTH = scale(4);

/**
 * 寬屏分屏的左右欄分隔線，可拖動改變左欄寬度。
 *
 * 只回報「相對拖動起點的位移」，寬度上下限與持久化由呼叫端決定；
 * 分隔線自身不佔佈局寬度（命中區以 absolute 向兩側外擴），兩欄仍緊貼。
 *
 * @param {Function} onDragStart 開始拖動
 * @param {Function} onDrag 拖動中，參數為相對起點的水平位移（px）
 * @param {Function} onDragEnd 放手（含被取消）；最終寬度以最後一次 onDrag 為準，此處不再帶位移
 * @param {Function} [onReset] 雙擊分隔線，呼叫端恢復默認寬度
 */
const SplitPaneDivider = ({ onDragStart, onDrag, onDragEnd, onReset }) => {
    const { theme } = useTheme();
    const { black, themeColor } = theme;
    const [isDragging, setIsDragging] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    const gesture = useMemo(() => {
        const pan = Gesture.Pan()
            .activeOffsetX([-2, 2])
            .onStart(() => {
                runOnJS(setIsDragging)(true);
                if (onDragStart) {
                    runOnJS(onDragStart)();
                }
            })
            .onUpdate(event => {
                runOnJS(onDrag)(event.translationX);
            })
            .onFinalize(() => {
                runOnJS(setIsDragging)(false);
                runOnJS(onDragEnd)();
            });

        if (!onReset) {
            return pan;
        }

        // 雙擊恢復默認；與拖動並存（Race：先達成者勝，點兩下不會被當成拖動）
        const doubleTap = Gesture.Tap()
            .numberOfTaps(2)
            .onEnd(() => {
                runOnJS(onReset)();
            });

        return Gesture.Race(doubleTap, pan);
    }, [onDrag, onDragEnd, onDragStart, onReset]);

    const isActive = isDragging || isHovered;

    const styles = useMemo(
        () => ({
            line: {
                width: StyleSheet.hairlineWidth,
                height: '100%',
                backgroundColor: black.third + '33',
            },
            hitArea: {
                position: 'absolute',
                top: 0,
                bottom: 0,
                left: -HIT_WIDTH / 2,
                width: HIT_WIDTH,
                alignItems: 'center',
                justifyContent: 'center',
                // web：滑過時顯示左右拖動游標，提示這條線可拖
                ...(Platform.OS === 'web' ? { cursor: 'col-resize' } : {}),
            },
            grip: {
                width: GRIP_WIDTH,
                height: GRIP_HEIGHT,
                borderRadius: GRIP_WIDTH / 2,
                backgroundColor: isActive ? themeColor : black.third + '66',
            },
        }),
        [black.third, isActive, themeColor],
    );

    return (
        <View style={styles.line}>
            <GestureDetector gesture={gesture}>
                <View
                    style={styles.hitArea}
                    onPointerEnter={() => setIsHovered(true)}
                    onPointerLeave={() => setIsHovered(false)}>
                    <View style={styles.grip} />
                </View>
            </GestureDetector>
        </View>
    );
};

export default SplitPaneDivider;
