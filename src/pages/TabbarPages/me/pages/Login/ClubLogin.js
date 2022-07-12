// 登錄頁
import React, {Component} from 'react';
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ScrollView,
    StyleSheet,
    TextInput,
} from 'react-native';

// 本地工具
import {COLOR_DIY} from '../../../../../utils/uiMap';
import {pxToDp} from '../../../../../utils/stylesKits';
import Header from '../../../../../components/Header';
import {handleLogin} from '../../../../../utils/storageKits';

import {NavigationContext} from '@react-navigation/native';
import {Input, Box, Center, Stack, Icon} from 'native-base';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const NBTextInput = () => {
    const [show, setShow] = React.useState(false);
    return (
        <Stack space={4} w="100%" alignItems="center">
            <Input
                variant="rounded"
                w={{
                    base: '75%',
                    md: '25%',
                }}
                InputLeftElement={
                    <Icon
                        as={<MaterialIcons name="person" />}
                        size={5}
                        ml="2"
                        color="muted.400"
                    />
                }
                placeholder="Club Account"
            />
            <Input
                variant="rounded"
                w={{
                    base: '75%',
                    md: '25%',
                }}
                type={show ? 'text' : 'password'}
                InputRightElement={
                    <Icon
                        as={
                            <MaterialIcons
                                name={show ? 'visibility' : 'visibility-off'}
                            />
                        }
                        size={5}
                        mr="2"
                        color="muted.400"
                        onPress={() => setShow(!show)}
                    />
                }
                placeholder="Password"
            />
        </Stack>
    );
};

class ClubLogin extends Component {
    // NavigationContext組件可以在非基頁面拿到路由信息
    // this.context === this.props.navigation 等同效果
    static contextType = NavigationContext;

    render() {
        // TODO: 每個Text標籤都要設置color，避免深色模式字體默認變白色就看不見了
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'社團登錄'} />

                <ScrollView>
                    <Icon
                        as={<MaterialIcons name="person" />}
                        size={pxToDp(120)}
                        ml="2"
                        color="muted.400"
                        style={{alignSelf: 'center'}}
                    />

                    <NBTextInput></NBTextInput>

                    {/* 登錄按鈕 */}
                    <TouchableOpacity
                        style={{
                            height: pxToDp(50),
                            width: pxToDp(100),
                            padding: pxToDp(10),
                            marginTop: pxToDp(20),
                            backgroundColor: COLOR_DIY.themeColor,
                            borderRadius: pxToDp(10),
                            justifyContent: 'center',
                            alignSelf: 'center',
                        }}
                        onPress={() =>
                            handleLogin({
                                clubID: 1,
                                isClub: true,
                                token: 'test',
                            })
                        }>
                        <Text
                            style={{
                                fontSize: 20,
                                alignSelf: 'center',
                                color: 'white',
                                fontWeight: '500',
                            }}>
                            登錄
                        </Text>
                    </TouchableOpacity>

                    {/* 進駐提示 */}
                    <TouchableOpacity
                        onPress={() => alert('彈出聯絡我們提示框')}
                        style={{marginTop: pxToDp(20), alignSelf: 'center'}}>
                        <Text style={{color: COLOR_DIY.black.third}}>
                            沒有賬號?
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        );
    }
}

export default ClubLogin;
