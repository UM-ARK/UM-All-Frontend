import React, {Component} from 'react';
import {View, Text, Button, ScrollView} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {handleLogout} from '../../utils/storageKits';
import DialogDIY from '../../components/DialogDIY';

import {Wizard} from 'react-native-ui-lib';

const flavors = ['Chocolate', 'Vanilla'];
const initialFlavor = flavors[0];

const {black, themeColor, white} = COLOR_DIY;

class EventSetting extends Component {
    state = {
        activeIndex: 0,
        completedStepIndex: undefined,
        allTypesIndex: 0,
        selectedFlavor: initialFlavor,
        customerName: undefined,
        toastMessage: undefined,
    };

    onActiveIndexChanged = (activeIndex: number) => {
        this.setState({activeIndex});
    };

    renderCurrentStep = () => {
        const {activeIndex} = this.state;

        switch (activeIndex) {
            case 0:
            default:
                return (
                    <View>
                        <Text>Step1</Text>
                        <Button
                            title="Next"
                            onPress={() =>
                                this.setState({activeIndex: activeIndex + 1})
                            }></Button>
                    </View>
                );
            case 1:
                return (
                    <View>
                        <Text>Step2</Text>
                    </View>
                );
            case 2:
                return (
                    <View>
                        <Text>Step3</Text>
                    </View>
                );
        }
    };

    getStepState(index: number) {
        const {activeIndex, completedStepIndex} = this.state;
        let state = Wizard.States.DISABLED;
        if (completedStepIndex > index - 1) {
            state = Wizard.States.COMPLETED;
        } else if (activeIndex === index || completedStepIndex === index - 1) {
            state = Wizard.States.ENABLED;
        }
        return state;
    }

    render() {
        const {logoutChoice, activeIndex} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'活動資訊編輯'} />

                <ScrollView>
                    <Wizard
                        testID={'uilib.wizard'}
                        activeIndex={activeIndex}
                        onActiveIndexChanged={this.onActiveIndexChanged}>
                        <Wizard.Step
                            state={this.getStepState(0)}
                            label={'設定活動主題'}
                            circleColor={themeColor}
                            // circleBackgroundColor={themeColor}
                        />
                        <Wizard.Step
                            state={this.getStepState(1)}
                            label={'Customer details'}
                            circleColor={themeColor}
                        />
                        <Wizard.Step
                            state={this.getStepState(2)}
                            label={'Checkout'}
                            circleColor={themeColor}
                        />
                    </Wizard>
                    {this.renderCurrentStep()}
                </ScrollView>
            </View>
        );
    }
}

export default EventSetting;
