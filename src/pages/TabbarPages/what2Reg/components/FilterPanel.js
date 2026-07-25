import React, { useState } from 'react';
import { Alert, FlatList, LayoutAnimation, Text, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import DateTimePickerModal from 'react-native-modal-datetime-picker';
import moment from 'moment';
import { t } from 'i18next';
import { uiStyle } from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';
import { DEFAULT_TIME_FROM, DEFAULT_TIME_TO, defaultTimeFilter } from '../constants/options';

/**
 * 篩選面板
 * - 模式切換：Add Drop / Pre Enroll
 * - 類型切換：CMRE / GE
 * - 學院 / 學系 / GE 細分
 * - 星期 / 時段（僅 Add Drop，因預選課資料沒有上課時間）
 */
const FilterPanel = ({
    theme,
    courseMode,
    filterOptions,
    offerFacultyList,
    offerGEList,
    offerFacultyDepaListObj,
    unitMap,
    depaMap,
    geClassMap,
    adpeMap,
    modeENStr,
    CMGEList,
    dayList,
    timeFilter = defaultTimeFilter,
    onUpdateFilterOptions,
    onUpdateTimeFilter,
    onSetCourseMode,
    trigger,
}) => {
    const { themeColor, secondThemeColor, black, white, tonal } = theme;
    const activeColor = courseMode === 'ad' ? themeColor : secondThemeColor;
    const activeBackgroundColor = `${activeColor}15`;

    const [timePickerMode, setTimePickerMode] = useState('from');
    const [showTimePicker, setShowTimePicker] = useState(false);

    const classItmStyle = {
        borderRadius: scale(10),
        borderColor: black.third,
        marginHorizontal: scale(2),
    };

    const classItmTitleTextStyle = {
        ...uiStyle.defaultText,
        fontSize: scale(13),
        color: activeColor,
        fontWeight: '600',
        alignSelf: 'center',
        marginLeft: scale(5),
        textAlign: 'center',
    };

    const renderADPESwitch = () => {
        const modeList = Object.keys(adpeMap);

        return (
            <FlatList
                data={modeList}
                keyExtractor={item => item}
                numColumns={modeList.length}
                key={`flatList_mode_${modeList.length}`}
                contentContainerStyle={{ alignItems: 'center' }}
                scrollEnabled={false}
                renderItem={({ item }) => (
                    <TouchableScale
                        style={{
                            ...classItmStyle,
                            paddingHorizontal: scale(5),
                            paddingVertical: verticalScale(2),
                            backgroundColor: courseMode === item
                                ? activeBackgroundColor
                                : null,
                        }}
                        onPress={() => {
                            trigger();
                            onSetCourseMode(item);
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                            onUpdateFilterOptions({ ...filterOptions, mode: item });
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: courseMode === item
                                ? activeColor
                                : black.third,
                            fontWeight: courseMode === item ? '900' : 'normal',
                            fontSize: scale(12),
                        }}>
                            {modeENStr[item]}
                        </Text>
                    </TouchableScale>
                )}
                ListHeaderComponent={() => (
                    <Text style={classItmTitleTextStyle}>
                        {adpeMap[courseMode]}
                    </Text>
                )}
            />
        );
    };

    const renderCMGESwitch = () => (
        <FlatList
            data={CMGEList}
            keyExtractor={item => item}
            numColumns={CMGEList.length}
            key={`flatList_cmge_${CMGEList.length}`}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item }) => (
                <TouchableScale
                    style={{
                        ...classItmStyle,
                        paddingHorizontal: scale(5),
                        paddingVertical: scale(2),
                        backgroundColor: filterOptions.option === item ? activeBackgroundColor : null,
                    }}
                    onPress={() => {
                        trigger();
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                        onUpdateFilterOptions({ ...filterOptions, option: item });
                    }}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: filterOptions.option === item ? activeColor : black.third,
                        fontWeight: filterOptions.option === item ? '900' : 'normal',
                        fontSize: scale(12),
                    }}>
                        {item}
                    </Text>
                </TouchableScale>
            )}
            ListHeaderComponent={() => (
                <Text style={classItmTitleTextStyle}>
                    {filterOptions.option === 'GE'
                        ? t('通識課', { ns: 'catalog' })
                        : t('必修課 與 選修課', { ns: 'catalog' })}
                </Text>
            )}
            scrollEnabled={false}
        />
    );

    const renderFacultySwitch = () => (
        <FlatList
            data={offerFacultyList}
            keyExtractor={item => item}
            numColumns={offerFacultyList.length}
            key={`flatList_faculty_${offerFacultyList.length}`}
            columnWrapperStyle={offerFacultyList.length > 1 ? { flexWrap: 'wrap', justifyContent: 'center' } : null}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item }) => (
                <TouchableScale
                    style={{
                        ...classItmStyle,
                        backgroundColor: item === filterOptions.facultyName ? activeBackgroundColor : null,
                        paddingHorizontal: scale(5),
                        paddingVertical: scale(2),
                    }}
                    onPress={() => {
                        trigger();
                        const nextFilterOptions = { ...filterOptions, facultyName: item };
                        const depaList = offerFacultyDepaListObj[item] || [];
                        if (depaList.length > 0) {
                            nextFilterOptions.depaName = depaList[0];
                        }
                        onUpdateFilterOptions(nextFilterOptions);
                    }}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: item === filterOptions.facultyName ? activeColor : black.third,
                        fontWeight: item === filterOptions.facultyName ? '900' : 'normal',
                        fontSize: scale(12),
                    }}>
                        {item}
                    </Text>
                </TouchableScale>
            )}
            ListHeaderComponent={() => (
                <Text style={classItmTitleTextStyle}>
                    {unitMap[filterOptions.facultyName]}
                </Text>
            )}
            scrollEnabled={false}
        />
    );

    const renderDepaSwitch = offerDepaList => (
        <FlatList
            data={offerDepaList}
            keyExtractor={item => item}
            horizontal
            scrollEnabled
            style={{ marginTop: scale(5) }}
            contentContainerStyle={{ alignItems: 'center' }}
            renderItem={({ item }) => (
                <TouchableScale
                    style={{
                        ...classItmStyle,
                        paddingHorizontal: scale(5),
                        paddingVertical: scale(2),
                        backgroundColor: filterOptions.depaName === item ? activeBackgroundColor : null,
                    }}
                    onPress={() => {
                        trigger();
                        onUpdateFilterOptions({ ...filterOptions, depaName: item });
                    }}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        alignSelf: 'center',
                        color: filterOptions.depaName === item ? activeColor : black.third,
                        fontWeight: filterOptions.depaName === item ? '900' : 'normal',
                        fontSize: scale(12),
                    }}>
                        {item}
                    </Text>
                </TouchableScale>
            )}
        />
    );

    const isTimeRangeDefault = timeFilter.from === DEFAULT_TIME_FROM && timeFilter.to === DEFAULT_TIME_TO;

    const renderDayFilter = () => (
        <View style={{
            flexDirection: 'row',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'center',
            marginVertical: verticalScale(5),
        }}>
            {dayList.map(day => {
                const isSelected = day === timeFilter.day;

                return (
                    <TouchableScale
                        key={day}
                        style={{
                            ...classItmStyle,
                            paddingHorizontal: scale(5),
                            paddingVertical: scale(3),
                            backgroundColor: isSelected ? tonal.primary15 : null,
                        }}
                        onPress={() => {
                            trigger();
                            LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                            // 取消星期時一併還原時段，避免留下看不見卻仍在生效的時段條件
                            onUpdateTimeFilter(isSelected
                                ? defaultTimeFilter
                                : { ...timeFilter, day });
                        }}
                    >
                        <Text style={{
                            ...uiStyle.defaultText,
                            color: isSelected ? themeColor : black.third,
                            fontWeight: isSelected ? '900' : 'normal',
                            fontSize: scale(12),
                        }}>
                            {day}
                        </Text>
                    </TouchableScale>
                );
            })}
        </View>
    );

    const renderTimeRangeFilter = () => {
        const renderTimeButton = mode => {
            const isDefault = mode === 'from'
                ? timeFilter.from === DEFAULT_TIME_FROM
                : timeFilter.to === DEFAULT_TIME_TO;

            return (
                <TouchableScale
                    style={{
                        ...classItmStyle,
                        paddingHorizontal: scale(8),
                        paddingVertical: scale(3),
                        backgroundColor: isDefault ? tonal.primary15 : tonal.primary30,
                    }}
                    onPress={() => {
                        trigger();
                        setTimePickerMode(mode);
                        setShowTimePicker(true);
                    }}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        color: isDefault ? black.third : themeColor,
                        fontWeight: isDefault ? 'normal' : '900',
                        fontSize: scale(12),
                    }}>
                        {mode === 'from' ? timeFilter.from : timeFilter.to}
                    </Text>
                </TouchableScale>
            );
        };

        const handleConfirmTime = date => {
            const pickedTime = moment(date).format('HH:mm');

            if (timePickerMode === 'from') {
                if (moment(date).isSameOrAfter(moment(timeFilter.to, 'HH:mm'))) {
                    Alert.alert(t('開始時間不能晚於結束時間！', { ns: 'timetable' }));
                    return;
                }
                onUpdateTimeFilter({ ...timeFilter, from: pickedTime });
            } else {
                if (moment(date).isSameOrBefore(moment(timeFilter.from, 'HH:mm'))) {
                    Alert.alert(t('結束時間不能早於開始時間！', { ns: 'timetable' }));
                    return;
                }
                onUpdateTimeFilter({ ...timeFilter, to: pickedTime });
            }

            setShowTimePicker(false);
        };

        return (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                {isTimeRangeDefault ? null : (
                    <TouchableScale
                        style={{
                            ...classItmStyle,
                            paddingHorizontal: scale(8),
                            paddingVertical: scale(3),
                            backgroundColor: tonal.primary15,
                        }}
                        onPress={() => {
                            trigger();
                            onUpdateTimeFilter({
                                ...timeFilter,
                                from: DEFAULT_TIME_FROM,
                                to: DEFAULT_TIME_TO,
                            });
                        }}
                    >
                        <Text style={{ ...uiStyle.defaultText, color: themeColor, fontSize: scale(12) }}>
                            {'Clear'}
                        </Text>
                    </TouchableScale>
                )}

                {renderTimeButton('from')}
                <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>
                    {' - '}
                </Text>
                {renderTimeButton('to')}

                <DateTimePickerModal
                    isVisible={showTimePicker}
                    mode="time"
                    date={timePickerMode === 'from'
                        ? moment(timeFilter.from, 'HH:mm').toDate()
                        : moment(timeFilter.to, 'HH:mm').toDate()}
                    minuteInterval={5}
                    onConfirm={handleConfirmTime}
                    onCancel={() => setShowTimePicker(false)}
                />
            </View>
        );
    };

    const offerDepaList = filterOptions.option !== 'GE' && filterOptions.facultyName in offerFacultyDepaListObj
        ? offerFacultyDepaListObj[filterOptions.facultyName]
        : [];

    return (
        <View style={{
            backgroundColor: white,
            borderRadius: scale(10),
            margin: scale(5),
            marginHorizontal: scale(10),
            padding: scale(5),
        }}>
            {renderADPESwitch()}
            <View style={{ width: '100%', marginTop: scale(10) }}>
                {renderCMGESwitch()}
            </View>

            {filterOptions.option === 'GE' ? (
                <View style={{ marginTop: scale(5), alignItems: 'center', width: '100%' }}>
                    <Text style={classItmTitleTextStyle}>
                        {geClassMap[filterOptions.GE]}
                    </Text>
                    <View style={{ flexDirection: 'row', marginVertical: scale(5) }}>
                        {offerGEList.map(item => (
                            <TouchableScale
                                key={item}
                                style={{
                                    ...classItmStyle,
                                    paddingHorizontal: scale(5),
                                    paddingVertical: scale(3),
                                    backgroundColor: filterOptions.GE === item ? activeBackgroundColor : null,
                                }}
                                onPress={() => {
                                    trigger();
                                    onUpdateFilterOptions({ ...filterOptions, GE: item });
                                }}
                            >
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: filterOptions.GE === item ? activeColor : black.third,
                                    fontWeight: filterOptions.GE === item ? '900' : 'normal',
                                    fontSize: scale(12),
                                }}>
                                    {item}
                                </Text>
                            </TouchableScale>
                        ))}
                    </View>
                </View>
            ) : (
                <View style={{ marginTop: scale(10), width: '100%' }}>
                    {renderFacultySwitch()}
                    {offerDepaList.length > 0 ? (
                        <View style={{ alignItems: 'center', justifyContent: 'center', marginVertical: scale(10) }}>
                            {filterOptions.depaName in depaMap ? (
                                <Text style={{ ...classItmTitleTextStyle, marginBottom: scale(-5) }}>
                                    {depaMap[filterOptions.depaName]}
                                </Text>
                            ) : null}
                            {renderDepaSwitch(offerDepaList)}
                        </View>
                    ) : null}
                </View>
            )}

            {courseMode === 'preEnroll' ? null : (
                <View style={{ marginTop: scale(5), width: '100%', alignItems: 'center' }}>
                    <Text style={classItmTitleTextStyle}>
                        {t('上課星期與時段', { ns: 'catalog' })}
                    </Text>
                    {renderDayFilter()}
                    {timeFilter.day ? renderTimeRangeFilter() : null}
                </View>
            )}
        </View>
    );
};

export default FilterPanel;
