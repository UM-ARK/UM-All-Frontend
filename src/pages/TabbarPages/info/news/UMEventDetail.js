import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    View,
} from 'react-native';
import { Image } from 'expo-image';
import Ionicons from "@react-native-vector-icons/ionicons";
import moment from 'moment-timezone';
import Animated, {
    Extrapolation,
    FadeInUp,
    interpolate,
    useAnimatedScrollHandler,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import {
    moderateScale,
    scale,
    verticalScale,
} from 'react-native-size-matters';
import { isLiquidGlassSupported } from '../../../../utils/glassEffect';

import Text from '../../../../components/AppText';
import ARKImageView from '../../../../components/ARKImageView';
import HyperlinkText from '../../../../components/HyperlinkText';
import {
    uiStyle,
    useTheme,
} from '../../../../components/ThemeContext';
import { logToFirebase } from '../../../../utils/firebaseAnalytics';
import { trigger } from '../../../../utils/trigger';

const HERO_HEIGHT = verticalScale(340);

const ANIMATION_CONFIG = {
    damping: 18,
    stiffness: 180,
    mass: 0.8,
};

const LANGUAGE_LABELS = {
    detailTitle: ['活動詳情', 'Event details', 'Detalhes do evento'],
    contactTitle: ['聯絡方式', 'Contact', 'Contacto'],
    date: ['日期', 'Date', 'Data'],
    time: ['時間', 'Time', 'Horário'],
    event: ['校園活動', 'Campus event', 'Evento no campus'],
};

const DETAIL_CONFIG = [
    {
        key: 'speaker',
        icon: 'mic-outline',
        labels: ['講者', 'Speaker', 'Orador'],
        hyperlink: false,
    },
    {
        key: 'venue',
        icon: 'location-outline',
        labels: ['地點', 'Venue', 'Local'],
        hyperlink: true,
    },
    {
        key: 'language',
        icon: 'language-outline',
        labels: ['語言', 'Language', 'Língua'],
        tags: true,
    },
    {
        key: 'targetAudience',
        icon: 'people-outline',
        labels: ['對象', 'Target audience', 'Audiência-alvo'],
        hyperlink: false,
    },
    {
        key: 'organiser',
        icon: 'business-outline',
        labels: ['主辦單位', 'Organiser', 'Organizador'],
        hyperlink: false,
    },
    {
        key: 'coorganiser',
        icon: 'git-network-outline',
        labels: ['協辦單位', 'Co-organiser', 'Co-organizador'],
        hyperlink: false,
    },
    {
        key: 'content',
        icon: 'document-text-outline',
        labels: ['詳情', 'Details', 'Detalhes'],
        hyperlink: true,
        expanded: true,
    },
    {
        key: 'remark',
        icon: 'information-circle-outline',
        labels: ['備註', 'Remarks', 'Observação'],
        hyperlink: false,
        expanded: true,
    },
];

const CONTACT_CONFIG = [
    {
        key: 'contactName',
        icon: 'person-outline',
        labels: ['名稱', 'Name', 'Nome'],
        hyperlink: false,
    },
    {
        key: 'contactPhone',
        icon: 'call-outline',
        labels: ['電話', 'Phone', 'Telefone'],
        hyperlink: false,
    },
    {
        key: 'contactFax',
        icon: 'print-outline',
        labels: ['傳真', 'Fax', 'Fax'],
        hyperlink: false,
    },
    {
        key: 'contactMail',
        icon: 'mail-outline',
        labels: ['電郵', 'E-mail', 'E-mail'],
        hyperlink: true,
    },
];

const createStyles = theme => {
    const {
        black,
        themeColor,
        tonal,
        trueBlack,
        viewShadow,
        white,
    } = theme;

    return StyleSheet.create({
        page: {
            flex: 1,
            backgroundColor: theme.bg_color,
        },
        heroContainer: {
            height: HERO_HEIGHT,
            overflow: 'hidden',
            backgroundColor: tonal.primary15,
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
        heroShade: {
            ...StyleSheet.absoluteFillObject,
            backgroundColor: `${trueBlack}18`,
        },
        heroLoadingOverlay: {
            ...StyleSheet.absoluteFillObject,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: `${trueBlack}30`,
        },
        contentWrapper: {
            marginTop: verticalScale(-30),
            paddingHorizontal: scale(14),
        },
        surfaceCard: {
            overflow: 'hidden',
            borderRadius: scale(18),
            backgroundColor: white,
            ...viewShadow,
        },
        titleCard: {
            padding: scale(18),
        },
        titleTopRow: {
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: verticalScale(10),
        },
        eyebrow: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontSize: moderateScale(11),
            fontWeight: '700',
            letterSpacing: scale(0.4),
        },
        title: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: moderateScale(22),
            fontWeight: '700',
            lineHeight: moderateScale(29),
        },
        languageTrack: {
            position: 'relative',
            flexDirection: 'row',
            padding: scale(3),
            borderRadius: scale(12),
            backgroundColor: tonal.primary15,
        },
        languageIndicator: {
            position: 'absolute',
            top: scale(3),
            bottom: scale(3),
            borderRadius: scale(9),
            backgroundColor: themeColor,
        },
        languageButton: {
            minWidth: scale(40),
            paddingHorizontal: scale(9),
            paddingVertical: verticalScale(6),
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: scale(9),
        },
        languageText: {
            ...uiStyle.defaultText,
            fontSize: moderateScale(11),
            fontWeight: '700',
        },
        scheduleCard: {
            flexDirection: 'row',
            marginTop: verticalScale(12),
            paddingVertical: verticalScale(14),
            paddingHorizontal: scale(14),
        },
        scheduleItem: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
        },
        scheduleDivider: {
            width: StyleSheet.hairlineWidth,
            marginHorizontal: scale(12),
            backgroundColor: theme.themeColorUltraLight,
        },
        scheduleIcon: {
            width: scale(36),
            height: scale(36),
            marginRight: scale(9),
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: scale(11),
            backgroundColor: tonal.primary15,
        },
        scheduleText: {
            flex: 1,
            minWidth: 0,
        },
        scheduleLabel: {
            ...uiStyle.defaultText,
            marginBottom: verticalScale(2),
            color: black.third,
            fontSize: moderateScale(10),
            fontWeight: '600',
        },
        scheduleValue: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: moderateScale(13),
            fontWeight: '700',
            lineHeight: moderateScale(17),
        },
        sectionCard: {
            marginTop: verticalScale(12),
            paddingHorizontal: scale(16),
            paddingTop: verticalScale(16),
        },
        sectionHeader: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingBottom: verticalScale(13),
        },
        sectionIcon: {
            width: scale(32),
            height: scale(32),
            marginRight: scale(10),
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: scale(10),
            backgroundColor: tonal.primary15,
        },
        sectionTitle: {
            ...uiStyle.defaultText,
            color: black.main,
            fontSize: moderateScale(17),
            fontWeight: '700',
        },
        infoRow: {
            flexDirection: 'row',
            paddingVertical: verticalScale(12),
        },
        infoRowExpanded: {
            paddingBottom: verticalScale(15),
        },
        rowIcon: {
            width: scale(30),
            paddingTop: verticalScale(1),
            alignItems: 'flex-start',
        },
        rowContent: {
            flex: 1,
            minWidth: 0,
        },
        rowLabel: {
            ...uiStyle.defaultText,
            marginBottom: verticalScale(3),
            color: black.third,
            fontSize: moderateScale(11),
            fontWeight: '600',
        },
        rowValue: {
            ...uiStyle.defaultText,
            color: black.second,
            fontSize: moderateScale(14),
            fontWeight: '400',
            lineHeight: moderateScale(20),
        },
        rowValueExpanded: {
            lineHeight: moderateScale(22),
        },
        separator: {
            height: StyleSheet.hairlineWidth,
            marginLeft: scale(30),
            backgroundColor: theme.themeColorUltraLight,
        },
        tagContainer: {
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: scale(6),
        },
        tag: {
            paddingHorizontal: scale(9),
            paddingVertical: verticalScale(4),
            borderRadius: scale(8),
            backgroundColor: tonal.primary15,
        },
        tagText: {
            ...uiStyle.defaultText,
            color: themeColor,
            fontSize: moderateScale(11),
            fontWeight: '600',
        },
        contactCard: {
            marginBottom: verticalScale(18),
        },
        bottomSpacer: {
            height: verticalScale(40),
        },
    });
};

