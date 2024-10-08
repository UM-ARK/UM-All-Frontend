import { View, StyleSheet, Platform, } from 'react-native';
import React, { forwardRef, useMemo, useState } from 'react';
import BottomSheet from '@gorhom/bottom-sheet';
import { COLOR_DIY } from '../../../utils/uiMap';
import { scale, verticalScale } from 'react-native-size-matters';

const CustomBottomSheet = forwardRef((props, ref) => {
    const snapPoints = useMemo(() => ['15%', '30%', '50%', '55%', '60%', '65%', '70%'], []);
    const [currentIdx, setIdx] = useState(-1);

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            keyboardBehavior={Platform.select({
                default: 'extend',
                android: 'interactive'
            })}
            // android_keyboardInputMode='adjustResize'
            // keyboardBlurBehavior='restore'
            enablePanDownToClose={true}
            onChange={(index) => {
                setIdx(index);
                if (index != -1) return
                // props.setHasOpenFalse();
                // TODO: 嘗試優化中
                props?.onStateChange && props.onStateChange(index);
            }}
            // 定義默認抓手指示橫條的樣式
            // handleIndicatorStyle={{ backgroundColor: COLOR_DIY.black }}
            // DIY頂部抓手項目
            // handleComponent={() => {
            //     return (<View style={{ flexDirection: 'row', }}>
            //         <Text style={styles.containerHeadline}>{props.title}</Text>
            //     </View>)
            // }}
            backgroundStyle={{ backgroundColor: COLOR_DIY.bg_color }}
            style={{
                backgroundColor: COLOR_DIY.white,
                borderRadius: scale(20),

                // 增加陰影
                ...(currentIdx != -1 && {
                    ...COLOR_DIY.viewShadow,
                    shadowOffset: { width: 0, height: 12, },
                    shadowOpacity: 0.58,
                    shadowRadius: verticalScale(12),
                    // 適用於Android
                    elevation: 24,
                }),
            }}
        // 設置是否是否手勢拖動上下，會影響BottomSheet內的橫向滑動
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
        alignItems: 'center'
    },
    containerHeadline: {
        fontSize: scale(20),
        fontWeight: '600',
        aligItems: 'center',
        textAlign: 'center',
        width: '100%',
        padding: scale(10),
        color: COLOR_DIY.black
    }
});

export default CustomBottomSheet;
