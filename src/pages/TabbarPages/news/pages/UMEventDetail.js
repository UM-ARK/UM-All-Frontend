import React, { Component } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    StyleSheet,
} from 'react-native';

import { COLOR_DIY } from '../../../../utils/uiMap';
import { pxToDp } from '../../../../utils/stylesKits';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import Header from '../../../../components/Header';

// import {Header} from '@rneui/themed';
import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import moment from 'moment-timezone';

// 解構全局ui設計顏色
const { white, black, viewShadow, bg_color, themeColor } = COLOR_DIY;

const { height: PAGE_HEIGHT } = Dimensions.get('window');
const { width: PAGE_WIDTH } = Dimensions.get('window');
const COMPONENT_WIDTH = PAGE_WIDTH * 0.9;
const COMPONENT_HEIGHT = PAGE_HEIGHT * 0.5;

class UMEventDetail extends Component {
    constructor(props) {
        super(props);

        // 獲取上級路由傳遞的參數
        const eventData = this.props.route.params.data;
        console.log('eventData', eventData);

        // 匹配對應語言的標題，經測試：有時只有1 or 2 or 3種文字的標題、內容
        //共通内容
        let dateFrom = eventData.common.dateFrom;
        let dateTo=eventData.common.dateTo;
        let timeFrom=eventData.common.timeFrom;
        let timeTo=eventData.common.timeTo;

        // 中文
        let title_cn = '';
        let category_cn = '';//
        let organiser_cn = '';
        let coorganiser_cn='';
        let venue_cn = '';
        let content_cn = '';
        let targetAudience_cn = '';
        let speaker_cn = '';
        let remark_cn = '';
        let language_cn = '';
        let contactName_cn = '';
        let contactPhone_cn = '';
        let contactFax_cn = '';
        let contactMail_cn = '';

        // 英文
        let title_en = '';
        let category_en = '';
        let organiser_en = '';
        let coorganiser_en='';
        let venue_en = '';
        let content_en = '';
        let targetAudience_en = '';
        let speaker_en = '';
        let remark_en = '';
        let language_en = '';
        let contactName_en = '';
        let contactPhone_en = '';
        let contactFax_en = '';
        let contactMail_en = '';

        // 葡文
        let title_pt = '';
        let category_pt = '';
        let organiser_pt = '';
        let coorganiser_pt='';
        let venue_pt = '';
        let content_pt = '';
        let targetAudience_pt = '';
        let speaker_pt = '';
        let remark_pt = '';
        let language_pt = '';
        let contactName_pt = '';
        let contactPhone_pt = '';
        let contactFax_pt = '';
        let contactMail_pt = '';

        eventData.details.map(item => {
            if (item.locale == 'en_US') {
                title_en = item.title;
                content_en = item.content;
                speaker_en = item.speakers;
                organiser_en = item.organizedBys;
                coorganiser_en=item.coorganizers;
                venue_en = item.venues;
                targetAudience_en = item.targetAudiences;
                remark_en = item.remark;
                language_en = item.languages;
                contactName_en = item.Name;
                contactPhone_en = item.contactPhone;
                contactFax_en = item.contactFax;
                contactMail_en = item.contactEmail;
            } else if (item.locale == 'pt_PT') {
                title_pt = item.title;
                content_pt = item.speakers;
                speaker_pt = item.contactName;
                organiser_pt = item.organizedBys;
                coorganiser_pt=item.coorganizers;
                venue_pt = item.venues;
                targetAudience_pt = item.targetAudiences;
                remark_pt = item.remark;
                language_pt = item.languages;
                contactName_pt = item.Name;
                contactPhone_pt = item.contactPhone;
                contactFax_pt = item.contactFax;
                contactMail_pt = item.contactEmail;
            } else if (item.locale == 'zh_TW') {
                title_cn = item.title;
                content_cn = item.content;
                speaker_cn = item.speakers;
                organiser_cn = item.organizedBys;
                coorganiser_cn=item.coorganizers;
                venue_cn = item.venues;
                targetAudience_cn = item.targetAudiences;
                remark_cn = item.remark;
                language_cn = item.languages;
                contactName_cn = item.Name;
                contactPhone_cn = item.contactPhone;
                contactFax_cn = item.contactFax;
                contactMail_cn = item.contactEmail;
            }
        });

        // TODO: 
        // common
        // 海報
        // 有無smartPoint
        // 有無每週循環 - array

        // lastModified修改時間

        // 存放新聞數據
        this.state = {
            // 語言模式
            LanguageMode: [
                {
                    locale: 'cn',
                    available: 1,
                    name: '中',
                },
                {
                    locale: 'en',
                    available: 1,
                    name: 'EN',
                },
                {
                    locale: 'pt',
                    available: 1,
                    name: 'PT',
                },
            ],
            chooseMode: 0,
            data: {
                dateFrom,
                dateTo,
                timeFrom,
                timeTo,
                // 中文
                title_cn,
                category_cn,
                organiser_cn,
                coorganiser_cn,
                venue_cn,
                content_cn,
                targetAudience_cn,
                speaker_cn,
                remark_cn,
                language_cn,
                contactName_cn,
                contactPhone_cn,
                contactFax_cn,
                contactMail_cn,
                // 英文
                title_en,
                category_en,
                organiser_en,
                coorganiser_en,
                venue_en,
                content_en,
                targetAudience_en,
                speaker_en,
                remark_en,
                language_en,
                contactName_en,
                contactPhone_en,
                contactFax_en,
                contactMail_en,
                // 葡文
                title_pt,
                category_pt,
                organiser_pt,
                coorganiser_pt,
                venue_pt,
                content_pt,
                targetAudience_pt,
                speaker_pt,
                remark_pt,
                language_pt,
                contactName_pt,
                contactPhone_pt,
                contactFax_pt,
                contactMail_pt,
                // 發佈日期
                // publishDate: newsData.common.publishDate,
                // 最後更新時間
                // lastModified: newsData.lastModified,
                // 海報
                imageUrls:
                    'posterUrl' in eventData.common
                        ? eventData.common.posterUrl.replace('http:', 'https:')
                        : '',
            },
        };
    }

