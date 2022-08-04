import React, {Component} from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    TextInput,
    KeyboardAvoidingView,
} from 'react-native';

import {pxToDp} from '../../utils/stylesKits';
import {COLOR_DIY} from '../../utils/uiMap';
import {handleImageSelect} from '../../utils/fileKits';
import Header from '../../components/Header';
import {BASE_URI, BASE_HOST, POST} from '../../utils/pathMap';
import DialogDIY from '../../components/DialogDIY';
import Loading from '../../components/Loading';

import {FlatGrid} from 'react-native-super-grid';
import {Incubator, ExpandableSection} from 'react-native-ui-lib';
const {TextField} = Incubator;
import {inject} from 'mobx-react';
import axios from 'axios';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';

const {black, themeColor, white, bg_color} = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = {fontSize: pxToDp(15)};

let add_club_photos = [];
let del_club_photos = [];

class ClubInfoEdit extends Component {
    state = {
        // 確定提交Dialog
        submitChoice: false,
        imageUrlArr: ['', '', '', '', ''],
        introTextInput: '',
        contactInput: [
            {type: 'Wechat', num: ''},
            {type: 'Email', num: ''},
            {type: 'Phone', num: ''},
            {type: 'IG', num: ''},
            {type: 'Facebook', num: ''},
            {type: 'Website', num: ''},
        ],
        clubData: this.props.RootStore.userInfo.clubData,
        isLoading: true,
        // 文本輸入框顏色
        borderColor: black.third,
        titleColor: black.main,
        expanded1: false,
        expanded2: false,
    };

    // 整理從CLubDetail傳過來的社團info
    componentDidMount() {
        const {clubData, imageUrlArr} = this.state;
        if ('intro' in clubData) {
            this.setState({introTextInput: clubData.intro});
        }
        // 渲染服務器已存的照片
        if (
            'club_photos_list' in clubData &&
            clubData.club_photos_list.length > 0
        ) {
            let imgArr = clubData.club_photos_list;
            // 不夠5張則補充
            if (imgArr.length < 5) {
                let pushArr = new Array(5 - imgArr.length).fill('');
                let arr = JSON.parse(JSON.stringify(imgArr));
                arr.push(...pushArr);
                this.setState({imageUrlArr: arr});
            }
        }
        if ('contact' in clubData && clubData.contact.length > 0) {
            this.setState({contactInput: clubData.contact});
        }
        this.setState({isLoading: false});
    }

    // 圖片選擇
    async handleSelect(index) {
        const {clubData} = this.state;
        let imageUrl = '';
        let imageObj = {};
        let cancel = true;
        let chooseOK = false;
        try {
            let selectResult = await handleImageSelect();
            if (!selectResult.didCancel) {
                let imgFileObj = selectResult.assets[0];
                // console.log('selectResult', imgFileObj);
                // 僅允許小於8M的圖片
                if (imgFileObj.fileSize / 1000 / 1024 < 8) {
                    imageObj = selectResult.assets[0];
                    imageUrl = imageObj.uri;
                    cancel = false;
                    chooseOK = true;
                } else {
                    alert('請選擇小於8MB的圖片！\n服務器為愛發電請見諒！');
                }
            } else {
                if (
                    'club_photos_list' in clubData &&
                    clubData.club_photos_list.length > 0
                ) {
                    imageUrl = clubData.club_photos_list[0];
                }
            }
        } catch (error) {
            console.log(error);
        } finally {
            if (!cancel && chooseOK) {
                // 修改this.state相片數組的值
                let imageUrlArr = this.state.imageUrlArr;
                imageUrlArr.splice(index, 1, imageUrl);
                add_club_photos.push(imageObj);
                this.setState({imageUrlArr});
            }
        }
    }

