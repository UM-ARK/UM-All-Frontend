import React, { createRef } from 'react';
import {
    View,
    Text,
    Button,
    StyleSheet,
} from 'react-native';

import CustomBottomSheet from './BottomSheet';

import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Carousel from 'react-native-snap-carousel';
import { scale, verticalScale } from 'react-native-size-matters';
import { FlatList, TouchableOpacity } from 'react-native-gesture-handler';

class TestScreen extends React.Component {
    constructor(props) {
        super(props);
        this.bottomSheetRef = createRef();
        this.snapPoints = ['25%', '50%', '75%']; // 设置不同的snap点
        this.state = {
            entries: [1, 2, 3, 4, 5],
            enableHorizon: false,
        }
    }

    openBottomSheet = () => {
        this.bottomSheetRef.current?.snapToIndex(1); // 打开到50%位置
    };

    closeBottomSheet = () => {
        this.bottomSheetRef.current?.close(); // 关闭弹窗
    };

    handleSheetChange = ((index) => {
        console.log("handleSheetChange", index);
    });

    render() {
        const data = Array(50).fill(0).map((_, index) => `index-${index}`);

        return (
            <View style={styles.container}>
                <Button title="Open Bottom Sheet" onPress={this.openBottomSheet} />
                <Button title="Close Bottom Sheet" onPress={this.closeBottomSheet} />

                <CustomBottomSheet ref={this.bottomSheetRef} title={'ABCD'} >
                    <FlatList
                        data={this.state.entries}
                        columnWrapperStyle={this.state.entries.length > 1 ? { flexWrap: 'wrap' } : null}
                        contentContainerStyle={{ alignItems: 'center' }}
                        numColumns={this.state.entries.length}
                        renderItem={({ item: i }) => {
                            console.log(i);

                            return <TouchableOpacity style={{
                                backgroundColor: 'red',
                                padding: scale(10),
                                height: verticalScale(50),
                            }}>
                                <Text style={styles.title}>{i}</Text>
                            </TouchableOpacity>
                        }}
                    />
                </CustomBottomSheet>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 200,
    },
    contentContainer: {
        backgroundColor: "white",
    },
    itemContainer: {
        padding: 6,
        margin: 6,
        backgroundColor: "#eee",
    },
});

export default TestScreen;
