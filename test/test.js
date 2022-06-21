import React, {Component} from 'react';
import { Dimensions, View, Text } from 'react-native';

// 文檔：https://github.com/dohooo/react-native-reanimated-carousel/
import Carousel from 'react-native-reanimated-carousel';

const { width: PAGE_WIDTH } = Dimensions.get('window');

class TestScreen extends Component {

    render() { 
        console.log(this.props.navigation);

        const baseOptions = ({
            vertical: false,
            width: PAGE_WIDTH,
            height: PAGE_WIDTH / 2,
        })

        return (
        <View style={{ flex: 1, paddingTop: 50 }}>
            <Carousel
            {...baseOptions}
            loop
            autoPlay={true}
            autoPlayInterval={2000}
            data={ [1,2,3] }
            renderItem={({ index }: { index: number }) => (
                <View
                    style={{
                    borderWidth: 1,
                    borderColor: 'red',
                    flex: 1,
                    borderRadius: 20,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    paddingHorizontal: 10,
                    }}>
                    <Text>{index}</Text>
                </View>
            )}
            />
        </View>
        );
    }
}

export default TestScreen;