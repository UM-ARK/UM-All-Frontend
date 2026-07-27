import React, { memo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useTheme } from '../../../../components/ThemeContext';
import { scale, verticalScale } from 'react-native-size-matters';

/** 活動詳情封面高度，對齊 ImageHeaderScrollView maxHeight */
const EVENT_COVER_HEIGHT = verticalScale(350);
/** 組織詳情封面高度 */
const CLUB_COVER_HEIGHT = verticalScale(300);
const CLUB_LOGO_SIZE = scale(80);
const CLUB_IMAGE_WIDTH = scale(66);
const CLUB_IMAGE_HEIGHT = verticalScale(55);
const EVENT_DETAIL_LINE_WIDTHS = ['92%', '86%', '78%', '64%'];
const CLUB_CONTACT_ROWS = [
    { label: '28%', value: '62%' },
    { label: '34%', value: '70%' },
];

/** 色塊佔位 */
const SkeletonBone = ({ width, height, color, style }) => (
    <View
        style={[
            {
                width,
                height,
                borderRadius: scale(4),
                backgroundColor: color,
            },
            style,
        ]}
    />
);

/** 頂部封面佔位 */
const SkeletonCover = ({ height, tonal }) => (
    <View
        style={{
            width: '100%',
            height,
            backgroundColor: tonal.primary15,
        }}
    />
);

/** 詳情頁白底卡片：標題佔位 + 內容 */
const SkeletonCard = ({ white, tonal, titleWidth = '22%', children }) => (
    <View style={[styles.card, { backgroundColor: white }]}>
        <View style={styles.cardTitle}>
            <SkeletonBone
                width={titleWidth}
                height={verticalScale(13)}
                color={tonal.primary15}
            />
        </View>
        <View style={styles.cardBody}>{children}</View>
    </View>
);

/**
 * 活動詳情載入骨架：封面 + 活動資訊卡 + 活動詳情卡
 */
export const EventDetailSkeleton = memo(function EventDetailSkeleton() {
    const { theme } = useTheme();
    const { bg_color, white, tonal } = theme;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: bg_color }}
            contentContainerStyle={{ paddingBottom: verticalScale(100) }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
        >
            <SkeletonCover height={EVENT_COVER_HEIGHT} tonal={tonal} />

            <SkeletonCard white={white} tonal={tonal}>
                <SkeletonBone
                    width="88%"
                    height={verticalScale(18)}
                    color={tonal.primary15}
                    style={{ marginBottom: verticalScale(8) }}
                />
                <View style={styles.iconRow}>
                    <SkeletonBone
                        width={scale(16)}
                        height={scale(16)}
                        color={tonal.primary15}
                        style={{ marginRight: scale(5) }}
                    />
                    <SkeletonBone
                        width="36%"
                        height={verticalScale(12)}
                        color={tonal.primary08}
                    />
                </View>
                <View style={styles.iconRow}>
                    <SkeletonBone
                        width={scale(16)}
                        height={scale(16)}
                        color={tonal.primary15}
                        style={{ marginRight: scale(5) }}
                    />
                    <SkeletonBone
                        width="58%"
                        height={verticalScale(12)}
                        color={tonal.primary08}
                    />
                </View>
                {/* 主辦方佔位 */}
                <View
                    style={[
                        styles.organizerBox,
                        { backgroundColor: bg_color },
                    ]}
                >
                    <View
                        style={[
                            styles.organizerAvatar,
                            { backgroundColor: tonal.primary15 },
                        ]}
                    />
                    <View style={{ flex: 1 }}>
                        <SkeletonBone
                            width="24%"
                            height={verticalScale(12)}
                            color={tonal.primary08}
                        />
                        <SkeletonBone
                            width="42%"
                            height={verticalScale(14)}
                            color={tonal.primary15}
                            style={{ marginTop: verticalScale(6) }}
                        />
                    </View>
                </View>
            </SkeletonCard>

            <SkeletonCard white={white} tonal={tonal}>
                {EVENT_DETAIL_LINE_WIDTHS.map((width, index) => (
                    <SkeletonBone
                        key={`event-detail-line-${index}`}
                        width={width}
                        height={verticalScale(13)}
                        color={
                            index === 0 ? tonal.primary15 : tonal.primary08
                        }
                        style={{
                            marginTop: index === 0 ? 0 : verticalScale(10),
                        }}
                    />
                ))}
            </SkeletonCard>
        </ScrollView>
    );
});

