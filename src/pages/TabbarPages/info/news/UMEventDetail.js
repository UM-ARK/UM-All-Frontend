import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ActivityIndicator,
    Dimensions,
    Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    useAnimatedScrollHandler,
    interpolate,
    Extrapolation,
    withSpring,
    FadeInUp,
    LinearTransition,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import moment from 'moment-timezone';
import { scale, verticalScale, moderateScale } from 'react-native-size-matters';
import { trigger } from '../../../../utils/trigger';

import { useTheme, themes, uiStyle } from '../../../../components/ThemeContext';
import ARKImageView from '../../../../components/ARKImageView';
import HyperlinkText from '../../../../components/HyperlinkText';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { isLiquidGlassSupported, LiquidGlassView } from '@callstack/liquid-glass';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HERO_HEIGHT = verticalScale(420);
const HEADER_THRESHOLD = verticalScale(200);

// 動畫配置常量
const ANIMATION_CONFIG = {
    spring: {
        damping: 15,
        stiffness: 150,
        mass: 1,
    },
    timing: {
        duration: 400,
    },
};

/**
 * 獲取動態樣式 - 使用主題變量
 */
const getDynamicStyles = (theme) => {
    const { white, black, themeColor } = theme;

    return StyleSheet.create({
        // Hero 區域
        heroTitle: {
            fontSize: moderateScale(22),
            fontWeight: '700',
            color: white,
            textShadowColor: 'rgba(0,0,0,0.5)',
            textShadowOffset: { width: 0, height: 2 },
            textShadowRadius: 4,
        },

        // 時間顯示
        timeValue: {
            fontSize: moderateScale(15),
            fontWeight: '600',
            color: black.main,
        },

        // 詳情標籤
        detailLabel: {
            fontSize: moderateScale(13),
            fontWeight: '600',
            color: black.secondary,
        },
        detailValue: {
            fontSize: moderateScale(14),
            fontWeight: '400',
            color: black.main,
            lineHeight: moderateScale(20),
        },

        // 聯絡人
        contactLabel: {
            fontSize: moderateScale(12),
            fontWeight: '500',
            color: black.secondary,
        },
        contactValue: {
            fontSize: moderateScale(14),
            fontWeight: '400',
            color: black.main,
        },
    });
};

/**
 * 玻璃擬態卡片組件
 * 使用BlurView實現半透明毛玻璃效果
 */
const GlassmorphismCard = React.memo(({ children, style, intensity = 30 }) => {
    const { theme } = useTheme();
    const { white } = theme;

    return (
        <View style={[staticStyles.glassCardContainer, style]}>
            <BlurView
                intensity={intensity}
                tint="light"
                style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: `${white}40` },
                ]}
            />
            <View style={staticStyles.glassCardContent}>{children}</View>
        </View>
    );
});

/**
 * Hero區域組件
 * 包含視差滾動效果的海報圖片
 */
const HeroSection = React.memo(
    ({
        imageUrl,
        scrollY,
        onImagePress,
        imgLoading,
        setImgLoading,
        title,
        themeColor,
    }) => {
        const { theme } = useTheme();
        const dynamicStyles = getDynamicStyles(theme);

        // 視差動畫樣式
        const parallaxStyle = useAnimatedStyle(() => {
            const translateY = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT],
                [0, HERO_HEIGHT * 0.4],
                Extrapolation.CLAMP,
            );
            const scale = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT],
                [1, 1.15],
                Extrapolation.CLAMP,
            );
            return {
                transform: [{ translateY }, { scale }],
            };
        });

        // 標題淡入動畫
        const titleStyle = useAnimatedStyle(() => {
            const opacity = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT * 0.5, HERO_HEIGHT * 0.8],
                [1, 0.8, 0],
                Extrapolation.CLAMP,
            );
            const translateY = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT * 0.5],
                [0, -30],
                Extrapolation.CLAMP,
            );
            return {
                opacity,
                transform: [{ translateY }],
            };
        });

        return (
            <View style={[staticStyles.heroContainer, { height: HERO_HEIGHT }]}>
                <Animated.View style={[staticStyles.heroImageWrapper, parallaxStyle]}>
                    <Pressable onPress={onImagePress} style={staticStyles.heroPressable}>
                        <Image
                            source={imageUrl}
                            style={staticStyles.heroImage}
                            contentFit="cover"
                            onLoadStart={() => setImgLoading(true)}
                            onLoad={() => setImgLoading(false)}
                            transition={500}
                        />
                        {imgLoading && (
                            <View style={staticStyles.heroLoadingOverlay}>
                                <ActivityIndicator size="large" color={themeColor} />
                            </View>
                        )}
                    </Pressable>
                </Animated.View>

                {/* 漸變遮罩 */}
                <View style={staticStyles.heroGradientOverlay} pointerEvents="none" />

                {/* 浮動標題 */}
                {title && (
                    <Animated.View style={[staticStyles.heroTitleContainer, titleStyle]}>
                        <BlurView intensity={40} tint="dark" style={staticStyles.heroTitleBlur}>
                            <Text style={dynamicStyles.heroTitle}
                            // numberOfLines={4}
                            >
                                {title}
                            </Text>
                        </BlurView>
                    </Animated.View>
                )}
            </View>
        );
    },
);

