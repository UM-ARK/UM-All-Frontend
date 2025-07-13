import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Text, View, TouchableOpacity, StyleSheet, Image, ImageBackground, ScrollView, RefreshControl, Dimensions, TouchableWithoutFeedback, } from 'react-native';
import { Input } from '@rneui/themed';

// 引入本地工具
import { useTheme, themes, uiStyle, ThemeContext, } from '../../components/ThemeContext';
import { UM_API_TOKEN, UM_BUS_LOOP_ZH, UM_BUS_LOOP_EN, UM_MAP, UM_ORG, } from '../../utils/pathMap';
import { openLink } from '../../utils/browser';
import { logToFirebase } from '../../utils/firebaseAnalytics';
import Header from '../../components/Header';
import LoadingDotsDIY from '../../components/LoadingDots';
import { trigger } from '../../utils/trigger';

import Ionicons from 'react-native-vector-icons/Ionicons';
import Modal from 'react-native-modal';
import { DOMParser } from "react-native-html-parser";
import { scale, verticalScale } from 'react-native-size-matters';
import axios from 'axios';
// import Toast from 'react-native-toast-message';
import TouchableScale from "react-native-touchable-scale";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { t } from 'i18next';
import Toast from 'react-native-simple-toast';
import { red } from 'react-native-reanimated/lib/typescript/Colors';

// import { UMAPITOKEN } from '../../utils/umApiToken';
// import { UM_API_TOKEN, UM_ORG } from '../../utils/pathMap';
import { set } from 'mobx';
import { Button } from 'react-native-ui-lib';

const BUS_URL_DEFAULT = UM_BUS_LOOP_ZH;


const OrgInfo = (props) => {
    const { orgData } = props;

    const [isExpanded, setIsExpanded] = useState(true);

    return (
        <View style={{ marginBottom: 16, padding: 10, backgroundColor: '#fff', borderRadius: 8, gap: 10 }}>
            <View style={{
                paddingRight: 10,
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <View>
                    <Text style={{ fontWeight: 'bold', fontSize: 16 }}>{orgData.chinUnitName}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{orgData.unitName}</Text>
                    <Text style={{ color: '#666', fontSize: 11 }}>{orgData.portUnitName}</Text>
                </View>
                <TouchableOpacity
                    style={{
                        backgroundColor: '#f0f0f0',
                        padding: 9,
                        borderRadius: 50,
                        alignItems: 'center',
                        justifyContent: 'center',
                    }}
                    onPress={() => {
                        openLink(`https://www.google.com/search?q=${orgData.unitName.split(" ").join("+")}+University+of+Macau`);
                    }}>
                    <Ionicons
                        name="search-outline"
                        style={{}}
                        size={scale(18)} />
                </TouchableOpacity>
            </View>
            <Button
                style={{ backgroundColor: "#0000000f" }}
                onPress={() => setIsExpanded(!isExpanded)}>
                {isExpanded ?
                    (<Ionicons name="chevron-up-outline" size={scale(12)} />) :
                    (<Ionicons name="chevron-down-outline" size={scale(12)} />)}
            </Button>
            <ScrollView style={{
                height: isExpanded ? 'auto' : 0,
                transitionProperty: "all",
                transitionTimingFunction: "ease-in-out",
                transitionDuration: "0.3s"
            }}>
                {orgData.subUnit && orgData.subUnit.map((subUnit, unit_key) => {
                    return subUnit ? (
                        <TouchableOpacity
                            key={unit_key}
                            style={{
                                marginBottom: 8,
                                backgroundColor: '#f0f0f0',
                                padding: 5, borderRadius: 5
                            }} onPress={() => {
                                openLink(`https://www.google.com/search?q=${subUnit.subUnitName.split(" ").join("+")}+University+of+Macau`);
                            }}>
                            <Text>{subUnit.chinSubUnitName}</Text>
                            <Text>{subUnit.subUnitName}</Text>
                        </TouchableOpacity>
                    ) : null;
                })}

            </ScrollView>
            {/* <View><Text>{JSON.stringify(org.subUnit)}</Text></View> */}

        </View>
    );
}

const UMOrg = () => {
    const { theme } = useTheme();
    const { bg_color, white, black, themeColor, secondThemeColor, viewShadow } = theme;
    const s = StyleSheet.create({
        container: {
            flex: 1,
            flexDirection: 'column',
        },
        arrowSize: {
            width: scale(35),
            height: scale(35),
            resizeMode: 'contain',
        },
        dotSize: {
            width: scale(21),
            height: scale(21),
            resizeMode: 'contain',
        },
        infoContainer: {
            position: 'absolute',
            marginHorizontal: scale(10),
            backgroundColor: white,
            borderRadius: scale(10),
            ...viewShadow,
            paddingHorizontal: scale(10),
            paddingVertical: scale(3),
        },
    });

    const [orgData, setOrgData] = useState([]);
    const [displayOrgData, setDisplayOrgData] = useState([]);

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
        });
    }

    useEffect(() => {
        getUMOrg();
    }, []);


    return (
        <View>
            <Header title={"UM組織"} iOSDIY={true} />
            {/* <Text style={{ backgroundColor: '#2f3a79', marginTop: 100 }}>{JSON.stringify(orgData[0]) || "No Data found"}</Text> */}

            <Input placeholder="Search..." onChange={(e) => {
                console.log(e.nativeEvent.text);
                setDisplayOrgData(orgData.filter(org => (
                    org.chinUnitName.toLowerCase().includes(e.nativeEvent.text.toLowerCase()) ||
                    org.unitName.toLowerCase().includes(e.nativeEvent.text.toLowerCase()) ||
                    org.portUnitName.toLowerCase().includes(e.nativeEvent.text.toLowerCase())
                )));
            }} />
            {displayOrgData && displayOrgData.length > 0 ? (
                <ScrollView style={{ paddingHorizontal: 10, marginBottom: 100 }}>
                    {displayOrgData.map((org, index) => {
                        return org ? (
                            <OrgInfo orgData={org} key={index} />
                        ) : null;
                    })}
                </ScrollView>
            ) : (
                <View style={{ padding: 10, alignItems: 'center', justifyContent: 'center' }}>
                    <Text>No Data</Text>
                </View>
            )}
        </View>
    );
};

export default UMOrg;