const SurfaceCard = React.memo(({ children, style }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);

    return <View style={[styles.surfaceCard, style]}>{children}</View>;
});

const HeroSection = React.memo(
    ({
        imageUrl,
        imageLoading,
        onImagePress,
        scrollY,
        setImageLoading,
    }) => {
        const { theme } = useTheme();
        const styles = useMemo(() => createStyles(theme), [theme]);

        const parallaxStyle = useAnimatedStyle(() => {
            const translateY = interpolate(
                scrollY.value,
                [0, HERO_HEIGHT],
                [0, HERO_HEIGHT * 0.32],
                Extrapolation.CLAMP,
            );

            return {
                transform: [{ translateY }],
            };
        });

        return (
            <View style={styles.heroContainer}>
                <Animated.View
                    style={[styles.heroImageWrapper, parallaxStyle]}>
                    <Pressable
                        onPress={onImagePress}
                        style={styles.heroPressable}>
                        <Image
                            source={imageUrl}
                            style={styles.heroImage}
                            contentFit="cover"
                            placeholder={theme.imagePlaceholder}
                            placeholderContentFit="cover"
                            onLoadStart={() => setImageLoading(true)}
                            onLoad={() => setImageLoading(false)}
                            transition={350}
                        />
                        <View
                            pointerEvents="none"
                            style={styles.heroShade}
                        />
                        {imageLoading ? (
                            <View style={styles.heroLoadingOverlay}>
                                <ActivityIndicator
                                    color={theme.trueWhite}
                                    size="large"
                                />
                            </View>
                        ) : null}
                    </Pressable>
                </Animated.View>
            </View>
        );
    },
);