/**
 * 現代化語言選擇器
 * 使用動態按鈕和流暢過渡動畫
 */
const LanguageSelector = React.memo(
    ({ languageMode, chooseMode, onSelect, themeColor, white }) => {
        const [buttonLayouts, setButtonLayouts] = useState({});

        // 語言選擇器包裝樣式 - 使用主題色的柔和底色
        const languageWrapperStyle = useMemo(() => ({
            flexDirection: 'row',
            backgroundColor: 'rgba(255,255,255,0.5)',
            borderRadius: scale(25),
            padding: scale(4),
        }), [themeColor]);

        // 計算指示器位置
        const indicatorStyle = useAnimatedStyle(() => {
            const selectedLayout = buttonLayouts[chooseMode];
            if (!selectedLayout) { return {}; }

            return {
                transform: [
                    { translateX: withSpring(selectedLayout.x, ANIMATION_CONFIG.spring) },
                ],
                width: withSpring(selectedLayout.width, ANIMATION_CONFIG.spring),
            };
        });

        const handleLayout = useCallback((index) => (event) => {
            const { x, width } = event.nativeEvent.layout;
            setButtonLayouts(prev => ({ ...prev, [index]: { x, width } }));
        }, []);

        return (
            <View style={staticStyles.languageContainer}>
                <View style={[languageWrapperStyle]}>
                    {/* 動態指示器背景 */}
                    <Animated.View
                        style={[
                            staticStyles.languageIndicator,
                            { backgroundColor: themeColor },
                            indicatorStyle,
                        ]}
                    />

                    {languageMode.map((item, index) =>
                        item.available ? (
                            <Pressable
                                key={index}
                                onPress={() => onSelect(index)}
                                style={staticStyles.languageButton}
                                onLayout={handleLayout(index)}
                            >
                                <Text
                                    style={[
                                        staticStyles.languageText,
                                        {
                                            color:
                                                chooseMode === index
                                                    ? white
                                                    : themeColor,
                                        },
                                    ]}>
                                    {item.name}
                                </Text>
                            </Pressable>
                        ) : null,
                    )}
                </View>
            </View>
        );
    },
);

/**
 * 時間軸式時間顯示組件
 * 現代化日期時間展示
 */
