import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Image, ImageBackground, ScrollView, RefreshControl, Dimensions, TouchableWithoutFeedback, LayoutAnimation } from 'react-native';

// 引入本地工具
import { useTheme, themes, uiStyle, ThemeContext } from '../../components/ThemeContext';
import { UM_API_TOKEN, UM_ORG } from '../../utils/pathMap';
import { openLink } from '../../utils/browser';
import { logToFirebase } from '../../utils/firebaseAnalytics';
import { trigger } from '../../utils/trigger';
import Loading from '../../components/Loading';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import axios from 'axios';
import { t } from 'i18next';
import Toast from 'react-native-simple-toast';
import lodash from 'lodash';
import * as OpenCC from 'opencc-js';
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
        trigger();
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
                <TouchableOpacity style={{ width: '90%' }}
                    activeOpacity={0.8}
                    onPress={() => {
                        trigger();
                        if (orgData.subUnit && orgData.subUnit.length > 1) {
                            toggleExpand();
                        } else {
                            openGoogleSearch(orgData.unitName);
                        }
                    }}>
                    <Text style={{ ...uiStyle, fontWeight: 'bold', color: black.main, fontSize: verticalScale(16) }}>
                        {orgData.chinUnitName}
                        <Text style={{ color: isExpanded ? black.third : themeColor, fontSize: verticalScale(12) }}>{orgData.unitCode}</Text>
                        {orgData.subUnit && orgData.subUnit.length > 1 && (
                            <Ionicons name={isExpanded ? 'chevron-down-outline' : 'chevron-up-outline'}
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
                        alignSelf: 'flex-start',
                    }}
                    onPress={() => openGoogleSearch(orgData.unitName)}>
                    <Ionicons
                        name="search-outline"
                        style={{ color: black.second }}
                        size={scale(18)} />
                </TouchableOpacity>
            </View>

            {/* 子部門 */}
            <ScrollView style={{ height: isExpanded ? 'auto' : 0 }}>
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
                            <Text style={{ ...uiStyle, color: black.second }}>
                                {subUnit.chinSubUnitName}
                                <Text style={{ color: black.third }}>{subUnit.subUnitCode}</Text>
                            </Text>
                            <Text style={{ ...uiStyle, color: black.second, fontSize: verticalScale(10) }}>{lodash.startCase(lodash.toLower(subUnit.subUnitName))}</Text>
                        </TouchableOpacity>
                    );
                })}

            </ScrollView>
        </View>
    );
};

const UMOrg = ({ navigation }) => {
    const { theme } = useTheme();
    const { bg_color, white, black, themeColor } = theme;

    const [orgData, setOrgData] = useState([]);
    const [displayOrgData, setDisplayOrgData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchText, setSearchText] = useState('');

    const controller = new AbortController();
    const searchBarRef = useRef(null);

    async function getUMOrg() {
        try {
            const res = await axios.get(UM_ORG, {
                headers: {
                    Accept: 'application/json',
                    Authorization: UM_API_TOKEN,
                },
                signal: controller.signal,
            });

            const data = res.data;
            setOrgData(data._embedded);
            setDisplayOrgData(data._embedded);
            setTimeout(() => {
                setLoading(false);
            }, 100);
        } catch (error) {
            if (error.code == 'ERR_NETWORK' || error.code == 'ECONNABORTED') {
                Toast.show('Network Error!');
            }
            setLoading(false);
        }
    }

    useEffect(() => {
        logToFirebase('openPage', { page: 'UMOrg' });
        getUMOrg();

        return () => {
            controller.abort();
        };
    }, []);

    // 配置導航欄搜索框
    React.useLayoutEffect(() => {
        navigation.setOptions({
            headerSearchBarOptions: {
                ref: searchBarRef,
                placeholder: 'Search...',
                hideWhenScrolling: false, // 重要：設置為 false 確保搜索框固定顯示
                placement: 'stacked', // 設置為 stacked 確保搜索框在 header 下方固定顯示
                barTintColor: theme.white, // 搜索框背景色
                tintColor: theme.themeColor, // 光標和取消按鈕顏色
                textColor: theme.black.main, // 搜索文字顏色
                hintTextColor: theme.black.third, // 提示文字顏色
                onChange: (event) => {
                    const searchText = event.nativeEvent.text.toLowerCase();
                    setSearchText(searchText);
                    setDisplayOrgData(orgData.filter(org => {
                        // 检查主组织的名称和代码
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
                    }));
                },
                onCancelButtonPress: () => {
                    setSearchText('');
                    setDisplayOrgData(orgData);
                },
            },
        });
    }, [navigation, orgData, theme]);

    return (
        <View style={{ flex: 1, backgroundColor: bg_color }}>
            {/* TODO: 增加下滑刷新 */}
            {displayOrgData && displayOrgData.length > 0 ? (
                <ScrollView contentInsetAdjustmentBehavior="automatic">
                    {displayOrgData.map((org, index) => {
                        return org ? (
                            <OrgInfo orgData={org} key={index} />
                        ) : null;
                    })}
                </ScrollView>
            ) : (<View style={{ alignItems: 'center' }}>
                {loading ? (<View><Loading /></View>) : (
                    <ScrollView refreshControl={
                        <RefreshControl
                            colors={[themeColor]}
                            tintColor={themeColor}
                            refreshing={loading}
                            onRefresh={() => {
                                setLoading(true);
                                getUMOrg();
                                if (searchBarRef.current) {
                                    searchBarRef.current.clearText(); // 清空搜索框
                                }
                            }}
                        />
                    }>
                        <Text style={{ ...uiStyle, color: black.main }}>No results found</Text>
                        <Text style={{ ...uiStyle, color: black.main }}>Please try to refresh</Text>
                    </ScrollView>
                )}
            </View>)}
        </View>
    );
};

export default UMOrg;
