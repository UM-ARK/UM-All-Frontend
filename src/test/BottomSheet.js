import { View, StyleSheet, Text, Button } from 'react-native';
import React, { forwardRef, useMemo } from 'react';
import BottomSheet, { useBottomSheet } from '@gorhom/bottom-sheet';

const CloseBtn = () => {
    const { close } = useBottomSheet();

    return <Button title="Close" onPress={() => close()} />;
};

const CustomBottomSheet = forwardRef((props, ref) => {
    const snapPoints = useMemo(() => ['25%', '50%', '70%'], []);

    return (
        <BottomSheet
            ref={ref}
            index={0}
            snapPoints={snapPoints}
            enablePanDownToClose={true}
            // 定義默認抓手指示橫條的樣式
            // handleIndicatorStyle={{ backgroundColor: '#fff' }}
            // DIY頂部抓手項目
            handleComponent={() => {
                return (<View style={{ flexDirection: 'row', }}>
                    <Text style={styles.containerHeadline}>{props.title}</Text>
                    <Text style={styles.containerHeadline}>Close</Text>
                </View>)
            }}
            backgroundStyle={{ backgroundColor: 'gray' }}
        // 設置是否是否手勢拖動上下，會影響BottomSheet內的橫向滑動
        // enableContentPanningGesture={false}
        >
            <View style={styles.contentContainer}>
                <CloseBtn />
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
        padding: 20,
        color: '#fff'
    }
});

export default CustomBottomSheet;
