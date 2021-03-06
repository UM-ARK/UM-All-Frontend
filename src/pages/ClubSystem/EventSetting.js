import React, {Component} from 'react';
import {
    View,
    Text,
    Button,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    TextInput,
} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import {BASE_URI, POST} from '../../utils/pathMap';
import Header from '../../components/Header';
import DialogDIY from '../../components/DialogDIY';
import ImageSelector from '../../components/ImageSelector';
import Loading from '../../components/Loading';
import {handleImageSelect} from '../../utils/fileKits';

import {
    Incubator,
    ExpandableSection,
    Switch,
    RadioGroup,
    RadioButton,
} from 'react-native-ui-lib';
const {TextField} = Incubator;
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FlatGrid} from 'react-native-super-grid';
import axios from 'axios';
import moment from 'moment-timezone';
import FastImage from 'react-native-fast-image';

import {pxToDp} from '../../utils/stylesKits';

const {black, themeColor, white, bg_color, viewShadow} = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = {fontSize: pxToDp(15)};

let cover_image_file = {};
let add_relate_image = [];
let del_relate_image = [];

class EventSetting extends Component {
    state = {
        title: '',
        type: 'activity',
        link: '',
        place: '',
        introText: '',
        startDate: new Date(),
        finishDate: new Date(),
        coverImgUrl: '',
        relateImgUrl: ['', '', '', ''],
        expanded: false,
        allowFollow: true,

        mode: 'create',
        isLoading: true,
        eventData: undefined,
        // Dialog相關
        submitChoice: false,
        borderColor: black.main,
        titleColor: black.main,
        expanded1: false,
        isStartDatePickerVisible: false,
        isEndDatePickerVisible: false,
    };

    componentDidMount() {
        // 檢查是create活動還是edit活動
        let mode = this.props.route.params.mode;
        this.setState({isLoading: false, mode});
        if (mode == 'edit') {
            let eventData = this.props.route.params.eventData;
            this.setState({
                eventData,
                title: eventData.title,
                place: eventData.place,
                link: eventData.type == 'ACTIVITY' ? '' : eventData.link,
                place: eventData.location,
                introText: eventData.introduction,
                coverImgUrl: eventData.cover_image_url,
                allowFollow: eventData.can_follow,
                startDate: new Date(eventData.startdatetime),
                finishDate: new Date(eventData.enddatetime),
                type: eventData.type.toLowerCase(),
            });
            // 渲染服務器已存的照片
            if (
                'relate_image_url' in eventData &&
                eventData.relate_image_url.length > 0
            ) {
                let imgArr = eventData.relate_image_url;
                // 不夠5張則補充
                if (imgArr.length < 4) {
                    let pushArr = new Array(5 - imgArr.length).fill('');
                    let arr = JSON.parse(JSON.stringify(imgArr));
                    arr.push(...pushArr);
                    this.setState({relateImgUrl: arr});
                }
            }
        }
    }

    // 切換類型時要還原部分輸入，避免數據混亂
    initState = () => {
        this.setState({
            link: '',
            place: '',
            introText: '',
            relateImgUrl: ['', '', '', ''],
        });
        add_relate_image = [];
        del_relate_image = [];
    };

    // 圖片選擇
    async handleSelect(index, type) {
        const {eventData} = this.state;
        let imageUrl = '';
        let imageObj = {};
        let cancel = true;
        try {
            let selectResult = await handleImageSelect();
            if (!selectResult.didCancel) {
                imageObj = selectResult.assets[0];
                imageUrl = imageObj.uri;
                cancel = false;
            } else {
                if (type == 'cover' && 'cover_image_url' in eventData) {
                    imageUrl = eventData.cover_image_url;
                }
            }
        } catch (error) {
            console.log('error', error);
        } finally {
            // 修改this.state相片數組的值
            if (type == 'cover') {
                // 如果選擇的是海報圖片
                cover_image_file = imageObj;
                this.setState({coverImgUrl: imageUrl});
            } else if (!cancel) {
                // 如果選擇的是其他相關圖片
                let relateImgUrl = this.state.relateImgUrl;
                relateImgUrl.splice(index, 1, imageUrl);
                add_relate_image.push(imageObj);
                this.setState({relateImgUrl});
            }
        }
    }

