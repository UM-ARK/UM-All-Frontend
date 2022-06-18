import React, { Component } from "react";
import {
    Text,
    View,
    Image,
    TouchableOpacity,
    ActivityIndicator,
} from "react-native";


//个人信息页
function MePage() {
    return (
        <View style={{
            height: '100%',
            alignItems: 'center',
            backgroundColor: 'f4f7fd',
        }}>
            <View style={{
                height:'13%',
                width:'100%',
                alignItems: 'center',
                backgroundColor:'#2F3A79',
                }}>
                   {/*点击头像可以绑定更换头像*/}
                   <TouchableOpacity activeOpacity={0.5} >
                        <View style={{
                            height:85,
                            width:85,
                            borderRadius:85,
                            backgroundColor:'white',
                            alignItems: 'center',
                            justifyContent: 'center',
                            marginTop: '8%',
                        }}>
                        <Image source={require("../../../UMARK_Assets/testphoto.png")} style={{
                           height: 80,
                           width: 80,
                           borderRadius:80,
                       }}/>
                       </View>
                    </TouchableOpacity>                 
                        <Text style={{
                               color: 'black',
                               fontSize: 30,
                               marginTop:'1%',
                               fontWeight:'700'
                           }}>{'Nick Name'}</Text>
                        <Text style={{
                               color: '#909399',
                               fontSize: 20,
                           }}>{'UM ID: DC038281'}</Text>
           </View>
           <View style={{
            width:'100%',
            height:'15%',
           }}></View>
           <View style={{
            width:'100%',
            height:'20%',
            flexDirection:'row',
            //alignItems: 'center',
            justifyContent: 'center',
           }}>
            {/*图标需要合适的素材*/ }
            <TouchableOpacity activeOpacity={0.5} style={{
                height: '100%',
                width: '28%',
                elevation: 5,
                borderRadius: 10,
                shadowColor: '#303133',
                backgroundColor: 'white', 
                justifyContent: 'center', 
                alignItems: 'center',
            }}>
            <View style={{
                justifyContent: 'center', 
                alignItems: 'center',
            }}>
                <Image source={require("./icon/Verified.png")} style={{
                   height: 80,
                   width: 80,
                   borderRadius:80,
                }}/>
                <Text style={{fontSize:18,fontWeight:'600',marginTop:'5%',alignItems: 'center',justifyContent: 'center',color:'black',}}>{'UMPass'}</Text>
                <Text style={{fontSize:18,fontWeight:'600',alignItems: 'center',justifyContent: 'center',color:'black',}}>{'Settings'}</Text>
            </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.5} style={{
                height: '100%',
                width: '28%',
                elevation: 5,
                borderRadius: 10,
                shadowColor: '#303133',
                backgroundColor: 'white', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginLeft:'3%',
            }}>
            <View style={{
                justifyContent: 'center', 
                alignItems: 'center',
            }}>
                <Image source={require("./icon/Timer.png")} style={{
                   height: 80,
                   width: 80,
                   borderRadius:80,
                }}/>
            <Text style={{fontSize:18,fontWeight:'600',marginTop:'5%',alignItems: 'center',justifyContent: 'center',color:'black',}}>{'Deadline'}</Text>
            <Text style={{fontSize:18,fontWeight:'600',alignItems: 'center',justifyContent: 'center',color:'black',}}>{'Reminder'}</Text>
            </View>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.5} style={{
                height: '100%',
                width: '28%',
                elevation: 5,
                borderRadius: 10,
                shadowColor: '#303133',
                backgroundColor: 'white', 
                justifyContent: 'center', 
                alignItems: 'center',
                marginLeft:'3%',
            }}>
            <View style={{
                justifyContent: 'center', 
                alignItems: 'center',
            }}>
                <Image source={require("./icon/Cogwheel.png")} style={{
                   height: 80,
                   width: 80,
                   borderRadius:80,
                }}/>
                <Text style={{fontSize:18,fontWeight:'600',marginTop:'5%',alignItems: 'center',justifyContent: 'center',color:'black',}}>{'General'}</Text>
                <Text style={{fontSize:18,fontWeight:'600',alignItems: 'center',justifyContent: 'center',color:'black',}}>{'Settings'}</Text>
            </View>
            </TouchableOpacity>
            </View>
            <View style={{
                   height: '26%',
                   width: '90%',
                   padding: 10,
                   marginTop: '4%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: 'white',
                   justifyContent: 'center', 
                   alignItems: 'center'              
            }}>
                <Text style={{alignItems: 'center',justifyContent: 'center',color:'black',}}>这里打算放课程表</Text>
            </View>           
            <TouchableOpacity activeOpacity={0.5} style={{
                   height: '8%',
                   width: '90%',
                   padding: 10,
                   marginTop: '4%',
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
            <Text style={{fontSize:15,fontWeight:'600',marginTop:'4%',alignItems: 'center',justifyContent: 'center',color:'#909399',}}>{'Dual Authentication Remains: 14 Days'}</Text> 
            <TouchableOpacity activeOpacity={0.5} style={{
                   height: '6%',
                   width: '40%',
                   padding: 10,
                   marginTop: '2%',
                   elevation: 5,
                   borderRadius: 10,
                   shadowColor: '#303133',
                   backgroundColor: '#2F3A79',
                   justifyContent: 'center',
                   alignItems: 'center',
            }}>
            <View style={{
                   justifyContent: 'center',
                   alignItems: 'center',
            }}>
            <Text style={{fontSize:18,fontWeight:'700',alignItems: 'center',justifyContent: 'center',color:'white',}}>{'Log Out'}</Text>  
            </View>
            </TouchableOpacity>
        </View>
    );
}

export default MePage;