const LanguageSelector = React.memo(
    ({ languageMode, onSelect, selectedIndex }) => {
        const { theme } = useTheme();
        const styles = useMemo(() => createStyles(theme), [theme]);
        const [buttonLayouts, setButtonLayouts] = useState({});

        const indicatorStyle = useAnimatedStyle(() => {
            const selectedLayout = buttonLayouts[selectedIndex];
            if (!selectedLayout) {
                return {};
            }

            return {
                width: withSpring(
                    selectedLayout.width,
                    ANIMATION_CONFIG,
                ),
                transform: [
                    {
                        translateX: withSpring(
                            selectedLayout.x,
                            ANIMATION_CONFIG,
                        ),
                    },
                ],
            };
        });

        const handleLayout = useCallback(
            index => event => {
                const { width, x } = event.nativeEvent.layout;
                setButtonLayouts(previous => ({
                    ...previous,
                    [index]: { width, x },
                }));
            },
            [],
        );

        return (
            <View style={styles.languageTrack}>
                <Animated.View
                    pointerEvents="none"
                    style={[styles.languageIndicator, indicatorStyle]}
                />
                {languageMode.map((item, index) => (
                    item.available ? (
                        <Pressable
                            key={item.locale}
                            onLayout={handleLayout(index)}
                            onPress={() => onSelect(index)}
                            style={styles.languageButton}>
                            <Text
                                style={[
                                    styles.languageText,
                                    {
                                        color: selectedIndex === index
                                            ? theme.trueWhite
                                            : theme.themeColor,
                                    },
                                ]}>
                                {item.name}
                            </Text>
                        </Pressable>
                    ) : null
                ))}
            </View>
        );
    },
);