const TimeDisplay = React.memo(({ dateFrom, dateTo, timeFrom, timeTo, mode, themeColor }) => {
    const { theme } = useTheme();
    const dynamicStyles = getDynamicStyles(theme);
    const isSameDay = moment(dateFrom).format('MM-DD') === moment(dateTo).format('MM-DD');

    const dateLabels = ['活動日期：', 'Date: ', 'Data: '];
    const timeLabels = ['活動時間：', 'Time: ', 'Horário: '];

    return (
        <View style={staticStyles.timeContainer}>
            {/* 日期區塊 */}
            <View style={staticStyles.timeBlock}>
                <View style={[staticStyles.timeIconContainer, { backgroundColor: `${themeColor}15` }]}>
                    <Text style={[staticStyles.timeIcon, { color: themeColor }]}>📅</Text>
                </View>
                <View style={staticStyles.timeContent}>
                    <Text style={[staticStyles.timeLabel, { color: themeColor }]}>
                        {dateLabels[mode]}
                    </Text>
                    <Text style={dynamicStyles.timeValue}>
                        {isSameDay
                            ? moment(dateFrom).format('YYYY-MM-DD')
                            : `${moment(dateFrom).format('MM-DD')} ~ ${moment(dateTo).format('MM-DD')}`}
                    </Text>
                </View>
            </View>

            {/* 時間區塊 */}
            <View style={staticStyles.timeBlock}>
                <View style={[staticStyles.timeIconContainer, { backgroundColor: `${themeColor}15` }]}>
                    <Text style={[staticStyles.timeIcon, { color: themeColor }]}>🕐</Text>
                </View>
                <View style={staticStyles.timeContent}>
                    <Text style={[staticStyles.timeLabel, { color: themeColor }]}>
                        {timeLabels[mode]}
                    </Text>
                    <Text style={dynamicStyles.timeValue}>
                        {`${moment(timeFrom).format('HH:mm')} ~ ${moment(timeTo).format('HH:mm')}`}
                    </Text>
                </View>
            </View>
        </View>
    );
});

/**
 * 信息卡片組件
 * 統一的信息展示卡片
 */
const InfoCard = React.memo(({ title, children, delay = 0, themeColor }) => {
    return (
        <Animated.View
            entering={FadeInUp.delay(delay).duration(600).springify()}
            layout={LinearTransition.springify()}>
            <GlassmorphismCard style={staticStyles.infoCard}>
                {title && (
                    <View style={staticStyles.infoCardHeader}>
                        <View
                            style={[staticStyles.infoCardIndicator, { backgroundColor: themeColor }]}
                        />
                        <Text style={[staticStyles.infoCardTitle, { color: themeColor }]}>
                            {title}
                        </Text>
                    </View>
                )}
                <View style={staticStyles.infoCardBody}>{children}</View>
            </GlassmorphismCard>
        </Animated.View>
    );
});

/**
 * 聯絡人卡片組件
 */
const ContactCard = React.memo(
    ({
        contactName,
        contactPhone,
        contactFax,
        contactMail,
        mode,
        themeColor,
        navigation,
    }) => {
        const { theme } = useTheme();
        const dynamicStyles = getDynamicStyles(theme);
        const labels = ['聯絡人', 'Contact Person', 'Pessoa a Contactar'];

        return (
            <Animated.View entering={FadeInUp.delay(400).duration(600).springify()}>
                <GlassmorphismCard style={staticStyles.contactCard}>
                    <View style={staticStyles.contactHeader}>
                        <View
                            style={[staticStyles.contactIconContainer, { backgroundColor: themeColor }]}>
                            <Text style={staticStyles.contactIcon}>👤</Text>
                        </View>
                        <Text style={[staticStyles.contactTitle, { color: themeColor }]}>
                            {labels[mode]}
                        </Text>
                    </View>

                    <View style={staticStyles.contactBody}>
                        {contactName[mode] && (
                            <View style={staticStyles.contactRow}>
                                <Text style={dynamicStyles.contactLabel}>
                                    {contactName[mode + 3]}
                                </Text>
                                <Text style={dynamicStyles.contactValue} selectable>
                                    {contactName[mode]}
                                </Text>
                            </View>
                        )}

                        {contactPhone[mode] && (
                            <View style={staticStyles.contactRow}>
                                <Text style={dynamicStyles.contactLabel}>
                                    {contactPhone[mode + 3]}
                                </Text>
                                <Text style={dynamicStyles.contactValue} selectable>
                                    {contactPhone[mode]}
                                </Text>
                            </View>
                        )}

                        {contactFax[mode] && (
                            <View style={staticStyles.contactRow}>
                                <Text style={dynamicStyles.contactLabel}>
                                    {contactFax[mode + 3]}
                                </Text>
                                <Text style={dynamicStyles.contactValue} selectable>
                                    {contactFax[mode]}
                                </Text>
                            </View>
                        )}

                        {contactMail[mode] && (
                            <View style={staticStyles.contactRow}>
                                <Text style={dynamicStyles.contactLabel}>
                                    {contactMail[mode + 3]}
                                </Text>
                                <HyperlinkText
                                    linkStyle={{ color: themeColor }}
                                    navigation={navigation}>
                                    <Text style={[dynamicStyles.contactValue, { color: themeColor }]} selectable>
                                        {contactMail[mode]}
                                    </Text>
                                </HyperlinkText>
                            </View>
                        )}
                    </View>
                </GlassmorphismCard>
            </Animated.View>
        );
    },
);

