import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Keyboard,
    FlatList,
    TouchableWithoutFeedback,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';

import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../../components/ThemeContext';
import { openLink } from '../../../../../utils/browser';
import { getFunctionArr } from '../../../features/FeatureList';
import { logToFirebase } from '../../../../../utils/firebaseAnalytics.js';

import Ionicons from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';
import { scale, verticalScale } from 'react-native-size-matters';
import { useTranslation } from 'react-i18next';
import OpenCC from 'opencc-js';

const converter = OpenCC.Converter({ from: 'cn', to: 'tw' }); // 簡體轉繁體

// 開啟 LayoutAnimation (Android 需要)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PLACEHOLDER_TEXTS = [
    '關於澳大的一切...',
    '校曆',
    '校園巴士',
    '圖書館',
    '打印餘額',
    '失物認領'
];

const SearchBar = ({ navigation }) => {
    const { theme } = useTheme();
    const { white, black, viewShadow, secondThemeColor, themeColor, bg_color, } = theme;
    const { t, i18n } = useTranslation();
    const functionArr = getFunctionArr(t);
    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: verticalScale(10),
            marginTop: verticalScale(10),
            height: verticalScale(30),
            zIndex: 101, // 確保在下拉層之上
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
            elevation: 4,
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
        cancelButton: {
            marginLeft: scale(5),
            paddingVertical: verticalScale(5),
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
        }
    });

    const [inputText, setInputText] = useState('');
    const [isFocused, setIsFocused] = useState(false);
    const [placeholderIndex, setPlaceholderIndex] = useState(0);
    const [localResults, setLocalResults] = useState([]);

    // 動畫值
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const textInputRef = useRef(null);

    // 1. 預處理本地功能列表：將嵌套的 FeatureList 展平，方便搜索
    const flattenFeatures = useMemo(() => {
        let features = [];
        if (functionArr && functionArr.length > 0) {
            functionArr.forEach(section => {
                if (section.fn && section.fn.length > 0) {
                    section.fn.forEach(item => {
                        features.push({
                            ...item,
                            category: section.title // 保留分類信息
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
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    // 切換文字
                    setPlaceholderIndex((prev) => (prev + 1) % PLACEHOLDER_TEXTS.length);
                    // 淡入
                    Animated.timing(fadeAnim, {
                        toValue: 1,
                        duration: 300,
                        useNativeDriver: true,
                    }).start();
                });
            }, 4000);
        }
        return () => clearInterval(interval);
    }, [isFocused, inputText]);

    // 3. 混合搜索邏輯 (Hybrid Search)
    // TODO: 增加func的中英文關鍵字
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
            return nameMatch || descMatch;
        });

        // 限制顯示前 3 個本地結果，避免列表過長
        setLocalResults(results.slice(0, 3));
    };

    // 使用防抖，避免頻繁計算
    const debouncedSearch = useMemo(() => debounce(handleSearch, 100), [flattenFeatures]);

    // 4. 執行跳轉邏輯
    const executeNavigation = (item) => {
        Keyboard.dismiss();
        // 記錄日誌 Firebase
        logToFirebase('funcUse', {
            funcName: 'searchBar_features',
            searchBarDetail: inputText,
        });

        // 根據 FeatureList 的定義進行跳轉
        if (item.go_where === 'Webview' || item.go_where === 'Linking') {
            openLink(item.webview_param.url);
        } else if (item.go_where) {
            // 跳轉到 App 內原生頁面 (需確保 navigation stack 中有這些路由)
            navigation.navigate(item.go_where);
        }
    };

    const goToGoogle = () => {
        Keyboard.dismiss();
        const query = encodeURIComponent(`site:umall.one OR site:um.edu.mo ${inputText}`);
        const url = `https://www.google.com/search?q=${query}`;
        openLink({ URL: url, mode: 'fullScreen' });
    };

    // 5. 渲染搜索結果下拉 (Overlay)
    const renderDropdown = () => {
        if (!isFocused || inputText === '') return null;

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

    return (
        <View style={{ zIndex: 100, width: scale(310) }}>
            <View style={styles.container}>
                <View style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused // 聚焦時的視覺反饋
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
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsFocused(true);
                            }}
                            onBlur={() => {
                                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                                setIsFocused(false);
                            }}
                            placeholder="" // 禁用默認 placeholder，使用自定義 View 覆蓋
                            returnKeyType="search"
                            onSubmitEditing={goToGoogle}
                        />

                        {/* 自定義輪播 Placeholder */}
                        {inputText === '' && (
                            <Animated.View style={[styles.placeholderContainer, { opacity: fadeAnim }]} pointerEvents="none">
                                <Text style={styles.placeholderText}>
                                    {isFocused ? `${t('輸入關鍵詞')}...` : `${t('搜索')}: ${t(PLACEHOLDER_TEXTS[placeholderIndex], { ns: 'features' })}`}
                                </Text>
                            </Animated.View>
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
                            <Ionicons name="close-circle" size={scale(10)} color="#ccc" />
                        </TouchableOpacity>
                    )}
                </View>

                {/* 取消按鈕 (僅在聚焦時顯示) */}
                {isFocused && (
                    <TouchableOpacity
                        onPress={() => {
                            Keyboard.dismiss();
                            setInputText('');
                            setIsFocused(false);
                        }}
                        style={styles.cancelButton}
                    >
                        <Text style={styles.cancelText}>{t('取消')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* 下拉結果層 */}
            {renderDropdown()}
        </View>
    );
};


export default SearchBar;
