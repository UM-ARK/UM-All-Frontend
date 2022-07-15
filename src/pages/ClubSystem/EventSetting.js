import React, {Component} from 'react';
import {View, Text, Button, ScrollView, StyleSheet} from 'react-native';

import {COLOR_DIY} from '../../utils/uiMap';
import Header from '../../components/Header';
import {handleLogout} from '../../utils/storageKits';
import DialogDIY from '../../components/DialogDIY';

import {Incubator, ExpandableSection} from 'react-native-ui-lib';
const {TextField} = Incubator;
import DatePicker from 'react-native-date-picker';
import Ionicons from 'react-native-vector-icons/Ionicons';

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
        expanded: false,
    };

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

                    {/* 其他圖片 */}
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
});

export default EventSetting;
