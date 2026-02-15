import React from 'react';
import { Keyboard, Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { MenuView } from '@react-native-menu/menu';
import { scale, verticalScale } from 'react-native-size-matters';
import { t } from 'i18next';
import { uiStyle } from '../../../../components/ThemeContext';

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

    return (
        <View style={{
            alignItems: 'center',
            flexDirection: 'row',
            width: '100%',
            marginTop: scale(5),
            paddingHorizontal: scale(10),
            backgroundColor: 'transparent',
        }}>
            <View style={{
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
                <Ionicons name={'search'} size={scale(15)} color={black.third} />
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
                    placeholder={t('試試ECE or Electrical or 電氣', { ns: 'catalog' })}
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
                        style={{ padding: scale(3), marginLeft: 'auto' }}
                    >
                        <Ionicons
                            name={'close-circle'}
                            size={scale(15)}
                            color={themeColor}
                        />
                    </Pressable>
                ) : null}
            </View>

            <MenuView
                onPressAction={({ nativeEvent }) => {
                    if (inputOK) {
                        onPressAction(nativeEvent.event);
                    }
                }}
                actions={[
                    {
                        id: 'wiki',
                        title: `${t('查', { ns: 'catalog' })} ARK Wiki`,
                        titleColor: themeColor,
                    },
                    {
                        id: 'what2reg',
                        title: `${t('查', { ns: 'catalog' })} ${t('選咩課', { ns: 'catalog' })}`,
                        titleColor: black.third,
                    },
                    {
                        id: 'official',
                        title: `${t('查', { ns: 'catalog' })} ${t('官方', { ns: 'catalog' })}`,
                        titleColor: black.third,
                    },
                ]}
                shouldOpenOnLongPress={false}
            >
                <Pressable
                    style={{
                        backgroundColor: inputOK ? themeColor : disabled,
                        borderRadius: scale(6),
                        padding: scale(7),
                        paddingHorizontal: scale(8),
                        alignItems: 'center',
                    }}
                    disabled={!inputOK}
                    onPress={onPressSearchButton}
                >
                    <Text style={{
                        ...uiStyle.defaultText,
                        fontSize: scale(12),
                        color: white,
                        fontWeight: 'bold',
                        lineHeight: verticalScale(14),
                    }}>
                        {t('搜索')}
                    </Text>
                </Pressable>
            </MenuView>
        </View>
    );
};

export default SearchBarSection;
