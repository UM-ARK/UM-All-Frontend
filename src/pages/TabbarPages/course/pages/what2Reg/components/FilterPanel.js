import React, { useState } from 'react';
import { FlatList, LayoutAnimation, Switch, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import Ionicons from "@react-native-vector-icons/ionicons";
import Text from '../../../../../../components/AppText';
import { uiStyle } from '../../../../../../components/ThemeContext';
import TouchableScale from '../../../../../../components/TouchableScale';
import CourseTimeRangePicker from '../../../components/CourseTimeRangePicker';
import { TIME_RANGE_PRESETS } from '../../../constants';
import {
    DEPARTMENT_ALL,
    DEPARTMENT_UNSPECIFIED,
    DEFAULT_TIME_FROM,
    DEFAULT_TIME_TO,
    defaultTimeFilter,
} from '../constants/options';
import { PROGRAMME_LEVELS } from '../../../../../../utils/courseProgramme';

const FLAT_LIST_STYLE = { flexGrow: 0 };

/**
 * 篩選面板
 * - 課表模式：本科 / 研究生（點擊前往設置）
 * - 模式切換：Add Drop / Pre Enroll
 * - 類型切換：CMRE / GE
 * - 學院 / 學系 / GE 細分
 * - 星期 / 時段（僅 Add Drop，因預選課資料沒有上課時間）
 * - 加課建議（僅顯示未加入且有不衝突 Section 的課程）
 */
const FilterPanel = ({
    theme,
    programmeLevel,
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
    recommendationOnly = false,
    onUpdateFilterOptions,
    onUpdateTimeFilter,
    onToggleRecommendation,
    onSetCourseMode,
    onPressProgrammeLevel,
    trigger,
}) => {
    const { themeColor, secondThemeColor, black, white, tonal } = theme;
    const isPostgraduate = programmeLevel === PROGRAMME_LEVELS.postgraduate;
    const activeColor = isPostgraduate || courseMode === 'ad'
        ? themeColor
        : secondThemeColor;
    const activeBackgroundColor = `${activeColor}15`;

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

    const programmeLevelLabel = isPostgraduate
        ? t('研究生', { ns: 'catalog' })
        : t('本科', { ns: 'catalog' });

    const renderProgrammeLevelChip = () => (
        <TouchableScale
            style={{
                ...classItmStyle,
                position: 'absolute',
                left: verticalScale(5),
                top: verticalScale(5),
                zIndex: 1,
                marginHorizontal: 0,
                flexDirection: 'row',
                alignItems: 'center',
                paddingHorizontal: scale(5),
                paddingVertical: verticalScale(2),
                backgroundColor: tonal.primary15,
            }}
            hitSlop={{ top: scale(8), bottom: scale(8), left: scale(8), right: scale(8) }}
            onPress={() => {
                trigger();
                onPressProgrammeLevel();
            }}
            accessibilityRole="button"
            accessibilityLabel={programmeLevelLabel}
            accessibilityHint={t('前往設置切換課表模式', { ns: 'catalog' })}
        >
            <Text style={{
                ...uiStyle.defaultText,
                color: themeColor,
                fontWeight: '900',
                fontSize: scale(12),
            }}>
                {programmeLevelLabel}
            </Text>
            <Ionicons
                name="chevron-forward"
                size={scale(12)}
                color={themeColor}
                style={{ marginLeft: scale(1) }}
            />
        </TouchableScale>
    );

    const renderADPESwitch = () => {
        const modeList = Object.keys(adpeMap);

        return (
            <FlatList
                data={modeList}
                style={FLAT_LIST_STYLE}
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
            style={FLAT_LIST_STYLE}
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
            style={FLAT_LIST_STYLE}
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
                        nextFilterOptions.depaName = DEPARTMENT_ALL;
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
                    {unitMap[filterOptions.facultyName] || filterOptions.facultyName}
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
            style={{ ...FLAT_LIST_STYLE, marginTop: scale(5) }}
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
                        {item === DEPARTMENT_ALL
                            ? t('全部', { ns: 'catalog' })
                            : item === DEPARTMENT_UNSPECIFIED
                                ? t('未指定學系', { ns: 'catalog' })
                                : item}
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
            {timeFilter.day ? (
                <TouchableScale
                    style={{
                        ...classItmStyle,
                        paddingHorizontal: scale(4),
                        paddingVertical: scale(3),
                        backgroundColor: tonal.primary15,
                        marginRight: scale(2),
                    }}
                    onPress={() => {
                        trigger();
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.spring);
                        // 清空星期與時段，隱藏下方時段篩選列
                        onUpdateTimeFilter(defaultTimeFilter);
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={t('清除', { ns: 'timetable' })}
                >
                    <Ionicons
                        name="close"
                        size={scale(14)}
                        color={themeColor}
                    />
                </TouchableScale>
            ) : null}
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

        return (
            <View style={{ alignItems: 'center' }}>
                {/* 預設上午／下午／晚上 */}
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: verticalScale(4),
                }}>
                    {TIME_RANGE_PRESETS.map(preset => {
                        const isSelected =
                            timeFilter.from === preset.from &&
                            timeFilter.to === preset.to;
                        return (
                            <TouchableScale
                                key={preset.id}
                                style={{
                                    ...classItmStyle,
                                    paddingHorizontal: scale(8),
                                    paddingVertical: scale(3),
                                    backgroundColor: isSelected
                                        ? tonal.primary30
                                        : tonal.primary15,
                                    marginHorizontal: scale(3),
                                }}
                                onPress={() => {
                                    trigger();
                                    // 再次點擊已選預設 → 取消，還原全天
                                    onUpdateTimeFilter({
                                        ...timeFilter,
                                        from: isSelected
                                            ? DEFAULT_TIME_FROM
                                            : preset.from,
                                        to: isSelected
                                            ? DEFAULT_TIME_TO
                                            : preset.to,
                                    });
                                }}
                            >
                                <Text style={{
                                    ...uiStyle.defaultText,
                                    color: isSelected ? themeColor : black.third,
                                    fontWeight: isSelected ? '900' : 'normal',
                                    fontSize: scale(12),
                                }}>
                                    {t(preset.labelKey, { ns: 'timetable' })}
                                </Text>
                            </TouchableScale>
                        );
                    })}
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    {isTimeRangeDefault ? null : (
                        <TouchableScale
                            style={{
                                ...classItmStyle,
                                paddingHorizontal: scale(4),
                                paddingVertical: scale(3),
                                backgroundColor: tonal.primary15,
                                marginRight: scale(4),
                            }}
                            onPress={() => {
                                trigger();
                                onUpdateTimeFilter({
                                    ...timeFilter,
                                    from: DEFAULT_TIME_FROM,
                                    to: DEFAULT_TIME_TO,
                                });
                            }}
                            accessibilityRole="button"
                            accessibilityLabel={t('清除', { ns: 'timetable' })}
                        >
                            <Ionicons
                                name="close"
                                size={scale(14)}
                                color={themeColor}
                            />
                        </TouchableScale>
                    )}

                    {renderTimeButton('from')}
                    <Text style={{ ...uiStyle.defaultText, color: black.third, fontSize: scale(12) }}>
                        {' - '}
                    </Text>
                    {renderTimeButton('to')}
                </View>

                <CourseTimeRangePicker
                    visible={showTimePicker}
                    from={timeFilter.from}
                    to={timeFilter.to}
                    onConfirm={({ from, to }) => {
                        onUpdateTimeFilter({ ...timeFilter, from, to });
                        setShowTimePicker(false);
                    }}
                    onCancel={() => setShowTimePicker(false)}
                />
            </View>
        );
    };

    const offerDepaList = filterOptions.option !== 'GE' && filterOptions.facultyName in offerFacultyDepaListObj
        ? offerFacultyDepaListObj[filterOptions.facultyName]
        : [];

    const renderRecommendationFilter = () => (
        <View style={{ width: '100%', alignItems: 'center', marginTop: verticalScale(2) }}>
            <TouchableScale
                activeScale={0.96}
                style={{
                    ...classItmStyle,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingHorizontal: scale(8),
                    paddingVertical: scale(3),
                }}
                onPress={() => {
                    trigger();
                    onToggleRecommendation();
                }}
                accessibilityRole="switch"
                accessibilityState={{ checked: recommendationOnly }}
                accessibilityLabel={t('只看不衝突', { ns: 'catalog' })}
            >
                <Text style={{
                    ...uiStyle.defaultText,
                    color: recommendationOnly ? themeColor : black.third,
                    fontWeight: recommendationOnly ? '900' : 'normal',
                    fontSize: scale(12),
                    marginRight: scale(4),
                }}>
                    {t('只看不衝突', { ns: 'catalog' })}
                </Text>
                {/* Switch 僅作狀態指示；縮小後用固定尺寸容器吃掉原生佔位 */}
                <View
                    style={{
                        width: scale(36),
                        height: scale(22),
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}>
                    <Switch
                        accessibilityElementsHidden
                        importantForAccessibility="no"
                        pointerEvents="none"
                        ios_backgroundColor={tonal.primary15}
                        trackColor={{
                            false: tonal.primary15,
                            true: themeColor,
                        }}
                        value={recommendationOnly}
                        style={{ transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }] }}
                    />
                </View>
            </TouchableScale>
        </View>
    );

    return (
        <View style={{
            backgroundColor: white,
            borderRadius: scale(10),
            margin: scale(5),
            marginHorizontal: scale(10),
            padding: scale(5),
        }}>
            {renderProgrammeLevelChip()}
            {isPostgraduate ? null : renderADPESwitch()}
            {isPostgraduate ? null : (
                <View style={{ width: '100%', marginTop: scale(10) }}>
                    {renderCMGESwitch()}
                </View>
            )}

            {!isPostgraduate && filterOptions.option === 'GE' ? (
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
                            {filterOptions.depaName !== DEPARTMENT_ALL &&
                            filterOptions.depaName !== DEPARTMENT_UNSPECIFIED &&
                            filterOptions.depaName in depaMap ? (
                                <Text style={{ ...classItmTitleTextStyle, marginBottom: scale(-5) }}>
                                    {depaMap[filterOptions.depaName]}
                                </Text>
                            ) : null}
                            {renderDepaSwitch(offerDepaList)}
                        </View>
                    ) : null}
                </View>
            )}

            {!isPostgraduate && courseMode === 'preEnroll' ? null : (
                <View style={{ marginTop: scale(5), width: '100%', alignItems: 'center' }}>
                    <Text style={classItmTitleTextStyle}>
                        {t('上課星期與時段', { ns: 'catalog' })}
                    </Text>
                    {renderDayFilter()}
                    {timeFilter.day ? renderTimeRangeFilter() : null}
                </View>
            )}
            {!isPostgraduate && courseMode === 'preEnroll'
                ? null
                : renderRecommendationFilter()}
        </View>
    );
};

export default FilterPanel;