const ScheduleCard = React.memo(
    ({ dateFrom, dateTo, mode, timeFrom, timeTo }) => {
        const { theme } = useTheme();
        const styles = useMemo(() => createStyles(theme), [theme]);
        const sameDay = moment(dateFrom).format('YYYY-MM-DD')
            === moment(dateTo).format('YYYY-MM-DD');
        const dateText = sameDay
            ? moment(dateFrom).format('YYYY.MM.DD')
            : `${moment(dateFrom).format('MM.DD')} – ${moment(dateTo).format('MM.DD')}`;
        const timeText = `${moment(timeFrom).format('HH:mm')} – ${moment(timeTo).format('HH:mm')}`;

        return (
            <SurfaceCard style={styles.scheduleCard}>
                <View style={styles.scheduleItem}>
                    <View style={styles.scheduleIcon}>
                        <Ionicons
                            color={theme.themeColor}
                            name="calendar-clear-outline"
                            size={scale(18)}
                        />
                    </View>
                    <View style={styles.scheduleText}>
                        <Text style={styles.scheduleLabel}>
                            {LANGUAGE_LABELS.date[mode]}
                        </Text>
                        <Text style={styles.scheduleValue}>
                            {dateText}
                        </Text>
                    </View>
                </View>
                <View style={styles.scheduleDivider} />
                <View style={styles.scheduleItem}>
                    <View style={styles.scheduleIcon}>
                        <Ionicons
                            color={theme.themeColor}
                            name="time-outline"
                            size={scale(19)}
                        />
                    </View>
                    <View style={styles.scheduleText}>
                        <Text style={styles.scheduleLabel}>
                            {LANGUAGE_LABELS.time[mode]}
                        </Text>
                        <Text style={styles.scheduleValue}>
                            {timeText}
                        </Text>
                    </View>
                </View>
            </SurfaceCard>
        );
    },
);

const SectionCard = React.memo(
    ({ children, delay, icon, style, title }) => {
        const { theme } = useTheme();
        const styles = useMemo(() => createStyles(theme), [theme]);

        return (
            <Animated.View
                entering={FadeInUp.delay(delay).duration(350)}>
                <SurfaceCard style={[styles.sectionCard, style]}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionIcon}>
                            <Ionicons
                                color={theme.themeColor}
                                name={icon}
                                size={scale(18)}
                            />
                        </View>
                        <Text style={styles.sectionTitle}>{title}</Text>
                    </View>
                    {children}
                </SurfaceCard>
            </Animated.View>
        );
    },
);

const InfoRow = React.memo(
    ({
        expanded,
        hyperlink,
        icon,
        isLast,
        label,
        navigation,
        tags,
        value,
    }) => {
        const { theme } = useTheme();
        const styles = useMemo(() => createStyles(theme), [theme]);
        const normalizedTags = useMemo(() => {
            if (!tags) {
                return [];
            }
            if (Array.isArray(value)) {
                return value.filter(Boolean);
            }
            return String(value)
                .split(/[,、;；/]/)
                .map(item => item.trim())
                .filter(Boolean);
        }, [tags, value]);

        const valueContent = tags ? (
            <View style={styles.tagContainer}>
                {normalizedTags.map(item => (
                    <View key={item} style={styles.tag}>
                        <Text style={styles.tagText}>{item}</Text>
                    </View>
                ))}
            </View>
        ) : (
            <Text
                selectable
                style={[
                    styles.rowValue,
                    expanded && styles.rowValueExpanded,
                ]}>
                {value}
            </Text>
        );

        return (
            <>
                <View
                    style={[
                        styles.infoRow,
                        expanded && styles.infoRowExpanded,
                    ]}>
                    <View style={styles.rowIcon}>
                        <Ionicons
                            color={theme.themeColor}
                            name={icon}
                            size={scale(17)}
                        />
                    </View>
                    <View style={styles.rowContent}>
                        <Text style={styles.rowLabel}>{label}</Text>
                        {hyperlink && !tags ? (
                            <HyperlinkText
                                linkStyle={{ color: theme.themeColor }}
                                navigation={navigation}>
                                {valueContent}
                            </HyperlinkText>
                        ) : valueContent}
                    </View>
                </View>
                {!isLast ? <View style={styles.separator} /> : null}
            </>
        );
    },
);

