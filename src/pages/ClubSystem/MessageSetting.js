import React, {Component} from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import DialogDIY from '../../components/DialogDIY';
import {pxToDp} from '../../utils/stylesKits';
import ImageSelector from '../../components/ImageSelector';

import {
    RadioGroup,
    RadioButton,
    Incubator,
    ExpandableSection,
} from 'react-native-ui-lib';
const {TextField} = Incubator;

const {black, themeColor, white} = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = {fontSize: pxToDp(15)};

class MessageSetting extends Component {
    state = {
        messageType: 'text',
        toObjType: 'club',
        content: '',
        coverImgUrl: '',
        websiteLink: '',
    };

    // 設定封面圖片
    setCoverImgUrl = imageUrl => {
        this.setState({coverImgUrl: imageUrl[0]});
    };

    render() {
        const {messageType, content, websiteLink, toObjType} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'公告推送設置'} />

                <ScrollView
                    contentContainerStyle={{paddingHorizontal: pxToDp(10)}}>
                    <View>
                        <Text>公告類型選擇</Text>
                        <RadioGroup
                            initialValue={messageType}
                            onValueChange={messageType =>
                                this.setState({messageType})
                            }>
                            <RadioButton value={'text'} label={'純文本通知'} />
                            <RadioButton
                                value={'website'}
                                label={'Website Link跳轉'}
                            />
                            <RadioButton
                                value={'image'}
                                label={'帶圖片的通知'}
                            />
                        </RadioGroup>
                    </View>

                    <View>
                        <Text>推送對象選擇</Text>
                        <RadioGroup
                            initialValue={toObjType}
                            onValueChange={toObjType =>
                                this.setState({toObjType})
                            }>
                            <RadioButton
                                value={'club'}
                                label={'Follow社團的用戶'}
                            />
                            <RadioButton
                                value={'event'}
                                label={'Follow某活動的用戶'}
                            />
                        </RadioGroup>
                        {toObjType == 'event' && (
                            <View>
                                <Text>
                                    TODO:
                                    展示已發佈的活動列表，並可以選擇某一活動
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 不同類型有不同的設置 */}
                    {/* TODO: 文本內鏈接跳轉 */}
                    <View>
                        <Text>公告內容設定</Text>
                        {/* 活動主題輸入框 */}
                        <TextField
                            placeholder={'消息內容'}
                            floatingPlaceholder
                            floatOnFocus
                            floatingPlaceholderColor={floatingPlaceholderColor}
                            floatingPlaceholderStyle={floatingPlaceholderStyle}
                            hint={'e.g. Python爬蟲工作坊即將開始！！！'}
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
                            value={content}
                            onChangeText={content => this.setState({content})}
                            showCharCounter
                            maxLength={50}
                        />

                        {/* Website和圖片類型圖片選擇 */}
                        {messageType != 'text' && (
                            <View>
                                <Text>Website和圖片類型圖片選擇</Text>
                                <ImageSelector
                                    index={0}
                                    imageUrlArr={[this.state.coverImgUrl]}
                                    setImageUrlArr={this.setCoverImgUrl.bind(
                                        this,
                                    )}
                                />
                                {messageType == 'website' && (
                                    <View>
                                        <Text>需要跳轉的Websitelink</Text>
                                        {/* TODO: 檢視網站是否合法格式 */}
                                        <TextField
                                            placeholder={'跳轉網站鏈接'}
                                            floatingPlaceholder
                                            floatOnFocus
                                            floatingPlaceholderColor={
                                                floatingPlaceholderColor
                                            }
                                            floatingPlaceholderStyle={
                                                floatingPlaceholderStyle
                                            }
                                            hint={'e.g. https://ark.boxz.dev/'}
                                            dynamicFieldStyle={(
                                                context: FieldContextType,
                                            ) => {
                                                return {
                                                    borderBottomWidth:
                                                        pxToDp(1),
                                                    paddingBottom: pxToDp(4),
                                                    borderColor:
                                                        context.isFocused
                                                            ? themeColor
                                                            : black.third,
                                                };
                                            }}
                                            color={black.third}
                                            value={websiteLink}
                                            onChangeText={websiteLink =>
                                                this.setState({websiteLink})
                                            }
                                        />
                                    </View>
                                )}
                            </View>
                        )}
                    </View>

                    {/* 發佈按鈕 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        // TODO: 校驗信息是否按要求輸入
                        onPress={() => alert('確定要發佈嗎？')}
                        style={styles.submitButton}>
                        <Text style={{...styles.submitButtonText}}>發佈</Text>
                    </TouchableOpacity>
                </ScrollView>
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

export default MessageSetting;