/**
 * 組織詳情載入骨架：封面 + Logo／名稱／標籤 + 照片卡 + 聯繫方式卡
 */
export const ClubDetailSkeleton = memo(function ClubDetailSkeleton() {
    const { theme } = useTheme();
    const { bg_color, white, tonal } = theme;

    return (
        <ScrollView
            style={{ flex: 1, backgroundColor: bg_color }}
            contentContainerStyle={{ paddingBottom: verticalScale(100) }}
            showsVerticalScrollIndicator={false}
            scrollEnabled={false}
        >
            <SkeletonCover height={CLUB_COVER_HEIGHT} tonal={tonal} />

            {/* Logo、名稱、分類標籤 */}
            <View style={styles.clubProfile}>
                <View
                    style={[
                        styles.clubLogo,
                        { backgroundColor: tonal.primary15 },
                    ]}
                />
                <SkeletonBone
                    width="42%"
                    height={verticalScale(20)}
                    color={tonal.primary15}
                    style={{ marginTop: scale(5), alignSelf: 'center' }}
                />
                <SkeletonBone
                    width="18%"
                    height={verticalScale(15)}
                    color={tonal.primary08}
                    style={{ marginTop: verticalScale(6), alignSelf: 'center' }}
                />
            </View>

            {/* 照片卡 */}
            <SkeletonCard white={white} tonal={tonal} titleWidth="16%">
                <View style={styles.photoRow}>
                    <View
                        style={[
                            styles.photoThumb,
                            { backgroundColor: tonal.primary15 },
                        ]}
                    />
                    <View
                        style={[
                            styles.photoThumb,
                            { backgroundColor: tonal.primary08 },
                        ]}
                    />
                    <View
                        style={[
                            styles.photoThumb,
                            { backgroundColor: tonal.primary15 },
                        ]}
                    />
                </View>
            </SkeletonCard>

            {/* 聯繫方式卡 */}
            <SkeletonCard white={white} tonal={tonal} titleWidth="28%">
                {CLUB_CONTACT_ROWS.map((row, index) => (
                    <View
                        key={`club-contact-${index}`}
                        style={[
                            styles.contactRow,
                            { marginTop: index === 0 ? 0 : verticalScale(8) },
                        ]}
                    >
                        <SkeletonBone
                            width={row.label}
                            height={verticalScale(13)}
                            color={tonal.primary15}
                            style={{ marginRight: scale(8) }}
                        />
                        <SkeletonBone
                            width={row.value}
                            height={verticalScale(12.5)}
                            color={tonal.primary08}
                        />
                    </View>
                ))}
            </SkeletonCard>
        </ScrollView>
    );
});

const styles = StyleSheet.create({
    card: {
        borderRadius: scale(10),
        marginHorizontal: scale(15),
        marginBottom: verticalScale(8),
        marginTop: scale(10),
    },
    cardTitle: {
        paddingVertical: scale(10),
        paddingHorizontal: scale(10),
    },
    cardBody: {
        margin: scale(10),
        marginTop: scale(0),
    },
    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: verticalScale(5),
    },
    organizerBox: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: verticalScale(8),
        paddingVertical: scale(8),
        paddingHorizontal: scale(10),
        borderRadius: scale(8),
    },
    organizerAvatar: {
        width: scale(40),
        height: scale(40),
        borderRadius: scale(20),
        marginRight: scale(10),
    },
    clubProfile: {
        alignItems: 'center',
        marginTop: verticalScale(10),
    },
    clubLogo: {
        width: CLUB_LOGO_SIZE,
        height: CLUB_LOGO_SIZE,
        borderRadius: scale(50),
    },
    photoRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'flex-start',
    },
    photoThumb: {
        width: CLUB_IMAGE_WIDTH,
        height: CLUB_IMAGE_HEIGHT,
        borderRadius: scale(5),
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
});
