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
import Ionicons from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';

// 假設你的工具函數和常量路徑
import { scale, verticalScale } from 'react-native-size-matters';
import { functionArr } from '../../../features/FeatureList';
import { useTheme, themes, uiStyle, ThemeContext, } from '../../../../../components/ThemeContext';
import { t } from "i18next";
import { openLink } from '../../../../../utils/browser';

// 開啟 LayoutAnimation (Android 需要)
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

// TODO: 翻譯
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
    const { white, black, viewShadow, secondThemeColor, themeColor } = theme;
    const styles = StyleSheet.create({
        container: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingHorizontal: verticalScale(10),
            marginTop: verticalScale(10),
            height: verticalScale(35),
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
            // 陰影
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.1,
            shadowRadius: 2,
            elevation: 2,
        },
        inputWrapperFocused: {
            borderColor: themeColor,
            backgroundColor: '#fff',
            elevation: 4,
        },
        textInput: {
            flex: 1,
            height: '100%',
            paddingHorizontal: 8,
            fontSize: verticalScale(13),
            color: black.main,
            paddingVertical: 0, // Android 修正
        },
        placeholderContainer: {
            position: 'absolute',
            left: 8,
            right: 0,
            justifyContent: 'center',
            height: '100%',
        },
        placeholderText: {
            color: '#999',
            fontSize: verticalScale(13),
        },
        cancelButton: {
            marginLeft: 10,
            paddingVertical: 5,
        },
        cancelText: {
            color: themeColor,
            fontSize: verticalScale(14),
            fontWeight: '600',
        },
        // 下拉菜單樣式
        dropdownContainer: {
            position: 'absolute',
            top: verticalScale(50), // 根據 SearchBar 高度調整
            left: verticalScale(10),
            right: verticalScale(10),
            backgroundColor: white,
            borderRadius: 8,
            paddingVertical: 5,
            // 強烈陰影確保覆蓋下方內容
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
            elevation: 10,
            zIndex: 100,
        },
        resultItem: {
            flexDirection: 'row',
            alignItems: 'center',
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderBottomWidth: 0.5,
            borderBottomColor: '#f0f0f0',
        },
        resultTitle: {
            fontSize: 14,
            color: black.main,
            fontWeight: '500',
        },
        resultSub: {
            fontSize: 11,
            color: '#888',
            marginTop: 2,
        },
        googleItem: {
            flexDirection: 'row',
            alignItems: 'center',
            backgroundColor: themeColor,
            marginHorizontal: 12,
            marginTop: 8,
            marginBottom: 5,
            paddingVertical: 10,
            paddingHorizontal: 12,
            borderRadius: 6,
        },
        googleText: {
            color: white,
            flex: 1,
            fontSize: 13,
            fontWeight: '600',
        },
        iconContainer: {
            marginRight: 10,
            width: 24,
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
    }, []);

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
    const handleSearch = (text) => {
        setInputText(text);
        if (text.trim() === '') {
            setLocalResults([]);
            return;
        }

        // 本地搜索過濾
        const results = flattenFeatures.filter(item => {
            const nameMatch = item.fn_name && item.fn_name.toLowerCase().includes(text.toLowerCase());
            const descMatch = item.describe && item.describe.toLowerCase().includes(text.toLowerCase());
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
        // TODO: 記錄日誌
        console.log('Navigating to:', item.fn_name, item);

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
                    {/* TODO: 英文翻譯 */}
                    <Text style={styles.googleText}>
                        在澳大網頁搜索 "{inputText}"
                    </Text>
                    <Ionicons name="open-outline" size={16} color={white} />
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <View style={{ zIndex: 100, width: scale(300) }}>
            <View style={styles.container}>
                <View style={[
                    styles.inputWrapper,
                    isFocused && styles.inputWrapperFocused // 聚焦時的視覺反饋
                ]}>
                    <Ionicons name="search" size={18} color={isFocused ? themeColor : '#999'} style={{ marginLeft: 10 }} />

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
                                    {isFocused ? '輸入關鍵詞...' : `提問：${t(PLACEHOLDER_TEXTS[placeholderIndex], { ns: 'features' })}`}
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
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            style={{ padding: 8 }}
                        >
                            <Ionicons name="close-circle" size={16} color="#ccc" />
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
