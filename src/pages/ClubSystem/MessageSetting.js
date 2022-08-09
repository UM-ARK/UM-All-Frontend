import React, {Component} from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    TextInput,
} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import DialogDIY from '../../components/DialogDIY';
import {pxToDp} from '../../utils/stylesKits';
import {BASE_URI, POST} from '../../utils/pathMap';
import {handleImageSelect} from '../../utils/fileKits';

import {
    RadioGroup,
    RadioButton,
    Incubator,
    ExpandableSection,
} from 'react-native-ui-lib';
const {TextField} = Incubator;
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import axios from 'axios';

const {black, themeColor, white, bg_color} = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = {fontSize: pxToDp(15)};

// 待上傳的圖片，file object
let uploadImage = {};

class MessageSetting extends Component {
    state = {
        messageType: 'TEXT',
        content: '',
        coverImgUrl: '',
        websiteLink: '',
        submitChoice: false,
    };

    componentDidMount() {
        let params = this.props.route.params;
        // console.log('公告設置頁', params);
    }

    cleanInput = () => {
        uploadImage = {};
        this.setState({coverImgUrl: '', websiteLink: ''});
    };

    // 文本輸入框
    renderTextArea = () => {
        return (
            <TextInput
                multiline={true}
                numberOfLines={8}
                minHeight={Platform.OS === 'ios' ? 20 * 8 : null}
                style={styles.inputArea}
                maxLength={500}
                placeholder={'e.g. 請參加Python爬蟲工作坊的同學添加群組！'}
                placeholderTextColor={black.third}
                value={this.state.content}
                onChangeText={content => this.setState({content})}
            />
        );
    };

    renderLinkInput = () => {
        const {websiteLink} = this.state;
        return (
            <TextField
                placeholder={'需跳轉網址 *'}
                floatingPlaceholder
                floatOnFocus
                floatingPlaceholderColor={floatingPlaceholderColor}
                floatingPlaceholderStyle={floatingPlaceholderStyle}
                hint={'e.g. https://umall.one/'}
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
                value={websiteLink}
                onChangeText={websiteLink => this.setState({websiteLink})}
            />
        );
    };

