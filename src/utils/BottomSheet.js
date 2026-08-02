import { View, StyleSheet } from 'react-native';
import React, { forwardRef, useContext, useMemo, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { BottomTabBarHeightContext } from '@react-navigation/bottom-tabs';

import { useTheme } from '../components/ThemeContext';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAnimatedStyle, withTiming } from 'react-native-reanimated';

const CustomBottomSheet = forwardRef((props, ref) => {
    const { theme } = useTheme();
    const { white, black } = theme;
    const insets = useSafeAreaInsets();
    // 讓 sheet 底部停在 Tab Bar 上方，避免最低檔卡在 Tab 位置
    const tabBarHeight =
        useContext(BottomTabBarHeightContext) ?? insets.bottom + 49;
    const bottomInset = props.bottomInset ?? tabBarHeight;

    const styles = StyleSheet.create({
        contentContainer: {
            backgroundColor: white,
            height: '100%',
        },
    });

    // 最低 30%，避免過矮只露出把手、視覺上貼在 Tab Bar
    const snapPoints = useMemo(
        () => props.snapPoints ?? ['30%', '45%', '60%', '80%'],
        [props.snapPoints],
    );
    const [currentIdx, setIdx] = useState(-1);

    const shadowRadiusValue = currentIdx !== -1 ? verticalScale(12) : 0;
    const animatedStyles = useAnimatedStyle(() => {
        return {
            shadowOpacity: withTiming(currentIdx !== -1 ? 0.58 : 0, {
                duration: 300,
            }),
            shadowRadius: withTiming(shadowRadiusValue, { duration: 300 }),
            elevation: withTiming(currentIdx !== -1 ? 24 : 0, {
                duration: 300,
            }), // 適用於 Android
        };
    });

    return (
        <BottomSheet
            ref={ref}
            // 允許呼叫端指定初始／目標檔位；預設關閉。
            // 首次掛載就要打開時必須傳 index（勿只靠 snapToIndex：
            // layout 未完成時 snap 會被 gorhom 直接忽略）。
            index={props.index ?? -1}
            snapPoints={snapPoints}
            enableDynamicSizing={false} // 修復v5無法snapToIndex問題
            topInset={insets.top + verticalScale(10)}
            bottomInset={bottomInset}
            keyboardBehavior={'extend'}
            keyboardBlurBehavior="restore"
            android_keyboardInputMode="adjustResize"
            onClose={() => props?.setHasOpenFalse && props.setHasOpenFalse()}
            enablePanDownToClose={
                props.enablePanDownToClose ??
                ['features', 'home', 'courseSim'].includes(props?.page)
            }
            backgroundStyle={{ backgroundColor: 'transparent' }}
            handleIndicatorStyle={{ backgroundColor: black.third }}
            style={[
                {
                    shadowOffset: { width: 0, height: verticalScale(12) },
                },
                animatedStyles,
            ]}
            handleStyle={{
                backgroundColor: white,
                borderTopLeftRadius: scale(50),
                borderTopRightRadius: scale(50),
            }}
            onAnimate={(fromIndex, toIndex) => {
                props.onAnimate?.(fromIndex, toIndex);
            }}
            onChange={idx => {
                setIdx(idx);
                if (props.onSheetIndexChange) {
                    props.onSheetIndexChange(idx);
                }
            }}
        // 可以通過react-native-gesture-handler的ScrollView替代react native ScrollView
        // enableContentPanningGesture={false}
        >
            <View style={styles.contentContainer}>{props.children}</View>
        </BottomSheet>
    );
});

export default CustomBottomSheet;
