import React, {Component} from 'react';
import {
    View,
    Text,
    Button,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import DialogDIY from '../../components/DialogDIY';
import ImageSelector from '../../components/ImageSelector';

import {Incubator, ExpandableSection, Switch} from 'react-native-ui-lib';
const {TextField} = Incubator;
import DatePicker from 'react-native-date-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';
import {FlatGrid} from 'react-native-super-grid';

import {pxToDp} from '../../utils/stylesKits';

const {black, themeColor, white} = COLOR_DIY;

const floatingPlaceholderColor = {
    focus: themeColor,
    default: black.main,
};
const floatingPlaceholderStyle = {fontSize: pxToDp(15)};

// 時間戳轉時間
function timeTrans(date) {
    var date = new Date(date);
    var Y = date.getFullYear();
    var M =
        date.getMonth() + 1 < 10
            ? '0' + (date.getMonth() + 1)
            : date.getMonth() + 1;
    var D = date.getDate() < 10 ? '0' + date.getDate() : date.getDate();
    var h = date.getHours() < 10 ? '0' + date.getHours() : date.getHours();
    var m =
        date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes();
    var s =
        date.getSeconds() < 10 ? '0' + date.getSeconds() : date.getSeconds();
    return M + '/' + D + ', ' + h + ':' + m;
}

class EventSetting extends Component {
    state = {
        title: '',
        place: '',
        introText: '',
        startDate: new Date(),
        finishDate: new Date(),
        coverImgUrl: '',
        relateImgUrl: ['', '', '', ''],
        expanded: false,
        allowFollow: true,
    };

    componentDidMount() {
        // 檢查是create活動還是edit活動
        let mode = this.props.route.params.mode;
        console.log(mode);
    }

    renderDatePicker = dateType => {
        // 結構對應state的屬性名字，賦值給局部變量date
        let {[dateType]: date} = this.state;
        let title = dateType == 'startDate' ? '活動開始時間:' : '活動結束時間:';
        let minimumDate = dateType == 'startDate' ? null : this.state.startDate;

        return (
            <View style={{marginTop: pxToDp(10)}}>
                <View style={{alignItems: 'center'}}>
                    <DatePicker
                        date={date}
                        onDateChange={date => {
                            this.setState({[dateType]: date});
                        }}
                        androidVariant={'nativeAndroid'}
                        minuteInterval={5}
                        // 設置語言位繁體中文
                        locale={'zh-Hant'}
                        minimumDate={minimumDate}
                    />
                </View>
            </View>
        );
    };

    renderSectionHeader = (title: String, timeText: String) => {
        return (
            <View
                style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                }}>
                <Text style={styles.inputTitle}>
                    {title}
                    <Text
                        style={{
                            fontSize: pxToDp(15),
                            color: this.state.expanded
                                ? themeColor
                                : black.third,
                        }}>
                        {timeText}
                    </Text>
                </Text>
                <Ionicons
                    name={this.state.expanded ? 'chevron-up' : 'chevron-down'}
                    size={pxToDp(20)}
                    color={this.state.expanded ? themeColor : black.third}
                />
            </View>
        );
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
        const {logoutChoice, activeIndex} = this.state;
        return (
            <View style={{flex: 1, backgroundColor: COLOR_DIY.bg_color}}>
                <Header title={'活動資訊編輯'} />

                <ScrollView
                    contentContainerStyle={{marginHorizontal: pxToDp(10)}}>
                    {/* 活動主題輸入框 */}
                    <TextField
                        placeholder={'活動主題'}
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

                    {/* 活動地點輸入框 */}
                    <TextField
                        placeholder={'活動地點'}
                        floatingPlaceholder
                        floatOnFocus
                        floatingPlaceholderColor={floatingPlaceholderColor}
                        floatingPlaceholderStyle={floatingPlaceholderStyle}
                        hint={'e.g. 圖書館4016、E6大堂、Zoom'}
                        dynamicFieldStyle={(context: FieldContextType) => {
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

                    {/* 活動時間 */}
                    <View style={{marginTop: pxToDp(10)}}>
                        <ExpandableSection
                            expanded={this.state.expanded}
                            sectionHeader={this.renderSectionHeader(
                                '活動開始時間:  ',
                                timeTrans(this.state.startDate),
                            )}
                            onPress={() =>
                                this.setState({expanded: !this.state.expanded})
                            }>
                            {this.renderDatePicker('startDate')}
                        </ExpandableSection>

                        <View style={{marginTop: pxToDp(10)}} />
                        <ExpandableSection
                            expanded={this.state.expanded}
                            sectionHeader={this.renderSectionHeader(
                                '活動結束時間:  ',
                                timeTrans(this.state.finishDate),
                            )}
                            onPress={() =>
                                this.setState({expanded: !this.state.expanded})
                            }>
                            {this.renderDatePicker('finishDate')}
                        </ExpandableSection>
                    </View>

                    {/* 活動詳情說明 */}
                    <View style={{marginTop: pxToDp(10)}} />
                    <TextField
                        placeholder={'活動詳情說明'}
                        floatingPlaceholder
                        floatOnFocus
                        floatingPlaceholderColor={floatingPlaceholderColor}
                        floatingPlaceholderStyle={floatingPlaceholderStyle}
                        hint={'e.g. 掃描QRCode，或點擊此處的link報名吧~'}
                        dynamicFieldStyle={(context: FieldContextType) => {
                            return {
                                borderBottomWidth: 1,
                                paddingBottom: 4,
                                borderColor: context.isFocused
                                    ? themeColor
                                    : black.third,
                            };
                        }}
                        color={black.third}
                        value={this.state.introText}
                        onChangeText={introText => this.setState({introText})}
                    />

                    {/* 封面圖片 */}
                    <View style={{marginTop: pxToDp(20)}}>
                        <Text style={styles.inputTitle}>設定封面圖片</Text>
                        <ImageSelector
                            index={0}
                            imageUrlArr={[this.state.coverImgUrl]}
                            setImageUrlArr={this.setCoverImgUrl.bind(this)}
                        />
                    </View>

                    {/* 其他圖片 */}
                    <View style={{marginTop: pxToDp(20)}}>
                        <Text style={styles.inputTitle}>設定其他圖片</Text>
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

                    {/* 允許Follow */}
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                        <Text style={styles.inputTitle}>允許Follow</Text>
                        <Switch
                            value={this.state.allowFollow}
                            onValueChange={(allowFollow: boolean) =>
                                this.setState({allowFollow})
                            }
                        />
                    </View>

                    {/* 發佈按鈕 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        // TODO: 校驗信息是否按要求輸入
                        onPress={() => alert('確定要發佈嗎？')}
                        style={styles.submitButton}>
                        <Text style={{...styles.submitButtonText}}>發佈</Text>
                    </TouchableOpacity>
                    {/* 刪除按鈕 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        // TODO: 校驗信息是否按要求輸入
                        onPress={() => alert('確定要刪除嗎？')}
                        style={{
                            ...styles.submitButton,
                            backgroundColor: COLOR_DIY.unread,
                            marginBottom: pxToDp(50),
                        }}>
                        <Text style={{...styles.submitButtonText}}>刪除</Text>
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

export default EventSetting;