    render() {
        const { LanguageMode, chooseMode, data, } = this.state;
        const { imageUrls } = data;
        const {
            //共通内容
            dateFrom,
            dateTo,
            timeFrom,
            timeTo,
            // 中文
            title_cn,
            category_cn,
            organiser_cn,
            coorganiser_cn,
            venue_cn,
            content_cn,
            targetAudience_cn,
            speaker_cn,
            remark_cn,
            language_cn,
            contactName_cn,
            contactPhone_cn,
            contactFax_cn,
            contactMail_cn,
            // 英文
            title_en,
            category_en,
            organiser_en,
            coorganiser_en,
            venue_en,
            content_en,
            targetAudience_en,
            speaker_en,
            remark_en,
            language_en,
            contactName_en,
            contactPhone_en,
            contactFax_en,
            contactMail_en,
            // 葡文
            title_pt,
            category_pt,
            organiser_pt,
            coorganiser_pt,
            venue_pt,
            content_pt,
            targetAudience_pt,
            speaker_pt,
            remark_pt,
            language_pt,
            contactName_pt,
            contactPhone_pt,
            contactFax_pt,
            contactMail_pt,
        } = this.state.data;
        //判断语言是否存在
        if (title_cn.length <= 0) {
            LanguageMode[0].available = 0;
        }
        if (title_en.length <= 0) {
            LanguageMode[1].available = 0;
        }
        if (title_pt.length <= 0) {
            LanguageMode[2].available = 0;
        }

        //用数组存储内容，便于根据语言筛选条件显示
        var title = [title_cn, title_en, title_pt]
        var category=[category_cn,category_en,category_pt]
        var organiser=[organiser_cn,organiser_en,organiser_pt]
        var coorganiser=[coorganiser_cn,coorganiser_en,coorganiser_pt]
        var venue=[venue_cn,venue_en,venue_pt]
        var content = [content_cn, content_en, content_pt]
        var targetAudience=[targetAudience_cn,targetAudience_en,targetAudience_pt]
        var speaker = [speaker_cn, speaker_en, speaker_pt]
        var remark=[remark_cn,remark_en,remark_pt]
        var language=[language_cn,language_en,language_pt]
        var contactName=[contactName_cn,contactName_en,contactName_pt]
        var contactPhone=[contactPhone_cn,contactPhone_en,contactPhone_pt]
        var contactFax=[contactFax_cn,contactFax_en,contactFax_pt]
        var contactMail=[contactMail_cn,contactMail_en,contactMail_pt]

        return (
            <View style={{ backgroundColor: bg_color, flex: 1 }}>
                <Header title={'活動詳情'} />

                {/* 彈出層展示圖片查看器 */}
                <ImageScrollViewer
                    ref={'imageScrollViewer'}
                    imageUrls={imageUrls}
                // 父組件調用 this.refs.imageScrollViewer.tiggerModal(); 打開圖層
                // 父組件調用 this.refs.imageScrollViewer.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
                />

                <ScrollView style={{ padding: pxToDp(10) }}>
                    {/* 文本模式選擇 3語切換 */}
                    <View
                        style={{
                            flexDirection: 'row',
                            justifyContent: 'space-around',
                        }}>
                        {LanguageMode.map((item, index) => {
                            //只渲染存在的语言的按钮
                            if (item.available == 1) {
                                return (
                                    <TouchableOpacity
                                        activeOpacity={0.8}
                                        style={{
                                            ...styles.languageModeButtonContainer,
                                            backgroundColor:
                                                chooseMode == index
                                                    ? themeColor
                                                    : bg_color,
                                        }}
                                        onPress={() =>
                                            this.setState({ chooseMode: index })
                                        }>
                                        <Text
                                            style={{
                                                color:
                                                    chooseMode == index
                                                        ? bg_color
                                                        : themeColor,
                                            }}>
                                            {item.name}
                                        </Text>
                                    </TouchableOpacity>);
                            }
                        })}
                    </View>

                    {/* 海報 */}
                    <TouchableOpacity
                        activeOpacity={0.8}
                        style={styles.imgContainer}
                        // 瀏覽大圖
                        onPress={() => {
                            this.refs.imageScrollViewer.handleOpenImage(0);
                        }}>
                        <FastImage
                            source={{
                                uri: imageUrls,
                                cache: FastImage.cacheControl.web,
                            }}
                            style={{ width: '100%', height: '100%' }}
                        />
                    </TouchableOpacity>

                    {/* 標題 */}
                    <Text
                        style={{
                            color:
                                title_en.length > 0
                                    ? black.second
                                    : black.main,
                            fontWeight: 'bold',
                            fontSize:
                                title_en.length > 0
                                    ? pxToDp(16)
                                    : pxToDp(18),
                        }}
                        selectable={true}>
                        {title[chooseMode]}
                    </Text>
                    <Text>
                    {moment(dateFrom).format('MM-DD')} {moment(dateTo).format('MM-DD')} {moment(timeFrom).format('HH:SS')} {moment(timeTo).format('HH:SS')}
                    </Text>
                    {/* 詳情 */}
                    <View>
                        <Text
                            style={{
                                color: black.second,
                                fontSize: pxToDp(13),
                            }}
                            selectable={true}>
                            {content[chooseMode]}
                        </Text>
                        <Text>
                            {speaker[chooseMode]}
                        </Text>
                        <Text>
                            {organiser[chooseMode]} {coorganiser[chooseMode]} {venue[chooseMode]} {language[chooseMode]}
                        </Text>
                        <Text>
                            {remark[chooseMode]}
                        </Text>
                        <Text>
                            {targetAudience[chooseMode]}
                        </Text>
                        <Text>
                            {contactName[chooseMode]} {contactPhone[chooseMode]} {contactFax[chooseMode]} {contactMail[chooseMode]}
                        </Text>
                        <View style={{ marginTop: pxToDp(50) }} />
                    </View>

                    {/* 聯繫人 */}
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    languageModeButtonContainer: {
        padding: pxToDp(10),
        marginVertical: pxToDp(5),
        borderRadius: pxToDp(10),
        ...viewShadow,
    },
    imgContainer: {
        width: COMPONENT_WIDTH,
        height: COMPONENT_HEIGHT,
        backgroundColor: bg_color,
        borderRadius: pxToDp(10),
        overflow: 'hidden',
        alignSelf: 'center',
        marginVertical: pxToDp(10),
        ...viewShadow,
    },
});

export default UMEventDetail;