const UMEventDetail = ({ navigation, route }) => {
    const { theme } = useTheme();
    const styles = useMemo(() => createStyles(theme), [theme]);
    const imageScrollViewer = useRef(null);
    const scrollY = useSharedValue(0);
    const eventData = route.params.data;

    const parsedData = useMemo(() => {
        const result = {
            dateFrom: eventData.common.dateFrom,
            dateTo: eventData.common.dateTo,
            imageUrls: eventData.common.posterUrl
                ?.replace('http:', 'https:') || '',
            timeFrom: eventData.common.timeFrom,
            timeTo: eventData.common.timeTo,
        };
        const languages = ['cn', 'en', 'pt'];
        const dataKeys = [
            'title',
            'content',
            'organiser',
            'coorganiser',
            'venue',
            'targetAudience',
            'speaker',
            'remark',
            'language',
            'contactName',
            'contactPhone',
            'contactFax',
            'contactMail',
        ];

        languages.forEach(language => {
            dataKeys.forEach(key => {
                result[`${key}_${language}`] = '';
            });
        });

        eventData.details.forEach(item => {
            const language = {
                en_US: 'en',
                pt_PT: 'pt',
                zh_TW: 'cn',
            }[item.locale];
            if (!language) {
                return;
            }

            result[`title_${language}`] = item.title || '';
            result[`content_${language}`] = item.content || '';
            result[`organiser_${language}`] = item.organizedBys || '';
            result[`coorganiser_${language}`] = item.coorganizers || '';
            result[`venue_${language}`] = item.venues || '';
            result[`targetAudience_${language}`]
                = item.targetAudiences || '';
            result[`speaker_${language}`] = item.speakers || '';
            result[`remark_${language}`] = item.remark || '';
            result[`language_${language}`] = item.languages || '';
            result[`contactName_${language}`] = item.contactName || '';
            result[`contactPhone_${language}`] = item.contactPhone || '';
            result[`contactFax_${language}`] = item.contactFax || '';
            result[`contactMail_${language}`] = item.contactEmail || '';
        });

        return result;
    }, [eventData]);

    const languageMode = useMemo(() => [
        {
            locale: 'cn',
            available: Boolean(parsedData.title_cn),
            name: '中',
        },
        {
            locale: 'en',
            available: Boolean(parsedData.title_en),
            name: 'EN',
        },
        {
            locale: 'pt',
            available: Boolean(parsedData.title_pt),
            name: 'PT',
        },
    ], [parsedData]);

    const firstAvailableLanguage = useMemo(() => {
        const index = languageMode.findIndex(item => item.available);
        return index < 0 ? 0 : index;
    }, [languageMode]);

    const [selectedLanguage, setSelectedLanguage] = useState(
        firstAvailableLanguage,
    );
    const [imageLoading, setImageLoading] = useState(true);
    const locale = languageMode[selectedLanguage]?.locale || 'cn';

    const details = useMemo(() => DETAIL_CONFIG
        .map(item => ({
            ...item,
            label: item.labels[selectedLanguage],
            value: parsedData[`${item.key}_${locale}`],
        }))
        .filter(item => (
            Array.isArray(item.value)
                ? item.value.length > 0
                : Boolean(item.value)
        )), [locale, parsedData, selectedLanguage]);

    const contacts = useMemo(() => CONTACT_CONFIG
        .map(item => ({
            ...item,
            label: item.labels[selectedLanguage],
            value: parsedData[`${item.key}_${locale}`],
        }))
        .filter(item => Boolean(item.value)),
        [locale, parsedData, selectedLanguage]);

    const scrollHandler = useAnimatedScrollHandler({
        onScroll: event => {
            scrollY.value = event.contentOffset.y;
        },
    });

    const handleLanguageSelect = useCallback(index => {
        trigger();
        setSelectedLanguage(index);
    }, []);

    const handleImagePress = useCallback(() => {
        trigger();
        imageScrollViewer.current?.handleOpenImage(0);
    }, []);

    useEffect(() => {
        logToFirebase('openPage', { page: 'UMEvent' });
    }, []);

    return (
        <View style={styles.page}>
            <ARKImageView
                ref={imageScrollViewer}
                imageUrls={parsedData.imageUrls}
            />
            <Animated.ScrollView
                contentInsetAdjustmentBehavior={
                    isLiquidGlassSupported ? undefined : 'automatic'
                }
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                showsVerticalScrollIndicator={false}>
                <HeroSection
                    imageLoading={imageLoading}
                    imageUrl={parsedData.imageUrls}
                    onImagePress={handleImagePress}
                    scrollY={scrollY}
                    setImageLoading={setImageLoading}
                />

                <View style={styles.contentWrapper}>
                    <Animated.View
                        entering={FadeInUp.delay(80).duration(350)}>
                        <SurfaceCard style={styles.titleCard}>
                            <View style={styles.titleTopRow}>
                                <Text style={styles.eyebrow}>
                                    {LANGUAGE_LABELS.event[selectedLanguage]}
                                </Text>
                                <LanguageSelector
                                    languageMode={languageMode}
                                    onSelect={handleLanguageSelect}
                                    selectedIndex={selectedLanguage}
                                />
                            </View>
                            <Text selectable style={styles.title}>
                                {parsedData[`title_${locale}`]}
                            </Text>
                        </SurfaceCard>
                    </Animated.View>

                    <Animated.View
                        entering={FadeInUp.delay(140).duration(350)}>
                        <ScheduleCard
                            dateFrom={parsedData.dateFrom}
                            dateTo={parsedData.dateTo}
                            mode={selectedLanguage}
                            timeFrom={parsedData.timeFrom}
                            timeTo={parsedData.timeTo}
                        />
                    </Animated.View>

                    {details.length > 0 ? (
                        <SectionCard
                            delay={200}
                            icon="list-outline"
                            title={
                                LANGUAGE_LABELS.detailTitle[selectedLanguage]
                            }>
                            {details.map((item, index) => (
                                <InfoRow
                                    expanded={item.expanded}
                                    hyperlink={item.hyperlink}
                                    icon={item.icon}
                                    isLast={index === details.length - 1}
                                    key={item.key}
                                    label={item.label}
                                    navigation={navigation}
                                    tags={item.tags}
                                    value={item.value}
                                />
                            ))}
                        </SectionCard>
                    ) : null}

                    {contacts.length > 0 ? (
                        <SectionCard
                            delay={260}
                            icon="person-circle-outline"
                            style={styles.contactCard}
                            title={
                                LANGUAGE_LABELS.contactTitle[selectedLanguage]
                            }>
                            {contacts.map((item, index) => (
                                <InfoRow
                                    hyperlink={item.hyperlink}
                                    icon={item.icon}
                                    isLast={index === contacts.length - 1}
                                    key={item.key}
                                    label={item.label}
                                    navigation={navigation}
                                    value={item.value}
                                />
                            ))}
                        </SectionCard>
                    ) : null}

                    <View style={styles.bottomSpacer} />
                </View>
            </Animated.ScrollView>
        </View>
    );
};

export default UMEventDetail;