    // 圖片刪除
    handleImageDelete = (index, needDelete) => {
        let imageUrlArr = this.state.imageUrlArr;
        if (
            needDelete &&
            index + 1 <= this.state.clubData.club_photos_list.length
        ) {
            // console.log('需刪已儲存數組');
            del_club_photos.push(imageUrlArr[index]);
        } else {
            // console.log('需刪除add數組');
            let indexOfAddArray = add_club_photos.indexOf(imageUrlArr[index]);
            add_club_photos.splice(indexOfAddArray, 1);
        }
        imageUrlArr.splice(index, 1);
        imageUrlArr.push('');
        this.setState({imageUrlArr});
    };

    // 上傳資料到服務器
    postNewInfo = async () => {
        const {introTextInput, clubData, contactInput} = this.state;
        this.setState({isLoading: true, submitChoice: false});

        let data = new FormData();
        data.append('intro', introTextInput);
        if (contactInput.length > 0) {
            data.append('contact', JSON.stringify(contactInput));
        } else {
            data.append('contact', '[]');
        }
        // 上傳圖片，form data類型上傳數組需要逐個加入
        if (add_club_photos.length > 0) {
            add_club_photos.map(item => {
                data.append('add_club_photos', {
                    name: item.fileName,
                    type: item.type,
                    uri:
                        Platform.OS === 'android'
                            ? item.uri
                            : item.uri.replace('file://', ''),
                });
            });
        } else {
            data.append('add_club_photos', '[]');
        }
        if (del_club_photos.length > 0) {
            // 刪除後綴，根據21.07.30的後端標準，圖片需後端相對路徑
            let delHostArr = [];
            del_club_photos.map(itm => {
                delHostArr.push(itm.slice(BASE_HOST.length));
            });
            del_club_photos = delHostArr;
            data.append('del_club_photos', JSON.stringify(del_club_photos));
        } else {
            data.append('del_club_photos', '[]');
        }

        await axios
            .post(BASE_URI + POST.CLUB_EDIT_INFO, data, {
                headers: {
                    'Content-Type': `multipart/form-data`,
                },
            })
            .then(res => {
                let json = res.data;
                // 上傳成功
                if (json.message == 'success') {
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
                console.log('err', err);
                alert('Warning' + err + '');
            });
    };

    renderImageSelectorItem = index => {
        const {imageUrlArr, clubData} = this.state;

        // 服務器照片庫無數據，del數組留空[]，所有選圖都加入add數組
        let needDelete =
            'club_photos_list' in clubData &&
            clubData.club_photos_list.length == 0
                ? false
                : true;

        // 僅允許點擊相鄰的圖片選擇器
        let shouldDisable = false;
        if (index != 0) {
            if (imageUrlArr[index - 1] == '') {
                shouldDisable = true;
            }
        }

        return (
            <TouchableOpacity
                style={styles.imgSelectorContainer}
                activeOpacity={0.7}
                disabled={shouldDisable}
                // 選擇圖片
                onPress={() => this.handleSelect(index)}>
                {/* 刪除圖片按鈕 */}
                {imageUrlArr[index].length > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.imgDeleteButton}
                        onPress={() =>
                            this.handleImageDelete(index, needDelete)
                        }>
                        <Ionicons
                            name="close-circle"
                            size={pxToDp(25)}
                            color={COLOR_DIY.unread}
                        />
                    </TouchableOpacity>
                )}

                {/* 未選擇圖片則顯示圖標，選中/已有圖片則顯示圖片 */}
                {imageUrlArr[index].length > 0 ? (
                    <FastImage
                        source={{
                            uri: imageUrlArr[index],
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

    renderContactInput = (item, index) => {
        return (
            <TextField
                placeholder={item.type}
                floatingPlaceholder
                floatOnFocus
                floatingPlaceholderColor={floatingPlaceholderColor}
                floatingPlaceholderStyle={floatingPlaceholderStyle}
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
                value={item.num}
                onChangeText={input => {
                    let contactInput = this.state.contactInput;
                    let obj = {type: item.type, num: input};
                    contactInput.splice(index, 1, obj);
                    this.setState({contactInput});
                }}
            />
        );
    };

    renderTextArea = () => {
        return (
            <KeyboardAvoidingView
                behavior={Platform.OS == 'ios' ? 'padding' : 'height'}>
                <TextInput
                    multiline={true}
                    numberOfLines={8}
                    minHeight={Platform.OS === 'ios' ? 20 * 8 : null}
                    style={{
                        ...styles.inputArea,
                        borderColor: this.state.borderColor,
                        color: this.state.borderColor,
                    }}
                    maxLength={500}
                    value={this.state.introTextInput}
                    onChangeText={introTextInput =>
                        this.setState({introTextInput})
                    }
                    onBlur={() => {
                        console.log('失焦');
                        this.setState({
                            borderColor: black.third,
                            titleColor: black.main,
                        });
                    }}
                    onFocus={() => {
                        console.log('聚焦');
                        this.setState({
                            borderColor: themeColor,
                            titleColor: themeColor,
                        });
                    }}
                />
            </KeyboardAvoidingView>
        );
    };

    renderExpandHeader1 = () => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                }}>
                <Text
                    style={{
                        ...styles.title,
                        color: this.state.titleColor,
                    }}>
                    {'簡介修改 '}
                </Text>
                <Ionicons
                    name={this.state.expanded1 ? 'chevron-up' : 'chevron-down'}
                    size={pxToDp(20)}
                    color={this.state.titleColor}
                />
            </View>
        );
    };
    renderExpandHeader2 = () => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'center',
                }}>
                <Text
                    style={{
                        ...styles.title,
                        color: this.state.titleColor,
                    }}>
                    {'聯繫方式修改 '}
                </Text>
                <Ionicons
                    name={this.state.expanded2 ? 'chevron-up' : 'chevron-down'}
                    size={pxToDp(20)}
                    color={this.state.titleColor}
                />
            </View>
        );
    };
    // 簡介
    renderExpandSection1 = () => {
        return (
            <ExpandableSection
                expanded={this.state.expanded1}
                sectionHeader={this.renderExpandHeader1()}
                onPress={() => {
                    this.setState({
                        expanded1: !this.state.expanded1,
                    });
                }}>
                {this.renderTextArea()}
            </ExpandableSection>
        );
    };
    // 聯繫方式
    renderExpandSection2 = () => {
        return (
            <ExpandableSection
                expanded={this.state.expanded2}
                sectionHeader={this.renderExpandHeader2()}
                onPress={() => {
                    this.setState({
                        expanded2: !this.state.expanded2,
                    });
                }}>
                {/* TODO: 文本識別link點擊可跳轉 */}
                {this.state.contactInput.map((item, index) =>
                    this.renderContactInput(item, index),
                )}
            </ExpandableSection>
        );
    };

    // 渲染圖片選擇
    renderImageSelector = () => {
        const {imageUrlArr} = this.state;

        return (
            <View>
                <FlatGrid
                    maxItemsPerRow={2}
                    itemDimension={pxToDp(50)}
                    spacing={pxToDp(10)}
                    data={imageUrlArr}
                    renderItem={({_, index}) =>
                        this.renderImageSelectorItem(index)
                    }
                    showsVerticalScrollIndicator={false}
                    scrollEnabled={false}
                />
            </View>
        );
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
                            <Text style={styles.title}>照片修改</Text>
                            <Text style={{color: black.third}}>
                                *首張圖片將作為主頁背景圖
                            </Text>
                            {this.renderImageSelector()}
                        </View>

                        {/* 簡介 */}
                        <View>{this.renderExpandSection1()}</View>

                        {/* 聯繫方式 */}
                        <View style={{marginTop: pxToDp(20)}}>
                            {this.renderExpandSection2()}
                        </View>

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
    title: {
        alignSelf: 'center',
        color: black.main,
        fontSize: pxToDp(18),
    },
    inputTitle: {
        color: black.main,
        fontSize: pxToDp(16),
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
    },
    submitButton: {
        backgroundColor: themeColor,
        alignItems: 'center',
        alignSelf: 'center',
        marginVertical: pxToDp(40),
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

    // 圖片選擇器
    imgDeleteButton: {
        position: 'absolute',
        top: 0,
        right: 0,
        zIndex: 9,
    },
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

export default inject('RootStore')(ClubInfoEdit);
