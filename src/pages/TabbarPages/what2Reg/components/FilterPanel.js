import React from 'react';
import { FlatList, LayoutAnimation, Text, View } from 'react-native';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import { uiStyle } from '../../../../components/ThemeContext';
import TouchableScale from '../../../../components/TouchableScale';

/**
 * 篩選面板
 * - 模式切換：Add Drop / Pre Enroll
 * - 類型切換：CMRE / GE
 * - 學院 / 學系 / GE 細分
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
    onUpdateFilterOptions,
    onSetCourseMode,
    trigger,
}) => {
    const { themeColor, secondThemeColor, black, white } = theme;
    const activeColor = courseMode === 'ad' ? themeColor : secondThemeColor;
    const activeBackgroundColor = `${activeColor}15`;

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
        </View>
    );
};

export default FilterPanel;