/**
 * UMEventDetail 主組件
 * 2026 現代化重寫版本
 */
const UMEventDetail = ({ route, navigation }) => {
    const { theme } = useTheme();
    const { white, black, bg_color, themeColor } = theme;
    const dynamicStyles = getDynamicStyles(theme);

    const imageScrollViewer = useRef(null);
    const scrollRef = useRef(null);
    const scrollY = useSharedValue(0);

    // 滾動事件處理
    const scrollHandler = useAnimatedScrollHandler({
        onScroll: event => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const eventData = route.params.data;

    // 初始化狀態
    const [state, setState] = useState(() => {
        // 解析日期時間
        const dateFrom = eventData.common.dateFrom;
        const dateTo = eventData.common.dateTo;
        const timeFrom = eventData.common.timeFrom;
        const timeTo = eventData.common.timeTo;

        // 初始化語言數據
        const languages = ['cn', 'en', 'pt'];
        const dataKeys = [
            'title', 'content', 'organiser', 'coorganiser', 'venue',
            'targetAudience', 'speaker', 'remark', 'language',
            'contactName', 'contactPhone', 'contactFax', 'contactMail',
        ];

        const result = { dateFrom, dateTo, timeFrom, timeTo };

        // 初始化各語言數據
        languages.forEach(lang => {
            dataKeys.forEach(key => {
                result[`${key}_${lang}`] = '';
            });
        });

        // 解析 eventData.details
        eventData.details.forEach(item => {
            const langMap = { en_US: 'en', pt_PT: 'pt', zh_TW: 'cn' };
            const lang = langMap[item.locale];
            if (!lang) { return; }

            result[`title_${lang}`] = item.title || '';
            result[`content_${lang}`] = item.content || '';
            result[`organiser_${lang}`] = item.organizedBys || '';
            result[`coorganiser_${lang}`] = item.coorganizers || '';
            result[`venue_${lang}`] = item.venues || '';
            result[`targetAudience_${lang}`] = item.targetAudiences || '';
            result[`speaker_${lang}`] = item.speakers || '';
            result[`remark_${lang}`] = item.remark || '';
            result[`language_${lang}`] = item.languages || '';
            result[`contactName_${lang}`] = item.contactName || '';
            result[`contactPhone_${lang}`] = item.contactPhone || '';
            result[`contactFax_${lang}`] = item.contactFax || '';
            result[`contactMail_${lang}`] = item.contactEmail || '';
        });

        // 構建語言模式數組
        const LanguageMode = [
            { locale: 'cn', available: result.title_cn.length > 0, name: '中' },
            { locale: 'en', available: result.title_en.length > 0, name: 'EN' },
            { locale: 'pt', available: result.title_pt.length > 0, name: 'PT' },
        ];

        return {
            LanguageMode,
            chooseMode: 0,
            data: {
                ...result,
                imageUrls: eventData.common.posterUrl?.replace('http:', 'https:') || '',
            },
            imgLoading: true,
        };
    });

    useEffect(() => {
        logToFirebase('openPage', { page: 'UMEvent' });
    }, []);

    // 獲取當前語言的標題
    const getCurrentTitle = useCallback(() => {
        const locale = state.LanguageMode[state.chooseMode].locale;
        return state.data[`title_${locale}`];
    }, [state]);

    // 處理語言切換
    const handleLanguageSelect = useCallback(index => {
        trigger();
        setState(prev => ({ ...prev, chooseMode: index }));
    }, []);

    // 解構數據
    const { LanguageMode, chooseMode } = state;
    const { dateFrom, dateTo, timeFrom, timeTo, imageUrls } = state.data;

    // 構建數組數據
    const dataArrays = {
        speaker: [state.data.speaker_cn, state.data.speaker_en, state.data.speaker_pt, '講者：', 'Speaker: ', 'Orador: '],
        venue: [state.data.venue_cn, state.data.venue_en, state.data.venue_pt, '地點：', 'Venue: ', 'Local: '],
        language: [state.data.language_cn, state.data.language_en, state.data.language_pt, '語言：', 'Language: ', 'Língua: '],
        targetAudience: [state.data.targetAudience_cn, state.data.targetAudience_en, state.data.targetAudience_pt, '對象：', 'Target Audience: ', 'Audiência-alvo: '],
        organiser: [state.data.organiser_cn, state.data.organiser_en, state.data.organiser_pt, '主辦單位：', 'Organiser: ', 'Organizador: '],
        coorganiser: [state.data.coorganiser_cn, state.data.coorganiser_en, state.data.coorganiser_pt, '協辦單位：', 'Coorganiser: ', 'Co-organizador: '],
        content: [state.data.content_cn, state.data.content_en, state.data.content_pt, '詳情：', 'Content: '],
        remark: [state.data.remark_cn, state.data.remark_en, state.data.remark_pt, '備註：', 'Remark: ', 'Observação: '],
        contactName: [state.data.contactName_cn, state.data.contactName_en, state.data.contactName_pt, '名稱：', 'Name: ', 'Nome: '],
        contactPhone: [state.data.contactPhone_cn, state.data.contactPhone_en, state.data.contactPhone_pt, '電話：', 'Phone: ', 'Telefone: '],
        contactFax: [state.data.contactFax_cn, state.data.contactFax_en, state.data.contactFax_pt, '傳真：', 'Fax: ', 'Fax: '],
        contactMail: [state.data.contactMail_cn, state.data.contactMail_en, state.data.contactMail_pt, '電郵：', 'E-mail: ', 'E-mail: '],
    };

    // 檢查內容是否存在
    const hasCoorganiser = !!state.data.coorganiser_cn;
    const hasContent = !!state.data.content_cn;
    const hasRemark = !!state.data.remark_cn;

    return (
        <View style={{ backgroundColor: bg_color, flex: 1 }}>
            {/* 圖片查看器 */}
            <ARKImageView ref={imageScrollViewer} imageUrls={imageUrls} />

            {/* 主滾動內容 */}
            <Animated.ScrollView
                ref={scrollRef}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}
                // 該頁面是圖片置頂，所以iOS26也無需調整inset
                contentInsetAdjustmentBehavior={isLiquidGlassSupported ? null : "automatic"}
            >
                {/* Hero 區域 */}
                <HeroSection
                    imageUrl={imageUrls}
                    scrollY={scrollY}
                    onImagePress={() => {
                        trigger();
                        imageScrollViewer.current?.handleOpenImage(0);
                    }}
                    imgLoading={state.imgLoading}
                    setImgLoading={loading =>
                        setState(prev => ({ ...prev, imgLoading: loading }))
                    }
                    title={getCurrentTitle()}
                    themeColor={themeColor}
                />

                {/* 內容容器 */}
                <View style={staticStyles.contentWrapper}>
                    {/* 語言選擇器 */}
                    <Animated.View entering={FadeInUp.delay(100).duration(500)}>
                        <LanguageSelector
                            languageMode={LanguageMode}
                            chooseMode={chooseMode}
                            onSelect={handleLanguageSelect}
                            themeColor={themeColor}
                            white={white}
                        />
                    </Animated.View>

                    {/* 時間顯示 */}
                    <Animated.View entering={FadeInUp.delay(150).duration(500)}>
                        <GlassmorphismCard style={staticStyles.timeCard}>
                            <TimeDisplay
                                dateFrom={dateFrom}
                                dateTo={dateTo}
                                timeFrom={timeFrom}
                                timeTo={timeTo}
                                mode={chooseMode}
                                themeColor={themeColor}
                            />
                        </GlassmorphismCard>
                    </Animated.View>

                    {/* 活動詳情卡片 */}
                    <InfoCard
                        title={['活動詳情', 'Event Details', 'Detalhes do Evento'][chooseMode]}
                        delay={200}
                        themeColor={themeColor}>
                        {/* 講者 */}
                        {dataArrays.speaker[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.speaker[chooseMode + 3]}
                                </Text>
                                <Text style={dynamicStyles.detailValue} selectable>
                                    {dataArrays.speaker[chooseMode]}
                                </Text>
                            </View>
                        )}

                        {/* 地點 */}
                        {dataArrays.venue[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.venue[chooseMode + 3]}
                                </Text>
                                <HyperlinkText
                                    linkStyle={{ color: themeColor }}
                                    navigation={navigation}>
                                    <Text style={dynamicStyles.detailValue} selectable>
                                        {dataArrays.venue[chooseMode]}
                                    </Text>
                                </HyperlinkText>
                            </View>
                        )}

                        {/* 語言 */}
                        {dataArrays.language[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.language[chooseMode + 3]}
                                </Text>
                                <View style={staticStyles.tagContainer}>
                                    {dataArrays.language[chooseMode].map((lang, idx) => (
                                        <View
                                            key={idx}
                                            style={[
                                                staticStyles.tag,
                                                { backgroundColor: `${themeColor}20` },
                                            ]}>
                                            <Text
                                                style={[staticStyles.tagText, { color: themeColor }]}>
                                                {lang}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}

                        {/* 對象 */}
                        {dataArrays.targetAudience[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.targetAudience[chooseMode + 3]}
                                </Text>
                                <Text style={dynamicStyles.detailValue} selectable>
                                    {dataArrays.targetAudience[chooseMode]}
                                </Text>
                            </View>
                        )}

                        {/* 主辦單位 */}
                        {dataArrays.organiser[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.organiser[chooseMode + 3]}
                                </Text>
                                <Text style={dynamicStyles.detailValue} selectable>
                                    {dataArrays.organiser[chooseMode]}
                                </Text>
                            </View>
                        )}

                        {/* 協辦單位 */}
                        {hasCoorganiser && dataArrays.coorganiser[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.coorganiser[chooseMode + 3]}
                                </Text>
                                <Text style={dynamicStyles.detailValue} selectable>
                                    {dataArrays.coorganiser[chooseMode]}
                                </Text>
                            </View>
                        )}

                        {/* 詳情 */}
                        {hasContent && dataArrays.content[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.content[chooseMode + 3]}
                                </Text>
                                <HyperlinkText
                                    linkStyle={{ color: themeColor }}
                                    navigation={navigation}>
                                    <Text style={[dynamicStyles.detailValue, staticStyles.detailContent]} selectable>
                                        {dataArrays.content[chooseMode]}
                                    </Text>
                                </HyperlinkText>
                            </View>
                        )}

                        {/* 備註 */}
                        {hasRemark && dataArrays.remark[chooseMode] && (
                            <View style={staticStyles.detailRow}>
                                <Text style={dynamicStyles.detailLabel}>
                                    {dataArrays.remark[chooseMode + 3]}
                                </Text>
                                <Text style={dynamicStyles.detailValue} selectable>
                                    {dataArrays.remark[chooseMode]}
                                </Text>
                            </View>
                        )}
                    </InfoCard>

                    {/* 聯絡人卡片 */}
                    <ContactCard
                        contactName={dataArrays.contactName}
                        contactPhone={dataArrays.contactPhone}
                        contactFax={dataArrays.contactFax}
                        contactMail={dataArrays.contactMail}
                        mode={chooseMode}
                        themeColor={themeColor}
                        navigation={navigation}
                    />

                    {/* 底部留白 */}
                    <View style={staticStyles.bottomSpacer} />
                </View>
            </Animated.ScrollView>
        </View>
    );
};

