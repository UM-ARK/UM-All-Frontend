import React, { Component } from 'react';
import {
    View,
    Image,
    Text,
    TouchableOpacity,
    Dimensions,
    ScrollView,
    StyleSheet,
    ActivityIndicator,
} from 'react-native';

import { COLOR_DIY, uiStyle, } from '../../../../utils/uiMap';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import Header from '../../../../components/Header';
import HyperlinkText from '../../../../components/HyperlinkText';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';

import Ionicons from 'react-native-vector-icons/Ionicons';
import FastImage from 'react-native-fast-image';
import moment, { lang } from 'moment-timezone';
import { scale } from 'react-native-size-matters';

// 解構全局ui設計顏色
const { white, black, viewShadow, bg_color, themeColor } = COLOR_DIY;

const { height: PAGE_HEIGHT } = Dimensions.get('window');
const { width: PAGE_WIDTH } = Dimensions.get('window');
const COMPONENT_WIDTH = scale(320);

class UMEventDetail extends Component {
    constructor(props) {
        super(props);

        logToFirebase('openPage', { page: 'UMEvent' });

        // 獲取上級路由傳遞的參數
        const eventData = this.props.route.params.data;

        // 匹配對應語言的標題，經測試：有時只有1 or 2 or 3種文字的標題、內容
        //共通内容
        let dateFrom = eventData.common.dateFrom;
        let dateTo = eventData.common.dateTo;
        let timeFrom = eventData.common.timeFrom;
        let timeTo = eventData.common.timeTo;

        // 中文
        let title_cn = '';
        let category_cn = ''; //未找到
        let organiser_cn = '';
        let coorganiser_cn = '1';
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
        let coorganiser_en = '';
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
        let coorganiser_pt = '';
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
                coorganiser_en = item.coorganizers;
                venue_en = item.venues;
                targetAudience_en = item.targetAudiences;
                remark_en = item.remark;
                language_en = item.languages;
                contactName_en = item.contactName;
                contactPhone_en = item.contactPhone;
                contactFax_en = item.contactFax;
                contactMail_en = item.contactEmail;
            } else if (item.locale == 'pt_PT') {
                title_pt = item.title;
                content_pt = item.speakers;
                speaker_pt = item.contactName;
                organiser_pt = item.organizedBys;
                coorganiser_pt = item.coorganizers;
                venue_pt = item.venues;
                targetAudience_pt = item.targetAudiences;
                remark_pt = item.remark;
                language_pt = item.languages;
                contactName_pt = item.contactName;
                contactPhone_pt = item.contactPhone;
                contactFax_pt = item.contactFax;
                contactMail_pt = item.contactEmail;
            } else if (item.locale == 'zh_TW') {
                title_cn = item.title;
                content_cn = item.content;
                speaker_cn = item.speakers;
                organiser_cn = item.organizedBys;
                coorganiser_cn = item.coorganizers;
                venue_cn = item.venues;
                targetAudience_cn = item.targetAudiences;
                remark_cn = item.remark;
                language_cn = item.languages;
                contactName_cn = item.contactName;
                contactPhone_cn = item.contactPhone;
                contactFax_cn = item.contactFax;
                contactMail_cn = item.contactEmail;
            }
        });

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
                // 海報
                imageUrls:
                    'posterUrl' in eventData.common
                        ? eventData.common.posterUrl.replace('http:', 'https:')
                        : '',
            },
            imgLoading: true,
        };
    }

    componentWillUnmount() {
        FastImage.clearMemoryCache();
    }

    renderModeChoice = () => {
        const { LanguageMode, chooseMode } = this.state;
        return (
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
                                    marginHorizontal: scale(120),
                                }}
                                onPress={() =>
                                    this.setState({ chooseMode: index })
                                }>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        color:
                                            chooseMode == index
                                                ? bg_color
                                                : themeColor,
                                    }}>
                                    {item.name}
                                </Text>
                            </TouchableOpacity>
                        );
                    }
                })}
            </View>
        );
    };

    render() {
        const { LanguageMode, chooseMode, data } = this.state;
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
        //判断协办单位，详情和备注是否存在
        var available = [1, 1, 1];
        if (coorganiser_cn == undefined) {
            available[0] = 0;
        }
        if (content_cn == undefined) {
            available[1] = 0;
        }
        if (remark_cn == undefined) {
            available[2] = 0;
        }

        //用数组存储内容，便于根据语言筛选条件显示
        var title = [title_cn, title_en, title_pt];
        var category = [category_cn, category_en, category_pt];
        var organiser = [
            organiser_cn,
            organiser_en,
            organiser_pt,
            '主辦單位：',
            'Organiser: ',
            'Organizador: ',
        ];
        var coorganiser = [
            coorganiser_cn,
            coorganiser_en,
            coorganiser_pt,
            '協辦單位：',
            'Coorganiser: ',
            'Co-organizador: ',
        ];
        var venue = [
            venue_cn,
            venue_en,
            venue_pt,
            '地點：',
            'Venue: ',
            'Local: ',
        ];
        var content = [
            content_cn,
            content_en,
            content_pt,
            '詳情：',
            'Content: ',
        ];
        var targetAudience = [
            targetAudience_cn,
            targetAudience_en,
            targetAudience_pt,
            '對象：',
            'Target Audience: ',
            'Audiência-alvo: ',
        ];
        var speaker = [
            speaker_cn,
            speaker_en,
            speaker_pt,
            '講者：',
            'Speaker: ',
            'Orador: ',
        ];
        var remark = [
            remark_cn,
            remark_en,
            remark_pt,
            '備註：',
            'Remark: ',
            'Observação: ',
        ];
        var language = [
            language_cn,
            language_en,
            language_pt,
            '語言：',
            'Language: ',
            'Língua: ',
        ];
        var contactName = [
            contactName_cn,
            contactName_en,
            contactName_pt,
            '名稱：',
            'Name: ',
            'Nome: ',
        ];
        var contactPhone = [
            contactPhone_cn,
            contactPhone_en,
            contactPhone_pt,
            '電話：',
            'Phone: ',
            'Telefone: ',
        ];
        var contactFax = [
            contactFax_cn,
            contactFax_en,
            contactFax_pt,
            '傳真：',
            'Fax: ',
            'Fax: ',
        ];
        var contactMail = [
            contactMail_cn,
            contactMail_en,
            contactMail_pt,
            '電郵：',
            'E-mail: ',
            'E-mail: ',
        ];
        var date = ['活動日期：', 'Date: ', 'Data: '];
        var time = ['活動時間：', 'Time: ', 'Horário: '];
        var contact = ['聯絡人', 'Contact Person', 'Pessoa a Contactar'];

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

                <ScrollView>
                    {/* 文本模式選擇 3語切換 */}
                    {this.renderModeChoice()}
                    {/* 活動大標題 */}
                    <View
                        style={{
                            marginHorizontal: scale(10),
                            marginTop: scale(10),
                            alignItems: 'center',
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                color: COLOR_DIY.themeColor,
                                fontWeight: 'bold',
                                fontSize: scale(20),
                                textAlign: 'center'
                            }}
                            selectable={true}>
                            {title[chooseMode]}
                        </Text>
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
                                // cache: FastImage.cacheControl.web,
                            }}
                            style={{ width: '100%', height: '100%' }}
                            onLoadStart={() => {
                                this.setState({ imgLoading: true });
                            }}
                            onLoad={() => {
                                this.setState({ imgLoading: false });
                            }}
                        />
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
                    </TouchableOpacity>

                    {/* 詳情資訊 */}
                    <View style={styles.infoCardContainer}>
                        {/* 日期 */}
                        {/* 如果活動當天結束顯示活動日期，若為多日活動則顯示開始和結束日期 */}
                        {moment(dateFrom).format('MM-DD') ==
                            moment(dateTo).format('MM-DD') ? (
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    fontSize: scale(18),
                                    fontWeight: '700',
                                    color: '#FF8627',
                                }}>
                                {date[chooseMode]}
                                {moment(dateFrom).format('MM-DD')}
                            </Text>
                        ) : (
                            <View>
                                <Text
                                    style={{
                                        ...uiStyle.defaultText,
                                        fontSize: scale(18),
                                        fontWeight: '700',
                                        color: '#FF8627',
                                    }}>
                                    {date[chooseMode]}
                                    {moment(dateFrom).format('MM-DD') + ' ~ '}
                                    {moment(dateTo).format('MM-DD')}
                                </Text>
                            </View>
                        )}
                        {/* 時間 */}
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(18),
                                fontWeight: '700',
                                color: '#FF8627',
                            }}>
                            {time[chooseMode]}
                            {moment(timeFrom).format('HH:SS') + ' ~ '}
                            {moment(timeTo).format('HH:SS')}
                        </Text>
                        {/* 講者 */}
                        {speaker[chooseMode] ? (
                            <View style={styles.contentContainer}>
                                {/* 文本標題，e.g. 講者： */}
                                <Text style={styles.secondTitle} selectable>
                                    {speaker[chooseMode + 3]}
                                    {/* 對應該活動的講者名稱 */}
                                    <Text style={styles.content}>
                                        {speaker[chooseMode]}
                                    </Text>
                                </Text>
                            </View>
                        ) : null}
                        {/*地點*/}
                        {venue[chooseMode] ? (
                            <View style={styles.contentContainer}>
                                <Text
                                    style={styles.secondTitle}
                                    selectable>
                                    {venue[chooseMode + 3]}
                                </Text>
                                <View style={{ width: '75%' }}>
                                    <HyperlinkText
                                        linkStyle={{
                                            color: COLOR_DIY.themeColor,
                                        }}
                                        navigation={this.props.navigation}>
                                        <Text style={styles.content} selectable>
                                            {venue[chooseMode]}
                                        </Text>
                                    </HyperlinkText>
                                </View>
                            </View>
                        ) : null}
                        {/*語言*/}
                        {language[chooseMode] ? (
                            <View style={styles.contentContainer}>
                                <Text style={styles.secondTitle}>
                                    {language[chooseMode + 3]}
                                    {language[chooseMode].map((itm, idx) => {
                                        let show = itm;
                                        if (
                                            language[chooseMode].length - 1 !=
                                            idx
                                        ) {
                                            show = show + ', ';
                                        }
                                        return (
                                            <Text style={styles.content}>
                                                {show}
                                            </Text>
                                        );
                                    })}
                                </Text>
                            </View>
                        ) : null}
                        {/*對象*/}
                        {targetAudience[chooseMode] ? (
                            <View style={styles.contentContainer}>
                                <Text style={styles.secondTitle} selectable>
                                    {targetAudience[chooseMode + 3]}
                                    <Text style={styles.content}>
                                        {targetAudience[chooseMode]}
                                    </Text>
                                </Text>
                            </View>
                        ) : null}
                        {/*主辦單位*/}
                        {organiser[chooseMode] ? (
                            <View style={styles.contentContainer}>
                                <Text style={styles.secondTitle} selectable>
                                    {organiser[chooseMode + 3]}
                                    <Text style={styles.content}>
                                        {organiser[chooseMode]}
                                    </Text>
                                </Text>
                            </View>
                        ) : null}
                        {/* 協辦單位 */}
                        {available[0] == 1 && (
                            <View style={styles.contentContainer}>
                                <Text style={styles.secondTitle} selectable>
                                    {coorganiser[chooseMode + 3]}
                                </Text>
                                <Text style={styles.content} selectable>
                                    {coorganiser[chooseMode]}
                                </Text>
                            </View>
                        )}
                        {/* 詳情 */}
                        {available[1] == 1 && (
                            <View style={styles.contentContainer}>
                                <HyperlinkText
                                    linkStyle={{
                                        color: COLOR_DIY.themeColor,
                                    }}
                                    navigation={this.props.navigation}>
                                    <Text style={styles.secondTitle} selectable>
                                        {content[chooseMode + 3]}
                                        <Text style={styles.content}>
                                            {content[chooseMode]}
                                        </Text>
                                    </Text>
                                </HyperlinkText>
                            </View>
                        )}
                        {/*備註*/}
                        {available[2] == 1 && (
                            <View style={styles.contentContainer}>
                                <Text style={styles.secondTitle} selectable>
                                    {remark[chooseMode + 3]}
                                    <Text style={styles.content}>
                                        {remark[chooseMode]}
                                    </Text>
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* 聯絡人 */}
                    <View
                        style={{
                            ...styles.infoCardContainer,
                            marginBottom: scale(50),
                        }}>
                        <Text
                            style={{
                                ...uiStyle.defaultText,
                                fontSize: 18,
                                fontWeight: '700',
                                color: '#FF8627',
                            }}>
                            {contact[chooseMode]}
                        </Text>
                        {/* 聯絡名稱 */}
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle}>
                                {contactName[chooseMode + 3]}
                            </Text>
                            <Text style={styles.content} selectable>
                                {contactName[chooseMode]}
                            </Text>
                        </View>
                        {/* 聯繫電話 */}
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle}>
                                {contactPhone[chooseMode + 3]}
                            </Text>
                            <Text style={styles.content} selectable>
                                {contactPhone[chooseMode]}
                            </Text>
                        </View>
                        {/* 傳真 */}
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle}>
                                {contactFax[chooseMode + 3]}
                            </Text>
                            <Text style={styles.content} selectable>
                                {contactFax[chooseMode]}
                            </Text>
                        </View>
                        {/* 電郵 */}
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle}>
                                {contactMail[chooseMode + 3]}
                            </Text>
                            <HyperlinkText
                                linkStyle={{
                                    color: COLOR_DIY.themeColor,
                                }}
                                navigation={this.props.navigation}>
                                <Text style={styles.content} selectable>
                                    {contactMail[chooseMode]}
                                </Text>
                            </HyperlinkText>
                        </View>
                    </View>
                </ScrollView>
            </View>
        );
    }
}

const styles = StyleSheet.create({
    languageModeButtonContainer: {
        padding: scale(10),
        marginVertical: scale(5),
        borderRadius: scale(10),
        ...viewShadow,
    },
    imgContainer: {
        width: COMPONENT_WIDTH,
        height: COMPONENT_WIDTH,
        backgroundColor: bg_color,
        borderRadius: scale(10),
        overflow: 'hidden',
        alignSelf: 'center',
        marginVertical: scale(10),
        ...viewShadow,
    },
    infoCardContainer: {
        marginVertical: scale(8),
        marginHorizontal: scale(20),
        borderRadius: scale(10),
        backgroundColor: white,
        paddingHorizontal: scale(15),
        paddingVertical: scale(10),
        ...viewShadow,
    },
    contentContainer: {
        flexDirection: 'row',
        marginVertical: scale(2),
    },
    secondTitle: {
        ...uiStyle.defaultText,
        color: COLOR_DIY.themeColor,
        fontSize: scale(15),
        fontWeight: '600',
    },
    content: {
        ...uiStyle.defaultText,
        color: black.third,
        fontSize: scale(15),
        fontWeight: 'normal',
    },
});

export default UMEventDetail;
