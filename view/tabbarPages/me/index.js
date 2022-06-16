import React, { Component } from "react";
import {
    Text,
    View,
    Image,
    TouchableOpacity,
} from "react-native";


//个人信息页
function MePage() {
    return (
        <View style={{
            height: '100%',
            alignItems: 'center',
            backgroundColor: '#BFD0DA',
        }}>
            <View style={{
            height: '20%',
            width: '95%',
            backgroundColor: 'white',
            marginTop: '5%',
            padding: 12,
            elevation: 5,
            borderRadius: 10,
            shadowColor: '#303133',
            alignItems: 'center',
            justifyContent: 'center',
            }}>
                <View style={{
                       height: '100%',
                       width: '100%',
                       marginLeft: '6%',
                       flexDirection: 'row',
                       alignItems: 'center',
                   }}>
                    {/*点击头像可以绑定更换头像*/}
                    <TouchableOpacity activeOpacity={0.5} >
                        <Image source={require("../../../UMARK_Assets/testphoto.png")} style={{
                           height: 80,
                           width: 80,
                       }}/>
                    </TouchableOpacity>
                    <View style={{
                        height: '100%',
                        width: '100%',
                        justifyContent: 'center',
                    }}>                    
                        <Text style={{
                               color: '#909399',
                               fontSize: 20,
                               marginLeft: '6%',
                           }}>{'UM All account name'}</Text>
                        <Text style={{
                               color: '#909399',
                               fontSize: 20,
                               marginLeft: '6%',
                           }}>{'UM ID: DC038281'}</Text>
                    </View>
                    </View>
            </View>
            <TouchableOpacity activeOpacity={0.5} style={{
                   height: '10%',
                   width: '95%',
                   padding: 10,
                   marginTop: '8%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
                   justifyContent: 'center',
               }}>
            <View>
                    <View style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black',marginLeft: '3%'}}>{'UMPass Settings'}</Text>
                    </View>
            </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.5} style={{
                   height: '10%',
                   width: '95%',
                   padding: 10,
                   marginTop: '8%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
                   justifyContent: 'center',
               }}>
            <View>
                    <View style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black',marginLeft: '3%'}}>{'Favorites'}</Text>
                    </View>
            </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.5} style={{
                   height: '10%',
                   width: '95%',
                   padding: 10,
                   marginTop: '2%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
                   justifyContent: 'center',
               }}>
            <View>
                    <View style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black',marginLeft: '3%'}}>{'QR Code'}</Text>
                    </View>
            </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.5} style={{
                   height: '10%',
                   width: '95%',
                   padding: 10,
                   marginTop: '2%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
                   justifyContent: 'center',
               }}>
            <View>
                    <View style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black',marginLeft: '3%'}}>{'General Settings'}</Text>
                    </View>
            </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.5} style={{
                   height: '10%',
                   width: '95%',
                   padding: 10,
                   marginTop: '8%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
                   justifyContent: 'center',
               }}>
            <View>
                    <View style={{
                        height: 48,
                        marginLeft: 10,
                        flexDirection: 'row',
                        alignItems: 'center',
                       }}>
                        <Text style={{fontSize:22,alignItems: 'center',color:'black',marginLeft: '3%'}}>{'About us'}</Text>
                    </View>
            </View>
            </TouchableOpacity>
        </View>
    );
}

export default MePage;