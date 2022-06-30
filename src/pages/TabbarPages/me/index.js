import React, {Component} from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    StatusBar,    
    AppRegistry,
    StyleSheet,
    TextInput
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../utils/uiMap';
import {pxToDp} from '../../../utils/stylesKits';
import {MeSetting} from './pages/MeSetting';
import {AppSetting} from './pages/AppSetting'
import {AboutUs} from './pages/AboutUs'
import {MyFollow} from './pages/MyFollow'
import {Reminder} from './pages/Reminder'
import {MeScreen} from './MeScreen'


import {Header} from '@rneui/themed';

//登录页面
class Logining extends Component {
    render() {
        return (
            <View style={{
                flex: 1,
                alignItems:'center'
            }}>
                <Image source={require('./icon/moren.jpeg')} style={{
        height:pxToDp(80),
        width:pxToDp(80),
        marginTop:60,
        marginBottom:30,
        borderRadius:pxToDp(80),
    }}/>
                <TextInput placeholder={'請輸入手機號/郵箱'}  style={{
        width:pxToDp(250),
        height:pxToDp(40),
        borderColor: 'lightgrey',
        borderWidth: 1,
        marginBottom:15,
        borderRadius:4,
        textAlign:'center',
        alignSelf:'center'
    }} />
                <TextInput placeholder={'請輸入密碼'}  password={true}  style={{
        width:pxToDp(250),
        height:pxToDp(40),
        borderColor: 'lightgrey',
        borderWidth: 1,
        marginBottom:8,
        borderRadius:4,
        textAlign:'center',
        alignSelf:'center'
    }} />
                <TouchableOpacity style={{
                        height: pxToDp(50),
                        width: pxToDp(200),
                        padding: 10,
                        marginTop: pxToDp(20),
                        backgroundColor: '#005F96',
                        borderRadius:pxToDp(10),
                        justifyContent: 'center',  
                        alignSelf:'center'                 
                }} onPress={() => this.props.navigation.navigate('MeScreen')}>
                    <Text style={{
                        fontSize:20,
                        alignSelf:'center',
                        color:'white',
                        fontWeight:'500'
                    }}>
                        登錄
                    </Text>
                </TouchableOpacity>
                <View style={{
        flexDirection:'row',
        width:'80%',
        justifyContent:'space-between',
        marginTop:pxToDp(30)
    }}>
                    <TouchableOpacity onPress={() => alert('忘記密碼')}>
                    <Text>无法登录</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => alert('新用戶註冊')}>
                    <Text>新用户</Text>
                    </TouchableOpacity>
                </View>
                <View style={{
        flexDirection:'row',
        alignItems:'center',
        position:'absolute',
        bottom:10,
        left:10
    }}>
                </View>
            </View>
        );
    }
}

export default Logining;
