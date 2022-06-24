// 自定義底部彈出層，用於保存圖片等
import React, {Component} from 'react';
import {
    Dimensions,
    View,
    Text,
    Button,
    TouchableOpacity,
} from 'react-native';

import Modal from 'react-native-modal';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons'

import {pxToDp} from '../src/utils/stylesKits'
import {COLOR_DIY} from '../src/utils/uiMap'

const { width : PAGE_WIDTH} = Dimensions.get('window');
const { height:PAGE_HEIGHT } = Dimensions.get('screen');

class ModalTest extends Component {
    state = {
        isModalBottomVisible:true
    }

    tiggerModal = () => {
        this.setState({ isModalBottomVisible:!this.state.isModalBottomVisible });
        this.props.cancel();
    }

    render() { 
        const {isModalBottomVisible} = this.state;
        return (
            <Modal
                isVisible={isModalBottomVisible} 
                statusBarTranslucent    deviceHeight={PAGE_HEIGHT}
                backdropColor={'black'} backdropOpacity={0.5}
                // animationIn='zoomIn'    animationOut='zoomOut'
                onBackButtonPress={this.tiggerModal} onBackdropPress={this.tiggerModal}
                style={{
                    margin:0,
                    justifyContent:'flex-end',
                    alignItems:'center',
                }}
            >
                <View style={{
                    height:'18%', width:'100%', backgroundColor:COLOR_DIY.meScreenColor.bg_color, 
                    borderTopLeftRadius:pxToDp(15), borderTopRightRadius:pxToDp(15), 
                    overflow:'hidden'}}>
                    <View style={{padding:pxToDp(20)}}>
                        <View style={{justifyContent:'center', alignItems:'center', }}>
                            <TouchableOpacity style={{
                                backgroundColor:COLOR_DIY.white, width:70, height:70, borderRadius:20, 
                                justifyContent:'center', alignItems:'center' }}
                                onPress={()=>alert('調用儲存圖片接口')}
                            >
                                <MaterialIcons name='save-alt' color={COLOR_DIY.themeColor} size={pxToDp(45)}></MaterialIcons>
                            </TouchableOpacity>
                            <Text style={{marginTop:pxToDp(2), color:COLOR_DIY.themeColor}}>保存圖片</Text>
                        </View>
                    </View>
                </View>
            </Modal>
        );
    }
}

export default ModalTest;