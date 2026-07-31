import React from 'react';
import { Keyboard, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
// 不可用 @expo/ui MenuView（SwiftUI Host matchContents 會在 Tab 切換／版面提交時
// 反寫 Fabric ShadowTree 並 abort）。改用 @react-native-menu/menu（原生 UIButton）。
import { MenuView } from '@react-native-menu/menu';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
} from 'react-native-reanimated';
import TouchableScale from '../../../../../../components/TouchableScale';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import { uiStyle } from '../../../../../../components/ThemeContext';

/** 搜尋按鈕固定寬度（相容「搜索」／「Search」） */
const SEARCH_BTN_WIDTH = scale(50);

/** 與 TouchableScale 預設相近的彈簧參數 */
const SEARCH_BTN_SPRING = {
    damping: 18,
    stiffness: 280,
    mass: 0.4,
};

/**
 * 搜尋欄區塊
 */
const SearchBarSection = ({
    theme,
    inputText,
    inputOK,
    textInputRef,
    onChangeText,
    onClear,
    onPressAction,
    onPressSearchButton,
    trigger,
}) => {
    const { themeColor, black, white, disabled } = theme;

    // 原生 UIButton 會吃掉子層的 pressIn，故縮放回饋改由選單開合驅動
    const searchBtnScale = useSharedValue(1);
    const searchBtnAnimatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: searchBtnScale.value }],
    }));

    // @react-native-menu/menu：iOS 用 SF Symbol；Android 用系統 drawable 名稱
    const searchActions = [
        {
            id: 'wiki',
            title: `${t('寫', { ns: 'catalog' })} Wiki`,
            image: Platform.select({ ios: 'book', android: 'ic_menu_agenda' }),
            imageColor: themeColor,
            titleColor: themeColor,
        },
        {
            id: 'what2reg',
            title: `${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'star',
                android: 'btn_star_big_on',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
        {
            id: 'official',
            title: `${t('查', { ns: 'catalog' })} ${t('官方', { ns: 'catalog' })}`,
            image: Platform.select({
                ios: 'graduationcap',
                android: 'ic_menu_info_details',
            }),
            imageColor: black.third,
            titleColor: black.third,
        },
    ];

    const handlePressAction = event => {
        trigger();
        if (inputOK) {
            onPressAction(event.nativeEvent.event);
        }
    };

    const searchBtnStyle = {
        width: SEARCH_BTN_WIDTH,
        backgroundColor: inputOK ? themeColor : disabled,
        borderRadius: scale(6),
        padding: scale(7),
        paddingHorizontal: scale(8),
        alignItems: 'center',
        justifyContent: 'center',
    };

    const searchBtnLabel = (
        <Text
            style={{
                ...uiStyle.defaultText,
                fontSize: scale(12),
                color: white,
                fontWeight: 'bold',
                lineHeight: verticalScale(14),
            }}>
            {t('搜索')}
        </Text>
    );

    return (
        <View
            style={{
                alignItems: 'center',
                flexDirection: 'row',
                width: '100%',
                marginTop: scale(5),
                paddingHorizontal: scale(10),
                backgroundColor: 'transparent',
            }}>
            <View
                style={{
                    backgroundColor: white,
                    borderWidth: scale(2),
                    borderColor: themeColor,
                    borderRadius: scale(10),
                    flexDirection: 'row',
                    alignItems: 'center',
                    marginRight: scale(5),
                    paddingHorizontal: scale(5),
                    paddingVertical: scale(3),
                    flex: 1,
                }}>
                <Ionicons
                    name={'search'}
                    size={scale(15)}
                    color={black.third}
                />
                <TextInput
                    style={{
                        ...uiStyle.defaultText,
                        paddingVertical: verticalScale(3),
                        paddingHorizontal: scale(5),
                        color: black.main,
                        fontSize: scale(12),
                        flex: 1,
                    }}
                    onChangeText={onChangeText}
                    value={inputText}
                    selectTextOnFocus
                    placeholder={t('試試ECE or Electrical or 電氣', {
                        ns: 'catalog',
                    })}
                    placeholderTextColor={black.third}
                    ref={textInputRef}
                    onFocus={() => trigger()}
                    returnKeyType={'search'}
                    selectionColor={themeColor}
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                />
                {inputText.length > 0 ? (
                    <Pressable
                        onPress={onClear}
                        style={{ padding: scale(3), marginLeft: 'auto' }}>
                        <Ionicons
                            name={'close-circle'}
                            size={scale(15)}
                            color={themeColor}
                        />
                    </Pressable>
                ) : null}
            </View>

            {/*
              無有效輸入時不掛 MenuView，只顯示禁用按鈕，避免選單可被打開。
            */}
            {inputOK ? (
                <MenuView
                    actions={searchActions}
                    onOpenMenu={() => {
                        searchBtnScale.value = withSpring(
                            0.9,
                            SEARCH_BTN_SPRING,
                        );
                        trigger();
                        onPressSearchButton?.();
                    }}
                    onCloseMenu={() => {
                        searchBtnScale.value = withSpring(1, SEARCH_BTN_SPRING);
                    }}
                    onPressAction={handlePressAction}
                    shouldOpenOnLongPress={false}
                    style={{ width: SEARCH_BTN_WIDTH }}>
                    <Animated.View
                        style={[searchBtnStyle, searchBtnAnimatedStyle]}>
                        {searchBtnLabel}
                    </Animated.View>
                </MenuView>
            ) : (
                <TouchableScale style={searchBtnStyle} disabled>
                    {searchBtnLabel}
                </TouchableScale>
            )}
        </View>
    );
};

export default SearchBarSection;
