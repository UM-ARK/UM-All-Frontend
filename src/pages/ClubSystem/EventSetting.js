import React, { Component } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ActivityIndicator,
} from 'react-native';

import { COLOR_DIY, uiStyle, } from '../../utils/uiMap';
import { BASE_URI, BASE_HOST, POST, GET } from '../../utils/pathMap';
import Header from '../../components/Header';
import DialogDIY from '../../components/DialogDIY';
import Loading from '../../components/Loading';
import { handleImageSelect } from '../../utils/fileKits';

import {
    Incubator,
    ExpandableSection,
    Switch,
    RadioGroup,
    RadioButton,
} from 'react-native-ui-lib';
const { TextField } = Incubator;
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { FlatGrid } from 'react-native-super-grid';
import axios from 'axios';
import moment from 'moment-timezone';
import FastImage from 'react-native-fast-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import ImgComp from 'react-native-compressor';

import { scale } from 'react-native-size-matters';

const { black, themeColor, white, bg_color, viewShadow } = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = { fontSize: scale(15) };

let cover_image_file = {};
let add_relate_image = [];
let del_relate_image = [];

pressDelete = false;

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
        expanded1: true,
        isStartDatePickerVisible: false,
        isEndDatePickerVisible: false,

        dialogText: '',

        imgLoading: true,
    };

    componentDidMount() {
        // 檢查是create活動還是edit活動
        let mode = this.props.route.params.mode;
        this.setState({ mode });
        if (mode == 'edit') {
            let eventData = this.props.route.params.eventData;
            this.getData(eventData._id);
        } else {
            this.setState({ isLoading: false });
        }
    }

    // 獲取該活動信息
    async getData(eventID) {
        try {
            await axios.get(BASE_URI + GET.EVENT_INFO_EVENT_ID + eventID)
                .then(res => {
                    let json = res.data;
                    if (json.message == 'success') {
                        let eventData = json.content;
                        eventData.cover_image_url =
                            BASE_HOST + eventData.cover_image_url;
                        // 渲染服務器已存的照片
                        if (eventData.relate_image_url &&
                            eventData.relate_image_url.length > 0
                        ) {
                            let addHostArr = [];
                            eventData.relate_image_url.map(itm => {
                                addHostArr.push(BASE_HOST + itm);
                            });
                            eventData.relate_image_url = addHostArr;
                            let imgArr = eventData.relate_image_url;
                            // 不夠4張則補充
                            if (imgArr.length <= 4) {
                                let pushArr = new Array(4 - imgArr.length).fill('');
                                let arr = JSON.parse(JSON.stringify(imgArr));
                                arr.push(...pushArr);
                                this.setState({ relateImgUrl: arr });
                            } else {
                                this.setState({ relateImgUrl: imgArr });
                            }
                        }
                        this.setState({
                            eventData,
                            title: eventData.title,
                            link: eventData.type == 'ACTIVITY' ? '' : eventData.link,
                            place: 'location' in eventData ? eventData.location : '',
                            introText: eventData.introduction,
                            coverImgUrl: eventData.cover_image_url,
                            allowFollow: eventData.can_follow,
                            startDate: new Date(
                                String(eventData.startdatetime).replace(' ', 'T'),
                            ),
                            finishDate: new Date(
                                String(eventData.enddatetime).replace(' ', 'T'),
                            ),
                            type: eventData.type.toLowerCase(),
                        });
                    }
                })
        } catch (err) {
            console.error(err);
        } finally {
            this.setState({ isLoading: false })
        }
    }

    componentWillUnmount() {
        cover_image_file = {};
        add_relate_image = [];
        del_relate_image = [];
        pressDelete = false;
        FastImage.clearMemoryCache();
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
        const { eventData } = this.state;
        let imageUrl = '';
        let imageObj = {};
        let cancel = true;
        try {
            let selectResult = await handleImageSelect();
            if (!selectResult.didCancel) {
                let imgFileObj = selectResult.assets[0];
                // 圖片壓縮，返回的是file:// uri路徑
                let compUri = await ImgComp.Image.compress(imgFileObj.uri, {
                    compressionMethod: 'auto',
                });
                imgFileObj.uri = compUri;
                // 僅允許小於10M的圖片
                if (imgFileObj.fileSize / 1000 / 1024 < 10) {
                    imageObj = imgFileObj;
                    imageUrl = imgFileObj.uri;
                    cancel = false;
                } else {
                    alert('請選擇小於10MB的圖片！\n服務器為愛發電請見諒！');
                }
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
                this.setState({ coverImgUrl: imageUrl });
            } else if (!cancel) {
                // 如果選擇的是其他相關圖片
                let relateImgUrl = this.state.relateImgUrl;
                relateImgUrl.splice(index, 1, imageUrl);
                add_relate_image.push(imageObj);
                this.setState({ relateImgUrl });
            }
        }
    }

    // 圖片刪除
    handleImageDelete = (index, needDelete, type) => {
        const { mode, eventData } = this.state;
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
            this.setState({ relateImgUrl: imageUrlArr });
        }
    };

    renderImageSelectorItem = (index, type) => {
        const { mode, eventData, relateImgUrl } = this.state;
        let imageUrlArr = [];
        if (type == 'cover') {
            imageUrlArr = [this.state.coverImgUrl];
        } else {
            imageUrlArr = relateImgUrl;
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
                disabled={
                    type != 'cover' &&
                    (shouldDisable || imageUrlArr[index].length > 0)
                }
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
                            size={scale(25)}
                            color={COLOR_DIY.unread}
                        />
                    </TouchableOpacity>
                )}

                {/* 未選擇圖片則顯示圖標，選中/已有圖片則顯示圖片 */}
                {imageUrlArr[index].length > 0 ? (
                    <FastImage
                        source={{
                            uri: imageUrlArr[index],
                            // cache: FastImage.cacheControl.web,
                        }}
                        style={{ backgroundColor: COLOR_DIY.trueWhite, width: '100%', height: '100%' }}
                        onLoadStart={() => {
                            this.setState({ imgLoading: true });
                        }}
                        onLoad={() => {
                            this.setState({ imgLoading: false });
                        }}>
                        {this.state.imgLoading ? (
                            <View
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'absolute',
                                }}>
                                <ActivityIndicator
                                    size={'large'}
                                    color={COLOR_DIY.themeColor}
                                />
                            </View>
                        ) : null}
                    </FastImage>
                ) : (
                    <Ionicons
                        name="camera-outline"
                        size={scale(25)}
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
                minHeight={Platform.OS === 'ios' ? 20 * 8 : null}
                style={{
                    ...styles.inputArea,
                    borderColor: this.state.borderColor,
                    color: this.state.borderColor,
                }}
                value={this.state.introText}
                onChangeText={introText => this.setState({ introText })}
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
                style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text
                    style={{
                        ...styles.inputTitle,
                        color: themeColor,
                    }}>
                    {'活動簡介、詳情 '}
                </Text>
                <Ionicons
                    name={this.state.expanded1 ? 'chevron-up' : 'chevron-down'}
                    size={scale(20)}
                    color={black.third}
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
                <Text style={{
                    ...uiStyle.defaultText,
                    color: black.third, fontSize: scale(12), marginVertical: scale(5),
                }}>
                    *
                    將問卷等Link直接寫到活動詳情，方便同學直接跳轉！
                </Text>
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
        this.setState({ isLoading: true, submitChoice: false });

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
        } else {
            data.append('add_relate_image', '[]');
        }
        if (mode == 'edit') {
            if (del_relate_image.length > 0) {
                // 刪除後綴，根據21.07.30的後端標準，圖片需後端相對路徑
                let delHostArr = [];
                del_relate_image.map(itm => {
                    delHostArr.push(itm.slice(BASE_HOST.length));
                });
                del_relate_image = delHostArr;
                data.append(
                    'del_relate_image',
                    JSON.stringify(del_relate_image),
                );
            } else {
                data.append('del_relate_image', '[]');
            }
        }

        data.append(
            'startdatetime',
            moment(String(startDate)).format('YYYY-MM-DDTHH:mm'),
        );
        data.append(
            'enddatetime',
            moment(String(finishDate)).format('YYYY-MM-DDTHH:mm'),
        );
        data.append('location', place);
        data.append('introduction', introText);
        data.append('can_follow', allowFollow);

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
                    if (this.props.route.params.refresh) {
                        this.props.route.params.refresh();
                    }
                    this.props.navigation.goBack();
                }
                // 上傳失敗
                else {
                    alert('上傳失敗');
                    // console.log(json);
                }
            })
            .catch(err => {
                // console.log('err', err);
                alert('請求錯誤');
            });
    };

    // 刪除活動
    deleteEvent = async () => {
        this.setState({ isLoading: true, submitChoice: false });
        const { eventData } = this.state;
        let data = new FormData();
        data.append('id', eventData._id);

        let URL = BASE_URI + POST.EVENT_DEL;
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
                    alert('刪除成功');
                    this.props.navigation.goBack();
                }
                // 上傳失敗
                else {
                    alert('上傳失敗');
                    // console.log(json);
                }
            })
            .catch(err => {
                // console.log('err', err);
                alert('請求錯誤');
            });
    };

    render() {
        const {
            isLoading,
            submitChoice,
            dialogText,
            type,
            mode,
            startDate,
            finishDate,
            isStartDatePickerVisible,
            isEndDatePickerVisible,
        } = this.state;
        const canSubmit = this.checkInfoOK();

        return (
            <View style={{ flex: 1, backgroundColor: COLOR_DIY.bg_color }}>
                <Header title={'活動資訊編輯'} />

                {!isLoading ? (
                    <KeyboardAwareScrollView
                        contentContainerStyle={{ marginHorizontal: scale(10) }}>
                        {/* 活動類型選擇 */}
                        {!(mode == 'edit') && (
                            <View>
                                <RadioGroup
                                    initialValue={type}
                                    onValueChange={type =>
                                        this.setState({ type })
                                    }
                                    style={{
                                        flexDirection: 'row',
                                        justifyContent: 'space-around',
                                    }}>
                                    <RadioButton
                                        value={'activity'}
                                        label={'普通活動'}
                                        color={type == 'activity' ? themeColor : black.second}
                                        onPress={this.initState}
                                        labelStyle={{ color: type == 'activity' ? themeColor : black.second }}
                                    />
                                    <RadioButton
                                        value={'website'}
                                        label={'Link跳轉/轉載貼文'}
                                        color={type == 'website' ? themeColor : black.second}
                                        onPress={this.initState}
                                        labelStyle={{ color: type == 'website' ? themeColor : black.second }}
                                    />
                                </RadioGroup>
                                {/* type選擇的提示說明 */}
                                <View style={{ marginTop: scale(5) }}>
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            color: black.third,
                                            alignSelf: 'flex-start',
                                        }}>
                                        {`* 發佈模式說明：`}
                                    </Text>
                                    {type == 'activity' ? (<>
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                color: black.third,
                                                alignSelf: 'flex-start',
                                            }}>
                                            {`* 點擊活動卡片會進入活動詳情頁，在活動詳情處填入問卷/報名Link，讓同學一鍵直達！`}
                                        </Text>
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                color: COLOR_DIY.secondThemeColor,
                                                alignSelf: 'flex-start',
                                            }}>
                                            {`* 如希望轉載貼文，可在上方選擇“Link跳轉”模式發佈`}
                                        </Text>
                                    </>
                                    ) : (
                                        <Text
                                            style={{
                                                ...uiStyle.defaultText,
                                                color: black.third,
                                                alignSelf: 'flex-start',
                                            }}>
                                            {`* 點擊活動卡片會跳轉到您填寫的網址，適合公眾號推文、IG Post`}
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
                            dynamicFieldStyle={(context) => {
                                return {
                                    borderBottomWidth: scale(1),
                                    paddingBottom: scale(4),
                                    borderColor: context.isFocused
                                        ? themeColor
                                        : black.third,
                                };
                            }}
                            color={black.third}
                            value={this.state.title}
                            onChangeText={title => this.setState({ title })}
                            showCharCounter
                            maxLength={50}
                        />

                        {type == 'website' ? (
                            // Website Link輸入框
                            <TextField
                                placeholder={'一鍵跳轉的網址Link *'}
                                floatingPlaceholder
                                floatOnFocus
                                floatingPlaceholderColor={
                                    floatingPlaceholderColor
                                }
                                floatingPlaceholderStyle={
                                    floatingPlaceholderStyle
                                }
                                hint={'e.g. https://wiki.umall.one'}
                                dynamicFieldStyle={(context) => {
                                    return {
                                        borderBottomWidth: scale(1),
                                        paddingBottom: scale(4),
                                        borderColor: context.isFocused
                                            ? themeColor
                                            : black.third,
                                    };
                                }}
                                color={black.third}
                                value={this.state.link}
                                onChangeText={link => this.setState({ link })}
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
                                dynamicFieldStyle={(context) => {
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
                                onChangeText={place => this.setState({ place })}
                                showCharCounter
                                maxLength={30}
                            />
                        )}

                        {/* 活動時間 */}
                        <View style={{ marginTop: scale(10) }}>
                            <DateTimePickerModal
                                isVisible={
                                    isStartDatePickerVisible ||
                                    isEndDatePickerVisible
                                }
                                date={startDate}
                                mode="datetime"
                                onConfirm={date => {
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
                                    marginTop: scale(10),
                                }}
                                activeOpacity={0.8}
                                onPress={() => {
                                    this.setState({
                                        isStartDatePickerVisible: true,
                                    });
                                }}>
                                <Text style={styles.inputTitle}>
                                    {'設定開始時間 *  '}
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            fontSize: scale(15),
                                            color: black.third,
                                        }}>
                                        {moment(String(startDate)).format(
                                            'YYYY/MM/DD, HH:mm',
                                        )}
                                    </Text>
                                </Text>
                                <Ionicons
                                    name={'chevron-back-outline'}
                                    size={scale(20)}
                                    color={black.third}
                                />
                            </TouchableOpacity>
                            {/* 結束時間 */}
                            <TouchableOpacity
                                style={{
                                    flexDirection: 'row',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginTop: scale(10),
                                }}
                                activeOpacity={0.8}
                                onPress={() =>
                                    this.setState({
                                        isEndDatePickerVisible: true,
                                    })
                                }>
                                <Text style={styles.inputTitle}>
                                    {'設定結束時間 *  '}
                                    <Text
                                        style={{
                                            ...uiStyle.defaultText,
                                            fontSize: scale(15),
                                            color: black.third,
                                        }}>
                                        {moment(String(finishDate)).format(
                                            'YYYY/MM/DD, HH:mm',
                                        )}
                                    </Text>
                                </Text>
                                <Ionicons
                                    name={'chevron-back-outline'}
                                    size={scale(20)}
                                    color={black.third}
                                />
                            </TouchableOpacity>
                        </View>

                        {/* 活動詳情說明 */}
                        {type == 'activity' && (
                            <View style={{ marginTop: scale(20), }}>
                                {this.renderExpandSection1()}
                            </View>
                        )}

                        {/* 封面圖片 */}
                        <View style={{ marginTop: scale(20) }}>
                            <Text style={styles.inputTitle}>
                                設定封面圖片 *
                            </Text>
                            {this.renderImageSelectorItem(0, 'cover')}
                        </View>

                        {/* 其他圖片 */}
                        {type == 'activity' && (
                            <View style={{ marginTop: scale(20) }}>
                                <Text style={styles.inputTitle}>
                                    設定其他圖片(選填)
                                </Text>
                                <FlatGrid
                                    maxItemsPerRow={2}
                                    itemDimension={scale(50)}
                                    spacing={scale(10)}
                                    data={this.state.relateImgUrl}
                                    renderItem={({ _, index }) =>
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
                        {false && type == 'activity' && (
                            <View
                                style={{
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    marginTop: scale(10),
                                }}>
                                <Text style={styles.inputTitle}>
                                    允許Follow
                                </Text>
                                <Switch
                                    value={this.state.allowFollow}
                                    onValueChange={(allowFollow) =>
                                        this.setState({ allowFollow })
                                    }
                                    style={{ marginLeft: scale(5) }}
                                    onColor={themeColor}
                                />
                            </View>
                        )}

                        {/* 發佈按鈕 */}
                        <TouchableOpacity
                            activeOpacity={0.8}
                            disabled={!canSubmit}
                            onPress={() => {
                                if (canSubmit) {
                                    pressDelete = false;
                                    this.setState({
                                        submitChoice: true,
                                        dialogText: '確定要保存修改嗎？',
                                    });
                                } else {
                                    alert('輸入有誤，請檢查！');
                                }
                            }}
                            style={{
                                ...styles.submitButton,
                                backgroundColor: canSubmit ? themeColor : black.third,
                                marginVertical: scale(30),
                            }}>
                            <Text style={{ ...styles.submitButtonText }}>
                                {this.state.mode == 'create'
                                    ? '發佈'
                                    : '保存修改'}
                            </Text>
                        </TouchableOpacity>
                        {/* 刪除按鈕 */}
                        {this.state.mode == 'edit' && (
                            <TouchableOpacity
                                activeOpacity={0.8}
                                onPress={() => {
                                    pressDelete = true;
                                    this.setState({
                                        submitChoice: true,
                                        dialogText: '確定要刪除該活動嗎？',
                                    });
                                }}
                                style={{
                                    ...styles.submitButton,
                                    backgroundColor: COLOR_DIY.unread,
                                    marginBottom: scale(50),
                                }}>
                                <Text style={{ ...styles.submitButtonText }}>
                                    刪除
                                </Text>
                            </TouchableOpacity>
                        )}
                    </KeyboardAwareScrollView>
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
                    text={dialogText}
                    handleConfirm={
                        pressDelete ? this.deleteEvent : this.postNewInfo
                    }
                    handleCancel={() => this.setState({ submitChoice: false })}
                />
            </View>
        );
    }
}

const styles = StyleSheet.create({
    inputTitle: {
        ...uiStyle.defaultText,
        color: themeColor,
        fontSize: scale(16),
    },
    inputArea: {
        ...uiStyle.defaultText,
        textAlignVertical: 'top',
        borderWidth: scale(1),
        paddingVertical: scale(10),
        paddingHorizontal: scale(15),
        borderRadius: scale(10),
        ...COLOR_DIY.viewShadow,
        backgroundColor: bg_color,
        fontSize: scale(15),
    },
    submitButton: {
        backgroundColor: themeColor,
        alignItems: 'center',
        alignSelf: 'center',
        marginVertical: scale(5),
        paddingHorizontal: scale(20),
        paddingVertical: scale(10),
        borderRadius: scale(10),
        ...COLOR_DIY.viewShadow,
    },
    submitButtonText: {
        ...uiStyle.defaultText,
        color: white,
        fontSize: scale(18),
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
        width: scale(150),
        height: scale(100),
        backgroundColor: COLOR_DIY.eventColor.imageCard,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: scale(5),
        overflow: 'hidden',
    },
});

export default EventSetting;
