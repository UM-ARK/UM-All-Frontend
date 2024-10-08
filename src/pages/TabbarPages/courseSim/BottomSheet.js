import { View, StyleSheet, Text, Button } from 'react-native';
import React, { forwardRef, useMemo } from 'react';
import BottomSheet, { useBottomSheet } from '@gorhom/bottom-sheet';
import { COLOR_DIY } from '../../../utils/uiMap';

const CloseBtn = () => {
    const { close } = useBottomSheet();

    return <Button title="Close" onPress={() => close()} />;
};

const CustomBottomSheet = forwardRef((props, ref, ) => {
    const snapPoints = useMemo(() => ['15%', '60%', '70%'], []);

    return (
        <BottomSheet
            ref={ref}
            index={-1}
            snapPoints={snapPoints}
            keyboardBehavior='extend'
            enablePanDownToClose={true}
            onChange={(index)=>{
                if(index != -1){
                    return;
                }
                props.setHasOpenFalse();
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
                shadowColor: COLOR_DIY.black,
                shadowOpacity: 0.2,
                shadowRadius: 10,
            }}
        // 設置是否是否手勢拖動上下，會影響BottomSheet內的橫向滑動
        // enableContentPanningGesture={false}
        >
            <View style={styles.contentContainer}>
                {props.children}
            </View>
        </BottomSheet>
    );
});

const styles = StyleSheet.create({
    contentContainer: {
        flex: 1,
        alignItems: 'center'
    },
    containerHeadline: {
        fontSize: 24,
        fontWeight: '600',
        aligItems:'center',
        textAlign:'center',
        width:'100%',
        padding: 10,
        color: COLOR_DIY.black
    }
});

export default CustomBottomSheet;
