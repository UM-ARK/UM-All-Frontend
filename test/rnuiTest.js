import React, {Component} from 'react';
import {
    View,
    TextField,
    Text,
    Button,
    Carousel,
    Toast,
    Drawer,
    Colors,
    ExpandableSection,
} from 'react-native-ui-lib';
import {gestureHandlerRootHOC} from 'react-native-gesture-handler';


class Example extends Component {
    state = {
        visible: true,
    };
    render() {
        let arrTest = [1, 2, 3];

        return (
            <View flex paddingH-25 paddingT-120>
                <Text blue50 text20>
                    Welcome
                </Text>
                <TextField text50 placeholder="username" grey10 />
                <TextField
                    text50
                    placeholder="password"
                    secureTextEntry
                    grey10
                />
                <View marginT-100 center>
                    <Button text70 white background-orange30 label="Login" />
                    <Button link text70 orange30 label="Sign Up" marginT-20 />
                </View>

                <Drawer
                    rightItems={[
                        {
                            text: 'Read',
                            background: Colors.blue30,
                            onPress: () => console.log('read pressed'),
                        },
                    ]}
                    leftItem={{
                        text: 'Delete',
                        background: Colors.red30,
                        onPress: () => console.log('delete pressed'),
                    }}>
                    <View centerV padding-s4 bg-white style={{height: 60}}>
                        <Text text70>Item</Text>
                    </View>
                </Drawer>

                <ExpandableSection
                top={true}
                expanded={false}
                sectionHeader={<Text grey10 text60>The section header</Text>}
                onPress={() => console.log('pressed')}
                ></ExpandableSection>
            </View>
        );
    }
}

export default gestureHandlerRootHOC(Example);