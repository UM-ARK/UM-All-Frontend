import React, { useState, useEffect, useCallback, useMemo, } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Image, ImageBackground, ScrollView, RefreshControl, Dimensions, TouchableWithoutFeedback, LayoutAnimation, } from 'react-native';
import { Input } from '@rneui/themed';

// 引入本地工具
import { useTheme, themes, uiStyle, ThemeContext, } from '../../components/ThemeContext';
import { UM_API_TOKEN, UM_ORG, } from '../../utils/pathMap';
import { openLink } from '../../utils/browser';
import { logToFirebase } from '../../utils/firebaseAnalytics';
import Header from '../../components/Header';
import { trigger } from '../../utils/trigger';
import Loading from '../../components/Loading';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import axios from 'axios';
// import Toast from 'react-native-toast-message';
import lodash from 'lodash';
import OpenCC from 'opencc-js';

import SearchInput from '../../components/SearchInput';


const converter = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 簡體轉繁體


const OrgInfo = (props) => {
    const { orgData } = props;
    const [isExpanded, setIsExpanded] = useState(true);
    const { theme } = useTheme();
    const { bg_color, white, black, themeColor, secondThemeColor, themeColorLight, themeColorUltraLight, viewShadow, eventColor } = theme;

    // 為折疊子部門添加動畫
    const toggleExpand = () => {
        // 添加动画
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsExpanded(prev => !prev);
    };

    const openGoogleSearch = useCallback((query) => {
        const searchUrl = `https://www.google.com/search?q=${encodeURIComponent('site:umall.one OR site:um.edu.mo ' + query)}`;
        openLink(searchUrl);
    }, [orgData]);

    return (
        <View style={{
            marginBottom: verticalScale(16),
            paddingHorizontal: scale(10), paddingTop: verticalScale(10),
            backgroundColor: white, borderRadius: scale(8),
        }}>
            <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                paddingBottom: verticalScale(10),
            }}>
                {/* 點擊主部門標題可觸發折疊 */}
                <TouchableOpacity style={{ width: '90%', }}
                    activeOpacity={0.8}
                    onPress={() => {
                        if (orgData.subUnit && orgData.subUnit.length > 1) {
                            toggleExpand();
                        } else {
                            openGoogleSearch(orgData.unitName);
                        }
                    }}>
                    <Text style={{ ...uiStyle, fontWeight: 'bold', color: black.main, fontSize: verticalScale(16), }}>
                        {orgData.chinUnitName}
                        <Text style={{ color: isExpanded ? black.third : themeColor, fontSize: verticalScale(12), }}>{orgData.unitCode}</Text>
                        {orgData.subUnit && orgData.subUnit.length > 1 && (
                            <Ionicons name={isExpanded ? "chevron-down-outline" : "chevron-up-outline"}
                                size={scale(14)}
                                color={isExpanded ? black.second : themeColor} />
                        )}
                    </Text>
                    <Text style={{ ...uiStyle, color: black.third, fontSize: verticalScale(12) }}>{lodash.startCase(lodash.toLower(orgData.unitName))}</Text>
                    {/* 葡語名，一般很少說 */}
                    {/* <Text style={{ ...uiStyle, color: black.third, fontSize: verticalScale(11) }}>{orgData.portUnitName}</Text> */}
                </TouchableOpacity>
                {/* 搜索按鈕 */}
                <TouchableOpacity
                    style={{
                        backgroundColor: eventColor.imageCard,
                        padding: scale(9), borderRadius: scale(50),
                        alignSelf: 'flex-start'
                    }}
                    onPress={() => openGoogleSearch(orgData.unitName)}>
                    <Ionicons
                        name="search-outline"
                        style={{ color: black.second }}
                        size={scale(18)} />
                </TouchableOpacity>
            </View>

            {/* 子部門 */}
            <ScrollView style={{ height: isExpanded ? 'auto' : 0, }}>
                {orgData.subUnit && orgData.subUnit.map((subUnit, unit_key) => {
                    return subUnit && (
                        <TouchableOpacity
                            key={unit_key}
                            style={{
                                marginBottom: verticalScale(8),
                                backgroundColor: eventColor.imageCard,
                                padding: scale(5), borderRadius: scale(5),
                                alignSelf: 'flex-start',
                            }} onPress={() => openGoogleSearch(subUnit.subUnitName)}>
                            <Text style={{ ...uiStyle, color: black.second, }}>
                                {subUnit.chinSubUnitName}
                                <Text style={{ color: black.third, }}>{subUnit.subUnitCode}</Text>
                            </Text>
                            <Text style={{ ...uiStyle, color: black.second, fontSize: verticalScale(10) }}>{lodash.startCase(lodash.toLower(subUnit.subUnitName))}</Text>
                        </TouchableOpacity>
                    )
                })}

            </ScrollView>
        </View>
    );
}

const UMOrg = () => {
    const { theme } = useTheme();
    const { bg_color, white, black, themeColor, } = theme;

    const [orgData, setOrgData] = useState([]);
    const [displayOrgData, setDisplayOrgData] = useState([]);
    const [loading, setLoading] = useState(true);

    async function getUMOrg() {
        const res = await axios.get(
            UM_ORG, {
            headers: {
                Accept: 'application/json',
                Authorization: UM_API_TOKEN,
            },
        }).then((res) => {
            const data = res.data;
            // const processedData = data._embedded.map(org => {...org,})
            setOrgData(data._embedded);
            setDisplayOrgData(data._embedded);
        }).finally(() => {
            setLoading(false);
        });
    }

    useEffect(() => {
        logToFirebase('openPage', { page: 'UMOrg' });
        getUMOrg();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color, }}>
            <Header title={"UM組織"} iOSDIY={true} />

            {/* 搜索框 */}
            <SearchInput 
                theme={theme}
                itemList={orgData}
                filter={(org, searchText)=>{
                    // 检查组织名称
                    const matchesMainOrg =
                        org.chinUnitName.toLowerCase().includes(converter(searchText)) ||
                        org.unitName.toLowerCase().includes(searchText) ||
                        org.unitCode.toLowerCase().includes(searchText);

                    // 检查子组织的名称和代码
                    const matchesSubUnit =
                        org.subUnit &&
                        Array.isArray(org.subUnit) && // 确保 org.subUnit 是数组
                        org.subUnit.some(
                            (subUnit) =>
                                subUnit && (
                                    subUnit.subUnitName.toLowerCase().includes(searchText) ||
                                    subUnit.subUnitCode.toLowerCase().includes(searchText) ||
                                    subUnit.chinSubUnitName.toLowerCase().includes(converter(searchText))
                                ));

                    return matchesMainOrg || matchesSubUnit;
                }}
                displayResult={(searchedOrgData)=>{
                    setDisplayOrgData(searchedOrgData)
                }}/>



            {displayOrgData && displayOrgData.length > 0 ? (
                <ScrollView style={{ paddingHorizontal: 10, marginBottom: 100 }}>
                    {displayOrgData.map((org, index) => {
                        return org ? (
                            <OrgInfo orgData={org} key={index} />
                        ) : null;
                    })}
                </ScrollView>
            ) : (
                <View style={{ padding: scale(10), alignItems: 'center', justifyContent: 'center' }}>
                    {loading ? (
                        <Loading />
                    ) : (
                        <Text style={{ ...uiStyle, color: black.main }}>No results found</Text>
                    )}
                </View>
            )}
        </View>
    );
};

export default UMOrg;
