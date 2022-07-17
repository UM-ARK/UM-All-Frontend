import React, {Component} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
} from 'react-native';

import {pxToDp} from '../../utils/stylesKits';
import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {handleLogout} from '../../utils/storageKits';
import DialogDIY from '../../components/DialogDIY';
import ImageSelector from '../../components/ImageSelector';

import {FlatGrid} from 'react-native-super-grid';
import {Incubator, ExpandableSection} from 'react-native-ui-lib';
const {TextField} = Incubator;

const {black, themeColor, white} = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = {fontSize: pxToDp(15)};

class ClubSetting extends Component {
    state = {
        // 退出提示Dialog
        logoutChoice: false,
        coverImgUrl: '',
        relateImgUrl: ['', '', '', ''],
        introText: '',
    };

    // 設定封面圖片
    setCoverImgUrl = imageUrl => {
        this.setState({coverImgUrl: imageUrl[0]});
    };

    // 設定相關圖片Url
    setImageUrlArr = imageUrlArr => {
        this.setState({relateImgUrl: imageUrlArr});
    };

    render() {
        const {logoutChoice} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'社團設置'} />

                <ScrollView
                    contentContainerStyle={{paddingHorizontal: pxToDp(10)}}>
                    <View>
                        <Text>背景圖片修改</Text>

                        <ImageSelector
                            index={0}
                            imageUrlArr={[this.state.coverImgUrl]}
                            setImageUrlArr={this.setCoverImgUrl.bind(this)}
                        />
                    </View>

                    <View>
                        <Text>相關照片修改</Text>
                        <FlatGrid
                            maxItemsPerRow={2}
                            itemDimension={pxToDp(50)}
                            spacing={pxToDp(10)}
                            data={this.state.relateImgUrl}
                            renderItem={({item, index}) => (
                                <ImageSelector
                                    index={index}
                                    imageUrlArr={this.state.relateImgUrl}
                                    setImageUrlArr={this.setImageUrlArr.bind(
                                        this,
                                    )}
                                />
                            )}
                            showsVerticalScrollIndicator={false}
                            scrollEnabled={false}
                        />
                    </View>

                    <View>
                        <Text>簡介修改</Text>
                        <TextField
                            placeholder={'社團簡介'}
                            floatingPlaceholder
                            floatOnFocus
                            floatingPlaceholderColor={floatingPlaceholderColor}
                            floatingPlaceholderStyle={floatingPlaceholderStyle}
                            hint={'e.g. 電腦學會是...'}
                            dynamicFieldStyle={(context: FieldContextType) => {
                                return {
                                    borderBottomWidth: pxToDp(1),
                                    paddingBottom: pxToDp(4),
                                    borderColor: context.isFocused
                                        ? themeColor
                                        : black.third,
                                };
                            }}
                            color={black.third}
                            value={this.state.introText}
                            onChangeText={introText =>
                                this.setState({introText})
                            }
                            showCharCounter
                            maxLength={500}
                        />
                    </View>

                    <View>
                        <Text>聯繫方式修改</Text>
                        {/* TODO: 挑選類型，填寫對應號碼 */}
                        {/* TODO: 文本識別link點擊可跳轉 */}
                    </View>

                    {/* 確定保存修改 */}
                    {/* TODO: 社團info Update邏輯 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => this.setState({logoutChoice: true})}
                        style={styles.submitButton}>
                        <Text style={{...styles.submitButtonText}}>
                            保存修改
                        </Text>
                    </TouchableOpacity>

                    {/* 登出賬號 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => this.setState({logoutChoice: true})}
                        style={{
                            ...styles.submitButton,
                            backgroundColor: COLOR_DIY.unread,
                        }}>
                        <Text style={{...styles.submitButtonText}}>
                            登出賬號
                        </Text>
                    </TouchableOpacity>
                </ScrollView>

                {/* 登出前提示 */}
                <DialogDIY
                    showDialog={logoutChoice}
                    text={'確定要登出賬號嗎？'}
                    handleConfirm={handleLogout}
                    handleCancel={() => this.setState({logoutChoice: false})}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    inputTitle: {
        color: black.main,
        fontSize: pxToDp(16),
    },
    submitButton: {
        backgroundColor: themeColor,
        alignItems: 'center',
        alignSelf: 'center',
        marginVertical: pxToDp(5),
        paddingHorizontal: pxToDp(20),
        paddingVertical: pxToDp(10),
        borderRadius: pxToDp(10),
        ...COLOR_DIY.viewShadow,
    },
    submitButtonText: {
        color: white,
        fontSize: pxToDp(18),
        fontWeight: '500',
    },
});
export default ClubSetting;
