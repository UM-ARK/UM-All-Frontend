import React, { createRef } from 'react';
import { View, Text, Button, StyleSheet } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import Carousel from 'react-native-snap-carousel';
import { scale } from 'react-native-size-matters';

class CustomBottomSheet extends React.Component {
    constructor(props) {
        super(props);
        this.bottomSheetRef = createRef();
        this.snapPoints = ['25%', '50%', '75%']; // 设置不同的snap点
        this.state = {
            entries: [1, 2, 3, 4, 5]
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

    _renderItem = ({ item, index }) => {
        return (
            <View style={{
                backgroundColor: 'red',
                padding: scale(10),
            }}>
                <Text style={styles.title}>{item}</Text>
            </View>
        );
    }

    render() {

        const data = Array(50)
            .fill(0)
            .map((_, index) => `index-${index}`);

        const renderItem = (item) => (
            <View key={item} style={styles.itemContainer}>
                <Text>{item}</Text>
            </View>
        );

        return (
            <View style={styles.container}>
                <Button title="Open Bottom Sheet" onPress={this.openBottomSheet} />
                {/* <BottomSheet
                    ref={this.bottomSheetRef}
                    index={-1} // 初始状态关闭
                    snapPoints={this.snapPoints}
                >
                    <View style={styles.contentContainer}>
                        <Text>这里是 Bottom Sheet 内容</Text>
                        <Button title="Close Bottom Sheet" onPress={this.closeBottomSheet} />
                    </View>
                </BottomSheet> */}

                <BottomSheet
                    ref={this.bottomSheetRef}
                    index={1}
                    snapPoints={this.snapPoints}
                    onChange={this.handleSheetChange}
                >
                    <BottomSheetScrollView contentContainerStyle={styles.contentContainer}>
                        <Carousel
                            ref={(c) => { this._carousel = c; }}
                            data={this.state.entries}
                            renderItem={this._renderItem}
                            sliderWidth={300}
                            itemWidth={200}
                        />
                        {data.map(renderItem)}
                    </BottomSheetScrollView>
                </BottomSheet>
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

export default CustomBottomSheet;
