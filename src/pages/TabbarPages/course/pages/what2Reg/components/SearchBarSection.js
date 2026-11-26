import React, { useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import Ionicons from "@react-native-vector-icons/ionicons";
import Text from '../../../../../../components/AppText';
import TextInput from '../../../../../../components/AppTextInput';
import searchFieldStyles, {
    SEARCH_FIELD_CLEAR_ICON_SIZE,
    SEARCH_FIELD_ICON_SIZE,
    SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER,
} from '../../../../../../components/searchFieldStyles';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import { uiStyle } from '../../../../../../components/ThemeContext';

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
    showOfficial = true,
    trigger,
}) => {
    const { themeColor, black, white } = theme;
    const [isFocused, setIsFocused] = useState(false);

    const searchActions = [
        {
            id: 'harbor-discuss',
            title: t('討論', { ns: 'catalog' }),
            icon: 'chatbubbles-outline',
        },
        {
            id: 'wiki',
            title: 'Wiki',
            icon: 'book-outline',
        },
        {
            id: 'what2reg',
            title: t('選咩課', { ns: 'catalog' }),
            icon: 'star-outline',
        },
        {
            id: 'official',
            title: t('官方', { ns: 'catalog' }),
            icon: 'school-outline',
        },
    ].filter(action => showOfficial || action.id !== 'official');

    return (
        <View
            style={{
                width: '100%',
                paddingTop: scale(5),
                paddingBottom: scale(5),
                paddingHorizontal: scale(10),
            }}>
            <View
                style={[
                    searchFieldStyles.field,
                    {
                        backgroundColor: white,
                        borderWidth: StyleSheet.hairlineWidth,
                        borderColor: isFocused ? themeColor : `${black.third}33`,
                        width: '100%',
                    },
                ]}>
                <Ionicons
                    name={'search'}
                    size={SEARCH_FIELD_ICON_SIZE}
                    color={black.third}
                />
                <TextInput
                    style={[
                        searchFieldStyles.text,
                        searchFieldStyles.input,
                        searchFieldStyles.inputNoWebOutline,
                        { color: black.main },
                    ]}
                    onChangeText={onChangeText}
                    value={inputText}
                    selectTextOnFocus
                    placeholder={t('試試ECE or Electrical or 電氣', {
                        ns: 'catalog',
                    })}
                    placeholderTextColor={black.third}
                    ref={textInputRef}
                    onFocus={() => {
                        setIsFocused(true);
                        trigger();
                    }}
                    onBlur={() => setIsFocused(false)}
                    maxFontSizeMultiplier={SEARCH_FIELD_MAX_FONT_SIZE_MULTIPLIER}
                    returnKeyType={'search'}
                    selectionColor={themeColor}
                    blurOnSubmit
                    onSubmitEditing={() => Keyboard.dismiss()}
                />
                {inputText.length > 0 ? (
                    <Pressable
                        onPress={onClear}
                        hitSlop={6}
                        style={searchFieldStyles.clearButton}>
                        <Ionicons
                            name={'close-circle'}
                            size={SEARCH_FIELD_CLEAR_ICON_SIZE}
                            color={themeColor}
                        />
                    </Pressable>
                ) : null}
            </View>

            {inputOK ? (
                <View
                    style={{
                        flexDirection: 'row',
                        columnGap: scale(5),
                        marginTop: verticalScale(5),
                    }}>
                    {searchActions.map(action => (
                        <Pressable
                            key={action.id}
                            accessibilityRole="button"
                            accessibilityLabel={action.title}
                            onPress={() => onPressAction(action.id)}
                            style={({ pressed }) => ({
                                flex: 1,
                                minWidth: 0,
                                flexDirection: 'row',
                                alignItems: 'center',
                                justifyContent: 'center',
                                columnGap: scale(3),
                                paddingHorizontal: scale(4),
                                paddingVertical: verticalScale(7),
                                borderRadius: scale(8),
                                backgroundColor: white,
                                opacity: pressed ? 0.7 : 1,
                            })}>
                            <Ionicons
                                name={action.icon}
                                size={scale(14)}
                                color={themeColor}
                            />
                            <Text
                                numberOfLines={1}
                                adjustsFontSizeToFit
                                style={{
                                    ...uiStyle.defaultText,
                                    color: black.main,
                                    fontSize: scale(11),
                                    fontWeight: '600',
                                }}>
                                {action.title}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            ) : null}
        </View>
    );
};

export default SearchBarSection;
