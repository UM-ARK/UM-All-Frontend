import React, { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import ActionSheet from 'react-native-actions-sheet';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import { ArrowsClockwise } from 'phosphor-react-native/src/icons/ArrowsClockwise';
import { CaretRight } from 'phosphor-react-native/src/icons/CaretRight';
import { Cloud } from 'phosphor-react-native/src/icons/Cloud';
import { DotsThree } from 'phosphor-react-native/src/icons/DotsThree';
import { Export } from 'phosphor-react-native/src/icons/Export';
import { Trash } from 'phosphor-react-native/src/icons/Trash';

import Text from '../../../../components/AppText';
import ScalePressable from '../../../../components/ScalePressable';
import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import TimetableShareSheet from './TimetableShareSheet';
import { PROGRAMME_LEVELS } from '../../../../utils/courseProgramme';

/**
 * 選課頁次要操作選單（⋯）。
 *
 * 兩個段落共用同一個入口，且刻意不隨段落變化：合併前「搵課」右上是「更新」、
 * 「課表模擬」左上是垃圾桶右上是「＋」，切頁時按鈕會在兩種佈局間跳動。這裡把更新
 * 相關操作收進單一 ActionSheet；有模擬課表時亦在此提供清空操作。
 *
 * @param {object} catalogMetadata 兩份課程 catalog 的 metadata
 * @param {Function} onManualUpdate 手動檢查課表數據更新
 * @param {Function} onOpenSharePoint 開啟官方 SharePoint 課表 Excel
 * @param {boolean} canClear 是否已有模擬課表
 * @param {Function} onClearPress 清空模擬課表
 */
const CourseMoreMenu = ({
    programmeLevel,
    catalogMetadata,
    onManualUpdate,
    onOpenSharePoint,
    canClear,
    onClearPress,
}) => {
    const { theme } = useTheme();
    const {
        themeColor,
        black,
        bg_color,
        white,
        unread,
        pressOverlay,
        featuresScreen,
    } = theme;

    const actionSheetRef = useRef(null);
    const shareSheetRef = useRef(null);
    // sheet 關閉動畫結束前不可再開 WebBrowser / 另一個 sheet，否則 iOS modal 競態會卡死
    const pendingActionRef = useRef(null);

    const styles = useMemo(
        () => ({
            moreButton: {
                // 頂欄高度用 moderateScale／verticalScale；此處勿用 scale()，
                // 否則 iPad 依寬度放大後會比 Tab 高、視覺上像沒對齊
                borderRadius: verticalScale(8),
                paddingHorizontal: verticalScale(8),
                paddingVertical: verticalScale(4),
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: verticalScale(10),
            },
            sheetContainer: {
                borderTopLeftRadius: scale(24),
                borderTopRightRadius: scale(24),
                backgroundColor: bg_color,
            },
            sheetIndicator: {
                backgroundColor: pressOverlay,
                width: scale(34),
                height: verticalScale(3.5),
                marginTop: verticalScale(8),
            },
            sheetContent: {
                paddingHorizontal: scale(14),
                paddingTop: verticalScale(6),
                paddingBottom: verticalScale(14),
            },
            groupCard: {
                backgroundColor: white,
                borderRadius: scale(14),
                overflow: 'hidden',
                marginBottom: verticalScale(10),
            },
            metaCardRow: {
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: white,
                borderRadius: scale(14),
                paddingHorizontal: scale(14),
                paddingVertical: verticalScale(10),
                marginBottom: verticalScale(10),
            },
            metaColumn: {
                flex: 1,
            },
            metaVerticalDivider: {
                width: StyleSheet.hairlineWidth,
                alignSelf: 'stretch',
                backgroundColor: featuresScreen.divider,
                marginHorizontal: scale(12),
            },
            metaLabel: {
                ...uiStyle.defaultText,
                fontSize: scale(11),
                color: black.third,
            },
            metaDate: {
                ...uiStyle.defaultText,
                fontSize: scale(12.5),
                fontWeight: '500',
                color: black.second,
                marginTop: verticalScale(2),
            },
            metaSingleRow: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: white,
                borderRadius: scale(14),
                paddingHorizontal: scale(14),
                paddingVertical: verticalScale(10),
                marginBottom: verticalScale(10),
            },
            rowItem: {
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: scale(14),
                paddingVertical: verticalScale(12),
            },
            rowLeft: {
                flexDirection: 'row',
                alignItems: 'center',
                flex: 1,
                columnGap: scale(12),
            },
            rowLabel: color => ({
                ...uiStyle.defaultText,
                color,
                fontWeight: '500',
                fontSize: scale(14),
                flexShrink: 1,
            }),
            rowDivider: {
                height: StyleSheet.hairlineWidth,
                backgroundColor: featuresScreen.divider,
                marginLeft: scale(44),
            },
            cancelButton: {
                backgroundColor: white,
                borderRadius: scale(14),
                paddingVertical: verticalScale(12),
                alignItems: 'center',
                justifyContent: 'center',
            },
            cancelText: {
                ...uiStyle.defaultText,
                color: black.third,
                fontWeight: '600',
                fontSize: scale(14),
            },
        }),
        [
            bg_color,
            black.second,
            black.third,
            featuresScreen.divider,
            pressOverlay,
            white,
        ],
    );

    const versionItems = useMemo(() => {
        if (programmeLevel === PROGRAMME_LEVELS.postgraduate) {
            const postgraduate = catalogMetadata?.postgraduate;
            if (!postgraduate) {
                return [];
            }
            return [
                {
                    key: 'postgraduate',
                    label: `${t('研究生', { ns: 'catalog' })} · ${postgraduate.academicYear} S${postgraduate.sem}`,
                    date: postgraduate.updateTime,
                },
            ];
        }
        const adddrop = catalogMetadata?.adddrop;
        const pre = catalogMetadata?.pre;
        if (!adddrop || !pre) {
            return [];
        }
        return [
            {
                key: 'adddrop',
                label: `Add Drop · ${adddrop.academicYear} S${adddrop.sem}`,
                date: adddrop.updateTime,
            },
            {
                key: 'pre',
                label: `${t('預選', { ns: 'catalog' })} · ${pre.academicYear} S${pre.sem}`,
                date: pre.updateTime,
            },
        ];
    }, [catalogMetadata, programmeLevel]);

    const handleOpenSheet = useCallback(() => {
        trigger('context');
        actionSheetRef.current?.show();
    }, []);

    // 先收起 sheet，等 onClose 再執行，避免與 WebBrowser PAGE_SHEET / 另一個 sheet 搶 present
    const runAction = useCallback(action => {
        trigger();
        pendingActionRef.current = action ?? null;
        actionSheetRef.current?.hide();
    }, []);

    const handleSheetClose = useCallback(() => {
        const action = pendingActionRef.current;
        pendingActionRef.current = null;
        if (!action) {
            return;
        }
        // onClose 與 Modal setVisible(false) 同期，稍候再開 WebBrowser，避免原生層尚未釋放
        setTimeout(action, 100);
    }, []);

    return (
        <>
            <ScalePressable
                style={styles.moreButton}
                onPress={handleOpenSheet}
                hitSlop={verticalScale(8)}>
                <DotsThree
                    size={verticalScale(20)}
                    color={black.main}
                    weight="bold"
                />
            </ScalePressable>

            <ActionSheet
                ref={actionSheetRef}
                gestureEnabled={true}
                containerStyle={styles.sheetContainer}
                indicatorStyle={styles.sheetIndicator}
                onClose={handleSheetClose}>
                <View style={styles.sheetContent}>
                    {versionItems.length === 1 ? (
                        <View style={styles.metaSingleRow}>
                            <Text style={styles.metaLabel}>
                                {versionItems[0].label}
                            </Text>
                            <Text style={styles.metaDate}>
                                {versionItems[0].date}
                            </Text>
                        </View>
                    ) : versionItems.length === 2 ? (
                        <View style={styles.metaCardRow}>
                            <View style={styles.metaColumn}>
                                <Text style={styles.metaLabel} numberOfLines={1}>
                                    {versionItems[0].label}
                                </Text>
                                <Text style={styles.metaDate} numberOfLines={1}>
                                    {versionItems[0].date}
                                </Text>
                            </View>
                            <View style={styles.metaVerticalDivider} />
                            <View style={styles.metaColumn}>
                                <Text style={styles.metaLabel} numberOfLines={1}>
                                    {versionItems[1].label}
                                </Text>
                                <Text style={styles.metaDate} numberOfLines={1}>
                                    {versionItems[1].date}
                                </Text>
                            </View>
                        </View>
                    ) : null}

                    <View style={styles.groupCard}>
                        <ScalePressable
                            style={styles.rowItem}
                            onPress={() => runAction(onManualUpdate)}>
                            <View style={styles.rowLeft}>
                                <ArrowsClockwise
                                    size={scale(18)}
                                    color={themeColor}
                                    weight="duotone"
                                />
                                <Text style={styles.rowLabel(black.main)}>
                                    {t('手動檢查課表數據更新', { ns: 'catalog' })}
                                </Text>
                            </View>
                        </ScalePressable>

                        {programmeLevel === PROGRAMME_LEVELS.postgraduate ? null : (
                            <>
                                <View style={styles.rowDivider} />
                                <ScalePressable
                                    style={styles.rowItem}
                                    onPress={() => runAction(onOpenSharePoint)}>
                                    <View style={styles.rowLeft}>
                                        <Cloud
                                            size={scale(18)}
                                            color={themeColor}
                                            weight="duotone"
                                        />
                                        <Text style={styles.rowLabel(black.main)}>
                                            {t('檢查官方SharePoint版本', { ns: 'catalog' })}
                                        </Text>
                                    </View>
                                    <CaretRight
                                        size={scale(14)}
                                        color={black.third}
                                        weight="bold"
                                    />
                                </ScalePressable>
                            </>
                        )}
                    </View>

                    {canClear ? (
                        <View style={styles.groupCard}>
                            <ScalePressable
                                style={styles.rowItem}
                                onPress={() =>
                                    runAction(() =>
                                        shareSheetRef.current?.show(),
                                    )
                                }>
                                <View style={styles.rowLeft}>
                                    <Export
                                        size={scale(18)}
                                        color={themeColor}
                                        weight="duotone"
                                    />
                                    <Text style={styles.rowLabel(black.main)}>
                                        {t('分享課表', { ns: 'timetable' })}
                                    </Text>
                                </View>
                                <CaretRight
                                    size={scale(14)}
                                    color={black.third}
                                    weight="bold"
                                />
                            </ScalePressable>
                            <View style={styles.rowDivider} />
                            <ScalePressable
                                style={styles.rowItem}
                                onPress={() => runAction(onClearPress)}>
                                <View style={styles.rowLeft}>
                                    <Trash
                                        size={scale(18)}
                                        color={unread}
                                        weight="duotone"
                                    />
                                    <Text style={styles.rowLabel(unread)}>
                                        {t('清空模擬課表', { ns: 'timetable' })}
                                    </Text>
                                </View>
                            </ScalePressable>
                        </View>
                    ) : null}

                    <ScalePressable
                        style={styles.cancelButton}
                        onPress={() => {
                            trigger();
                            pendingActionRef.current = null;
                            actionSheetRef.current?.hide();
                        }}>
                        <Text style={styles.cancelText}>
                            {t('Cancel')}
                        </Text>
                    </ScalePressable>
                </View>
            </ActionSheet>
            <TimetableShareSheet
                ref={shareSheetRef}
                catalogMetadata={catalogMetadata}
            />
        </>
    );
};

export default CourseMoreMenu;
