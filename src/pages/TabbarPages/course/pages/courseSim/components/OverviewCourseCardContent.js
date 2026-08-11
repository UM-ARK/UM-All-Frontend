import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import {
    moderateScale,
    scale,
    verticalScale,
} from 'react-native-size-matters';

import Text from '../../../../../../components/AppText';
import { useTheme, uiStyle } from '../../../../../../components/ThemeContext';

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
                        fontSize: moderateScale(tiny ? 8 : compact ? 9 : 10),
                        lineHeight: moderateScale(
                            tiny ? 9 : compact ? 10 : 11,
                        ),
                    },
                ]}
                numberOfLines={tiny ? 1 : 2}>
                {tiny
                    ? course['Course Code']
                    : `${course['Course Code'].substring(0, 4)}\n${course['Course Code'].substring(4, 8)}`}
            </Text>
            {!tiny && course.Section ? (
                <Text
                    style={[
                        styles.sectionText,
                        {
                            fontSize: moderateScale(compact ? 6 : 7),
                            lineHeight: moderateScale(compact ? 7 : 8),
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
                            fontSize: moderateScale(tiny ? 6 : 7),
                            lineHeight: moderateScale(tiny ? 7 : 8),
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
                        fontSize: moderateScale(6.5),
                        lineHeight: moderateScale(tiny ? 7 : 8),
                    },
                ]}
                numberOfLines={tiny || inlineTime ? 1 : 2}>
                {timeLine}
            </Text>
        </>
    );
};

export default OverviewCourseCardContent;