/**
 * 靜態樣式 - 不依賴主題的純佈局樣式
 */
const staticStyles = StyleSheet.create({
    // Hero 區域樣式
    heroContainer: {
        position: 'relative',
        overflow: 'hidden',
    },
    heroImageWrapper: {
        ...StyleSheet.absoluteFillObject,
    },
    heroPressable: {
        width: '100%',
        height: '100%',
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroLoadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    heroGradientOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
    },
    heroTitleContainer: {
        position: 'absolute',
        bottom: verticalScale(30),
        left: scale(20),
        right: scale(20),
    },
    heroTitleBlur: {
        borderRadius: scale(16),
        padding: scale(16),
        overflow: 'hidden',
    },

    // 懸浮標題欄
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: verticalScale(90),
        justifyContent: 'flex-end',
        paddingBottom: verticalScale(12),
        paddingHorizontal: scale(20),
        zIndex: 100,
    },
    floatingHeaderText: {
        fontSize: moderateScale(17),
        fontWeight: '600',
        textAlign: 'center',
    },

    // 玻璃擬態卡片
    glassCardContainer: {
        borderRadius: scale(20),
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.3)',
    },
    glassCardContent: {
        padding: scale(16),
    },

    // 內容容器
    contentWrapper: {
        marginTop: verticalScale(-40),
        paddingHorizontal: scale(16),
        gap: verticalScale(16),
    },

    // 語言選擇器
    languageContainer: {
        alignItems: 'center',
        marginVertical: verticalScale(8),
    },
    languageIndicator: {
        position: 'absolute',
        height: '100%',
        borderRadius: scale(21),
        top: scale(4),
    },
    languageButton: {
        paddingHorizontal: scale(20),
        paddingVertical: scale(10),
        borderRadius: scale(21),
        minWidth: scale(60),
        alignItems: 'center',
    },
    languageText: {
        fontSize: moderateScale(14),
        fontWeight: '600',
    },

    // 時間顯示
    timeCard: {
        marginVertical: verticalScale(8),
    },
    timeContainer: {
        gap: verticalScale(12),
    },
    timeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: scale(12),
    },
    timeIconContainer: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(12),
        justifyContent: 'center',
        alignItems: 'center',
    },
    timeIcon: {
        fontSize: moderateScale(20),
    },
    timeContent: {
        flex: 1,
    },
    timeLabel: {
        fontSize: moderateScale(12),
        fontWeight: '500',
        marginBottom: verticalScale(2),
    },

    // 信息卡片
    infoCard: {
        marginVertical: verticalScale(8),
    },
    infoCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(12),
        paddingBottom: verticalScale(8),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    infoCardIndicator: {
        width: scale(4),
        height: scale(20),
        borderRadius: scale(2),
        marginRight: scale(8),
    },
    infoCardTitle: {
        fontSize: moderateScale(17),
        fontWeight: '700',
    },
    infoCardBody: {
        gap: verticalScale(10),
    },

    // 詳情行
    detailRow: {
        flexDirection: 'column',
        gap: verticalScale(4),
    },
    detailContent: {
        marginTop: verticalScale(4),
    },

    // 標籤
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: scale(6),
    },
    tag: {
        paddingHorizontal: scale(8),
        paddingVertical: verticalScale(2),
        borderRadius: scale(6),
    },
    tagText: {
        fontSize: moderateScale(12),
        fontWeight: '500',
    },

    // 聯絡人卡片
    contactCard: {
        marginVertical: verticalScale(8),
        marginBottom: verticalScale(24),
    },
    contactHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(16),
        paddingBottom: verticalScale(12),
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    contactIconContainer: {
        width: scale(44),
        height: scale(44),
        borderRadius: scale(14),
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: scale(12),
    },
    contactIcon: {
        fontSize: moderateScale(22),
    },
    contactTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
    },
    contactBody: {
        gap: verticalScale(12),
    },
    contactRow: {
        flexDirection: 'column',
        gap: verticalScale(2),
    },

    // 底部留白
    bottomSpacer: {
        height: verticalScale(40),
    },
});

export default UMEventDetail;
