import React, { useState, useEffect, useRef } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, } from 'react-native';
import FastImage from 'react-native-fast-image';
import TouchableScale from "react-native-touchable-scale";
import moment from 'moment-timezone';
import { scale } from 'react-native-size-matters';
import { trigger } from '../../../../utils/trigger';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../components/ThemeContext';
import ImageScrollViewer from '../../../../components/ImageScrollViewer';
import Header from '../../../../components/Header';
import HyperlinkText from '../../../../components/HyperlinkText';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';

const COMPONENT_WIDTH = scale(320);

const UMEventDetail = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { white, black, viewShadow, bg_color, themeColor } = theme;
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
            color: themeColor,
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

    const imageScrollViewer = useRef(null);

    const eventData = route.params.data;

    // 匹配对语言的标题和内容
    const [state, setState] = useState(() => {
        let dateFrom = eventData.common.dateFrom;
        let dateTo = eventData.common.dateTo;
        let timeFrom = eventData.common.timeFrom;
        let timeTo = eventData.common.timeTo;

        let title_cn = '', title_en = '', title_pt = '';
        let content_cn = '', content_en = '', content_pt = '';
        let organiser_cn = '', organiser_en = '', organiser_pt = '';
        let coorganiser_cn = '', coorganiser_en = '', coorganiser_pt = '';
        let venue_cn = '', venue_en = '', venue_pt = '';
        let targetAudience_cn = '', targetAudience_en = '', targetAudience_pt = '';
        let speaker_cn = '', speaker_en = '', speaker_pt = '';
        let remark_cn = '', remark_en = '', remark_pt = '';
        let language_cn = '', language_en = '', language_pt = '';
        let contactName_cn = '', contactName_en = '', contactName_pt = '';
        let contactPhone_cn = '', contactPhone_en = '', contactPhone_pt = '';
        let contactFax_cn = '', contactFax_en = '', contactFax_pt = '';
        let contactMail_cn = '', contactMail_en = '', contactMail_pt = '';

        eventData.details.forEach(item => {
            if (item.locale === 'en_US') {
                title_en = item.title;
                content_en = item.content;
                organiser_en = item.organizedBys;
                coorganiser_en = item.coorganizers;
                venue_en = item.venues;
                targetAudience_en = item.targetAudiences;
                speaker_en = item.speakers;
                remark_en = item.remark;
                language_en = item.languages;
                contactName_en = item.contactName;
                contactPhone_en = item.contactPhone;
                contactFax_en = item.contactFax;
                contactMail_en = item.contactEmail;
            } else if (item.locale === 'pt_PT') {
                title_pt = item.title;
                content_pt = item.content;
                organiser_pt = item.organizedBys;
                coorganiser_pt = item.coorganizers;
                venue_pt = item.venues;
                targetAudience_pt = item.targetAudiences;
                speaker_pt = item.speakers;
                remark_pt = item.remark;
                language_pt = item.languages;
                contactName_pt = item.contactName;
                contactPhone_pt = item.contactPhone;
                contactFax_pt = item.contactFax;
                contactMail_pt = item.contactEmail;
            } else if (item.locale === 'zh_TW') {
                title_cn = item.title;
                content_cn = item.content;
                organiser_cn = item.organizedBys;
                coorganiser_cn = item.coorganizers;
                venue_cn = item.venues;
                targetAudience_cn = item.targetAudiences;
                speaker_cn = item.speakers;
                remark_cn = item.remark;
                language_cn = item.languages;
                contactName_cn = item.contactName;
                contactPhone_cn = item.contactPhone;
                contactFax_cn = item.contactFax;
                contactMail_cn = item.contactEmail;
            }
        });

        return {
            LanguageMode: [
                { locale: 'cn', available: title_cn.length > 0, name: '中' },
                { locale: 'en', available: title_en.length > 0, name: 'EN' },
                { locale: 'pt', available: title_pt.length > 0, name: 'PT' },
            ],
            chooseMode: 0,
            data: {
                dateFrom,
                dateTo,
                timeFrom,
                timeTo,
                title_cn,
                title_en,
                title_pt,
                content_cn,
                content_en,
                content_pt,
                organiser_cn,
                organiser_en,
                organiser_pt,
                coorganiser_cn,
                coorganiser_en,
                coorganiser_pt,
                venue_cn,
                venue_en,
                venue_pt,
                targetAudience_cn,
                targetAudience_en,
                targetAudience_pt,
                speaker_cn,
                speaker_en,
                speaker_pt,
                remark_cn,
                remark_en,
                remark_pt,
                language_cn,
                language_en,
                language_pt,
                contactName_cn,
                contactName_en,
                contactName_pt,
                contactPhone_cn,
                contactPhone_en,
                contactPhone_pt,
                contactFax_cn,
                contactFax_en,
                contactFax_pt,
                contactMail_cn,
                contactMail_en,
                contactMail_pt,
                imageUrls: eventData.common.posterUrl?.replace('http:', 'https:') || '',
            },
            imgLoading: true,
        };
    });

    useEffect(() => {
        logToFirebase('openPage', { page: 'UMEvent' });

        return () => {
            FastImage.clearMemoryCache();
        };
    }, []);

    const renderModeChoice = () => {
        const { LanguageMode, chooseMode } = state;
        return (
            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
                {LanguageMode.map((item, index) => (
                    item.available ? (
                        <TouchableScale
                            key={index}
                            activeOpacity={0.8}
                            style={{
                                ...styles.languageModeButtonContainer,
                                backgroundColor: chooseMode === index ? themeColor : bg_color,
                            }}
                            onPress={() => {
                                trigger();
                                setState(prev => ({ ...prev, chooseMode: index }));
                            }}>
                            <Text
                                style={{
                                    ...uiStyle.defaultText,
                                    color: chooseMode === index ? bg_color : themeColor,
                                }}>
                                {item.name}
                            </Text>
                        </TouchableScale>
                    ) : null
                ))}
            </View>
        );
    };

    const { LanguageMode, chooseMode } = state;
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
    } = state.data;

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
            <Header title={'活動詳情'} iOSDIY={true} />
            {/* 彈出層展示圖片查看器 */}
            <ImageScrollViewer
                ref={imageScrollViewer}
                imageUrls={state.data.imageUrls}
            // 父組件調用 this.imageScrollViewer.current.tiggerModal(); 打開圖層
            // 父組件調用 this.imageScrollViewer.current.handleOpenImage(index); 設置要打開的ImageUrls的圖片下標，默認0
            />

            <ScrollView>
                {/* 文本模式選擇 3語切換 */}
                {renderModeChoice()}
                {/* 活動大標題 */}
                <View style={{
                    marginHorizontal: scale(10),
                    marginTop: scale(10),
                    alignItems: 'center',
                }}>
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: themeColor,
                        fontWeight: 'bold',
                        fontSize: scale(20),
                        textAlign: 'center',
                    }}
                        selectable={true}>
                        {state.data[`title_${state.LanguageMode[state.chooseMode].locale}`]}
                    </Text>
                </View>
                {/* 海報 */}
                <TouchableScale
                    activeOpacity={0.8}
                    style={styles.imgContainer}
                    // 瀏覽大圖
                    onPress={() => {
                        trigger();
                        imageScrollViewer.current.handleOpenImage(0);
                    }}>
                    <FastImage
                        source={{ uri: state.data.imageUrls }}
                        style={{ width: '100%', height: '100%' }}
                        onLoadStart={() => setState(prev => ({ ...prev, imgLoading: true }))}
                        onLoad={() => setState(prev => ({ ...prev, imgLoading: false }))}>
                        {state.imgLoading && (
                            <View style={{
                                width: '100%',
                                height: '100%',
                                alignItems: 'center',
                                justifyContent: 'center',
                                position: 'absolute',
                            }}>
                                <ActivityIndicator size={'large'} color={themeColor} />
                            </View>
                        )}
                    </FastImage>
                </TouchableScale>

                {/* 詳情資訊 */}
                <View style={styles.infoCardContainer}>
                    {/* 日期 */}
                    {/* 如果活動當天結束顯示活動日期，若為多日活動則顯示開始和結束日期 */}
                    {moment(dateFrom).format('MM-DD') ==
                        moment(dateTo).format('MM-DD') ? (
                        <Text style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(18),
                            fontWeight: '700',
                            color: '#FF8627',
                        }}>
                            {date[state.chooseMode]}
                            {moment(dateFrom).format('MM-DD')}
                        </Text>
                    ) : (
                        <View>
                            <Text style={{
                                ...uiStyle.defaultText,
                                fontSize: scale(18),
                                fontWeight: '700',
                                color: '#FF8627',
                            }}>
                                {date[state.chooseMode]}
                                {moment(dateFrom).format('MM-DD') + ' ~ '}
                                {moment(dateTo).format('MM-DD')}
                            </Text>
                        </View>
                    )}
                    {/* 時間 */}
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(18),
                        fontWeight: '700',
                        color: '#FF8627',
                    }}>
                        {time[state.chooseMode]}
                        {moment(timeFrom).format('HH:SS') + ' ~ '}
                        {moment(timeTo).format('HH:SS')}
                    </Text>
                    {/* 講者 */}
                    {speaker[state.chooseMode] ? (
                        <View style={styles.contentContainer}>
                            {/* 文本標題，e.g. 講者： */}
                            <Text style={styles.secondTitle} selectable>
                                {speaker[state.chooseMode + 3]}
                                {/* 對應該活動的講者名稱 */}
                                <Text style={styles.content}>
                                    {speaker[state.chooseMode]}
                                </Text>
                            </Text>
                        </View>
                    ) : null}
                    {/*地點*/}
                    {venue[state.chooseMode] ? (
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle} selectable>
                                {venue[state.chooseMode + 3]}
                            </Text>
                            <View style={{ width: '75%' }}>
                                <HyperlinkText
                                    linkStyle={{
                                        color: themeColor,
                                    }}
                                    navigation={navigation}>
                                    <Text style={styles.content} selectable>
                                        {venue[state.chooseMode]}
                                    </Text>
                                </HyperlinkText>
                            </View>
                        </View>
                    ) : null}
                    {/*語言*/}
                    {language[state.chooseMode] ? (
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle}>
                                {language[state.chooseMode + 3]}
                                {language[state.chooseMode].map((itm, idx) => {
                                    let show = itm;
                                    if (
                                        language[state.chooseMode].length - 1 !=
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
                    {targetAudience[state.chooseMode] ? (
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle} selectable>
                                {targetAudience[state.chooseMode + 3]}
                                <Text style={styles.content}>
                                    {targetAudience[state.chooseMode]}
                                </Text>
                            </Text>
                        </View>
                    ) : null}
                    {/*主辦單位*/}
                    {organiser[state.chooseMode] ? (
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle} selectable>
                                {organiser[state.chooseMode + 3]}
                                <Text style={styles.content}>
                                    {organiser[state.chooseMode]}
                                </Text>
                            </Text>
                        </View>
                    ) : null}
                    {/* 協辦單位 */}
                    {available[0] == 1 && (
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle} selectable>
                                {coorganiser[state.chooseMode + 3]}
                            </Text>
                            <Text style={styles.content} selectable>
                                {coorganiser[state.chooseMode]}
                            </Text>
                        </View>
                    )}
                    {/* 詳情 */}
                    {available[1] == 1 && (
                        <View style={styles.contentContainer}>
                            <HyperlinkText
                                linkStyle={{
                                    color: themeColor,
                                }}
                                navigation={navigation}>
                                <Text style={styles.secondTitle} selectable>
                                    {content[state.chooseMode + 3]}
                                    <Text style={styles.content}>
                                        {content[state.chooseMode]}
                                    </Text>
                                </Text>
                            </HyperlinkText>
                        </View>
                    )}
                    {/*備註*/}
                    {available[2] == 1 && (
                        <View style={styles.contentContainer}>
                            <Text style={styles.secondTitle} selectable>
                                {remark[state.chooseMode + 3]}
                                <Text style={styles.content}>
                                    {remark[state.chooseMode]}
                                </Text>
                            </Text>
                        </View>
                    )}
                </View>

                {/* 聯絡人 */}
                <View style={{
                    ...styles.infoCardContainer,
                    marginBottom: scale(50),
                }}>
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: 18,
                        fontWeight: '700',
                        color: '#FF8627',
                    }}>
                        {contact[state.chooseMode]}
                    </Text>
                    {/* 聯絡名稱 */}
                    <View style={styles.contentContainer}>
                        <Text style={styles.secondTitle}>
                            {contactName[state.chooseMode + 3]}
                        </Text>
                        <Text style={styles.content} selectable>
                            {contactName[state.chooseMode]}
                        </Text>
                    </View>
                    {/* 聯繫電話 */}
                    <View style={styles.contentContainer}>
                        <Text style={styles.secondTitle}>
                            {contactPhone[state.chooseMode + 3]}
                        </Text>
                        <Text style={styles.content} selectable>
                            {contactPhone[state.chooseMode]}
                        </Text>
                    </View>
                    {/* 傳真 */}
                    <View style={styles.contentContainer}>
                        <Text style={styles.secondTitle}>
                            {contactFax[state.chooseMode + 3]}
                        </Text>
                        <Text style={styles.content} selectable>
                            {contactFax[state.chooseMode]}
                        </Text>
                    </View>
                    {/* 電郵 */}
                    <View style={styles.contentContainer}>
                        <Text style={styles.secondTitle}>
                            {contactMail[state.chooseMode + 3]}
                        </Text>
                        <HyperlinkText
                            linkStyle={{
                                color: themeColor,
                            }}
                            navigation={navigation}>
                            <Text style={styles.content} selectable>
                                {contactMail[state.chooseMode]}
                            </Text>
                        </HyperlinkText>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
};

export default UMEventDetail;
