// 設置頁基礎組件：分區標題、分區卡片、設置項。
// 手機端 SettingPage.js 與 web 端 SettingPage.web.js 共用，兩端只在「掛哪些項」上有差別
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import Ionicons from '@react-native-vector-icons/ionicons';
import { scale, verticalScale } from 'react-native-size-matters';
import Text from '../../../components/AppText';
import { useTheme, uiStyle } from '../../../components/ThemeContext';
import { trigger } from '../../../utils/trigger';

/**
 * 同一分區內多個設置項的容器：單一圓角卡片；項間分隔與功能頁卡片標題底線相同（bg_color、verticalScale(2)）
 * @param {React.ReactNode} children - 子節點（通常為多個 SettingItem，需傳 grouped）
 */
export const SettingSectionCard = ({ children }) => {
    const { theme } = useTheme();
    const { white, bg_color } = theme;
    const items = React.Children.toArray(children).filter(Boolean);

    return (
        <View
            style={{
                marginHorizontal: scale(15),
                marginBottom: verticalScale(4),
                borderRadius: scale(16),
                backgroundColor: white,
                overflow: 'hidden',
            }}>
            {items.map((child, index) => (
                <React.Fragment key={index}>
                    {index > 0 ? (
                        <View
                            style={{
                                height: verticalScale(2),
                                width: '100%',
                                backgroundColor: bg_color,
                            }}
                        />
                    ) : null}
                    {child}
                </React.Fragment>
            ))}
        </View>
    );
};

/**
 * 設置分區標題元件
 * @param {string} title - 分區標題文字
 * @param {string} icon - Ionicons 圖標名稱
 */
export const SettingSection = ({ title, icon }) => {
    const { theme } = useTheme();
    const { black } = theme;

    return (
        <View
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                marginHorizontal: scale(15),
                marginTop: verticalScale(12),
                marginBottom: verticalScale(6),
            }}>
            {icon && (
                <Ionicons
                    name={icon}
                    size={scale(14)}
                    color={black.third}
                    style={{ marginRight: scale(6) }}
                />
            )}
            <Text
                style={{
                    ...uiStyle.defaultText,
                    fontSize: scale(12),
                    fontWeight: '600',
                    color: black.third,
                    textTransform: 'uppercase',
                    letterSpacing: scale(0.5),
                }}>
                {title}
            </Text>
        </View>
    );
};

/**
 * 基礎設置項目元件
 * @param {string} icon - Ionicons 圖標名稱
 * @param {string} iconColor - 圖標顏色
 * @param {string} title - 項目標題
 * @param {string} subtitle - 項目副標題（可選）
 * @param {Function} onPress - 點擊回調函數
 * @param {ReactNode} rightElement - 右側自定義元素（可選）
 * @param {boolean} showArrow - 是否顯示右箭頭，默認為 true
 * @param {boolean} grouped - 是否置於 SettingSectionCard 內（共用外層圓角）
 */
export const SettingItem = ({
    icon,
    iconColor,
    title,
    subtitle,
    onPress,
    rightElement,
    showArrow = true,
    grouped = false,
}) => {
    const { theme } = useTheme();
    const { white, black } = theme;
    // 無 onPress 時用 View，供 MenuView 作為觸發錨點（避免內層 Touchable 搶手勢）
    const Container = onPress ? TouchableOpacity : View;

    return (
        <Container
            {...(onPress
                ? {
                    onPress: () => {
                        trigger();
                        onPress();
                    },
                    activeOpacity: 0.7,
                }
                : {})}
            style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: white,
                paddingHorizontal: scale(15),
                paddingVertical: verticalScale(12),
                ...(grouped
                    ? {}
                    : {
                        borderRadius: scale(16),
                        marginHorizontal: scale(15),
                        marginBottom: verticalScale(8),
                    }),
            }}>
            {/* 圖標 */}
            {icon && (
                <View
                    style={{
                        width: scale(32),
                        height: scale(32),
                        borderRadius: scale(12),
                        backgroundColor: `${iconColor}15`,
                        justifyContent: 'center',
                        alignItems: 'center',
                        marginRight: scale(12),
                    }}>
                    <Ionicons name={icon} size={scale(18)} color={iconColor} />
                </View>
            )}

            {/* 內容 */}
            <View style={{ flex: 1 }}>
                <Text
                    style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(14),
                        fontWeight: '500',
                        color: black.main,
                    }}>
                    {title}
                </Text>
                {subtitle && (
                    <Text
                        style={{
                            ...uiStyle.defaultText,
                            fontSize: scale(11),
                            color: black.third,
                            marginTop: verticalScale(2),
                        }}>
                        {subtitle}
                    </Text>
                )}
            </View>

            {/* 右側元素 */}
            {rightElement}

            {/* 箭頭 */}
            {showArrow && (
                <Ionicons
                    name="chevron-forward"
                    size={scale(18)}
                    color={black.third}
                    style={{ marginLeft: scale(8) }}
                />
            )}
        </Container>
    );
};

