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
import {BASE_URI, POST} from '../../utils/pathMap';
import DialogDIY from '../../components/DialogDIY';
import ImageSelector from '../../components/ImageSelector';
import Loading from '../../components/Loading';

import {FlatGrid} from 'react-native-super-grid';
import {Incubator, ExpandableSection} from 'react-native-ui-lib';
const {TextField} = Incubator;
import {inject} from 'mobx-react';
import qs from 'qs';
import axios from 'axios';

const {black, themeColor, white, bg_color} = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = {fontSize: pxToDp(15)};

class ClubInfoEdit extends Component {
    state = {
        // 確定提交Dialog
        submitChoice: false,
        imageUrlArr: ['', '', '', '', ''],
        introTextInput: '',
        clubData: this.props.RootStore.userInfo.clubData,
        isLoading: true,
    };

    // 設定圖片Url
    setImageUrlArr = imageUrlArr => {
        this.setState({imageUrlArr});
    };

    componentDidMount() {
        const {clubData} = this.state;
        if ('intro' in clubData) {
            this.setState({introTextInput: clubData.intro});
        }
        // TODO: 新增、刪除照片
        // if ('club_photos_list' in clubData) {
        //     this.setState({imageUrlArr: clubData.club_photos_list});
        // }
        this.setState({isLoading: false});
    }

    // 上傳資料到服務器
    postNewInfo = async () => {
        const {introTextInput, clubData} = this.state;
        this.setState({isLoading: true, submitChoice: false});
        let data = {
            intro: introTextInput,
            // 無輸入時要寫'[]'字符串形式
            contact: '[]',
            del_club_photos: '[]',
        };
        await axios({
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'post',
            url: BASE_URI + POST.CLUB_EDIT_INFO,
            data: qs.stringify(data),
        })
            .then(res => {
                console.log(res.data);
                let json = eval('(' + res.data + ')');
                // 上傳成功
                if (json.message == 'success') {
                    console.log(json);
                    alert('上傳成功');
                    // 返回上一頁面，重新請求數據
                    this.props.route.params.refresh();
                    this.props.navigation.goBack();
                }
                // 上傳失敗
                else {
                    alert('上傳失敗');
                }
            })
            .catch(err => {
                alert('Warning', err);
            });
    };

    render() {
        const {clubData, submitChoice, isLoading} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: bg_color}}>
                <Header title={'社團主頁信息編輯'} />

                {!isLoading ? (
                    <ScrollView
                        contentContainerStyle={{paddingHorizontal: pxToDp(10)}}>
                        {/* 圖片修改 */}
                        <View>
                            <Text>照片修改</Text>
                            <Text>首張圖片將作為主頁背景圖</Text>
                            <FlatGrid
                                maxItemsPerRow={2}
                                itemDimension={pxToDp(50)}
                                spacing={pxToDp(10)}
                                data={this.state.imageUrlArr}
                                renderItem={({item, index}) => (
                                    <ImageSelector
                                        index={index}
                                        imageUrlArr={this.state.imageUrlArr}
                                        setImageUrlArr={this.setImageUrlArr.bind(
                                            this,
                                        )}
                                    />
                                )}
                                showsVerticalScrollIndicator={false}
                                scrollEnabled={false}
                            />
                        </View>

                        {/* 簡介 */}
                        <View>
                            <Text>簡介修改</Text>
                            <TextField
                                placeholder={'社團簡介'}
                                floatingPlaceholder
                                floatOnFocus
                                floatingPlaceholderColor={
                                    floatingPlaceholderColor
                                }
                                floatingPlaceholderStyle={
                                    floatingPlaceholderStyle
                                }
                                hint={'e.g. 電腦學會是...'}
                                dynamicFieldStyle={(
                                    context: FieldContextType,
                                ) => {
                                    return {
                                        borderBottomWidth: pxToDp(1),
                                        paddingBottom: pxToDp(4),
                                        borderColor: context.isFocused
                                            ? themeColor
                                            : black.third,
                                    };
                                }}
                                color={black.third}
                                value={this.state.introTextInput}
                                onChangeText={introTextInput =>
                                    this.setState({introTextInput})
                                }
                                showCharCounter
                                maxLength={500}
                            />
                        </View>

                        {/* 聯繫方式 */}
                        <View>
                            <Text>聯繫方式修改</Text>
                            {/* TODO: 挑選類型，填寫對應號碼 */}
                            {/* TODO: 文本識別link點擊可跳轉 */}
                        </View>

                        {/* TODO: */}
                        {/* 保存修改 */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => this.setState({submitChoice: true})}
                            style={styles.submitButton}>
                            <Text style={{...styles.submitButtonText}}>
                                保存修改
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                ) : (
                    <View
                        style={{
                            flex: 1,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: bg_color,
                        }}>
                        <Loading />
                    </View>
                )}

                {/* Post前提示 */}
                <DialogDIY
                    showDialog={submitChoice}
                    text={'確定要保存修改嗎？'}
                    handleConfirm={this.postNewInfo}
                    handleCancel={() => this.setState({submitChoice: false})}
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

export default inject('RootStore')(ClubInfoEdit);
