import React, { useCallback, useMemo, useRef } from 'react';
import { Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import ActionSheet from 'react-native-actions-sheet';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';

import { useTheme, uiStyle } from '../../../../components/ThemeContext';
import { trigger } from '../../../../utils/trigger';
import TouchableScale from '../../../../components/TouchableScale';

/**
 * 選課頁次要操作選單（⋯）。
 *
 * 兩個段落共用同一個入口，且刻意不隨段落變化：合併前「搵課」右上是「更新」、
 * 「課表模擬」左上是垃圾桶右上是「＋」，切頁時按鈕會在兩種佈局間跳動。這裡把更新
 * 相關操作收進單一 ActionSheet；清空已遷到課表段落右下 FAB 上方。
 *
 * @param {object} courseVersion 課程資料版本，形狀同 static/UMCourses/courseVersion.json
 * @param {Function} onManualUpdate 手動檢查課表數據更新
 * @param {Function} onOpenSharePoint 開啟官方 SharePoint 課表 Excel
 */
const CourseMoreMenu = ({
    courseVersion,
    onManualUpdate,
    onOpenSharePoint,
}) => {
    const { theme } = useTheme();
    const { themeColor, tonal, black, bg_color } = theme;

    const actionSheetRef = useRef(null);
    // sheet 關閉動畫結束前不可再開 WebBrowser / 另一個 sheet，否則 iOS modal 競態會卡死
    const pendingActionRef = useRef(null);

    const styles = useMemo(
        () => ({
            moreButton: {
                backgroundColor: tonal.primary15,
                borderRadius: scale(8),
                paddingHorizontal: scale(8),
                paddingVertical: scale(4),
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: scale(10),
            },
            sheetContainer: {
                borderRadius: scale(10),
                padding: scale(10),
                backgroundColor: bg_color,
            },
            versionText: {
                ...uiStyle.defaultText,
                fontSize: scale(12),
                color: black.third,
                textAlign: 'center',
                marginBottom: scale(15),
            },
            actionButton: backgroundColor => ({
                backgroundColor,
                borderRadius: scale(8),
                paddingVertical: verticalScale(10),
                alignItems: 'center',
                marginBottom: scale(10),
            }),
            actionButtonText: color => ({
                ...uiStyle.defaultText,
                color,
                fontWeight: 'bold',
                fontSize: scale(15),
            }),
        }),
        [bg_color, black.third, tonal.primary15],
    );

    const versionSummary = useMemo(() => {
        const adddrop = courseVersion?.adddrop;
        const pre = courseVersion?.pre;
        if (!adddrop || !pre) {
            return '';
        }
        return [
            `${t('Add Drop Data Version', { ns: 'about' })}${adddrop.updateTime}`,
            `${adddrop.academicYear} - Sem ${adddrop.sem}`,
            '',
            `${t('PreEnroll Data Version', { ns: 'about' })}${pre.updateTime}`,
            `${pre.academicYear} - Sem ${pre.sem}`,
        ].join('\n');
    }, [courseVersion]);

    const handleOpenSheet = useCallback(() => {
        trigger();
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
            <TouchableScale
                style={styles.moreButton}
                onPress={handleOpenSheet}
                hitSlop={scale(8)}>
                <Ionicons
                    name="ellipsis-horizontal"
                    size={scale(16)}
                    color={themeColor}
                />
            </TouchableScale>

            <ActionSheet
                ref={actionSheetRef}
                containerStyle={styles.sheetContainer}
                onClose={handleSheetClose}>
                <View style={{ padding: scale(10) }}>
                    {versionSummary ? (
                        <Text style={styles.versionText}>{versionSummary}</Text>
                    ) : null}

                    <TouchableScale
                        style={styles.actionButton(tonal.primary30)}
                        onPress={() => runAction(onManualUpdate)}>
                        <Text style={styles.actionButtonText(themeColor)}>
                            {t('手動檢查課表數據更新', { ns: 'catalog' })}
                        </Text>
                    </TouchableScale>

                    <TouchableScale
                        style={styles.actionButton(tonal.primary15)}
                        onPress={() => runAction(onOpenSharePoint)}>
                        <Text style={styles.actionButtonText(themeColor)}>
                            {t('檢查官方SharePoint版本', { ns: 'catalog' })}
                        </Text>
                    </TouchableScale>

                    <TouchableScale
                        style={styles.actionButton(tonal.primary08)}
                        onPress={() => {
                            trigger();
                            pendingActionRef.current = null;
                            actionSheetRef.current?.hide();
                        }}>
                        <Text style={styles.actionButtonText(black.third)}>
                            {t('Cancel')}
                        </Text>
                    </TouchableScale>
                </View>
            </ActionSheet>
        </>
    );
};

export default CourseMoreMenu;
