import { View, StyleSheet, Platform, } from 'react-native';
import React, { forwardRef, useMemo, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { COLOR_DIY } from '../../../utils/uiMap';
import { scale, verticalScale } from 'react-native-size-matters';
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useAnimatedStyle, withTiming, } from 'react-native-reanimated';

const CustomBottomSheet = forwardRef((props, ref) => {
    const snapPoints = useMemo(() => ['15%', '30%', '50%', '70%'], []);
    const [currentIdx, setIdx] = useState(-1);

    const shadowRadiusValue = currentIdx !== -1 ? verticalScale(12) : 0;
    const animatedStyles = useAnimatedStyle(() => {
        return {
            shadowOpacity: withTiming(currentIdx !== -1 ? 0.58 : 0, { duration: 300 }),
            shadowRadius: withTiming(shadowRadiusValue, { duration: 300 }),
            elevation: withTiming(currentIdx !== -1 ? 24 : 0, { duration: 300 }), // 適用於 Android
        };
    });

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            enableDynamicSizing={false} // 修復v5無法snapToIndex問題
            topInset={useSafeAreaInsets().top + verticalScale(10)}
            keyboardBehavior={'extend'}
            keyboardBlurBehavior='restore'
            android_keyboardInputMode='adjustResize'
            onClose={() => props?.setHasOpenFalse && props.setHasOpenFalse()}
            // enablePanDownToClose={true}
            backgroundStyle={{ backgroundColor: COLOR_DIY.bg_color }}
            style={[{
                shadowOffset: { width: 0, height: verticalScale(12) },
            }, animatedStyles]}
            handleStyle={{
                backgroundColor: COLOR_DIY.white,
                borderRadius: scale(50),
            }}
            onChange={setIdx}
        // 可以通過react-native-gesture-handler的ScrollView替代react native ScrollView
        // enableContentPanningGesture={false}
        >
            <View style={styles.contentContainer}>
                {props.children}
            </View>
        </BottomSheet >
    );
});

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        backgroundColor: COLOR_DIY.white,
    },
});

export default CustomBottomSheet;