    // 圖片選擇
    handleSelect = async () => {
        let imageUrl = '';
        let imageObj = {};
        let cancel = true;
        try {
            let selectResult = await handleImageSelect();
            if (!selectResult.didCancel) {
                let imgFileObj = selectResult.assets[0];
                // 僅允許小於8M的圖片
                if (imgFileObj.fileSize / 1000 / 1024 < 8) {
                    imageObj = selectResult.assets[0];
                    imageUrl = imageObj.uri;
                    cancel = false;
                } else {
                    alert('請選擇小於8MB的圖片！\n服務器為愛發電請見諒！');
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            if (!cancel) {
                // 修改this.state相片數組的值
                uploadImage = imageObj;
                // console.log('coverImgUrl', this.state.coverImgUrl);
                this.setState({coverImgUrl: imageUrl});
                // console.log('coverImgUrl', this.state.coverImgUrl);
            }
        }
    };

    renderImageSelector = () => {
        const {coverImgUrl} = this.state;
        return (
            <TouchableOpacity
                style={styles.imgSelectorContainer}
                activeOpacity={0.7}
                // 選擇圖片
                onPress={this.handleSelect}>
                {/* 未選擇圖片則顯示圖標，選中/已有圖片則顯示圖片 */}
                {coverImgUrl.length > 0 ? (
                    <FastImage
                        source={{
                            uri: coverImgUrl,
                            cache: FastImage.cacheControl.web,
                        }}
                        style={{width: '100%', height: '100%'}}
                    />
                ) : (
                    <Ionicons
                        name="camera-outline"
                        size={pxToDp(25)}
                        color={COLOR_DIY.black.main}
                    />
                )}
            </TouchableOpacity>
        );
    };

    checkOK = () => {
        const {messageType, content, websiteLink} = this.state;
        if (content.length > 0) {
            if (messageType == 'TEXT') {
                return true;
            } else if (
                messageType == 'WEBSITE' &&
                uploadImage &&
                websiteLink.includes('http')
            ) {
                return true;
            } else if (messageType == 'IMAGE' && uploadImage) {
                return true;
            }
        }
    };

    postNewInfo = async () => {
        const {messageType, content, websiteLink} = this.state;
        this.setState({submitChoice: false});

        let params = this.props.route.params;
        let data = new FormData();

        let notice_for = '';
        let activity_id = '';
        if (params.sendTo == 'all') {
            notice_for = 'CLUB';
        } else {
            notice_for = 'ACTIVITY';
            activity_id = params.sendTo;
            data.append('activity_id', activity_id);
        }
        let notice_type = messageType;
        let title = content;
        let link = websiteLink;
        data.append('notice_for', notice_for);
        data.append('notice_type', notice_type);
        data.append('title', title);
        if (link.length > 0) {
            data.append('link', link);
        }
        if (notice_type != 'TEXT') {
            data.append('image', {
                name: uploadImage.fileName,
                type: uploadImage.type,
                uri:
                    Platform.OS === 'android'
                        ? uploadImage.uri
                        : uploadImage.uri.replace('file://', ''),
            });
        }

        await axios
            .post(BASE_URI + POST.NOTICE_CREATE, data, {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            })
            .then(res => {
                let json = res.data;
                // 發佈成功
                if (json.message == 'success') {
                    alert('發佈成功');
                    this.props.navigation.goBack();
                }
                // 發佈失敗
                else {
                    alert('發佈失敗');
                }
            })
            .catch(err => {
                console.log('err', err);
                alert('請求錯誤');
            });
    };

    render() {
        const {messageType, submitChoice} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'新增公告'} />

                <KeyboardAwareScrollView
                    contentContainerStyle={{paddingHorizontal: pxToDp(10)}}>
                    {/* 公告類型選擇 */}
                    <View>
                        <Text style={{fontSize: 15, color: themeColor}}>
                            公告類型選擇 *
                        </Text>
                        <RadioGroup
                            initialValue={messageType}
                            onValueChange={messageType => {
                                this.setState({messageType});
                                this.cleanInput();
                            }}>
                            <RadioButton
                                value={'TEXT'}
                                label={'純文本通知'}
                                color={themeColor}
                            />
                            <RadioButton
                                value={'WEBSITE'}
                                label={'Website Link跳轉'}
                                color={themeColor}
                            />
                            <RadioButton
                                value={'IMAGE'}
                                label={'帶圖片的通知'}
                                color={themeColor}
                            />
                        </RadioGroup>
                        {messageType == 'TEXT' ? (
                            <Text style={{color: black.third}}>
                                *
                                類似WeChat，簡單地發送一條信息。如需識別輸入文本中的link，請輸入完整鏈接:
                                e.g. https://umall.one
                            </Text>
                        ) : null}
                        {messageType == 'WEBSITE' ? (
                            <Text style={{color: black.third}}>
                                *
                                生成有圖片的卡片，用戶點擊後會跳轉到所輸入的link的網站
                            </Text>
                        ) : null}
                        {messageType == 'IMAGE' ? (
                            <Text style={{color: black.third}}>
                                *
                                生成有圖片的卡片，用戶點擊後會打開大圖，文本不宜過長
                            </Text>
                        ) : null}
                    </View>

                    <View style={{marginTop: pxToDp(10)}}>
                        {/* 活動主題輸入框 */}
                        <Text style={{color: themeColor, fontSize: 15}}>
                            公告內容 *
                        </Text>
                        {this.renderTextArea()}
                    </View>

                    {/* Website和圖片公告類型圖片選擇 */}
                    {messageType != 'TEXT' && (
                        <View style={{marginTop: pxToDp(10)}}>
                            <Text style={{color: themeColor, fontSize: 15}}>
                                圖片選擇 *
                            </Text>
                            {this.renderImageSelector()}

                            {messageType == 'WEBSITE'
                                ? this.renderLinkInput()
                                : null}
                        </View>
                    )}

                    {/* 發佈按鈕 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={() => {
                            if (this.checkOK()) {
                                this.setState({submitChoice: true});
                            } else {
                                alert(`信息填寫有誤或未完成！\n請檢查後重試！`);
                            }
                        }}
                        style={styles.submitButton}>
                        <Text style={{...styles.submitButtonText}}>發佈</Text>
                    </TouchableOpacity>

                    <Text style={{color: black.main, alignSelf: 'center'}}>
                        一經發佈，無法撤回、修改
                    </Text>
                </KeyboardAwareScrollView>

                {/* Post前提示 */}
                <DialogDIY
                    showDialog={submitChoice}
                    text={'確定要發佈此公告嗎？'}
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
        marginTop: pxToDp(10),
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
    inputArea: {
        textAlignVertical: 'top',
        borderWidth: pxToDp(1),
        paddingVertical: pxToDp(10),
        paddingHorizontal: pxToDp(15),
        borderRadius: pxToDp(10),
        ...COLOR_DIY.viewShadow,
        backgroundColor: bg_color,
        fontSize: pxToDp(15),
        borderColor: black.third,
        color: black.second,
    },

    // 圖片選擇器
    imgSelectorContainer: {
        width: pxToDp(160),
        height: pxToDp(100),
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: pxToDp(5),
        overflow: 'hidden',
    },
});

export default MessageSetting;