    // 圖片刪除
    handleImageDelete = (index, needDelete, type) => {
        const {mode, eventData} = this.state;
        needDelete = mode == 'create' ? false : needDelete;
        let imageUrlArr = this.state.relateImgUrl;
        if (type != 'cover') {
            // 只允許刪除relate圖片
            if (
                needDelete &&
                mode == 'edit' &&
                'relate_image_url' in eventData &&
                index + 1 <= eventData.relate_image_url.length
            ) {
                // console.log('需刪已儲存數組');
                del_relate_image.push(imageUrlArr[index]);
            } else {
                // console.log('需刪除add數組');
                let indexOfAddArray = add_relate_image.indexOf(
                    imageUrlArr[index],
                );
                add_relate_image.splice(indexOfAddArray, 1);
            }
            imageUrlArr.splice(index, 1);
            imageUrlArr.push('');
            this.setState({relateImgUrl: imageUrlArr});
        }
    };

    renderImageSelectorItem = (index, type) => {
        const {mode, eventData} = this.state;
        let imageUrlArr = [];
        if (type == 'cover') {
            imageUrlArr = [this.state.coverImgUrl];
        } else {
            imageUrlArr = this.state.relateImgUrl;
        }

        // 服務器照片庫無數據，del數組留空[]，所有選圖都加入add數組
        let needDelete = false;
        if (mode == 'edit') {
            needDelete =
                'relate_image_url' in eventData &&
                eventData.relate_image_url.length == 0
                    ? false
                    : true;
        }

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
                onPress={() => this.handleSelect(index, type)}>
                {/* 刪除圖片按鈕 */}
                {type == 'relate' && imageUrlArr[index].length > 0 && (
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.imgDeleteButton}
                        onPress={() =>
                            this.handleImageDelete(index, needDelete, type)
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

    // 文本輸入框
    renderTextArea = () => {
        return (
            <TextInput
                multiline={true}
                numberOfLines={8}
                style={{
                    ...styles.inputArea,
                    borderColor: this.state.borderColor,
                    color: this.state.borderColor,
                }}
                maxLength={500}
                value={this.state.introText}
                onChangeText={introText => this.setState({introText})}
                onBlur={() => {
                    this.setState({
                        borderColor: black.third,
                        titleColor: black.main,
                    });
                }}
                onFocus={() => {
                    this.setState({
                        borderColor: themeColor,
                        titleColor: themeColor,
                    });
                }}
            />
        );
    };
    renderExpandHeader1 = () => {
        return (
            <View
                style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                <Text
                    style={{
                        ...styles.inputTitle,
                        color: this.state.titleColor,
                    }}>
                    {'活動詳情修改 '}
                </Text>
                <Ionicons
                    name={this.state.expanded1 ? 'chevron-up' : 'chevron-down'}
                    size={pxToDp(20)}
                    color={this.state.titleColor}
                />
            </View>
        );
    };
    // 活動詳情說明 - 折疊
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

    // 校驗輸入是否合規
    checkInfoOK = () => {
        const {
            title,
            link,
            type,
            startDate,
            finishDate,
            coverImgUrl,
            relateImgUrl,
            place,
            introText,
            mode,
            eventData,
        } = this.state;
        let isOK = false;

        if (mode == 'create') {
            if (type == 'website') {
                isOK =
                    title.length > 0 &&
                    link.length > 0 &&
                    coverImgUrl.length > 0;
            } else if (type == 'activity') {
                isOK =
                    title.length > 0 &&
                    place.length > 0 &&
                    coverImgUrl.length > 0;
            }
        } else if (mode == 'edit') {
            if (type == 'website') {
                isOK =
                    title.length > 0 &&
                    link.length > 0 &&
                    coverImgUrl.length > 0;
            } else if (type == 'activity') {
                isOK =
                    title.length > 0 &&
                    place.length > 0 &&
                    coverImgUrl.length > 0;
            }
        }
        // 結束日期需比開始日期往後
        isOK = isOK && Date.parse(finishDate) >= Date.parse(startDate);
        return isOK;
    };

    // 上傳資料到服務器
    postNewInfo = async () => {
        const {
            title,
            type,
            link,
            startDate,
            finishDate,
            coverImgUrl,
            relateImgUrl,
            place,
            introText,
            allowFollow,

            mode,
            eventData,
        } = this.state;
        this.setState({isLoading: true, submitChoice: false});

        let data = new FormData();
        if (mode == 'edit') {
            data.append('id', eventData._id);
        }
        data.append('title', title);
        data.append('type', type.toUpperCase());
        data.append('link', link);
        if (mode == 'create' || coverImgUrl != eventData.cover_image_url) {
            data.append('cover_image_file', {
                name: cover_image_file.fileName,
                type: cover_image_file.type,
                uri:
                    Platform.OS === 'android'
                        ? cover_image_file.uri
                        : cover_image_file.uri.replace('file://', ''),
            });
        }
        // 上傳圖片，form data類型上傳數組需要逐個加入
        if (add_relate_image.length > 0) {
            add_relate_image.map(item => {
                data.append('add_relate_image', {
                    name: item.fileName,
                    type: item.type,
                    uri:
                        Platform.OS === 'android'
                            ? item.uri
                            : item.uri.replace('file://', ''),
                });
            });
        }
        if (mode == 'edit') {
            data.append('del_relate_image', JSON.stringify(del_relate_image));
        }

        data.append(
            'startdatetime',
            moment(startDate).format('YYYY-MM-DDTHH:mm'),
        );
        data.append(
            'enddatetime',
            moment(finishDate).format('YYYY-MM-DDTHH:mm'),
        );
        data.append('location', place);
        data.append('introduction', introText);
        data.append('can_follow', allowFollow);

        // console.log('待上傳data', data);

        let URL =
            BASE_URI + (mode == 'create' ? POST.EVENT_CREATE : POST.EVENT_EDIT);
        await axios
            .post(URL, data, {
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
                    console.log(json);
                }
            })
            .catch(err => {
                console.log('err', err);
            });
    };

    render() {
        const {isLoading, submitChoice, type, mode} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'活動資訊編輯'} />

                {!isLoading ? (
                    <ScrollView
                        contentContainerStyle={{marginHorizontal: pxToDp(10)}}>
                        {/* 活動類型選擇 */}
                        {!(mode == 'edit') && (
                            <View>
                                <RadioGroup
                                    initialValue={type}
                                    onValueChange={type =>
                                        this.setState({type})
                                    }
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-around',
                                    }}>
                                    <RadioButton
                                        value={'activity'}
                                        label={'普通活動'}
                                        color={themeColor}
                                        onPress={this.initState}
                                    />
                                    <RadioButton
                                        value={'website'}
                                        label={'Website Link跳轉'}
                                        color={themeColor}
                                        onPress={this.initState}
                                    />
                                </RadioGroup>
                                {/* type選擇的提示說明 */}
                                <View style={{marginTop: pxToDp(5)}}>
                                    {type == 'activity' ? (
                                        <Text
                                            style={{
                                                color: black.third,
                                                alignSelf: 'flex-start',
                                            }}>
                                            *
                                            點擊活動卡片會進入詳情頁，允許其他人follow
                                        </Text>
                                    ) : (
                                        <Text
                                            style={{
                                                color: black.third,
                                                alignSelf: 'flex-end',
                                            }}>
                                            * 點擊活動卡片會跳轉到您填寫的網址
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* 活動主題輸入框 */}
                        <TextField
                            placeholder={'主題 *'}
                            floatingPlaceholder
                            floatOnFocus
                            floatingPlaceholderColor={floatingPlaceholderColor}
                            floatingPlaceholderStyle={floatingPlaceholderStyle}
                            hint={'e.g. Python爬蟲工作坊'}
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
                            value={this.state.title}
                            onChangeText={title => this.setState({title})}
                            showCharCounter
                            maxLength={50}
                        />

                        {type == 'website' ? (
                            // Website Link輸入框
                            <TextField
                                placeholder={'Website Link *'}
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
                                        borderBottomWidth: pxToDp(1),
                                        paddingBottom: pxToDp(4),
                                        borderColor: context.isFocused
                                            ? themeColor
                                            : black.third,
                                    };
                                }}
                                color={black.third}
                                value={this.state.link}
                                onChangeText={link => this.setState({link})}
                            />
                        ) : (
                            // 活動地點輸入框
                            <TextField
                                placeholder={'活動地點 *'}
                                floatingPlaceholder
                                floatOnFocus
                                floatingPlaceholderColor={
                                    floatingPlaceholderColor
                                }
                                floatingPlaceholderStyle={
                                    floatingPlaceholderStyle
                                }
                                hint={'e.g. 圖書館4016、E6大堂、Zoom'}
                                dynamicFieldStyle={(
                                    context: FieldContextType,
                                ) => {
                                    return {
                                        borderBottomWidth: 1,
                                        paddingBottom: 4,
                                        borderColor: context.isFocused
                                            ? themeColor
                                            : black.third,
                                    };
                                }}
                                color={black.third}
                                value={this.state.place}
                                onChangeText={place => this.setState({place})}
                                showCharCounter
                                maxLength={30}
                            />
                        )}

                        {/* 活動時間 */}
                        <View style={{marginTop: pxToDp(10)}}>
                            <DateTimePickerModal
                                isVisible={
                                    this.state.isStartDatePickerVisible ||
                                    this.state.isEndDatePickerVisible
                                }
                                date={this.state.startDate}
                                mode="datetime"
                                onConfirm={date => {
                                    const {
                                        isStartDatePickerVisible,
                                        isEndDatePickerVisible,
                                    } = this.state;
                                    if (isStartDatePickerVisible) {
                                        this.setState({
                                            startDate: date,
                                            finishDate: date,
                                            isStartDatePickerVisible: false,
                                        });
                                    } else if (isEndDatePickerVisible) {
                                        this.setState({
                                            finishDate: date,
                                            isEndDatePickerVisible: false,
                                        });
                                    }
                                }}
                                onCancel={() => {
                                    this.setState({
                                        isStartDatePickerVisible: false,
                                        isEndDatePickerVisible: false,
                                    });
                                }}
                            />
                            {/* 開始時間 */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: pxToDp(10),
                                }}
                                activeOpacity={0.8}
                                onPress={() => {
                                    this.setState({
                                        isStartDatePickerVisible: true,
                                    });
                                }}>
                                <Text style={styles.inputTitle}>
                                    {'開始時間 *  '}
                                    <Text
                                        style={{
                                            fontSize: pxToDp(15),
                                            color: black.third,
                                        }}>
                                        {moment(this.state.startDate).format(
                                            'MM-DD, HH:mm',
                                        )}
                                    </Text>
                                </Text>
                                <Ionicons
                                    name={'chevron-back-outline'}
                                    size={pxToDp(20)}
                                    color={black.third}
                                />
                            </TouchableOpacity>
                            {/* 結束時間 */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: pxToDp(10),
                                }}
                                activeOpacity={0.8}
                                onPress={() =>
                                    this.setState({
                                        isEndDatePickerVisible: true,
                                    })
                                }>
                                <Text style={styles.inputTitle}>
                                    {'結束時間 *  '}
                                    <Text
                                        style={{
                                            fontSize: pxToDp(15),
                                            color: black.third,
                                        }}>
                                        {moment(this.state.finishDate).format(
                                            'MM-DD, HH:mm',
                                        )}
                                    </Text>
                                </Text>
                                <Ionicons
                                    name={'chevron-back-outline'}
                                    size={pxToDp(20)}
                                    color={black.third}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* 活動詳情說明 */}
                        {type == 'activity' && (
                            <View style={{marginTop: pxToDp(10)}}>
                                {this.renderExpandSection1()}
                            </View>
                        )}

                        {/* 封面圖片 */}
                        <View style={{marginTop: pxToDp(20)}}>
                            <Text style={styles.inputTitle}>
                                設定封面圖片 *
                            </Text>
                            {this.renderImageSelectorItem(0, 'cover')}
                        </View>

                        {/* 其他圖片 */}
                        {type == 'activity' && (
                            <View style={{marginTop: pxToDp(20)}}>
                                <Text style={styles.inputTitle}>
                                    設定其他圖片
                                </Text>
                                <FlatGrid
                                    maxItemsPerRow={2}
                                    itemDimension={pxToDp(50)}
                                    spacing={pxToDp(10)}
                                    data={this.state.relateImgUrl}
                                    renderItem={({_, index}) =>
                                        this.renderImageSelectorItem(
                                            index,
                                            'relate',
                                        )
                                    }
                                    showsVerticalScrollIndicator={false}
                                    scrollEnabled={false}
                                />
                            </View>
                        )}

                        {/* 允許Follow */}
                        {type == 'activity' && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginTop: pxToDp(10),
                                }}>
                                <Text style={styles.inputTitle}>
                                    允許Follow
                                </Text>
                                <Switch
                                    value={this.state.allowFollow}
                                    onValueChange={(allowFollow: boolean) =>
                                        this.setState({allowFollow})
                                    }
                                    style={{marginLeft: pxToDp(5)}}
                                    onColor={themeColor}
                                />
                            </View>
                        )}

                        {/* 發佈按鈕 */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            onPress={() => {
                                if (this.checkInfoOK()) {
                                    this.setState({submitChoice: true});
                                } else {
                                    alert('輸入有誤，請檢查！');
                                }
                            }}
                            style={{
                                ...styles.submitButton,
                                marginVertical: pxToDp(30),
                            }}>
                            <Text style={{...styles.submitButtonText}}>
                                {this.state.mode == 'create'
                                    ? '發佈'
                                    : '保存修改'}
                            </Text>
                        </TouchableOpacity>
                        {/* 刪除按鈕 */}
                        {this.state.mode == 'edit' && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => alert('確定要刪除嗎？')}
                                style={{
                                    ...styles.submitButton,
                                    backgroundColor: COLOR_DIY.unread,
                                    marginBottom: pxToDp(50),
                                }}>
                                <Text style={{...styles.submitButtonText}}>
                                    刪除
                                </Text>
                            </TouchableOpacity>
                        )}
                    </ScrollView>
                ) : (
                    <View
                        style={{
                            flex: 1,
                            alignItems: 'center',
                            justifyContent: 'center',
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

export default EventSetting;
