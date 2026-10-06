import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
    moderateScale,
    scale,
    verticalScale,
} from 'react-native-size-matters';

import Text from '../../../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../../../components/ThemeContext';

/** 手機五欄課表的單卡寬度基準；卡片比這更寬（iPad／桌面）時文字才等比放大 */
const BASE_CARD_WIDTH = scale(76);
/** 卡片上下留白：父層 padding 加圓角安全距，放大後的文字塊不得超出 */
const CARD_V_INSET = verticalScale(8);
/** 文字放大上限，避免超寬屏下課卡文字大過頁面標題 */
const MAX_TEXT_SCALE = 2;

/**
 * 概覽課卡共用文字內容。
 *
 * 畫面課表與分享圖片必須共用此元件，避免字級、行高及時間格式不同步。
 *
 * @param {Object} props
 * @param {Object} props.course 課節資料
 * @param {Object} props.frame 概覽課卡 frame
 */
const OverviewCourseCardContent = ({ course, frame }) => {
    const { theme } = useTheme();
    const { black } = theme;
    const compact =
        frame.laneCount > 1 ||
        frame.width < scale(48) ||
        frame.height < verticalScale(52);
    const tiny = frame.height < verticalScale(40);
    const inlineTime = frame.width >= scale(48);
    const classroom = course.Classroom?.trim?.() || '';
    const timeLine = tiny
        ? `${course['Time From']}-${course['Time To']}`
        : inlineTime
          ? `${course['Time From']} - ${course['Time To']}`
          : `${course['Time From']}\n${course['Time To']}`;

    // 各行基準字級／行高（moderateScale 單位），沿用手機版數值
    const codeFont = tiny ? 8 : compact ? 9 : 10;
    const codeLine = tiny ? 9 : compact ? 10 : 11;
    const codeLines = tiny ? 1 : 2;
    const sectionFont = compact ? 6 : 7;
    const sectionLine = compact ? 7 : 8;
    const classroomFont = tiny ? 6 : 7;
    const classroomLine = tiny ? 7 : 8;
    const timeFont = 6.5;
    const timeLineHeight = tiny ? 7 : 8;
    const timeLines = tiny || inlineTime ? 1 : 2;
    const showSection = !tiny && !!course.Section;
    const contentLineHeight =
        codeLine * codeLines +
        (showSection ? sectionLine : 0) +
        (classroom ? classroomLine : 0) +
        timeLineHeight * timeLines;

    // 寬屏下課卡明顯變寬變高，文字按卡片實際尺寸等比放大：
    // 寬度基準取手機單卡寬（手機維持 1 倍），高度以文字塊塞得下為準，取兩者較小值。
    const widthRatio = frame.width / BASE_CARD_WIDTH;
    const heightRatio =
        (frame.height - CARD_V_INSET) / moderateScale(contentLineHeight);
    const textScale = Math.min(
        Math.max(Math.min(widthRatio, heightRatio), 1),
        MAX_TEXT_SCALE,
    );
    const ms = value => moderateScale(value) * textScale;

    const styles = useMemo(
        () =>
            StyleSheet.create({
                courseCode: {
                    ...uiStyle.defaultText,
                    color: black.main,
                    opacity: 0.8,
                    textAlign: 'center',
                    fontWeight: 'bold',
                },
                sectionText: {
                    ...uiStyle.defaultText,
                    color: black.main,
                    opacity: 0.55,
                    textAlign: 'center',
                    fontWeight: '700',
                },
                classroomText: {
                    ...uiStyle.defaultText,
                    color: black.main,
                    opacity: 0.7,
                    textAlign: 'center',
                    fontWeight: '600',
                },
                timeText: {
                    ...uiStyle.defaultText,
                    color: black.main,
                    opacity: 0.75,
                    textAlign: 'center',
                    fontWeight: '600',
                },
            }),
        [black.main],
    );

    return (
        <>
            <Text
                style={[
                    styles.courseCode,
                    {
                        fontSize: ms(codeFont),
                        lineHeight: ms(codeLine),
                    },
                ]}
                numberOfLines={codeLines}>
                {tiny
                    ? course['Course Code']
                    : `${course['Course Code'].substring(0, 4)}\n${course['Course Code'].substring(4, 8)}`}
            </Text>
            {showSection ? (
                <Text
                    style={[
                        styles.sectionText,
                        {
                            fontSize: ms(sectionFont),
                            lineHeight: ms(sectionLine),
                        },
                    ]}
                    numberOfLines={1}>
                    {course.Section}
                </Text>
            ) : null}
            {classroom ? (
                <Text
                    style={[
                        styles.classroomText,
                        {
                            fontSize: ms(classroomFont),
                            lineHeight: ms(classroomLine),
                        },
                    ]}
                    numberOfLines={1}>
                    {classroom}
                </Text>
            ) : null}
            <Text
                style={[
                    styles.timeText,
                    {
                        fontSize: ms(timeFont),
                        lineHeight: ms(timeLineHeight),
                    },
                ]}
                numberOfLines={timeLines}>
                {timeLine}
            </Text>
        </>
    );
};

export default OverviewCourseCardContent;
