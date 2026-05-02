import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated as RNAnimated,
    Keyboard,
    Platform,
} from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

import { useTheme, themes, uiStyle, ThemeContext } from '../../../../../components/ThemeContext';
import { openLink } from '../../../../../utils/browser';
import { getFunctionArr } from '../../../features/FeatureList';
import { logToFirebase } from '../../../../../utils/firebaseAnalytics.js';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import * as OpenCC from 'opencc-js';
import { useIsFocused } from '@react-navigation/native';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 簡體轉繁體

const TIMING_MS = 220;
const ANDROID_FOCUS_STATE_DELAY_MS = 250;

const PLACEHOLDER_TEXTS = [
    '關於澳大的一切...',
    '校曆',
    '校園巴士',
    '圖書館',
    '打印餘額',
    '失物認領',
];

const SearchBar = ({ navigation }) => {
    const { theme } = useTheme();
    const { white, black, viewShadow, secondThemeColor, themeColor, bg_color } = theme;
    const { t, i18n } = useTranslation();
    const screenIsFocused = useIsFocused();

    const functionArr = getFunctionArr(t);

    const focused = useSharedValue(0);
    const cancelW = useSharedValue(0);

    const inputOuterAnimated = useAnimatedStyle(() => ({
        marginRight: withTiming(focused.value * cancelW.value, { duration: TIMING_MS }),
    }));

    const cancelAnimated = useAnimatedStyle(() => ({
        opacity: cancelW.value > 1 ? 1 : 0,
        transform: [
            {
                translateX: withTiming((1 - focused.value) * cancelW.value, {
                    duration: TIMING_MS,
                }),
            },
        ],
    }));

    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: verticalScale(10),
            marginTop: verticalScale(10),
            height: verticalScale(30),
            zIndex: 101, // 確保在下拉層之上
            overflow: 'hidden',
        },
        inputOuter: {
            flex: 1,
            minWidth: 0,
            height: '100%',
        },
        inputWrapper: {
            flex: 1,
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: white,
            borderRadius: verticalScale(8),
            height: '100%',
            borderWidth: 1,
            borderColor: 'transparent',
            // ...viewShadow,
        },
        inputWrapperFocused: {
            borderColor: themeColor,
            backgroundColor: white,
            ...(Platform.OS === 'android' ? {} : { elevation: 4 }),
        },
        textInput: {
            flex: 1,
            height: '100%',
            paddingHorizontal: scale(8),
            fontSize: verticalScale(13),
            color: black.main,
            paddingVertical: 0, // Android 修正
        },
        placeholderContainer: {
            position: 'absolute',
            left: scale(8),
            right: 0,
            justifyContent: 'center',
            height: '100%',
        },
        placeholderText: {
            color: `${black.third}70`,
            fontSize: verticalScale(13),
        },
        cancelWrap: {
            position: 'absolute',
            right: 0,
            justifyContent: 'center',
            paddingVertical: verticalScale(5),
            paddingLeft: scale(6),
            paddingRight: scale(2),
        },
        cancelText: {
            color: themeColor,
            fontSize: verticalScale(14),
            fontWeight: '600',
        },
        // 下拉菜單樣式
        dropdownContainer: {
            position: 'absolute',
            top: verticalScale(45), // 根據 SearchBar 高度調整
            left: verticalScale(10),
            right: verticalScale(10),
            backgroundColor: white,
            borderRadius: verticalScale(8),
            paddingVertical: verticalScale(5),
            ...viewShadow,
            zIndex: 100,
        },
        resultItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: scale(10),
            paddingHorizontal: scale(12),
            borderBottomWidth: verticalScale(1),
            borderBottomColor: bg_color,
        },
        resultTitle: {
            fontSize: verticalScale(12),
            color: black.main,
            fontWeight: '500',
        },
        resultSub: {
            fontSize: verticalScale(11),
            color: `${black.third}90`,
            marginTop: verticalScale(2),
        },
        googleItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColor,
            marginHorizontal: scale(12),
            marginTop: verticalScale(8),
            marginBottom: verticalScale(5),
            paddingVertical: verticalScale(10),
            paddingHorizontal: verticalScale(12),
            borderRadius: verticalScale(6),
        },
        googleText: {
            color: white,
            flex: 1,
            fontSize: verticalScale(13),
            fontWeight: '600',
        },
        iconContainer: {
            marginRight: scale(8),
            width: scale(15),
            alignItems: 'center',
        },
    });

    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [localResults, setLocalResults] = useState([]);
    // Android：`TextInput` 外層寬窄若用動畫變動，易在聚焦瞬間被系統視為視圖異動而失去焦點
    const [cancelButtonWidth, setCancelButtonWidth] = useState(0);

    const fadeAnim = useRef(new RNAnimated.Value(1)).current;
    const textInputRef = useRef(null);
    const focusStateTimerRef = useRef(null);

    // 1. 預處理本地功能列表：將嵌套的 FeatureList 展平，方便搜索
    const flattenFeatures = useMemo(() => {
        let features = [];
        if (functionArr && functionArr.length > 0) {
            functionArr.forEach(section => {
                if (section.fn && section.fn.length > 0) {
                    section.fn.forEach(item => {
                        features.push({
                            ...item,
                            category: section.title, // 保留分類信息
                        });
                    });
                }
            });
        }
        return features;
    }, [i18n.language]);

    // 2. Placeholder 輪播邏輯
    useEffect(() => {
        let interval;
        if (!isFocused && inputText === '') {
            interval = setInterval(() => {
                // 淡出
                RNAnimated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    // 切換文字
                    setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
                    // 淡入
                    RNAnimated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                });
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [isFocused, inputText]);

    useEffect(() => {
        if (!screenIsFocused) {
            if (focusStateTimerRef.current) {
                clearTimeout(focusStateTimerRef.current);
            }
            textInputRef.current?.blur();
            setIsFocused(false);
            focused.value = 0;
            Keyboard.dismiss();
        }
    }, [screenIsFocused]);

    useEffect(() => () => {
        if (focusStateTimerRef.current) {
            clearTimeout(focusStateTimerRef.current);
        }
    }, []);

    // 3. 混合搜索邏輯 (Hybrid Search)
    const handleSearch = (text) => {
        setInputText(text);
        if (text.trim() === '') {
            setLocalResults([]);
            return;
        }

        // 本地搜索過濾
        const results = flattenFeatures.filter(item => {
            const nameMatch = item.fn_name && item.fn_name.toLowerCase().includes(converter(text.toLowerCase()));
            const descMatch = item.describe && item.describe.toLowerCase().includes(converter(text.toLowerCase()));
            const keywordMatch = item.keywords && item.keywords.toLowerCase().includes(text.toLowerCase());
            const keyMatch = item.key_name && item.key_name.toLowerCase().includes(converter(text));
            return nameMatch || descMatch || keywordMatch || keyMatch;
        });

        // 限制顯示前 3 個本地結果，避免列表過長
        setLocalResults(results.slice(0, 3));
    };

    // 使用防抖，避免頻繁計算
    const debouncedSearch = useMemo(() => debounce(handleSearch, 100), [flattenFeatures]);

    // 4. 執行跳轉邏輯
    const executeNavigation = (item) => {
        textInputRef.current?.blur();  // ✅ 清除输入框焦点
        setIsFocused(false);            // ✅ 更新状态
        // setInputText('');               // ✅ 清空输入文本
        // setLocalResults([]);            // ✅ 清空结果列表
        Keyboard.dismiss();             // ✅ 关闭键盘

        setTimeout(() => {
            // 記錄日誌 Firebase
            logToFirebase('funcUse', {
                funcName: 'searchBar_features',
                searchBarDetail: inputText + '-' + item.fn_name,
            });

            // 根據 FeatureList 的定義進行跳轉
            if (item.go_where === 'Webview' || item.go_where === 'Linking') {
                openLink(item.webview_param.url);
            } else if (item.go_where) {
                // 跳轉到 App 內原生頁面 (需確保 navigation stack 中有這些路由)
                navigation.navigate(item.go_where);
            }
        }, 50);
    };

    const goToGoogle = () => {
        // 清除所有状态
        textInputRef.current?.blur();
        setIsFocused(false);
        setInputText('');
        setLocalResults([]);
        Keyboard.dismiss();

        setTimeout(() => {
            const query = encodeURIComponent(`site:umall.one OR site:um.edu.mo ${inputText}`);
            const url = `https://www.google.com/search?q=${query}`;
            openLink({ URL: url, mode: 'fullScreen' });
        }, 50);
    };

    // 5. 渲染搜索結果下拉 (Overlay)
    const renderDropdown = () => {
        if (!isFocused || inputText === '') {return null;}

        return (
            <View style={styles.dropdownContainer}>
                {/* 本地功能結果 */}
                {localResults.map((item, index) => (
                    <TouchableOpacity
                        key={index}
                        style={styles.resultItem}
                        onPress={() => executeNavigation(item)}
                    >
                        <View style={styles.iconContainer}>
                            <Ionicons name="apps-outline" size={16} color={themeColor} />
                        </View>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.resultTitle}>{item.fn_name}</Text>
                            <Text style={styles.resultSub} numberOfLines={1}>{item.describe}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#ccc" />
                    </TouchableOpacity>
                ))}

                {/* 外部 Google 搜索入口 */}
                <TouchableOpacity style={styles.googleItem} onPress={goToGoogle}>
                    <View style={styles.iconContainer}>
                        <Ionicons name="search" size={16} color={white} />
                    </View>
                    <Text style={styles.googleText}>
                        {t('在澳大網頁搜索')} "{inputText}"
                    </Text>
                    <Ionicons name="open-outline" size={16} color={white} />
                </TouchableOpacity>
            </View>
        );
    };

    const skipLayoutAnimation = Platform.OS === 'android';
    const inputOuterNonAnimatedStyle = {
        marginRight: isFocused ? cancelButtonWidth : 0,
    };
    const cancelNonAnimatedStyle = skipLayoutAnimation
        ? {
            opacity: cancelButtonWidth > 1 && isFocused ? 1 : 0,
            transform: [{ translateX: !isFocused ? cancelButtonWidth : 0 }],
        }
        : {};

    return (
        <View style={{ zIndex: 100, width: scale(310) }}>
            <View style={styles.container}>
                <Animated.View
                    style={[
                        styles.inputOuter,
                        skipLayoutAnimation ? inputOuterNonAnimatedStyle : inputOuterAnimated,
                    ]}
                >
                    <View style={[
                        styles.inputWrapper,
                        isFocused && styles.inputWrapperFocused,
                    ]}>
                        <Ionicons name="search" size={scale(15)} color={isFocused ? themeColor : `${black.third}70`} style={{ marginLeft: scale(8) }} />

                        <View style={{ flex: 1, justifyContent: 'center' }}>
                            <TextInput
                                ref={textInputRef}
                                style={styles.textInput}
                                value={inputText}
                                onChangeText={(text) => {
                                    setInputText(text);
                                    debouncedSearch(text);
                                }}
                                onFocus={() => {
                                    focused.value = 1;
                                    if (focusStateTimerRef.current) {
                                        clearTimeout(focusStateTimerRef.current);
                                    }
                                    if (Platform.OS === 'android') {
                                        focusStateTimerRef.current = setTimeout(() => {
                                            setIsFocused(true);
                                        }, ANDROID_FOCUS_STATE_DELAY_MS);
                                    } else {
                                        setIsFocused(true);
                                    }
                                }}
                                onBlur={() => {
                                    if (focusStateTimerRef.current) {
                                        clearTimeout(focusStateTimerRef.current);
                                    }
                                    focused.value = 0;
                                    setIsFocused(false);
                                }}
                                placeholder=""
                                returnKeyType="search"
                                onSubmitEditing={goToGoogle}
                            />

                            {/* 自定義輪播 Placeholder */}
                            {inputText === '' && (
                                <RNAnimated.View style={[styles.placeholderContainer, { opacity: fadeAnim }]} pointerEvents="none">
                                    <Text style={styles.placeholderText}>
                                        {isFocused ? `${t('輸入關鍵詞')}...` : `${t('搜索')}: ${t(PLACEHOLDER_TEXTS[placeholderIndex], { ns: 'features' })}`}
                                    </Text>
                                </RNAnimated.View>
                            )}
                        </View>

                        {/* 清空按鈕 */}
                        {inputText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setInputText('');
                                    setLocalResults([]);
                                    textInputRef.current.focus();
                                }}
                                style={{
                                    paddingHorizontal: scale(5),
                                }}
                            >
                                <Ionicons name="close-circle" size={verticalScale(12)} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

                {/* 取消按鈕：reanimated 滑入動畫 */}
                <Animated.View
                    style={[
                        styles.cancelWrap,
                        skipLayoutAnimation ? cancelNonAnimatedStyle : cancelAnimated,
                    ]}
                    onLayout={(e) => {
                        const w = e.nativeEvent.layout.width;
                        if (w > 0) {
                            cancelW.value = w;
                            setCancelButtonWidth(prev => (prev !== w ? w : prev));
                        }
                    }}
                >
                    <TouchableOpacity
                        onPress={() => {
                            focused.value = 0;
                            Keyboard.dismiss();
                            setInputText('');
                            setIsFocused(false);
                            setLocalResults([]);
                        }}
                    >
                        <Text style={styles.cancelText}>{t('取消')}</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* 下拉結果層 */}
            {renderDropdown()}
        </View>
    );
};


export default SearchBar;
